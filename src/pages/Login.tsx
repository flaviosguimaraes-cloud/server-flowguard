import { useState, FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
 import { useAuth } from '../contexts/AuthContext';
 import { useTranslation } from '../hooks/useTranslation';
 import api from '../services/api';
 import { toast } from 'sonner';
  import { Lock, User, Shield, Globe } from 'lucide-react';
 
 export default function Login() {
   const [username, setUsername] = useState('');
   const [password, setPassword] = useState('');
  const navigate = useNavigate();
   const { login } = useAuth();
   const { t, lang, changeLanguage } = useTranslation();
 
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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

      login(data);
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Usuário ou senha incorretos';
      toast.error(msg);
    }
  };
 
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 transition-colors">
      <div className="max-w-md w-full bg-bg-card p-8 rounded-xl shadow-2xl border border-border transition-colors">
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
          <div className="inline-flex items-center justify-center p-3 bg-accent/10 rounded-2xl mb-4">
            <Shield className="text-accent" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-accent tracking-tight">FlowGuard</h1>
          <p className="text-text-secondary mt-2">Network Intelligence & DDoS Mitigation</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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

          <button className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-accent/20 active:scale-[0.98] mt-2">
            {t('login')}
          </button>
        </form>
      </div>
    </div>
  );
 }