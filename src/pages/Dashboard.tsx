import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../contexts/ThemeContext';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell, AreaChart, Area
} from 'recharts';
import { 
   Tooltip, TooltipTrigger, TooltipContent, TooltipProvider 
 } from '../components/ui/tooltip';
 import { MitigationTooltip } from '../components/MitigationTooltip';
import { ArrowUp, ArrowDown, Activity, Shield, MoreVertical, BarChart2, LineChart as LineChartIcon, Settings2, Info, ArrowRight, History, Zap, CheckCircle, Clock } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Skeleton } from '../components/Skeleton';
import Flag from '../components/Flag';

import { clsx } from 'clsx';

const REFETCH_INTERVAL = 30000;
const RX_COLORS = ['#3b82f6', '#1d4ed8', '#60a5fa', '#93c5fd', '#bfdbfe'];
const TX_COLORS = ['#22c55e', '#16a34a', '#4ade80', '#86efac', '#bbf7d0'];
const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
const MAX_POINTS = 300;

const sampleData = (data: any[]) => {
  if (data.length <= MAX_POINTS)
    return data;
  const step = Math.ceil(
    data.length / MAX_POINTS);
  return data.filter(
    (_, i) => i % step === 0);
};

function StatCard({ title, value, unit, icon, trend, tooltip, subtitle }: any) {
  return (
    <div 
      className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between min-h-[140px] transition-all duration-300 hover:border-primary/30 group relative overflow-hidden"
      title={tooltip}
    >
      <div className="flex justify-between items-start relative z-10">
        <div className="p-2.5 bg-bg-primary rounded-lg text-primary transition-all duration-200 border border-border/40 group-hover:bg-primary/5 group-hover:border-primary/20">
          {icon}
        </div>
        {trend && typeof trend === 'string' && (
          <span className={clsx(
            "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
            trend.startsWith('+') ? "bg-success-bg text-success border-success/10" : 
            trend.startsWith('-') ? "bg-danger-bg text-danger border-danger/10" : "bg-accent-bg text-accent border-accent/10"
          )}>
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4 relative z-10">
        <p className="text-text-secondary text-[11px] font-bold uppercase tracking-wider opacity-70 mb-1">{title}</p>
        <div className="flex items-baseline gap-1.5">
          <h3 className="text-3xl font-bold text-text-primary tracking-tight leading-none">{value}</h3>
          {unit && <span className="text-[11px] font-bold text-text-secondary opacity-50 uppercase tracking-wider">{unit}</span>}
        </div>
         {subtitle && (
            <div className="text-[10px] text-text-secondary font-medium mt-2.5 opacity-60 border-t border-border/40 pt-2 line-clamp-1">{subtitle}</div>
         )}
      </div>
    </div>
  );
}

const serviceNames: Record<string, string> = {
  flow_collector: 'GoFlow2',
  detection_engine: 'FastNetMon',
  api: 'API FlowGuard',
  flow_database: 'ClickHouse',
  config_database: 'PostgreSQL',
  cache: 'Redis',
  bgp_engine: 'ExaBGP',
  web: 'Nginx',
};

export default function Dashboard() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState(30);
  const [hoveredIP, setHoveredIP] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer visual
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => (c <= 1 ? 30 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Forçar invalidação manual a cada 30s
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['detection-stats'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['interfaces'] });
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [queryClient]);

   const timeAgo = (dateStr: string) => {
     if (!dateStr) return '—';
     const d = new Date(dateStr.replace(' ', 'T'));
     if (isNaN(d.getTime())) return '—';
     const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `há ${mins}min`;
    const hrs = Math.floor(mins / 60);
    return `há ${hrs}h`;
  };

  const { data: detection, isLoading: statsLoading } = useQuery({
    queryKey: ['detection-stats'],
    queryFn: async () => {
      const r = await api.get('/api/detection/stats');
      return r.data;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });

   const { data: eventsHistory, isLoading: loadingEvents, dataUpdatedAt: eventsUpdatedAt } = useQuery({
     queryKey: ['events-history-dashboard'],
     queryFn: async () => {
       const r = await api.get('/api/events/history?limit=5');
       return r.data;
     },
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 10000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

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

  const { data: sysStatus } = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      try {
        const r = await api.get('/api/system/status');
        console.log('system status:', r.data);
        return r.data;
      } catch (err) {
        console.error('System status error:', err);
        return null;
      }
    },
    refetchInterval: 10000,
    staleTime: 0,
  });

  const { data: timeline } = useQuery({
    queryKey: ['timeline'],
    queryFn: async () => {
      const r = await api.get('/api/flows/timeline?minutes=30');
      return r.data;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });


  const [selectedCollector, setSelectedCollector] = useState<number>(() => {
    const saved = localStorage.getItem('fg_collector');
    const parsed = saved ? parseInt(saved) : 1;
    return isNaN(parsed) ? 1 : parsed;
  });
  const [selectedIfaces, setSelectedIfaces] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fg_ifaces');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

   const [source] = useState<'snmp'>('snmp');

  const { data: collectors } = useQuery({
    queryKey: ['collectors'],
    queryFn: () => api.get('/api/collectors').then(r => r.data),
  });

  const { data: interfaces } = useQuery({
    queryKey: ['interfaces', selectedCollector],
    queryFn: async () => {
      if (!selectedCollector) return null;
      const r = await api.get(`/api/collectors/${selectedCollector}/interfaces/summary`);
      return r.data;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    enabled: !!selectedCollector,
  });

   const [history, setHistory] = useState<Record<string, {time: string, in_bps: number, out_bps: number}[]>>({});
   const [serviceFilter, setServiceFilter] = useState<string | null>(null);
   const [timePeriod, setTimePeriod] = useState<'30M' | '1H' | '6H' | '12H' | '24H' | '48H'>('30M');
   const [showIfaceSelector, setShowIfaceSelector] = useState(false);

  useEffect(() => {
    queryClient.invalidateQueries({
      queryKey: ['iface-history']
    });
  }, [timePeriod, selectedIfaces, queryClient]);

  const { data: metricsHistory, isLoading: metricsHistoryLoading } = useQuery({
    queryKey: ['iface-history', selectedCollector, timePeriod, selectedIfaces],
    queryFn: async () => {
      if (selectedIfaces.length === 0 || !selectedCollector)
        return null;

       const minutes = timePeriod === '30M' ? 30 : 
                       timePeriod === '1H' ? 60 : 
                       timePeriod === '6H' ? 360 : 
                       timePeriod === '12H' ? 720 : 
                       timePeriod === '24H' ? 1440 : 2880;

      console.log('Buscando histórico:', selectedCollector, selectedIfaces, minutes);

      const results = await Promise.all(
        selectedIfaces.map(async ifName => {
          const url = `/api/collectors/${selectedCollector}/metrics/history?minutes=${minutes}&if_name=${encodeURIComponent(ifName)}`;
          console.log('URL:', url);
          const r = await api.get(url);
          console.log('Resultado:', ifName, r.data);
          return {
            ifName,
            data: r.data?.history || []
          };
        })
      );
      return results;
    },
    enabled: selectedIfaces.length > 0 && !!selectedCollector,
    refetchInterval: 60000,
  });
 
  useEffect(() => {
    if (selectedCollector) {
      localStorage.setItem('fg_collector', String(selectedCollector));
    }
  }, [selectedCollector]);

  useEffect(() => {
    localStorage.setItem('fg_ifaces', JSON.stringify(selectedIfaces));
  }, [selectedIfaces]);

  useEffect(() => {
    localStorage.setItem('fg_traffic_source', source);
  }, [source]);

    const { data: activeMitigations, dataUpdatedAt: mitigationsUpdatedAt } = useQuery({
     queryKey: ['mitigation-active-dashboard'],
     queryFn: () => api.get('/api/mitigation/active').then(r => r.data),
      staleTime: 0,
      gcTime: 0,
      refetchInterval: 10000,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
   });
 
   const { data: connections, dataUpdatedAt } = useQuery({
     queryKey: ['connections'],
     queryFn: () =>
       api.get('/api/flows/connections?limit=10&minutes=2')
         .then(r => r.data),
     staleTime: 0,
     gcTime: 0,
     refetchOnMount: true,
     refetchOnWindowFocus: true,
   });


    const flowData = useMemo(() => {
      const list = Array.isArray(timeline) ? timeline : (timeline?.items || timeline?.data || []);
      return list.map((d: any) => ({
        time: d.time ? d.time.substring(11, 16) : '',
        rx: parseFloat((d.rx_bytes / 1e9).toFixed(2)),
        tx: parseFloat((d.tx_bytes / 1e9).toFixed(2)),
      }));
    }, [timeline]);

    const selectedIfaceData = useMemo(() => {
      const list = Array.isArray(interfaces?.interfaces) ? interfaces.interfaces : [];
      return list.filter((i: any) => selectedIfaces.includes(i.display_name || i.if_name));
    }, [interfaces, selectedIfaces]);

    const timePoints = useMemo(() => {
      const firstSelected = selectedIfaces[0];
      return history[firstSelected]?.map(p => p.time) || [];
    }, [history, selectedIfaces]);

     const ifaceMap = useMemo(() => {
       const map: Record<string, string> = {};
       const list = Array.isArray(interfaces?.interfaces) ? interfaces.interfaces : [];
       list.forEach((i: any) => {
         map[i.if_name] = i.display_name || i.if_name;
       });
       return map;
     }, [interfaces]);
 
  const historicalChartData = useMemo(() => {
    if (!metricsHistory?.length) return [];

    // Coletar todos os timestamps únicos
    const allTimes = new Set<string>();
    metricsHistory.forEach(({data}) => {
      data.forEach((p: any) => allTimes.add(p.time_bucket));
    });

    // Montar pontos do gráfico
    const fullData = Array.from(allTimes)
      .sort()
      .map(time => {
        const point: any = {
          time: time,
          display_time: time.substring(11, 16)
        };
        metricsHistory.forEach(({ifName, data}) => {
          const found = data.find((p: any) => p.time_bucket === time);
          if (found) {
            point[`${ifName}_in`] = Math.round(found.in_bps / 1e6);
            point[`${ifName}_out`] = Math.round(found.out_bps / 1e6);
          }
        });
        return point;
      });

    return fullData;
  }, [metricsHistory]);

  const chartData = useMemo(() => sampleData(historicalChartData), [historicalChartData]);



   const formatTime = (timeStr: string) => {
     if (!timeStr || timeStr.length < 16) return timeStr;
     if (timePeriod === '24H' || timePeriod === '48H') {
       const d = new Date(timeStr.replace(' ', 'T'));
       if (isNaN(d.getTime())) return timeStr.substring(11, 16);
       return d.toLocaleDateString('pt-BR', {
         day: '2-digit', month: '2-digit'
       }) + ' ' + timeStr.substring(11, 16);
     }
     return timeStr.substring(11, 16);
   };
   const formatBps = (mbps: number) => {
     if (mbps >= 1000)
       return (mbps / 1000).toFixed(1) + ' G';
     return mbps.toFixed(0) + ' M';
   };

   const formatBpsRaw = (bps: number) => {
     if (bps >= 1e9)
       return (bps / 1e9).toFixed(1) + ' Gbps';
     if (bps >= 1e6)
       return (bps / 1e6).toFixed(0) + ' Mbps';
     return (bps / 1e3).toFixed(0) + ' Kbps';
   };

   const periodStats = useMemo(() => {
     const getStats = (values: number[]) => {
       if (!values.length) return { last: 0, min: 0, avg: 0, max: 0 };
       return {
         last: values[values.length - 1],
         min: Math.min(...values),
         avg: values.reduce((a, b) => a + b, 0) / values.length,
         max: Math.max(...values),
       };
     };

     if (!metricsHistory?.length) {
       return {
         rx: getStats([]),
         tx: getStats([]),
         label: timePeriod
       };
     }

     const timeMap: Record<string, { rx: number, tx: number }> = {};
     metricsHistory.forEach(({ data }) => {
       data.forEach((p: any) => {
         const t = p.time_bucket;
         if (!timeMap[t]) timeMap[t] = { rx: 0, tx: 0 };
         timeMap[t].rx += p.in_bps || 0;
         timeMap[t].tx += p.out_bps || 0;
       });
     });

     const sorted = Object.keys(timeMap).sort();
     const rxValues = sorted.map(t => timeMap[t].rx);
     const txValues = sorted.map(t => timeMap[t].tx);

      return {
        rx: getStats(rxValues),
        tx: getStats(txValues),
        label: timePeriod === '30M' ? '30 minutos' :
               timePeriod === '1H' ? '1 hora' :
               timePeriod === '6H' ? '6 horas' : 
               timePeriod === '12H' ? '12 horas' :
               timePeriod === '24H' ? '24 horas' : 
               timePeriod === '48H' ? '48 horas' : timePeriod
      };
   }, [timePeriod, metricsHistory, history, selectedIfaces]);



   const formatDate = (dateStr: string) => {
     if (!dateStr) return '—';
     try {
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

   const fmtBps = (bps: number) => {
     if (!bps || bps === 0) return '0 bps';
     if (bps >= 1e9)
       return (bps/1e9).toFixed(1)+' Gbps';
     if (bps >= 1e6)
       return (bps/1e6).toFixed(0)+' Mbps';
     if (bps >= 1e3)
       return (bps/1e3).toFixed(0)+' Kbps';
     return bps+' bps';
   };

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton count={4} />
        </div>
        <Skeleton count={1} />
      </div>
    );
  }

    return (
      <TooltipProvider>
      <div className="space-y-6 animate-in fade-in duration-500">
       <style>{`
         @keyframes pulse {
           0%, 100% { opacity: 1; }
           50% { opacity: 0.3; }
         }
       `}</style>
        {/* Top Stats Redesign */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard 
            title="FLOW IPv4 ↓ DOWNLOAD" 
            value={detection?.incoming_mbps >= 1000 ? (detection.incoming_mbps / 1000).toFixed(1) : (detection?.incoming_mbps || 0).toFixed(0)} 
            unit={detection?.incoming_mbps >= 1000 ? "Gbps" : "Mbps"} 
            icon={<ArrowDown className="text-blue-500" size={20} />} 
          />
          <StatCard 
            title="FLOW IPv4 ↑ UPLOAD" 
            value={detection?.outgoing_mbps >= 1000 ? (detection.outgoing_mbps / 1000).toFixed(1) : (detection?.outgoing_mbps || 0).toFixed(0)} 
            unit={detection?.outgoing_mbps >= 1000 ? "Gbps" : "Mbps"} 
            icon={<ArrowUp className="text-green-500" size={20} />} 
          />
          <StatCard 
            title="FLOWS ATIVOS" 
            value={detection?.incoming_pps > 1000 ? (detection.incoming_pps / 1000).toFixed(1) + 'k' : detection?.incoming_pps || '0'} 
            icon={<Activity className="text-warning" size={20} />} 
          />
          
          {/* Coletores Card with Tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                <StatCard 
                  title="COLETORES" 
                  value={(Array.isArray(collectors) ? collectors : (collectors?.items || collectors?.data || []))
                    .filter((c: any) => c.status === 'active' || c.status === 'Ativo').length} 
                  icon={<Zap className="text-primary" size={20} />} 
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="w-64 p-3">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-2 border-b border-border/50 pb-1">Status dos Coletores</p>
                {(Array.isArray(collectors) ? collectors : (collectors?.items || collectors?.data || [])).map((c: any) => (
                  <div key={c.id} className="flex justify-between items-center text-[11px]">
                    <div className="flex flex-col">
                      <span className="font-bold text-text-primary">{c.name}</span>
                      <span className="text-[9px] text-text-secondary">{c.host} · {c.snmp_version || 'v2c'}</span>
                    </div>
                    <span className={clsx(
                      "px-1.5 py-0.5 rounded text-[9px] font-bold",
                      (c.status === 'active' || c.status === 'Ativo') ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                    )}>
                      {(c.status === 'active' || c.status === 'Ativo') ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>

          <StatCard 
            title="MITIGAÇÕES ATIVAS" 
            value={detection?.active_mitigations || '0'} 
            icon={<Shield className={clsx(Number(detection?.active_mitigations) > 0 ? "text-danger" : "text-text-secondary opacity-40")} size={20} />} 
            trend={Number(detection?.active_mitigations) > 0 ? "ATIVO" : undefined}
          />
        </div>


      {/* Main Chart: Tráfego da Interface - Refined Light Theme Visuals */}
      <div className="bg-white dark:bg-bg-secondary p-6 rounded-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none transition-all">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4 border-b border-border/50 pb-5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-text-primary">Tráfego do Coletor</h2>
            <div className="px-2.5 py-1 rounded-full bg-accent/10 text-accent text-[9px] font-black uppercase tracking-wider">
              SNMP Realtime
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowIfaceSelector(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #2a2d3e',
                background: 'transparent',
                color: '#8892a4',
                cursor: 'pointer',
                fontSize: 12,
              }}>
              ⚙ Interfaces ({selectedIfaces.length} selecionadas)
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-primary rounded-lg border border-border">
              <Settings2 size={14} className="text-text-secondary" />
              <select 
                value={selectedCollector || ''} 
                onChange={(e) => setSelectedCollector(Number(e.target.value))}
                className="bg-transparent text-[11px] font-bold text-text-primary focus:outline-none cursor-pointer"
              >
                {(Array.isArray(collectors) ? collectors : (collectors?.items || collectors?.data || [])).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.host})</option>
                ))}
              </select>
            </div>

              {/* MELHORIA 4 — Seletor de período */}
               <div className="flex bg-bg-primary p-1 rounded-lg border border-border overflow-x-auto">
               {(['30M', '1H', '6H', '12H', '24H', '48H'] as const).map((p) => (
                   <button
                     key={p}
                     onClick={() => setTimePeriod(p as any)}
                     className={clsx(
                       "px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all whitespace-nowrap",
                       timePeriod === p 
                         ? "bg-white dark:bg-[#2a2d3e] text-accent shadow-sm" 
                         : "text-text-secondary hover:text-text-primary"
                     )}
                   >
                     {p}
                   </button>
                 ))}
               </div>
 
             <button 
               onClick={() => {
                 queryClient.invalidateQueries();
                 setCountdown(30);
               }}
               className="flex items-center gap-2 px-3 py-1.5 bg-bg-primary hover:bg-gray-100 dark:hover:bg-[#2a2d3e] text-text-secondary hover:text-text-primary rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider border border-border"
             >
               <svg 
                 xmlns="http://www.w3.org/2000/svg" 
                 width="14" height="14" 
                 viewBox="0 0 24 24" fill="none" 
                 stroke="currentColor" strokeWidth="2.5" 
                 strokeLinecap="round" strokeLinejoin="round"
                 className={clsx(countdown === 30 && "animate-spin")}
                 style={{ animationDuration: '1s' }}
               >
                 <path d="M23 4v6h-6"/>
                 <path d="M1 20v-6h6"/>
                 <path d="M3.51 9a9 9 0 0114.85-3.36L23 10"/>
                 <path d="M20.49 15a9 9 0 01-14.85 3.36L1 14"/>
               </svg>
               <span>{countdown}s</span>
             </button>
          </div>
        </div>

        {/* Collector Info */}
        <div className="flex items-center gap-2 text-xs text-text-secondary opacity-80 mb-5">
          <Info size={14} />
          <span className="font-medium">
            {(Array.isArray(collectors) ? collectors : (collectors?.items || collectors?.data || [])).find((c: any) => c.id === selectedCollector)?.name || 'NE-20'} 
            <span className="mx-2 opacity-30">|</span>
            {(Array.isArray(collectors) ? collectors : (collectors?.items || collectors?.data || [])).find((c: any) => c.id === selectedCollector)?.host || '45.175.50.209'} 
            <span className="mx-2 opacity-30">|</span>
            v2c
          </span>
        </div>

         <div className="space-y-2 bg-[#F8FAFC] dark:bg-[#0f172a]/40 p-4 rounded-xl border border-border/50 relative min-h-[350px] flex items-center justify-center">
          {metricsHistoryLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-bold text-text-secondary uppercase tracking-widest animate-pulse">Carregando histórico...</span>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex flex-col items-center gap-2 text-text-secondary opacity-60">
              <History size={32} strokeWidth={1.5} />
              <span className="text-xs font-bold uppercase tracking-wider">Sem dados para o período selecionado</span>
            </div>
          ) : (
            <div className="relative w-full h-[300px] mt-4">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                   <defs>
                     {selectedIfaces.map((name, idx) => (
                       <linearGradient
                         key={name}
                         id={`grad_${idx}`}
                         x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%"
                           stopColor={COLORS[idx % COLORS.length]}
                           stopOpacity={0.4}/>
                         <stop offset="95%"
                           stopColor={COLORS[idx % COLORS.length]}
                           stopOpacity={0.05}/>
                       </linearGradient>
                     ))}
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#E2E8F0"} vertical={false} opacity={isDark ? 0.3 : 0.6} />
                   <XAxis 
                     dataKey="time" 
                     tick={{fontSize:9, fill: isDark ? '#94A3B8' : '#64748B', fontWeight: 600}} 
                     tickLine={false} 
                     axisLine={false}
                     tickFormatter={formatTime}
                     minTickGap={30}
                   />
                   <YAxis 
                     tick={{fontSize:9, fill: isDark ? '#94A3B8' : '#64748B', fontWeight: 600}} 
                     tickLine={false} 
                     axisLine={false} 
                     tickFormatter={v => formatBps(v)} 
                   />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div style={{
                          background: isDark ? '#1e2130' : '#ffffff',
                          border: `1px solid ${isDark ? '#2a2d3e' : '#e2e8f0'}`,
                          borderRadius: 8,
                          padding: '8px 12px',
                          fontSize: 12,
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}>
                          <div style={{
                            color: '#8892a4',
                            marginBottom: 6,
                            fontSize: 11,
                            fontWeight: 600
                          }}>
                            {label}
                          </div>
                          {payload.map((entry: any) => {
                            const ifName = entry.dataKey
                              .replace('_in', '')
                              .replace('_out', '');
                            const dir = entry.dataKey.endsWith('_in') ? '↓ RX' : '↑ TX';
                            return (
                              <div key={entry.dataKey} style={{
                                color: entry.color,
                                marginBottom: 2,
                                display: 'flex',
                                gap: 8,
                                justifyContent: 'space-between'
                              }}>
                                <span style={{ fontWeight: 600 }}>{ifName}</span>
                                <span>{dir}: {formatBpsRaw((entry.value || 0) * 1e6)}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }}
                  />
                   {selectedIfaces.flatMap((name, idx) => [
                     <Area 
                       key={`${name}_in`}
                       type="monotone"
                       dataKey={`${name}_in`}
                       stroke={COLORS[idx % COLORS.length]}
                       strokeWidth={2} 
                       fill={`url(#grad_${idx})`}
                       dot={false} 
                       isAnimationActive={false}
                       name={`${name} ↓`}
                     />,
                     <Area 
                       key={`${name}_out`}
                       type="monotone"
                       dataKey={`${name}_out`}
                       stroke={COLORS[idx % COLORS.length]}
                       strokeWidth={1.5}
                       strokeDasharray="4 2"
                       fill="none"
                       dot={false} 
                       isAnimationActive={false}
                       name={`${name} ↑`}
                     />
                   ])}
                 </AreaChart>
               </ResponsiveContainer>
            </div>
          )}
        </div>

          {/* Compact Zabbix style stats below chart */}
          <div className="mt-4 border-t border-border/40 pt-3 px-2">
            <div className="flex items-center gap-4 text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-2 opacity-60">
              <Activity size={10} />
              Estatísticas · {periodStats.label}
            </div>
            <div className="space-y-2">
              {(['rx', 'tx'] as const).map(dir => (
                <div key={dir} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 text-[11px] font-medium leading-none py-0.5">
                  <span className={clsx(
                    "font-black w-8",
                    dir === 'rx' ? "text-blue-500" : "text-green-500"
                  )}>
                    {dir === 'rx' ? '↓ RX' : '↑ TX'}
                  </span>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    {(['last', 'min', 'avg', 'max'] as const).map(metric => (
                      <div key={metric} className="flex items-baseline gap-1">
                        <span className="uppercase text-[9px] font-bold text-text-secondary opacity-50">
                          {metric === 'last' ? 'Último' : metric === 'min' ? 'Mín' : metric === 'avg' ? 'Méd' : 'Máx'}:
                        </span>
                        <span className={clsx(
                          "font-bold",
                          metric === 'max' ? (dir === 'rx' ? "text-blue-500" : "text-green-500") : "text-text-primary"
                        )}>
                          {formatBpsRaw(periodStats[dir][metric])}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
      </div>



        {/* Seção 3 — Eventos (Largura Total) */}
        <div className="bg-white dark:bg-bg-secondary rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-border/50 bg-bg-primary/30">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <History className="text-primary" size={18} />
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Últimos Eventos de Mitigação</h2>
              </div>
              {eventsUpdatedAt && (
                <span className="text-[10px] text-text-secondary opacity-60 font-medium">
                  Atualizado: {new Date(eventsUpdatedAt).toLocaleTimeString('pt-BR')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['events-history-dashboard'] })}
                className="text-[10px] font-bold text-text-secondary hover:text-primary transition-colors flex items-center gap-1 bg-bg-primary px-2 py-1 rounded border border-border"
              >
                ↻ Atualizar
              </button>
              <Link to="/events" className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                Ver completo <ArrowRight size={12} />
              </Link>
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
                  <th className="px-6 py-3 border-b border-border">Pico (PPS/MBPS)</th>
                  <th className="px-6 py-3 border-b border-border text-center">Direção</th>
                  <th className="px-6 py-3 border-b border-border text-center">Status</th>
                  <th className="px-6 py-3 border-b border-border">Tipo</th>
                  <th className="px-6 py-3 border-b border-border">Origem</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-border/50">
                {eventsHistory?.items?.slice(0, 5).map((event: any, i: number) => (
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
                          const byPps = event.peak_pps >= 100000;
                          return (
                            <span style={{
                              fontWeight: byPps ? 700 : 400,
                              color: byPps ? '#ef4444' : (isDark ? '#94a3b8' : '#6b7280'),
                              background: byPps ? (isDark ? '#3b1212' : '#fee2e2') : 'transparent',
                              padding: byPps ? '1px 6px' : '0',
                              borderRadius: 3,
                              fontSize: 12,
                            }}>
                              {(event.peak_pps / 1000).toFixed(1)}k pps
                              {byPps ? ' ⚡' : ''}
                            </span>
                          );
                        })()}
                        {event.peak_mbps > 0 && (() => {
                          const byMbps = event.peak_mbps >= 1000;
                          return (
                            <span style={{
                              fontWeight: byMbps ? 700 : 400,
                              color: byMbps ? '#f59e0b' : (isDark ? '#94a3b8' : '#6b7280'),
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
                      {(() => {
                        const dir = dirLabel(event.direction || event.flow_direction);
                        return (
                          <span style={{
                            color: dir.color,
                            background: dir.bg,
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 500
                          }}>
                            {dir.label}
                          </span>
                        );
                      })()}
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
                    <td className="px-6 py-3.5 text-text-secondary text-[11px] font-medium uppercase tracking-wider">
                      {event.type || 'Blackhole'}
                    </td>
                    <td className="px-6 py-3.5 text-text-secondary text-[11px] font-bold uppercase tracking-wider">
                      {event.triggered_by === 'detector' ? 'Automático' : 'Manual'}
                    </td>
                  </tr>
                ))}
                {(!eventsHistory?.items || eventsHistory.items.length === 0) && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-text-secondary italic text-xs">
                      Nenhum histórico de anomalias encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Seção 4 — Saúde do Servidor (Largura Total) */}
        <div className="bg-white dark:bg-bg-secondary p-5 rounded-2xl border border-border shadow-sm">
            <div className="flex flex-col gap-1 mb-5 border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="text-success" size={18} />
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Saúde do Sistema</h2>
              </div>
              {sysStatus?.uptime && (
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest opacity-60">
                  Uptime: {sysStatus.uptime}
                </p>
              )}
            </div>

            {!sysStatus ? (
              <div className="py-10 text-center text-xs text-text-secondary italic">Dados indisponíveis</div>
            ) : (
              <div className="space-y-5">
                {/* Métricas Principais */}
                <div className="space-y-4">
                  {[
                    { 
                      label: 'CPU', 
                      value: sysStatus.cpu_percent || 0, 
                      color: sysStatus.cpu_percent >= 90 ? 'bg-danger' : sysStatus.cpu_percent >= 70 ? 'bg-warning' : 'bg-success',
                      detail: `${(sysStatus.cpu_percent || 0).toFixed(1)}%`
                    },
                    { 
                      label: 'RAM', 
                      value: sysStatus.ram_percent || 0, 
                      color: sysStatus.ram_percent >= 85 ? 'bg-danger' : sysStatus.ram_percent >= 70 ? 'bg-warning' : 'bg-primary',
                      detail: `${(sysStatus.ram_used_gb || 0).toFixed(1)}GB / ${(sysStatus.ram_total_gb || 0).toFixed(1)}GB`
                    },
                    { 
                      label: 'Disco', 
                      value: sysStatus.disk_percent || 0, 
                      color: sysStatus.disk_percent >= 85 ? 'bg-danger' : sysStatus.disk_percent >= 70 ? 'bg-warning' : 'bg-accent',
                      detail: `${(sysStatus.disk_used_gb || 0).toFixed(0)}GB / ${(sysStatus.disk_used_gb + (sysStatus.disk_free_gb || 0)).toFixed(0)}GB`
                    }
                  ].map(m => (
                    <div key={m.label} className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                        <span className="text-text-secondary">{m.label} {m.value.toFixed(1)}%</span>
                        <span className="text-text-primary">{m.detail}</span>
                      </div>
                      <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden border border-border/10">
                        <div 
                          className={clsx("h-full transition-all duration-1000", m.color)}
                          style={{ width: `${m.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-border/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {Object.entries(sysStatus.services || {}).map(([name, status]: [string, any]) => {
                      const isActive = status === 'active';
                      return (
                        <div key={name} className="flex items-center gap-2">
                          <span className={clsx(
                            "w-1.5 h-1.5 rounded-full",
                            isActive ? "bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-danger shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                          )} />
                          <span className={clsx(
                            "text-[10px] font-bold truncate",
                            isActive ? "text-text-secondary" : "text-danger"
                          )} title={name}>
                            {serviceNames[name] || name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
        </div>

        {showIfaceSelector && (
         <div style={{
           position: 'fixed',
           top: 0, left: 0,
           width: '100%', height: '100%',
           background: 'rgba(0,0,0,0.5)',
           zIndex: 1000,
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           backdropFilter: 'blur(4px)',
         }}>
           <div style={{
             background: isDark ? '#1e2130' : '#ffffff',
             border: `1px solid ${isDark ? '#2a2d3e' : '#e2e8f0'}`,
             borderRadius: 12,
             padding: 24,
             width: 450,
             maxHeight: '85vh',
             display: 'flex',
             flexDirection: 'column',
             boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
           }}>
             <div style={{
               display: 'flex',
               justifyContent: 'space-between',
               alignItems: 'center',
               marginBottom: 20
             }}>
               <h3 className="text-lg font-bold text-text-primary">Selecionar Interfaces</h3>
               <button 
                 onClick={() => setShowIfaceSelector(false)}
                 className="p-2 hover:bg-bg-primary rounded-full transition-colors"
               >
                 ✕
               </button>
             </div>

             <div className="flex gap-2 mb-4">
               <button 
                 onClick={() => {
                   const all = (Array.isArray(interfaces?.interfaces) ? interfaces.interfaces : [])
                    .filter((i: any) => {
                      const n = (i.display_name || i.if_name || '').toLowerCase();
                      return !n.includes('null') && !n.includes('loopback') && !n.includes('virtual') && !n.includes('template');
                    })
                    .map((i: any) => i.display_name || i.if_name);
                   setSelectedIfaces(all);
                 }}
                 className="text-[10px] font-bold uppercase px-3 py-1.5 bg-bg-primary border border-border rounded hover:bg-bg-secondary"
               >
                 Selecionar todas
               </button>
               <button 
                 onClick={() => setSelectedIfaces([])}
                 className="text-[10px] font-bold uppercase px-3 py-1.5 bg-bg-primary border border-border rounded hover:bg-bg-secondary"
               >
                 Limpar
               </button>
             </div>
             
             <div style={{ overflowY: 'auto', flex: 1 }} className="pr-2 custom-scrollbar">
               {(Array.isArray(interfaces?.interfaces) ? interfaces.interfaces : [])
                 .filter((i: any) => {
                   const n = (i.display_name || i.if_name || '').toLowerCase();
                   return !n.includes('null') && !n.includes('loopback') && !n.includes('virtual') && !n.includes('template');
                 })
                 .sort((a: any, b: any) => ((b.in_bps || 0) + (b.out_bps || 0)) - ((a.in_bps || 0) + (a.out_bps || 0)))
                 .map((iface: any) => {
                   const name = iface.display_name || iface.if_name;
                   const isSelected = selectedIfaces.includes(name);
                   return (
                     <label 
                       key={name}
                       style={{
                         display: 'flex',
                         alignItems: 'center',
                         padding: '10px 12px',
                         borderRadius: 8,
                         cursor: 'pointer',
                         marginBottom: 4,
                         background: isSelected ? (isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff') : 'transparent',
                         border: `1px solid ${isSelected ? (isDark ? 'rgba(59, 130, 246, 0.2)' : '#bfdbfe') : 'transparent'}`
                       }}
                       className="hover:bg-bg-primary/50 transition-all"
                     >
                       <input 
                         type="checkbox"
                         checked={isSelected}
                         onChange={() => {
                           setSelectedIfaces(prev =>
                             prev.includes(name)
                               ? prev.filter(n => n !== name)
                               : [...prev, name]
                           );
                         }}
                         className="mr-3 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                       />
                       <div style={{ flex: 1 }}>
                         <div className="text-sm font-bold text-text-primary">{name}</div>
                         <div className="text-[10px] text-text-secondary flex gap-3 mt-0.5">
                           <span>RX: <span className="text-accent font-bold">{fmtBps(iface.in_bps)}</span></span>
                           <span>TX: <span className="text-success font-bold">{fmtBps(iface.out_bps)}</span></span>
                         </div>
                       </div>
                     </label>
                   );
                 })}
             </div>

             <button 
               onClick={() => setShowIfaceSelector(false)}
               className="mt-6 w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
             >
               Aplicar Seleção
             </button>
           </div>
         </div>
        )}

        </div>
        </TooltipProvider>
     );
   }

