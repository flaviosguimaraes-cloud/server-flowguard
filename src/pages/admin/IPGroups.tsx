import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { 
  Network, Plus, Search, Edit2, Trash2, Shield, 
  Check, X, ChevronRight, Info, AlertTriangle, 
  Zap, Globe, Filter, UserCheck, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { Skeleton } from '@/components/Skeleton';
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, 
  SheetDescription, SheetFooter 
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function IPGroups() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const { data: groups, isLoading } = useQuery({
    queryKey: ['ip-groups'],
    queryFn: () => api.get('/api/ip-groups').then(r => r.data || []),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/ip-groups', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-groups'] });
      toast.success('Grupo criado com sucesso');
      setIsModalOpen(false);
    },
    onError: (err: any) => toast.error(`Erro: ${err.response?.data?.message || err.message}`)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/api/ip-groups/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-groups'] });
      toast.success('Grupo atualizado');
      setIsModalOpen(false);
      setIsDrawerOpen(false);
    },
    onError: (err: any) => toast.error(`Erro: ${err.response?.data?.message || err.message}`)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/ip-groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-groups'] });
      toast.success('Grupo removido');
      setDeleteConfirm(null);
      setIsDrawerOpen(false);
    },
    onError: (err: any) => toast.error(`Erro: ${err.response?.data?.message || err.message}`)
  });

  const filteredGroups = useMemo(() => {
    if (!Array.isArray(groups)) return [];
    return groups.filter((g: any) => 
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [groups, searchTerm]);

  const stats = useMemo(() => {
    if (!Array.isArray(groups)) return { total: 0, ips: 0, autoMitigate: 0, cgnat: 0 };
    return {
      total: groups.length,
      ips: groups.reduce((acc: number, g: any) => acc + (g.prefixes?.length || 0), 0),
      autoMitigate: groups.filter((g: any) => g.auto_mitigate).length,
      cgnat: groups.filter((g: any) => g.is_cgnat).length
    };
  }, [groups]);

  const getGroupBadge = (group: any) => {
    if (group.is_cgnat) return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">CGNAT</Badge>;
    if (group.is_infrastructure) return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">INFRA</Badge>;
    if (group.is_vip) return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">VIP</Badge>;
    return <Badge className="bg-gray-500/20 text-gray-500 border-gray-500/30">PADRÃO</Badge>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Network className="text-primary" size={24} />
          <h1 className="text-2xl font-bold text-text-primary">Grupos de IP</h1>
        </div>
        <Button onClick={() => { setEditingGroup(null); setIsModalOpen(true); }} className="gap-2">
          <Plus size={16} /> Novo Grupo
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-bg-secondary p-4 rounded-xl border border-border flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg text-primary"><Network size={20} /></div>
          <div>
            <p className="text-xs text-text-secondary uppercase font-bold tracking-wider">Total de Grupos</p>
            <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
          </div>
        </div>
        <div className="bg-bg-secondary p-4 rounded-xl border border-border flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500"><Globe size={20} /></div>
          <div>
            <p className="text-xs text-text-secondary uppercase font-bold tracking-wider">Prefixos Mapeados</p>
            <p className="text-2xl font-bold text-text-primary">{stats.ips}</p>
          </div>
        </div>
        <div className="bg-bg-secondary p-4 rounded-xl border border-border flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-lg text-green-500"><Zap size={20} /></div>
          <div>
            <p className="text-xs text-text-secondary uppercase font-bold tracking-wider">Auto-Mitigação</p>
            <p className="text-2xl font-bold text-text-primary">{stats.autoMitigate}</p>
          </div>
        </div>
        <div className="bg-bg-secondary p-4 rounded-xl border border-border flex items-center gap-4">
          <div className="p-3 bg-orange-500/10 rounded-lg text-orange-500"><UserCheck size={20} /></div>
          <div>
            <p className="text-xs text-text-secondary uppercase font-bold tracking-wider">Grupos CGNAT</p>
            <p className="text-2xl font-bold text-text-primary">{stats.cgnat}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <Input 
              placeholder="Buscar grupos..." 
              className="pl-9 bg-bg-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-bg-primary/50 text-text-secondary text-xs uppercase tracking-wider font-bold">
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Prefixos</th>
                <th className="px-6 py-4">Fator Anomalia</th>
                <th className="px-6 py-4">Blackhole</th>
                <th className="px-6 py-4">FlowSpec</th>
                <th className="px-6 py-4">Auto-Mitigar</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8"><Skeleton count={3} /></td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-text-secondary italic">Nenhum grupo encontrado</td>
                </tr>
              ) : filteredGroups.map((group: any) => (
                <tr 
                  key={group.id} 
                  className="hover:bg-bg-primary/30 transition-colors cursor-pointer group"
                  onClick={() => { setSelectedGroup(group); setIsDrawerOpen(true); }}
                >
                  <td className="px-6 py-4">
                    <div className="font-bold text-text-primary">{group.name}</div>
                    <div className="text-xs text-text-secondary truncate max-w-[200px]">{group.description || 'Sem descrição'}</div>
                  </td>
                  <td className="px-6 py-4">{getGroupBadge(group)}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {group.prefixes?.length || 0} prefixos
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="font-mono">{group.anomaly_factor?.toFixed(1)}x</Badge>
                  </td>
                  <td className="px-6 py-4">
                    {group.allow_blackhole ? <Check className="text-success" size={18} /> : <X className="text-destructive" size={18} />}
                  </td>
                  <td className="px-6 py-4">
                    {group.allow_flowspec ? <Check className="text-success" size={18} /> : <X className="text-destructive" size={18} />}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={clsx(group.auto_mitigate ? "bg-green-500/10 text-green-500" : "bg-gray-500/10 text-gray-400")}>
                      {group.auto_mitigate ? 'ATIVO' : 'INATIVO'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={(e) => { e.stopPropagation(); setEditingGroup(group); setIsModalOpen(true); }}
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive" 
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(group); }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation/Edition Modal */}
      <IPGroupModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={editingGroup}
        onSubmit={(data: any) => {
          if (editingGroup) updateMutation.mutate({ id: editingGroup.id, data });
          else createMutation.mutate(data);
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Detail Drawer */}
      <IPGroupDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        group={selectedGroup}
        onEdit={() => { setIsDrawerOpen(false); setEditingGroup(selectedGroup); setIsModalOpen(true); }}
        onSave={(data: any) => updateMutation.mutate({ id: selectedGroup.id, data })}
        onDelete={() => setDeleteConfirm(selectedGroup)}
        isLoading={updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Grupo</DialogTitle>
            <DialogDescription>
              Deseja realmente remover o grupo <strong>{deleteConfirm?.name}</strong>?
              Esta ação removerá a associação de todos os IPs deste grupo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteMutation.mutate(deleteConfirm.id)} 
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IPGroupModal({ isOpen, onClose, data, onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    type: string;
    prefixes: string[];
    anomaly_factor: number;
    anomaly_min_mbps: string | number;
    allow_blackhole: boolean;
    allow_flowspec: boolean;
    auto_mitigate: boolean;
    fnm_threshold_mbps: string | number;
    fnm_threshold_pps: string | number;
    fnm_threshold_flows: number;
    fnm_ban_for_bandwidth: boolean;
    fnm_ban_for_pps: boolean;
    fnm_ban_for_flows: boolean;
    fnm_action: string | null;
  }>({
    name: '',
    description: '',
    type: 'standard',
    prefixes: [],
    anomaly_factor: 1.0,
    anomaly_min_mbps: '',
    allow_blackhole: false,
    allow_flowspec: true,
    auto_mitigate: false,
    fnm_threshold_mbps: '',
    fnm_threshold_pps: '',
    fnm_threshold_flows: 3500,
    fnm_ban_for_bandwidth: true,
    fnm_ban_for_pps: true,
    fnm_ban_for_flows: false,
    fnm_action: null,
  });

  const [newPrefix, setNewPrefix] = useState('');

  useMemo(() => {
    if (data) {
      setFormData({
        name: data.name || '',
        description: data.description || '',
        type: data.is_cgnat ? 'cgnat' : data.is_infrastructure ? 'infrastructure' : data.is_vip ? 'vip' : 'standard',
        prefixes: data.prefixes || [],
        anomaly_factor: data.anomaly_factor || 1.0,
        anomaly_min_mbps: data.anomaly_min_mbps || '',
        allow_blackhole: data.allow_blackhole || false,
        allow_flowspec: data.allow_flowspec || false,
        auto_mitigate: data.auto_mitigate || false,
        
        fnm_threshold_mbps: data.fnm_threshold_mbps || '',
        fnm_threshold_pps: data.fnm_threshold_pps || '',
        fnm_threshold_flows: data.fnm_threshold_flows ?? 3500,
        fnm_ban_for_bandwidth: data.fnm_ban_for_bandwidth ?? true,
        fnm_ban_for_pps: data.fnm_ban_for_pps ?? true,
        fnm_ban_for_flows: data.fnm_ban_for_flows ?? false,
        fnm_action: data.fnm_action || null,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'standard',
        prefixes: [],
        anomaly_factor: 1.0,
        anomaly_min_mbps: '',
        allow_blackhole: false,
        allow_flowspec: true,
        auto_mitigate: false,
        fnm_threshold_mbps: '',
        fnm_threshold_pps: '',
        fnm_threshold_flows: 3500,
        fnm_ban_for_bandwidth: true,
        fnm_ban_for_pps: true,
        fnm_ban_for_flows: false,
        fnm_action: null,
      });
    }
    setNewPrefix('');
  }, [data, isOpen]);

  const addPrefix = () => {
    if (!newPrefix) return;
    const cleanPrefix = newPrefix.trim();
    if (cleanPrefix && !formData.prefixes.includes(cleanPrefix)) {
      setFormData({ ...formData, prefixes: [...formData.prefixes, cleanPrefix] });
      setNewPrefix('');
    }
  };

  const removePrefix = (prefix: string) => {
    setFormData({ ...formData, prefixes: formData.prefixes.filter(p => p !== prefix) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      ...formData,
      is_cgnat: formData.type === 'cgnat',
      is_infrastructure: formData.type === 'infrastructure',
      is_vip: formData.type === 'vip',
      anomaly_min_mbps: formData.anomaly_min_mbps ? Number(formData.anomaly_min_mbps) : null,
      fnm_threshold_mbps: formData.fnm_threshold_mbps ? Number(formData.fnm_threshold_mbps) : null,
      fnm_threshold_pps: formData.fnm_threshold_pps ? Number(formData.fnm_threshold_pps) : null,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data ? 'Editar Grupo' : 'Novo Grupo'}</DialogTitle>
          <DialogDescription>Configure as regras e prefixos para este grupo de IPs.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {/* Seção 1 — Identificação */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Grupo</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="Ex: CGNAT Cluster A"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Grupo</Label>
                <div className="flex gap-2">
                  {[
                    { id: 'standard', label: 'Padrão' },
                    { id: 'cgnat', label: 'CGNAT' },
                    { id: 'infrastructure', label: 'Infra' },
                    { id: 'vip', label: 'VIP' }
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.id })}
                      className={clsx(
                        "flex-1 py-1.5 px-2 text-[10px] font-bold uppercase rounded border transition-all",
                        formData.type === type.id 
                          ? "bg-primary/20 border-primary text-primary" 
                          : "bg-bg-primary border-border text-text-secondary hover:border-primary/50"
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                value={formData.description} 
                onChange={e => setFormData({ ...formData, description: e.target.value })} 
                placeholder="Descreva a finalidade deste grupo..."
                className="h-20"
              />
            </div>
          </div>

          <hr className="border-border" />

          {/* Seção 2 — Prefixos CIDR */}
          <div className="space-y-3">
            <Label>Prefixos CIDR</Label>
            <div className="flex gap-2">
              <Input 
                value={newPrefix} 
                onChange={e => setNewPrefix(e.target.value)}
                placeholder="Ex: 45.175.50.0/25 ou 2804::/32"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addPrefix();
                  }
                }}
              />
              <Button type="button" onClick={addPrefix} variant="outline" size="icon">
                <Plus size={16} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-bg-primary rounded-lg border border-border">
              {formData.prefixes.map(prefix => (
                <Badge key={prefix} variant="secondary" className="gap-1 px-2 py-1">
                  {prefix}
                  <button 
                    type="button" 
                    onClick={() => removePrefix(prefix)}
                    className="hover:text-destructive"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              ))}
              {formData.prefixes.length === 0 && (
                <span className="text-xs text-text-secondary italic">Nenhum prefixo adicionado</span>
              )}
            </div>
            <p className="text-[10px] text-text-secondary">Nota: Use apenas IPv4 ou apenas IPv6 no mesmo grupo.</p>
          </div>

          <hr className="border-border" />

          {/* Seção 3 — Configuração FastNetMon */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text-primary">Configuração FastNetMon</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Threshold Mbps</Label>
                <Input 
                  type="number"
                  value={formData.fnm_threshold_mbps} 
                  onChange={e => setFormData({ ...formData, fnm_threshold_mbps: e.target.value })} 
                  placeholder="Padrão global (1000)"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Threshold PPS</Label>
                <Input 
                  type="number"
                  value={formData.fnm_threshold_pps} 
                  onChange={e => setFormData({ ...formData, fnm_threshold_pps: e.target.value })} 
                  placeholder="Padrão global (100000)"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Threshold Flows</Label>
                <Input 
                  type="number"
                  value={formData.fnm_threshold_flows} 
                  onChange={e => setFormData({ ...formData, fnm_threshold_flows: Number(e.target.value) })} 
                  placeholder="3500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-bg-primary rounded-lg border border-border space-y-3">
                <Label className="text-xs">Gatilhos Ativos</Label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-secondary uppercase font-bold">Banda</span>
                    <Switch 
                      checked={formData.fnm_ban_for_bandwidth} 
                      onCheckedChange={checked => setFormData({ ...formData, fnm_ban_for_bandwidth: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-secondary uppercase font-bold">PPS</span>
                    <Switch 
                      checked={formData.fnm_ban_for_pps} 
                      onCheckedChange={checked => setFormData({ ...formData, fnm_ban_for_pps: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-secondary uppercase font-bold">Flows</span>
                    <Switch 
                      checked={formData.fnm_ban_for_flows} 
                      onCheckedChange={checked => setFormData({ ...formData, fnm_ban_for_flows: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-bg-primary rounded-lg border border-border space-y-2">
                <Label className="text-xs uppercase font-bold text-text-secondary">Ação ao detectar</Label>
                <Select 
                  value={formData.fnm_action || 'global'} 
                  onValueChange={v => setFormData({ ...formData, fnm_action: v === 'global' ? null : v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Política Global</SelectItem>
                    <SelectItem value="flowspec">Apenas FlowSpec</SelectItem>
                    <SelectItem value="blackhole">Blackhole</SelectItem>
                    <SelectItem value="blackhole_flowspec">Blackhole + FlowSpec</SelectItem>
                    <SelectItem value="none">Sem Ação / Monitorar</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-text-secondary italic">Blackhole usa /32 (IPv4) ou /128 (IPv6) automaticamente.</p>
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Seção 4 — Configuração do Detector */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text-primary">Configuração do Detector</h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Fator de Anomalia</Label>
                  <span className="text-xs font-mono font-bold text-primary">{formData.anomaly_factor.toFixed(1)}x</span>
                </div>
                <Slider 
                  value={[formData.anomaly_factor]} 
                  min={0.5} 
                  max={5} 
                  step={0.1} 
                  onValueChange={([val]) => setFormData({ ...formData, anomaly_factor: val })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Mínimo Absoluto (Mbps)</Label>
                <Input 
                  type="number"
                  value={formData.anomaly_min_mbps} 
                  onChange={e => setFormData({ ...formData, anomaly_min_mbps: e.target.value })} 
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 p-3 bg-bg-primary rounded-lg border border-border">
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] font-bold uppercase text-text-secondary">Blackhole permitido</Label>
                <Switch 
                  checked={formData.allow_blackhole} 
                  onCheckedChange={checked => setFormData({ ...formData, allow_blackhole: checked })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] font-bold uppercase text-text-secondary">FlowSpec permitido</Label>
                <Switch 
                  checked={formData.allow_flowspec} 
                  onCheckedChange={checked => {
                    const update: any = { allow_flowspec: checked };
                    if (!checked) update.auto_mitigate = false;
                    setFormData({ ...formData, ...update });
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] font-bold uppercase text-text-secondary">Auto-mitigar</Label>
                <Switch 
                  disabled={!formData.allow_flowspec}
                  checked={formData.auto_mitigate} 
                  onCheckedChange={checked => setFormData({ ...formData, auto_mitigate: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Salvando...' : 'Salvar Grupo'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function IPGroupDrawer({ isOpen, onClose, group, onEdit, onSave, onDelete, isLoading }: any) {
  const [lookupIp, setLookupIp] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);

  const handleLookup = async () => {
    if (!lookupIp) return;
    try {
      const { data } = await api.get(`/api/ip-groups/lookup?ip=${lookupIp}`);
      setLookupResult(data);
    } catch (err) {
      toast.error('Erro ao verificar IP');
    }
  };

  if (!group) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-3">
            <Network className="text-primary" />
            {group.name}
          </SheetTitle>
          <SheetDescription>Detalhes e gerenciamento do grupo de IP.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Descrição</Label>
            <p className="text-sm text-text-secondary bg-bg-primary p-3 rounded-lg border border-border">
              {group.description || 'Sem descrição'}
            </p>
          </div>

          <div className="space-y-3">
            <Label>Prefixos ({group.prefixes?.length || 0})</Label>
            <div className="flex flex-wrap gap-2">
              {group.prefixes?.map((p: string, i: number) => (
                <Badge key={i} variant="secondary" className="font-mono py-1">
                  {p}
                </Badge>
              ))}
              {(!group.prefixes || group.prefixes.length === 0) && (
                <p className="text-xs text-text-secondary italic">Nenhum prefixo associado</p>
              )}
            </div>
          </div>

          <div className="p-4 bg-bg-primary rounded-xl border border-border space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Verificar IP no Grupo</h4>
            <div className="flex gap-2">
              <Input 
                placeholder="Digite um IP (ex: 45.175.50.10)" 
                value={lookupIp}
                onChange={e => setLookupIp(e.target.value)}
              />
              <Button size="sm" onClick={handleLookup}>Verificar</Button>
            </div>
            {lookupResult && (
              <div className={clsx(
                "p-3 rounded-lg border text-sm flex items-center gap-3",
                lookupResult.id === group.id 
                  ? "bg-success/10 border-success/30 text-success" 
                  : "bg-destructive/10 border-destructive/30 text-destructive"
              )}>
                {lookupResult.id === group.id ? <Check size={16} /> : <X size={16} />}
                {lookupResult.id === group.id 
                  ? "O IP pertence a este grupo." 
                  : lookupResult.name 
                    ? `O IP pertence ao grupo: ${lookupResult.name}` 
                    : "O IP não pertence a nenhum grupo."}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-bg-primary p-3 rounded-lg border border-border">
              <p className="text-[10px] text-text-secondary font-bold uppercase">Fator Anomalia</p>
              <p className="text-lg font-bold text-text-primary">{group.anomaly_factor}x</p>
            </div>
            <div className="bg-bg-primary p-3 rounded-lg border border-border">
              <p className="text-[10px] text-text-secondary font-bold uppercase">Mínimo Mbps</p>
              <p className="text-lg font-bold text-text-primary">{group.anomaly_min_mbps || '—'}</p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <Button className="w-full" onClick={onEdit}>
              Editar Configurações
            </Button>
            <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10" onClick={onDelete}>
              Excluir Grupo
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
