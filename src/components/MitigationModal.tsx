 import React, { useState } from 'react';
 import { Shield, X, AlertTriangle, Zap, Globe } from 'lucide-react';
 import api from '../services/api';
 import { toast } from 'sonner';
 
 interface MitigationModalProps {
   isOpen: boolean;
   onClose: () => void;
   targetIP: string;
   protocol?: string;
   port?: number;
 }
 
 export default function MitigationModal({ isOpen, onClose, targetIP, protocol, port }: MitigationModalProps) {
   const [type, setType] = useState<'blackhole' | 'flowspec'>('blackhole');
   const [loading, setLoading] = useState(false);
 
   if (!isOpen) return null;
 
   const handleMitigate = async () => {
     setLoading(true);
     try {
       if (type === 'blackhole') {
         await api.post('/api/mitigation/blackhole', { ip: targetIP });
         toast.success(`Blackhole aplicado para ${targetIP}`);
       } else {
         await api.post('/api/mitigation/flowspec', {
           name: `Mitigação ${targetIP}`,
           dst_addr: targetIP,
           proto: protocol || 'any',
           dst_port: port || 0,
           action: 'drop'
         });
         toast.success(`Regra FlowSpec aplicada para ${targetIP}`);
       }
       onClose();
     } catch (error: any) {
       toast.error(error.response?.data?.detail || 'Erro ao aplicar mitigação');
     } finally {
       setLoading(false);
     }
   };
 
   return (
     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
       <div className="bg-white dark:bg-[#1e2130] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2a2d3e] overflow-hidden">
         <div className="p-6 border-b border-gray-100 dark:border-[#2a2d3e] flex justify-between items-center bg-gray-50/50 dark:bg-bg-secondary/30">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-danger/10 rounded-lg text-danger">
               <Shield size={20} />
             </div>
             <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Mitigar Ataque</h2>
           </div>
           <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
             <X size={24} />
           </button>
         </div>
 
         <div className="p-6 space-y-6">
           <div className="bg-gray-50 dark:bg-bg-secondary/50 p-4 rounded-xl border border-gray-100 dark:border-[#2a2d3e]">
             <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Alvo da Mitigação</p>
             <p className="text-lg font-mono font-bold text-gray-900 dark:text-gray-100">{targetIP}</p>
             {protocol && port && (
               <p className="text-xs text-text-secondary mt-1">
                 Via <span className="font-bold text-accent">{protocol}</span> na porta <span className="font-bold text-accent">{port}</span>
               </p>
             )}
           </div>
 
           <div className="grid grid-cols-1 gap-3">
             <button
               onClick={() => setType('blackhole')}
               className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                 type === 'blackhole' 
                   ? 'border-danger bg-danger/5 ring-4 ring-danger/10' 
                   : 'border-gray-100 dark:border-[#2a2d3e] hover:border-gray-200 dark:hover:border-[#3a3d4e]'
               }`}
             >
               <div className={`p-2 rounded-lg ${type === 'blackhole' ? 'bg-danger text-white' : 'bg-gray-100 dark:bg-[#2a2d3e] text-text-secondary'}`}>
                 <AlertTriangle size={20} />
               </div>
               <div>
                 <p className="font-bold text-gray-900 dark:text-gray-100">BGP Blackhole /32</p>
                 <p className="text-xs text-text-secondary mt-1">Descarta todo o tráfego destinado a este IP no roteador de borda.</p>
               </div>
             </button>
 
             <button
               onClick={() => setType('flowspec')}
               className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                 type === 'flowspec' 
                   ? 'border-warning bg-warning/5 ring-4 ring-warning/10' 
                   : 'border-gray-100 dark:border-[#2a2d3e] hover:border-gray-200 dark:hover:border-[#3a3d4e]'
               }`}
             >
               <div className={`p-2 rounded-lg ${type === 'flowspec' ? 'bg-warning text-white' : 'bg-gray-100 dark:bg-[#2a2d3e] text-text-secondary'}`}>
                 <Zap size={20} />
               </div>
               <div>
                 <p className="font-bold text-gray-900 dark:text-gray-100">BGP FlowSpec</p>
                 <p className="text-xs text-text-secondary mt-1">Bloqueia apenas o tráfego específico (IP, Proto, Porta) preservando o resto.</p>
               </div>
             </button>
 
             <button
               disabled
               className="flex items-start gap-4 p-4 rounded-xl border-2 border-gray-100 dark:border-[#2a2d3e] opacity-50 cursor-not-allowed text-left"
             >
               <div className="p-2 rounded-lg bg-gray-100 dark:bg-[#2a2d3e] text-text-secondary">
                 <Globe size={20} />
               </div>
               <div>
                 <p className="font-bold text-gray-900 dark:text-gray-100">Mitigação Externa</p>
                 <p className="text-xs text-text-secondary mt-1">Redireciona para centro de depuração (Scrubbing Center).</p>
               </div>
             </button>
           </div>
         </div>
 
         <div className="p-6 bg-gray-50/50 dark:bg-bg-secondary/30 border-t border-gray-100 dark:border-[#2a2d3e] flex gap-3">
           <button
             onClick={onClose}
             className="flex-1 px-4 py-2.5 rounded-lg font-bold text-text-secondary hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-all"
           >
             Cancelar
           </button>
           <button
             onClick={handleMitigate}
             disabled={loading}
             className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-white transition-all flex items-center justify-center ${
               type === 'blackhole' ? 'bg-danger hover:bg-danger/90' : 'bg-warning hover:bg-warning/90'
             } disabled:opacity-50`}
           >
             {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirmar'}
           </button>
         </div>
       </div>
     </div>
   );
 }