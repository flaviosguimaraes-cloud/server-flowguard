import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
 import api from '../services/api';
 import { useTranslation } from '../hooks/useTranslation';
  import { 
    Search, Filter, X, Shield, Globe, Users, 
    ArrowRight, AlertCircle, Download, MoreHorizontal
  } from 'lucide-react';
  import Flag from '../components/Flag';
 import { Skeleton } from '../components/Skeleton';
 import { clsx } from 'clsx';
 import MitigationModal from '../components/MitigationModal';
 
 export default function Analysis() {
   const { t } = useTranslation();
   const isAdmin = localStorage.getItem('role') === 'admin';
  const queryClient = useQueryClient();
   
    const [search, setSearch] = useState('');
    const [proto, setProto] = useState('Todos');
    const [country, setCountry] = useState('Todos');
    const [minutes, setMinutes] = useState(5);

    const periods = [
      { label: '5 min', value: 5 },
      { label: '15 min', value: 15 },
      { label: '30 min', value: 30 },
      { label: '1 hora', value: 60 },
      { label: '6 horas', value: 360 },
      { label: '24 horas', value: 1440 },
    ];
   const [isMitigationOpen, setIsMitigationOpen] = useState(false);
   const [mitigationData, setMitigationData] = useState({ ip: '', proto: '', port: 0 });
 
   const { data: countriesData } = useQuery({
     queryKey: ['countries-list'],
     queryFn: async () => {
       const r = await api.get('/api/flows/countries?minutes=30');
       return r.data;
     },
   });
 
   const countryList = useMemo(() => {
     const items = countriesData?.items || countriesData?.data || (Array.isArray(countriesData) ? countriesData : []);
     return items.map((c: any) => c.country).sort();
   }, [countriesData]);
 
    const { data: connections, isLoading } = useQuery({
      queryKey: ['connections-analysis', search, proto, country, minutes],
      queryFn: async () => {
        const params = new URLSearchParams({
          limit: '100',
          minutes: String(minutes),
        });
        if (proto !== 'Todos') params.append('proto', proto);
        if (search) params.append('search', search);
        if (country !== 'Todos') params.append('country', country);
        
        const r = await api.get(`/api/flows/connections?${params}`);
        return r.data;
      },
      staleTime: 0,
      refetchInterval: 30000,
    });
 
   const connectionItems = useMemo(() => {
     return Array.isArray(connections) ? connections : (connections?.items || connections?.data || []);
   }, [connections]);
 
   const metrics = useMemo(() => {
     const items = connectionItems;
     const uniqueIPs = new Set(items.flatMap((i: any) => [i.src_addr, i.dst_addr])).size;
     const distinctCountries = new Set(items.flatMap((i: any) => [i.src_country, i.dst_country])).size;
     const suspicious = items.filter((i: any) => i.bytes > 1e9).length;
     return { total: items.length, uniqueIPs, distinctCountries, suspicious };
   }, [connectionItems]);
 
   const isLocalIP = (ip: string) => ip?.startsWith('45.175.50.');
   const shouldFlip = (item: any) => !isLocalIP(item.src_addr) && isLocalIP(item.dst_addr);
   const getService = (port: number) => {
     const s: Record<number, string> = {
       80:'HTTP', 443:'HTTPS', 53:'DNS', 22:'SSH', 25:'SMTP', 110:'POP3',
       143:'IMAP', 3389:'RDP', 8080:'HTTP-Alt', 123:'NTP', 179:'BGP', 161:'SNMP',
       3306:'MySQL', 5432:'PG', 27000:'Steam', 1194:'VPN', 500:'IPSec', 1723:'PPTP',
       8443:'HTTPS-Alt', 465:'SMTP-SSL', 993:'IMAP-SSL', 995:'POP3-SSL',
       21:'FTP', 23:'Telnet', 3478:'STUN', 5060:'SIP', 5061:'SIP-TLS',
       19522:'UDP-Game', 25461:'Game'
     };
     return s[port] || String(port);
   };
   const fmtBytes = (b: number) => {
     if (!b) return '—';
     if (b > 1e12) return (b / 1e12).toFixed(1) + ' TB';
     if (b > 1e9) return (b / 1e9).toFixed(1) + ' GB';
     if (b > 1e6) return (b / 1e6).toFixed(0) + ' MB';
     if (b > 1e3) return (b / 1e3).toFixed(0) + ' KB';
     return b + ' B';
   };
   const calcPPS = (packets: number) => {
     if (!packets) return '—';
     const pps = Math.round(packets / 1800);
     return pps > 1000 ? (pps / 1000).toFixed(1) + 'k' : String(pps);
   };
   const protoName = (p: number) => p === 6 ? 'TCP' : p === 17 ? 'UDP' : p === 1 ? 'ICMP' : String(p);
 
   const handleMitigate = (item: any) => {
     const flipped = shouldFlip(item);
     const targetIP = flipped ? item.src_addr : item.dst_addr;
     const targetPort = flipped ? item.src_port : item.dst_port;
     setMitigationData({
       ip: targetIP,
       proto: protoName(item.proto),
       port: targetPort
     });
     setIsMitigationOpen(true);
   };
 
  const handleMitigationSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['mitigation-active'] });
    queryClient.invalidateQueries({ queryKey: ['detection-stats'] });
  }, [queryClient]);

   return (
     <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex justify-between items-center">
         <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('analysis')}</h1>
         <div className="flex gap-2">
           <button className="p-2 bg-white dark:bg-[#1e2130] border border-gray-200 dark:border-[#2a2d3e] rounded-lg text-text-secondary hover:text-text-primary transition-colors shadow-sm">
             <Download size={20} />
           </button>
         </div>
       </div>
 
       {/* Metrics Cards */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         <MetricCard title="Total Conexões" value={metrics.total} icon={<Activity className="text-accent" size={20} />} />
         <MetricCard title="IPs Únicos" value={metrics.uniqueIPs} icon={<Users className="text-success" size={20} />} />
         <MetricCard title="Países" value={metrics.distinctCountries} icon={<Globe className="text-warning" size={20} />} />
         <MetricCard title="Altíssimo Volume" value={metrics.suspicious} icon={<AlertCircle className="text-danger" size={20} />} />
       </div>
 
       {/* Filters */}
       <div className="bg-white dark:bg-[#1e2130] p-6 rounded-xl border border-gray-200 dark:border-[#2a2d3e] shadow-sm transition-colors space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
           <div className="relative col-span-1 lg:col-span-2">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
             <input
               type="text"
               placeholder="Buscar por IP, Empresa ou Porta..."
               className="w-full bg-gray-50 dark:bg-bg-secondary border border-gray-200 dark:border-[#2a2d3e] rounded-lg py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-accent/50 transition-all text-text-primary"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
             />
           </div>
           
           <div className="flex bg-gray-50 dark:bg-bg-secondary p-1 rounded-lg border border-gray-200 dark:border-[#2a2d3e]">
             {['Todos', 'TCP', 'UDP', 'ICMP'].map((p) => (
               <button
                 key={p}
                 onClick={() => setProto(p)}
                 className={clsx(
                   "flex-1 px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-wider",
                   proto === p ? "bg-white dark:bg-accent text-accent dark:text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                 )}>
                 {p}
               </button>
             ))}
           </div>
 
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
              <select
                className="w-full bg-gray-50 dark:bg-bg-secondary border border-gray-200 dark:border-[#2a2d3e] rounded-lg py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-accent/50 appearance-none text-text-primary"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="Todos">Todos os Países</option>
                {countryList.map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="col-span-1 lg:col-span-1">
              <label style={{fontSize:11, color:'#8892a4', display:'block', marginBottom:6}}>Período</label>
              <div style={{display:'flex', gap:4, flexWrap: 'wrap'}}>
                {periods.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setMinutes(p.value)}
                    style={{
                      padding:'5px 8px',
                      borderRadius:6,
                      border: `1px solid ${minutes === p.value ? '#3b82f6' : '#2a2d3e'}`,
                      background: minutes === p.value ? '#1e3a5f' : 'transparent',
                      color: minutes === p.value ? '#3b82f6' : '#8892a4',
                      cursor:'pointer', fontSize:11,
                      fontWeight: minutes === p.value ? 600 : 400
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
         </div>
         
         <div className="flex justify-between items-center pt-2">
           <button 
             onClick={() => { setSearch(''); setProto('Todos'); setCountry('Todos'); }}
             className="text-xs font-bold text-text-secondary hover:text-accent flex items-center gap-1 transition-colors"
           >
             <X size={14} /> Limpar filtros
           </button>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
              {connectionItems.length} conexões nos últimos {minutes < 60 ? `${minutes} minutos` : `${minutes/60} hora(s)`}
            </p>
         </div>
       </div>
 
       {/* Table */}
       <div className="bg-white dark:bg-[#1e2130] rounded-xl border border-gray-200 dark:border-[#2a2d3e] shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse min-w-[1000px]">
             <thead>
               <tr className="bg-gray-50 dark:bg-bg-secondary/50 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                 <th className="px-6 py-4 border-b border-border">{t('source_ip')}</th>
                 <th className="px-6 py-4 border-b border-border">{t('dest_ip')}</th>
                 <th className="px-6 py-4 border-b border-border">Serviço</th>
                 <th className="px-6 py-4 border-b border-border">Empresa</th>
                 <th className="px-6 py-4 border-b border-border">{t('protocol')}</th>
                 <th className="px-6 py-4 border-b border-border text-right">{t('bytes')}</th>
                 <th className="px-6 py-4 border-b border-border text-right">{t('pps')}</th>
                 {isAdmin && <th className="px-6 py-4 border-b border-border text-center">Ação</th>}
               </tr>
             </thead>
             <tbody className="text-sm divide-y divide-border/50">
               {isLoading ? (
                 Array.from({ length: 5 }).map((_, i) => (
                   <tr key={i}><td colSpan={8} className="px-6 py-4"><div className="w-full h-8 bg-gray-100 dark:bg-[#2a2d3e] rounded animate-pulse" /></td></tr>
                 ))
               ) : connectionItems.length === 0 ? (
                 <tr>
                   <td colSpan={8} className="px-6 py-12 text-center text-text-secondary italic">
                     Nenhuma conexão encontrada com os filtros atuais
                   </td>
                 </tr>
               ) : (
                 connectionItems.map((item: any, i: number) => {
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
                         <span className="text-[11px] text-text-secondary font-medium" title={dstOrg}>
                           {dstOrg || '—'}
                         </span>
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
                       {isAdmin && (
                         <td className="px-6 py-4 text-center">
                           <button 
                             onClick={() => handleMitigate(item)}
                             className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-all"
                             title="Mitigar"
                           >
                             <Shield size={18} />
                           </button>
                         </td>
                       )}
                     </tr>
                   );
                 })
               )}
             </tbody>
           </table>
         </div>
       </div>
 
       <MitigationModal
         isOpen={isMitigationOpen}
         onClose={() => setIsMitigationOpen(false)}
         targetIP={mitigationData.ip}
         protocol={mitigationData.proto}
         port={mitigationData.port}
        onSuccess={handleMitigationSuccess}
       />
     </div>
   );
 }
 
 function MetricCard({ title, value, icon }: any) {
   return (
     <div className="bg-white dark:bg-[#1e2130] p-6 rounded-xl border border-gray-200 dark:border-[#2a2d3e] shadow-sm flex flex-col justify-between transition-all hover:border-accent/50 group">
       <div className="flex justify-between items-start">
         <div className="p-2.5 bg-gray-50 dark:bg-bg-secondary rounded-xl group-hover:bg-accent/10 transition-colors">
           {icon}
         </div>
       </div>
       <div className="mt-4">
         <p className="text-gray-500 dark:text-text-secondary text-[11px] font-bold uppercase tracking-wider">{title}</p>
         <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mt-1">{value}</h3>
       </div>
     </div>
   );
 }
 
 import { Activity } from 'lucide-react';
