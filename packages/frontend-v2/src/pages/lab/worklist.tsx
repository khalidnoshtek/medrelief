import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { limsApi } from '../../api';
import { useAuthStore } from '../../store/auth-store';
import { LoadingPage, EmptyState, Alert } from '../../components/ui/primitives';

export default function WorklistPage() {
  const user = useAuthStore((s) => s.user)!;
  const qc = useQueryClient();
  const nav = useNavigate();
  const [dept, setDept] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['worklist', user.branchId, dept],
    queryFn: () => limsApi.getWorklist({ branch_id: user.branchId, department: dept || undefined }),
    refetchInterval: 15000,
  });

  const onErr = (e: any) => { setError(e.response?.data?.message || 'Action failed'); setTimeout(() => setError(''), 3000); };
  const onOk = () => qc.invalidateQueries({ queryKey: ['worklist'] });

  const collectM = useMutation({ mutationFn: (id: string) => limsApi.collectSample(id), onSuccess: onOk, onError: onErr });
  const receiveM = useMutation({ mutationFn: (id: string) => limsApi.receiveSample(id), onSuccess: onOk, onError: onErr });
  const startM = useMutation({ mutationFn: (id: string) => limsApi.startProcessing(id), onSuccess: onOk, onError: onErr });

  const orders = data?.data || [];

  return (
    <div className="p-5 space-y-4 pb-8">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Worklist</h1>
        <select value={dept} onChange={(e) => setDept(e.target.value)}
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white">
          <option value="">All depts</option>
          <option value="HEMATOLOGY">Hematology</option>
          <option value="BIOCHEMISTRY">Biochemistry</option>
          <option value="MICROBIOLOGY">Microbiology</option>
          <option value="IMMUNOLOGY">Immunology</option>
          <option value="PATHOLOGY">Pathology</option>
        </select>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {isLoading ? <LoadingPage /> :
        orders.length === 0 ? <EmptyState title="No pending work" description="Orders appear after payment" /> :
        <div className="space-y-2">
          {orders.map((o: any) => {
            const ss = o.sample?.sample_status;
            const os = o.order_status;
            return (
              <div key={o.id} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800">{o.accession?.visit?.patient?.full_name}</p>
                    <p className="text-xs text-gray-500">{o.test?.name} • {o.department}</p>
                    <p className="text-[10px] font-mono text-gray-400">{o.accession?.accession_number}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      ss === 'RECEIVED_AT_LAB' ? 'bg-green-100 text-green-700' :
                      ss === 'COLLECTED' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{ss || '-'}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      os === 'IN_PROCESS' ? 'bg-blue-100 text-blue-700' :
                      os === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>{os}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {ss === 'PENDING_COLLECTION' && (
                    <button onClick={() => collectM.mutate(o.sample.id)} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs">Collect</button>
                  )}
                  {ss === 'COLLECTED' && (
                    <button onClick={() => receiveM.mutate(o.sample.id)} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs">Receive</button>
                  )}
                  {os === 'ORDERED' && ss === 'RECEIVED_AT_LAB' && (
                    <button onClick={() => startM.mutate(o.id)} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs">Start</button>
                  )}
                  {(os === 'ORDERED' || os === 'IN_PROCESS') && ss === 'RECEIVED_AT_LAB' && (
                    <button onClick={() => nav(`/lab/result/${o.id}`)} className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs">Enter Result</button>
                  )}
                  {o.accession_id && (
                    <button onClick={() => limsApi.printLabels(o.accession_id)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs">Labels</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}
