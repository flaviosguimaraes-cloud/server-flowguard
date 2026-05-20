import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';
import { 
  Shield, AlertTriangle, Clock, Activity, 
  Radar, Waves, Globe, Radio, CheckCircle, 
  XCircle, Filter, Trash2, ArrowRight, MousePointer2, ExternalLink, Info, MapPin, Target, ShieldCheck, Zap
} from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { useNavigate } from '@tanstack/react-router';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Flag } from '../../components/Flag';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import { Separator } from "../../components/ui/separator";
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

interface Threat {
  type: string;
  label: string;
  severity: 'high' | 'medium' | 'low';
  src_ip?: string;
  dst_ip: string;
  src_country?: string;
  unique_ports?: number;
  flows?: number;
  packets?: number;
  bytes?: number;
  bpp?: number;
  mitigated?: boolean;
  flowspec_id?: number;
}

interface ThreatsResponse {
  minutes: number;
  total: number;
  threats: Threat[];
}

export default function Threats() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null);
  const [threatToBlock, setThreatToBlock] = useState<{ threat: Threat, index: number } | null>(null);
  const [ttlMinutes, setTtlMinutes] = useState(360);
  const [blockAction, setBlockAction] = useState<'discard' | 'rate-limit'>('discard');
  const [blockRateLimit, setBlockRateLimit] = useState(1000);
  const [minutes, setMinutes] = useState(60);
  const [ignoredThreats, setIgnoredThreats] = useState<string[]>(() => {
    const saved = localStorage.getItem('ignored_threats');
    return saved ? JSON.parse(saved) : [];
  });

  const { data, isLoading, refetch } = useQuery<ThreatsResponse>({
    queryKey: ['threats', minutes],
    queryFn: async () => {
      const response = await api.get(`/api/flows/threats?minutes=${minutes}`);
      return response.data;
    },
    refetchInterval: 60000,
  });

  const { data: flowspecData } = useQuery({
    queryKey: ['flowspec-rules'],
    queryFn: () => api.get('/api/mitigation/flowspec').then(r => r.data).catch(() => ({ items: [] })),
    refetchInterval: 30000,
  });

  const isAlreadyMitigated = (threat: Threat) => {
    const rules = flowspecData?.rules || flowspecData?.items || [];
    return rules.find((r: any) => 
      (r.src_prefix?.startsWith(threat.src_ip || '') || (!r.src_prefix && !threat.src_ip)) &&
      r.dst_prefix?.startsWith(threat.dst_ip)
    );
  };

  const ignoreMutation = (threat: Threat) => {
    const threatKey = `${threat.src_ip || ''}-${threat.dst_ip}-${threat.type}`;
    const newIgnored = [...ignoredThreats, threatKey];
    setIgnoredThreats(newIgnored);
    localStorage.setItem('ignored_threats', JSON.stringify(newIgnored));
    toast.info('Ameaça ignorada');
  };

  const blockMutation = useMutation({
    mutationFn: async ({ threat, index, ttl_minutes, action, rate_limit_kbps }: { threat: Threat, index: number, ttl_minutes: number, action: 'discard' | 'rate-limit', rate_limit_kbps: number }) => {
      let payload: any = {
        dst_prefix: `${threat.dst_ip}/32`,
        action,
        rate_limit_kbps: action === 'rate-limit' ? rate_limit_kbps : 0,
        reason: `threat:${threat.type},label:${threat.label},severity:${threat.severity}`,
        ttl_minutes
      };

      if (threat.src_ip) {
        payload.src_prefix = `${threat.src_ip}/32`;
      }

      if (threat.type === 'port_scan' || threat.type === 'syn_flood') {
        payload.protocol = 'tcp';
      } else if (threat.type === 'dns_amplification') {
        payload.protocol = 'udp';
        payload.src_port = 53;
      } else if (threat.type === 'ntp_amplification') {
        payload.protocol = 'udp';
        payload.src_port = 123;
      } else if (threat.type === 'ssdp_amplification' || threat.type === 'udp_flood') {
        payload.protocol = 'udp';
      }

      const response = await api.post('/api/mitigation/flowspec', payload);
      return { response, index };
    },
    onSuccess: (data) => {
      toast.success('Regra FlowSpec aplicada');
      setThreatToBlock(null);
      // Update local data state to show "MITIGADO"
      queryClient.setQueryData(['threats', minutes], (old: ThreatsResponse | undefined) => {
        if (!old) return old;
        const newThreats = [...old.threats];
        newThreats[data.index] = { ...newThreats[data.index], mitigated: true };
        return { ...old, threats: newThreats };
      });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || error.message || 'Erro ao aplicar FlowSpec';
      toast.error(String(msg));
    }
  });

  const filteredThreats = useMemo(() => {
    const threatsFromApi = data?.threats || [];
    const rules = flowspecData?.rules || flowspecData?.items || [];

    // 1. Process current threats from API
    const activeThreats = threatsFromApi
      .filter(threat => {
        const threatKey = `${threat.src_ip || ''}-${threat.dst_ip}-${threat.type}`;
        return !ignoredThreats.includes(threatKey);
      })
      .map(threat => {
        const existingRule = isAlreadyMitigated(threat);
        if (existingRule) {
          return { ...threat, mitigated: true, flowspec_id: existingRule.id };
        }
        return threat;
      });

    // 2. Identify rules that were threats but are no longer in activeThreats
    const historicalThreats: Threat[] = rules
      .filter((rule: any) => {
        // Only consider discard rules
        if (rule.action !== 'discard') return false;
        
        // Skip if already matched with an active threat
        if (activeThreats.some(t => t.flowspec_id === rule.id)) return false;

        // Only include if it has threat metadata in reason
        return rule.reason?.includes('threat:');
      })
      .map((rule: any) => {
        // Parse reason to reconstruct the Threat object: "threat:port_scan,label:Port Scan,severity:high"
        const parts: any = {};
        rule.reason.split(',').forEach((p: string) => {
          const [k, v] = p.split(':');
          if (k && v) parts[k.trim()] = v.trim();
        });

        return {
          type: parts.threat || 'unknown',
          label: parts.label || 'Ameaça Mitigada',
          severity: (parts.severity as any) || 'medium',
          src_ip: rule.src_prefix?.replace('/32', ''),
          dst_ip: rule.dst_prefix?.replace('/32', ''),
          mitigated: true,
          flowspec_id: rule.id,
          flows: 0,
          packets: 0,
          bytes: 0,
          unique_ports: 0,
        };
      });

    // 3. Combine and sort: mitigated at top, then by severity
    return [...activeThreats, ...historicalThreats].sort((a, b) => {
      // Mitigated always on top
      if (a.mitigated && !b.mitigated) return -1;
      if (!a.mitigated && b.mitigated) return 1;
      
      // Then by severity
      const severityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
    });
  }, [data, ignoredThreats, flowspecData]);

  const stats = useMemo(() => {
    const threats = filteredThreats;
    const high = threats.filter(t => t.severity === 'high').length;
    const medium = threats.filter(t => t.severity === 'medium').length;
    const uniqueDstIps = new Set(threats.map(t => t.dst_ip)).size;

    return {
      total: threats.length,
      high,
      medium,
      uniqueDstIps
    };
  }, [filteredThreats]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'port_scan': return Radar;
      case 'syn_flood': return Activity;
      case 'dns_amplification': return Globe;
      case 'ntp_amplification': return Clock;
      case 'ssdp_amplification': return Radio;
      case 'udp_flood': return Waves;
      default: return AlertTriangle;
    }
  };

  const getSeverityStyles = (severity: string, mitigated?: boolean) => {
    if (mitigated) return 'border-success/30 hover:border-success/50';
    switch (severity) {
      case 'high': return 'border-red-500/50 hover:border-red-500';
      case 'medium': return 'border-amber-500/50 hover:border-amber-500';
      default: return 'border-border';
    }
  };

  const removeMitigation = async (flowspecId: number) => {
    try {
      await api.delete(`/api/mitigation/flowspec/${flowspecId}`);
      toast.success('Mitigação removida');
      queryClient.invalidateQueries({ queryKey: ['flowspec-rules'] });
      queryClient.invalidateQueries({ queryKey: ['threats'] });
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || 'Erro ao remover mitigação';
      toast.error(String(msg));
    }
  };

  const getInterpretation = (type: string) => {
    switch (type) {
      case 'port_scan':
        return "IP externo varrendo múltiplas portas do cliente. Indica reconhecimento de rede ou busca por serviços expostos.";
      case 'syn_flood':
        return "Alto volume de pacotes TCP SYN sem conclusão do handshake. Indica tentativa de esgotamento de recursos do servidor alvo.";
      case 'dns_amplification':
        return "Tráfego DNS com pacotes grandes (BPP alto) direcionado ao cliente. Indica uso de servidores DNS abertos para amplificar ataque.";
      case 'ntp_amplification':
        return "Tráfego NTP com pacotes grandes direcionado ao cliente. Indica uso de servidores NTP para amplificar ataque.";
      case 'udp_flood':
        return "Alto volume de pacotes UDP pequenos. Indica tentativa de saturar a conexão do cliente.";
      default:
        return "Comportamento anômalo detectado nos fluxos de rede que sugere atividade maliciosa ou ataque em andamento.";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high': return <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20 uppercase text-[10px] font-bold">HIGH</Badge>;
      case 'medium': return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 uppercase text-[10px] font-bold">MEDIUM</Badge>;
      default: return <Badge variant="secondary" className="uppercase text-[10px] font-bold">LOW</Badge>;
    }
  };

  const getSuggestedTtl = (type: string) => {
    switch (type) {
      case 'port_scan': return 360; // 6h
      case 'syn_flood': return 60;  // 1h
      case 'dns_amplification': return 120; // 2h
      case 'ntp_amplification': return 120; // 2h
      case 'ssdp_amplification': return 60;  // 1h
      case 'udp_flood': return 60;   // 1h
      default: return 60;
    }
  };

  const handleBlockClick = (threat: Threat, index: number) => {
    setTtlMinutes(getSuggestedTtl(threat.type));
    
    // Set default action and rate limit based on threat type
    if (['dns_amplification', 'ntp_amplification', 'ssdp_amplification'].includes(threat.type)) {
      setBlockAction('rate-limit');
      setBlockRateLimit(512);
    } else {
      setBlockAction('discard');
      setBlockRateLimit(1000);
    }
    
    setThreatToBlock({ threat, index });
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">{t('threats')} Detectadas</h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold">IPv4</Badge>
          </div>
          <p className="text-text-secondary">Análise comportamental de flows em tempo real</p>
        </div>

        <div className="flex items-center bg-bg-secondary rounded-lg border border-border p-1 gap-1">
          {[
            { label: '30min', value: 30 },
            { label: '1h', value: 60 },
            { label: '6h', value: 360 },
            { label: '24h', value: 1440 }
          ].map((period) => (
            <button
              key={period.value}
              onClick={() => setMinutes(period.value)}
              className={clsx(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                minutes === period.value 
                  ? "bg-primary text-white shadow-sm" 
                  : "text-text-secondary hover:bg-bg-primary hover:text-text-primary"
              )}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-bg-secondary border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/10">
              <Shield size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Ameaças</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-bg-secondary border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-xl text-red-500 border border-red-500/10">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Alta Severidade</p>
              <p className="text-2xl font-bold">{stats.high}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-bg-secondary border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/10">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Média Severidade</p>
              <p className="text-2xl font-bold">{stats.medium}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-bg-secondary border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/10">
              <MousePointer2 size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">IPs Afetados</p>
              <p className="text-2xl font-bold">{stats.uniqueDstIps}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {filteredThreats.length === 0 ? (
        <Card className="bg-bg-secondary border-border border-dashed py-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mb-4">
            <CheckCircle size={32} />
          </div>
          <CardTitle className="mb-2">Nenhuma ameaça detectada</CardTitle>
          <CardDescription className="max-w-md mx-auto px-6">
            O sistema analisa padrões de port scan, SYN flood, amplificação DNS/NTP/SSDP e UDP flood no período de {minutes >= 60 ? `${minutes/60}h` : `${minutes}min`}.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredThreats.map((threat, index) => {
            const Icon = getIcon(threat.type);
            return (
              <Card 
                key={`${threat.src_ip}-${threat.dst_ip}-${threat.type}-${index}`}
                className={clsx(
                  "bg-bg-secondary border transition-all duration-300 cursor-pointer",
                  getSeverityStyles(threat.severity, threat.mitigated)
                )}
                onClick={() => setSelectedThreat(threat)}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "p-2 rounded-lg border",
                        threat.severity === 'high' ? "bg-red-500/10 text-red-500 border-red-500/10" :
                        threat.severity === 'medium' ? "bg-amber-500/10 text-amber-500 border-amber-500/10" :
                        "bg-bg-primary text-text-secondary border-border"
                      )}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-bold">{threat.label}</CardTitle>
                          {getSeverityBadge(threat.severity)}
                          {threat.src_country && <Flag code={threat.src_country} size={18} />}
                        </div>
                      </div>
                    </div>
                    {threat.mitigated && (
                      <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/30 font-bold flex items-center gap-1 px-3 py-1">
                        <ShieldCheck size={14} />
                        MITIGADO
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 font-mono text-sm mb-2">
                        {threat.src_ip ? (
                          <>
                            <span className="bg-bg-primary px-2 py-1 rounded border border-border">{threat.src_ip}</span>
                            <ArrowRight size={16} className="text-text-secondary" />
                          </>
                        ) : null}
                        <span className="bg-bg-primary px-2 py-1 rounded border border-border">{threat.dst_ip}</span>
                      </div>

                      {threat.mitigated && (
                        <p className="text-xs text-text-secondary flex items-center gap-2">
                          <Zap size={12} className="text-purple-500" />
                          FlowSpec #{threat.flowspec_id} ativo · detectado em tempo real
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-secondary">
                      {threat.type === 'port_scan' && (
                        <>
                          <span className="flex items-center gap-1.5"><span className="font-bold text-text-primary">{threat.unique_ports}</span> portas únicas</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-border" />
                          <span className="flex items-center gap-1.5"><span className="font-bold text-text-primary">{threat.flows}</span> flows</span>
                        </>
                      )}
                      {threat.type === 'syn_flood' && (
                        <>
                          <span className="flex items-center gap-1.5"><span className="font-bold text-text-primary">{threat.flows}</span> flows SYN</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-border" />
                          <span className="flex items-center gap-1.5"><span className="font-bold text-text-primary">{threat.packets?.toLocaleString()}</span> pacotes</span>
                        </>
                      )}
                      {(threat.type === 'dns_amplification' || threat.type === 'ntp_amplification') && (
                        <>
                          <span className="flex items-center gap-1.5">BPP: <span className="font-bold text-text-primary">{threat.bpp}</span> bytes</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-border" />
                          <span className="flex items-center gap-1.5"><span className="font-bold text-text-primary">{threat.flows}</span> flows</span>
                        </>
                      )}
                      {threat.type === 'udp_flood' && (
                        <>
                          <span className="flex items-center gap-1.5"><span className="font-bold text-text-primary">{threat.flows}</span> flows</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-border" />
                          <span className="flex items-center gap-1.5">BPP: <span className="font-bold text-text-primary">{threat.bpp}</span></span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto" onClick={(e) => e.stopPropagation()}>
                      {!threat.mitigated ? (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs h-8 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary"
                          onClick={() => handleBlockClick(threat, index)}
                          disabled={blockMutation.isPending}
                        >
                          {blockMutation.isPending ? 'Processando...' : 'Bloquear via FlowSpec'}
                        </Button>
                      ) : (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs h-8 border-purple-500/30 text-purple-500 hover:bg-purple-500/5"
                            onClick={() => navigate({ to: '/mitigation/bgp' })}
                          >
                            <ExternalLink size={14} className="mr-1" />
                            Ver no BGP
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-xs h-8 text-danger hover:bg-danger/5"
                            onClick={() => threat.flowspec_id && removeMitigation(threat.flowspec_id)}
                          >
                            Remover mitigação
                          </Button>
                        </>
                      )}
                      {!threat.mitigated && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-xs h-8 text-text-secondary hover:text-danger hover:bg-danger/5"
                          onClick={() => ignoreMutation(threat)}
                        >
                          Ignorar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Threat Detail Modal */}
      <Sheet open={!!selectedThreat} onOpenChange={(open) => !open && setSelectedThreat(null)}>
        <SheetContent className="sm:max-w-md bg-bg-secondary border-l border-border">
          <SheetHeader className="text-left pb-4">
            <SheetTitle className="flex items-center gap-2 text-xl font-bold">
              {selectedThreat?.label} Detectada
            </SheetTitle>
          </SheetHeader>
          
          {selectedThreat && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              {/* Severity & Type */}
              <div className={clsx(
                "p-4 rounded-xl border flex items-center gap-3",
                selectedThreat.severity === 'high' ? "bg-red-500/5 border-red-500/20 text-red-500" : 
                selectedThreat.severity === 'medium' ? "bg-amber-500/5 border-amber-500/20 text-amber-500" :
                "bg-blue-500/5 border-blue-500/20 text-blue-500"
              )}>
                <div className={clsx(
                  "p-2 rounded-lg",
                  selectedThreat.severity === 'high' ? "bg-red-500/10" : 
                  selectedThreat.severity === 'medium' ? "bg-amber-500/10" :
                  "bg-blue-500/10"
                )}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black uppercase tracking-wider text-xs">
                      {selectedThreat.severity === 'high' ? '🔴 ALTA' : selectedThreat.severity === 'medium' ? '🟡 MÉDIO' : '🔵 BAIXA'}
                    </span>
                    <span className="font-bold">· {selectedThreat.label}</span>
                  </div>
                </div>
              </div>

              {/* Source Info */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <MapPin size={12} /> ORIGEM DO SCAN
                  </h4>
                  <div className="space-y-2">
                    <p className="font-mono text-sm text-text-primary flex justify-between">
                      <span className="text-text-secondary">IP:</span>
                      <span className="font-bold">{selectedThreat.src_ip || 'Desconhecido'}</span>
                    </p>
                    {selectedThreat.src_country && (
                      <p className="text-sm text-text-primary flex justify-between">
                        <span className="text-text-secondary">País:</span>
                        <span className="flex items-center gap-2 font-bold">
                          <Flag code={selectedThreat.src_country} size={18} />
                          {selectedThreat.src_country}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <Separator className="bg-border/50" />

                {/* Target Info */}
                <div>
                  <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Target size={12} /> ALVO DO SCAN
                  </h4>
                  <p className="font-mono text-sm text-text-primary flex justify-between">
                    <span className="text-text-secondary">IP:</span>
                    <span className="font-bold">{selectedThreat.dst_ip}</span>
                  </p>
                </div>

                <Separator className="bg-border/50" />

                {/* Behavior Info */}
                <div>
                  <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Activity size={12} /> COMPORTAMENTO
                  </h4>
                  <div className="space-y-2">
                    {selectedThreat.unique_ports && (
                      <p className="text-sm text-text-primary flex justify-between">
                        <span className="text-text-secondary">Portas únicas:</span>
                        <span className="font-bold">{selectedThreat.unique_ports}</span>
                      </p>
                    )}
                    <p className="text-sm text-text-primary flex justify-between">
                      <span className="text-text-secondary">Flows:</span>
                      <span className="font-bold">{selectedThreat.flows?.toLocaleString()}</span>
                    </p>
                    <p className="text-sm text-text-primary flex justify-between">
                      <span className="text-text-secondary">Protocolo:</span>
                      <span className="font-bold uppercase">
                        {selectedThreat.type === 'port_scan' || selectedThreat.type === 'syn_flood' ? 'TCP' : 'UDP'}
                      </span>
                    </p>
                  </div>
                </div>

                <Separator className="bg-border/50" />

                {/* Interpretation */}
                <div>
                  <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Info size={12} /> INTERPRETAÇÃO
                  </h4>
                  <div className="bg-bg-primary/50 p-4 rounded-lg border border-border/50">
                    <p className="text-sm text-text-primary leading-relaxed">
                      {getInterpretation(selectedThreat.type)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                {!selectedThreat.mitigated ? (
                  <>
                    <Button 
                      className="w-full font-bold gap-2 bg-primary hover:bg-primary/90"
                      onClick={() => handleBlockClick(selectedThreat, filteredThreats.indexOf(selectedThreat))}
                      disabled={blockMutation.isPending}
                    >
                      <Zap size={16} />
                      {blockMutation.isPending ? 'Processando...' : 'Bloquear via FlowSpec'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full text-text-secondary hover:text-danger hover:bg-danger/5 font-bold"
                      onClick={() => {
                        ignoreMutation(selectedThreat);
                        setSelectedThreat(null);
                      }}
                    >
                      Ignorar
                    </Button>
                  </>
                ) : (
                  <div className="p-4 bg-success/5 border border-success/20 rounded-xl text-center">
                    <div className="flex flex-col items-center gap-2 mb-3">
                      <ShieldCheck size={32} className="text-success" />
                      <p className="font-bold text-success">Mitigação Ativa</p>
                      <p className="text-xs text-text-secondary">Uma regra FlowSpec está protegendo este alvo no momento.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1 text-xs border-purple-500/30 text-purple-500 hover:bg-purple-500/5"
                        onClick={() => {
                          setSelectedThreat(null);
                          navigate({ to: '/mitigation/bgp' });
                        }}
                      >
                        Ver no BGP
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="flex-1 text-xs text-danger hover:bg-danger/5"
                        onClick={() => {
                          selectedThreat.flowspec_id && removeMitigation(selectedThreat.flowspec_id);
                          setSelectedThreat(null);
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Block Confirmation Modal */}
      <AlertDialog open={!!threatToBlock} onOpenChange={(open: boolean) => !open && setThreatToBlock(null)}>
        <AlertDialogContent className="bg-bg-secondary border-border max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Zap className="text-primary" size={20} />
              Bloquear via FlowSpec
            </AlertDialogTitle>
            <div className="py-4 space-y-4">
              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-red-500/10 rounded text-red-500">
                    {threatToBlock && React.createElement(getIcon(threatToBlock.threat.type), { size: 16 })}
                  </div>
                  <span className="font-bold text-sm text-text-primary">{threatToBlock?.threat.label}</span>
                </div>
                <div className="font-mono text-xs text-text-secondary flex items-center gap-2">
                  <span>{threatToBlock?.threat.src_ip}</span>
                  <ArrowRight size={12} />
                  <span>{threatToBlock?.threat.dst_ip}</span>
                </div>
                {threatToBlock?.threat.type === 'port_scan' && (
                  <p className="text-[10px] text-text-secondary mt-1">{threatToBlock.threat.unique_ports} portas únicas</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Duração do bloqueio</label>
                <select
                  className="w-full bg-bg-primary border border-border rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm text-text-primary"
                  value={ttlMinutes}
                  onChange={(e) => setTtlMinutes(parseInt(e.target.value))}
                >
                  <option value="5">5 minutos</option>
                  <option value="10">10 minutos</option>
                  <option value="30">30 minutos</option>
                  <option value="60">1 hora</option>
                  <option value="120">2 horas</option>
                  <option value="360">6 horas</option>
                  <option value="720">12 horas</option>
                  <option value="1440">24 horas</option>
                  <option value="0">Permanente</option>
                </select>
                <p className="text-[10px] text-text-secondary italic ml-1">
                  TTL sugerido para {threatToBlock?.threat.label}: {getSuggestedTtl(threatToBlock?.threat.type || '') >= 60 ? `${getSuggestedTtl(threatToBlock?.threat.type || '') / 60}h` : `${getSuggestedTtl(threatToBlock?.threat.type || '')}min`}
                </p>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border hover:bg-bg-primary">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary hover:bg-primary/90 text-white font-bold"
              disabled={blockMutation.isPending}
              onClick={() => threatToBlock && blockMutation.mutate({ ...threatToBlock, ttl_minutes: ttlMinutes })}
            >
              {blockMutation.isPending ? 'Aplicando...' : '✅ Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
