 import React, { createContext, useContext, useState } from 'react';
 import { useNavigate } from '@tanstack/react-router';
 import { useQueryClient } from '@tanstack/react-query';
 
 interface User {
   token: string;
   username: string;
   role: string;
  email?: string;
  must_change_password?: boolean;
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
  
      const mustChange = localStorage.getItem('must_change_password') === 'true';

      if (token && username && role) {
        return { token, username, role, email: email || undefined, must_change_password: mustChange };
      }
     return null;
   });
   const [loading, setLoading] = useState(false);
   const navigate = useNavigate();
   const queryClient = useQueryClient();
 
   const login = (data: any) => {
     localStorage.setItem('access_token', data.access_token);
     localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);
      if (data.email) localStorage.setItem('email', data.email);
      localStorage.setItem('must_change_password', data.must_change_password ? 'true' : 'false');
      setUser({ 
        token: data.access_token, 
        username: data.username, 
        role: data.role,
        email: data.email,
        must_change_password: !!data.must_change_password
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
       // 1. Limpar storage primeiro (dados de sessão)
       localStorage.removeItem('access_token');
       localStorage.removeItem('refresh_token');
       localStorage.removeItem('username');
       localStorage.removeItem('role');
        localStorage.removeItem('email');
        localStorage.removeItem('must_change_password');
       
       // 2. Cancelar queries pendentes e limpar cache
       queryClient.cancelQueries();
       queryClient.clear();
       
       // 3. Atualizar estado e redirecionar imediatamente
       setUser(null);
       navigate({ to: '/login', replace: true });
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