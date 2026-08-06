import { Request, Response, NextFunction } from 'express';
import { LiveMonitoringService } from '../services/live.service';
import { liveSseHub } from '../lib/live/sse-hub';
import {
  notificationQuerySchema,
  parseAsUnprocessable,
  recognitionQuerySchema,
  recordRecognitionSchema,
  systemNotificationSchema,
} from '../validators/live.validator';
import { HTTP_STATUS } from '../constants/http.constants';
import { ApiSuccessResponse } from '../interfaces/api-response.interface';
import {
  LiveFeedDTO,
  LiveNotificationDTO,
  LiveNotificationList,
  LiveRecognitionDTO,
  LiveRecognitionList,
} from '../interfaces/live.interface';

const SSE_HEARTBEAT_MS = 25000;

export class LiveMonitoringController {
  constructor(private readonly liveMonitoringService: LiveMonitoringService) {}

  getFeeds = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = await this.liveMonitoringService.getFeeds();

      const response: ApiSuccessResponse<LiveFeedDTO[]> = {
        success: true,
        message: 'Daftar feed kamera',
        data,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  getRecognitions = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const filter = parseAsUnprocessable(recognitionQuerySchema, req.query);
      const data = await this.liveMonitoringService.getRecognitions(filter);

      const response: ApiSuccessResponse<LiveRecognitionList> = {
        success: true,
        message: 'Hasil pengenalan terbaru',
        data,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  getNotifications = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const filter = parseAsUnprocessable(notificationQuerySchema, req.query);
      const data = await this.liveMonitoringService.getNotifications(filter);

      const response: ApiSuccessResponse<LiveNotificationList> = {
        success: true,
        message: 'Notifikasi terbaru',
        data,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  markNotificationRead = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params['id'] as string;
      const data = await this.liveMonitoringService.markRead(id);

      const response: ApiSuccessResponse<LiveNotificationDTO> = {
        success: true,
        message: 'Notifikasi ditandai sudah dibaca',
        data,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  markAllRead = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = await this.liveMonitoringService.markAllRead();

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Semua notifikasi ditandai sudah dibaca',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /** Webhook dari ML engine untuk mencatat hasil pengenalan wajah. */
  recordRecognition = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = parseAsUnprocessable(recordRecognitionSchema, req.body);
      const data = await this.liveMonitoringService.recordRecognition(body);

      const response: ApiSuccessResponse<LiveRecognitionDTO> = {
        success: true,
        message: 'Hasil pengenalan tersimpan',
        data,
      };

      res.status(HTTP_STATUS.CREATED).json(response);
    } catch (error) {
      next(error);
    }
  };

  /** Kirim notifikasi system ke semua client (ADMIN). */
  createSystemNotification = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = parseAsUnprocessable(systemNotificationSchema, req.body);
      const data = await this.liveMonitoringService.publishSystem(body);

      const response: ApiSuccessResponse<LiveNotificationDTO | null> = {
        success: true,
        message: 'Notifikasi system terkirim',
        data,
      };

      res.status(HTTP_STATUS.CREATED).json(response);
    } catch (error) {
      next(error);
    }
  };

  /** Koneksi SSE realtime. */
  handleEvents = (req: Request, res: Response): void => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 3000\n\n');

    const heartbeat = setInterval(() => {
      res.write(': ping\n\n');
    }, SSE_HEARTBEAT_MS);

    const unsubscribe = liveSseHub.subscribe((event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    });

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  };
}
