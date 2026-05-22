import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';
import { Shield, Flame, Bolt, ShieldCheck, RefreshCw, AlertTriangle, Search, Clock, Zap, X, Info, Settings2, CheckCircle, XCircle } from 'lucide-react';
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
import { Progress } from "../../components/ui/progress";

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

  const updateStatus = useMutation({
    mutationFn: (data: { id: number, status: string }) => api.patch(`/api/threats/${data.id}/status`, { status: data.status }),
    onSuccess: () => { toast.success('Status atualizado'); queryClient.invalidateQueries({ queryKey: ['threats'] }); setSelectedThreat(null); }
  });

  const applyMitigation = useMutation({
    mutationFn: (data: any) => api.post(`/api/threats/${data.id}/apply`, data),
    onSuccess: () => { toast.success('FlowSpec aplicado com sucesso'); queryClient.invalidateQueries({ queryKey: ['threats'] }); setConfirmModal(null); setSelectedThreat(null); }
  });

  const getAttackTypeBadge = (type: string) => {
    const t = type.toUpperCase();
    let color = "bg-gray-500/10 text-gray-500 border-gray-500/20";
    if (t.includes('ACK_FLOOD')) color = "bg-purple-500/10 text-purple-500 border-purple-500/20";
    else if (t.includes('SYN_FLOOD')) color = "bg-red-500/10 text-red-500 border-red-500/20";
    else if (t.includes('UDP_FLOOD') || t.includes('UDP_AMPLIFICATION')) color = "bg-orange-500/10 text-orange-500 border-orange-500/20";
    else if (t.includes('PORT_SCAN')) color = "bg-blue-500/10 text-blue-500 border-blue-500/20";
    else if (t.includes('BRUTE_FORCE')) color = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    return <Badge className={color}>{type}</Badge>;
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.95) return "bg-red-500";
    if (conf >= 0.88) return "bg-orange-500";
    if (conf >= 0.75) return "bg-amber-500";
    return "bg-gray-500";
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    return mins < 60 ? `há ${mins} min` : `há ${Math.floor(mins/60)} h`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Ameaças</h1>
        <Button variant="outline" size="sm" onClick={() => setShowConfig(true)}><Settings2 size={16} className="mr-2" /> Configuração</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-gray-500/10 text-gray-500 rounded-xl"><Shield size={24} /></div><div><p className="text-xs font-semibold uppercase text-gray-500">Ameaças Ativas</p><p className="text-2xl font-bold">{summary?.active_total || 0}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-red-500/10 text-red-500 rounded-xl"><Flame size={24} /></div><div><p className="text-xs font-semibold uppercase text-gray-500">Críticas / Altas</p><p className="text-2xl font-bold">{(summary?.critical_count || 0) + (summary?.high_count || 0)}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl"><Bolt size={24} /></div><div><p className="text-xs font-semibold uppercase text-gray-500">FlowSpec sugerido</p><p className="text-2xl font-bold">{summary?.flowspec_suggested || 0}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-green-500/10 text-green-500 rounded-xl"><ShieldCheck size={24} /></div><div><p className="text-xs font-semibold uppercase text-gray-500">Aplicadas (24h)</p><p className="text-2xl font-bold">{summary?.applied_24h || 0}</p></div></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="active">Ativas</SelectItem><SelectItem value="acknowledged">Analisando</SelectItem><SelectItem value="applied">Aplicadas</SelectItem><SelectItem value="ignored">Ignoradas</SelectItem></SelectContent></Select>
        <Input placeholder="Buscar IP..." className="w-[200px] bg-bg-secondary" value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} />
        <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw size={16} /></Button>
      </div>

      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>IP</TableHead><TableHead>Tipo</TableHead><TableHead>Protocolo/Porta</TableHead><TableHead>Confiança</TableHead><TableHead>Severidade</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {threatsLoading ? [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>) : threats?.map((t: any) => (
              <TableRow key={t.id} className={`cursor-pointer hover:bg-bg-primary transition-colors ${t.severity === 'critical' ? 'border-l-4 border-l-red-500' : ''}`} onClick={() => setSelectedThreat(t)}>
                <TableCell className="font-mono font-medium">{t.ip}</TableCell>
                <TableCell>{getAttackTypeBadge(t.attack_type)}</TableCell>
                <TableCell className="font-mono text-xs uppercase">{t.protocol} / {t.dst_port}</TableCell>
                <TableCell className="w-32"><div className="space-y-1"><Progress value={t.confidence * 100} className="h-1.5" indicatorClassName={getConfidenceColor(t.confidence)} /><span className="text-[10px] text-text-secondary">{(t.confidence * 100).toFixed(0)}%</span></div></TableCell>
                <TableCell><Badge variant="outline" className={t.severity === 'critical' ? 'text-red-500 border-red-500/20' : t.severity === 'high' ? 'text-orange-500 border-orange-500/20' : ''}>{t.severity}</Badge></TableCell>
                <TableCell><Badge variant="outline">{t.status}</Badge></TableCell>
                <TableCell onClick={e => e.stopPropagation()} className="space-x-2">
                  {(t.status === 'new' || t.status === 'acknowledged') && t.action === 'flowspec' && <Button size="sm" className="bg-purple-600 hover:bg-purple-700 h-8" onClick={() => setConfirmModal(t)}><Zap size={14} className="mr-1" /> Aplicar</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selectedThreat} onOpenChange={() => setSelectedThreat(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle className="text-xl">Detalhes da Ameaça</SheetTitle><SheetDescription className="font-mono">{selectedThreat?.ip}</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Info size={16} /> Diagnóstico</h4>
              <div className="p-4 bg-bg-primary border border-border rounded-lg"><p className="text-xs font-mono leading-relaxed text-text-primary whitespace-pre-wrap">{selectedThreat?.reasoning}</p></div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {selectedThreat?.evidence && Object.entries(selectedThreat.evidence).map(([k, v]: any) => (
                  <div key={k} className="p-2 bg-bg-primary/50 rounded flex justify-between">
                    <span className="text-text-secondary">{k}</span>
                    <span className="font-mono">{typeof v === 'number' ? v.toFixed(k.includes('ratio') ? 4 : 0) : String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
            {selectedThreat?.flowspec_suggestion && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-purple-500"><Zap size={16} /> Regra FlowSpec sugerida</h4>
                <div className="text-xs space-y-2 p-3 bg-purple-500/5 border border-purple-500/10 rounded-lg">
                  <div className="flex justify-between"><span>Destino:</span><span className="font-mono">{selectedThreat.flowspec_suggestion.match.destination}</span></div>
                  <div className="flex justify-between uppercase"><span>Protocolo:</span><span className="font-mono">{selectedThreat.flowspec_suggestion.match.protocol}</span></div>
                  <div className="flex justify-between"><span>Ação:</span><span className="font-mono">Rate-limit {(selectedThreat.flowspec_suggestion.then.rate_limit_bps / 1e6).toFixed(0)} Mbps</span></div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-amber-500/5 border border-amber-500/10 rounded text-[10px] text-amber-600 dark:text-amber-500">
                  <AlertTriangle size={14} className="shrink-0" /> Sugestão do detector. Valide o impacto antes de aplicar.
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2 pt-4">
              {selectedThreat?.status !== 'applied' && selectedThreat?.action === 'flowspec' && <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => setConfirmModal(selectedThreat)}>Aplicar FlowSpec</Button>}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => updateStatus.mutate({ id: selectedThreat.id, status: 'acknowledged' })}>Reconhecer</Button>
                <Button variant="outline" onClick={() => updateStatus.mutate({ id: selectedThreat.id, status: 'ignored' })}>Ignorar</Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!confirmModal} onOpenChange={() => setConfirmModal(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Aplicar mitigação FlowSpec</DialogTitle><DialogDescription>Ação para o IP {confirmModal?.ip}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4 text-sm">
            <div className="p-3 bg-purple-500/5 rounded border border-purple-500/10 space-y-1">
              <p><strong>Destino:</strong> {confirmModal?.flowspec_suggestion?.match?.destination}</p>
              <p><strong>Ação:</strong> Rate-limit {(confirmModal?.flowspec_suggestion?.then?.rate_limit_bps / 1e6).toFixed(0)} Mbps</p>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">Esta ação criará uma regra FlowSpec no roteador Huawei NE-20 via ExaBGP. A regra expira automaticamente após o TTL definido.</p>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setConfirmModal(null)}>Cancelar</Button><Button className="bg-purple-600" onClick={() => applyMitigation.mutate({ id: confirmModal.id, action: 'rate-limit', rate_limit_kbps: confirmModal.flowspec_suggestion.then.rate_limit_bps/1000, ttl_minutes: 60 })}>Aplicar mitigação</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
