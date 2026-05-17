import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Server, Eye, X, Clock } from 'lucide-react';
import { clsx } from 'clsx';

export default function Collectors() {
  const { data, isLoading } = useQuery({
    queryKey: ['collectors'],
    queryFn: () => api.get('/api/collectors').then(r => r.data).catch(() => ({ items: [] })),
    refetchInterval: 30000,
  });
  const [openIfaces, setOpenIfaces] = useState<any | null>(null);

  const items = data?.items || data?.data || (Array.isArray(data) ? data : []);

  const fmt = (s?: string) => {
    if (!s) return '—';
    try { return new Date(s.replace(' ', 'T')).toLocaleString('pt-BR'); } catch { return s; }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Server className="text-primary" size={24} />
        <h1 className="text-2xl font-bold text-text-primary">Coletores</h1>
      </div>

      {isLoading ? (
        <div className="bg-bg-secondary p-12 rounded-xl border border-border text-center text-text-secondary italic">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="bg-bg-secondary p-12 rounded-xl border border-border text-center text-text-secondary italic">Nenhum coletor configurado</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((c: any, i: number) => {
            const active = c.status === 'active' || c.status === 'up' || c.enabled !== false;
            const ifaces = c.interfaces || c.ifaces || [];
            return (
              <div key={c.id || c.name || i} className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className={clsx("w-2 h-2 rounded-full", active ? "bg-success animate-pulse" : "bg-text-secondary")} />
                      <h3 className="font-bold text-text-primary">{c.name || c.hostname || c.ip}</h3>
                    </div>
                    <p className="text-xs font-mono text-text-secondary mt-0.5">{c.ip}</p>
                  </div>
                  <span className={clsx(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                    active ? "bg-success/10 text-success border-success/20" : "bg-bg-primary text-text-secondary border-border"
                  )}>{active ? 'Ativo' : 'Inativo'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-text-secondary">SNMP:</span> <span className="font-mono text-text-primary">{c.snmp_version || c.snmp || '—'}</span></div>
                  <div><span className="text-text-secondary">Interfaces:</span> <span className="font-bold text-text-primary">{Array.isArray(ifaces) ? ifaces.length : (c.interface_count || 0)}</span></div>
                  <div className="col-span-2 flex items-center gap-1.5 text-text-secondary"><Clock size={12} /> Última coleta: {fmt(c.last_seen || c.last_poll)}</div>
                </div>
                {Array.isArray(ifaces) && ifaces.length > 0 && (
                  <button onClick={() => setOpenIfaces({ name: c.name || c.ip, ifaces })}
                    className="w-full flex items-center justify-center gap-2 mt-2 px-3 py-1.5 bg-bg-primary border border-border rounded-lg text-xs font-bold text-text-primary hover:bg-primary/5">
                    <Eye size={14} /> Ver interfaces
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {openIfaces && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpenIfaces(null)}>
          <div className="bg-bg-secondary border border-border rounded-xl shadow-2xl w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-text-primary">Interfaces de {openIfaces.name}</h3>
              <button onClick={() => setOpenIfaces(null)} className="text-text-secondary hover:text-text-primary"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto p-4 space-y-1">
              {openIfaces.ifaces.map((iface: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-bg-primary rounded-lg border border-border">
                  <span className="font-mono text-sm text-text-primary">{typeof iface === 'string' ? iface : (iface.name || iface.ifname || iface.alias || JSON.stringify(iface))}</span>
                  {typeof iface === 'object' && iface.status && (
                    <span className="text-[10px] font-bold uppercase text-text-secondary">{iface.status}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
