import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  Edit2,
  FileText,
  Hash,
  Info,
  Link as LinkIcon,
  LogOut,
  MessageCircle,
  Phone,
  QrCode,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  Ticket,
  User,
  WalletCards,
} from 'lucide-react';
import { apiPayments, apiSystem, apiWhatsApp } from '../../../api';
import { SalesChannel, WhatsAppChannel } from '../../../types';
import { NexusSectionButton, NexusCardButton } from '../../ui/NexusButton';
import { NexusInput, NexusSelect, NexusTextarea } from '../../ui/NexusInputs';
import { NexusHero } from '../../ui/NexusHero';
import { NexusSection } from '../../ui/NexusSection';
import { NexusAutonomousCard } from '../../ui/NexusCard';
import { NexusHeader } from '../../ui/NexusHeader';
import { NexusModal } from '../../ui/NexusModal';

interface ChannelEditorProps {
  id: string;
  onClose: () => void;
  onSave: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
}

type ModalType = 'identity' | 'bank' | 'mercadopago' | 'whatsapp' | 'templates' | null;

const PURPOSE_INSTANCES: Record<string, string> = {
  COMBAT: 'nexus_combate',
  BREEDING: 'nexus_cria',
  RAFFLES: 'nexus_rifas',
};

const PURPOSE_LABELS: Record<string, string> = {
  COMBAT: 'Canal de Combate',
  BREEDING: 'Canal de Cria',
  RAFFLES: 'Canal de Rifas',
};

const TEMPLATE_GROUPS = [
  {
    key: 'store',
    label: 'Tienda',
    description: 'Mensajes para apartados, pagos y liberaciones de ordenes.',
    templates: [
      {
        type: 'RESERVATION',
        label: 'Apartado de orden',
        globalKey: 'whatsapp_global_store_res',
        variables: ['{{greeting}}', '{{customerName}}', '{{orderId}}', '{{itemList}}', '{{amount}}', '{{bank_info}}', '{{time_store}}'],
        sample: '{{greeting}}, {{customerName}}. Tu orden #{{orderId}} fue apartada correctamente.\n\nProductos: {{itemList}}\nTotal: ${{amount}}\n\n{{bank_info}}\n\nTienes {{time_store}} para realizar tu pago.',
      },
      {
        type: 'PAYMENT_CONFIRMED',
        label: 'Pago confirmado',
        globalKey: 'whatsapp_global_store_pay',
        variables: ['{{customerName}}', '{{orderId}}', '{{itemList}}', '{{amount}}'],
        sample: 'Hola {{customerName}}, hemos confirmado el pago de tu orden #{{orderId}} por ${{amount}}. Tu pedido ya esta en proceso.',
      },
      {
        type: 'RELEASE',
        label: 'Liberacion de orden',
        globalKey: 'whatsapp_global_store_rel',
        variables: ['{{customerName}}', '{{orderId}}', '{{time_store}}'],
        sample: 'Hola {{customerName}}, tu orden #{{orderId}} fue liberada porque se supero el tiempo limite de pago de {{time_store}}.',
      },
    ],
  },
  {
    key: 'raffle',
    label: 'Rifas',
    description: 'Mensajes para boletos apartados, pagados o liberados.',
    templates: [
      {
        type: 'RESERVATION',
        label: 'Apartado de boletos',
        globalKey: 'whatsapp_global_raffle_res',
        variables: ['{{customerName}}', '{{ticket}}', '{{raffleName}}', '{{amount}}', '{{bank_info}}', '{{time_limit_raffle}}'],
        sample: 'Hola {{customerName}}, tus boletos {{ticket}} para la rifa "{{raffleName}}" fueron apartados.\nTotal: ${{amount}}\n\n{{bank_info}}\n\nTienes {{time_limit_raffle}} para realizar tu pago.',
      },
      {
        type: 'PAYMENT_CONFIRMED',
        label: 'Pago confirmado',
        globalKey: 'whatsapp_global_raffle_pay',
        variables: ['{{customerName}}', '{{ticket}}', '{{raffleName}}', '{{amount}}'],
        sample: 'Hola {{customerName}}, recibimos tu pago por los boletos {{ticket}} de la rifa "{{raffleName}}". Ya estas participando. Mucha suerte.',
      },
      {
        type: 'RELEASE',
        label: 'Liberacion de boletos',
        globalKey: 'whatsapp_global_raffle_rel',
        variables: ['{{customerName}}', '{{ticket}}', '{{raffleName}}', '{{time_limit_raffle}}'],
        sample: 'Hola {{customerName}}, tus boletos {{ticket}} para la rifa "{{raffleName}}" fueron liberados porque paso el limite de pago de {{time_limit_raffle}}.',
      },
    ],
  },
];

const StatusPill: React.FC<{ ready: boolean; label: string }> = ({ ready, label }) => (
  <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${
    ready
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : 'bg-bg-muted text-text-muted border-border-main'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${ready ? 'bg-emerald-500' : 'bg-text-muted/30'}`} />
    {label}
  </span>
);

const DetailCard: React.FC<{
  icon: React.ElementType;
  title: string;
  subtitle: string;
  ready: boolean;
  actionLabel: string;
  onAction: () => void;
  children: React.ReactNode;
}> = ({ icon: Icon, title, subtitle, ready, actionLabel, onAction, children }) => (
  <NexusAutonomousCard className="h-full">
    <NexusHeader
      title={title}
      subtitle={subtitle}
      icon={Icon}
      iconVariant={ready ? 'brand' : 'muted'}
      action={
        <NexusCardButton onClick={onAction} icon={Edit2} variant="secondary">
          {actionLabel}
        </NexusCardButton>
      }
    />
    <div className="space-y-5">
      <StatusPill ready={ready} label={ready ? 'Listo' : 'Usa principal'} />
      <div className="text-secondary text-text-muted leading-relaxed">
        {children}
      </div>
    </div>
  </NexusAutonomousCard>
);

const ModalShell: React.FC<{
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, subtitle, onClose, children }) => (
  <NexusModal isOpen title={title} subtitle={subtitle} onClose={onClose} maxWidth="2xl" zIndex={250}>
    {children}
  </NexusModal>
);

export const ChannelEditor: React.FC<ChannelEditorProps> = ({
  id,
  onClose,
  onSave,
  showToast,
  setConfirmDialog,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [globalConfig, setGlobalConfig] = useState<Record<string, string>>({});
  const [paymentObj, setPaymentObj] = useState<SalesChannel | null>(null);
  const [whatsappObj, setWhatsappObj] = useState<WhatsAppChannel | null>(null);
  const [generalData, setGeneralData] = useState({ name: '', purpose: '' });
  const [paymentData, setPaymentData] = useState({ bank: '', beneficiary: '', clabe: '', card: '' });
  const [whatsappData, setWhatsappData] = useState({ phone: '', active: true, templates: [] as any[] });
  const [instanceStatus, setInstanceStatus] = useState<'open' | 'close' | 'connecting' | 'loading'>('loading');
  const [qrData, setQRData] = useState<{ base64?: string; instanceName?: string; timeLeft?: number } | null>(null);
  const [templateDraft, setTemplateDraft] = useState<{
    type: string;
    label: string;
    content: string;
    variables: string[];
    sample: string;
    source: string;
  } | null>(null);

  const RAFFLE_ENABLED = import.meta.env.VITE_RAFFLE_ENABLED === 'true';

  const instanceName = useMemo(() => (
    PURPOSE_INSTANCES[generalData.purpose.toUpperCase()] || whatsappObj?.instanceName || ''
  ), [generalData.purpose, whatsappObj?.instanceName]);

  const checkInstanceStatus = async (name: string) => {
    if (!name) {
      setInstanceStatus('close');
      return 'close';
    }
    setInstanceStatus('loading');
    try {
      const res = await apiWhatsApp.getStatus(name);
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
      const [payments, whatsapp, settings] = await Promise.all([
        apiPayments.getAll(),
        apiWhatsApp.getAll(),
        apiSystem.getConfig(),
      ]);
      setGlobalConfig(settings);

      const payment = payments.find((c: any) => c.id === id || c.purpose === id) || null;
      const wa = whatsapp.find((c: any) => c.id === id || c.purpose === id || c.purpose === payment?.purpose) || null;

      setPaymentObj(payment);
      setWhatsappObj(wa);

      const name = payment?.name || wa?.name || '';
      const purpose = payment?.purpose || wa?.purpose || id;
      setGeneralData({ name, purpose });
      setPaymentData({
        bank: payment?.bank || '',
        beneficiary: payment?.beneficiary || '',
        clabe: payment?.clabe || '',
        card: payment?.card || '',
      });
      setWhatsappData({
        phone: wa?.phone || '',
        active: wa?.active ?? true,
        templates: wa?.templates || [],
      });

      await checkInstanceStatus(PURPOSE_INSTANCES[purpose?.toUpperCase?.()] || wa?.instanceName || '');
    } catch (error) {
      showToast('Error al cargar datos del canal', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadChannelData();
  }, [id]);

  useEffect(() => {
    let timer: any;
    let poll: any;
    if (qrData?.instanceName) {
      timer = setInterval(() => {
        setQRData(prev => prev ? { ...prev, timeLeft: Math.max(0, (prev.timeLeft || 0) - 1) } : null);
      }, 1000);
      poll = setInterval(async () => {
        const state = await checkInstanceStatus(qrData.instanceName!);
        if (state === 'open') {
          showToast('WhatsApp vinculado correctamente', 'success');
          setQRData(null);
        }
      }, 3000);
    }
    return () => {
      clearInterval(timer);
      clearInterval(poll);
    };
  }, [qrData?.instanceName]);

  const paymentReady = Boolean(paymentData.bank && paymentData.beneficiary);
  const mpReady = Boolean((paymentObj as any)?.mpAccessToken);
  const whatsappReady = Boolean(whatsappData.phone && whatsappData.active && instanceStatus === 'open');
  const visibleTemplateGroups = useMemo(() => {
    const purpose = generalData.purpose.toUpperCase();
    if (purpose === 'RAFFLES') return TEMPLATE_GROUPS.filter(group => group.key === 'raffle');
    if (purpose === 'COMBAT' || purpose === 'BREEDING') return TEMPLATE_GROUPS.filter(group => group.key === 'store');
    return TEMPLATE_GROUPS;
  }, [generalData.purpose]);
  const visibleTemplateTypes = visibleTemplateGroups.flatMap(group => group.templates.map(template => template.type));
  const templatesReady = visibleTemplateTypes.every(type => whatsappData.templates.some(template => template.type?.toUpperCase() === type));

  const saveIdentity = async () => {
    if (!generalData.name.trim() || !generalData.purpose) {
      showToast('Nombre y proposito son obligatorios', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const paymentPayload = { ...generalData, ...paymentData };
      const whatsappPayload = { ...generalData, phone: whatsappData.phone, active: whatsappData.active, instanceName };
      const tasks = [];
      if (paymentObj && paymentReady) tasks.push(apiPayments.update(paymentObj.id, paymentPayload));
      if (whatsappObj && whatsappData.phone) tasks.push(apiWhatsApp.update(whatsappObj.id, whatsappPayload));
      await Promise.all(tasks);
      showToast('Identidad del canal actualizada');
      setModal(null);
      loadChannelData();
      onSave();
    } catch (error) {
      showToast('No se pudo actualizar la identidad', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const saveBank = async () => {
    if (!paymentData.bank.trim() || !paymentData.beneficiary.trim()) {
      showToast('Banco y beneficiario son obligatorios', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const payload = { ...generalData, ...paymentData };
      if (paymentObj) await apiPayments.update(paymentObj.id, payload);
      else await apiPayments.create(payload);
      showToast('Informacion bancaria guardada');
      setModal(null);
      loadChannelData();
      onSave();
    } catch (error) {
      showToast('No se pudo guardar la informacion bancaria', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const saveWhatsApp = async (close = true) => {
    if (!whatsappData.phone.trim()) {
      showToast('El numero de WhatsApp es obligatorio', 'error');
      return false;
    }
    setIsSaving(true);
    try {
      const payload = { ...generalData, phone: whatsappData.phone, active: whatsappData.active, instanceName };
      if (whatsappObj) await apiWhatsApp.update(whatsappObj.id, payload);
      else await apiWhatsApp.create(payload);
      if (close) {
        showToast('Mensajeria actualizada');
        setModal(null);
      }
      await loadChannelData();
      onSave();
      return true;
    } catch (error) {
      showToast('No se pudo guardar la mensajeria', 'error');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const connectMercadoPago = async () => {
    if (!paymentObj?.id) {
      showToast('Guarda primero la informacion bancaria del canal', 'error');
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/mp/auth-url?channelId=${paymentObj.id}`);
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (error) {
      showToast('Error al conectar con Mercado Pago', 'error');
    }
  };

  const openQrFlow = async () => {
    if (!instanceName) {
      showToast('Este canal no tiene instancia asignada', 'error');
      return;
    }
    if (!whatsappData.phone.trim()) {
      showToast('Primero captura el numero de WhatsApp', 'error');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Confirmar linea de WhatsApp',
      message: `Se generara un QR para vincular el numero ${whatsappData.phone}. Verifica que sea el telefono fisico que escaneara el codigo.`,
      confirmLabel: 'Generar QR',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false });
        const saved = await saveWhatsApp(false);
        if (!saved) return;
        try {
          const res = await apiWhatsApp.getQR(instanceName);
          if (res.data.base64) {
            setQRData({ base64: res.data.base64, instanceName, timeLeft: 40 });
          }
        } catch (error) {
          showToast('Error al generar QR', 'error');
        }
      },
    });
  };

  const disconnectWhatsApp = async () => {
    if (!instanceName) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Desvincular WhatsApp',
      message: 'Se cerrara la sesion activa de Evolution API para este canal.',
      confirmLabel: 'Desvincular',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await apiWhatsApp.disconnect(instanceName);
          setInstanceStatus('close');
          showToast('WhatsApp desvinculado');
        } catch (error) {
          showToast('No se pudo desvincular WhatsApp', 'error');
        }
        setConfirmDialog({ isOpen: false });
      },
    });
  };

  const getTemplateMeta = (type: string, globalKey: string) => {
    const existing = whatsappData.templates.find(t => t.type?.toUpperCase() === type.toUpperCase());
    if (existing?.content) return { source: 'Canal', content: existing.content };
    if (globalConfig[globalKey]) return { source: 'Principal', content: globalConfig[globalKey] };
    return { source: 'Sin definir', content: '' };
  };

  const renderTemplatePreview = (content: string) => {
    const bankInfo = [
      'Banco: BBVA',
      'Beneficiario: Rancho Demo',
      'CLABE: 012345678901234567',
      'Tarjeta: 1234 5678 9012 3456',
    ].join('\n');

    return content
      .replace(/\{\{greeting\}\}/g, 'Buena tarde')
      .replace(/\{\{customerName\}\}/g, 'Carlos Ramirez')
      .replace(/\{\{orderId\}\}/g, '1284')
      .replace(/\{\{itemList\}\}/g, '1x Gallo colorado, 2x Alimento premium')
      .replace(/\{\{ticket\}\}/g, '018, 042, 119')
      .replace(/\{\{raffleName\}\}/g, 'Rifa Especial de Junio')
      .replace(/\{\{amount\}\}/g, '1,250.00')
      .replace(/\{\{bank_info\}\}/g, bankInfo)
      .replace(/\{\{time_store\}\}/g, '24 horas')
      .replace(/\{\{time_limit_raffle\}\}/g, '12 horas');
  };

  const openTemplate = (type: string, label: string, globalKey: string, variables: string[], sample: string) => {
    const existing = whatsappData.templates.find(t => t.type?.toUpperCase() === type.toUpperCase());
    const meta = getTemplateMeta(type, globalKey);
    setTemplateDraft({
      type,
      label,
      content: existing?.content || '',
      variables,
      sample,
      source: meta.source,
    });
  };

  const saveTemplate = async () => {
    if (!templateDraft || !whatsappObj) {
      showToast('Guarda primero la mensajeria del canal', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await apiWhatsApp.saveTemplate(whatsappObj.id, {
        type: templateDraft.type as any,
        content: templateDraft.content,
      });
      showToast('Plantilla guardada');
      setTemplateDraft(null);
      loadChannelData();
    } catch (error) {
      showToast('No se pudo guardar la plantilla', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-500">
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 border-4 border-brand-100 rounded-[2rem]" />
          <div className="absolute inset-0 border-4 border-brand-500 border-t-transparent rounded-[2rem] animate-spin" style={{ animationDuration: '1s', animationTimingFunction: 'var(--ease-emil)' }} />
        </div>
        <p className="text-label text-text-muted">Obteniendo parametros del canal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <NexusCardButton onClick={onClose} icon={ArrowLeft} variant="secondary">
          Volver
        </NexusCardButton>
        <div className="flex items-center gap-2">
          <StatusPill ready={paymentReady} label="Banco" />
          <StatusPill ready={mpReady} label="MP" />
          <StatusPill ready={whatsappReady} label="WA" />
          <StatusPill ready={templatesReady} label="Tpl" />
        </div>
      </div>

      <NexusHero
        title={PURPOSE_LABELS[generalData.purpose] || generalData.name || 'Canal'}
        subtitle="Ruta Especializada"
        icon={WalletCards}
        variant="dark"
        badge="Fallback"
        badgeValue="Principal"
      />

      <NexusSection
        title={generalData.name || PURPOSE_LABELS[generalData.purpose] || 'Canal operativo'}
        subtitle="Este canal sobrescribe al Canal Principal cuando el flujo coincide con su proposito"
        icon={ShieldCheck}
        iconVariant="brand"
        action={
          <NexusSectionButton onClick={() => setModal('identity')} icon={Edit2}>
            Editar Identidad
          </NexusSectionButton>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-bg-muted border border-border-main rounded-[1.5rem] p-5">
            <p className="text-label text-text-muted">Proposito</p>
            <p className="text-h2 text-text-main mt-2">{generalData.purpose}</p>
          </div>
          <div className="bg-bg-muted border border-border-main rounded-[1.5rem] p-5">
            <p className="text-label text-text-muted">Instancia</p>
            <p className="text-h2 text-text-main mt-2">{instanceName || 'Sin instancia'}</p>
          </div>
          <div className="bg-bg-muted border border-border-main rounded-[1.5rem] p-5">
            <p className="text-label text-text-muted">Estado WhatsApp</p>
            <p className="text-h2 text-text-main mt-2">{instanceStatus === 'open' ? 'Vinculado' : 'Desconectado'}</p>
          </div>
        </div>
      </NexusSection>

      <div className="grid grid-cols-1 xl:grid-cols-2" style={{ gap: 'var(--space-md)' }}>
        <DetailCard
          icon={Banknote}
          title="Informacion bancaria"
          subtitle="Datos enviados en apartados por deposito"
          ready={paymentReady}
          actionLabel="Editar"
          onAction={() => setModal('bank')}
        >
          {paymentReady ? (
            <div>
              <p className="text-text-main font-bold">{paymentData.bank}</p>
              <p>{paymentData.beneficiary}</p>
              <p className="tabular-nums">CLABE: {paymentData.clabe || 'Sin CLABE'}</p>
              <p className="tabular-nums">Tarjeta: {paymentData.card || 'Sin tarjeta'}</p>
            </div>
          ) : (
            <p>Si no completas estos datos, el flujo usara la informacion bancaria del Canal Principal.</p>
          )}
        </DetailCard>

        <DetailCard
          icon={CreditCard}
          title="Mercado Pago"
          subtitle="Pasarela de cobro automatizado"
          ready={mpReady}
          actionLabel={mpReady ? 'Ver' : 'Vincular'}
          onAction={() => setModal('mercadopago')}
        >
          {mpReady ? (
            <div>
              <p className="text-text-main font-bold">Cuenta vinculada</p>
              <p>Usuario MP: {(paymentObj as any)?.mpUserId || 'Sin identificador local'}</p>
            </div>
          ) : (
            <p>Si este canal no tiene cuenta vinculada, los cobros automatizados usaran la pasarela principal.</p>
          )}
        </DetailCard>

        <DetailCard
          icon={MessageCircle}
          title="Mensajeria WhatsApp"
          subtitle="Numero, instancia y vinculacion QR"
          ready={whatsappReady}
          actionLabel="Administrar"
          onAction={() => setModal('whatsapp')}
        >
          <div>
            <p className="text-text-main font-bold">{whatsappData.phone || 'Sin numero configurado'}</p>
            <p>{instanceName || 'Sin instancia asignada'}</p>
            <p>{whatsappData.active ? 'Notificaciones habilitadas' : 'Notificaciones desactivadas'}</p>
          </div>
        </DetailCard>

        <DetailCard
          icon={FileText}
          title="Plantillas"
          subtitle="Mensajes automaticos por evento"
          ready={templatesReady}
          actionLabel="Configurar"
          onAction={() => setModal('templates')}
        >
          <p>{whatsappData.templates.length} plantillas configuradas. Donde falte una plantilla, el sistema intentara usar la plantilla principal.</p>
        </DetailCard>
      </div>

      <NexusSection
        title="Comportamiento de Fallback"
        subtitle="Regla operativa para proteger cobros y mensajes"
        icon={Info}
        iconVariant="muted"
      >
        <p className="text-secondary text-text-muted leading-relaxed max-w-3xl">
          Si este canal no tiene banco, pasarela, WhatsApp o plantilla configurada, Nexus conserva el flujo usando el Canal Principal. Asi el cliente no pierde apartados, confirmaciones ni liberaciones por una configuracion incompleta del canal especializado.
        </p>
      </NexusSection>

      {modal === 'identity' && (
        <ModalShell title="Identidad del canal" subtitle="Edita el nombre visible. El proposito se mantiene estable para proteger historiales." onClose={() => setModal(null)}>
          <div className="space-y-6">
            <NexusInput label="Nombre del canal" value={generalData.name} onChange={(e) => setGeneralData({ ...generalData, name: e.target.value })} icon={Building2} />
            <NexusSelect label="Proposito" value={generalData.purpose} disabled>
              <option value="COMBAT">Combate</option>
              <option value="BREEDING">Cria</option>
              {RAFFLE_ENABLED && <option value="RAFFLES">Rifas</option>}
            </NexusSelect>
            <NexusSectionButton onClick={saveIdentity} isLoading={isSaving} icon={Save} className="w-full">
              Guardar Identidad
            </NexusSectionButton>
          </div>
        </ModalShell>
      )}

      {modal === 'bank' && (
        <ModalShell title="Informacion bancaria" subtitle="Estos datos se insertan en mensajes con la variable {{bank_info}}." onClose={() => setModal(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <NexusInput label="Banco" value={paymentData.bank} onChange={(e) => setPaymentData({ ...paymentData, bank: e.target.value })} icon={Building2} />
            <NexusInput label="Beneficiario" value={paymentData.beneficiary} onChange={(e) => setPaymentData({ ...paymentData, beneficiary: e.target.value })} icon={User} />
            <NexusInput label="CLABE" value={paymentData.clabe} onChange={(e) => setPaymentData({ ...paymentData, clabe: e.target.value })} icon={Hash} />
            <NexusInput label="No. tarjeta" value={paymentData.card} onChange={(e) => setPaymentData({ ...paymentData, card: e.target.value })} icon={CreditCard} />
            <NexusSectionButton onClick={saveBank} isLoading={isSaving} icon={Save} className="sm:col-span-2 w-full">
              Guardar Banco
            </NexusSectionButton>
          </div>
        </ModalShell>
      )}

      {modal === 'mercadopago' && (
        <ModalShell title="Mercado Pago" subtitle="Vincula una cuenta para cobros automatizados de este canal." onClose={() => setModal(null)}>
          <div className="space-y-6">
            <div className="bg-bg-muted border border-border-main rounded-[2rem] p-6 flex items-center gap-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${mpReady ? 'bg-emerald-500 text-white' : 'bg-bg-card text-text-muted border border-border-main'}`}>
                {mpReady ? <CheckCircle2 size={26} /> : <CreditCard size={26} />}
              </div>
              <div>
                <p className="text-h2 text-text-main">{mpReady ? 'Cuenta vinculada' : 'Sin pasarela vinculada'}</p>
                <p className="text-secondary text-text-muted">{mpReady ? `Usuario ${((paymentObj as any)?.mpUserId || 'sin id')}` : 'Mientras falte, se usara Mercado Pago Principal.'}</p>
              </div>
            </div>
            <NexusSectionButton onClick={connectMercadoPago} icon={LinkIcon} className="w-full">
              {mpReady ? 'Re-vincular Mercado Pago' : 'Vincular Mercado Pago'}
            </NexusSectionButton>
          </div>
        </ModalShell>
      )}

      {modal === 'whatsapp' && (
        <ModalShell title="Mensajeria WhatsApp" subtitle="Captura el numero antes de generar QR para evitar vincular el dispositivo equivocado." onClose={() => setModal(null)}>
          <div className="space-y-6">
            <NexusInput label="Numero de WhatsApp" value={whatsappData.phone} onChange={(e) => setWhatsappData({ ...whatsappData, phone: e.target.value })} icon={Smartphone} helperText="Incluye codigo de pais. Para Mexico suele iniciar con 521." />
            <div className="bg-bg-muted border border-border-main rounded-[2rem] p-6 flex items-center justify-between gap-5">
              <div>
                <p className="text-h2 text-text-main">Notificaciones</p>
                <p className="text-secondary text-text-muted">{whatsappData.active ? 'Canal habilitado para enviar mensajes' : 'Canal en pausa'}</p>
              </div>
              <button
                onClick={() => setWhatsappData({ ...whatsappData, active: !whatsappData.active })}
                className={`w-16 h-8 rounded-full transition-all relative active:scale-90 ${whatsappData.active ? 'bg-brand-500 shadow-lg shadow-brand-500/20' : 'bg-stone-300'}`}
              >
                <div className={`absolute top-1.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${whatsappData.active ? 'left-9' : 'left-1.5'}`} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <NexusCardButton onClick={() => saveWhatsApp(true)} isLoading={isSaving} icon={Save} className="sm:col-span-1">
                Guardar
              </NexusCardButton>
              <NexusCardButton onClick={openQrFlow} icon={QrCode} variant="success" className="sm:col-span-1">
                Vincular QR
              </NexusCardButton>
              <NexusCardButton onClick={() => checkInstanceStatus(instanceName)} icon={RefreshCw} variant="secondary" className="sm:col-span-1">
                Revisar
              </NexusCardButton>
            </div>
            {instanceStatus === 'open' && (
              <NexusSectionButton onClick={disconnectWhatsApp} icon={LogOut} variant="danger" className="w-full">
                Desvincular dispositivo
              </NexusSectionButton>
            )}
          </div>
        </ModalShell>
      )}

      {modal === 'templates' && (
        <ModalShell title="Plantillas del canal" subtitle="Configura mensajes por evento. Esta version conserva el modelo actual y muestra tienda/rifas como contexto de uso." onClose={() => setModal(null)}>
          <div className="space-y-8">
            {visibleTemplateGroups.map(group => (
              <div key={group.label} className="space-y-4">
                <div>
                  <h4 className="text-h2 text-text-main">{group.label}</h4>
                  <p className="text-secondary text-text-muted">{group.description}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {group.templates.map(template => {
                    const meta = getTemplateMeta(template.type, template.globalKey);
                    const exists = meta.source === 'Canal';
                    const hasFallback = meta.source === 'Principal';
                    const Icon = template.type === 'PAYMENT_CONFIRMED' ? CheckCircle2 : template.type === 'RELEASE' ? LogOut : Ticket;
                    return (
                      <button
                        key={`${group.label}-${template.type}`}
                        onClick={() => openTemplate(template.type, `${group.label}: ${template.label}`, template.globalKey, template.variables, template.sample)}
                        className="text-left border border-border-main bg-bg-muted hover:bg-bg-card transition-all rounded-[1.5rem] p-5 active:scale-[0.98]"
                      >
                        <div className="flex items-center justify-between gap-3 mb-5">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${exists ? 'bg-brand-500 text-white' : hasFallback ? 'bg-emerald-500 text-white' : 'bg-bg-card text-text-muted border border-border-main'}`}>
                            <Icon size={18} />
                          </div>
                          <StatusPill ready={exists || hasFallback} label={meta.source} />
                        </div>
                        <p className="text-secondary font-black text-text-main">{template.label}</p>
                        <p className="text-label text-text-muted/60 mt-2">{exists ? 'Sobrescribe al principal' : hasFallback ? 'Usa Canal Principal' : 'Usa default del sistema'}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ModalShell>
      )}

      {templateDraft && (
        <ModalShell title={templateDraft.label} subtitle={`Origen actual: ${templateDraft.source}. Al guardar, este canal usara su propia plantilla para este evento generico.`} onClose={() => setTemplateDraft(null)}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <NexusTextarea
                label="Mensaje del canal"
                rows={11}
                value={templateDraft.content}
                onChange={(e) => setTemplateDraft({ ...templateDraft, content: e.target.value })}
                placeholder={templateDraft.sample}
                helperText="Dejalo vacio si quieres seguir usando la plantilla principal o el default del sistema."
              />
              <div className="bg-bg-muted border border-border-main rounded-[2rem] p-5">
                <p className="text-label text-text-muted mb-3">Variables disponibles</p>
                <div className="flex flex-wrap gap-2">
                  {templateDraft.variables.map(variable => (
                    <span key={variable} className="px-3 py-1.5 rounded-full bg-bg-card border border-border-main text-label text-text-muted">{variable}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-bg-muted border border-border-main rounded-[2rem] p-6 flex flex-col">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <p className="text-label text-text-muted">Preview</p>
                  <p className="text-secondary text-text-main font-black">Mensaje de ejemplo</p>
                </div>
                <StatusPill ready={Boolean(templateDraft.content)} label={templateDraft.content ? 'Canal' : templateDraft.source} />
              </div>
              <div className="bg-bg-card border border-border-main rounded-[1.5rem] p-5 whitespace-pre-line text-secondary text-text-main leading-relaxed flex-1">
                {renderTemplatePreview(templateDraft.content || templateDraft.sample)}
              </div>
              <p className="text-label text-text-muted/60 mt-5">
                Nota: en esta fase, Tienda/Rifas comparten el tipo tecnico del evento. La separacion completa requiere migracion de plantillas contextuales.
              </p>
            </div>

            <NexusSectionButton onClick={saveTemplate} isLoading={isSaving} icon={Save} className="w-full lg:col-span-2">
              Guardar Plantilla del Canal
            </NexusSectionButton>
          </div>
        </ModalShell>
      )}

      {qrData && (
        <ModalShell title="Vinculacion por QR" subtitle="Escanea este codigo desde WhatsApp en el dispositivo confirmado." onClose={() => setQRData(null)}>
          <div className="text-center">
            <div className="p-8 bg-white rounded-[3rem] inline-block border-8 border-bg-muted shadow-inner relative">
              {qrData.timeLeft === 0 ? (
                <div className="w-[240px] h-[240px] flex items-center justify-center">
                  <NexusCardButton onClick={openQrFlow} icon={QrCode}>Regenerar QR</NexusCardButton>
                </div>
              ) : (
                <>
                  <img src={qrData.base64} alt="QR" className="w-[240px] h-[240px] rounded-[1.5rem]" />
                  <div className="absolute -top-5 -right-5 w-14 h-14 bg-stone-950 text-white rounded-full flex items-center justify-center text-h2 font-black tabular-nums border-4 border-bg-card">
                    {qrData.timeLeft}
                  </div>
                </>
              )}
            </div>
            <p className="text-label text-emerald-600 mt-8">Esperando dispositivo...</p>
          </div>
        </ModalShell>
      )}
    </div>
  );
};
