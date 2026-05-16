import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
 import api from '../services/api';
 import { useTranslation } from '../hooks/useTranslation';
  import { 
    Search, Filter, X, Shield, Globe, Users, Activity,
    ArrowRight, AlertCircle, Download, MoreHorizontal,
    ArrowUp, ArrowDown, LayoutGrid, List
  } from 'lucide-react';
  import Flag from '../components/Flag';
 import { Skeleton } from '../components/Skeleton';
 import { clsx } from 'clsx';
import MitigationModal from '../components/MitigationModal';

function MetricCard({ title, value, icon }: any) {
  return (
    <div className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between min-h-[120px] transition-all duration-300 hover:border-primary/30 group relative">
      <div className="flex justify-between items-start relative z-10">
        <div className="p-2.5 bg-bg-primary rounded-lg text-primary border border-border/40 group-hover:bg-primary/5 group-hover:border-primary/20">
          {icon}
        </div>
      </div>
      <div className="mt-4 relative z-10">
        <p className="text-text-secondary text-[11px] font-bold uppercase tracking-wider opacity-70 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-text-primary tracking-tight leading-none">{value}</h3>
      </div>
    </div>
  );
}

const PPSIntensity = ({ pps }: { pps: number }) => {
  const color = pps < 10000 ? 'var(--success)' : pps < 50000 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div className="flex items-center gap-3 justify-end">
      <span className="text-right w-14 font-mono text-[11px] font-bold text-text-primary">{pps > 1000 ? (pps/1000).toFixed(1)+'k' : pps}</span>
      <div className="w-10 h-1.5 bg-bg-primary rounded-full overflow-hidden border border-border/30">
        <div 
          className="h-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(0,0,0,0.2)]" 
          style={{ 
            width: `${Math.min((pps/100000)*100, 100)}%`,
            backgroundColor: color
          }} 
        />
      </div>
    </div>
  );
};
 
 export default function Analysis() {
   const { t } = useTranslation();
   const isAdmin = localStorage.getItem('role') === 'admin';
  const queryClient = useQueryClient();
   
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

    const [search, setSearch] = useState('');
    const [proto, setProto] = useState('Todos');
    const [country, setCountry] = useState('Todos');
    const [minutes, setMinutes] = useState(5);
    const [sortField, setSortField] = useState('bytes');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [groupByIP, setGroupByIP] = useState(false);
    const [hoveredMitIP, setHoveredMitIP] = useState<string | null>(null);

    const SortHeader = ({ field, label, align = 'left' }: { field: string, label: string, align?: 'left' | 'right' | 'center' }) => (
      <th 
        className={clsx("px-6 py-4 border-b border-border cursor-pointer hover:bg-bg-secondary transition-colors", align === 'right' && 'text-right', align === 'center' && 'text-center')}
        onClick={() => {
          if (sortField === field) {
            setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
          } else {
            setSortField(field);
            setSortOrder('desc');
          }
        }}
      >
        <div className={clsx("flex items-center gap-1", align === 'right' && 'justify-end')}>
          {label}
          {sortField === field && (
            sortOrder === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />
          )}
        </div>
      </th>
    );

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
      let items = Array.isArray(connections) ? [...connections] : [...(connections?.items || connections?.data || [])];
      
      // Advanced Search (Frontend Filtering)
      if (search) {
        const s = search.toLowerCase();
        items = items.filter((i: any) => {
          const srcPortStr = String(i.src_port);
          const dstPortStr = String(i.dst_port);
          const service = getService(i.dst_port).toLowerCase();
          return (
            i.src_addr?.toLowerCase().includes(s) ||
            i.dst_addr?.toLowerCase().includes(s) ||
            i.src_org?.toLowerCase().includes(s) ||
            i.dst_org?.toLowerCase().includes(s) ||
            i.src_country?.toLowerCase() === s ||
            i.dst_country?.toLowerCase() === s ||
            srcPortStr === s ||
            dstPortStr === s ||
            service.includes(s) ||
            (s.startsWith('as') && (i.src_org?.toLowerCase().includes(s) || i.dst_org?.toLowerCase().includes(s)))
          );
        });
      }

      // Group by IP
      if (groupByIP) {
        const groups: Record<string, any> = {};
        items.forEach((item: any) => {
          const ip = shouldFlip(item) ? item.dst_addr : item.src_addr;
          if (!groups[ip]) {
            groups[ip] = {
              ...item,
              src_addr: ip,
              dst_addr: 'Múltiplos',
              dst_port: 0,
              bytes: 0,
              packets: 0,
              count: 0
            };
          }
          groups[ip].bytes += item.bytes || 0;
          groups[ip].packets += item.packets || 0;
          groups[ip].count += 1;
        });
        items = Object.values(groups);
      }

      // Sort
      items.sort((a: any, b: any) => {
        let valA = a[sortField];
        let valB = b[sortField];
        
        if (sortField === 'pps') {
          valA = a.packets || 0;
          valB = b.packets || 0;
        }

        if (typeof valA === 'string') {
          return sortOrder === 'asc' 
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
        
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });

      return items;
    }, [connections, search, groupByIP, sortField, sortOrder]);
 
   const metrics = useMemo(() => {
     const items = connectionItems;
     const uniqueIPs = new Set(items.flatMap((i: any) => [i.src_addr, i.dst_addr])).size;
     const distinctCountries = new Set(items.flatMap((i: any) => [i.src_country, i.dst_country])).size;
     const suspicious = items.filter((i: any) => i.bytes > 1e9).length;
     return { total: items.length, uniqueIPs, distinctCountries, suspicious };
   }, [connectionItems]);
 
 
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

  const exportCSV = () => {
    const headers = ["IP Origem", "IP Destino", "Serviço", "Empresa", "Protocolo", "Bytes", "PPS", "Última vez visto"];
    const rows = connectionItems.map((i: any) => [
      i.src_addr,
      i.dst_addr,
      getService(i.dst_port),
      i.dst_org || '',
      protoName(i.proto),
      i.bytes,
      Math.round((i.packets || 0) / 1800),
      i.time_received || ''
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `analise-conexoes-${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


   return (
     <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex justify-between items-center">
         <h1 className="text-2xl font-bold text-text-primary">{t('analysis')}</h1>
         <div className="flex gap-2">
            <button 
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-bg-secondary border border-border rounded-lg text-sm font-bold text-text-primary hover:bg-gray-50 dark:hover:bg-[#2a2d3e] transition-all shadow-sm"
            >
             <Download size={20} />
              Exportar CSV
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
        <div className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm space-y-5">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input
                type="text"
                placeholder="Buscar por IP, Empresa ou Porta..."
                className="w-full bg-bg-primary/50 border border-border rounded-lg py-1.5 pl-9 pr-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-text-primary"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex bg-bg-primary/50 p-1 rounded-lg border border-border">
              {['Todos', 'TCP', 'UDP', 'ICMP'].map((p) => (
                <button
                  key={p}
                  onClick={() => setProto(p)}
                  className={clsx(
                    "flex-1 px-2 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-wider",
                    proto === p ? "bg-white dark:bg-primary text-primary dark:text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                  )}>
                  {p}
                </button>
              ))}
            </div>
  
             <div className="relative">
               <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
               <select
                 className="w-full bg-bg-primary/50 border border-border rounded-lg py-1.5 pl-9 pr-4 outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-sm text-text-primary"
                 value={country}
                 onChange={(e) => setCountry(e.target.value)}
               >
                 <option value="Todos">Todos os Países</option>
                 {countryList.map((c: string) => (
                   <option key={c} value={c}>{c}</option>
                 ))}
               </select>
             </div>

          </div>
          
          <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4">
            <div className="flex items-center gap-2 mr-auto">
               <span className="text-[11px] font-bold text-text-secondary uppercase tracking-widest opacity-60">Período:</span>
               <div className="flex gap-1.5 flex-wrap">
                  {periods.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setMinutes(p.value)}
                      className={clsx(
                        "px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all uppercase tracking-wider",
                        minutes === p.value 
                          ? "bg-primary/10 border-primary/20 text-primary" 
                          : "bg-bg-primary/50 border-border text-text-secondary hover:text-text-primary"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
               </div>
            </div>

            <div className="flex items-center gap-3">
               <button 
                 onClick={() => setGroupByIP(!groupByIP)}
                 className={clsx(
                   "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all uppercase tracking-wider border shadow-sm",
                   groupByIP 
                     ? "bg-primary border-primary text-white" 
                     : "bg-bg-primary/50 border-border text-text-secondary hover:text-text-primary"
                 )}
               >
                 {groupByIP ? <LayoutGrid size={13} /> : <List size={13} />}
                 Agrupar por IP
               </button>

               <button 
                 onClick={() => { setSearch(''); setProto('Todos'); setCountry('Todos'); }}
                 className="text-[11px] font-bold text-text-secondary hover:text-primary flex items-center gap-1.5 transition-colors uppercase tracking-wider"
               >
                 <X size={14} /> Limpar
               </button>
            </div>
          </div>
         
          <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-[#2a2d3e]">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setGroupByIP(!groupByIP)}
                className={clsx(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  groupByIP 
                    ? "bg-accent text-white shadow-md" 
                    : "bg-bg-primary text-text-secondary hover:text-text-primary"
                )}
              >
                {groupByIP ? <LayoutGrid size={14} /> : <List size={14} />}
                Agrupar por IP
              </button>

              <button 
                onClick={() => { setSearch(''); setProto('Todos'); setCountry('Todos'); }}
                className="text-xs font-bold text-text-secondary hover:text-accent flex items-center gap-1 transition-colors"
              >
                <X size={14} /> Limpar filtros
              </button>
            </div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
              {connectionItems.length} conexões nos últimos {minutes < 60 ? `${minutes} minutos` : `${minutes/60} hora(s)`}
            </p>
         </div>
       </div>
 
       {/* Table */}
       <div className="bg-bg-secondary rounded-xl border border-border shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-bg-primary/50 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                  <SortHeader field="src_addr" label={t('source_ip')} />
                  <SortHeader field="dst_addr" label={t('dest_ip')} />
                  <th className="px-6 py-4 border-b border-border">Serviço</th>
                  <th className="px-6 py-4 border-b border-border">Empresa</th>
                  <th className="px-6 py-4 border-b border-border">{t('protocol')}</th>
                  <SortHeader field="bytes" label={t('bytes')} align="right" />
                  <SortHeader field="pps" label={t('pps')} align="right" />
                  <th className="px-6 py-4 border-b border-border text-center">Última vez visto</th>
                  {isAdmin && <th className="px-6 py-4 border-b border-border text-center">Ação</th>}
                </tr>
              </thead>
             <tbody className="text-sm divide-y divide-border/50">
               {isLoading ? (
                 Array.from({ length: 5 }).map((_, i) => (
                   <tr key={i}><td colSpan={8} className="px-6 py-4"><div className="w-full h-8 bg-bg-primary rounded animate-pulse" /></td></tr>
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
                             <span className="font-medium text-text-primary">{src}</span>
                             {!groupByIP && <span className="text-text-secondary text-xs">:{srcPort}</span>}
                             {groupByIP && <span className="ml-2 px-1.5 py-0.5 bg-accent/10 text-accent text-[9px] rounded-full">{item.count} conexões</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Flag code={dstCountry} />
                            <span className="text-text-primary">{dst}</span>
                            <span className="text-text-secondary text-xs">:{dstPort}</span>
                          </div>
                        </td>
                       <td className="px-6 py-4">
                         <span className="text-xs font-medium text-text-primary">{getService(dstPort)}</span>
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
                         <td className="px-6 py-4 text-right font-bold text-text-primary">{fmtBytes(item.bytes)}</td>
                         <td className="px-6 py-4 text-right text-text-secondary">
                           <PPSIntensity pps={Math.round((item.packets || 0) / (minutes * 60))} />
                         </td>
                         <td className="px-6 py-4 text-center text-[10px] text-text-secondary font-mono">
                           {item.time_received ? new Date(item.time_received).toLocaleTimeString('pt-BR') : '—'}
                         </td>
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
 
 
