import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Globe, Clock, BarChart3, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';

const CDN_COLORS: Record<string, string> = {
  'Netflix': '#E50914',
  'Google': '#4285F4',
  'YouTube': '#FF0000',
  'Akamai': '#009BDE',
  'Cloudflare': '#F48120',
  'Amazon': '#FF9900',
  'AWS': '#FF9900',
  'Meta': '#1877F2',
  'Facebook': '#1877F2',
  'Instagram': '#E4405F',
  'Microsoft': '#00BCF2',
  'Azure': '#008AD7',
  'Apple': '#555555',
  'Disney': '#113CCF',
  'Fastly': '#FF282D',
};

const CDNs = () => {
  const [minutes, setMinutes] = useState(60);

  const { data, isLoading } = useQuery({
    queryKey: ['cdns-ranking', minutes],
    queryFn: () => api.get(`/api/flows/cdns?minutes=${minutes}`).then(r => r.data),
    refetchInterval: 30000,
  });

  const items = data?.items || [];
  const totalBytes = items.reduce((acc: number, item: any) => acc + (item.bytes || 0), 0);

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

  const getCdnColor = (name: string) => {
    for (const key in CDN_COLORS) {
      if (name.toLowerCase().includes(key.toLowerCase())) return CDN_COLORS[key];
    }
    return '#8892a4';
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Summary Card */}
        <div className="bg-bg-secondary p-6 rounded-xl border border-border flex flex-col justify-center gap-2">
          <div className="flex items-center gap-2 text-text-secondary">
            <TrendingUp size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Tráfego Total (CDN)</span>
          </div>
          <div className="text-3xl font-bold text-text-primary">
            {isLoading ? '...' : formatBytes(totalBytes)}
          </div>
          <p className="text-xs text-text-secondary">Analisado nos últimos {periods.find(p => p.value === minutes)?.label}</p>
        </div>

        <div className="lg:col-span-2 bg-bg-secondary p-6 rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={18} className="text-primary" />
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Top Provedores</h2>
          </div>

          <div className="space-y-5">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between h-3 w-24 bg-border/50 rounded animate-pulse" />
                  <div className="h-2 bg-border/30 rounded w-full animate-pulse" />
                </div>
              ))
            ) : items.length === 0 ? (
              <div className="text-center py-10 text-text-secondary italic">Dados não disponíveis para este período</div>
            ) : (
              items.map((item: any, i: number) => {
                const percentage = totalBytes > 0 ? (item.bytes / totalBytes) * 100 : 0;
                const color = getCdnColor(item.cdn);
                return (
                  <div key={i} className="space-y-1.5 group">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary group-hover:text-primary transition-colors">{item.cdn}</span>
                        <span className="text-[10px] text-text-secondary font-mono">({item.flows?.toLocaleString()} flows)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-text-secondary">{formatBytes(item.bytes)}</span>
                        <span className="font-bold text-text-primary w-10 text-right">{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-bg-primary rounded-full overflow-hidden border border-border/50">
                      <div 
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: color,
                          boxShadow: `0 0 8px ${color}40`
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CDNs;