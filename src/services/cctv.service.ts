import { Camera, Prisma } from '@prisma/client';
import { CctvRepository, CctvListRows } from '../repositories/cctv.repository';
import {
  CreateCctvInput,
  UpdateCctvInput,
  CctvFilterInput,
} from '../validators/cctv.validator';
import { ConflictError } from '../errors/ConflictError';
import { NotFoundError } from '../errors/NotFoundError';
import { CctvDTO, CctvListResult } from '../interfaces/cctv.interface';

const MAX_CAMERA_ID_RETRY = 5;

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
