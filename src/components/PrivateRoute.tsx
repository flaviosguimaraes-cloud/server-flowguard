 import React from 'react';
 import { Navigate } from '@tanstack/react-router';
 
 export const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
   const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
 
   if (!token) {
     return <Navigate to="/login" replace />;
   }
 
   return <>{children}</>;
 };