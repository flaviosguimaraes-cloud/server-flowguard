import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
 import api from '../services/api';
 import { useTranslation } from '../hooks/useTranslation';
 import { 
   Shield, AlertTriangle, Clock, ArrowDown, ArrowUp, 
   Activity, History, Zap, CheckCircle
 } from 'lucide-react';
 import { Skeleton } from '../components/Skeleton';
 import { clsx } from 'clsx';
 import MitigationModal from '../components/MitigationModal';
 import { TooltipProvider } from '../components/ui/tooltip';
 import { MitigationTooltip } from '../components/MitigationTooltip';
 
 export default function Events() {
   const { t } = useTranslation();
   const isAdmin = localStorage.getItem('role') === 'admin';
  const queryClient = useQueryClient();
   const [isMitigationOpen, setIsMitigationOpen] = useState(false);
   const [targetIP, setTargetIP] = useState('');
 
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
      const timer = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(timer);
    }, []);

    const { data: stats, isLoading: statsLoading, dataUpdatedAt } = useQuery({
     queryKey: ['detection-stats-events'],
     queryFn: async () => {
       const r = await api.get('/api/detection/stats');
       return r.data;
     },
      refetchInterval: 5000,
      staleTime: 0,
   });
 
   const { data: activeMitigations } = useQuery({
     queryKey: ['mitigation-active-events'],
     queryFn: async () => {
       const r = await api.get('/api/mitigation/active');
       return r.data;
     },
     refetchInterval: 30000,
   });
 
  const [eventFilter, setEventFilter] = useState<'all' | 'active' | 'removed'>('all');
  const [timeRange, setTimeRange] = useState<'all' | '1h' | '24h'>('all');

  const { data: eventsHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['events-history-full', eventFilter, timeRange],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (eventFilter !== 'all') params.append('status', eventFilter);
      if (timeRange === '1h') params.append('minutes', '60');
      if (timeRange === '24h') params.append('minutes', '1440');
      
      const r = await api.get(`/api/events/history?${params}`);
      return r.data;
    },
    refetchInterval: 30000,
  });

  const fmtDuration = (seconds: number) => {
    if (!seconds) return '—';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}min ${secs}s`;
    }
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}min`;
  };

  const fmtPeak = (pps: number, mbps: number) => {
    if (!pps && !mbps) return '—';
    const ppsStr = pps > 1000 ? (pps / 1000).toFixed(1) + 'k' : pps;
    const mbpsStr = mbps > 1000 ? (mbps / 1000).toFixed(2) + ' Gbps' : mbps + ' Mbps';
    return `${ppsStr} pps · ${mbpsStr}`;
  };
 
  const handleMitigate = useCallback((ip: string) => {
    setTargetIP(ip);
    setIsMitigationOpen(true);
  }, []);

  const handleMitigationSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['detection-stats-events'] });
    queryClient.invalidateQueries({ queryKey: ['mitigation-active-events'] });
    queryClient.invalidateQueries({ queryKey: ['audit-logs-mitigation'] });
  }, [queryClient]);
 
    if (statsLoading) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-bg-secondary h-32 rounded-xl border border-border animate-pulse" />
            <div className="bg-bg-secondary h-32 rounded-xl border border-border animate-pulse" />
          </div>
          <div className="bg-bg-secondary h-96 rounded-xl border border-border animate-pulse" />
        </div>
      );
    }
 
    return (
      <TooltipProvider>
      <div className="space-y-6 animate-in fade-in duration-500">
       <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('events')}</h1>
 
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Detections Card */}
          <div className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm flex items-center gap-5 transition-all hover:border-danger/20">
            <div className="p-3.5 bg-danger/5 rounded-xl text-danger border border-danger/10">
              <AlertTriangle size={28} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">Detecções Ativas</p>
              <h3 className="text-2xl font-bold text-text-primary">{stats?.active_detections || 0}</h3>
              <p className="text-[11px] text-text-secondary mt-0.5 opacity-70">Anomalias identificadas agora</p>
            </div>
          </div>
  
          {/* Active Mitigations Card */}
          <div className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm flex items-center gap-5 transition-all hover:border-success/20">
            <div className="p-3.5 bg-success/5 rounded-xl text-success border border-success/10">
              <Shield size={28} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">Mitigações em Curso</p>
              <h3 className="text-2xl font-bold text-text-primary">
                {activeMitigations?.total || activeMitigations?.items?.length || 0}
              </h3>
              <p className="text-[11px] text-text-secondary mt-0.5 opacity-70">Bloqueios ativos no BGP</p>
            </div>
          </div>
        </div>
 
        {/* Real-time Detections Section */}
        <div className="bg-bg-secondary rounded-xl border border-border shadow-sm overflow-hidden">
           <div className="p-5 border-b border-border flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-bg-primary/30">
             <div className="flex flex-col">
               <div className="flex items-center gap-2">
                 <Activity className="text-primary" size={18} />
                 <h2 className="text-base font-bold text-text-primary">Detecções em Tempo Real</h2>
               </div>
               {dataUpdatedAt && (
                 <p className="text-[10px] text-text-secondary mt-0.5 font-bold uppercase tracking-widest opacity-60">
                   Atualizado há {Math.floor((now - dataUpdatedAt) / 1000)}s
                 </p>
               )}
            </div>
            <div className="flex gap-4 text-[11px] font-bold">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 text-primary rounded-lg border border-primary/10">
                <ArrowDown size={12} /> {(stats?.incoming_mbps / 1000).toFixed(1)} Gbps
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-success/5 text-success rounded-lg border border-success/10">
                <ArrowUp size={12} /> {(stats?.outgoing_mbps / 1000).toFixed(1)} Gbps
              </div>
            </div>
          </div>
 
         <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 dark:divide-[#2a2d3e]">
           {/* Top Hosts Inbound */}
           <div className="p-6">
             <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-6 flex items-center gap-2">
               <ArrowDown size={16} className="text-accent" /> Top Hosts de Entrada
             </h3>
             <div className="space-y-6">
                 {(() => {
                   const hosts = stats?.top_hosts_in || [];
                   const maxPps = Math.max(...hosts.map((h: any) => h.pps || 0), 0);
                   const mitigationList = activeMitigations?.items || activeMitigations?.routes || [];
                   const bannedMap = new Map(mitigationList.map((i: any) => [i.ip || i.prefix?.split('/')[0], i]));
 
                   if (hosts.length === 0) {
                     return <p className="text-center py-8 text-text-secondary italic text-sm">Nenhuma anomalia de entrada</p>;
                   }
 
                   return hosts.map((host: any, i: number) => (
                     <HostItem 
                       key={i} 
                       host={host} 
                       onMitigate={handleMitigate} 
                       isAdmin={isAdmin} 
                       maxPps={maxPps}
                       isBanned={bannedMap.has(host.ip)}
                       mitigationData={bannedMap.get(host.ip)}
                     />
                   ));
                 })()}
             </div>
           </div>
 
           {/* Top Hosts Outbound */}
           <div className="p-6">
             <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-6 flex items-center gap-2">
               <ArrowUp size={16} className="text-success" /> Top Hosts de Saída
             </h3>
             <div className="space-y-6">
                 {(() => {
                   const hosts = stats?.top_hosts_out || [];
                   const maxPps = Math.max(...hosts.map((h: any) => h.pps || 0), 0);
                   const mitigationList = activeMitigations?.items || activeMitigations?.routes || [];
                   const bannedMap = new Map(mitigationList.map((i: any) => [i.ip || i.prefix?.split('/')[0], i]));
 
                   if (hosts.length === 0) {
                     return <p className="text-center py-8 text-text-secondary italic text-sm">Nenhuma anomalia de saída</p>;
                   }
 
                   return hosts.map((host: any, i: number) => (
                     <HostItem 
                       key={i} 
                       host={host} 
                       onMitigate={handleMitigate} 
                       isAdmin={isAdmin} 
                       maxPps={maxPps}
                       isBanned={bannedMap.has(host.ip)}
                       mitigationData={bannedMap.get(host.ip)}
                     />
                   ));
                 })()}
             </div>
           </div>
         </div>
       </div>
 
        {/* MELHORIA 2 — Histórico de Anomalias em Eventos */}
        <div className="bg-bg-secondary rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex flex-col md:flex-row justify-between items-center gap-4 bg-bg-primary/30">
            <div className="flex items-center gap-2">
              <History className="text-warning" size={18} />
              <h2 className="text-base font-bold text-text-primary">Histórico de Anomalias</h2>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <div className="flex bg-bg-primary p-1 rounded-lg border border-border">
                {[
                  { label: 'Todos', value: 'all' },
                  { label: 'Ativos', value: 'active' },
                  { label: 'Resolvidos', value: 'removed' }
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setEventFilter(f.value as any)}
                    className={clsx(
                      "px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all",
                      eventFilter === f.value 
                        ? "bg-white dark:bg-[#2a2d3e] text-primary shadow-sm" 
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex bg-bg-primary p-1 rounded-lg border border-border">
                {[
                  { label: 'Tudo', value: 'all' },
                  { label: '1h', value: '1h' },
                  { label: '24h', value: '24h' }
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setTimeRange(f.value as any)}
                    className={clsx(
                      "px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all",
                      timeRange === f.value 
                        ? "bg-white dark:bg-[#2a2d3e] text-primary shadow-sm" 
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-primary/50 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                  <th className="px-6 py-3 border-b border-border">IP</th>
                  <th className="px-6 py-3 border-b border-border">Início</th>
                  <th className="px-6 py-3 border-b border-border">Fim</th>
                  <th className="px-6 py-3 border-b border-border text-center">Duração</th>
                  <th className="px-6 py-3 border-b border-border">Pico (PPS/Mbps)</th>
                  <th className="px-6 py-3 border-b border-border text-center">Direção</th>
                  <th className="px-6 py-3 border-b border-border text-center">Status</th>
                  <th className="px-6 py-3 border-b border-border">Tipo</th>
                  <th className="px-6 py-3 border-b border-border">Origem</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-border/50">
                {eventsHistory?.items?.map((event: any, i: number) => (
                  <tr key={i} className="hover:bg-bg-primary/50 transition-colors group">
                    <td className="px-6 py-3.5 font-mono font-bold text-text-primary text-xs">{event.ip}</td>
                    <td className="px-6 py-3.5 text-text-secondary text-[11px] whitespace-nowrap">
                      {new Date(event.start_time).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-3.5 text-text-secondary text-[11px] whitespace-nowrap">
                      {event.end_time ? new Date(event.end_time).toLocaleString('pt-BR') : '—'}
                    </td>
                    <td className="px-6 py-3.5 text-center text-text-primary text-[11px] font-medium">
                      {fmtDuration(event.duration_seconds)}
                    </td>
                    <td className="px-6 py-3.5 text-text-primary text-[11px] font-bold">
                      {fmtPeak(event.peak_pps, event.peak_mbps)}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={clsx(
                        "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
                        event.flow_direction === 'incoming' 
                          ? "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800" 
                          : "bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                      )}>
                        {event.flow_direction === 'incoming' ? '↓ Entrada' : '↑ Saída'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={clsx(
                        "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border",
                        event.status === 'active' 
                          ? "bg-danger/10 text-danger border-danger/20 animate-pulse" 
                          : "bg-bg-primary text-text-secondary border-border"
                      )}>
                        {event.status === 'active' ? 'ATIVO' : 'RESOLVIDO'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-text-secondary text-[11px] font-medium uppercase tracking-wider">
                      {event.type || 'Blackhole'}
                    </td>
                    <td className="px-6 py-3.5 text-text-secondary text-[11px] font-bold uppercase tracking-wider">
                      {event.triggered_by === 'detector' ? 'Automático' : 'Manual'}
                    </td>
                  </tr>
                ))}
                {(!eventsHistory?.items || eventsHistory.items.length === 0) && !historyLoading && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-text-secondary italic text-xs">
                      Nenhum histórico de anomalias encontrado
                    </td>
                  </tr>
                )}
                {historyLoading && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <Skeleton count={5} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
 
       <MitigationModal
         isOpen={isMitigationOpen}
         onClose={() => setIsMitigationOpen(false)}
         targetIP={targetIP}
        onSuccess={handleMitigationSuccess}
       />

        <style>{`
          @keyframes pulse-bar {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
        `}</style>
      </div>
      </TooltipProvider>
    );
  }
  
   function HostItem({ host, onMitigate, isAdmin, maxPps, isBanned, mitigationData }: any) {
    const getRisk = (pps: number) => {
      if (isBanned || pps >= 80000) return 'high';
      if (pps >= 30000) return 'medium';
      return 'low';
    };

    const risk = getRisk(host.pps);
    
    const riskBadgeConfig = {
      high: {
        label: 'RISCO ALTO',
        className: "bg-danger-bg text-danger border-danger/20 dark:bg-danger/10 dark:text-danger dark:border-danger/20"
      },
      medium: {
        label: 'RISCO MÉDIO',
        className: "bg-warning-bg text-warning border-warning/20 dark:bg-warning/10 dark:text-warning dark:border-warning/20"
      },
      low: {
        label: 'RISCO BAIXO',
        className: "bg-success-bg text-success border-success/20 dark:bg-success/10 dark:text-success dark:border-success/20"
      },
    };

    const badge = riskBadgeConfig[risk];
    
    const barWidth = maxPps > 0
      ? Math.max((host.pps / maxPps) * 100, 2)
      : 0;

    const riskColor = risk === 'high'
      ? 'var(--danger)'
      : risk === 'medium'
        ? 'var(--warning)'
        : 'var(--success)';
 
    return (
       <div className={clsx(
         "space-y-2 group p-3 rounded-xl transition-all border border-transparent",
         isBanned ? "bg-danger/5 border-danger/10 shadow-sm" : "hover:bg-bg-primary/50"
       )}>
       <div className="flex justify-between items-end">
         <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
               {isBanned ? (
                 <MitigationTooltip data={{
                   ip: host.ip,
                   tipo: mitigationData?.type || 'Blackhole /32',
                   desde: mitigationData?.since || mitigationData?.age,
                   pps: mitigationData?.pps || host.pps,
                   mbps: mitigationData?.mbps || host.mbps,
                   fonte: mitigationData?.source || 'Manual (admin)'
                 }}>
               <span className="text-sm font-bold text-text-primary font-mono flex items-center gap-1.5 cursor-help">
                 <span className="text-[10px]">🔒</span>
                 {host.ip}
               </span>
             </MitigationTooltip>
           ) : (
             <span className="text-sm font-bold text-text-primary font-mono flex items-center gap-1">
               {host.ip}
             </span>
           )}
          
          <span className={clsx(
            "text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider",
            badge.className
          )}>
            {badge.label}
          </span>

          {isBanned && (
            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm">
              EM MITIGAÇÃO
            </span>
          )}
            </div>
            <p className="text-xs text-text-secondary">
             <span className="font-bold text-text-primary">{(host.pps / 1000).toFixed(1)}k</span> PPS • 
             <span className="font-bold text-text-primary ml-2">{host.mbps > 1000 ? (host.mbps / 1000).toFixed(1) + ' Gbps' : host.mbps + ' Mbps'}</span>
           </p>
         </div>
          {isAdmin && !isBanned && (
           <button 
             onClick={() => onMitigate(host.ip)}
              className="px-2.5 py-1.5 bg-danger hover:bg-danger/90 text-white text-[10px] font-bold rounded-lg shadow-sm active:scale-95 transition-all flex items-center gap-1 md:opacity-0 group-hover:opacity-100 uppercase tracking-wider"
           >
             <Shield size={12} /> Mitigar
           </button>
         )}
       </div>
        <div className="h-1 w-full bg-bg-primary rounded-full overflow-hidden mt-2 border border-border/10">
          <div 
            className={clsx(
              "h-full rounded-full transition-all duration-500",
              risk === 'high' && "animate-pulse shadow-[0_0_8px_var(--danger)]"
            )}
            style={{
              width: `${barWidth}%`,
              background: riskColor,
            }} 
          />
       </div>
     </div>
   );
 }
