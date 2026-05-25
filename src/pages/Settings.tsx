import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';
import { Save, Settings as SettingsIcon, Shield, Bell, Lock } from 'lucide-react';
import { clsx } from 'clsx';

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
        org_name: settings.org_name?.value ?? settings.org_name ?? '',
        org_logo_url: settings.org_logo_url?.value ?? settings.org_logo_url ?? '',
        data_retention_days: settings.data_retention_days?.value === '90' ? '30' : (String(settings.data_retention_days?.value ?? settings.data_retention_days ?? '30'))
      });
    }
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: (body: any) => api.put('/api/settings', body),
    onSuccess: () => {
      toast.success('Configurações salvas com sucesso');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Erro ao salvar'),
  });

  return (
    <div className="fg-page">
      <div className="fg-page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <SettingsIcon size={24} />
          </div>
          <h1 className="fg-section-title">Configurações</h1>
        </div>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Organização */}
        <div className="fg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Shield size={18} />
            </div>
            <h2 className="text-sm font-black text-text-main uppercase tracking-widest">Organização</h2>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Nome</label>
              <input
                type="text"
                value={s.org_name}
                onChange={(e) => setS({ ...s, org_name: e.target.value })}
                readOnly={!isAdmin}
                className="fg-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Logo URL</label>
              <input
                type="text"
                value={s.org_logo_url}
                onChange={(e) => setS({ ...s, org_logo_url: e.target.value })}
                readOnly={!isAdmin}
                className="fg-input"
              />
            </div>
          </div>
        </div>

        {/* Segurança */}
        <div className="fg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple/10 rounded-lg text-purple">
              <Lock size={18} />
            </div>
            <h2 className="text-sm font-black text-text-main uppercase tracking-widest">Segurança & Retenção</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Retenção de Dados (dias)</label>
              <input
                type="number"
                value={s.data_retention_days}
                onChange={(e) => setS({ ...s, data_retention_days: e.target.value })}
                readOnly={!isAdmin}
                className="fg-input w-32"
              />
              <p className="text-[10px] text-text-muted font-bold opacity-60 ml-1">Registros antigos são limpos automaticamente.</p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => saveSettings.mutate(s)} 
              disabled={saveSettings.isPending}
              className="fg-button-primary px-8"
            >
              <Save size={18} /> {saveSettings.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
