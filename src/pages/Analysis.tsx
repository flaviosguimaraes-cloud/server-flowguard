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
import { toast } from 'sonner';
import { 
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider 
} from '../components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet';
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
  const isAuthenticated = !!localStorage.getItem('access_token');

  const MAX_HOURS = 6;
   
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

    const formatTime = (str: string) => {
      if (!str) return '—';
      try {
        const [date, time] = str.split(' ');
        const [y, m, d] = date.split('-');
        const hhmm = time?.slice(0, 5);
        return `${d}/${m} ${hhmm}`;
      } catch {
        return str.slice(0, 16);
      }
    };

    const [pageSize, setPageSize] = useState(100);
    const [page, setPage] = useState(1);
    const [searchTrigger, setSearchTrigger] = useState(0);

    const formatToDateInput = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const formatToTimeInput = (date: Date) => {
      const h = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      return `${h}:${mm}`;
    };

    const toISO = (dateStr: string, timeStr: string) => {
      if (!dateStr || !timeStr) return '';
      return `${dateStr}T${timeStr}`;
    };

    const [startDate, setStartDate] = useState(formatToDateInput(new Date(Date.now() - 5 * 60000)));
    const [startTime, setStartTime] = useState(formatToTimeInput(new Date(Date.now() - 5 * 60000)));
    const [endDate, setEndDate] = useState(formatToDateInput(new Date()));
    const [endTime, setEndTime] = useState(formatToTimeInput(new Date()));
    
    const [useCustomRange, setUseCustomRange] = useState(false);
    const [intervalError, setIntervalError] = useState('');
    const [selectedConnection, setSelectedConnection] = useState<any>(null);

    const handleStartChange = (newDate?: string, newTime?: string) => {
      const d = newDate || startDate;
      const t = newTime || startTime;
      if (newDate) setStartDate(d);
      if (newTime) setStartTime(t);

      const s = new Date(`${d}T${t}`);
      const e = new Date(`${endDate}T${endTime}`);
      
      const diffHours = (e.getTime() - s.getTime()) / 3600000;
      if (diffHours > 2 || diffHours < 0) {
        // Ajustar fim para início + 2h
        const maxEnd = new Date(s.getTime() + 2 * 3600000);
        setEndDate(formatToDateInput(maxEnd));
        setEndTime(formatToTimeInput(maxEnd));
      }
    };

    const handleEndChange = (newDate?: string, newTime?: string) => {
      const d = newDate || endDate;
      const t = newTime || endTime;
      if (newDate) setEndDate(d);
      if (newTime) setEndTime(t);

      const s = new Date(`${startDate}T${startTime}`);
      const e = new Date(`${d}T${t}`);
      const diffHours = (e.getTime() - s.getTime()) / 3600000;
      
      if (diffHours > 2) {
        const maxEnd = new Date(s.getTime() + 2 * 3600000);
        setEndDate(formatToDateInput(maxEnd));
        setEndTime(formatToTimeInput(maxEnd));
      } else if (diffHours < 0) {
        setEndDate(startDate);
        setEndTime(startTime);
      }
    };

    const validateInterval = () => {
      const s = new Date(`${startDate}T${startTime}`);
      const e = new Date(`${endDate}T${endTime}`);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return true;
      
      const diff = e.getTime() - s.getTime();
      const MAX_MS = 2 * 3600 * 1000; // 2 hours
      
      if (diff > MAX_MS) {
        setIntervalError('Intervalo máximo: 2 horas');
        return false;
      }
      if (diff < 0) {
        setIntervalError('Data final deve ser posterior à inicial');
        return false;
      }
      setIntervalError('');
      return true;
    };

    const [filters, setFilters] = useState({
      src_ip: '',
      dst_ip: '',
      src_port: '',
      dst_port: '',
      proto: '',
      country: '',
      direction: ''
    });
    const [sortCol, setSortCol] = useState('when');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const [groupByIP, setGroupByIP] = useState(false);
    const [hoveredMitIP, setHoveredMitIP] = useState<string | null>(null);

    useEffect(() => {
      setPage(1);
    }, [pageSize, filters.src_ip, filters.dst_ip, filters.src_port, filters.dst_port, filters.proto, filters.country, filters.direction, sortCol, sortDir]);

    useEffect(() => {
      setPage(1);
    }, [useCustomRange]);

    const currentIntervalMinutes = useMemo(() => {
      if (!useCustomRange) return 5;
      const s = new Date(`${startDate}T${startTime}`);
      const e = new Date(`${endDate}T${endTime}`);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return 5;
      return Math.max(1, Math.round((e.getTime() - s.getTime()) / 60000));
    }, [useCustomRange, startDate, startTime, endDate, endTime]);

    const SORT_MAP: Record<string, string> = {
      'when':      'recent',
      'bytes':     'bytes',
      'pps':       'pps',
      'bpp':       'bpp',
      'duration':  'duration',
      'src_addr':  'recent',
      'dst_addr':  'recent',
      'proto':     'recent',
      'direction': 'recent',
      'tcp_flags': 'recent',
      'in_iface':  'recent',
      'company':   'recent',
    };

    const buildQuery = useCallback(() => {
      let defaultOrder = 'recent';
      if (useCustomRange) {
        defaultOrder = 'recent_asc';
      }

      const order = sortDir === 'asc' 
        ? (SORT_MAP[sortCol] || defaultOrder) + (SORT_MAP[sortCol] ? '_asc' : '')
        : (SORT_MAP[sortCol] || defaultOrder) + (SORT_MAP[sortCol] === 'recent' && defaultOrder === 'recent_asc' ? '_asc' : '');

      // Simplified order logic for common case
      let finalOrder = sortDir === 'asc' ? (SORT_MAP[sortCol] || 'recent') + '_asc' : (SORT_MAP[sortCol] || 'recent');
      
      // Override if it's the default sort and we have a custom range
      if (sortCol === 'when' && sortDir === 'desc' && useCustomRange) {
        finalOrder = 'recent_asc';
      }

      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
        le: '1000',
        order: finalOrder,
      });

      if (useCustomRange && startDate && endDate) {
        params.append('start', toISO(startDate, startTime));
        params.append('end', toISO(endDate, endTime));
      } else {
        params.append('minutes', '5');
      }

      if (filters.src_ip) {
        if (filters.src_ip.includes('/')) {
          params.append('src_net', filters.src_ip);
        } else {
          params.append('src_ip', filters.src_ip);
        }
      }
      if (filters.dst_ip) {
        if (filters.dst_ip.includes('/')) {
          params.append('dst_net', filters.dst_ip);
        } else {
          params.append('dst_ip', filters.dst_ip);
        }
      }
      if (filters.src_port) params.append('src_port', filters.src_port);
      if (filters.dst_port) params.append('dst_port', filters.dst_port);
      if (filters.proto) params.append('proto', filters.proto);
      if (filters.country) params.append('country', filters.country);
      if (filters.direction) params.append('direction', filters.direction);
      
      return params.toString();
    }, [pageSize, page, useCustomRange, startDate, endDate, filters, sortCol, sortDir]);

    const handleSort = (col: string) => {
      if (sortCol === col) {
        setSortDir(d => d === 'desc' ? 'asc' : 'desc');
      } else {
        setSortCol(col);
        setSortDir('desc');
      }
      setPage(1);
    };

    const SortableHeader = ({
      col, label, align = 'left'
    }: {
      col: string, label: string, align?: 'left' | 'right' | 'center'
    }) => (
      <th
        onClick={() => handleSort(col)}
        className={clsx(
          "px-6 py-4 border-b border-border transition-colors cursor-pointer hover:bg-bg-secondary",
          align === 'right' && 'text-right',
          align === 'center' && 'text-center'
        )}
        style={{
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}>
        <div className={clsx("flex items-center gap-1", align === 'right' && 'justify-end', align === 'center' && 'justify-center')}>
          {label}
          <span style={{
            marginLeft: 4,
            opacity: sortCol === col ? 1 : 0.3,
            fontSize: 10,
          }}>
            {sortCol === col
              ? (sortDir === 'desc' ? ' ↓' : ' ↑')
              : ' ↕'}
          </span>
        </div>
      </th>
    );
   const [isMitigationOpen, setIsMitigationOpen] = useState(false);
   const [mitigationData, setMitigationData] = useState({ ip: '', proto: '', port: 0 });
 
   const { data: countriesData } = useQuery({
     queryKey: ['countries-list'],
     enabled: isAuthenticated,
     queryFn: async () => {
       const r = await api.get('/api/flows/countries?minutes=30');
       return r.data;
     },
   });
 
   const countryList = useMemo(() => {
     const items = countriesData?.items || countriesData?.data || (Array.isArray(countriesData) ? countriesData : []);
     return items.map((c: any) => c.country).sort();
   }, [countriesData]);
 
    const handleSearch = () => {
      setPage(1);
      setSearchTrigger(prev => prev + 1);
    };

    const { data: connections, isLoading, isPlaceholderData } = useQuery({
      queryKey: [
        'connections-analysis', 
        searchTrigger, 
        filters, 
        page, 
        pageSize, 
        useCustomRange,
        startDate, 
        endDate,
        sortCol,
        sortDir
      ],
      enabled: isAuthenticated,
      queryFn: async () => {
        try {
          const q = buildQuery();
          const r = await api.get(`/api/flows/connections?${q}`);
          return r.data;
        } catch (error: any) {
          if (error.response?.status === 400) {
            toast.error(error.response?.data?.detail || "Erro na consulta.");
          }
          throw error;
        }
      },
      staleTime: 0,
      refetchInterval: useCustomRange ? false : 30000,
    });

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
 
    const hasMore = connectionItems.length === pageSize;
    const totalPages = hasMore ? page + 1 : page;

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
        formatTime(i.time_received)
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
 
        <div className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Row 1 */}
            <div className="space-y-1 col-span-1 md:col-span-2">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">De</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex-1 bg-bg-primary/50 border border-border rounded-lg py-1.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-text-primary"
                  value={startDate}
                  onChange={(e) => handleStartChange(e.target.value, undefined)}
                />
                <input
                  type="time"
                  className="w-32 bg-bg-primary/50 border border-border rounded-lg py-1.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-text-primary"
                  value={startTime}
                  onChange={(e) => handleStartChange(undefined, e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1 col-span-1 md:col-span-2">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Até</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex-1 bg-bg-primary/50 border border-border rounded-lg py-1.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-text-primary"
                  value={endDate}
                  onChange={(e) => handleEndChange(e.target.value, undefined)}
                />
                <input
                  type="time"
                  className="w-32 bg-bg-primary/50 border border-border rounded-lg py-1.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-text-primary"
                  value={endTime}
                  onChange={(e) => handleEndChange(undefined, e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">IP Origem</label>
              <input
                type="text"
                placeholder="Ex: 192.168.1.1 ou /24"
                className="w-full bg-bg-primary/50 border border-border rounded-lg py-1.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-text-primary"
                value={filters.src_ip}
                onChange={(e) => setFilters(prev => ({ ...prev, src_ip: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">IP Destino</label>
              <input
                type="text"
                placeholder="Ex: 192.168.1.1 ou /24"
                className="w-full bg-bg-primary/50 border border-border rounded-lg py-1.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-text-primary"
                value={filters.dst_ip}
                onChange={(e) => setFilters(prev => ({ ...prev, dst_ip: e.target.value }))}
              />
            </div>
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

            {/* Row 2 */}
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

            <div className="flex items-end gap-2">
              <button 
                onClick={() => {
                  if (validateInterval()) {
                    setUseCustomRange(true);
                    handleSearch();
                  }
                }}
                className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-1.5 rounded-lg transition-all shadow-sm text-sm uppercase tracking-wider h-[38px]"
              >
                Aplicar
              </button>
              <button 
                onClick={() => {
                  setFilters({ src_ip: '', dst_ip: '', src_port: '', dst_port: '', proto: '', country: '', direction: '' });
                  setSortCol('when');
                  setSortDir('desc');
                  setUseCustomRange(false);
                  const now = new Date();
                  const past = new Date(Date.now() - 5 * 60000);
                  setStartDate(formatToDateInput(past));
                  setStartTime(formatToTimeInput(past));
                  setEndDate(formatToDateInput(now));
                  setEndTime(formatToTimeInput(now));
                  setIntervalError('');
                  handleSearch();
                }}
                className="p-2 bg-bg-primary border border-border rounded-lg text-text-secondary hover:text-text-primary transition-all h-[38px] flex items-center justify-center"
                title="Limpar filtros"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {intervalError && (
            <div className="text-[11px] text-danger font-bold flex items-center gap-1 mt-2">
              <AlertCircle size={14} />
              {intervalError}
            </div>
          )}

          {!intervalError && !useCustomRange && (
            <div className="flex items-center gap-2 text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Exibindo últimos 5 minutos · Atualização automática (30s)
            </div>
          )}

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
             <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">
               {metrics.total} conexões · 
               {filters.direction === 'outgoing' ? '↑ Upload' : filters.direction === 'incoming' ? '↓ Download' : 'Todas Direções'} · 
               {useCustomRange ? 'Intervalo personalizado' : 'Últimos 5 minutos'}
             </div>
          </div>
       </div>
 
        {/* Warning if hits limit */}
        {!isLoading && connectionItems.length >= pageSize && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-3 rounded-lg flex items-center gap-3 text-amber-700 dark:text-amber-400 text-xs font-medium">
            <AlertCircle size={16} />
            <span>Exibindo as {pageSize} conexões de maior volume. Use filtros para refinar.</span>
          </div>
        )}

        {/* Table */}
        <div className="bg-bg-secondary rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
               <thead>
                  <tr className="bg-bg-primary/50 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                    <SortableHeader col="when" label="QUANDO" />
                    <SortableHeader col="direction" label="DIREÇÃO" align="center" />
                    <SortableHeader col="src_addr" label="IP ORIGEM" />
                    <SortableHeader col="dst_addr" label="IP DESTINO" />
                    <th className="px-6 py-4 border-b border-border">SERVIÇO</th>
                    <SortableHeader col="proto" label="PROTOCOLO" align="center" />
                    <SortableHeader col="tcp_flags" label="TCP FLAGS" align="center" />
                    <SortableHeader col="in_iface" label="INTERFACE" />
                    <SortableHeader col="company" label="EMPRESA" />
                    <SortableHeader col="bytes" label="BYTES" align="right" />
                    <SortableHeader col="pps" label="PPS" align="right" />
                    <SortableHeader col="bpp" label="BPP" align="right" />
                    <SortableHeader col="duration" label="DURAÇÃO" align="right" />
                    {isAdmin && <th className="px-6 py-4 border-b border-border text-center">AÇÃO</th>}
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
                            <tr 
                              onClick={() => setSelectedConnection(item)}
                              className={clsx(
                                "hover:bg-accent/5 transition-colors group cursor-pointer",
                                selectedConnection === item && "bg-accent/10 border-l-2 border-accent"
                              )}>
                               <td className="px-6 py-4 text-[10px] text-text-secondary font-mono whitespace-nowrap">
                                 {formatTime(item.time_received)}
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
                         <PPSIntensity pps={calcPPS(item.packets, String(currentIntervalMinutes))} />
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
                           <span className="text-[10px] font-mono text-text-secondary">{formatTime(item.time_received)}</span>
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
              <span className="text-xs text-text-secondary font-bold uppercase tracking-widest">Linhas:</span>
              <div className="flex gap-1">
                {[50, 100, 200, 500].map(size => (
                  <button
                    key={size}
                    onClick={() => {
                      setPageSize(size);
                      setPage(1);
                    }}
                    className={clsx(
                      "px-2 py-1 rounded text-xs font-bold transition-all border",
                      pageSize === size
                        ? "bg-primary border-primary text-white"
                        : "bg-bg-primary border-border text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-bg-primary border border-border rounded-lg text-xs font-bold text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all"
                >
                  ← Anterior
                </button>
                <span className="text-xs font-bold text-text-primary px-2">
                  Página {page}
                </span>
                <button 
                  disabled={!hasMore}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 bg-bg-primary border border-border rounded-lg text-xs font-bold text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all"
                >
                  Próxima →
                </button>
              </div>
              
              <div className="text-xs text-text-secondary font-medium bg-bg-primary/50 px-3 py-1.5 rounded-lg border border-border/50">
                Exibindo <span className="text-text-primary font-bold">
                  {connectionItems.length > 0 ? (page - 1) * pageSize + 1 : 0}-{(page - 1) * pageSize + connectionItems.length}
                </span> de <span className="text-text-primary font-bold">
                  {hasMore ? `${page * pageSize}+` : (page - 1) * pageSize + connectionItems.length}
                </span> conexões
              </div>
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
