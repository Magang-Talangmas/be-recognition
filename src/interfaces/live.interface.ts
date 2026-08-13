export type RecognitionStatus = 'Verified' | 'Unknown' | 'Rejected';

export type LiveNotificationType =
  | 'checkin'
  | 'unknown'
  | 'cctv'
  | 'recognition'
  | 'system';

export interface LiveFeedDTO {
  id: string; // cameraId (CAM-XX) sesuai kontrak frontend
  name: string;
  location: string;
  online: boolean;
  rtspUrl: string | null;
  snapshotUrl: string | null; // proxy snapshot (renderable di <img>)
  streamUrl: string | null; // proxy MJPEG stream (renderable di <img>/<video>)
}

export interface LiveRecognitionDTO {
  id: string;
  employeeId: string | null; // null = Unknown
  name: string | null;
  cameraId: string;
  cameraName: string;
  time: string; // HH:mm:ss
  timestamp: string; // ISO 8601
  confidence: number; // 0-100
  status: RecognitionStatus;
  isConfirm: string;
  thumbnail: string | null;
  notificationId: string | null; // untuk sinkronisasi read/dedup di frontend
}

export interface LiveRecognitionList {
  items: LiveRecognitionDTO[];
  total: number;
}

export interface LiveNotificationDTO {
  id: string;
  type: LiveNotificationType;
  title: string;
  description: string;
  time: string; // HH:mm:ss (frontend mengubah ke label relatif)
  read: boolean;
  createdAt: string; // ISO 8601
}

export interface LiveNotificationList {
  items: LiveNotificationDTO[];
  total: number;
}

export interface RecognitionFilter {
  limit: number;
  cameraId?: string;
  status?: RecognitionStatus;
}

export interface NotificationFilter {
  limit: number;
  type?: LiveNotificationType;
  read?: boolean;
}

/** Input webhook dari ML engine / layanan internal untuk mencatat hasil pengenalan. */
export interface RecordRecognitionInput {
  employeeId?: string | null;
  cameraId: string;
  confidence: number;
  status?: RecognitionStatus;
  thumbnail?: string | null;
  timestamp?: string; // ISO 8601
}

/** Data payload event checkin untuk SSE. */
export interface CheckinEventPayload {
  employeeId: string;
  name: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  isLate: boolean;
  time: string; // HH:mm:ss
  notificationId?: string | null;
}

/** Input untuk membuat notifikasi system. */
export interface SystemNotificationInput {
  title: string;
  description: string;
}
