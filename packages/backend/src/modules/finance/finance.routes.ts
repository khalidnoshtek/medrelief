import { Router, Request, Response, NextFunction } from 'express';
import { financeService } from './finance.service';
import { dashboardService } from './dashboard.service';
import { auditService } from './audit.service';
import { assistantService } from './assistant.service';
import { requirePermission } from '../../shared/middleware/auth-middleware';

const router = Router();

// AI Business Assistant
router.post('/assistant', requirePermission('billing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question } = req.body;
    if (!question) { res.status(400).json({ error_code: 'VALIDATION_ERROR', message: 'question is required' }); return; }
    const branchId = (req.body.branch_id as string) || req.ctx.branchId;
    const answer = await assistantService.ask(req.ctx, branchId, question);
    res.json({ data: { question, answer } });
  } catch (err) { next(err); }
});

// Dashboard
router.get('/dashboard', requirePermission('billing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = (req.query.branch_id as string) || req.ctx.branchId;
    const data = await dashboardService.getBranchDashboard(req.ctx, branchId);
    res.json({ data });
  } catch (err) { next(err); }
});

// Previous day pending cases (accessions not yet completed, created before today)
router.get('/pending-cases', requirePermission('billing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = (req.query.branch_id as string) || req.ctx.branchId;
    const data = await dashboardService.getPreviousDayPendingCases(req.ctx, branchId);
    res.json({ data });
  } catch (err) { next(err); }
});

// Itemized daily closing view (supports ?date=YYYY-MM-DD for any day)
router.get('/daily-close/itemized', requirePermission('billing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = (req.query.branch_id as string) || req.ctx.branchId;
    const date = (req.query.date as string) || undefined;
    const data = await dashboardService.getDailyClosingItemized(req.ctx, branchId, date);
    res.json({ data });
  } catch (err) { next(err); }
});

// Shifts
router.post('/shifts/open', requirePermission('payment:create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shift = await financeService.openShift(req.ctx);
    res.status(201).json({ data: shift });
  } catch (err) { next(err); }
});

router.get('/shifts/current', requirePermission('payment:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shift = await financeService.getMyOpenShift(req.ctx);
    res.json({ data: shift });
  } catch (err) { next(err); }
});

router.post('/shifts/:id/close', requirePermission('payment:create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shift = await financeService.closeShift(req.ctx, req.params.id, {
      actual_cash: Number(req.body.actual_cash) || 0,
      actual_upi: Number(req.body.actual_upi) || 0,
      actual_card: Number(req.body.actual_card) || 0,
      actual_other: Number(req.body.actual_other) || 0,
      variance_reason: req.body.variance_reason,
    });
    res.json({ data: shift });
  } catch (err) { next(err); }
});

router.get('/shifts', requirePermission('payment:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shifts = await financeService.getShifts(req.ctx, {
      branchId: req.query.branch_id as string,
      status: req.query.status as string,
    });
    res.json({ data: shifts });
  } catch (err) { next(err); }
});

// Daily close
router.post('/daily-close', requirePermission('finance:daily-close'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branch_id, close_date } = req.body;
    const branchId = branch_id || req.ctx.branchId;
    const date = close_date || new Date().toISOString().slice(0, 10);
    const result = await financeService.dailyClose(req.ctx, branchId, date);
    res.json({ data: result });
  } catch (err) { next(err); }
});

router.get('/daily-close', requirePermission('finance:daily-close'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const history = await financeService.getDailyCloseHistory(
      req.ctx, (req.query.branch_id as string) || req.ctx.branchId
    );
    res.json({ data: history });
  } catch (err) { next(err); }
});

// Audit trail
router.get('/audit/bill/:billId', requirePermission('billing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const timeline = await auditService.getBillAudit(req.ctx, req.params.billId);
    res.json({ data: timeline });
  } catch (err) { next(err); }
});

router.get('/audit/activity', requirePermission('billing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await auditService.getRecentActivity(
      req.ctx, (req.query.branch_id as string) || req.ctx.branchId,
      parseInt(req.query.limit as string) || 50
    );
    res.json({ data: events });
  } catch (err) { next(err); }
});

export const financeRoutes = router;
