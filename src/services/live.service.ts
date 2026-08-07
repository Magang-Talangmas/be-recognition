import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

import { Camera, Notification, RecognitionEvent } from '@prisma/client';
import { LiveMonitoringRepository } from '../repositories/live.repository';
import { liveSseHub } from '../lib/live/sse-hub';
import { logger } from '../config/logger';
import { NotFoundError } from '../errors/NotFoundError';
import {
  CheckinEventPayload,
  LiveFeedDTO,
  LiveNotificationDTO,
  LiveNotificationList,
  LiveNotificationType,
  LiveRecognitionDTO,
  LiveRecognitionList,
  NotificationFilter,
  RecognitionFilter,
  RecognitionStatus,
  RecordRecognitionInput,
  SystemNotificationInput,
} from '../interfaces/live.interface';

const RECOGNITION_CONFIDENCE_THRESHOLD = 60;

function toTimeString(date: Date): string {
  return dayjs(date).tz('Asia/Jakarta').format('HH:mm:ss');
}

function toFeedDTO(camera: Camera): LiveFeedDTO {
  const canStream = camera.isOnline && camera.enabled;
  return {
    id: camera.cameraId,
    name: camera.name,
    location: camera.location ?? '',
    online: camera.isOnline,
    rtspUrl: camera.rtspUrl,
    snapshotUrl: canStream ? '/v1/cameras/snapshot' : null,
    streamUrl: canStream ? '/v1/cameras/stream' : null,
  };
}

function toRecognitionDTO(
  event: RecognitionEvent,
  cameraName: string,
  employeeName: string | null,
  notificationId: string | null = null,
): LiveRecognitionDTO {
  return {
    id: event.id,
    employeeId: event.employeeId,
    name: employeeName,
    cameraId: event.cameraId,
    cameraName,
    time: toTimeString(event.createdAt),
    timestamp: event.createdAt.toISOString(),
    confidence: event.confidence,
    status: event.status as RecognitionStatus,
    thumbnail: event.thumbnail,
    notificationId,
  };
}

function toNotificationDTO(notification: Notification): LiveNotificationDTO {
  return {
    id: notification.id,
    type: notification.type as LiveNotificationType,
    title: notification.title,
    description: notification.description,
    time: toTimeString(notification.createdAt),
    read: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
  };
}

export class LiveMonitoringService {
  constructor(private readonly repository: LiveMonitoringRepository) {}

  async getFeeds(): Promise<LiveFeedDTO[]> {
    const cameras = await this.repository.findFeeds();
    return cameras.map(toFeedDTO);
  }

  async getRecognitions(filter: RecognitionFilter): Promise<LiveRecognitionList> {
    const { items, total } = await this.repository.findRecognitions(filter);
    const cameraNames = await this.buildCameraNameMap();
    const employeeNames = await this.buildEmployeeNameMap(items);

    return {
      items: items.map((event) =>
        toRecognitionDTO(
          event,
          cameraNames.get(event.cameraId) ?? event.cameraId,
          event.employeeId ? employeeNames.get(event.employeeId) ?? null : null,
        ),
      ),
      total,
    };
  }

  async getNotifications(filter: NotificationFilter): Promise<LiveNotificationList> {
    const { items, total } = await this.repository.findNotifications(filter);
    return { items: items.map(toNotificationDTO), total };
  }

  async markRead(id: string): Promise<LiveNotificationDTO> {
    const existing = await this.repository.findNotificationById(id);
    if (!existing) {
      throw new NotFoundError(`Notifikasi dengan ID ${id} tidak ditemukan`);
    }

    if (!existing.isRead) {
      const updated = await this.repository.markNotificationRead(id);
      return toNotificationDTO(updated ?? existing);
    }

    return toNotificationDTO(existing);
  }

  async markAllRead(): Promise<{ count: number }> {
    const count = await this.repository.markAllNotificationsRead();
    return { count };
  }

  /**
   * Mencatat hasil pengenalan wajah (dari ML engine / /cctv/sync),
   * menyimpan notifikasi, lalu broadcast lewat SSE.
   */
  async recordRecognition(input: RecordRecognitionInput): Promise<LiveRecognitionDTO> {
    const status = input.status ?? this.resolveStatus(input);
    const camera = await this.repository.findCameraByCameraId(input.cameraId).catch(() => null);
    const employeeName = input.employeeId
      ? await this.repository.findEmployeeNameByEmployeeId(input.employeeId)
      : null;

    const event = await this.repository.createRecognition({
      employeeId: input.employeeId ?? null,
      cameraId: input.cameraId,
      confidence: input.confidence,
      status,
      thumbnail: input.thumbnail ?? null,
      createdAt: input.timestamp ? new Date(input.timestamp) : undefined,
    });

    const cameraName = camera?.name ?? input.cameraId;

    const notification = await this.safeCreateNotification(
      status === 'Verified'
        ? {
            type: 'recognition',
            title: 'Pengenalan Berhasil',
            description: `${employeeName ?? 'Karyawan'} diverifikasi di ${cameraName} (confidence ${input.confidence.toFixed(1)}%).`,
          }
        : {
            type: 'unknown',
            title: 'Wajah Tidak Dikenal',
            description: `Wajah unknown terdeteksi di ${cameraName} (confidence ${input.confidence.toFixed(1)}%).`,
          },
    );

    const dto = toRecognitionDTO(event, cameraName, employeeName, notification?.id ?? null);
    liveSseHub.publish(status === 'Verified' ? 'recognition' : 'unknown', dto);

    return dto;
  }

  /**
   * Mencatat perubahan status online/offline kamera + notifikasi + SSE.
   */
  async recordCameraStatus(cameraId: string, online: boolean): Promise<void> {
    const camera = await this.repository.findCameraByCameraId(cameraId);
    if (!camera) {
      logger.warn('Kamera tidak ditemukan saat recordCameraStatus', { cameraId });
      return;
    }

    if (online) {
      const notification = await this.safeCreateNotification({
        type: 'cctv',
        title: 'CCTV Kembali Online',
        description: `Kamera ${camera.name} (${cameraId}) kembali online.`,
      });
      liveSseHub.publish('camera_online', {
        cameraId,
        name: camera.name,
        notificationId: notification?.id ?? null,
      });
    } else {
      const notification = await this.safeCreateNotification({
        type: 'cctv',
        title: 'CCTV Offline',
        description: `Kamera ${camera.name} (${cameraId}) terputus.`,
      });
      liveSseHub.publish('camera_offline', {
        cameraId,
        name: camera.name,
        since: new Date().toISOString(),
        notificationId: notification?.id ?? null,
      });
    }
  }

  /**
   * Broadcast event check-in/check-out dari proses absensi + simpan notifikasi.
   */
  async publishCheckin(payload: CheckinEventPayload): Promise<void> {
    const isLate = payload.type === 'CHECK_IN' && payload.isLate;
    const title =
      payload.type === 'CHECK_OUT'
        ? 'Check Out'
        : isLate
          ? 'Terlambat Masuk'
          : 'Check In';
    const description =
      payload.type === 'CHECK_OUT'
        ? `${payload.name} (${payload.employeeId}) check-out pukul ${payload.time}.`
        : `${payload.name} (${payload.employeeId}) check-in${isLate ? ' terlambat' : ''} pukul ${payload.time}.`;

    const notification = await this.safeCreateNotification({
      type: 'checkin',
      title,
      description,
    });
    liveSseHub.publish('checkin', {
      ...payload,
      notificationId: notification?.id ?? null,
    });
  }

  /**
   * Buat notifikasi system + broadcast via SSE.
   */
  async publishSystem(input: SystemNotificationInput): Promise<LiveNotificationDTO | null> {
    const notification = await this.safeCreateNotification({
      type: 'system',
      title: input.title,
      description: input.description,
    });
    if (!notification) {
      return null;
    }
    const dto = toNotificationDTO(notification);
    liveSseHub.publish('system', dto);
    return dto;
  }

  private resolveStatus(input: RecordRecognitionInput): RecognitionStatus {
    if (input.status === 'Verified' || input.status === 'Unknown') {
      return input.status;
    }
    if (input.employeeId && input.confidence >= RECOGNITION_CONFIDENCE_THRESHOLD) {
      return 'Verified';
    }
    return 'Unknown';
  }

  private async safeCreateNotification(data: {
    type: LiveNotificationType;
    title: string;
    description: string;
  }): Promise<Notification | null> {
    try {
      return await this.repository.createNotification({
        type: data.type,
        title: data.title,
        description: data.description,
      });
    } catch (error) {
      logger.error('Gagal menyimpan notifikasi live', {
        error: error instanceof Error ? error.message : 'unknown',
        ...data,
      });
      return null;
    }
  }

  private async buildCameraNameMap(): Promise<Map<string, string>> {
    const cameras = await this.repository.findFeeds();
    return new Map(cameras.map((c) => [c.cameraId, c.name]));
  }

  private async buildEmployeeNameMap(
    events: RecognitionEvent[],
  ): Promise<Map<string, string>> {
    const ids = new Set(
      events.map((e) => e.employeeId).filter((v): v is string => Boolean(v)),
    );
    const map = new Map<string, string>();
    for (const id of ids) {
      const name = await this.repository.findEmployeeNameByEmployeeId(id);
      if (name) map.set(id, name);
    }
    return map;
  }
}
