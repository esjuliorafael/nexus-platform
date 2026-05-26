import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { 
  Building2, CreditCard, MessageCircle, Info, Zap, 
  Smartphone, QrCode, RefreshCw, LogOut, CheckCircle2,
  ShieldCheck, Layout, Save, X, AlertCircle, ChevronRight,
  Hash, User, Timer, LayoutGrid
} from 'lucide-react';
import { apiPayments, apiWhatsApp } from '../../../api';
import { SalesChannel, WhatsAppChannel } from '../../../types';
import { NexusInput, NexusSelect } from '../../ui/NexusInputs';
import { NexusButton } from '../../ui/NexusButton';
import { NexusSection } from '../../ui/NexusSection';
import { NexusHero } from '../../ui/NexusHero';

export interface ChannelFormRef {
  handleSubmit: () => void;
}

interface ChannelFormProps {
  onCancel: () => void;
  onSave: () => void;
  onValidationChange?: (isValid: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
}

type TabType = 'identity' | 'payments' | 'whatsapp';

const PURPOSE_INSTANCES: Record<string, string> = {
  'COMBAT': 'nexus_combate',
  'BREEDING': 'nexus_cria',
  'RAFFLES': 'nexus_rifas'
};

export const ChannelForm = forwardRef<ChannelFormRef, ChannelFormProps>(({ 
  onCancel, 
  onSave, 
  onValidationChange,
  showToast,
  setConfirmDialog
}, ref) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [generalData, setGeneralData] = useState({ name: '', purpose: '' });
  const [paymentData, setPaymentData] = useState({ bank: '', beneficiary: '', clabe: '', card: '' });
  const [whatsappData, setWhatsappData] = useState({ phone: '', active: true });

  // WhatsApp Connection State
  const [instanceStatus, setInstanceStatus] = useState<'open' | 'close' | 'connecting' | 'loading'>('close');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrData, setQRData] = useState<{ base64?: string, instanceName?: string, timeLeft?: number } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const RAFFLE_ENABLED = import.meta.env.VITE_RAFFLE_ENABLED === 'true';

  const isStep1Valid = useMemo(() => generalData.name.trim() !== '' && generalData.purpose !== '', [generalData]);
  const isStep2Valid = true; // Financials can be partial
  const isStep3Valid = useMemo(() => whatsappData.phone.trim() !== '', [whatsappData]);

  const isFormValid = isStep1Valid && isStep2Valid && isStep3Valid;

  useEffect(() => {
    onValidationChange?.(isFormValid);
  }, [isFormValid, onValidationChange]);

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

  const handleConnectWhatsApp = async () => {
    const instanceName = PURPOSE_INSTANCES[generalData.purpose.toUpperCase()];
    if (!instanceName) {
      showToast('Define el propósito primero', 'error');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Verificar Línea',
      message: `¿Deseas vincular ${whatsappData.phone || 'este canal'} con Evolution API?`,
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
          showToast('¡WhatsApp Vinculado!', 'success');
          setIsQRModalOpen(false);
          setQRData(null);
        }
      }, 3000);
    }
    return () => { clearInterval(timer); clearInterval(poll); };
  }, [isQRModalOpen, qrData?.instanceName]);

  const handleConnectMP = async () => {
    if (!isStep1Valid) {
      showToast('Completa la identidad primero', 'error');
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/mp/auth-url?channelId=${generalData.purpose}`);
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (error) {
      showToast('Error al conectar con Mercado Pago', 'error');
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Get global config to retrieve the tenant prefix
      const globalConfig = await apiSystem.getConfig();
      const prefix = globalConfig.whatsapp_evolution_instance || 'nexus';
      const purposeSuffix = generalData.purpose.toLowerCase();
      const instanceName = `${prefix}_${purposeSuffix === 'raffles' ? 'raffles' : purposeSuffix === 'breeding' ? 'breeding' : 'combat'}`;
      
      const payload = { ...generalData, ...paymentData, phone: whatsappData.phone, active: whatsappData.active, instanceName };
      
      await Promise.all([
        apiPayments.create(payload),
        apiWhatsApp.create(payload)
      ]);

      showToast('Canal configurado con éxito', 'success');
      onSave();
    } catch (error) {
      showToast('Error al crear canal. Verifica duplicados.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  useImperativeHandle(ref, () => ({
    handleSubmit
  }));

  const steps = [
    { id: 1, name: 'Identidad', icon: Layout, desc: 'Ubicación estructural' },
    { id: 2, name: 'Finanzas', icon: CreditCard, desc: 'Rutas de liquidación' },
    { id: 3, name: 'Conexión', icon: MessageCircle, desc: 'Motor Evolution API' }
  ];

  return (
    <div className="pb-32 relative animate-in fade-in duration-700">
      
      {/* CHANNEL SETUP HERO - USING STANDARD COMPONENT */}
      <NexusHero 
        title="Centro de Canales"
        subtitle={currentStep === 1 ? 'Identidad Estructural' : currentStep === 2 ? 'Ingeniería Financiera' : 'Motor de Mensajería'}
        icon={LayoutGrid}
        variant="dark"
        badge="Siguiente Paso"
        badgeValue={currentStep === 1 ? 'Finanzas' : currentStep === 2 ? 'WhatsApp' : 'Sincronizar'}
        className="mb-12"
      />

      <div className="space-y-12">
        {/* STEP 1: IDENTITY */}
        {/* STEP 1: IDENTITY */}
        {currentStep === 1 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-700">
            <NexusSection
              title="Cimientos del Canal"
              subtitle="Definición estructural y propósito de negocio"
              icon={Layout}
              iconVariant="brand"
            >
              <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <NexusInput 
                    label="Nombre del Departamento" 
                    value={generalData.name} 
                    onChange={(e) => setGeneralData({ ...generalData, name: e.target.value })} 
                    placeholder="Ej. Combate, Cría..." 
                    icon={Building2}
                  />
                  <NexusSelect 
                    label="Propósito Estructural" 
                    value={generalData.purpose} 
                    onChange={(e) => setGeneralData({ ...generalData, purpose: e.target.value })}
                  >
                    <option value="">Seleccionar propósito...</option>
                    <option value="COMBAT">Combate</option>
                    <option value="BREEDING">Cría</option>
                    {RAFFLE_ENABLED && <option value="RAFFLES">Rifas</option>}
                  </NexusSelect>
                </div>

                <div className="bg-brand-50/50 border border-brand-100 p-6 rounded-[2rem] sm:rounded-2xl flex flex-col md:flex-row gap-6 items-center md:items-start group hover:bg-brand-50 transition-colors duration-500 relative overflow-hidden">
                  {/* Matching NexusCard Mesh */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.015] dark:opacity-[0.03]" 
                       style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                  
                  <div className="relative z-10 w-12 h-12 rounded-xl bg-white border border-brand-100 flex items-center justify-center text-brand-500 shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-500">
                    <ShieldCheck size={24} />
                  </div>
                  <p className="relative z-10 text-secondary text-brand-900 italic leading-relaxed text-center md:text-left">
                    Asegúrate de que el propósito sea el correcto. Una vez creado, este vínculo técnico es de solo lectura para garantizar la integridad de los datos operativos y financieros.
                  </p>
                </div>
              </div>
            </NexusSection>

            <div className="flex justify-center pt-12">
              <NexusButton onClick={() => setCurrentStep(2)} disabled={!isStep1Valid} size="lg" className="px-16 h-16 rounded-[1.5rem] shadow-xl shadow-brand-500/10">
                Configurar Ingeniería Financiera
              </NexusButton>
            </div>
          </div>
        )}

        {/* STEP 2: FINANCES */}
        {currentStep === 2 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-700">
            <NexusSection
              title="Rutas de Liquidación"
              subtitle="Gestión de capital y pasarelas de pago"
              icon={CreditCard}
              iconVariant="blue"
            >
              <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10">
                    <NexusInput label="Banco Receptor" value={paymentData.bank} onChange={(e) => setPaymentData({ ...paymentData, bank: e.target.value })} icon={Building2} placeholder="Ej. BBVA" />
                    <NexusInput label="Titular de Cuenta" value={paymentData.beneficiary} onChange={(e) => setPaymentData({ ...paymentData, beneficiary: e.target.value })} icon={User} placeholder="Nombre completo" />
                    <NexusInput label="CLABE Interbancaria" value={paymentData.clabe} onChange={(e) => setPaymentData({ ...paymentData, clabe: e.target.value })} icon={Hash} placeholder="18 dígitos" />
                    <NexusInput label="Número de Tarjeta" value={paymentData.card} onChange={(e) => setPaymentData({ ...paymentData, card: e.target.value })} icon={CreditCard} placeholder="16 dígitos" />
                </div>

                <div className="pt-12 border-t border-border-main">
                    <div className="flex items-center gap-6 mb-10">
                      <div className="w-16 h-16 rounded-[2rem] bg-blue-500 text-white flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-3">
                        <Zap size={32} />
                      </div>
                      <div className="text-left">
                        <h4 className="text-h2 text-text-main">Vincular Mercado Pago</h4>
                        <p className="text-label text-text-muted mt-1 uppercase tracking-widest">Cobros automatizados para este canal</p>
                      </div>
                    </div>
                    
                    <NexusButton 
                      onClick={handleConnectMP} 
                      className="w-full h-20 bg-blue-600 shadow-2xl shadow-blue-900/30 hover:bg-blue-700 text-white text-secondary rounded-[1.5rem]" 
                      icon={CreditCard}
                    >
                      Abrir Autorización de Pasarela
                    </NexusButton>
                </div>
              </div>
            </NexusSection>

            <div className="flex justify-between items-center pt-12 px-2">
              <NexusButton variant="secondary" onClick={() => setCurrentStep(1)} className="px-10 h-16 rounded-[1.5rem]">Atrás</NexusButton>
              <NexusButton onClick={() => setCurrentStep(3)} size="lg" className="px-16 h-16 rounded-[1.5rem] shadow-xl shadow-brand-500/10">
                Siguiente: WhatsApp
              </NexusButton>
            </div>
          </div>
        )}

        {/* STEP 3: WHATSAPP */}
        {currentStep === 3 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-700">
            <NexusSection
              title="Motor de Mensajería"
              subtitle="Configuración de Evolution API y notificaciones"
              icon={MessageCircle}
              iconVariant="emerald"
            >
              <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                  <NexusInput 
                      label="Línea de WhatsApp" 
                      value={whatsappData.phone} 
                      onChange={(e) => setWhatsappData({ ...whatsappData, phone: e.target.value })} 
                      icon={Smartphone} 
                      placeholder="Ej. 521..." 
                      helperText="Número con código de país (521 para MX)."
                    />

                    <div className="space-y-6">
                      <p className="text-label text-text-muted ml-1 uppercase tracking-widest">Hardware de Conexión</p>
                      <div className="flex items-center gap-4 h-16">
                        <NexusButton 
                          isLoading={isConnecting}
                          onClick={handleConnectWhatsApp}
                          className="flex-1 bg-emerald-600 shadow-2xl shadow-emerald-900/20 hover:bg-emerald-700 text-white rounded-[1.2rem] h-full" 
                          icon={QrCode}
                        >
                          Generar Código QR
                        </NexusButton>
                        <NexusButton 
                          variant="secondary" 
                          size="icon" 
                          className="w-16 h-16 rounded-[1.2rem] bg-bg-muted border-border-main" 
                          icon={RefreshCw} 
                          onClick={() => {
                            const name = PURPOSE_INSTANCES[generalData.purpose.toUpperCase()];
                            if (name) checkInstanceStatus(name);
                          }}
                        />
                      </div>
                    </div>
                </div>

                <div className="bg-bg-muted/50 p-10 rounded-[3rem] border border-border-main flex items-center justify-between group hover:border-emerald-200 transition-all duration-700">
                    <div className="flex items-center gap-6">
                      <div className={`w-4 h-4 rounded-full transition-all duration-1000 ${instanceStatus === 'open' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-text-muted/20'}`} />
                      <div>
                        <p className="text-secondary font-black text-text-main">Vínculo con Evolution API</p>
                        <p className={`text-label mt-1 uppercase tracking-widest ${instanceStatus === 'open' ? 'text-emerald-600' : 'text-text-muted'}`}>
                          {instanceStatus === 'open' ? 'Canal en Línea' : 'Pendiente de Escaneo'}
                        </p>
                      </div>
                    </div>
                    {instanceStatus === 'open' && (
                      <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl animate-in zoom-in duration-500">
                        <CheckCircle2 size={20} />
                        <span className="text-[10px] font-black uppercase">Vinculado</span>
                      </div>
                    )}
                </div>
              </div>
            </NexusSection>

            <div className="flex justify-between items-center pt-12 px-2">
              <NexusButton variant="secondary" onClick={() => setCurrentStep(2)} className="px-10 h-16 rounded-[1.5rem]">Atrás</NexusButton>
              <div className="flex flex-col items-end gap-2">
                 <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] mr-1">Finalizar configuración</p>
                 <NexusButton onClick={handleSubmit} isLoading={isSubmitting} disabled={!isFormValid} size="lg" className="px-20 h-16 rounded-[1.5rem] shadow-2xl shadow-brand-900/20" icon={Save}>
                   Sincronizar Canal
                 </NexusButton>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QR MODAL (Nested for focus) */}
      {isQRModalOpen && qrData && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-stone-950/95 backdrop-blur-2xl" />
          <div className="relative w-full max-w-md bg-bg-card rounded-[4rem] shadow-2xl p-16 text-center animate-in zoom-in-95 duration-500 border border-white/5">
             <div className="w-20 h-20 bg-brand-500 rounded-3xl mx-auto mb-10 flex items-center justify-center text-white shadow-2xl shadow-brand-500/20 rotate-6">
                <QrCode size={40} />
             </div>
             <h3 className="text-display text-text-main mb-4 leading-tight">Emparejamiento</h3>
             <p className="text-secondary text-text-muted mb-12">Escanea este código desde la app de WhatsApp para activar la automatización.</p>
             
             <div className="p-10 bg-white rounded-[3.5rem] inline-block border-8 border-bg-muted shadow-inner relative group transition-transform duration-700 hover:scale-[1.02]">
                {qrData.timeLeft === 0 ? (
                  <div className="w-[240px] h-[240px] flex flex-col items-center justify-center gap-6">
                     <AlertCircle size={56} className="text-amber-500 animate-bounce" />
                     <NexusButton onClick={handleConnectWhatsApp} size="sm">Regenerar</NexusButton>
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
             
             <NexusButton onClick={() => setIsQRModalOpen(false)} variant="secondary" className="mt-16 w-full h-16 rounded-[1.5rem]">Cerrar</NexusButton>
          </div>
        </div>
      )}
    </div>
  );
});
