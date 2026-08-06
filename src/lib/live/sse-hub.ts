import { EventEmitter } from 'node:events';

export type LiveEventType =
  | 'recognition'
  | 'unknown'
  | 'camera_offline'
  | 'camera_online'
  | 'checkin'
  | 'system';

/**
 * Hub in-memory untuk broadcast event realtime ke semua client yang
 * terhubung via SSE (GET /live/events). Instance tunggal (singleton)
 * dibagikan antar service sehingga cukup untuk deployment single-instance.
 */
export class LiveSseHub {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  /**
   * Daftarkan listener untuk menerima semua event live.
   * Mengembalikan fungsi untuk berhenti berlangganan (saat koneksi ditutup).
   */
  subscribe(listener: (event: LiveEventType, data: unknown) => void): () => void {
    this.emitter.on('live', listener);
    return () => {
      this.emitter.off('live', listener);
    };
  }

  /**
   * Publish event ke semua subscriber SSE.
   */
  publish(event: LiveEventType, data: unknown): void {
    this.emitter.emit('live', event, data);
  }

  get listenerCount(): number {
    return this.emitter.listenerCount('live');
  }
}

export const liveSseHub = new LiveSseHub();
