import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';
import { Shield, Flame, Bolt, ShieldCheck, RefreshCw, AlertTriangle, Search, Clock, Zap } from 'lucide-react';
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

export default function Threats() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: 'active', severity: 'all', attackType: 'all', search: '' });
  const [selectedThreat, setSelectedThreat] = useState<any>(null);

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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getAttackTypeColor = (type: string) => {
    if (type.includes('ACK_FLOOD')) return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    if (type.includes('SYN_FLOOD')) return 'bg-red-500/10 text-red-500 border-red-500/20';
    if (type.includes('UDP_FLOOD') || type.includes('UDP_AMPLIFICATION')) return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    if (type.includes('PORT_SCAN')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

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
        <Select value={filters.severity} onValueChange={(v) => setFilters(f => ({ ...f, severity: v }))}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
        <Input placeholder="Buscar IP..." className="w-[200px]" value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} />
        <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw size={16} /></Button>
      </div>

      <div className="bg-bg-secondary border border-border rounded-xl">
        <Table>
          <TableHeader><TableRow><TableHead>IP</TableHead><TableHead>Tipo</TableHead><TableHead>Protocolo / Porta</TableHead><TableHead>Confiança</TableHead><TableHead>Severidade</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {threatsLoading ? [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10" /></TableCell></TableRow>) : threats?.map((t: any) => (
              <TableRow key={t.id} className="cursor-pointer hover:bg-bg-primary" onClick={() => setSelectedThreat(t)}>
                <TableCell className="font-mono">{t.ip}</TableCell>
                <TableCell><Badge className={getAttackTypeColor(t.attack_type)}>{t.attack_type}</Badge></TableCell>
                <TableCell className="font-mono uppercase">{t.protocol} / {t.dst_port}</TableCell>
                <TableCell className="w-32"><div className="w-full bg-border rounded-full h-2"><div className="h-full rounded-full" style={{ width: `${t.confidence * 100}%`, backgroundColor: t.confidence >= 0.95 ? '#ef4444' : t.confidence >= 0.88 ? '#f97316' : t.confidence >= 0.75 ? '#f59e0b' : '#6b7280' }} /></div></TableCell>
                <TableCell><Badge className={getSeverityColor(t.severity)}>{t.severity}</Badge></TableCell>
                <TableCell><Badge variant="outline">{t.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selectedThreat} onOpenChange={() => setSelectedThreat(null)}>
        <SheetContent className="w-[400px] sm:w-[500px]">
          <SheetHeader><SheetTitle>Detalhes da Ameaça</SheetTitle><SheetDescription>IP: {selectedThreat?.ip}</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-6">
            <div><h4 className="font-semibold text-sm mb-2">Diagnóstico</h4><p className="p-3 bg-bg-primary rounded text-xs font-mono">{selectedThreat?.reasoning}</p></div>
            <Separator />
            <div><h4 className="font-semibold text-sm mb-2">Persistência</h4><div className="flex items-center gap-2"><Clock size={16} />{selectedThreat?.persistence_windows} janelas consecutivas (60s)</div></div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
