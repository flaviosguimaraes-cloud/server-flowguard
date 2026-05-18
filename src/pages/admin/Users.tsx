import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { 
  Users as UsersIcon, Plus, Edit2, Key, Power, PowerOff, 
  User as UserIcon, Mail, Shield, Clock, Eye, EyeOff, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/Skeleton';
import { clsx } from 'clsx';

export default function Users() {
  const queryClient = useQueryClient();
  const currentUsername = localStorage.getItem('username');
  
  const [modal, setModal] = useState<{ open: boolean; mode: 'add' | 'edit' | 'password'; data?: any }>({
    open: false,
    mode: 'add'
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/api/users').then(r => r.data),
  });

  const items = Array.isArray(users) ? users : [];

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário criado com sucesso');
      setModal({ open: false, mode: 'add' });
    },
    onError: (err: any) => toast.error(`Erro: ${err.response?.data?.message || err.message}`)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário atualizado');
      setModal({ open: false, mode: 'add' });
    },
    onError: (err: any) => toast.error(`Erro: ${err.response?.data?.message || err.message}`)
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => api.put(`/api/users/${id}`, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Status do usuário atualizado');
    },
    onError: (err: any) => toast.error(`Erro: ${err.response?.data?.message || err.message}`)
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) => api.put(`/api/users/${id}`, { password }),
    onSuccess: () => {
      toast.success('Senha alterada com sucesso');
      setModal({ open: false, mode: 'add' });
    },
    onError: (err: any) => toast.error(`Erro: ${err.response?.data?.message || err.message}`)
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UsersIcon className="text-primary" size={24} />
          <h1 className="text-2xl font-bold text-text-primary">Gestão de Usuários</h1>
        </div>
        <Button onClick={() => setModal({ open: true, mode: 'add' })} className="gap-2">
          <Plus size={16} /> Novo Usuário
        </Button>
      </div>

      {isLoading ? (
        <Skeleton count={5} />
      ) : (
        <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-bg-primary/50">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-secondary">Usuário</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-secondary">Email</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-secondary">Perfil</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-secondary">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-secondary">Último acesso</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-secondary text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((user: any) => (
                  <tr key={user.id} className="hover:bg-bg-primary/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-text-primary">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-secondary text-sm">{user.email}</td>
                    <td className="px-6 py-4">
                      {user.role === 'admin' ? (
                        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Admin</Badge>
                      ) : (
                        <Badge variant="outline" className="text-text-secondary">Leitura</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.active ? (
                        <span className="flex items-center gap-1.5 text-success text-xs font-bold uppercase">
                          <div className="w-1.5 h-1.5 rounded-full bg-success" /> Ativo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-destructive text-xs font-bold uppercase">
                          <div className="w-1.5 h-1.5 rounded-full bg-destructive" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-text-secondary text-sm">
                      {user.last_login ? (
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} />
                          {user.last_login}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-text-secondary hover:text-primary"
                          onClick={() => setModal({ open: true, mode: 'edit', data: user })}
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-text-secondary hover:text-primary"
                          onClick={() => setModal({ open: true, mode: 'password', data: user })}
                        >
                          <Key size={14} />
                        </Button>
                        {user.username !== currentUsername && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={clsx("h-8 w-8", user.active ? "text-amber-500 hover:text-amber-600" : "text-success hover:text-success")}
                            onClick={() => toggleActiveMutation.mutate({ id: user.id, active: !user.active })}
                          >
                            {user.active ? <PowerOff size={14} /> : <Power size={14} />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <UserModal 
        isOpen={modal.open && (modal.mode === 'add' || modal.mode === 'edit')}
        onClose={() => setModal({ ...modal, open: false })}
        mode={modal.mode as 'add' | 'edit'}
        data={modal.data}
        onSubmit={(formData: any) => {
          if (modal.mode === 'add') createMutation.mutate(formData);
          else updateMutation.mutate({ id: modal.data.id, data: formData });
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <PasswordModal 
        isOpen={modal.open && modal.mode === 'password'}
        onClose={() => setModal({ ...modal, open: false })}
        user={modal.data}
        onSubmit={(password: string) => changePasswordMutation.mutate({ id: modal.data.id, password })}
        isLoading={changePasswordMutation.isPending}
      />
    </div>
  );
}

function UserModal({ isOpen, onClose, mode, data, onSubmit, isLoading }: any) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [active, setActive] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && data) {
      setUsername(data.username);
      setEmail(data.email);
      setRole(data.role);
      setActive(data.active);
      setMustChangePassword(data.must_change_password);
    } else {
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setRole('viewer');
      setActive(true);
      setMustChangePassword(true);
    }
  }, [mode, data, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'add') {
      if (password !== confirmPassword) {
        toast.error('As senhas não coincidem');
        return;
      }
      if (password.length < 8) {
        toast.error('A senha deve ter pelo menos 8 caracteres');
        return;
      }
      onSubmit({ username, email, password, role, must_change_password: mustChangePassword });
    } else {
      onSubmit({ email, role, active, must_change_password: mustChangePassword });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Novo Usuário' : 'Editar Usuário'}</DialogTitle>
          <DialogDescription>
            {mode === 'add' ? 'Preencha os dados para criar um novo acesso.' : 'Altere as informações do usuário.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Nome de usuário</Label>
            <Input 
              id="username" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="operador01"
              disabled={mode === 'edit'}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="exemplo@empresa.com"
              required
            />
          </div>

          {mode === 'add' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'}
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
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
                <PasswordStrength password={password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar senha</Label>
                <Input 
                  id="confirm" 
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Perfil</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin — acesso total</SelectItem>
                <SelectItem value="viewer">Leitura — somente visualização</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Troca de senha obrigatória</Label>
                <p className="text-[10px] text-text-secondary">Forçar troca no primeiro acesso</p>
              </div>
              <Switch checked={mustChangePassword} onCheckedChange={setMustChangePassword} />
            </div>

            {mode === 'edit' && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ativo</Label>
                  <p className="text-[10px] text-text-secondary">Habilitar ou desabilitar acesso</p>
                </div>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordModal({ isOpen, onClose, user, onSubmit, isLoading }: any) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (password.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres');
      return;
    }
    onSubmit(password);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Trocar Senha</DialogTitle>
          <DialogDescription>
            Alterando senha de <strong>{user?.username}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <div className="relative">
              <Input 
                type={showPassword ? 'text' : 'password'}
                value={password} 
                onChange={e => setPassword(e.target.value)} 
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
            <PasswordStrength password={password} />
          </div>

          <div className="space-y-2">
            <Label>Confirmar nova senha</Label>
            <Input 
              type={showPassword ? 'text' : 'password'}
              value={confirm} 
              onChange={e => setConfirm(e.target.value)} 
              required
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Alterando...' : 'Trocar Senha'}
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