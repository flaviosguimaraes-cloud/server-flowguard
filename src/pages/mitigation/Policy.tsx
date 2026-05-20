import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Shield, Save, Zap, Sliders, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
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

import { clsx } from 'clsx';

type Mode = 'blackhole' | 'external';

export default function Policy() {
  const isAdmin = localStorage.getItem('role') === 'admin';
  const qc = useQueryClient();

  // Seção 1: Política BGP
  const { data: policyData } = useQuery({
    queryKey: ['mitigation-policy'],
    queryFn: () => api.get('/api/mitigation/policy').then(r => r.data).catch(() => ({})),
  });

  // Seção 2: FlowSpec Automático
  const { data: autoConfigData } = useQuery({
    queryKey: ['mitigation-auto-config'],
    queryFn: () => api.get('/api/mitigation/auto-config').then(r => r.data).catch(() => ({})),
  });

  // Seção 3: Limiares
  const { data: thresholdData } = useQuery({
    queryKey: ['thresholds-policy'],
    queryFn: () => api.get('/api/detection/thresholds').then(r => r.data).catch(() => ({})),
  });

  const [mode, setMode] = useState<Mode>('blackhole');
  const [externalBlock, setExternalBlock] = useState('');
  const [blackholeCommunity, setBlackholeCommunity] = useState('65000:666');
  const [externalCommunity, setExternalCommunity] = useState('65000:999');

  const [autoConfig, setAutoConfig] = useState({
    enabled: false,
    operation_mode: 'disabled',
    default_action: 'discard',
    default_rate_limit_kbps: 1000,
    default_ttl_minutes: 120,
    detect_udp_flood: true,
    detect_syn_flood: true,
    detect_dns_amp: true,
    detect_ntp_amp: true,
    detect_ssdp_amp: false
  });
 
   const [thresholds, setThresholds] = useState<any>({
     threshold_pps: '',
     threshold_mbps: '',
     threshold_flows: '',
     threshold_tcp_pps: '',
     threshold_tcp_mbps: '',
     threshold_udp_pps: '',
     threshold_udp_mbps: '',
     threshold_icmp_pps: '',
      threshold_icmp_mbps: '',
      ban_for_pps: true,
      ban_for_bandwidth: true,
      ban_for_flows: false,
      ban_for_tcp_pps: false,
      ban_for_tcp_bandwidth: false,
      ban_for_udp_pps: false,
      ban_for_udp_bandwidth: false,
      ban_for_icmp_pps: false,
      ban_for_icmp_bandwidth: false,
      ban_time: ''
   });

  useEffect(() => {
    if (policyData) {
      setMode((policyData.mode as Mode) || 'blackhole');
      setExternalBlock(policyData.external_block || '192.168.1.0/24');
      setBlackholeCommunity(policyData.blackhole_community || '65000:666');
      setExternalCommunity(policyData.external_community || '65000:999');
    }
  }, [policyData]);

  useEffect(() => {
    if (autoConfigData) {
      setAutoConfig({
        ...autoConfig,
        ...autoConfigData,
        operation_mode: !autoConfigData.enabled ? 'disabled' : (autoConfigData.operation_mode || 'blackhole_flowspec')
      });
    }
  }, [autoConfigData]);

  useEffect(() => {
     if (thresholdData) {
       setThresholds(thresholdData);
       setInitialThresholds(thresholdData);
     }
   }, [thresholdData]);

    const [saving, setSaving] = useState(false);
    const [initialThresholds, setInitialThresholds] = useState<any>(null);
    const [showRestartModal, setShowRestartModal] = useState(false);

    const hasThresholdsChanged = () => {
      if (!initialThresholds) return false;
      
      const keys = [
        'threshold_pps', 'threshold_mbps', 'threshold_flows',
        'threshold_tcp_pps', 'threshold_tcp_mbps',
        'threshold_udp_pps', 'threshold_udp_mbps',
        'threshold_icmp_pps', 'threshold_icmp_mbps',
        'ban_for_pps', 'ban_for_bandwidth', 'ban_for_flows',
        'ban_for_tcp_pps', 'ban_for_tcp_bandwidth',
        'ban_for_udp_pps', 'ban_for_udp_bandwidth',
        'ban_for_icmp_pps', 'ban_for_icmp_bandwidth',
        'ban_time'
      ];

      return keys.some(key => {
        const current = thresholds[key];
        const initial = initialThresholds[key];
        
        if (key.startsWith('threshold_') || key === 'ban_time') {
          return (Number(current) || 0) !== (Number(initial) || 0);
        }
        
        return !!current !== !!initial;
      });
    };

    const handleSaveClick = () => {
      if (hasThresholdsChanged()) {
        setShowRestartModal(true);
      } else {
        submit(false);
      }
    };
  
    const submit = async (shouldRestart: boolean = false) => {
      setSaving(true);
      setShowRestartModal(false);
      try {
        const isAutoConfigEnabled = autoConfig.operation_mode !== 'disabled';

        const promises: Promise<any>[] = [
          api.put('/api/mitigation/policy', {
             mode,
             blackhole_community: blackholeCommunity,
             external_community: externalCommunity,
             external_block: externalBlock,
             flowspec_enabled: isAutoConfigEnabled,
          }),
          api.put('/api/mitigation/auto-config', {
             ...autoConfig,
             enabled: isAutoConfigEnabled,
             operation_mode: isAutoConfigEnabled ? autoConfig.operation_mode : 'blackhole_flowspec',
             default_rate_limit_kbps: Number(autoConfig.default_rate_limit_kbps) || 1000,
             default_ttl_minutes: Number(autoConfig.default_ttl_minutes) || 120,
          }),
          api.put('/api/detection/thresholds', {
             ...thresholds,
             threshold_pps: Number(thresholds.threshold_pps) || 0,
             threshold_mbps: Number(thresholds.threshold_mbps) || 0,
             threshold_flows: Number(thresholds.threshold_flows) || 0,
             threshold_tcp_pps: Number(thresholds.threshold_tcp_pps) || 0,
             threshold_tcp_mbps: Number(thresholds.threshold_tcp_mbps) || 0,
             threshold_udp_pps: Number(thresholds.threshold_udp_pps) || 0,
             threshold_udp_mbps: Number(thresholds.threshold_udp_mbps) || 0,
             threshold_icmp_pps: Number(thresholds.threshold_icmp_pps) || 0,
             threshold_icmp_mbps: Number(thresholds.threshold_icmp_mbps) || 0,
             ban_time: Number(thresholds.ban_time) || 0,
          })
        ];

        if (shouldRestart) {
          promises.push(api.post('/api/system/restart/detection_engine'));
        }

        await Promise.all(promises);
        
        if (shouldRestart) {
          toast.success('✅ Política salva · Motor de detecção reiniciado');
        } else {
          toast.success('✅ Política salva');
        }

        qc.invalidateQueries({ queryKey: ['mitigation-policy'] });
        qc.invalidateQueries({ queryKey: ['mitigation-auto-config'] });
        qc.invalidateQueries({ queryKey: ['thresholds-policy'] });
        
        // Atualiza os limiares iniciais após salvar com sucesso
        setInitialThresholds({...thresholds});
        
      } catch (e: any) {
        toast.error(e.response?.data?.detail || 'Erro ao salvar política');
      } finally {
        setSaving(false);
      }
    };


  const ModeCard = ({ value, title, community, onChangeCommunity, description }: any) => {
    const selected = mode === value;
    return (
      <button
        type="button"
        className={clsx(
          "text-left p-5 rounded-xl border-2 transition-all w-full",
          selected ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-border bg-bg-secondary hover:border-text-secondary/30"
        )}
        onClick={() => setMode(value)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield size={18} className={selected ? 'text-primary' : 'text-text-secondary'} />
            <h3 className="font-bold text-text-primary">{title}</h3>
          </div>
          <div className={clsx(
            "w-10 h-6 rounded-full p-0.5 transition-all flex",
            selected ? "bg-primary justify-end" : "bg-bg-primary justify-start"
          )}>
            <div className="w-5 h-5 rounded-full bg-white shadow" />
          </div>
        </div>
        <div className="mb-3" onClick={e => e.stopPropagation()}>
          <label className="text-[10px] font-bold text-text-secondary uppercase">Community BGP</label>
          <input 
            value={community} 
            disabled={!isAdmin}
            onChange={(e) => onChangeCommunity(e.target.value)}
            placeholder={value === 'blackhole' ? '65000:666' : '65000:999'}
            className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30" 
          />
        </div>
        <p className="text-xs text-text-secondary">{description}</p>
      </button>
    );
  };

  const ThresholdCard = ({ id, label, banKey, unit, placeholder, description }: any) => {
    const enabled = !!thresholds[banKey];
    return (
      <div className={clsx(
        "p-4 rounded-xl border transition-all space-y-3",
        enabled ? "border-primary/30 bg-primary/5 shadow-sm" : "border-border bg-bg-secondary opacity-60"
      )}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{label}</span>
          <button
            type="button"
            disabled={!isAdmin}
            onClick={() => setThresholds({ ...thresholds, [banKey]: !enabled })}
            className={clsx(
              "w-8 h-4 rounded-full p-0.5 transition-all flex",
              enabled ? "bg-success justify-end" : "bg-bg-primary justify-start border border-border"
            )}
            title={enabled ? "Ativo: qualquer IP que exceder este valor será bloqueado" : "Inativo: este threshold não será verificado pelo mitigador"}
          >
            <div className="w-3 h-3 rounded-full bg-white shadow" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="number" 
            value={thresholds[id] ?? ''} 
            placeholder={placeholder} 
            readOnly={!isAdmin || !enabled} 
            onChange={(e) => setThresholds({ ...thresholds, [id]: e.target.value })}
            className={clsx(
              "w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30",
              !enabled && "bg-bg-secondary text-text-secondary cursor-not-allowed"
            )} 
          />
          <span className="text-xs font-bold text-text-secondary">{unit}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          {enabled ? (
            <><Zap size={10} className="text-warning" /> <span className="text-text-primary font-bold tracking-tight">Ativo — {description}</span></>
          ) : (
            <><Shield size={10} className="text-text-secondary" /> <span className="text-text-secondary">Inativo</span></>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center gap-3">
        <Shield className="text-primary" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Política de Mitigação</h1>
           <p className="text-sm text-text-secondary">Configuração de bloqueio, FlowSpec automático e limiares de detecção</p>
        </div>
      </div>

      {/* SEÇÃO 1: MODO BGP */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-primary" />
          <h2 className="text-lg font-bold text-text-primary">Modo de Operação BGP</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ModeCard
            value="blackhole"
            title="Modo A — Blackhole /32"
            community={blackholeCommunity}
            onChangeCommunity={setBlackholeCommunity}
            description="Cada IP banido recebe rota /32 para blackhole."
          />
          <ModeCard
            value="external"
            title="Modo B — Mitigação Externa"
            community={externalCommunity}
            onChangeCommunity={setExternalCommunity}
            description={`Anuncia bloco ${externalBlock || '192.168.1.0/24'} para scrubbing externo.`}
          />
        </div>
        {mode === 'external' && (
          <div className="bg-bg-secondary p-4 rounded-xl border border-border">
            <label className="text-[10px] font-bold text-text-secondary uppercase">Bloco externo (CIDR)</label>
            <input value={externalBlock} readOnly={!isAdmin} onChange={(e) => setExternalBlock(e.target.value)}
              className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30 read-only:opacity-70" />
          </div>
        )}
      </div>

      {/* SEÇÃO 2: FLOWSPEC AUTOMÁTICO */}
      <div className="bg-bg-secondary p-6 rounded-xl border border-border shadow-sm space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={20} className="text-warning" />
          <h2 className="text-lg font-bold text-text-primary">⚡ FlowSpec Automático</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">Modo</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'disabled', label: 'Desabilitado', desc: 'FlowSpec automático inativo' },
                { id: 'blackhole_flowspec', label: 'Complementar ao Blackhole', desc: 'Blackhole imediato + FlowSpec cirúrgico' },
                { id: 'flowspec_only', label: 'Apenas FlowSpec', desc: 'Mitigação cirúrgica (sem blackhole)' },
              ].map((opt) => {
                const isSelected = autoConfig.operation_mode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => setAutoConfig({ ...autoConfig, operation_mode: opt.id })}
                    className={clsx(
                      "text-left p-4 rounded-xl border transition-all",
                      isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-bg-primary/50 hover:border-border-hover"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={clsx("text-sm font-bold", isSelected ? "text-primary" : "text-text-primary")}>{opt.label}</span>
                      <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center", isSelected ? "border-primary" : "border-border")}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-text-secondary leading-tight">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border">
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-4">Ação Padrão</label>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="default_action"
                    disabled={!isAdmin}
                    checked={autoConfig.default_action === 'discard'}
                    onChange={() => setAutoConfig({ ...autoConfig, default_action: 'discard' })}
                    className="w-4 h-4 accent-primary"
                  />
                  <div>
                    <span className="text-sm font-bold text-text-primary block">Descartar tudo</span>
                    <span className="text-[10px] text-text-secondary">Bloqueio total do tráfego malicioso</span>
                  </div>
                </label>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="default_action"
                      disabled={!isAdmin}
                      checked={autoConfig.default_action === 'rate-limit'}
                      onChange={() => setAutoConfig({ ...autoConfig, default_action: 'rate-limit' })}
                      className="w-4 h-4 accent-primary"
                    />
                    <div>
                      <span className="text-sm font-bold text-text-primary block">Rate-Limit (limitar banda)</span>
                      <span className="text-[10px] text-text-secondary">Limita tráfego ao valor definido abaixo</span>
                    </div>
                  </label>
                  
                  {autoConfig.default_action === 'rate-limit' && (
                    <div className="flex items-center gap-2 ml-7 animate-in slide-in-from-top-2 duration-200">
                      <input
                        type="number"
                        disabled={!isAdmin}
                        value={autoConfig.default_rate_limit_kbps}
                        onChange={(e) => setAutoConfig({ ...autoConfig, default_rate_limit_kbps: parseInt(e.target.value) || 0 })}
                        className="w-28 bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <span className="text-xs font-bold text-text-secondary">Kbps</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">TTL Padrão</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    disabled={!isAdmin}
                    value={autoConfig.default_ttl_minutes}
                    onChange={(e) => setAutoConfig({ ...autoConfig, default_ttl_minutes: parseInt(e.target.value) || 0 })}
                    className="w-28 bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <span className="text-sm font-bold text-text-primary">minutos</span>
                </div>
                <p className="text-[10px] text-text-secondary mt-1 tracking-tight">Tempo que as regras permanecem ativas antes da expiração automática.</p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-4">Tipos de Detecção</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { id: 'detect_udp_flood', label: 'UDP Flood' },
                { id: 'detect_syn_flood', label: 'SYN Flood' },
                { id: 'detect_dns_amp', label: 'DNS Amplification' },
                { id: 'detect_ntp_amp', label: 'NTP Amplification' },
                { id: 'detect_ssdp_amp', label: 'SSDP Amplification' },
              ].map((type) => (
                <label key={type.id} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    disabled={!isAdmin}
                    checked={(autoConfig as any)[type.id]}
                    onChange={(e) => setAutoConfig({ ...autoConfig, [type.id]: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary"
                  />
                  <span className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors">{type.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: LIMIARES */}
      <div className="bg-bg-secondary p-6 rounded-xl border border-border shadow-sm space-y-6">
        <div className="flex items-center gap-2">
          <Sliders size={18} className="text-primary" />
          <div>
            <h2 className="text-lg font-bold text-text-primary">Limiares de Detecção</h2>
            <p className="text-xs text-text-secondary">Definem quando o mitigador aplica bloqueio automático</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ThresholdCard id="threshold_pps" label="PPS Global" banKey="ban_for_pps" unit="pps" placeholder="100000" description="gatilho principal" />
          <ThresholdCard id="threshold_mbps" label="Banda Global" banKey="ban_for_bandwidth" unit="Mbps" placeholder="1000" description="gatilho principal" />
          <ThresholdCard id="threshold_flows" label="Flows Global" banKey="ban_for_flows" unit="flows" placeholder="3500" description="gatilho de volume" />
          
          <ThresholdCard id="threshold_tcp_pps" label="TCP PPS" banKey="ban_for_tcp_pps" unit="pps" placeholder="50000" description="anomalias TCP flood" />
          <ThresholdCard id="threshold_tcp_mbps" label="TCP Banda" banKey="ban_for_tcp_bandwidth" unit="Mbps" placeholder="500" description="anomalias TCP flood" />
          <div className="hidden lg:block" />

          <ThresholdCard id="threshold_udp_pps" label="UDP PPS" banKey="ban_for_udp_pps" unit="pps" placeholder="50000" description="anomalias UDP flood" />
          <ThresholdCard id="threshold_udp_mbps" label="UDP Banda" banKey="ban_for_udp_bandwidth" unit="Mbps" placeholder="500" description="anomalias UDP flood" />
          <div className="hidden lg:block" />

          <ThresholdCard id="threshold_icmp_pps" label="ICMP PPS" banKey="ban_for_icmp_pps" unit="pps" placeholder="5000" description="anomalias ICMP flood" />
          <ThresholdCard id="threshold_icmp_mbps" label="ICMP Banda" banKey="ban_for_icmp_bandwidth" unit="Mbps" placeholder="50" description="anomalias ICMP flood" />
          
          <div className="p-4 rounded-xl border border-border bg-bg-primary/30 space-y-3">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Tempo de bloqueio</label>
            <div className="flex items-center gap-2">
              <input type="number" value={thresholds.ban_time ?? ''} readOnly={!isAdmin}
                onChange={(e) => setThresholds({ ...thresholds, ban_time: e.target.value })}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30" />
              <span className="text-xs font-bold text-text-secondary">seg</span>
            </div>
            <p className="text-[10px] text-text-secondary italic">120s = 2min · 1800s = 30min</p>
          </div>
        </div>
      </div>

      {/* BOTÃO SALVAR */}
      {isAdmin && (
        <div className="flex justify-end pt-6">
          <button 
            onClick={submit} 
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Salvar e aplicar
          </button>
        </div>
      )}
    </div>
  );
}