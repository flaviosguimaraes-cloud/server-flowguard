
function MitigationProfileModal({ isOpen, onClose, data, onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    fnm_threshold_mbps: '',
    fnm_threshold_pps: '',
    fnm_threshold_flows: 3500,
    ban_for_bandwidth: true,
    ban_for_pps: true,
    ban_for_flows: false,
    action: 'global',
    fs_type: 'both',
    fs_action: 'drop',
    fs_rate_kbps: '',
    fs_ttl_minutes: 2,
    fs_direction: 'both',
    fs_src_mode: 'attacker',
  });

  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name || '',
        description: data.description || '',
        fnm_threshold_mbps: data.fnm_threshold_mbps || '',
        fnm_threshold_pps: data.fnm_threshold_pps || '',
        fnm_threshold_flows: data.fnm_threshold_flows ?? 3500,
        ban_for_bandwidth: data.ban_for_bandwidth ?? true,
        ban_for_pps: data.ban_for_pps ?? true,
        ban_for_flows: data.ban_for_flows ?? false,
        action: data.action || 'global',
        fs_type: data.fs_type || 'both',
        fs_action: data.fs_action || 'drop',
        fs_rate_kbps: data.fs_rate_kbps || '',
        fs_ttl_minutes: data.fs_ttl_minutes ?? 2,
        fs_direction: data.fs_direction || 'both',
        fs_src_mode: data.fs_src_mode || 'attacker',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        fnm_threshold_mbps: '',
        fnm_threshold_pps: '',
        fnm_threshold_flows: 3500,
        ban_for_bandwidth: true,
        ban_for_pps: true,
        ban_for_flows: false,
        action: 'global',
        fs_type: 'both',
        fs_action: 'drop',
        fs_rate_kbps: '',
        fs_ttl_minutes: 2,
        fs_direction: 'both',
        fs_src_mode: 'attacker',
      });
    }
  }, [data, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData };
    payload.fnm_threshold_mbps = payload.fnm_threshold_mbps ? Number(payload.fnm_threshold_mbps) : null;
    payload.fnm_threshold_pps = payload.fnm_threshold_pps ? Number(payload.fnm_threshold_pps) : null;
    payload.fnm_threshold_flows = payload.fnm_threshold_flows ? Number(payload.fnm_threshold_flows) : null;
    payload.fs_rate_kbps = payload.fs_rate_kbps ? Number(payload.fs_rate_kbps) : null;
    payload.fs_ttl_minutes = Number(payload.fs_ttl_minutes);
    onSubmit(payload);
  };

  const showFlowSpec = formData.action === 'flowspec' || formData.action === 'blackhole_flowspec';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data ? 'Editar Perfil' : 'Novo Perfil'}</DialogTitle>
          <DialogDescription>Configure as regras de detecção e mitigação para este perfil.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {/* Seção 1 — Identificação */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Perfil</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                placeholder="Ex: Alta Performance"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                value={formData.description} 
                onChange={e => setFormData({ ...formData, description: e.target.value })} 
                placeholder="Descreva este perfil..."
                className="h-20"
              />
            </div>
          </div>

          <hr className="border-border" />

          {/* Seção 2 — Configuração de Detecção */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text-primary">Configuração de Detecção</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Threshold Mbps</Label>
                <Input 
                  type="number"
                  disabled={!formData.ban_for_bandwidth}
                  value={formData.fnm_threshold_mbps} 
                  onChange={e => setFormData({ ...formData, fnm_threshold_mbps: e.target.value })} 
                  placeholder="Padrão global (1000)"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Threshold PPS</Label>
                <Input 
                  type="number"
                  disabled={!formData.ban_for_pps}
                  value={formData.fnm_threshold_pps} 
                  onChange={e => setFormData({ ...formData, fnm_threshold_pps: e.target.value })} 
                  placeholder="Padrão global (100000)"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Threshold Flows</Label>
                <Input 
                  type="number"
                  disabled={!formData.ban_for_flows}
                  value={formData.fnm_threshold_flows} 
                  onChange={e => setFormData({ ...formData, fnm_threshold_flows: e.target.value })} 
                  placeholder="3500"
                />
              </div>
            </div>

            <div className="flex gap-6 p-4 bg-bg-primary rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={formData.ban_for_bandwidth} 
                  onCheckedChange={c => setFormData({ ...formData, ban_for_bandwidth: c })}
                />
                <Label className="text-sm">Banda</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={formData.ban_for_pps} 
                  onCheckedChange={c => setFormData({ ...formData, ban_for_pps: c })}
                />
                <Label className="text-sm">PPS</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={formData.ban_for_flows} 
                  onCheckedChange={c => setFormData({ ...formData, ban_for_flows: c })}
                />
                <Label className="text-sm">Flows</Label>
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Seção 3 — Ação ao Detectar */}
          <div className="space-y-4">
            <Label>Ação ao Detectar</Label>
            <Select 
              value={formData.action} 
              onValueChange={v => setFormData({ ...formData, action: v })}
            >
              <SelectTrigger className="bg-bg-primary h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Política Global</SelectItem>
                <SelectItem value="none">Sem Ação / Monitorar</SelectItem>
                <SelectItem value="flowspec">Apenas FlowSpec</SelectItem>
                <SelectItem value="blackhole">Blackhole</SelectItem>
                <SelectItem value="blackhole_flowspec">Blackhole + FlowSpec</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Seção 4 — Configuração FlowSpec */}
          {showFlowSpec && (
            <div className="space-y-4 p-5 bg-primary/5 rounded-xl border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <Zap size={16} /> Configuração FlowSpec
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Tipo de bloqueio</Label>
                  <Select value={formData.fs_type} onValueChange={v => setFormData({ ...formData, fs_type: v })}>
                    <SelectTrigger className="bg-bg-secondary"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="by_port">Por porta</SelectItem>
                      <SelectItem value="by_protocol">Por protocolo</SelectItem>
                      <SelectItem value="both">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Ação FlowSpec</Label>
                  <Select value={formData.fs_action} onValueChange={v => setFormData({ ...formData, fs_action: v })}>
                    <SelectTrigger className="bg-bg-secondary"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rate_limit">Rate-Limit</SelectItem>
                      <SelectItem value="drop">Descartar tudo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.fs_action === 'rate_limit' && (
                <div className="space-y-2 animate-in fade-in duration-300">
                  <Label className="text-xs">Rate-Limit (Kbps)</Label>
                  <Input 
                    type="number" 
                    value={formData.fs_rate_kbps} 
                    onChange={e => setFormData({ ...formData, fs_rate_kbps: e.target.value })}
                    placeholder="Ex: 1000"
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">TTL (minutos)</Label>
                  <Input 
                    type="number" 
                    value={formData.fs_ttl_minutes} 
                    onChange={e => setFormData({ ...formData, fs_ttl_minutes: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Direção</Label>
                  <Select value={formData.fs_direction} onValueChange={v => setFormData({ ...formData, fs_direction: v })}>
                    <SelectTrigger className="bg-bg-secondary"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incoming">Incoming</SelectItem>
                      <SelectItem value="outgoing">Outgoing</SelectItem>
                      <SelectItem value="both">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Origem</Label>
                  <Select value={formData.fs_src_mode} onValueChange={v => setFormData({ ...formData, fs_src_mode: v })}>
                    <SelectTrigger className="bg-bg-secondary"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attacker">Só IP atacante</SelectItem>
                      <SelectItem value="any">Qualquer origem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Salvando...' : 'Salvar Perfil'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
