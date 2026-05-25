import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { 
  Activity, 
  ChevronDown, 
  ArrowUp, 
  ArrowDown, 
  Zap, 
  List,
  BarChart3,
  Clock,
  Filter,
  Monitor,
  RefreshCw
} from 'lucide-react';
import { clsx } from 'clsx';
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, Legend, Filler
);

const PERIODS = [
  { label: '30m', value: 30 }, { label: '1h', value: 60 }, { label: '6h', value: 360 }, { label: '24h', value: 1440 },
];

const Monitoring = () => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [minutes, setMinutes] = useState(60);
  const [direction, setDirection] = useState<'download' | 'upload'>('download');
  const [countdown, setCountdown] = useState(30);

  const isAuthenticated = !!localStorage.getItem('access_token');

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => (c <= 1 ? 30 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: groups } = useQuery({
    queryKey: ['ip-groups-monitoring'],
    queryFn: () => api.get('/api/ip-groups').then(r => r.data || []),
    enabled: isAuthenticated,
  });

  const filteredGroups = useMemo(() => Array.isArray(groups) ? groups.filter((g: any) => g.prefixes && g.prefixes.length > 0) : [], [groups]);

  useEffect(() => {
    if (filteredGroups.length > 0 && !selectedGroupId) setSelectedGroupId(String(filteredGroups[0].id));
  }, [filteredGroups, selectedGroupId]);

  const { data: trafficData, isLoading: loadingTraffic } = useQuery({
    queryKey: ['traffic-group', selectedGroupId, minutes],
    queryFn: () => api.get(`/api/traffic/group/${selectedGroupId}?minutes=${minutes}`).then(r => r.data),
    enabled: isAuthenticated && !!selectedGroupId,
    refetchInterval: 30000,
  });

  const { data: topIpsData, isLoading: loadingTopIps } = useQuery({
    queryKey: ['top-ips', selectedGroupId, minutes, direction],
    queryFn: () => api.get(`/api/traffic/top-ips?group_id=${selectedGroupId}&minutes=${minutes}&direction=${direction}&limit=10`).then(r => r.data),
    enabled: isAuthenticated && !!selectedGroupId,
    refetchInterval: 30000,
  });

  const formatBw = (mbps: number | undefined | null) => {
    if (mbps === undefined || mbps === null) return '0 Mbps';
    return mbps >= 1000 ? (mbps / 1000).toFixed(2) + ' Gbps' : mbps.toFixed(1) + ' Mbps';
  };

  const chartData = useMemo(() => {
    const series = trafficData?.series || [];
    return {
      labels: series.map((s: any) => s.time_bucket ? s.time_bucket.substring(11, 16) : ''),
      datasets: [
        { label: 'Download', data: series.map((s: any) => s.download_mbps || 0), borderColor: '#2563EB', backgroundColor: 'rgba(37, 99, 235, 0.1)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 3 },
        { label: 'Upload', data: series.map((s: any) => s.upload_mbps || 0), borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 3 }
      ]
    };
  }, [trafficData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const, align: 'end' as const, labels: { boxWidth: 6, usePointStyle: true, font: { size: 10, weight: 'bold' as const } } },
      tooltip: { mode: 'index' as const, intersect: false }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0 } },
      y: { beginAtZero: true, ticks: { font: { size: 10 } } }
    }
  };

  return (
    <div className="fg-page">
      <div className="fg-page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <Monitor size={24} />
          </div>
          <div>
            <h1 className="fg-section-title">Monitoramento</h1>
            <p className="text-sm text-text-muted">Análise de tráfego por grupos de rede</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-bg-card border border-border-main px-3 py-1.5 rounded-full flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest shadow-inner">
             <RefreshCw size={12} className="animate-spin text-primary" /> Sync em {countdown}s
          </div>
          <div className="flex bg-bg-card p-1 rounded-xl border border-border-main shadow-sm">
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setMinutes(p.value)} className={clsx("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", minutes === p.value ? "bg-primary text-white" : "text-text-muted hover:text-text-main")}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="fg-card p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                <h2 className="text-sm font-black text-text-main uppercase tracking-widest">Fluxo de Dados</h2>
              </div>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="fg-input w-full md:w-64"><SelectValue placeholder="Selecione um grupo" /></SelectTrigger>
                <SelectContent>{filteredGroups.map((g: any) => (<SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>

            <div className="h-[380px] relative bg-bg-page/20 rounded-xl p-4 border border-border-main/50">
              {loadingTraffic ? (<div className="absolute inset-0 flex items-center justify-center animate-pulse text-primary"><RefreshCw className="animate-spin" /></div>) : (<ChartLine data={chartData} options={chartOptions as any} />)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
               <div className="fg-card p-4 !bg-bg-page/30">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-[10px] font-black uppercase text-text-muted tracking-widest">Download Peak</span>
                  </div>
                  <div className="text-2xl font-black text-text-main tabular-nums">{formatBw(trafficData?.stats?.download_max_mbps)}</div>
               </div>
               <div className="fg-card p-4 !bg-bg-page/30">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-[10px] font-black uppercase text-text-muted tracking-widest">Upload Peak</span>
                  </div>
                  <div className="text-2xl font-black text-text-main tabular-nums">{formatBw(trafficData?.stats?.upload_max_mbps)}</div>
               </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="fg-card h-full flex flex-col">
            <div className="p-6 border-b border-border-main">
              <h2 className="text-sm font-black text-text-main uppercase tracking-widest mb-6 flex items-center gap-2">
                <BarChart3 size={18} className="text-primary" /> Top IPs
              </h2>
              <div className="flex p-1 bg-bg-page rounded-xl border border-border-main shadow-inner">
                <button onClick={() => setDirection('download')} className={clsx("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all", direction === 'download' ? "bg-bg-card text-primary shadow-sm" : "text-text-muted")}>
                  <ArrowDown size={12} /> RX
                </button>
                <button onClick={() => setDirection('upload')} className={clsx("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all", direction === 'upload' ? "bg-bg-card text-success shadow-sm" : "text-text-muted")}>
                  <ArrowUp size={12} /> TX
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
              {loadingTopIps ? (Array.from({length: 8}).map((_, i) => (<div key={i} className="h-16 bg-bg-page/50 rounded-xl animate-pulse" />))) : 
              topIpsData?.top_ips?.map((ip: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl border border-border-main/50 bg-bg-page/20 hover:border-primary/30 hover:bg-bg-page/40 transition-all cursor-default">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono font-bold text-xs text-text-main">{ip.ip}</span>
                    <span className={clsx("text-xs font-black", direction === 'download' ? "text-primary" : "text-success")}>{ip.mbps.toFixed(1)}M</span>
                  </div>
                  <div className="flex items-center gap-4 text-[9px] font-bold text-text-muted uppercase tracking-tighter opacity-70">
                    <span className="flex items-center gap-1"><Zap size={10} /> {ip.total_packets.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><List size={10} /> {ip.flows.toLocaleString()} flows</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Monitoring;
