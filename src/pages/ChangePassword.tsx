 import { useState } from 'react';
 import { useNavigate, useSearch } from '@tanstack/react-router';
 import { useTranslation } from '../hooks/useTranslation';
 import api from '../services/api';
 import { toast } from 'sonner';
import { Shield, Lock, Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { clsx } from 'clsx';
 
  export default function ChangePassword() {
    const search = useSearch({ from: '/change-password' }) as any;
    const mustChangeLocal = typeof window !== 'undefined' ? localStorage.getItem('must_change_password') === 'true' : false;
    const mandatory = search.mandatory === true || search.mandatory === 'true' || mustChangeLocal;
    
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
        const payload: any = { new_password: newPassword };
        if (!mandatory) {
          payload.current_password = oldPassword;
        }

        await api.post('/api/auth/change-password', payload);
        toast.success(mandatory ? '✅ Senha definida com sucesso' : 'Senha alterada com sucesso');
        
        if (mandatory) {
          localStorage.removeItem('must_change_password');
        }
        
        navigate({ to: '/dashboard', replace: true });
     } catch (error) {
       toast.error('Falha ao alterar senha. Verifique os dados informados.');
     } finally {
       setIsLoading(false);
     }
   };
 
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 transition-colors">
      <div className="max-w-md w-full bg-bg-secondary p-10 rounded-2xl shadow-xl border border-border transition-all duration-300 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-primary/10 rounded-xl mb-6 border border-primary/10">
            {mandatory ? (
              <ShieldCheck className="text-primary" size={40} />
            ) : (
              <Lock className="text-primary" size={40} />
            )}
          </div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-1">FlowGuard</h1>
          <p className="text-text-secondary font-bold text-[10px] uppercase tracking-widest opacity-60 mb-8">Network Intelligence & DDoS Mitigation</p>

          <h2 className="text-xl font-bold text-text-primary tracking-tight">
            {mandatory ? 'Defina sua senha' : 'Alterar senha'}
          </h2>
          <p className="text-text-secondary text-xs mt-2">
            {mandatory
              ? 'Por segurança, defina uma senha pessoal antes de continuar.'
              : 'Preencha os campos abaixo para atualizar sua senha.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
           {!mandatory && (
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
           )}

          <div className="space-y-2">
             <Label htmlFor="newPassword" title="Nova senha">Nova senha</Label>
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
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
             <Input
               id="confirmPassword"
               type={showPassword ? 'text' : 'password'}
               value={confirmPassword}
               onChange={(e) => setConfirmPassword(e.target.value)}
               required
             />
           </div>
 
           <PasswordStrength password={newPassword} />

          <Button
            className="w-full mt-6 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 rounded-lg transition-all shadow-md shadow-primary/10 active:scale-[0.98] flex items-center justify-center disabled:opacity-70 uppercase tracking-wider text-xs"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : mandatory ? (
              'Definir senha e entrar'
            ) : (
              'Alterar senha'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  
  let label = 'Fraca';
  let colorClass = 'text-destructive';
  let score = 1; // 1, 2, or 3
  
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  
  if (password.length >= 12 && hasSpecial) {
    label = 'Forte';
    colorClass = 'text-success';
    score = 3;
  } else if (password.length >= 8) {
    label = 'Média';
    colorClass = 'text-amber-500';
    score = 2;
  } else {
    label = 'Fraca';
    colorClass = 'text-destructive';
    score = 1;
  }

  const blocks = '█'.repeat(score * 2) + '░'.repeat((3 - score) * 2);

  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-[10px] font-bold text-text-secondary uppercase">Força:</span>
      <span className={clsx("text-xs font-mono", colorClass)}>
        {blocks}
      </span>
      <span className={clsx("text-[10px] font-bold uppercase ml-auto", colorClass)}>
        {label}
      </span>
    </div>
  );
}