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
    ? \`https://www.google.com/s2/favicons?domain=\${d}&sz=32\`
    : null;
};

const CDNs = () => {
  const [minutes, setMinutes] = useState(60);
  const [expandedCdn, setExpandedCdn] = useState<string | null>(null);
  const isAuthenticated = !!localStorage.getItem('access_token');

  const { data, isLoading } = useQuery({
    queryKey: ['cdns-ranking', minutes],
    enabled: isAuthenticated,
    queryFn: () => api.get(\`/api/flows/cdns?minutes=\${minutes}\`).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: cdnDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['cdn-details', expandedCdn, minutes],
    enabled: !!expandedCdn && isAuthenticated,
    queryFn: () => api.get(\`/api/flows/cdns/\${expandedCdn}/details?minutes=\${minutes}\`).then(r => r.data),
  });

  const toggleCdn = (cdn: string) => {
    setExpandedCdn(prev => prev === cdn ? null : cdn);
  };

  const items = data?.items || [];
  const cdnTotalBytes = items.reduce((acc: number, item: any) => acc + (item.bytes || 0), 0);
  const overallTotalBytes = data?.total_bytes || (cdnTotalBytes * 1.4); 
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
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
          value={isLoading ? '...' : \`\${cdnPercentageOfTotal.toFixed(1)}%\`} 
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

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-bg-secondary h-24 rounded-xl border border-border animate-pulse" />
          ))
        ) : items.length === 0 ? (
          <div className="bg-bg-secondary p-10 rounded-xl border border-border text-center text-text-secondary italic">Dados não disponíveis para este período</div>
        ) : (
          items.map((item: any, idx: number) => {
            const isExpanded = expandedCdn === item.cdn;
            const color = CDN_COLORS[item.cdn] || '#8892a4';
            const asn = CDN_ASN[item.cdn] || 'ASN Desconhecido';
            const favicon = getFavicon(item.cdn);
            
            return (
              <div key={idx} className="bg-bg-secondary rounded-xl border border-border overflow-hidden shadow-sm transition-all hover:border-primary/30">
                <div 
                  className="p-5 cursor-pointer select-none"
                  onClick={() => toggleCdn(item.cdn)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-bg-primary flex items-center justify-center border border-border/50 overflow-hidden">
                        {favicon ? (
                          <img src={favicon} alt={item.cdn} className="w-6 h-6 object-contain" />
                        ) : (
                          <Globe size={20} className="text-text-secondary opacity-50" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-text-primary">{item.cdn}</h3>
                          <span className="text-[10px] font-bold text-text-secondary bg-bg-primary px-1.5 py-0.5 rounded border border-border">
                            {asn}
                          </span>
                          <span className="text-[10px] font-bold text-text-secondary opacity-40">
                            #{idx + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                           <div className="text-[10px] font-bold" style={{ color }}>{item.percent?.toFixed(1) || ((item.bytes / cdnTotalBytes) * 100).toFixed(1)}%</div>
                           <div className="w-48 h-1.5 bg-bg-primary rounded-full overflow-hidden border border-border/10">
                             <div 
                               className="h-full rounded-full transition-all duration-1000"
                               style={{ 
                                 width: \`\${item.percent || (item.bytes / cdnTotalBytes) * 100}%\`,
                                 backgroundColor: color
                               }}
                             />
                           </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <div className="text-sm font-bold text-text-primary">{formatBytes(item.bytes)}</div>
                        <div className="text-[10px] text-text-secondary font-medium tracking-tight">{item.flows.toLocaleString()} flows</div>
                      </div>
                      <div className="text-text-secondary">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>

                  <div className="mt-1 px-1 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary">
                      <MapPin size={12} className="text-primary" />
                      Países: {item.top_countries || '🇧🇷'}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border bg-bg-primary/30 p-5 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Server size={14} className="text-primary" />
                      <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Top IPs</h4>
                    </div>
                    
                    {isLoadingDetails ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-10 bg-bg-secondary rounded border border-border animate-pulse" />)}
                      </div>
                    ) : !cdnDetails?.top_ips?.length ? (
                      <div className="text-center py-4 text-xs text-text-secondary italic">Nenhum detalhe disponível</div>
                    ) : (
                      <div className="space-y-1">
                        {cdnDetails.top_ips.map((ip: any, i: number) => (
                          <div key={i} className="grid grid-cols-4 items-center gap-4 p-3 bg-bg-secondary rounded-lg border border-border/50 text-xs hover:border-primary/20 transition-colors">
                            <div className="font-mono font-bold text-text-primary">{ip.ip}</div>
                            <div className="text-text-secondary font-medium font-mono">{formatBytes(ip.bytes)}</div>
                            <div className="text-text-secondary opacity-70 font-mono">{ip.flows.toLocaleString()} flows</div>
                            <div className="text-right text-text-secondary">Porta: <span className="text-text-primary font-bold">{ip.port || 443}</span></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CDNs;
