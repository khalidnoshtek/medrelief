import { Router, Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { loginSchema } from './dto/login.dto';
import { AppError } from '../../shared/errors/app-error';

const router = Router();

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Invalid input', 400, {
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await authService.login(
      req.ctx.tenantId,
      parsed.data.username,
      parsed.data.password
    );

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getMe(req.ctx.tenantId, req.ctx.userId);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

export const authRoutes = router;
