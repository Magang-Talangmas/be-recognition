import { env } from '../config/env';
import { logger } from '../config/logger';

export interface MlRegisterInput {
  employeeId: string;
  name: string;
  oldName?: string;
  photos: string[];
}

/**
 * Mengirim foto wajah karyawan ke ML server (POST /register) agar
 * wajahnya terdaftar di dataset ML dan bisa dikenali oleh /detect.
 *
 * Non-blocking: kegagalan hanya dicatat, tidak menggagalkan proses utama
 * (mis. create/update employee).
 */
export class MlRegisterService {
  async registerEmployee(input: MlRegisterInput): Promise<void> {
    if (!env.ML_REGISTER_ENABLED) {
      return;
    }

    const photoUrls = (input.photos ?? []).filter(Boolean);
    if (photoUrls.length === 0) {
      return;
    }

    try {
      const form = new FormData();
      form.append('employeeId', input.employeeId);
      form.append('name', input.name);
      if (input.oldName) {
        form.append('oldName', input.oldName);
      }

      let attached = 0;
      for (let i = 0; i < photoUrls.length; i++) {
        const url = photoUrls[i];
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!res.ok) continue;
          const buf = await res.arrayBuffer();
          const type = res.headers.get('content-type') ?? 'image/jpeg';
          const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
          form.append(
            'photos',
            new Blob([buf], { type }),
            `${input.employeeId}-${i + 1}.${ext}`,
          );
          attached++;
        } catch (err) {
          logger.warn('Gagal mengambil foto wajah untuk ML register', {
            employeeId: input.employeeId,
            url,
            error: err instanceof Error ? err.message : 'unknown',
          });
        }
      }

      if (attached === 0) {
        logger.warn('Tidak ada foto yang berhasil dikirim ke ML register', {
          employeeId: input.employeeId,
        });
        return;
      }

      const res = await fetch(env.ML_REGISTER_URL, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        logger.warn('ML /register merespon non-OK', {
          employeeId: input.employeeId,
          status: res.status,
          body: await res.text().catch(() => ''),
        });
        return;
      }

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        logger.warn('ML /register tidak mengembalikan JSON — endpoint mungkin belum diimplementasikan', {
          employeeId: input.employeeId,
          contentType,
        });
        return;
      }

      const body = (await res.json().catch(() => null)) as { success?: boolean } | null;
      if (!body?.success) {
        logger.warn('ML /register merespon sukses=false', {
          employeeId: input.employeeId,
        });
        return;
      }

      logger.info('Foto wajah terkirim ke ML /register', {
        employeeId: input.employeeId,
        photos: attached,
      });
    } catch (err) {
      logger.warn('Gagal mengirim foto wajah ke ML /register', {
        employeeId: input.employeeId,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  async deleteEmployee(input: { employeeId: string; name: string; oldName?: string }): Promise<void> {
    if (!env.ML_REGISTER_ENABLED) {
      return;
    }

    try {
      const res = await fetch(env.ML_REGISTER_URL, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: input.employeeId, name: input.name, oldName: input.oldName }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        logger.warn('ML /delete merespon non-OK', {
          employeeId: input.employeeId,
          status: res.status,
        });
        return;
      }

      logger.info('Registrasi wajah karyawan berhasil dihapus dari ML engine', {
        employeeId: input.employeeId,
        name: input.name,
      });
    } catch (err) {
      logger.warn('Gagal menghapus registrasi wajah dari ML engine', {
        employeeId: input.employeeId,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }
}
