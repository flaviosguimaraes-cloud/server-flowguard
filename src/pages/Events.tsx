import { useState, useCallback } from 'react';
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
 
 export default function Events() {
   const { t } = useTranslation();
   const isAdmin = localStorage.getItem('role') === 'admin';
  const queryClient = useQueryClient();
   const [isMitigationOpen, setIsMitigationOpen] = useState(false);
   const [targetIP, setTargetIP] = useState('');
 
   const { data: stats, isLoading: statsLoading } = useQuery({
     queryKey: ['detection-stats-events'],
     queryFn: async () => {
       const r = await api.get('/api/detection/stats');
       return r.data;
     },
     refetchInterval: 30000,
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
           <div className="bg-white dark:bg-[#1e2130] h-32 rounded-xl border border-gray-200 dark:border-[#2a2d3e] animate-pulse" />
           <div className="bg-white dark:bg-[#1e2130] h-32 rounded-xl border border-gray-200 dark:border-[#2a2d3e] animate-pulse" />
         </div>
         <div className="bg-white dark:bg-[#1e2130] h-96 rounded-xl border border-gray-200 dark:border-[#2a2d3e] animate-pulse" />
       </div>
     );
   }
 
   return (
     <div className="space-y-6 animate-in fade-in duration-500">
       <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('events')}</h1>
 
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Active Detections Card */}
         <div className="bg-white dark:bg-[#1e2130] p-6 rounded-xl border border-gray-200 dark:border-[#2a2d3e] shadow-sm flex items-center gap-6">
           <div className="p-4 bg-danger/10 rounded-2xl text-danger">
             <AlertTriangle size={32} />
           </div>
           <div>
             <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Detecções Ativas</p>
             <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats?.active_detections || 0}</h3>
             <p className="text-xs text-text-secondary mt-1">Anomalias identificadas agora</p>
           </div>
         </div>
 
         {/* Active Mitigations Card */}
         <div className="bg-white dark:bg-[#1e2130] p-6 rounded-xl border border-gray-200 dark:border-[#2a2d3e] shadow-sm flex items-center gap-6">
           <div className="p-4 bg-success/10 rounded-2xl text-success">
             <Shield size={32} />
           </div>
           <div>
             <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Mitigações em Curso</p>
             <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
               {activeMitigations?.total || activeMitigations?.items?.length || 0}
             </h3>
             <p className="text-xs text-text-secondary mt-1">Bloqueios ativos no BGP</p>
           </div>
         </div>
       </div>
 
       {/* Real-time Detections Section */}
       <div className="bg-white dark:bg-[#1e2130] rounded-xl border border-gray-200 dark:border-[#2a2d3e] shadow-sm overflow-hidden">
         <div className="p-6 border-b border-gray-100 dark:border-[#2a2d3e] flex justify-between items-center">
           <div className="flex items-center gap-2">
             <Activity className="text-accent" size={20} />
             <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Detecções em Tempo Real</h2>
           </div>
           <div className="flex gap-4 text-xs font-bold">
             <div className="flex items-center gap-1 text-accent">
               <ArrowDown size={14} /> {(stats?.incoming_mbps / 1000).toFixed(1)} Gbps
             </div>
             <div className="flex items-center gap-1 text-success">
               <ArrowUp size={14} /> {(stats?.outgoing_mbps / 1000).toFixed(1)} Gbps
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
               {(stats?.top_hosts_in || []).length === 0 ? (
                 <p className="text-center py-8 text-text-secondary italic text-sm">Nenhuma anomalia de entrada</p>
               ) : (
                 stats.top_hosts_in.map((host: any, i: number) => (
                   <HostItem key={i} host={host} onMitigate={handleMitigate} isAdmin={isAdmin} />
                 ))
               )}
             </div>
           </div>
 
           {/* Top Hosts Outbound */}
           <div className="p-6">
             <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-6 flex items-center gap-2">
               <ArrowUp size={16} className="text-success" /> Top Hosts de Saída
             </h3>
             <div className="space-y-6">
               {(stats?.top_hosts_out || []).length === 0 ? (
                 <p className="text-center py-8 text-text-secondary italic text-sm">Nenhuma anomalia de saída</p>
               ) : (
                 stats.top_hosts_out.map((host: any, i: number) => (
                   <HostItem key={i} host={host} onMitigate={handleMitigate} isAdmin={isAdmin} />
                 ))
               )}
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
     </div>
   );
 }
 
 function HostItem({ host, onMitigate, isAdmin }: any) {
   const riskLevel = host.pps > 50000 ? 'Alto' : host.pps > 10000 ? 'Médio' : 'Baixo';
   const maxPPS = 100000;
   const pct = Math.min((host.pps / maxPPS) * 100, 100);
 
   return (
     <div className="space-y-2 group">
       <div className="flex justify-between items-end">
         <div>
           <p className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono flex items-center gap-2">
             {host.ip}
             <span className={clsx(
               "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
               riskLevel === 'Alto' ? "bg-danger text-white" : 
               riskLevel === 'Médio' ? "bg-warning text-white" : "bg-success text-white"
             )}>
               Risco {riskLevel}
             </span>
           </p>
           <p className="text-xs text-text-secondary mt-1">
             <span className="font-bold text-text-primary">{(host.pps / 1000).toFixed(1)}k</span> PPS • 
             <span className="font-bold text-text-primary ml-2">{host.mbps > 1000 ? (host.mbps / 1000).toFixed(1) + ' Gbps' : host.mbps + ' Mbps'}</span>
           </p>
         </div>
         {isAdmin && (
           <button 
             onClick={() => onMitigate(host.ip)}
             className="px-3 py-1.5 bg-danger hover:bg-danger/90 text-white text-[10px] font-bold rounded-lg shadow-sm active:scale-95 transition-all flex items-center gap-1 opacity-0 group-hover:opacity-100"
           >
             <Shield size={12} /> Mitigar
           </button>
         )}
       </div>
       <div className="w-full bg-gray-100 dark:bg-[#2a2d3e] h-1.5 rounded-full overflow-hidden">
         <div 
           className={clsx(
             "h-full transition-all duration-1000",
             riskLevel === 'Alto' ? "bg-danger" : 
             riskLevel === 'Médio' ? "bg-warning" : "bg-accent"
           )}
           style={{ width: `${pct}%` }}
         />
       </div>
     </div>
   );
 }
