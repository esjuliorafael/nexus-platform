import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  CreditCard, 
  MessageCircle, 
  FileText, 
  User, 
  Building2, 
  Smartphone, 
  CheckCircle2, 
  Settings, 
  Info,
  QrCode,
  LogOut,
  RefreshCw,
  LayoutGrid,
  Hash,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Zap,
  ArrowLeft,
  Timer
} from 'lucide-react';
import { apiPayments, apiWhatsApp } from '../../../api';
import { SalesChannel, WhatsAppChannel } from '../../../types';
import { NexusSectionButton, NexusCardButton } from '../../ui/NexusButton';
import { NexusInput, NexusSelect, NexusTextarea } from '../../ui/NexusInputs';

interface ChannelEditorProps {
  id: string;
  onClose: () => void;
  onSave: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
}

type TabType = 'identity' | 'payments' | 'whatsapp' | 'messaging';

const PURPOSE_INSTANCES: Record<string, string> = {
  'COMBAT': 'nexus_combate',
  'BREEDING': 'nexus_cria',
  'RAFFLES': 'nexus_rifas'
};

export const ChannelEditor: React.FC<ChannelEditorProps> = ({ 
  id, 
  onClose, 
  onSave, 
  showToast, 
  setConfirmDialog 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('identity');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Raw DB objects
  const [paymentObj, setPaymentObj] = useState<SalesChannel | null>(null);
  const [whatsappObj, setWhatsappObj] = useState<WhatsAppChannel | null>(null);

  // Form States
  const [generalData, setGeneralData] = useState({ name: '', purpose: '' });
  const [paymentData, setPaymentData] = useState({ bank: '', beneficiary: '', clabe: '', card: '' });
  const [whatsappData, setWhatsappData] = useState({ phone: '', active: true, templates: [] as any[] });

  // WhatsApp Connection State
  const [instanceStatus, setInstanceStatus] = useState<'open' | 'close' | 'connecting' | 'loading'>('loading');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrData, setQRData] = useState<{ base64?: string, instanceName?: string, timeLeft?: number } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const RAFFLE_ENABLED = import.meta.env.VITE_RAFFLE_ENABLED === 'true';

  useEffect(() => {
    if (id) {
      loadChannelData();
    }
  }, [id]);

  const checkInstanceStatus = async (instanceName: string) => {
    setInstanceStatus('loading');
    try {
      const res = await apiWhatsApp.getStatus(instanceName);
      const state = res.data.instance.state;
      setInstanceStatus(state);
      return state;
    } catch (error) {
      setInstanceStatus('close');
      return 'close';
    }
  };

  const loadChannelData = async () => {
    setIsLoading(true);
    try {
      const [pRes, wRes] = await Promise.allSettled([
        apiPayments.getAll(),
        apiWhatsApp.getAll()
      ]);

      let foundName = '';

      if (pRes.status === 'fulfilled') {
        const p = pRes.value.find((c: any) => c.id === id || c.purpose === id);
        if (p) {
          setPaymentObj(p);
          setGeneralData({ name: p.name, purpose: p.purpose });
          setPaymentData({ bank: p.bank, beneficiary: p.beneficiary, clabe: p.clabe, card: p.card });
          foundName = p.name;
        }
      }

      if (wRes.status === 'fulfilled') {
        const w = wRes.value.find((c: any) => c.id === id || c.purpose === id);
        if (w) {
          setWhatsappObj(w);
          setWhatsappData({ phone: w.phone, active: w.active, templates: w.templates || [] });
          if (!foundName) setGeneralData({ name: w.name, purpose: w.purpose });
          
          const instanceName = PURPOSE_INSTANCES[w.purpose.toUpperCase()] || w.instanceName;
          if (instanceName) checkInstanceStatus(instanceName);
        }
      }
    } catch (error) {
      showToast('Error al cargar datos del canal', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generalData.name || !generalData.purpose) {
      showToast('Nombre y propósito son obligatorios', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const instanceName = PURPOSE_INSTANCES[generalData.purpose.toUpperCase()];
      
      const paymentPayload = { ...generalData, ...paymentData };
      const whatsappPayload = { ...generalData, phone: whatsappData.phone, active: whatsappData.active, instanceName };

      const promises = [];
      if (paymentObj) promises.push(apiPayments.update(paymentObj.id, paymentPayload));
      else promises.push(apiPayments.create(paymentPayload));

      if (whatsappObj) promises.push(apiWhatsApp.update(whatsappObj.id, whatsappPayload));
      else promises.push(apiWhatsApp.create(whatsappPayload));

      await Promise.all(promises);
      showToast('Cambios sincronizados correctamente', 'success');
      onSave();
    } catch (error) {
      showToast('Error al actualizar departamento', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectWhatsApp = async () => {
    const instanceName = PURPOSE_INSTANCES[generalData.purpose.toUpperCase()];
    if (!instanceName) {
      showToast('Define el propósito primero', 'error');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Vincular Dispositivo',
      message: `¿Deseas generar el código de vinculación para ${whatsappData.phone || 'este canal'}?`,
      confirmLabel: 'Generar QR',
      variant: 'brand',
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false });
        setIsConnecting(true);
        try {
          const res = await apiWhatsApp.getQR(instanceName);
          if (res.data.base64) {
            setQRData({ base64: res.data.base64, instanceName, timeLeft: 40 });
            setIsQRModalOpen(true);
          }
        } catch (error) {
          showToast('Error al generar QR', 'error');
        } finally {
          setIsConnecting(false);
        }
      }
    });
  };

  const handleDisconnectWhatsApp = async () => {
    const instanceName = PURPOSE_INSTANCES[generalData.purpose.toUpperCase()];
    setConfirmDialog({
      isOpen: true,
      title: '¿Desvincular Canal?',
      message: 'Esta acción cerrará la sesión de WhatsApp activa para este departamento.',
      confirmLabel: 'Sí, Desconectar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await apiWhatsApp.disconnect(instanceName);
          setInstanceStatus('close');
          showToast('Sesión cerrada correctamente');
        } catch (error) {
          showToast('Error al desvincular', 'error');
        }
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  useEffect(() => {
    let timer: any;
    let poll: any;
    if (isQRModalOpen && qrData?.instanceName) {
      timer = setInterval(() => {
        setQRData(prev => prev ? { ...prev, timeLeft: Math.max(0, (prev.timeLeft || 0) - 1) } : null);
      }, 1000);
      poll = setInterval(async () => {
        const state = await checkInstanceStatus(qrData.instanceName!);
        if (state === 'open') {
          showToast('¡Vínculo establecido!', 'success');
          setIsQRModalOpen(false);
          setQRData(null);
        }
      }, 3000);
    }
    return () => { clearInterval(timer); clearInterval(poll); };
  }, [isQRModalOpen, qrData?.instanceName]);

  const handleConnectMP = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/mp/auth-url?channelId=${id}`);
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (error) {
      showToast('Error al conectar con Mercado Pago', 'error');
    }
  };

  const [editingTemplate, setEditingTemplate] = useState<{ type: string, content: string } | null>(null);

  const handleOpenTemplateModal = (type: string) => {
    const existing = whatsappData.templates?.find(t => t.type.toUpperCase() === type.toUpperCase());
    setEditingTemplate({ type, content: existing?.content || '' });
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate || !whatsappObj) return;
    setIsSavingTemplate(true);
    try {
      await apiWhatsApp.saveTemplate(whatsappObj.id, {
        type: editingTemplate.type as any,
        content: editingTemplate.content
      });
      showToast('Plantilla actualizada', 'success');
      loadChannelData();
      setEditingTemplate(null);
    } catch (error) {
      showToast('Error al guardar plantilla', 'error');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const menuItems = [
    { id: 'identity', label: 'Identidad', icon: Settings, desc: 'Nombre y propósito' },
    { id: 'payments', label: 'Finanzas', icon: CreditCard, desc: 'Bancos y pasarelas' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, desc: 'Motor de mensajería' },
    { id: 'messaging', label: 'Templates', icon: FileText, desc: 'Respuestas automáticas' },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] animate-in fade-in duration-500">
         <div className="relative w-20 h-20 mb-8">
            <div className="absolute inset-0 border-4 border-brand-100 rounded-[2rem]" />
            <div className="absolute inset-0 border-4 border-brand-500 border-t-transparent rounded-[2rem] animate-spin" style={{ animationDuration: '1s', animationTimingFunction: 'var(--ease-emil)' }} />
         </div>
         <p className="text-label text-text-muted">Obteniendo parámetros del canal...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[800px] bg-bg-card rounded-[3rem] border border-border-main overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-700">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-border-main bg-bg-muted/30 flex flex-col">
        <div className="p-10 pb-6">
          <NexusSectionButton variant="ghost" size="sm" onClick={onClose} icon={ArrowLeft} className="mb-8 -ml-3 hover:bg-white">
            Volver al Hub
          </NexusSectionButton>
          <div className="w-16 h-16 rounded-3xl bg-stone-950 flex items-center justify-center text-white mb-6 shadow-2xl">
            <LayoutGrid size={32} />
          </div>
          <h3 className="text-h1 text-text-main leading-tight italic">
            Configurar Canal
          </h3>
          <p className="text-label text-text-muted mt-2">Administración Técnica</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 pb-10">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 p-5 rounded-[1.5rem] transition-all duration-500 group ${
                activeTab === item.id 
                ? 'bg-white shadow-xl shadow-stone-200/40 text-brand-600 scale-[1.02]' 
                : 'text-text-muted hover:bg-white/50 hover:text-text-main'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                activeTab === item.id ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20 rotate-0' : 'bg-bg-muted group-hover:bg-white text-text-muted rotate-3'
              }`}>
                <item.icon size={22} />
              </div>
              <div className="text-left">
                <p className="text-secondary font-black leading-none">{item.label}</p>
                <p className="text-[10px] font-medium opacity-60 mt-1.5 uppercase tracking-wider">{item.desc}</p>
              </div>
              {activeTab === item.id && <ChevronRight size={18} className="ml-auto animate-in slide-in-from-left-2 duration-300" />}
            </button>
          ))}
        </nav>

        <div className="p-10 border-t border-border-main bg-bg-muted/50 hidden md:block">
           <div className="flex items-center gap-4 text-emerald-500">
              <ShieldCheck size={20} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Entorno Protegido</span>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-bg-card relative min-h-0">
        <div className="flex-1 overflow-y-auto p-8 md:p-16 custom-scrollbar">
          
          {activeTab === 'identity' && (
            <div className="max-w-2xl space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-4">
                <h2 className="text-display text-text-main">Identidad Operativa</h2>
                <p className="text-secondary text-text-muted">Ajusta el nombre público y el propósito estructural del departamento.</p>
              </div>
              
              <div className="grid grid-cols-1 gap-10">
                <NexusInput 
                  label="Nombre del Departamento" 
                  value={generalData.name} 
                  onChange={(e) => setGeneralData({ ...generalData, name: e.target.value })} 
                  placeholder="Ej. Combate, Cría, Rifas..." 
                  icon={Building2}
                />
                <NexusSelect 
                  label="Propósito Estructural" 
                  value={generalData.purpose} 
                  onChange={(e) => setGeneralData({ ...generalData, purpose: e.target.value })}
                  disabled={true}
                >
                  <option value="">Seleccionar propósito...</option>
                  <option value="COMBAT">Combate (Arena)</option>
                  <option value="BREEDING">Cría (Granja)</option>
                  {RAFFLE_ENABLED && <option value="RAFFLES">Rifas (Sorteos)</option>}
                </NexusSelect>
              </div>
              
              <div className="bg-bg-muted p-10 rounded-[3rem] border border-border-main flex gap-6 items-start group hover:border-brand-200 transition-colors duration-500">
                <div className="w-12 h-12 rounded-2xl bg-white border border-border-main flex items-center justify-center text-brand-500 shadow-sm group-hover:scale-110 transition-transform duration-500">
                  <Info size={24} />
                </div>
                <p className="text-secondary text-text-muted italic leading-relaxed pt-1">
                  El propósito no puede modificarse una vez establecido para mantener la integridad de los registros vinculados en la base de datos.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="max-w-3xl space-y-16 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-4">
                <h2 className="text-display text-text-main">Finanzas</h2>
                <p className="text-secondary text-text-muted">Administra las cuentas de recepción y la integración con Mercado Pago.</p>
              </div>

              <div className="space-y-10">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
                      <Building2 size={20} />
                   </div>
                   <h4 className="text-h2 text-text-main italic">Cuenta Bancaria</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10">
                  <NexusInput label="Banco" value={paymentData.bank} onChange={(e) => setPaymentData({ ...paymentData, bank: e.target.value })} icon={Building2} placeholder="Ej. BBVA" />
                  <NexusInput label="Beneficiario" value={paymentData.beneficiary} onChange={(e) => setPaymentData({ ...paymentData, beneficiary: e.target.value })} icon={User} placeholder="Nombre completo" />
                  <NexusInput label="CLABE" value={paymentData.clabe} onChange={(e) => setPaymentData({ ...paymentData, clabe: e.target.value })} icon={Hash} placeholder="18 dígitos" />
                  <NexusInput label="Tarjeta" value={paymentData.card} onChange={(e) => setPaymentData({ ...paymentData, card: e.target.value })} icon={CreditCard} placeholder="16 dígitos" />
                </div>
              </div>
              
              <div className="pt-16 border-t border-border-main">
                <div className="flex items-center gap-6 mb-12">
                  <div className="w-16 h-16 rounded-[2rem] bg-blue-500 text-white flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-3">
                    <Zap size={32} />
                  </div>
                  <div>
                    <h4 className="text-h2 text-text-main">Pasarela Automatizada</h4>
                    <p className="text-label text-text-muted mt-1 uppercase tracking-widest">Estado de la vinculación con Mercado Pago</p>
                  </div>
                </div>
                
                {paymentObj?.mpAccessToken ? (
                  <div className="flex items-center justify-between bg-emerald-50/50 border border-emerald-100 p-8 rounded-[2.5rem] group hover:bg-emerald-50 transition-all duration-500">
                    <div className="flex items-center gap-6 text-emerald-700">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/20">
                        <CheckCircle2 size={28} />
                      </div>
                      <div>
                        <p className="text-secondary font-black leading-none">Canal Vinculado</p>
                        <p className="text-label mt-2 opacity-60">ID DE USUARIO: {paymentObj.mpUserId}</p>
                      </div>
                    </div>
                    <NexusCardButton variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50 rounded-2xl px-6">Desvincular</NexusCardButton>
                  </div>
                ) : (
                  <NexusSectionButton 
                    onClick={handleConnectMP} 
                    className="w-full h-20 bg-blue-600 shadow-2xl shadow-blue-900/30 hover:bg-blue-700 text-white text-secondary rounded-[1.5rem]" 
                    icon={CreditCard}
                  >
                    Vincular Mercado Pago
                  </NexusSectionButton>
                )}
              </div>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="max-w-3xl space-y-16 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-4">
                <h2 className="text-display text-text-main">Automatización WA</h2>
                <p className="text-secondary text-text-muted">Controla la conexión de la línea y el estado del motor de mensajería.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <NexusInput 
                  label="Línea Activa" 
                  value={whatsappData.phone} 
                  onChange={(e) => setWhatsappData({ ...whatsappData, phone: e.target.value })} 
                  icon={Smartphone} 
                  placeholder="Ej. 521..." 
                />
                
                <div className="space-y-4">
                  <label className="text-label text-text-muted ml-1">Vínculo Evolution API</label>
                  <div className="flex items-center gap-4 h-14">
                    {instanceStatus === 'open' ? (
                      <NexusCardButton 
                        variant="outline" 
                        onClick={handleDisconnectWhatsApp} 
                        className="flex-1 bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100 rounded-2xl" 
                        icon={LogOut}
                      >
                        Desconectar
                      </NexusCardButton>
                    ) : (
                      <NexusCardButton 
                        isLoading={isConnecting}
                        onClick={handleConnectWhatsApp}
                        className="flex-1 bg-emerald-600 shadow-2xl shadow-emerald-900/20 hover:bg-emerald-700 text-white rounded-2xl" 
                        icon={QrCode}
                      >
                        Re-vincular QR
                      </NexusCardButton>
                    )}
                    <NexusCardButton 
                      variant="secondary" 
                      size="icon" 
                      className="w-14 h-14 rounded-2xl" 
                      icon={RefreshCw} 
                      onClick={() => {
                        const name = PURPOSE_INSTANCES[generalData.purpose.toUpperCase()];
                        if (name) checkInstanceStatus(name);
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-bg-muted p-10 rounded-[3rem] border border-border-main flex items-center justify-between group hover:border-brand-200 transition-all duration-500">
                <div className="flex items-center gap-6">
                  <div className={`w-4 h-4 rounded-full transition-all duration-1000 ${instanceStatus === 'open' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-text-muted/30'}`} />
                  <div>
                    <p className="text-secondary font-black text-text-main">Servicio de Notificaciones</p>
                    <p className="text-label text-text-muted mt-1 uppercase tracking-widest">{whatsappData.active ? 'Habilitado' : 'En Pausa'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setWhatsappData({ ...whatsappData, active: !whatsappData.active })}
                  className={`w-16 h-8 rounded-full transition-all relative active:scale-90 ${whatsappData.active ? 'bg-brand-500 shadow-lg shadow-brand-500/20' : 'bg-stone-300'}`}
                >
                  <div className={`absolute top-1.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${whatsappData.active ? 'left-9' : 'left-1.5'}`} />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'messaging' && (
            <div className="max-w-3xl space-y-16 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-4">
                <h2 className="text-display text-text-main">Gestión de Plantillas</h2>
                <p className="text-secondary text-text-muted">Configura los mensajes que tus clientes reciben automáticamente.</p>
              </div>

               {!whatsappObj ? (
                 <div className="py-32 text-center bg-bg-muted rounded-[3rem] border border-dashed border-border-main animate-in zoom-in-95 duration-700">
                    <AlertCircle size={56} className="mx-auto text-text-muted/10 mb-8" />
                    <p className="text-h2 text-text-muted italic max-w-xs mx-auto">Error de sincronización de WhatsApp. Contacta a soporte.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                      { type: 'RESERVATION', label: 'Nuevo Apartado', icon: Timer },
                      { type: 'RELEASE', label: 'Liberación', icon: LogOut },
                      { type: 'PAYMENT_CONFIRMED', label: 'Pago Confirmado', icon: CheckCircle2 }
                    ].map(tpl => {
                      const hasTemplate = whatsappData.templates?.some(t => t.type === tpl.type);
                      return (
                        <button 
                          key={tpl.type}
                          onClick={() => handleOpenTemplateModal(tpl.type)}
                          className={`flex flex-col items-start gap-8 p-10 rounded-[3rem] border transition-all duration-500 group active:scale-95 text-left ${
                            hasTemplate 
                            ? 'bg-white border-brand-200 shadow-2xl shadow-brand-500/5' 
                            : 'bg-bg-muted border-border-main hover:border-brand-200 hover:bg-white'
                          }`}
                        >
                          <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-500 ${hasTemplate ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/20 rotate-0' : 'bg-white border border-border-main text-text-muted rotate-6'}`}>
                            <tpl.icon size={28} />
                          </div>
                          <div className="space-y-2">
                            <span className="text-secondary font-black text-text-main leading-tight block">
                              {tpl.label}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${hasTemplate ? 'text-emerald-500' : 'text-text-muted/40'}`}>
                              {hasTemplate ? 'Configurado' : 'Sin definir'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                 </div>
               )}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <footer className="p-8 md:p-12 border-t border-border-main bg-white/60 backdrop-blur-xl flex gap-6 shrink-0 relative z-20">
          <NexusSectionButton variant="secondary" onClick={onClose} className="flex-1 h-16 rounded-[1.5rem]">Cancelar</NexusSectionButton>
          <NexusSectionButton 
            onClick={handleSave} 
            isLoading={isSaving} 
            className="flex-[2] h-16 shadow-2xl shadow-brand-900/10 rounded-[1.5rem] text-secondary font-black" 
            icon={Save}
          >
            Sincronizar Cambios
          </NexusSectionButton>
        </footer>
      </main>

      {/* Nested Overlays */}
      {editingTemplate && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-xl" onClick={() => setEditingTemplate(null)} />
           <div className="relative w-full max-w-2xl bg-bg-card rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/10">
              <div className="p-12 md:p-16">
                 <div className="flex items-center justify-between mb-12">
                    <div>
                      <h4 className="text-display text-text-main leading-none">Editor de Plantilla</h4>
                      <p className="text-label text-brand-500 mt-4 uppercase tracking-[0.2em]">{editingTemplate.type}</p>
                    </div>
                    <button onClick={() => setEditingTemplate(null)} className="p-4 bg-bg-muted hover:bg-stone-200 rounded-2xl text-text-muted transition-all"><X size={24} /></button>
                 </div>
                 <NexusTextarea 
                    label="Script Automático" 
                    value={editingTemplate.content} 
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })} 
                    rows={10}
                    className="text-secondary leading-relaxed"
                    placeholder="Escribe el mensaje que recibirá el cliente..."
                 />
                 <div className="flex gap-4 mt-12">
                    <NexusCardButton variant="secondary" onClick={() => setEditingTemplate(null)} className="flex-1 h-14">Descartar</NexusCardButton>
                    <NexusCardButton onClick={handleSaveTemplate} isLoading={isSavingTemplate} className="flex-1 h-14" icon={Save}>Guardar Script</NexusCardButton>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isQRModalOpen && qrData && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-stone-950/95 backdrop-blur-2xl" />
          <div className="relative w-full max-w-md bg-bg-card rounded-[4rem] shadow-2xl p-16 text-center animate-in zoom-in-95 duration-500 border border-white/5">
             <div className="w-20 h-20 bg-brand-500 rounded-3xl mx-auto mb-10 flex items-center justify-center text-white shadow-2xl shadow-brand-500/20 rotate-6">
                <QrCode size={40} />
             </div>
             <h3 className="text-display text-text-main mb-4 leading-tight">Sincronización</h3>
             <p className="text-secondary text-text-muted mb-12">Escanea este código desde la app de WhatsApp para activar este canal.</p>
             
             <div className="p-10 bg-white rounded-[3.5rem] inline-block border-8 border-bg-muted shadow-inner relative group transition-transform duration-700 hover:scale-[1.02]">
                {qrData.timeLeft === 0 ? (
                  <div className="w-[240px] h-[240px] flex flex-col items-center justify-center gap-6">
                     <AlertCircle size={56} className="text-amber-500 animate-bounce" />
                     <NexusCardButton onClick={handleConnectWhatsApp} size="sm">Regenerar Código</NexusCardButton>
                  </div>
                ) : (
                  <>
                    <img src={qrData.base64} alt="QR" className="w-[240px] h-[240px] rounded-[1.5rem]" />
                    <div className="absolute -top-6 -right-6 w-16 h-16 bg-stone-950 text-white rounded-full flex items-center justify-center text-h2 font-black tabular-nums border-8 border-bg-card shadow-2xl">
                      {qrData.timeLeft}
                    </div>
                  </>
                )}
             </div>
             
             <div className="mt-12 flex items-center justify-center gap-4 text-emerald-500 bg-emerald-50/50 py-4 px-8 rounded-full inline-flex">
                <div className="w-2.5 h-2.5 rounded-full bg-current animate-pulse shadow-[0_0_10px_currentColor]" />
                <p className="text-label font-black">Esperando dispositivo...</p>
             </div>
             
             <NexusSectionButton onClick={() => setIsQRModalOpen(false)} variant="secondary" className="mt-16 w-full h-16 rounded-[1.5rem]">Finalizar</NexusSectionButton>
          </div>
        </div>
      )}
    </div>
  );
};
