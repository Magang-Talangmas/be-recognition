import { Camera, Prisma } from '@prisma/client';
import http from 'http';
import { CctvRepository, CctvListRows } from '../repositories/cctv.repository';
import {
  CreateCctvInput,
  UpdateCctvInput,
  CctvFilterInput,
} from '../validators/cctv.validator';
import { ConflictError } from '../errors/ConflictError';
import { NotFoundError } from '../errors/NotFoundError';
import { CctvDTO, CctvListResult, CctvSyncResult } from '../interfaces/cctv.interface';

const MAX_CAMERA_ID_RETRY = 5;
const ENGINE_TIMEOUT_MS = 5000;

interface EngineStatusPayload {
  engine_status?: string;
  camera_source?: string;
  fps?: number;
  faces_detected?: number;
  [key: string]: unknown;
}

function fetchEngineStatus(
  baseUrl: string,
  timeoutMs: number,
): Promise<EngineStatusPayload | null> {
  return new Promise((resolve) => {
    const req = http.get(`${baseUrl}/status`, (proxyRes) => {
      let body = '';
      proxyRes.on('data', (chunk) => {
        body += chunk;
      });
      proxyRes.on('end', () => {
        try {
          resolve(JSON.parse(body) as EngineStatusPayload);
        } catch {
          resolve(null);
        }
      });
    });

    req.setTimeout(timeoutMs, () => req.destroy());
    req.on('error', () => resolve(null));
  });
}

function toDTO(camera: Camera): CctvDTO {
  return {
    id: camera.id,
    cameraId: camera.cameraId,
    name: camera.name,
    location: camera.location ?? '',
    rtspUrl: camera.rtspUrl,
    online: camera.isOnline,
    enabled: camera.enabled,
    createdAt: camera.createdAt.toISOString(),
    updatedAt: camera.updatedAt.toISOString(),
  };
}

export class CctvService {
  constructor(private readonly cctvRepository: CctvRepository) {}

  async createCctv(data: CreateCctvInput): Promise<CctvDTO> {
    const existingRtspUrl = await this.cctvRepository.findByRtspUrl(data.rtspUrl);
    if (existingRtspUrl) {
      throw new ConflictError(`RTSP URL ${data.rtspUrl} sudah terdaftar`);
    }

    for (let attempt = 0; attempt < MAX_CAMERA_ID_RETRY; attempt++) {
      try {
        const camera = await this.cctvRepository.create({
          cameraId: await this.generateCameraId(),
          name: data.name,
          location: data.location,
          rtspUrl: data.rtspUrl,
          isOnline: data.online ?? true,
          enabled: data.enabled ?? true,
        });
        return toDTO(camera);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new ConflictError('Gagal membuat CCTV, silakan coba lagi');
  }

  async getCctvById(id: string): Promise<CctvDTO> {
    const camera = await this.findOrThrow(id);
    return toDTO(camera);
  }

  async getCctvs(filter: CctvFilterInput): Promise<CctvListResult> {
    const result: CctvListRows = await this.cctvRepository.findMany(filter);

    return {
      items: result.items.map(toDTO),
      total: result.total,
      page: filter.page,
      per_page: filter.per_page,
      total_pages: Math.ceil(result.total / filter.per_page),
    };
  }

  async updateCctv(id: string, data: UpdateCctvInput): Promise<CctvDTO> {
    const existing = await this.findOrThrow(id);

    if (data.rtspUrl && data.rtspUrl !== existing.rtspUrl) {
      const existingRtspUrl = await this.cctvRepository.findByRtspUrl(data.rtspUrl);
      if (existingRtspUrl) {
        throw new ConflictError(`RTSP URL ${data.rtspUrl} sudah terdaftar`);
      }
    }

    const camera = await this.cctvRepository.update(id, {
      name: data.name,
      location: data.location,
      rtspUrl: data.rtspUrl,
      isOnline: data.online,
      enabled: data.enabled,
    });

    return toDTO(camera);
  }

  async toggleStatus(id: string): Promise<CctvDTO> {
    const existing = await this.findOrThrow(id);
    const camera = await this.cctvRepository.update(id, {
      isOnline: !existing.isOnline,
    });
    return toDTO(camera);
  }

  async toggleEnabled(id: string): Promise<CctvDTO> {
    const existing = await this.findOrThrow(id);
    const camera = await this.cctvRepository.update(id, {
      enabled: !existing.enabled,
    });
    return toDTO(camera);
  }

  async deleteCctv(id: string): Promise<void> {
    await this.findOrThrow(id);
    await this.cctvRepository.delete(id);
  }

  async syncFromEngine(): Promise<CctvSyncResult> {
    const baseUrl = this.engineBaseUrl();
    const status = await fetchEngineStatus(baseUrl, ENGINE_TIMEOUT_MS);

    const all = await this.cctvRepository.findMany({ page: 1, per_page: 100 });

    if (!status || typeof status.camera_source !== 'string' || status.camera_source.length === 0) {
      const markedOffline = await this.setOnlineFlags(
        all.items.filter((c) => c.isOnline).map((c) => c.id),
        false,
      );
      return {
        engine_status: 'OFFLINE',
        camera_source: null,
        cameraId: null,
        created: 0,
        updated: 0,
        marked_offline: markedOffline,
      };
    }

    const rtspUrl = status.camera_source;
    let created = 0;
    let updated = 0;

    let camera = await this.cctvRepository.findByRtspUrl(rtspUrl);
    if (!camera) {
      camera = await this.cctvRepository.create({
        cameraId: await this.generateCameraId(),
        name: this.deriveCameraName(rtspUrl),
        location: '',
        rtspUrl,
        isOnline: true,
        enabled: true,
      });
      created = 1;
    } else if (!camera.isOnline) {
      await this.cctvRepository.update(camera.id, { isOnline: true });
      updated = 1;
    }

    const offlineIds = all.items
      .filter((c) => c.id !== camera!.id && c.isOnline)
      .map((c) => c.id);
    const markedOffline = await this.setOnlineFlags(offlineIds, false);

    return {
      engine_status: 'ONLINE',
      camera_source: rtspUrl,
      cameraId: camera.cameraId,
      created,
      updated,
      marked_offline: markedOffline,
    };
  }

  private async setOnlineFlags(ids: string[], isOnline: boolean): Promise<number> {
    let count = 0;
    for (const id of ids) {
      await this.cctvRepository.update(id, { isOnline });
      count += 1;
    }
    return count;
  }

  private engineBaseUrl(): string {
    let base = process.env.AI_STREAM_BASE_URL || 'http://localhost:8088';
    base = base.replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(base)) {
      base = `http://${base}`;
    }
    return base;
  }

  private deriveCameraName(rtspUrl: string): string {
    try {
      const host = new URL(rtspUrl).hostname;
      return `Kamera ${host}`;
    } catch {
      return 'Kamera ML Engine';
    }
  }

  private async generateCameraId(): Promise<string> {
    const next = (await this.cctvRepository.findMaxCameraIdNumber()) + 1;
    return `CAM-${String(next).padStart(2, '0')}`;
  }

  private async findOrThrow(id: string): Promise<Camera> {
    const camera = await this.cctvRepository.findById(id);
    if (!camera) {
      throw new NotFoundError(`CCTV dengan ID ${id} tidak ditemukan`);
    }
    return camera;
  }
}
