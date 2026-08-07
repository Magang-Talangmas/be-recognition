import { env } from '../config/env';
import { logger } from '../config/logger';

export interface MlRegisterInput {
  employeeId: string;
  name: string;
  oldName?: string;
  photos: string[];
}

export interface MlRegisterResult {
  ok: boolean;
  message: string;
  photosSent: number;
}

/**
 * Sinkronisasi foto wajah karyawan ke ML server.
 *
 * Kontrak endpoint ML:
 *   POST {ML_REGISTER_URL}        (default: /api/v1/employees/sync-ml)
 *   Content-Type: application/json
 *   Body: { "employeeId": string, "name": string, "oldName": string, "photos": [url, ...] }
 *
 * Penghapusan:
 *   DELETE {ML_REGISTER_URL}
 *   Body: { "employeeId": string, "name": string, "oldName": string }
 */
export class MlRegisterService {
  async registerEmployee(input: MlRegisterInput): Promise<MlRegisterResult> {
    if (!env.ML_REGISTER_ENABLED) {
      return { ok: false, message: 'ML register dinonaktifkan', photosSent: 0 };
    }

    const photoUrls = (input.photos ?? []).filter(Boolean);
    if (photoUrls.length === 0) {
      return { ok: false, message: 'Karyawan tidak memiliki foto', photosSent: 0 };
    }

    try {
      const res = await fetch(env.ML_REGISTER_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          employeeId: input.employeeId,
          name: input.name,
          oldName: input.oldName,
          photos: photoUrls,
        }),
        signal: AbortSignal.timeout(env.ML_REGISTER_TIMEOUT_MS),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        logger.warn('ML sync-ml merespon non-OK', {
          employeeId: input.employeeId,
          status: res.status,
          body: text.slice(0, 200),
        });
        return {
          ok: false,
          message: `ML merespon status ${res.status}: ${text.slice(0, 200)}`,
          photosSent: photoUrls.length,
        };
      }

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        logger.warn('ML sync-ml tidak mengembalikan JSON', {
          employeeId: input.employeeId,
          contentType,
        });
        return {
          ok: false,
          message: 'ML sync-ml tidak mengembalikan JSON',
          photosSent: photoUrls.length,
        };
      }

      const body = (await res.json().catch(() => null)) as { success?: boolean } | null;
      if (!body?.success) {
        logger.warn('ML sync-ml merespon success=false', {
          employeeId: input.employeeId,
          body,
        });
        return {
          ok: false,
          message: 'ML sync-ml merespon success=false',
          photosSent: photoUrls.length,
        };
      }

      logger.info('Foto wajah terkirim ke ML sync-ml', {
        employeeId: input.employeeId,
        photos: photoUrls.length,
      });
      return { ok: true, message: 'Berhasil disinkronkan ke ML', photosSent: photoUrls.length };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      logger.warn('Gagal mengirim foto wajah ke ML sync-ml', {
        employeeId: input.employeeId,
        error: msg,
      });
      return { ok: false, message: `Gagal: ${msg}`, photosSent: 0 };
    }
  }

  async removeEmployee(input: { employeeId: string; name: string; oldName?: string }): Promise<MlRegisterResult> {
    if (!env.ML_REGISTER_ENABLED) {
      return { ok: false, message: 'ML register dinonaktifkan', photosSent: 0 };
    }

    try {
      const targetUrl = env.ML_REMOVE_URL || env.ML_REGISTER_URL;
      const method = env.ML_REMOVE_URL ? 'POST' : 'DELETE';

      const res = await fetch(targetUrl, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          employeeId: input.employeeId,
          name: input.name,
          oldName: input.oldName,
        }),
        signal: AbortSignal.timeout(env.ML_REGISTER_TIMEOUT_MS),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        logger.warn('ML remove merespon non-OK', {
          employeeId: input.employeeId,
          status: res.status,
          body: text.slice(0, 200),
        });
        return {
          ok: false,
          message: `ML remove merespon status ${res.status}: ${text.slice(0, 200)}`,
          photosSent: 0,
        };
      }

      logger.info('Wajah karyawan dihapus dari ML', {
        employeeId: input.employeeId,
      });
      return { ok: true, message: 'Wajah berhasil dihapus dari ML', photosSent: 0 };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      logger.warn('Gagal menghapus wajah dari ML', {
        employeeId: input.employeeId,
        error: msg,
      });
      return { ok: false, message: `Gagal: ${msg}`, photosSent: 0 };
    }
  }

  async deleteEmployee(input: { employeeId: string; name: string; oldName?: string }): Promise<void> {
    await this.removeEmployee(input);
  }
}
