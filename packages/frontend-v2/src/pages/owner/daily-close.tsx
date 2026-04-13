import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../api';
import { useAuthStore } from '../../store/auth-store';
import { BigButton, Alert, LoadingPage } from '../../components/ui/primitives';

export default function DailyClosePage() {
  const user = useAuthStore((s) => s.user)!;
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');

  const { data: history, isLoading } = useQuery({
    queryKey: ['daily-close', user.branchId],
    queryFn: () => financeApi.getDailyCloseHistory(user.branchId),
  });

  const todayClosed = history?.find((h: any) => h.close_date === today && h.status === 'CLOSED');

  const run = async () => {
    setClosing(true); setError('');
    try {
      await financeApi.dailyClose(user.branchId);
      qc.invalidateQueries({ queryKey: ['daily-close'] });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Close failed');
    } finally { setClosing(false); }
  };

  if (isLoading) return <LoadingPage />;

  return (
    <div className="p-5 space-y-4 pb-8">
      <h1 className="text-xl font-bold text-gray-800">Daily Close</h1>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-semibold">Today — {today}</p>
            <p className="text-xs text-gray-500">{user.branchName}</p>
          </div>
          {todayClosed ? (
            <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-medium">CLOSED</span>
          ) : (
            <button onClick={run} disabled={closing}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {closing ? 'Closing...' : 'Run Close'}
            </button>
          )}
        </div>

        {todayClosed && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <p className="text-[10px] text-gray-500">Bills</p>
              <p className="text-lg font-bold">{todayClosed.total_bills}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <p className="text-[10px] text-gray-500">Revenue</p>
              <p className="text-lg font-bold">₹{Number(todayClosed.total_revenue).toFixed(0)}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-2 text-center">
              <p className="text-[10px] text-gray-500">Refunds</p>
              <p className="text-lg font-bold">₹{Number(todayClosed.total_refunds).toFixed(0)}</p>
            </div>
          </div>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {history && history.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Recent</p>
          <div className="space-y-2">
            {history.map((h: any) => (
              <div key={h.id} className="bg-white rounded-xl p-3 shadow-sm flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{h.close_date}</p>
                  <p className="text-xs text-gray-500">{h.total_bills} bills • ₹{Number(h.total_revenue).toFixed(0)}</p>
                </div>
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{h.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
