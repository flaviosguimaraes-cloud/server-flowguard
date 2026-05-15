 import { useQuery } from '@tanstack/react-query';
 import api from '../services/api';
 import { useTranslation } from '../hooks/useTranslation';
 import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
 import { ArrowUp, ArrowDown, Activity, Shield } from 'lucide-react';
 import { Skeleton } from '../components/Skeleton';
 
 export default function Dashboard() {
   const { t } = useTranslation();
 
   const { data: stats, isLoading: statsLoading } = useQuery({
     queryKey: ['stats'],
     queryFn: async () => (await api.get('/api/detection/stats')).data,
     refetchInterval: 30000,
   });
 
   const { data: timeline } = useQuery({
     queryKey: ['timeline'],
     queryFn: async () => (await api.get('/api/flows/timeline?minutes=30')).data,
     refetchInterval: 30000,
   });
 
   const { data: interfaces } = useQuery({
     queryKey: ['interfaces'],
     queryFn: async () => (await api.get('/api/collectors/1/interfaces/summary')).data,
     refetchInterval: 30000,
   });
 
   if (statsLoading) return <Skeleton count={4} />;
 
   return (
     <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <StatCard title={t('traffic_in')} value={stats?.rx_gbps || '0'} unit="Gbps" icon={<ArrowDown className="text-blue-500" />} />
         <StatCard title={t('traffic_out')} value={stats?.tx_gbps || '0'} unit="Gbps" icon={<ArrowUp className="text-green-500" />} />
         <StatCard title={t('active_flows')} value={stats?.active_flows || '0'} icon={<Activity className="text-purple-500" />} />
         <StatCard title={t('active_mitigations')} value={stats?.active_mitigations || '0'} icon={<Shield className="text-red-500" />} />
       </div>
 
       <div className="bg-[#1e2130] p-6 rounded-xl border border-gray-800">
         <h2 className="text-lg font-bold mb-4">Network Traffic (30m)</h2>
         <div className="h-[300px]">
           <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={timeline || []}>
               <defs>
                 <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                   <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                 </linearGradient>
               </defs>
               <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
               <XAxis dataKey="time" stroke="#9ca3af" />
               <YAxis stroke="#9ca3af" />
               <Tooltip contentStyle={{ backgroundColor: '#1e2130', border: '1px solid #374151' }} />
               <Area type="monotone" dataKey="rx" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRx)" name="RX (Gbps)" />
               <Area type="monotone" dataKey="tx" stroke="#10b981" fill="transparent" name="TX (Gbps)" />
             </AreaChart>
           </ResponsiveContainer>
         </div>
       </div>
 
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-[#1e2130] p-6 rounded-xl border border-gray-800">
           <h2 className="text-lg font-bold mb-4">Top Interfaces</h2>
           <div className="space-y-4">
             {interfaces?.slice(0, 5).map((iface: any) => (
               <div key={iface.name} className="space-y-1">
                 <div className="flex justify-between text-sm">
                   <span>{iface.name}</span>
                   <span>{iface.rx_mbps} Mbps / {iface.tx_mbps} Mbps</span>
                 </div>
                 <div className="w-full bg-[#0f1117] rounded-full h-2">
                   <div 
                     className="bg-[#3b82f6] h-2 rounded-full transition-all duration-1000" 
                     style={{ width: `${Math.min(100, (iface.rx_mbps / iface.speed) * 100)}%` }}
                   />
                 </div>
               </div>
             ))}
           </div>
         </div>
       </div>
     </div>
   );
 }
 
 function StatCard({ title, value, unit, icon }: any) {
   return (
     <div className="bg-[#1e2130] p-6 rounded-xl border border-gray-800 flex items-center gap-4">
       <div className="p-3 bg-[#0f1117] rounded-lg">
         {icon}
       </div>
       <div>
         <p className="text-gray-400 text-sm">{title}</p>
         <h3 className="text-2xl font-bold">{value} <span className="text-sm font-normal text-gray-500">{unit}</span></h3>
       </div>
     </div>
   );
 }