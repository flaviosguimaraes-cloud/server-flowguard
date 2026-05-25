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
import { ArrowUp, ArrowDown, Activity, Shield, MoreVertical, BarChart2, LineChart as LineChartIcon, Settings2, Info, ArrowRight, History, Zap, CheckCircle, Clock, Globe, MapPin, Users, RefreshCw } from 'lucide-react';
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

  const [selectedIfaces, setSelectedIfaces] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('fg_iface_indexes');
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
  const [roleFilter, setRoleFilter] = useState<'all' | 'upstream' | 'access' | 'internal'>('all');


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
    queryFn: () => api.get(`/api/snmp/${selectedCollector}/interfaces`).then(r => r.data),
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
    queryKey: ['interfaces-summary', selectedCollector],
    queryFn: async () => {
      if (!selectedCollector) return null;
      const r = await api.get(`/api/snmp/${selectedCollector}/interfaces/summary`);
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

      const ifIndexes = selectedIfaces.join(',');
      const url = `/api/snmp/${selectedCollector}/metrics/history?minutes=${selectedMinutes}&if_indexes=${ifIndexes}`;
      const r = await api.get(url);
      return r.data;
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
    localStorage.setItem('fg_iface_indexes', JSON.stringify(selectedIfaces));
  }, [selectedIfaces]);

  useEffect(() => {
    if (selectedIfaces.length === 0 && interfaces) {
      const list = Array.isArray(interfaces) ? interfaces : (interfaces?.interfaces || []);
      const upstreams = list
        .filter((i: any) => i.role === 'upstream' || i.is_upstream)
        .map((i: any) => i.if_index);
      if (upstreams.length > 0) {
        setSelectedIfaces(upstreams);
      }
    }
  }, [interfaces, selectedIfaces.length]);


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
      const list = Array.isArray(interfaces) ? interfaces : (interfaces?.interfaces || []);
      return list.filter((i: any) => selectedIfaces.includes(i.if_index));
    }, [interfaces, selectedIfaces]);

    const timePoints = useMemo(() => {
      const historyArr = metricsHistory?.history || [];
      const allTimes = new Set<string>();
      historyArr.forEach((p: any) => allTimes.add(p.time_bucket));
      return Array.from(allTimes).sort();
    }, [metricsHistory]);

     const ifaceMap = useMemo(() => {
       const map: Record<number, string> = {};
       const list = Array.isArray(interfaces) ? interfaces : (interfaces?.interfaces || []);
       list.forEach((i: any) => {
          map[i.if_index] = i.if_alias || i.display_name || i.if_name;
       });
       return map;
     }, [interfaces]);
 
  const historicalChartData = useMemo(() => {
    const historyArr = metricsHistory?.history || [];
    if (historyArr.length === 0) return [];

    // Coletar todos os timestamps únicos
    const allTimes = new Set<string>();
    historyArr.forEach((p: any) => allTimes.add(p.time_bucket));

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
        
        selectedIfaces.forEach(ifIndex => {
          const found = historyArr.find((p: any) => p.time_bucket === time && p.if_index === ifIndex);
           const rxMbps = found ? (found.in_bps / 1e6) : 0;
           const txMbps = found ? (found.out_bps / 1e6) : 0;
           point[`${ifIndex}_rx`] = rxMbps;
           point[`${ifIndex}_tx`] = txMbps;
           totalRx += rxMbps;
           totalTx += txMbps;
        });
         point['__total_rx'] = Number(totalRx.toFixed(2));
         point['__total_tx'] = Number(totalTx.toFixed(2));
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
        
        if (val === 0 && avg > 0.1) { // 0.1 Mbps = 100 Kbps
          sanitized[key] = Number(avg.toFixed(2));
        }
      });
      return sanitized;
    });
  }, [metricsHistory, selectedIfaces]);


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

      const historyArr = metricsHistory?.history || [];
      if (historyArr.length === 0) {
        return {
           rx: getStats([]),
           tx: getStats([]),
           label: selectedMinutes + ' minutos'
         };
      }

      const timeMap: Record<string, { rx: number, tx: number }> = {};
      historyArr.forEach((p: any) => {
        const t = p.time_bucket;
        if (!timeMap[t]) timeMap[t] = { rx: 0, tx: 0 };
        timeMap[t].rx += p.in_bps || 0;
        timeMap[t].tx += p.out_bps || 0;
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
     }, [selectedMinutes, metricsHistory]);




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
     ...selectedIfaces.map((ifIndex, idx) => ({
       label: '__iface_down__' + (ifaceMap[ifIndex] || ifIndex),
       data: chartData.map(d => d[`${ifIndex}_rx`]),
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
     ...selectedIfaces.map((ifIndex, idx) => ({
       label: '__iface_up__' + (ifaceMap[ifIndex] || ifIndex),
       data: chartData.map(d => d[`${ifIndex}_tx`]),
       borderColor: greenShades[idx % 5],
       borderWidth: 1,
       fill: false,
       pointRadius: 0,
       pointHoverRadius: 0,
       tension: 0.4,
     }))
   ], [chartData, selectedIfaces, ifaceMap]);
 
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
             name = label.replace('__iface_down__', '') + ' - Download';
             direction = '▼';
           } else if (label.startsWith('__iface_up__')) {
             name = label.replace('__iface_up__', '') + ' - Upload';
             direction = '▲';
           }
 
           const numVal = dp.parsed.y; // numVal is in Mbps
           let formatted = '';
           if (numVal >= 1000) {
             formatted = (numVal / 1000).toFixed(2) + ' Gbps';
           } else {
             formatted = numVal.toFixed(1) + ' Mbps';
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
      detail: detection?.incoming_pps ? `${(detection.incoming_pps / 1000).toFixed(1)}k PPS` : '0 PPS',
      icon: <ArrowDown size={18} />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      id: 'upload',
      label: 'Upload',
      value: detection?.outgoing_mbps !== undefined ? formatBw(detection.outgoing_mbps) : '0 Mbps',
      detail: detection?.outgoing_pps ? `${(detection.outgoing_pps / 1000).toFixed(1)}k PPS` : '0 PPS',
      icon: <ArrowUp size={18} />,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      id: 'flows',
      label: 'Flows p/ min',
      value: flowsSummary?.total_flows ? (flowsSummary.total_flows / 1000).toFixed(1) + 'M' : '0',
      detail: 'Tailer: Ativo',
      icon: <Activity size={18} />,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    {
      id: 'collectors',
      label: 'Coletores',
      value: activeCollectors.length,
      detail: activeCollectors.length === 1 
        ? `${activeCollectors[0].host}`
        : `${activeCollectors.length} ativos`,
      icon: <Zap size={18} />,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      id: 'attacks',
      label: 'Anomalias (24h)',
      value: anomaliasHoje.length,
      detail: anomaliasHoje[0] 
        ? `Último: ${anomaliasHoje[0].ip}`
        : "Nenhuma hoje",
      icon: <Shield size={18} />,
      color: 'text-danger',
      bgColor: 'bg-danger/10'
    },
    {
      id: 'blackhole',
      label: 'Blackhole',
      value: activeMitigations?.total || 0,
      detail: activeMitigations?.total > 0
        ? `${activeMitigations.total} ativos`
        : 'Nenhum ativo',
      icon: <Activity size={18} />,
      color: 'text-purple',
      bgColor: 'bg-purple/10'
    }
  ];

  return (
    <TooltipProvider>
      <div className="page-container animate-in fade-in duration-500 pb-10">
        {/* SEÇÃO 1 — Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className="metric-card group"
            >
              <div className="flex justify-between items-start">
                <div className={clsx(
                  "p-2 rounded-lg transition-colors",
                  card.bgColor
                )}>
                  <span className={card.color}>{card.icon}</span>
                </div>
                <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest opacity-50">
                  {card.label}
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-text-primary tracking-tight">
                  {card.value}
                </div>
                <div className="text-[10px] text-text-secondary font-medium mt-1 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-border" />
                  {card.detail}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* SEÇÃO 2 — Tráfego do Coletor */}
        <div className="card p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-lg font-bold text-text-primary tracking-tight">Análise de Tráfego</h2>
              <p className="text-xs text-text-secondary mt-0.5">Métricas em tempo real por interface e coletor</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowIfaceSelector(true)}
                className="secondary-button !py-1.5 !px-3 !text-[11px]"
              >
                <Settings2 size={14} />
                Interfaces ({selectedIfaces.length})
              </button>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-primary rounded-lg border border-border">
                <select 
                  value={selectedCollector || ''} 
                  onChange={(e) => setSelectedCollector(Number(e.target.value))}
                  className="bg-transparent text-[11px] font-bold text-text-primary focus:outline-none cursor-pointer appearance-none pr-4 relative"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '10px' }}
                >
                  {(Array.isArray(collectors) ? collectors : (collectors?.items || collectors?.data || [])).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.host})</option>
                  ))}
                </select>
              </div>

              <div className="flex bg-bg-primary p-1 rounded-lg border border-border">
                {[
                  { label: '30M', mins: 30 },
                  { label: '1H', mins: 60 },
                  { label: '6H', mins: 360 },
                  { label: '24H', mins: 1440 }
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setSelectedMinutes(p.mins)}
                    className={clsx(
                      "px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all",
                      selectedMinutes === p.mins 
                        ? "bg-bg-secondary text-primary shadow-sm border border-border/50" 
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
                className="secondary-button !p-2"
                title="Sincronizar"
              >
                <RefreshCw size={14} className={clsx(countdown === 30 && "animate-spin")} />
              </button>
            </div>
          </div>

          <div className="bg-bg-primary/30 p-4 rounded-xl border border-border/50 relative min-h-[400px]">
            {metricsHistoryLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest animate-pulse">Sincronizando dados...</span>
              </div>
            ) : chartData.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-secondary opacity-40">
                <History size={40} strokeWidth={1} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Sem telemetria no período</span>
              </div>
            ) : (
              <div className="w-full h-[400px]">
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

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['rx', 'tx'] as const).map(dir => (
              <div key={dir} className="bg-bg-primary/40 p-3 rounded-lg border border-border/60">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-3 opacity-60">
                  <div className={clsx("w-1.5 h-1.5 rounded-full", dir === 'rx' ? "bg-blue-500" : "bg-green-500")} />
                  Resumo {dir === 'rx' ? 'Download' : 'Upload'}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Atual', key: 'last' },
                    { label: 'Mín', key: 'min' },
                    { label: 'Méd', key: 'avg' },
                    { label: 'Máx', key: 'max' }
                  ].map(m => (
                    <div key={m.key}>
                      <p className="text-[9px] text-text-secondary uppercase font-bold opacity-50 mb-1">{m.label}</p>
                      <p className="text-xs font-bold text-text-primary tabular-nums">
                        {formatBpsRaw(periodStats[dir][m.key as keyof typeof periodStats['rx']])}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>



        {/* SEÇÃO 3 — O que consome a rede */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* TOP ASNs */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
                  <Users size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Top ASNs</h2>
                  <p className="text-[10px] text-text-secondary font-medium">Tráfego por Sistema Autônomo</p>
                </div>
              </div>
              <div className="flex bg-bg-primary p-1 rounded-lg border border-border">
                {[30, 60, 360, 1440].map((m) => (
                  <button
                    key={m}
                    onClick={() => setPeriodASN(m)}
                    className={clsx(
                      "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all",
                      periodASN === m ? "bg-bg-secondary text-primary shadow-sm border border-border/50" : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {m >= 60 ? `${m/60}h` : `${m}m`}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-5">
              {asnStats?.items?.slice(0, 5).map((item: any, i: number) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-text-primary truncate max-w-[70%]">{cleanOrg(item.org)}</span>
                    <span className="text-text-secondary tabular-nums">{formatBpsRaw(item.bytes)} · {item.percent}%</span>
                  </div>
                  <div className="h-2 bg-bg-primary rounded-full overflow-hidden border border-border/10">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
              {(!asnStats?.items || asnStats.items.length === 0) && (
                <div className="py-10 text-center flex flex-col items-center gap-2 text-text-secondary opacity-40">
                  <Users size={24} strokeWidth={1} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Aguardando dados de ASNs</span>
                </div>
              )}
            </div>
          </div>

          {/* TOP CDNs */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-accent/10 rounded-lg text-accent">
                  <Globe size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Top Conteúdo</h2>
                  <p className="text-[10px] text-text-secondary font-medium">Tráfego por CDNs e Serviços</p>
                </div>
              </div>
              <div className="flex bg-bg-primary p-1 rounded-lg border border-border">
                {[30, 60, 360, 1440].map((m) => (
                  <button
                    key={m}
                    onClick={() => setPeriodCDN(m)}
                    className={clsx(
                      "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all",
                      periodCDN === m ? "bg-bg-secondary text-accent shadow-sm border border-border/50" : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {m >= 60 ? `${m/60}h` : `${m}m`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              {cdnStats?.items?.slice(0, 5).map((item: any, i: number) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-text-primary">{item.cdn}</span>
                    <span className="text-text-secondary tabular-nums">{formatBpsRaw(item.bytes)} · {item.percent}%</span>
                  </div>
                  <div className="h-2 bg-bg-primary rounded-full overflow-hidden border border-border/10">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(var(--accent-rgb),0.3)]"
                      style={{ 
                        width: `${item.percent}%`,
                        backgroundColor: CDN_COLORS[item.cdn] || '#8892a4'
                      }}
                    />
                  </div>
                </div>
              ))}
               {(!cdnStats?.items || cdnStats.items.length === 0) && (
                <div className="py-10 text-center flex flex-col items-center gap-2 text-text-secondary opacity-40">
                  <Globe size={24} strokeWidth={1} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Aguardando dados de CDNs</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SEÇÃO 4 — Segurança e Tráfego Global */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ÚLTIMAS ANOMALIAS */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-danger/10 rounded-lg text-danger">
                  <Shield size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Últimas Anomalias</h2>
                  <p className="text-[10px] text-text-secondary font-medium">Eventos de segurança detectados</p>
                </div>
              </div>
              <button
                onClick={() => navigate({ to: '/mitigation/events' })}
                className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest"
              >
                Ver Histórico
              </button>
            </div>

            <div className="space-y-3">
              {eventsHistory?.items?.slice(0, 5).map((event: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-bg-primary/40 rounded-xl border border-border/50 hover:border-primary/30 transition-all group cursor-pointer" onClick={() => navigate({ to: '/mitigation/events' })}>
                  <div className="flex items-center gap-4">
                    <div className={clsx(
                      "w-2.5 h-2.5 rounded-full",
                      event.status === 'active' ? "bg-danger animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-text-secondary/20"
                    )} />
                    <div>
                       <div className="text-sm font-bold text-text-primary tabular-nums">{event.ip}</div>
                       <div className="text-[10px] text-text-secondary font-bold uppercase tracking-tight opacity-60 flex items-center gap-1.5 mt-0.5">
                         {formatEventTime(event.started_at)} 
                         <span className="w-1 h-1 rounded-full bg-border" />
                         {event.peak_pps ? `${(event.peak_pps/1000).toFixed(1)}k PPS` : ''} 
                         {event.peak_mbps ? ` · ${event.peak_mbps} Mbps` : ''}
                       </div>
                     </div>
                   </div>
                   <div className="flex flex-col items-end gap-1.5">
                      <span className={clsx(
                        "text-[9px] font-black px-2 py-0.5 rounded-full border",
                        event.status === 'active' ? "bg-danger/10 text-danger border-danger/20" : "bg-bg-primary text-text-secondary border-border"
                      )}>
                        {event.status === 'active' ? 'BLOQUEADO' : 'LIMPO'}
                      </span>
                      <div className="text-[9px] font-bold text-text-secondary/50 uppercase tracking-tighter">
                        {fmtDuration(event.duration_seconds)} · {event.direction === 'incoming' ? 'Entrada' : 'Saída'}
                      </div>
                   </div>
                 </div>
               ))}
                {(!eventsHistory?.items || eventsHistory.items.length === 0) && (
                 <div className="py-12 text-center flex flex-col items-center gap-2 text-text-secondary opacity-30">
                   <CheckCircle size={32} strokeWidth={1} />
                   <span className="text-[10px] font-bold uppercase tracking-widest">Nenhuma ameaça ativa</span>
                 </div>
               )}
             </div>
          </div>

          {/* PAÍSES COM MAIOR TRÁFEGO */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                  <MapPin size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Origem de Tráfego</h2>
                  <p className="text-[10px] text-text-secondary font-medium">Distribuição geográfica global</p>
                </div>
              </div>
              <div className="p-1 bg-bg-primary rounded-lg border border-border text-[9px] font-bold text-text-secondary uppercase px-2">
                Últimas 24h
              </div>
            </div>

            <div className="space-y-5">
              {attackCountries?.items?.slice(0, 5).map((item: any, i: number) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold">
                    <div className="flex items-center gap-2">
                      <Flag code={item.country} size={16} className="rounded-sm" />
                      <span className="text-text-primary">{item.country_name || item.country}</span>
                    </div>
                    <span className="text-text-secondary tabular-nums">{item.percent}%</span>
                  </div>
                  <div className="h-2 bg-bg-primary rounded-full overflow-hidden border border-border/10">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
               {(!attackCountries?.items || attackCountries.items.length === 0) && (
                <div className="py-10 text-center flex flex-col items-center gap-2 text-text-secondary opacity-40">
                  <MapPin size={24} strokeWidth={1} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Aguardando dados geográficos</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SEÇÃO 5 — Saúde do sistema */}
        <div className="card p-5 bg-bg-secondary/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Status dos Serviços */}
            <div className="lg:col-span-1 space-y-3">
              <div className="text-[10px] font-black text-text-secondary uppercase tracking-widest opacity-50 mb-4">Serviços do Núcleo</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Detecção', status: sysStatus?.services?.detection_engine },
                  { label: 'API', status: sysStatus?.services?.api },
                  { label: 'BGP', status: sysStatus?.services?.bgp_engine },
                  { label: 'DB', status: sysStatus?.services?.flow_database },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2 p-2 bg-bg-primary/50 rounded-lg border border-border/50">
                    <div className={clsx(
                      "w-2 h-2 rounded-full",
                      s.status === 'active' ? "bg-success shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-danger shadow-[0_0_6px_rgba(239,68,68,0.5)]"
                    )} />
                    <span className="text-[10px] font-bold text-text-primary uppercase">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recursos Hardware */}
            <div className="lg:col-span-3 grid grid-cols-3 gap-4">
              {[
                { label: 'CPU Load', value: sysStatus?.cpu_percent || 0, color: 'primary' },
                { label: 'RAM Usage', value: sysStatus?.ram_percent || 0, color: 'primary' },
                { label: 'Storage', value: sysStatus?.disk_percent || 0, color: 'primary' },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest opacity-50">{item.label}</span>
                    <span className={clsx("text-xs font-black tabular-nums", item.value > 85 ? "text-danger" : "text-text-primary")}>
                      {item.value.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden border border-border/10">
                    <div 
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${item.value}%`,
                        backgroundColor: item.value > 85 ? '#EF4444' : item.value > 70 ? '#F59E0B' : '#2563EB'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Interface Selector Modal */}
        {showIfaceSelector && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
              onClick={() => setShowIfaceSelector(false)}
            />
            <div className="card w-full max-w-lg max-h-[85vh] flex flex-col z-10 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h3 className="text-lg font-bold text-text-primary tracking-tight">Telemetria SNMP</h3>
                <button 
                  onClick={() => setShowIfaceSelector(false)}
                  className="header-action !p-1.5"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-4 overflow-hidden">
                <div className="flex bg-bg-primary p-1 rounded-lg border border-border">
                  {(['all', 'upstream', 'access', 'internal'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRoleFilter(r)}
                      className={clsx(
                        "flex-1 py-1.5 text-[10px] font-bold uppercase rounded transition-all",
                        roleFilter === r 
                          ? "bg-bg-secondary text-primary shadow-sm border border-border/50" 
                          : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      {r === 'all' ? 'Todas' : r === 'upstream' ? 'Upstream' : r === 'access' ? 'Access' : 'Internal'}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const list = (Array.isArray(interfaces) ? interfaces : (interfaces?.interfaces || []));
                      const filtered = list.filter((i: any) => {
                        const n = (i.if_alias || i.display_name || i.if_name || '').toLowerCase();
                        const isTechnical = n.includes('null') || n.includes('loopback') || n.includes('virtual') || n.includes('template');
                        if (isTechnical) return false;
                        if (roleFilter === 'all') return (i.rx_bps || i.in_bps || 0) > 0 || (i.tx_bps || i.out_bps || 0) > 0;
                        return i.role === roleFilter || (roleFilter === 'upstream' && i.is_upstream);
                      });
                      setSelectedIfaces(filtered.map((i: any) => i.if_index));
                    }}
                    className="secondary-button !text-[10px] !py-1.5 flex-1"
                  >
                    Marcar Visíveis
                  </button>
                  <button 
                    onClick={() => setSelectedIfaces([])}
                    className="secondary-button !text-[10px] !py-1.5 flex-1"
                  >
                    Limpar Tudo
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 py-2">
                  {(Array.isArray(interfaces) ? interfaces : (interfaces?.interfaces || []))
                    .filter((i: any) => {
                      const n = (i.if_alias || i.display_name || i.if_name || '').toLowerCase();
                      const isTechnical = n.includes('null') || n.includes('loopback') || n.includes('virtual') || n.includes('template');
                      if (isTechnical) return false;
                      if (roleFilter === 'all') return (i.rx_bps || i.in_bps || 0) > 0 || (i.tx_bps || i.out_bps || 0) > 0;
                      return i.role === roleFilter || (roleFilter === 'upstream' && i.is_upstream);
                    })
                    .sort((a: any, b: any) => (b.if_speed || 0) - (a.if_speed || 0))
                    .map((iface: any) => {
                      const isSelected = selectedIfaces.includes(iface.if_index);
                      return (
                        <label 
                          key={iface.if_index}
                          className={clsx(
                            "flex items-center p-3 rounded-xl cursor-pointer transition-all border",
                            isSelected ? "bg-primary/5 border-primary/20" : "bg-bg-primary/20 border-transparent hover:bg-bg-primary/40"
                          )}
                        >
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedIfaces(prev =>
                                prev.includes(iface.if_index)
                                  ? prev.filter(id => id !== iface.if_index)
                                  : [...prev, iface.if_index]
                              );
                            }}
                            className="mr-4 w-4 h-4 rounded-md border-border text-primary focus:ring-primary bg-bg-secondary"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-text-primary truncate">{iface.if_alias || iface.display_name || iface.if_name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-primary border border-border text-text-secondary font-mono font-bold">
                                {fmtBps(iface.if_speed)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] font-bold text-text-secondary/50 uppercase">idx: {iface.if_index}</span>
                              <div className="flex items-center gap-1.5">
                                <ArrowDown size={10} className="text-blue-500" />
                                <span className="text-[10px] font-bold text-text-primary tabular-nums">{fmtBps(iface.rx_bps || iface.in_bps)}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <ArrowUp size={10} className="text-green-500" />
                                <span className="text-[10px] font-bold text-text-primary tabular-nums">{fmtBps(iface.tx_bps || iface.out_bps)}</span>
                              </div>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                </div>

                <button 
                  onClick={() => setShowIfaceSelector(false)}
                  className="primary-button !py-3 !w-full"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

