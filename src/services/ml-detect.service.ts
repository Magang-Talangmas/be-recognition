import { env } from '../config/env';
import { logger } from '../config/logger';
import { LiveMonitoringService } from './live.service';
import { RecordRecognitionInput } from '../validators/live.validator';
import { uploadRecognitionSnapshot } from '../lib/storage';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);


interface DetectDetail {
  name: string;
  similarity: number;
  bbox: number[];
}

interface DetectResult {
  active_names: string[];
  details: DetectDetail[];
}

/**
 * Mengambil hasil pengenalan dari ML engine (GET /detect) secara berkala
 * lalu meneruskannya ke Live Monitoring (recordRecognition + SSE broadcast).
 */
export class MlDetectService {
  private timer: NodeJS.Timeout | null = null;
  private lastRecorded = new Map<string, number>();
  private isPolling = false;

  constructor(private readonly liveService: LiveMonitoringService) {}

  start(): void {
    if (this.timer) return;
    const interval = env.ML_DETECT_INTERVAL_MS;
    this.timer = setInterval(() => {
      void this.poll().catch((err) => {
        logger.error('ML /detect polling gagal', {
          error: err instanceof Error ? err.message : 'unknown',
        });
      });
    }, interval);
    logger.info(`ML /detect polling dimulai (interval ${interval}ms, url ${env.ML_DETECT_URL})`);
    void this.poll();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async poll(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      // Pembatasan Waktu (Time Range Restriction)
      // Clock in: 08.30 - 12.00
      // Clock out: 17.00+
      const nowJkt = dayjs().tz('Asia/Jakarta');
      const timeNum = nowJkt.hour() + nowJkt.minute() / 60;
      
      const isClockInWindow = timeNum >= 8.5 && timeNum <= 12.0;
      const isClockOutWindow = timeNum >= 17.0;

      if (!isClockInWindow && !isClockOutWindow) {
        return;
      }

      let res: Response;
      try {
        res = await fetch(env.ML_DETECT_URL, { signal: AbortSignal.timeout(5000) });
      } catch (err) {
        logger.warn('ML /detect tidak dapat dihubungi', {
          error: err instanceof Error ? err.message : 'unknown',
        });
        return;
      }

      if (!res.ok) {
        logger.warn('ML /detect merespon dengan status non-OK', { status: res.status });
        return;
      }

      let data: DetectResult;
      try {
        data = (await res.json()) as DetectResult;
      } catch (err) {
        logger.warn('Respon ML /detect bukan JSON valid', {
          error: err instanceof Error ? err.message : 'unknown',
        });
        return;
      }

      if (!Array.isArray(data.details)) {
        return;
      }

      const now = Date.now();
      // Debounce in-memory dikurangi drastis menjadi 10 detik.
      // Deduplikasi utama (1x sehari) sekarang ditangani oleh database di live.service.ts.
      const dedupMs = 10000;

      let sharedThumbnail: string | undefined = undefined;
      let snapshotAttempted = false;

      for (const detail of data.details) {
        const identity = detail.name || 'Unknown';
        const last = this.lastRecorded.get(identity);
        if (last !== undefined && now - last < dedupMs) {
          continue;
        }

        // Ambil snapshot 1x saja per deteksi jika ada setidaknya 1 wajah valid
        if (!snapshotAttempted) {
          snapshotAttempted = true;
          let snapshotUrl = '';
          try {
            // Selalu gunakan origin host:port dari URL ML Detect agar robust
            const parsedUrl = new URL(env.ML_DETECT_URL);
            snapshotUrl = `${parsedUrl.origin}/snapshot`;
            
            const snapRes = await fetch(snapshotUrl, { signal: AbortSignal.timeout(3000) });
            if (snapRes.ok) {
              const arrayBuffer = await snapRes.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              sharedThumbnail = await uploadRecognitionSnapshot(buffer);
            } else {
              logger.warn(`Gagal mengambil snapshot CCTV: HTTP ${snapRes.status}`, { snapshotUrl });
            }
          } catch (err) {
            logger.warn('Error saat mengambil/upload snapshot CCTV', {
              snapshotUrl,
              error: err instanceof Error ? err.message : 'unknown',
            });
          }
        }

        // Status dari ML engine ke recognition_events selalu "Unknown".
        // Perubahan ke "Verified" atau "Rejected" dilakukan manual oleh admin.
        const input: RecordRecognitionInput = {
          employeeId: identity === 'Unknown' ? undefined : identity,
          cameraId: env.ML_DETECT_CAMERA_ID,
          confidence: Math.max(0, Math.min(100, detail.similarity)),
          status: 'Unknown',
          thumbnail: sharedThumbnail,
          timestamp: new Date().toISOString(),
        };

        this.lastRecorded.set(identity, now);
        await this.liveService.recordRecognition(input);
      }
    } finally {
      this.isPolling = false;
    }
  }
}
