import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fix() {
  const role = await prisma.auth_roles.findFirst({ where: { code: 'RECEPTIONIST' } });
  const perm = await prisma.auth_permissions.findFirst({ where: { code: 'billing:update' } });

  if (!role || !perm) {
    console.log('Role or permission not found');
    return;
  }

  const existing = await prisma.auth_role_permissions.findFirst({
    where: { role_id: role.id, permission_id: perm.id },
  });

  if (existing) {
    console.log('Already exists');
  } else {
    await prisma.auth_role_permissions.create({
      data: { id: 'RP-REC-BILL-UPDATE', role_id: role.id, permission_id: perm.id },
    });
    console.log('Added billing:update to RECEPTIONIST');
  }
}

fix().catch(console.error).finally(() => prisma.$disconnect());
