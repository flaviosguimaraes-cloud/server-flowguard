import React, { useState, useEffect } from 'react';
import { Shield, X, AlertTriangle, Zap, Globe, ArrowRight, CheckCircle } from 'lucide-react';
 import api from '../services/api';
 import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
 
 interface MitigationModalProps {
   isOpen: boolean;
   onClose: () => void;
   targetIP: string;
  onSuccess?: () => void;
   protocol?: string;
   port?: number;
 }
 
export default function MitigationModal({ isOpen, onClose, targetIP, onSuccess, protocol, port }: MitigationModalProps) {
   const [type, setType] = useState<'blackhole' | 'flowspec'>('blackhole');
   const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState('Ataque detectado pelo FlowGuard');
  const [ipInput, setIpInput] = useState(targetIP);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setIpInput(targetIP);
    }
  }, [isOpen, targetIP]);
 
   if (!isOpen) return null;
 
   const handleMitigate = async () => {
    if (type === 'blackhole' && step === 1) {
      setStep(2);
      return;
    }

     setLoading(true);
     try {
       if (type === 'blackhole') {
        await api.post('/api/mitigation/blackhole', { 
          ip: ipInput,
          reason: reason
        });
        toast.success(`Blackhole aplicado para ${ipInput}`);
       } else {
         await api.post('/api/mitigation/flowspec', {
          name: `Mitigação ${ipInput}`,
          dst_addr: ipInput,
           proto: protocol || 'any',
           dst_port: port || 0,
           action: 'drop'
         });
        toast.success(`Regra FlowSpec aplicada para ${ipInput}`);
       }
      
      queryClient.invalidateQueries({ queryKey: ['mitigation-active'] });
      queryClient.invalidateQueries({ queryKey: ['mitigation-active-events'] });
      queryClient.invalidateQueries({ queryKey: ['detection-stats'] });
      queryClient.invalidateQueries({ queryKey: ['detection-stats-events'] });
      
      if (onSuccess) onSuccess();
       onClose();
     } catch (error: any) {
       toast.error(error.response?.data?.detail || 'Erro ao aplicar mitigação');
     } finally {
       setLoading(false);
     }
   };
 
   return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
       <div className="bg-white dark:bg-[#1e2130] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2a2d3e] overflow-hidden">
         <div className="p-6 border-b border-gray-100 dark:border-[#2a2d3e] flex justify-between items-center bg-gray-50/50 dark:bg-bg-secondary/30">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-danger/10 rounded-lg text-danger">
               <Shield size={20} />
             </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {step === 1 ? 'Mitigar Ataque' : 'Confirmar Mitigação'}
            </h2>
           </div>
           <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
             <X size={24} />
           </button>
         </div>
 
         <div className="p-6 space-y-6">
          {step === 1 ? (
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">
                    IP de Destino
                  </label>
                  <input
                    type="text"
                    value={ipInput}
                    onChange={(e) => setIpInput(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-bg-secondary/50 border border-gray-100 dark:border-[#2a2d3e] rounded-xl px-4 py-3 font-mono font-bold text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-accent outline-none transition-all"
                    placeholder="Ex: 192.168.1.1"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">
                    Motivo / Observação
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-bg-secondary/50 border border-gray-100 dark:border-[#2a2d3e] rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-accent outline-none transition-all h-20 resize-none"
                  />
                </div>
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
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="p-6 bg-danger/5 border border-danger/20 rounded-2xl text-center space-y-4">
                <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mx-auto text-danger animate-pulse">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Aviso de Impacto</h3>
                  <p className="text-sm text-text-secondary mt-2">
                    Ao aplicar o <strong>Blackhole</strong>, o IP <span className="font-mono font-bold text-danger">{ipInput}</span> ficará 
                    completamente inacessível na internet.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-[#2a2d3e]">
                  <span className="text-text-secondary">Ação:</span>
                  <span className="font-bold text-danger">BGP BLACKHOLE</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-[#2a2d3e]">
                  <span className="text-text-secondary">IP Alvo:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-gray-100">{ipInput}</span>
                </div>
                <div className="flex justify-between text-sm py-2">
                  <span className="text-text-secondary">Motivo:</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100 italic">"{reason}"</span>
                </div>
              </div>
            </div>
          )}
         </div>
 
          <div className="p-6 bg-gray-50/50 dark:bg-bg-secondary/30 border-t border-border/50 flex gap-3">
           <button
            onClick={step === 1 ? onClose : () => setStep(1)}
              className="flex-1 px-4 py-2.5 rounded-lg font-bold text-text-secondary hover:bg-gray-100 dark:hover:bg-[#2a2d3e] hover:text-text-primary transition-all border border-border/50"
           >
            {step === 1 ? 'Cancelar' : 'Voltar'}
           </button>
           <button
             onClick={handleMitigate}
             disabled={loading}
              className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-white transition-all flex items-center justify-center shadow-lg shadow-primary/10 ${
                step === 1 
                  ? 'bg-primary hover:bg-primary/90' 
                  : type === 'blackhole' 
                    ? 'bg-danger hover:bg-danger/90' 
                    : 'bg-warning hover:bg-warning/90'
              } disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none`}
           >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                {step === 1 ? 'Avançar' : 'Confirmar e Aplicar'} 
                {step === 1 && <ArrowRight size={18} />}
              </span>
            )}
           </button>
         </div>
       </div>
     </div>
   );
 }