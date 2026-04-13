import fs from 'fs';
import path from 'path';
import { generateId } from '../../shared/utils/id-generator';

/**
 * Provider-agnostic prescription extraction service.
 * Selects provider based on env var EXTRACTION_PROVIDER:
 *   - mock (default) — returns canned data, free, for dev
 *   - claude — uses Anthropic Claude Vision API
 *   - google — Google Cloud Vision (stub)
 *   - tesseract — local OCR (stub)
 *
 * Retry chain on failure: primary -> fallback -> manual.
 */

export interface ExtractedField<T = string> {
  value: T | null;
  confidence: 'high' | 'medium' | 'low';
  source: string; // which provider
}

export interface ExtractedPrescription {
  patient_name: ExtractedField;
  gender: ExtractedField<'MALE' | 'FEMALE' | 'OTHER'>;
  age_years: ExtractedField<number>;
  mobile: ExtractedField;
  doctor_name: ExtractedField;
  doctor_specialty: ExtractedField;
  tests: ExtractedField<string[]>;
  fasting_required: ExtractedField<boolean>;
  raw_text: string | null;
  provider_used: string;
  errors: string[];
}

const PRESCRIPTIONS_DIR = path.resolve(process.cwd(), 'storage', 'prescriptions');

export async function saveUploadedImage(base64DataUrl: string, visitId?: string): Promise<string> {
  fs.mkdirSync(PRESCRIPTIONS_DIR, { recursive: true });
  const match = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) throw new Error('Invalid image data URL');
  const ext = match[1];
  const buf = Buffer.from(match[2], 'base64');
  const id = visitId || generateId();
  const filePath = path.join(PRESCRIPTIONS_DIR, `${id}.${ext}`);
  fs.writeFileSync(filePath, buf);
  return `storage/prescriptions/${id}.${ext}`;
}

// ─────────────────────────────────────────────────────────────
// Mock provider — returns realistic canned data
// ─────────────────────────────────────────────────────────────
function mockExtract(): ExtractedPrescription {
  const mockTests = ['Complete Blood Count', 'Fasting Blood Sugar', 'Lipid Profile'];
  return {
    patient_name: { value: 'Rahul Kumar', confidence: 'high', source: 'mock' },
    gender: { value: 'MALE', confidence: 'medium', source: 'mock' },
    age_years: { value: 34, confidence: 'high', source: 'mock' },
    mobile: { value: '9876543210', confidence: 'high', source: 'mock' },
    doctor_name: { value: 'Dr. Sharma', confidence: 'medium', source: 'mock' },
    doctor_specialty: { value: 'General Medicine', confidence: 'low', source: 'mock' },
    tests: { value: mockTests, confidence: 'medium', source: 'mock' },
    fasting_required: { value: true, confidence: 'medium', source: 'mock' },
    raw_text: '[MOCK] Patient: Rahul Kumar, 34M, 9876543210\nDr. Sharma\nCBC, FBS, Lipid',
    provider_used: 'mock',
    errors: [],
  };
}

// ─────────────────────────────────────────────────────────────
// Claude Vision provider
// ─────────────────────────────────────────────────────────────
async function claudeExtract(base64Image: string, mediaType: string): Promise<ExtractedPrescription> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are a medical data extractor for a diagnostic lab LIMS. Analyze this prescription image and return ONLY a JSON object (no markdown) with these fields:
{
  "patient_name": string | null,
  "gender": "MALE" | "FEMALE" | "OTHER" | null,
  "age_years": number | null,
  "mobile": string | null (10 digits if found),
  "doctor_name": string | null,
  "doctor_specialty": string | null,
  "tests": string[] (list of test names mentioned),
  "fasting_required": boolean | null (true if any test typically needs fasting: FBS, Lipid Profile, etc.),
  "confidence_notes": string (short note on what was clear vs unclear)
}

Rules:
- Return only JSON, no prose, no markdown fences.
- Infer gender from name if not explicitly stated (use "OTHER" if truly ambiguous).
- Normalize test names to standard lab terms (e.g., "sugar" -> "Fasting Blood Sugar" if fasting context).
- If you cannot read a field, use null.`;

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType as any, data: base64Image } },
        { type: 'text', text: prompt },
      ],
    }],
  });

  const textBlock = response.content.find((b: any) => b.type === 'text') as any;
  if (!textBlock) throw new Error('No text response from Claude');

  // Strip possible markdown fence
  let jsonStr = textBlock.text.trim();
  jsonStr = jsonStr.replace(/^```json\s*|```$/g, '').trim();
  const data = JSON.parse(jsonStr);

  const mapConfidence = (v: any): 'high' | 'medium' | 'low' =>
    v === null || v === undefined ? 'low' : 'high';

  return {
    patient_name: { value: data.patient_name, confidence: mapConfidence(data.patient_name), source: 'claude' },
    gender: { value: data.gender, confidence: mapConfidence(data.gender), source: 'claude' },
    age_years: { value: data.age_years, confidence: mapConfidence(data.age_years), source: 'claude' },
    mobile: { value: data.mobile, confidence: mapConfidence(data.mobile), source: 'claude' },
    doctor_name: { value: data.doctor_name, confidence: mapConfidence(data.doctor_name), source: 'claude' },
    doctor_specialty: { value: data.doctor_specialty, confidence: mapConfidence(data.doctor_specialty), source: 'claude' },
    tests: { value: data.tests || [], confidence: (data.tests?.length ?? 0) > 0 ? 'high' : 'low', source: 'claude' },
    fasting_required: { value: data.fasting_required, confidence: mapConfidence(data.fasting_required), source: 'claude' },
    raw_text: data.confidence_notes || null,
    provider_used: 'claude',
    errors: [],
  };
}

// ─────────────────────────────────────────────────────────────
// Main extraction entrypoint with retry chain
// ─────────────────────────────────────────────────────────────
export async function extractFromPrescription(
  base64DataUrl: string
): Promise<ExtractedPrescription> {
  const provider = process.env.EXTRACTION_PROVIDER || 'mock';

  // Parse data URL
  const match = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) {
    return {
      ...mockExtract(),
      provider_used: 'error',
      errors: ['Invalid image data URL'],
    };
  }
  const mediaType = `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}`;
  const base64 = match[2];

  const errors: string[] = [];

  // Primary: provider chosen via env
  try {
    if (provider === 'claude') {
      return await claudeExtract(base64, mediaType);
    }
    // Add other providers here (google, tesseract)
  } catch (err: any) {
    errors.push(`${provider} failed: ${err.message}`);
    console.warn(`[Extraction] ${provider} failed:`, err.message);
  }

  // Fallback: mock (always works)
  const mock = mockExtract();
  mock.errors = errors;
  return mock;
}
