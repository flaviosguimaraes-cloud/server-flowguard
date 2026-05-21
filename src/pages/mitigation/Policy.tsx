import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Shield, Save, Zap, Sliders, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "../../components/ui/tooltip";
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

type Mode = 'blackhole' | 'external' | null;

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
    queryFn: () => api.get('/api/thresholds').then(r => r.data).catch(() => ({})),
  });

  const [mode, setMode] = useState<Mode>('blackhole');
  const [externalBlock, setExternalBlock] = useState('');
  const [blackholeCommunity, setBlackholeCommunity] = useState('65000:666');
  const [externalCommunity, setExternalCommunity] = useState('65000:999');

  const [autoConfig, setAutoConfig] = useState({
    enabled: false,
    operation_mode: 'disabled',
    flowspec_src_mode: 'any',
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
      my_hosts_enable_ban: false,
      my_hosts_threshold_pps: '',
      my_hosts_threshold_mbps: '',
      ban_for_pps: true,
      ban_for_bandwidth: true,
      ban_for_flows: false,
      my_hosts_ban_for_pps: false,
      my_hosts_ban_for_bandwidth: false,
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
    if (autoConfigData && Object.keys(autoConfigData).length > 0) {
      setAutoConfig(prev => ({
        ...prev,
        ...autoConfigData,
        flowspec_src_mode: autoConfigData.flowspec_src_mode || 'any',
        operation_mode: !autoConfigData.enabled ? 'disabled' : (autoConfigData.operation_mode || 'blackhole_flowspec')
      }));
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
        'my_hosts_enable_ban', 'my_hosts_threshold_pps', 'my_hosts_threshold_mbps',
        'ban_for_pps', 'ban_for_bandwidth', 'ban_for_flows',
        'my_hosts_ban_for_pps', 'my_hosts_ban_for_bandwidth',
        'ban_time'
      ];

      return keys.some(key => {
        const current = thresholds[key];
        const initial = initialThresholds[key];
        
        if (key.includes('threshold_') || key === 'ban_time') {
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
             flowspec_src_mode: autoConfig.flowspec_src_mode || 'any',
             default_rate_limit_kbps: Number(autoConfig.default_rate_limit_kbps) || 1000,
             default_ttl_minutes: Number(autoConfig.default_ttl_minutes) || 120,
          }),
          api.put('/api/thresholds', {
             ...thresholds,
             threshold_pps: Number(thresholds.threshold_pps) || 0,
             threshold_mbps: Number(thresholds.threshold_mbps) || 0,
             threshold_flows: Number(thresholds.threshold_flows) || 0,
             my_hosts_threshold_pps: Number(thresholds.my_hosts_threshold_pps) || 0,
             my_hosts_threshold_mbps: Number(thresholds.my_hosts_threshold_mbps) || 0,
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
        toast.error('❌ Erro: ' + (e.response?.data?.detail || e.message));
      } finally {
        setSaving(false);
      }
    };


  const ModeCard = ({ value, title, community, onChangeCommunity, description, disabled, tooltip }: any) => {
    const selected = mode === value;
    const content = (

      <button
        type="button"
        disabled={disabled || !isAdmin}
        className={clsx(
          "text-left p-5 rounded-xl border-2 transition-all w-full",
          selected ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-border bg-bg-secondary hover:border-text-secondary/30",
          disabled && "opacity-50 grayscale cursor-not-allowed"
        )}
        onClick={() => !disabled && setMode(value)}
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

    if (disabled && tooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full cursor-not-allowed">
                {content}
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-bg-secondary text-text-primary border border-border shadow-xl">
              <p className="text-xs font-bold">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return content;


  };

  const ThresholdCard = ({ id, label, banKey, unit, placeholder, description, disabled }: any) => {
    const enabled = !!thresholds[banKey];
    const isCardDisabled = disabled || !isAdmin;
    
    return (
      <div className={clsx(
        "p-4 rounded-xl border transition-all space-y-3",
        enabled && !disabled ? "border-primary/30 bg-primary/5 shadow-sm" : "border-border bg-bg-secondary",
        disabled && "opacity-40 grayscale pointer-events-none"
      )}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{label}</span>
          <button
            type="button"
            disabled={isCardDisabled}
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
            readOnly={isCardDisabled || !enabled} 
            onChange={(e) => setThresholds({ ...thresholds, [id]: e.target.value })}
            className={clsx(
              "w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30",
              (!enabled || disabled) && "bg-bg-secondary text-text-secondary cursor-not-allowed"
            )} 
          />
          <span className="text-xs font-bold text-text-secondary">{unit}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          {enabled && !disabled ? (
            <><Zap size={10} className="text-warning" /> <span className="text-text-primary font-bold tracking-tight">Ativo — {description}</span></>
          ) : (
            <><Shield size={10} className="text-text-secondary" /> <span className="text-text-secondary">{disabled ? 'Desabilitado' : 'Inativo'}</span></>
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
            disabled={autoConfig.operation_mode === 'flowspec_only' || autoConfig.operation_mode === 'blackhole_flowspec'}
            tooltip={autoConfig.operation_mode === 'blackhole_flowspec' ? "Modo A é obrigatório no modo Complementar" : "Modo A desabilitado em Apenas FlowSpec"}
          />
          <ModeCard
            value="external"
            title="Modo B — Mitigação Externa"
            community={externalCommunity}
            onChangeCommunity={setExternalCommunity}
            description={`Anuncia bloco ${externalBlock || '192.168.1.0/24'} para scrubbing externo.`}
            disabled={autoConfig.operation_mode === 'flowspec_only'}
            tooltip="Modo B desabilitado em Apenas FlowSpec"
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

      {/* SEÇÃO 2: FLOWSPEC */}
      <div className="bg-bg-secondary p-6 rounded-xl border border-border shadow-sm space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={20} className="text-warning" />
          <h2 className="text-lg font-bold text-text-primary">⚡ FlowSpec</h2>
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

                  const isDisabled = mode === 'external' && opt.id !== 'disabled';
                  
                  const button = (
                    <button
                      type="button"
                      disabled={!isAdmin || isDisabled}
                      onClick={() => {
                        if (isDisabled) return;
                        const nextMode = opt.id;
                        setAutoConfig({ ...autoConfig, operation_mode: nextMode });
                        if (nextMode === 'blackhole_flowspec') {
                          setMode('blackhole');
                        }
                      }}

                      className={clsx(
                        "text-left p-4 rounded-xl border transition-all h-full w-full",
                        isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-bg-primary/50 hover:border-border-hover",
                        isDisabled && "opacity-40 grayscale cursor-not-allowed"
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

                  if (isDisabled) {
                    return (
                      <TooltipProvider key={opt.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-full cursor-not-allowed">
                              {button}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-bg-secondary text-text-primary border border-border shadow-xl">
                            <p className="text-xs font-bold">FlowSpec não disponível no Modo B</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  }

                  return (
                    <div key={opt.id} className="w-full">
                      {button}
                    </div>

                  );
              })}

            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: LIMIARES */}
      <div className="bg-bg-secondary p-6 rounded-xl border border-border shadow-sm space-y-8">
        <div className="flex items-center gap-2">
          <Sliders size={18} className="text-primary" />
          <div>
            <h2 className="text-lg font-bold text-text-primary">Limiares de Detecção</h2>
            <p className="text-xs text-text-secondary">Definem quando o mitigador aplica bloqueio automático</p>
          </div>
        </div>

        {/* Section 1: Download */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <h3 className="text-sm font-bold text-text-primary">Seção 1 — Download (Incoming)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ThresholdCard id="threshold_pps" label="PPS Download" banKey="ban_for_pps" unit="pps" placeholder="100000" description="gatilho de pacotes" />
            <ThresholdCard id="threshold_mbps" label="Banda Download" banKey="ban_for_bandwidth" unit="Mbps" placeholder="1000" description="gatilho de banda" />
            <ThresholdCard id="threshold_flows" label="Flows Download" banKey="ban_for_flows" unit="flows" placeholder="3500" description="gatilho de fluxos" />
          </div>
        </div>

        {/* Section 2: Upload */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <h3 className="text-sm font-bold text-text-primary">Seção 2 — Upload (Outgoing)</h3>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Habilitar detecção Upload</span>
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => setThresholds({ ...thresholds, my_hosts_enable_ban: !thresholds.my_hosts_enable_ban })}
                className={clsx(
                  "w-10 h-5 rounded-full p-0.5 transition-all flex",
                  thresholds.my_hosts_enable_ban ? "bg-primary justify-end" : "bg-bg-primary justify-start border border-border"
                )}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ThresholdCard 
              id="my_hosts_threshold_pps" 
              label="PPS Upload" 
              banKey="my_hosts_ban_for_pps" 
              unit="pps" 
              placeholder="50000" 
              description="gatilho de pacotes"
              disabled={!thresholds.my_hosts_enable_ban}
            />
            <ThresholdCard 
              id="my_hosts_threshold_mbps" 
              label="Banda Upload" 
              banKey="my_hosts_ban_for_bandwidth" 
              unit="Mbps" 
              placeholder="500" 
              description="gatilho de banda"
              disabled={!thresholds.my_hosts_enable_ban}
            />
          </div>
        </div>

        {/* Section 3: Geral */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <h3 className="text-sm font-bold text-text-primary">Seção 3 — Geral</h3>
            {isAdmin && (
              <button 
                onClick={handleSaveClick} 
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-bold transition-all shadow-md shadow-primary/20 disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Salvar e aplicar
              </button>
            )}
          </div>
          <div className="max-w-xs p-4 rounded-xl border border-border bg-bg-primary/30 space-y-3">
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


      <AlertDialog open={showRestartModal} onOpenChange={setShowRestartModal}>
        <AlertDialogContent className="bg-bg-secondary border-border max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle size={20} />
              Reiniciar detector?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary space-y-4 pt-2">
              <p>Os limiares de detecção foram alterados.</p>
              <p>
                O motor de detecção (FastNetMon) precisa ser reiniciado para aplicar as novas configurações.
              </p>
              <p className="font-semibold text-text-primary">
                Durante o restart (~5s) a detecção ficará pausada.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel 
              disabled={saving}
              className="bg-transparent border-border hover:bg-bg-primary text-text-primary"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                submit(true);
              }}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-white border-none"
            >
              {saving ? 'Salvando...' : 'Salvar e reiniciar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}