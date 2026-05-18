import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { 
  Bell, MessageCircle, Mail, Webhook, Plus, Trash2,
  Edit2, Send, Check, X, AlertCircle, ToggleLeft, ToggleRight,
  PlusCircle
} from 'lucide-react';
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

export default function Notifications() {
  const queryClient = useQueryClient();
  const isAdmin = localStorage.getItem('role') === 'admin';
  
  const [channelModal, setChannelModal] = useState<{ open: boolean; mode: 'add' | 'edit'; data?: any }>({
    open: false,
    mode: 'add'
  });
  
  const [ruleModal, setRuleModal] = useState<{ open: boolean; mode: 'add' | 'edit'; data?: any }>({
    open: false,
    mode: 'add'
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; type: 'channel' | 'rule'; id: number; name: string } | null>(null);

  const { data: channels, isLoading: lc } = useQuery({
    queryKey: ['notif-channels'],
    queryFn: () => api.get('/api/notifications/channels').then(r => r.data).catch(() => ({ items: [] })),
  });
  const { data: rules, isLoading: lr } = useQuery({
    queryKey: ['notif-rules'],
    queryFn: () => api.get('/api/notifications/rules').then(r => r.data).catch(() => ({ items: [] })),
  });

  const channelItems = channels?.items || channels?.data || (Array.isArray(channels) ? channels : []);
  const ruleItems = rules?.items || rules?.data || (Array.isArray(rules) ? rules : []);

  const eventLabels: Record<string, string> = {
    attack_detected: "⚡ Ataque detectado",
    mitigation_started: "🛡 Mitigação iniciada",
    mitigation_removed: "✅ Mitigação removida",
    bgp_session_down: "🔴 BGP offline",
    service_down: "⚠️ Serviço offline",
    disk_warning: "💾 Disco cheio",
    login_failed: "🔐 Login falhou",
    rule_created: "📋 Regra criada",
    rule_removed: "🗑 Regra removida"
  };

  const iconFor = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'telegram') return <MessageCircle size={18} className="text-blue-500" />;
    if (t === 'email') return <Mail size={18} className="text-green-500" />;
    if (t === 'webhook') return <Webhook size={18} className="text-orange-500" />;
    if (t === 'whatsapp') return <MessageCircle size={18} className="text-green-600" />;
    return <Bell size={18} className="text-primary" />;
  };

  // Mutations for Channels
  const createChannelMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/notifications/channels', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notif-channels'] });
      toast.success('Canal criado com sucesso');
      setChannelModal({ open: false, mode: 'add' });
    },
    onError: (err: any) => toast.error(`Erro ao criar canal: ${err.response?.data?.message || err.message}`)
  });

  const updateChannelMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/api/notifications/channels/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notif-channels'] });
      toast.success('Canal atualizado');
      setChannelModal({ open: false, mode: 'add' });
    },
    onError: (err: any) => toast.error(`Erro ao atualizar canal: ${err.response?.data?.message || err.message}`)
  });

  const deleteChannelMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/notifications/channels/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notif-channels'] });
      toast.success('Canal removido');
      setDeleteConfirm(null);
    },
    onError: (err: any) => toast.error(`Erro ao remover canal: ${err.response?.data?.message || err.message}`)
  });

  const testChannelMutation = useMutation({
    mutationFn: (id: number) => api.post(`/api/notifications/channels/${id}/test`),
    onSuccess: () => toast.success('✅ Mensagem de teste enviada'),
    onError: (err: any) => toast.error(`❌ Erro no teste: ${err.response?.data?.message || err.message}`)
  });

  // Mutations for Rules
  const createRuleMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/notifications/rules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notif-rules'] });
      toast.success('Regra criada com sucesso');
      setRuleModal({ open: false, mode: 'add' });
    },
    onError: (err: any) => toast.error(`Erro ao criar regra: ${err.response?.data?.message || err.message}`)
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/api/notifications/rules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notif-rules'] });
      toast.success('Regra atualizada');
      setRuleModal({ open: false, mode: 'add' });
    },
    onError: (err: any) => toast.error(`Erro ao atualizar regra: ${err.response?.data?.message || err.message}`)
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/notifications/rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notif-rules'] });
      toast.success('Regra removida');
      setDeleteConfirm(null);
    },
    onError: (err: any) => toast.error(`Erro ao remover regra: ${err.response?.data?.message || err.message}`)
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="text-primary" size={24} />
          <h1 className="text-2xl font-bold text-text-primary">Notificações</h1>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button onClick={() => setChannelModal({ open: true, mode: 'add' })} className="gap-2">
              <Plus size={16} /> Novo Canal
            </Button>
            <Button variant="outline" onClick={() => setRuleModal({ open: true, mode: 'add' })} className="gap-2">
              <Plus size={16} /> Nova Regra
            </Button>
          </div>
        )}
      </div>

      <section className="bg-bg-secondary rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary">Canais Configurados</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-bg-primary/30">
          {lc ? (
            <Skeleton count={3} />
          ) : channelItems.length === 0 ? (
            <div className="col-span-full py-12 text-center text-text-secondary italic">Nenhum canal configurado</div>
          ) : channelItems.map((c: any) => (
            <div key={c.id} className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm space-y-4 hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-bg-primary flex items-center justify-center border border-border">
                    {iconFor(c.type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-text-primary">{c.name}</h3>
                    <p className="text-[10px] uppercase font-bold text-text-secondary">{c.type}</p>
                  </div>
                </div>
                <Switch 
                  checked={c.enabled !== false}
                  disabled={!isAdmin || updateChannelMutation.isPending}
                  onCheckedChange={(checked) => updateChannelMutation.mutate({ id: c.id, data: { enabled: checked } })}
                />
              </div>
              
              <div className="text-xs space-y-1">
                {c.type === 'telegram' && <p className="text-text-secondary"><span className="font-mono text-[10px] bg-bg-primary px-1.5 py-0.5 rounded">ChatID: {c.config?.chat_id}</span></p>}
                {c.type === 'email' && <p className="text-text-secondary font-mono truncate">{c.config?.to_addrs?.join(', ')}</p>}
                {c.type === 'webhook' && <p className="text-text-secondary font-mono truncate">{c.config?.url}</p>}
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  <Button variant="outline" size="sm" className="h-8 px-2 flex-1 gap-1 text-[10px]" 
                    onClick={() => testChannelMutation.mutate(c.id)}
                    disabled={testChannelMutation.isPending}>
                    <Send size={12} /> Testar
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-2 flex-1 gap-1 text-[10px]"
                    onClick={() => setChannelModal({ open: true, mode: 'edit', data: c })}>
                    <Edit2 size={12} /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteConfirm({ open: true, type: 'channel', id: c.id, name: c.name })}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-bg-secondary rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary">Regras de Notificação</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-primary/50 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                <th className="px-6 py-3 border-b border-border">Nome</th>
                <th className="px-6 py-3 border-b border-border">Evento</th>
                <th className="px-6 py-3 border-b border-border">Canal</th>
                <th className="px-6 py-3 border-b border-border text-center">Mín PPS/Mbps</th>
                <th className="px-6 py-3 border-b border-border text-center">Ativo</th>
                {isAdmin && <th className="px-6 py-3 border-b border-border text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border/50">
              {lr ? (
                <tr><td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center text-text-secondary italic">Carregando...</td></tr>
              ) : ruleItems.length === 0 ? (
                <tr><td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center text-text-secondary italic">Nenhuma regra configurada</td></tr>
              ) : ruleItems.map((r: any) => (
                <tr key={r.id} className="hover:bg-accent/5">
                  <td className="px-6 py-3 font-bold text-text-primary text-xs">{r.name}</td>
                  <td className="px-6 py-3 text-text-secondary text-xs">
                    <span className="bg-bg-primary px-2 py-0.5 rounded border border-border/50">
                      {eventLabels[r.event_type] || r.event_type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-text-secondary text-xs">
                    <div className="flex items-center gap-2">
                      {iconFor(r.channel_type)}
                      {r.channel_name}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-center text-[10px] font-mono text-text-secondary">
                    {r.min_pps?.toLocaleString() || 0} / {r.min_mbps?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <Switch 
                      checked={r.enabled !== false}
                      disabled={!isAdmin || updateRuleMutation.isPending}
                      onCheckedChange={(checked) => updateRuleMutation.mutate({ 
                        id: r.id, 
                        data: { ...r, enabled: checked } 
                      })}
                    />
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-3 text-right space-x-2">
                      <button className="text-text-secondary hover:text-primary transition-colors" 
                        onClick={() => setRuleModal({ open: true, mode: 'edit', data: r })}>
                        <Edit2 size={16} />
                      </button>
                      <button className="text-text-secondary hover:text-destructive transition-colors"
                        onClick={() => setDeleteConfirm({ open: true, type: 'rule', id: r.id, name: r.name })}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Deletar */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Deseja remover o {deleteConfirm?.type === 'channel' ? 'canal' : 'regra'} <strong>{deleteConfirm?.name}</strong>? 
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" 
              onClick={() => {
                if (!deleteConfirm) return;
                if (deleteConfirm.type === 'channel') deleteChannelMutation.mutate(deleteConfirm.id);
                else deleteRuleMutation.mutate(deleteConfirm.id);
              }}
              disabled={deleteChannelMutation.isPending || deleteRuleMutation.isPending}
            >
              {deleteChannelMutation.isPending || deleteRuleMutation.isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Canal */}
      <ChannelModalComponent
        isOpen={channelModal.open}
        onClose={() => setChannelModal({ ...channelModal, open: false })}
        mode={channelModal.mode}
        data={channelModal.data}
        onSubmit={(data: any) => {
          if (channelModal.mode === 'add') createChannelMutation.mutate(data);
          else updateChannelMutation.mutate({ id: channelModal.data.id, data });
        }}
        onTest={(id: number) => testChannelMutation.mutate(id)}
        isLoading={createChannelMutation.isPending || updateChannelMutation.isPending}
      />

      {/* Modal Regra */}
      <RuleModalComponent 
        isOpen={ruleModal.open}
        onClose={() => setRuleModal({ ...ruleModal, open: false })}
        mode={ruleModal.mode}
        data={ruleModal.data}
        channels={channelItems}
        eventLabels={eventLabels}
        onSubmit={(data: any) => {
          if (ruleModal.mode === 'add') createRuleMutation.mutate(data);
          else updateRuleMutation.mutate({ id: ruleModal.data.id, data });
        }}
        isLoading={createRuleMutation.isPending || updateRuleMutation.isPending}
      />
    </div>
  );
}

function ChannelModalComponent({ isOpen, onClose, mode, data, onSubmit, isLoading, onTest }: any) {
  const [name, setName] = useState('');
  const [type, setType] = useState('telegram');
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    if (isOpen) {
      setName(data?.name || '');
      setType(data?.type || 'telegram');
      setConfig(data?.config || {});
    }
  }, [isOpen, data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, type, enabled: data ? data.enabled : true, config });
  };

  const updateConfig = (key: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Novo Canal' : 'Editar Canal'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Canal</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Telegram NOC" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select value={type} onValueChange={(val) => setType(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="telegram">Telegram</SelectItem>
                <SelectItem value="email">E-mail (SMTP)</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'telegram' && (
            <div className="space-y-3 p-4 bg-bg-primary/50 rounded-lg border border-border">
              <div className="space-y-2">
                <Label htmlFor="token">Token do Bot</Label>
                <Input id="token" type="password" value={config.token || ''} onChange={(e) => updateConfig('token', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chat_id">Chat ID</Label>
                <Input id="chat_id" value={config.chat_id || ''} onChange={(e) => updateConfig('chat_id', e.target.value)} required />
              </div>
            </div>
          )}

          {type === 'email' && (
            <div className="grid grid-cols-2 gap-3 p-4 bg-bg-primary/50 rounded-lg border border-border">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="host">Host SMTP</Label>
                <Input id="host" value={config.host || ''} onChange={(e) => updateConfig('host', e.target.value)} placeholder="smtp.gmail.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Porta</Label>
                <Input id="port" type="number" value={config.port || 587} onChange={(e) => updateConfig('port', parseInt(e.target.value))} required />
              </div>
              <div className="space-y-2 flex flex-col justify-end">
                <div className="flex items-center gap-2 mb-2">
                  <Switch checked={config.tls !== false} onCheckedChange={(val) => updateConfig('tls', val)} />
                  <Label>TLS</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="user">Usuário</Label>
                <Input id="user" value={config.user || ''} onChange={(e) => updateConfig('user', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={config.password || ''} onChange={(e) => updateConfig('password', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="from">E-mail Remetente</Label>
                <Input id="from" value={config.from_addr || ''} onChange={(e) => updateConfig('from_addr', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">E-mail Destino</Label>
                <Input id="to" value={config.to_addrs?.[0] || ''} onChange={(e) => updateConfig('to_addrs', [e.target.value])} required />
              </div>
            </div>
          )}

          {type === 'webhook' && (
            <div className="space-y-3 p-4 bg-bg-primary/50 rounded-lg border border-border">
              <div className="space-y-2">
                <Label htmlFor="url">URL do Webhook</Label>
                <Input id="url" value={config.url || ''} onChange={(e) => updateConfig('url', e.target.value)} placeholder="https://..." required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token_bearer">Token Bearer (Opcional)</Label>
                <Input id="token_bearer" value={config.token || ''} onChange={(e) => updateConfig('token', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-text-secondary">Headers Customizados</Label>
                <div className="space-y-2">
                  {Object.entries(config.headers || {}).map(([k, v]: [string, any], idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input placeholder="Key" value={k} readOnly className="h-8 text-xs bg-bg-primary" />
                      <Input placeholder="Value" value={v} readOnly className="h-8 text-xs bg-bg-primary" />
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" 
                        onClick={(e) => {
                          e.preventDefault();
                          const newHeaders = { ...config.headers };
                          delete newHeaders[k];
                          updateConfig('headers', newHeaders);
                        }}>
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input id="new-header-key" placeholder="Key" className="h-8 text-xs" />
                    <Input id="new-header-val" placeholder="Value" className="h-8 text-xs" />
                    <Button variant="outline" size="sm" className="h-8 px-2" onClick={(e) => {
                      e.preventDefault();
                      const keyInput = document.getElementById('new-header-key') as HTMLInputElement;
                      const valInput = document.getElementById('new-header-val') as HTMLInputElement;
                      const key = keyInput.value;
                      const val = valInput.value;
                      if (key) {
                        updateConfig('headers', { ...(config.headers || {}), [key]: val });
                        keyInput.value = '';
                        valInput.value = '';
                      }
                    }}>
                      <PlusCircle size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between items-center sm:justify-between">
            {mode === 'edit' && (
              <Button type="button" variant="ghost" size="sm" className="gap-2 text-xs" onClick={() => onTest(data.id)}>
                <Send size={14} /> Testar Canal
              </Button>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RuleModalComponent({ isOpen, onClose, mode, data, onSubmit, isLoading, channels, eventLabels }: any) {
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('attack_detected');
  const [channelId, setChannelId] = useState('');
  const [minPps, setMinPps] = useState(0);
  const [minMbps, setMinMbps] = useState(0);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setName(data?.name || '');
      setEventType(data?.event_type || 'attack_detected');
      setChannelId(data?.channel_id?.toString() || '');
      setMinPps(data?.min_pps || 0);
      setMinMbps(data?.min_mbps || 0);
      setEnabled(data?.enabled !== false);
    }
  }, [isOpen, data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, event_type: eventType, channel_id: parseInt(channelId), min_pps: minPps, min_mbps: minMbps, enabled });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Nova Regra' : 'Editar Regra'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rule-name">Nome da Regra</Label>
            <Input id="rule-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Alerta grande ataque" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event">Evento</Label>
            <Select value={eventType} onValueChange={(val) => setEventType(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o evento" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(eventLabels).map(([val, label]: [string, any]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="channel">Canal Destino</Label>
            <Select value={channelId.toString()} onValueChange={(val) => setChannelId(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o canal" />
              </SelectTrigger>
              <SelectContent>
                {channels.map((c: any) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pps">PPS Mínimo</Label>
              <Input id="pps" type="number" value={minPps} onChange={(e) => setMinPps(parseInt(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mbps">Mbps Mínimo</Label>
              <Input id="mbps" type="number" value={minMbps} onChange={(e) => setMinMbps(parseInt(e.target.value))} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <Label>Ativa</Label>
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
