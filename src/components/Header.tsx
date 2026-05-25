import { Moon, Sun, Globe, LogOut, Menu, User, RefreshCw, Key, ChevronDown, Bell } from 'lucide-react';
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
    <header className="h-[72px] sticky top-0 z-50 w-full bg-bg-card/80 backdrop-blur-md border-b border-border-main flex items-center justify-between px-6 shadow-sm transition-all duration-300">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 text-text-muted hover:text-primary hover:bg-bg-page rounded-lg transition-all active:scale-95"
        >
          <Menu size={22} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* Auto Refresh Pill */}
        <button
          onClick={handleRefresh}
          className={clsx(
            "flex items-center gap-3 px-4 py-1.5 rounded-full border border-border-main bg-bg-page transition-all active:scale-95 shadow-inner group",
            isRefreshing && "border-primary/30"
          )}
        >
          <RefreshCw 
            size={14} 
            className={clsx("text-text-muted transition-all", isRefreshing ? "animate-spin text-primary" : "group-hover:text-primary")} 
          />
          <div className="flex flex-col items-start leading-none">
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-text-muted opacity-50">Sync</span>
            <span className="font-mono text-[11px] font-bold text-text-main tabular-nums">{countdown}s</span>
          </div>
        </button>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 border-x border-border-main px-4 mx-2">
          <button 
            onClick={toggleTheme}
            className="p-2 text-text-muted hover:text-primary hover:bg-bg-page rounded-xl transition-all"
            title="Alternar Tema"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 text-text-muted hover:text-primary hover:bg-bg-page rounded-xl transition-all flex items-center gap-1">
                <Globe size={20} />
                <span className="text-[10px] font-black uppercase">{lang === 'pt-BR' ? 'PT' : lang === 'en' ? 'EN' : 'ES'}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32 bg-bg-card border-border-main p-1 shadow-xl">
              <DropdownMenuItem onClick={() => changeLanguage('pt-BR')} className="rounded-lg text-xs font-bold px-3 py-2 cursor-pointer focus:bg-primary/10 focus:text-primary">PORTUGUÊS</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('en')} className="rounded-lg text-xs font-bold px-3 py-2 cursor-pointer focus:bg-primary/10 focus:text-primary">ENGLISH</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('es')} className="rounded-lg text-xs font-bold px-3 py-2 cursor-pointer focus:bg-primary/10 focus:text-primary">ESPAÑOL</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 pl-2 group outline-none">
              <div className="text-right hidden sm:flex flex-col">
                <p className="text-sm font-black text-text-main group-hover:text-primary transition-colors leading-none">{user?.username}</p>
                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.1em] mt-1 opacity-80">{user?.role || 'User'}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-sm shadow-lg shadow-primary/20 transition-all group-hover:scale-105 group-active:scale-95 border-2 border-white/10 relative">
                {userInitial}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-4 border-bg-card shadow-sm" />
              </div>
              <ChevronDown size={14} className="text-text-muted opacity-50 group-hover:text-primary" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-bg-card border-border-main shadow-2xl p-2 rounded-xl">
            <div className="px-3 py-3 mb-2 bg-bg-page rounded-lg border border-border-main shadow-inner">
               <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] mb-1 opacity-60">Organização</p>
               <p className="text-sm font-black text-text-main truncate">{settings?.org_name?.value || settings?.org_name || 'FlowGuard Intelligence'}</p>
            </div>
            <DropdownMenuItem onClick={() => setIsPasswordModalOpen(true)} className="rounded-lg py-2.5 px-3 font-bold text-xs text-text-main cursor-pointer focus:bg-primary/10 focus:text-primary">
              <Key className="mr-3 h-4 w-4" /> Alterar Senha
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border-main opacity-50 my-1.5" />
            <DropdownMenuItem onClick={logout} className="rounded-lg py-2.5 px-3 font-bold text-xs text-danger cursor-pointer focus:bg-danger/5 focus:text-danger">
              <LogOut className="mr-3 h-4 w-4" /> Encerrar Sessão
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
