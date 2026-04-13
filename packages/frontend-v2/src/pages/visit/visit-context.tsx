import { createContext, useContext, useState, ReactNode } from 'react';

export interface VisitDraft {
  // Image + AI output
  prescriptionImageUrl?: string;
  extractionProvider?: string;

  // Patient
  patientId?: string;
  patientName?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  ageYears?: number;
  mobile?: string;

  // Visit details
  visitType: 'WALK_IN' | 'HOME_COLLECTION' | 'CAMP' | 'CORPORATE';
  payerType: 'SELF' | 'CORPORATE' | 'INSURANCE';
  referrerId?: string;
  referrerName?: string;
  referrerSpecialty?: string;
  fastingStatus?: 'FASTING' | 'NON_FASTING' | 'NOT_APPLICABLE';
  pregnancyStatus?: 'PREGNANT' | 'NOT_PREGNANT' | 'NOT_APPLICABLE';

  // Selected items (tests)
  selectedTestIds: string[];
  selectedTests: Array<{ id: string; name: string; price: number; ratePlanName?: string }>;

  // Confidence flags per field
  fieldConfidence: Record<string, 'high' | 'medium' | 'low'>;
}

const defaultDraft: VisitDraft = {
  visitType: 'WALK_IN',
  payerType: 'SELF',
  fastingStatus: 'NOT_APPLICABLE',
  selectedTestIds: [],
  selectedTests: [],
  fieldConfidence: {},
};

interface VisitContextType {
  draft: VisitDraft;
  update: (partial: Partial<VisitDraft>) => void;
  reset: () => void;
}

const VisitContext = createContext<VisitContextType | null>(null);

export function VisitProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<VisitDraft>(defaultDraft);
  const update = (partial: Partial<VisitDraft>) => setDraft((d) => ({ ...d, ...partial }));
  const reset = () => setDraft(defaultDraft);
  return <VisitContext.Provider value={{ draft, update, reset }}>{children}</VisitContext.Provider>;
}

export function useVisit() {
  const ctx = useContext(VisitContext);
  if (!ctx) throw new Error('useVisit must be inside VisitProvider');
  return ctx;
}
