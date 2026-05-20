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
    dst_prefix: '',
    src_prefix: '',
    protocol: 'tcp',
    dst_port: '',
    src_port: '',
    action: 'discard',
    rate_limit_kbps: '',
    reason: '',
    ttl_minutes: 60
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dst_prefix) {
      toast.error('O prefixo de destino é obrigatório');
      return;
    }
    setLoading(true);
    
    const payload = {
      ...formData,
      dst_port: formData.dst_port ? parseInt(formData.dst_port) : null,
      src_port: formData.src_port ? parseInt(formData.src_port) : null,
      rate_limit_kbps: formData.action === 'rate-limit' ? (formData.rate_limit_kbps ? parseInt(formData.rate_limit_kbps) : 0) : 0,
      ttl_minutes: parseInt(formData.ttl_minutes as any),
      src_prefix: formData.src_prefix || null,
    };

    try {
      await api.post('/api/mitigation/flowspec', payload);
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
 
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Prefixo Destino (CIDR)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 192.168.1.1 ou 192.168.1.0/24"
                  className="w-full bg-gray-50 dark:bg-bg-secondary border border-gray-200 dark:border-[#2a2d3e] rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm text-text-primary"
                  value={formData.dst_prefix}
                  onChange={(e) => setFormData({ ...formData, dst_prefix: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Prefixo Origem (CIDR)</label>
                <input
                  type="text"
                  placeholder="Opcional"
                  className="w-full bg-gray-50 dark:bg-bg-secondary border border-gray-200 dark:border-[#2a2d3e] rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm text-text-primary"
                  value={formData.src_prefix}
                  onChange={(e) => setFormData({ ...formData, src_prefix: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Protocolo</label>
                <select
                  className="w-full bg-gray-50 dark:bg-bg-secondary border border-gray-200 dark:border-[#2a2d3e] rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm text-text-primary appearance-none"
                  value={formData.protocol}
                  onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
                >
                  <option value="tcp">TCP</option>
                  <option value="udp">UDP</option>
                  <option value="icmp">ICMP</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Porta Dst</label>
                <input
                  type="number"
                  placeholder="Opcional"
                  className="w-full bg-gray-50 dark:bg-bg-secondary border border-gray-200 dark:border-[#2a2d3e] rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm text-text-primary"
                  value={formData.dst_port}
                  onChange={(e) => setFormData({ ...formData, dst_port: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Porta Src</label>
                <input
                  type="number"
                  placeholder="Opcional"
                  className="w-full bg-gray-50 dark:bg-bg-secondary border border-gray-200 dark:border-[#2a2d3e] rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm text-text-primary"
                  value={formData.src_port}
                  onChange={(e) => setFormData({ ...formData, src_port: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Ação</label>
                <select
                  className="w-full bg-gray-50 dark:bg-bg-secondary border border-gray-200 dark:border-[#2a2d3e] rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm text-text-primary appearance-none"
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                >
                  <option value="discard">Descartar (bloquear tudo)</option>
                  <option value="rate-limit">Rate-Limit (limitar banda)</option>
                </select>
              </div>

              {formData.action === 'rate-limit' && (
                <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Limite de banda</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="Ex: 1000"
                      className="flex-1 bg-gray-50 dark:bg-bg-secondary border border-gray-200 dark:border-[#2a2d3e] rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm text-text-primary"
                      value={formData.rate_limit_kbps}
                      onChange={(e) => setFormData({ ...formData, rate_limit_kbps: e.target.value })}
                    />
                    <span className="text-sm font-bold text-text-secondary">Kbps</span>
                  </div>
                  <p className="text-[10px] text-text-secondary mt-1">
                    Sugestões: 
                    <button type="button" onClick={() => setFormData({...formData, rate_limit_kbps: '512'})} className="hover:text-accent underline ml-1">512 Kbps</button> · 
                    <button type="button" onClick={() => setFormData({...formData, rate_limit_kbps: '1000'})} className="hover:text-accent underline ml-1">1 Mbps (1000)</button> · 
                    <button type="button" onClick={() => setFormData({...formData, rate_limit_kbps: '10000'})} className="hover:text-accent underline ml-1">10 Mbps (10000)</button> · 
                    <button type="button" onClick={() => setFormData({...formData, rate_limit_kbps: '100000'})} className="hover:text-accent underline ml-1">100 Mbps (100000)</button>
                  </p>
                </div>
              )}
            </div>
 
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Expiração automática</label>
                <select
                  className="w-full bg-gray-50 dark:bg-bg-secondary border border-gray-200 dark:border-[#2a2d3e] rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm text-text-primary appearance-none"
                  value={formData.ttl_minutes}
                  onChange={(e) => setFormData({ ...formData, ttl_minutes: parseInt(e.target.value) })}
                >
                  <option value="5">5 minutos</option>
                  <option value="10">10 minutos</option>
                  <option value="30">30 minutos</option>
                  <option value="60">1 hora</option>
                  <option value="120">2 horas</option>
                  <option value="360">6 horas</option>
                  <option value="720">12 horas</option>
                  <option value="1440">24 horas</option>
                  <option value="0">Permanente</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Motivo</label>
              <textarea
                required
                rows={2}
                placeholder="Motivo da regra..."
                className="w-full bg-gray-50 dark:bg-bg-secondary border border-gray-200 dark:border-[#2a2d3e] rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm text-text-primary resize-none"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400">
              <Info size={16} className="shrink-0 mt-0.5" />
              <p className="text-[10px] font-medium leading-relaxed">
                As regras FlowSpec são injetadas via BGP para mitigação na origem (upstream).
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg font-bold text-text-secondary hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-bold transition-all shadow-lg shadow-accent/20 flex items-center justify-center disabled:opacity-50"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Criar Regra'}
              </button>
            </div>
          </form>
       </div>
     </div>
   );
 }