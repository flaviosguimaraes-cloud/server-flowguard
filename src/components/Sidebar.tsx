 import { useState } from 'react';
 import { LayoutDashboard, ShieldAlert, Activity, Server, Settings, Users, LogOut, Menu, X } from 'lucide-react';
 import { Link, useLocation } from 'react-router-dom';
 import { useTranslation } from '../hooks/useTranslation';
 import { useAuth } from '../contexts/AuthContext';
 import { clsx } from 'clsx';
 
 export const Sidebar = () => {
   const [collapsed, setCollapsed] = useState(false);
   const { t } = useTranslation();
   const { isAdmin } = useAuth();
   const location = useLocation();
 
   const items = [
     { path: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
     { path: '/analysis', label: t('analysis'), icon: Activity },
     { path: '/events', label: t('events'), icon: ShieldAlert },
     { path: '/mitigation/active', label: t('mitigation'), icon: ShieldAlert },
     { path: '/operation/collectors', label: t('operation'), icon: Server },
     { path: '/settings', label: t('settings'), icon: Settings },
   ];
 
   return (
     <div className={clsx("h-screen bg-[#1e2130] transition-all duration-300 flex flex-col", collapsed ? "w-[60px]" : "w-[220px]")}>
       <button className="p-4" onClick={() => setCollapsed(!collapsed)}>
         {collapsed ? <Menu size={20} /> : <X size={20} />}
       </button>
       <nav className="flex-1 mt-4">
         {items.map((item) => (
           <Link key={item.path} to={item.path} className={clsx("flex items-center p-4 hover:bg-[#3b82f6]/20 transition-colors", location.pathname === item.path && "bg-[#3b82f6]")}>
             <item.icon size={20} />
             {!collapsed && <span className="ml-4">{item.label}</span>}
           </Link>
         ))}
       </nav>
     </div>
   );
 };