 import React, { createContext, useContext, useState, useEffect } from 'react';
 import { useNavigate } from '@tanstack/react-router';
 
 interface User {
   token: string;
   username: string;
   role: string;
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
 
   useEffect(() => {
     const token = localStorage.getItem('access_token');
     const username = localStorage.getItem('username');
     const role = localStorage.getItem('role');
 
     if (token && username && role) {
       setUser({ token, username, role });
     }
   }, []);
   const [loading, setLoading] = useState(false);
   const navigate = useNavigate();
 
   const login = (data: any) => {
     localStorage.setItem('access_token', data.access_token);
     localStorage.setItem('refresh_token', data.refresh_token);
     localStorage.setItem('username', data.username);
     localStorage.setItem('role', data.role);
     setUser({ 
       token: data.access_token, 
       username: data.username, 
       role: data.role 
     });
 
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