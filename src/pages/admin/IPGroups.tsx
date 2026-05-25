import { useState, useMemo, useEffect } from 'react';
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
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { Skeleton } from '@/components/Skeleton';
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, 
  SheetDescription, SheetFooter 
} from '@/components/ui/sheet';
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [deleteProfileConfirm, setDeleteProfileConfirm] = useState<any>(null);

  const { data: groups, isLoading } = useQuery({
    queryKey: ['ip-groups'],
    queryFn: () => api.get('/api/ip-groups').then(r => r.data || []),
  });

  const { data: profiles, isLoading: isLoadingProfiles } = useQuery({
    queryKey: ['mitigation-profiles'],
    queryFn: () => api.get('/api/profiles').then(r => r.data || []),
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

  const createProfileMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/profiles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mitigation-profiles'] });
      toast.success('Perfil criado com sucesso');
      setIsProfileModalOpen(false);
    },
    onError: (err: any) => toast.error(`Erro: ${err.response?.data?.message || err.message}`)
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/api/profiles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mitigation-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['ip-groups'] });
      toast.success('Perfil atualizado');
      setIsProfileModalOpen(false);
    },
    onError: (err: any) => toast.error(`Erro: ${err.response?.data?.message || err.message}`)
  });

  const deleteProfileMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/profiles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mitigation-profiles'] });
      toast.success('Perfil removido');
      setDeleteProfileConfirm(null);
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
    if (!Array.isArray(groups)) return { total: 0, ips: 0 };
    return {
      total: groups.length,
      ips: groups.reduce((acc: number, g: any) => acc + (g.prefixes?.length || 0), 0)
    };
  }, [groups]);

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <th className="px-6 py-4">Prefixos</th>
                <th className="px-6 py-4">Perfil de Mitigação</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8"><Skeleton count={3} /></td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-text-secondary italic">Nenhum grupo encontrado</td>
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
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {group.prefixes?.length || 0} prefixos
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-text-primary">
                        {group.profile?.name || 'Padrão Global'}
                      </span>
                      {group.profile?.description && (
                        <span className="text-[10px] text-text-secondary truncate max-w-[150px]">
                          {group.profile.description}
                        </span>
                      )}
                    </div>
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

      {/* Mitigation Profiles Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-primary" size={20} />
            <h2 className="text-xl font-bold text-text-primary">Perfis de Mitigação</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setEditingProfile(null); setIsProfileModalOpen(true); }} className="gap-2">
            <Plus size={14} /> Novo Perfil
          </Button>
        </div>

        <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-bg-primary/50 text-text-secondary text-xs uppercase tracking-wider font-bold">
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Ação</th>
                  <th className="px-6 py-4">Threshold Mbps</th>
                  <th className="px-6 py-4">Threshold PPS</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoadingProfiles ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8"><Skeleton count={2} /></td>
                  </tr>
                ) : !profiles || profiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-text-secondary italic">Nenhum perfil encontrado</td>
                  </tr>
                ) : profiles.map((profile: any) => (
                  <tr key={profile.id} className="hover:bg-bg-primary/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-text-primary flex items-center gap-2">
                        {profile.name}
                        {profile.is_default && <Badge className="bg-green-500/10 text-green-500 border-none text-[10px]">Padrão</Badge>}
                      </div>
                      <div className="text-xs text-text-secondary truncate max-w-[200px]">{profile.description || 'Sem descrição'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        variant="outline" 
                        className={clsx(
                          "capitalize",
                          profile.action === 'none' && "bg-gray-500/10 text-gray-500 border-gray-500/20",
                          profile.action === 'blackhole' && "bg-red-500/10 text-red-500 border-red-500/20",
                          profile.action === 'flowspec' && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                          profile.action === 'blackhole_flowspec' && "bg-orange-500/10 text-orange-500 border-orange-500/20",
                          profile.action === 'global' && "bg-green-500/10 text-green-500 border-green-500/20"
                        )}
                      >
                        {profile.action === 'flowspec' ? 'FlowSpec' : 
                         profile.action === 'blackhole' ? 'Blackhole' :
                         profile.action === 'blackhole_flowspec' ? 'Blackhole+FS' :
                         profile.action === 'none' ? 'Sem Ação' : 'Global'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {profile.fnm_threshold_mbps || 'Global'}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {profile.fnm_threshold_pps || 'Global'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => { setEditingProfile(profile); setIsProfileModalOpen(true); }}
                        >
                          <Edit2 size={14} />
                        </Button>
                        {!profile.is_default && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive" 
                            onClick={() => setDeleteProfileConfirm(profile)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>


      <IPGroupModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={editingGroup}
        profiles={profiles}
        onSubmit={(data: any) => {
          if (editingGroup) updateMutation.mutate({ id: editingGroup.id, data });
          else createMutation.mutate(data);
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <MitigationProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        data={editingProfile}
        onSubmit={(data: any) => {
          if (editingProfile) updateProfileMutation.mutate({ id: editingProfile.id, data });
          else createProfileMutation.mutate(data);
        }}
        isLoading={createProfileMutation.isPending || updateProfileMutation.isPending}
      />

      <IPGroupDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        group={selectedGroup}
        onEdit={() => { setIsDrawerOpen(false); setEditingGroup(selectedGroup); setIsModalOpen(true); }}
        onSave={(data: any) => updateMutation.mutate({ id: selectedGroup.id, data })}
        onDelete={() => setDeleteConfirm(selectedGroup)}
        isLoading={updateMutation.isPending}
      />

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
    prefixes: string[];
    fnm_threshold_mbps: string | number;
    fnm_threshold_pps: string | number;
    fnm_threshold_flows: string | number;
    fnm_ban_for_bandwidth: boolean;
    fnm_ban_for_pps: boolean;
    fnm_ban_for_flows: boolean;
    fnm_action: string | null;
  }>({
    name: '',
    description: '',
    prefixes: [],
    fnm_threshold_mbps: '',
    fnm_threshold_pps: '',
    fnm_threshold_flows: 3500,
    fnm_ban_for_bandwidth: true,
    fnm_ban_for_pps: true,
    fnm_ban_for_flows: false,
    fnm_action: null,
  });

  const [addressType, setAddressType] = useState<'ipv4' | 'ipv6' | null>(null);
  const [newPrefix, setNewPrefix] = useState('');

  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name || '',
        description: data.description || '',
        prefixes: data.prefixes || [],
        fnm_threshold_mbps: data.fnm_threshold_mbps || '',
        fnm_threshold_pps: data.fnm_threshold_pps || '',
        fnm_threshold_flows: data.fnm_threshold_flows ?? 3500,
        fnm_ban_for_bandwidth: data.fnm_ban_for_bandwidth ?? true,
        fnm_ban_for_pps: data.fnm_ban_for_pps ?? true,
        fnm_ban_for_flows: data.fnm_ban_for_flows ?? false,
        fnm_action: data.fnm_action || null,
      });
      
      // Determine address type from first prefix
      if (data.prefixes && data.prefixes.length > 0) {
        setAddressType(data.prefixes[0].includes(':') ? 'ipv6' : 'ipv4');
      } else {
        setAddressType(null);
      }
    } else {
      setFormData({
        name: '',
        description: '',
        prefixes: [],
        fnm_threshold_mbps: '',
        fnm_threshold_pps: '',
        fnm_threshold_flows: 3500,
        fnm_ban_for_bandwidth: true,
        fnm_ban_for_pps: true,
        fnm_ban_for_flows: false,
        fnm_action: null,
      });
      setAddressType(null);
    }
    setNewPrefix('');
  }, [data, isOpen]);

  const addPrefix = () => {
    if (!newPrefix || !addressType) return;
    
    const cleanPrefix = newPrefix.trim();
    if (!cleanPrefix) return;

    // Validation
    if (addressType === 'ipv4' && cleanPrefix.includes(':')) {
      toast.error('Este grupo aceita apenas prefixos IPv4');
      return;
    }
    if (addressType === 'ipv6' && !cleanPrefix.includes(':')) {
      toast.error('Este grupo aceita apenas prefixos IPv6');
      return;
    }

    if (!formData.prefixes.includes(cleanPrefix)) {
      setFormData({ ...formData, prefixes: [...formData.prefixes, cleanPrefix] });
      setNewPrefix('');
    }
  };

  const removePrefix = (prefix: string) => {
    setFormData({ ...formData, prefixes: formData.prefixes.filter(p => p !== prefix) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.prefixes.length === 0) {
      toast.error('Adicione pelo menos um prefixo');
      return;
    }

    onSubmit({
      ...formData,
      fnm_threshold_mbps: formData.fnm_threshold_mbps ? Number(formData.fnm_threshold_mbps) : null,
      fnm_threshold_pps: formData.fnm_threshold_pps ? Number(formData.fnm_threshold_pps) : null,
      fnm_threshold_flows: formData.fnm_threshold_flows ? Number(formData.fnm_threshold_flows) : null,
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
          {/* SEÇÃO 1 — Identificação */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Grupo</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                placeholder="Ex: Rede Servidores"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea 
                value={formData.description} 
                onChange={e => setFormData({ ...formData, description: e.target.value })} 
                placeholder="Descreva a finalidade deste grupo..."
                className="h-20"
              />
            </div>
          </div>

          <hr className="border-border" />

          {/* SEÇÃO 2 — Tipo de endereço */}
          <div className="space-y-3">
            <Label>Tipo de endereço</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={addressType === 'ipv4' ? 'default' : 'outline'}
                className="flex-1 h-12 gap-2"
                onClick={() => {
                  if (formData.prefixes.length > 0 && addressType === 'ipv6') {
                    if (confirm('Mudar para IPv4 removerá os prefixos IPv6 atuais. Continuar?')) {
                      setFormData({ ...formData, prefixes: [] });
                      setAddressType('ipv4');
                    }
                  } else {
                    setAddressType('ipv4');
                  }
                }}
              >
                <div className={clsx("w-4 h-4 rounded-full border-2 border-current flex items-center justify-center")}>
                  {addressType === 'ipv4' && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                </div>
                IPv4
              </Button>
              <Button
                type="button"
                variant={addressType === 'ipv6' ? 'default' : 'outline'}
                className="flex-1 h-12 gap-2"
                onClick={() => {
                  if (formData.prefixes.length > 0 && addressType === 'ipv4') {
                    if (confirm('Mudar para IPv6 removerá os prefixos IPv4 atuais. Continuar?')) {
                      setFormData({ ...formData, prefixes: [] });
                      setAddressType('ipv6');
                    }
                  } else {
                    setAddressType('ipv6');
                  }
                }}
              >
                <div className={clsx("w-4 h-4 rounded-full border-2 border-current flex items-center justify-center")}>
                  {addressType === 'ipv6' && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                </div>
                IPv6
              </Button>
            </div>
          </div>

          {/* SEÇÃO 3 — Prefixos CIDR */}
          {addressType && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
              <Label>Prefixos CIDR</Label>
              <div className="flex gap-2">
                <Input 
                  value={newPrefix} 
                  onChange={e => setNewPrefix(e.target.value)}
                  placeholder={addressType === 'ipv4' ? "Ex: 192.168.0.0/24" : "Ex: 2001:db8::/32"}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addPrefix();
                    }
                  }}
                />
                <Button type="button" onClick={addPrefix} variant="secondary">
                  Adicionar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-bg-primary rounded-lg border border-border">
                {formData.prefixes.map(prefix => (
                  <Badge key={prefix} variant="secondary" className="gap-1 px-2 py-1 bg-primary/10 text-primary border-primary/20">
                    {prefix}
                    <button 
                      type="button" 
                      onClick={() => removePrefix(prefix)}
                      className="ml-1 hover:text-destructive transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </Badge>
                ))}
                {formData.prefixes.length === 0 && (
                  <span className="text-xs text-text-secondary italic p-1">Nenhum prefixo adicionado</span>
                )}
              </div>
            </div>
          )}

          <hr className="border-border" />

          {/* SEÇÃO 4 — Configuração de Detecção */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text-primary">Configuração de Detecção</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Threshold Mbps</Label>
                <Input 
                  type="number"
                  disabled={!formData.fnm_ban_for_bandwidth}
                  value={formData.fnm_threshold_mbps} 
                  onChange={e => setFormData({ ...formData, fnm_threshold_mbps: e.target.value })} 
                  placeholder="Padrão global (1000)"
                  className={clsx(!formData.fnm_ban_for_bandwidth && "opacity-50")}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Threshold PPS</Label>
                <Input 
                  type="number"
                  disabled={!formData.fnm_ban_for_pps}
                  value={formData.fnm_threshold_pps} 
                  onChange={e => setFormData({ ...formData, fnm_threshold_pps: e.target.value })} 
                  placeholder="Padrão global (100000)"
                  className={clsx(!formData.fnm_ban_for_pps && "opacity-50")}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Threshold Flows</Label>
                <Input 
                  type="number"
                  disabled={!formData.fnm_ban_for_flows}
                  value={formData.fnm_threshold_flows} 
                  onChange={e => setFormData({ ...formData, fnm_threshold_flows: e.target.value })} 
                  placeholder="3500"
                  className={clsx(!formData.fnm_ban_for_flows && "opacity-50")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-bg-primary rounded-lg border border-border space-y-4">
                <Label className="text-xs font-bold uppercase text-text-secondary tracking-wider">Gatilhos Ativos</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Banda</span>
                    <Switch 
                      checked={formData.fnm_ban_for_bandwidth} 
                      onCheckedChange={checked => setFormData({ ...formData, fnm_ban_for_bandwidth: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">PPS</span>
                    <Switch 
                      checked={formData.fnm_ban_for_pps} 
                      onCheckedChange={checked => setFormData({ ...formData, fnm_ban_for_pps: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Flows</span>
                    <Switch 
                      checked={formData.fnm_ban_for_flows} 
                      onCheckedChange={checked => setFormData({ ...formData, fnm_ban_for_flows: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-bg-primary rounded-lg border border-border space-y-3">
                <Label className="text-xs font-bold uppercase text-text-secondary tracking-wider">Ação ao detectar</Label>
                <Select 
                  value={formData.fnm_action || 'global'} 
                  onValueChange={v => setFormData({ ...formData, fnm_action: v === 'global' ? null : v })}
                >
                  <SelectTrigger className="bg-bg-secondary">
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
                <div className="flex items-start gap-2 pt-1">
                  <Info size={12} className="text-text-secondary mt-0.5" />
                  <p className="text-[10px] text-text-secondary leading-tight italic">
                    Blackhole usa /32 para IPv4 e /128 para IPv6 automaticamente.
                  </p>
                </div>
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
          <SheetTitle className="flex items-center gap-3 text-2xl font-bold">
            <Network className="text-primary" size={28} />
            {group.name}
          </SheetTitle>
          <SheetDescription>Detalhes e gerenciamento do grupo de IP.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-text-secondary">Descrição</Label>
            <p className="text-sm text-text-primary bg-bg-primary p-4 rounded-xl border border-border leading-relaxed">
              {group.description || 'Sem descrição'}
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase font-bold text-text-secondary">Prefixos ({group.prefixes?.length || 0})</Label>
            <div className="flex flex-wrap gap-2">
              {group.prefixes?.map((p: string, i: number) => (
                <Badge key={i} variant="secondary" className="font-mono py-1 bg-primary/5 text-primary border-primary/10">
                  {p}
                </Badge>
              ))}
              {(!group.prefixes || group.prefixes.length === 0) && (
                <p className="text-xs text-text-secondary italic">Nenhum prefixo associado</p>
              )}
            </div>
          </div>

          <div className="p-5 bg-bg-primary rounded-xl border border-border space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Verificar IP no Grupo</h4>
            <div className="flex gap-2">
              <Input 
                placeholder="Ex: 192.168.0.10" 
                value={lookupIp}
                onChange={e => setLookupIp(e.target.value)}
                className="bg-bg-secondary"
              />
              <Button onClick={handleLookup}>Verificar</Button>
            </div>
            {lookupResult && (
              <div className={clsx(
                "p-3 rounded-lg border text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-300",
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

          <div className="bg-bg-primary p-5 rounded-xl border border-border space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Limiares de Detecção</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-bg-secondary rounded-lg border border-border">
                <p className="text-[10px] text-text-secondary font-bold uppercase mb-1">Mbps</p>
                <p className="text-lg font-bold text-text-primary">{group.fnm_threshold_mbps || 'Global'}</p>
              </div>
              <div className="p-3 bg-bg-secondary rounded-lg border border-border">
                <p className="text-[10px] text-text-secondary font-bold uppercase mb-1">PPS</p>
                <p className="text-lg font-bold text-text-primary">{group.fnm_threshold_pps || 'Global'}</p>
              </div>
              <div className="p-3 bg-bg-secondary rounded-lg border border-border">
                <p className="text-[10px] text-text-secondary font-bold uppercase mb-1">Flows</p>
                <p className="text-lg font-bold text-text-primary">{group.fnm_threshold_flows || '—'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-6 border-t border-border">
            <Button className="w-full h-11" onClick={onEdit}>
              Editar Configurações
            </Button>
            <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 h-11" onClick={onDelete}>
              Excluir Grupo
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
