import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createRouter } from './routes';
import { requestLoggerMiddleware } from './middlewares/requestLogger.middleware';
import { errorHandlerMiddleware } from './middlewares/errorHandler.middleware';
import { HTTP_STATUS } from './constants/http.constants';

export const createApp = (): Application => {
  const app = express();

  // === Security Middlewares ===
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.NODE_ENV === 'production' ? false : '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    }),
  );

  // === Body Parser ===
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));


  // === Request Logger ===
  app.use(requestLoggerMiddleware);

  // === API Routes ===
  app.use('/api/v1', createRouter());

  // === 404 Handler ===
  app.use((_req: Request, res: Response) => {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Endpoint tidak ditemukan',
    });
  });

  // === Global Error Handler (HARUS di akhir) ===
  app.use(errorHandlerMiddleware);

  return app;
};
