export interface RequestContext {
  requestId: string;
  tenantId: string;
  branchId: string;
  userId: string;
  roleCode: string;
  permissions: string[];
}

// Extend Express Request to include context
declare global {
  namespace Express {
    interface Request {
      ctx: RequestContext;
    }
  }
}
