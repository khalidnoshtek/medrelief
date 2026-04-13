/**
 * Suggests common tests for a given doctor specialty.
 * Phase 1: static mapping (fast, free, deterministic).
 * Phase 2: Claude call for edge cases.
 */

const SPECIALTY_TEST_MAP: Record<string, string[]> = {
  'General Medicine': ['Complete Blood Count', 'Fasting Blood Sugar', 'Lipid Profile', 'Liver Function Test', 'Kidney Function Test'],
  'Gynecology': ['Complete Blood Count', 'Thyroid Panel (T3/T4/TSH)', 'Vitamin D (25-OH)', 'Urine Routine', 'HbA1c'],
  'Cardiology': ['Lipid Profile', 'HbA1c', 'Complete Blood Count', 'Liver Function Test', 'Kidney Function Test'],
  'Orthopedics': ['Complete Blood Count', 'Vitamin D (25-OH)', 'Vitamin B12', 'Erythrocyte Sedimentation Rate', 'C-Reactive Protein'],
  'Pathology': ['Complete Blood Count', 'Erythrocyte Sedimentation Rate', 'C-Reactive Protein', 'Blood Group (ABO + Rh)'],
  'Pediatrics': ['Complete Blood Count', 'Urine Routine', 'Widal Test', 'Malaria (P.falciparum)', 'Dengue NS1 Antigen'],
  'Endocrinology': ['Thyroid Panel (T3/T4/TSH)', 'HbA1c', 'Fasting Blood Sugar', 'Lipid Profile', 'Vitamin D (25-OH)'],
};

export function suggestTestsBySpecialty(specialty: string | null | undefined): string[] {
  if (!specialty) return [];
  const key = Object.keys(SPECIALTY_TEST_MAP).find(
    (k) => k.toLowerCase() === specialty.toLowerCase()
  );
  return key ? SPECIALTY_TEST_MAP[key] : [];
}

export function getAllSpecialties(): string[] {
  return Object.keys(SPECIALTY_TEST_MAP);
}
