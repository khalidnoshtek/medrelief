import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { requestContextMiddleware } from './shared/middleware/request-context-middleware';
import { errorHandler } from './shared/middleware/error-handler';
import { healthRoutes } from './health/health.controller';
import { authRoutes } from './modules/auth/auth.controller';
import { authMiddleware } from './shared/middleware/auth-middleware';
import { mdmRoutes } from './modules/mdm/mdm.routes';
import { billingRoutes } from './modules/billing/billing.controller';
import { limsRoutes } from './modules/lims/lims.routes';
import { reportingRoutes } from './modules/reporting/reporting.routes';
import { financeRoutes } from './modules/finance/finance.routes';
import { aiRoutes } from './modules/ai/ai.routes';

export function createApp() {
  const app = express();

  // Security & parsing
  app.use(helmet({
    contentSecurityPolicy: false,   // Disable CSP — this is an API server, not serving HTML
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({
    origin: [
      'http://localhost:5174',
      'https://khalidnoshtek.github.io',
      /\.onrender\.com$/,
      /\.loca\.lt$/,
    ],
    credentials: true,
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(morgan('short'));

  // Request context (before routes)
  app.use(requestContextMiddleware);

  // Health (no auth required)
  app.use(healthRoutes);

  // Auth (no auth middleware needed for login)
  app.use('/api/v1/auth', authRoutes);

  // Protected routes (auth middleware applied)
  app.use('/api/v1', authMiddleware);

  // Module routes
  app.use('/api/v1', mdmRoutes);
  app.use('/api/v1/billing', billingRoutes);
  app.use('/api/v1/lims', limsRoutes);
  app.use('/api/v1/reports', reportingRoutes);
  app.use('/api/v1/finance', financeRoutes);
  app.use('/api/v1/ai', aiRoutes);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
