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
  const [blackholeCommunity, setBlackholeCommunity] = useState('65000:666');
  const [externalCommunity, setExternalCommunity] = useState('65000:999');
 
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
      ban_for_pps: true,
      ban_for_bandwidth: true,
      ban_for_flows: false,
      ban_for_tcp_pps: false,
      ban_for_tcp_bandwidth: false,
      ban_for_udp_pps: false,
      ban_for_udp_bandwidth: false,
      ban_for_icmp_pps: false,
      ban_for_icmp_bandwidth: false,
      ban_time: ''
   });

  useEffect(() => {
    if (data) {
      setMode((data.mode as Mode) || 'blackhole');
      setFlowspec(!!data.flowspec_enabled);
      setExternalBlock(data.external_block || '45.175.50.0/24');
      setBlackholeCommunity(data.blackhole_community || '65000:666');
      setExternalCommunity(data.external_community || '65000:999');
    }
  }, [data]);

  useEffect(() => {
     if (thresholdData) {
       setThresholds(thresholdData);
     }
   }, [thresholdData]);

   const savePolicy = useMutation({
     mutationFn: (body: any) => api.put('/api/mitigation/policy', body),
   });
 
   const saveThresholds = useMutation({
     mutationFn: (body: any) => api.put('/api/thresholds', body),
  });

   const isPending = savePolicy.isPending || saveThresholds.isPending;
 
   const submit = async () => {
     try {
       await Promise.all([
         savePolicy.mutateAsync({
           mode,
            blackhole_community: blackholeCommunity,
            external_community: externalCommunity,
           threshold_pps: Number(thresholds.threshold_pps) || 0,
           threshold_mbps: Number(thresholds.threshold_mbps) || 0,
           external_block: externalBlock,
           flowspec_enabled: flowspec,
         }),
         saveThresholds.mutateAsync({
           ...thresholds,
           threshold_pps: Number(thresholds.threshold_pps) || 0,
           threshold_mbps: Number(thresholds.threshold_mbps) || 0,
           threshold_flows: Number(thresholds.threshold_flows) || 0,
           threshold_tcp_pps: Number(thresholds.threshold_tcp_pps) || 0,
           threshold_tcp_mbps: Number(thresholds.threshold_tcp_mbps) || 0,
           threshold_udp_pps: Number(thresholds.threshold_udp_pps) || 0,
           threshold_udp_mbps: Number(thresholds.threshold_udp_mbps) || 0,
           threshold_icmp_pps: Number(thresholds.threshold_icmp_pps) || 0,
           threshold_icmp_mbps: Number(thresholds.threshold_icmp_mbps) || 0,
           ban_time: Number(thresholds.ban_time) || 0,
         })
       ]);
       toast.success('✅ Política e limiares salvos e aplicados ao mitigador');
       qc.invalidateQueries({ queryKey: ['mitigation-policy'] });
       qc.invalidateQueries({ queryKey: ['thresholds-policy'] });
     } catch (e: any) {
       toast.error(e.response?.data?.detail || 'Erro ao salvar');
     }
  };

  const ModeCard = ({ value, title, community, onChangeCommunity, description }: any) => {
    const selected = mode === value;
    return (
      <button
        className={clsx(
          "text-left p-5 rounded-xl border-2 transition-all w-full",
          selected ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-border bg-bg-secondary hover:border-text-secondary/30"
        )}
        onClick={() => setMode(value)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield size={18} className={selected ? 'text-primary' : 'text-text-secondary'} />
            <h3 className="font-bold text-text-primary">{title}</h3>
          </div>
          <div className={clsx(
            "w-10 h-6 rounded-full p-0.5 transition-all flex",
            selected ? "bg-primary justify-end" : "bg-bg-primary justify-start"
          )}>
            <div className="w-5 h-5 rounded-full bg-white shadow" />
          </div>
        </div>
        <div className="mb-3" onClick={e => e.stopPropagation()}>
          <label className="text-[10px] font-bold text-text-secondary uppercase">Community BGP</label>
          <input 
            value={community} 
            disabled={!isAdmin}
            onChange={(e) => onChangeCommunity(e.target.value)}
            placeholder={value === 'blackhole' ? '65000:666' : '65000:999'}
            className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30" 
          />
        </div>
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
           <p className="text-sm text-text-secondary">Configuração de bloqueio e limiares de detecção</p>
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

       <div className="bg-bg-secondary p-6 rounded-xl border border-border shadow-sm space-y-4">
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

         <div className="pt-4 border-t border-border space-y-4">
           <div className="flex items-center gap-2 mb-2">
             <Sliders size={18} className="text-primary" />
             <div>
               <h2 className="text-lg font-bold text-text-primary">Limiares de Detecção</h2>
               <p className="text-xs text-text-secondary">Definem quando o mitigador aplica bloqueio automático</p>
             </div>
           </div>
 
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* Row 1 — Gatilhos globais */}
             <div>
               <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Pacotes por segundo (PPS)</label>
               <input type="number" value={thresholds.threshold_pps ?? ''} placeholder="100000" readOnly={!isAdmin} 
                 onChange={(e) => setThresholds({ ...thresholds, threshold_pps: e.target.value })}
                 className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30 read-only:opacity-70" />
             </div>
             <div>
               <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Largura de banda (Mbps)</label>
               <input type="number" value={thresholds.threshold_mbps ?? ''} placeholder="1000" readOnly={!isAdmin}
                 onChange={(e) => setThresholds({ ...thresholds, threshold_mbps: e.target.value })}
                 className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30 read-only:opacity-70" />
             </div>
             <div>
               <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Flows simultâneos</label>
               <input type="number" value={thresholds.threshold_flows ?? ''} placeholder="3500" readOnly={!isAdmin}
                 onChange={(e) => setThresholds({ ...thresholds, threshold_flows: e.target.value })}
                 className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30 read-only:opacity-70" />
             </div>
 
             {/* Row 2 — TCP */}
             <div>
               <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">TCP PPS</label>
               <input type="number" value={thresholds.threshold_tcp_pps ?? ''} readOnly={!isAdmin}
                 onChange={(e) => setThresholds({ ...thresholds, threshold_tcp_pps: e.target.value })}
                 className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30 read-only:opacity-70" />
             </div>
             <div>
               <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">TCP Mbps</label>
               <input type="number" value={thresholds.threshold_tcp_mbps ?? ''} readOnly={!isAdmin}
                 onChange={(e) => setThresholds({ ...thresholds, threshold_tcp_mbps: e.target.value })}
                 className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30 read-only:opacity-70" />
             </div>
             <div className="hidden md:block" />
 
             {/* Row 3 — UDP */}
             <div>
               <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">UDP PPS</label>
               <input type="number" value={thresholds.threshold_udp_pps ?? ''} readOnly={!isAdmin}
                 onChange={(e) => setThresholds({ ...thresholds, threshold_udp_pps: e.target.value })}
                 className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30 read-only:opacity-70" />
             </div>
             <div>
               <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">UDP Mbps</label>
               <input type="number" value={thresholds.threshold_udp_mbps ?? ''} readOnly={!isAdmin}
                 onChange={(e) => setThresholds({ ...thresholds, threshold_udp_mbps: e.target.value })}
                 className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30 read-only:opacity-70" />
             </div>
             <div className="hidden md:block" />
 
             {/* Row 4 — ICMP */}
             <div>
               <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">ICMP PPS</label>
               <input type="number" value={thresholds.threshold_icmp_pps ?? ''} readOnly={!isAdmin}
                 onChange={(e) => setThresholds({ ...thresholds, threshold_icmp_pps: e.target.value })}
                 className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30 read-only:opacity-70" />
             </div>
             <div>
               <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">ICMP Mbps</label>
               <input type="number" value={thresholds.threshold_icmp_mbps ?? ''} readOnly={!isAdmin}
                 onChange={(e) => setThresholds({ ...thresholds, threshold_icmp_mbps: e.target.value })}
                 className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30 read-only:opacity-70" />
             </div>
             <div className="hidden md:block" />
 
             {/* Row 5 — Comportamento */}
             <div>
               <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Tempo de bloqueio (segundos)</label>
               <input type="number" value={thresholds.ban_time ?? ''} readOnly={!isAdmin}
                 onChange={(e) => setThresholds({ ...thresholds, ban_time: e.target.value })}
                 className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30 read-only:opacity-70" />
               <p className="text-[10px] text-text-secondary mt-1">120s = 2min · 1800s = 30min</p>
             </div>
           </div>
         </div>
 
        {isAdmin && (
           <div className="flex justify-end pt-6 border-t border-border">
             <button onClick={submit} disabled={isPending}
              className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
               <Save size={16} /> Salvar e aplicar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}