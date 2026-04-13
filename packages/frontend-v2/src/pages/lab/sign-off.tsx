import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { limsApi } from '../../api';
import { useAuthStore } from '../../store/auth-store';
import { LoadingPage, EmptyState, Alert, BigButton } from '../../components/ui/primitives';
import { useState } from 'react';

export default function SignOffPage() {
  const user = useAuthStore((s) => s.user)!;
  const qc = useQueryClient();
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['signoff', user.branchId],
    queryFn: () => limsApi.getWorklist({ branch_id: user.branchId, status: 'COMPLETED' }),
    refetchInterval: 10000,
  });

  const signOffM = useMutation({
    mutationFn: (id: string) => limsApi.signOff(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['signoff'] }),
    onError: (e: any) => setError(e.response?.data?.message || 'Sign-off failed'),
  });

  const orders = data?.data || [];

  return (
    <div className="p-5 space-y-3 pb-8">
      <h1 className="text-xl font-bold text-gray-800">Sign-Off</h1>

      {error && <Alert tone="error" onDismiss={() => setError('')}>{error}</Alert>}

      {isLoading ? <LoadingPage /> :
        orders.length === 0 ? <EmptyState title="Nothing to sign off" description="Results appear here after lab enters them" /> :
        <div className="space-y-2">
          {orders.map((o: any) => (
            <div key={o.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">{o.accession?.visit?.patient?.full_name}</p>
                  <p className="text-xs text-gray-500">{o.test?.name}</p>
                  {o.result && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{o.result.raw_value}</span>
                        {o.result.unit && <span className="text-gray-500 text-xs">{o.result.unit}</span>}
                        {o.result.reference_range && <span className="text-gray-400 text-xs">({o.result.reference_range})</span>}
                        {o.result.flag && o.result.flag !== 'NORMAL' && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            o.result.flag === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                            o.result.flag === 'LOW' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}>{o.result.flag}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => signOffM.mutate(o.id)}
                  disabled={signOffM.isPending}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 active:bg-green-700"
                >Sign Off</button>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
