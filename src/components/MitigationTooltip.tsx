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
      const t = (type || '').toLowerCase();
      if (t.includes('blackhole')) return { icon: '🛡', color: 'var(--danger)', label: 'Blackhole /32' };
      if (t.includes('externa') || t.includes('external')) return { icon: '🔀', color: 'var(--accent)', label: 'Mitigação Externa /24' };
      if (t.includes('flowspec')) return { icon: '⚡', color: 'var(--warning)', label: 'FlowSpec' };
      return { icon: '🛡', color: 'var(--danger)', label: type };
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
            className="bg-bg-secondary rounded-xl overflow-hidden border border-border shadow-xl backdrop-blur-md"
          >
            <div className="p-4 border-b border-border bg-bg-primary/20 relative overflow-hidden">
              <div className="flex justify-between items-center mb-1 relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">Proteção Ativa</span>
                <span className="text-lg">{info.icon}</span>
              </div>
              <h4 className="text-base font-bold text-text-primary font-mono relative z-10 tracking-tight">{data.ip}</h4>
            </div>
            
            <div className="p-4 space-y-3 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Tipo</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${info.color}, transparent 90%)`, color: info.color }}>{info.label}</span>
              </div>
              
              {data.community && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Community</span>
                  <span className="text-[10px] font-bold font-mono text-text-primary opacity-80">{data.community}</span>
                </div>
              )}
  
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Desde</span>
                <span className="text-[10px] font-bold text-text-primary opacity-70">{data.desde || '—'}</span>
              </div>
  
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Fonte</span>
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">{data.fonte || 'Manual'}</span>
              </div>
  
              <div className="pt-3 mt-1 border-t border-border grid grid-cols-2 gap-3">
                <div className="bg-bg-primary/30 p-2 rounded-lg border border-border/50">
                  <span className="text-[9px] text-text-secondary font-bold uppercase tracking-widest block mb-1 opacity-60">PPS</span>
                  <span className="text-xs font-bold text-text-primary tracking-tight">{fmtPPS(data.pps)}</span>
                </div>
                <div className="bg-bg-primary/30 p-2 rounded-lg border border-border/50">
                  <span className="text-[9px] text-text-secondary font-bold uppercase tracking-widest block mb-1 opacity-60">VOLUME</span>
                  <span className="text-xs font-bold text-text-primary tracking-tight">{fmtMBPS(data.mbps)}</span>
                </div>
              </div>
            </div>
          </div>
       </TooltipContent>
     </Tooltip>
   );
 }