import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const SYSTEM_USER = '00000000-0000-0000-0000-000000000000';

// Fixed UUIDs for deterministic seeding
const IDS = {
  branches: {
    main: '10000000-0000-0000-0000-000000000001',
    patna: '10000000-0000-0000-0000-000000000002',
  },
  roles: {
    receptionist: '20000000-0000-0000-0000-000000000001',
    labTech: '20000000-0000-0000-0000-000000000002',
    pathologist: '20000000-0000-0000-0000-000000000003',
    centerHead: '20000000-0000-0000-0000-000000000004',
    finance: '20000000-0000-0000-0000-000000000005',
    admin: '20000000-0000-0000-0000-000000000006',
  },
  users: {
    receptionist1: '30000000-0000-0000-0000-000000000001',
    labtech1: '30000000-0000-0000-0000-000000000002',
    pathologist1: '30000000-0000-0000-0000-000000000003',
    centerhead1: '30000000-0000-0000-0000-000000000004',
    finance1: '30000000-0000-0000-0000-000000000005',
    admin1: '30000000-0000-0000-0000-000000000006',
  },
  ratePlans: {
    mrp: '40000000-0000-0000-0000-000000000001',
    branchDefault: '40000000-0000-0000-0000-000000000002',
    walkin: '40000000-0000-0000-0000-000000000003',
    corporate: '40000000-0000-0000-0000-000000000004',
    drSharma: '40000000-0000-0000-0000-000000000005',
  },
  doctors: {
    sharma: '50000000-0000-0000-0000-000000000001',
    patel: '50000000-0000-0000-0000-000000000002',
    gupta: '50000000-0000-0000-0000-000000000003',
    singh: '50000000-0000-0000-0000-000000000004',
    kumar: '50000000-0000-0000-0000-000000000005',
  },
  patients: {
    rahul: '60000000-0000-0000-0000-000000000001',
  },
};

const TESTS = [
  { id: 'T0000000-0000-0000-0000-000000000001', code: 'CBC', name: 'Complete Blood Count', dept: 'HEMATOLOGY', sample: 'BLOOD', tat: 4, mrp: 400, unit: '10^3/uL', range: '4.5-11.0' },
  { id: 'T0000000-0000-0000-0000-000000000002', code: 'FBS', name: 'Fasting Blood Sugar', dept: 'BIOCHEMISTRY', sample: 'BLOOD', tat: 2, mrp: 180, unit: 'mg/dL', range: '70-100' },
  { id: 'T0000000-0000-0000-0000-000000000003', code: 'LIPID', name: 'Lipid Profile', dept: 'BIOCHEMISTRY', sample: 'SERUM', tat: 6, mrp: 800, unit: 'mg/dL', range: null },
  { id: 'T0000000-0000-0000-0000-000000000004', code: 'THYROID', name: 'Thyroid Panel (T3/T4/TSH)', dept: 'IMMUNOLOGY', sample: 'SERUM', tat: 8, mrp: 1200, unit: 'mIU/L', range: '0.4-4.0' },
  { id: 'T0000000-0000-0000-0000-000000000005', code: 'HBA1C', name: 'HbA1c', dept: 'BIOCHEMISTRY', sample: 'BLOOD', tat: 4, mrp: 600, unit: '%', range: '4.0-5.6' },
  { id: 'T0000000-0000-0000-0000-000000000006', code: 'URINE', name: 'Urine Routine', dept: 'PATHOLOGY', sample: 'URINE', tat: 2, mrp: 200, unit: null, range: null },
  { id: 'T0000000-0000-0000-0000-000000000007', code: 'LFT', name: 'Liver Function Test', dept: 'BIOCHEMISTRY', sample: 'SERUM', tat: 6, mrp: 700, unit: 'U/L', range: null },
  { id: 'T0000000-0000-0000-0000-000000000008', code: 'KFT', name: 'Kidney Function Test', dept: 'BIOCHEMISTRY', sample: 'SERUM', tat: 6, mrp: 650, unit: 'mg/dL', range: null },
  { id: 'T0000000-0000-0000-0000-000000000009', code: 'ESR', name: 'Erythrocyte Sedimentation Rate', dept: 'HEMATOLOGY', sample: 'BLOOD', tat: 2, mrp: 150, unit: 'mm/hr', range: '0-20' },
  { id: 'T0000000-0000-0000-0000-000000000010', code: 'CRP', name: 'C-Reactive Protein', dept: 'IMMUNOLOGY', sample: 'SERUM', tat: 4, mrp: 500, unit: 'mg/L', range: '<5.0' },
  { id: 'T0000000-0000-0000-0000-000000000011', code: 'VITD', name: 'Vitamin D (25-OH)', dept: 'IMMUNOLOGY', sample: 'SERUM', tat: 24, mrp: 1500, unit: 'ng/mL', range: '30-100' },
  { id: 'T0000000-0000-0000-0000-000000000012', code: 'VITB12', name: 'Vitamin B12', dept: 'IMMUNOLOGY', sample: 'SERUM', tat: 24, mrp: 1200, unit: 'pg/mL', range: '200-900' },
  { id: 'T0000000-0000-0000-0000-000000000013', code: 'IRON', name: 'Iron Studies', dept: 'BIOCHEMISTRY', sample: 'SERUM', tat: 6, mrp: 800, unit: 'ug/dL', range: '60-170' },
  { id: 'T0000000-0000-0000-0000-000000000014', code: 'ELECTRO', name: 'Electrolytes (Na/K/Cl)', dept: 'BIOCHEMISTRY', sample: 'SERUM', tat: 4, mrp: 450, unit: 'mEq/L', range: null },
  { id: 'T0000000-0000-0000-0000-000000000015', code: 'BGRP', name: 'Blood Group (ABO + Rh)', dept: 'HEMATOLOGY', sample: 'BLOOD', tat: 1, mrp: 200, unit: null, range: null },
  { id: 'T0000000-0000-0000-0000-000000000016', code: 'PTINR', name: 'PT/INR', dept: 'HEMATOLOGY', sample: 'BLOOD', tat: 4, mrp: 350, unit: 'seconds', range: '11-13.5' },
  { id: 'T0000000-0000-0000-0000-000000000017', code: 'DENGUE', name: 'Dengue NS1 Antigen', dept: 'MICROBIOLOGY', sample: 'SERUM', tat: 4, mrp: 800, unit: null, range: 'Negative' },
  { id: 'T0000000-0000-0000-0000-000000000018', code: 'WIDAL', name: 'Widal Test', dept: 'MICROBIOLOGY', sample: 'SERUM', tat: 4, mrp: 300, unit: null, range: 'Negative' },
  { id: 'T0000000-0000-0000-0000-000000000019', code: 'MALARIA', name: 'Malaria (P.falciparum)', dept: 'MICROBIOLOGY', sample: 'BLOOD', tat: 2, mrp: 400, unit: null, range: 'Negative' },
  { id: 'T0000000-0000-0000-0000-000000000020', code: 'COVID', name: 'COVID-19 RT-PCR', dept: 'MICROBIOLOGY', sample: 'SWAB', tat: 24, mrp: 500, unit: null, range: 'Negative' },
];

const PERMISSIONS = [
  { id: 'P001', code: 'patient:create', module: 'mdm' },
  { id: 'P002', code: 'patient:read', module: 'mdm' },
  { id: 'P003', code: 'patient:update', module: 'mdm' },
  { id: 'P004', code: 'billing:create', module: 'billing' },
  { id: 'P005', code: 'billing:read', module: 'billing' },
  { id: 'P006', code: 'billing:update', module: 'billing' },
  { id: 'P007', code: 'billing:approve-adjustment', module: 'billing' },
  { id: 'P008', code: 'payment:create', module: 'billing' },
  { id: 'P009', code: 'payment:read', module: 'billing' },
  { id: 'P010', code: 'lims:read', module: 'lims' },
  { id: 'P011', code: 'lims:create', module: 'lims' },
  { id: 'P012', code: 'lims:update', module: 'lims' },
  { id: 'P013', code: 'lims:sign-off', module: 'lims' },
  { id: 'P014', code: 'lims:reject-sample', module: 'lims' },
  { id: 'P015', code: 'report:read', module: 'reporting' },
  { id: 'P016', code: 'report:resend', module: 'reporting' },
  { id: 'P017', code: 'mdm:read', module: 'mdm' },
  { id: 'P018', code: 'mdm:write', module: 'mdm' },
  { id: 'P019', code: 'finance:daily-close', module: 'finance' },
  { id: 'P020', code: 'auth:manage-users', module: 'auth' },
];

// Role -> permission codes mapping
const ROLE_PERMISSIONS: Record<string, string[]> = {
  RECEPTIONIST: ['patient:create', 'patient:read', 'patient:update', 'billing:create', 'billing:read', 'billing:update', 'payment:create', 'payment:read', 'lims:read', 'report:read', 'report:resend', 'mdm:read'],
  LAB_TECHNICIAN: ['lims:read', 'lims:create', 'lims:update', 'patient:read', 'mdm:read'],
  PATHOLOGIST: ['lims:read', 'lims:create', 'lims:update', 'lims:sign-off', 'patient:read', 'report:read', 'mdm:read'],
  CENTER_HEAD: ['patient:create', 'patient:read', 'patient:update', 'billing:create', 'billing:read', 'billing:update', 'billing:approve-adjustment', 'payment:create', 'payment:read', 'lims:read', 'lims:create', 'lims:update', 'lims:sign-off', 'lims:reject-sample', 'report:read', 'report:resend', 'mdm:read', 'mdm:write', 'finance:daily-close'],
  FINANCE_MANAGER: ['billing:create', 'billing:read', 'billing:update', 'billing:approve-adjustment', 'payment:create', 'payment:read', 'report:read', 'report:resend', 'mdm:read', 'mdm:write', 'finance:daily-close'],
  SYSTEM_ADMIN: PERMISSIONS.map(p => p.code),
};

async function seed() {
  console.log('Seeding Medrelief demo data...');

  const passwordHash = await bcrypt.hash('demo123', 10);

  // 1. Branches
  for (const [key, id] of Object.entries(IDS.branches)) {
    const data = key === 'main'
      ? { code: 'MDH-MAIN', name: 'Medrelief Madhubani Main', address: 'Main Road, Madhubani, Bihar', gstin: '10AABCM1234A1Z5' }
      : { code: 'MDH-PATNA', name: 'Medrelief Patna', address: 'Boring Road, Patna, Bihar', gstin: '10AABCM1234A2Z4' };

    await prisma.mdm_branches.upsert({
      where: { id },
      update: { ...data, updated_by: SYSTEM_USER },
      create: { id, tenant_id: TENANT_ID, ...data, status: 'ACTIVE', created_by: SYSTEM_USER, updated_by: SYSTEM_USER },
    });
  }

  // 2. Rate Plans (create before doctors since doctors reference them)
  const ratePlanData = [
    { id: IDS.ratePlans.mrp, name: 'Tenant MRP', plan_type: 'MRP', priority: 100 },
    { id: IDS.ratePlans.branchDefault, name: 'MDH-Main Branch Default', plan_type: 'BRANCH_DEFAULT', priority: 80 },
    { id: IDS.ratePlans.walkin, name: 'Walk-in Self Pay', plan_type: 'PAYER_TYPE', priority: 60 },
    { id: IDS.ratePlans.corporate, name: 'HealthCorp Corporate', plan_type: 'CORPORATE', priority: 40 },
    { id: IDS.ratePlans.drSharma, name: 'Dr. Sharma Special', plan_type: 'REFERRER', priority: 20 },
  ];

  for (const rp of ratePlanData) {
    await prisma.mdm_rate_plans.upsert({
      where: { id: rp.id },
      update: { name: rp.name, updated_by: SYSTEM_USER },
      create: {
        id: rp.id, tenant_id: TENANT_ID, name: rp.name, plan_type: rp.plan_type,
        priority: rp.priority, effective_from: new Date('2024-01-01'), status: 'ACTIVE',
        created_by: SYSTEM_USER, updated_by: SYSTEM_USER,
      },
    });
  }

  // Update branch default rate plan
  await prisma.mdm_branches.update({
    where: { id: IDS.branches.main },
    data: { default_rate_plan_id: IDS.ratePlans.branchDefault, updated_by: SYSTEM_USER },
  });

  // 3. Tests
  for (const t of TESTS) {
    await prisma.mdm_tests.upsert({
      where: { id: t.id },
      update: { name: t.name, base_mrp: t.mrp, updated_by: SYSTEM_USER },
      create: {
        id: t.id, tenant_id: TENANT_ID, test_code: t.code, name: t.name,
        department: t.dept, sample_type: t.sample, tat_hours: t.tat,
        base_mrp: t.mrp, unit: t.unit, reference_range: t.range,
        created_by: SYSTEM_USER, updated_by: SYSTEM_USER,
      },
    });
  }

  // 4. Rate Plan Test Prices
  // MRP plan: all tests at base_mrp
  let rpIdx = 0;
  for (const t of TESTS) {
    rpIdx++;
    await prisma.mdm_rate_plan_tests.upsert({
      where: { id: `RPT-MRP-${String(rpIdx).padStart(3, '0')}` },
      update: { price: t.mrp },
      create: {
        id: `RPT-MRP-${String(rpIdx).padStart(3, '0')}`,
        tenant_id: TENANT_ID, rate_plan_id: IDS.ratePlans.mrp,
        test_id: t.id, price: t.mrp, discount_percent: 0,
      },
    });
  }

  // Branch default: 90% of MRP
  rpIdx = 0;
  for (const t of TESTS) {
    rpIdx++;
    await prisma.mdm_rate_plan_tests.upsert({
      where: { id: `RPT-BD-${String(rpIdx).padStart(3, '0')}` },
      update: { price: Math.round(t.mrp * 0.9) },
      create: {
        id: `RPT-BD-${String(rpIdx).padStart(3, '0')}`,
        tenant_id: TENANT_ID, rate_plan_id: IDS.ratePlans.branchDefault,
        test_id: t.id, price: Math.round(t.mrp * 0.9), discount_percent: 10,
      },
    });
  }

  // Walk-in self-pay: top 10 tests at 85% of MRP
  for (let i = 0; i < 10; i++) {
    const t = TESTS[i];
    await prisma.mdm_rate_plan_tests.upsert({
      where: { id: `RPT-WI-${String(i + 1).padStart(3, '0')}` },
      update: { price: Math.round(t.mrp * 0.85) },
      create: {
        id: `RPT-WI-${String(i + 1).padStart(3, '0')}`,
        tenant_id: TENANT_ID, rate_plan_id: IDS.ratePlans.walkin,
        test_id: t.id, price: Math.round(t.mrp * 0.85), discount_percent: 15,
      },
    });
  }

  // Corporate plan: 15 tests at 70-80% of MRP
  for (let i = 0; i < 15; i++) {
    const t = TESTS[i];
    const discount = 0.7 + (i % 3) * 0.05; // alternating 70%, 75%, 80%
    await prisma.mdm_rate_plan_tests.upsert({
      where: { id: `RPT-CORP-${String(i + 1).padStart(3, '0')}` },
      update: { price: Math.round(t.mrp * discount) },
      create: {
        id: `RPT-CORP-${String(i + 1).padStart(3, '0')}`,
        tenant_id: TENANT_ID, rate_plan_id: IDS.ratePlans.corporate,
        test_id: t.id, price: Math.round(t.mrp * discount),
        discount_percent: Math.round((1 - discount) * 100),
      },
    });
  }

  // Dr. Sharma special: specific negotiated prices for 10 tests
  const sharmaTests = [
    { idx: 0, price: 250 },  // CBC
    { idx: 1, price: 120 },  // FBS
    { idx: 2, price: 550 },  // Lipid
    { idx: 3, price: 850 },  // Thyroid
    { idx: 4, price: 400 },  // HbA1c
    { idx: 5, price: 150 },  // Urine
    { idx: 6, price: 500 },  // LFT
    { idx: 7, price: 450 },  // KFT
    { idx: 8, price: 100 },  // ESR
    { idx: 9, price: 350 },  // CRP
  ];
  for (const st of sharmaTests) {
    const t = TESTS[st.idx];
    await prisma.mdm_rate_plan_tests.upsert({
      where: { id: `RPT-DRS-${String(st.idx + 1).padStart(3, '0')}` },
      update: { price: st.price },
      create: {
        id: `RPT-DRS-${String(st.idx + 1).padStart(3, '0')}`,
        tenant_id: TENANT_ID, rate_plan_id: IDS.ratePlans.drSharma,
        test_id: t.id, price: st.price,
        discount_percent: Math.round((1 - st.price / t.mrp) * 100),
      },
    });
  }

  // 5. Doctors
  const doctorData = [
    { id: IDS.doctors.sharma, code: 'DOC-001', name: 'Dr. Sharma', specialty: 'General Medicine', mobile: '9800000001', linked_rate_plan_id: IDS.ratePlans.drSharma },
    { id: IDS.doctors.patel, code: 'DOC-002', name: 'Dr. Patel', specialty: 'Cardiology', mobile: '9800000002', linked_rate_plan_id: null },
    { id: IDS.doctors.gupta, code: 'DOC-003', name: 'Dr. Gupta', specialty: 'Orthopedics', mobile: '9800000003', linked_rate_plan_id: null },
    { id: IDS.doctors.singh, code: 'DOC-004', name: 'Dr. Singh', specialty: 'Pathology', mobile: '9800000004', linked_rate_plan_id: null },
    { id: IDS.doctors.kumar, code: 'DOC-005', name: 'Dr. Kumar', specialty: 'Pediatrics', mobile: '9800000005', linked_rate_plan_id: null },
  ];

  for (const d of doctorData) {
    await prisma.mdm_doctors.upsert({
      where: { id: d.id },
      update: { name: d.name, linked_rate_plan_id: d.linked_rate_plan_id, updated_by: SYSTEM_USER },
      create: {
        id: d.id, tenant_id: TENANT_ID, doctor_code: d.code, name: d.name,
        specialty: d.specialty, mobile: d.mobile,
        linked_rate_plan_id: d.linked_rate_plan_id,
        created_by: SYSTEM_USER, updated_by: SYSTEM_USER,
      },
    });
  }

  // 6. Permissions
  for (const p of PERMISSIONS) {
    await prisma.auth_permissions.upsert({
      where: { id: p.id },
      update: { code: p.code, module: p.module },
      create: { id: p.id, code: p.code, description: p.code, module: p.module },
    });
  }

  // 7. Roles
  const roleData = [
    { id: IDS.roles.receptionist, name: 'Receptionist', code: 'RECEPTIONIST' },
    { id: IDS.roles.labTech, name: 'Lab Technician', code: 'LAB_TECHNICIAN' },
    { id: IDS.roles.pathologist, name: 'Pathologist', code: 'PATHOLOGIST' },
    { id: IDS.roles.centerHead, name: 'Center Head', code: 'CENTER_HEAD' },
    { id: IDS.roles.finance, name: 'Finance Manager', code: 'FINANCE_MANAGER' },
    { id: IDS.roles.admin, name: 'System Admin', code: 'SYSTEM_ADMIN' },
  ];

  for (const r of roleData) {
    await prisma.auth_roles.upsert({
      where: { id: r.id },
      update: { name: r.name, updated_by: SYSTEM_USER },
      create: {
        id: r.id, tenant_id: TENANT_ID, name: r.name, code: r.code,
        created_by: SYSTEM_USER, updated_by: SYSTEM_USER,
      },
    });
  }

  // 8. Role-Permission mappings
  let rpId = 0;
  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = roleData.find(r => r.code === roleCode)!;
    for (const permCode of permCodes) {
      const perm = PERMISSIONS.find(p => p.code === permCode);
      if (!perm) continue;
      rpId++;
      const id = `RP-${String(rpId).padStart(4, '0')}`;
      await prisma.auth_role_permissions.upsert({
        where: { id },
        update: {},
        create: { id, role_id: role.id, permission_id: perm.id },
      });
    }
  }

  // 9. Users
  const userData = [
    { id: IDS.users.receptionist1, username: 'receptionist1', fullName: 'Priya Sharma', roleId: IDS.roles.receptionist },
    { id: IDS.users.labtech1, username: 'labtech1', fullName: 'Amit Kumar', roleId: IDS.roles.labTech },
    { id: IDS.users.pathologist1, username: 'pathologist1', fullName: 'Dr. Meena Singh', roleId: IDS.roles.pathologist },
    { id: IDS.users.centerhead1, username: 'centerhead1', fullName: 'Rajesh Verma', roleId: IDS.roles.centerHead },
    { id: IDS.users.finance1, username: 'finance1', fullName: 'Suman Agarwal', roleId: IDS.roles.finance },
    { id: IDS.users.admin1, username: 'admin1', fullName: 'System Admin', roleId: IDS.roles.admin },
  ];

  for (const u of userData) {
    await prisma.auth_users.upsert({
      where: { id: u.id },
      update: { full_name: u.fullName, password_hash: passwordHash, updated_by: SYSTEM_USER },
      create: {
        id: u.id, tenant_id: TENANT_ID, branch_id: IDS.branches.main,
        username: u.username, full_name: u.fullName,
        password_hash: passwordHash, role_id: u.roleId, status: 'ACTIVE',
        created_by: SYSTEM_USER, updated_by: SYSTEM_USER,
      },
    });
  }

  // 10. Demo patient
  await prisma.mdm_patients.upsert({
    where: { id: IDS.patients.rahul },
    update: { updated_by: SYSTEM_USER },
    create: {
      id: IDS.patients.rahul, tenant_id: TENANT_ID,
      patient_code: 'MR-PAT-00001', full_name: 'Rahul Kumar',
      gender: 'MALE', dob: new Date('1990-05-15'), age_years: 34,
      mobile: '9876543210', email: 'rahul@example.com',
      address: 'Madhubani, Bihar',
      created_by: SYSTEM_USER, updated_by: SYSTEM_USER,
    },
  });

  console.log('Seed completed successfully.');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
