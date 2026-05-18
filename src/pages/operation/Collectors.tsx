import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
 import { Server, Eye, X, Clock, Plus, Edit2, Trash2, Power, PowerOff, Shield, Check, Info } from 'lucide-react';
 import { motion, AnimatePresence } from 'framer-motion';
 const BRAND_DEFAULTS: Record<string, { protocol: string, port: number }> = {
   huawei: { protocol: 'netflow_v9', port: 2055 },
   cisco_iosxe: { protocol: 'netflow_v9', port: 2055 },
   cisco_ios: { protocol: 'netflow_v5', port: 2055 },
   juniper: { protocol: 'ipfix', port: 4739 },
   mikrotik: { protocol: 'ipfix', port: 4739 },
   zte: { protocol: 'netflow_v9', port: 2055 },
   outro: { protocol: 'netflow_v9', port: 2055 },
 };

 const BRANDS = [
   { value: 'huawei', label: 'Huawei' },
   { value: 'cisco_iosxe', label: 'Cisco IOS-XE' },
   { value: 'cisco_ios', label: 'Cisco IOS' },
   { value: 'juniper', label: 'Juniper' },
   { value: 'mikrotik', label: 'MikroTik' },
   { value: 'zte', label: 'ZTE' },
   { value: 'outro', label: 'Outro' },
 ];

 const PROTOCOLS = [
   { value: 'netflow_v5', label: 'NetFlow v5' },
   { value: 'netflow_v9', label: 'NetFlow v9' },
   { value: 'ipfix', label: 'IPFIX' },
   { value: 'sflow', label: 'sFlow' },
 ];

 const SNMP_VERSIONS = [
   { value: '1', label: 'v1' },
   { value: '2c', label: 'v2c' },
   { value: '3', label: 'v3' },
 ];

import { clsx } from 'clsx';
import { toast } from 'sonner';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Checkbox } from '@/components/ui/checkbox';
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
                onToggle={(active: boolean) => updateMutation.mutate({ id: c.id, data: { ...c, active } })}
                onViewIfaces={(name: string, ifaces: any[]) => setOpenIfaces({ name, ifaces })}
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
   
   const brandLabel = BRANDS.find(b => b.value === collector.brand)?.label || collector.brand || 'Outro';
   const protocolLabel = PROTOCOLS.find(p => p.value === collector.flow_protocol)?.label || collector.flow_protocol || 'NetFlow';
 
   return (
     <div className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm space-y-4 hover:border-primary/50 transition-colors">
       <div className="flex items-start justify-between">
         <div className="flex items-center gap-3">
           <div className={clsx("w-2.5 h-2.5 rounded-full mt-1", active ? "bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-destructive")} />
           <div>
             <h3 className="font-bold text-text-primary text-lg leading-none">{collector.name}</h3>
             <p className="text-xs text-text-secondary mt-1">
               {brandLabel} · {protocolLabel} · porta {collector.flow_port}
             </p>
             <p className="text-xs text-text-secondary font-mono mt-0.5">
               {collector.host} · SNMP v{collector.snmp_version || '2c'}
             </p>
             <div className="flex items-center gap-2 mt-1">
               <span className="text-[10px] text-text-secondary">
                 <span className="font-bold text-text-primary">{loadingIfaces ? '...' : ifaces.length}</span> interfaces
               </span>
               <span className="text-[10px] font-bold uppercase text-success">{active ? 'Ativo' : 'Inativo'}</span>
             </div>
           </div>
         </div>
         {isAdmin && (
           <Button variant="ghost" size="icon" className="h-8 w-8 text-text-secondary hover:text-primary" onClick={onEdit}>
             <Edit2 size={14} />
           </Button>
         )}
       </div>
 
       <div className="bg-bg-primary/50 p-3 rounded-lg border border-border/50 space-y-2">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-2 text-[11px] font-semibold text-text-primary">
             <Shield size={12} className="text-primary" />
             BGP: {collector.bgp_enabled ? (
               <span className="flex items-center gap-1 text-success">
                 <div className="w-1.5 h-1.5 rounded-full bg-success" /> Ativo
               </span>
             ) : (
               <span className="text-text-secondary italic">Desativado</span>
             )}
           </div>
         </div>
         
         {collector.bgp_enabled && (
           <div className="space-y-1">
             <div className="text-[10px] text-text-secondary">
               AS {collector.bgp_local_asn || 65000} → AS {collector.bgp_remote_asn}
             </div>
             <div className="flex items-center gap-3">
               <div className="flex items-center gap-1 text-[10px] text-text-secondary">
                 <Check size={10} className={collector.bgp_ipv4_unicast ? "text-success" : "text-text-secondary/30"} />
                 IPv4 Unicast
               </div>
               <div className="flex items-center gap-1 text-[10px] text-text-secondary">
                 <Check size={10} className={collector.bgp_flowspec ? "text-success" : "text-text-secondary/30"} />
                 FlowSpec
               </div>
             </div>
           </div>
         )}
       </div>
 
       {isAdmin && (
         <div className="flex items-center gap-2">
           <Button 
             variant="outline" 
             size="sm" 
             className={clsx("h-8 flex-1 gap-1 text-[11px]", active ? "text-amber-500 hover:text-amber-600" : "text-success hover:text-success")}
             onClick={() => onToggle(!active)}
           >
             {active ? <><PowerOff size={12} /> Desativar</> : <><Power size={12} /> Ativar</>}
           </Button>
           <Button variant="ghost" size="sm" className="h-8 px-3 text-destructive hover:bg-destructive/10 text-[11px]" onClick={onDelete}>
             <Trash2 size={14} className="mr-1" /> Deletar
           </Button>
         </div>
       )}
 
       {ifaces.length > 0 && (
         <button onClick={() => onViewIfaces(collector.name, ifaces)} className="w-full text-center text-[10px] text-text-secondary hover:text-primary transition-colors">
           Visualizar {ifaces.length} interfaces
         </button>
       )}
     </div>
   );
 }

 function CollectorModal({ isOpen, onClose, mode, data, onSubmit, isLoading }: any) {
   const [formData, setFormData] = useState({
     name: '',
     comment: '',
     host: '',
     brand: 'huawei',
     flow_protocol: 'netflow_v9',
     flow_port: 2055,
     snmp_community: 'public',
     snmp_version: '2c',
     snmp_port: 161,
     snmp_ip: '',
     active: true,
     bgp_enabled: false,
     bgp_remote_ip: '',
     bgp_remote_asn: '',
     bgp_local_ip: '',
     bgp_local_asn: 65000,
     bgp_ipv4_unicast: true,
     bgp_flowspec: false
   });
 
   useEffect(() => {
     if (isOpen) {
       if (mode === 'edit' && data) {
         setFormData({
           name: data.name || '',
           comment: data.comment || '',
           host: data.host || '',
           brand: data.brand || 'huawei',
           flow_protocol: data.flow_protocol || 'netflow_v9',
           flow_port: data.flow_port || 2055,
           snmp_community: data.snmp_community || 'public',
           snmp_version: data.snmp_version || '2c',
           snmp_port: data.snmp_port || 161,
           snmp_ip: data.snmp_ip || '',
           active: data.active !== false,
           bgp_enabled: data.bgp_enabled || false,
           bgp_remote_ip: data.bgp_remote_ip || '',
           bgp_remote_asn: data.bgp_remote_asn || '',
           bgp_local_ip: data.bgp_local_ip || '',
           bgp_local_asn: data.bgp_local_asn || 65000,
           bgp_ipv4_unicast: data.bgp_ipv4_unicast !== false,
           bgp_flowspec: data.bgp_flowspec || false
         });
       } else {
         setFormData({
           name: '',
           comment: '',
           host: '',
           brand: 'huawei',
           flow_protocol: 'netflow_v9',
           flow_port: 2055,
           snmp_community: 'public',
           snmp_version: '2c',
           snmp_port: 161,
           snmp_ip: '',
           active: true,
           bgp_enabled: false,
           bgp_remote_ip: '',
           bgp_remote_asn: '',
           bgp_local_ip: '',
           bgp_local_asn: 65000,
           bgp_ipv4_unicast: true,
           bgp_flowspec: false
         });
       }
     }
   }, [isOpen, mode, data]);
 
   const handleBrandChange = (brand: string) => {
     const defaults = BRAND_DEFAULTS[brand] || BRAND_DEFAULTS.outro;
     setFormData(prev => ({
       ...prev,
       brand,
       flow_protocol: defaults.protocol,
       flow_port: defaults.port
     }));
   };
 
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     
     // Validation
     if (!formData.name) return toast.error('Nome é obrigatório');
     if (!formData.host) return toast.error('IP de Gerência é obrigatório');
     
     const flowPort = Number(formData.flow_port);
     if (isNaN(flowPort) || flowPort < 1 || flowPort > 65535) return toast.error('Porta Flow inválida (1-65535)');
     
     const snmpPort = Number(formData.snmp_port);
     if (isNaN(snmpPort) || snmpPort < 1 || snmpPort > 65535) return toast.error('Porta SNMP inválida (1-65535)');
 
     if (formData.bgp_enabled) {
       if (!formData.bgp_remote_ip && !formData.host) return toast.error('IP Remoto BGP é obrigatório');
       if (!formData.bgp_remote_asn) return toast.error('ASN Remoto BGP é obrigatório');
       
       const rasn = Number(formData.bgp_remote_asn);
       if (isNaN(rasn) || rasn < 1 || rasn > 4294967295) return toast.error('ASN Remoto inválido');
       
       const lasn = Number(formData.bgp_local_asn);
       if (isNaN(lasn) || lasn < 1 || lasn > 4294967295) return toast.error('ASN Local inválido');
     }
 
     const submission = {
       ...formData,
       snmp_ip: formData.snmp_ip || formData.host,
       bgp_remote_ip: formData.bgp_remote_ip || formData.host,
       flow_port: Number(formData.flow_port),
       snmp_port: Number(formData.snmp_port),
       bgp_remote_asn: Number(formData.bgp_remote_asn),
       bgp_local_asn: Number(formData.bgp_local_asn)
     };
 
     onSubmit(submission);
   };
 
   return (
     <Dialog open={isOpen} onOpenChange={onClose}>
       <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle>{mode === 'add' ? 'Novo Coletor' : 'Editar Coletor'}</DialogTitle>
         </DialogHeader>
         
         <form onSubmit={handleSubmit} className="space-y-8 py-4">
           {/* SEÇÃO 1 — Identificação */}
           <section className="space-y-4">
             <div className="flex items-center gap-2 text-primary">
               <Server size={18} />
               <h3 className="font-bold text-sm uppercase tracking-wider">Identificação</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="name">Nome *</Label>
                 <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="router-core-01" required />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="host">IP de Gerência *</Label>
                 <Input id="host" value={formData.host} onChange={e => setFormData({ ...formData, host: e.target.value })} placeholder="Ex: 192.168.1.1" required />
               </div>
               <div className="space-y-2 md:col-span-2">
                 <Label htmlFor="brand">Marca *</Label>
                 <Select value={formData.brand} onValueChange={handleBrandChange}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>
                     {BRANDS.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2 md:col-span-2">
                 <Label htmlFor="comment">Comentário</Label>
                 <Textarea id="comment" value={formData.comment} onChange={e => setFormData({ ...formData, comment: e.target.value })} placeholder="Opcional..." rows={2} />
               </div>
             </div>
           </section>
 
           {/* SEÇÃO 2 — Coleta de Flows */}
           <section className="space-y-4">
             <div className="flex items-center gap-2 text-primary">
               <Activity size={18} />
               <h3 className="font-bold text-sm uppercase tracking-wider">Coleta de Flows</h3>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Protocolo</Label>
                 <Select value={formData.flow_protocol} onValueChange={v => setFormData({ ...formData, flow_protocol: v })}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>
                     {PROTOCOLS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label htmlFor="flow_port">Porta</Label>
                 <Input id="flow_port" type="number" value={formData.flow_port} onChange={e => setFormData({ ...formData, flow_port: parseInt(e.target.value) || 0 })} />
               </div>
             </div>
           </section>
 
           {/* SEÇÃO 3 — SNMP */}
           <section className="space-y-4">
             <div className="flex items-center gap-2 text-primary">
               <Info size={18} />
               <h3 className="font-bold text-sm uppercase tracking-wider">SNMP</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Versão SNMP</Label>
                 <Select value={formData.snmp_version} onValueChange={v => setFormData({ ...formData, snmp_version: v })}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>
                     {SNMP_VERSIONS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label htmlFor="snmp_community">Comunidade</Label>
                 <Input id="snmp_community" value={formData.snmp_community} onChange={e => setFormData({ ...formData, snmp_community: e.target.value })} />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="snmp_port">Porta SNMP</Label>
                 <Input id="snmp_port" type="number" value={formData.snmp_port} onChange={e => setFormData({ ...formData, snmp_port: parseInt(e.target.value) || 0 })} />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="snmp_ip">IP SNMP</Label>
                 <Input id="snmp_ip" value={formData.snmp_ip} onChange={e => setFormData({ ...formData, snmp_ip: e.target.value })} placeholder={formData.host || "Mesmo que gerência"} />
                 <p className="text-[10px] text-text-secondary">Deixe igual ao IP se o mesmo</p>
               </div>
             </div>
           </section>
 
           {/* SEÇÃO 4 — BGP */}
           <section className="space-y-4 border-t border-border pt-6">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2 text-primary">
                 <Shield size={18} />
                 <h3 className="font-bold text-sm uppercase tracking-wider">BGP</h3>
               </div>
               <div className="flex items-center gap-2">
                 <Switch checked={formData.bgp_enabled} onCheckedChange={v => setFormData({ ...formData, bgp_enabled: v })} />
                 <Label className="text-xs font-bold uppercase">Habilitar BGP</Label>
               </div>
             </div>
 
             <AnimatePresence>
               {formData.bgp_enabled && (
                 <motion.div 
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: 'auto', opacity: 1 }}
                   exit={{ height: 0, opacity: 0 }}
                   className="overflow-hidden"
                 >
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                     <div className="space-y-2">
                       <Label htmlFor="bgp_remote_ip">IP Remoto (Roteador)</Label>
                       <Input id="bgp_remote_ip" value={formData.bgp_remote_ip} onChange={e => setFormData({ ...formData, bgp_remote_ip: e.target.value })} placeholder={formData.host || "IP do roteador"} />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="bgp_remote_asn">ASN Remoto</Label>
                       <Input id="bgp_remote_asn" type="number" value={formData.bgp_remote_asn} onChange={e => setFormData({ ...formData, bgp_remote_asn: e.target.value })} placeholder="268884" />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="bgp_local_ip">IP Local</Label>
                       <Input id="bgp_local_ip" value={formData.bgp_local_ip} onChange={e => setFormData({ ...formData, bgp_local_ip: e.target.value })} />
                       <p className="text-[10px] text-text-secondary">IP local do servidor FlowGuard</p>
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="bgp_local_asn">ASN Local</Label>
                       <Input id="bgp_local_asn" type="number" value={formData.bgp_local_asn} onChange={e => setFormData({ ...formData, bgp_local_asn: e.target.value })} />
                     </div>
                     <div className="md:col-span-2 space-y-3">
                       <Label>Famílias</Label>
                       <div className="flex gap-6">
                         <div className="flex items-center space-x-2">
                           <Checkbox id="unicast" checked={formData.bgp_ipv4_unicast} onCheckedChange={v => setFormData({ ...formData, bgp_ipv4_unicast: !!v })} />
                           <label htmlFor="unicast" className="text-sm font-medium leading-none cursor-pointer">IPv4 Unicast</label>
                         </div>
                         <div className="flex items-center space-x-2">
                           <Checkbox id="flowspec" checked={formData.bgp_flowspec} onCheckedChange={v => setFormData({ ...formData, bgp_flowspec: !!v })} />
                           <label htmlFor="flowspec" className="text-sm font-medium leading-none cursor-pointer">IPv4 FlowSpec</label>
                         </div>
                       </div>
                     </div>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
           </section>
 
           <div className="flex items-center gap-2 border-t border-border pt-6">
             <Switch checked={formData.active} onCheckedChange={v => setFormData({ ...formData, active: v })} />
             <Label>Coletor Ativo</Label>
           </div>
 
           <DialogFooter className="sticky bottom-0 bg-bg-secondary pt-2">
             <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
             <Button type="submit" disabled={isLoading} className="min-w-[100px]">
               {isLoading ? 'Salvando...' : 'Salvar'}
             </Button>
           </DialogFooter>
         </form>
       </DialogContent>
     </Dialog>
   );
 }
