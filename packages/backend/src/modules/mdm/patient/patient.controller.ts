import { Router, Request, Response, NextFunction } from 'express';
import { patientService } from './patient.service';
import { createPatientSchema } from './dto/create-patient.dto';
import { AppError } from '../../../shared/errors/app-error';
import { requirePermission } from '../../../shared/middleware/auth-middleware';

const router = Router();

router.get('/patients', requirePermission('patient:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mobile = req.query.mobile as string;
    if (!mobile) {
      res.json({ data: [] });
      return;
    }
    const patients = await patientService.searchByMobile(req.ctx, mobile);
    res.json({ data: patients });
  } catch (err) {
    next(err);
  }
});

router.get('/patients/:id', requirePermission('patient:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patient = await patientService.getById(req.ctx, req.params.id);
    res.json({ data: patient });
  } catch (err) {
    next(err);
  }
});

router.post('/patients', requirePermission('patient:create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createPatientSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Invalid input', 400, {
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const patient = await patientService.create(req.ctx, parsed.data);
    res.status(201).json({ data: patient });
  } catch (err) {
    next(err);
  }
});

export const patientRoutes = router;
