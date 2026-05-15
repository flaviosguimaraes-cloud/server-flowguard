 import React, { createContext, useContext, useState, useEffect } from 'react';
 import { useNavigate } from '@tanstack/react-router';
 
 interface User {
   username: string;
   role: 'admin' | 'reader';
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
   const [user, setUser] = useState<User | null>(null);
   const [loading, setLoading] = useState(true);
   const navigate = useNavigate({ from: '/' });
 
   useEffect(() => {
      console.log('AuthProvider useEffect starting');
     const username = localStorage.getItem('username');
     const role = localStorage.getItem('role') as 'admin' | 'reader';
     const token = localStorage.getItem('access_token');
 
     if (token && username && role) {
       setUser({ username, role });
     }
      console.log('AuthProvider setting loading to false');
     setLoading(false);
   }, []);
 
   const login = (data: any) => {
     localStorage.setItem('access_token', data.access_token);
     localStorage.setItem('refresh_token', data.refresh_token);
     localStorage.setItem('username', data.username);
     localStorage.setItem('role', data.role);
     setUser({ username: data.username, role: data.role });
 
     if (data.must_change_password) {
       navigate({ to: '/change-password' });
     } else {
       navigate({ to: '/dashboard' });
     }
   };
 
   const logout = () => {
     localStorage.clear();
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