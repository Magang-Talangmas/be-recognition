export interface CctvDTO {
  id: string;
  cameraId: string;
  name: string;
  location: string;
  rtspUrl: string | null;
  online: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CctvListResult {
  items: CctvDTO[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface CctvSyncResult {
  engine_status: 'ONLINE' | 'OFFLINE';
  camera_source: string | null;
  cameraId: string | null;
  created: number;
  updated: number;
  marked_offline: number;
}
