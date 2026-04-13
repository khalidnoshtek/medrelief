import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const SYSTEM_USER = '00000000-0000-0000-0000-000000000000';

// Doctors from Sort March/Doctor.xlsx (real referring practitioners/staff list)
const DOCTORS = [
  { code: 'DOC-A-001', name: 'Anu Kumar', specialty: 'General Medicine', mobile: '123456789' },
  { code: 'DOC-A-002', name: 'Aakif Hasan', specialty: 'General Medicine', mobile: '9876543210' },
  { code: 'DOC-A-003', name: 'Lab Technician Mukul Kumar', specialty: 'Pathology', mobile: '1234567890' },
  { code: 'DOC-A-004', name: 'Lab Technician Ragib Hasan', specialty: 'Pathology', mobile: '232453245' },
  { code: 'DOC-A-005', name: 'Lab Technician Anil', specialty: 'Pathology', mobile: '7045807436' },
  { code: 'DOC-A-006', name: 'Shrawan Kumar', specialty: 'General Medicine', mobile: '83928771' },
  { code: 'DOC-A-007', name: 'Raj Kumar Jha', specialty: 'General Medicine', mobile: '2323568367' },
];

async function seed() {
  console.log('Adding doctors from Sort March list...');
  for (const d of DOCTORS) {
    const existing = await prisma.mdm_doctors.findFirst({
      where: { tenant_id: TENANT_ID, doctor_code: d.code },
    });
    if (existing) {
      console.log(`  Already exists: ${d.name}`);
      continue;
    }
    await prisma.mdm_doctors.create({
      data: {
        tenant_id: TENANT_ID,
        doctor_code: d.code,
        name: d.name,
        specialty: d.specialty,
        mobile: d.mobile,
        status: 'ACTIVE',
        created_by: SYSTEM_USER,
        updated_by: SYSTEM_USER,
      },
    });
    console.log(`  Added: ${d.name}`);
  }
  console.log('Done.');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
