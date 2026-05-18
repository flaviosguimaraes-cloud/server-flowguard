 import React, { createContext, useContext, useState, useEffect } from 'react';
 import { useNavigate } from '@tanstack/react-router';
 
 interface User {
   token: string;
   username: string;
   role: string;
  email?: string;
 }
 
 interface AuthContextType {
   user: User | null;
   login: (data: any) => void;
   logout: () => void;
   isAdmin: () => boolean;
   loading: boolean;
 }
 
 const AuthContext = createContext<AuthContextType | undefined>(undefined);
 
 export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
   const [user, setUser] = useState<User | null>(() => {
     if (typeof window === 'undefined') return null;
      const token = localStorage.getItem('access_token');
      const username = localStorage.getItem('username');
      const role = localStorage.getItem('role');
      const email = localStorage.getItem('email');
  
      if (token && username && role) {
        return { token, username, role, email: email || undefined };
      }
     return null;
   });
   const [loading, setLoading] = useState(false);
   const navigate = useNavigate();
 
   const login = (data: any) => {
     localStorage.setItem('access_token', data.access_token);
     localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);
      if (data.email) localStorage.setItem('email', data.email);
      setUser({ 
        token: data.access_token, 
        username: data.username, 
        role: data.role,
        email: data.email
      });
 
      if (data.must_change_password) {
        navigate({ 
          to: '/change-password', 
          search: { mandatory: true, username: data.username } as any
        });
      } else {
        navigate({ to: '/dashboard' });
      }
   };
 
    const logout = () => {
      // Apagar só dados de sessão
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
       localStorage.removeItem('username');
       localStorage.removeItem('role');
       localStorage.removeItem('email');
      
      // NÃO apagar preferências do usuário como:
      // theme, language, fg_collector, fg_ifaces, fg_traffic_source
      
      setUser(null);
      navigate({ to: '/login' });
    };
 
   const isAdmin = () => user?.role === 'admin';
 
   return (
     <AuthContext.Provider value={{ user, login, logout, isAdmin, loading }}>
       {children}
     </AuthContext.Provider>
   );
 };
 
 export const useAuth = () => {
   const context = useContext(AuthContext);
   if (!context) throw new Error('useAuth must be used within AuthProvider');
   return context;
 };