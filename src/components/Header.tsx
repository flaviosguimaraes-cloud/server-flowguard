 import { Moon, Sun, Globe, LogOut } from 'lucide-react';
 import { useTranslation } from '../hooks/useTranslation';
 import { useAuth } from '../contexts/AuthContext';
 import { useState, useEffect } from 'react';
 
 export const Header = () => {
   const { t, lang, changeLanguage } = useTranslation();
   const { user, logout } = useAuth();
   const [dark, setDark] = useState(localStorage.getItem('theme') !== 'light');
 
   useEffect(() => {
     if (dark) {
       document.documentElement.classList.add('dark');
       localStorage.setItem('theme', 'dark');
     } else {
       document.documentElement.classList.remove('dark');
       localStorage.setItem('theme', 'light');
     }
   }, [dark]);
 
   return (
     <header className="h-16 bg-[#1e2130] border-b border-gray-800 flex items-center justify-between px-6 sticky top-0 z-50">
       <div className="flex items-center gap-4">
         <h1 className="text-xl font-bold text-[#3b82f6]">FlowGuard</h1>
       </div>
       <div className="flex items-center gap-6">
         <div className="flex items-center gap-2">
           <Globe size={18} />
           <select 
             value={lang} 
             onChange={(e) => changeLanguage(e.target.value as any)}
             className="bg-transparent border-none outline-none text-sm cursor-pointer"
           >
             <option value="pt-BR">PT</option>
             <option value="en">EN</option>
             <option value="es">ES</option>
           </select>
         </div>
         <button onClick={() => setDark(!dark)}>
           {dark ? <Sun size={20} /> : <Moon size={20} />}
         </button>
         <div className="flex items-center gap-3 border-l border-gray-700 pl-6">
           <div className="text-right">
             <p className="text-sm font-medium">{user?.username}</p>
             <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
           </div>
           <button onClick={logout} className="text-gray-400 hover:text-white transition-colors">
             <LogOut size={20} />
           </button>
         </div>
       </div>
     </header>
   );
 };