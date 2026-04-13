import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { patientRoutes } from './patient/patient.controller';
import { patientHistoryService } from './patient/patient-history';
import { configService } from './config/config.service';
import { requirePermission } from '../../shared/middleware/auth-middleware';

const router = Router();

// Patient routes
router.use(patientRoutes);

// Patient history
router.get('/patients/:id/history', requirePermission('patient:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await patientHistoryService.getHistory(req.ctx, req.params.id);
    if (!data) { res.status(404).json({ error_code: 'PATIENT_NOT_FOUND', message: 'Patient not found' }); return; }
    res.json({ data });
  } catch (err) { next(err); }
});

// Doctor list (read-only for billing)
router.get('/mdm/doctors', requirePermission('mdm:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctors = await prisma.mdm_doctors.findMany({
      where: { tenant_id: req.ctx.tenantId, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });
    res.json({ data: doctors });
  } catch (err) {
    next(err);
  }
});

// Quick-create doctor (used when AI extracts a doctor not in the list)
router.post('/mdm/doctors', requirePermission('mdm:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, specialty, mobile } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error_code: 'VALIDATION_ERROR', message: 'Name is required' });
      return;
    }
    // Check if already exists by name (case-insensitive)
    const existing = await prisma.mdm_doctors.findFirst({
      where: { tenant_id: req.ctx.tenantId, name: { equals: name.trim(), mode: 'insensitive' } },
    });
    if (existing) { res.json({ data: existing }); return; }

    // Generate a code
    const count = await prisma.mdm_doctors.count({ where: { tenant_id: req.ctx.tenantId } });
    const code = `DOC-AI-${String(count + 1).padStart(3, '0')}`;

    const doctor = await prisma.mdm_doctors.create({
      data: {
        tenant_id: req.ctx.tenantId,
        doctor_code: code,
        name: name.trim(),
        specialty: specialty || 'General Medicine',
        mobile: mobile || null,
        status: 'ACTIVE',
        created_by: req.ctx.userId,
        updated_by: req.ctx.userId,
      },
    });
    res.status(201).json({ data: doctor });
  } catch (err) { next(err); }
});

// Test catalog (read-only)
router.get('/mdm/tests', requirePermission('mdm:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string;
    const tests = await prisma.mdm_tests.findMany({
      where: {
        tenant_id: req.ctx.tenantId,
        active: true,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
    });
    res.json({ data: tests });
  } catch (err) {
    next(err);
  }
});

// Packages with child tests
router.get('/mdm/packages', requirePermission('mdm:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const packages = await prisma.mdm_packages.findMany({
      where: { tenant_id: req.ctx.tenantId, active: true },
      include: { package_tests: { include: { test: true }, where: { active: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ data: packages });
  } catch (err) {
    next(err);
  }
});

// Branch list
router.get('/mdm/branches', requirePermission('mdm:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branches = await prisma.mdm_branches.findMany({
      where: { tenant_id: req.ctx.tenantId, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });
    res.json({ data: branches });
  } catch (err) {
    next(err);
  }
});

// Config settings
router.get('/mdm/config', requirePermission('mdm:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const configs = await configService.getAll(req.ctx);
    res.json({ data: configs });
  } catch (err) { next(err); }
});

router.put('/mdm/config/:key', requirePermission('mdm:write'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value, branch_id } = req.body;
    const result = await configService.set(req.ctx, req.params.key, value, branch_id);
    res.json({ data: result });
  } catch (err) { next(err); }
});

export const mdmRoutes = router;
