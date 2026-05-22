import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';
import { Shield, Flame, Bolt, ShieldCheck, RefreshCw, AlertTriangle, Search, Clock, Zap, X, Info, Settings2, Trash2, ArrowRight, MousePointer2, ExternalLink, MapPin, Target, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/Skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '../../components/ui/sheet';
import { Separator } from '../../components/ui/separator';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Slider } from "../../components/ui/slider";
import { Switch } from "../../components/ui/switch";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";

export default function Threats() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: 'active', severity: 'all', attackType: 'all', search: '' });
  const [selectedThreat, setSelectedThreat] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState<any>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<any>(null);


  const { data: summary } = useQuery({
    queryKey: ['threats-summary'],
    queryFn: () => api.get('/api/threats/summary').then(r => r.data),
    refetchInterval: 30000,
  });

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
    onSuccess: () => {
      toast.success('Status atualizado');
      queryClient.invalidateQueries({ queryKey: ['threats'] });
      setSelectedThreat(null);
    }
  });

  const applyFlowSpec = useMutation({
    mutationFn: (data: { id: number, action: string, rate_limit_kbps: number, ttl_minutes: number }) => api.post(`/api/threats/${data.id}/apply`, data),
    onSuccess: () => {
      toast.success('FlowSpec aplicado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['threats'] });
      setConfirmModal(null);
      setSelectedThreat(null);
    }
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-gray-500/10 text-gray-500 rounded-xl"><Shield size={24} /></div><div><p className="text-xs font-semibold uppercase text-gray-500">Ameaças Ativas</p><p className="text-2xl font-bold">{summary?.active_total || 0}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-red-500/10 text-red-500 rounded-xl"><Flame size={24} /></div><div><p className="text-xs font-semibold uppercase text-gray-500">Críticas / Altas</p><p className="text-2xl font-bold">{(summary?.critical_count || 0) + (summary?.high_count || 0)}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl"><Bolt size={24} /></div><div><p className="text-xs font-semibold uppercase text-gray-500">FlowSpec sugerido</p><p className="text-2xl font-bold">{summary?.flowspec_suggested || 0}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-green-500/10 text-green-500 rounded-xl"><ShieldCheck size={24} /></div><div><p className="text-xs font-semibold uppercase text-gray-500">Aplicadas (24h)</p><p className="text-2xl font-bold">{summary?.applied_24h || 0}</p></div></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="active">Ativas</SelectItem><SelectItem value="acknowledged">Analisando</SelectItem><SelectItem value="applied">Aplicadas</SelectItem><SelectItem value="ignored">Ignoradas</SelectItem></SelectContent></Select>
        <Input placeholder="Buscar IP..." className="w-[200px]" value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} />
        <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw size={16} /></Button>
      </div>

      <div className="bg-bg-secondary border border-border rounded-xl">
        <Table>
          <TableHeader><TableRow><TableHead>IP</TableHead><TableHead>Tipo</TableHead><TableHead>Severidade</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {threatsLoading ? [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10" /></TableCell></TableRow>) : threats?.map((t: any) => (
              <TableRow key={t.id} className="cursor-pointer hover:bg-bg-primary" onClick={() => setSelectedThreat(t)}>
                <TableCell className="font-mono">{t.ip}</TableCell>
                <TableCell><Badge className="bg-purple-500/10 text-purple-500">{t.attack_type}</Badge></TableCell>
                <TableCell><Badge className={t.severity === 'critical' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}>{t.severity}</Badge></TableCell>
                <TableCell><Badge variant="outline">{t.status}</Badge></TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  {t.status === 'new' && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: t.id, status: 'acknowledged' })}>Reconhecer</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selectedThreat} onOpenChange={() => setSelectedThreat(null)}>
        <SheetContent className="w-[500px]">
          <SheetHeader><SheetTitle>Detalhes da Ameaça</SheetTitle></SheetHeader>
          {selectedThreat && (
            <div className="mt-6 space-y-6">
              <div><h4 className="text-sm font-semibold mb-2">Diagnóstico</h4><p className="p-3 bg-bg-primary rounded text-xs font-mono">{selectedThreat.reasoning}</p></div>
              <div className="flex gap-2">
                {selectedThreat.action === 'flowspec' && <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setConfirmModal(selectedThreat)}>Aplicar FlowSpec</Button>}
                <Button variant="secondary" onClick={() => updateStatus.mutate({ id: selectedThreat.id, status: 'ignored' })}>Ignorar</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!confirmModal} onOpenChange={() => setConfirmModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aplicar mitigação FlowSpec</DialogTitle><DialogDescription>Deseja aplicar a regra sugerida para {confirmModal?.ip}?</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setConfirmModal(null)}>Cancelar</Button><Button className="bg-purple-600" onClick={() => applyFlowSpec.mutate({ id: confirmModal.id, action: 'discard', rate_limit_kbps: 0, ttl_minutes: 60 })}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
