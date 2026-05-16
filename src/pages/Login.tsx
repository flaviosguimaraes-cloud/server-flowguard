import { useState, FormEvent, useEffect } from 'react';
 import { useTranslation } from '../hooks/useTranslation';
 import api from '../services/api';
 import { toast } from 'sonner';
   import { Lock, User, Shield, Globe, Sun, Moon } from 'lucide-react';
   import { useTheme } from '../contexts/ThemeContext';
 
 export default function Login() {
   const [username, setUsername] = useState('');
   const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
   const { t, lang, changeLanguage } = useTranslation();
  const { theme, toggleTheme } = useTheme();
 
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
      <div className="max-w-md w-full bg-bg-secondary p-10 rounded-2xl shadow-xl border border-border transition-all duration-300 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
        <div className="flex justify-between items-center mb-10">
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

          <button 
            type="button"
            onClick={toggleTheme}
            className="p-2 hover:bg-bg-primary rounded-lg text-text-secondary hover:text-primary transition-all duration-200 border border-transparent hover:border-border active:scale-95"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-primary/10 rounded-xl mb-6 border border-primary/10">
            <Shield className="text-primary" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-1">FlowGuard</h1>
          <p className="text-text-secondary font-bold text-[10px] uppercase tracking-widest opacity-60">Network Intelligence & DDoS Mitigation</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-danger/5 border border-danger/10 text-danger p-3 rounded-lg text-xs text-center font-bold uppercase tracking-wider animate-in fade-in duration-300">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">
              {t('username')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input
                type="text"
                placeholder={t('username')}
                className="w-full bg-bg-primary/50 border border-border rounded-lg py-2 pl-9 pr-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-text-primary"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">
              {t('password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input
                type="password"
                placeholder={t('password')}
                className="w-full bg-bg-primary/50 border border-border rounded-lg py-2 pl-9 pr-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-text-primary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2.5 rounded-lg transition-all shadow-md shadow-primary/10 active:scale-[0.98] mt-4 flex items-center justify-center disabled:opacity-70 uppercase tracking-wider text-xs"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              t('login')
            )}
          </button>
        </form>
      </div>
    </div>
  );
 }