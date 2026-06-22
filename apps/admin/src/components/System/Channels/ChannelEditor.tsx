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
  Variable,
} from 'lucide-react';
import { apiPayments, apiSystem, apiWhatsApp } from '../../../api';
import { SalesChannel, WhatsAppChannel } from '../../../types';
import { NexusSectionButton, NexusCardButton, NexusAutonomousButton } from '../../ui/NexusButton';
import { NexusInput, NexusSelect, NexusTextarea } from '../../ui/NexusInputs';
import { NexusSection } from '../../ui/NexusSection';
import { NexusSectionCard } from '../../ui/NexusCard';
import { NexusModal } from '../../ui/NexusModal';

interface ChannelEditorProps {
  id: string;
  onClose: () => void;
  onSave: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
}

type ModalType = 'identity' | 'bank' | 'mercadopago' | 'whatsapp' | null;

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

  if (templateDraft) {
    return (
      <div className="space-y-8 pb-20 animate-in fade-in duration-300">
        <NexusCardButton onClick={() => setTemplateDraft(null)} variant="secondary" icon={ArrowLeft}>
          Volver a Plantillas
        </NexusCardButton>

        <NexusSection
          title={templateDraft.label}
          subtitle={`Origen actual: ${templateDraft.source}. Al guardar, este canal usara su propia plantilla para este evento.`}
          icon={FileText}
          iconVariant="brand"
          action={
            <NexusSectionButton onClick={saveTemplate} isLoading={isSaving} icon={Save}>
              Guardar Plantilla
            </NexusSectionButton>
          }
        >
          <div className="grid grid-cols-1 xl:grid-cols-2" style={{ gap: 'var(--space-lg)' }}>
            <div className="space-y-6">
              <NexusTextarea
                label="Mensaje del canal"
                rows={12}
                value={templateDraft.content}
                onChange={(e) => setTemplateDraft({ ...templateDraft, content: e.target.value })}
                placeholder={templateDraft.sample}
                helperText="Dejalo vacio si quieres seguir usando la plantilla principal o el default del sistema."
              />
              <div className="bg-bg-muted border border-border-main rounded-[2rem] p-5">
                <p className="text-label text-text-muted mb-3">Variables disponibles</p>
                <div className="flex flex-wrap gap-2">
                  {templateDraft.variables.map(variable => (
                    <span key={variable} className="px-3 py-1.5 rounded-full bg-bg-card border border-border-main text-label text-text-muted">
                      {variable}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <NexusSection title="Preview" subtitle="Ejemplo con datos simulados" icon={Variable} iconVariant="muted" animate={false}>
              <div className="bg-bg-muted border border-border-main rounded-[2rem] p-6 whitespace-pre-line text-secondary text-text-main leading-relaxed min-h-[20rem]">
                {renderTemplatePreview(templateDraft.content || templateDraft.sample)}
              </div>
              <p className="text-label text-text-muted/60 mt-5">
                Esta plantilla solo aplica a este canal especializado. Si falta, Nexus intenta usar el Canal Principal.
              </p>
            </NexusSection>
          </div>
        </NexusSection>
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

      <NexusSection
        title={generalData.name || PURPOSE_LABELS[generalData.purpose] || 'Canal Especializado'}
        subtitle="Este canal sobrescribe al Canal Principal cuando el flujo coincide con su proposito"
        icon={ShieldCheck}
        iconVariant="brand"
        action={
          <NexusSectionButton onClick={() => setModal('identity')} icon={Edit2}>
            Editar Identidad
          </NexusSectionButton>
        }
      >
        <div className="flex flex-col gap-5">
          <NexusSectionCard
            icon={Banknote}
            iconVariant={paymentReady ? 'emerald' : 'muted'}
            title="Informacion Bancaria"
            subtitle={paymentReady ? `${paymentData.bank} / ${paymentData.beneficiary}` : 'Usa la informacion bancaria del Canal Principal'}
            rightContent={<p className="text-label text-text-muted">{paymentReady ? 'Completado' : 'Parcial'}</p>}
            actions={<NexusCardButton onClick={() => setModal('bank')} icon={Edit2}>Configurar</NexusCardButton>}
          />
          <NexusSectionCard
            icon={CreditCard}
            iconVariant={mpReady ? 'blue' : 'muted'}
            title="Mercado Pago"
            subtitle={mpReady ? `Cuenta vinculada ${((paymentObj as any)?.mpUserId || '')}` : 'Usa Mercado Pago Principal si no se vincula una cuenta'}
            rightContent={<p className="text-label text-text-muted">{mpReady ? 'Vinculado' : 'Fallback'}</p>}
            actions={<NexusCardButton onClick={() => setModal('mercadopago')} icon={Edit2}>Configurar</NexusCardButton>}
          />
          <NexusSectionCard
            icon={MessageCircle}
            iconVariant={whatsappReady ? 'emerald' : 'muted'}
            title="Mensajeria WhatsApp"
            subtitle={whatsappData.phone || 'Numero de WhatsApp pendiente'}
            rightContent={<p className="text-label text-text-muted">{whatsappReady ? 'Vinculado' : 'Parcial'}</p>}
            actions={<NexusCardButton onClick={() => setModal('whatsapp')} icon={Edit2}>Configurar</NexusCardButton>}
          />
        </div>
      </NexusSection>

      <NexusSection
        title="Plantillas del Canal"
        subtitle="Mensajes especializados para este proposito. Si falta una, se usa Canal Principal."
        icon={FileText}
        iconVariant={templatesReady ? 'brand' : 'muted'}
      >
        <div className="flex flex-col gap-8">
          {visibleTemplateGroups.map(group => (
            <div key={group.label} className="space-y-4">
              <div>
                <h4 className="text-h2 text-text-main">{group.label}</h4>
                <p className="text-secondary text-text-muted">{group.description}</p>
              </div>
              <div className="flex flex-col gap-4">
                {group.templates.map(template => {
                  const meta = getTemplateMeta(template.type, template.globalKey);
                  const exists = meta.source === 'Canal';
                  const hasFallback = meta.source === 'Principal';
                  const Icon = template.type === 'PAYMENT_CONFIRMED' ? CheckCircle2 : template.type === 'RELEASE' ? LogOut : Ticket;
                  return (
                    <NexusSectionCard
                      key={`${group.label}-${template.type}`}
                      icon={Icon}
                      iconVariant={exists ? 'brand' : hasFallback ? 'emerald' : 'muted'}
                      title={template.label}
                      subtitle={exists ? 'Plantilla configurada para este canal' : hasFallback ? 'Usa plantilla del Canal Principal' : 'Sin plantilla configurada'}
                      rightContent={<p className="text-label text-text-muted">{meta.source}</p>}
                      actions={
                        <NexusCardButton onClick={() => openTemplate(template.type, `${group.label}: ${template.label}`, template.globalKey, template.variables, template.sample)} icon={Edit2}>
                          Editar
                        </NexusCardButton>
                      }
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </NexusSection>

      {modal === 'identity' && (
        <ModalShell title="Identidad del canal" subtitle="Edita el nombre visible. El proposito se mantiene estable para proteger historiales." onClose={() => setModal(null)}>
          <div className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>
            <NexusInput label="Nombre del canal" value={generalData.name} onChange={(e) => setGeneralData({ ...generalData, name: e.target.value })} icon={Building2} />
            <NexusSelect label="Proposito" value={generalData.purpose} disabled>
              <option value="COMBAT">Combate</option>
              <option value="BREEDING">Cria</option>
              {RAFFLE_ENABLED && <option value="RAFFLES">Rifas</option>}
            </NexusSelect>
            <NexusAutonomousButton onClick={saveIdentity} isLoading={isSaving} icon={Save} className="w-full">
              Guardar Identidad
            </NexusAutonomousButton>
          </div>
        </ModalShell>
      )}

      {modal === 'bank' && (
        <ModalShell title="Informacion bancaria" subtitle="Estos datos se insertan en mensajes con la variable {{bank_info}}." onClose={() => setModal(null)}>
          <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
            <NexusInput label="Banco" value={paymentData.bank} onChange={(e) => setPaymentData({ ...paymentData, bank: e.target.value })} icon={Building2} />
            <NexusInput label="Beneficiario" value={paymentData.beneficiary} onChange={(e) => setPaymentData({ ...paymentData, beneficiary: e.target.value })} icon={User} />
            <NexusInput label="CLABE" value={paymentData.clabe} onChange={(e) => setPaymentData({ ...paymentData, clabe: e.target.value })} icon={Hash} />
            <NexusInput label="No. tarjeta" value={paymentData.card} onChange={(e) => setPaymentData({ ...paymentData, card: e.target.value })} icon={CreditCard} />
            <NexusAutonomousButton onClick={saveBank} isLoading={isSaving} icon={Save} className="w-full">
              Guardar Banco
            </NexusAutonomousButton>
          </div>
        </ModalShell>
      )}

      {modal === 'mercadopago' && (
        <ModalShell title="Mercado Pago" subtitle="Vincula una cuenta para cobros automatizados de este canal." onClose={() => setModal(null)}>
          <div className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>
            <div className="bg-bg-muted border border-border-main flex items-center" style={{ gap: 'var(--space-md)', padding: 'var(--padding-inner)', borderRadius: 'var(--radius-inner-visual)' }}>
              <div className={`flex items-center justify-center ${mpReady ? 'bg-emerald-500 text-white' : 'bg-bg-card text-text-muted border border-border-main'}`} style={{ width: 'var(--size-icon-autonomous)', height: 'var(--size-icon-autonomous)', borderRadius: 'var(--radius-card-inner)' }}>
                {mpReady ? <CheckCircle2 size={26} /> : <CreditCard size={26} />}
              </div>
              <div>
                <p className="text-h2 text-text-main">{mpReady ? 'Cuenta vinculada' : 'Sin pasarela vinculada'}</p>
                <p className="text-secondary text-text-muted">{mpReady ? `Usuario ${((paymentObj as any)?.mpUserId || 'sin id')}` : 'Mientras falte, se usara Mercado Pago Principal.'}</p>
              </div>
            </div>
            <NexusAutonomousButton onClick={connectMercadoPago} icon={LinkIcon} className="w-full">
              {mpReady ? 'Re-vincular Mercado Pago' : 'Vincular Mercado Pago'}
            </NexusAutonomousButton>
          </div>
        </ModalShell>
      )}

      {modal === 'whatsapp' && (
        <ModalShell title="Mensajeria WhatsApp" subtitle="Captura el numero antes de generar QR para evitar vincular el dispositivo equivocado." onClose={() => setModal(null)}>
          <div className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>
            <NexusInput label="Numero de WhatsApp" value={whatsappData.phone} onChange={(e) => setWhatsappData({ ...whatsappData, phone: e.target.value })} icon={Smartphone} helperText="Incluye codigo de pais. Para Mexico suele iniciar con 521." />
            <div className="bg-bg-muted border border-border-main flex items-center justify-between" style={{ gap: 'var(--space-md)', padding: 'var(--padding-inner)', borderRadius: 'var(--radius-inner-visual)' }}>
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
            <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 'var(--space-base)' }}>
              <NexusAutonomousButton density="compact" onClick={() => saveWhatsApp(true)} isLoading={isSaving} icon={Save} className="sm:col-span-1">
                Guardar
              </NexusAutonomousButton>
              <NexusAutonomousButton density="compact" onClick={openQrFlow} icon={QrCode} variant="success" className="sm:col-span-1">
                Vincular QR
              </NexusAutonomousButton>
              <NexusAutonomousButton density="compact" onClick={() => checkInstanceStatus(instanceName)} icon={RefreshCw} variant="secondary" className="sm:col-span-1">
                Revisar
              </NexusAutonomousButton>
            </div>
            {instanceStatus === 'open' && (
              <NexusAutonomousButton onClick={disconnectWhatsApp} icon={LogOut} variant="danger" className="w-full">
                Desvincular dispositivo
              </NexusAutonomousButton>
            )}
          </div>
        </ModalShell>
      )}

      {qrData && (
        <ModalShell title="Vinculacion por QR" subtitle="Escanea este codigo desde WhatsApp en el dispositivo confirmado." onClose={() => setQRData(null)}>
          <div className="text-center">
            <div
              className="inline-block bg-white border-8 border-bg-muted shadow-inner relative"
              style={{ padding: 'var(--padding-outer)', borderRadius: 'var(--radius-outer)' }}
            >
              {qrData.timeLeft === 0 ? (
                <div className="w-[240px] h-[240px] flex items-center justify-center">
                  <NexusAutonomousButton onClick={openQrFlow} icon={QrCode}>Regenerar QR</NexusAutonomousButton>
                </div>
              ) : (
                <>
                  <img src={qrData.base64} alt="QR" className="w-[240px] h-[240px]" style={{ borderRadius: 'var(--radius-card-inner)' }} />
                  <div className="absolute -top-5 -right-5 w-14 h-14 bg-stone-950 text-white rounded-full flex items-center justify-center text-h2 font-black tabular-nums border-4 border-bg-card">
                    {qrData.timeLeft}
                  </div>
                </>
              )}
            </div>
            <p className="text-label text-emerald-600" style={{ marginTop: 'var(--space-lg)' }}>Esperando dispositivo...</p>
          </div>
        </ModalShell>
      )}
    </div>
  );
};
