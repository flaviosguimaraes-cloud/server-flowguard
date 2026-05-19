import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Globe, Clock, BarChart3, TrendingUp, Activity, Award, Users, ChevronDown, ChevronUp, MapPin, Server } from 'lucide-react';
import { clsx } from 'clsx';

const CDN_COLORS: Record<string, string> = {
  'Netflix': '#E50914',
  'Google': '#4285F4',
  'YouTube': '#FF0000',
  'Cloudflare': '#F48120',
  'Akamai': '#009BDE',
  'Amazon': '#FF9900',
  'Meta': '#1877F2',
  'Microsoft': '#00BCF2',
  'Apple': '#555555',
  'Disney': '#113CCF',
  'Fastly': '#FF282D',
  'Steam': '#1b2838',
  'Riot': '#C89B3C',
  'TikTok': '#010101',
};

const CDN_ASN: Record<string, string> = {
  'Netflix': 'AS2906',
  'Google': 'AS15169',
  'YouTube': 'AS15169',
  'Cloudflare': 'AS13335',
  'Akamai': 'AS20940',
  'Amazon': 'AS16509',
  'Meta': 'AS32934',
  'Microsoft': 'AS8075',
  'Apple': 'AS714',
  'Disney': 'AS23286',
  'Fastly': 'AS54113',
  'Steam': 'AS32590',
  'Riot': 'AS6507',
  'TikTok': 'AS138699',
};

const getFavicon = (cdn: string) => {
  const domains: Record<string, string> = {
    'Netflix': 'netflix.com',
    'Google': 'google.com',
    'YouTube': 'youtube.com',
    'Cloudflare': 'cloudflare.com',
    'Akamai': 'akamai.com',
    'Amazon': 'amazon.com',
    'Meta': 'meta.com',
    'Microsoft': 'microsoft.com',
    'Apple': 'apple.com',
    'Disney': 'disneyplus.com',
    'Fastly': 'fastly.com',
    'Steam': 'steampowered.com',
    'Riot': 'riotgames.com',
    'TikTok': 'tiktok.com',
  };
  const d = domains[cdn];
  return d
    ? `https://www.google.com/s2/favicons?domain=${d}&sz=32`
    : null;
};


  const SummaryCard = ({ title, value, icon, color = 'primary' }: any) => {
    const colorClasses: Record<string, string> = {
      primary: 'bg-primary',
      accent: 'bg-accent',
      success: 'bg-success',
      warning: 'bg-warning',
      danger: 'bg-danger'
    };

    return (
      <div className="bg-bg-secondary p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between min-h-[120px] transition-all hover:border-primary/30 group">
        <div className="flex justify-between items-start">
          <div className={clsx("p-2 rounded-lg text-white shadow-sm", colorClasses[color] || 'bg-primary')}>
            {icon}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-text-secondary text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70">{title}</p>
          <h3 className="text-xl font-bold text-text-primary truncate tracking-tight">{value}</h3>
        </div>
      </div>
    );
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