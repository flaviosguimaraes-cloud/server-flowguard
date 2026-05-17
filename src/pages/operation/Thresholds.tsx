import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Sliders, Save } from 'lucide-react';
import { toast } from 'sonner';

const FIELDS: { key: string; label: string; unit?: string }[] = [
  { key: 'threshold_pps', label: 'Threshold PPS', unit: 'pps' },
  { key: 'threshold_mbps', label: 'Threshold Mbps', unit: 'Mbps' },
  { key: 'threshold_flows', label: 'Threshold Flows', unit: 'flows' },
  { key: 'threshold_tcp_pps', label: 'TCP PPS', unit: 'pps' },
  { key: 'threshold_tcp_mbps', label: 'TCP Mbps', unit: 'Mbps' },
  { key: 'threshold_udp_pps', label: 'UDP PPS', unit: 'pps' },
  { key: 'threshold_udp_mbps', label: 'UDP Mbps', unit: 'Mbps' },
  { key: 'threshold_icmp_pps', label: 'ICMP PPS', unit: 'pps' },
  { key: 'threshold_icmp_mbps', label: 'ICMP Mbps', unit: 'Mbps' },
  { key: 'ban_time', label: 'Ban time', unit: 's' },
];

export default function Thresholds() {
  const isAdmin = localStorage.getItem('role') === 'admin';
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['thresholds'],
    queryFn: () => api.get('/api/thresholds').then(r => r.data).catch(() => ({})),
  });

  const [form, setForm] = useState<any>({});
  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: (body: any) => api.put('/api/thresholds', body),
    onSuccess: () => {
      toast.success('Thresholds salvos — FastNetMon recarregado', { duration: 6000 });
      qc.invalidateQueries({ queryKey: ['thresholds'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Erro ao salvar'),
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Sliders className="text-primary" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Thresholds</h1>
          <p className="text-sm text-text-secondary">Limites do detector FastNetMon</p>
        </div>
      </div>

      <div className="bg-bg-secondary p-6 rounded-xl border border-border shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FIELDS.map(f => (
            <div key={f.key}>
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{f.label}{f.unit && <span className="opacity-60 ml-1">({f.unit})</span>}</label>
              <input
                type="number"
                value={form[f.key] ?? ''}
                readOnly={!isAdmin}
                onChange={(e) => setForm({ ...form, [f.key]: Number(e.target.value) })}
                className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30 read-only:opacity-70"
              />
            </div>
          ))}
        </div>
        {isAdmin && (
          <div className="flex justify-end pt-2 border-t border-border">
            <button onClick={() => save.mutate(form)} disabled={save.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
              <Save size={16} /> Salvar e recarregar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
