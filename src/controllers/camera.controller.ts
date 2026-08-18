import { Request, Response } from 'express';
import http from 'http';
import { env } from '../config/env';

export class CameraController {
  private readonly streamBaseUrl: string;

  constructor() {
    this.streamBaseUrl = process.env.AI_STREAM_BASE_URL || 'http://localhost:8088';
  }

  /**
   * @route   GET /api/v1/video_feed
   * @desc    Proxy real-time MJPEG live stream dengan AI overlays ke Web & Mobile
   * @access  Public / Authenticated
   *
   * Target stream selalu diambil dari env AI_STREAM_URL (satu sumber kebenaran),
   * agar konsisten dengan streamUrl di /live/feeds.
   */
  getStream = (req: Request, res: Response): void => {
    const targetUrl = env.AI_STREAM_URL || `${this.streamBaseUrl}/stream`;

    const proxyReq = http.get(targetUrl, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, {
        'Content-Type': proxyRes.headers['content-type'] || 'multipart/x-mixed-replace; boundary=frame',
        'Cache-Control': 'no-cache, private',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        Connection: 'close',
      });

      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message: 'AI Engine / Camera live stream sedang offline atau tidak dapat dijangkau.',
          error: err.message,
          hint: 'Pastikan ./build/run_camera.exe config.yaml sedang aktif.',
        });
      }
    });

    req.on('close', () => {
      proxyReq.destroy();
    });
  };

  /**
   * @route   GET /api/v1/cameras/snapshot
   * @desc    Get single JPEG snapshot frame from active camera
   */
  getSnapshot = (_req: Request, res: Response): void => {
    const targetUrl = `${this.streamBaseUrl}/snapshot`;

    const proxyReq = http.get(targetUrl, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message: 'Snapshot kamera tidak tersedia saat ini.',
          error: err.message,
        });
      }
    });
  };

  /**
   * @route   GET /api/v1/cameras/status
   * @desc    Get real-time AI engine stats (FPS, faces detected, camera source)
   */
  getStatus = (_req: Request, res: Response): void => {
    const targetUrl = `${this.streamBaseUrl}/status`;

    http
      .get(targetUrl, (proxyRes) => {
        let body = '';
        proxyRes.on('data', (chunk) => {
          body += chunk;
        });
        proxyRes.on('end', () => {
          try {
            const data = JSON.parse(body);
            res.json({
              success: true,
              data: {
                ...data,
                engine_status: 'ONLINE',
                stream_url: '/api/v1/cameras/stream',
              },
            });
          } catch {
            res.json({
              success: true,
              data: {
                engine_status: 'ONLINE',
                raw: body,
              },
            });
          }
        });
      })
      .on('error', (err) => {
        res.status(503).json({
          success: false,
          data: {
            engine_status: 'OFFLINE',
            message: 'AI Recognition Engine belum aktif',
            error: err.message,
          },
        });
      });
  };
}
