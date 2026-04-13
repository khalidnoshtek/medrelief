import { Router, Request, Response, NextFunction } from 'express';
import { extractFromPrescription, saveUploadedImage } from './extraction.service';
import { suggestTestsBySpecialty } from './suggest.service';
import { requirePermission } from '../../shared/middleware/auth-middleware';
import { AppError } from '../../shared/errors/app-error';

const router = Router();

// Extract structured data from a prescription image
router.post('/extract-prescription', requirePermission('patient:create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { image_base64 } = req.body;
    if (!image_base64) throw new AppError('VALIDATION_ERROR', 'image_base64 is required', 400);

    // Save the image first
    const imagePath = await saveUploadedImage(image_base64);

    // Extract structured data
    const extracted = await extractFromPrescription(image_base64);

    res.json({
      data: {
        prescription_image_url: imagePath,
        extracted,
      },
    });
  } catch (err) { next(err); }
});

// Suggest tests based on doctor specialty
router.get('/suggest-tests', requirePermission('mdm:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const specialty = req.query.specialty as string;
    const tests = suggestTestsBySpecialty(specialty);
    res.json({ data: { specialty, suggested_tests: tests } });
  } catch (err) { next(err); }
});

export const aiRoutes = router;
