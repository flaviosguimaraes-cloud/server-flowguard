 import React from 'react';
 import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
 import { Shield, Zap, Globe, Clock, Activity, HardDrive } from 'lucide-react';
 import { clsx } from 'clsx';
 
 interface MitigationData {
   ip: string;
   tipo?: string;
   type?: string;
   community?: string;
   desde?: string;
   since?: string;
   fonte?: string;
   source?: string;
    pps?: number | string;
    mbps?: number | string;
   direction?: 'incoming' | 'outgoing' | string;
   reason?: string;
 }
 
 interface MitigationTooltipProps {
   children: React.ReactNode;
   data: MitigationData;
 }
 
 export function MitigationTooltip({ children, data }: MitigationTooltipProps) {
  const item = {
    ip: data.ip,
    type: data.type || data.tipo || 'blackhole',
    since: data.since || data.desde || '—',
    pps: Number(data.pps || 0),
    mbps: Number(data.mbps || 0),
    source: data.source || data.fonte || 'manual',
    reason: data.reason || '',
    direction: data.direction || 'incoming',
    community: data.community || '65000:666'
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent 
        side="top" 
        className="p-4 bg-bg-secondary border border-border rounded-xl shadow-xl w-[240px] text-xs space-y-2 text-text-primary"
      >
        <div className="font-bold border-b border-border pb-1 mb-1">IP: {item.ip}</div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Tipo:</span>
          <span>Blackhole /32</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Community:</span>
          <span className="font-mono">{item.community}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Início:</span>
          <span>{item.since}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Fonte:</span>
          <span>
            {item.source === 'automatic'
              ? 'Automático (detector)'
              : `Manual (${item.reason || 'operador'})`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Direção:</span>
          <span>
            {item.direction === 'incoming'
              ? '↓ Entrada'
              : '↑ Saída'}
          </span>
        </div>

        {/* Mostrar pico só se tiver valor */}
        {item.pps > 0 && (
          <div style={{
            marginTop: 8,
            padding: '6px 8px',
            background: '#3b1212',
            borderRadius: 4,
            color: '#ef4444',
            fontSize: 11
          }}>
            Pico no ban:
            {item.pps > 1000
              ? ` ${(item.pps/1000).toFixed(1)}k pps`
              : ` ${item.pps} pps`}
            {item.mbps > 0
              ? ` · ${item.mbps} Mbps`
              : ''}
          </div>
        )}

        {/* Se pps = 0 e source = manual */}
        {item.pps === 0 &&
         item.source === 'manual' && (
          <div style={{
            marginTop: 8,
            fontSize: 11,
            color: '#8892a4',
            fontStyle: 'italic'
          }}>
            Bloqueio aplicado manualmente
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
 }