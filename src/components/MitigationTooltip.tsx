 import React from 'react';
 import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
 import { Shield, Zap, Globe, Clock, Activity, HardDrive } from 'lucide-react';
 import { clsx } from 'clsx';
 
 interface MitigationData {
   ip: string;
   tipo: string;
   community?: string;
   desde?: string;
   fonte?: string;
   pps?: string | number;
   mbps?: string | number;
 }
 
 interface MitigationTooltipProps {
   children: React.ReactNode;
   data: MitigationData;
 }
 
 export function MitigationTooltip({ children, data }: MitigationTooltipProps) {
   const typeInfo = (type: string) => {
     const t = type.toLowerCase();
     if (t.includes('blackhole')) return { icon: '🛡', color: '#ef4444', label: 'Blackhole /32' };
     if (t.includes('externa') || t.includes('external')) return { icon: '🔀', color: '#3b82f6', label: 'Mitigação Externa /24' };
     if (t.includes('flowspec')) return { icon: '⚡', color: '#f59e0b', label: 'FlowSpec' };
     return { icon: '🛡', color: '#ef4444', label: type };
   };
 
   const info = typeInfo(data.tipo);
 
   const fmtPPS = (pps: string | number | undefined) => {
     if (!pps) return '—';
     if (typeof pps === 'string' && pps.includes('pps')) return pps;
     const val = Number(pps);
     return val > 1000 ? (val / 1000).toFixed(1) + 'k pps' : val + ' pps';
   };
 
   const fmtMBPS = (mbps: string | number | undefined) => {
     if (!mbps) return '—';
     if (typeof mbps === 'string' && (mbps.includes('Gbps') || mbps.includes('Mbps'))) return mbps;
     const val = Number(mbps);
     return val > 1000 ? (val / 1000).toFixed(1) + ' Gbps' : val + ' Mbps';
   };
 
   return (
     <Tooltip>
       <TooltipTrigger asChild>
         {children}
       </TooltipTrigger>
       <TooltipContent 
         side="top" 
         className="p-0 border-none bg-transparent shadow-none"
         style={{ width: 240 }}
       >
          <div 
            className="bg-bg-secondary rounded-2xl overflow-hidden border shadow-2xl shadow-black/50 backdrop-blur-md"
            style={{ 
              borderColor: `${info.color}40`,
              boxShadow: `0 10px 40px -10px ${info.color}30`
            }}
          >
            <div className="p-4 border-b border-border bg-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl" style={{ backgroundColor: info.color, opacity: 0.1 }} />
              <div className="flex justify-between items-center mb-1 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary opacity-60">Proteção Ativa</span>
                <span className="text-xl">{info.icon}</span>
              </div>
              <h4 className="text-lg font-black text-text-primary font-mono relative z-10 tracking-tight">{data.ip}</h4>
            </div>
            
            <div className="p-4 space-y-3.5 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-text-secondary font-black uppercase tracking-wider">Tipo</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-tighter" style={{ backgroundColor: `${info.color}20`, color: info.color }}>{info.label}</span>
              </div>
              
              {data.community && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-text-secondary font-black uppercase tracking-wider">Community</span>
                  <span className="text-[11px] font-black font-mono text-text-primary">{data.community}</span>
                </div>
              )}
  
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-text-secondary font-black uppercase tracking-wider">Desde</span>
                <span className="text-[11px] font-bold text-text-primary opacity-80">{data.desde || '—'}</span>
              </div>
  
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-text-secondary font-black uppercase tracking-wider">Fonte</span>
                <span className="text-[11px] font-black text-primary uppercase tracking-tighter bg-primary/10 px-2 py-0.5 rounded">{data.fonte || 'Manual'}</span>
              </div>
  
              <div className="pt-3 mt-1 border-t border-border grid grid-cols-2 gap-4">
                <div className="bg-bg-primary/50 p-2 rounded-xl border border-border">
                  <span className="text-[9px] text-text-secondary font-black uppercase tracking-widest block mb-1 opacity-60">PPS</span>
                  <span className="text-sm font-black text-text-primary tracking-tighter">{fmtPPS(data.pps)}</span>
                </div>
                <div className="bg-bg-primary/50 p-2 rounded-xl border border-border">
                  <span className="text-[9px] text-text-secondary font-black uppercase tracking-widest block mb-1 opacity-60">VOLUME</span>
                  <span className="text-sm font-black text-text-primary tracking-tighter">{fmtMBPS(data.mbps)}</span>
                </div>
              </div>
            </div>
          </div>
       </TooltipContent>
     </Tooltip>
   );
 }