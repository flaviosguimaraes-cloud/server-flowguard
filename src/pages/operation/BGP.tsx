import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Link as LinkIcon, Activity, Clock, Network, RefreshCw, Trash2, Shield, AlertCircle, Info, User, Calendar } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";

export default function BGP() {
  const queryClient = useQueryClient();
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [routeToDelete, setRouteToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
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

  const { data: flowspecData } = useQuery({
    queryKey: ['flowspec-rules'],
    queryFn: () => api.get('/api/mitigation/flowspec').then(r => r.data).catch(() => ({ items: [] })),
    refetchInterval: 30000,
  });

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCountdown = (expires_at: string) => {
    if (!expires_at) return null;
    const diff = new Date(expires_at).getTime() - now.getTime();
    if (diff <= 0) return "Expirado";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const getCountdownColor = (expires_at: string) => {
    if (!expires_at) return '';
    const diff = new Date(expires_at).getTime() - now.getTime();
    if (diff <= 0) return 'text-danger';
    if (diff < 300000) return 'text-danger animate-pulse'; // < 5min
    if (diff < 1800000) return 'text-[#ef4444]'; // < 30min
    if (diff < 3600000) return 'text-[#f59e0b]'; // < 1h
    return 'text-text-secondary';
  };

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

  const parseReason = (reason: string) => {
    const parts = (reason || '')
      .split(',')
      .map(p => p.trim());

    const result = {
      src: '—',
      proto: '—',
      sport: '—',
      dport: '—',
    };

    parts.forEach(p => {
      if (p.startsWith('src:'))
        result.src = p.replace('src:','');
      if (p.startsWith('proto:'))
        result.proto = p.replace('proto:','');
      if (p.startsWith('sport:'))
        result.sport = p.replace('sport:','');
      if (p.startsWith('dport:'))
        result.dport = p.replace('dport:','');
    });

    return result;
  };

  const sessions = sessionsData?.sessions || [];
  const routes = routesData?.routes || [];
  
  // AJUSTE 5 — Contador no card FlowSpec
  const activeFlowspecCount = routes.filter((r: any) => r.type === 'flowspec').length;

  const refresh = () => {
    refetchSessions();
    refetchRoutes();
    toast.info('Dados BGP atualizados');
  };

  const handleDelete = async (route: any) => {
    setIsDeleting(true);
    try {
      const type = (route.type || '').toLowerCase();
      if (type === 'flowspec') {
        // Para flowspec, precisamos buscar o ID real da regra
        const fsResponse = await api.get('/api/mitigation/flowspec');
        const flowspecRules = fsResponse.data?.rules || fsResponse.data?.items || [];
        const matchRule = flowspecRules.find((r: any) => r.dst_prefix === route.prefix);
        
        if (matchRule?.id) {
          await api.delete(`/api/mitigation/flowspec/${matchRule.id}`);
        } else {
          throw new Error('Não foi possível encontrar o ID da regra FlowSpec');
        }
      } else {
        await api.post('/api/mitigation/remove', {
          ip: route.prefix.split('/')[0],
          reason: 'manual'
        });
      }
      toast.success('Rota removida com sucesso');
      queryClient.invalidateQueries({ queryKey: ['bgp-routes'] });
      setSelectedRoute(null);
      setRouteToDelete(null);
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || 'Erro ao remover rota';
      toast.error(String(msg));
    } finally {
      setIsDeleting(false);
    }
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
              const uptime = s.uptime || calcUptime(sessionsData.bgp_log_tail);

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
                    <p className="text-[10px] font-bold text-text-secondary uppercase">AS Local: {s.local_as} → AS Remoto: {s.remote_as}</p>

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
                      <p className="text-[10px] font-bold text-text-secondary uppercase">AS Local: {s.local_as} → AS Remoto: {s.remote_as}</p>

                      <div className="pt-2 border-t border-border/50">
                        <div className="text-[10px] text-text-secondary uppercase">Regras ativas</div>
                        <div className="text-lg font-bold text-text-primary">{activeFlowspecCount}</div>
                      </div>

                      <div className="pt-2 flex items-center gap-1.5 text-text-secondary font-medium">
                        <Clock size={12} />
                        <span>Uptime: {uptime}</span>
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
                  {/* AJUSTE 3 — Coluna DETALHES */}
                  <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Detalhes</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Tipo</th>
                  {/* AJUSTE 4 — Coluna AÇÃO */}
                  <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Ação</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Origem</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Expira em</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Anunciado em</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Tempo ativo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingRoutes ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={8} className="px-4 py-4"><div className="h-4 bg-border/50 rounded w-full" /></td>
                    </tr>
                  ))
                ) : routes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-text-secondary font-medium">
                      <div className="flex flex-col items-center gap-2">
                        <p className="italic">Nenhuma mitigação BGP ativa no momento.</p>
                        <p className="text-[10px] opacity-70">Rotas aparecem aqui quando IPs são colocados em blackhole ou bloqueados.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  routes.map((route: any, i: number) => {
                    const type = (route.type || '').toLowerCase();
                    const source = (route.source || '').toLowerCase();
                    const action = (route.action || '').toLowerCase();
                    
                    // Cross-reference with FlowSpec rules to get full action details
                    const rules = flowspecData?.rules || flowspecData?.items || [];
                    const rule = rules.find((r: any) => 
                      r.dst_prefix === route.prefix || r.src_prefix === route.prefix
                    );

                    const getFormattedAction = () => {
                      if (type !== 'flowspec') return '—';
                      if (rule?.action === 'rate-limit') {
                        const mbps = rule.rate_limit_kbps 
                          ? (rule.rate_limit_kbps / 1000).toFixed(1)
                          : '?';
                        return (
                          <div className="flex items-center gap-1 text-primary font-bold">
                            <span>⚡</span>
                            <span>Rate-Limit: {mbps} Mbps</span>
                          </div>
                        );
                      }
                      return (
                        <div className="flex items-center gap-1 text-danger font-bold">
                          <span>🚫</span>
                          <span>Descartar</span>
                        </div>
                      );
                    };

                    const getFormattedMatch = () => {
                      if (type !== 'flowspec') return route.community || '—';
                      // Transform "src:34.18.209.206/32, proto:tcp" into "src:34.18.209.206/32 · proto:TCP"
                      return (route.reason || '')
                        .split(',')
                        .map((p: string) => p.trim())
                        .join(' · ')
                        .replace('proto:tcp', 'proto:TCP')
                        .replace('proto:udp', 'proto:UDP')
                        .replace('proto:icmp', 'proto:ICMP');
                    };

                    return (
                      <tr 
                        key={i} 
                        className="hover:bg-bg-primary/30 transition-colors group cursor-pointer"
                        onClick={() => setSelectedRoute(route)}
                      >
                        <td className="px-4 py-3 font-mono text-sm text-text-primary font-bold group-hover:text-primary transition-colors">
                          <div className="flex items-center gap-2">
                            {route.prefix}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-text-secondary">{route.nexthop || '—'}</td>
                        
                        <td className="px-4 py-3 font-mono text-xs">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-text-secondary">
                              {getFormattedMatch()}
                            </span>
                            {type === 'flowspec' && (
                              <span className="text-[10px]">
                                {getFormattedAction()}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className={clsx(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                            type === 'blackhole' && "bg-danger/10 text-danger border-danger/20",
                            type === 'blacklist' && "bg-red-900/10 text-[#991b1b] border-[#991b1b]/20",
                            type === 'external' && "bg-warning/10 text-warning border-warning/20",
                            "transition-all"
                          )}
                          style={type === 'flowspec' ? {
                            background: '#7c3aed20',
                            color: '#7c3aed',
                            border: '1px solid #7c3aed40'
                          } : undefined}
                          >
                            {type === 'blackhole' ? 'Blackhole' : 
                             type === 'blacklist' ? 'Blacklist' :
                             type === 'external' ? 'Ext. Mitigação' : 
                             type === 'flowspec' ? 'FlowSpec' : (route.type || 'Standard')}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-xs text-text-primary">
                          {getFormattedAction()}
                        </td>

                        <td className="px-4 py-3 text-xs text-text-primary">
                          {source === 'mitigation' ? 'Mitigação automática' :
                           source === 'blacklist' ? 'Blacklist manual' :
                           source === 'manual' ? 'Manual' : (route.source || '—')}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {type === 'flowspec' ? (
                            (() => {
                              const rules = flowspecData?.rules || flowspecData?.items || [];
                              const rule = rules.find((r: any) => r.dst_prefix === route.prefix);
                              const expiresAt = rule?.expires_at;
                              return expiresAt ? (
                                <span className={clsx("font-mono font-bold", getCountdownColor(expiresAt))}>
                                  {getCountdown(expiresAt)}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-500/10 text-gray-500 border border-gray-500/20">
                                  Permanente
                                </span>
                              );
                            })()
                          ) : (
                            <span className="text-text-secondary">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-text-primary">
                          <div className="flex items-center gap-2">
                            <Clock size={12} className="text-text-secondary" />
                            {route.age || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-primary font-bold relative">
                          <div className="flex items-center justify-between gap-2">
                            {timeActive(route.age)}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRouteToDelete(route);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-danger/10 rounded-lg text-danger"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
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

      {/* Route Details Modal */}
      <Sheet open={!!selectedRoute} onOpenChange={(open) => !open && setSelectedRoute(null)}>
        <SheetContent className="sm:max-w-md bg-bg-secondary border-l border-border">
          <SheetHeader className="text-left pb-4">
            <SheetTitle className="flex items-center gap-2 text-xl font-bold">
              {selectedRoute?.type === 'flowspec' ? 'Regra FlowSpec' : 'Rota Blackhole'}
            </SheetTitle>
          </SheetHeader>
          
          {selectedRoute && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              {/* Status Header */}
              <div className={clsx(
                "p-4 rounded-xl border flex items-center gap-3",
                selectedRoute.type === 'flowspec' ? "bg-primary/5 border-primary/20 text-primary" : "bg-danger/5 border-danger/20 text-danger"
              )}>
                <div className={clsx("p-2 rounded-lg", selectedRoute.type === 'flowspec' ? "bg-primary/10" : "bg-danger/10")}>
                  {selectedRoute.type === 'flowspec' ? <Shield size={24} /> : <AlertCircle size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black uppercase tracking-wider text-xs">
                      {selectedRoute.type === 'flowspec' ? '🟣 FLOWSPEC' : '🔴 BLACKHOLE'}
                    </span>
                    {selectedRoute.type === 'flowspec' && (
                      <span className="font-bold">· {selectedRoute.action === 'discard' ? 'Descartar' : 'Rate Limit'}</span>
                    )}
                  </div>
                </div>
              </div>

              {selectedRoute.type === 'flowspec' ? (() => {
                const info = parseReason(selectedRoute.reason);
                return (
                  <>
                    {/* FlowSpec Details */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Destino</h4>
                        <p className="font-mono text-lg font-bold text-text-primary">Prefixo: {selectedRoute.prefix}</p>
                      </div>

                      <Separator className="bg-border/50" />

                      <div>
                        <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Origem Bloqueada</h4>
                        <div className="space-y-2">
                          <p className="font-mono text-sm text-text-primary flex justify-between">
                            <span className="text-text-secondary">Prefixo:</span>
                            <span className="font-bold">{info.src !== '—' ? info.src : 'Qualquer (0.0.0.0/0)'}</span>
                          </p>
                          <p className="font-mono text-sm text-text-primary flex justify-between">
                            <span className="text-text-secondary">Protocolo:</span>
                            <span className="font-bold uppercase">{info.proto}</span>
                          </p>
                          <p className="font-mono text-sm text-text-primary flex justify-between">
                            <span className="text-text-secondary">Porta origem:</span>
                            <span className="font-bold">{info.sport}</span>
                          </p>
                          <p className="font-mono text-sm text-text-primary flex justify-between">
                            <span className="text-text-secondary">Porta destino:</span>
                            <span className="font-bold">{info.dport}</span>
                          </p>
                        </div>
                      </div>

                      <Separator className="bg-border/50" />

                    <div>
                      <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Informações</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-secondary flex items-center gap-1.5"><Calendar size={14} /> Criado em:</span>
                          <span className="text-text-primary font-bold">{selectedRoute.age?.substring(5, 16).replace('-', '/') || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-secondary flex items-center gap-1.5"><User size={14} /> Criado por:</span>
                          <span className="text-text-primary font-bold">{selectedRoute.created_by || 'sistema'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-secondary flex items-center gap-1.5"><Clock size={14} /> Tempo ativo:</span>
                          <span className="text-text-primary font-bold">{timeActive(selectedRoute.age)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-secondary flex items-center gap-1.5"><Info size={14} /> Status:</span>
                          <Badge className="bg-success/10 text-success border-success/20 font-bold text-[10px]">ATIVA</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <Button 
                      variant="destructive" 
                      className="w-full font-bold gap-2 bg-danger hover:bg-danger/90"
                      onClick={() => setRouteToDelete(selectedRoute)}
                    >
                      <Trash2 size={16} />
                      Remover regra
                    </Button>
                  </div>
                  </>
                );
              })() : (
                <>
                  {/* Blackhole Details */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">IP Bloqueado</h4>
                      <p className="font-mono text-lg font-bold text-text-primary">Prefixo: {selectedRoute.prefix}</p>
                    </div>

                    <Separator className="bg-border/50" />

                    <div>
                      <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">BGP</h4>
                      <div className="space-y-2">
                        <p className="font-mono text-sm text-text-primary flex justify-between">
                          <span className="text-text-secondary">Next-hop:</span>
                          <span className="font-bold">{selectedRoute.nexthop || '—'}</span>
                        </p>
                        <p className="font-mono text-sm text-text-primary flex justify-between">
                          <span className="text-text-secondary">Community:</span>
                          <span className="font-bold">{selectedRoute.community || '—'}</span>
                        </p>
                      </div>
                    </div>

                    <Separator className="bg-border/50" />

                    <div>
                      <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Informações</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-secondary flex items-center gap-1.5"><Calendar size={14} /> Anunciado em:</span>
                          <span className="text-text-primary font-bold">{selectedRoute.age?.substring(5, 16).replace('-', '/') || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-secondary flex items-center gap-1.5"><Clock size={14} /> Tempo ativo:</span>
                          <span className="text-text-primary font-bold">{timeActive(selectedRoute.age)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-secondary flex items-center gap-1.5"><Info size={14} /> Origem:</span>
                          <span className="text-text-primary font-bold">
                            {selectedRoute.source === 'mitigation' ? 'Mitigação automática' :
                             selectedRoute.source === 'blacklist' ? 'Blacklist manual' : 'Manual'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <Button 
                      variant="destructive" 
                      className="w-full font-bold gap-2 bg-danger hover:bg-danger/90"
                      onClick={() => setRouteToDelete(selectedRoute)}
                    >
                      <Trash2 size={16} />
                      Remover blackhole
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!routeToDelete} onOpenChange={(open) => !open && setRouteToDelete(null)}>
        <AlertDialogContent className="bg-bg-secondary border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary">Remover esta rota?</AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary">
              Esta ação retirará o anúncio BGP para <strong>{routeToDelete?.prefix}</strong>. O tráfego voltará a fluir normalmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-bg-primary text-text-primary hover:bg-bg-primary/80 border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleDelete(routeToDelete)}
              className="bg-danger text-white hover:bg-danger/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}