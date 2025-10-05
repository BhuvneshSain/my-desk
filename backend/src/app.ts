import dotenv from 'dotenv';
import express, { Application } from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import employeesRouter from './routes/employees';

dotenv.config();

export function createApp(): Application {
  const app = express();

  const allowedOrigins = process.env.CLIENT_ORIGIN?.split(',').map((value) => value.trim()).filter(Boolean);
  app.use(
    cors({
      origin: allowedOrigins?.length ? allowedOrigins : true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/employees', employeesRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
