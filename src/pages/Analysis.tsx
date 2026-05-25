import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { 
  Search, Filter, X, Shield, Globe, Users, Activity,
  ArrowRight, AlertCircle, Download, 
  ArrowUp, ArrowDown, LayoutGrid, List, Clock, ChevronDown
} from 'lucide-react';
import Flag from '../components/Flag';
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

const COUNTRIES = [
  { code: 'BR', name: 'Brasil' }, { code: 'US', name: 'Estados Unidos' }, { code: 'CN', name: 'China' },
  { code: 'DE', name: 'Alemanha' }, { code: 'RU', name: 'Rússia' }, { code: 'NL', name: 'Holanda' },
  { code: 'FR', name: 'França' }, { code: 'GB', name: 'Reino Unido' }, { code: 'JP', name: 'Japão' },
  { code: 'KR', name: 'Coreia do Sul' }, { code: 'IN', name: 'Índia' }, { code: 'CA', name: 'Canadá' },
  { code: 'AU', name: 'Austrália' }, { code: 'SG', name: 'Singapura' }, { code: 'HK', name: 'Hong Kong' },
];

function MetricCard({ title, value, icon, colorClass, bgColorClass }: any) {
  return (
    <div className="fg-metric-card">
      <div className="flex justify-between items-start">
        <div className={clsx("p-2.5 rounded-xl border border-border-main/50", bgColorClass, colorClass)}>
          {icon}
        </div>
        <span className="fg-metric-label">{title}</span>
      </div>
      <div className="fg-metric-value">{value}</div>
    </div>
  );
}

export default function Analysis() {
  const { t } = useTranslation();
  const isAdmin = localStorage.getItem('role') === 'admin';
  const isAuthenticated = !!localStorage.getItem('access_token');
  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(1);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [filters, setFilters] = useState({ src_ip: '', dst_ip: '', src_port: '', dst_port: '', proto: '', country: '', direction: '' });
  const [sortCol, setSortCol] = useState('when');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [groupByIP, setGroupByIP] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [isMitigationOpen, setIsMitigationOpen] = useState(false);
  const [mitigationData, setMitigationData] = useState({ ip: '', proto: '', port: 0 });

  const formatToDateInput = (date: Date) => date.toISOString().split('T')[0];
  const formatToTimeInput = (date: Date) => date.toTimeString().slice(0, 5);

  const [startDate, setStartDate] = useState(formatToDateInput(new Date(Date.now() - 5 * 60000)));
  const [startTime, setStartTime] = useState(formatToTimeInput(new Date(Date.now() - 5 * 60000)));
  const [endDate, setEndDate] = useState(formatToDateInput(new Date()));
  const [endTime, setEndTime] = useState(formatToTimeInput(new Date()));
  const [useCustomRange, setUseCustomRange] = useState(false);

  const protoName = (p: number) => p === 6 ? 'TCP' : p === 17 ? 'UDP' : p === 1 ? 'ICMP' : String(p);
  const isLocalIP = (ip: string) => ip?.startsWith('45.175.50.');
  const fmtBytes = (b: number) => {
    if (!b) return '0 B';
    if (b > 1e12) return (b / 1e12).toFixed(1) + ' TB';
    if (b > 1e9) return (b / 1e9).toFixed(1) + ' GB';
    if (b > 1e6) return (b / 1e6).toFixed(0) + ' MB';
    return (b / 1e3).toFixed(0) + ' KB';
  };

  const { data: connections, isLoading } = useQuery({
    queryKey: ['connections-analysis', searchTrigger, filters, page, pageSize, useCustomRange, startDate, endDate, sortCol, sortDir],
    enabled: isAuthenticated,
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(pageSize), offset: String((page - 1) * pageSize), order: sortDir === 'asc' ? sortCol + '_asc' : sortCol });
      if (useCustomRange) { params.append('start', `${startDate}T${startTime}`); params.append('end', `${endDate}T${endTime}`); } else { params.append('minutes', '5'); }
      if (filters.src_ip) params.append('src_ip', filters.src_ip);
      if (filters.dst_ip) params.append('dst_ip', filters.dst_ip);
      if (filters.proto) params.append('proto', filters.proto);
      const r = await api.get(`/api/flows/connections?${params.toString()}`);
      return r.data;
    },
  });

  const connectionItems = useMemo(() => Array.isArray(connections) ? connections : (connections?.items || []), [connections]);
  const metrics = useMemo(() => ({
    total: connectionItems.length,
    uniqueIPs: new Set(connectionItems.flatMap((i: any) => [i.src_addr, i.dst_addr])).size,
    distinctCountries: new Set(connectionItems.map((i: any) => i.country)).size,
    suspicious: connectionItems.filter((i: any) => i.pps > 10000).length
  }), [connectionItems]);

  return (
    <div className="fg-page">
      <div className="fg-page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <Search size={24} />
          </div>
          <h1 className="fg-section-title">Análise de Tráfego</h1>
        </div>
        <button className="fg-button-secondary gap-2">
          <Download size={18} /> Exportar CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Fluxos" value={metrics.total} icon={<Activity size={20} />} colorClass="text-primary" bgColorClass="bg-primary/10" />
        <MetricCard title="IPs Únicos" value={metrics.uniqueIPs} icon={<Users size={20} />} colorClass="text-success" bgColorClass="bg-success/10" />
        <MetricCard title="Países" value={metrics.distinctCountries} icon={<Globe size={20} />} colorClass="text-warning" bgColorClass="bg-warning/10" />
        <MetricCard title="Alto Volume" value={metrics.suspicious} icon={<AlertCircle size={20} />} colorClass="text-danger" bgColorClass="bg-danger/10" />
      </div>

      {/* Filters Card */}
      <div className="fg-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Filter size={18} className="text-primary" />
          <h2 className="text-sm font-black text-text-main uppercase tracking-widest opacity-80">Filtros Avançados</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">IP Origem</label>
            <input type="text" placeholder="Ex: 192.168.1.1" className="fg-input" value={filters.src_ip} onChange={(e) => setFilters(p => ({...p, src_ip: e.target.value}))} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">IP Destino</label>
            <input type="text" placeholder="Ex: 10.0.0.1" className="fg-input" value={filters.dst_ip} onChange={(e) => setFilters(p => ({...p, dst_ip: e.target.value}))} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Protocolo</label>
            <select className="fg-input appearance-none" value={filters.proto} onChange={(e) => setFilters(p => ({...p, proto: e.target.value}))}>
              <option value="">Todos</option>
              <option value="6">TCP</option>
              <option value="17">UDP</option>
              <option value="1">ICMP</option>
            </select>
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Período</label>
            <div className="flex gap-2">
              <input type="date" className="fg-input !py-1" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <input type="time" className="fg-input !py-1 w-28" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
          </div>
          <div className="flex items-end">
            <button onClick={() => { setUseCustomRange(true); setSearchTrigger(t => t+1); }} className="fg-button-primary w-full gap-2">
              <Search size={16} /> Aplicar
            </button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="fg-table-container">
        <table className="fg-table">
          <thead>
            <tr>
              <th>Horário</th>
              <th>Origem</th>
              <th>Destino</th>
              <th className="text-center">Prot</th>
              <th className="text-right">Volume</th>
              <th className="text-right">PPS</th>
              <th className="text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({length: 5}).map((_, i) => (
                <tr key={i}><td colSpan={7} className="animate-pulse bg-bg-page/20 h-14" /></tr>
              ))
            ) : connectionItems.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-text-muted font-bold italic uppercase tracking-widest opacity-40">Nenhum registro encontrado</td></tr>
            ) : (
              connectionItems.map((item: any, i: number) => (
                <tr key={i} className="group cursor-pointer" onClick={() => setSelectedConnection(item)}>
                  <td className="font-mono text-xs font-bold text-text-muted">{item.when?.split(' ')[1] || '—'}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Flag code={item.country} size={14} className="rounded-sm grayscale group-hover:grayscale-0" />
                      <span className={clsx("font-mono font-bold", isLocalIP(item.src_addr) ? "text-primary" : "text-text-main")}>{item.src_addr}</span>
                    </div>
                  </td>
                  <td className="font-mono font-bold text-text-main">{item.dst_addr}</td>
                  <td className="text-center">
                    <span className={clsx("fg-badge", item.proto === 6 ? "fg-badge-primary" : item.proto === 17 ? "fg-badge-purple" : "fg-badge-warning")}>
                      {protoName(item.proto)}
                    </span>
                  </td>
                  <td className="text-right font-mono font-bold">{fmtBytes(item.bytes)}</td>
                  <td className="text-right font-mono text-xs text-text-muted">{(item.pps || 0).toLocaleString()}</td>
                  <td className="text-center">
                    <button className="p-2 hover:bg-danger/10 text-text-muted hover:text-danger rounded-lg transition-all" title="Bloquear IP">
                      <Shield size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
