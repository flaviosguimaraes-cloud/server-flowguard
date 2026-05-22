import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';
import { Shield, Flame, Bolt, ShieldCheck, RefreshCw, AlertTriangle, Search, Clock, Zap, X, Info, Settings2, LayoutGrid } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/Skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../components/ui/sheet';
import { Separator } from '../../components/ui/separator';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Switch } from "../../components/ui/switch";
import { Label } from "../../components/ui/label";
import { Slider } from "../../components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";

export default function Threats() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: 'active', severity: 'all', attackType: 'all', search: '' });
  const [selectedThreat, setSelectedThreat] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState<any>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<any>(null);

  const { data: summary } = useQuery({ queryKey: ['threats-summary'], queryFn: () => api.get('/api/threats/summary').then(r => r.data), refetchInterval: 30000 });
  
  const { data: threats, isLoading: threatsLoading, refetch } = useQuery({
    queryKey: ['threats', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.severity !== 'all') params.append('severity', filters.severity);
      if (filters.attackType !== 'all') params.append('attack_type', filters.attackType);
      if (filters.search) params.append('ip', filters.search);
      const r = await api.get('/api/threats?' + params.toString());
      return r.data;
    },
    refetchInterval: 30000,
  });

  const { data: detectorConfig } = useQuery({ queryKey: ['detector-config'], queryFn: () => api.get('/api/threats/config/detector').then(r => r.data), enabled: showConfig });
  useEffect(() => { if (detectorConfig) setConfig(detectorConfig); }, [detectorConfig]);

  const updateStatus = useMutation({
    mutationFn: (data: { id: number, status: string }) => api.patch(`/api/threats/${data.id}/status`, { status: data.status }),
    onSuccess: () => { toast.success('Status atualizado'); queryClient.invalidateQueries({ queryKey: ['threats'] }); setSelectedThreat(null); }
  });

  const applyMitigation = useMutation({
    mutationFn: (data: any) => api.post(`/api/threats/${data.id}/apply`, data),
    onSuccess: () => { toast.success('FlowSpec aplicado com sucesso'); queryClient.invalidateQueries({ queryKey: ['threats'] }); setConfirmModal(null); setSelectedThreat(null); }
  });

  const saveConfig = useMutation({
    mutationFn: (c: any) => api.put('/api/threats/config/detector', c),
    onSuccess: () => { toast.success('Configuração salva'); setShowConfig(false); }
  });

  const getAttackTypeBadge = (type: string) => {
    const attackType = type.toUpperCase();
    let color = "bg-gray-500/10 text-gray-500 border-gray-500/20";
    if (attackType.includes('ACK_FLOOD')) color = "bg-purple-500/10 text-purple-500 border-purple-500/20";
    else if (attackType.includes('SYN_FLOOD')) color = "bg-red-500/10 text-red-500 border-red-500/20";
    else if (attackType.includes('UDP_FLOOD') || attackType.includes('UDP_AMPLIFICATION')) color = "bg-orange-500/10 text-orange-500 border-orange-500/20";
    else if (attackType.includes('PORT_SCAN')) color = "bg-blue-500/10 text-blue-500 border-blue-500/20";
    else if (attackType.includes('BRUTE_FORCE')) color = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    return <Badge className={color}>{type}</Badge>;
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.95) return "bg-red-500";
    if (conf >= 0.88) return "bg-orange-500";
    if (conf >= 0.75) return "bg-amber-500";
    return "bg-gray-500";
  };

  const timeAgo = (date: string) => {
    if (!date) return '—';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `há ${mins} min`;
    const hrs = Math.floor(mins / 60);
    return `há ${hrs} h`;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return { label: 'Nova', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
      case 'acknowledged': return { label: 'Analisando', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
      case 'applied': return { label: 'Aplicada', color: 'bg-green-500/10 text-green-500 border-green-500/20' };
      case 'ignored': return { label: 'Ignorada', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' };
      case 'expired': return { label: 'Expirada', color: 'bg-gray-500/5 text-gray-400 border-gray-500/10 opacity-60' };
      default: return { label: status, color: '' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Ameaças</h1>
        <Button variant="outline" size="sm" onClick={() => setShowConfig(true)}>
          <Settings2 size={16} className="mr-2" /> Configuração
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-gray-500/10 text-gray-500 rounded-xl"><Shield size={24} /></div><div><p className="text-xs font-semibold uppercase text-gray-500">Ameaças Ativas</p><p className="text-2xl font-bold">{summary?.active_total || 0}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-red-500/10 text-red-500 rounded-xl"><Flame size={24} /></div><div><p className="text-xs font-semibold uppercase text-gray-500">Críticas / Altas</p><p className="text-2xl font-bold">{(summary?.critical_count || 0) + (summary?.high_count || 0)}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl"><Bolt size={24} /></div><div><p className="text-xs font-semibold uppercase text-gray-500">FlowSpec sugerido</p><p className="text-2xl font-bold">{summary?.flowspec_suggested || 0}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-green-500/10 text-green-500 rounded-xl"><ShieldCheck size={24} /></div><div><p className="text-xs font-semibold uppercase text-gray-500">Aplicadas (24h)</p><p className="text-2xl font-bold">{summary?.applied_24h || 0}</p></div></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
          <SelectTrigger className="w-[150px] bg-bg-secondary"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="active">Ativas</SelectItem><SelectItem value="acknowledged">Analisando</SelectItem><SelectItem value="applied">Aplicadas</SelectItem><SelectItem value="ignored">Ignoradas</SelectItem></SelectContent>
        </Select>
        <Select value={filters.severity} onValueChange={(v) => setFilters(f => ({ ...f, severity: v }))}>
          <SelectTrigger className="w-[150px] bg-bg-secondary"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
        </Select>
        <Input placeholder="Buscar IP..." className="w-[200px] bg-bg-secondary" value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} />
        <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw size={16} /></Button>
      </div>

      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader><TableRow><TableHead>IP</TableHead><TableHead>Tipo</TableHead><TableHead>Protocolo/Porta</TableHead><TableHead>Confiança</TableHead><TableHead>Severidade</TableHead><TableHead>Persistência</TableHead><TableHead>Status</TableHead><TableHead>Detectada</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {threatsLoading ? [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-10 w-full" /></TableCell></TableRow>) : threats?.map((t: any) => {
              const status = getStatusLabel(t.status);
              return (
                <TableRow key={t.id} className={`cursor-pointer hover:bg-bg-primary transition-colors ${t.severity === 'critical' ? 'border-l-4 border-l-red-500' : ''} ${t.status === 'applied' || t.status === 'expired' ? 'opacity-60' : ''}`} onClick={() => setSelectedThreat(t)}>
                  <TableCell className="font-mono font-medium">{t.ip}</TableCell>
                  <TableCell>{getAttackTypeBadge(t.attack_type)}</TableCell>
                  <TableCell className="font-mono text-[10px] uppercase text-text-secondary">{t.protocol} / {t.dst_port}</TableCell>
                  <TableCell className="w-28">
                    <div className="space-y-1">
                      <div className="w-full bg-border rounded-full h-1 overflow-hidden">
                        <div className={`h-full ${getConfidenceColor(t.confidence)}`} style={{ width: `${t.confidence * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-text-secondary">{(t.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className={t.severity === 'critical' ? 'text-red-500 border-red-500/20 uppercase text-[10px]' : t.severity === 'high' ? 'text-orange-500 border-orange-500/20 uppercase text-[10px]' : 'uppercase text-[10px]'}>{t.severity}</Badge></TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild><div className="flex items-center gap-1.5 text-text-secondary text-[11px]"><LayoutGrid size={12} />{t.persistence_windows} janelas</div></TooltipTrigger>
                        <TooltipContent><p className="text-[11px]">Detectado em {t.persistence_windows} ciclos consecutivos de 60s</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell><Badge className={status.color + " text-[10px]"}>{status.label}</Badge></TableCell>
                  <TableCell className="text-[10px] text-text-secondary">{timeAgo(t.created_at)}</TableCell>
                  <TableCell onClick={e => e.stopPropagation()} className="space-x-1">
                    {(t.status === 'new' || t.status === 'acknowledged') && t.action === 'flowspec' && <Button size="sm" className="bg-purple-600 hover:bg-purple-700 h-7 text-[10px] px-2" onClick={() => setConfirmModal(t)}><Zap size={12} className="mr-1" /> Aplicar</Button>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selectedThreat} onOpenChange={() => setSelectedThreat(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle className="text-xl">Detalhes da Ameaça</SheetTitle><SheetDescription className="font-mono">{selectedThreat?.ip}</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-6 pb-20">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Info size={16} /> Diagnóstico</h4>
              <div className="p-4 bg-bg-primary border border-border rounded-lg shadow-inner"><p className="text-xs font-mono leading-relaxed text-text-primary whitespace-pre-wrap">{selectedThreat?.reasoning}</p></div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {selectedThreat?.evidence && Object.entries(selectedThreat.evidence).map(([k, v]: any) => (
                  <div key={k} className="p-2 bg-bg-primary/50 border border-border/40 rounded flex justify-between"><span className="text-text-secondary">{k}</span><span className="font-mono font-medium">{typeof v === 'number' ? v.toFixed(k.includes('ratio') ? 4 : 0) : String(v)}</span></div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-text-secondary px-1"><Clock size={14} /> Detectado em {selectedThreat?.persistence_windows} janelas consecutivas de 60s</div>
            </div>
            
            {selectedThreat?.flowspec_suggestion && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-purple-500"><Zap size={16} /> Regra FlowSpec sugerida</h4>
                  <div className="text-xs space-y-2 p-4 bg-purple-500/5 border border-purple-500/10 rounded-lg shadow-inner">
                    <div className="flex justify-between"><span>Destino:</span><span className="font-mono font-medium">{selectedThreat.flowspec_suggestion.match.destination}</span></div>
                    <div className="flex justify-between uppercase"><span>Protocolo:</span><span className="font-mono font-medium">{selectedThreat.flowspec_suggestion.match.protocol}</span></div>
                    <div className="flex justify-between uppercase"><span>Porta destino:</span><span className="font-mono font-medium">{selectedThreat.flowspec_suggestion.match.destination_port}</span></div>
                    {selectedThreat.flowspec_suggestion.match.tcp_flags && <div className="flex justify-between uppercase"><span>Flags TCP:</span><span className="font-mono font-medium">{selectedThreat.flowspec_suggestion.match.tcp_flags}</span></div>}
                    <div className="flex justify-between"><span>Ação:</span><span className="font-mono font-medium">Rate-limit {(selectedThreat.flowspec_suggestion.then.rate_limit_bps / 1e6).toFixed(0)} Mbps</span></div>
                    <div className="flex justify-between"><span>TTL sugerido:</span><span className="font-mono font-medium">{Math.floor(selectedThreat.flowspec_suggestion.ttl_seconds / 60)} minutos</span></div>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-amber-500/5 border border-amber-500/10 rounded text-[10px] text-amber-600 dark:text-amber-500">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" /> Sugestão do detector. Valide o impacto antes de aplicar.
                  </div>
                </div>
              </>
            )}

            {selectedThreat?.also_detected?.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Também detectado</h4>
                  <div className="space-y-1">
                    {selectedThreat.also_detected.map((d: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-bg-primary/30 rounded text-xs">
                        <div className="flex items-center gap-2"><span className="font-medium">{d.attack_type}</span><Badge variant="outline" className="text-[10px] px-1 h-4">{(d.confidence * 100).toFixed(0)}%</Badge></div>
                        <span className="text-text-secondary italic">{d.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-bg-secondary border-t border-border flex flex-col gap-2">
            {selectedThreat?.status !== 'applied' && selectedThreat?.action === 'flowspec' && <Button className="w-full bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/20" onClick={() => setConfirmModal(selectedThreat)}>Aplicar FlowSpec</Button>}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="text-xs" onClick={() => updateStatus.mutate({ id: selectedThreat.id, status: 'acknowledged' })}>Reconhecer</Button>
              <Button variant="outline" className="text-xs" onClick={() => updateStatus.mutate({ id: selectedThreat.id, status: 'ignored' })}>Ignorar</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showConfig} onOpenChange={setShowConfig}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader><SheetTitle className="text-xl">Configuração do Detector</SheetTitle><SheetDescription>Ajuste os parâmetros da análise comportamental (detector_v3)</SheetDescription></SheetHeader>
          {config && <div className="mt-8 space-y-8 pb-20 overflow-y-auto max-h-[calc(100vh-180px)] px-1">
            <div className="flex items-center justify-between p-4 bg-bg-primary rounded-xl border border-border shadow-inner">
              <div className="space-y-0.5"><Label className="text-base font-semibold">Detector ativo</Label><p className="text-[11px] text-text-secondary">Habilita/desabilita a análise em tempo real</p></div>
              <Switch checked={config.enabled} onCheckedChange={(e) => setConfig({...config, enabled: e})} />
            </div>
            
            <div className="space-y-5">
              <div className="flex justify-between items-end"><Label className="text-sm font-semibold">Confiança mínima para alertar</Label><span className="text-xs font-mono bg-bg-primary px-2 py-1 rounded border border-border">{(config.min_conf_emit * 100).toFixed(0)}%</span></div>
              <Slider value={[config.min_conf_emit * 100]} min={50} max={99} step={1} onValueChange={([v]) => setConfig({...config, min_conf_emit: v/100})} className="py-2" />
            </div>

            <div className="space-y-5">
              <div className="flex justify-between items-end"><Label className="text-sm font-semibold">Sugerir FlowSpec a partir de</Label><span className="text-xs font-mono bg-bg-primary px-2 py-1 rounded border border-border">{(config.min_conf_flowspec * 100).toFixed(0)}%</span></div>
              <Slider value={[config.min_conf_flowspec * 100]} min={50} max={99} step={1} onValueChange={([v]) => setConfig({...config, min_conf_flowspec: v/100})} className="py-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2"><Label className="text-xs font-semibold text-text-secondary uppercase">Intervalo (seg)</Label><Input type="number" value={config.run_interval_seconds} onChange={e => setConfig({...config, run_interval_seconds: parseInt(e.target.value)})} className="bg-bg-primary" /></div>
              <div className="space-y-2"><Label className="text-xs font-semibold text-text-secondary uppercase">Baseline (horas)</Label><Input type="number" value={config.baseline_hours} onChange={e => setConfig({...config, baseline_hours: parseInt(e.target.value)})} className="bg-bg-primary" /></div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5"><Label className="text-sm font-semibold">Auto-apply habilitado</Label><p className="text-[10px] text-text-secondary">Aplica mitigações críticas automaticamente</p></div>
              <Switch checked={config.auto_apply_enabled} onCheckedChange={(e) => setConfig({...config, auto_apply_enabled: e})} />
            </div>
          </div>}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-bg-secondary border-t border-border flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowConfig(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={() => saveConfig.mutate(config)}>Salvar Alterações</Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!confirmModal} onOpenChange={() => setConfirmModal(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle className="text-xl flex items-center gap-2"><Zap className="text-purple-500" size={20} /> Aplicar mitigação FlowSpec</DialogTitle><DialogDescription>Deseja aplicar a mitigação sugerida para o IP {confirmModal?.ip}?</DialogDescription></DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="p-4 bg-purple-500/5 rounded-xl border border-purple-500/10 space-y-3 shadow-inner">
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <span className="text-text-secondary">Destino:</span><span className="font-mono font-bold text-right">{confirmModal?.flowspec_suggestion?.match?.destination}</span>
                <span className="text-text-secondary">Ação:</span><span className="font-mono font-bold text-right uppercase text-purple-600 dark:text-purple-400">Rate-limit</span>
                <span className="text-text-secondary">Banda limite:</span><span className="font-mono font-bold text-right">{(confirmModal?.flowspec_suggestion?.then?.rate_limit_bps / 1e6).toFixed(0)} Mbps</span>
                <span className="text-text-secondary">TTL (Expiração):</span><span className="font-mono font-bold text-right">{Math.floor(confirmModal?.flowspec_suggestion?.ttl_seconds / 60)} min</span>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
              <Info className="text-blue-500 shrink-0 mt-0.5" size={16} />
              <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed font-medium">Esta ação injetará a regra via BGP (ExaBGP) no roteador Huawei NE-20. A mitigação será removida automaticamente após o TTL.</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmModal(null)}>Cancelar</Button>
            <Button className="flex-1 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/20" onClick={() => applyMitigation.mutate({ id: confirmModal.id, action: 'rate-limit', rate_limit_kbps: confirmModal.flowspec_suggestion.then.rate_limit_bps/1000, ttl_minutes: Math.floor(confirmModal.flowspec_suggestion.ttl_seconds / 60) })}>Aplicar mitigação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
