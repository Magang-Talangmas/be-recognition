import { PrismaClient, Camera, Prisma } from '@prisma/client';
import { CctvFilterInput } from '../validators/cctv.validator';

export interface CctvListRows {
  items: Camera[];
  total: number;
}

export class CctvRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Prisma.CameraUncheckedCreateInput): Promise<Camera> {
    return this.prisma.camera.create({ data });
  }

  async findById(id: string): Promise<Camera | null> {
    return this.prisma.camera.findUnique({ where: { id } });
  }

  async findByCameraId(cameraId: string): Promise<Camera | null> {
    return this.prisma.camera.findUnique({ where: { cameraId } });
  }

  async findByRtspUrl(rtspUrl: string): Promise<Camera | null> {
    return this.prisma.camera.findUnique({ where: { rtspUrl } });
  }

  async findMany(filter: CctvFilterInput): Promise<CctvListRows> {
    const skip = (filter.page - 1) * filter.per_page;

    const where = {
      ...(filter.status ? { isOnline: filter.status === 'online' } : {}),
      ...(filter.search
        ? {
            OR: [
              { name: { contains: filter.search, mode: 'insensitive' as const } },
              {
                location: { contains: filter.search, mode: 'insensitive' as const },
              },
              {
                cameraId: { contains: filter.search, mode: 'insensitive' as const },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.camera.findMany({
        where,
        skip,
        take: filter.per_page,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.camera.count({ where }),
    ]);

    return { items: rows, total };
  }

  async update(
    id: string,
    data: Prisma.CameraUncheckedUpdateInput,
  ): Promise<Camera> {
    return this.prisma.camera.update({ where: { id }, data });
  }

  async delete(id: string): Promise<Camera> {
    return this.prisma.camera.delete({ where: { id } });
  }

  /** Nomor CAM-XX tertinggi yang sudah terpakai (untuk generate cameraId berikutnya). */
  async findMaxCameraIdNumber(): Promise<number> {
    const cameras = await this.prisma.camera.findMany({
      select: { cameraId: true },
    });

    let max = 0;
    for (const camera of cameras) {
      const match = /^CAM-(\d+)$/.exec(camera.cameraId);
      if (match) {
        const value = parseInt(match[1], 10);
        if (value > max) max = value;
      }
    }
    return max;
  }
}
