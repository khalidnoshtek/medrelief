import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fix() {
  const role = await prisma.auth_roles.findFirst({ where: { code: 'RECEPTIONIST' } });
  const perm = await prisma.auth_permissions.findFirst({ where: { code: 'finance:daily-close' } });

  if (!role || !perm) { console.log('Not found'); return; }

  const existing = await prisma.auth_role_permissions.findFirst({
    where: { role_id: role.id, permission_id: perm.id },
  });

  if (existing) {
    console.log('Already exists');
  } else {
    await prisma.auth_role_permissions.create({
      data: { id: 'RP-REC-FIN-CLOSE', role_id: role.id, permission_id: perm.id },
    });
    console.log('Added finance:daily-close to RECEPTIONIST');
  }
}

fix().catch(console.error).finally(() => prisma.$disconnect());
