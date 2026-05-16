import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell, AreaChart, Area
} from 'recharts';
import { 
   Tooltip, TooltipTrigger, TooltipContent, TooltipProvider 
 } from '../components/ui/tooltip';
 import { MitigationTooltip } from '../components/MitigationTooltip';
import { ArrowUp, ArrowDown, Activity, Shield, MoreVertical, BarChart2, LineChart as LineChartIcon, Settings2, Info, ArrowRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Skeleton } from '../components/Skeleton';
import Flag from '../components/Flag';

import { clsx } from 'clsx';

const REFETCH_INTERVAL = 30000;
const RX_COLORS = ['#3b82f6', '#1d4ed8', '#60a5fa', '#93c5fd', '#bfdbfe'];
const TX_COLORS = ['#22c55e', '#16a34a', '#4ade80', '#86efac', '#bbf7d0'];
const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

function StatCard({ title, value, unit, icon, trend, tooltip, subtitle }: any) {
  return (
    <div 
      className="bg-white dark:bg-[#1e2130] p-6 rounded-xl border border-gray-200 dark:border-[#2a2d3e] shadow-sm flex flex-col justify-between min-h-[120px] transition-all hover:border-accent/50 group relative"
      title={tooltip}
    >
      <div className="flex justify-between items-start">
        <div className="p-2.5 bg-gray-50 dark:bg-bg-secondary rounded-xl group-hover:bg-accent/10 transition-colors">
          {icon}
        </div>
        {trend && typeof trend === 'string' && (
          <span className={clsx(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            trend.startsWith('+') ? "bg-success-bg text-success" : 
            trend.startsWith('-') ? "bg-danger-bg text-danger" : "bg-accent-bg text-accent"
          )}>
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-gray-500 dark:text-text-secondary text-[11px] font-bold uppercase tracking-wider">{title}</p>
        <div className="flex items-baseline gap-1 mt-1">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{value}</h3>
          {unit && <span className="text-xs font-bold text-gray-500 dark:text-text-secondary">{unit}</span>}
        </div>
         {subtitle && (
           <div className="text-[10px] text-text-secondary font-medium mt-0.5">{subtitle}</div>
         )}
      </div>
      {tooltip && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <div className="bg-gray-800 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap shadow-lg">
             {tooltip}
           </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
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
   const [period, setPeriod] = useState<'realtime' | '5m' | '15m'>('realtime');
 
   const { data: metricsHistory } = useQuery({
     queryKey: ['iface-metrics', selectedCollector, period],
     queryFn: async () => {
       if (period === 'realtime') return null;
       const mins = period === '5m' ? 5 : 15;
       const r = await api.get(`/api/collectors/${selectedCollector}/metrics?minutes=${mins}`);
       return r.data;
     },
     enabled: period !== 'realtime' && !!selectedCollector,
     refetchInterval: 30000,
   });
 
   // MELHORIA 1 — Gráfico de interface carrega imediatamente
   useEffect(() => {
     if (!interfaces?.interfaces?.length || period !== 'realtime') return;
 
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
   }, [interfaces, period]);

  useEffect(() => {
    if (selectedCollector) {
      localStorage.setItem('fg_collector', String(selectedCollector));
    }
  }, [selectedCollector]);

  useEffect(() => {
    localStorage.setItem('fg_ifaces', JSON.stringify(selectedIfaces));
  }, [selectedIfaces]);

   useEffect(() => {
     if (!interfaces?.interfaces || period !== 'realtime') return;

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
 
     const chartData = useMemo(() => {
       if (period === 'realtime') {
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
       } else {
         if (!metricsHistory || !Array.isArray(metricsHistory)) return [];
         
         const timeMap: Record<string, any> = {};
         metricsHistory.forEach((m: any) => {
           const time = new Date(m.collected_at).toLocaleTimeString('pt-BR', {
             hour: '2-digit', minute: '2-digit'
           });
           if (!timeMap[time]) timeMap[time] = { time };
           
           // The endpoint uses if_name, we might need to match with display_name
           // but the user's selectedIfaces are based on display_name || if_name.
           // Let's check both.
          const displayName = ifaceMap[m.if_name] || m.if_name;
          if (selectedIfaces.includes(displayName)) {
            timeMap[time][`${displayName}_in`] = Math.round(m.in_bps / 1e6);
            timeMap[time][`${displayName}_out`] = Math.round(m.out_bps / 1e6);
          }
         });
         
         return Object.values(timeMap).sort((a: any, b: any) => a.time.localeCompare(b.time));
       }
     }, [timePoints, selectedIfaces, history, period, metricsHistory]);

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
      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard 
          title="FLOW IPv4 ↓" 
          value={(detection?.incoming_mbps / 1000).toFixed(1)} 
          unit="Gbps" 
          icon={<ArrowDown className="text-accent" size={20} />} 
          subtitle="Estimado via Flow · sampling 1:1000"
        />
        <StatCard 
          title="FLOW IPv4 ↑" 
          value={(detection?.outgoing_mbps / 1000).toFixed(1)} 
          unit="Gbps" 
          icon={<ArrowUp className="text-success" size={20} />} 
          subtitle="Estimado via Flow · sampling 1:1000"
        />
        <StatCard 
          title="SNMP ↓ Total" 
          value={snmpTotals.rx.toFixed(1)} 
          unit="Gbps" 
          icon={<ArrowDown className="text-blue-500" size={20} />} 
          subtitle="Tráfego real · todas interfaces"
        />
        <StatCard 
          title="SNMP ↑ Total" 
          value={snmpTotals.tx.toFixed(1)} 
          unit="Gbps" 
          icon={<ArrowUp className="text-green-500" size={20} />} 
          subtitle="Tráfego real · todas interfaces"
        />
        <StatCard 
          title={t('active_flows')} 
          value={detection?.incoming_pps > 1000 ? (detection.incoming_pps / 1000).toFixed(1) + 'k' : detection?.incoming_pps || '0'} 
          icon={<Activity className="text-warning" size={20} />} 
        />
         <StatCard 
           title={t('active_mitigations')} 
           value={detection?.active_mitigations || '0'} 
           icon={<Shield className="text-danger" size={20} />} 
           subtitle={activeMitigations?.items?.length > 0 && (
             <div className="flex flex-wrap gap-1 mt-1">
               {activeMitigations.items.slice(0, 2).map((m: any) => (
                  <div 
                    key={m.ip} 
                    className="relative"
                    onMouseEnter={() => setHoveredIP(m.ip)}
                    onMouseLeave={() => setHoveredIP(null)}
                  >
                    <span className="text-[9px] font-mono font-bold text-danger border border-danger/20 px-1 rounded bg-danger/5 cursor-help hover:bg-danger/10 transition-colors">
                      {m.ip}
                    </span>
                    
                    {hoveredIP === m.ip && (
                      <div style={{
                        position: 'absolute',
                        zIndex: 100,
                        background: '#1e2130',
                        border: '1px solid #ef4444',
                        borderRadius: 8,
                        padding: '12px',
                        width: 220,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        top: '100%',
                        left: 0,
                        marginTop: 4,
                      }}>
                        <div style={{fontSize:12, color:'#8892a4', marginBottom:8}}>
                          Detalhes da Mitigação
                        </div>
                        <div style={{fontSize:13, color:'#e2e8f0', fontFamily:'monospace', marginBottom:4}}>
                          {m.ip}
                        </div>
                        <div style={{fontSize:11, color:'#8892a4'}}>
                          Tipo: {m.type || 'Blackhole /32'}
                        </div>
                        <div style={{fontSize:11, color:'#8892a4'}}>
                          Community: 65000:666
                        </div>
                        <div style={{fontSize:11, color:'#8892a4'}}>
                          Início: {m.since}
                        </div>
                        <div style={{fontSize:11, color:'#8892a4'}}>
                          Fonte: {m.source === 'automatic' ? 'Automático (detector)' : 'Manual (operador)'}
                        </div>
                        {m.pps > 0 && (
                          <div style={{
                            marginTop:8,
                            padding:'6px 8px',
                            background:'#3b1212',
                            borderRadius:4,
                            fontSize:11,
                            color:'#ef4444'
                          }}>
                            Pico: {m.pps > 1000 ? (m.pps/1000).toFixed(1)+'k' : m.pps} pps 
                            · {m.mbps} Mbps
                          </div>
                        )}
                      </div>
                    )}
                  </div>
               ))}
               {activeMitigations.items.length > 2 && <span className="text-[9px] text-text-secondary">+{activeMitigations.items.length - 2}</span>}
             </div>
           )}
         />
      </div>

      {/* Main Chart: Tráfego da Interface */}
      <div className="bg-white dark:bg-[#1e2130] p-6 rounded-xl border border-gray-200 dark:border-[#2a2d3e] shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-100 dark:border-[#2a2d3e] pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Tráfego da Interface</h2>
            <div className="px-2 py-0.5 rounded bg-accent/10 text-accent text-[10px] font-bold uppercase">SNMP Realtime</div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-bg-secondary rounded-lg border border-gray-200 dark:border-[#2a2d3e]">
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

             {/* MELHORIA 2 — Seletor de período */}
             <div className="flex bg-gray-50 dark:bg-bg-secondary p-1 rounded-lg border border-gray-200 dark:border-[#2a2d3e]">
               {(['realtime', '5m', '15m'] as const).map((p) => (
                 <button
                   key={p}
                   onClick={() => setPeriod(p)}
                   className={clsx(
                     "px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all",
                     period === p 
                       ? "bg-white dark:bg-[#2a2d3e] text-accent shadow-sm" 
                       : "text-text-secondary hover:text-text-primary"
                   )}
                 >
                   {p === 'realtime' ? 'Tempo Real' : p === '5m' ? '5 min' : '15 min'}
                 </button>
               ))}
             </div>
 
             <button 
               onClick={() => {
                 queryClient.invalidateQueries();
                 setCountdown(30);
               }}
               className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-bg-secondary hover:bg-gray-100 dark:hover:bg-[#2a2d3e] text-text-secondary hover:text-text-primary rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider border border-gray-200 dark:border-[#2a2d3e]"
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
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Info size={14} />
            <span className="font-medium">
              {(Array.isArray(collectors) ? collectors : (collectors?.items || collectors?.data || [])).find((c: any) => c.id === selectedCollector)?.name || 'NE-20'} · 
              {(Array.isArray(collectors) ? collectors : (collectors?.items || collectors?.data || [])).find((c: any) => c.id === selectedCollector)?.host || '45.175.50.209'} · 
              SNMP v2c
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold text-text-secondary">Total RX</span>
              <span className="text-sm font-black text-accent">{fmtBps(selectedIfaceData.reduce((a: number, b: any) => a + (b.in_bps || 0), 0))}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold text-text-secondary">Total TX</span>
              <span className="text-sm font-black text-success">{fmtBps(selectedIfaceData.reduce((a: number, b: any) => a + (b.out_bps || 0), 0))}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold text-text-secondary">Interfaces</span>
              <span className="text-sm font-black text-gray-900 dark:text-gray-100">{selectedIfaces.length} de {(Array.isArray(interfaces?.interfaces) ? interfaces.interfaces : []).length}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* RX Chart */}
          <div className="relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 origin-left text-[10px] font-black text-text-secondary uppercase tracking-widest pointer-events-none">
              RX (↓)
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData} margin={{top:10,right:10,left:30,bottom:0}}>
                <defs>
                  {selectedIfaces.map((name, idx) => {
                    const color = RX_COLORS[idx % RX_COLORS.length];
                    return (
                      <linearGradient key={`rx_${name}`} id={`grad_rx_${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.6}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis tick={{fontSize:10,fill:'#8892a4'}} tickLine={false} axisLine={false} tickFormatter={v => `${v}M`} />
                <RechartsTooltip
                  contentStyle={{ background:'#1e2130', border:'1px solid #2a2d3e', borderRadius:6, fontSize:11 }}
                  formatter={(v: number, name: string) => {
                    const ifName = name.replace('_in', '').replace('_out', '');
                    return [`${v} Mbps ↓ RX`, ifName];
                  }}
                />
                {selectedIfaces.map((name, idx) => {
                  const color = RX_COLORS[idx % RX_COLORS.length];
                  return (
                    <Area 
                      key={`${name}_in`} 
                      type="monotone" 
                      dataKey={`${name}_in`} 
                      stackId="rx" 
                      stroke={color} 
                      strokeWidth={1.5} 
                      fill={`url(#grad_rx_${idx})`} 
                      isAnimationActive={false}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* TX Chart */}
          <div className="relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 origin-left text-[10px] font-black text-text-secondary uppercase tracking-widest pointer-events-none">
              TX (↑)
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData} margin={{top:0,right:10,left:30,bottom:10}}>
                <defs>
                  {selectedIfaces.map((name, idx) => {
                    const color = TX_COLORS[idx % TX_COLORS.length];
                    return (
                      <linearGradient key={`tx_${name}`} id={`grad_tx_${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.6}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
                <XAxis dataKey="time" tick={{fontSize:10,fill:'#8892a4'}} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={{fontSize:10,fill:'#8892a4'}} tickLine={false} axisLine={false} tickFormatter={v => `${v}M`} />
                <RechartsTooltip
                  contentStyle={{ background:'#1e2130', border:'1px solid #2a2d3e', borderRadius:6, fontSize:11 }}
                  formatter={(v: number, name: string) => {
                    const ifName = name.replace('_out', '');
                    return [`${v} Mbps ↑ TX`, ifName];
                  }}
                />
                {selectedIfaces.map((name, idx) => {
                  const color = TX_COLORS[idx % TX_COLORS.length];
                  return (
                    <Area 
                      key={`${name}_out`} 
                      type="monotone" 
                      dataKey={`${name}_out`} 
                      stackId="tx" 
                      stroke={color} 
                      strokeWidth={1.5} 
                      fill={`url(#grad_tx_${idx})`} 
                      isAnimationActive={false}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interface Legend / Selector */}
        <div className="mt-6 flex flex-wrap gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pt-2 border-t border-gray-100 dark:border-[#2a2d3e]">
          {(Array.isArray(interfaces?.interfaces) ? interfaces.interfaces : [])
            .filter((i: any) => (i.in_bps || 0) > 0 || (i.out_bps || 0) > 0)
            .filter((i: any) => {
              const n = (i.display_name || i.if_name || '').toLowerCase();
              return !n.includes('null') && !n.includes('loopback') && !n.includes('virtual') && !n.includes('template');
            })
            .sort((a: any, b: any) => (b.in_bps + b.out_bps) - (a.in_bps + a.out_bps))
            .map((iface: any) => {
              const name = iface.display_name || iface.if_name;
              const isActive = selectedIfaces.includes(name);
              const color = COLORS[selectedIfaces.indexOf(name) % 8] || '#8892a4';

              return (
                <button
                  key={name}
                  onClick={() => {
                    setSelectedIfaces(prev =>
                      prev.includes(name)
                        ? prev.filter(n => n !== name)
                        : [...prev, name]
                    );
                  }}
                  className={clsx(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-[11px] font-bold",
                    isActive 
                      ? "border-accent/30 bg-accent/5 text-accent shadow-sm" 
                      : "border-gray-200 dark:border-[#2a2d3e] text-text-secondary opacity-60 hover:opacity-100"
                  )}
                  style={{
                    borderColor: isActive ? color + '50' : undefined,
                    backgroundColor: isActive ? color + '15' : undefined,
                    color: isActive ? color : undefined,
                  }}
                >
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ background: isActive ? color : '#8892a4' }} 
                  />
                  {name}
                  <span className="text-[9px] opacity-70">
                    {fmtBps(iface.in_bps)} ↓
                  </span>
                </button>
              );
            })
          }
        </div>
      </div>

       {/* Secondary Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Top Protocols */}
         <div className="bg-white dark:bg-[#1e2130] p-6 rounded-xl border border-gray-200 dark:border-[#2a2d3e] shadow-sm">
            <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100">{t('protocols')}</h2>
            <div className="space-y-2">
              {protoData.map((p: any, i: number) => (
                <div key={i} className={clsx(
                  "flex items-center gap-[10px] py-[6px]",
                  i < protoData.length - 1 && "border-b border-gray-100 dark:border-[#2a2d3e]"
                )}>
                  <span className="min-w-[45px] text-[13px] font-medium text-gray-700 dark:text-[#e2e8f0]">{p.name}</span>
                  <div className="flex-1 h-[6px] bg-gray-100 dark:bg-[#2a2d3e] rounded-[3px] overflow-hidden">
                    <div 
                      className="h-full bg-accent rounded-[3px]"
                      style={{ width: p.pct + '%' }}
                    />
                  </div>
                  <span className="text-[12px] text-text-secondary min-w-[40px] text-right">{p.pct}%</span>
                </div>
             ))}
           </div>
         </div>
 
          {/* Top Countries */}
         <div className="bg-white dark:bg-[#1e2130] p-6 rounded-xl border border-gray-200 dark:border-[#2a2d3e] shadow-sm">
            <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100">{t('countries')}</h2>
            <div className="space-y-1">
              {countryData.map((c: any, i: number) => (
                <div key={i} className={clsx(
                  "flex items-center gap-[8px] py-[5px]",
                   i < countryData.length - 1 && "border-b border-gray-100 dark:border-[#2a2d3e]"
                 )}>
                   <Flag code={c.code} size={18} />
                   <span className="text-[12px] text-gray-700 dark:text-[#e2e8f0] min-w-[30px] font-medium ml-1">{c.code}</span>
                  <div className="flex-1 h-[6px] bg-gray-100 dark:bg-[#2a2d3e] rounded-[3px] overflow-hidden">
                    <div 
                      className="h-full bg-accent rounded-[3px]"
                      style={{ width: c.pct + '%' }}
                    />
                  </div>
                  <span className="text-[12px] text-text-secondary min-w-[35px] text-right">{c.pct}%</span>
                </div>
             ))}
           </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Port Panels */}
          <div className="bg-white dark:bg-[#1e2130] p-6 rounded-xl border border-gray-200 dark:border-[#2a2d3e] shadow-sm space-y-8">
            {/* PAINEL 1 — Portas mais consumidas */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Portas mais consumidas</h2>
                <p className="text-xs text-text-secondary">O que seus clientes estão acessando na internet</p>
              </div>
              <div className="space-y-3">
                {portDataDst.map((p: any, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-text-primary">{p.name}</span>
                      <span className="text-text-secondary">{fmtBytes(p.bytes)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 bg-gray-100 dark:bg-[#2a2d3e] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                          style={{ width: `${p.pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-text-primary min-w-[35px] text-right">{p.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-[#2a2d3e] pt-8" />

            {/* PAINEL 2 — Serviços mais servidos */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Serviços mais servidos</h2>
                <p className="text-xs text-text-secondary">O que sua rede está entregando para a internet</p>
              </div>
              <div className="space-y-3">
                {portDataSrc.map((p: any, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-text-primary">{p.name}</span>
                      <span className="text-text-secondary">{fmtBytes(p.bytes)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 bg-gray-100 dark:bg-[#2a2d3e] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full transition-all duration-1000"
                          style={{ width: `${p.pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-text-primary min-w-[35px] text-right">{p.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
 
          {/* SNMP Interfaces */}
         <div className="bg-white dark:bg-[#1e2130] p-6 rounded-xl border border-gray-200 dark:border-[#2a2d3e] shadow-sm">
            <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100">{t('top_interfaces')}</h2>
            <div className="space-y-5">
             {relevantInterfaces.map((i: any) => {
               const utilPct = i.if_speed > 0
                 ? Math.min((i.in_bps / i.if_speed) * 100, 100)
                 : 0;
               return (
                 <div key={i.if_index || i.display_name} className="space-y-2">
                   <div className="flex justify-between items-end">
                     <div>
                       <p className="text-xs font-bold text-accent uppercase tracking-tighter">{i.display_name || i.if_name}</p>
                       <p className="text-lg font-bold text-text-primary leading-none">{fmtBps(i.in_bps)}</p>
                     </div>
                     <div className="text-right">
                       <p className="text-[10px] text-text-secondary font-bold uppercase">Utilization</p>
                       <p className="text-xs font-bold text-success">{utilPct.toFixed(1)}%</p>
                     </div>
                   </div>
                   <div className="w-full bg-bg-secondary rounded-full h-2 overflow-hidden flex">
                     <div
                       className="bg-accent h-full transition-all duration-1000"
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
        <div className="bg-white dark:bg-[#1e2130] rounded-xl border border-gray-200 dark:border-[#2a2d3e] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-border flex flex-wrap justify-between items-center bg-gray-50/50 dark:bg-bg-secondary/30 gap-4">
           <div className="flex flex-col gap-1">
             <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Top Fluxos IPv4 (2 min)</h2>
             <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <span style={{ fontSize: 11, color: '#8892a4' }}>
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
           </div>
           <span style={{fontSize:11, color:'#8892a4'}}>
             Próxima atualização: {countdown}s
           </span>
          <div className="flex items-center gap-2">
            <button className="text-text-secondary hover:text-text-primary transition-colors">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Filtros rápidos */}
        <div className="flex flex-wrap gap-2 px-6 py-3 border-b border-gray-100 dark:border-[#2a2d3e] bg-gray-50/30 dark:bg-bg-secondary/10">
          {['Todos', 'HTTP', 'HTTPS', 'DNS', 'Steam', 'UDP', 'TCP'].map(label => {
            const value = label === 'Todos' ? null : label;
            const isActive = serviceFilter === value;
            return (
              <button
                key={label}
                onClick={() => setServiceFilter(value)}
                className={clsx(
                  "px-3 py-1 rounded-md text-[11px] font-bold transition-all",
                  isActive 
                    ? "bg-accent/10 text-accent border border-accent/30 shadow-sm" 
                    : "text-text-secondary hover:text-text-primary border border-transparent hover:bg-gray-100 dark:hover:bg-[#2a2d3e]"
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
              <tr className="bg-gray-50 dark:bg-bg-secondary/50 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                <th className="px-6 py-3 border-b border-border">{t('source_ip')}</th>
                <th className="px-6 py-3 border-b border-border">{t('dest_ip')}</th>
                <th className="px-6 py-3 border-b border-border">Serviço</th>
                <th className="px-6 py-3 border-b border-border">Empresa</th>
                <th className="px-6 py-3 border-b border-border">{t('protocol')}</th>
                <th className="px-6 py-3 border-b border-border text-right">VOLUME (2 min)</th>
                <th className="px-6 py-3 border-b border-border text-right">{t('pps')}</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border/50">
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
                  <tr key={i} className="hover:bg-accent/5 transition-colors group">
                     <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Flag code={srcCountry} />
                        {srcMitigation ? (
                          <MitigationTooltip data={{
                            ip: srcMitigation.ip,
                            tipo: 'Blackhole /32',
                            desde: srcMitigation.since,
                            pps: srcMitigation.pps,
                            mbps: srcMitigation.mbps,
                            fonte: srcMitigation.source || 'Manual (admin)'
                          }}>
                            <span className="font-bold text-danger cursor-help flex items-center gap-1">
                              🛡 {src}
                            </span>
                          </MitigationTooltip>
                        ) : (
                          <span className="font-medium text-gray-900 dark:text-gray-100">{src}</span>
                        )}
                        <span className="text-text-secondary text-xs">:{srcPort}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Flag code={dstCountry} />
                        {dstMitigation ? (
                          <MitigationTooltip data={{
                            ip: dstMitigation.ip,
                            tipo: 'Blackhole /32',
                            desde: dstMitigation.since,
                            pps: dstMitigation.pps,
                            mbps: dstMitigation.mbps,
                            fonte: dstMitigation.source || 'Manual (admin)'
                          }}>
                            <span className="font-bold text-danger cursor-help flex items-center gap-1">
                              🛡 {dst}
                            </span>
                          </MitigationTooltip>
                        ) : (
                          <span className="text-gray-900 dark:text-gray-100">{dst}</span>
                        )}
                        <span className="text-text-secondary text-xs">:{dstPort}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{getService(dstPort)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] text-text-secondary" title={dstOrg}>{getOrg(dstOrg)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        item.proto === 6 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                        item.proto === 17 ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                        item.proto === 1 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                        "bg-gray-100 text-gray-700 dark:bg-bg-secondary dark:text-text-secondary"
                      )}>
                        {protoName(item.proto)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-gray-100">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">{fmtBytes(item.bytes)}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Volume transferido nos últimos 2 minutos (estimado com sampling 1:1000)</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-6 py-4 text-right text-text-secondary">{calcPPS(item.packets)}</td>
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
       </div>
       </TooltipProvider>
     );
   }

