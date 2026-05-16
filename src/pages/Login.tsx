import { useState, FormEvent, useEffect } from 'react';
 import { useTranslation } from '../hooks/useTranslation';
 import api from '../services/api';
 import { toast } from 'sonner';
  import { Lock, User, Shield, Globe } from 'lucide-react';
 
 export default function Login() {
   const [username, setUsername] = useState('');
   const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
   const { t, lang, changeLanguage } = useTranslation();
 
  // Limpar erro ao digitar
  useEffect(() => {
    if (error) setError('');
  }, [username, password]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await api.post(
        '/api/auth/login',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = response.data;
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);

      if (data.must_change_password) {
        window.location.href = '/change-password';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      setError(
        error.response?.data?.detail || 
        'Usuário ou senha incorretos'
      );
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 transition-colors">
      <div className="max-w-md w-full bg-bg-secondary p-10 rounded-3xl shadow-2xl shadow-black/50 border border-border transition-all duration-500 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Globe className="text-text-secondary" size={18} />
            <select 
              value={lang} 
              onChange={(e) => changeLanguage(e.target.value as any)}
              className="bg-transparent border-none outline-none text-sm cursor-pointer text-text-secondary font-medium"
            >
              <option value="pt-BR">PT</option>
              <option value="en">EN</option>
              <option value="es">ES</option>
            </select>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-[24px] mb-6 shadow-inner border border-primary/20">
            <Shield className="text-primary" size={48} />
          </div>
          <h1 className="text-4xl font-black text-text-primary tracking-tighter uppercase mb-2">FlowGuard</h1>
          <p className="text-text-secondary font-bold text-xs uppercase tracking-widest opacity-60">Network Intelligence & DDoS Mitigation</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center font-medium animate-in fade-in duration-300">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">
              {t('username')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
              <input
                type="text"
                placeholder={t('username')}
                className="w-full bg-bg-secondary border border-border rounded-lg py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-text-primary placeholder:text-text-secondary/50"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">
              {t('password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
              <input
                type="password"
                placeholder={t('password')}
                className="w-full bg-bg-secondary border border-border rounded-lg py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-text-primary placeholder:text-text-secondary/50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-black py-3.5 rounded-xl transition-all shadow-xl shadow-primary/30 active:scale-[0.98] mt-4 flex items-center justify-center disabled:opacity-70 uppercase tracking-widest text-xs"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              t('login')
            )}
          </button>
        </form>
      </div>
    </div>
  );
 }