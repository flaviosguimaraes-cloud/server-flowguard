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
import { Skeleton } from '../components/Skeleton';

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

const PERIODS = [
  { label: '30m', value: 30 },
  { label: '1h', value: 60 },
  { label: '6h', value: 360 },
  { label: '24h', value: 1440 },
];

const Monitoring = () => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [minutes, setMinutes] = useState(60);
  const [direction, setDirection] = useState<'download' | 'upload'>('download');
  const [countdown, setCountdown] = useState(30);

  const isAuthenticated = !!localStorage.getItem('access_token');

  // Timer visual
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => (c <= 1 ? 30 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: groups, isLoading: loadingGroups } = useQuery({
    queryKey: ['ip-groups-monitoring'],
    queryFn: () => api.get('/api/ip-groups').then(r => r.data || []),
    enabled: isAuthenticated,
  });

  const filteredGroups = useMemo(() => {
    if (!Array.isArray(groups)) return [];
    return groups.filter((g: any) => g.prefixes && g.prefixes.length > 0);
  }, [groups]);

  // Select first group by default
  useEffect(() => {
    if (filteredGroups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(String(filteredGroups[0].id));
    }
  }, [filteredGroups, selectedGroupId]);

  const { data: trafficData, isLoading: loadingTraffic, refetch: refetchTraffic } = useQuery({
    queryKey: ['traffic-group', selectedGroupId, minutes],
    queryFn: () => api.get(`/api/traffic/group/${selectedGroupId}?minutes=${minutes}`).then(r => r.data),
    enabled: isAuthenticated && !!selectedGroupId,
    refetchInterval: 30000,
  });

  const { data: topIpsData, isLoading: loadingTopIps, refetch: refetchTopIps } = useQuery({
    queryKey: ['top-ips', selectedGroupId, minutes, direction],
    queryFn: () => api.get(`/api/traffic/top-ips?group_id=${selectedGroupId}&minutes=${minutes}&direction=${direction}&limit=10`).then(r => r.data),
    enabled: isAuthenticated && !!selectedGroupId,
    refetchInterval: 30000,
  });

  const formatBw = (mbps: number) => {
    if (mbps === undefined || mbps === null) return '0 Mbps';
    if (mbps >= 1000)
      return (mbps / 1000).toFixed(2) + ' Gbps';
    return mbps.toFixed(2) + ' Mbps';
  };

  const chartData = useMemo(() => {
    const series = trafficData?.series || [];
    return {
      labels: series.map((s: any) => s.time_bucket ? s.time_bucket.substring(11, 16) : ''),
      datasets: [
        {
          label: 'Download',
          data: series.map((s: any) => s.download_mbps || 0),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: 'Upload',
          data: series.map((s: any) => s.upload_mbps || 0),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        }
      ]
    };
  }, [trafficData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          font: { size: 10, weight: 'bold' as const }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${formatBw(context.parsed.y)}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, maxRotation: 0 }
      },
      y: {
        beginAtZero: true,
        ticks: {
          font: { size: 10 },
          callback: (value: any) => {
            if (value >= 1000) return (value / 1000).toFixed(1) + 'G';
            return value + 'M';
          }
        }
      }
    }
  };

  const StatCard = ({ title, value, last, avg, max, color }: any) => (
    <div className="bg-bg-secondary p-4 rounded-xl border border-border flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className={clsx("w-2 h-2 rounded-full", color === 'blue' ? "bg-blue-500" : "bg-green-500")} />
        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">{title}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col">
          <span className="text-[10px] text-text-secondary font-medium uppercase opacity-60">Último</span>
          <span className="text-sm font-black text-text-primary">{formatBw(last)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-text-secondary font-medium uppercase opacity-60">Média</span>
          <span className="text-sm font-black text-text-primary">{formatBw(avg)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-text-secondary font-medium uppercase opacity-60">Máximo</span>
          <span className="text-sm font-black text-text-primary">{formatBw(max)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Monitor size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Monitoramento</h1>
            <p className="text-sm text-text-secondary">Tráfego em tempo real por grupo de IP</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-bg-secondary px-3 py-1.5 rounded-lg border border-border text-[10px] font-bold text-text-secondary">
            <RefreshCw size={12} className={clsx("animate-spin", countdown === 30 && "animate-none")} />
            ATUALIZANDO EM {countdown}S
          </div>
          
          <div className="flex bg-bg-secondary p-1 rounded-lg border border-border">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setMinutes(p.value)}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                  minutes === p.value 
                    ? "bg-primary text-white shadow-sm" 
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Gráfico principal (Col 1-3) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-bg-secondary p-6 rounded-2xl border border-border shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                <h2 className="text-sm font-black text-text-primary uppercase tracking-wider">Gráfico por Grupo</h2>
              </div>
              
              <div className="w-full sm:w-64">
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger className="bg-bg-primary border-border">
                    <SelectValue placeholder="Selecione um grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredGroups.map((g: any) => (
                      <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="h-[350px]">
              {loadingTraffic ? (
                <div className="w-full h-full animate-pulse bg-bg-primary rounded-xl" />
              ) : !selectedGroupId ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary gap-2">
                  <Filter size={32} opacity={0.2} />
                  <p className="text-sm italic">Selecione um grupo para visualizar os dados</p>
                </div>
              ) : (
                <ChartLine data={chartData} options={chartOptions} />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <StatCard 
                title="Consumo de Download" 
                last={trafficData?.stats?.download_last_mbps}
                avg={trafficData?.stats?.download_avg_mbps}
                max={trafficData?.stats?.download_max_mbps}
                color="blue"
              />
              <StatCard 
                title="Consumo de Upload" 
                last={trafficData?.stats?.upload_last_mbps}
                avg={trafficData?.stats?.upload_avg_mbps}
                max={trafficData?.stats?.upload_max_mbps}
                color="green"
              />
            </div>
          </div>
        </div>

        {/* Top IPs (Col 4) */}
        <div className="lg:col-span-1">
          <div className="bg-bg-secondary p-6 rounded-2xl border border-border shadow-sm h-full">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-6 bg-accent rounded-full" />
                <h2 className="text-sm font-black text-text-primary uppercase tracking-wider">Top IPs do Grupo</h2>
              </div>

              <div className="flex p-1 bg-bg-primary rounded-lg border border-border">
                <button
                  onClick={() => setDirection('download')}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-[10px] font-black uppercase transition-all",
                    direction === 'download' ? "bg-primary text-white" : "text-text-secondary"
                  )}
                >
                  <ArrowDown size={12} />
                  Download
                </button>
                <button
                  onClick={() => setDirection('upload')}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-[10px] font-black uppercase transition-all",
                    direction === 'upload' ? "bg-green-600 text-white" : "text-text-secondary"
                  )}
                >
                  <ArrowUp size={12} />
                  Upload
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {loadingTopIps ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-14 bg-bg-primary rounded-xl animate-pulse" />
                ))
              ) : !topIpsData?.top_ips?.length ? (
                <div className="text-center py-10 text-xs text-text-secondary italic">Sem dados disponíveis</div>
              ) : (
                topIpsData.top_ips.map((ip: any, idx: number) => (
                  <div key={idx} className="bg-bg-primary p-3 rounded-xl border border-border/50 group hover:border-primary/30 transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-bold text-text-primary">{ip.ip}</span>
                      <span className="text-xs font-black text-primary">{ip.mbps.toFixed(1)} Mbps</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="flex items-center gap-1">
                         <Zap size={10} className="text-text-secondary opacity-40" />
                         <span className="text-[9px] font-bold text-text-secondary uppercase">{ip.total_packets.toLocaleString()} pkts</span>
                       </div>
                       <div className="flex items-center gap-1">
                         <List size={10} className="text-text-secondary opacity-40" />
                         <span className="text-[9px] font-bold text-text-secondary uppercase">{ip.flows.toLocaleString()} flows</span>
                       </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Monitoring;
