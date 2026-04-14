import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mdmApi, billingApi } from '../../api';
import { BigButton, Spinner, EmptyState, Alert } from '../../components/ui/primitives';
import { QrScanner } from '../../components/common/qr-scanner';
import { QrCode, Search, ArrowRight } from 'lucide-react';

type Mode = 'patient' | 'doctor' | 'qr';

export default function StatusPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('patient');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [error, setError] = useState('');

  const lookupByQr = async (payload: string) => {
    setLoading(true); setError(''); setResults([]);
    try {
      const id = payload.includes('/') ? payload.split(/[\/?=&]/).filter(Boolean).pop() : payload.trim();
      const bill = await billingApi.getByQr(id || payload.trim());
      if (bill) {
        // Hard navigation — forces full page load, most reliable on mobile after camera use
        const base = import.meta.env.BASE_URL || '/';
        window.location.href = `${window.location.origin}${base}bills/${bill.id}`;
        return;
      }
      setError(`No bill found for code: ${id}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'QR lookup failed';
      setError(`${msg} — Scanned: ${payload.substring(0, 40)}${payload.length > 40 ? '...' : ''}`);
    } finally { setLoading(false); }
  };

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true); setError('');
    try {
      if (mode === 'patient') {
        const patients = await mdmApi.searchPatients(query);
        setResults(patients);
      } else if (mode === 'doctor') {
        const all = await mdmApi.getDoctors();
        const q = query.toLowerCase();
        setResults(all.filter((d: any) =>
          d.name.toLowerCase().includes(q) ||
          (d.mobile && d.mobile.includes(query))
        ));
      } else {
        await lookupByQr(query);
      }
    } catch {} finally { setLoading(false); }
  };

  return (
    <div className="p-5 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">Check Status</h1>

      {/* Mode toggle */}
      <div className="grid grid-cols-3 bg-white rounded-xl p-1 border border-gray-200">
        {(['patient', 'doctor', 'qr'] as Mode[]).map((m) => (
          <button key={m} onClick={() => { setMode(m); setResults([]); setQuery(''); setError(''); }}
            className={`py-2 rounded-lg text-sm font-medium capitalize ${mode === m ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>
            {m === 'qr' ? 'QR' : m}
          </button>
        ))}
      </div>

      {mode === 'qr' ? (
        <>
          <BigButton tone="primary" onClick={() => setScannerOpen(true)} icon={<QrCode size={18} />}>
            Scan QR Code
          </BigButton>
          <div className="text-center text-xs text-gray-400">or paste QR payload manually</div>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Paste QR value"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
            <button onClick={search} disabled={!query.trim()} className="bg-blue-600 text-white px-5 rounded-xl font-semibold active:bg-blue-700 disabled:opacity-40">
              {loading ? <Spinner size="sm" /> : <ArrowRight size={18} />}
            </button>
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(mode === 'patient' ? e.target.value.replace(/\D/g, '') : e.target.value)}
            placeholder={mode === 'patient' ? 'Mobile number' : 'Doctor name or mobile'}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button onClick={search} className="bg-blue-600 text-white px-5 rounded-xl font-semibold active:bg-blue-700">
            {loading ? <Spinner size="sm" /> : <Search size={18} />}
          </button>
        </div>
      )}

      {error && <Alert tone="error" onDismiss={() => setError('')}>{error}</Alert>}

      {loading && <Spinner />}

      {!loading && mode !== 'qr' && results.length === 0 && query && <EmptyState title="No results" />}

      <div className="space-y-2">
        {results.map((r: any) => (
          <button
            key={r.id}
            onClick={() => mode === 'patient' ? navigate(`/patients/${r.id}`) : navigate(`/doctors/${r.id}/tests`)}
            className="w-full text-left bg-white rounded-xl p-3 shadow-sm active:bg-gray-50"
          >
            <p className="font-medium text-gray-800">{r.full_name || r.name}</p>
            <p className="text-xs text-gray-500">
              {r.mobile}
              {r.specialty && ` • ${r.specialty}`}
              {r.gender && ` • ${r.gender}, ${r.age_years}y`}
            </p>
          </button>
        ))}
      </div>

      {scannerOpen && (
        <QrScanner
          onScan={(text) => {
            setScannerOpen(false);
            // Small delay to let scanner cleanup finish before navigation
            setTimeout(() => lookupByQr(text), 300);
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  );
}
