import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env';

export function requestContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  // Set a basic context that will be enriched by auth middleware
  req.ctx = {
    requestId: (req.headers['x-request-id'] as string) || uuidv4(),
    tenantId: (req.headers['x-tenant-id'] as string) || env.DEFAULT_TENANT_ID,
    branchId: (req.headers['x-branch-id'] as string) || '',
    userId: '',
    roleCode: '',
    permissions: [],
  };
  next();
}
