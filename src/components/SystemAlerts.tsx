 import { useState, useEffect } from 'react';
 import { useQuery } from '@tanstack/react-query';
 import api from '../services/api';
 import { AlertTriangle, X, Monitor, Cpu, HardDrive, LayoutGrid } from 'lucide-react';
 import { Link } from '@tanstack/react-router';
 import { toast } from 'sonner';
 import { clsx } from 'clsx';
 
 const SERVICE_LABELS: Record<string, { label: string; icon: string; critical: boolean }> = {
   flow_collector: {
     label: 'Coletor de Flows',
     icon: '📡',
     critical: true
   },
   detection_engine: {
     label: 'Motor de Detecção',
     icon: '🛡',
     critical: true
   },
   api: {
     label: 'API do Sistema',
     icon: '⚙️',
     critical: true
   },
   flow_database: {
     label: 'Banco de Flows',
     icon: '🗄',
     critical: true
   },
   config_database: {
     label: 'Banco de Configurações',
     icon: '💾',
     critical: true
   },
   cache: {
     label: 'Cache',
     icon: '⚡',
     critical: false
   },
   bgp_engine: {
     label: 'BGP Speaker',
     icon: '🔗',
     critical: true
   },
   web: {
     label: 'Proxy Web',
     icon: '🌐',
     critical: false
   },
 };
 
 export const SystemAlerts = () => {
   const [isVisible, setIsVisible] = useState(true);
   const [lastResourceAlerts, setLastResourceAlerts] = useState<{ [key: string]: number }>({});
 
   const { data: sysStatus } = useQuery({
     queryKey: ['system-status'],
     queryFn: () => api.get('/api/system/status').then(r => r.data),
     refetchInterval: 30000,
     staleTime: 0,
     // Don't run if not logged in
     enabled: !!localStorage.getItem('access_token'),
   });
 
   const downServices = Object.entries(sysStatus?.services || {})
     .filter(([_, status]) => status !== 'active')
     .map(([key, status]) => ({
       key,
       status,
       ...SERVICE_LABELS[key]
     }));
 
   const criticalDown = downServices.filter(s => s?.critical);
 
   // Reset visibility when a new service goes down or status changes
   useEffect(() => {
     if (downServices.length > 0) {
       setIsVisible(true);
     }
   }, [downServices.length]);
 
   // Resource Alerts
   useEffect(() => {
     if (!sysStatus) return;
 
     const now = Date.now();
     const cooldown = 60000; // 1 minute cooldown for toasts
 
     if (sysStatus.cpu_percent > 90 && (!lastResourceAlerts.cpu || now - lastResourceAlerts.cpu > cooldown)) {
       toast.warning(`⚡ CPU em ${sysStatus.cpu_percent}% — sistema sob alta carga`, {
         icon: <Cpu size={18} />,
         duration: 10000,
       });
       setLastResourceAlerts(prev => ({ ...prev, cpu: now }));
     }
 
     if (sysStatus.disk_percent > 80 && (!lastResourceAlerts.disk || now - lastResourceAlerts.disk > cooldown)) {
       toast.warning(`💾 Disco em ${sysStatus.disk_percent}% — considere limpeza`, {
         icon: <HardDrive size={18} />,
         duration: 10000,
       });
       setLastResourceAlerts(prev => ({ ...prev, disk: now }));
     }
 
     if (sysStatus.ram_percent > 90 && (!lastResourceAlerts.ram || now - lastResourceAlerts.ram > cooldown)) {
       toast.warning(`🔧 Memória em ${sysStatus.ram_percent}% — sistema sobrecarregado`, {
         icon: <LayoutGrid size={18} />,
         duration: 10000,
       });
       setLastResourceAlerts(prev => ({ ...prev, ram: now }));
     }
   }, [sysStatus]);
 
   if (!isVisible || downServices.length === 0) return null;
 
   return (
     <div className={clsx(
       "fixed top-[88px] right-6 z-[60] w-80 rounded-xl border p-4 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300",
       criticalDown.length > 0 
         ? "bg-red-950/90 border-red-500/50 text-red-100" 
         : "bg-amber-950/90 border-amber-500/50 text-amber-100"
     )}>
       <div className="flex items-start justify-between mb-3">
         <div className="flex items-center gap-2">
           <AlertTriangle className={clsx(
             "animate-pulse",
             criticalDown.length > 0 ? "text-red-400" : "text-amber-400"
           )} size={20} />
           <span className="font-bold text-sm">Serviços com problema</span>
         </div>
         <button 
           onClick={() => setIsVisible(false)}
           className="p-1 hover:bg-white/10 rounded-lg transition-colors"
         >
           <X size={16} />
         </button>
       </div>
 
       <div className="space-y-2 mb-4">
         {downServices.map((service) => (
           <div key={service.key} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-xs">
             <div className="flex items-center gap-2">
               <span>{service.icon}</span>
               <span className="font-medium">{service.label || service.key}</span>
             </div>
             <div className="flex items-center gap-2">
               <span className="uppercase font-bold opacity-70">Offline</span>
               <span className="flex h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
             </div>
           </div>
         ))}
       </div>
 
       <div className="flex flex-col gap-2">
         <p className="text-[10px] opacity-70 italic px-1">
           Verifique a página Sistema para mais detalhes.
         </p>
         <Link 
           to="/system"
           className={clsx(
             "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
             criticalDown.length > 0 
               ? "bg-red-500 hover:bg-red-400 text-white" 
               : "bg-amber-500 hover:bg-amber-400 text-white"
           )}
         >
           <Monitor size={14} />
           Ver detalhes
         </Link>
       </div>
     </div>
   );
 };