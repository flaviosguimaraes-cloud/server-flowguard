import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Globe, Clock, BarChart3, TrendingUp, Activity, Award, Users, ChevronDown, ChevronUp, MapPin, Server, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip as ChartTooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement 
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import Flag from '../components/Flag';

ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement);

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

const CDN_CATEGORY: Record<string, string> = {
  'Netflix': 'Streaming',
  'Disney': 'Streaming',
  'YouTube': 'Streaming',
  'Google': 'Cloud/Apps',
  'Amazon': 'Cloud/Apps',
  'Microsoft': 'Cloud/Apps',
  'Cloudflare': 'Segurança/CDN',
  'Akamai': 'Segurança/CDN',
  'Fastly': 'Segurança/CDN',
  'Meta': 'Redes Sociais',
  'TikTok': 'Redes Sociais',
  'Steam': 'Gaming',
  'Riot': 'Gaming',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Streaming': '#E50914',
  'Cloud/Apps': '#378ADD',
  'Segurança/CDN': '#F48120',
  'Redes Sociais': '#1877F2',
  'Gaming': '#1b2838',
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

const FlowBadge = () => (
  <span className="text-[10px] font-bold text-text-secondary bg-bg-primary px-1.5 py-0.5 rounded border border-border ml-2 opacity-60">
    IPv4
  </span>
);

const CDNs = () => {
  const [minutes, setMinutes] = useState(60);
  const [expandedCdn, setExpandedCdn] = useState<string | null>(null);
  const isAuthenticated = !!localStorage.getItem('access_token');

  const { data, isLoading } = useQuery({
    queryKey: ['cdns-ranking', minutes],
    enabled: isAuthenticated,
    queryFn: () => api.get(`/api/flows/cdns?minutes=${minutes}`).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: cdnDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['cdn-details', expandedCdn, minutes],
    enabled: !!expandedCdn && isAuthenticated,
    queryFn: () => api.get(`/api/flows/cdns/${expandedCdn}/details?minutes=${minutes}`).then(r => r.data),
  });

  const toggleCdn = (cdn: string) => {
    setExpandedCdn(prev => prev === cdn ? null : cdn);
  };

  const items = data?.items || [];
  const cdnTotalBytes = items.reduce((acc: number, item: any) => acc + (item.bytes || 0), 0);
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const barData = useMemo(() => {
    const top5 = items.slice(0, 5);
    return {
      labels: top5.map((it: any) => String(it.cdn || 'Desconhecido')),
      datasets: [{
        label: 'Volume (Bytes)',
        data: top5.map((it: any) => it.bytes),
        backgroundColor: top5.map((it: any) => CDN_COLORS[String(it.cdn)] || '#8892a4'),
        borderRadius: 4,
        barThickness: 20,
      }]
    };
  }, [items]);

  const donutData = useMemo(() => {
    const cats: Record<string, number> = {};
    items.forEach((it: any) => {
      const cdnName = String(it.cdn || '');
      const cat = CDN_CATEGORY[cdnName] || 'Outros';
      cats[cat] = (cats[cat] || 0) + it.bytes;
    });
    
    const labels = Object.keys(cats);
    return {
      labels,
      datasets: [{
        data: Object.values(cats),
        backgroundColor: labels.map(l => CATEGORY_COLORS[l] || '#8892a4'),
        borderWidth: 0,
        cutout: '70%',
      }]
    };
  }, [items]);

  const periods = [
    { label: '30min', value: 30 },
    { label: '1h', value: 60 },
    { label: '6h', value: 360 },
    { label: '24h', value: 1440 },
  ];

  const SummaryCard = ({ title, value, icon, color = 'primary' }: any) => {
    const colorClasses: Record<string, string> = {
      primary: 'text-primary',
      accent: 'text-accent',
      success: 'text-success',
      warning: 'text-warning',
      danger: 'text-danger'
    };

    return (
      <div className="bg-bg-secondary p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between min-h-[110px] transition-all hover:border-primary/30 group">
        <div className="flex justify-between items-start">
           <p className="text-text-secondary text-[10px] font-bold uppercase tracking-widest opacity-70">{title}</p>
          <div className={clsx("p-2 rounded-lg bg-bg-primary border border-border/40 transition-colors group-hover:bg-primary/5", colorClasses[color] || 'text-primary')}>
            {icon}
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-xl font-black text-text-primary truncate tracking-tight">{value}</h3>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Globe size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Ranking de CDNs <FlowBadge /></h1>
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

      {/* SEÇÃO 1 — Cards resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          title="CDNs Identificados" 
          value={isLoading ? '...' : items.length} 
          icon={<Globe size={18} />} 
          color="accent"
        />
        <SummaryCard 
          title="Volume via CDN" 
          value={isLoading ? '...' : formatBytes(cdnTotalBytes)} 
          icon={<Activity size={18} />} 
          color="primary"
        />
        <SummaryCard 
          title="% Maior Tráfego" 
          value={isLoading ? '...' : `${items[0]?.percent?.toFixed(1) || '0'}%`} 
          icon={<BarChart3 size={18} />} 
          color="success"
        />
        <SummaryCard 
          title="CDN Dominante" 
          value={isLoading ? '...' : (items[0]?.cdn || '—')} 
          icon={<Award size={18} />} 
          color="warning"
        />
      </div>

      {/* SEÇÃO 2 — Dois gráficos lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-secondary p-6 rounded-2xl border border-border shadow-sm">
          <h2 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-6 opacity-60">Volume por CDN</h2>
          <div className="h-[250px] flex items-center justify-center">
            {isLoading ? <div className="animate-pulse w-full h-full bg-bg-primary rounded" /> : (
              <Bar 
                data={barData} 
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { display: false }, ticks: { display: false } },
                    y: { grid: { display: false }, ticks: { font: { weight: 'bold', size: 10 } } }
                  }
                }} 
              />
            )}
          </div>
        </div>

        <div className="bg-bg-secondary p-6 rounded-2xl border border-border shadow-sm">
          <h2 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-6 opacity-60">Categorias de Conteúdo</h2>
          <div className="h-[250px] flex items-center justify-center relative">
             {isLoading ? <div className="animate-pulse w-24 h-24 rounded-full bg-bg-primary" /> : (
               <>
                <Doughnut 
                  data={donutData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { 
                        position: 'right',
                        labels: { font: { size: 10, weight: 'bold' }, boxWidth: 10 }
                      } 
                    }
                  }} 
                />
                <div className="absolute top-1/2 left-[35%] -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <div className="text-[10px] font-bold text-text-secondary uppercase">Total</div>
                  <div className="text-sm font-black text-text-primary">{formatBytes(cdnTotalBytes)}</div>
                </div>
               </>
             )}
          </div>
        </div>
      </div>

      {/* SEÇÃO 3 — Lista expandível por CDN */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-bg-secondary h-20 rounded-2xl border border-border animate-pulse" />
          ))
        ) : items.length === 0 ? (
          <div className="bg-bg-secondary p-10 rounded-2xl border border-border text-center text-text-secondary italic">Dados não disponíveis para este período</div>
        ) : (
          items.map((item: any, idx: number) => {
            const isExpanded = expandedCdn === item.cdn;
            const cdnName = String(item.cdn || '');
            const color = CDN_COLORS[cdnName] || '#8892a4';
            const asn = CDN_ASN[cdnName] || 'ASN Desconhecido';
            const favicon = getFavicon(cdnName);
            
            return (
              <div key={idx} className="bg-bg-secondary rounded-2xl border border-border overflow-hidden shadow-sm transition-all hover:border-primary/30">
                <div 
                  className="p-5 cursor-pointer select-none group"
                  onClick={() => toggleCdn(item.cdn)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-bg-primary flex items-center justify-center border border-border/50 overflow-hidden shadow-sm transition-transform group-hover:scale-105">
                        {favicon ? (
                          <img src={favicon} alt={cdnName} className="w-7 h-7 object-contain" />
                        ) : (
                          <Globe size={24} className="text-text-secondary opacity-30" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-text-primary text-base">{cdnName}</h3>
                          <span className="text-[10px] font-bold text-text-secondary bg-bg-primary px-1.5 py-0.5 rounded border border-border">
                            {asn}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                           <div className="w-32 h-1.5 bg-bg-primary rounded-full overflow-hidden border border-border/10">
                             <div 
                               className="h-full rounded-full transition-all duration-1000"
                               style={{ 
                                 width: `${item.percent || (item.bytes / cdnTotalBytes) * 100}%`,
                                 backgroundColor: color
                               }}
                             />
                           </div>
                           <div className="text-[10px] font-black" style={{ color }}>{item.percent?.toFixed(1) || ((item.bytes / cdnTotalBytes) * 100).toFixed(1)}%</div>
                           <div className="text-[10px] text-text-secondary font-bold opacity-60 flex items-center gap-1.5">
                             <Flag code={item.top_countries || 'BR'} size={12} />
                             {item.top_countries || 'BR'}
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <div className="text-sm font-black text-text-primary">{formatBytes(item.bytes)}</div>
                        <div className="text-[10px] text-text-secondary font-bold uppercase tracking-wider opacity-60">{item.flows.toLocaleString()} flows</div>
                      </div>
                      <div className={clsx(
                        "p-2 rounded-full transition-all",
                        isExpanded ? "bg-primary text-white" : "bg-bg-primary text-text-secondary"
                      )}>
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border bg-bg-primary/40 p-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <Server size={14} className="text-primary" />
                      <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Top IPs do CDN</h4>
                    </div>
                    
                    {isLoadingDetails ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-10 bg-bg-secondary rounded border border-border animate-pulse" />)}
                      </div>
                    ) : !cdnDetails?.top_ips?.length ? (
                      <div className="text-center py-6 text-xs text-text-secondary italic bg-bg-secondary rounded-xl border border-border/50">Nenhum detalhe disponível para este CDN no momento</div>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-border/50">
                        <table className="w-full text-left border-collapse bg-bg-secondary">
                          <thead>
                            <tr className="bg-bg-primary/50 text-[9px] font-black uppercase tracking-widest text-text-secondary">
                              <th className="px-4 py-2.5 border-b border-border">Endereço IP</th>
                              <th className="px-4 py-2.5 border-b border-border">Volume</th>
                              <th className="px-4 py-2.5 border-b border-border">Fluxos</th>
                              <th className="px-4 py-2.5 border-b border-border text-right">Porta</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {cdnDetails.top_ips.map((ip: any, i: number) => (
                              <tr key={i} className="hover:bg-bg-primary/30 transition-colors">
                                <td className="px-4 py-3 font-mono font-bold text-text-primary text-xs">{ip.ip}</td>
                                <td className="px-4 py-3 text-text-secondary font-bold text-xs">{formatBytes(ip.bytes)}</td>
                                <td className="px-4 py-3 text-text-secondary font-medium text-xs opacity-70">{ip.flows.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right text-text-primary font-black text-xs">{ip.port || 443}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
