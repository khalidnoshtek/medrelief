import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { accessionService } from './accession/accession.service';
import { sampleService } from './sample/sample.service';
import { worklistService } from './worklist/worklist.service';
import { resultService } from './result/result.service';
import { requirePermission } from '../../shared/middleware/auth-middleware';
import { AppError, NotFoundError } from '../../shared/errors/app-error';
import { generateBarcodeLabel } from './accession/barcode-label';

const router = Router();

// Accession
router.get('/accessions/:id', requirePermission('lims:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accession = await accessionService.getAccession(req.ctx, req.params.id);
    res.json({ data: accession });
  } catch (err) { next(err); }
});

router.get('/accessions/by-bill/:billId', requirePermission('lims:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accession = await accessionService.getAccessionByBillId(req.ctx, req.params.billId);
    res.json({ data: accession });
  } catch (err) { next(err); }
});

// Sample status updates
router.patch('/samples/:id/collect', requirePermission('lims:update'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sample = await sampleService.markCollected(req.ctx, req.params.id);
    res.json({ data: sample });
  } catch (err) { next(err); }
});

router.patch('/samples/:id/receive', requirePermission('lims:update'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sample = await sampleService.markReceivedAtLab(req.ctx, req.params.id);
    res.json({ data: sample });
  } catch (err) { next(err); }
});

router.patch('/samples/:id/reject', requirePermission('lims:reject-sample'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    if (!reason) throw new AppError('VALIDATION_ERROR', 'Rejection reason is required', 400);
    const sample = await sampleService.rejectSample(req.ctx, req.params.id, reason);
    res.json({ data: sample });
  } catch (err) { next(err); }
});

// Worklist
router.get('/worklist', requirePermission('lims:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await worklistService.getWorklist(req.ctx, {
      branchId: req.query.branch_id as string,
      department: req.query.department as string,
      status: req.query.status as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    });
    res.json({ data: result.orders, meta: { total: result.total, page: result.page, limit: result.limit } });
  } catch (err) { next(err); }
});

// Test order actions
router.patch('/test-orders/:id/start', requirePermission('lims:update'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await worklistService.startProcessing(req.ctx, req.params.id);
    res.json({ data: order });
  } catch (err) { next(err); }
});

// Results
router.post('/results', requirePermission('lims:create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { test_order_id, raw_value, unit, reference_range, flag, comments } = req.body;
    if (!test_order_id || !raw_value) {
      throw new AppError('VALIDATION_ERROR', 'test_order_id and raw_value are required', 400);
    }
    const result = await resultService.enterResult(req.ctx, test_order_id, {
      raw_value, unit, reference_range, flag, comments,
    });
    res.status(201).json({ data: result });
  } catch (err) { next(err); }
});

router.get('/results/accession/:accessionId', requirePermission('lims:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const results = await resultService.getResultsByAccession(req.ctx, req.params.accessionId);
    res.json({ data: results });
  } catch (err) { next(err); }
});

// Sign-off
router.post('/results/:testOrderId/sign-off', requirePermission('lims:sign-off'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await resultService.signOff(req.ctx, req.params.testOrderId, {
      comments: req.body.comments,
    });
    res.json({ data: result });
  } catch (err) { next(err); }
});

// Barcode labels for accession samples
router.get('/accessions/:id/labels', requirePermission('lims:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accession = await accessionService.getAccession(req.ctx, req.params.id);
    const pdfPath = await generateBarcodeLabel(accession);
    const fullPath = path.resolve(process.cwd(), pdfPath);
    if (!fs.existsSync(fullPath)) throw new NotFoundError('Label PDF', req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${accession.accession_number}-labels.pdf"`);
    res.sendFile(fullPath);
  } catch (err) { next(err); }
});

export const limsRoutes = router;
