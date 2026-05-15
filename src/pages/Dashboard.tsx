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
           value={(detection?.incoming_mbps / 1000).toFixed(1)} 
           unit="Gbps" 
           icon={<ArrowDown className="text-accent" size={20} />} 
         />
         <StatCard 
           title={t('traffic_out')} 
           value={(detection?.outgoing_mbps / 1000).toFixed(1)} 
           unit="Gbps" 
           icon={<ArrowUp className="text-success" size={20} />} 
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
             <LineChart data={timeline?.map((d: any) => ({
               time: d.time.substring(11, 16),
               rx: (d.rx_bytes / 1e9).toFixed(2),
               tx: (d.tx_bytes / 1e9).toFixed(2),
             }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
               <Line dataKey="rx" stroke="#3b82f6" dot={false} strokeWidth={2} name="RX (Gbps)" />
               <Line dataKey="tx" stroke="#22c55e" dot={false} strokeWidth={2} name="TX (Gbps)" />
             </LineChart>
           </ResponsiveContainer>
         </div>
      </div>

      {/* Secondary Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Top Protocols */}
         <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm">
           <h2 className="text-lg font-bold mb-6 text-text-primary">{t('protocols')}</h2>
           <div className="space-y-4">
             {protocols?.items?.slice(0, 6).map((item: any, idx: number) => {
               const name = item.proto === 6 ? 'TCP' : item.proto === 17 ? 'UDP' : item.proto === 1 ? 'ICMP' : `Proto ${item.proto}`;
               const totalBytes = protocols.items.reduce((acc: number, curr: any) => acc + curr.bytes, 0);
               const percentage = ((item.bytes / totalBytes) * 100).toFixed(1);
               return (
                 <div key={item.proto} className="space-y-2">
                   <div className="flex justify-between text-xs font-semibold">
                     <span className="text-text-primary uppercase">{name}</span>
                     <span className="text-text-secondary">{(item.bytes / 1e9).toFixed(2)} GB ({percentage}%)</span>
                   </div>
                   <div className="w-full bg-bg-secondary rounded-full h-1.5 overflow-hidden">
                     <div 
                       className={clsx(
                         "h-full rounded-full transition-all duration-1000",
                         idx === 0 ? "bg-accent" : idx === 1 ? "bg-success" : idx === 2 ? "bg-warning" : "bg-text-secondary/50"
                       )}
                       style={{ width: `${percentage}%` }}
                     />
                   </div>
                 </div>
               );
             })}
           </div>
         </div>
 
         {/* Top Countries */}
         <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm">
           <h2 className="text-lg font-bold mb-6 text-text-primary">{t('countries')}</h2>
           <div className="space-y-4">
             {countries?.items?.slice(0, 6).map((item: any) => {
               const totalBytes = countries.items.reduce((acc: number, curr: any) => acc + curr.bytes, 0);
               const percentage = ((item.bytes / totalBytes) * 100).toFixed(1);
               return (
                 <div key={item.country} className="flex items-center justify-between p-2 hover:bg-bg-secondary rounded-lg transition-colors border-b border-border/50 last:border-0">
                   <div className="flex items-center gap-3">
                     <span className="text-xl">{getFlagEmoji(item.country)}</span>
                     <span className="text-sm font-medium text-text-primary">{item.country}</span>
                   </div>
                   <div className="text-right">
                     <p className="text-sm font-bold text-text-primary">{(item.bytes / 1e9).toFixed(2)} GB</p>
                     <p className="text-[10px] text-text-secondary font-bold uppercase">{percentage}% share</p>
                   </div>
                 </div>
               );
             })}
           </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Top Ports */}
         <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm">
           <h2 className="text-lg font-bold mb-6 text-text-primary">{t('port')}s</h2>
           <div className="h-[240px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={ports?.items?.slice(0, 8).map((p: any) => ({
                 name: p.port === 443 ? 'HTTPS' : p.port === 53 ? 'DNS' : p.port === 80 ? 'HTTP' : p.port === 22 ? 'SSH' : p.port === 25 ? 'SMTP' : p.port.toString(),
                 value: p.bytes / 1e6 // MB
               })) || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
                   {ports?.items?.slice(0, 8).map((entry: any, index: number) => (
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
             {interfaces?.interfaces?.slice(0, 4).map((iface: any) => {
               const formatBps = (bps: number) => {
                 if (bps > 1e9) return (bps / 1e9).toFixed(1) + " Gbps";
                 if (bps > 1e6) return (bps / 1e6).toFixed(0) + " Mbps";
                 return bps + " bps";
               };
               const utilization = (iface.in_bps / iface.if_speed) * 100;
               return (
                 <div key={iface.display_name} className="space-y-2">
                   <div className="flex justify-between items-end">
                     <div>
                       <p className="text-xs font-bold text-accent uppercase tracking-tighter">{iface.display_name}</p>
                       <p className="text-lg font-bold text-text-primary leading-none">{formatBps(iface.in_bps)}</p>
                     </div>
                     <div className="text-right">
                       <p className="text-[10px] text-text-secondary font-bold uppercase">Utilization</p>
                       <p className="text-xs font-bold text-success">{utilization.toFixed(1)}%</p>
                     </div>
                   </div>
                   <div className="w-full bg-bg-secondary rounded-full h-2 overflow-hidden flex">
                     <div 
                       className="bg-accent h-full transition-all duration-1000" 
                       style={{ width: `${Math.min(100, utilization)}%` }}
                     />
                   </div>
                 </div>
               );
             })}
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
               {connections?.items?.map((conn: any, i: number) => (
                 <tr key={i} className="hover:bg-accent/5 transition-colors group">
                   <td className="px-6 py-4">
                     <div className="flex items-center gap-2">
                       <span>{getFlagEmoji(conn.country)}</span>
                       <span className="font-medium text-text-primary">{conn.src_ip}</span>
                       <span className="text-text-secondary text-xs">:{conn.src_port}</span>
                     </div>
                   </td>
                   <td className="px-6 py-4 text-text-primary">{conn.dst_ip}<span className="text-text-secondary text-xs">:{conn.dst_port}</span></td>
                   <td className="px-6 py-4">
                     <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-accent-bg text-accent">{conn.service || 'UNKNOWN'}</span>
                   </td>
                   <td className="px-6 py-4">
                     <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-bg-secondary text-text-secondary">{conn.proto === 6 ? 'TCP' : conn.proto === 17 ? 'UDP' : conn.proto}</span>
                   </td>
                   <td className="px-6 py-4 text-right font-bold text-text-primary">{(conn.bytes / 1024 / 1024).toFixed(1)} MB</td>
                   <td className="px-6 py-4 text-right text-text-secondary">{conn.pps}</td>
                 </tr>
               ))}
               {(!connections?.items || connections.items.length === 0) && (
                 <tr>
                   <td colSpan={6} className="px-6 py-8 text-center text-text-secondary italic">
                     No active connections found
                   </td>
                 </tr>
               )}
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