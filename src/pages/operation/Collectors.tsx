import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Server, Eye, X, Clock, Plus, Edit2, Trash2, Power, PowerOff } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/Skeleton';

export default function Collectors() {
  const queryClient = useQueryClient();
  const isAdmin = localStorage.getItem('role') === 'admin';
  
  const [modal, setModal] = useState<{ open: boolean; mode: 'add' | 'edit'; data?: any }>({
    open: false,
    mode: 'add'
  });
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
  const [openIfaces, setOpenIfaces] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['collectors'],
    queryFn: () => api.get('/api/collectors').then(r => r.data).catch(() => ({ items: [] })),
    refetchInterval: 30000,
  });
  const items = data?.items || data?.data || (Array.isArray(data) ? data : []);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/collectors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collectors'] });
      toast.success('Coletor criado com sucesso');
      setModal({ open: false, mode: 'add' });
    },
    onError: (err: any) => toast.error(`Erro: ${err.response?.data?.message || err.message}`)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/api/collectors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collectors'] });
      toast.success('Coletor atualizado');
      setModal({ open: false, mode: 'add' });
    },
    onError: (err: any) => toast.error(`Erro: ${err.response?.data?.message || err.message}`)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/collectors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collectors'] });
      toast.success('Coletor removido');
      setDeleteConfirm(null);
    },
    onError: (err: any) => toast.error(`Erro: ${err.response?.data?.message || err.message}`)
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="text-primary" size={24} />
          <h1 className="text-2xl font-bold text-text-primary">Coletores</h1>
        </div>
        {isAdmin && (
          <Button onClick={() => setModal({ open: true, mode: 'add' })} className="gap-2">
            <Plus size={16} /> Novo Coletor
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton count={4} />
      ) : items.length === 0 ? (
        <div className="bg-bg-secondary p-12 rounded-xl border border-border text-center text-text-secondary italic">Nenhum coletor configurado</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((c: any, i: number) => {
            return (
              <CollectorCard 
                key={c.id || i} 
                collector={c} 
                isAdmin={isAdmin}
                onEdit={() => setModal({ open: true, mode: 'edit', data: c })}
                onDelete={() => setDeleteConfirm(c)}
                onToggle={(active) => updateMutation.mutate({ id: c.id, data: { ...c, active } })}
                onViewIfaces={(name, ifaces) => setOpenIfaces({ name, ifaces })}
              />
            );
          })}
        </div>
      )}

      {/* Modals and other stuff */}
      <CollectorModal 
        isOpen={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        mode={modal.mode}
        data={modal.data}
        onSubmit={(data: any) => {
          if (modal.mode === 'add') createMutation.mutate(data);
          else updateMutation.mutate({ id: modal.data.id, data });
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Coletor</DialogTitle>
            <DialogDescription>
              Remover coletor <strong>{deleteConfirm?.name}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {openIfaces && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpenIfaces(null)}>
          <div className="bg-bg-secondary border border-border rounded-xl shadow-2xl w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-text-primary">Interfaces de {openIfaces.name}</h3>
              <button onClick={() => setOpenIfaces(null)} className="text-text-secondary hover:text-text-primary"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto p-4 space-y-1">
              {openIfaces.ifaces.map((iface: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-bg-primary rounded-lg border border-border">
                  <span className="font-mono text-sm text-text-primary">{typeof iface === 'string' ? iface : (iface.name || iface.ifname || iface.alias || JSON.stringify(iface))}</span>
                  {typeof iface === 'object' && iface.status && (
                    <span className="text-[10px] font-bold uppercase text-text-secondary">{iface.status}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CollectorCard({ collector, isAdmin, onEdit, onDelete, onToggle, onViewIfaces }: any) {
  const { data: ifacesData, isLoading: loadingIfaces } = useQuery({
    queryKey: ['collector-interfaces', collector.id],
    queryFn: () => api.get(`/api/collectors/${collector.id}/interfaces`).then(r => r.data).catch(() => []),
    refetchInterval: 60000
  });

  const ifaces = Array.isArray(ifacesData) ? ifacesData : [];
  const active = collector.active !== false;

  const formatLastSeen = (s?: string) => {
    if (!s) return 'nunca';
    try {
      const date = new Date(s.replace(' ', 'T'));
      const diff = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diff < 60) return `há ${diff}s`;
      if (diff < 3600) return `há ${Math.floor(diff / 60)}m`;
      return date.toLocaleString('pt-BR');
    } catch { return s; }
  };

  return (
    <div className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm space-y-3 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={clsx("w-2.5 h-2.5 rounded-full mt-1", active ? "bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-destructive")} />
          <div>
            <h3 className="font-bold text-text-primary text-lg leading-none">{collector.name}</h3>
            <p className="text-xs text-text-secondary font-mono mt-1">
              {collector.host || collector.ip} · SNMP v{collector.snmp_version || '2c'}
            </p>
          </div>
        </div>
        <span className={clsx(
          "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
          active ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"
        )}>{active ? 'Ativo' : 'Inativo'}</span>
      </div>

      <div className="flex items-center gap-4 text-xs text-text-secondary">
        <div className="flex items-center gap-1.5">
          <Eye size={14} className="text-primary/70" />
          <span className="font-bold text-text-primary">{loadingIfaces ? '...' : ifaces.length}</span> interfaces
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-primary/70" />
          {formatLastSeen(collector.last_seen || collector.last_poll)}
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-2 pt-3 border-t border-border/50">
          <Button variant="outline" size="sm" className="h-8 flex-1 gap-1 text-[11px]" onClick={onEdit}>
            <Edit2 size={12} /> Editar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className={clsx("h-8 flex-1 gap-1 text-[11px]", active ? "text-amber-500 hover:text-amber-600" : "text-success hover:text-success")}
            onClick={() => onToggle(!active)}
          >
            {active ? <><PowerOff size={12} /> Desativar</> : <><Power size={12} /> Ativar</>}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={onDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
      )}
      
      {!isAdmin && ifaces.length > 0 && (
        <Button variant="outline" size="sm" className="w-full h-8 gap-2 text-[11px]" onClick={() => onViewIfaces(collector.name, ifaces)}>
          <Eye size={12} /> Ver Interfaces
        </Button>
      )}

      {isAdmin && ifaces.length > 0 && (
        <button onClick={() => onViewIfaces(collector.name, ifaces)} className="w-full text-center text-[10px] text-text-secondary hover:text-primary transition-colors mt-1">
          Visualizar {ifaces.length} interfaces
        </button>
      )}
    </div>
  );
}

function CollectorModal({ isOpen, onClose, mode, data, onSubmit, isLoading }: any) {
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [community, setCommunity] = useState('public');
  const [version, setVersion] = useState('2c');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setName(data?.name || '');
      setHost(data?.host || data?.ip || '');
      setCommunity(data?.snmp_community || 'public');
      setVersion(data?.snmp_version || '2c');
      setActive(data?.active !== false);
    }
  }, [isOpen, data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, host, snmp_community: community, snmp_version: version, active });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Novo Coletor' : 'Editar Coletor'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="router-core-01" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="host">Host / IP</Label>
            <Input id="host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="45.175.50.209" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="community">Comunidade SNMP</Label>
              <Input id="community" value={community} onChange={(e) => setCommunity(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version">Versão SNMP</Label>
              <Select value={version} onValueChange={setVersion}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">v1</SelectItem>
                  <SelectItem value="2c">v2c</SelectItem>
                  <SelectItem value="3">v3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} />
            <Label>Coletor Ativo</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

      {openIfaces && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpenIfaces(null)}>
          <div className="bg-bg-secondary border border-border rounded-xl shadow-2xl w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-text-primary">Interfaces de {openIfaces.name}</h3>
              <button onClick={() => setOpenIfaces(null)} className="text-text-secondary hover:text-text-primary"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto p-4 space-y-1">
              {openIfaces.ifaces.map((iface: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-bg-primary rounded-lg border border-border">
                  <span className="font-mono text-sm text-text-primary">{typeof iface === 'string' ? iface : (iface.name || iface.ifname || iface.alias || JSON.stringify(iface))}</span>
                  {typeof iface === 'object' && iface.status && (
                    <span className="text-[10px] font-bold uppercase text-text-secondary">{iface.status}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
