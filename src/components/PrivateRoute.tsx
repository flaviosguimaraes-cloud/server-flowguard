 import React from 'react';
 import { Navigate } from '@tanstack/react-router';
 
 export const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const mustChange = typeof window !== 'undefined' ? localStorage.getItem('must_change_password') === 'true' : false;
 
   if (!token) {
     return <Navigate to="/login" replace />;
   }
 
  if (mustChange) {
    return <Navigate to="/change-password" search={{ mandatory: true }} replace />;
  }

   return <>{children}</>;
 };