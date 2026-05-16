 import { useState } from 'react';
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import api from '../../services/api';
 import { useTranslation } from '../../hooks/useTranslation';
 import { 
   Shield, Zap, Globe, Trash2, Plus, Clock, 
   Activity, Server, Network, Filter, RefreshCw
 } from 'lucide-react';
 import { TooltipProvider } from '../../components/ui/tooltip';
 import { MitigationTooltip } from '../../components/MitigationTooltip';
 import { Skeleton } from '../../components/Skeleton';
 import { clsx } from 'clsx';
 import { toast } from 'sonner';
 import MitigationModal from '../../components/MitigationModal';
 import FlowSpecModal from '../../components/FlowSpecModal';
 
function TabButton({ active, onClick, icon, label, count }: any) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "px-6 py-4 flex items-center gap-2 border-b-2 transition-all relative font-bold text-sm",
        active 
          ? "border-primary text-primary bg-primary/5" 
          : "border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-primary"
      )}
    >
      {icon}
      <span className="tracking-tight">{label}</span>
      {count !== undefined && (
        <span className={clsx(
          "px-2 py-0.5 rounded-full text-[10px] ml-1 font-black",
          active ? "bg-primary text-white" : "bg-bg-primary text-text-secondary border border-border"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

 export default function ActiveMitigation() {
   const { t } = useTranslation();
   const isAdmin = localStorage.getItem('role') === 'admin';
   const queryClient = useQueryClient();
   const [activeTab, setActiveTab] = useState<'blackhole' | 'flowspec' | 'routes'>('blackhole');
   const [isMitigationOpen, setIsMitigationOpen] = useState(false);
   const [isFlowSpecOpen, setIsFlowSpecOpen] = useState(false);
   const [hoveredIP, setHoveredIP] = useState<string | null>(null);
 
    const { data: blackholes, isLoading: bhLoading } = useQuery({
      queryKey: ['mitigation-active'],
      queryFn: () =>
        api.get('/api/mitigation/active')
          .then(r => r.data),
      refetchOnMount: 'always',
      refetchInterval: 30000,
      staleTime: 0,
      gcTime: 0,
    });
 
   const { data: flowspec, isLoading: fsLoading } = useQuery({
     queryKey: ['bgp-flowspec'],
     queryFn: async () => {
       const r = await api.get('/api/bgp/flowspec');
       return r.data;
     },
     refetchInterval: 30000,
   });
 
    const { data: routes, isLoading: rtLoading } = useQuery({
      queryKey: ['bgp-routes'],
      queryFn: () =>
        api.get('/api/bgp/routes')
          .then(r => r.data),
      refetchOnMount: true,
      refetchInterval: 30000,
      staleTime: 0,
    });
 
    console.log('bgp routes data:', routes);
    const routesList = routes?.routes || [];

   const handleRemove = async (ip: string) => {
     const cleanIP = ip.replace('/32', '').trim();

     if (!window.confirm(`Tem certeza que deseja remover a mitigação para ${cleanIP}?`)) {
       return;
     }
 
     try {
       await api.post(
         '/api/mitigation/remove',
         { ip: cleanIP },
         {
           headers: {
             'Content-Type': 'application/json'
           }
         }
       );
       toast.success(`Mitigação removida: ${cleanIP}`);
       queryClient.invalidateQueries({ queryKey: ['mitigation-active'] });
       queryClient.invalidateQueries({ queryKey: ['bgp-routes'] });
       queryClient.invalidateQueries({ queryKey: ['bgp-flowspec'] });
       queryClient.invalidateQueries({ queryKey: ['detection-stats'] });
     } catch (error: any) {
       toast.error(
         error.response?.data?.detail || 
         'Erro ao remover mitigação'
       );
     }
   };
 
   return (
     <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
           <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mitigações Ativas</h1>
           <p className="text-sm text-text-secondary mt-1">Gerencie bloqueios e regras de proteção em tempo real</p>
         </div>
         {isAdmin && (
           <div className="flex gap-3">
             <button
               onClick={() => setIsFlowSpecOpen(true)}
               className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1e2130] border border-gray-200 dark:border-[#2a2d3e] rounded-lg text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2d3e] transition-all shadow-sm"
             >
               <Zap size={18} className="text-warning" /> Nova FlowSpec
             </button>
             <button
               onClick={() => setIsMitigationOpen(true)}
               className="flex items-center gap-2 px-4 py-2 bg-danger hover:bg-danger/90 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-danger/20"
             >
               <Plus size={18} /> Nova Mitigação
             </button>
           </div>
         )}
       </div>
 
       {/* Tabs */}
       <div className="flex border-b border-gray-200 dark:border-[#2a2d3e]">
         <TabButton 
           active={activeTab === 'blackhole'} 
           onClick={() => setActiveTab('blackhole')}
           icon={<Shield size={18} />}
           label="Blackholes Ativos"
           count={blackholes?.total || blackholes?.items?.length}
         />
         <TabButton 
           active={activeTab === 'flowspec'} 
           onClick={() => setActiveTab('flowspec')}
           icon={<Zap size={18} />}
           label="Regras FlowSpec"
           count={flowspec?.total || flowspec?.items?.length || flowspec?.length}
         />
          <TabButton 
            active={activeTab === 'routes'} 
            onClick={() => setActiveTab('routes')}
            icon={<Network size={18} />}
            label="Rotas BGP"
            count={routes?.total || (Array.isArray(routes?.routes) ? routes.routes.length : 0)}
          />
       </div>
 
       {/* Content */}
       <TooltipProvider>
       <div className="bg-white dark:bg-[#1e2130] rounded-xl border border-gray-200 dark:border-[#2a2d3e] shadow-sm overflow-hidden">
         {activeTab === 'blackhole' && (
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-gray-50 dark:bg-bg-secondary/50 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                   <th className="px-6 py-4 border-b border-border">IP em Blackhole</th>
                    <th className="px-6 py-4 border-b border-border">INÍCIO</th>
                   <th className="px-6 py-4 border-b border-border">Volume</th>
                   <th className="px-6 py-4 border-b border-border">Tipo</th>
                   {isAdmin && <th className="px-6 py-4 border-b border-border text-center">Ações</th>}
                 </tr>
               </thead>
               <tbody className="text-sm divide-y divide-border/50">
                 {bhLoading ? (
                   Array.from({ length: 3 }).map((_, i) => (
                     <tr key={i}><td colSpan={5} className="px-6 py-4"><Skeleton count={1} className="h-8 w-full bg-gray-50 dark:bg-[#2a2d3e] rounded" /></td></tr>
                   ))
                 ) : (blackholes?.items || []).length === 0 ? (
                   <tr><td colSpan={5} className="px-6 py-12 text-center text-text-secondary italic">Nenhum blackhole ativo no momento</td></tr>
                 ) : (
                   (blackholes.items || []).map((item: any, i: number) => (
                     <tr key={i} className="hover:bg-danger/5 transition-colors group">
                        <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-gray-100 relative">
                          <div 
                            onMouseEnter={() => setHoveredIP(item.ip)}
                            onMouseLeave={() => setHoveredIP(null)}
                            className="flex items-center gap-2 cursor-help"
                          >
                            <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                            {item.ip}
                            
                            {hoveredIP === item.ip && (
                              <div style={{
                                position: 'absolute',
                                zIndex: 100,
                                background: '#1e2130',
                                border: '1px solid #ef4444',
                                borderRadius: 8,
                                padding: '12px',
                                width: 220,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                                top: '100%',
                                left: 0,
                                marginTop: 4,
                              }}>
                                <div style={{fontSize:12, color:'#8892a4', marginBottom:8}}>
                                  Detalhes da Mitigação
                                </div>
                                <div style={{fontSize:13, color:'#e2e8f0', fontFamily:'monospace', marginBottom:4}}>
                                  {item.ip}
                                </div>
                                <div style={{fontSize:11, color:'#8892a4'}}>
                                  Tipo: {item.type || 'Blackhole /32'}
                                </div>
                                <div style={{fontSize:11, color:'#8892a4'}}>
                                  Community: 65000:666
                                </div>
                                <div style={{fontSize:11, color:'#8892a4'}}>
                                  Início: {item.since}
                                </div>
                                <div style={{fontSize:11, color:'#8892a4'}}>
                                  Fonte: {item.source === 'automatic' ? 'Automático (detector)' : 'Manual (operador)'}
                                </div>
                                {item.pps > 0 && (
                                  <div style={{
                                    marginTop:8,
                                    padding:'6px 8px',
                                    background:'#3b1212',
                                    borderRadius:4,
                                    fontSize:11,
                                    color:'#ef4444'
                                  }}>
                                    Pico: {item.pps > 1000 ? (item.pps/1000).toFixed(1)+'k' : item.pps} pps 
                                    · {item.mbps} Mbps
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                       <td className="px-6 py-4 text-text-secondary whitespace-nowrap"><Clock size={14} className="inline mr-1" /> {item.since || 'Recente'}</td>
                       <td className="px-6 py-4">
                         <p className="font-bold text-gray-900 dark:text-gray-100">{item.pps ? (item.pps / 1000).toFixed(1) + 'k' : '0'} PPS</p>
                         <p className="text-[10px] text-text-secondary">{item.mbps || 0} Mbps</p>
                       </td>
                       <td className="px-6 py-4">
                         <span className="px-2 py-0.5 bg-danger/10 text-danger text-[10px] font-bold rounded uppercase">Blackhole</span>
                       </td>
                       {isAdmin && (
                         <td className="px-6 py-4 text-center">
                           <button 
                             onClick={() => handleRemove(item.ip)}
                             className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                           >
                             <Trash2 size={18} />
                           </button>
                         </td>
                       )}
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
         )}
 
         {activeTab === 'flowspec' && (
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-gray-50 dark:bg-bg-secondary/50 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                   <th className="px-6 py-4 border-b border-border">Nome da Regra</th>
                   <th className="px-6 py-4 border-b border-border">Prefixo</th>
                   <th className="px-6 py-4 border-b border-border">Proto/Porta</th>
                   <th className="px-6 py-4 border-b border-border">Ação</th>
                   {isAdmin && <th className="px-6 py-4 border-b border-border text-center">Ações</th>}
                 </tr>
               </thead>
               <tbody className="text-sm divide-y divide-border/50">
                 {fsLoading ? (
                   Array.from({ length: 3 }).map((_, i) => (
                     <tr key={i}><td colSpan={5} className="px-6 py-4"><Skeleton count={1} className="h-8 w-full bg-gray-50 dark:bg-[#2a2d3e] rounded" /></td></tr>
                   ))
                 ) : (Array.isArray(flowspec) ? flowspec : (flowspec?.items || [])).length === 0 ? (
                   <tr><td colSpan={5} className="px-6 py-12 text-center text-text-secondary italic">Nenhuma regra FlowSpec configurada</td></tr>
                 ) : (
                   (Array.isArray(flowspec) ? flowspec : (flowspec?.items || [])).map((rule: any, i: number) => (
                     <tr key={i} className="hover:bg-warning/5 transition-colors group">
                       <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">{rule.name || 'Regra FlowSpec'}</td>
                       <td className="px-6 py-4">
                         <p className="text-xs text-text-secondary">Src: <span className="font-mono text-gray-900 dark:text-gray-100">{rule.src_addr || 'any'}</span></p>
                         <p className="text-xs text-text-secondary">Dst: <span className="font-mono text-gray-900 dark:text-gray-100">{rule.dst_addr || 'any'}</span></p>
                       </td>
                       <td className="px-6 py-4">
                         <span className="px-2 py-0.5 bg-gray-100 dark:bg-[#2a2d3e] text-text-secondary text-[10px] font-bold rounded uppercase">
                           {rule.proto || 'any'} / {rule.dst_port || 'any'}
                         </span>
                       </td>
                       <td className="px-6 py-4">
                         <span className={clsx(
                           "px-2 py-0.5 text-[10px] font-bold rounded uppercase",
                           rule.action === 'drop' ? "bg-danger/10 text-danger" : 
                           rule.action === 'ratelimit' ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                         )}>
                           {rule.action || 'drop'}
                         </span>
                       </td>
                       {isAdmin && (
                         <td className="px-6 py-4 text-center">
                           <button 
                             onClick={() => handleRemove(rule.dst_addr)}
                             className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                           >
                             <Trash2 size={18} />
                           </button>
                         </td>
                       )}
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
         )}
 
          {activeTab === 'routes' && (
            <div className="overflow-x-auto">
              {rtLoading ? (
                <div className="p-6"><Skeleton count={3} /></div>
              ) : routesList.length === 0 ? (
                <div className="px-6 py-12 text-center text-text-secondary italic">Nenhuma rota BGP anunciada</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-bg-secondary/50 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                      <th className="px-6 py-4 border-b border-border">Prefixo</th>
                      <th className="px-6 py-4 border-b border-border">Next-Hop</th>
                      <th className="px-6 py-4 border-b border-border">Community</th>
                      <th className="px-6 py-4 border-b border-border">Age</th>
                      <th className="px-6 py-4 border-b border-border">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-border/50">
                     {routesList.map((route: any, idx: number) => (
                       <tr key={idx} className="hover:bg-accent/5 transition-colors">
                         <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-gray-100">
                           <MitigationTooltip data={{
                             ip: route.prefix,
                             tipo: route.type || 'Mitigação Externa /24',
                             community: route.community,
                             desde: route.age,
                             pps: '—',
                             mbps: '—',
                             fonte: 'Manual (admin)'
                           }}>
                             <span className="cursor-help">{route.prefix}</span>
                           </MitigationTooltip>
                         </td>
                        <td className="px-6 py-4 text-text-secondary font-mono text-xs">{route.nexthop}</td>
                        <td className="px-6 py-4">
                          <span style={{
                            background: '#1e3a5f',
                            color: '#3b82f6',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontFamily: 'monospace'
                          }}>
                            {route.community}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-text-secondary text-xs">{route.age}</td>
                        <td className="px-6 py-4">
                          <span style={{
                            background: route.type === 'blackhole' ? '#3b1212' : '#1e2130',
                            color: route.type === 'blackhole' ? '#ef4444' : '#8892a4',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            textTransform: 'uppercase'
                          }}>
                            {route.type}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
        )}
       </div>
       </TooltipProvider>
      <MitigationModal 
        isOpen={isMitigationOpen} 
        onClose={() => setIsMitigationOpen(false)} 
        targetIP=""
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['mitigation-active'] });
          queryClient.invalidateQueries({ queryKey: ['detection-stats'] });
        }}
      />
 
       <FlowSpecModal
         isOpen={isFlowSpecOpen}
         onClose={() => setIsFlowSpecOpen(false)}
         onSuccess={() => {
           queryClient.invalidateQueries({ queryKey: ['bgp-flowspec'] });
         }}
       />
     </div>
   );
 }
 
