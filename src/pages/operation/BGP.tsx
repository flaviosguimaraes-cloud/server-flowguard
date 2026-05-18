import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Link as LinkIcon, Activity, Clock, ArrowUpRight, Network, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';

export default function BGP() {
  const queryClient = useQueryClient();
  
  const { data: sessionsData, isLoading: loadingSessions, isRefetching: refetchingSessions } = useQuery({
    queryKey: ['bgp-sessions'],
    queryFn: () => api.get('/api/bgp/sessions').then(r => r.data).catch(() => ({ items: [] })),
  });

  const { data: routesData, isLoading: loadingRoutes, isRefetching: refetchingRoutes } = useQuery({
    queryKey: ['bgp-routes'],
    queryFn: () => api.get('/api/bgp/routes').then(r => r.data).catch(() => ({ items: [] })),
  });

  const sessions = sessionsData?.items || sessionsData?.sessions || sessionsData?.data || (Array.isArray(sessionsData) ? sessionsData : []);
  const routes = routesData?.items || routesData?.routes || routesData?.data || (Array.isArray(routesData) ? routesData : []);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['bgp-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['bgp-routes'] });
    toast.info('Dados BGP atualizados');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Network size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Operação BGP</h1>
            <p className="text-sm text-text-secondary">Sessões e rotas anunciadas pelo FlowGuard</p>
          </div>
        </div>
        <button 
          onClick={refresh}
          disabled={refetchingSessions || refetchingRoutes}
          className="flex items-center justify-center gap-2 bg-bg-secondary hover:bg-bg-primary border border-border px-4 py-2 rounded-lg text-sm font-bold text-text-primary transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={clsx((refetchingSessions || refetchingRoutes) && "animate-spin")} />
          Atualizar
        </button>
      </div>

      {/* Section 1: Sessions */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <LinkIcon className="text-primary" size={18} />
          <h2 className="text-lg font-bold text-text-primary">Sessões BGP</h2>
        </div>

        {loadingSessions ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2].map(i => <div key={i} className="bg-bg-secondary h-32 rounded-xl border border-border animate-pulse" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-bg-secondary p-10 rounded-xl border border-border text-center text-text-secondary italic">Nenhuma sessão BGP configurada</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sessions.map((s: any, i: number) => {
              const state = (s.state || s.status || '').toString().toLowerCase();
              const established = state.includes('established') || state === 'up' || state === 'ativo';
              return (
                <div key={s.id || s.peer || i} className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm space-y-3 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={clsx("w-2 h-2 rounded-full", established ? "bg-success animate-pulse" : "bg-danger")} />
                      <span className="font-mono font-bold text-text-primary">{s.peer || s.peer_ip || '—'}</span>
                      {s.name && <span className="text-text-secondary text-xs">({s.name})</span>}
                    </div>
                    <span className={clsx(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                      established ? "bg-success/10 text-success border-success/20" : "bg-danger/10 text-danger border-danger/20"
                    )}>{s.state || s.status || '—'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><p className="text-[10px] font-bold text-text-secondary uppercase">AS Remoto</p><p className="font-mono text-text-primary">{s.remote_as || s.peer_as || '—'}</p></div>
                    <div><p className="text-[10px] font-bold text-text-secondary uppercase">AS Local</p><p className="font-mono text-text-primary">{s.local_as || '—'}</p></div>
                    <div><p className="text-[10px] font-bold text-text-secondary uppercase">Speaker</p><p className="text-text-primary">{s.speaker || 'ExaBGP'}</p></div>
                    <div><p className="text-[10px] font-bold text-text-secondary uppercase">FlowSpec</p>
                      <p className={s.flowspec ? "text-success font-bold" : "text-text-secondary"}>{s.flowspec ? 'Ativo' : 'Inativo'}</p>
                    </div>
                    <div className="flex items-center gap-1.5"><Clock size={12} className="text-text-secondary" />
                      <span className="text-text-primary">{s.uptime || s.up_since || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5"><ArrowUpRight size={12} className="text-text-secondary" />
                      <span className="text-text-primary">{s.advertised ?? s.routes_advertised ?? 0} prefixos</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Announced Routes */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Activity className="text-primary" size={18} />
          <h2 className="text-lg font-bold text-text-primary">Rotas Anunciadas</h2>
        </div>

        <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-primary/50 border-b border-border">
                  <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Prefixo</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Next-hop</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Community</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Age</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingRoutes ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-4 py-4"><div className="h-4 bg-border/50 rounded w-full" /></td>
                    </tr>
                  ))
                ) : routes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-text-secondary italic">Nenhuma rota anunciada no momento</td>
                  </tr>
                ) : (
                  routes.map((route: any, i: number) => (
                    <tr key={i} className="hover:bg-bg-primary/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-sm text-text-primary font-bold">{route.prefix}</td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">{route.next_hop || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">{route.community || '—'}</td>
                      <td className="px-4 py-3 text-xs text-text-primary">{route.age || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                          route.type === 'blackhole' ? "bg-danger/10 text-danger border-danger/20" : "bg-primary/10 text-primary border-primary/20"
                        )}>
                          {route.type || 'Standard'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}