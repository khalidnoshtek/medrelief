import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mdmApi } from '../../api';
import { BigButton, ConfidenceBadge, Alert } from '../../components/ui/primitives';
import { VoiceButton } from '../../components/common/voice-input';
import { useVisit } from './visit-context';

// Normalize doctor name for comparison: lowercase, drop "dr", strip punctuation/whitespace
function normName(n: string) {
  return n.toLowerCase().replace(/^dr\.?\s*/, '').replace(/[^a-z0-9]/g, '').trim();
}

export default function VerifyPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { draft, update } = useVisit();
  const [error, setError] = useState('');
  const [addingDoctor, setAddingDoctor] = useState(false);

  // Auto-match referring doctor from extracted name (fuzzy)
  const { data: doctors } = useQuery({ queryKey: ['doctors'], queryFn: mdmApi.getDoctors });
  useEffect(() => {
    if (draft.referrerName && !draft.referrerId && doctors?.length) {
      const n = normName(draft.referrerName);
      if (!n) return;
      // Try exact, then contains (both directions)
      let match = doctors.find((d: any) => normName(d.name) === n);
      if (!match) match = doctors.find((d: any) => normName(d.name).includes(n) || n.includes(normName(d.name)));
      if (match) update({ referrerId: match.id, referrerSpecialty: match.specialty });
    }
  }, [draft.referrerName, doctors, draft.referrerId]);

  const extractedNotMatched = draft.referrerName && !draft.referrerId && doctors?.length;

  const addExtractedDoctor = async () => {
    if (!draft.referrerName) return;
    setAddingDoctor(true);
    try {
      const newDoc = await mdmApi.createDoctor({
        name: draft.referrerName.replace(/^dr\.?\s*/i, '').trim(),
        specialty: draft.referrerSpecialty || 'General Medicine',
      });
      update({ referrerId: newDoc.id, referrerName: newDoc.name, referrerSpecialty: newDoc.specialty });
      qc.invalidateQueries({ queryKey: ['doctors'] });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add doctor');
    } finally { setAddingDoctor(false); }
  };

  const canProceed = draft.patientName && draft.gender && draft.ageYears && draft.mobile && /^\d{10}$/.test(draft.mobile || '');

  const submit = () => {
    if (!canProceed) { setError('Please fill all required fields (name, gender, age, 10-digit mobile)'); return; }
    navigate('/visit/tests');
  };

  const Field = ({ label, value, onChange, confidence, type = 'text', placeholder, options }: any) => (
    <div className={`bg-white rounded-xl border p-3 ${
      confidence === 'low' ? 'border-red-300' : confidence === 'medium' ? 'border-yellow-300' : 'border-gray-200'
    }`}>
      <div className="flex justify-between items-start mb-1">
        <label className="text-xs text-gray-500 font-medium">{label}</label>
        {confidence && <ConfidenceBadge level={confidence} />}
      </div>
      <div className="flex items-center gap-2">
        {options ? (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-transparent outline-none text-gray-800 font-medium"
          >
            <option value="">—</option>
            {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input
            type={type}
            value={value || ''}
            onChange={(e) => onChange(type === 'number' ? (parseInt(e.target.value) || undefined) : e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-gray-800 font-medium"
          />
        )}
        {!options && <VoiceButton onText={(t) => onChange(t)} />}
      </div>
    </div>
  );

  return (
    <div className="p-5 space-y-3 pb-8">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Verify Details</h1>
        <p className="text-sm text-gray-500">Step 2 of 4 • Confirm what AI extracted</p>
      </div>

      {draft.extractionProvider && draft.extractionProvider !== 'manual' && (
        <Alert tone="info">Extracted by <b>{draft.extractionProvider}</b>. Check highlighted fields before continuing.</Alert>
      )}

      <Field
        label="Patient name *"
        value={draft.patientName}
        onChange={(v: string) => update({ patientName: v })}
        confidence={draft.fieldConfidence.patient_name}
        placeholder="Full name"
      />

      <Field
        label="Gender *"
        value={draft.gender}
        onChange={(v: string) => update({ gender: v as any })}
        confidence={draft.fieldConfidence.gender}
        options={[{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'OTHER', label: 'Other' }]}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Age *" type="number"
          value={draft.ageYears}
          onChange={(v: number) => update({ ageYears: v })}
          confidence={draft.fieldConfidence.age}
          placeholder="34"
        />
        <Field
          label="Mobile *"
          value={draft.mobile}
          onChange={(v: string) => update({ mobile: v.replace(/\D/g, '').slice(0, 10) })}
          confidence={draft.fieldConfidence.mobile}
          placeholder="9876543210"
        />
      </div>

      <Field
        label="Referring doctor"
        value={draft.referrerId}
        onChange={(v: string) => {
          const d = doctors?.find((x: any) => x.id === v);
          update({ referrerId: v, referrerName: d?.name, referrerSpecialty: d?.specialty });
        }}
        confidence={draft.fieldConfidence.doctor}
        options={(doctors || []).map((d: any) => ({ value: d.id, label: `${d.name} (${d.specialty})` }))}
      />

      {extractedNotMatched && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm">
          <p className="text-yellow-800 mb-2">
            AI extracted <b>Dr. {draft.referrerName}</b> but this doctor is not in your list.
          </p>
          <div className="flex gap-2">
            <button
              onClick={addExtractedDoctor}
              disabled={addingDoctor}
              className="flex-1 bg-yellow-600 text-white px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
            >{addingDoctor ? 'Adding...' : `+ Add "${draft.referrerName}" to list`}</button>
            <button
              onClick={() => update({ referrerName: undefined })}
              className="px-3 py-2 border border-yellow-300 text-yellow-700 rounded-lg text-xs"
            >Ignore</button>
          </div>
        </div>
      )}

      {draft.gender === 'FEMALE' && draft.ageYears && draft.ageYears >= 15 && draft.ageYears <= 50 && (
        <Field
          label="Pregnancy status"
          value={draft.pregnancyStatus}
          onChange={(v: string) => update({ pregnancyStatus: v as any })}
          options={[
            { value: 'NOT_PREGNANT', label: 'Not pregnant' },
            { value: 'PREGNANT', label: 'Pregnant' },
            { value: 'NOT_APPLICABLE', label: 'Prefer not to say' },
          ]}
        />
      )}

      <Field
        label="Fasting status"
        value={draft.fastingStatus}
        onChange={(v: string) => update({ fastingStatus: v as any })}
        options={[
          { value: 'FASTING', label: 'Fasting' },
          { value: 'NON_FASTING', label: 'Non-fasting' },
          { value: 'NOT_APPLICABLE', label: 'Not applicable' },
        ]}
      />

      {error && <Alert tone="error">{error}</Alert>}

      <div className="pt-3">
        <BigButton onClick={submit} disabled={!canProceed}>Continue to Tests →</BigButton>
      </div>
    </div>
  );
}
