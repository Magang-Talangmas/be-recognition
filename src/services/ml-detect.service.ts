import { env } from '../config/env';
import { logger } from '../config/logger';
import { LiveMonitoringService } from './live.service';
import { RecordRecognitionInput } from '../validators/live.validator';
import { uploadRecognitionSnapshot } from '../lib/storage';


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
      const dedupMs = env.ML_DETECT_DEDUP_SECONDS * 1000;

      for (const detail of data.details) {
        const identity = detail.name || 'Unknown';
        const last = this.lastRecorded.get(identity);
        if (last !== undefined && now - last < dedupMs) {
          continue;
        }

        // Status dari ML engine ke recognition_events selalu "Unknown".
        // Perubahan ke "Verified" atau "Rejected" dilakukan manual oleh admin.
        const input: RecordRecognitionInput = {
          employeeId: identity === 'Unknown' ? undefined : identity,
          cameraId: env.ML_DETECT_CAMERA_ID,
          confidence: Math.max(0, Math.min(100, detail.similarity)),
          status: 'Unknown',
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
