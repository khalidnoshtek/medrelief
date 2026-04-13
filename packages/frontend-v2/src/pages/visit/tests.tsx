import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { aiApi, billingApi, mdmApi } from '../../api';
import { BigButton, Alert } from '../../components/ui/primitives';
import { useVisit } from './visit-context';

export default function TestsPage() {
  const navigate = useNavigate();
  const { draft, update } = useVisit();
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const { data: allTests } = useQuery({ queryKey: ['tests'], queryFn: () => mdmApi.getTests() });
  const { data: suggested } = useQuery({
    queryKey: ['suggest', draft.referrerSpecialty],
    queryFn: () => aiApi.suggestTests(draft.referrerSpecialty || ''),
    enabled: !!draft.referrerSpecialty,
  });

  const suggestedTests = useMemo(() => {
    if (!suggested || !allTests) return [];
    return allTests.filter((t: any) => suggested.suggested_tests.includes(t.name));
  }, [suggested, allTests]);

  const filtered = useMemo(() => {
    if (!allTests) return [];
    const q = search.toLowerCase();
    if (!q) return allTests.slice(0, 20);
    return allTests.filter((t: any) =>
      t.name.toLowerCase().includes(q) || t.test_code.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [allTests, search]);

  // Resolve prices whenever selection changes
  useEffect(() => {
    if (draft.selectedTestIds.length === 0) return;
    (async () => {
      try {
        const res = await billingApi.previewPrices({
          test_ids: draft.selectedTestIds,
          referrer_id: draft.referrerId,
          payer_type: draft.payerType,
          branch_id: null, // use current branch from ctx
        });
        const priceMap = new Map(res.test_prices.map((p: any) => [p.test_id, p]));
        const selected = draft.selectedTestIds.map((id) => {
          const t = allTests?.find((x: any) => x.id === id);
          const p: any = priceMap.get(id);
          return {
            id, name: t?.name || '',
            price: p?.price ?? Number(t?.base_mrp ?? 0),
            ratePlanName: p?.rate_plan_name,
          };
        });
        update({ selectedTests: selected });
      } catch {}
    })();
  }, [draft.selectedTestIds, draft.referrerId, allTests]);

  const toggleTest = (testId: string) => {
    const ids = draft.selectedTestIds.includes(testId)
      ? draft.selectedTestIds.filter((x) => x !== testId)
      : [...draft.selectedTestIds, testId];
    update({ selectedTestIds: ids });
  };

  const grossTotal = draft.selectedTests.reduce((s, t) => s + t.price, 0);
  const rounded = Math.round(grossTotal / 10) * 10;

  const submit = () => {
    if (draft.selectedTestIds.length === 0) { setError('Add at least one test'); return; }
    navigate('/visit/payment');
  };

  const TestRow = ({ t, suggested }: { t: any; suggested?: boolean }) => {
    const selected = draft.selectedTestIds.includes(t.id);
    return (
      <button
        onClick={() => toggleTest(t.id)}
        className={`w-full text-left rounded-xl border p-3 flex justify-between items-start ${
          selected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 active:bg-gray-50'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-800">{t.name}</p>
            {suggested && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Suggested</span>}
          </div>
          <p className="text-xs text-gray-400">{t.test_code} • {t.department}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">₹{Number(t.base_mrp).toFixed(0)}</span>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
            {selected && '✓'}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="p-5 space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Select Tests</h1>
        <p className="text-sm text-gray-500">Step 3 of 4 • {draft.selectedTestIds.length} selected</p>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search tests..."
        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />

      {suggestedTests.length > 0 && !search && (
        <div>
          <p className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">
            Suggested for {draft.referrerSpecialty}
          </p>
          <div className="space-y-2">
            {suggestedTests.map((t: any) => <TestRow key={t.id} t={t} suggested />)}
          </div>
        </div>
      )}

      {!search && (
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">All tests</p>
      )}
      <div className="space-y-2">
        {filtered.filter((t: any) => !suggestedTests.find((s: any) => s.id === t.id)).map((t: any) => (
          <TestRow key={t.id} t={t} />
        ))}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {/* Sticky total + CTA */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-3xl px-5">
        <div className="bg-white shadow-lg border border-gray-200 rounded-2xl p-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-500">Total ({draft.selectedTestIds.length} tests)</p>
            <p className="text-xl font-bold">₹{rounded}</p>
          </div>
          <button
            onClick={submit}
            disabled={draft.selectedTestIds.length === 0}
            className="bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold disabled:opacity-50 active:bg-blue-700"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
