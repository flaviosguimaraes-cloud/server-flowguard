import { Moon, Sun, Globe, LogOut, Menu, User, RefreshCw, Key, ChevronDown } from 'lucide-react';
 import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUI } from '../contexts/UIContext';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ChangeOwnPasswordModal } from './ChangeOwnPasswordModal';
 
 
export const Header = () => {
  const { t, lang, changeLanguage } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toggleSidebar } = useUI();
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/api/settings').then(r => r.data),
    staleTime: 60000,
    enabled: !!localStorage.getItem('access_token'),
  });

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
    <header className="h-[72px] bg-bg-secondary/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6 sticky top-0 z-40 transition-all duration-200 shadow-sm">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="header-action"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        {/* Auto Refresh */}
        <button
          onClick={handleRefresh}
          className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-bg-secondary transition-all duration-200 hover:bg-bg-primary active:scale-95 group",
            isRefreshing ? "text-primary border-primary/20 bg-primary/5 shadow-[0_0_15px_rgba(37,99,235,0.1)]" : "text-text-secondary"
          )}
        >
          <RefreshCw 
            size={14}
            className={clsx(isRefreshing ? "animate-spin" : "text-text-secondary group-hover:text-primary transition-colors")}
          />
          <div className="flex flex-col items-start leading-none">
            <span className="text-[9px] uppercase tracking-widest font-bold opacity-50 mb-0.5">Auto-refresh</span>
            <span className="font-mono tabular-nums text-[11px] font-bold">{countdown}s</span>
          </div>
        </button>

        {/* Language */}
        <div className="flex items-center gap-2 text-text-secondary bg-bg-secondary px-3 py-1.5 rounded-lg border border-border hover:border-text-secondary/30 transition-colors">
          <Globe size={14} className="opacity-70" />
          <select 
            value={lang} 
            onChange={(e) => changeLanguage(e.target.value as any)}
            className="bg-transparent border-none outline-none text-[11px] font-bold cursor-pointer uppercase appearance-none hover:text-text-primary transition-colors"
          >
            <option value="pt-BR">PT</option>
            <option value="en">EN</option>
            <option value="es">ES</option>
          </select>
        </div>

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="header-action"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 pl-4 border-l border-border ml-2 group cursor-pointer outline-none">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-text-primary leading-tight group-hover:text-primary transition-colors">{user?.username}</p>
                <p className="text-[10px] text-primary uppercase tracking-widest font-extrabold opacity-80 leading-none mt-1">{user?.role}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary/20 transition-all group-hover:scale-105 border border-white/10 relative">
                {userInitial}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-bg-secondary" />
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2">
             <div className="px-3 py-3 mb-2 bg-bg-primary rounded-lg border border-border">
               <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mb-1 opacity-60">Organização</p>
               <p className="text-sm font-bold text-text-primary truncate">{settings?.org_name?.value || 'Intelligence'}</p>
               <div className="mt-3 pt-3 border-t border-border/50">
                 <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mb-1 opacity-60">Email</p>
                 <p className="text-xs font-medium text-text-primary truncate">{user?.email || '—'}</p>
               </div>
             </div>
            <DropdownMenuItem className="cursor-pointer rounded-md py-2.5" onClick={() => setIsPasswordModalOpen(true)}>
              <Key className="mr-2 h-4 w-4 opacity-70" />
              <span className="font-medium">Alterar Senha</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem className="cursor-pointer rounded-md py-2.5 text-danger focus:text-danger focus:bg-danger/5" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span className="font-bold uppercase tracking-wider text-[11px]">Encerrar Sessão</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ChangeOwnPasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </header>
  );
};