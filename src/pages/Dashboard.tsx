import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../contexts/ThemeContext';
import { 
   ResponsiveContainer,
 } from 'recharts';
 import {
   Chart as ChartJS,
   CategoryScale,
   LinearScale,
   PointElement,
   LineElement,
   Title,
   Tooltip as ChartTooltip,
   Legend,
   Filler,
 } from 'chart.js';
 import { Line as ChartLine } from 'react-chartjs-2';
 
 ChartJS.register(
   CategoryScale,
   LinearScale,
   PointElement,
   LineElement,
   Title,
   ChartTooltip,
   Legend,
   Filler
 );
import { 
   Tooltip, TooltipTrigger, TooltipContent, TooltipProvider 
 } from '../components/ui/tooltip';
 import { MitigationTooltip } from '../components/MitigationTooltip';
import { ArrowUp, ArrowDown, Activity, Shield, MoreVertical, BarChart2, LineChart as LineChartIcon, Settings2, Info, ArrowRight, History, Zap, CheckCircle, Clock, Globe, MapPin, Users } from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Skeleton } from '../components/Skeleton';
import Flag from '../components/Flag';

import { clsx } from 'clsx';

const REFETCH_INTERVAL = 30000;
const RX_TOTAL_COLOR = '#3b82f6';
const RX_IFACE_COLORS = ['#93c5fd', '#60a5fa', '#bfdbfe', '#1d4ed8', '#dbeafe'];
const TX_TOTAL_COLOR = '#22c55e';
const TX_IFACE_COLORS = ['#86efac', '#4ade80', '#bbf7d0', '#15803d', '#dcfce7'];
const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
const MAX_POINTS = 300;

const CDN_COLORS: Record<string, string> = {
  'Netflix': '#E50914',
  'Google': '#4285F4',
  'YouTube': '#FF0000',
  'Cloudflare': '#F48120',
  'Akamai': '#009BDE',
  'Amazon': '#FF9900',
  'Meta': '#1877F2',
  'Microsoft': '#00BCF2',
  'Apple': '#555555',
  'Disney': '#113CCF',
  'Fastly': '#FF282D',
  'Steam': '#1b2838',
  'Riot': '#C89B3C',
  'TikTok': '#010101',
};

const CDN_CATEGORY = {
  'Netflix': 'Streaming',
  'Disney': 'Streaming',
  'YouTube': 'Streaming',
  'Google': 'Cloud/Apps',
  'Amazon': 'Cloud/Apps',
  'Microsoft': 'Cloud/Apps',
  'Cloudflare': 'Segurança/CDN',
  'Akamai': 'Segurança/CDN',
  'Fastly': 'Segurança/CDN',
  'Meta': 'Redes Sociais',
  'TikTok': 'Redes Sociais',
  'Steam': 'Gaming',
  'Riot': 'Gaming',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Streaming': '#E50914',
  'Cloud/Apps': '#378ADD',
  'Segurança/CDN': '#F48120',
  'Redes Sociais': '#1877F2',
  'Gaming': '#1b2838',
};

const FlowBadge = () => (
  <span className="text-[10px] font-bold text-text-secondary bg-bg-primary px-1.5 py-0.5 rounded border border-border ml-2 opacity-60">
    IPv4
  </span>
);

const sampleData = (data: any[]) => {

  if (data.length <= MAX_POINTS)
    return data;
  const step = Math.ceil(
    data.length / MAX_POINTS);
  return data.filter(
    (_, i) => i % step === 0);
};


 const serviceNames: Record<string, string> = {
   flow_collector: 'Coletor de Flows',
   detection_engine: 'Mitigador',
   api: 'API FlowGuard',
   flow_database: 'Banco de Flows',
   config_database: 'Banco de Configurações',
   cache: 'Cache',
   bgp_engine: 'BGP Speaker',
   web: 'Proxy Web',
 };

export default function Dashboard() {
   const { t } = useTranslation();
   const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();
  const isAuthenticated = !!localStorage.getItem('access_token');
  const [countdown, setCountdown] = useState(30);
  const [hoveredIP, setHoveredIP] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [today, setToday] = useState('');
  const [yesterday, setYesterday] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const getLocalDateStr = (offset = 0) => {
      const d = new Date();
      if (offset !== 0) d.setDate(d.getDate() + offset);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    setToday(getLocalDateStr());
    setYesterday(getLocalDateStr(-1));
  }, []);

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
  const [selectedMinutes, setSelectedMinutes] = useState(() => {
    const saved = localStorage.getItem('fg_collector_period');
    return saved ? parseInt(saved) : 30;
  });
  const [showIfaceSelector, setShowIfaceSelector] = useState(false);

  const [periodASN, setPeriodASN] = useState(60);
  const [periodCDN, setPeriodCDN] = useState(60);

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

  const cleanOrg = (org: string) => {
    let cleaned = org.replace(/^(AS\d+)\s+/, '$1 · ');
    return cleaned.length > 28
      ? cleaned.substring(0, 25) + '...'
      : cleaned;
  };

   const timeAgo = (dateStr: string) => {
     if (!dateStr) return '—';
     const d = new Date(dateStr.replace(' ', 'T'));
     if (isNaN(d.getTime())) return '—';
     const diff = Date.now() - d.getTime();
     const mins = Math.floor(diff / 60000);
     if (mins < 60) return `há ${mins}min`;
     const hrs = Math.floor(mins / 60);
     if (hrs < 24) return `há ${hrs}h`;
     return d.toLocaleDateString('pt-BR');
   };

   const formatBw = (mbps: number) => {
     if (mbps >= 1000)
       return (mbps/1000).toFixed(1)+' Gbps';
     return mbps + ' Mbps';
   };

   const formatEventTime = (str: string) => {
     if (!str) return '—';
     const parts = str.split(' ');
     const date = parts[0];
     const time = parts[1]?.slice(0,5);
     const [y,m,d] = date.split('-');
     return `${d}/${m} ${time}`;
   };

  const { data: detection, isLoading: statsLoading } = useQuery({
    queryKey: ['detection-stats'],
    queryFn: async () => {
      const r = await api.get('/api/detection/stats');
      return r.data;
    },
    enabled: isAuthenticated,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: asnStats } = useQuery({
    queryKey: ['asns', periodASN],
    queryFn: () => api.get(`/api/flows/asns?minutes=${periodASN}&limit=5`).then(r => r.data),
    enabled: isAuthenticated,
  });

  const { data: cdnStats } = useQuery({
    queryKey: ['cdns-consumption', periodCDN],
    queryFn: () => api.get(`/api/flows/cdns?minutes=${periodCDN}`).then(r => r.data),
    enabled: isAuthenticated,
  });

  const { data: attackCountries } = useQuery({
    queryKey: ['attack-countries'],
    queryFn: () => api.get('/api/flows/attack-countries?minutes=1440&limit=5').then(r => r.data),
    enabled: isAuthenticated,
  });

  const { data: flowsSummary } = useQuery({
    queryKey: ['flows-summary'],
    queryFn: () => api.get('/api/flows/summary').then(r => r.data),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

   const { data: eventsHistory, isLoading: loadingEvents, dataUpdatedAt: eventsUpdatedAt } = useQuery({
     queryKey: ['events-history-dashboard'],
     queryFn: async () => {
       const r = await api.get('/api/events/history?limit=5');
       return r.data;
     },
    enabled: isAuthenticated,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 10000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: activeEventsToday } = useQuery({
    queryKey: ['events-today'],
    queryFn: () => api.get('/api/events/history?limit=1000&minutes=2880').then(r => r.data),
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });

  const { data: collectorDetailedInfo } = useQuery({
    queryKey: ['collector-detail', selectedCollector],
    queryFn: () => api.get(`/api/collectors/${selectedCollector}/interfaces`).then(r => r.data),
    enabled: isAuthenticated && !!selectedCollector,
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
      const r = await api.get('/api/system/status');
      return r.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 10000,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: timeline } = useQuery({
    queryKey: ['timeline'],
    queryFn: async () => {
      const r = await api.get('/api/flows/timeline?minutes=30');
      return r.data;
    },
    enabled: isAuthenticated,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });



  const { data: collectors } = useQuery({
    queryKey: ['collectors'],
    queryFn: () => api.get('/api/collectors').then(r => r.data),
    enabled: isAuthenticated,
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
    enabled: isAuthenticated && !!selectedCollector,
  });

   const [history, setHistory] = useState<Record<string, {time: string, in_bps: number, out_bps: number}[]>>({});
   const [serviceFilter, setServiceFilter] = useState<string | null>(null);

   useEffect(() => {
     localStorage.setItem('fg_collector_period', String(selectedMinutes));
     queryClient.invalidateQueries({
       queryKey: ['iface-history']
     });
   }, [selectedMinutes, selectedIfaces, queryClient]);
 
   const { data: metricsHistory, isLoading: metricsHistoryLoading } = useQuery({
     queryKey: ['iface-history', selectedCollector, selectedMinutes, selectedIfaces],
     queryFn: async () => {
       if (selectedIfaces.length === 0 || !selectedCollector)
         return null;
 
       console.log('Buscando histórico:', selectedCollector, selectedIfaces, selectedMinutes);

      const results = await Promise.all(
        selectedIfaces.map(async ifName => {
          const url = `/api/collectors/${selectedCollector}/metrics/history?minutes=${selectedMinutes}&if_name=${encodeURIComponent(ifName)}`;
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
    enabled: isAuthenticated && selectedIfaces.length > 0 && !!selectedCollector,
    refetchInterval: 60000,
    placeholderData: keepPreviousData,
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
      enabled: isAuthenticated,
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
     enabled: isAuthenticated,
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
        let totalRx = 0;
        let totalTx = 0;
        metricsHistory.forEach(({ifName, data}) => {
          const found = data.find((p: any) => p.time_bucket === time);
           const rxGbps = found ? (found.in_bps / 1e9) : 0;
           const txGbps = found ? (found.out_bps / 1e9) : 0;
           point[`${ifName}_rx`] = rxGbps;
           point[`${ifName}_tx`] = txGbps;
           totalRx += rxGbps;
           totalTx += txGbps;
        });
         point['__total_rx'] = Number(totalRx.toFixed(4));
         point['__total_tx'] = Number(totalTx.toFixed(4));
        return point;
      });

    // Sanitize points to avoid artificial drops to zero
    return fullData.map((p, i, arr) => {
      const sanitized = { ...p };
      Object.keys(p).forEach(key => {
        if (key === 'time' || key === 'display_time') return;
        
        const val = p[key];
        const prev = arr[i-1]?.[key] || 0;
        const next = arr[i+1]?.[key] || 0;
        const avg = (prev + next) / 2;
        
        // Use threshold adapted to Gbps (0.0001 Gbps = 100 Kbps)
        if (val === 0 && avg > 0.0001) {
          sanitized[key] = Number(avg.toFixed(4));
        }
      });
      return sanitized;
    });
  }, [metricsHistory]);

  const chartData = useMemo(() => sampleData(historicalChartData), [historicalChartData]);



   const formatTime = (timeStr: string) => {
     if (!timeStr || timeStr.length < 16) return timeStr;
     if (selectedMinutes >= 1440) {
       const d = new Date(timeStr.replace(' ', 'T'));
       if (isNaN(d.getTime())) return timeStr.substring(11, 16);
       return d.toLocaleDateString('pt-BR', {
         day: '2-digit', month: '2-digit'
       }) + ' ' + timeStr.substring(11, 16);
     }
     return timeStr.substring(11, 16);
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
          label: selectedMinutes + ' minutos'
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
         label: selectedMinutes === 30 ? '30 minutos' :
                selectedMinutes === 60 ? '1 hora' :
                selectedMinutes === 360 ? '6 horas' : 
                selectedMinutes === 720 ? '12 horas' :
                selectedMinutes === 1440 ? '24 horas' : 
                selectedMinutes === 2880 ? '48 horas' : selectedMinutes + ' minutos'
       };
    }, [selectedMinutes, metricsHistory, history, selectedIfaces]);



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

   const blueShades = ['#60a5fa', '#93c5fd', '#bfdbfe', '#3b82f6', '#1d4ed8'];
   const greenShades = ['#4ade80', '#86efac', '#bbf7d0', '#22c55e', '#15803d'];
 
   const datasets = useMemo(() => [
     {
       label: '__total_down',
       data: chartData.map(d => d.__total_rx),
       borderColor: '#1d6fda',
       borderWidth: 2.5,
       fill: true,
       backgroundColor: 'rgba(29,111,218,0.10)',
       pointRadius: 0,
       pointHoverRadius: 0,
       tension: 0.4,
     },
     ...selectedIfaces.map((ifName, idx) => ({
       label: '__iface_down__' + ifName,
       data: chartData.map(d => d[`${ifName}_rx`]),
       borderColor: blueShades[idx % 5],
       borderWidth: 1,
       fill: false,
       pointRadius: 0,
       pointHoverRadius: 0,
       tension: 0.4,
     })),
     {
       label: '__total_up',
       data: chartData.map(d => d.__total_tx),
       borderColor: '#16a34a',
       borderWidth: 2.5,
       fill: true,
       backgroundColor: 'rgba(22,163,74,0.08)',
       pointRadius: 0,
       pointHoverRadius: 0,
       tension: 0.4,
     },
     ...selectedIfaces.map((ifName, idx) => ({
       label: '__iface_up__' + ifName,
       data: chartData.map(d => d[`${ifName}_tx`]),
       borderColor: greenShades[idx % 5],
       borderWidth: 1,
       fill: false,
       pointRadius: 0,
       pointHoverRadius: 0,
       tension: 0.4,
     }))
   ], [chartData, selectedIfaces]);
 
    const chartOptions = useMemo(() => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      animations: { colors: false },
      transitions: {
        active: { animation: { duration: 0 } }
      },
      interaction: {
        mode: 'nearest' as const,
        intersect: false,
        axis: 'xy' as const
      },
     plugins: {
       legend: { display: false },
       tooltip: {
         enabled: false,
         external: function(context: any) {
           const tip = document.getElementById('collector-tooltip');
           if (!tip) return;
           const t = context.tooltip;
 
           if (!t || t.opacity === 0 || !t.dataPoints?.length) {
             tip.style.display = 'none';
             return;
           }
 
           const dp = t.dataPoints[0];
           const ds = dp.dataset;
           const label = ds.label || '';
 
           let name = '';
           let direction = '';
           let color = ds.borderColor;
 
           if (label === '__total_down') {
             name = 'Total Download';
             direction = '▼';
             color = '#1d6fda';
           } else if (label === '__total_up') {
             name = 'Total Upload';
             direction = '▲';
             color = '#16a34a';
           } else if (label.startsWith('__iface_down__')) {
             name = label.replace('__iface_down__', '');
             direction = '▼';
           } else if (label.startsWith('__iface_up__')) {
             name = label.replace('__iface_up__', '');
             direction = '▲';
           }
 
           const numVal = dp.parsed.y;
           let formatted = '';
           if (numVal >= 1) {
             formatted = numVal.toFixed(2) + ' Gbps';
           } else {
             formatted = (numVal * 1000).toFixed(0) + ' Mbps';
           }
 
           tip.innerHTML = `
             <div style="font-size:10px; color:var(--color-text-secondary); margin-bottom:4px;">
               ${t.title?.[0] || ''}
             </div>
             <div style="color:${color}; font-weight:500;">
               ${name}
             </div>
             <div style="color:${color}; font-size:14px; font-weight:500;">
               ${direction} ${formatted}
             </div>
           `;
 
           tip.style.display = 'block';
 
           const canvas = context.chart.canvas;
           let left = t.caretX + 14;
           if (left + 170 > canvas.offsetWidth)
             left = t.caretX - 180;
           let top = t.caretY - 30;
           if (top < 0) top = 4;
           tip.style.left = left + 'px';
           tip.style.top = top + 'px';
         }
       }
     },
     scales: {
       x: {
         grid: { display: false },
         ticks: {
           maxRotation: 0,
           autoSkip: true,
           maxTicksLimit: 8,
           color: isDark ? '#94A3B8' : '#64748B',
           font: { size: 10, weight: '600' }
         }
       },
       y: {
         grid: {
           color: isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.6)',
           drawTicks: false
         },
         ticks: {
           color: isDark ? '#94A3B8' : '#64748B',
           font: { size: 10, weight: '600' },
           callback: (val: any) => {
             if (val >= 1) return val.toFixed(1) + ' G';
             return (val * 1000).toFixed(0) + ' M';
           }
         }
       }
     }
   }), [isDark]);
 
   const chartLabels = useMemo(() => chartData.map(d => formatTime(d.time)), [chartData]);
 
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

  const activeCollectors = (Array.isArray(collectors) ? collectors : (collectors?.items || collectors?.data || []))
    .filter((c: any) => c.active || c.status === 'active' || c.status === 'Ativo');

  const anomaliasHoje = activeEventsToday?.items?.filter((i: any) => 
    typeof i?.started_at === 'string' && i.started_at.substring(0, 10) === today
  ) || [];

  const anomaliasOntem = activeEventsToday?.items?.filter((i: any) => 
    typeof i?.started_at === 'string' && i.started_at.substring(0, 10) === yesterday
  ) || [];

  const cards = [
    {
      id: 'download',
      label: 'Download',
      value: detection?.incoming_mbps !== undefined ? formatBw(detection.incoming_mbps) : '0 Mbps',
      detail: detection?.incoming_pps ? `PPS: ${detection.incoming_pps.toLocaleString()}` : 'PPS: 0',
      icon: <ArrowDown className="text-blue-500" size={16} />
    },
    {
      id: 'upload',
      label: 'Upload',
      value: detection?.outgoing_mbps !== undefined ? formatBw(detection.outgoing_mbps) : '0 Mbps',
      detail: detection?.outgoing_pps ? `PPS: ${detection.outgoing_pps.toLocaleString()}` : 'PPS: 0',
      icon: <ArrowUp className="text-green-500" size={16} />
    },
    {
      id: 'flows',
      label: 'Flows/min',
      value: flowsSummary?.total_flows ? (flowsSummary.total_flows / 1000).toFixed(1) + 'M' : '0',
      detail: 'Lag: 0s · Tailer: ativo',
      icon: <Activity className="text-warning" size={16} />
    },
    {
      id: 'collectors',
      label: 'Coletores',
      value: activeCollectors.length,
      detail: activeCollectors.length === 1 
        ? `${activeCollectors[0].name} · ${activeCollectors[0].host} · ${collectorDetailedInfo?.length || 0} interfaces`
        : `${activeCollectors.length} coletores ativos`,
      icon: <Zap className="text-primary" size={16} />
    },
    {
      id: 'attacks',
      label: 'ANOMALIAS HOJE',
      value: anomaliasHoje.length,
      detail: anomaliasHoje[0] 
        ? `Último: ${anomaliasHoje[0].ip} às ${anomaliasHoje[0].started_at.substring(11, 16)}`
        : "Nenhuma anomalia hoje",
      icon: <Shield className="text-danger" size={16} />
    },
    {
      id: 'blackhole',
      label: 'Blackhole',
      value: activeMitigations?.total || 0,
      detail: activeMitigations?.total > 0
        ? activeMitigations.items.slice(0, 3).map((i: any) => `${i.ip} · ${i.pps.toLocaleString()} pps`).join(' | ')
        : 'Nenhum IP em blackhole',
      icon: <Activity className="text-accent" size={16} />
    }
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(2px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* SEÇÃO 1 — Cards em linha única */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {cards.map((card) => {
            const isHovered = hoveredCard === card.id;
            return (
              <div
                key={card.id}
                onMouseEnter={() => setHoveredCard(card.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={clsx(
                  "relative overflow-hidden flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300 cursor-default min-h-[120px]",
                  "bg-white dark:bg-bg-secondary border-border/40 shadow-[0_2px_10px_rgba(0,0,0,0.02)]",
                  "hover:-translate-y-1.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] hover:border-primary/30"
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest opacity-60 flex items-center">
                      {card.label}
                      {(card.id === 'download' || card.id === 'upload' || card.id === 'flows' || card.id === 'blackhole') && <FlowBadge />}
                    </span>
                    <div className="text-2xl font-bold text-text-primary tracking-tight mt-1">
                      {card.value}
                    </div>
                  </div>
                  <div className={clsx(
                    "p-2.5 rounded-xl bg-bg-primary/50 border border-border/30 transition-all duration-300",
                    isHovered && "scale-110 bg-bg-primary border-primary/20 shadow-sm"
                  )}>
                    {card.icon}
                  </div>
                </div>
                
                <div className={clsx(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  isHovered ? "max-h-12 opacity-100 mt-4" : "max-h-0 opacity-0 mt-0"
                )}>
                  <div className="text-[10px] text-text-secondary pt-3 border-t border-border/20 whitespace-nowrap overflow-hidden text-ellipsis italic">
                    {card.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>



      {/* Main Chart: Tráfego da Interface - Refined Light Theme Visuals */}
      <div className="bg-white dark:bg-bg-secondary p-6 rounded-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none transition-all">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4 border-b border-border/50 pb-5">
          <h2 className="text-lg font-bold text-text-primary">Tráfego do Coletor</h2>

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
               {[
                 { label: '30M', mins: 30 },
                 { label: '1H', mins: 60 },
                 { label: '6H', mins: 360 },
                 { label: '12H', mins: 720 },
                 { label: '24H', mins: 1440 },
                 { label: '48H', mins: 2880 }
               ].map((p) => (
                 <button
                   key={p.label}
                   onClick={() => setSelectedMinutes(p.mins)}
                   className={clsx(
                     "px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all whitespace-nowrap",
                     selectedMinutes === p.mins 
                       ? "bg-white dark:bg-[#2a2d3e] text-accent shadow-sm" 
                       : "text-text-secondary hover:text-text-primary"
                   )}
                 >
                   {p.label}
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
          </span>
        </div>

         <div className="space-y-4 bg-[#F8FAFC] dark:bg-[#0f172a]/40 p-4 rounded-xl border border-border/50 relative flex flex-col items-center justify-center min-h-[400px]">
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
            <div className="w-full h-[400px] relative">
              <div id="collector-tooltip" style={{
                display: 'none',
                position: 'absolute',
                background: 'var(--color-background-primary)',
                border: '0.5px solid var(--color-border-secondary)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                pointerEvents: 'none',
                zIndex: 10,
                minWidth: '140px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}></div>
              <ChartLine
                data={{
                  labels: chartLabels,
                  datasets: datasets
                }}
                options={chartOptions as any}
              />
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



        {/* SEÇÃO 3 — O que consome a rede */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* TOP ASNs */}
          <div className="bg-bg-secondary p-5 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="text-primary" size={18} />
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Top ASNs</h2>
                <FlowBadge />
              </div>
              <div className="flex bg-bg-primary p-0.5 rounded-lg border border-border">
                {[30, 60, 360, 1440].map((m) => (
                  <button
                    key={m}
                    onClick={() => setPeriodASN(m)}
                    className={clsx(
                      "px-2 py-1 text-[9px] font-bold rounded",
                      periodASN === m ? "bg-white dark:bg-bg-secondary text-primary shadow-sm" : "text-text-secondary"
                    )}
                  >
                    {m >= 60 ? `${m/60}h` : `${m}m`}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {asnStats?.items?.slice(0, 5).map((item: any, i: number) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-text-primary">{cleanOrg(item.org)}</span>
                    <span className="text-text-secondary">{formatBpsRaw(item.bytes)} · {item.percent}%</span>
                  </div>
                  <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden border border-border/10">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
              {(!asnStats?.items || asnStats.items.length === 0) && (
                <div className="py-4 text-center text-xs text-text-secondary italic">Nenhum dado disponível</div>
              )}
            </div>
          </div>

          {/* TOP CDNs */}
          <div className="bg-bg-secondary p-5 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe className="text-accent" size={18} />
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Top CDNs</h2>
                <FlowBadge />
              </div>
              <div className="flex bg-bg-primary p-0.5 rounded-lg border border-border">
                {[30, 60, 360, 1440].map((m) => (
                  <button
                    key={m}
                    onClick={() => setPeriodCDN(m)}
                    className={clsx(
                      "px-2 py-1 text-[9px] font-bold rounded",
                      periodCDN === m ? "bg-white dark:bg-bg-secondary text-accent shadow-sm" : "text-text-secondary"
                    )}
                  >
                    {m >= 60 ? `${m/60}h` : `${m}m`}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {cdnStats?.items?.slice(0, 5).map((item: any, i: number) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-text-primary">{item.cdn}</span>
                    <span className="text-text-secondary">{formatBpsRaw(item.bytes)} · {item.percent}%</span>
                  </div>
                  <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden border border-border/10">
                    <div 
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${item.percent}%`,
                        backgroundColor: CDN_COLORS[item.cdn] || '#8892a4'
                      }}
                    />
                  </div>
                </div>
              ))}
               {(!cdnStats?.items || cdnStats.items.length === 0) && (
                <div className="py-4 text-center text-xs text-text-secondary italic">Nenhum dado disponível</div>
              )}
            </div>
          </div>
        </div>

        {/* SEÇÃO 4 — Segurança */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ÚLTIMAS ANOMALIAS */}
          <div className="bg-bg-secondary p-5 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="text-danger" size={18} />
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Últimas Anomalias</h2>
              <FlowBadge />
            </div>
            <div className="space-y-3">
              {eventsHistory?.items?.slice(0, 5).map((event: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-bg-primary/50 rounded-lg border border-border/50 hover:border-primary/30 transition-all group cursor-default">
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      "w-2 h-2 rounded-full",
                      event.status === 'active' ? "bg-danger animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-text-secondary/30"
                    )} />
                    <div>
                       <div className="text-xs font-mono font-bold text-text-primary">{event.ip}</div>
                       <div className="text-[10px] text-text-secondary font-medium uppercase tracking-tighter opacity-70">
                         {formatEventTime(event.started_at)} · {event.peak_pps ? `${(event.peak_pps/1000).toFixed(1)}k pps` : ''} 
                         {event.peak_mbps ? ` · ${event.peak_mbps} Mbps` : ''}
                       </div>
                     </div>
                   </div>
                   <div className="flex flex-col items-end gap-1">
                      <span className={clsx(
                        "text-[9px] font-black px-1.5 py-0.5 rounded border",
                        event.status === 'active' ? "bg-danger/10 text-danger border-danger/20" : "bg-bg-primary text-text-secondary border-border"
                      )}>
                        {event.status === 'active' ? 'ACTIVE' : 'REMOVED'}
                      </span>
                      <div className="hidden group-hover:block text-[9px] text-text-secondary animate-in fade-in slide-in-from-right-1">
                        {fmtDuration(event.duration_seconds)} · {event.direction === 'incoming' ? 'Download' : 'Upload'}
                      </div>
                   </div>
                 </div>
               ))}
                {(!eventsHistory?.items || eventsHistory.items.length === 0) && (
                 <div className="py-8 text-center text-xs text-text-secondary italic">Histórico limpo</div>
               )}
               <button
                 onClick={() => navigate({ to: '/mitigation/events' })}
                 style={{
                   width: '100%',
                   marginTop: 12,
                   padding: '6px',
                   fontSize: 12,
                   background: 'transparent',
                   border: '0.5px solid var(--color-border-tertiary)',
                   borderRadius: 'var(--border-radius-md)',
                   cursor: 'pointer',
                   color: 'var(--color-text-secondary)'
                 }}>
                 Ver todos os eventos →
               </button>
             </div>
          </div>

          {/* PAÍSES COM MAIOR TRÁFEGO */}
          <div className="bg-bg-secondary p-5 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="text-primary" size={18} />
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Países com maior tráfego</h2>
              <FlowBadge />
            </div>
            <div className="space-y-4">
              {attackCountries?.items?.slice(0, 5).map((item: any, i: number) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Flag code={item.country} size={16} />
                      <span className="text-text-primary">{item.country_name || item.country}</span>
                    </div>
                    <span className="text-text-secondary">{item.percent}%</span>
                  </div>
                  <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden border border-border/10">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-1000"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
               {(!attackCountries?.items || attackCountries.items.length === 0) && (
                <div className="py-4 text-center text-xs text-text-secondary italic">Nenhum dado disponível</div>
              )}
            </div>
          </div>
        </div>

        {/* SEÇÃO 5 — Saúde do sistema */}
        <div className="bg-bg-secondary p-4 rounded-2xl border border-border shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Linha 1: Recursos */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'CPU', value: sysStatus?.cpu_percent || 0, unit: '%' },
                { label: 'RAM', value: sysStatus?.ram_percent || 0, unit: '%' },
                { label: 'Disco', value: sysStatus?.disk_percent || 0, unit: '%' },
              ].map((item) => (
                <div key={item.label} className="bg-bg-primary/40 p-2 rounded-lg border border-border/40">
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest opacity-60 mb-1">{item.label}</div>
                  <div className={clsx("text-xs font-black", item.value > 80 ? "text-danger" : "text-text-primary")}>
                    {item.value.toFixed(item.label === 'Disco' ? 0 : 1)}{item.unit}
                  </div>
                  <div className="h-1 bg-bg-primary rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${item.value}%`,
                        backgroundColor: item.value > 80 ? '#E24B4A' : item.value > 60 ? '#EF9F27' : '#1D9E75'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Linha 2: Status */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-bg-primary/40 p-2 rounded-lg border border-border/40 flex flex-col justify-center">
                <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest opacity-60 mb-1">Uptime</div>
                <div className="text-xs font-black text-text-primary truncate">{sysStatus?.uptime || '—'}</div>
              </div>
              <div className="bg-bg-primary/40 p-2 rounded-lg border border-border/40 flex flex-col justify-center">
                <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest opacity-60 mb-1">BGP</div>
                <div>
                  <span className={clsx(
                    "text-[9px] font-black px-1.5 py-0.5 rounded border",
                    sysStatus?.services?.bgp_engine === 'active' ? "bg-success/10 text-success border-success/20" : "bg-danger/10 text-danger border-danger/20"
                  )}>
                    {sysStatus?.services?.bgp_engine === 'active' ? 'OK' : 'OFFLINE'}
                  </span>
                </div>
              </div>
              <div className="bg-bg-primary/40 p-2 rounded-lg border border-border/40 flex flex-col justify-center">
                <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest opacity-60 mb-1">Detector</div>
                <div>
                  <span className={clsx(
                    "text-[9px] font-black px-1.5 py-0.5 rounded border",
                    sysStatus?.services?.detection_engine === 'active' ? "bg-success/10 text-success border-success/20" : "bg-danger/10 text-danger border-danger/20"
                  )}>
                    {sysStatus?.services?.detection_engine === 'active' ? 'OK' : 'OFFLINE'}
                  </span>
                </div>
              </div>
            </div>
          </div>
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
                  onClick={() => {
                    setSelectedIfaces([]);
                    localStorage.setItem('fg_ifaces', JSON.stringify([]));
                  }}
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

