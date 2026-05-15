 import React, { useState } from 'react';
 import { X, Zap, Shield, Plus, Info } from 'lucide-react';
 import api from '../services/api';
 import { toast } from 'sonner';
 
 interface FlowSpecModalProps {
   isOpen: boolean;
   onClose: () => void;
   onSuccess: () => void;
 }
 
 export default function FlowSpecModal({ isOpen, onClose, onSuccess }: FlowSpecModalProps) {
   const [loading, setLoading] = useState(false);
   const [formData, setFormData] = useState({
     name: '',
     src_addr: 'any',
     dst_addr: '',
     proto: 'any',
     dst_port: 0,
     action: 'drop'
   });
 
   if (!isOpen) return null;
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!formData.dst_addr) {
       toast.error('O IP de destino é obrigatório');
       return;
     }
     setLoading(true);
     try {
       await api.post('/api/mitigation/flowspec', formData);
       toast.success('Regra FlowSpec criada com sucesso');
       onSuccess();
       onClose();
     } catch (error: any) {
       toast.error(error.response?.data?.detail || 'Erro ao criar regra');
     } finally {
       setLoading(false);
     }
   };
 
   return (
     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
       <div className="bg-white dark:bg-[#1e2130] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2a2d3e] overflow-hidden">
         <div className="p-6 border-b border-gray-100 dark:border-[#2a2d3e] flex justify-between items-center bg-gray-50/50 dark:bg-bg-secondary/30">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-accent/10 rounded-lg text-accent">
               <Zap size={20} />
             </div>
             <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Nova Regra FlowSpec</h2>
           </div>
           <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
             <X size={24} />
           </button>
         </div>
 
         <form onSubmit={handleSubmit} className="p-6 space-y-4">
           <div className="space-y-1">
             <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Nome da Regra</label>
             <input
               type="text"
               required
               placeholder="Ex: Bloqueio UDP Flood"
               className="w-full bg-gray-50 dark:bg-bg-secondary border border-gray-200 dark:border-[#2a2d3e] rounded-lg py-2.5 px-4 outline-none focus:ring-2 focus:ring-accent/50 transition-all text-text-primary"
               value={formData.name}
               onChange={(e) => setFormData({ ...formData, name: e.target.value })}
             />
           </div>
 
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
               <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">IP Origem</label>
               <input
                 type="text"
                 placeholder="IP/CIDR ou any"
                 className="w-full bg-gray-50 dark:bg-bg-secondary border border-gray-200 dark:border-[#2a2d3e] rounded-lg py-2.5 px-4 outline-none focus:ring-2 focus:ring-accent/50 transition-all text-text-primary"
                 value={formData.src_addr}
                 onChange={(e) => setFormData({ ...formData, src_addr: e.target.value })}
               />
             </div>
             <div className="space-y-1">
               <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">IP Destino</label>
               <input
                 type="text"
                 required
                 placeholder="IP/CIDR ou any"
                 className="w-full bg-gray-50 dark:bg-bg-secondary border border-gray-200 dark:border-[#2a2d3e] rounded-lg py-2.5 px-4 outline-none focus:ring-2 focus:ring-accent/50 transition-all text-text-primary"
                 value={formData.dst_addr}
                 onChange={(e) => setFormData({ ...formData, dst_addr: e.target.value })}
               />
             </div>
           </div>
 
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
               <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Protocolo</label>
               <select
                 className="w-full bg-gray-50 dark:bg-bg-secondary border border-gray-200 dark:border-[#2a2d3e] rounded-lg py-2.5 px-4 outline-none focus:ring-2 focus:ring-accent/50 transition-all text-text-primary appearance-none"
                 value={formData.proto}
                 onChange={(e) => setFormData({ ...formData, proto: e.target.value })}
               >
                 <option value="any">Qualquer</option>
                 <option value="TCP">TCP</option>
                 <option value="UDP">UDP</option>
                 <option value="ICMP">ICMP</option>
               </select>
             </div>
             <div className="space-y-1">
               <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Porta Destino</label>
               <input
                 type="number"
                 placeholder="0 = qualquer"
                 className="w-full bg-gray-50 dark:bg-bg-secondary border border-gray-200 dark:border-[#2a2d3e] rounded-lg py-2.5 px-4 outline-none focus:ring-2 focus:ring-accent/50 transition-all text-text-primary"
                 value={formData.dst_port || ''}
                 onChange={(e) => setFormData({ ...formData, dst_port: parseInt(e.target.value) || 0 })}
               />
             </div>
           </div>
 
           <div className="space-y-1">
             <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Ação</label>
             <div className="grid grid-cols-3 gap-2">
               {['drop', 'ratelimit', 'accept'].map((a) => (
                 <button
                   key={a}
                   type="button"
                   onClick={() => setFormData({ ...formData, action: a as any })}
                   className={`py-2 rounded-lg text-xs font-bold uppercase transition-all border-2 ${
                     formData.action === a 
                       ? 'bg-accent/10 border-accent text-accent' 
                       : 'bg-transparent border-gray-100 dark:border-[#2a2d3e] text-text-secondary'
                   }`}
                 >
                   {a === 'drop' ? 'Descartar' : a === 'ratelimit' ? 'Limitar' : 'Permitir'}
                 </button>
               ))}
             </div>
           </div>
 
           <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400">
             <Info size={16} className="shrink-0 mt-0.5" />
             <p className="text-[10px] font-medium leading-relaxed">
               As regras FlowSpec são injetadas via BGP em todos os roteadores vizinhos para mitigação na origem.
             </p>
           </div>
 
           <div className="flex gap-3 pt-4">
             <button
               type="button"
               onClick={onClose}
               className="flex-1 px-4 py-2.5 rounded-lg font-bold text-text-secondary hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-all"
             >
               Cancelar
             </button>
             <button
               type="submit"
               disabled={loading}
               className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg font-bold transition-all shadow-lg shadow-accent/20 flex items-center justify-center disabled:opacity-50"
             >
               {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Criar Regra'}
             </button>
           </div>
         </form>
       </div>
     </div>
   );
 }