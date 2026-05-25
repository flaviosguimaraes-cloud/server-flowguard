 import { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Search, Bell, Shield, Zap, List, Activity,
  Network, CheckCircle, XCircle, BarChart3, Settings2, Server, 
  Link as LinkIcon, Sliders, Monitor, ClipboardList, 
  Settings, LogOut, ChevronDown, ChevronRight, Lock, 
  ChevronLeft, Users as UsersIcon, Radar
} from 'lucide-react';
 import { Link, useLocation, useNavigate } from '@tanstack/react-router';
 import { useQuery } from '@tanstack/react-query';
 import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { useUI } from '../contexts/UIContext';
 import { useAuth } from '../contexts/AuthContext';
 import { clsx } from 'clsx';
 
export const Sidebar = () => {
  const { sidebarCollapsed: collapsed, setSidebarCollapsed: setCollapsed } = useUI();

  const { data: sysStatus } = useQuery({
    queryKey: ['system-status'],
    queryFn: () => api.get('/api/system/status').then(r => r.data),
    refetchInterval: 30000,
    staleTime: 30000,
    enabled: !!localStorage.getItem('access_token'),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/api/settings').then(r => r.data),
    staleTime: 60000,
    enabled: !!localStorage.getItem('access_token'),
  });

  const { data: threatsSummary } = useQuery({
    queryKey: ['threats-summary'],
    queryFn: () => api.get('/api/threats/summary').then(r => r.data),
    refetchInterval: 30000,
    enabled: !!localStorage.getItem('access_token'),
  });

  const activeThreats = threatsSummary?.active_total || 0;

  const downServices = useMemo(() => {
    const services = sysStatus?.services || {};
    return Object.entries(services).filter(([_, status]) => status !== 'active');
  }, [sysStatus?.services]);

  const hasCriticalDown = useMemo(() => {
    const criticals = ['flow_collector', 'detection_engine', 'api', 'flow_database', 'config_database', 'bgp_engine'];
    return downServices.some(([key]) => criticals.includes(key));
  }, [downServices]);

  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const saved = localStorage.getItem('sidebar_open_groups');
    return saved ? JSON.parse(saved) : ['mitigation', 'administration'];
  });

  const { t } = useTranslation();
  const { logout, user } = useAuth();
  const isAdminUser = user?.role === 'admin';
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('sidebar_open_groups', JSON.stringify(openGroups));
  }, [openGroups]);

  interface MenuItem {
    path: string;
    label: string;
    icon: any;
    badge?: number;
    badgeColor?: string;
  }

  interface MenuGroup {
    id: string;
    label: string;
    icon?: any;
    items: MenuItem[];
  }

  const menuGroups: MenuGroup[] = [
    {
      id: 'general',
      label: 'Geral',
      items: [
        { path: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
        { path: '/analysis', label: t('analysis'), icon: Search },
        { path: '/cdns', label: t('cdns'), icon: BarChart3 },
        { path: '/monitoring', label: t('monitoring'), icon: Activity },
      ]
    },
    {
      id: 'mitigation',
      label: 'Mitigação',
      items: [
        { path: '/mitigation/events', label: t('events'), icon: Activity },
        { path: '/mitigation/threats', label: t('threats'), icon: Radar, badge: activeThreats },
        { path: '/mitigation/bgp', label: 'BGP', icon: LinkIcon },
        { path: '/mitigation/flowspec', label: 'FlowSpec', icon: Zap },
        { path: '/mitigation/policy', label: 'Política', icon: Sliders },
        { path: '/mitigation/whitelist', label: t('whitelist'), icon: CheckCircle },
        { path: '/mitigation/blacklist', label: t('blacklist'), icon: XCircle },
      ]
    },
    {
      id: 'administration',
      label: 'Operação',
      items: [
        { path: '/operation/collectors', label: t('collectors'), icon: Server },
        { path: '/admin/ip-groups', label: 'Grupos de IP', icon: Network },
        { path: '/notifications', label: t('notifications'), icon: Bell },
        { path: '/audit', label: t('audit'), icon: ClipboardList },
      ]
    },
    {
      id: 'system',
      label: 'Sistema',
      items: [
        { path: '/system', label: t('system'), icon: Monitor, badge: downServices.length, badgeColor: hasCriticalDown ? 'bg-danger' : 'bg-warning' },
        { path: '/settings', label: t('settings'), icon: Settings },
        ...(isAdminUser ? [{ path: '/admin/users', label: 'Usuários', icon: UsersIcon }] : []),
      ]
    }
  ];

  const isActive = (path: string) => location.pathname === path;

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
      "bg-sidebar border-r border-sidebar-border shadow-sm",
      collapsed ? "w-[72px]" : "w-[260px]"
    )}>
      {/* Logo */}
      <div className={clsx(
        "h-[72px] flex items-center gap-3 border-b border-sidebar-border transition-all duration-200", 
        collapsed ? "justify-center" : "px-6"
      )}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="bg-primary p-2 rounded-xl shadow-sm shadow-primary/20 shrink-0">
            <Shield className="text-white" size={20} />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-lg tracking-tight text-text-primary leading-tight">
                FlowGuard
              </span>
              <span className="text-[10px] font-bold text-text-secondary truncate uppercase tracking-widest opacity-70">
                Network Intelligence
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-6">
        {menuGroups.map((group) => (
          <div key={group.id} className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-2 opacity-50">
                {group.label}
              </p>
            )}
            
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link 
                    key={item.path} 
                    to={item.path} 
                    className={clsx(
                      "sidebar-item relative group",
                      collapsed ? "justify-center px-0" : "px-3",
                      active ? "sidebar-item-active" : "sidebar-item-inactive"
                    )}
                    title={collapsed ? item.label : ""}
                  >
                    <item.icon size={18} className={clsx("transition-transform duration-200 group-hover:scale-110", active ? "text-primary" : "")} />
                    {!collapsed && (
                      <div className="flex items-center justify-between flex-1">
                        <span className={clsx("text-sm", active ? "font-semibold" : "font-medium")}>{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className={clsx(
                            "flex items-center justify-center text-[10px] font-bold text-white rounded-full min-w-[18px] h-[18px] px-1",
                            item.badgeColor || "bg-danger"
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                    {collapsed && item.badge !== undefined && item.badge > 0 && (
                      <div className={clsx(
                        "absolute top-2 right-2 w-2 h-2 rounded-full border border-sidebar",
                        item.badgeColor || "bg-danger"
                      )} />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <button 
          onClick={logout}
          className={clsx(
            "w-full sidebar-item sidebar-item-inactive text-danger hover:bg-danger/5 hover:text-danger",
            collapsed ? "justify-center px-0" : "px-3"
          )}
        >
          <LogOut size={18} />
          {!collapsed && <span className="text-sm font-semibold">{t('logout')}</span>}
        </button>
      </div>
    </div>
  );
};
