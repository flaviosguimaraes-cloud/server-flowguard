import { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Search, Bell, Shield, Zap, List, Activity,
  Network, CheckCircle, XCircle, BarChart3, Server, 
  Link as LinkIcon, Sliders, Monitor, ClipboardList, 
  Settings, LogOut, ChevronDown, ChevronRight, Lock, 
  ChevronLeft, Users as UsersIcon, Radar
} from 'lucide-react';
import { Link, useLocation } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';

export const Sidebar = () => {
  const { sidebarCollapsed: collapsed, setSidebarCollapsed: setCollapsed } = useUI();
  const { t } = useTranslation();
  const { logout, user } = useAuth();
  const isAdminUser = user?.role === 'admin';
  const location = useLocation();

  const { data: sysStatus } = useQuery({
    queryKey: ['system-status'],
    queryFn: () => api.get('/api/system/status').then(r => r.data),
    refetchInterval: 30000,
    enabled: !!localStorage.getItem('access_token'),
  });

  const { data: threatsSummary } = useQuery({
    queryKey: ['threats-summary'],
    queryFn: () => api.get('/api/threats/summary').then(r => r.data),
    refetchInterval: 30000,
    enabled: !!localStorage.getItem('access_token'),
  });

  const activeThreats = threatsSummary?.active_total || 0;
  const isActive = (path: string) => location.pathname === path;

  const menuGroups = [
    {
      label: 'Geral',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/analysis', label: 'Análise', icon: Search },
        { path: '/monitoring', label: 'Monitoramento', icon: Activity },
        { path: '/cdns', label: 'Ranking CDNs', icon: BarChart3 },
      ]
    },
    {
      label: 'Mitigação',
      items: [
        { path: '/mitigation/events', label: 'Eventos', icon: List },
        { path: '/mitigation/threats', label: 'Ameaças', icon: Radar, badge: activeThreats },
        { path: '/mitigation/bgp', label: 'BGP', icon: LinkIcon },
        { path: '/mitigation/flowspec', label: 'FlowSpec', icon: Zap },
        { path: '/mitigation/policy', label: 'Política Global', icon: Sliders },
      ]
    },
    {
      label: 'Operação',
      items: [
        { path: '/operation/collectors', label: 'Coletores', icon: Server },
        { path: '/admin/ip-groups', label: 'Grupos de IP', icon: Network },
        { path: '/notifications', label: 'Notificações', icon: Bell },
        { path: '/audit', label: 'Auditoria', icon: ClipboardList },
      ]
    },
    {
      label: 'Sistema',
      items: [
        { path: '/system', label: 'Status', icon: Monitor },
        { path: '/settings', label: 'Configurações', icon: Settings },
        ...(isAdminUser ? [{ path: '/admin/users', label: 'Usuários', icon: UsersIcon }] : []),
      ]
    }
  ];

  return (
    <aside className={clsx(
      "h-full bg-bg-sidebar border-r border-border-main transition-all duration-300 flex flex-col z-[60] flex-shrink-0 relative overflow-hidden",
      collapsed ? "w-[72px]" : "w-[280px]"
    )}>
      {/* Header / Logo */}
      <div className="h-[72px] flex items-center px-6 border-b border-border-main flex-shrink-0 overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/20 flex-shrink-0">
            <Shield className="text-white" size={collapsed ? 20 : 24} />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="text-lg font-black tracking-tight text-text-main">FlowGuard</span>
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-0.5 whitespace-nowrap">DDoS Mitigation Platform</span>
            </div>
          )}
        </div>
      </div>

      {/* Nav Content */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <p className="px-4 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2 opacity-60">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link 
                    key={item.path} 
                    to={item.path} 
                    className={clsx(
                      "fg-sidebar-item relative group",
                      active && "fg-sidebar-item-active",
                      collapsed && "justify-center px-0"
                    )}
                    title={collapsed ? item.label : ""}
                  >
                    <item.icon size={20} className={clsx(
                      "transition-all",
                      active ? "text-primary scale-110" : "group-hover:scale-110"
                    )} />
                    {!collapsed && (
                      <div className="flex items-center justify-between flex-1">
                        <span className="truncate">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="flex items-center justify-center text-[10px] font-black text-white bg-danger rounded-full min-w-[18px] h-[18px] px-1 shadow-sm shadow-danger/20">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                    {collapsed && item.badge !== undefined && item.badge > 0 && (
                      <div className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-bg-sidebar shadow-sm" />
                    )}
                    {active && !collapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / User Controls */}
      <div className="p-3 border-t border-border-main flex-shrink-0 bg-bg-page/20">
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 text-text-muted hover:text-text-main transition-all mb-1 bg-bg-page/50 rounded-lg border border-transparent hover:border-border-main"
        >
          {collapsed ? <ChevronRight size={18} /> : <div className="flex items-center gap-2"><ChevronLeft size={16} /><span className="text-xs font-bold uppercase tracking-widest">Recolher</span></div>}
        </button>
        <button 
          onClick={logout}
          className={clsx(
            "w-full flex items-center gap-3 py-2.5 px-4 text-danger hover:bg-danger/5 rounded-lg transition-all font-bold",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut size={20} />
          {!collapsed && <span className="text-sm">Encerrar Sessão</span>}
        </button>
      </div>
    </aside>
  );
};
