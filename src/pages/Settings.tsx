import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';
import { Save, Settings as SettingsIcon, Sliders } from 'lucide-react';

export default function Settings() {
  const isAdmin = localStorage.getItem('role') === 'admin';
  const qc = useQueryClient();
  const isAuthenticated = !!localStorage.getItem('access_token');

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    enabled: isAuthenticated,
    queryFn: () => api.get('/api/settings').then(r => r.data).catch(() => ({})),
  });
  const [s, setS] = useState<any>({});

  useEffect(() => { if (settings) setS(settings); }, [settings]);

  const saveSettings = useMutation({
    mutationFn: (body: any) => api.put('/api/settings', body),
    onSuccess: () => { toast.success('Configurações salvas'); qc.invalidateQueries({ queryKey: ['settings'] }); },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Erro ao salvar'),
  });

  const Field = ({ label, value, onChange, type = 'text', readOnly = false }: any) => (
    <div>
      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        readOnly={readOnly || !isAdmin}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        className="w-full mt-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30 read-only:opacity-70"
      />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <SettingsIcon className="text-primary" size={24} />
        <h1 className="text-2xl font-bold text-text-primary">Configurações</h1>
      </div>

      <section className="bg-bg-secondary p-6 rounded-xl border border-border shadow-sm space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary">Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nome do sistema" value={s.name} onChange={(v: any) => setS({ ...s, name: v })} />
          <Field label="Timezone" value={s.timezone} onChange={(v: any) => setS({ ...s, timezone: v })} />
          <Field label="Sampling rate" value={s.sampling_rate} readOnly />
          <Field label="Notificações ativas" value={s.notifications_enabled ? 'Sim' : 'Não'} readOnly />
        </div>
        {isAdmin && (
          <div className="flex justify-end">
            <button onClick={() => saveSettings.mutate(s)} disabled={saveSettings.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
              <Save size={16} /> Salvar
            </button>
          </div>
        )}
      </section>

    </div>
  );
}