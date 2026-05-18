import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
 import { useTranslation } from '../hooks/useTranslation';
 import api from '../services/api';
 import { toast } from 'sonner';
import { Shield, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { clsx } from 'clsx';
 
 export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
   const [newPassword, setNewPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
   const { t } = useTranslation();
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
       return;
     }
    if (newPassword.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    setIsLoading(true);
     try {
      await api.post('/api/auth/change-password', { 
        old_password: oldPassword, 
        new_password: newPassword 
      });
      toast.success('Senha alterada com sucesso');
      navigate({ to: '/dashboard' });
     } catch (error) {
      toast.error('Falha ao alterar senha. Verifique a senha atual.');
    } finally {
      setIsLoading(false);
     }
   };
 
   return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-bg-secondary p-8 rounded-2xl shadow-xl border border-border relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-xl mb-4">
            <Lock className="text-primary" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Alterar Senha</h1>
          <p className="text-text-secondary text-sm mt-1">Por segurança, você precisa alterar sua senha inicial.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="oldPassword">Senha Atual</Label>
            <Input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button 
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrength password={newPassword} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <Button className="w-full mt-6 py-6 text-base font-bold" disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Alterar Senha e Acessar'}
          </Button>
        </form>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  let label = 'Fraca';
  let color = 'bg-destructive';
  
  if (score >= 4) {
    label = 'Forte';
    color = 'bg-success';
  } else if (score >= 2) {
    label = 'Média';
    color = 'bg-amber-500';
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[10px] font-bold uppercase">
        <span className="text-text-secondary">Força da senha</span>
        <span className={clsx(
          label === 'Forte' ? "text-success" : 
          label === 'Média' ? "text-amber-500" : "text-destructive"
        )}>{label}</span>
      </div>
      <div className="h-1 w-full bg-bg-primary rounded-full overflow-hidden">
        <div 
          className={clsx("h-full transition-all duration-300", color)} 
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>
     </div>
   );
 }