import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Globe, Clock, BarChart3, TrendingUp, Activity, Award, Users } from 'lucide-react';
import { clsx } from 'clsx';

const CDN_INFO: Record<string, { color: string; abbr: string; desc: string }> = {
  'Netflix': {
    color: '#E50914',
    abbr: 'NF',
    desc: 'Streaming de vídeo'
  },
  'Google': {
    color: '#4285F4',
    abbr: 'GO',
    desc: 'Busca e serviços'
  },
  'YouTube': {
    color: '#FF0000',
    abbr: 'YT',
    desc: 'Streaming de vídeo'
  },
  'Cloudflare': {
    color: '#F48120',
    abbr: 'CF',
    desc: 'CDN e segurança'
  },
  'Akamai': {
    color: '#009BDE',
    abbr: 'AK',
    desc: 'CDN enterprise'
  },
  'Amazon': {
    color: '#FF9900',
    abbr: 'AZ',
    desc: 'Cloud e streaming'
  },
  'Meta': {
    color: '#1877F2',
    abbr: 'FB',
    desc: 'Redes sociais'
  },
  'Microsoft': {
    color: '#00BCF2',
    abbr: 'MS',
    desc: 'Cloud e serviços'
  },
  'Disney': {
    color: '#113CCF',
    abbr: 'DI',
    desc: 'Streaming de vídeo'
  },
  'Fastly': {
    color: '#FF282D',
    abbr: 'FA',
    desc: 'CDN edge'
  },
};

const CDNs = () => {
  const [minutes, setMinutes] = useState(60);

  const { data, isLoading } = useQuery({
    queryKey: ['cdns-ranking', minutes],
    queryFn: () => api.get(`/api/flows/cdns?minutes=${minutes}`).then(r => r.data),
    refetchInterval: 30000,
  });

  const items = data?.items || [];
  const cdnTotalBytes = items.reduce((acc: number, item: any) => acc + (item.bytes || 0), 0);
  const overallTotalBytes = data?.total_bytes || (cdnTotalBytes * 1.4); // Fallback estimate if total_bytes not present
  const cdnPercentageOfTotal = overallTotalBytes > 0 ? (cdnTotalBytes / overallTotalBytes) * 100 : 0;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const periods = [
    { label: '30min', value: 30 },
    { label: '1h', value: 60 },
    { label: '6h', value: 360 },
    { label: '24h', value: 1440 },
  ];

  const getCdnInfo = (name: string) => {
    for (const key in CDN_INFO) {
      if (name.toLowerCase().includes(key.toLowerCase())) return CDN_INFO[key];
    }
    return {
      color: '#8892a4',
      abbr: name.substring(0, 2).toUpperCase(),
      desc: 'Provedor de Conteúdo'
    };
  };

  const SummaryCard = ({ title, value, icon, color = 'primary' }: any) => (
    <div className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between min-h-[120px] transition-all hover:border-primary/30 group">
      <div className="flex justify-between items-start">
        <div className={clsx("p-2 rounded-lg text-white", `bg-${color}`)}>
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-text-secondary text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-xl font-bold text-text-primary truncate">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Globe size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Ranking de CDNs</h1>
            <p className="text-sm text-text-secondary">Distribuição de tráfego por provedor de conteúdo</p>
          </div>
        </div>
        
        <div className="flex bg-bg-secondary p-1 rounded-lg border border-border">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setMinutes(p.value)}
              className={clsx(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                minutes === p.value 
                  ? "bg-primary text-white shadow-sm" 
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          title="CDNs Identificados" 
          value={isLoading ? '...' : items.length} 
          icon={<Globe size={20} />} 
          color="accent"
        />
        <SummaryCard 
          title="Volume via CDN" 
          value={isLoading ? '...' : formatBytes(cdnTotalBytes)} 
          icon={<Activity size={20} />} 
          color="primary"
        />
        <SummaryCard 
          title="% do Tráfego CDN" 
          value={isLoading ? '...' : `${cdnPercentageOfTotal.toFixed(1)}%`} 
          icon={<BarChart3 size={20} />} 
          color="success"
        />
        <SummaryCard 
          title="CDN Dominante" 
          value={isLoading ? '...' : (items[0]?.cdn || '—')} 
          icon={<Award size={20} />} 
          color="warning"
        />
      </div>

      <div className="bg-bg-secondary p-6 rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={18} className="text-primary" />
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Top Provedores</h2>
          </div>

          <div className="divide-y divide-border/10">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="py-4 space-y-3">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-border/20 rounded-lg animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-border/20 rounded w-1/4 animate-pulse" />
                      <div className="h-2 bg-border/20 rounded w-full animate-pulse" />
                    </div>
                  </div>
                </div>
              ))
            ) : items.length === 0 ? (
              <div className="text-center py-10 text-text-secondary italic">Dados não disponíveis para este período</div>
            ) : (
              items.map((item: any, idx: number) => {
                const info = getCdnInfo(item.cdn);
                const pct = cdnTotalBytes > 0 ? (item.bytes / cdnTotalBytes) * 100 : 0;
                return (
                  <div key={idx} className="flex items-center gap-4 py-4 group">
                    {/* Ícone/inicial */}
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 transition-transform group-hover:scale-105"
                      style={{
                        background: info.color + '15',
                        borderColor: info.color,
                        color: info.color
                      }}
                    >
                      {info.abbr}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Nome + descrição + ranking */}
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="flex items-baseline gap-2 overflow-hidden">
                          <span className="font-bold text-sm text-text-primary truncate">
                            {item.cdn}
                          </span>
                          <span className="text-[10px] text-text-secondary font-medium truncate opacity-70">
                            {info.desc}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-text-secondary opacity-40">
                          #{idx + 1}
                        </span>
                      </div>

                      {/* Barra de progresso */}
                      <div className="h-1.5 w-full bg-bg-primary rounded-full overflow-hidden mb-2 border border-border/5">
                        <div 
                          className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                          style={{ 
                            width: `${pct}%`,
                            backgroundColor: info.color,
                            boxShadow: `0 0 10px ${info.color}30`
                          }}
                        />
                      </div>

                      {/* Métricas */}
                      <div className="flex items-center gap-4 text-[10px] font-bold tracking-tight">
                        <span style={{ color: info.color }}>
                          {pct.toFixed(1)}%
                        </span>
                        <span className="text-text-secondary opacity-60 flex items-center gap-1">
                          <Activity size={10} />
                          {formatBytes(item.bytes)}
                        </span>
                        <span className="text-text-secondary opacity-60 flex items-center gap-1">
                          <Users size={10} />
                          {item.flows.toLocaleString()} flows
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
  );
};

export default CDNs;