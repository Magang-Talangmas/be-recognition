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
import { sendPushNotification } from '../lib/firebase';
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
   * Mencatat hasil pengenalan wajah dari ML engine.
   *
   * Aturan bisnis:
   * 1. Status dari ML SELALU dipaksa menjadi 'Unknown' — ML tidak berhak set 'Verified'.
   * 2. Jika employeeId sudah ada di recognition_events hari ini dengan status
   *    'Unknown' atau 'Verified' → tolak (return null → controller 409 Conflict).
   * 3. Jika status sebelumnya adalah 'Rejected' → insert baru diperbolehkan.
   * 4. Jika employeeId null (wajah tidak dikenal) → selalu insert, tidak ada guard.
   */
  async recordRecognition(input: RecordRecognitionInput): Promise<LiveRecognitionDTO | null> {
    // [Aturan 1] Status dari ML selalu Unknown — abaikan field status dari input
    const status: RecognitionStatus = 'Unknown';

    // [Aturan 2 & 3] Guard duplikasi per hari hanya untuk employee yang dikenali
    if (input.employeeId) {
      const today = input.timestamp ? new Date(input.timestamp) : new Date();
      const existing = await this.repository.findTodayRecognitionByEmployee(
        input.employeeId,
        today,
      );

      if (existing) {
        logger.info('Recognition diabaikan — duplikat hari ini (status Unknown/Verified)', {
          employeeId: input.employeeId,
          existingId: existing.id,
          existingStatus: existing.status,
        });
        return null; // Controller akan kembalikan 409 Conflict
      }
    }

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

    const notification = await this.safeCreateNotification({
      type: 'unknown',
      title: 'Wajah Tidak Dikenal / Deteksi Baru',
      description: `${employeeName ?? 'Wajah'} terdeteksi di ${cameraName} (confidence ${input.confidence.toFixed(1)}%).`,
    });

    const dto = toRecognitionDTO(event, cameraName, employeeName, notification?.id ?? null);
    liveSseHub.publish('unknown', dto);

    // Simpan notifikasi konfirmasi ke database agar mobile bisa menampilkan
    // UI Snapshot Foto + Tombol Terima/Tolak.
    const confirmationNotification = input.employeeId
      ? await this.safeCreateNotification({
          type: 'REQUIRE_CONFIRMATION',
          title: 'Konfirmasi Kehadiran Anda',
          description: `Sistem mendeteksi Anda di kamera ${cameraName}. Apakah ini benar?`,
          employeeId: input.employeeId,
          recognitionId: event.id,
        })
      : null;

    // Kirim push notification ke mobile karyawan yang terdeteksi untuk konfirmasi kehadiran
    if (input.employeeId) {
      // Buat notifikasi khusus employee (muncul di GET /mobile/notifications)
      await this.safeCreateNotification({
        type: 'recognition',
        title: 'Konfirmasi Kehadiran Anda',
        description: `Sistem mendeteksi Anda di kamera ${cameraName}. Apakah ini benar?`,
        employeeId: input.employeeId,
        recognitionId: event.id,
      });

      const fcmToken = await this.repository.findEmployeeFcmToken(input.employeeId).catch(() => null);
      if (fcmToken) {
        sendPushNotification(
          fcmToken,
          'Konfirmasi Kehadiran Anda',
          `Sistem mendeteksi Anda di kamera ${cameraName}. Apakah ini benar?`,
          {
            intentAction: 'com.example.javatraining.CONFIRM_RECOGNITION',
            recognitionEventId: event.id,
            notificationId: confirmationNotification?.id ?? '',
            employeeId: input.employeeId,
            cameraId: input.cameraId,
            timestamp: event.createdAt.toISOString(),
          },
        ).catch((err: unknown) => {
          logger.error('Gagal mengirim push konfirmasi recognition ke mobile', {
            employeeId: input.employeeId,
            recognitionEventId: event.id,
            error: err instanceof Error ? err.message : 'unknown',
          });
        });
      } else {
        logger.info('Push konfirmasi recognition dilewati — fcmToken tidak ada', {
          employeeId: input.employeeId,
        });
      }
    }

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

  private async safeCreateNotification(data: {
    type: LiveNotificationType;
    title: string;
    description: string;
    employeeId?: string;
    recognitionId?: string;
  }): Promise<Notification | null> {
    try {
      return await this.repository.createNotification({
        type: data.type,
        title: data.title,
        description: data.description,
        ...(data.employeeId ? { employeeId: data.employeeId } : {}),
        ...(data.recognitionId ? { recognitionId: data.recognitionId } : {}),
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
