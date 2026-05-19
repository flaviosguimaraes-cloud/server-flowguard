 import axios from 'axios';
 import { API_BASE } from '../config/api';
 
 const api = axios.create({
   baseURL: API_BASE,
   timeout: 15000,
 });
 
 api.interceptors.request.use(config => {
   const token = localStorage.getItem('access_token');
   
   // Check if it's a login or public endpoint
   const isAuthEndpoint = config.url?.includes('/login');
 
   if (!token && !isAuthEndpoint) {
     // Cancelar request se não logado
     throw new axios.Cancel('No token available');
   }
 
   if (token) {
     config.headers.Authorization = `Bearer ${token}`;
   }
   
   return config;
 });
 
 api.interceptors.response.use(
   response => response,
   error => {
     if (axios.isCancel(error)) {
       return Promise.reject(error);
     }
     
     if (error.response?.status === 401) {
       const isAuthEndpoint = error.config?.url?.includes('/login');
       if (!isAuthEndpoint) {
         localStorage.removeItem('access_token');
         localStorage.removeItem('refresh_token');
         localStorage.removeItem('username');
         localStorage.removeItem('role');
         window.location.href = '/login';
       }
     }
     
     return Promise.reject(error);
   }
 );
 
 export default api;