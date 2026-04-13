import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { reportingService } from './reporting.service';
import { requirePermission } from '../../shared/middleware/auth-middleware';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/errors/app-error';

const router = Router();

// Download PDF
router.get('/:id/download', requirePermission('report:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await prisma.lims_reports.findFirst({
      where: { id: req.params.id, tenant_id: req.ctx.tenantId },
    });

    if (!report || !report.pdf_path) {
      throw new NotFoundError('Report PDF', req.params.id);
    }

    const fullPath = path.resolve(process.cwd(), report.pdf_path);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError('Report PDF file', req.params.id);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${report.report_number}.pdf"`);
    res.sendFile(fullPath);
  } catch (err) {
    next(err);
  }
});

// List reports by accession
router.get('/', requirePermission('report:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accessionId = req.query.accession_id as string;
    if (!accessionId) {
      res.json({ data: [] });
      return;
    }
    const reports = await reportingService.getReportsByAccession(req.ctx.tenantId, accessionId);
    res.json({ data: reports });
  } catch (err) { next(err); }
});

// Resend report
router.post('/:id/resend', requirePermission('report:resend'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const channel = req.body.channel || 'WHATSAPP';
    const log = await reportingService.resendReport(req.ctx.tenantId, req.params.id, channel, req.ctx.userId);
    res.json({ data: log });
  } catch (err) { next(err); }
});

export const reportingRoutes = router;
