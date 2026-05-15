 import axios from 'axios';
 import { API_BASE } from '../config/api';
 
 const api = axios.axiosInstance({
   baseURL: API_BASE,
   timeout: 15000,
 });
 
 api.interceptors.request.use((config) => {
   const token = localStorage.getItem('access_token');
   if (token) {
     config.headers.Authorization = `Bearer ${token}`;
   }
   return config;
 });
 
 api.interceptors.response.use(
   (response) => response,
   (error) => {
     if (error.response?.status === 401) {
       localStorage.clear();
       window.location.href = '/login';
     }
     return Promise.reject(error);
   }
 );
 
 export default api;