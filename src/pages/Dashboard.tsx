import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../contexts/ThemeContext';
import { 
   ResponsiveContainer,
 } from 'recharts';
 import {
   Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip as ChartTooltip, Legend, Filler,
 } from 'chart.js';
 import { Line as ChartLine } from 'react-chartjs-2';
 
 ChartJS.register(
   CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, Legend, Filler
 );
import { 
   Tooltip, TooltipTrigger, TooltipContent, TooltipProvider 
 } from '../components/ui/tooltip';
import { ArrowUp, ArrowDown, Activity, Shield, MoreVertical, BarChart2, LineChart as LineChartIcon, Settings2, Info, ArrowRight, History, Zap, CheckCircle, Clock, Globe, MapPin, Users, RefreshCw, XCircle, LayoutDashboard } from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Skeleton } from '../components/Skeleton';
import Flag from '../components/Flag';
import { clsx } from 'clsx';

const CDN_COLORS: Record<string, string> = {
  'Netflix': '#E50914', 'Google': '#4285F4', 'YouTube': '#FF0000', 'Cloudflare': '#F48120', 'Akamai': '#009BDE', 'Amazon': '#FF9900', 'Meta': '#1877F2', 'Microsoft': '#00BCF2', 'Apple': '#555555', 'Disney': '#113CCF', 'Fastly': '#FF282D', 'Steam': '#1b2838', 'Riot': '#C89B3C', 'TikTok': '#010101',
};

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const isAuthenticated = !!localStorage.getItem('access_token');
  const [countdown, setCountdown] = useState(30);
  const [today, setToday] = useState('');
  const [yesterday, setYesterday] = useState('');

  useEffect(() => {
    const getLocalDateStr = (offset = 0) => {
      const d = new Date(); if (offset !== 0) d.setDate(d.getDate() + offset);
      return d.toISOString().split('T')[0];
    };
    setToday(getLocalDateStr()); setYesterday(getLocalDateStr(-1));
  }, []);

  const [selectedCollector, setSelectedCollector] = useState<number>(1);
  const [selectedIfaces, setSelectedIfaces] = useState<number[]>([]);
  const [selectedMinutes, setSelectedMinutes] = useState(30);
  const [showIfaceSelector, setShowIfaceSelector] = useState(false);
  const [periodASN, setPeriodASN] = useState(60);
  const [periodCDN, setPeriodCDN] = useState(60);

  const { data: detection } = useQuery({ queryKey: ['detection-stats'], queryFn: () => api.get('/api/detection/stats').then(r => r.data), enabled: isAuthenticated });
  const { data: asnStats } = useQuery({ queryKey: ['asns', periodASN], queryFn: () => api.get(`/api/flows/asns?minutes=${periodASN}&limit=5`).then(r => r.data), enabled: isAuthenticated });
  const { data: cdnStats } = useQuery({ queryKey: ['cdns-consumption', periodCDN], queryFn: () => api.get(`/api/flows/cdns?minutes=${periodCDN}`).then(r => r.data), enabled: isAuthenticated });
  const { data: flowsSummary } = useQuery({ queryKey: ['flows-summary'], queryFn: () => api.get('/api/flows/summary').then(r => r.data), enabled: isAuthenticated });
  const { data: eventsHistory } = useQuery({ queryKey: ['events-history-dashboard'], queryFn: () => api.get('/api/events/history?limit=5').then(r => r.data), enabled: isAuthenticated });
  const { data: sysStatus } = useQuery({ queryKey: ['system-status'], queryFn: () => api.get('/api/system/status').then(r => r.data), enabled: isAuthenticated });
  const { data: activeMitigations } = useQuery({ queryKey: ['mitigation-active-dashboard'], queryFn: () => api.get('/api/mitigation/active').then(r => r.data), enabled: isAuthenticated });

  const formatBw = (mbps: number) => mbps >= 1000 ? (mbps/1000).toFixed(1)+' Gbps' : mbps + ' Mbps';
  const cleanOrg = (org: string) => org.replace(/^(AS\d+)\s+/, '$1 • ').substring(0, 28);

  const cards = [
    { id: 'down', label: 'Download', value: detection?.incoming_mbps ? formatBw(detection.incoming_mbps) : '0 Mbps', icon: <ArrowDown size={18} />, color: 'text-primary', bg: 'bg-primary/10' },
    { id: 'up', label: 'Upload', value: detection?.outgoing_mbps ? formatBw(detection.outgoing_mbps) : '0 Mbps', icon: <ArrowUp size={18} />, color: 'text-success', bg: 'bg-success/10' },
    { id: 'flows', label: 'Fluxos/min', value: flowsSummary?.total_flows ? (flowsSummary.total_flows / 1000000).toFixed(1) + 'M' : '0', icon: <Activity size={18} />, color: 'text-warning', bg: 'bg-warning/10' },
    { id: 'attacks', label: 'Ameaças 24h', value: eventsHistory?.items?.length || 0, icon: <Shield size={18} />, color: 'text-danger', bg: 'bg-danger/10' },
    { id: 'bh', label: 'Blackhole', value: activeMitigations?.total || 0, icon: <Zap size={18} />, color: 'text-purple', bg: 'bg-purple/10' },
    { id: 'cpu', label: 'CPU Load', value: (sysStatus?.cpu_percent || 0).toFixed(1) + '%', icon: <Activity size={18} />, color: 'text-primary', bg: 'bg-primary/10' }
  ];

  return (
    <div className="fg-page">
      <div className="fg-page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h1 className="fg-section-title">Painel de Controle</h1>
            <p className="text-sm text-text-muted">Visão geral da rede e detecção de ameaças</p>
          </div>
        </div>
        <div className="bg-bg-card border border-border-main px-4 py-2 rounded-full flex items-center gap-3 shadow-inner">
           <RefreshCw size={14} className="animate-spin text-primary" />
           <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Próximo Sync em {countdown}s</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {cards.map(c => (
          <div key={c.id} className="fg-metric-card">
            <div className="flex justify-between items-start">
              <div className={clsx("p-2 rounded-lg", c.bg, c.color)}>{c.icon}</div>
              <span className="fg-metric-label">{c.label}</span>
            </div>
            <div className="fg-metric-value">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Anomalias Recentes */}
        <div className="fg-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-text-main uppercase tracking-widest flex items-center gap-2">
              <Shield size={18} className="text-danger" /> Ameaças Ativas
            </h2>
            <Link to="/mitigation/events" className="text-[10px] font-black text-primary uppercase hover:underline">Ver Todas</Link>
          </div>
          <div className="flex-1 space-y-3">
            {eventsHistory?.items?.slice(0, 5).map((e: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-bg-page/30 rounded-xl border border-border-main/50">
                <div className="flex items-center gap-3">
                  <div className={clsx("w-2 h-2 rounded-full", e.status === 'active' ? "bg-danger animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-text-muted/30")} />
                  <div className="flex flex-col">
                    <span className="text-xs font-black font-mono text-text-main">{e.ip}</span>
                    <span className="text-[9px] font-bold text-text-muted uppercase">{e.type || 'Anomalia'} • {e.started_at?.split(' ')[1]?.slice(0, 5)}</span>
                  </div>
                </div>
                <span className={clsx("fg-badge", e.status === 'active' ? "fg-badge-danger" : "fg-badge-success")}>
                  {e.status === 'active' ? 'Bloqueado' : 'Limpo'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top ASNs */}
        <div className="fg-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-text-main uppercase tracking-widest flex items-center gap-2">
              <Users size={18} className="text-primary" /> Top ASNs
            </h2>
            <div className="flex gap-1">
              {[60, 1440].map(m => (
                <button key={m} onClick={() => setPeriodASN(m)} className={clsx("px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all", periodASN === m ? "bg-primary text-white" : "bg-bg-page text-text-muted")}>
                  {m === 60 ? '1H' : '24H'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-4">
            {asnStats?.items?.slice(0, 5).map((item: any, i: number) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                  <span className="text-text-main truncate max-w-[70%]">{cleanOrg(item.org)}</span>
                  <span className="text-text-muted">{item.percent}%</span>
                </div>
                <div className="h-1.5 bg-bg-page rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Saúde do Sistema */}
        <div className="fg-card p-6 flex flex-col">
          <h2 className="text-sm font-black text-text-main uppercase tracking-widest mb-6 flex items-center gap-2">
            <Activity size={18} className="text-success" /> Infraestrutura
          </h2>
          <div className="space-y-6">
            {[
              { label: 'Detecção', status: sysStatus?.services?.detection_engine },
              { label: 'Flow Collector', status: sysStatus?.services?.flow_collector },
              { label: 'API Gateway', status: sysStatus?.services?.api },
              { label: 'Database', status: sysStatus?.services?.flow_database },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-main uppercase tracking-wider">{s.label}</span>
                <div className="flex items-center gap-2">
                  <span className={clsx("text-[9px] font-black uppercase", s.status === 'active' ? "text-success" : "text-danger")}>
                    {s.status === 'active' ? 'Online' : 'Falha'}
                  </span>
                  <div className={clsx("w-2 h-2 rounded-full", s.status === 'active' ? "bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-danger")} />
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-border-main/50 space-y-3">
              <div className="flex justify-between text-[10px] font-black uppercase">
                <span className="text-text-muted">RAM Usage</span>
                <span className="text-text-main">{(sysStatus?.ram_percent || 0).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-bg-page rounded-full overflow-hidden">
                <div className="h-full bg-success rounded-full" style={{ width: `${sysStatus?.ram_percent || 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
