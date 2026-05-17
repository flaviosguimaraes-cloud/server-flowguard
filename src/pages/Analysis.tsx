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
    const calcPPS = (packets: number) => {
      if (!packets) return '—';
      const pps = Math.round(packets / 1800);
      return pps > 1000 ? (pps / 1000).toFixed(1) + 'k' : String(pps);
    };
    const protoName = (p: number) => p === 6 ? 'TCP' : p === 17 ? 'UDP' : p === 1 ? 'ICMP' : String(p);

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

    const buildQuery = () => {
      const params = new URLSearchParams({
        limit: '200',
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
      queryKey: ['connections-analysis', filters],
      queryFn: async () => {
        const q = buildQuery();
        const r = await api.get(`/api/flows/connections?${q}`);
        return r.data;
      },
      staleTime: 0,
      refetchInterval: 30000,
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


