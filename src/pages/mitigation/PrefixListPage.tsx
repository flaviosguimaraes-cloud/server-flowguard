import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Trash2, CheckCircle, XCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';

type Kind = 'whitelist' | 'blacklist';

interface PrefixGroup {
  id: number | string;
  name: string;
  prefixes: string[] | string;
  direction: 'both' | 'incoming' | 'outgoing';
  created_at?: string;
}

export default function PrefixListPage({ kind }: { kind: Kind }) {
  const isAdmin = localStorage.getItem('role') === 'admin';
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', prefixes: '', direction: 'both' as const });

  const title = kind === 'whitelist' ? 'Whitelist' : 'Blacklist';
  const Icon = kind === 'whitelist' ? CheckCircle : XCircle;
  const colorClass = kind === 'whitelist' ? 'text-success' : 'text-danger';

  const { data, isLoading } = useQuery({
    queryKey: [kind],
    queryFn: () => api.get(`/api/${kind}`).then(r => r.data),
    refetchInterval: 30000,
  });

  const items: PrefixGroup[] = data?.items || data?.data || (Array.isArray(data) ? data : []);

  const createMut = useMutation({
    mutationFn: (body: any) => api.post(`/api/${kind}`, body),
    onSuccess: () => {
      toast.success('Grupo criado');
      qc.invalidateQueries({ queryKey: [kind] });
      setOpen(false);
      setForm({ name: '', prefixes: '', direction: 'both' });
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Erro ao criar grupo'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number | string) => api.delete(`/api/${kind}/${id}`),
    onSuccess: () => {
      toast.success('Grupo removido');
      qc.invalidateQueries({ queryKey: [kind] });
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Erro ao remover'),
  });

  const submit = () => {
    const prefixes = form.prefixes.split('\n').map(s => s.trim()).filter(Boolean);
    if (!form.name || prefixes.length === 0) {
      toast.error('Informe nome e ao menos um prefixo');
      return;
    }
    createMut.mutate({ name: form.name, prefixes, direction: form.direction });
  };

  const fmtDate = (s?: string) => {
    if (!s) return '—';
    try { return new Date(s.replace(' ', 'T')).toLocaleString('pt-BR'); } catch { return s; }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Icon className={colorClass} size={24} />
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
            <p className="text-sm text-text-secondary">Grupos de prefixos {kind === 'whitelist' ? 'permitidos' : 'bloqueados'}</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold transition-all shadow-md"
          >
            <Plus size={16} /> Novo Grupo
          </button>
        )}
      </div>

      <div className="bg-bg-secondary rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-primary/50 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                <th className="px-6 py-4 border-b border-border">Nome</th>
                <th className="px-6 py-4 border-b border-border">Prefixos</th>
                <th className="px-6 py-4 border-b border-border text-center">Direção</th>
                <th className="px-6 py-4 border-b border-border">Criado em</th>
                {isAdmin && <th className="px-6 py-4 border-b border-border text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-text-secondary italic">Carregando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-text-secondary italic">Nenhum grupo cadastrado</td></tr>
              ) : items.map((g) => {
                const prefixList = Array.isArray(g.prefixes) ? g.prefixes : String(g.prefixes || '').split(/[,\n]/).filter(Boolean);
                return (
                  <tr key={g.id} className="hover:bg-accent/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-text-primary">{g.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {prefixList.map((p, i) => (
                          <span key={i} className="font-mono text-[11px] px-2 py-0.5 bg-bg-primary border border-border rounded text-text-secondary">{p}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={clsx(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                        g.direction === 'both' && "bg-bg-primary text-text-secondary border-border",
                        g.direction === 'incoming' && "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400",
                        g.direction === 'outgoing' && "bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-400",
                      )}>{g.direction || 'both'}</span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary text-xs">{fmtDate(g.created_at)}</td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => {
                            if (window.confirm(`Remover grupo ${g.name}?`)) deleteMut.mutate(g.id);
                          }}
                          className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-bg-secondary border border-border rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-text-primary">Novo grupo em {title}</h3>
              <button onClick={() => setOpen(false)} className="text-text-secondary hover:text-text-primary"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase">Nome</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase">Prefixos (um por linha, CIDR)</label>
                <textarea value={form.prefixes} onChange={e => setForm({ ...form, prefixes: e.target.value })}
                  rows={5} placeholder="45.175.50.0/24&#10;200.149.59.0/24"
                  className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase">Direção</label>
                <select value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value as any })}
                  className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="both">Ambas (both)</option>
                  <option value="incoming">Entrada (incoming)</option>
                  <option value="outgoing">Saída (outgoing)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <button onClick={() => setOpen(false)} className="px-4 py-2 bg-bg-primary border border-border rounded-lg text-sm font-semibold text-text-secondary hover:text-text-primary">Cancelar</button>
              <button onClick={submit} disabled={createMut.isPending}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                {createMut.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}