import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
 import { 
   LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
   BarChart, Bar, Cell, AreaChart, Area
 } from 'recharts';
import { ArrowUp, ArrowDown, Activity, Shield, MoreVertical } from 'lucide-react';
import { Skeleton } from '../components/Skeleton';
import { clsx } from 'clsx';

export default function Dashboard() {
  const { t } = useTranslation();

   const { data: detection, isLoading: statsLoading } = useQuery({
     queryKey: ['detection-stats'],
     queryFn: async () => {
       const r = await api.get('/api/detection/stats');
       return r.data;
     },
     refetchInterval: 30000,
     retry: 1,
   });
 
   const { data: timeline } = useQuery({
     queryKey: ['timeline'],
     queryFn: async () => {
       const r = await api.get('/api/flows/timeline?minutes=30');
       return r.data;
     },
     refetchInterval: 30000,
     retry: 1,
   });
 
   const { data: protocols } = useQuery({
     queryKey: ['protocols'],
     queryFn: async () => {
       const r = await api.get('/api/flows/protocols?minutes=30');
       return r.data;
     },
     refetchInterval: 30000,
   });
 
   const { data: countries } = useQuery({
     queryKey: ['countries'],
     queryFn: async () => {
       const r = await api.get('/api/flows/countries?minutes=30');
       return r.data;
     },
     refetchInterval: 30000,
   });
 
   const { data: ports } = useQuery({
     queryKey: ['ports'],
     queryFn: async () => {
       const r = await api.get('/api/flows/ports?minutes=30');
       return r.data;
     },
     refetchInterval: 30000,
   });
 
   const { data: interfaces } = useQuery({
     queryKey: ['interfaces'],
     queryFn: async () => {
       const r = await api.get('/api/collectors/1/interfaces/summary');
       return r.data;
     },
     refetchInterval: 60000,
   });
 
   const { data: connections } = useQuery({
     queryKey: ['connections'],
     queryFn: async () => {
       const r = await api.get('/api/flows/connections?limit=10');
       return r.data;
     },
     refetchInterval: 30000,
   });

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
          value={stats?.rx_gbps || '0'} 
          unit="Gbps" 
          icon={<ArrowDown className="text-accent" size={20} />} 
          trend="+2.5%" 
        />
        <StatCard 
          title={t('traffic_out')} 
          value={stats?.tx_gbps || '0'} 
          unit="Gbps" 
          icon={<ArrowUp className="text-success" size={20} />} 
          trend="-1.2%" 
        />
        <StatCard 
          title={t('active_flows')} 
          value={stats?.active_flows || '0'} 
          icon={<Activity className="text-warning" size={20} />} 
        />
        <StatCard 
          title={t('active_mitigations')} 
          value={stats?.active_mitigations || '0'} 
          icon={<Shield className="text-danger" size={20} />} 
          trend="Active"
        />
      </div>

      {/* Main Chart */}
      <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm transition-colors">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-text-primary">Network Traffic (30m)</h2>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent"></div>
              <span className="text-xs text-text-secondary font-medium uppercase tracking-wider">Inbound (RX)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success"></div>
              <span className="text-xs text-text-secondary font-medium uppercase tracking-wider">Outbound (TX)</span>
            </div>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--success)" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="var(--text-secondary)" 
                fontSize={11} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="var(--text-secondary)" 
                fontSize={11} 
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-card)', 
                  borderColor: 'var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--text-primary)'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="rx" 
                stroke="var(--accent)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorRx)" 
                name="RX (Gbps)" 
              />
              <Area 
                type="monotone" 
                dataKey="tx" 
                stroke="var(--success)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorTx)" 
                name="TX (Gbps)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Protocols */}
        <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-lg font-bold mb-6 text-text-primary">{t('protocols')}</h2>
          <div className="space-y-4">
            {protocols?.slice(0, 6).map((item: any, idx: number) => (
              <div key={item.name} className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-text-primary uppercase">{item.name}</span>
                  <span className="text-text-secondary">{item.value} Gbps ({item.percentage}%)</span>
                </div>
                <div className="w-full bg-bg-secondary rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={clsx(
                      "h-full rounded-full transition-all duration-1000",
                      idx === 0 ? "bg-accent" : idx === 1 ? "bg-success" : idx === 2 ? "bg-warning" : "bg-text-secondary/50"
                    )}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Countries */}
        <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-lg font-bold mb-6 text-text-primary">{t('countries')}</h2>
          <div className="space-y-4">
            {countries?.slice(0, 6).map((item: any) => (
              <div key={item.name} className="flex items-center justify-between p-2 hover:bg-bg-secondary rounded-lg transition-colors border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getFlagEmoji(item.code)}</span>
                  <span className="text-sm font-medium text-text-primary">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-text-primary">{item.value} Gbps</p>
                  <p className="text-[10px] text-text-secondary font-bold uppercase">{item.percentage}% share</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Ports */}
        <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-lg font-bold mb-6 text-text-primary">{t('port')}s</h2>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ports?.slice(0, 8) || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-card)', 
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }} 
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {ports?.slice(0, 8).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--accent)' : 'var(--accent-bg)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SNMP Interfaces */}
        <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-lg font-bold mb-6 text-text-primary">{t('top_interfaces')}</h2>
          <div className="space-y-5">
            {interfaces?.slice(0, 4).map((iface: any) => (
              <div key={iface.name} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs font-bold text-accent uppercase tracking-tighter">{iface.name}</p>
                    <p className="text-lg font-bold text-text-primary leading-none">{iface.rx_mbps} <span className="text-xs font-normal text-text-secondary">Mbps</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-text-secondary font-bold uppercase">Utilization</p>
                    <p className="text-xs font-bold text-success">{Math.round((iface.rx_mbps / (iface.speed || 10000)) * 100)}%</p>
                  </div>
                </div>
                <div className="w-full bg-bg-secondary rounded-full h-2 overflow-hidden flex">
                  <div 
                    className="bg-accent h-full transition-all duration-1000" 
                    style={{ width: `${Math.min(100, (iface.rx_mbps / (iface.speed || 10000)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Connections Table */}
      <div className="bg-bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center bg-bg-secondary/30">
          <h2 className="text-lg font-bold text-text-primary">{t('active_connections')}</h2>
          <button className="text-text-secondary hover:text-text-primary transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-secondary/50 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                <th className="px-6 py-3 border-b border-border">{t('source_ip')}</th>
                <th className="px-6 py-3 border-b border-border">{t('dest_ip')}</th>
                <th className="px-6 py-3 border-b border-border">{t('service')}</th>
                <th className="px-6 py-3 border-b border-border">{t('protocol')}</th>
                <th className="px-6 py-3 border-b border-border text-right">{t('bytes')}</th>
                <th className="px-6 py-3 border-b border-border text-right">{t('pps')}</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border/50">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className={clsx("hover:bg-accent/5 transition-colors group", i === 2 && "bg-danger-bg/5")}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span>🇧🇷</span>
                      <span className="font-medium text-text-primary">177.12.34.{i}</span>
                      <span className="text-text-secondary text-xs">:{80 + i}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-text-primary">200.221.2.45<span className="text-text-secondary text-xs">:443</span></td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-accent-bg text-accent">HTTPS</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-bg-secondary text-text-secondary">TCP</span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-text-primary">1.2 MB</td>
                  <td className="px-6 py-4 text-right text-text-secondary">450</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, unit, icon, trend }: any) {
  return (
    <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between min-h-[120px] transition-all hover:border-accent/50 group">
      <div className="flex justify-between items-start">
        <div className="p-2.5 bg-bg-secondary rounded-xl group-hover:bg-accent/10 transition-colors">
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
        <p className="text-text-secondary text-[11px] font-bold uppercase tracking-wider">{title}</p>
        <div className="flex items-baseline gap-1 mt-1">
          <h3 className="text-2xl font-bold text-text-primary tracking-tight">{value}</h3>
          {unit && <span className="text-xs font-bold text-text-secondary">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

function getFlagEmoji(countryCode: string) {
  if (!countryCode) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}