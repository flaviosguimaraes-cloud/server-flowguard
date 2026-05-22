import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';
import { 
  Shield, Flame, Download, Upload, Clock, 
  ExternalLink, Zap, X, Info, Settings2, 
  ArrowRight, MapPin, Activity, Filter, 
  Search, RefreshCw, AlertTriangle, ChevronRight
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

  const sortByFator = (a: any, b: any) => {
    const fa = Number(a.fator_anomalia) || 0;
    const fb = Number(b.fator_anomalia) || 0;
    return fb - fa;
  };

  const allThreats = useMemo(() => getItems(threatsData), [threatsData]);

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
      return `há ${hrs}h`;
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
      ignored: { label: 'Ignorada', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' }
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
            <TableHead>Severidade</TableHead>
            <TableHead>Detectada</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {threats.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-10 text-text-secondary italic">
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
                  t.status === 'ignored' && "opacity-50"
                )}
                onClick={() => onSelect(t)}
              >
                <TableCell className="font-mono font-bold text-text-primary">{t.ip || '—'}</TableCell>
                <TableCell>{getAttackTypeBadge(t.attack_type)}</TableCell>
                <TableCell className="font-medium">{formatMbps(t.mbps_atual)}</TableCell>
                <TableCell>{getFatorBadge(t.fator_anomalia)}</TableCell>

                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-text-secondary border-b border-dotted border-border cursor-help">
                          {formatMbps(t.p95_mbps)}
                        </span>

                      </TooltipTrigger>
                      <TooltipContent><p className="text-xs">Volume normal deste IP (P95 das últimas 24h)</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>{getSeverityBadge(t.severity)}</TableCell>
                <TableCell className="text-[11px] text-text-secondary">{timeAgo(t.created_at)}</TableCell>
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


function ThreatDrawer({ threat, onClose, onStatusChange, formatMbps, getSeverityBadge, getFatorBadge, getAttackTypeBadge }: { 
  threat: any, 
  onClose: () => void, 
  onStatusChange: (id: number, status: string) => void,
  formatMbps: (v: any) => string,
  getSeverityBadge: (s: string) => any,
  getFatorBadge: (f: any) => any,
  getAttackTypeBadge: (t: string) => any
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
  const evidence = Array.isArray(threat.evidence) ? threat.evidence : [];

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
                  <p className="text-[10px] uppercase font-semibold text-text-secondary">Volume Atual</p>
                  <p className="text-lg font-bold text-text-primary">{formatMbps(threat.mbps_atual)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-semibold text-text-secondary">Normal (P95)</p>
                  <p className="text-lg font-bold text-text-primary">{formatMbps(threat.p95_mbps)}</p>
                </div>
              </div>
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
            </div>
          </section>

          {/* Seção Evidências / Origens ou Destinos */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
              <Info size={14} /> {isDownload ? 'Origens do tráfego' : 'Destinos do tráfego'}
            </h4>
            <div className="space-y-3">
              {evidence.length === 0 ? (
                <p className="text-xs text-text-secondary italic text-center py-4">Sem evidências detalhadas disponíveis</p>
              ) : (
                evidence.map((item: any, idx: number) => (
                  <div key={idx} className="p-4 bg-bg-primary border border-border rounded-xl space-y-3 shadow-sm hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flag code={isDownload ? item.atacante_pais : item.destino_pais} size={16} />
                        <span className="font-mono text-sm font-bold text-text-primary">
                          {isDownload ? item.atacante_ip : item.destino_ip}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {item.protocolo} {item.tcp_flags !== '-' && `[${item.tcp_flags}]`}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <MapPin size={12} className="shrink-0" />
                      <span className="truncate">{isDownload ? item.atacante_org : item.destino_org}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] p-2 bg-bg-secondary/50 rounded-lg border border-border/40">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Portas:</span>
                        <span className="font-mono text-text-primary">
                          {isDownload ? `${item.atacante_porta} → ${item.vitima_porta}` : `${item.cliente_porta} → ${item.destino_porta}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Volume:</span>
                        <span className="font-mono text-text-primary">
                          {(() => {
                            const m = typeof item.mbps === 'string' ? parseFloat(item.mbps) : item.mbps;
                            return (m !== null && m !== undefined && !isNaN(m)) ? m.toFixed(1) : '—';
                          })()} Mbps
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-text-secondary">PPS:</span>
                        <span className="font-mono text-text-primary">{item.pps?.toLocaleString() ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">BPP:</span>
                        <span className="font-mono text-text-primary">{item.bpp || '—'} bytes</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-text-secondary opacity-70">
                      <div className="flex items-center gap-1"><Clock size={10} /> {item.primeira_vez || '—'}</div>
                      <ArrowRight size={10} />
                      <div className="flex items-center gap-1">{item.ultima_vez || '—'}</div>
                    </div>
                  </div>
                ))
              )}
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

