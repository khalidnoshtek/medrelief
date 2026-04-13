import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { limsApi } from '../../api';
import { LoadingPage, EmptyState, BigButton } from '../../components/ui/primitives';
import { FileDown, Mail, MessageCircle, ArrowLeft } from 'lucide-react';

export default function ReportViewerPage() {
  const { accessionId } = useParams<{ accessionId: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: accession, isLoading } = useQuery({
    queryKey: ['accession', accessionId],
    queryFn: () => limsApi.getAccession(accessionId!),
    enabled: !!accessionId,
  });

  const { data: reports } = useQuery({
    queryKey: ['reports', accessionId],
    queryFn: () => limsApi.getReportsByAccession(accessionId!),
    enabled: !!accessionId,
  });

  const { data: results } = useQuery({
    queryKey: ['results', accessionId],
    queryFn: () => limsApi.getResultsByAccession(accessionId!),
    enabled: !!accessionId,
  });

  const resendM = useMutation({
    mutationFn: ({ reportId, channel }: { reportId: string; channel: string }) =>
      limsApi.resendReport(reportId, channel),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', accessionId] }),
  });

  if (isLoading) return <LoadingPage />;
  if (!accession) return <EmptyState title="Accession not found" />;

  const report = reports?.[0];
  const patient = accession.visit?.patient;

  return (
    <div className="p-5 space-y-4 pb-8">
      <button onClick={() => nav(-1)} className="text-sm text-blue-600">← Back</button>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs text-gray-500">Report</p>
        <p className="font-mono font-semibold">{report?.report_number || 'Pending'}</p>
        <p className="text-[10px] text-gray-400">{accession.accession_number}</p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="font-medium">{patient?.full_name}</p>
        <p className="text-sm text-gray-500">{patient?.mobile} • {patient?.gender}, {patient?.age_years}y</p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Results</p>
        <div className="space-y-2">
          {(results || []).map((o: any) => (
            <div key={o.id} className="flex justify-between items-start text-sm py-1 border-b border-gray-50 last:border-0">
              <div className="flex-1">
                <p className="text-gray-800">{o.test?.name}</p>
                <p className="text-[10px] text-gray-400">Ref: {o.result?.reference_range || '—'}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{o.result?.raw_value || '—'} <span className="text-xs text-gray-400">{o.result?.unit}</span></p>
                {o.result?.flag && o.result.flag !== 'NORMAL' && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    o.result.flag === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                    o.result.flag === 'LOW' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                  }`}>{o.result.flag}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {report && (
        <>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Delivery</p>
            {(report.delivery_logs || []).map((log: any) => (
              <div key={log.id} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                <div>
                  <p>{log.channel}</p>
                  <p className="text-[10px] text-gray-400">{log.target}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full h-fit ${
                  log.status === 'SENT' ? 'bg-green-100 text-green-700' :
                  log.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>{log.status}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {report.pdf_path && (
              <BigButton tone="primary" onClick={() => limsApi.downloadReport(report.id)} icon={<FileDown size={18} />}>
                PDF
              </BigButton>
            )}
            <BigButton tone="secondary" onClick={() => resendM.mutate({ reportId: report.id, channel: 'EMAIL' })} icon={<Mail size={18} />}>
              Email
            </BigButton>
            <BigButton tone="success" onClick={() => resendM.mutate({ reportId: report.id, channel: 'WHATSAPP' })} icon={<MessageCircle size={18} />}>
              WhatsApp
            </BigButton>
          </div>
        </>
      )}
    </div>
  );
}
