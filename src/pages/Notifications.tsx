import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { 
  Bell, MessageCircle, Mail, Webhook, Plus, Trash2, 
  Edit2, Send, Check, X, AlertCircle, ToggleLeft, ToggleRight
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
import Skeleton from '@/components/Skeleton';

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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Bell className="text-primary" size={24} />
        <h1 className="text-2xl font-bold text-text-primary">Notificações</h1>
      </div>

      <section className="bg-bg-secondary rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary">Canais Configurados</h2>
        </div>
        <div className="divide-y divide-border/50">
          {lc ? (
            <div className="px-6 py-12 text-center text-text-secondary italic">Carregando...</div>
          ) : channelItems.length === 0 ? (
            <div className="px-6 py-12 text-center text-text-secondary italic">Nenhum canal configurado</div>
          ) : channelItems.map((c: any, i: number) => (
            <div key={c.id || i} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {iconFor(c.type)}
                <div>
                  <p className="font-bold text-sm text-text-primary">{c.name || c.type}</p>
                  <p className="text-xs text-text-secondary font-mono">{c.target || c.endpoint || c.chat_id || ''}</p>
                </div>
              </div>
              <span className={clsx(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                c.enabled !== false ? "bg-success/10 text-success border-success/20" : "bg-bg-primary text-text-secondary border-border"
              )}>{c.enabled !== false ? 'Ativo' : 'Inativo'}</span>
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
                <th className="px-6 py-3 border-b border-border text-center">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border/50">
              {lr ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-text-secondary italic">Carregando...</td></tr>
              ) : ruleItems.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-text-secondary italic">Nenhuma regra configurada</td></tr>
              ) : ruleItems.map((r: any, i: number) => (
                <tr key={r.id || i} className="hover:bg-accent/5">
                  <td className="px-6 py-3 font-bold text-text-primary text-xs">{r.name || `Regra ${i + 1}`}</td>
                  <td className="px-6 py-3 text-text-secondary text-xs">{r.event || r.trigger || '—'}</td>
                  <td className="px-6 py-3 text-text-secondary text-xs">{r.channel || r.channel_name || '—'}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={clsx(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                      r.enabled !== false ? "bg-success/10 text-success border-success/20" : "bg-bg-primary text-text-secondary border-border"
                    )}>{r.enabled !== false ? 'Ativa' : 'Inativa'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
