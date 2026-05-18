import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { List, Plus, Trash2, Shield, Info, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import FlowSpecModal from '../../components/FlowSpecModal';
import { useAuth } from '../../contexts/AuthContext';

const Flowspec = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data, isLoading } = useQuery({
    queryKey: ['flowspec-rules'],
    queryFn: () => api.get('/api/mitigation/flowspec').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/mitigation/flowspec/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flowspec-rules'] });
      toast.success('Regra removida com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao remover regra');
    }
  });

  const handleDelete = (id: number) => {
    if (window.confirm('Tem certeza que deseja remover esta regra FlowSpec?')) {
      deleteMutation.mutate(id);
    }
  };

  const rules = data?.rules || [];

  const getBgpStatusBadge = (status: string) => {
    const config: any = {
      announced: { color: 'bg-success/10 text-success border-success/20', label: 'Anunciado' },
      pending: { color: 'bg-warning/10 text-warning border-warning/20', label: 'Pendente' },
      withdrawn: { color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', label: 'Removido' },
      error: { color: 'bg-danger/10 text-danger border-danger/20', label: 'Erro' },
    };
    const c = config[status] || { color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', label: status };
    return (
      <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase border", c.color)}>
        {c.label}
      </span>
    );
  };

  const getActionBadge = (action: string) => {
    const config: any = {
      discard: { color: 'bg-danger/10 text-danger border-danger/20', label: 'Descartar' },
      'rate-limit': { color: 'bg-warning/10 text-warning border-warning/20', label: 'Rate Limit' },
    };
    const c = config[action] || { color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', label: action };
    return (
      <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase border", c.color)}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <List className="text-primary" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Regras FlowSpec</h1>
            <p className="text-sm text-text-secondary">Gerenciamento de mitigação BGP na origem</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={20} />
            Nova Regra FlowSpec
          </button>
        )}
      </div>

      <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-primary/50 border-b border-border">
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Destino</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Origem</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Protocolo</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Portas</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Ação</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">BGP Status</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Operador</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Criado</th>
                {isAdmin && <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={10} className="px-4 py-4"><div className="h-4 bg-border/50 rounded w-full" /></td>
                  </tr>
                ))
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-text-secondary italic">Nenhuma regra ativa encontrada</td>
                </tr>
              ) : (
                rules.map((rule: any) => (
                  <tr key={rule.id} className="hover:bg-bg-primary/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">{rule.id}</td>
                    <td className="px-4 py-3 font-mono text-sm text-text-primary font-bold">{rule.dst_prefix}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">{rule.src_prefix || 'any'}</td>
                    <td className="px-4 py-3 font-bold text-xs uppercase text-text-primary">{rule.protocol || 'any'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                      {rule.dst_port ? `Dst: ${rule.dst_port}` : ''}
                      {rule.dst_port && rule.src_port ? ' | ' : ''}
                      {rule.src_port ? `Src: ${rule.src_port}` : ''}
                      {!rule.dst_port && !rule.src_port ? 'any' : ''}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {getActionBadge(rule.action)}
                        {rule.rate_limit_kbps && <span className="text-[9px] text-text-secondary font-mono">{rule.rate_limit_kbps} kbps</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">{getBgpStatusBadge(rule.bgp_status)}</td>
                    <td className="px-4 py-3 text-xs text-text-primary">{rule.operator || 'system'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-xs text-text-primary">{rule.created_at?.split(' ')[0]}</span>
                        <span className="text-[10px] text-text-secondary">{rule.created_at?.split(' ')[1]}</span>
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-1.5 text-danger hover:bg-danger/10 rounded transition-colors"
                          title="Remover regra"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FlowSpecModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['flowspec-rules'] })}
      />
    </div>
  );
};

export default Flowspec;
