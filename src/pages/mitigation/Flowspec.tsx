import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { List, Plus, Trash2, Shield, Info, AlertTriangle, Clock, Zap, Save, Check } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import FlowSpecModal from '../../components/FlowSpecModal';
import { useAuth } from '../../contexts/AuthContext';

const Flowspec = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: autoConfigData } = useQuery({
    queryKey: ['mitigation-auto-config'],
    queryFn: () => api.get('/api/mitigation/auto-config').then(r => r.data).catch(() => ({})),
  });

  const [autoConfig, setAutoConfig] = useState<any>({
    block_mode: 'by_port',
    block_protocols: ['udp', 'tcp'],
    direction: 'incoming',
    default_action: 'discard',
    default_rate_limit_kbps: 1000,
    default_ttl_minutes: 120,
    detect_udp_flood: true,
    detect_syn_flood: true,
    detect_dns_amp: true,
    detect_ntp_amp: true,
    detect_ssdp_amp: false,
    flowspec_src_mode: 'any'
  });

  const [savingAutoConfig, setSavingAutoConfig] = useState(false);

  useEffect(() => {
    if (autoConfigData && Object.keys(autoConfigData).length > 0) {
      setAutoConfig({
        ...autoConfig,
        ...autoConfigData,
        block_protocols: Array.isArray(autoConfigData.block_protocols) 
          ? autoConfigData.block_protocols 
          : (autoConfigData.block_protocols?.split(',') || autoConfigData.protocols?.split(',') || ['udp', 'tcp']),
        block_mode: autoConfigData.block_mode || 'by_port',
        direction: autoConfigData.direction || 'incoming',
      });
    }
  }, [autoConfigData]);

  const handleSaveAutoConfig = async () => {
    setSavingAutoConfig(true);
    try {
      await api.put('/api/mitigation/auto-config', {
        ...autoConfig,
        default_rate_limit_kbps: Number(autoConfig.default_rate_limit_kbps) || 1000,
        default_ttl_minutes: Number(autoConfig.default_ttl_minutes) || 120,
      });
      toast.success('Configuração automática salva');
      queryClient.invalidateQueries({ queryKey: ['mitigation-auto-config'] });
    } catch (e: any) {
      const errorMsg = e.response?.data?.detail || e.message || 'Erro ao salvar configuração';
      toast.error('Erro ao salvar configuração: ' + (typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : String(errorMsg)));
    } finally {
      setSavingAutoConfig(false);
    }
  };

  const toggleProtocol = (proto: string) => {
    const current = [...(autoConfig.block_protocols || [])];
    if (current.includes(proto)) {
      setAutoConfig({ ...autoConfig, block_protocols: current.filter(p => p !== proto) });
    } else {
      setAutoConfig({ ...autoConfig, block_protocols: [...current, proto] });
    }
  };

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
      const errorMsg = error.response?.data?.detail || error.message || 'Erro ao remover regra';
      toast.error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : String(errorMsg));
    }
  });

  const handleDelete = (id: number) => {
    if (window.confirm('Tem certeza que deseja remover esta regra FlowSpec?')) {
      deleteMutation.mutate(id);
    }
  };

  const rules = data?.items || [];

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

  const getActionBadge = (action: string, rate_limit_kbps?: number) => {
    if (action === 'discard') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-danger/10 text-danger border-danger/20">
          Descartar
        </span>
      );
    }
    
    if (action === 'rate-limit') {
      const mbps = rate_limit_kbps ? (rate_limit_kbps / 1000) : 0;
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-warning/10 text-warning border-warning/20 whitespace-nowrap">
          Rate-Limit: {mbps >= 1 ? `${mbps} Mbps` : `${rate_limit_kbps} Kbps`}
        </span>
      );
    }

    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-gray-500/10 text-gray-500 border-gray-500/20">
        {action}
      </span>
    );
  };
  
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Zap className="text-primary" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">FlowSpec</h1>
            <p className="text-sm text-text-secondary">Configuração automática e regras ativas</p>
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

      {/* SEÇÃO: CONFIGURAÇÃO AUTOMÁTICA */}
      <div className="bg-bg-secondary p-6 rounded-xl border border-border shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-warning" />
            <h2 className="text-lg font-bold text-text-primary">Configuração Automática</h2>
          </div>
          {isAdmin && (
            <button
              onClick={handleSaveAutoConfig}
              disabled={savingAutoConfig}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all border border-primary/20 disabled:opacity-50"
            >
              {savingAutoConfig ? <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Save size={14} />}
              Salvar Configuração
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* 1. Tipo de Bloqueio */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Tipo de Bloqueio</label>
            <div className="space-y-2">
              {[
                { id: 'by_port', label: 'Por porta', desc: 'Descobre a porta atacada e cria regra específica' },
                { id: 'by_protocol', label: 'Por protocolo', desc: 'Bloqueia o protocolo inteiro sem especificar porta' },
                { id: 'both', label: 'Ambos', desc: 'Cria as duas regras simultaneamente' },
              ].map((opt) => (
                <label key={opt.id} className="flex items-start gap-3 p-3 rounded-lg bg-bg-primary/50 border border-border cursor-pointer hover:border-primary/30 transition-all group">
                  <input
                    type="radio"
                    name="block_mode"
                    disabled={!isAdmin}
                    checked={autoConfig.block_mode === opt.id}
                    onChange={() => setAutoConfig({ ...autoConfig, block_mode: opt.id })}
                    className="mt-1 w-4 h-4 accent-primary"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors">{opt.label}</span>
                    <span className="text-[10px] text-text-secondary leading-tight">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 2. Protocolos Monitorados */}
          {autoConfig.block_mode !== 'by_port' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Protocolos monitorados</label>
              <div className="grid grid-cols-2 gap-2">
                {['udp', 'tcp', 'icmp', 'ip'].map((proto) => {
                  const isSelected = autoConfig.block_protocols?.includes(proto);
                  return (
                    <button
                      key={proto}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => toggleProtocol(proto)}
                      className={clsx(
                        "flex items-center justify-between p-3 rounded-lg border transition-all",
                        isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-bg-primary/50"
                      )}
                    >
                      <span className={clsx("text-xs font-bold uppercase", isSelected ? "text-primary" : "text-text-primary")}>
                        {proto === 'ip' ? 'IP (Todos)' : proto}
                      </span>
                      {isSelected && <Check size={14} className="text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Direção */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Direção</label>
            <div className="flex flex-col gap-2">
              {[
                { id: 'incoming', label: 'Incoming', desc: 'Meu IP está sendo atacado (padrão)' },
                { id: 'outgoing', label: 'Outgoing', desc: 'Meu servidor/CPE está gerando ataque' },
              ].map((opt) => (
                <label key={opt.id} className="flex items-start gap-3 p-3 rounded-lg bg-bg-primary/50 border border-border cursor-pointer hover:border-primary/30 transition-all group">
                  <input
                    type="radio"
                    name="direction"
                    disabled={!isAdmin}
                    checked={autoConfig.direction === opt.id}
                    onChange={() => setAutoConfig({ ...autoConfig, direction: opt.id })}
                    className="mt-1 w-4 h-4 accent-primary"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors">{opt.label}</span>
                    <span className="text-[10px] text-text-secondary leading-tight">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 4. Ação Padrão */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Ação padrão</label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-lg bg-bg-primary/50 border border-border cursor-pointer group">
                <input
                  type="radio"
                  name="default_action"
                  disabled={!isAdmin}
                  checked={autoConfig.default_action === 'discard'}
                  onChange={() => setAutoConfig({ ...autoConfig, default_action: 'discard' })}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-xs font-bold text-text-primary">Descartar tudo</span>
              </label>
              
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg bg-bg-primary/50 border border-border cursor-pointer group">
                  <input
                    type="radio"
                    name="default_action"
                    disabled={!isAdmin}
                    checked={autoConfig.default_action === 'rate-limit'}
                    onChange={() => setAutoConfig({ ...autoConfig, default_action: 'rate-limit' })}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-xs font-bold text-text-primary">Rate-Limit</span>
                </label>
                
                {autoConfig.default_action === 'rate-limit' && (
                  <div className="flex items-center gap-2 ml-2 animate-in slide-in-from-top-2 duration-200">
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={autoConfig.default_rate_limit_kbps}
                      onChange={(e) => setAutoConfig({ ...autoConfig, default_rate_limit_kbps: e.target.value })}
                      className="w-24 bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <span className="text-xs font-bold text-text-secondary uppercase">Kbps</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. TTL Padrão */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">TTL padrão (minutos)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                disabled={!isAdmin}
                value={autoConfig.default_ttl_minutes}
                onChange={(e) => setAutoConfig({ ...autoConfig, default_ttl_minutes: e.target.value })}
                className="w-full bg-bg-primary/50 border border-border rounded-lg px-4 py-2.5 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Clock size={18} className="text-text-secondary shrink-0" />
            </div>
            <p className="text-[10px] text-text-secondary leading-tight italic">Tempo que as regras permanecem ativas</p>
          </div>

          {/* 7. Origem do Bloqueio */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Origem do bloqueio</label>
            <div className="flex flex-col gap-2">
              {[
                { id: 'any', label: 'Qualquer origem', desc: 'Mais eficaz contra botnets' },
                { id: 'attacker', label: 'Só IP atacante', desc: 'Mais cirúrgico mas menos eficaz' },
              ].map((opt) => (
                <label key={opt.id} className="flex items-start gap-3 p-3 rounded-lg bg-bg-primary/50 border border-border cursor-pointer hover:border-primary/30 transition-all group">
                  <input
                    type="radio"
                    name="flowspec_src_mode"
                    disabled={!isAdmin}
                    checked={autoConfig.flowspec_src_mode === opt.id}
                    onChange={() => setAutoConfig({ ...autoConfig, flowspec_src_mode: opt.id })}
                    className="mt-1 w-4 h-4 accent-primary"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors">{opt.label}</span>
                    <span className="text-[10px] text-text-secondary leading-tight">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 6. Tipos de Detecção */}
          <div className="lg:col-span-3 space-y-4 pt-6 border-t border-border">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Tipos de detecção</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { id: 'detect_udp_flood', label: 'UDP Flood' },
                { id: 'detect_syn_flood', label: 'SYN Flood' },
                { id: 'detect_dns_amp', label: 'DNS Amplification' },
                { id: 'detect_ntp_amp', label: 'NTP Amplification' },
                { id: 'detect_ssdp_amp', label: 'SSDP Amplification' },
              ].map((type) => (
                <label key={type.id} className="flex items-center gap-3 p-3 rounded-lg bg-bg-primary/50 border border-border cursor-pointer hover:border-primary/30 transition-all group">
                  <input
                    type="checkbox"
                    disabled={!isAdmin}
                    checked={(autoConfig as any)[type.id]}
                    onChange={(e) => setAutoConfig({ ...autoConfig, [type.id]: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 accent-primary"
                  />
                  <span className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors">{type.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <List size={18} className="text-primary" />
            <h2 className="text-lg font-bold text-text-primary">Regras Ativas</h2>
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-bg-primary hover:bg-bg-primary/80 text-text-primary px-4 py-2 rounded-lg text-xs font-bold transition-all border border-border"
            >
              <Plus size={14} />
              Nova Regra manual
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
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Expira em</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Operador</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Criado</th>
                {isAdmin && <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={11} className="px-4 py-4"><div className="h-4 bg-border/50 rounded w-full" /></td>
                  </tr>
                ))
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-text-secondary italic">Nenhuma regra ativa encontrada</td>
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
                      {getActionBadge(rule.action, rule.rate_limit_kbps)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-success/10 text-success border-success/20">
                        Anunciado
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {rule.expires_at ? (
                        <span className={clsx("font-mono text-xs font-bold", getCountdownColor(rule.expires_at))}>
                          {getCountdown(rule.expires_at)}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-500/10 text-gray-500 border border-gray-500/20">
                          Permanente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-primary">{rule.created_by || 'system'}</td>
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
