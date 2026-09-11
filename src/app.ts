import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { createRouter } from './routes';
import { requestLoggerMiddleware } from './middlewares/requestLogger.middleware';
import { errorHandlerMiddleware } from './middlewares/errorHandler.middleware';
import { HTTP_STATUS } from './constants/http.constants';

export const createApp = (): Application => {
  const app = express();

  // === Security Middlewares ===
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: process.env.NODE_ENV === 'production' ? false : '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    }),
  );

  // === Body Parser ===
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // === Request Logger ===
  app.use(requestLoggerMiddleware);

  // === Swagger Documentation ===
  const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
    customSiteTitle: 'Automatic Attendance & Recognition API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      docExpansion: 'none',
    },
  };

  const serveDocs = swaggerUi.serve;
  const setupDocs = swaggerUi.setup(swaggerSpec, swaggerUiOptions);

  app.use('/docs', serveDocs, setupDocs);
  app.use('/api-docs', serveDocs, setupDocs);
  app.use('/api/v1/docs', serveDocs, setupDocs);

  const sendSwaggerJson = (_req: Request, res: Response): void => {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerSpec);
  };

  app.get('/docs.json', sendSwaggerJson);
  app.get('/api-docs.json', sendSwaggerJson);
  app.get('/swagger.json', sendSwaggerJson);
  app.get('/api/v1/docs.json', sendSwaggerJson);

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
