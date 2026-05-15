import { Moon, Sun, Globe, LogOut, Menu, User } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUI } from '../contexts/UIContext';
 
export const Header = () => {
  const { t, lang, changeLanguage } = useTranslation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toggleSidebar } = useUI();

  const userInitial = user?.username?.charAt(0).toUpperCase() || 'U';

  return (
    <header className="h-[52px] bg-white dark:bg-[#1a1d27] border-b border-border flex items-center justify-between px-4 sticky top-0 z-40 transition-colors">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-secondary hover:text-text-primary transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-text-secondary border-r border-border pr-4 mr-1">
          <Globe size={16} />
          <select 
            value={lang} 
            onChange={(e) => changeLanguage(e.target.value as any)}
            className="bg-transparent border-none outline-none text-xs font-semibold cursor-pointer uppercase"
          >
            <option value="pt-BR">PT</option>
            <option value="en">EN</option>
            <option value="es">ES</option>
          </select>
        </div>

        <button 
          onClick={toggleTheme}
          className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-secondary hover:text-accent transition-colors"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="flex items-center gap-3 pl-2 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-text-primary leading-tight">{user?.username}</p>
            <p className="text-[10px] text-text-secondary uppercase tracking-tighter font-semibold">{user?.role}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-accent/20">
            {userInitial}
          </div>
        </div>
      </div>
    </header>
  );
};