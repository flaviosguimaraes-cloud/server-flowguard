 import { Moon, Sun, Globe, LogOut, Menu, User, RefreshCw } from 'lucide-react';
 import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUI } from '../contexts/UIContext';
 
export const Header = () => {
  const { t, lang, changeLanguage } = useTranslation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toggleSidebar } = useUI();
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    setCountdown(30);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleRefresh();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const userInitial = user?.username?.charAt(0).toUpperCase() || 'U';

  return (
    <header className="h-[72px] bg-bg-secondary/70 backdrop-blur-xl border-b border-border flex items-center justify-between px-8 sticky top-0 z-40 transition-all duration-300 shadow-sm shadow-black/5">
      <style>{`
        @keyframes spin-custom {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2.5 hover:bg-bg-primary rounded-2xl text-text-secondary hover:text-text-primary transition-all duration-300 border border-transparent hover:border-border shadow-sm active:scale-95"
        >
          <Menu size={22} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleRefresh}
          title="Atualizar dados"
          className={clsx(
            "flex items-center gap-2.5 px-4 py-2 rounded-xl border border-border bg-bg-primary/50 transition-all duration-300 shadow-sm active:scale-95 group",
            isRefreshing ? "text-primary border-primary/40 bg-primary/5" : "text-text-secondary hover:border-text-secondary/20"
          )}
        >
          <RefreshCw 
            size={16}
            className={clsx(isRefreshing ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500")}
          />
          <span className="font-mono tabular-nums text-xs font-bold">{countdown}s</span>
        </button>

        <div className="flex items-center gap-2.5 text-text-secondary bg-bg-primary/50 px-4 py-2 rounded-xl border border-border shadow-sm">
          <Globe size={16} />
          <select 
            value={lang} 
            onChange={(e) => changeLanguage(e.target.value as any)}
            className="bg-transparent border-none outline-none text-xs font-black cursor-pointer uppercase appearance-none hover:text-text-primary transition-colors"
          >
            <option value="pt-BR">PT</option>
            <option value="en">EN</option>
            <option value="es">ES</option>
          </select>
        </div>

        <button 
          onClick={toggleTheme}
          className="p-2 hover:bg-bg-secondary rounded-xl text-text-secondary hover:text-primary transition-all duration-200 border border-transparent hover:border-border"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-border ml-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-text-primary leading-none mb-1">{user?.username}</p>
            <p className="text-[10px] text-text-secondary uppercase tracking-wider font-bold opacity-80">{user?.role}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary/20 transition-transform hover:scale-105">
            {userInitial}
          </div>
        </div>
      </div>
    </header>
  );
};