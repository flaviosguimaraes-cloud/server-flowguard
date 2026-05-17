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
const MAX_POINTS = 200;

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
      queryClient.invalidateQueries({ queryKey: ['protocols'] });
      queryClient.invalidateQueries({ queryKey: ['countries'] });
      queryClient.invalidateQueries({ queryKey: ['ports'] });
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

  const { data: eventsHistory } = useQuery({
    queryKey: ['events-history-compact'],
    queryFn: () => api.get('/api/events/history?limit=8').then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: sysStatus } = useQuery({
    queryKey: ['system-status'],
    queryFn: () => api.get('/api/system/status').then(r => r.data).catch(() => null),
    refetchInterval: 30000,
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

  const { data: protocols } = useQuery({
    queryKey: ['protocols'],
    queryFn: async () => {
      const r = await api.get('/api/flows/protocols?minutes=30');
      return r.data;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: countries } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const r = await api.get('/api/flows/countries?minutes=30');
      return r.data;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: portsDst } = useQuery({
    queryKey: ['ports-consumed'],
    queryFn: () => api.get('/api/flows/ports?minutes=30&direction=src').then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: portsSrc } = useQuery({
    queryKey: ['ports-served'],
    queryFn: () => api.get('/api/flows/ports?minutes=30&direction=dst').then(r => r.data),
    refetchInterval: 30000,
  });

  const [selectedCollector, setSelectedCollector] = useState<number>(() => {
    const saved = localStorage.getItem('fg_collector');
    const parsed = saved ? parseInt(saved) : 1;
    return isNaN(parsed) ? 1 : parsed;
  });
  const [selectedIfaces, setSelectedIfaces] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fg_ifaces');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
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
   const [timePeriod, setTimePeriod] = useState<'realtime' | '1h' | '6h' | '24h' | '48h'>('realtime');
   const [showIfaceSelector, setShowIfaceSelector] = useState(false);

  // 1. Forçar refetch quando timePeriod ou interfaces selecionadas mudam
  useEffect(() => {
    if (timePeriod !== 'realtime') {
      queryClient.invalidateQueries({
        queryKey: ['iface-history']
      });
    }
  }, [timePeriod, selectedIfaces, queryClient]);

  const { data: metricsHistory, isLoading: metricsHistoryLoading } = useQuery({
    queryKey: ['iface-history', selectedCollector, timePeriod, selectedIfaces],
    queryFn: async () => {
      if (timePeriod === 'realtime' || selectedIfaces.length === 0 || !selectedCollector)
        return null;

       const minutes = timePeriod === '1h' ? 60 : timePeriod === '6h' ? 360 : timePeriod === '24h' ? 1440 : 2880;

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
    enabled: timePeriod !== 'realtime' && selectedIfaces.length > 0 && !!selectedCollector,
    refetchInterval: 60000,
  });
 
   // MELHORIA 1 — Gráfico de interface carrega imediatamente
  useEffect(() => {
    if (!interfaces?.interfaces?.length || timePeriod !== 'realtime') return;

    setHistory(prev => {
       const hasData = Object.values(prev).some(arr => arr.length > 0);
       if (hasData) return prev;
 
       const now = new Date();
       const next: typeof prev = {};
 
       interfaces.interfaces.forEach((iface: any) => {
         const name = iface.display_name || iface.if_name;
         if (!name) return;
 
         next[name] = Array.from({length: 10}, (_, i) => ({
           time: new Date(now.getTime() - (9-i) * 30000).toLocaleTimeString('pt-BR', {
             hour: '2-digit', minute: '2-digit', second: '2-digit'
           }),
           in_bps: iface.in_bps || 0,
           out_bps: iface.out_bps || 0,
         }));
       });
       return next;
     });
  }, [interfaces, timePeriod]);

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

  useEffect(() => {
    if (!interfaces?.interfaces || timePeriod !== 'realtime') return;

    const now = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    setHistory(prev => {
      const next = { ...prev };
      const ifaceList = Array.isArray(interfaces?.interfaces) ? interfaces.interfaces : [];
      
      ifaceList.forEach((iface: any) => {
        const name = iface.display_name || iface.if_name;
        if (!name) return;
        
        if (!next[name]) next[name] = [];
        next[name] = [
          ...next[name].slice(-19),
          {
            time: now,
            in_bps: iface.in_bps || 0,
            out_bps: iface.out_bps || 0,
          }
        ];
      });
      return next;
    });

    // Default selection (top 8) if none selected
    if (selectedIfaces.length === 0 && interfaces?.interfaces) {
      const top8 = (Array.isArray(interfaces.interfaces) ? interfaces.interfaces : [])
        .filter((i: any) => (i.in_bps || 0) > 0 || (i.out_bps || 0) > 0)
        .filter((i: any) => {
          const n = (i.display_name || i.if_name || '').toLowerCase();
          return !n.includes('null') && !n.includes('loopback') && !n.includes('virtual') && !n.includes('template');
        })
        .sort((a: any, b: any) => (b.in_bps + b.out_bps) - (a.in_bps + a.out_bps))
        .slice(0, 8)
        .map((i: any) => i.display_name || i.if_name);
      setSelectedIfaces(top8);
    }
  }, [interfaces]);

   const { data: activeMitigations } = useQuery({
     queryKey: ['mitigation-active-dashboard'],
     queryFn: () => api.get('/api/mitigation/active').then(r => r.data),
     refetchInterval: 30000,
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
 
  const realtimeChartData = useMemo(() => {
    if (timePeriod !== 'realtime') return [];
    return timePoints.map((time, idx) => {
      const point: Record<string, any> = { time };
      selectedIfaces.forEach(name => {
        const h = history[name];
        if (h && h[idx]) {
          point[`${name}_in`] = Math.round(h[idx].in_bps / 1e6);
          point[`${name}_out`] = Math.round(h[idx].out_bps / 1e6);
        }
      });
      return point;
    });
  }, [timePoints, selectedIfaces, history, timePeriod]);

  const historicalChartData = useMemo(() => {
    if (timePeriod === 'realtime' || !metricsHistory?.length) return [];

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

    return sampleData(fullData);
  }, [metricsHistory, timePeriod]);

  const chartData = timePeriod === 'realtime' ? realtimeChartData : historicalChartData;

    const protoMap: Record<number, string> = {
     6: 'TCP', 17: 'UDP', 1: 'ICMP',
     47: 'GRE', 50: 'ESP', 89: 'OSPF'
   };

    const protoItems = protocols?.items || protocols?.data || (Array.isArray(protocols) ? protocols : []);
    const totalBytes = protoItems.reduce((a: number, b: any) => a + b.bytes, 0);

    const protoData = protoItems
      .slice(0, 5)
      .map((p: any) => ({
        name: protoMap[p.proto] || 'Proto ' + p.proto,
        bytes: p.bytes,
        flows: p.flows,
        pct: totalBytes > 0 ? ((p.bytes / totalBytes) * 100).toFixed(1) : 0
      }));

    const countryItems = countries?.items || countries?.data || (Array.isArray(countries) ? countries : []);
    const totalCountryBytes = countryItems.reduce((a: number, b: any) => a + b.bytes, 0);

    const countryData = countryItems
      .slice(0, 8)
      .map((c: any) => ({
        code: c.country,
        bytes: c.bytes,
        pct: totalCountryBytes > 0 ? ((c.bytes / totalCountryBytes) * 100).toFixed(1) : 0
      }));

    const isLocalIP = (ip: string) => ip?.startsWith('45.175.50.');

    const shouldFlip = (item: any) => !isLocalIP(item.src_addr) && isLocalIP(item.dst_addr);

    const getService = (port: number) => {
      const s: Record<number, string> = {
        80: 'HTTP', 443: 'HTTPS', 53: 'DNS',
        22: 'SSH', 25: 'SMTP', 110: 'POP3',
        143: 'IMAP', 3389: 'RDP',
        8080: 'HTTP-Alt', 123: 'NTP',
        179: 'BGP', 161: 'SNMP',
        3306: 'MySQL', 5432: 'PostgreSQL',
        27000: 'Steam', 1194: 'VPN',
        500: 'IPSec', 1723: 'PPTP',
        8443: 'HTTPS-Alt', 465: 'SMTP-SSL',
        993: 'IMAP-SSL', 995: 'POP3-SSL',
        21: 'FTP', 23: 'Telnet',
        3478: 'STUN', 5060: 'SIP',
        19132: 'Minecraft', 25565: 'Minecraft',
        6881: 'BitTorrent', 1935: 'RTMP',
        554: 'RTSP', 8888: 'HTTP-Alt2',
      };
      return s[port]
        ? `${s[port]} (${port})`
        : String(port);
    };

    const getOrg = (org: string) => {
      if (!org) return '—';
      return org.length > 35 ? org.substring(0, 35) + '...' : org;
    };

    const calcPPS = (packets: number) => {
      if (!packets || packets === 0) return '—';
      const pps = Math.round(packets / 1800);
      return pps > 1000 ? (pps / 1000).toFixed(1) + 'k' : String(pps);
    };

    const fmtBytes = (b: number) => {
      if (!b) return '—';
      if (b > 1e12) return (b / 1e12).toFixed(1) + ' TB';
      if (b > 1e9) return (b / 1e9).toFixed(1) + ' GB';
      if (b > 1e6) return (b / 1e6).toFixed(0) + ' MB';
      if (b > 1e3) return (b / 1e3).toFixed(0) + ' KB';
      return b + ' B';
    };

    const portMap: Record<number, string> = {
     443: 'HTTPS', 80: 'HTTP', 53: 'DNS', 22: 'SSH', 25: 'SMTP', 110: 'POP3',
     143: 'IMAP', 3389: 'RDP', 8080: 'HTTP-Alt', 123: 'NTP', 161: 'SNMP', 179: 'BGP',
     1194: 'VPN', 3306: 'MySQL', 5432: 'PG'
   };

    const processPortData = (data: any) => {
      const items = data?.items || data?.data || (Array.isArray(data) ? data : []);
      const total = items.reduce((a: number, b: any) => a + (b.bytes || 0), 0);
      return items.slice(0, 6).map((p: any) => ({
        port: p.port,
        name: getService(p.port),
        bytes: p.bytes,
        pct: total > 0 ? ((p.bytes / total) * 100).toFixed(1) : "0"
      }));
    };

   const formatTime = (timeStr: string) => {
     if (!timeStr || timeStr.length < 16) return timeStr;
     if (timePeriod === '24h' || timePeriod === '48h') {
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

     if (timePeriod === 'realtime') {
       const firstIface = selectedIfaces[0];
       const rxValues = firstIface && history[firstIface] ? history[firstIface].map((_, idx) =>
         selectedIfaces.reduce((s, name) => s + (history[name]?.[idx]?.in_bps || 0), 0)
       ) : [];
       const txValues = firstIface && history[firstIface] ? history[firstIface].map((_, idx) =>
         selectedIfaces.reduce((s, name) => s + (history[name]?.[idx]?.out_bps || 0), 0)
       ) : [];

       return {
         rx: getStats(rxValues),
         tx: getStats(txValues),
         label: 'Tempo Real'
       };
     }

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

     const labels: Record<string, string> = {
       '1h': '1 hora', '6h': '6 horas',
       '24h': '24 horas', '48h': '48 horas'
     };

     return {
       rx: getStats(rxValues),
       tx: getStats(txValues),
       label: labels[timePeriod] || timePeriod
     };
   }, [timePeriod, metricsHistory, history, selectedIfaces]);


    const portDataDst = processPortData(portsDst);
    const portDataSrc = processPortData(portsSrc);

    const protoName = (p: number) => p === 6 ? 'TCP' : p === 17 ? 'UDP' : p === 1 ? 'ICMP' : String(p);

    const ifaceColors = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];
  const snmpTotals = useMemo(() => {
    const list = Array.isArray(interfaces?.interfaces) ? interfaces.interfaces : [];
    let rx = 0;
    let tx = 0;
    list.forEach((i: any) => {
      const name = (i.display_name || i.if_name || '').toLowerCase();
      if (!name || name.includes('null') || name.includes('loopback') || name.includes('virtual')) return;
      rx += (i.in_bps || 0);
      tx += (i.out_bps || 0);
    });
    return {
      rx: rx / 1e9,
      tx: tx / 1e9
    };
  }, [interfaces]);

  const relevantInterfaces = (Array.isArray(interfaces?.interfaces) ? interfaces.interfaces : [])
    .filter((i: any) => (i.in_bps || 0) > 0 || (i.out_bps || 0) > 0)
    .filter((i: any) => {
      const name = (i.display_name || i.if_name || '').toLowerCase();
      return !name.includes('null') && !name.includes('loopback') && !name.includes('virtual') &&
        !name.includes('template') && !name.includes('inloop');
    })
    .sort((a: any, b: any) => ((b.in_bps || 0) + (b.out_bps || 0)) - ((a.in_bps || 0) + (a.out_bps || 0)))
    .slice(0, 6);

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

        {/* MELHORIA 3 — Dashboard card de anomalias */}
        <div className="bg-white dark:bg-bg-secondary p-5 rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <History className="text-warning" size={18} />
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Últimos Eventos de Mitigação</h2>
            </div>
            <Link to="/events" className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
              Ver histórico completo <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-0">
            {eventsHistory?.items?.map((item: any, i: number) => (
              <div key={i} style={{
                padding: '10px 0',
                borderBottom: '1px solid rgba(136, 146, 164, 0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4
                }}>
                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: 13,
                    color: isDark ? '#e2e8f0' : '#1e293b',
                    fontWeight: 700
                  }}>
                    {item.ip}
                  </span>
                  <div style={{display:'flex', gap:6}}>
                    {/* Status */}
                    <span style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: item.status === 'active'
                        ? (isDark ? '#3b1212' : '#fee2e2') : (isDark ? '#1a1a2e' : '#f1f5f9'),
                      color: item.status === 'active'
                        ? '#ef4444' : '#8892a4',
                      fontWeight: 600
                    }}>
                      {item.status === 'active'
                        ? '● ATIVO' : 'RESOLVIDO'}
                    </span>
                    {/* Origem */}
                    <span style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: isDark ? '#1e2130' : '#f8fafc',
                      color: '#8892a4',
                      border: isDark ? 'none' : '1px solid #e2e8f0'
                    }}>
                      {item.triggered_by === 'detector'
                        ? 'AUTO' : 'MANUAL'}
                    </span>
                  </div>
                </div>

                <div style={{
                  fontSize: 11,
                  color: '#8892a4',
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap',
                  fontWeight: 500
                }}>
                  {/* Direção */}
                  {item.direction ? (
                    <span style={{
                      color: item.direction === 'outgoing'
                        ? '#22c55e' : '#3b82f6'
                    }}>
                      {item.direction === 'outgoing'
                        ? '↑ Saída' : '↓ Entrada'}
                    </span>
                  ) : (
                    <span style={{ color: '#8892a4' }}>—</span>
                  )}

                  {/* Volume */}
                  {item.peak_pps > 0 && (
                    <span style={{color:'#f59e0b'}}>
                      {item.peak_pps > 1000
                        ? (item.peak_pps/1000).toFixed(1)
                          + 'k pps'
                        : item.peak_pps + ' pps'}
                      {item.peak_mbps > 0
                        ? ' · ' + item.peak_mbps + ' Mbps'
                        : ''}
                    </span>
                  )}

                  {/* Horário início */}
                  <span>
                    Início: {formatDate(item.started_at || item.start_time)}
                  </span>

                  {/* Horário fim se resolvido */}
                  {(item.ended_at || item.end_time) && (
                    <span>
                      Fim: {formatDate(item.ended_at || item.end_time)}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {(!eventsHistory?.items || eventsHistory.items.length === 0) && (
              <div className="text-center py-4 text-xs text-text-secondary italic">Nenhum evento recente</div>
            )}
          </div>
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
                 {(['realtime', '1h', '6h', '24h', '48h'] as const).map((p) => (
                   <button
                     key={p}
                     onClick={() => setTimePeriod(p)}
                     className={clsx(
                       "px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all whitespace-nowrap",
                       timePeriod === p 
                         ? "bg-white dark:bg-[#2a2d3e] text-accent shadow-sm" 
                         : "text-text-secondary hover:text-text-primary"
                     )}
                   >
                     {p === 'realtime' ? 'Tempo Real' : p}
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

        {/* Collector Info & Metrics Summary */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2 text-xs text-text-secondary opacity-80">
            <Info size={14} />
            <span className="font-medium">
              {(Array.isArray(collectors) ? collectors : (collectors?.items || collectors?.data || [])).find((c: any) => c.id === selectedCollector)?.name || 'NE-20'} 
              <span className="mx-2 opacity-30">|</span>
              {(Array.isArray(collectors) ? collectors : (collectors?.items || collectors?.data || [])).find((c: any) => c.id === selectedCollector)?.host || '45.175.50.209'} 
              <span className="mx-2 opacity-30">|</span>
              v2c
            </span>
          </div>

           <div className="flex flex-col gap-2 bg-bg-primary/30 p-4 rounded-xl border border-border/40">
             <div className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-1 opacity-60">
               Estatísticas · {periodStats.label}
             </div>
             {(['rx', 'tx'] as const).map(dir => (
               <div key={dir} className="flex items-center gap-4 py-1 border-t border-border/20 first:border-t-0">
                 <span className={clsx(
                   "text-xs font-black w-6 text-center",
                   dir === 'rx' ? "text-accent" : "text-success"
                 )}>
                   {dir === 'rx' ? '↓' : '↑'}
                 </span>

                 {(['last', 'min', 'avg', 'max'] as const).map(metric => (
                   <div key={metric} className="flex flex-col items-center min-w-[70px]">
                     <span className="text-[9px] uppercase font-bold text-text-secondary opacity-50 mb-0.5">
                       {metric === 'last' ? 'Último' : metric === 'min' ? 'Mínimo' : metric === 'avg' ? 'Média' : 'Máximo'}
                     </span>
                     <span className={clsx(
                       "text-[13px] font-bold tracking-tight",
                       metric === 'max' ? (dir === 'rx' ? "text-accent" : "text-success") : "text-text-primary"
                     )}>
                       {formatBpsRaw(periodStats[dir][metric])}
                     </span>
                   </div>
                 ))}
               </div>
             ))}
           </div>
            <div className="flex flex-col items-end px-3 py-1.5 bg-bg-primary/50 rounded-lg border border-border/30">
              <span className="text-[9px] uppercase font-black text-text-secondary opacity-60 leading-none mb-1">Interfaces</span>
              <span className="text-xs font-black text-text-primary">{selectedIfaces.length}<span className="text-[10px] opacity-40 mx-0.5">/</span>{(Array.isArray(interfaces?.interfaces) ? interfaces.interfaces : []).length}</span>
         </div>
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
                     contentStyle={{ 
                       background: isDark ? '#1E293B' : '#FFFFFF', 
                       border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`, 
                       borderRadius: '12px', 
                       fontSize: '11px',
                       boxShadow: isDark ? 'none' : '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                       padding: '8px 12px'
                     }}
                     formatter={(v: number, name: string) => [
                       formatBps(v) + 'bps',
                       name.includes('_in') ? '↓ RX' : '↑ TX'
                     ]}
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

         <div className="mt-4 border-t border-border/40 pt-4">
            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest opacity-60">
              Clique no botão "Interfaces" acima para selecionar as interfaces exibidas no gráfico.
            </p>
         </div>
      </div>

       {/* Secondary Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Top Protocols */}
         <div className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm">
            <h2 className="text-base font-bold mb-5 text-text-primary">{t('protocols')}</h2>
            <div className="space-y-1.5">
              {protoData.map((p: any, i: number) => (
                <div key={i} className={clsx(
                  "flex items-center gap-3 py-1.5",
                  i < protoData.length - 1 && "border-b border-border/40"
                )}>
                  <span className="min-w-[40px] text-xs font-semibold text-text-primary">{p.name}</span>
                  <div className="flex-1 h-1.5 bg-bg-primary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: p.pct + '%' }}
                    />
                  </div>
                  <span className="text-[11px] text-text-secondary font-bold min-w-[35px] text-right">{p.pct}%</span>
                </div>
              ))}
            </div>
          </div>
 
          {/* Top Countries */}
         <div className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm">
            <h2 className="text-base font-bold mb-5 text-text-primary">{t('countries')}</h2>
            <div className="space-y-1">
              {countryData.map((c: any, i: number) => (
                <div key={i} className={clsx(
                  "flex items-center gap-2 py-1.5",
                   i < countryData.length - 1 && "border-b border-border/40"
                 )}>
                   <Flag code={c.code} size={16} />
                   <span className="text-xs text-text-primary min-w-[28px] font-semibold ml-1">{c.code}</span>
                  <div className="flex-1 h-1.5 bg-bg-primary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: c.pct + '%' }}
                    />
                  </div>
                  <span className="text-[11px] text-text-secondary font-bold min-w-[35px] text-right">{c.pct}%</span>
                </div>
              ))}
            </div>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Port Panels */}
          <div className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm space-y-6">
            {/* PAINEL 1 — Portas mais consumidas */}
            <div className="space-y-3">
              <div>
                <h2 className="text-base font-bold text-text-primary">Portas mais consumidas</h2>
                <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider opacity-60 mt-0.5">Destino Internet</p>
              </div>
              <div className="space-y-2.5">
                {portDataDst.map((p: any, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                      <span className="text-text-primary">{p.name}</span>
                      <span className="text-text-secondary opacity-70">{fmtBytes(p.bytes)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-bg-primary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-700"
                          style={{ width: `${p.pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-text-primary min-w-[30px] text-right">{p.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
 
            <div className="border-t border-border/40 pt-6" />
 
            {/* PAINEL 2 — Serviços mais servidos */}
            <div className="space-y-3">
              <div>
                <h2 className="text-base font-bold text-text-primary">Serviços mais servidos</h2>
                <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider opacity-60 mt-0.5">Origem Rede</p>
              </div>
              <div className="space-y-2.5">
                {portDataSrc.map((p: any, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                      <span className="text-text-primary">{p.name}</span>
                      <span className="text-text-secondary opacity-70">{fmtBytes(p.bytes)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-bg-primary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-success rounded-full transition-all duration-700"
                          style={{ width: `${p.pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-text-primary min-w-[30px] text-right">{p.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
 
          {/* SNMP Interfaces */}
         <div className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm">
            <h2 className="text-base font-bold mb-5 text-text-primary">{t('top_interfaces')}</h2>
            <div className="space-y-4">
             {relevantInterfaces.map((i: any) => {
               const utilPct = i.if_speed > 0
                 ? Math.min((i.in_bps / i.if_speed) * 100, 100)
                 : 0;
               return (
                 <div key={i.if_index || i.display_name} className="space-y-1.5">
                   <div className="flex justify-between items-end">
                     <div>
                       <p className="text-[10px] font-bold text-primary uppercase tracking-wider">{i.display_name || i.if_name}</p>
                       <p className="text-base font-bold text-text-primary leading-tight">{fmtBps(i.in_bps)}</p>
                     </div>
                      <div className="text-right">
                        <p className="text-[9px] text-text-secondary font-bold uppercase tracking-widest opacity-60">Utilization</p>
                        <p className="text-xs font-bold text-success">{utilPct.toFixed(1)}%</p>
                      </div>
                   </div>
                   <div className="w-full bg-bg-primary rounded-full h-1.5 overflow-hidden flex border border-border/10">
                     <div
                       className="bg-primary h-full transition-all duration-1000"
                       style={{ width: `${utilPct}%` }}
                     />
                   </div>
                 </div>
               );
             })}
            </div>
          </div>
        </div>

          {/* Active Connections Table */}
        <div className="bg-bg-secondary rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex flex-wrap justify-between items-center bg-bg-primary/30 gap-4">
           <div className="flex flex-col gap-0.5">
             <h2 className="text-base font-bold text-text-primary">Top Fluxos IPv4 (2 min)</h2>
             <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider opacity-60">
               {(() => {
                 const list = (Array.isArray(connections) ? connections : (connections?.items || connections?.data || []))
                   ?.filter((item: any) => {
                     if (!serviceFilter) return true;
                     const flipped = shouldFlip(item);
                     const dstPort = flipped ? item.src_port : item.dst_port;
                     const service = getService(dstPort).split(' ')[0];
                     if (serviceFilter === 'UDP') return item.proto === 17;
                     if (serviceFilter === 'TCP') return item.proto === 6;
                     return service === serviceFilter;
                   }) || [];
                  return `${list.length} conexões · Top conexões por volume · últimos 2 min · atualizado a cada 30s`;
               })()}
             </span>
           </div>
            <div className="flex items-center gap-4">
               <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest bg-bg-primary px-2 py-1 rounded border border-border">
                 Próxima atualização: {countdown}s
               </span>
              <button className="text-text-secondary hover:text-text-primary transition-colors">
                <MoreVertical size={18} />
              </button>
           </div>
        </div>

        {/* Filtros rápidos */}
        <div className="flex flex-wrap gap-2 px-5 py-2.5 border-b border-border bg-bg-primary/10">
          {['Todos', 'HTTP', 'HTTPS', 'DNS', 'Steam', 'UDP', 'TCP'].map(label => {
            const value = label === 'Todos' ? null : label;
            const isActive = serviceFilter === value;
            return (
              <button
                key={label}
                onClick={() => setServiceFilter(value)}
                className={clsx(
                  "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all uppercase tracking-wider",
                  isActive 
                    ? "bg-primary text-white shadow-sm" 
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-primary"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-bg-primary/50 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                <th className="px-6 py-3 border-b border-border">{t('source_ip')}</th>
                <th className="px-6 py-3 border-b border-border">{t('dest_ip')}</th>
                <th className="px-6 py-3 border-b border-border">Serviço</th>
                <th className="px-6 py-3 border-b border-border">Empresa</th>
                <th className="px-6 py-3 border-b border-border">{t('protocol')}</th>
                <th className="px-6 py-3 border-b border-border text-right">VOLUME (2 min)</th>
                <th className="px-6 py-3 border-b border-border text-right">{t('pps')}</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border/30">
              {((Array.isArray(connections) ? connections : (connections?.items || connections?.data || []))
                ?.filter((item: any) => {
                  if (!serviceFilter) return true;
                  const flipped = shouldFlip(item);
                  const dstPort = flipped ? item.src_port : item.dst_port;
                  const service = getService(dstPort).split(' ')[0];
                  if (serviceFilter === 'UDP') return item.proto === 17;
                  if (serviceFilter === 'TCP') return item.proto === 6;
                  return service === serviceFilter;
                }) || []).map((item: any, i: number) => {
                const flipped = shouldFlip(item);
                const src = flipped ? item.dst_addr : item.src_addr;
                const srcPort = flipped ? item.dst_port : item.src_port;
                const srcCountry = flipped ? item.dst_country : item.src_country;
                
                const dst = flipped ? item.src_addr : item.dst_addr;
                 const dstPort = flipped ? item.src_port : item.dst_port;
                 const dstCountry = flipped ? item.src_country : item.dst_country;
                 const dstOrg = flipped ? item.src_org : item.dst_org;
 
                 const bannedList = activeMitigations?.items || [];
                 const srcMitigation = bannedList.find((m: any) => m.ip === src);
                 const dstMitigation = bannedList.find((m: any) => m.ip === dst);

                return (
                  <tr key={i} className="hover:bg-bg-primary/30 transition-colors group">
                     <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <Flag code={srcCountry} size={14} />
                        {srcMitigation ? (
                          <MitigationTooltip data={{
                            ip: srcMitigation.ip,
                            tipo: 'Blackhole /32',
                            desde: srcMitigation.since,
                             pps: Number(srcMitigation.pps || 0),
                             mbps: Number(srcMitigation.mbps || 0),
                            fonte: srcMitigation.source || 'Manual (admin)'
                          }}>
                            <span className="font-bold text-danger cursor-help flex items-center gap-1 text-xs">
                              🛡 {src}
                            </span>
                          </MitigationTooltip>
                        ) : (
                          <span className="font-semibold text-text-primary text-xs">{src}</span>
                        )}
                        <span className="text-text-secondary text-[10px] opacity-60">:{srcPort}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <Flag code={dstCountry} size={14} />
                        {dstMitigation ? (
                          <MitigationTooltip data={{
                            ip: dstMitigation.ip,
                            tipo: 'Blackhole /32',
                            desde: dstMitigation.since,
                             pps: Number(dstMitigation.pps || 0),
                             mbps: Number(dstMitigation.mbps || 0),
                            fonte: dstMitigation.source || 'Manual (admin)'
                          }}>
                            <span className="font-bold text-danger cursor-help flex items-center gap-1 text-xs">
                              🛡 {dst}
                            </span>
                          </MitigationTooltip>
                        ) : (
                          <span className="text-text-primary text-xs font-medium">{dst}</span>
                        )}
                        <span className="text-text-secondary text-[10px] opacity-60">:{dstPort}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-[11px] font-semibold text-text-primary">{getService(dstPort)}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-[10px] font-medium text-text-secondary" title={dstOrg}>{getOrg(dstOrg)}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={clsx(
                        "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                        item.proto === 6 ? "bg-primary/10 text-primary border border-primary/10" :
                        item.proto === 17 ? "bg-purple-500/10 text-purple-500 border border-purple-500/10" :
                        item.proto === 1 ? "bg-warning/10 text-warning border border-warning/10" :
                        "bg-bg-primary text-text-secondary"
                      )}>
                        {protoName(item.proto)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-text-primary text-xs">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">{fmtBytes(item.bytes)}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Volume transferido nos últimos 2 minutos (estimado com sampling 1:1000)</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-6 py-3.5 text-right text-text-secondary text-xs font-medium">{calcPPS(item.packets)}</td>
                  </tr>
                );
              })}
              {(!connections || connections.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-secondary italic">
                    No active connections found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-gray-50/30 dark:bg-bg-secondary/10 border-t border-gray-100 dark:border-[#2a2d3e] flex justify-between items-center">
          <Link 
            to="/analysis"
            search={{ minutes: 5 }}
            className="text-[11px] font-bold text-accent hover:text-accent/80 transition-colors flex items-center gap-1.5"
          >
            Ver análise em tempo real
            <ArrowRight size={12} />
          </Link>
          <p style={{
            fontSize: 11,
            color: '#8892a4',
            textAlign: 'right',
          }}>
            Última atualização: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR') : '—'}
        </p>
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

