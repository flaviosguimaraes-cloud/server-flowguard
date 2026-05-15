 import { useState } from 'react';
 import { useAuth } from '../contexts/AuthContext';
 import { useTranslation } from '../hooks/useTranslation';
 import api from '../services/api';
 import { toast } from 'sonner';
 
 export default function ChangePassword() {
   const [currentPassword, setCurrentPassword] = useState('');
   const [newPassword, setNewPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const { t } = useTranslation();
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (newPassword !== confirmPassword) {
       toast.error('Passwords do not match');
       return;
     }
     try {
       await api.post('/api/auth/change-password', { currentPassword, newPassword });
       toast.success('Password changed successfully');
     } catch (error) {
       toast.error('Failed to change password');
     }
   };
 
   return (
     <div className="max-w-md mx-auto bg-[#1e2130] p-8 rounded-xl border border-gray-800">
       <h2 className="text-2xl font-bold mb-6">Change Password</h2>
       <form onSubmit={handleSubmit} className="space-y-4">
         <div>
           <label className="block text-sm text-gray-400 mb-1">Current Password</label>
           <input
             type="password"
             className="w-full bg-[#0f1117] border border-gray-700 rounded-lg py-2 px-4 outline-none focus:border-[#3b82f6]"
             value={currentPassword}
             onChange={(e) => setCurrentPassword(e.target.value)}
           />
         </div>
         <div>
           <label className="block text-sm text-gray-400 mb-1">New Password</label>
           <input
             type="password"
             className="w-full bg-[#0f1117] border border-gray-700 rounded-lg py-2 px-4 outline-none focus:border-[#3b82f6]"
             value={newPassword}
             onChange={(e) => setNewPassword(e.target.value)}
           />
         </div>
         <div>
           <label className="block text-sm text-gray-400 mb-1">Confirm New Password</label>
           <input
             type="password"
             className="w-full bg-[#0f1117] border border-gray-700 rounded-lg py-2 px-4 outline-none focus:border-[#3b82f6]"
             value={confirmPassword}
             onChange={(e) => setConfirmPassword(e.target.value)}
           />
         </div>
         <button className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold py-2 rounded-lg transition-colors">
           {t('save')}
         </button>
       </form>
     </div>
   );
 }