import { useState, useCallback, useEffect } from 'react';
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
 
   const { data: auditLogs } = useQuery({
     queryKey: ['audit-logs-mitigation'],
     queryFn: async () => {
       const r = await api.get('/api/audit/logs?action=mitigation_started');
       return r.data;
     },
     refetchInterval: 30000,
   });
 
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
 
       {/* Anomaly History Section */}
       <div className="bg-white dark:bg-[#1e2130] rounded-xl border border-gray-200 dark:border-[#2a2d3e] shadow-sm overflow-hidden">
         <div className="p-6 border-b border-gray-100 dark:border-[#2a2d3e] flex items-center gap-2">
           <History className="text-warning" size={20} />
           <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Histórico de Anomalias</h2>
         </div>
         <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
             <thead>
               <tr className="bg-gray-50 dark:bg-bg-secondary/50 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                 <th className="px-6 py-4 border-b border-border">Data/Hora</th>
                 <th className="px-6 py-4 border-b border-border">IP Mitigado</th>
                 <th className="px-6 py-4 border-b border-border">Ação</th>
                 <th className="px-6 py-4 border-b border-border">Operador</th>
                 <th className="px-6 py-4 border-b border-border text-center">Status</th>
               </tr>
             </thead>
             <tbody className="text-sm divide-y divide-border/50">
               {(Array.isArray(auditLogs) ? auditLogs : (auditLogs?.items || [])).map((log: any, i: number) => (
                 <tr key={i} className="hover:bg-gray-50 dark:hover:bg-accent/5 transition-colors">
                   <td className="px-6 py-4 flex items-center gap-2 text-text-secondary whitespace-nowrap">
                     <Clock size={14} /> {log.timestamp || log.created_at}
                   </td>
                   <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-gray-100">{log.target || log.ip || '—'}</td>
                   <td className="px-6 py-4">
                     <span className="flex items-center gap-1.5 text-accent font-medium">
                       <Zap size={14} /> {log.action_type || 'BGP Blackhole'}
                     </span>
                   </td>
                   <td className="px-6 py-4 text-text-secondary">{log.username || 'System'}</td>
                   <td className="px-6 py-4 text-center">
                     <span className="px-2 py-1 bg-success/10 text-success text-[10px] font-bold rounded-full uppercase">
                       Resolvido
                     </span>
                   </td>
                 </tr>
               ))}
               {(!auditLogs || (Array.isArray(auditLogs) && auditLogs.length === 0)) && (
                 <tr>
                   <td colSpan={5} className="px-6 py-12 text-center text-text-secondary italic">
                     Nenhum histórico de mitigação encontrado
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
    
    const riskBadge = {
      high: {
        label: 'RISCO ALTO',
        bg: '#3b1212',
        color: '#ef4444',
        border: '#ef4444'
      },
      medium: {
        label: 'RISCO MÉDIO',
        bg: '#2d1f0a',
        color: '#f59e0b',
        border: '#f59e0b'
      },
      low: {
        label: 'RISCO BAIXO',
        bg: '#0f2d1a',
        color: '#22c55e',
        border: '#22c55e'
      },
    };

    const badge = riskBadge[risk];
    
    const barWidth = maxPps > 0
      ? Math.max((host.pps / maxPps) * 100, 2)
      : 0;

    const riskColor = risk === 'high'
      ? '#ef4444'
      : risk === 'medium'
        ? '#f59e0b'
        : '#22c55e';
 
   return (
      <div className={clsx(
        "space-y-2 group p-3 rounded-lg transition-all",
        isBanned && "bg-[#1a0a0a] border-l-[3px] border-l-[#ef4444]"
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
                   <span className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono flex items-center gap-1 cursor-help">
                     <span>🔒</span>
                     {host.ip}
                   </span>
                 </MitigationTooltip>
               ) : (
                 <span className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono flex items-center gap-1">
                   {host.ip}
                 </span>
               )}
              
              <span style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                border: `1px solid ${badge.border}`,
                background: badge.bg,
                color: badge.color,
                fontWeight: 600,
                letterSpacing: '0.5px',
              }}>
                {badge.label}
              </span>

              {isBanned && (
                <span className="px-2 py-0.5 bg-danger/20 text-danger border border-danger/30 rounded text-[9px] font-black uppercase">
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
              className="px-3 py-1.5 bg-danger hover:bg-danger/90 text-white text-[10px] font-bold rounded-lg shadow-sm active:scale-95 transition-all flex items-center gap-1 md:opacity-0 group-hover:opacity-100"
           >
             <Shield size={12} /> Mitigar
           </button>
         )}
       </div>
        <div style={{
          height: 6,
          background: '#2a2d3e',
          borderRadius: 3,
          overflow: 'hidden',
          marginTop: 6,
        }}>
          <div style={{
            width: `${barWidth}%`,
            height: '100%',
            background: riskColor,
            borderRadius: 3,
            transition: 'width 0.5s ease',
            animation: risk === 'high'
              ? 'pulse-bar 1s infinite' : 'none',
            boxShadow: risk === 'high'
              ? `0 0 8px ${riskColor}` : 'none',
          }} />
       </div>
     </div>
   );
 }
