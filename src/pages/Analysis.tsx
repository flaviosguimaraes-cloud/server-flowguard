import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
 import api from '../services/api';
 import { useTranslation } from '../hooks/useTranslation';
  import { 
    Search, Filter, X, Shield, Globe, Users, Activity,
    ArrowRight, AlertCircle, Download, MoreHorizontal,
    ArrowUp, ArrowDown, LayoutGrid, List, Clock
  } from 'lucide-react';
  import Flag from '../components/Flag';
 import { Skeleton } from '../components/Skeleton';
 import { clsx } from 'clsx';
  import { 
    Tooltip, TooltipTrigger, TooltipContent, TooltipProvider 
  } from '../components/ui/tooltip';
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
     const calcPPS = (packets: number, minutesStr: string = '30') => {
       if (!packets) return 0;
       const mins = parseInt(minutesStr) || 30;
       return Math.round(packets / (mins * 60));
     };

     const flagColor = (flags: string) => {
       if (!flags) return '#8892a4';
       if (flags.includes('RST')) return '#ef4444';
       if (flags === 'SYN') return '#f59e0b';
       if (flags === 'NO-FLAGS') return '#f97316';
       if (flags.includes('PSH')) return '#22c55e';
       if (flags.includes('SYN')) return '#3b82f6';
       return '#8892a4';
     };

     const bppLabel = (bpp: number) => {
       if (!bpp) return null;
       if (bpp > 1400) return {
         label: `${bpp}B ⚠`,
         color: '#ef4444',
         hint: 'Possível amplificação'
       };
       if (bpp < 100) return {
         label: `${bpp}B ⚠`,
         color: '#f59e0b',
         hint: 'Possível flood'
       };
       return {
         label: `${bpp}B`,
         color: '#8892a4',
         hint: 'Normal'
       };
     };

     const fmtDuration = (s: number) => {
       if (!s) return '—';
       if (s < 60) return `${s}s`;
       if (s < 3600)
         return `${Math.floor(s/60)}m ${s%60}s`;
       return `${Math.floor(s/3600)}h `+
         `${Math.floor((s%3600)/60)}m`;
     };
    const protoName = (p: number) => p === 6 ? 'TCP' : p === 17 ? 'UDP' : p === 1 ? 'ICMP' : String(p);

    const formatDate = (dateStr: string) => {
      if (!dateStr) return '—';
      try {
        const d = new Date(dateStr.replace(' ', 'T'));
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } catch { return '—'; }
    };

    const formatUTC = (dateStr: string) => {
      if (!dateStr) return '—';
      try {
         // Banco de Flows retorna sem timezone, assumir UTC e converter para local
         const d = new Date(dateStr.replace(' ', 'T') + 'Z');
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'America/Sao_Paulo'
        });
      } catch { return '—'; }
    };

    const [pageSize, setPageSize] = useState(50);
    const [page, setPage] = useState(1);

    const [filters, setFilters] = useState({
      src_ip: '',
      dst_ip: '',
      src_port: '',
      dst_port: '',
      proto: '',
      country: '',
      direction: '',
      start: '',
      end: '',
      order: 'bytes',
      minutes: '30',
    });

    const [groupByIP, setGroupByIP] = useState(false);
    const [hoveredMitIP, setHoveredMitIP] = useState<string | null>(null);

    useEffect(() => {
      setPage(1);
    }, [pageSize, filters]);

    const buildQuery = () => {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      });
      if (filters.minutes && !filters.start)
        params.append('minutes', filters.minutes);
      if (filters.src_ip)
        params.append('src_ip', filters.src_ip);
      if (filters.dst_ip)
        params.append('dst_ip', filters.dst_ip);
      if (filters.src_port)
        params.append('src_port', filters.src_port);
      if (filters.dst_port)
        params.append('dst_port', filters.dst_port);
      if (filters.proto)
        params.append('proto', filters.proto);
      if (filters.country)
        params.append('country', filters.country);
      if (filters.direction)
        params.append('direction', filters.direction);
      if (filters.start)
        params.append('start', filters.start);
      if (filters.end)
        params.append('end', filters.end);
      if (filters.order)
        params.append('order', filters.order);
      return params.toString();
    };

    const SortHeader = ({ field, label, align = 'left' }: { field: string, label: string, align?: 'left' | 'right' | 'center' }) => {
      const isSelected = filters.order === field;
      return (
        <th 
          className={clsx("px-6 py-4 border-b border-border cursor-pointer hover:bg-bg-secondary transition-colors", align === 'right' && 'text-right', align === 'center' && 'text-center')}
          onClick={() => {
            setFilters(prev => ({ ...prev, order: field }));
          }}
        >
          <div className={clsx("flex items-center gap-1", align === 'right' && 'justify-end')}>
            {label}
            {isSelected && <ArrowDown size={12} />}
          </div>
        </th>
      );
    };
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
 
    const { data: connections, isLoading, refetch } = useQuery({
      queryKey: ['connections-analysis', filters, page, pageSize],
      queryFn: async () => {
        const q = buildQuery();
        const r = await api.get(`/api/flows/connections?${q}`);
        return r.data;
      },
      staleTime: 0,
      refetchInterval: 30000,
    });

    const total = connections?.total || 0;
    const totalPages = Math.ceil(total / pageSize);
 
    const connectionItems = useMemo(() => {
      let items = Array.isArray(connections) ? [...connections] : [...(connections?.items || connections?.data || [])];
      
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

      return items;
    }, [connections, groupByIP]);
 
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
      formatUTC(i.time_received)
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
    <TooltipProvider>
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
 
       {/* MELHORIA 1 — Análise Avançada (Filtros) */}
       <div className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Row 1 */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">IP Origem</label>
              <input
                type="text"
                placeholder="Ex: 45.175.50 ou IP completo"
                className="w-full bg-bg-primary/50 border border-border rounded-lg py-1.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-text-primary"
                value={filters.src_ip}
                onChange={(e) => setFilters(prev => ({ ...prev, src_ip: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">IP Destino</label>
              <input
                type="text"
                placeholder="Ex: 45.175.50 ou IP completo"
                className="w-full bg-bg-primary/50 border border-border rounded-lg py-1.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-text-primary"
                value={filters.dst_ip}
                onChange={(e) => setFilters(prev => ({ ...prev, dst_ip: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Porta Origem</label>
              <input
                type="number"
                placeholder="1-65535"
                className="w-full bg-bg-primary/50 border border-border rounded-lg py-1.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-text-primary"
                value={filters.src_port}
                onChange={(e) => setFilters(prev => ({ ...prev, src_port: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Porta Destino</label>
              <input
                type="number"
                placeholder="1-65535"
                className="w-full bg-bg-primary/50 border border-border rounded-lg py-1.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-text-primary"
                value={filters.dst_port}
                onChange={(e) => setFilters(prev => ({ ...prev, dst_port: e.target.value }))}
              />
            </div>

            {/* Row 2 */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Protocolo</label>
              <select
                className="w-full bg-bg-primary/50 border border-border rounded-lg py-1.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-sm text-text-primary"
                value={filters.proto}
                onChange={(e) => setFilters(prev => ({ ...prev, proto: e.target.value }))}
              >
                <option value="">Todos</option>
                <option value="6">TCP (6)</option>
                <option value="17">UDP (17)</option>
                <option value="1">ICMP (1)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">País</label>
              <select
                className="w-full bg-bg-primary/50 border border-border rounded-lg py-1.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-sm text-text-primary"
                value={filters.country}
                onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
              >
                <option value="">Todos</option>
                {countryList.map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Direção</label>
              <select
                className="w-full bg-bg-primary/50 border border-border rounded-lg py-1.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-sm text-text-primary"
                value={filters.direction}
                onChange={(e) => setFilters(prev => ({ ...prev, direction: e.target.value }))}
              >
                <option value="">Todos</option>
                <option value="outgoing">↑ Upload</option>
                <option value="incoming">↓ Download</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Ordenar por</label>
              <select
                className="w-full bg-bg-primary/50 border border-border rounded-lg py-1.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-sm text-text-primary"
                value={filters.order}
                onChange={(e) => setFilters(prev => ({ ...prev, order: e.target.value }))}
              >
                <option value="bytes">Maior volume</option>
                <option value="packets">Maior PPS</option>
                <option value="time_received">Mais recente</option>
              </select>
            </div>

            {/* Row 3 */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Data/Hora Início</label>
              <input
                type="datetime-local"
                className="w-full bg-bg-primary/50 border border-border rounded-lg py-1 px-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-text-primary"
                value={filters.start}
                onChange={(e) => setFilters(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Data/Hora Fim</label>
              <input
                type="datetime-local"
                className="w-full bg-bg-primary/50 border border-border rounded-lg py-1 px-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-text-primary"
                value={filters.end}
                onChange={(e) => setFilters(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Período</label>
              <select
                className="w-full bg-bg-primary/50 border border-border rounded-lg py-1.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-sm text-text-primary"
                value={filters.minutes}
                onChange={(e) => setFilters(prev => ({ ...prev, minutes: e.target.value }))}
                disabled={!!filters.start}
              >
                <option value="2">2 min</option>
                <option value="5">5 min</option>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="60">1 hora</option>
                <option value="360">6 horas</option>
                <option value="1440">24 horas</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button 
                onClick={() => refetch()}
                className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-1.5 rounded-lg transition-all shadow-sm text-sm uppercase tracking-wider"
              >
                Aplicar Filtros
              </button>
              <button 
                onClick={() => setFilters({
                  src_ip: '', dst_ip: '', src_port: '', dst_port: '', proto: '', country: '', direction: '', start: '', end: '', order: 'bytes', minutes: '30'
                })}
                className="p-2 bg-bg-primary border border-border rounded-lg text-text-secondary hover:text-text-primary transition-all"
                title="Limpar filtros"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-border/50">
             <div className="flex items-center gap-4">
               <button 
                 onClick={() => setGroupByIP(!groupByIP)}
                 className={clsx(
                   "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                   groupByIP 
                     ? "bg-accent border-accent text-white shadow-md" 
                     : "bg-bg-primary border-border text-text-secondary hover:text-text-primary"
                 )}
               >
                 {groupByIP ? <LayoutGrid size={14} /> : <List size={14} />}
                 Agrupar por IP
               </button>
             </div>
             <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
               {metrics.total} conexões · {filters.direction === 'outgoing' ? '↑ Upload' : filters.direction === 'incoming' ? '↓ Download' : 'Todas Direções'} · período: {filters.start ? 'Customizado' : parseInt(filters.minutes) < 60 ? `${filters.minutes} min` : `${parseInt(filters.minutes)/60}h`}
             </p>
          </div>
       </div>
 
        {/* Table */}
        <div className="bg-bg-secondary rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
               <thead>
                 <tr className="bg-bg-primary/50 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                   <th className="px-6 py-4 border-b border-border">Quando</th>
                   <th className="px-6 py-4 border-b border-border text-center">Direção</th>
                   <th className="px-6 py-4 border-b border-border">IP Origem</th>
                   <th className="px-6 py-4 border-b border-border">IP Destino</th>
                    <th className="px-6 py-4 border-b border-border">Serviço</th>
                    <th className="px-6 py-4 border-b border-border text-center">Protocolo</th>
                    <th className="px-6 py-4 border-b border-border text-center">TCP Flags</th>
                    <th className="px-6 py-4 border-b border-border">Interface ↓/↑</th>
                    <th className="px-6 py-4 border-b border-border">Empresa</th>
                    <SortHeader field="bytes" label="Bytes" align="right" />
                    <SortHeader field="packets" label="PPS" align="right" />
                    <th className="px-6 py-4 border-b border-border text-right">BPP</th>
                    <th className="px-6 py-4 border-b border-border text-right">Duração</th>
                    {isAdmin && <th className="px-6 py-4 border-b border-border text-center">Ação</th>}
                 </tr>
               </thead>
              <tbody className="text-sm divide-y divide-border/50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                     <tr key={i}><td colSpan={14} className="px-6 py-4"><div className="w-full h-8 bg-bg-primary rounded animate-pulse" /></td></tr>
                  ))
                ) : connectionItems.length === 0 ? (
                  <tr>
                     <td colSpan={14} className="px-6 py-12 text-center text-text-secondary italic">
                      Nenhuma conexão encontrada com os filtros atuais
                    </td>
                  </tr>
                ) : (
                  connectionItems.map((item: any, i: number) => {
                    const flipped = shouldFlip(item);
                    const direction = item.flow_direction || (flipped ? 'incoming' : 'outgoing');
                    
                    const src = flipped ? item.dst_addr : item.src_addr;
                    const srcPort = flipped ? item.dst_port : item.src_port;
                    const srcCountry = flipped ? item.dst_country : item.src_country;
                    
                    const dst = flipped ? item.src_addr : item.dst_addr;
                    const dstPort = flipped ? item.src_port : item.dst_port;
                    const dstCountry = flipped ? item.src_country : item.dst_country;
                    
                    const dstOrg = flipped ? item.src_org : item.dst_org;
                    
                    const isSuspicious = item.bytes > 1e9;
  
                     return (
                        <Tooltip key={i} delayDuration={300}>
                          <TooltipTrigger asChild>
                            <tr className="hover:bg-accent/5 transition-colors group cursor-default">
                               <td className="px-6 py-4 text-[10px] text-text-secondary font-mono whitespace-nowrap">
                                 {formatUTC(item.time_received)}
                               </td>
                              <td className="px-6 py-4 text-center">
                                <div className={clsx(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                                  direction === 'outgoing' 
                                    ? "bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" 
                                    : "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                                )}>
                                  {direction === 'outgoing' ? <><ArrowUp size={10} /> Upload</> : <><ArrowDown size={10} /> Download</>}
                                </div>
                              </td>
                         <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                             <span className={clsx("w-2 h-2 rounded-full", isSuspicious ? "bg-danger animate-pulse" : "bg-success")} />
                             <Flag code={srcCountry} />
                              <span className="font-mono font-bold text-text-primary text-xs">{src}</span>
                              {!groupByIP && <span className="text-text-secondary text-[10px]">:{srcPort}</span>}
                           </div>
                         </td>
                         <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                             <Flag code={dstCountry} />
                             <span className="font-mono text-text-primary text-xs">{dst}</span>
                             <span className="text-text-secondary text-[10px]">:{dstPort}</span>
                           </div>
                         </td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] font-bold text-text-primary">{getService(dstPort)}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={clsx(
                            "px-2 py-0.5 rounded text-[9px] font-black uppercase border",
                            item.proto === 6 ? "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400" :
                            item.proto === 17 ? "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400" :
                            item.proto === 1 ? "bg-yellow-50 text-yellow-600 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400" :
                            "bg-gray-50 text-gray-600 border-gray-100"
                          )}>
                            {protoName(item.proto)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 3,
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            background: flagColor(item.tcp_flags) + '20',
                            color: flagColor(item.tcp_flags),
                            border: `1px solid ${flagColor(item.tcp_flags)}40`
                          }}>
                            {item.tcp_flags || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div style={{fontSize:11}}>
                            <span style={{color:'#3b82f6'}}>
                              ↓ {item.in_iface || '—'}
                            </span>
                            <span style={{
                              color:'#8892a4', margin:'0 4px'
                            }}>
                              /
                            </span>
                            <span style={{color:'#22c55e'}}>
                              ↑ {item.out_iface || '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] text-text-secondary font-medium truncate max-w-[120px] inline-block" title={dstOrg}>
                            {dstOrg || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-text-primary text-xs">{fmtBytes(item.bytes)}</td>
                        <td className="px-6 py-4 text-right text-text-secondary">
                          <PPSIntensity pps={calcPPS(item.packets, filters.minutes)} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          {(() => {
                            const bpp = bppLabel(item.bpp);
                            if (!bpp) return <span className="text-text-secondary">—</span>;
                            return (
                              <span 
                                className="font-bold text-xs" 
                                style={{ color: bpp.color }}
                                title={bpp.hint}
                              >
                                {bpp.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-right text-[11px] font-mono text-text-secondary whitespace-nowrap">
                          {fmtDuration(item.duration)}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMitigate(item);
                              }}
                              className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-all"
                              title="Mitigar"
                            >
                              <Shield size={18} />
                            </button>
                          </td>
                        )}
                      </tr>
                    </TooltipTrigger>
                    <TooltipContent className="p-4 w-80 bg-bg-secondary border-border shadow-xl">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-border pb-2">
                          <span className="text-[10px] font-bold uppercase text-text-secondary">Detalhes do Fluxo</span>
                          <span className="text-[10px] font-mono text-text-secondary">{formatUTC(item.time_received)}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold text-text-secondary uppercase">Rede Origem</p>
                            <p className="text-xs font-mono text-text-primary">{item.src_net || '—'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold text-text-secondary uppercase">Rede Destino</p>
                            <p className="text-xs font-mono text-text-primary">{item.dst_net || '—'}</p>
                          </div>
                        </div>

                        <div className="space-y-1 pt-1 border-t border-border/50">
                          <p className="text-[9px] font-bold text-text-secondary uppercase">Next Hop</p>
                          <p className="text-xs font-mono text-text-primary">{item.next_hop || '—'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-1 border-t border-border/50">
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold text-text-secondary uppercase">Duração</p>
                            <p className="text-xs text-text-primary">{fmtDuration(item.duration)}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold text-text-secondary uppercase">BPP</p>
                            <div className="flex items-center gap-1">
                              <p className="text-xs text-text-primary">{item.bpp} Bytes</p>
                              {item.bpp > 0 && (
                                <span className="text-[9px] px-1 rounded bg-bg-primary border border-border" style={{ color: bppLabel(item.bpp)?.color }}>
                                  {bppLabel(item.bpp)?.hint}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 flex flex-col gap-1">
                          <div className="text-[10px] color-[#8892a4] font-mono bg-bg-primary/50 p-1.5 rounded border border-border/30">
                            {item.src_net} → {item.dst_net}
                          </div>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="p-4 border-t border-border bg-bg-primary/30 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-xs text-text-secondary font-bold uppercase tracking-widest">Linhas por página:</span>
              <select 
                value={pageSize} 
                onChange={e => setPageSize(Number(e.target.value))}
                className="bg-bg-primary border border-border rounded px-2 py-1 text-xs text-text-primary outline-none"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
              <span className="text-xs text-text-secondary ml-4">
                Total: <span className="text-text-primary font-bold">{total}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-bg-primary border border-border rounded-lg text-xs font-bold text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all"
              >
                Anterior
              </button>
              <span className="text-xs font-bold text-text-primary px-2">
                Página {page} de {Math.max(1, totalPages)}
              </span>
              <button 
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-bg-primary border border-border rounded-lg text-xs font-bold text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all"
              >
                Próxima
              </button>
            </div>
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
     </TooltipProvider>
   );
 }
