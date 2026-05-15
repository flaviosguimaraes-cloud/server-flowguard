 import axios from 'axios';
 import { API_BASE } from '../config/api';
 
 const api = axios.create({
   baseURL: API_BASE,
   timeout: 15000,
 });
 
 api.interceptors.request.use((config) => {
   const token = localStorage.getItem('access_token');
   if (token) {
     config.headers.Authorization = `Bearer ${token}`;
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
   (response) => {
     console.log('API Response:',
       response.config.url,
       response.status,
       'dados:', JSON.stringify(
         response.data).substring(0, 100));
     return response;
   },
   (error) => {
     console.error('API Error:',
       error.config?.url,
       error.response?.status,
       error.response?.data);
     if (error.response?.status === 401) {
       localStorage.clear();
       window.location.href = '/login';
     }
     return Promise.reject(error);
   }
 );
 
 export default api;