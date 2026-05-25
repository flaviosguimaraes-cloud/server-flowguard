import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from '../hooks/useTranslation';
import api from '../services/api';
import { Lock, User, Shield, Globe, Sun, Moon, ArrowRight, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { clsx } from 'clsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t, lang, changeLanguage } = useTranslation();
  const { theme, toggleTheme } = useTheme();

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

      const response = await api.post('/api/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token, username: resUsername, role, must_change_password } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('username', resUsername);
      localStorage.setItem('role', role);
      
      login(response.data);

      if (must_change_password) {
        navigate({ to: '/change-password', replace: true });
      } else {
        navigate({ to: '/dashboard', replace: true });
      }
    } catch (error: any) {
      setError('Credenciais inválidas. Verifique seu usuário e senha.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-bg-page transition-colors duration-500">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] z-0">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none transition-all duration-1000" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none transition-all duration-1000" />

      <div className="w-full max-w-[440px] px-6 relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="fg-card p-8 md:p-10 !rounded-[2rem] shadow-2xl shadow-primary/10 backdrop-blur-xl border-white/10 dark:border-white/5">
          {/* Top Controls */}
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-2 bg-bg-page/50 border border-border-main rounded-xl px-3 py-1.5 shadow-inner">
              <Globe className="text-text-muted" size={14} />
              <select 
                value={lang} 
                onChange={(e) => changeLanguage(e.target.value as any)}
                className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-text-muted cursor-pointer appearance-none"
              >
                <option value="pt-BR">PT</option>
                <option value="en">EN</option>
                <option value="es">ES</option>
              </select>
            </div>

            <button 
              onClick={toggleTheme}
              className="p-2.5 text-text-muted hover:text-primary hover:bg-bg-page rounded-2xl transition-all shadow-sm"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          {/* Logo Section */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-[1.75rem] mb-6 border border-primary/20 shadow-inner group relative">
               <Shield className="text-primary relative z-10 transition-transform group-hover:scale-110" size={40} />
               <div className="absolute inset-0 bg-primary/20 rounded-[1.75rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h1 className="text-4xl font-black text-text-main tracking-tighter mb-2">FlowGuard</h1>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] opacity-60">Network Intelligence Platform</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span className="text-xs font-bold leading-tight uppercase tracking-tight">{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2 opacity-70">
                Identificação
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Seu nome de usuário"
                  className="w-full bg-bg-page/50 border border-border-main rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all text-sm font-bold text-text-main placeholder:text-text-muted/40 shadow-inner"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2 opacity-70">
                Segurança
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  placeholder="Sua senha de acesso"
                  className="w-full bg-bg-page/50 border border-border-main rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all text-sm font-bold text-text-main placeholder:text-text-muted/40 shadow-inner"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:brightness-110 active:scale-[0.98] text-white font-black py-5 rounded-[1.25rem] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-70 mt-4 uppercase tracking-[0.1em] text-xs"
            >
              {loading ? (
                <div className="w-5 h-5 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Acessar Painel</span>
                  <ArrowRight size={18} className="opacity-70" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-border-main/30 text-center">
            <p className="text-[10px] font-black text-text-muted/40 uppercase tracking-[0.2em]">
              &copy; 2026 FlowGuard &bull; Cloud Intelligence
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
