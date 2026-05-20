import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';
import { Save, Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  const isAdmin = localStorage.getItem('role') === 'admin';
  const qc = useQueryClient();
  const isAuthenticated = !!localStorage.getItem('access_token');

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    enabled: isAuthenticated,
    queryFn: () => api.get('/api/settings').then(r => r.data).catch(() => ({})),
  });

  const [s, setS] = useState({
    org_name: '',
    org_logo_url: '',
    data_retention_days: '30'
  });

  useEffect(() => {
    if (settings) {
      setS({
        org_name: settings.org_name || '',
        org_logo_url: settings.org_logo_url || '',
        data_retention_days: String(settings.data_retention_days || '30')
      });
    }
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: (body: any) => api.put('/api/settings', body),
    onSuccess: () => {
      toast.success('✅ Configurações salvas');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || '❌ Erro ao salvar'),
  });

  const handleSave = () => {
    saveSettings.mutate(s);
  };

  return (
    <div className="max-w-2xl space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <SettingsIcon size={24} />
        </div>
        <h1 className="text-2xl font-bold text-text-primary text-slate-900 dark:text-white">Configurações</h1>
      </div>

      <section className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
          ORGANIZAÇÃO
        </h2>
        
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
              Nome da organização
            </label>
            <input
              type="text"
              placeholder="Ex: UAY Internet"
              value={s.org_name}
              onChange={(e) => setS({ ...s, org_name: e.target.value })}
              readOnly={!isAdmin}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
              URL do logotipo (opcional)
            </label>
            <input
              type="text"
              placeholder="https://sua-empresa.com/logo.png"
              value={s.org_logo_url}
              onChange={(e) => setS({ ...s, org_logo_url: e.target.value })}
              readOnly={!isAdmin}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
              Retenção de dados
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="365"
                value={s.data_retention_days}
                onChange={(e) => setS({ ...s, data_retention_days: e.target.value })}
                readOnly={!isAdmin}
                className="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <span className="text-sm text-slate-500 font-medium">dias</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 ml-1 leading-relaxed">
              Flows mais antigos que {s.data_retention_days || 'X'} dias são removidos automaticamente.
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button 
              onClick={handleSave} 
              disabled={saveSettings.isPending}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-bold shadow-md shadow-primary/20 transition-all disabled:opacity-50 active:scale-95"
            >
              <Save size={18} /> Salvar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
