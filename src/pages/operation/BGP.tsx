import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
 import { Link as LinkIcon, Activity, Clock, Network, RefreshCw, Wifi } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';

 export default function BGP() {
   const queryClient = useQueryClient();
   
   const { data: flowspecData } = useQuery({
     queryKey: ['mitigation-flowspec'],
     queryFn: () => api.get('/api/mitigation/flowspec').then(r => r.data).catch(() => ({ items: [] })),
     refetchInterval: 10000,
   });
 
   const { data: sessionsData, isLoading: loadingSessions, isRefetching: refetchingSessions, refetch: refetchSessions } = useQuery({
     queryKey: ['bgp-sessions'],
     queryFn: () => api.get('/api/bgp/sessions').then(r => r.data).catch(() => ({ sessions: [] })),
     refetchInterval: 10000,
   });
 
   const { data: routesData, isLoading: loadingRoutes, isRefetching: refetchingRoutes, refetch: refetchRoutes } = useQuery({
     queryKey: ['bgp-routes'],
     queryFn: () => api.get('/api/bgp/routes').then(r => r.data).catch(() => ({ routes: [] })),
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
               const state = (s.state || '').toString().toLowerCase();
               const established = state === 'established' || state === 'up';
               const uptime = calcUptime(sessionsData.bgp_log_tail);
 
              const cards = [];
              
              // Card 1 — IPv4 Unicast
              cards.push(
                <div key={`${s.peer_address}-unicast-${i}`} className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm space-y-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={clsx("w-2 h-2 rounded-full", established ? "bg-success animate-pulse" : "bg-danger")} />
                      <span className="font-mono font-bold text-text-primary">{s.peer_address}</span>
                    </div>
                    <span className={clsx(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                      established ? "bg-success/10 text-success border-success/20" : "bg-danger/10 text-danger border-danger/20"
                    )}>{established ? 'ESTABLISHED' : (s.state || 'OFFLINE')}</span>
                  </div>
                  
                  <div className="text-text-primary font-bold text-sm">
                    IPv4 Unicast
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <p className="text-[10px] font-bold text-text-secondary uppercase">AS Local: {s.local_as} → AS Remoto: {s.remote_as}</p>
                       <p className="text-text-primary mt-1">Speaker: {s.speaker || 'BGP Speaker'}</p>
                    </div>

                    <div className="flex gap-4 pt-2 border-t border-border/50">
                      <div>
                        <div className="text-[10px] text-text-secondary uppercase">Enviadas</div>
                        <div className="text-lg font-bold text-text-primary">{s.prefixes_sent || 0}</div>
                        <div className="text-[10px] text-text-secondary">rotas anunciadas ao peer</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-secondary uppercase">Recebidas</div>
                        <div className="text-lg font-bold text-text-primary">{s.prefixes_received || 0}</div>
                        <div className="text-[10px] text-text-secondary">rotas recebidas do peer</div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-1.5 text-text-secondary font-medium">
                      <Clock size={12} />
                      <span>Uptime: {uptime}</span>
                    </div>
                  </div>
                </div>
              );

              // Card 2 — IPv4 FlowSpec
              if (s.flowspec_enabled) {
                cards.push(
                  <div key={`${s.peer_address}-flowspec-${i}`} className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm space-y-4 hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={clsx("w-2 h-2 rounded-full", established ? "bg-success animate-pulse" : "bg-danger")} />
                        <span className="font-mono font-bold text-text-primary">{s.peer_address}</span>
                      </div>
                      <span className={clsx(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                        established ? "bg-success/10 text-success border-success/20" : "bg-danger/10 text-danger border-danger/20"
                      )}>{established ? 'ESTABLISHED' : (s.state || 'OFFLINE')}</span>
                    </div>
                    
                    <div className="text-text-primary font-bold text-sm">
                      IPv4 FlowSpec
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase">AS Local: {s.local_as} → AS Remoto: {s.remote_as}</p>
                         <p className="text-text-primary mt-1">Speaker: {s.speaker || 'BGP Speaker'}</p>
                      </div>

                      <div className="pt-2 border-t border-border/50">
                        <div className="text-[10px] text-text-secondary uppercase">Regras ativas</div>
                        <div className="text-lg font-bold text-text-primary">{activeFlowspecCount}</div>
                      </div>

                      <div className="pt-2 flex items-center gap-1.5 text-text-secondary font-medium">
                        <Clock size={12} />
                        <span>Uptime: {uptime} (mesma sessão)</span>
                      </div>
                    </div>
                  </div>
                );
              }

              return cards;
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
                   <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Tipo</th>
                   <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Anunciado em</th>
                   <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Tempo ativo</th>
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
                     <td colSpan={6} className="px-4 py-10 text-center text-text-secondary font-medium">
                       <div className="flex flex-col items-center gap-2">
                         <p className="italic">Nenhuma mitigação BGP ativa no momento.</p>
                         <p className="text-[10px] opacity-70">Rotas aparecem aqui quando IPs são colocados em blackhole.</p>
                       </div>
                     </td>
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
                         <td className="px-4 py-3 text-xs text-text-primary font-bold">
                           {timeActive(route.age)}
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