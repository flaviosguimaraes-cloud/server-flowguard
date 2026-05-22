import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';
import { Shield, Flame, Bolt, ShieldCheck, RefreshCw, AlertTriangle, Search, Clock, Zap, X, Info, Settings2, Trash2 } from 'lucide-react';
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

  const saveConfig = useMutation({
    mutationFn: (c: any) => api.put('/api/threats/config/detector', c),
    onSuccess: () => { toast.success('Configuração salva'); setShowConfig(false); }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ameaças</h1>
        <Button variant="outline" onClick={() => setShowConfig(true)}><Settings2 size={16} className="mr-2" /> Configuração</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-gray-500/10 text-gray-500 rounded-xl"><Shield size={24} /></div><div><p className="text-xs font-semibold uppercase text-gray-500">Ameaças Ativas</p><p className="text-2xl font-bold">{summary?.active_total || 0}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-red-500/10 text-red-500 rounded-xl"><Flame size={24} /></div><div><p className="text-xs font-semibold uppercase text-gray-500">Críticas / Altas</p><p className="text-2xl font-bold">{(summary?.critical_count || 0) + (summary?.high_count || 0)}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl"><Bolt size={24} /></div><div><p className="text-xs font-semibold uppercase text-gray-500">FlowSpec sugerido</p><p className="text-2xl font-bold">{summary?.flowspec_suggested || 0}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 bg-green-500/10 text-green-500 rounded-xl"><ShieldCheck size={24} /></div><div><p className="text-xs font-semibold uppercase text-gray-500">Aplicadas (24h)</p><p className="text-2xl font-bold">{summary?.applied_24h || 0}</p></div></CardContent></Card>
      </div>

      <div className="bg-bg-secondary border border-border rounded-xl">
        <Table>
          <TableHeader><TableRow><TableHead>IP</TableHead><TableHead>Tipo</TableHead><TableHead>Severidade</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {threatsLoading ? [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10" /></TableCell></TableRow>) : threats?.map((t: any) => (
              <TableRow key={t.id} className="cursor-pointer hover:bg-bg-primary" onClick={() => setSelectedThreat(t)}>
                <TableCell className="font-mono">{t.ip}</TableCell>
                <TableCell><Badge variant="secondary">{t.attack_type}</Badge></TableCell>
                <TableCell><Badge variant="outline">{t.severity}</Badge></TableCell>
                <TableCell>{t.status}</TableCell>
                <TableCell onClick={e => e.stopPropagation()}>{t.status === 'new' && <Button size="sm" onClick={() => updateStatus.mutate({ id: t.id, status: 'acknowledged' })}>Analisar</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selectedThreat} onOpenChange={() => setSelectedThreat(null)}>
        <SheetContent><SheetHeader><SheetTitle>Detalhes da Ameaça</SheetTitle></SheetHeader><div className="mt-4 space-y-4">
          <p className="text-sm">{selectedThreat?.reasoning}</p>
          {selectedThreat?.status === 'new' && <Button onClick={() => setConfirmModal(selectedThreat)}>Aplicar mitigação</Button>}
        </div></SheetContent>
      </Sheet>

      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent><DialogHeader><DialogTitle>Configuração do Detector</DialogTitle></DialogHeader>
          {config && <div className="space-y-4">
            <div className="flex items-center justify-between"><Label>Detector ativo</Label><Switch checked={config.enabled} onCheckedChange={(e) => setConfig({...config, enabled: e})} /></div>
            <Button onClick={() => saveConfig.mutate(config)}>Salvar</Button>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
