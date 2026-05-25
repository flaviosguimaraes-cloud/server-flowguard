import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { 
  Server, Eye, X, Clock, Plus, Edit2, Trash2, Power, 
  PowerOff, Shield, Check, Info, Activity, Network, 
  Globe, Zap, Search, Sliders, List, CheckCircle2, AlertCircle,
  ArrowRight
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  const [detailsSheet, setDetailsSheet] = useState<{ open: boolean; collector: any | null }>({
    open: false,
    collector: null
  });

  const { data: collectorsData, isLoading } = useQuery({
    queryKey: ['collectors'],
    queryFn: () => api.get('/api/collectors').then(r => (Array.isArray(r.data) ? r.data : [])).catch(() => []),
    refetchInterval: 30000,
  });
  const items = Array.isArray(collectorsData) ? collectorsData : [];

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
                onViewDetails={() => setDetailsSheet({ open: true, collector: c })}
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
        onViewDetails={(collector: any) => setDetailsSheet({ open: true, collector })}
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

      <CollectorDetailsSheet 
        isOpen={detailsSheet.open}
        onClose={() => setDetailsSheet({ ...detailsSheet, open: false })}
        collector={detailsSheet.collector}
      />
    </div>
  );
}

 function CollectorCard({ collector, isAdmin, onEdit, onDelete, onToggle, onViewDetails }: any) {
   const { data: ifacesData, isLoading: loadingIfaces } = useQuery({
     queryKey: ['collector-interfaces', collector.id],
     queryFn: () => api.get(`/api/snmp/${collector.id}/interfaces`).then(r => r.data).catch(() => []),
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
          <button onClick={onViewDetails} className="w-full text-center text-[10px] text-text-secondary hover:text-primary transition-colors">
            Visualizar {ifaces.length} interfaces e configurações
          </button>
        )}
     </div>
   );
 }

function CollectorModal({ isOpen, onClose, mode, data, onSubmit, onViewDetails, isLoading }: any) {
  const [snmpIpTouched, setSnmpIpTouched] = useState(false);
  const [bgpLocalIpTouched, setBgpLocalIpTouched] = useState(false);

  const { data: upstreamIfacesData } = useQuery({
    queryKey: ['collector-upstream-interfaces', data?.id],
    queryFn: () => api.get(`/api/snmp/${data.id}/interfaces?role=upstream`).then(r => (Array.isArray(r.data) ? r.data : [])).catch(() => []),
    enabled: isOpen && mode === 'edit' && !!data?.id,
  });

  const upstreamIfaces = Array.isArray(upstreamIfacesData) ? upstreamIfacesData : [];

  const normalizeSnmpVersion = (v: any) => {
      if (!v) return '2c';
      return v.toString().replace(/^v/, '');
    };

    const [formData, setFormData] = useState({
      name: '',
      comment: '',
      host: '',
      brand: 'huawei',
      flow_protocol: 'netflow_v9',
      flow_port: '2055',
      snmp_community: 'public',
      snmp_version: '2c',
      snmp_port: '161',
      snmp_ip: '',
      active: true,
      bgp_enabled: false,
      bgp_remote_ip: '',
      bgp_remote_asn: '',
      bgp_local_ip: '',
      bgp_local_asn: '65000',
      bgp_ipv4_enabled: true,
      flowspec_ipv4_enabled: false,
      ipv6_enabled: false,
      bgp_ipv6_enabled: false,
      flowspec_ipv6_enabled: false,
      bgp_local_ipv6: '',
      bgp_peer_ipv6: '',
      bgp_ipv6_flowspec: false,
      monitored_networks: [] as any[]
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
              flow_port: data.flow_port?.toString() || '2055',
              snmp_community: data.snmp_community || 'public',
              snmp_version: normalizeSnmpVersion(data.snmp_version),
              snmp_port: data.snmp_port?.toString() || '161',
              snmp_ip: data.snmp_ip || data.host || '',
              active: data.active !== false,
              bgp_enabled: data.bgp_enabled || false,
              bgp_remote_ip: data.bgp_remote_ip || '',
              bgp_remote_asn: data.bgp_remote_asn?.toString() || '',
              bgp_local_ip: data.bgp_local_ip || '',
              bgp_local_asn: data.bgp_local_asn?.toString() || '65000',
              bgp_ipv4_enabled: data.bgp_ipv4_enabled !== false,
              flowspec_ipv4_enabled: data.flowspec_ipv4_enabled || data.bgp_flowspec || false,
              ipv6_enabled: data.ipv6_enabled || false,
              bgp_ipv6_enabled: data.bgp_ipv6_enabled || false,
              flowspec_ipv6_enabled: data.flowspec_ipv6_enabled || false,
              bgp_local_ipv6: data.bgp_local_ipv6 || '',
              bgp_peer_ipv6: data.bgp_peer_ipv6 || '',
              bgp_ipv6_flowspec: data.bgp_ipv6_flowspec || false,
              monitored_networks: data.monitored_networks || []
            });
            setSnmpIpTouched(true);
            setBgpLocalIpTouched(true);
          } else {
           setFormData({
             name: '',
             comment: '',
             host: '',
             brand: 'huawei',
             flow_protocol: 'netflow_v9',
             flow_port: '2055',
             snmp_community: 'public',
             snmp_version: '2c',
             snmp_port: '161',
             snmp_ip: '',
             active: true,
             bgp_enabled: false,
             bgp_remote_ip: '',
             bgp_remote_asn: '',
             bgp_local_ip: '',
             bgp_local_asn: '65000',
             bgp_ipv4_enabled: true,
             flowspec_ipv4_enabled: false,
             ipv6_enabled: false,
             bgp_ipv6_enabled: false,
             flowspec_ipv6_enabled: false,
             bgp_local_ipv6: '',
             bgp_peer_ipv6: '',
             bgp_ipv6_flowspec: false,
             monitored_networks: []
           });
            setSnmpIpTouched(false);
            setBgpLocalIpTouched(false);
          }

     }
   }, [isOpen, mode, data]);
 
    useEffect(() => {
      if (!snmpIpTouched && formData.host) {
        setFormData(prev => ({ ...prev, snmp_ip: formData.host }));
      }
    }, [formData.host, snmpIpTouched]);

    useEffect(() => {
      if (formData.bgp_enabled && !bgpLocalIpTouched && formData.host) {
        setFormData(prev => ({ ...prev, bgp_local_ip: formData.host }));
      }
    }, [formData.bgp_enabled, formData.host, bgpLocalIpTouched]);

   const handleBrandChange = (brand: string) => {
     const defaults = BRAND_DEFAULTS[brand] || BRAND_DEFAULTS.outro;
     setFormData(prev => ({
       ...prev,
       brand,
       flow_protocol: defaults.protocol,
        flow_port: defaults.port.toString()
     }));
    };

    const handleAddNetwork = () => {
      setFormData(prev => ({
        ...prev,
        monitored_networks: [
          ...prev.monitored_networks,
          { cidr: '', description: '', allow_blackhole: true, allow_flowspec: true }
        ]
      }));
    };


    const handleRemoveNetwork = (index: number) => {
      setFormData(prev => ({
        ...prev,
        monitored_networks: prev.monitored_networks.filter((_, i) => i !== index)
      }));
    };

    const handleUpdateNetwork = (index: number, field: string, value: any) => {
      setFormData(prev => ({
        ...prev,
        monitored_networks: prev.monitored_networks.map((n, i) => i === index ? { ...n, [field]: value } : n)
      }));
    };
 
    const isValidCIDR = (cidr: string) => {
      const ipv4Regex = /^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/;
      const ipv6Regex = /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}\/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8])$/;
      return ipv4Regex.test(cidr) || ipv6Regex.test(cidr);
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      // Validation
      if (!formData.name) return toast.error('Nome é obrigatório');
      if (!formData.host) return toast.error('IP de Gerência é obrigatório');

      for (const net of formData.monitored_networks) {
        if (!net.cidr) continue;
        if (!isValidCIDR(net.cidr)) {
          return toast.error(`CIDR inválido: ${net.cidr}`);
        }
      }
      
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
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
                 <Input id="flow_port" type="number" value={formData.flow_port} onChange={e => setFormData({ ...formData, flow_port: e.target.value })} />
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
                 <Input id="snmp_port" type="number" value={formData.snmp_port} onChange={e => setFormData({ ...formData, snmp_port: e.target.value })} />
               </div>
                <div className="space-y-2">
                  <Label htmlFor="snmp_ip">IP SNMP</Label>
                  <Input 
                    id="snmp_ip" 
                    value={formData.snmp_ip} 
                    onFocus={() => setSnmpIpTouched(true)}
                    onChange={e => setFormData({ ...formData, snmp_ip: e.target.value })} 
                    placeholder={formData.host || "Mesmo que gerência"} 
                  />
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
                         <Input id="bgp_remote_ip" value={formData.bgp_remote_ip} onChange={e => setFormData({ ...formData, bgp_remote_ip: e.target.value })} placeholder="Ex: 192.168.1.1" />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="bgp_remote_asn">ASN Remoto</Label>
                         <Input id="bgp_remote_asn" type="number" value={formData.bgp_remote_asn} onChange={e => setFormData({ ...formData, bgp_remote_asn: e.target.value })} placeholder="Ex: 65001" />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="bgp_local_ip">IP Local</Label>
                         <Input 
                           id="bgp_local_ip" 
                           value={formData.bgp_local_ip} 
                           onFocus={() => setBgpLocalIpTouched(true)}
                           onChange={e => setFormData({ ...formData, bgp_local_ip: e.target.value })} 
                           placeholder={formData.host || "Ex: 192.168.1.2"} 
                         />
                         <p className="text-[10px] text-text-secondary">IP local do servidor FlowGuard</p>
                       </div>
                      <div className="space-y-2">
                        <Label htmlFor="bgp_local_asn">ASN Local</Label>
                        <Input id="bgp_local_asn" type="number" value={formData.bgp_local_asn} onChange={e => setFormData({ ...formData, bgp_local_asn: e.target.value })} placeholder="Ex: 65000" />
                      </div>
                      <div className="md:col-span-2 space-y-3">
                        <Label>Famílias</Label>
                        <div className="flex gap-6">
                           <div className="flex items-center space-x-2">
                             <Checkbox 
                                id="unicast" 
                                checked={formData.bgp_ipv4_enabled === true} 
                                onCheckedChange={v => setFormData({ ...formData, bgp_ipv4_enabled: v === true })} 
                              />
                             <label htmlFor="unicast" className="text-sm font-medium leading-none cursor-pointer">IPv4 Unicast</label>
                           </div>
                           <div className="flex items-center space-x-2">
                             <Checkbox 
                                id="flowspec" 
                                checked={formData.flowspec_ipv4_enabled === true} 
                                onCheckedChange={v => setFormData({ ...formData, flowspec_ipv4_enabled: v === true })} 
                              />
                             <label htmlFor="flowspec" className="text-sm font-medium leading-none cursor-pointer">IPv4 FlowSpec</label>
                           </div>
                        </div>

                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* SEÇÃO 5 — IPv6 */}
            <section className="space-y-4 border-t border-border pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <Globe size={18} />
                  <h3 className="font-bold text-sm uppercase tracking-wider">IPv6</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formData.ipv6_enabled} onCheckedChange={v => setFormData({ ...formData, ipv6_enabled: v })} />
                  <Label className="text-xs font-bold uppercase">Habilitar IPv6</Label>
                </div>
              </div>

              <AnimatePresence>
                {formData.ipv6_enabled && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                      <div className="space-y-2">
                        <Label htmlFor="bgp_local_ipv6">IPv6 Local (FlowGuard)</Label>
                        <Input 
                          id="bgp_local_ipv6" 
                          value={formData.bgp_local_ipv6} 
                          onChange={e => setFormData({ ...formData, bgp_local_ipv6: e.target.value })} 
                          placeholder="Ex: 2804:xxxx::1" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bgp_peer_ipv6">IPv6 Remoto (Roteador)</Label>
                        <Input 
                          id="bgp_peer_ipv6" 
                          value={formData.bgp_peer_ipv6} 
                          onChange={e => setFormData({ ...formData, bgp_peer_ipv6: e.target.value })} 
                          placeholder="Ex: 2804:xxxx::2" 
                        />
                      </div>
                      <div className="md:col-span-2 flex gap-6 mt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="bgp_ipv6_unicast" 
                            checked={formData.bgp_ipv6_enabled === true} 
                            onCheckedChange={v => setFormData({ ...formData, bgp_ipv6_enabled: v === true })} 
                          />
                          <label htmlFor="bgp_ipv6_unicast" className="text-sm font-medium leading-none cursor-pointer">BGP IPv6 Unicast</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="flowspec_ipv6" 
                            checked={formData.bgp_ipv6_flowspec === true} 
                            onCheckedChange={v => setFormData({ ...formData, bgp_ipv6_flowspec: v === true })} 
                          />
                          <label htmlFor="flowspec_ipv6" className="text-sm font-medium leading-none cursor-pointer">IPv6 FlowSpec</label>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </section>

            {/* SEÇÃO 6 — Redes Monitoradas */}
            <section className="space-y-4 border-t border-border pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <Network size={18} />
                  <h3 className="font-bold text-sm uppercase tracking-wider">Redes Monitoradas</h3>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddNetwork} className="gap-2">
                  <Plus size={14} /> Adicionar Rede
                </Button>
              </div>

              <div className="space-y-3">
                {formData.monitored_networks.map((net, index) => (
                  <div key={index} className="p-3 bg-bg-primary/50 rounded-lg border border-border space-y-3 relative group">
                    <button 
                      type="button"
                      onClick={() => handleRemoveNetwork(index)}
                      className="absolute top-2 right-2 text-text-secondary hover:text-destructive p-1"
                    >
                      <X size={14} />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold">CIDR</Label>
                        <Input 
                          placeholder="Ex: 45.175.50.0/24" 
                          value={net.cidr} 
                          onChange={e => handleUpdateNetwork(index, 'cidr', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold">Descrição (Opcional)</Label>
                        <Input 
                          placeholder="Ex: UAY Internet" 
                          value={net.description || net.label || ''} 
                          onChange={e => handleUpdateNetwork(index, 'description', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={`bh-${index}`} 
                          checked={net.allow_blackhole} 
                          onCheckedChange={v => handleUpdateNetwork(index, 'allow_blackhole', v === true)}
                        />
                        <label htmlFor={`bh-${index}`} className="text-[10px] font-bold leading-none cursor-pointer uppercase text-text-secondary">Blackhole permitido</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={`fs-${index}`} 
                          checked={net.allow_flowspec} 
                          onCheckedChange={v => handleUpdateNetwork(index, 'allow_flowspec', v === true)}
                        />
                        <label htmlFor={`fs-${index}`} className="text-[10px] font-bold leading-none cursor-pointer uppercase text-text-secondary">FlowSpec permitido</label>
                      </div>
                    </div>
                  </div>
                ))}
                {formData.monitored_networks.length === 0 && (
                  <p className="text-center text-xs text-text-secondary italic py-4">Nenhuma rede configurada</p>
                )}
              </div>
            </section>

            {/* SEÇÃO 7 — Interfaces de Upstream */}
            {mode === 'edit' && (
              <section className="space-y-4 border-t border-border pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary">
                    <List size={18} />
                    <h3 className="font-bold text-sm uppercase tracking-wider">Interfaces de Upstream</h3>
                  </div>
                  <button 
                    type="button"
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 font-bold"
                    onClick={() => {
                      onClose();
                      if (onViewDetails) onViewDetails(data);
                    }}
                  >
                    Gerenciar interfaces <ArrowRight size={12} />
                  </button>
                </div>


                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {upstreamIfaces.map((iface: any) => (
                    <div key={iface.if_index} className="flex items-center justify-between p-2 bg-bg-primary/50 rounded border border-border/50">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-bold">{iface.if_name}</span>
                        <span className="text-[10px] text-text-secondary truncate max-w-[150px]">{iface.if_alias || 'Sem alias'}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] uppercase font-bold py-0 h-4">Upstream</Badge>
                    </div>
                  ))}
                  {(!upstreamIfaces || upstreamIfaces.length === 0) && (
                    <p className="col-span-2 text-center text-xs text-text-secondary italic">Nenhuma interface classificada como Upstream</p>
                  )}
                </div>
              </section>
            )}
 
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

function CollectorDetailsSheet({ isOpen, onClose, collector }: any) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: ifacesData, isLoading: loadingIfaces } = useQuery({
    queryKey: ['collector-interfaces', collector?.id],
    queryFn: () => api.get(`/api/snmp/${collector.id}/interfaces`).then(r => r.data.interfaces || []).catch(() => []),
    enabled: !!collector?.id && isOpen,
  });

  const ifaces = Array.isArray(ifacesData) ? ifacesData : [];

  const updateIfaceMutation = useMutation({
    mutationFn: ({ ifIndex, data }: { ifIndex: number; data: any }) => 
      api.put(`/api/snmp/${collector.id}/interfaces/${ifIndex}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collector-interfaces', collector.id] });
      toast.success('Interface atualizada');
    }
  });

  const updateCollectorMutation = useMutation({
    mutationFn: (data: any) => api.put(`/api/collectors/${collector.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collectors'] });
      toast.success('Configurações salvas');
    }
  });

  if (!collector) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-4xl overflow-y-auto bg-bg-secondary p-0">
        <div className="h-full flex flex-col">
          <SheetHeader className="px-6 py-4 border-b border-border bg-bg-secondary sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <Server className="text-primary" size={20} />
              <SheetTitle className="text-xl font-bold">{collector.name}</SheetTitle>
            </div>
            <SheetDescription>
              {collector.host} · {collector.brand}
            </SheetDescription>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-6 border-b border-border bg-bg-secondary sticky top-[73px] z-10">
              <TabsList className="bg-transparent border-none p-0 h-12">
                <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">Visão Geral</TabsTrigger>
                <TabsTrigger value="interfaces" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">Interfaces</TabsTrigger>
                <TabsTrigger value="advanced" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">Configuração Avançada</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6 flex-1">
              <TabsContent value="overview" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-bg-primary p-4 rounded-xl border border-border">
                    <p className="text-[10px] text-text-secondary font-bold uppercase">Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={clsx("w-2 h-2 rounded-full", collector.active !== false ? "bg-success" : "bg-destructive")} />
                      <span className="font-bold">{collector.active !== false ? 'Ativo' : 'Inativo'}</span>
                    </div>
                  </div>
                  <div className="bg-bg-primary p-4 rounded-xl border border-border">
                    <p className="text-[10px] text-text-secondary font-bold uppercase">Interfaces</p>
                    <p className="text-lg font-bold mt-1">{loadingIfaces ? '...' : ifaces.length}</p>
                  </div>
                  <div className="bg-bg-primary p-4 rounded-xl border border-border">
                    <p className="text-[10px] text-text-secondary font-bold uppercase">Protocolo</p>
                    <p className="text-lg font-bold mt-1 uppercase">{collector.flow_protocol}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">Informações Técnicas</h4>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-text-secondary">Host</span>
                      <span className="font-mono">{collector.host}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-text-secondary">Porta Flow</span>
                      <span className="font-mono">{collector.flow_port}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-text-secondary">Versão SNMP</span>
                      <span className="font-mono">v{collector.snmp_version}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-text-secondary">Porta SNMP</span>
                      <span className="font-mono">{collector.snmp_port}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="interfaces" className="mt-0 space-y-6">
                <InterfacesTab 
                  collectorId={collector.id} 
                  interfaces={ifaces} 
                  isLoading={loadingIfaces}
                  onUpdate={(ifIndex: number, data: any) => updateIfaceMutation.mutate({ ifIndex, data })}
                />
              </TabsContent>

              <TabsContent value="advanced" className="mt-0 space-y-6">
                <AdvancedConfigTab 
                  collector={collector}
                  onSave={(data: any) => updateCollectorMutation.mutate(data)}
                  isLoading={updateCollectorMutation.isPending}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InterfacesTab({ collectorId, interfaces, isLoading, onUpdate }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const formatSpeed = (speed: number) => {
    if (!speed) return '0';
    if (speed >= 1e12) return (speed / 1e12).toFixed(1) + ' Tbps';
    if (speed >= 1e9) return (speed / 1e9).toFixed(0) + ' Gbps';
    if (speed >= 1e6) return (speed / 1e6).toFixed(0) + ' Mbps';
    return (speed / 1e3).toFixed(0) + ' Kbps';
  };

  const filteredIfaces = useMemo(() => {
    return interfaces.filter((iface: any) => {
      const matchesSearch = (iface.if_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (iface.if_alias || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || iface.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [interfaces, searchTerm, roleFilter]);

  const stats = useMemo(() => {
    return {
      upstream: interfaces.filter((i: any) => i.role === 'upstream').length,
      unclassified: interfaces.filter((i: any) => !i.role || i.role === 'unknown').length
    };
  }, [interfaces]);

  const handleAutoClassify = () => {
    const promises = interfaces.map((iface: any) => {
      let role = iface.role || 'unknown';
      let isUpstream = iface.is_upstream;
      const alias = (iface.if_alias || '').toUpperCase();
      const speed = iface.if_speed || 0;

      if (['IP-', 'IMPLANTAR', 'ATC', 'GDNET'].some(k => alias.includes(k))) {
        role = 'upstream';
        isUpstream = true;
      } else if (['PPPOE', 'CGNAT', 'PPP'].some(k => alias.includes(k))) {
        role = 'access';
        isUpstream = false;
      } else if (alias.length > 0 || speed > 0) {
        role = 'internal';
        isUpstream = false;
      } else {
        role = 'unknown';
        isUpstream = false;
      }

      if (role !== iface.role || isUpstream !== iface.is_upstream) {
        return onUpdate(iface.if_index, { role, is_upstream: isUpstream });
      }
      return null;
    }).filter(Boolean);

    if (promises.length > 0) {
      toast.info(`Classificando ${promises.length} interfaces...`);
    } else {
      toast.info('Nenhuma interface nova para classificar.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
            <Input 
              placeholder="Buscar interface..." 
              className="pl-9 h-9" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="upstream">Upstream</SelectItem>
              <SelectItem value="access">Acesso</SelectItem>
              <SelectItem value="internal">Interno</SelectItem>
              <SelectItem value="unknown">Não classificado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="outline" className="gap-2" onClick={handleAutoClassify}>
          <Zap size={14} className="text-amber-500" /> Classificação Automática
        </Button>
      </div>

      <div className="flex items-center gap-6 p-3 bg-bg-primary rounded-lg border border-border text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-success" />
          <span className="font-bold text-text-primary">{stats.upstream}</span> interfaces upstream classificadas
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle size={14} className="text-amber-500" />
          <span className="font-bold text-text-primary">{stats.unclassified}</span> interfaces não classificadas
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-bg-primary/50">
              <TableHead className="w-[200px]">Interface</TableHead>
              <TableHead>Alias/Label</TableHead>
              <TableHead>Velocidade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Upstream</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-text-secondary">Carregando interfaces...</TableCell></TableRow>
            ) : filteredIfaces.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-text-secondary">Nenhuma interface encontrada</TableCell></TableRow>
            ) : filteredIfaces.map((iface: any) => (
              <TableRow key={iface.if_index} className="group">
                <TableCell className="font-mono text-xs font-bold text-text-primary">{iface.if_name}</TableCell>
                <TableCell>
                  <Input 
                    className="h-7 text-xs bg-transparent border-transparent hover:border-border focus:bg-bg-secondary w-full"
                    defaultValue={iface.display_name || iface.if_alias || ''}
                    onBlur={(e) => {
                      if (e.target.value !== (iface.display_name || iface.if_alias)) {
                        onUpdate(iface.if_index, { display_name: e.target.value });
                      }
                    }}
                  />
                </TableCell>
                <TableCell className="text-xs font-mono">{formatSpeed(iface.if_speed)}</TableCell>
                <TableCell>
                  <Select 
                    value={iface.role || 'unknown'} 
                    onValueChange={(val) => onUpdate(iface.if_index, { role: val, is_upstream: val === 'upstream' })}
                  >
                    <SelectTrigger className="h-7 w-32 text-[10px] font-bold uppercase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">?</SelectItem>
                      <SelectItem value="upstream">Upstream</SelectItem>
                      <SelectItem value="access">Acesso</SelectItem>
                      <SelectItem value="internal">Interno</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Switch 
                    checked={iface.is_upstream} 
                    onCheckedChange={(val) => onUpdate(iface.if_index, { is_upstream: val })}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AdvancedConfigTab({ collector, onSave, isLoading }: any) {
  const [formData, setFormData] = useState({
    ipv6_enabled: false,
    ipv6_cidr: '',
    bgp_ipv4_enabled: true,
    bgp_ipv4_flowspec_enabled: false,
    bgp_ipv6_enabled: false,
    bgp_ipv6_flowspec_enabled: false,
    bgp_local_asn: '',
    bgp_remote_asn: '',
    monitored_networks: [] as any[]
  });

  useEffect(() => {
    if (collector) {
      setFormData({
        ipv6_enabled: collector.ipv6_enabled || false,
        ipv6_cidr: collector.ipv6_cidr || '',
        bgp_ipv4_enabled: collector.bgp_ipv4_enabled !== false,
        bgp_ipv4_flowspec_enabled: collector.flowspec_ipv4_enabled || false,
        bgp_ipv6_enabled: collector.bgp_ipv6_enabled || false,
        bgp_ipv6_flowspec_enabled: collector.flowspec_ipv6_enabled || false,
        bgp_local_asn: collector.bgp_local_asn?.toString() || '',
        bgp_remote_asn: collector.bgp_remote_asn?.toString() || '',
        monitored_networks: collector.monitored_networks || []
      });
    }
  }, [collector]);

  const handleToggle = (field: string, value: boolean) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    
    // Save immediately for simple toggles
    onSave({
      ...collector,
      ipv6_enabled: field === 'ipv6_enabled' ? value : formData.ipv6_enabled,
      bgp_ipv4_enabled: field === 'bgp_ipv4_enabled' ? value : formData.bgp_ipv4_enabled,
      flowspec_ipv4_enabled: field === 'bgp_ipv4_flowspec_enabled' ? value : formData.bgp_ipv4_flowspec_enabled,
      bgp_ipv6_enabled: field === 'bgp_ipv6_enabled' ? value : formData.bgp_ipv6_enabled,
      flowspec_ipv6_enabled: field === 'bgp_ipv6_flowspec_enabled' ? value : formData.bgp_ipv6_flowspec_enabled,
    });
  };

  const handleAddNetwork = () => {
    const newNetwork = { cidr: '', type: 'own', label: '', allow_blackhole: true, allow_flowspec: true };
    const updated = [...formData.monitored_networks, newNetwork];
    setFormData({ ...formData, monitored_networks: updated });
  };

  const handleUpdateNetwork = (index: number, field: string, value: any) => {
    const updated = [...formData.monitored_networks];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, monitored_networks: updated });
    
    // If it's a toggle in the network, save immediately
    if (typeof value === 'boolean') {
      onSave({ ...collector, monitored_networks: updated });
    }
  };

  const handleRemoveNetwork = (index: number) => {
    const updated = formData.monitored_networks.filter((_, i) => i !== index);
    setFormData({ ...formData, monitored_networks: updated });
    onSave({ ...collector, monitored_networks: updated });
  };

  const handleSaveAll = () => {
    onSave({
      ...collector,
      ipv6_enabled: formData.ipv6_enabled,
      ipv6_cidr: formData.ipv6_cidr,
      bgp_ipv4_enabled: formData.bgp_ipv4_enabled,
      flowspec_ipv4_enabled: formData.bgp_ipv4_flowspec_enabled,
      bgp_ipv6_enabled: formData.bgp_ipv6_enabled,
      flowspec_ipv6_enabled: formData.bgp_ipv6_flowspec_enabled,
      bgp_local_asn: Number(formData.bgp_local_asn),
      bgp_remote_asn: Number(formData.bgp_remote_asn),
      monitored_networks: formData.monitored_networks
    });
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Globe size={18} />
          <h3 className="font-bold text-sm uppercase tracking-wider">Redes Monitoradas</h3>
        </div>
        <div className="space-y-3">
          {formData.monitored_networks.map((net, i) => (
            <div key={i} className="bg-bg-primary p-4 rounded-xl border border-border grid grid-cols-1 md:grid-cols-4 gap-4 items-end relative group">
              <button 
                onClick={() => handleRemoveNetwork(i)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-text-secondary">CIDR</Label>
                <Input 
                  value={net.cidr} 
                  onChange={e => handleUpdateNetwork(i, 'cidr', e.target.value)} 
                  onBlur={() => onSave({ ...collector, monitored_networks: formData.monitored_networks })}
                  placeholder="45.175.50.0/24" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-text-secondary">Tipo</Label>
                <Select value={net.type} onValueChange={v => { handleUpdateNetwork(i, 'type', v); onSave({ ...collector, monitored_networks: formData.monitored_networks }); }}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own">Própria</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                    <SelectItem value="transit">Trânsito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-text-secondary">Label</Label>
                <Input 
                  value={net.label} 
                  onChange={e => handleUpdateNetwork(i, 'label', e.target.value)} 
                  onBlur={() => onSave({ ...collector, monitored_networks: formData.monitored_networks })}
                  placeholder="Nome do cliente/link" 
                />
              </div>
              <div className="flex items-center gap-4 h-9 pb-0.5">
                <div className="flex items-center gap-2">
                  <Checkbox checked={net.allow_blackhole} onCheckedChange={v => handleUpdateNetwork(i, 'allow_blackhole', v)} />
                  <span className="text-[10px] font-bold uppercase text-text-secondary">BH</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={net.allow_flowspec} onCheckedChange={v => handleUpdateNetwork(i, 'allow_flowspec', v)} />
                  <span className="text-[10px] font-bold uppercase text-text-secondary">FS</span>
                </div>
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full border-dashed gap-2 h-10" onClick={handleAddNetwork}>
            <Plus size={14} /> Adicionar Rede
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Globe size={18} />
          <h3 className="font-bold text-sm uppercase tracking-wider">IPv6</h3>
        </div>
        <div className="bg-bg-primary p-4 rounded-xl border border-border space-y-4">
          <div className="flex items-center justify-between">
            <Label>IPv6 Habilitado</Label>
            <Switch checked={formData.ipv6_enabled} onCheckedChange={v => handleToggle('ipv6_enabled', v)} />
          </div>
          {formData.ipv6_enabled && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
              <Label>CIDR IPv6</Label>
              <Input 
                value={formData.ipv6_cidr} 
                onChange={e => setFormData({ ...formData, ipv6_cidr: e.target.value })} 
                onBlur={() => onSave({ ...collector, ipv6_cidr: formData.ipv6_cidr })}
                placeholder="2804::/32" 
              />
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Shield size={18} />
          <h3 className="font-bold text-sm uppercase tracking-wider">Configuração BGP</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-bg-primary p-4 rounded-xl border border-border space-y-3">
            <h4 className="text-xs font-bold uppercase text-text-secondary border-b border-border pb-2">IPv4</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm">BGP IPv4 Unicast</span>
              <Switch checked={formData.bgp_ipv4_enabled} onCheckedChange={v => handleToggle('bgp_ipv4_enabled', v)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">BGP IPv4 FlowSpec</span>
              <Switch checked={formData.bgp_ipv4_flowspec_enabled} onCheckedChange={v => handleToggle('bgp_ipv4_flowspec_enabled', v)} />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-text-secondary">ASN Local</Label>
                <Input 
                  className="h-8 text-xs"
                  value={formData.bgp_local_asn} 
                  onChange={e => setFormData({ ...formData, bgp_local_asn: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-text-secondary">ASN Remoto</Label>
                <Input 
                  className="h-8 text-xs"
                  value={formData.bgp_remote_asn} 
                  onChange={e => setFormData({ ...formData, bgp_remote_asn: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="bg-bg-primary p-4 rounded-xl border border-border space-y-3">
            <h4 className="text-xs font-bold uppercase text-text-secondary border-b border-border pb-2">IPv6</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm">BGP IPv6 Unicast</span>
              <Switch checked={formData.bgp_ipv6_enabled} onCheckedChange={v => handleToggle('bgp_ipv6_enabled', v)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">BGP IPv6 FlowSpec</span>
              <Switch checked={formData.bgp_ipv6_flowspec_enabled} onCheckedChange={v => handleToggle('bgp_ipv6_flowspec_enabled', v)} />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-text-secondary">ASN Local IPv6</Label>
                <Input 
                  className="h-8 text-xs"
                  value={formData.bgp_local_asn} 
                  onChange={e => setFormData({ ...formData, bgp_local_asn: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-text-secondary">ASN Remoto IPv6</Label>
                <Input 
                  className="h-8 text-xs"
                  value={formData.bgp_remote_asn} 
                  onChange={e => setFormData({ ...formData, bgp_remote_asn: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="pt-4 border-t border-border flex justify-end">
        <Button onClick={handleSaveAll} disabled={isLoading} className="gap-2">
          {isLoading ? 'Salvando...' : <><Check size={16} /> Salvar Tudo</>}
        </Button>
      </div>
    </div>
  );
}

