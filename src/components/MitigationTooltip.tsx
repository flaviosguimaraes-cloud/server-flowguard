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
           className="bg-[#1e2130] rounded-lg overflow-hidden border"
           style={{ 
             borderColor: info.color,
             boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
           }}
         >
           <div className="p-3 border-b border-white/5 bg-white/5">
             <div className="flex justify-between items-center mb-1">
               <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Detalhes da Proteção</span>
               <span className="text-sm">{info.icon}</span>
             </div>
             <h4 className="text-base font-bold text-white font-mono">{data.ip}</h4>
           </div>
           
           <div className="p-3 space-y-2.5">
             <div className="flex justify-between items-center">
               <span className="text-[10px] text-white/40 font-bold uppercase">Tipo</span>
               <span className="text-[11px] font-bold" style={{ color: info.color }}>{info.label}</span>
             </div>
             
             {data.community && (
               <div className="flex justify-between items-center">
                 <span className="text-[10px] text-white/40 font-bold uppercase">Community</span>
                 <span className="text-[11px] font-mono text-white/80">{data.community}</span>
               </div>
             )}
 
             <div className="flex justify-between items-center">
               <span className="text-[10px] text-white/40 font-bold uppercase">Desde</span>
               <span className="text-[11px] text-white/80">{data.desde || '—'}</span>
             </div>
 
             <div className="flex justify-between items-center">
               <span className="text-[10px] text-white/40 font-bold uppercase">Fonte</span>
               <span className="text-[11px] font-bold text-accent">{data.fonte || 'Manual (admin)'}</span>
             </div>
 
             <div className="pt-1 mt-1 border-t border-white/5 grid grid-cols-2 gap-2">
               <div>
                 <span className="text-[9px] text-white/40 font-bold uppercase block">PPS Atual</span>
                 <span className="text-xs font-bold text-white">{fmtPPS(data.pps)}</span>
               </div>
               <div className="text-right">
                 <span className="text-[9px] text-white/40 font-bold uppercase block">Tráfego</span>
                 <span className="text-xs font-bold text-white">{fmtMBPS(data.mbps)}</span>
               </div>
             </div>
           </div>
         </div>
       </TooltipContent>
     </Tooltip>
   );
 }