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
    <header className="h-[64px] bg-white/80 dark:bg-[#0b0e14]/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6 sticky top-0 z-40 transition-all duration-300">
      <style>{`
        @keyframes spin-custom {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-bg-secondary rounded-xl text-text-secondary hover:text-text-primary transition-all duration-200 border border-transparent hover:border-border"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleRefresh}
          title="Atualizar dados"
          className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-bg-secondary/50 transition-all duration-200",
            isRefreshing ? "text-primary border-primary/30" : "text-text-secondary"
          )}
        >
          <RefreshCw 
            size={14}
            className={clsx(isRefreshing && "animate-spin")}
          />
          <span className="font-mono tabular-nums text-xs font-semibold">{countdown}s</span>
        </button>

        <div className="flex items-center gap-2 text-text-secondary bg-bg-secondary/50 px-3 py-1.5 rounded-lg border border-border">
          <Globe size={14} />
          <select 
            value={lang} 
            onChange={(e) => changeLanguage(e.target.value as any)}
            className="bg-transparent border-none outline-none text-xs font-bold cursor-pointer uppercase appearance-none"
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