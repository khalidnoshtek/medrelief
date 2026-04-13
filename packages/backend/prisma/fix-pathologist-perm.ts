import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fix() {
  const role = await prisma.auth_roles.findFirst({ where: { code: 'PATHOLOGIST' } });
  const perm = await prisma.auth_permissions.findFirst({ where: { code: 'lims:create' } });

  if (!role || !perm) {
    console.log('Role or permission not found');
    return;
  }

  console.log(`Role: ${role.id}, Permission: ${perm.id}`);

  const existing = await prisma.auth_role_permissions.findFirst({
    where: { role_id: role.id, permission_id: perm.id },
  });

  if (existing) {
    console.log('Already exists, no change needed');
  } else {
    await prisma.auth_role_permissions.create({
      data: { id: 'RP-PATH-LIMS-CREATE', role_id: role.id, permission_id: perm.id },
    });
    console.log('Added lims:create to PATHOLOGIST');
  }
}

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
