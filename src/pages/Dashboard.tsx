import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
 import { 
   LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
   BarChart, Bar, Cell, AreaChart, Area
 } from 'recharts';
import { ArrowUp, ArrowDown, Activity, Shield, MoreVertical, BarChart2, LineChart as LineChartIcon } from 'lucide-react';
import { Skeleton } from '../components/Skeleton';
import Flag from '../components/Flag';

import { clsx } from 'clsx';

const REFETCH_INTERVAL = 30000;

export default function Dashboard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries();
      setLastUpdate(new Date());
    }, REFETCH_INTERVAL);
    return () => clearInterval(interval);
  }, [queryClient]);

  const { data: detection, isLoading: statsLoading } = useQuery({
    queryKey: ['detection-stats'],
    queryFn: async () => {
      const r = await api.get('/api/detection/stats');
      return r.data;
    },
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
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
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
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
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
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
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: ports } = useQuery({
    queryKey: ['ports'],
    queryFn: async () => {
      const r = await api.get('/api/flows/ports?minutes=30');
      return r.data;
    },
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: interfaces } = useQuery({
    queryKey: ['interfaces'],
    queryFn: async () => {
      const r = await api.get('/api/collectors/1/interfaces/summary');
      return r.data;
    },
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });

  const [trafficSource, setTrafficSource] = useState<'flow' | 'snmp'>(() =>
    localStorage.getItem('fg_traffic_source') as 'flow' | 'snmp' || 'snmp'
  );

  const [selectedIfaces, setSelectedIfaces] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fg_selected_ifaces');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [sumMode, setSumMode] = useState(false);

  useEffect(() => {
    localStorage.setItem('fg_traffic_source', trafficSource);
  }, [trafficSource]);

  useEffect(() => {
    localStorage.setItem('fg_selected_ifaces', JSON.stringify(selectedIfaces));
  }, [selectedIfaces]);

  useEffect(() => {
    if (trafficSource === 'snmp' && selectedIfaces.length === 0 && interfaces?.interfaces?.length > 0) {
      const top3 = (interfaces.interfaces || [])
        .filter((i: any) => i.in_bps > 0 || i.out_bps > 0)
        .filter((i: any) => {
          const n = (i.display_name || '').toLowerCase();
          return !n.includes('null') && !n.includes('loopback') && !n.includes('virtual') && !n.includes('template');
        })
        .sort((a: any, b: any) => (b.in_bps + b.out_bps) - (a.in_bps + a.out_bps))
        .slice(0, 3)
        .map((i: any) => i.display_name);
      setSelectedIfaces(top3);
    }
  }, [interfaces, trafficSource, selectedIfaces.length]);

  const { data: connections, dataUpdatedAt } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      const r = await api.get('/api/flows/connections?limit=10');
      return r.data;
    },
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });

   console.log('protocols:', protocols);
   console.log('countries:', countries);
   console.log('ports:', ports);
   console.log('connections:', connections);

    const flowData = useMemo(() => {
      return (timeline || []).map((d: any) => ({
        time: d.time ? d.time.substring(11, 16) : '',
        rx: parseFloat((d.rx_bytes / 1e9).toFixed(2)),
        tx: parseFloat((d.tx_bytes / 1e9).toFixed(2)),
      }));
    }, [timeline]);

    const selectedIfaceData = useMemo(() => {
      if (!interfaces?.interfaces) return [];
      return (interfaces.interfaces || [])
        .filter((i: any) => selectedIfaces.includes(i.display_name));
    }, [interfaces, selectedIfaces]);

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
        80:'HTTP', 443:'HTTPS', 53:'DNS',
        22:'SSH', 25:'SMTP', 110:'POP3',
        143:'IMAP', 3389:'RDP', 8080:'HTTP-Alt',
        123:'NTP', 179:'BGP', 161:'SNMP',
        3306:'MySQL', 5432:'PG', 27000:'Steam',
        1194:'VPN', 500:'IPSec', 1723:'PPTP',
        8443:'HTTPS-Alt', 465:'SMTP-SSL',
        993:'IMAP-SSL', 995:'POP3-SSL',
        21:'FTP', 23:'Telnet', 3478:'STUN',
        5060:'SIP', 5061:'SIP-TLS',
        19522:'UDP-Game', 25461:'Game',
      };
      return s[port] || String(port);
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

    const portItems = ports?.items || ports?.data || (Array.isArray(ports) ? ports : []);
    const totalPortBytes = portItems.reduce((a: number, b: any) => a + b.bytes, 0);

    const portData = portItems
      .slice(0, 6)
      .map((p: any) => ({
        port: p.port,
        name: portMap[p.port] || String(p.port),
        bytes: p.bytes,
        pct: totalPortBytes > 0 ? ((p.bytes / totalPortBytes) * 100).toFixed(1) : 0
      }));

    const protoName = (p: number) => p === 6 ? 'TCP' : p === 17 ? 'UDP' : p === 1 ? 'ICMP' : String(p);

    const ifaceColors = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];
   const relevantInterfaces = (interfaces?.interfaces || [])
     .filter((i: any) => i.in_bps > 0 || i.out_bps > 0)
     .filter((i: any) => {
       const name = (i.display_name || i.if_name || '').toLowerCase();
       return !name.includes('null') && !name.includes('loopback') && !name.includes('virtual') &&
         !name.includes('template') && !name.includes('inloop');
     })
     .sort((a: any, b: any) => (b.in_bps + b.out_bps) - (a.in_bps + a.out_bps))
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
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Stats */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         <StatCard 
            title={t('traffic_in')} 
            value={(detection?.incoming_mbps / 1000).toFixed(1)} 
            unit="Gbps" 
            icon={<ArrowDown className="text-accent" size={20} />} 
            tooltip="Baseado em Flow — amostragem 1:500"
          />
          <StatCard 
            title={t('traffic_out')} 
            value={(detection?.outgoing_mbps / 1000).toFixed(1)} 
            unit="Gbps" 
            icon={<ArrowUp className="text-success" size={20} />} 
            tooltip="Baseado em Flow — amostragem 1:500"
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
         />
       </div>

      {/* Main Chart */}
      <div className="bg-white dark:bg-[#1e2130] p-6 rounded-xl border border-gray-200 dark:border-[#2a2d3e] shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-100 dark:border-[#2a2d3e] pb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Network Traffic</h2>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-gray-100 dark:bg-bg-secondary p-1 rounded-lg">
              <button
                onClick={() => setTrafficSource('snmp')}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-md transition-all uppercase tracking-wider",
                  trafficSource === 'snmp' ? "bg-white dark:bg-accent text-accent dark:text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                )}>
                <BarChart2 size={14} /> Por Interface (SNMP)
              </button>
              <button
                onClick={() => setTrafficSource('flow')}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-md transition-all uppercase tracking-wider",
                  trafficSource === 'flow' ? "bg-white dark:bg-accent text-accent dark:text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                )}>
                <LineChartIcon size={14} /> Timeline (Flow)
              </button>
            </div>
          </div>
        </div>

        {trafficSource === 'snmp' ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-1 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Interfaces</p>
              {(interfaces?.interfaces || [])
                .filter((i: any) => i.in_bps > 0 || i.out_bps > 0)
                .filter((i: any) => {
                  const n = (i.display_name || '').toLowerCase();
                  return !n.includes('null') && !n.includes('loopback') && !n.includes('virtual') && !n.includes('template') && !n.includes('inloop');
                })
                .sort((a: any, b: any) => (b.in_bps + b.out_bps) - (a.in_bps + a.out_bps))
                .map((iface: any, idx: number) => (
                  <label key={iface.display_name} className="flex items-center gap-2 cursor-pointer py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-bg-secondary transition-colors group">
                    <input
                      type="checkbox"
                      checked={selectedIfaces.includes(iface.display_name)}
                      onChange={() => {
                        setSelectedIfaces(prev => 
                          prev.includes(iface.display_name) 
                            ? prev.filter(n => n !== iface.display_name)
                            : [...prev, iface.display_name]
                        );
                      }}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-accent focus:ring-accent accent-accent"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold truncate transition-colors" style={{ color: selectedIfaces.includes(iface.display_name) ? ifaceColors[idx % ifaceColors.length] : undefined }}>
                        {iface.display_name}
                      </p>
                      <p className="text-[9px] text-text-secondary flex items-center gap-1">
                        {fmtBps(iface.in_bps)} <ArrowDown size={8} /> {fmtBps(iface.out_bps)} <ArrowUp size={8} />
                      </p>
                    </div>
                  </label>
                ))
              }
              <button
                onClick={() => setSumMode(m => !m)}
                className={clsx(
                  "w-full mt-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                  sumMode ? "bg-accent/10 border-accent text-accent" : "bg-transparent border-gray-200 dark:border-[#2a2d3e] text-text-secondary hover:border-accent"
                )}>
                {sumMode ? '✓ Somando selecionadas' : 'Somar selecionadas'}
              </button>
            </div>
            <div className="lg:col-span-3 space-y-4 pt-2">
              <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12 }}>
                <span style={{ color: '#8892a4' }}>↓ Entrada (RX)</span>
                <span style={{ color: '#8892a4', opacity: 0.6 }}>↑ Saída (TX)</span>
                <span style={{ marginLeft: 'auto', color: '#8892a4', fontSize: 11 }}>
                  {selectedIfaces.length} interface(s) selecionada(s)
                  {sumMode ? ' — Somadas' : ''}
                </span>
              </div>

              {!sumMode ? (
                selectedIfaceData.map((iface: any, idx: number) => {
                  const maxVal = Math.max(...selectedIfaceData.map((i: any) => i.if_speed || 0), ...selectedIfaceData.map((i: any) => Math.max(i.in_bps, i.out_bps)));
                  const speed = iface.if_speed || maxVal || 1e9;
                  const inPct = Math.min((iface.in_bps / speed) * 100, 100);
                  const outPct = Math.min((iface.out_bps / speed) * 100, 100);
                  const color = ifaceColors[idx % ifaceColors.length];
                  
                  return (
                    <div key={iface.display_name} className="p-4 rounded-xl border border-gray-100 dark:border-[#2a2d3e] bg-gray-50/30 dark:bg-bg-secondary/20 space-y-3 transition-all">
                      <p className="text-[11px] font-bold text-gray-900 dark:text-gray-100 truncate">
                        {iface.display_name}
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-[#8892a4] w-8">↓ RX</span>
                          <div className="flex-1 h-3 bg-gray-100 dark:bg-[#2a2d3e] rounded-[4px] overflow-hidden">
                            <div 
                              className="h-full transition-all duration-500 rounded-[4px]"
                              style={{ width: inPct + '%', backgroundColor: color }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-gray-700 dark:text-[#e2e8f0] min-w-[70px] text-right">
                            {fmtBps(iface.in_bps)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-[#8892a4] w-8">↑ TX</span>
                          <div className="flex-1 h-3 bg-gray-100 dark:bg-[#2a2d3e] rounded-[4px] overflow-hidden">
                            <div 
                              className="h-full transition-all duration-500 rounded-[4px] opacity-60"
                              style={{ width: outPct + '%', backgroundColor: color }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-gray-700 dark:text-[#e2e8f0] min-w-[70px] text-right">
                            {fmtBps(iface.out_bps)}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between text-[10px] text-[#8892a4] font-medium border-t border-gray-100 dark:border-[#2a2d3e] pt-2">
                        <span>Capacidade: {fmtBps(iface.if_speed)}</span>
                        <span>Utilização: {((iface.in_bps / speed) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 rounded-xl border border-accent/20 bg-accent/5 space-y-6">
                  {(() => {
                    const totalRx = selectedIfaceData.reduce((a: number, b: any) => a + (b.in_bps || 0), 0);
                    const totalTx = selectedIfaceData.reduce((a: number, b: any) => a + (b.out_bps || 0), 0);
                    const totalSpeed = selectedIfaceData.reduce((a: number, b: any) => a + (b.if_speed || 0), 0);
                    const maxVal = totalSpeed || Math.max(totalRx, totalTx) || 1e9;
                    
                    return (
                      <div className="space-y-4">
                        <p className="text-[12px] font-black text-accent uppercase tracking-widest">
                          TOTAL ({selectedIfaceData.length} interfaces somadas)
                        </p>
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-4">
                            <span className="text-[11px] font-bold text-[#8892a4] w-10">↓ RX</span>
                            <div className="flex-1 h-4 bg-gray-100 dark:bg-[#2a2d3e] rounded-[4px] overflow-hidden">
                              <div 
                                className="h-full bg-accent transition-all duration-500 rounded-[4px]"
                                style={{ width: Math.min((totalRx / maxVal) * 100, 100) + '%' }}
                              />
                            </div>
                            <span className="text-sm font-black text-gray-900 dark:text-gray-100 min-w-[90px] text-right">
                              {fmtBps(totalRx)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <span className="text-[11px] font-bold text-[#8892a4] w-10">↑ TX</span>
                            <div className="flex-1 h-4 bg-gray-100 dark:bg-[#2a2d3e] rounded-[4px] overflow-hidden">
                              <div 
                                className="h-full bg-accent transition-all duration-500 rounded-[4px] opacity-60"
                                style={{ width: Math.min((totalTx / maxVal) * 100, 100) + '%' }}
                              />
                            </div>
                            <span className="text-sm font-black text-gray-900 dark:text-gray-100 min-w-[90px] text-right">
                              {fmtBps(totalTx)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {selectedIfaces.length === 0 && (
                <div className="h-full flex items-center justify-center text-text-secondary italic text-sm">
                  Selecione ao menos uma interface para visualizar
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-[300px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={flowData}>
                <defs>
                  <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-[#2a2d3e]" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#8892a4' }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={{ fontSize: 11, fill: '#8892a4' }} tickLine={false} axisLine={false} tickFormatter={v => v + 'G'} />
                <Tooltip
                  formatter={(v: any, n: string) => [v + ' Gbps', n === 'rx' ? 'Entrada' : 'Saída']}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: 'var(--text-primary)', padding: '2px 0' }}
                  labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="rx" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRx)" name="rx" />
                <Area type="monotone" dataKey="tx" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorTx)" name="tx" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
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
          {/* Top Ports */}
         <div className="bg-white dark:bg-[#1e2130] p-6 rounded-xl border border-gray-200 dark:border-[#2a2d3e] shadow-sm">
            <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100">{t('port')}s</h2>
            <div className="h-[180px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={portData}
                 margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                 <XAxis
                   dataKey="name"
                   tick={{ fontSize: 10, fill: '#8892a4' }}
                   tickLine={false} axisLine={false} />
                 <YAxis
                   tick={{ fontSize: 10, fill: '#8892a4' }}
                   tickLine={false} axisLine={false}
                   tickFormatter={v => v + '%'} />
                 <Tooltip
                   formatter={v => [v + '%']}
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 6, fontSize: 12,
                    color: 'var(--text-primary)'
                  }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                />
                 <Bar dataKey="pct" fill="#3b82f6"
                   radius={[3, 3, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
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
        <div className="p-6 border-b border-gray-200 dark:border-border flex justify-between items-center bg-gray-50/50 dark:bg-bg-secondary/30">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('active_connections')}</h2>
          <button className="text-text-secondary hover:text-text-primary transition-colors">
            <MoreVertical size={20} />
          </button>
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
                <th className="px-6 py-3 border-b border-border text-right">{t('bytes')}</th>
                <th className="px-6 py-3 border-b border-border text-right">{t('pps')}</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border/50">
              {(Array.isArray(connections) ? connections : (connections?.items || connections?.data || [])).map((item: any, i: number) => {
                const flipped = shouldFlip(item);
                const src = flipped ? item.dst_addr : item.src_addr;
                const srcPort = flipped ? item.dst_port : item.src_port;
                const srcCountry = flipped ? item.dst_country : item.src_country;
                
                const dst = flipped ? item.src_addr : item.dst_addr;
                const dstPort = flipped ? item.src_port : item.dst_port;
                const dstCountry = flipped ? item.src_country : item.dst_country;
                const dstOrg = flipped ? item.src_org : item.dst_org;

                return (
                  <tr key={i} className="hover:bg-accent/5 transition-colors group">
                    <td className="px-6 py-4">
                     <div className="flex items-center gap-2">
                       <Flag code={srcCountry} />
                       <span className="font-medium text-gray-900 dark:text-gray-100">{src}</span>
                       <span className="text-text-secondary text-xs">:{srcPort}</span>
                     </div>
                   </td>
                   <td className="px-6 py-4">
                     <div className="flex items-center gap-2">
                       <Flag code={dstCountry} />
                       <span className="text-gray-900 dark:text-gray-100">{dst}</span>
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
                    <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-gray-100">{fmtBytes(item.bytes)}</td>
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
        <div style={{
          fontSize: 11,
          color: '#8892a4',
          textAlign: 'right',
          marginTop: 6,
          padding: '0 24px 16px'
        }}>
          Atualizado às {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR') : '—'}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, unit, icon, trend, tooltip }: any) {
  return (
    <div 
      className="bg-white dark:bg-[#1e2130] p-6 rounded-xl border border-gray-200 dark:border-[#2a2d3e] shadow-sm flex flex-col justify-between min-h-[120px] transition-all hover:border-accent/50 group relative"
      title={tooltip}
    >
      <div className="flex justify-between items-start">
        <div className="p-2.5 bg-gray-50 dark:bg-bg-secondary rounded-xl group-hover:bg-accent/10 transition-colors">
          {icon}
        </div>
        {trend && (
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
