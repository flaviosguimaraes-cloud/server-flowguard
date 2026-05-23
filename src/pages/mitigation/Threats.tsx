import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';
import { 
  Shield, Flame, Download, Upload, Clock, 
  ExternalLink, Zap, X, Info, Settings2, 
  ArrowRight, MapPin, Activity, Filter, 
  Search, RefreshCw, AlertTriangle, ChevronRight,
  History, Calendar, CheckCircle2, Globe, Hash,
  Monitor, Users
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/Skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../components/ui/sheet';
import { Separator } from '../../components/ui/separator';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";
import { Progress } from "../../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Flag } from '../../components/Flag';
import { clsx } from 'clsx';

export default function Threats() {

  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedThreat, setSelectedThreat] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('download');
  const [now, setNow] = useState(Date.now());

  // Atualiza o "agora" a cada 30s para o filtro de resolved
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const { data: summary } = useQuery({ 
    queryKey: ['threats-summary'], 
    queryFn: () => api.get('/api/threats/summary').then(r => r.data), 
    refetchInterval: 30000 
  });
  
  const getItems = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.items || data.threats || data.data || data.results || data.records || [];
  };

  const isDownloadThreat = (type: string) => {
    const t = type?.toUpperCase() || '';
    return t.startsWith('ANOMALIA_DOWNLOAD') || 
           t.startsWith('CONNECTION_FLOOD') || 
           t.startsWith('SYN_FLOOD') || 
           t.startsWith('LOW_PACKET_FLOOD') || 
           t.startsWith('UDP_AMPLIFICATION') || 
           t.startsWith('SLOWLORIS') || 
           t.startsWith('PORT_SCAN');
  };

  const isUploadThreat = (type: string) => {
    const t = type?.toUpperCase() || '';
    return t.startsWith('ANOMALIA_UPLOAD') || 
           t.startsWith('OUTGOING_SCAN');
  };

  const { data: threatsData, isLoading: threatsLoading, refetch: refetchThreats } = useQuery({
    queryKey: ['threats', 'all'],
    queryFn: () => api.get('/api/threats/?active_only=true').then(r => r.data),
    refetchInterval: 30000,
  });

  const allThreatsRaw = useMemo(() => getItems(threatsData), [threatsData]);

  const allThreats = useMemo(() => {
    return allThreatsRaw.filter((t: any) => {
      // Não mostrar status expired nunca
      if (t.status === 'expired') return false;
      
      // Detecções com status resolved somem da tela após 5 minutos
      if (t.status === 'resolved' && t.resolved_at) {
        const resolvedAt = new Date(t.resolved_at).getTime();
        const fiveMinutes = 5 * 60 * 1000;
        if (now - resolvedAt > fiveMinutes) return false;
      }
      
      return true;
    });
  }, [allThreatsRaw, now]);

  const downloadThreats = useMemo(() => 
    allThreats.filter((t: any) => isDownloadThreat(t.attack_type)).sort((a: any, b: any) => {
      const fa = Number(a.fator_anomalia) || 0;
      const fb = Number(b.fator_anomalia) || 0;
      return fb - fa;
    }), 
  [allThreats]);

  const uploadThreats = useMemo(() => 
    allThreats.filter((t: any) => isUploadThreat(t.attack_type)).sort((a: any, b: any) => {
      const fa = Number(a.fator_anomalia) || 0;
      const fb = Number(b.fator_anomalia) || 0;
      return fb - fa;
    }), 
  [allThreats]);

  // Define a aba ativa inicial baseada na contagem apenas no primeiro carregamento
  useEffect(() => {
    if (downloadThreats.length > 0 || uploadThreats.length > 0) {
      if (uploadThreats.length > downloadThreats.length && activeTab === 'download') {
        setActiveTab('upload');
      }
    }
  }, [downloadThreats.length, uploadThreats.length]);

  const updateStatus = useMutation({
    mutationFn: (data: { id: number, status: string }) => api.patch(`/api/threats/${data.id}/status`, { status: data.status }),
    onSuccess: () => { 
      toast.success('Status atualizado'); 
      queryClient.invalidateQueries({ queryKey: ['threats'] }); 
      queryClient.invalidateQueries({ queryKey: ['threats-summary'] });
      setSelectedThreat(null); 
    }
  });

  const formatMbps = (value: any) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num === null || num === undefined || isNaN(num)) return '—';
    if (num >= 1000) return `${(num / 1000).toFixed(1)} Gbps`;
    return `${num.toFixed(1)} Mbps`;
  };


  const timeAgo = (date: string) => {
    if (!date) return '—';
    try {
      const diff = Date.now() - new Date(date).getTime();
      const secs = Math.floor(diff / 1000);
      if (isNaN(secs)) return '—';
      if (secs < 60) return `há ${secs}s`;
      const mins = Math.floor(secs / 60);
      if (mins < 60) return `há ${mins}m`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `há ${hrs}h`;
      const days = Math.floor(hrs / 24);
      return `há ${days}d`;
    } catch {
      return '—';
    }
  };

  const isBehavioral = (type: string) => {
    const t = type?.toUpperCase() || '';
    return !t.startsWith('ANOMALIA_') && !t.startsWith('UDP_AMPLIFICATION');
  };

  const getFatorBadge = (value: any, type: string) => {
    const isBeh = isBehavioral(type);
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num === null || num === undefined || isNaN(num)) return <Badge variant="outline">—</Badge>;
    const color = num >= 5 ? 'text-red-500 border-red-500/20 bg-red-500/5' : 
                  num >= 3 ? 'text-yellow-600 border-yellow-600/20 bg-yellow-600/5' : 
                  'text-blue-500 border-blue-500/20 bg-blue-500/5';
    
    const label = isBeh ? `${(num * 10).toFixed(0)}%` : `${num.toFixed(1)}x`;
    return <Badge variant="outline" className={clsx("font-mono", color)}>{label}</Badge>;
  };

  const getReincidenciaBadge = (count: number) => {
    if (!count || count <= 1) return null;
    
    let color = 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    let label = `${count}x`;
    
    if (count >= 10) {
      color = 'bg-red-500/10 text-red-500 border-red-500/20';
      label = `${count}x ⚠`;
    } else if (count >= 5) {
      color = 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    } else if (count >= 2) {
      color = 'bg-yellow-500/10 text-yellow-600 border-yellow-600/20';
    }
    
    return <Badge variant="outline" className={clsx("text-[10px] font-bold h-5 px-1.5", color)}>{label}</Badge>;
  };

  const getAttackTypeBadge = (type: string) => {
    const t = type?.toUpperCase() || '';
    let display = t;
    if (t.startsWith('OUTGOING_SCAN_')) display = 'OUTGOING_SCAN';
    if (t.startsWith('UDP_AMPLIFICATION_')) display = 'UDP_AMPLIFICATION';
    
    if (display.length > 20) display = display.substring(0, 17) + '...';

    let color = 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    
    if (t.startsWith('ANOMALIA_DOWNLOAD')) color = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    else if (t.startsWith('ANOMALIA_UPLOAD')) color = 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    else if (t.startsWith('PORT_SCAN')) color = 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    else if (t.startsWith('SYN_FLOOD') || t.startsWith('CONNECTION_FLOOD') || t.startsWith('LOW_PACKET_FLOOD')) color = 'bg-red-500/10 text-red-500 border-red-500/20';
    else if (t.startsWith('UDP_AMPLIFICATION')) color = 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    else if (t.startsWith('SLOWLORIS')) color = 'bg-yellow-500/10 text-yellow-600 border-yellow-600/20';
    else if (t.startsWith('OUTGOING_SCAN')) color = 'bg-red-900/10 text-red-800 border-red-800/20';
    
    return <Badge variant="outline" className={clsx("text-[10px] font-bold", color)}>{display}</Badge>;
  };

  const getSeverityBadge = (sev: string) => {
    const colors: any = {
      critical: 'text-red-600 border-red-600/20 bg-red-600/10',
      high: 'text-orange-600 border-orange-600/20 bg-orange-600/10',
      medium: 'text-yellow-600 border-yellow-600/20 bg-yellow-600/10',
      low: 'text-blue-600 border-blue-600/20 bg-blue-600/10'
    };
    return <Badge variant="outline" className={clsx("uppercase text-[10px] font-bold", colors[sev] || 'text-gray-500 border-gray-500/20')}>{sev || 'unknown'}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const labels: any = {
      new: { label: 'Nova', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
      acknowledged: { label: 'Analisando', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
      ignored: { label: 'Ignorada', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
      resolved: { label: 'Resolvido', color: 'bg-green-500/10 text-green-600 border-green-500/20' }
    };
    const s = labels[status] || { label: status, color: 'bg-gray-500/10 text-gray-500' };
    return <Badge className={clsx(s.color, "text-[10px]")}>{s.label}</Badge>;
  };

  const filteredDownload = downloadThreats.filter((t: any) => t.ip?.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredUpload = uploadThreats.filter((t: any) => t.ip?.toLowerCase().includes(searchTerm.toLowerCase()));



  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Ameaças</h1>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold uppercase text-[10px]">Detector v2</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetchThreats(); queryClient.invalidateQueries({ queryKey: ['threats-summary'] }); }}>
          <RefreshCw size={16} className={clsx("mr-2", threatsLoading && "animate-spin")} /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-bg-secondary border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-gray-500/10 text-gray-500 rounded-xl"><Activity size={24} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase text-text-secondary tracking-wider">Anomalias Ativas</p>
              <p className="text-2xl font-bold text-text-primary">{allThreats.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-bg-secondary border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-500/10 text-red-500 rounded-xl"><Flame size={24} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase text-red-500 tracking-wider">Alta / Crítica</p>
              <p className="text-2xl font-bold text-red-500">
                {allThreats.filter((t: any) => t.severity === 'high' || t.severity === 'critical').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-bg-secondary border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><Download size={24} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase text-blue-500 tracking-wider">Download Anômalo</p>
              <p className="text-2xl font-bold text-blue-500">{downloadThreats.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-bg-secondary border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Upload size={24} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase text-orange-500 tracking-wider">Upload Anômalo</p>
              <p className="text-2xl font-bold text-orange-500">{uploadThreats.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
          <Input 
            placeholder="Buscar IP..." 
            className="pl-9 bg-bg-secondary border-border" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-bg-secondary border border-border p-1 gap-1">
          <TabsTrigger value="download" className="gap-2 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-500">
            <Download size={14} /> Download <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{downloadThreats.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2 data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-500">
            <Upload size={14} /> Upload <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{uploadThreats.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="download" className="mt-4 space-y-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-text-primary">Download Anômalo</h3>
            <p className="text-xs text-text-secondary">Possíveis ataques vindos da internet para nossos clientes</p>
          </div>
          <ThreatTable 
            threats={filteredDownload} 
            onSelect={setSelectedThreat} 
            type="download" 
            formatMbps={formatMbps}
            getFatorBadge={getFatorBadge}
            getSeverityBadge={getSeverityBadge}
            getStatusBadge={getStatusBadge}
            getAttackTypeBadge={getAttackTypeBadge}
            getReincidenciaBadge={getReincidenciaBadge}
            isBehavioral={isBehavioral}
            timeAgo={timeAgo}
          />
        </TabsContent>

        <TabsContent value="upload" className="mt-4 space-y-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-text-primary">Upload Anômalo</h3>
            <p className="text-xs text-text-secondary">Possíveis clientes infectados gerando tráfego para a internet</p>
          </div>
          <ThreatTable 
            threats={filteredUpload} 
            onSelect={setSelectedThreat} 
            type="upload" 
            formatMbps={formatMbps}
            getFatorBadge={getFatorBadge}
            getSeverityBadge={getSeverityBadge}
            getStatusBadge={getStatusBadge}
            getAttackTypeBadge={getAttackTypeBadge}
            getReincidenciaBadge={getReincidenciaBadge}
            isBehavioral={isBehavioral}
            timeAgo={timeAgo}
          />


        </TabsContent>
      </Tabs>

      <ThreatDrawer 
        threat={selectedThreat} 
        onClose={() => setSelectedThreat(null)} 
        onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
        formatMbps={formatMbps}
        getSeverityBadge={getSeverityBadge}
        getFatorBadge={getFatorBadge}
        getAttackTypeBadge={getAttackTypeBadge}
        isBehavioral={isBehavioral}
        timeAgo={timeAgo}
      />

    </div>
  );
}

function ThreatTable({ 
  threats, 
  onSelect, 
  type, 
  formatMbps, 
  getFatorBadge, 
  getSeverityBadge, 
  getStatusBadge, 
  getAttackTypeBadge,
  getReincidenciaBadge,
  isBehavioral,
  timeAgo 
}: { 
  threats: any[], 
  onSelect: (t: any) => void, 
  type: 'download' | 'upload',
  formatMbps: (v: any) => string,
  getFatorBadge: (v: any, t: string) => any,
  getSeverityBadge: (s: string) => any,
  getStatusBadge: (s: string) => any,
  getAttackTypeBadge: (t: string) => any,
  getReincidenciaBadge: (c: number) => any,
  isBehavioral: (t: string) => boolean,
  timeAgo: (d: string) => string
}) {

  return (
    <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[180px]">{type === 'download' ? 'IP Vítima' : 'IP Cliente'}</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Volume Atual</TableHead>
            <TableHead>Fator</TableHead>
            <TableHead>P95 Normal</TableHead>
            <TableHead>Reincidências</TableHead>
            <TableHead>Primeira Vez</TableHead>
            <TableHead>Último Sinal</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {threats.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-10 text-text-secondary italic">
                Nenhuma anomalia encontrada
              </TableCell>
            </TableRow>
          ) : (
            threats.map((t) => (
              <TableRow 
                key={t.id} 
                className={clsx(
                  "cursor-pointer hover:bg-bg-primary transition-colors group",
                  (Number(t.fator_anomalia) || 0) >= 5 ? "border-l-4 border-l-red-500" : 
                  (Number(t.fator_anomalia) || 0) >= 3 ? "border-l-4 border-l-yellow-500" : "",
                  (t.status === 'ignored' || t.status === 'resolved') && "opacity-60"
                )}
                onClick={() => onSelect(t)}
              >
                <TableCell className="font-mono font-bold text-text-primary">{t.ip || '—'}</TableCell>
                <TableCell>{getAttackTypeBadge(t.attack_type)}</TableCell>
                <TableCell className="font-medium">
                  {isBehavioral(t.attack_type) ? '—' : formatMbps(t.mbps_atual)}
                </TableCell>
                <TableCell>{getFatorBadge(t.fator_anomalia, t.attack_type)}</TableCell>

                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-text-secondary border-b border-dotted border-border cursor-help">
                          {isBehavioral(t.attack_type) ? '—' : formatMbps(t.p95_mbps)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-xs">Volume normal deste IP (P95 das últimas 24h)</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>{getReincidenciaBadge(t.ocorrencias_24h)}</TableCell>
                <TableCell className="text-[10px] text-text-secondary font-mono">
                  {t.primeira_vez_24h ? new Date(t.primeira_vez_24h).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                </TableCell>
                <TableCell className="text-[10px] text-text-secondary font-mono">
                  {timeAgo(t.ultimo_sinal)}
                </TableCell>
                <TableCell>{getStatusBadge(t.status)}</TableCell>
                <TableCell>
                  <ChevronRight size={16} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}



function ThreatDrawer({ 
  threat, 
  onClose, 
  onStatusChange, 
  formatMbps, 
  getSeverityBadge, 
  getFatorBadge, 
  getAttackTypeBadge, 
  isBehavioral,
  timeAgo 
}: { 
  threat: any, 
  onClose: () => void, 
  onStatusChange: (id: number, status: string) => void,
  formatMbps: (v: any) => string,
  getSeverityBadge: (s: string) => any,
  getFatorBadge: (f: any, t: string) => any,
  getAttackTypeBadge: (t: string) => any,
  isBehavioral: (t: string) => boolean,
  timeAgo: (d: string) => string
}) {


  if (!threat) return null;

  const isDownloadThreat = (type: string) => {
    const t = type?.toUpperCase() || '';
    return t.startsWith('ANOMALIA_DOWNLOAD') || 
           t.startsWith('CONNECTION_FLOOD') || 
           t.startsWith('SYN_FLOOD') || 
           t.startsWith('LOW_PACKET_FLOOD') || 
           t.startsWith('UDP_AMPLIFICATION') || 
           t.startsWith('SLOWLORIS') || 
           t.startsWith('PORT_SCAN');
  };

  const isDownload = isDownloadThreat(threat.attack_type);
  const isBeh = isBehavioral(threat.attack_type);
  const evidence = threat.evidence;

  return (
    <Sheet open={!!threat} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-2">
              <Badge className={clsx(
                "font-black uppercase tracking-widest text-[10px] px-2 py-0.5",
                isDownload ? "bg-blue-500 text-white" : "bg-orange-500 text-white"
              )}>
                {isDownload ? 'Download' : 'Upload'}
              </Badge>
              {getAttackTypeBadge(threat.attack_type)}
            </div>
            {getSeverityBadge(threat.severity)}
          </div>
          <SheetTitle className="text-2xl font-mono">{threat.ip || '—'}</SheetTitle>
          <SheetDescription className="hidden">Detalhes da anomalia detectada</SheetDescription>
        </SheetHeader>

        <div className="mt-8 space-y-8 pb-32">
          {/* Seção Resumo */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
              <Activity size={14} /> Resumo da anomalia
            </h4>
            <div className="p-4 bg-bg-primary border border-border rounded-xl space-y-4 shadow-inner">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-semibold text-text-secondary">
                    {isBeh ? 'Confiança' : 'Volume Atual'}
                  </p>
                  <p className="text-lg font-bold text-text-primary">
                    {isBeh ? (() => {
                      const val = threat.fator_anomalia;
                      const f = typeof val === 'string' ? parseFloat(val) : val;
                      return (f !== null && f !== undefined && !isNaN(f)) ? `${(f * 10).toFixed(0)}%` : '—';
                    })() : formatMbps(threat.mbps_atual)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-semibold text-text-secondary">
                    {isBeh ? 'Fator' : 'Normal (P95)'}
                  </p>
                  <p className="text-lg font-bold text-text-primary">
                    {isBeh ? getFatorBadge(threat.fator_anomalia, threat.attack_type) : formatMbps(threat.p95_mbps)}
                  </p>
                </div>
              </div>
              {!isBeh && (
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] uppercase font-semibold text-text-secondary">Fator de Anomalia</p>
                    <span className="text-xs font-bold text-text-primary">
                      {(() => {
                        const val = threat.fator_anomalia;
                        const f = typeof val === 'string' ? parseFloat(val) : val;
                        return (f !== null && f !== undefined && !isNaN(f)) ? `${f.toFixed(1)}x acima` : '—';
                      })()}
                    </span>
                  </div>
                  <div className="h-2 bg-bg-secondary rounded-full overflow-hidden border border-border">
                    <div 
                      className={clsx(
                        "h-full transition-all duration-500",
                        (Number(threat.fator_anomalia) || 0) >= 5 ? "bg-red-500" : "bg-blue-500"
                      )}
                      style={{ width: `${Math.min(((Number(threat.fator_anomalia) || 0) / 10) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-text-secondary leading-relaxed italic">
                    * Este IP está recebendo {(() => {
                      const val = threat.fator_anomalia;
                      const f = typeof val === 'string' ? parseFloat(val) : val;
                      return (f !== null && f !== undefined && !isNaN(f)) ? f.toFixed(1) : '—';
                    })()}x mais tráfego que o normal para este horário.
                  </p>
                </div>
              )}
              {isBeh && (
                <p className="text-[10px] text-text-secondary leading-relaxed italic">
                  * Este ataque foi detectado por padrões comportamentais suspeitos.
                </p>
              )}
            </div>
          </section>

          {/* Seção Janela de Atividade */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
              <Calendar size={14} /> Janela de Atividade
            </h4>
            <div className="p-4 bg-bg-primary border border-border rounded-xl space-y-4 shadow-inner">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] uppercase font-semibold text-text-secondary">Primeira vez hoje</p>
                  <p className="text-xs font-mono text-text-primary">
                    {threat.primeira_vez_24h ? new Date(threat.primeira_vez_24h).toLocaleString() : '—'}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] uppercase font-semibold text-text-secondary">Último sinal confirmado</p>
                  <div className="text-right">
                    <p className="text-xs font-mono text-text-primary">
                      {threat.ultimo_sinal ? new Date(threat.ultimo_sinal).toLocaleString() : '—'}
                    </p>
                    <p className="text-[10px] text-text-secondary">{timeAgo(threat.ultimo_sinal)}</p>
                  </div>
                </div>
                {threat.resolved_at && (
                  <div className="flex justify-between items-center p-2 bg-green-500/5 border border-green-500/10 rounded-lg">
                    <p className="text-[10px] uppercase font-semibold text-green-600 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Resolvido em
                    </p>
                    <p className="text-xs font-mono text-green-600 font-bold">
                      {new Date(threat.resolved_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Seção Histórico de Ocorrências */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={14} /> Histórico de Ocorrências
              </div>
              <span className="text-[10px] normal-case font-medium">Detectado {threat.ocorrencias_24h || 1}x nas últimas 24h</span>
            </h4>
            <div className="p-4 bg-bg-primary border border-border rounded-xl space-y-4 shadow-inner relative overflow-hidden">
              {Array.isArray(threat.historico_horarios) && threat.historico_horarios.length > 0 ? (
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {threat.historico_horarios.map((ts: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 relative">
                      {idx !== threat.historico_horarios.length - 1 && (
                        <div className="absolute left-[5px] top-4 bottom-[-12px] w-[1px] bg-border" />
                      )}
                      <div className="w-2.5 h-2.5 rounded-full bg-primary/40 border border-primary/20 shrink-0" />
                      <div className="flex-1 flex justify-between items-center text-xs">
                        <span className="text-text-primary font-mono">{new Date(ts).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}</span>
                        <span className="text-text-primary font-bold font-mono">{new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-secondary italic text-center py-2">Sem histórico detalhado</p>
              )}
            </div>
          </section>

          {/* Seção Evidências / Origens ou Destinos */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
              <Info size={14} /> {isDownload ? 'Origens do tráfego' : 'Destinos do tráfego'}
            </h4>

            <div className="space-y-3">
              {(() => {
                if (!evidence || (Array.isArray(evidence) && evidence.length === 0) || (typeof evidence === 'object' && Object.keys(evidence).length === 0)) {
                  return <p className="text-xs text-text-secondary italic text-center py-4">Sem evidências detalhadas disponíveis</p>;
                }

                const attackType = threat.attack_type?.toUpperCase() || '';

                // Caso 1: PORT_SCAN (Objeto)
                if (attackType.startsWith('PORT_SCAN') && !Array.isArray(evidence)) {
                  const formatTime = (ts: string) => {
                    if (!ts) return '—';
                    try {
                      const date = new Date(ts);
                      return isNaN(date.getTime()) ? ts : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    } catch { return ts; }
                  };

                  const pktsFlow = evidence.pkts_por_flow || evidence.pkts_flow;
                  const formattedPktsFlow = pktsFlow ? `${Number(pktsFlow).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })} pkts/flow` : '—';

                  return (
                    <div className="p-4 bg-bg-primary border border-border rounded-xl space-y-4 shadow-sm">
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary flex items-center gap-2"><Shield size={12} /> Atacante:</span>
                          <div className="flex items-center gap-2 font-mono font-bold">
                            <Flag code={evidence.pais || evidence.atacante_pais} size={14} />
                            {evidence.atacante_ip}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary flex items-center gap-2"><Globe size={12} /> Localização:</span>
                          <span className="text-text-primary text-right">
                            {(evidence.pais || evidence.atacante_pais) || '—'} / {(evidence.org || evidence.atacante_org) || '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary flex items-center gap-2"><Hash size={12} /> Portas varridas:</span>
                          <span className="font-mono text-text-primary font-bold">
                            {evidence.portas_unicas || evidence.portas_varridas || '—'} portas únicas
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary flex items-center gap-2"><Activity size={12} /> Protocolo / Flows:</span>
                          <span className="font-mono text-text-primary">{evidence.protocolo || '—'} | {evidence.flows || '—'} fluxos</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary flex items-center gap-2"><Zap size={12} /> Pkts/flow:</span>
                          <span className="font-mono text-text-primary">{formattedPktsFlow}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-text-secondary pt-2 border-t border-border/50">
                          <div className="flex items-center gap-1">
                            <Clock size={10} /> {formatTime(evidence.primeira_vez || evidence.periodo_inicio)}
                          </div>
                          <ArrowRight size={10} />
                          <div className="flex items-center gap-1">
                            {formatTime(evidence.ultima_vez || evidence.periodo_fim)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Caso 2: OUTGOING_SCAN (Objeto)
                if (attackType.startsWith('OUTGOING_SCAN') && !Array.isArray(evidence)) {
                  return (
                    <div className="p-4 bg-bg-primary border border-border rounded-xl space-y-4 shadow-sm">
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary flex items-center gap-2"><Monitor size={12} /> Cliente:</span>
                          <span className="font-mono font-bold text-text-primary">{evidence.cliente_ip || threat.ip}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary flex items-center gap-2"><Hash size={12} /> Porta alvo:</span>
                          <span className="font-mono text-text-primary font-bold">{evidence.porta_alvo || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary flex items-center gap-2"><Users size={12} /> Destinos:</span>
                          <span className="font-mono text-text-primary font-bold">{evidence.destinos || '—'} IPs diferentes</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary flex items-center gap-2"><Activity size={12} /> Protocolo:</span>
                          <span className="font-mono text-text-primary">{evidence.protocolo || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary flex items-center gap-2"><Zap size={12} /> Volume:</span>
                          <span className="font-mono text-text-primary font-bold">{evidence.volume || '—'} Mbps</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Caso 3: ANOMALIA (Lista ou Objeto genérico tratado como lista)
                const evidenceList = Array.isArray(evidence) ? evidence : [evidence];
                const formatTime = (ts: string) => {
                  if (!ts) return '—';
                  try {
                    const date = new Date(ts);
                    return isNaN(date.getTime()) ? ts : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  } catch { return ts; }
                };
                
                return evidenceList.map((item: any, idx: number) => (
                  <div key={idx} className="p-4 bg-bg-primary border border-border rounded-xl space-y-3 shadow-sm hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flag code={isDownload ? (item.pais || item.atacante_pais) : (item.pais || item.destino_pais)} size={16} />
                        <span className="font-mono text-sm font-bold text-text-primary">
                          {isDownload ? (item.atacante_ip || item.ip_origem || '—') : (item.destino_ip || item.ip_destino || '—')}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {item.protocolo} {item.tcp_flags && item.tcp_flags !== '-' && `[${item.tcp_flags}]`}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <MapPin size={12} className="shrink-0" />
                      <span className="truncate">{isDownload ? (item.org || item.atacante_org) : (item.org || item.destino_org)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] p-2 bg-bg-secondary/50 rounded-lg border border-border/40">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Portas:</span>
                        <span className="font-mono text-text-primary">
                          {isDownload 
                            ? `${item.atacante_porta || item.porta_origem || 'any'} → ${item.vitima_porta || item.porta_destino || 'any'}` 
                            : `${item.cliente_porta || item.porta_origem || 'any'} → ${item.destino_porta || item.porta_destino || 'any'}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Volume:</span>
                        <span className="font-mono text-text-primary">
                          {(() => {
                            const m = typeof item.mbps === 'string' ? parseFloat(item.mbps) : (item.mbps || item.volume_mbps || item.mbps_atual);
                            return (m !== null && m !== undefined && !isNaN(m)) ? Number(m).toFixed(1) : '—';
                          })()} Mbps
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-text-secondary">BPP:</span>
                        <span className="font-mono text-text-primary">{item.bpp || '—'} bytes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">PPS:</span>
                        <span className="font-mono text-text-primary">{item.pps?.toLocaleString() ?? '—'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-text-secondary opacity-70">
                      <div className="flex items-center gap-1">
                        <Clock size={10} /> {formatTime(item.primeira_vez || item.inicio)}
                      </div>
                      <ArrowRight size={10} />
                      <div className="flex items-center gap-1">
                        {formatTime(item.ultima_vez || item.fim)}
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </section>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-bg-secondary border-t border-border flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="flex-1 h-11 font-bold text-yellow-600 border-yellow-600/20 hover:bg-yellow-600/5" 
              onClick={() => onStatusChange(threat.id, 'acknowledged')}
              disabled={threat.status === 'acknowledged'}
            >
              Reconhecer
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 h-11 font-bold text-gray-500 border-gray-500/20 hover:bg-gray-500/5" 
              onClick={() => onStatusChange(threat.id, 'ignored')}
              disabled={threat.status === 'ignored'}
            >
              Ignorar
            </Button>
          </div>
          <p className="text-[10px] text-center text-text-secondary italic">
            Ações de mitigação automáticas dependem da política configurada.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

