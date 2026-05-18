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
