import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { ClipboardList, X, Calendar, User, Activity, Globe, Info } from 'lucide-react';

const ACTION_LABELS: Record<string, { label: string, color: string, icon: string }> = {
  login_success: { label: 'Login realizado', color: '#22c55e', icon: '🔐' },
  login_failed: { label: 'Login falhou', color: '#ef4444', icon: '⚠️' },
  password_changed: { label: 'Senha alterada', color: '#f59e0b', icon: '🔑' },
  thresholds_updated: { label: 'Limiares alterados', color: '#3b82f6', icon: '⚡' },
  policy_updated: { label: 'Política alterada', color: '#8b5cf6', icon: '🛡' },
  collector_created: { label: 'Coletor criado', color: '#22c55e', icon: '➕' },
  collector_updated: { label: 'Coletor editado', color: '#f59e0b', icon: '✏️' },
  collector_deleted: { label: 'Coletor removido', color: '#ef4444', icon: '🗑' },
  service_restarted: { label: 'Serviço reiniciado', color: '#f97316', icon: '🔄' },
  channel_created: { label: 'Canal de notificação criado', color: '#22c55e', icon: '🔔' },
  channel_updated: { label: 'Canal de notificação editado', color: '#f59e0b', icon: '🔔' },
  channel_deleted: { label: 'Canal de notificação removido', color: '#ef4444', icon: '🔔' },
  rule_created: { label: 'Regra de notificação criada', color: '#22c55e', icon: '📋' },
  rule_updated: { label: 'Regra de notificação editada', color: '#f59e0b', icon: '📋' },
  rule_deleted: { label: 'Regra de notificação removida', color: '#ef4444', icon: '📋' },
  user_created: { label: 'Usuário criado', color: '#22c55e', icon: '👤' },
  user_updated: { label: 'Usuário editado', color: '#f59e0b', icon: '👤' },
  user_deactivated: { label: 'Usuário desativado', color: '#ef4444', icon: '👤' },
};

export default function Audit() {
  const [filters, setFilters] = useState({ user: '', action: '', start: '', end: '' });
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const isAuthenticated = !!localStorage.getItem('access_token');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', page, pageSize, filters],
    enabled: isAuthenticated,
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      });
      if (filters.user) params.append('username', filters.user);
      if (filters.action) params.append('action', filters.action);
      if (filters.start) params.append('start', filters.start);
      if (filters.end) params.append('end', filters.end);

      const r = await api.get(`/api/audit/logs?${params.toString()}`);
      return r.data;
    },
    refetchInterval: 60000,
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    setPage(1);
  }, [pageSize, filters]);

  const fmt = (s?: string) => {
    if (!s) return '—';
    try { return new Date(s.replace(' ', 'T')).toLocaleString('pt-BR'); } catch { return s; }
  };

  const handleFilter = () => {
    setPage(1);
    refetch();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <ClipboardList className="text-primary" size={24} />
        <h1 className="text-2xl font-bold text-text-primary">Auditoria</h1>
      </div>

      <div className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Usuário</label>
            <input placeholder="Filtrar por usuário" value={filters.user} onChange={e => setFilters({ ...filters, user: e.target.value })}
              className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Ação</label>
            <select value={filters.action} onChange={e => setFilters({ ...filters, action: e.target.value })}
              className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30 appearance-none">
              <option value="">Todas as ações</option>
              {Object.entries(ACTION_LABELS).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Início</label>
            <input type="datetime-local" value={filters.start} onChange={e => setFilters({ ...filters, start: e.target.value })}
              className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Fim</label>
            <input type="datetime-local" value={filters.end} onChange={e => setFilters({ ...filters, end: e.target.value })}
              className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={handleFilter} className="flex-1 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors">Filtrar</button>
            <button onClick={() => setFilters({ user: '', action: '', start: '', end: '' })}
              className="p-2 bg-bg-primary border border-border rounded-lg text-text-secondary hover:text-text-primary" title="Limpar"><X size={20} /></button>
          </div>
        </div>
      </div>

      <div className="bg-bg-secondary rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-primary/50 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                <th className="px-6 py-4 border-b border-border">Data/Hora</th>
                <th className="px-6 py-4 border-b border-border">Usuário</th>
                <th className="px-6 py-4 border-b border-border">Ação</th>
                <th className="px-6 py-4 border-b border-border">Detalhes</th>
                <th className="px-6 py-4 border-b border-border">IP</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-text-secondary italic">Carregando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-text-secondary italic">Nenhum log encontrado</td></tr>
              ) : items.map((it: any, i: number) => {
                const config = ACTION_LABELS[it.action] || { label: it.action, color: '#8892a4', icon: '📝' };
                return (
                  <tr key={it.id || i} className="hover:bg-accent/5 transition-colors">
                    <td className="px-6 py-4 text-xs text-text-secondary font-mono whitespace-nowrap">{fmt(it.timestamp || it.created_at)}</td>
                    <td className="px-6 py-4 text-xs font-bold text-text-primary">{it.user || it.username || '—'}</td>
                    <td className="px-6 py-4 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{config.icon}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border" 
                          style={{ color: config.color, borderColor: `${config.color}30`, backgroundColor: `${config.color}10` }}>
                          {config.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-text-secondary max-w-md" title={typeof it.details === 'string' ? it.details : JSON.stringify(it.details || {})}>
                      <div className="truncate">
                        {typeof it.details === 'string' ? it.details : it.details?.info || JSON.stringify(it.details) || (it.message || '—')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-text-secondary">{it.ip || it.ip_address || it.client_ip || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-border bg-bg-primary/30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs text-text-secondary font-bold uppercase tracking-widest">Linhas por página:</span>
            <select 
              value={pageSize} 
              onChange={e => setPageSize(Number(e.target.value))}
              className="bg-bg-primary border border-border rounded px-2 py-1 text-xs text-text-primary outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-xs text-text-secondary ml-4">
              Total: <span className="text-text-primary font-bold">{total}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 bg-bg-primary border border-border rounded-lg text-xs font-bold text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all"
            >
              Anterior
            </button>
            <span className="text-xs font-bold text-text-primary px-2">
              Página {page} de {Math.max(1, totalPages)}
            </span>
            <button 
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 bg-bg-primary border border-border rounded-lg text-xs font-bold text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}