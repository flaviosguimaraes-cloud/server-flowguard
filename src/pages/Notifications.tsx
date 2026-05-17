import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Bell, MessageCircle, Mail, Webhook } from 'lucide-react';
import { clsx } from 'clsx';

export default function Notifications() {
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

  const iconFor = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('telegram')) return <MessageCircle size={16} className="text-blue-500" />;
    if (t.includes('mail') || t.includes('email')) return <Mail size={16} className="text-warning" />;
    if (t.includes('webhook') || t.includes('http')) return <Webhook size={16} className="text-purple-500" />;
    return <Bell size={16} className="text-primary" />;
  };

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
