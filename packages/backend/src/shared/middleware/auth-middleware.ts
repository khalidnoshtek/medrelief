import { Request, Response, NextFunction } from 'express';
import { authService } from '../../modules/auth/auth.service';
import { UnauthorizedError, ForbiddenError } from '../errors/app-error';

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing authorization header');
    }

    const token = header.slice(7);
    const payload = authService.verifyToken(token);

    // Enrich request context with auth info
    req.ctx.userId = payload.sub;
    req.ctx.tenantId = payload.tenantId;
    req.ctx.branchId = payload.branchId;
    req.ctx.roleCode = payload.roleCode;
    req.ctx.permissions = payload.permissions;

    next();
  } catch (err) {
    next(err);
  }
}

export function requirePermission(...requiredPermissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const userPermissions = req.ctx.permissions;
    const hasAll = requiredPermissions.every((p) => userPermissions.includes(p));
    if (!hasAll) {
      next(new ForbiddenError(`Missing permissions: ${requiredPermissions.join(', ')}`));
      return;
    }
    next();
  };
}
