 import { useState } from 'react';
 import { useAuth } from '../contexts/AuthContext';
 import { useTranslation } from '../hooks/useTranslation';
 import api from '../services/api';
 import { toast } from 'sonner';
 import { Lock, User } from 'lucide-react';
 
 export default function Login() {
   const [username, setUsername] = useState('');
   const [password, setPassword] = useState('');
   const { login } = useAuth();
   const { t, lang, changeLanguage } = useTranslation();
 
  const handleSubmit = async (e: React.FormEvent) => {
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

      if (data.must_change_password) {
        window.location.href = '/change-password';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Usuário ou senha incorretos';
      toast.error(msg);
    }
  };
 
   return (
     <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
       <div className="max-w-md w-full bg-[#1e2130] p-8 rounded-xl shadow-2xl">
         <div className="text-center mb-8">
           <h1 className="text-3xl font-bold text-[#3b82f6]">FlowGuard</h1>
           <p className="text-gray-400 mt-2">Network Intelligence & DDoS Mitigation</p>
         </div>
         <form onSubmit={handleSubmit} className="space-y-6">
           <div className="relative">
             <User className="absolute left-3 top-3 text-gray-500" size={18} />
             <input
               type="text"
               placeholder={t('username')}
               className="w-full bg-[#0f1117] border border-gray-700 rounded-lg py-2 pl-10 pr-4 outline-none focus:border-[#3b82f6]"
               value={username}
               onChange={(e) => setUsername(e.target.value)}
             />
           </div>
           <div className="relative">
             <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
             <input
               type="password"
               placeholder={t('password')}
               className="w-full bg-[#0f1117] border border-gray-700 rounded-lg py-2 pl-10 pr-4 outline-none focus:border-[#3b82f6]"
               value={password}
               onChange={(e) => setPassword(e.target.value)}
             />
           </div>
           <button className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold py-2 rounded-lg transition-colors">
             {t('login')}
           </button>
         </form>
         <div className="mt-8 pt-6 border-t border-gray-700 flex justify-center gap-4 text-sm">
           {['pt-BR', 'en', 'es'].map((l) => (
             <button
               key={l}
               onClick={() => changeLanguage(l as any)}
               className={lang === l ? "text-[#3b82f6] font-bold" : "text-gray-400"}
             >
               {l.split('-')[0].toUpperCase()}
             </button>
           ))}
         </div>
       </div>
     </div>
   );
 }