 import { useEffect, useState } from 'react';
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
 import { Shield, Save, Zap, Sliders } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';

type Mode = 'blackhole' | 'external';

export default function Policy() {
  const isAdmin = localStorage.getItem('role') === 'admin';
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['mitigation-policy'],
    queryFn: () => api.get('/api/mitigation/policy').then(r => r.data).catch(() => ({})),
  });
   const { data: thresholdData } = useQuery({
    queryKey: ['thresholds-policy'],
    queryFn: () => api.get('/api/thresholds').then(r => r.data).catch(() => ({})),
  });

  const [mode, setMode] = useState<Mode>('blackhole');
  const [flowspec, setFlowspec] = useState(false);
  const [externalBlock, setExternalBlock] = useState('');
 
   const [thresholds, setThresholds] = useState<any>({
     threshold_pps: '',
     threshold_mbps: '',
     threshold_flows: '',
     threshold_tcp_pps: '',
     threshold_tcp_mbps: '',
     threshold_udp_pps: '',
     threshold_udp_mbps: '',
     threshold_icmp_pps: '',
     threshold_icmp_mbps: '',
     ban_time: ''
   });

  useEffect(() => {
    if (data) {
      setMode((data.mode as Mode) || 'blackhole');
      setFlowspec(!!data.flowspec_enabled);
      setExternalBlock(data.external_block || '45.175.50.0/24');
    }
  }, [data]);

  useEffect(() => {
     if (thresholdData) {
       setThresholds(thresholdData);
     }
   }, [thresholdData]);

  const save = useMutation({
    mutationFn: (body: any) => api.put('/api/mitigation/policy', body),
    onSuccess: () => {
      toast.success('Política de mitigação salva');
      qc.invalidateQueries({ queryKey: ['mitigation-policy'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Erro ao salvar'),
  });

  const submit = () => {
    save.mutate({
      mode,
      threshold_pps: Number(pps) || 0,
      threshold_mbps: Number(mbps) || 0,
      external_block: externalBlock,
      flowspec_enabled: flowspec,
    });
  };

  const ModeCard = ({ value, title, community, description }: any) => {
    const selected = mode === value;
    return (
      <button
        type="button"
        disabled={!isAdmin}
        onClick={() => setMode(value)}
        className={clsx(
          "text-left p-5 rounded-xl border-2 transition-all w-full",
          selected ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-border bg-bg-secondary hover:border-text-secondary/30"
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-text-primary flex items-center gap-2">
            <Shield size={18} className={selected ? 'text-primary' : 'text-text-secondary'} />
            {title}
          </h3>
          <div className={clsx(
            "w-10 h-6 rounded-full p-0.5 transition-all flex",
            selected ? "bg-primary justify-end" : "bg-bg-primary justify-start"
          )}>
            <div className="w-5 h-5 rounded-full bg-white shadow" />
          </div>
        </div>
        <p className="text-xs text-text-secondary mb-2"><span className="font-bold">Community:</span> <span className="font-mono text-text-primary">{community}</span></p>
        <p className="text-xs text-text-secondary">{description}</p>
      </button>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Shield className="text-primary" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Política de Mitigação</h1>
          <p className="text-sm text-text-secondary">Modo de bloqueio e thresholds de gatilho</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ModeCard
          value="blackhole"
          title="Modo A — Blackhole /32"
          community="65000:666"
          description="Cada IP banido recebe rota /32 para blackhole."
        />
        <ModeCard
          value="external"
          title="Modo B — Mitigação Externa"
          community="65000:999"
          description={`Anuncia bloco ${externalBlock || '45.175.50.0/24'} para scrubbing externo.`}
        />
      </div>

      <div className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={flowspec} disabled={!isAdmin} onChange={(e) => setFlowspec(e.target.checked)}
            className="w-4 h-4 accent-primary" />
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-warning" />
            <span className="text-sm font-bold text-text-primary">FlowSpec complementar ativo</span>
          </div>
        </label>

        {mode === 'external' && (
          <div>
            <label className="text-[10px] font-bold text-text-secondary uppercase">Bloco externo (CIDR)</label>
            <input value={externalBlock} readOnly={!isAdmin} onChange={(e) => setExternalBlock(e.target.value)}
              className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30 read-only:opacity-70" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
          <div>
            <label className="text-[10px] font-bold text-text-secondary uppercase">PPS gatilho</label>
            <input type="number" value={pps} readOnly={!isAdmin} onChange={(e) => setPps(Number(e.target.value))}
              className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30 read-only:opacity-70" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-text-secondary uppercase">Mbps gatilho</label>
            <input type="number" value={mbps} readOnly={!isAdmin} onChange={(e) => setMbps(Number(e.target.value))}
              className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30 read-only:opacity-70" />
          </div>
        </div>

        {isAdmin && (
          <div className="flex justify-end pt-2 border-t border-border">
            <button onClick={submit} disabled={save.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
              <Save size={16} /> Salvar política
            </button>
          </div>
        )}
      </div>
    </div>
  );
}