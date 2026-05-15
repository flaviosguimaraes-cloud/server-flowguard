import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Activity, ShieldAlert, Shield, Zap, List, 
  Network, CheckCircle, XCircle, Globe, Settings2, Server, 
  Link as LinkIcon, Sliders, Monitor, ClipboardList, Bell, 
  Settings, LogOut, ChevronDown, ChevronRight, Menu, X
} from 'lucide-react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
 import { useTranslation } from '../hooks/useTranslation';
 import { useAuth } from '../contexts/AuthContext';
 import { clsx } from 'clsx';
 
export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
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
      "h-screen transition-all duration-300 flex flex-col z-50",
      "bg-[#13151f] dark:bg-[#13151f] light:bg-[#1e293b]", // Specification: bg-[#13151f] (dark) or #1e293b (light)
      collapsed ? "w-[60px]" : "w-[220px]"
    )}>
      {/* Logo */}
      <div className={clsx("p-4 flex items-center gap-3 border-b border-white/5", collapsed ? "justify-center" : "justify-start")}>
        <div className="bg-accent/10 p-1.5 rounded-lg">
          <Shield className="text-accent" size={24} />
        </div>
        {!collapsed && <span className="font-bold text-xl tracking-tight text-accent">FlowGuard</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-4 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {navItems.map((item) => {
          if (item.children) {
            const isOpen = openGroups.includes(item.id);
            const groupActive = isGroupActive(item.children);
            
            return (
              <div key={item.id} className="mb-1">
                <button 
                  onClick={() => toggleGroup(item.id)}
                  className={clsx(
                    "w-full flex items-center p-3 transition-colors hover:bg-white/5",
                    collapsed ? "justify-center" : "justify-between px-4",
                    groupActive && !isOpen && "text-accent bg-accent/10 border-r-2 border-accent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={20} className={groupActive ? "text-accent" : "text-text-secondary"} />
                    {!collapsed && <span className={clsx("text-sm font-medium", groupActive ? "text-accent" : "text-text-secondary")}>{item.label}</span>}
                  </div>
                  {!collapsed && (isOpen ? <ChevronDown size={14} className="text-text-secondary" /> : <ChevronRight size={14} className="text-text-secondary" />)}
                </button>
                
                {!collapsed && isOpen && (
                  <div className="bg-black/20 py-1">
                    {item.children.map((child) => (
                      <Link 
                        key={child.path} 
                        to={child.path} 
                        className={clsx(
                          "flex items-center gap-3 p-2.5 pl-11 transition-colors hover:bg-white/5 text-sm",
                          isActive(child.path) ? "text-accent bg-accent-bg font-semibold" : "text-text-secondary"
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
                "flex items-center p-3 transition-all hover:bg-white/5 group",
                collapsed ? "justify-center" : "px-4 gap-3",
                active ? "bg-accent-bg text-accent border-r-2 border-accent" : "text-text-secondary"
              )}
            >
              <item.icon size={20} className={active ? "text-accent" : "text-text-secondary group-hover:text-white transition-colors"} />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Toggle */}
      <div className="p-2 border-t border-white/5">
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
        <button 
          onClick={logout}
          className={clsx(
            "w-full flex items-center p-3 text-danger hover:bg-danger/10 rounded-lg transition-colors mt-1",
            collapsed ? "justify-center" : "px-4 gap-3"
          )}
        >
          <LogOut size={20} />
          {!collapsed && <span className="text-sm font-medium">{t('logout')}</span>}
        </button>
      </div>
    </div>
  );
};

const ChevronLeft = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);