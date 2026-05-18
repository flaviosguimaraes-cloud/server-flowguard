import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Search, Bell, Shield, Zap, List, Activity,
  Network, CheckCircle, XCircle, BarChart3, Settings2, Server, 
  Link as LinkIcon, Sliders, Monitor, ClipboardList, 
  Settings, LogOut, ChevronDown, ChevronRight, Lock, 
  ChevronLeft, Users as UsersIcon
} from 'lucide-react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useTranslation } from '../hooks/useTranslation';
import { useUI } from '../contexts/UIContext';
 import { useAuth } from '../contexts/AuthContext';
 import { clsx } from 'clsx';
 
export const Sidebar = () => {
  const { sidebarCollapsed: collapsed, setSidebarCollapsed: setCollapsed } = useUI();
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const saved = localStorage.getItem('sidebar_open_groups');
    return saved ? JSON.parse(saved) : ['mitigation', 'operation'];
  });
  const { t } = useTranslation();
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('sidebar_open_groups', JSON.stringify(openGroups));
  }, [openGroups]);

  const navItems = [
    { path: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { path: '/analysis', label: t('analysis'), icon: Search },
    { path: '/events', label: t('events'), icon: Activity },
    { 
      id: 'mitigation',
      label: t('mitigation'), 
      icon: Shield,
      children: [
        { path: '/mitigation/active', label: t('active'), icon: Zap },
        { path: '/mitigation/flowspec', label: t('flowspec_short'), icon: List },
        { path: '/mitigation/policy', label: 'Política', icon: Sliders },
      ]
    },
    { path: '/cdns', label: t('cdns'), icon: BarChart3 },
    { 
      id: 'operation',
      label: t('operation'), 
      icon: Settings2,
      children: [
         { path: '/operation/bgp', label: 'BGP', icon: LinkIcon },
         { path: '/operation/collectors', label: t('collectors'), icon: Server },
      ]
    },
    { 
      id: 'administration',
      label: t('administration'), 
      icon: Lock,
      children: [
        { path: '/mitigation/whitelist', label: t('whitelist'), icon: CheckCircle },
        { path: '/mitigation/blacklist', label: t('blacklist'), icon: XCircle },
        { path: '/notifications', label: t('notifications'), icon: Bell },
        { path: '/audit', label: t('audit'), icon: ClipboardList },
        { path: '/settings', label: t('settings'), icon: Settings },
        { path: '/admin/users', label: 'Usuários', icon: UsersIcon },
      ]
    },
    { path: '/system', label: t('system'), icon: Monitor },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isGroupActive = (children: any[]) => children.some(child => isActive(child.path));

  useEffect(() => {
    navItems.forEach(item => {
      if (item.children && isGroupActive(item.children)) {
        if (!openGroups.includes(item.id)) {
          setOpenGroups(prev => [...prev, item.id]);
        }
      }
    });
  }, [location.pathname]);

  const toggleGroup = (group: string) => {
    if (collapsed) {
      setCollapsed(false);
      setOpenGroups([group]);
      return;
    }
    setOpenGroups(prev => 
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  return (
    <div className={clsx(
      "h-screen sticky top-0 transition-all duration-300 flex flex-col z-50 shrink-0",
      "bg-bg-secondary border-r border-border shadow-sm",
      collapsed ? "w-[72px]" : "w-[260px]"
    )}>
      {/* Logo */}
      <div className={clsx(
        "h-[72px] flex items-center gap-3 border-b border-border transition-all duration-200", 
        collapsed ? "justify-center" : "px-6"
      )}>
        <div className="bg-primary/10 p-2 rounded-xl border border-primary/10">
          <Shield className="text-primary" size={24} />
        </div>
        {!collapsed && (
          <span className="font-bold text-lg tracking-tight text-text-primary">
            FlowGuard
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-6 px-3 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-1">
        {navItems.map((item) => {
          if (item.children) {
            const isOpen = openGroups.includes(item.id);
            const groupActive = isGroupActive(item.children);
            
            return (
              <div key={item.id} className="mb-1">
                <button 
                  onClick={() => toggleGroup(item.id)}
                  className={clsx(
                    "w-full flex items-center py-2.5 transition-all duration-200 rounded-lg group relative",
                    collapsed ? "justify-center" : "justify-between px-3",
                    groupActive && !isOpen ? "text-primary bg-primary/5" : "text-text-secondary hover:bg-bg-primary hover:text-text-primary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={18} className={clsx("transition-colors", groupActive ? "text-primary" : "")} />
                    {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </div>
                  {!collapsed && (isOpen ? <ChevronDown size={14} opacity={0.5} /> : <ChevronRight size={14} opacity={0.5} />)}
                </button>
                
                {!collapsed && isOpen && (
                  <div className="mt-1 space-y-1 ml-6 pl-3 border-l border-border/60">
                    {item.children.map((child) => (
                      <Link 
                        key={child.path} 
                        to={child.path} 
                        className={clsx(
                          "flex items-center gap-3 py-1.5 px-3 transition-all duration-150 rounded-lg text-sm font-medium",
                          isActive(child.path) ? "text-primary bg-primary/5" : "text-text-secondary hover:text-text-primary hover:bg-bg-primary/50"
                        )}
                      >
                        <child.icon size={14} />
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          const active = isActive(item.path);
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={clsx(
                "flex items-center py-2.5 transition-all duration-200 rounded-lg group relative",
                collapsed ? "justify-center px-0" : "px-3 gap-3",
                active ? "bg-primary/10 text-primary shadow-none" : "text-text-secondary hover:bg-bg-primary hover:text-text-primary"
              )}
            >
              <item.icon size={18} className={clsx("transition-transform duration-200", active ? "text-primary" : "")} />
              {!collapsed && <span className={clsx("text-sm font-medium", active ? "font-semibold" : "")}>{item.label}</span>}
              {active && !collapsed && <div className="absolute right-2 w-1 h-1 bg-primary rounded-full" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Toggle */}
      <div className="p-3 border-t border-border">
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-primary rounded-lg transition-all duration-200 mb-1"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        <button 
          onClick={logout}
          className={clsx(
            "w-full flex items-center py-2 text-danger hover:bg-danger/5 rounded-lg transition-all duration-200",
            collapsed ? "justify-center px-0" : "px-3 gap-3"
          )}
        >
          <LogOut size={18} />
          {!collapsed && <span className="text-sm font-semibold">{t('logout')}</span>}
        </button>
      </div>
    </div>
  );
};
