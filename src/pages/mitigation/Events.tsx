import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';
import { 
  Shield, AlertTriangle, Clock, ArrowDown, ArrowUp, 
  Activity, History, Zap, CheckCircle, Trash2
} from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import MitigationModal from '../../components/MitigationModal';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../../components/ui/tooltip';
import { MitigationTooltip } from '../../components/MitigationTooltip';

function SectionDivider({ title }: { title: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      margin: '24px 0 16px',
    }}>
      <div style={{
        height: 1,
        flex: 1,
        background: '#2a2d3e'
      }} />
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        color: '#8892a4',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }}>
        {title}
      </span>
      <div style={{
        height: 1,
        flex: 1,
        background: '#2a2d3e'
      }} />
    </div>
  );
}
 
  export default function Events() {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
   const isAdmin = localStorage.getItem('role') === 'admin';
  const queryClient = useQueryClient();
   const [isMitigationOpen, setIsMitigationOpen] = useState(false);
    const [targetIP, setTargetIP] = useState('');

    const handleRemove = async (ip: string) => {
      const cleanIP = ip.replace('/32', '').trim();

      if (!window.confirm(`Remover bloqueio de ${cleanIP}?`)) {
        return;
      }

      try {
        await api.post('/api/mitigation/remove', { ip: cleanIP });
        toast.success(`Mitigação removida: ${cleanIP}`);
        queryClient.invalidateQueries({ queryKey: ['mitigation-active-events'] });
        queryClient.invalidateQueries({ queryKey: ['detection-stats-events'] });
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'Erro ao remover mitigação');
      }
    };

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
 
    const { data: activeMitigations, dataUpdatedAt: activeMitigationsUpdatedAt } = useQuery({
     queryKey: ['mitigation-active-events'],
     queryFn: async () => {
       const r = await api.get('/api/mitigation/active');
       return r.data;
     },
      staleTime: 0,
      gcTime: 0,
      refetchInterval: 5000,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
   });

    const { data: flowspecRules } = useQuery({
      queryKey: ['mitigation-flowspec-active'],
      queryFn: async () => {
        const r = await api.get('/api/mitigation/flowspec').catch(() => ({ data: { items: [] } }));
        return r.data;
      },
      staleTime: 5000,
    });

    const hasActiveFlowspec = (ip: string) => {
      if (!flowspecRules?.items) return false;
      const cleanIp = ip.split('/')[0];
      return flowspecRules.items.some((item: any) => 
        item.dst_prefix?.includes(cleanIp) && item.status === 'active'
      );
    };

    const EventBadges = ({ actionType, direction }: { actionType: string, direction: string }) => {
      const badges = [];
      const normalizedAction = (actionType || '').toLowerCase();
      const normalizedDir = (direction || '').toLowerCase();

      // Action Type Badges
      if (normalizedAction === 'blackhole' || normalizedAction === 'blackhole_flowspec') {
        badges.push(
          <span key="bh" className="px-2 py-0.5 bg-danger/10 text-danger border border-danger/20 text-[10px] font-bold rounded uppercase whitespace-nowrap">
            Blackhole /32
          </span>
        );
      }
      
      if (normalizedAction === 'flowspec' || normalizedAction === 'blackhole_flowspec') {
        badges.push(
          <span key="fs" className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-bold rounded uppercase whitespace-nowrap">
            FlowSpec
          </span>
        );
      } else if (normalizedAction === 'external') {
        badges.push(
          <span key="ext" className="px-2 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-[10px] font-bold rounded uppercase whitespace-nowrap">
            Externo /24
          </span>
        );
      }

      // Direction Badges
      if (normalizedDir === 'incoming' || normalizedDir === 'inbound') {
        badges.push(
          <span key="dir" className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-bold rounded uppercase flex items-center gap-1 whitespace-nowrap">
            <i className="ti-arrow-down" /> Download
          </span>
        );
      } else if (normalizedDir === 'outgoing' || normalizedDir === 'outbound') {
        badges.push(
          <span key="dir" className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 text-[10px] font-bold rounded uppercase flex items-center gap-1 whitespace-nowrap">
            <i className="ti-arrow-up" /> Upload
          </span>
        );
      }

      if (badges.length === 0) return <span>—</span>;

      return <div className="flex flex-wrap gap-1 items-center justify-center">{badges}</div>;
    };

    const [filters, setFilters] = useState({
      ip: '',
      direction: '',
      status: '',
      type: '',
      origin: '',
      dateStart: '',
      dateEnd: '',
      minPps: '',
      maxPps: '',
    });

    const [pageSize, setPageSize] = useState(50);
    const [page, setPage] = useState(1);

    const { data: eventsHistory, isLoading: historyLoading, dataUpdatedAt: eventsUpdatedAt } = useQuery({
      queryKey: ['events-history-page', page, pageSize, filters],
      queryFn: async () => {
        const params = new URLSearchParams({
          limit: String(pageSize),
          offset: String((page - 1) * pageSize),
        });
        
        // Add filters to API request if needed, but the current code filters client-side.
        // However, the user asked for limit/offset, which implies server-side pagination.
        // I'll add the filters to the URL as well to be safe and efficient if the API supports it.
        if (filters.ip) params.append('ip', filters.ip);
        if (filters.direction) params.append('direction', filters.direction);
        if (filters.status) params.append('status', filters.status);
        
        const r = await api.get(`/api/events/history?${params.toString()}`);
        return r.data;
      },
      staleTime: 0,
      gcTime: 0,
      refetchInterval: 10000,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    });

    const total = eventsHistory?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    useEffect(() => {
      setPage(1);
    }, [pageSize, filters]);

   const formatDate = (dateStr: string) => {
     if (!dateStr) return '—';
     try {
       // Substituir espaço por T para compatibilidade com Safari/iOS
       const d = new Date(dateStr.replace(' ', 'T'));
       if (isNaN(d.getTime())) return '—';
       return d.toLocaleString('pt-BR', {
         day: '2-digit',
         month: '2-digit',
         hour: '2-digit',
         minute: '2-digit',
         second: '2-digit'
       });
     } catch {
       return '—';
     }
   };

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
    if (mbps > 0) {
      const mbpsStr = mbps >= 1000 ? (mbps / 1000).toFixed(1) + ' Gbps' : mbps.toFixed(0) + ' Mbps';
      return `${ppsStr} pps · ${mbpsStr}`;
    }
    return `${ppsStr} pps`;
  };

  const dirLabel = (dir: string) => {
    if (dir === 'outgoing' || dir === 'outbound')
      return {
        label: '↑ Upload',
        color: isDark ? '#22c55e' : '#15803d',
        bg: isDark ? '#0f2d1a' : '#dcfce7'
      };
    if (dir === 'incoming' || dir === 'inbound')
      return {
        label: '↓ Download',
        color: isDark ? '#3b82f6' : '#1d4ed8',
        bg: isDark ? '#0f1f3a' : '#dbeafe'
      };
    return {
      label: '—',
      color: '#8892a4',
      bg: 'transparent'
    };
  };

  const handleMitigate = useCallback((ip: string) => {
    setTargetIP(ip);
    setIsMitigationOpen(true);
  }, []);

   const applyFilters = (items: any[]) => {
     if (!items) return [];
     return items.filter(item => {
       // IP
       if (filters.ip && !item.ip?.includes(filters.ip)) return false;

       // Direção
       if (filters.direction && item.direction !== filters.direction) return false;

       // Status
       if (filters.status === 'active' && item.status !== 'active') return false;
       if (filters.status === 'removed' && item.status !== 'removed') return false;

       // Origem
       if (filters.origin === 'auto' && item.triggered_by !== 'detector') return false;
       if (filters.origin === 'manual' && item.triggered_by === 'detector') return false;

       // Data início
       if (filters.dateStart) {
         const d = new Date((item.started_at || item.start_time).replace(' ', 'T'));
         if (d < new Date(filters.dateStart)) return false;
       }

       // Data fim
       if (filters.dateEnd) {
         const d = new Date((item.started_at || item.start_time).replace(' ', 'T'));
         if (d > new Date(filters.dateEnd)) return false;
       }

       // PPS mínimo
       if (filters.minPps && item.peak_pps < Number(filters.minPps)) return false;

       // PPS máximo
       if (filters.maxPps && item.peak_pps > Number(filters.maxPps)) return false;

       return true;
     });
   };

   const filteredItems = useMemo(() => applyFilters(eventsHistory?.items || []), [eventsHistory, filters]);

   const clearFilters = () => {
     setFilters({
       ip: '',
       direction: '',
       status: '',
       type: '',
       origin: '',
       dateStart: '',
       dateEnd: '',
       minPps: '',
       maxPps: '',
     });
   };

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
              <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">DETECÇÕES ATIVAS</p>
              <h3 className="text-2xl font-bold text-text-primary">{stats?.active_detections || 0}</h3>
              <p className="text-[11px] text-text-secondary mt-0.5 opacity-70">Anomalias agora</p>
            </div>
          </div>
  
          {/* Active Mitigations Card */}
          <div className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm flex items-center gap-5 transition-all hover:border-success/20">
            <div className="p-3.5 bg-success/5 rounded-xl text-success border border-success/10">
              <Shield size={28} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">MITIGAÇÕES ATIVAS</p>
              <h3 className="text-2xl font-bold text-text-primary">
                {activeMitigations?.total || activeMitigations?.items?.length || 0}
              </h3>
              <p className="text-[11px] text-text-secondary mt-0.5 opacity-70">Bloqueios no BGP</p>
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
              <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-primary text-text-primary rounded-lg border border-border shadow-sm">
                <span className="text-text-secondary opacity-60 font-medium">TOTAL RX:</span>
                <span className="font-black">{(stats?.incoming_mbps / 1000).toFixed(1)} Gbps</span>
                <ArrowDown size={14} className="text-primary" />
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-primary text-text-primary rounded-lg border border-border shadow-sm">
                <span className="text-text-secondary opacity-60 font-medium">TOTAL TX:</span>
                <span className="font-black">{(stats?.outgoing_mbps / 1000).toFixed(1)} Gbps</span>
                <ArrowUp size={14} className="text-success" />
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
 
        {/* SEÇÃO 2 — Blackholes Ativos (condicional) */}
        {(activeMitigations?.items || []).length > 0 ? (
          <>
            <SectionDivider title="Mitigações Ativas Agora" />
            <div className="bg-bg-secondary rounded-xl border border-border shadow-sm overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-bg-primary/50 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                      <th className="px-6 py-4 border-b border-border">IP Atacado</th>
                      <th className="px-6 py-4 border-b border-border">Início</th>
                      <th className="px-6 py-4 border-b border-border">Volume</th>
                      <th className="px-6 py-4 border-b border-border text-center">Tipo</th>

                      <th className="px-6 py-4 border-b border-border text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-border/40">
                    {(activeMitigations.items || []).map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-danger/5 transition-colors group">
                        <td className="px-6 py-3.5 font-mono font-bold text-text-primary text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
                            {item.ip}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-text-secondary text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} opacity={0.5} /> {item.since || 'Recente'}
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <p className="font-bold text-text-primary text-xs">
                            {item.pps > 1000 ? (item.pps / 1000).toFixed(1) + 'k' : item.pps} pps · {item.mbps || 0} Mbps
                          </p>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <EventBadges 
                            actionType={item.action_type || item.type?.toLowerCase()} 
                            direction={item.direction} 
                          />
                        </td>

                        <td className="px-6 py-3.5 text-center">
                          {isAdmin && (
                            <button 
                              onClick={() => handleRemove(item.ip)}
                              className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-4">
            <span className="px-3 py-1 bg-success/10 text-success border border-success/20 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
              <CheckCircle size={12} /> ✓ Nenhum IP em bloqueio no momento
            </span>
          </div>
        )}

        <SectionDivider title="Histórico" />

        <div className="bg-bg-secondary rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border bg-bg-primary/30">
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <History className="text-warning" size={18} />
                  <h2 className="text-base font-bold text-text-primary">Histórico de Anomalias</h2>
                </div>
                {eventsUpdatedAt && (
                  <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest opacity-60">
                    Atualizado: {new Date(eventsUpdatedAt).toLocaleTimeString('pt-BR')}
                  </p>
                )}
              </div>
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['events-history-page'] })}
                className="px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg bg-bg-primary text-text-secondary border border-border hover:text-primary transition-all flex items-center gap-1"
              >
                ↻ Atualizar Dados
              </button>
            </div>

            {/* Filtros Avançados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-text-secondary opacity-70">IP</label>
                <input
                  type="text"
                  placeholder="Ex: 192.168.1 ou IP completo"
                  value={filters.ip}
                  onChange={e => setFilters(f => ({ ...f, ip: e.target.value }))}
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-text-secondary opacity-70">Direção</label>
                <select
                  value={filters.direction}
                  onChange={e => setFilters(f => ({ ...f, direction: e.target.value }))}
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer"
                >
                  <option value="">Todas</option>
                  <option value="incoming">↓ Download</option>
                  <option value="outgoing">↑ Upload</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-text-secondary opacity-70">Status</label>
                <select
                  value={filters.status}
                  onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer"
                >
                  <option value="">Todos</option>
                  <option value="active">Ativo</option>
                  <option value="removed">Finalizado</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-text-secondary opacity-70">Origem</label>
                <select
                  value={filters.origin}
                  onChange={e => setFilters(f => ({ ...f, origin: e.target.value }))}
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer"
                >
                  <option value="">Todas</option>
                  <option value="auto">Automático</option>
                  <option value="manual">Manual</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-text-secondary opacity-70">Data Início</label>
                <input
                  type="datetime-local"
                  value={filters.dateStart}
                  onChange={e => setFilters(f => ({ ...f, dateStart: e.target.value }))}
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-text-secondary opacity-70">Data Fim</label>
                <input
                  type="datetime-local"
                  value={filters.dateEnd}
                  onChange={e => setFilters(f => ({ ...f, dateEnd: e.target.value }))}
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-text-secondary opacity-70">PPS Mínimo</label>
                <input
                  type="number"
                  placeholder="Ex: 100000"
                  value={filters.minPps}
                  onChange={e => setFilters(f => ({ ...f, minPps: e.target.value }))}
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-text-secondary opacity-70">PPS Máximo</label>
                <input
                  type="number"
                  placeholder="Ex: 500000"
                  value={filters.maxPps}
                  onChange={e => setFilters(f => ({ ...f, maxPps: e.target.value }))}
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/20 flex justify-between items-center">
              <p className="text-[11px] font-bold text-text-secondary italic">
                {Object.values(filters).some(v => v !== '') 
                  ? `${filteredItems.length} eventos encontrados`
                  : `Mostrando todos os ${eventsHistory?.total || eventsHistory?.items?.length || 0} eventos`
                }
              </p>
              <div className="flex gap-2">
                <button
                  onClick={clearFilters}
                  className="px-4 py-1.5 text-[10px] font-bold uppercase bg-bg-primary text-text-secondary border border-border rounded-lg hover:bg-bg-secondary transition-all"
                >
                  ✕ Limpar
                </button>
                <button
                   onClick={() => queryClient.invalidateQueries({ queryKey: ['events-history-page'] })}
                   className="px-4 py-1.5 text-[10px] font-bold uppercase bg-primary text-white rounded-lg hover:bg-primary/90 transition-all shadow-sm shadow-primary/10 flex items-center gap-1"
                >
                  🔍 Pesquisar
                </button>
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
                   <th className="px-6 py-3 border-b border-border text-center">Status</th>
                  <th className="px-6 py-3 border-b border-border text-center">Tipo</th>
                  <th className="px-6 py-3 border-b border-border">Origem</th>
                </tr>
              </thead>
               <tbody className="text-sm divide-y divide-border/50">
                 {filteredItems.map((event: any, i: number) => (
                   <tr key={i} className="hover:bg-bg-primary/50 transition-colors group">
                    <td className="px-6 py-3.5 font-mono font-bold text-text-primary text-xs">{event.ip}</td>
                     <td className="px-6 py-3.5 text-text-secondary text-[11px] whitespace-nowrap">
                       {formatDate(event.started_at || event.start_time)}
                     </td>
                     <td className="px-6 py-3.5 text-text-secondary text-[11px] whitespace-nowrap">
                       {formatDate(event.ended_at || event.end_time)}
                     </td>
                    <td className="px-6 py-3.5 text-center text-text-primary text-[11px] font-medium">
                      {fmtDuration(event.duration_seconds)}
                    </td>
                    <td className="px-6 py-3.5">
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(() => {
                          const THRESH_PPS = 100000;
                          const THRESH_MBPS = 1000;
                          const byPps = event.peak_pps >= THRESH_PPS;
                          const byMbps = event.peak_mbps >= THRESH_MBPS;
                          const byPpsFallback = !byPps && !byMbps && event.triggered_by === 'detector';
                          
                          const ppsColor = byPps ? '#ef4444' : (byPpsFallback ? '#f97316' : '#8892a4');
                          const ppsBg = byPps ? (isDark ? '#3b1212' : '#fee2e2') : (byPpsFallback ? (isDark ? '#331a0a' : '#ffedd5') : 'transparent');
                          
                          const ppsContent = (
                            <span style={{
                              fontWeight: (byPps || byPpsFallback) ? 700 : 400,
                              color: ppsColor,
                              background: ppsBg,
                              padding: (byPps || byPpsFallback) ? '1px 6px' : '0',
                              borderRadius: 3,
                              fontSize: 12,
                              cursor: byPpsFallback ? 'help' : 'default'
                            }}>
                              {(event.peak_pps / 1000).toFixed(1)}k pps
                              {byPps ? ' ⚡' : ''}
                              {byPpsFallback ? ' 🕒' : ''}
                            </span>
                          );

                          if (byPpsFallback) {
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  {ppsContent}
                                </TooltipTrigger>
                                <TooltipContent className="bg-bg-secondary text-text-primary border border-border shadow-xl">
                                  <p className="text-[11px] font-bold">Valor capturado após o pico.</p>
                                  <p className="text-[10px] opacity-80 mt-0.5">Gatilho provável: PPS</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          }
                          
                          return ppsContent;
                        })()}
                        {event.peak_mbps > 0 && (() => {
                          const byMbps = event.peak_mbps >= 1000;
                          return (
                            <span style={{
                              fontWeight: byMbps ? 700 : 400,
                              color: byMbps ? '#f59e0b' : '#8892a4',
                              background: byMbps ? (isDark ? '#2d1f0a' : '#fef3c7') : 'transparent',
                              padding: byMbps ? '1px 6px' : '0',
                              borderRadius: 3,
                              fontSize: 12,
                            }}>
                              {event.peak_mbps} Mbps
                              {byMbps ? ' ⚡' : ''}
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {event.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-danger/10 text-danger text-[9px] font-black border border-danger/20 animate-pulse">
                          ● ATIVO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-bg-primary text-text-secondary text-[9px] font-bold border border-border">
                          ✓ FINALIZADO
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <EventBadges 
                        actionType={event.action_type || event.type?.toLowerCase()} 
                        direction={event.direction || event.flow_direction} 
                      />
                    </td>


                    <td className="px-6 py-3.5 text-text-secondary text-[11px] font-bold uppercase tracking-wider">
                      {event.triggered_by === 'detector' ? 'Automático' : 'Manual'}
                    </td>
                  </tr>
                ))}
                {(!eventsHistory?.items || eventsHistory.items.length === 0) && !historyLoading && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-text-secondary italic text-xs">
                      Nenhum histórico de anomalias encontrado
                    </td>
                  </tr>
                )}
                {historyLoading && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Skeleton count={5} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="p-4 border-t border-border bg-bg-primary/30 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-xs text-text-secondary font-bold uppercase tracking-widest">Linhas por página:</span>
              <select 
                value={pageSize} 
                onChange={e => setPageSize(Number(e.target.value))}
                className="bg-bg-primary border border-border rounded px-2 py-1 text-xs text-text-primary outline-none"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
              <span className="text-xs text-text-secondary ml-4">
                Total: <span className="text-text-primary font-bold">{total}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-bg-primary border border-border rounded-lg text-xs font-bold text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all"
              >
                Anterior
              </button>
              <span className="text-xs font-bold text-text-primary px-2">
                Página {page} de {Math.max(1, totalPages)}
              </span>
              <button 
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-bg-primary border border-border rounded-lg text-xs font-bold text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all"
              >
                Próxima
              </button>
            </div>
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
            <span className="px-2 py-0.5 bg-danger text-white border border-danger/20 rounded text-[9px] font-black uppercase tracking-wider shadow-sm animate-pulse">
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
