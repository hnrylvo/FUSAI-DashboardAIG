import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { requireAuth } from './auth/session.js';
import { BACKEND_ROOT, config } from './config.js';
import { errorHandler, notFound } from './http/errors.js';
import { authRouter } from './routes/auth.js';
import { portfolioRouter } from './routes/portfolio.js';
import { uploadRouter } from './routes/upload.js';
import { vintageRouter } from './routes/vintage.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-inline'", 'https://accounts.google.com/gsi/client'],
          'frame-src': ["'self'", 'https://accounts.google.com/gsi/'],
          'connect-src': ["'self'", 'https://accounts.google.com/gsi/', 'https://*.google.com', 'https://identitytoolkit.googleapis.com'],
          'img-src': ["'self'", 'data:', 'https://*.googleusercontent.com', 'https://ssl.gstatic.com'],
          'style-src': ["'self'", "'unsafe-inline'", 'https://accounts.google.com/gsi/style', 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com'],
        },
      },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    }),
  );
  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRouter);
  app.use('/api/portfolio', requireAuth, portfolioRouter);
  app.use('/api/vintage', requireAuth, vintageRouter);
  app.use('/api/upload', requireAuth, uploadRouter);
  app.use('/api', notFound);

  // En producción el backend también sirve el build del frontend (despliegue único).
  const dist = path.resolve(BACKEND_ROOT, '../frontend/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
