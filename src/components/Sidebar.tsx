import { useState } from 'react';
import { 
  LayoutDashboard, Activity, ShieldAlert, Shield, Zap, List, 
  Network, CheckCircle, XCircle, Globe, Settings2, Server, 
  Link as LinkIcon, Sliders, Monitor, ClipboardList, Bell, 
  Settings, LogOut, ChevronDown, ChevronRight, Menu, X
} from 'lucide-react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useTranslation } from '../hooks/useTranslation';
import { useUI } from '../contexts/UIContext';
 import { useAuth } from '../contexts/AuthContext';
 import { clsx } from 'clsx';
 
export const Sidebar = () => {
  const { sidebarCollapsed: collapsed, setSidebarCollapsed: setCollapsed } = useUI();
  const [openGroups, setOpenGroups] = useState<string[]>(['mitigation', 'operation']);
  const { t } = useTranslation();
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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

  const navItems = [
    { path: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { path: '/analysis', label: t('analysis'), icon: Activity },
    { path: '/events', label: t('events'), icon: ShieldAlert },
    { 
      id: 'mitigation',
      label: t('mitigation'), 
      icon: Shield,
      children: [
        { path: '/mitigation/active', label: t('active'), icon: Zap },
        { path: '/mitigation/flowspec', label: t('flowspec_short'), icon: List },
        { path: '/mitigation/bgp', label: t('bgp'), icon: Network },
        { path: '/mitigation/whitelist', label: t('whitelist'), icon: CheckCircle },
        { path: '/mitigation/blacklist', label: t('blacklist'), icon: XCircle },
      ]
    },
    { path: '/cdns', label: t('cdns'), icon: Globe },
    { 
      id: 'operation',
      label: t('operation'), 
      icon: Settings2,
      children: [
        { path: '/operation/collectors', label: t('collectors'), icon: Server },
        { path: '/operation/bgp-sessions', label: t('bgp_sessions'), icon: LinkIcon },
        { path: '/operation/thresholds', label: t('thresholds'), icon: Sliders },
      ]
    },
    { path: '/system', label: t('system'), icon: Monitor },
    { path: '/audit', label: t('audit'), icon: ClipboardList },
    { path: '/notifications', label: t('notifications'), icon: Bell },
    { path: '/settings', label: t('settings'), icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isGroupActive = (children: any[]) => children.some(child => isActive(child.path));

  return (
    <div className={clsx(
      "h-screen transition-all duration-500 flex flex-col z-50 shadow-2xl shadow-black/20",
      "bg-bg-secondary border-r border-border",
      collapsed ? "w-[80px]" : "w-[280px]"
    )}>
      {/* Logo */}
      <div className={clsx(
        "h-[72px] flex items-center gap-3 border-b border-border transition-all duration-300", 
        collapsed ? "justify-center" : "px-8"
      )}>
        <div className="bg-primary/20 p-2 rounded-2xl shadow-lg shadow-primary/10 border border-primary/20">
          <Shield className="text-primary" size={26} />
        </div>
        {!collapsed && (
          <span className="font-black text-xl tracking-tighter text-text-primary uppercase bg-gradient-to-br from-text-primary to-text-secondary bg-clip-text text-transparent">
            FlowGuard
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-8 px-4 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-2">
        {navItems.map((item) => {
          if (item.children) {
            const isOpen = openGroups.includes(item.id);
            const groupActive = isGroupActive(item.children);
            
            return (
              <div key={item.id} className="mb-1">
                <button 
                  onClick={() => toggleGroup(item.id)}
                  className={clsx(
                    "w-full flex items-center py-3 transition-all duration-300 rounded-xl group relative overflow-hidden",
                    collapsed ? "justify-center" : "justify-between px-4",
                    groupActive && !isOpen ? "text-primary bg-primary/10" : "text-text-secondary hover:bg-bg-primary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={20} className={clsx("transition-colors", groupActive ? "text-primary" : "group-hover:text-text-primary")} />
                    {!collapsed && <span className={clsx("text-sm font-semibold transition-colors", groupActive ? "text-primary" : "group-hover:text-text-primary")}>{item.label}</span>}
                  </div>
                  {!collapsed && (isOpen ? <ChevronDown size={14} className="text-text-secondary" /> : <ChevronRight size={14} className="text-text-secondary" />)}
                </button>
                
                {!collapsed && isOpen && (
                  <div className="mt-1 space-y-1 ml-4 pl-4 border-l border-border/50">
                    {item.children.map((child) => (
                      <Link 
                        key={child.path} 
                        to={child.path} 
                        className={clsx(
                          "flex items-center gap-3 py-2 px-3 transition-all duration-200 rounded-lg text-sm font-medium",
                          isActive(child.path) ? "text-primary bg-primary/10" : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
                        )}
                      >
                        <child.icon size={16} />
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
                "flex items-center py-3 transition-all duration-300 rounded-xl group relative overflow-hidden",
                collapsed ? "justify-center px-0" : "px-4 gap-4",
                active ? "bg-primary text-white shadow-xl shadow-primary/30" : "text-text-secondary hover:bg-bg-primary"
              )}
            >
              <item.icon size={22} className={clsx("transition-transform duration-300", active ? "text-white scale-110" : "group-hover:text-text-primary group-hover:scale-110")} />
              {!collapsed && <span className={clsx("text-sm font-bold tracking-tight", active ? "text-white" : "group-hover:text-text-primary")}>{item.label}</span>}
              {active && !collapsed && <div className="absolute right-0 w-1.5 h-6 bg-white rounded-l-full" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Toggle */}
      <div className="p-4 border-t border-border">
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-all duration-200"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
        <button 
          onClick={logout}
          className={clsx(
            "w-full flex items-center py-2.5 text-danger hover:bg-danger-bg rounded-lg transition-all duration-200 mt-2",
            collapsed ? "justify-center px-0" : "px-3 gap-3"
          )}
        >
          <LogOut size={20} />
          {!collapsed && <span className="text-sm font-semibold">{t('logout')}</span>}
        </button>
      </div>
    </div>
  );
};

const ChevronLeft = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);