import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies
vi.mock('../../../config/database', () => ({
  prisma: {},
}));

vi.mock('../auth.repository', () => ({
  authRepository: {
    findUserByUsername: vi.fn(),
    findUserById: vi.fn(),
  },
}));

import { authService } from '../auth.service';
import { authRepository } from '../auth.repository';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const mockUser = {
  id: 'user-001',
  tenant_id: TENANT_ID,
  branch_id: 'branch-001',
  username: 'receptionist1',
  full_name: 'Priya Sharma',
  password_hash: '',
  status: 'ACTIVE',
  role: {
    code: 'RECEPTIONIST',
    name: 'Receptionist',
    permissions: [
      { permission: { code: 'patient:create' } },
      { permission: { code: 'patient:read' } },
      { permission: { code: 'billing:create' } },
    ],
  },
  branch: {
    name: 'Medrelief Main',
    code: 'MDH-MAIN',
  },
};

describe('Auth Service', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Set password hash for "demo123"
    mockUser.password_hash = await bcrypt.hash('demo123', 10);
  });

  describe('login', () => {
    it('returns token and user data on valid credentials', async () => {
      (authRepository.findUserByUsername as any).mockResolvedValue(mockUser);

      const result = await authService.login(TENANT_ID, 'receptionist1', 'demo123');

      expect(result.accessToken).toBeDefined();
      expect(result.user.id).toBe('user-001');
      expect(result.user.username).toBe('receptionist1');
      expect(result.user.roleCode).toBe('RECEPTIONIST');
      expect(result.user.permissions).toEqual(['patient:create', 'patient:read', 'billing:create']);
    });

    it('throws on wrong password', async () => {
      (authRepository.findUserByUsername as any).mockResolvedValue(mockUser);

      await expect(
        authService.login(TENANT_ID, 'receptionist1', 'wrongpassword')
      ).rejects.toThrow('Invalid username or password');
    });

    it('throws on non-existent user', async () => {
      (authRepository.findUserByUsername as any).mockResolvedValue(null);

      await expect(
        authService.login(TENANT_ID, 'nobody', 'demo123')
      ).rejects.toThrow('Invalid username or password');
    });

    it('throws on inactive user', async () => {
      (authRepository.findUserByUsername as any).mockResolvedValue({
        ...mockUser,
        status: 'INACTIVE',
      });

      await expect(
        authService.login(TENANT_ID, 'receptionist1', 'demo123')
      ).rejects.toThrow('Invalid username or password');
    });
  });

  describe('verifyToken', () => {
    it('returns payload for a valid token', async () => {
      (authRepository.findUserByUsername as any).mockResolvedValue(mockUser);
      const { accessToken } = await authService.login(TENANT_ID, 'receptionist1', 'demo123');

      const payload = authService.verifyToken(accessToken);

      expect(payload.sub).toBe('user-001');
      expect(payload.tenantId).toBe(TENANT_ID);
      expect(payload.roleCode).toBe('RECEPTIONIST');
    });

    it('throws on invalid token', () => {
      expect(() => authService.verifyToken('garbage-token')).toThrow('Invalid or expired token');
    });

    it('throws on expired token', () => {
      const token = jwt.sign(
        { sub: 'user-001', tenantId: TENANT_ID },
        process.env.JWT_SECRET!,
        { expiresIn: '0s' }
      );

      expect(() => authService.verifyToken(token)).toThrow('Invalid or expired token');
    });
  });
});
