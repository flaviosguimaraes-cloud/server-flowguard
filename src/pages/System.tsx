import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Monitor, Cpu, HardDrive, Clock, RefreshCw, Server, Info, ShieldCheck, Activity } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const System = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [restarting, setRestarting] = useState<string | null>(null);

  const { data: status, isLoading: loadingStatus, dataUpdatedAt } = useQuery({
    queryKey: ['system-status'],
    queryFn: () => api.get('/api/system/status').then(r => r.data),
    refetchInterval: 10000,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: versionData } = useQuery({
    queryKey: ['system-version'],
    queryFn: () => api.get('/api/version').then(r => r.data),
  });

  const restartMutation = useMutation({
    mutationFn: (service: string) => api.post(`/api/system/restart/${service}`),
    onSuccess: (_, service) => {
      toast.success(`Serviço ${service} reiniciado com sucesso`);
      queryClient.invalidateQueries({ queryKey: ['system-status'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao reiniciar serviço');
    },
    onSettled: () => setRestarting(null)
  });

  const handleRestart = (service: string) => {
    if (window.confirm(`Tem certeza que deseja reiniciar o serviço ${service}? O sistema poderá ficar indisponível por alguns segundos.`)) {
      setRestarting(service);
      restartMutation.mutate(service);
    }
  };

   const services = [
     { id: 'fastnetmon', name: 'Mitigador' },
     { id: 'flowguard-api', name: 'FlowGuard API' },
     { id: 'exabgp', name: 'BGP Speaker' },
     { id: 'clickhouse', name: 'Banco de Flows' },
     { id: 'nginx', name: 'Proxy Web' },
   ];

  const systemInfo = [
    { label: 'Versão do FlowGuard', value: versionData?.version || '1.2.0-stable' },
    { label: 'Versão Python', value: '3.10.12' },
    { label: 'Versão FastAPI', value: '0.109.2' },
    { label: 'IP do Servidor', value: '45.175.50.219' },
    { label: 'Hostname', value: 'flow-ddos' },
    { label: 'OS', value: 'Ubuntu 22.04 LTS' },
  ];

  const renderMetric = (label: string, value: any, icon: any, unit: string = '%') => (
    <div className="bg-bg-secondary p-4 rounded-xl border border-border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-secondary">
          {icon}
          <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-sm font-mono font-bold text-text-primary">{value}{unit}</span>
      </div>
      <div className="h-1.5 w-full bg-bg-primary rounded-full overflow-hidden">
        <div 
          className={clsx(
            "h-full rounded-full transition-all duration-500",
            value > 80 ? "bg-danger" : value > 60 ? "bg-warning" : "bg-success"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Monitor size={24} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Sistema</h1>
              <p className="text-sm text-text-secondary">Monitoramento de saúde e controle de serviços</p>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-success/5 border border-success/10 rounded-full">
                <span style={{
                  display: 'inline-block',
                  width: 8, height: 8,
                  borderRadius: '50%',
                  background: '#22c55e',
                  animation: 'pulse 2s infinite',
                }} />
                <span className="text-[10px] font-bold text-success uppercase tracking-widest">Atualização automática a cada 10s</span>
              </div>
              {dataUpdatedAt && (
                <p className="text-[10px] text-text-secondary font-medium mr-1">
                  Atualizado: {new Date(dataUpdatedAt).toLocaleTimeString('pt-BR')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
      `}</style>

      {/* Section 1: Health */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Activity className="text-primary" size={18} />
          <h2 className="text-lg font-bold text-text-primary">Saúde do Servidor</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderMetric('CPU', status?.cpu || 12, <Cpu size={14} />)}
          {renderMetric('Memória', status?.ram || 45, <ShieldCheck size={14} />)}
          {renderMetric('Disco', status?.disk || 28, <HardDrive size={14} />)}
          <div className="bg-bg-secondary p-4 rounded-xl border border-border flex flex-col justify-between">
            <div className="flex items-center gap-2 text-text-secondary">
              <Clock size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Uptime</span>
            </div>
            <span className="text-lg font-bold text-text-primary">{status?.uptime || '15d 4h 22m'}</span>
          </div>
        </div>
      </div>

      {/* Section 2: Restart Services */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <RefreshCw className="text-primary" size={18} />
          <h2 className="text-lg font-bold text-text-primary">Serviços do Sistema</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => {
            const serviceStatus = status?.services?.[service.id] || 'active';
            const isActive = serviceStatus === 'active';
            
            return (
              <div key={service.id} className="bg-bg-secondary p-5 rounded-xl border border-border flex items-center justify-between group hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "p-2 rounded-lg transition-colors",
                    isActive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                  )}>
                    <Server size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-text-primary text-sm">{service.name}</h3>
                    <div className="flex items-center gap-1.5">
                      <div className={clsx("w-1.5 h-1.5 rounded-full", isActive ? "bg-success" : "bg-danger")} />
                      <span className="text-[10px] font-bold uppercase text-text-secondary">{serviceStatus}</span>
                    </div>
                  </div>
                </div>
                
                {isAdmin && (
                  <button
                    onClick={() => handleRestart(service.id)}
                    disabled={restarting === service.id}
                    className="p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                    title="Reiniciar serviço"
                  >
                    <RefreshCw size={18} className={restarting === service.id ? "animate-spin" : ""} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: System Info */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Info className="text-primary" size={18} />
          <h2 className="text-lg font-bold text-text-primary">Informações Técnicas</h2>
        </div>

        <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {systemInfo.map((info, i) => (
              <div key={i} className="p-4 flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-text-secondary tracking-wider">{info.label}</span>
                <span className="text-sm font-mono text-text-primary">{info.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default System;
