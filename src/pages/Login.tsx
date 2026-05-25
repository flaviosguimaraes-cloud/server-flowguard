 import { useState, FormEvent, useEffect } from 'react';
 import { useAuth } from '../contexts/AuthContext';
 import { useNavigate } from '@tanstack/react-router';
 import { useTranslation } from '../hooks/useTranslation';
 import api from '../services/api';
 import { toast } from 'sonner';
   import { Lock, User, Shield, Globe, Sun, Moon } from 'lucide-react';
   import { useTheme } from '../contexts/ThemeContext';
 
 export default function Login() {
   const { login } = useAuth();
   const navigate = useNavigate();
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
 
       const { access_token, username: resUsername, role, must_change_password } = response.data;
 
       // Salvar token PRIMEIRO
       localStorage.setItem('access_token', access_token);
       localStorage.setItem('username', resUsername);
       localStorage.setItem('role', role);
       
       // Atualizar o contexto (isso também fará o navigate interno)
       login(response.data);
 
       // Redirecionar IMEDIATAMENTE (redundante mas garante velocidade)
       if (must_change_password) {
         navigate({ to: '/change-password', replace: true });
       } else {
         navigate({ to: '/dashboard', replace: true });
       }
     } catch (error: any) {
       setError('Usuário ou senha inválidos');
       setLoading(false);
     }
   };
 
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 transition-colors relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      
      {/* Floating Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full z-10">
        <div className="card p-8 md:p-10 shadow-2xl shadow-primary/5 border-primary/5 relative">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
          
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-2 bg-bg-primary px-3 py-1.5 rounded-lg border border-border">
              <Globe className="text-text-secondary" size={14} />
              <select 
                value={lang} 
                onChange={(e) => changeLanguage(e.target.value as any)}
                className="bg-transparent border-none outline-none text-[10px] font-bold uppercase tracking-wider cursor-pointer text-text-secondary hover:text-primary transition-colors appearance-none"
              >
                <option value="pt-BR">PT-BR</option>
                <option value="en">EN-US</option>
                <option value="es">ES-ES</option>
              </select>
            </div>

            <button 
              type="button"
              onClick={toggleTheme}
              className="header-action"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-3xl mb-6 border border-primary/20 shadow-inner relative group transition-transform hover:scale-105">
              <Shield className="text-primary relative z-10" size={40} />
              <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h1 className="text-4xl font-black text-text-primary tracking-tighter mb-2">FlowGuard</h1>
            <div className="flex items-center justify-center gap-2">
              <div className="h-[1px] w-4 bg-primary/30" />
              <p className="text-text-secondary font-extrabold text-[10px] uppercase tracking-[0.3em] opacity-60">Network Intelligence</p>
              <div className="h-[1px] w-4 bg-primary/30" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-[11px] text-center font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-2 duration-300">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1 opacity-70">
                Identificação
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Usuário ou E-mail"
                  className="w-full bg-bg-primary border border-border rounded-xl py-3.5 pl-12 pr-4 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all text-sm text-text-primary placeholder:text-text-secondary/40 font-medium"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1 opacity-70">
                Autenticação
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" size={18} />
                <input
                  type="password"
                  placeholder="Sua senha de acesso"
                  className="w-full bg-bg-primary border border-border rounded-xl py-3.5 pl-12 pr-4 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all text-sm text-text-primary placeholder:text-text-secondary/40 font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-primary/20 active:scale-[0.98] mt-4 flex items-center justify-center disabled:opacity-70 uppercase tracking-widest text-[11px] gap-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Acessar Painel</span>
                  <div className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center">
                    <Shield size={10} />
                  </div>
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[10px] text-text-secondary font-medium opacity-50 uppercase tracking-widest">
            &copy; 2026 FlowGuard Security Systems
          </p>
        </div>
      </div>
    </div>
  );
 }