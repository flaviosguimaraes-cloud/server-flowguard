import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Shield, Save, Zap, Sliders, AlertTriangle, Ban, Cloud, ShieldAlert, Plus, Trash2, Eye } from 'lucide-react';
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

type Mode = 'blackhole' | 'external' | 'none' | null;

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

  const [mode, setMode] = useState<Mode>(null);
  const [externalBlocks, setExternalBlocks] = useState<string[]>(['']);
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
      setMode((policyData.mode as Mode) || null);
      if (Array.isArray(policyData.external_block)) {
        setExternalBlocks(policyData.external_block.length > 0 ? policyData.external_block : ['']);
      } else if (typeof policyData.external_block === 'string') {
        setExternalBlocks([policyData.external_block || '']);
      }
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
             external_block: externalBlocks.filter(b => !!b),
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


  const ResponseModeCard = ({ id, title, description, icon: Icon, colorClass, selected, onSelect, children }: any) => {
    return (
      <button
        type="button"
        onClick={() => isAdmin && onSelect()}
        className={clsx(
          "relative text-left p-5 rounded-xl border-2 transition-all w-full flex flex-col h-full",
          selected ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-border bg-bg-secondary hover:border-text-secondary/30",
          !isAdmin && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div className={clsx("p-2.5 rounded-lg", colorClass)}>
            <Icon size={20} />
          </div>
          <div className={clsx(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
            selected ? "border-primary bg-primary" : "border-border"
          )}>
            {selected && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
        </div>
        
        <h3 className="font-bold text-text-primary text-sm mb-1">{title}</h3>
        <p className="text-xs text-text-secondary mb-4 flex-grow">{description}</p>
        
        {children && (
          <div className="mt-auto pt-4 border-t border-border/50" onClick={e => e.stopPropagation()}>
            {children}
          </div>
        )}
      </button>
    );
  };

  const handleSelectCard = (cardId: number) => {
    if (cardId === 1) {
      setMode('blackhole');
      setAutoConfig(prev => ({ ...prev, operation_mode: 'disabled' }));
    } else if (cardId === 2) {
      setMode('blackhole');
      setAutoConfig(prev => ({ ...prev, operation_mode: 'flowspec_only' }));
    } else if (cardId === 3) {
      setMode('blackhole');
      setAutoConfig(prev => ({ ...prev, operation_mode: 'blackhole_flowspec' }));
    } else if (cardId === 4) {
      setMode('external');
      setAutoConfig(prev => ({ ...prev, operation_mode: 'disabled' }));
    } else if (cardId === 5) {
      setMode('none');
      setAutoConfig(prev => ({ ...prev, operation_mode: 'disabled' }));
    }
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
            readOnly={isCardDisabled} 
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="text-primary" size={24} />
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Política Global</h1>
            <p className="text-sm text-text-secondary">Aplicada a IPs que não pertencem a nenhum grupo</p>
          </div>
        </div>
      </div>


      {/* MODO DE RESPOSTA AO ATAQUE */}
      <div className="bg-bg-secondary rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-text-primary">Modo de resposta ao ataque</h2>
          </div>
          {isAdmin && (
            <button 
              onClick={handleSaveClick} 
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all"
            >
              {saving ? (
                <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Salvar
            </button>
          )}
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <ResponseModeCard
            id={5}
            title="Sem Ação"
            description="Detecta e registra ataques mas não aplica nenhuma mitigação automática."
            icon={Eye}
            colorClass="bg-gray-500/10 text-gray-500"
            selected={mode === 'none'}
            onSelect={() => handleSelectCard(5)}
          />

          <ResponseModeCard
            id={2}
            title="Apenas FlowSpec"
            description="Bloqueia só o tráfego malicioso. Cliente permanece online durante a mitigação."
            icon={Zap}
            colorClass="bg-[#EEEDFE] text-[#534AB7]"
            selected={mode === 'blackhole' && autoConfig.operation_mode === 'flowspec_only'}
            onSelect={() => handleSelectCard(2)}
          />

          <ResponseModeCard
            id={1}
            title="Blackhole /32"
            description="Bloqueia o IP completamente via BGP. Resposta imediata mas o cliente fica offline."
            icon={Ban}
            colorClass="bg-[#FCEBEB] text-[#A32D2D]"
            selected={mode === 'blackhole' && autoConfig.operation_mode === 'disabled'}
            onSelect={() => handleSelectCard(1)}
          >
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Community BGP</label>
              <input 
                value={blackholeCommunity} 
                onChange={(e) => setBlackholeCommunity(e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30" 
              />
            </div>
          </ResponseModeCard>

          <ResponseModeCard
            id={3}
            title="Blackhole + FlowSpec"
            description="Blackhole imediato para proteção rápida + FlowSpec cirúrgico em paralelo."
            icon={ShieldAlert}
            colorClass="bg-[#FEF3E2] text-[#854F0B]"
            selected={mode === 'blackhole' && autoConfig.operation_mode === 'blackhole_flowspec'}
            onSelect={() => handleSelectCard(3)}
          >
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Community BGP</label>
              <input 
                value={blackholeCommunity} 
                onChange={(e) => setBlackholeCommunity(e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30" 
              />
            </div>
          </ResponseModeCard>

          <ResponseModeCard
            id={4}
            title="Mitigação externa"
            description="Anuncia blocos /24 para scrubbing externo."
            icon={Cloud}
            colorClass="bg-[#E1F5EE] text-[#0F6E56]"
            selected={mode === 'external'}
            onSelect={() => handleSelectCard(4)}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Community BGP</label>
                <input 
                  value={externalCommunity} 
                  onChange={(e) => setExternalCommunity(e.target.value)}
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30" 
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">Blocos CIDR</label>
                  <button 
                    onClick={() => setExternalBlocks([...externalBlocks, ''])}
                    className="p-1 hover:bg-bg-primary rounded text-primary"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                  {externalBlocks.map((block, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        value={block} 
                        onChange={(e) => {
                          const newBlocks = [...externalBlocks];
                          newBlocks[idx] = e.target.value;
                          setExternalBlocks(newBlocks);
                        }}
                        placeholder="Ex: 192.0.2.0/24 ou 2001:db8::/32"
                        className="flex-grow bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-[11px] font-mono text-text-primary outline-none focus:ring-2 focus:ring-primary/30" 
                      />
                      {externalBlocks.length > 1 && (
                        <button 
                          onClick={() => setExternalBlocks(externalBlocks.filter((_, i) => i !== idx))}
                          className="p-1.5 text-danger hover:bg-danger/5 rounded"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ResponseModeCard>
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
                onClick={() => {
                  const newState = !thresholds.my_hosts_enable_ban;
                  setThresholds({ 
                    ...thresholds, 
                    my_hosts_enable_ban: newState,
                    ...(newState ? { 
                      my_hosts_ban_for_pps: true, 
                      my_hosts_ban_for_bandwidth: true 
                    } : {})
                  });
                }}

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
                O motor de detecção precisa ser reiniciado para aplicar as novas configurações.
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