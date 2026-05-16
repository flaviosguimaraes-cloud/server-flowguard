 import axios from 'axios';
 import { API_BASE } from '../config/api';
 
 const api = axios.create({
   baseURL: API_BASE,
   timeout: 15000,
 });
 
 api.interceptors.request.use((config) => {
   const isLoginEndpoint =
     config.url?.includes('/auth/login') ||
     config.url?.includes('/auth/refresh');
 
   if (!isLoginEndpoint) {
     const token =
       localStorage.getItem('access_token');
     if (token) {
       config.headers.Authorization =
         `Bearer ${token}`;
     }
   }
 
   console.log('API Request:',
     config.method?.toUpperCase(),
     config.url,
     'Token:',
     config.headers.Authorization
       ? 'presente' : 'AUSENTE');
   return config;
 });
 
 api.interceptors.response.use(
   (response) => response,
   async (error) => {
     const originalRequest = error.config;
 
     // Ignorar erros de login e refresh
     const isAuthEndpoint =
       originalRequest?.url?.includes('/auth/login')
       || originalRequest?.url?.includes(
         '/auth/refresh');
 
     if (error.response?.status === 401
         && !isAuthEndpoint
         && !originalRequest?._retry) {
 
       originalRequest._retry = true;
 
       // Tentar refresh token antes de deslogar
       const refreshToken =
         localStorage.getItem('refresh_token');
 
       if (refreshToken) {
         try {
           const response = await api.post(
             '/api/auth/refresh',
             { refresh_token: refreshToken },
             { headers: {
               'Content-Type': 'application/json'
             }}
           );
           const newToken =
             response.data.access_token;
           localStorage.setItem(
             'access_token', newToken);
           originalRequest.headers.Authorization =
             `Bearer ${newToken}`;
           return api(originalRequest);
          } catch (refreshError) {
            // Refresh falhou — aí sim desloga
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('username');
            localStorage.removeItem('role');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        } else {
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