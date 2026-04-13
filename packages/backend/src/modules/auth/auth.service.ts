import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { authRepository } from './auth.repository';
import { UnauthorizedError } from '../../shared/errors/app-error';

interface TokenPayload {
  sub: string;
  tenantId: string;
  branchId: string;
  roleCode: string;
  permissions: string[];
}

export const authService = {
  async login(tenantId: string, username: string, password: string) {
    const user = await authRepository.findUserByUsername(tenantId, username);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Invalid username or password');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedError('Invalid username or password');
    }

    const permissions = user.role.permissions.map((rp) => rp.permission.code);

    const payload: TokenPayload = {
      sub: user.id,
      tenantId: user.tenant_id,
      branchId: user.branch_id,
      roleCode: user.role.code,
      permissions,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        roleCode: user.role.code,
        roleName: user.role.name,
        branchId: user.branch_id,
        branchName: user.branch.name,
        branchCode: user.branch.code,
        permissions,
      },
    };
  },

  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  },

  async getMe(tenantId: string, userId: string) {
    const user = await authRepository.findUserById(tenantId, userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const permissions = user.role.permissions.map((rp) => rp.permission.code);

    return {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      roleCode: user.role.code,
      roleName: user.role.name,
      branchId: user.branch_id,
      branchName: user.branch.name,
      branchCode: user.branch.code,
      permissions,
    };
  },
};
