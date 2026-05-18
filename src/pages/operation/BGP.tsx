import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Link as LinkIcon, Activity, Clock, ArrowUpRight } from 'lucide-react';
import { clsx } from 'clsx';

export default function BGPSessions() {
  const { data, isLoading } = useQuery({
    queryKey: ['bgp-sessions'],
    queryFn: () => api.get('/api/bgp/sessions').then(r => r.data).catch(() => ({ items: [] })),
    refetchInterval: 15000,
  });

  const items = data?.items || data?.sessions || data?.data || (Array.isArray(data) ? data : []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <LinkIcon className="text-primary" size={24} />
        <h1 className="text-2xl font-bold text-text-primary">Sessões BGP</h1>
      </div>

      {isLoading ? (
        <div className="bg-bg-secondary p-12 rounded-xl border border-border text-center text-text-secondary italic">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="bg-bg-secondary p-12 rounded-xl border border-border text-center text-text-secondary italic">Nenhuma sessão BGP configurada</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((s: any, i: number) => {
            const state = (s.state || s.status || '').toString().toLowerCase();
            const established = state.includes('established') || state === 'up';
            return (
              <div key={s.id || s.peer || i} className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm space-y-3">
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
  );
}