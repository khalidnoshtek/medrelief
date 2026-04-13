import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { limsApi } from '../../api';
import { BigButton, Alert, Spinner } from '../../components/ui/primitives';
import { VoiceButton } from '../../components/common/voice-input';

export default function ResultEntryPage() {
  const { testOrderId } = useParams<{ testOrderId: string }>();
  const nav = useNavigate();
  const [rawValue, setRawValue] = useState('');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!rawValue.trim()) return;
    setLoading(true); setError('');
    try {
      await limsApi.enterResult({ test_order_id: testOrderId, raw_value: rawValue, comments: comments || undefined });
      setSuccess(true);
      setTimeout(() => nav('/lab/worklist'), 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally { setLoading(false); }
  };

  if (success) return (
    <div className="p-8 text-center">
      <div className="text-5xl mb-3">✅</div>
      <p className="text-lg font-medium">Saved</p>
    </div>
  );

  return (
    <form onSubmit={submit} className="p-5 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Enter Result</h1>
        <p className="text-sm text-gray-500">Type or dictate value</p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <label className="text-xs text-gray-500">Result value *</label>
        <div className="flex items-center gap-2 mt-1">
          <input
            value={rawValue}
            onChange={(e) => setRawValue(e.target.value)}
            placeholder="e.g. 7.5 or Negative"
            autoFocus
            className="flex-1 text-xl font-semibold outline-none"
          />
          <VoiceButton onText={(t) => setRawValue(t)} />
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <label className="text-xs text-gray-500">Comments (optional)</label>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={3}
          className="w-full text-sm outline-none mt-1 resize-none"
        />
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid grid-cols-2 gap-3">
        <BigButton tone="secondary" onClick={() => nav('/lab/worklist')}>Cancel</BigButton>
        <BigButton onClick={submit as any} disabled={loading || !rawValue.trim()}>
          {loading ? <Spinner size="sm" /> : 'Save Result'}
        </BigButton>
      </div>
    </form>
  );
}
