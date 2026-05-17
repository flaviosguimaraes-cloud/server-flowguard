import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { ClipboardList, X } from 'lucide-react';

export default function Audit() {
  const [filters, setFilters] = useState({ user: '', action: '', start: '', end: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/api/audit/logs?limit=100').then(r => r.data).catch(() => ({ items: [] })),
    refetchInterval: 30000,
  });

  const items = data?.items || data?.data || (Array.isArray(data) ? data : []);

  const filtered = useMemo(() => {
    return items.filter((it: any) => {
      if (filters.user && !(it.user || it.username || '').toLowerCase().includes(filters.user.toLowerCase())) return false;
      if (filters.action && !(it.action || '').toLowerCase().includes(filters.action.toLowerCase())) return false;
      const ts = it.timestamp || it.created_at;
      if (ts && filters.start) { try { if (new Date(ts.replace(' ', 'T')) < new Date(filters.start)) return false; } catch {} }
      if (ts && filters.end) { try { if (new Date(ts.replace(' ', 'T')) > new Date(filters.end)) return false; } catch {} }
      return true;
    });
  }, [items, filters]);

  const fmt = (s?: string) => {
    if (!s) return '—';
    try { return new Date(s.replace(' ', 'T')).toLocaleString('pt-BR'); } catch { return s; }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <ClipboardList className="text-primary" size={24} />
        <h1 className="text-2xl font-bold text-text-primary">Auditoria</h1>
      </div>

      <div className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input placeholder="Usuário" value={filters.user} onChange={e => setFilters({ ...filters, user: e.target.value })}
            className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30" />
          <input placeholder="Ação" value={filters.action} onChange={e => setFilters({ ...filters, action: e.target.value })}
            className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30" />
          <input type="datetime-local" value={filters.start} onChange={e => setFilters({ ...filters, start: e.target.value })}
            className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30" />
          <div className="flex gap-2">
            <input type="datetime-local" value={filters.end} onChange={e => setFilters({ ...filters, end: e.target.value })}
              className="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={() => setFilters({ user: '', action: '', start: '', end: '' })}
              className="p-2 bg-bg-primary border border-border rounded-lg text-text-secondary hover:text-text-primary" title="Limpar"><X size={16} /></button>
          </div>
        </div>
      </div>

      <div className="bg-bg-secondary rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-primary/50 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                <th className="px-6 py-3 border-b border-border">Timestamp</th>
                <th className="px-6 py-3 border-b border-border">Usuário</th>
                <th className="px-6 py-3 border-b border-border">Ação</th>
                <th className="px-6 py-3 border-b border-border">IP</th>
                <th className="px-6 py-3 border-b border-border">Detalhes</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-text-secondary italic">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-text-secondary italic">Nenhum log encontrado</td></tr>
              ) : filtered.map((it: any, i: number) => (
                <tr key={it.id || i} className="hover:bg-accent/5">
                  <td className="px-6 py-3 text-xs text-text-secondary font-mono whitespace-nowrap">{fmt(it.timestamp || it.created_at)}</td>
                  <td className="px-6 py-3 text-xs font-bold text-text-primary">{it.user || it.username || '—'}</td>
                  <td className="px-6 py-3 text-xs">
                    <span className="px-2 py-0.5 rounded bg-bg-primary border border-border text-text-secondary font-mono">{it.action || '—'}</span>
                  </td>
                  <td className="px-6 py-3 text-xs font-mono text-text-secondary">{it.ip || it.client_ip || '—'}</td>
                  <td className="px-6 py-3 text-xs text-text-secondary max-w-md truncate" title={typeof it.details === 'string' ? it.details : JSON.stringify(it.details || {})}>
                    {typeof it.details === 'string' ? it.details : it.details ? JSON.stringify(it.details) : (it.message || '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}