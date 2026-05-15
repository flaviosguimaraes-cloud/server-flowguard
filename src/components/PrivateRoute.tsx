 import React from 'react';
 import { Navigate } from '@tanstack/react-router';
 
 export const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
   const token = localStorage.getItem('access_token');
 
   if (!token) {
     return <Navigate to="/login" replace />;
   }
 
   return <>{children}</>;
 };