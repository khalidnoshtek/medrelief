import { prisma } from '../../config/database';

export const authRepository = {
  async findUserByUsername(tenantId: string, username: string) {
    return prisma.auth_users.findUnique({
      where: { tenant_id_username: { tenant_id: tenantId, username } },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
        branch: true,
      },
    });
  },

  async findUserById(tenantId: string, userId: string) {
    return prisma.auth_users.findFirst({
      where: { id: userId, tenant_id: tenantId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
        branch: true,
      },
    });
  },
};
