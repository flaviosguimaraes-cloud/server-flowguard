import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';
import { 
  Shield, AlertTriangle, Clock, Activity, 
  Radar, Waves, Globe, Radio, CheckCircle, 
  XCircle, Filter, Trash2, ArrowRight, MousePointer2
} from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
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
}

interface ThreatsResponse {
  minutes: number;
  total: number;
  threats: Threat[];
}

export default function Threats() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
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

  const ignoreMutation = (threat: Threat) => {
    const threatKey = `${threat.src_ip || ''}-${threat.dst_ip}-${threat.type}`;
    const newIgnored = [...ignoredThreats, threatKey];
    setIgnoredThreats(newIgnored);
    localStorage.setItem('ignored_threats', JSON.stringify(newIgnored));
    toast.info('Ameaça ignorada');
  };

  const blockMutation = useMutation({
    mutationFn: async ({ threat, index }: { threat: Threat, index: number }) => {
      let payload: any = {
        dst_prefix: `${threat.dst_ip}/32`,
        action: 'discard',
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
      // Update local data state to show "MITIGADO"
      queryClient.setQueryData(['threats', minutes], (old: ThreatsResponse | undefined) => {
        if (!old) return old;
        const newThreats = [...old.threats];
        newThreats[data.index] = { ...newThreats[data.index], mitigated: true };
        return { ...old, threats: newThreats };
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao aplicar FlowSpec');
    }
  });

  const filteredThreats = useMemo(() => {
    if (!data?.threats) return [];
    return data.threats.filter(threat => {
      const threatKey = `${threat.src_ip || ''}-${threat.dst_ip}-${threat.type}`;
      return !ignoredThreats.includes(threatKey);
    });
  }, [data, ignoredThreats]);

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

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-500/50 hover:border-red-500';
      case 'medium': return 'border-amber-500/50 hover:border-amber-500';
      default: return 'border-border';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high': return <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20 uppercase text-[10px] font-bold">HIGH</Badge>;
      case 'medium': return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 uppercase text-[10px] font-bold">MEDIUM</Badge>;
      default: return <Badge variant="secondary" className="uppercase text-[10px] font-bold">LOW</Badge>;
    }
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
                  "bg-bg-secondary border transition-all duration-300",
                  getSeverityStyles(threat.severity)
                )}
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
                      <Badge className="bg-success/10 text-success border-success/20 font-bold flex items-center gap-1 px-3 py-1">
                        <CheckCircle size={14} />
                        MITIGADO
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-2">
                    <div className="flex items-center gap-3 font-mono text-sm">
                      {threat.src_ip ? (
                        <>
                          <span className="bg-bg-primary px-2 py-1 rounded border border-border">{threat.src_ip}</span>
                          <ArrowRight size={16} className="text-text-secondary" />
                        </>
                      ) : null}
                      <span className="bg-bg-primary px-2 py-1 rounded border border-border">{threat.dst_ip}</span>
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

                    <div className="flex items-center gap-2 ml-auto">
                      {!threat.mitigated && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs h-8 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary"
                          onClick={() => blockMutation.mutate({ threat, index })}
                          disabled={blockMutation.isPending}
                        >
                          {blockMutation.isPending ? 'Processando...' : 'Bloquear via FlowSpec'}
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-xs h-8 text-text-secondary hover:text-danger hover:bg-danger/5"
                        onClick={() => ignoreMutation(threat)}
                      >
                        Ignorar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
