import { Moon, Sun, Globe, LogOut, Menu, User, RefreshCw, Key, ChevronDown } from 'lucide-react';
 import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
      <style>{`
        @keyframes spin-custom {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-bg-primary rounded-lg text-text-secondary hover:text-text-primary transition-all duration-200 border border-transparent hover:border-border active:scale-95"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleRefresh}
          title="Atualizar dados"
          className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-bg-secondary transition-all duration-200 hover:bg-bg-primary active:scale-95 group",
            isRefreshing ? "text-primary border-primary/20 bg-primary/5" : "text-text-secondary"
          )}
        >
          <RefreshCw 
            size={14}
            className={clsx(isRefreshing ? "animate-spin" : "transition-transform duration-500")}
          />
          <span className="font-mono tabular-nums text-[11px] font-semibold">{countdown}s</span>
        </button>

        <div className="flex items-center gap-2 text-text-secondary bg-bg-secondary px-3 py-1.5 rounded-lg border border-border">
          <Globe size={14} />
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

        <button 
          onClick={toggleTheme}
          className="p-2 hover:bg-bg-primary rounded-lg text-text-secondary hover:text-primary transition-all duration-200 border border-transparent hover:border-border active:scale-95"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 pl-4 border-l border-border ml-2 group cursor-pointer outline-none">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-text-primary leading-tight group-hover:text-primary transition-colors">{user?.username}</p>
                <p className="text-[10px] text-primary uppercase tracking-wider font-bold opacity-80">{user?.role}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm shadow-md shadow-primary/20 transition-all group-hover:scale-105 border border-white/10 relative">
                {userInitial}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-bg-secondary rounded-full border border-border flex items-center justify-center">
                  <ChevronDown size={10} className="text-text-secondary" />
                </div>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
             <DropdownMenuLabel className="font-normal">
               <div className="flex flex-col space-y-2">
                 <div className="space-y-0.5">
                   <p className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Perfil</p>
                   <p className="text-sm font-bold text-primary">{user?.role === 'admin' ? 'Administrador' : 'Visualizador'}</p>
                 </div>
                 <div className="space-y-0.5">
                   <p className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Email</p>
                   <p className="text-xs font-medium text-text-primary">{user?.email || '—'}</p>
                 </div>
               </div>
             </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => setIsPasswordModalOpen(true)}>
              <Key className="mr-2 h-4 w-4" />
              <span>Trocar senha</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-danger focus:text-danger" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
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