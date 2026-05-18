import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
 import { Link as LinkIcon, Activity, Clock, Network, RefreshCw, Wifi } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';

export default function BGP() {
  const queryClient = useQueryClient();
  
   const { data: sessionsData, isLoading: loadingSessions, isRefetching: refetchingSessions, refetch: refetchSessions } = useQuery({
   const { data: flowspecData } = useQuery({
     queryKey: ['mitigation-flowspec'],
     queryFn: () => api.get('/api/mitigation/flowspec').then(r => r.data).catch(() => ({ items: [] })),
     refetchInterval: 10000,
   });
 
   const activeFlowspecCount = (flowspecData?.items || []).filter((item: any) => item.bgp_status === 'announced').length;
 
   const calcUptime = (logTail: string) => {
     if (!logTail) return '—';
     const lines = logTail.split('\n');
     for (const line of lines.reverse()) {
       const match = line.match(/(\w+\s+\d+\s+\d+:\d+:\d+)/);
       if (match && line.includes('connected')) {
         const connTime = new Date(match[1] + ' 2026');
         const diff = Math.floor((Date.now() - connTime.getTime()) / 1000);
         if (diff < 0) return '—';
         if (diff < 60) return `${diff}s`;
         if (diff < 3600) return `${Math.floor(diff/60)}m ${diff%60}s`;
         return `${Math.floor(diff/3600)}h ${Math.floor((diff%3600)/60)}m`;
       }
     }
     return '—';
   };
 
   const timeActive = (age: string) => {
     if (!age) return '—';
     const d = new Date(age.replace(' ', 'T'));
     const diff = Math.floor((Date.now() - d.getTime()) / 1000);
     if (diff < 0) return '—';
     if (diff < 60) return `${diff}s`;
     if (diff < 3600) return `${Math.floor(diff/60)}m`;
     return `${Math.floor(diff/3600)}h ${Math.floor((diff%3600)/60)}m`;
   };
 
    queryKey: ['bgp-sessions'],
    queryFn: () => api.get('/api/bgp/sessions').then(r => r.data).catch(() => ({ sessions: [] })),
    refetchInterval: 10000,
  });

  const { data: routesData, isLoading: loadingRoutes, isRefetching: refetchingRoutes, refetch: refetchRoutes } = useQuery({
    queryKey: ['bgp-routes'],
    queryFn: () => api.get('/api/bgp/routes').then(r => r.data).catch(() => ({ routes: [] })),
    refetchInterval: 10000,
  });

  const sessions = sessionsData?.sessions || [];
  const routes = routesData?.routes || [];

  const refresh = () => {
    refetchSessions();
    refetchRoutes();
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Section 1: Sessions */}
        <div className="xl:col-span-2 space-y-4">
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
                const state = (s.state || '').toString().toLowerCase();
                const established = state === 'established' || state === 'up';
                return (
                  <div key={s.peer_address || i} className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm space-y-3 hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={clsx("w-2 h-2 rounded-full", established ? "bg-success animate-pulse" : "bg-danger")} />
                        <span className="font-mono font-bold text-text-primary">{s.peer_address}</span>
                        {s.peer_name && <span className="text-text-secondary text-xs">({s.peer_name})</span>}
                      </div>
                      <span className={clsx(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                        established ? "bg-success/10 text-success border-success/20" : "bg-danger/10 text-danger border-danger/20"
                      )}>{s.state || 'Offline'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">AS Local → Remoto</p>
                        <p className="font-mono text-text-primary">{s.local_as} → {s.remote_as}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">Speaker</p>
                        <p className="text-text-primary capitalize">{s.speaker || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">FlowSpec</p>
                        <span className={clsx(
                          "px-1.5 py-0.5 rounded text-[10px] font-bold",
                          s.flowspec_enabled ? "bg-success/10 text-success" : "bg-bg-primary text-text-secondary border border-border"
                        )}>{s.flowspec_enabled ? 'Ativo' : 'Inativo'}</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">Prefixos (R/S)</p>
                        <p className="text-text-primary">{s.prefixes_received || 0} / {s.prefixes_sent || 0}</p>
                      </div>
                      <div className="col-span-2 pt-1 flex items-center gap-1.5 text-text-secondary">
                        <Clock size={12} />
                        <span>Uptime: {s.uptime || '—'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 3: Speaker Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Cpu className="text-primary" size={18} />
            <h2 className="text-lg font-bold text-text-primary">Informações do Speaker</h2>
          </div>
          
          <div className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Wifi size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary">ExaBGP Speaker</p>
                <p className="text-[10px] text-text-secondary uppercase font-bold">Software de Anúncio</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <FileCode size={14} className="mt-1 text-text-secondary" />
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase">Configuração</p>
                  <p className="text-xs font-mono text-text-primary">/etc/exabgp/exabgp.conf</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Database size={14} className="mt-1 text-text-secondary" />
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase">Pipe FIFO</p>
                  <p className="text-xs font-mono text-text-primary">/opt/flowguard/exabgp/cmd.fifo</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase">Router-ID</p>
                  <p className="text-xs font-mono text-text-primary">45.175.50.219</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase">Famílias</p>
                  <p className="text-[10px] text-text-primary font-bold">IPv4 Unicast + FS</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Status do Serviço</span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-success uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Operacional
              </span>
            </div>
          </div>
        </div>
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
                  <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Anunciado em</th>
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
                    <td colSpan={5} className="px-4 py-10 text-center text-text-secondary italic font-medium">Nenhuma rota anunciada no momento</td>
                  </tr>
                ) : (
                  routes.map((route: any, i: number) => {
                    const type = (route.type || '').toLowerCase();
                    return (
                      <tr key={i} className="hover:bg-bg-primary/30 transition-colors group">
                        <td className="px-4 py-3 font-mono text-sm text-text-primary font-bold group-hover:text-primary transition-colors">{route.prefix}</td>
                        <td className="px-4 py-3 font-mono text-xs text-text-secondary">{route.nexthop || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-text-secondary">{route.community || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={clsx(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                            type === 'blackhole' ? "bg-danger/10 text-danger border-danger/20" : 
                            type === 'external' ? "bg-warning/10 text-warning border-warning/20" :
                            type === 'flowspec' ? "bg-purple-500/10 text-purple-500 border-purple-500/20" :
                            "bg-primary/10 text-primary border-primary/20"
                          )}>
                            {type === 'blackhole' ? 'Blackhole' : 
                             type === 'external' ? 'Ext. Mitigação' : 
                             type === 'flowspec' ? 'FlowSpec' : (route.type || 'Standard')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-primary flex items-center gap-2">
                          <Clock size={12} className="text-text-secondary" />
                          {route.age || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}