import { useState } from 'react';
import api from '../services/api';
import { toast } from 'sonner';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { clsx } from 'clsx';

export function ChangeOwnPasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        current_password: oldPassword, 
        new_password: newPassword 
      });
      toast.success('Senha alterada com sucesso');
      onClose();
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(`Erro: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Alterar Minha Senha</DialogTitle>
          <DialogDescription>
            Informe sua senha atual e a nova senha desejada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Senha Atual</Label>
            <Input 
              type="password"
              value={oldPassword} 
              onChange={e => setOldPassword(e.target.value)} 
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Nova Senha</Label>
            <div className="relative">
              <Input 
                type={showPassword ? 'text' : 'password'}
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
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
            <Label>Confirmar Nova Senha</Label>
            <Input 
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              required
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Alterando...' : 'Alterar Senha'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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