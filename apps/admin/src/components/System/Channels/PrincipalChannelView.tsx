import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  Edit2,
  FileText,
  Hash,
  KeyRound,
  Link as LinkIcon,
  LogOut,
  MessageCircle,
  QrCode,
  RefreshCw,
  Save,
  Smartphone,
  User,
  Variable,
  WalletCards,
} from 'lucide-react';
import { apiMercadoPago, apiSystem, apiWhatsApp } from '../../../api';
import { NexusSection } from '../../ui/NexusSection';
import { NexusSectionCard } from '../../ui/NexusCard';
import { NexusAutonomousButton, NexusCardButton, NexusSectionButton } from '../../ui/NexusButton';
import { NexusInput, NexusTextarea } from '../../ui/NexusInputs';
import { NexusModal } from '../../ui/NexusModal';
import { NexusSwitch } from '../../ui/NexusSwitch';
import { NexusConfirmModal } from '../../ui/NexusConfirmModal';
import {
  WhatsAppPairingData,
  WhatsAppPairingMethod,
  WhatsAppPairingModal,
} from './WhatsAppPairingModal';

interface PrincipalChannelViewProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

type ModalType = 'bank' | 'mercadopago' | 'whatsapp' | null;

const TEMPLATE_GROUPS = [
  {
    label: 'Tienda',
    templates: [
      { key: 'whatsapp_global_store_res', label: 'Apartado de orden', variables: ['{{greeting}}', '{{customer_name}}', '{{order_id}}', '{{item_list}}', '{{amount}}', '{{bank_info}}', '{{time_store}}'] },
      { key: 'whatsapp_global_store_pay', label: 'Pago confirmado', variables: ['{{customer_name}}', '{{order_id}}', '{{item_list}}', '{{amount}}'] },
      { key: 'whatsapp_global_store_restored', label: 'Apartado restaurado', variables: ['{{greeting}}', '{{customer_name}}', '{{order_id}}', '{{item_list}}', '{{amount}}', '{{bank_info}}', '{{time_store}}'] },
      { key: 'whatsapp_global_store_reminder', label: 'Recordatorio de pago', variables: ['{{greeting}}', '{{customer_name}}', '{{order_id}}', '{{item_list}}', '{{amount}}', '{{bank_info}}', '{{time_remaining}}'] },
      { key: 'whatsapp_global_store_rel', label: 'Liberación de orden', variables: ['{{customer_name}}', '{{order_id}}', '{{item_list}}'] },
    ],
  },
  {
    label: 'Rifas',
    templates: [
      { key: 'whatsapp_global_raffle_opening', label: 'Aviso de apertura', variables: ['{{raffle_name}}', '{{opening_date}}', '{{raffle_url}}'] },
      { key: 'whatsapp_global_raffle_res', label: 'Apartado de boletos', variables: ['{{customer_name}}', '{{ticket_list}}', '{{raffle_name}}', '{{amount}}', '{{bank_info}}', '{{time_raffle}}'] },
      { key: 'whatsapp_global_raffle_pay', label: 'Pago confirmado', variables: ['{{customer_name}}', '{{ticket_list}}', '{{raffle_name}}', '{{amount}}'] },
      { key: 'whatsapp_global_raffle_reminder', label: 'Recordatorio de pago', variables: ['{{customer_name}}', '{{ticket_list}}', '{{raffle_name}}', '{{amount}}', '{{bank_info}}', '{{time_remaining}}'] },
      { key: 'whatsapp_global_raffle_rel', label: 'Liberación de boletos', variables: ['{{customer_name}}', '{{ticket_list}}', '{{raffle_name}}'] },
    ],
  },
];

const previewMessage = (content: string) => (
  (content || 'Hola {{customer_name}}, este es un mensaje de ejemplo para validar variables y tono.')
    .replace(/\{\{greeting\}\}/g, 'Buena tarde')
    .replace(/\{\{customer_name\}\}/g, 'Carlos Ramirez')
    .replace(/\{\{order_id\}\}/g, '1284')
    .replace(/\{\{item_list\}\}/g, '1x Gallo colorado, 2x Alimento premium')
    .replace(
      /\{\{ticket_list\}\}/g,
      '002, 005, 009 y 010\n\n✨ Oportunidades adicionales:\n\n002: 164, 246, 271, 635, 701, 888, 986\n005: 171, 265, 534, 817, 929, 943, 976\n009: 212, 430, 516, 605, 626, 752, 882\n010: 405, 423, 436, 441, 538, 728, 963',
    )
    .replace(/\{\{raffle_name\}\}/g, 'Rifa Especial de Junio')
    .replace(/\{\{opening_date\}\}/g, 'Lunes, 20 de julio de 2026, 8:00 a. m.')
    .replace(/\{\{raffle_url\}\}/g, 'https://rancholastrojes.com.mx/raffles/1')
    .replace(/\{\{amount\}\}/g, '1,250.00')
    .replace(/\{\{bank_info\}\}/g, 'Banco: BBVA\nBeneficiario: Rancho Demo\nNo. Cuenta: 1234567890\nCLABE: 012345678901234567\nTarjeta: 1234 5678 9012 3456')
    .replace(/\{\{time_store\}\}/g, '24 horas')
    .replace(/\{\{time_raffle\}\}/g, '12 horas')
    .replace(/\{\{time_remaining\}\}/g, '4 horas')
);

export const PrincipalChannelView: React.FC<PrincipalChannelViewProps> = ({ showToast }) => {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [instanceStatus, setInstanceStatus] = useState<'open' | 'close' | 'connecting' | 'loading'>('loading');
  const [pairingData, setPairingData] = useState<WhatsAppPairingData | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<{ key: string; label: string; variables: string[] } | null>(null);
  const [confirmDisconnectMP, setConfirmDisconnectMP] = useState(false);
  const [isDisconnectingMP, setIsDisconnectingMP] = useState(false);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      setConfig(await apiSystem.getConfig());
    } catch (error) {
      showToast('Error al cargar Canal Principal', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const principalInstance = useMemo(() => {
    const prefix = config.whatsapp_evolution_instance || 'nexus';
    // If the prefix already contains '_main' or '_principal', don't add it again
    if (prefix.endsWith('_main') || prefix.endsWith('_principal')) return prefix;
    return `${prefix}_main`;
  }, [config.whatsapp_evolution_instance]);

  const checkInstanceStatus = async (name = principalInstance) => {
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

  useEffect(() => {
    if (config.whatsapp_evolution_instance) checkInstanceStatus(principalInstance);
  }, [config.whatsapp_evolution_instance, principalInstance]);

  useEffect(() => {
    let timer: any;
    let poll: any;
    if (pairingData?.instanceName) {
      timer = setInterval(() => {
        setPairingData(prev => prev ? { ...prev, timeLeft: Math.max(0, prev.timeLeft - 1) } : null);
      }, 1000);
      poll = setInterval(async () => {
        const state = await checkInstanceStatus(pairingData.instanceName);
        if (state === 'open') {
          showToast('Dispositivo principal vinculado');
          setPairingData(null);
        }
      }, 3000);
    }
    return () => {
      clearInterval(timer);
      clearInterval(poll);
    };
  }, [pairingData?.instanceName]);

  const openWhatsAppFlow = async (method: WhatsAppPairingMethod) => {
    if (!config.whatsapp_main_phone?.trim()) {
      showToast('Captura primero el número de WhatsApp principal', 'error');
      return;
    }
    try {
      const instanceName = principalInstance;
      const prefix = config.whatsapp_evolution_instance || 'nexus';
      
      // Update config with the clean prefix, NOT the computed instance name
      await updateConfig({
        whatsapp_main_phone: config.whatsapp_main_phone || '',
        whatsapp_evolution_instance: prefix,
      }, false);

      const res = await apiWhatsApp.connect(
        instanceName,
        method,
        config.whatsapp_main_phone,
      );
      const value = method === 'qr' ? res.data?.base64 : res.data?.pairingCode;
      if (!value) throw new Error('Evolution API no devolvió un código');

      setPairingData({
        method,
        base64: res.data?.base64,
        pairingCode: res.data?.pairingCode,
        instanceName,
        timeLeft: 40,
      });
    } catch (error: any) {
      showToast(
        error?.response?.data?.error ||
          (method === 'qr'
            ? 'No se pudo generar el QR principal'
            : 'No se pudo generar el código de emparejamiento'),
        'error',
      );
    }
  };

  const disconnectWhatsApp = async () => {
    try {
      await apiWhatsApp.disconnect(principalInstance);
      setInstanceStatus('close');
      showToast('Dispositivo principal desvinculado');
    } catch (error) {
      showToast('No se pudo desvincular el dispositivo principal', 'error');
    }
  };

  const connectMercadoPago = async () => {
    try {
      const url = await apiMercadoPago.getAuthUrl();
      if (url) window.location.href = url;
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Error al conectar con Mercado Pago', 'error');
    }
  };

  const disconnectMercadoPago = async () => {
    setIsDisconnectingMP(true);
    try {
      await apiMercadoPago.disconnectMain();
      setConfig(prev => ({
        ...prev,
        mp_seller_access_token: '',
        mp_seller_refresh_token: '',
        mp_seller_user_id: '',
        mp_main_checkout_enabled: '0',
      }));
      setConfirmDisconnectMP(false);
      showToast('Mercado Pago desvinculado');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'No se pudo desvincular Mercado Pago', 'error');
    } finally {
      setIsDisconnectingMP(false);
    }
  };

  const updateConfig = async (data: Record<string, string>, closeModal = true) => {
    setIsSaving(true);
    try {
      await apiSystem.updateConfig(data);
      setConfig(prev => ({ ...prev, ...data }));
      showToast('Canal Principal actualizado');
      if (closeModal) {
        setModal(null);
        setEditingTemplate(null);
      }
    } catch (error) {
      showToast('No se pudo guardar la configuracion', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const bankReady = Boolean(config.bank_main_name && config.bank_main_beneficiary);
  const mpReady = Boolean(config.mp_seller_access_token);
  const mpCheckoutEnabled = mpReady && config.mp_main_checkout_enabled !== '0';
  const waReady = Boolean(config.whatsapp_main_phone && config.whatsapp_evolution_instance && instanceStatus === 'open');

  const templateCounts = useMemo(() => {
    const flat = TEMPLATE_GROUPS.flatMap(group => group.templates);
    return flat.filter(template => Boolean(config[template.key])).length;
  }, [config]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-500">
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 border-4 border-brand-100 rounded-[2rem]" />
          <div className="absolute inset-0 border-4 border-brand-500 border-t-transparent rounded-[2rem] animate-spin" />
        </div>
        <p className="text-label text-text-muted">Cargando Canal Principal...</p>
      </div>
    );
  }

  if (editingTemplate) {
    return (
      <div className="space-y-8 pb-20 animate-in fade-in duration-300">
        <NexusCardButton onClick={() => setEditingTemplate(null)} variant="secondary" icon={ArrowLeft}>
          Volver a Plantillas
        </NexusCardButton>

        <NexusSection
          title={editingTemplate.label}
          subtitle="Plantilla principal usada cuando no exista una plantilla especializada"
          icon={FileText}
          iconVariant="brand"
          action={
            <NexusSectionButton onClick={() => updateConfig({ [editingTemplate.key]: config[editingTemplate.key] || '' })} isLoading={isSaving} icon={Save}>
              Guardar Plantilla
            </NexusSectionButton>
          }
        >
          <div className="grid grid-cols-1 xl:grid-cols-2" style={{ gap: 'var(--space-lg)' }}>
            <div className="space-y-6">
              <NexusTextarea
                label="Mensaje del Canal Principal"
                rows={12}
                value={config[editingTemplate.key] || ''}
                onChange={(event) => setConfig(prev => ({ ...prev, [editingTemplate.key]: event.target.value }))}
                placeholder="Escribe el mensaje que recibira el cliente..."
              />
              <div className="bg-bg-muted border border-border-main rounded-[2rem] p-5">
                <p className="text-label text-text-muted mb-3">Variables disponibles</p>
                <div className="flex flex-wrap gap-2">
                  {editingTemplate.variables.map(variable => (
                    <span key={variable} className="px-3 py-1.5 rounded-full bg-bg-card border border-border-main text-label text-text-muted">
                      {variable}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <NexusSection title="Preview" subtitle="Ejemplo con datos simulados" icon={Variable} iconVariant="muted" animate={false}>
              <div className="bg-bg-muted border border-border-main rounded-[2rem] p-6 whitespace-pre-line text-secondary text-text-main leading-relaxed min-h-[20rem]">
                {previewMessage(config[editingTemplate.key] || '')}
              </div>
            </NexusSection>
          </div>
        </NexusSection>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-300">
      <NexusSection
        title="Canal Principal"
        subtitle="Fallback para tienda general, pedidos mixtos, rifas sin canal y cualquier flujo incompleto"
        icon={WalletCards}
        iconVariant="brand"
      >
        <div className="flex flex-col gap-5">
          <NexusSectionCard
            icon={Banknote}
            iconVariant={bankReady ? 'emerald' : 'muted'}
            title="Informacion Bancaria"
            subtitle={bankReady ? `${config.bank_main_name} / ${config.bank_main_beneficiary}` : 'Configuracion parcial o pendiente'}
            rightContent={<p className="text-label text-text-muted">{bankReady ? 'Completado' : 'Parcial'}</p>}
            actions={<NexusCardButton onClick={() => setModal('bank')} icon={Edit2}>Configurar</NexusCardButton>}
          />
          <NexusSectionCard
            icon={CreditCard}
            iconVariant={mpReady ? 'blue' : 'muted'}
            title="Mercado Pago Principal"
            subtitle={
              mpReady
                ? `${mpCheckoutEnabled ? 'Disponible en checkout' : 'Vinculado, oculto en checkout'} · ${config.mp_statement_descriptor || 'NEXUS*SHOP'}`
                : 'Pasarela principal pendiente'
            }
            rightContent={
              <div className="flex flex-col items-center" style={{ gap: 'var(--space-xs)' }}>
                <NexusSwitch
                  checked={mpCheckoutEnabled}
                  disabled={!mpReady || isSaving}
                  onChange={(checked) => updateConfig({ mp_main_checkout_enabled: checked ? '1' : '0' }, false)}
                  aria-label={mpCheckoutEnabled ? 'Ocultar Mercado Pago del checkout' : 'Mostrar Mercado Pago en checkout'}
                  title={mpReady ? undefined : 'Vincula Mercado Pago para activarlo en checkout'}
                />
                <span className={`text-label uppercase tracking-[0.15em] transition-colors duration-500 ${mpCheckoutEnabled ? 'text-text-muted' : 'text-text-muted/40'}`}>
                  {mpCheckoutEnabled ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            }
            actions={<NexusCardButton onClick={() => setModal('mercadopago')} icon={Edit2}>Configurar</NexusCardButton>}
          />
          <NexusSectionCard
            icon={MessageCircle}
            iconVariant={waReady ? 'emerald' : 'muted'}
            title="Mensajeria Principal"
            subtitle={config.whatsapp_main_phone ? config.whatsapp_main_phone : 'Numero principal pendiente'}
            rightContent={<p className="text-label text-text-muted">{waReady ? 'Vinculado' : 'Parcial'}</p>}
            actions={<NexusCardButton onClick={() => setModal('whatsapp')} icon={Edit2}>Configurar</NexusCardButton>}
          />
        </div>
      </NexusSection>

      <NexusSection
        title="Plantillas Principales"
        subtitle="Mensajes fallback para tienda y rifas cuando no exista una plantilla especializada"
        icon={FileText}
        iconVariant={templateCounts > 0 ? 'brand' : 'muted'}
      >
        <div className="flex flex-col gap-8">
          {TEMPLATE_GROUPS.map(group => (
            <div key={group.label} className="space-y-4">
              <div>
                <h4 className="text-h2 text-text-main">{group.label}</h4>
                <p className="text-secondary text-text-muted">{group.label === 'Tienda' ? 'Ordenes, pagos y liberaciones de productos.' : 'Apartados, pagos y liberaciones de boletos.'}</p>
              </div>
              <div className="flex flex-col gap-4">
                {group.templates.map(template => (
                  <NexusSectionCard
                    key={template.key}
                    icon={FileText}
                    iconVariant={config[template.key] ? 'brand' : 'muted'}
                    title={template.label}
                    subtitle={config[template.key] ? 'Plantilla configurada en Canal Principal' : 'Sin plantilla principal configurada'}
                    rightContent={<p className="text-label text-text-muted">{config[template.key] ? 'Lista' : 'Pendiente'}</p>}
                    actions={<NexusCardButton onClick={() => setEditingTemplate(template)} icon={Edit2}>Editar</NexusCardButton>}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </NexusSection>

      {modal === 'bank' && (
        <NexusModal
          isOpen
          title="Información Bancaria Principal"
          eyebrow="Configurar Canal"
          icon={Banknote}
          onClose={() => setModal(null)}
          size="standard"
          zIndex={250}
        >
          <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
            <NexusInput label="Banco" value={config.bank_main_name || ''} onChange={(e) => setConfig({ ...config, bank_main_name: e.target.value })} icon={Banknote} />
            <NexusInput label="Beneficiario" value={config.bank_main_beneficiary || ''} onChange={(e) => setConfig({ ...config, bank_main_beneficiary: e.target.value })} icon={User} />
            <NexusInput label="No. Cuenta" value={config.bank_main_account || ''} onChange={(e) => setConfig({ ...config, bank_main_account: e.target.value })} icon={Hash} />
            <NexusInput label="CLABE" value={config.bank_main_clabe || ''} onChange={(e) => setConfig({ ...config, bank_main_clabe: e.target.value })} icon={Hash} />
            <NexusInput label="No. tarjeta" value={config.bank_main_card || ''} onChange={(e) => setConfig({ ...config, bank_main_card: e.target.value })} icon={CreditCard} />
            <NexusAutonomousButton
              className="w-full"
              onClick={() => updateConfig({
                bank_main_name: config.bank_main_name || '',
                bank_main_beneficiary: config.bank_main_beneficiary || '',
                bank_main_account: config.bank_main_account || '',
                bank_main_clabe: config.bank_main_clabe || '',
                bank_main_card: config.bank_main_card || '',
              })}
              isLoading={isSaving}
              icon={Save}
            >
              Guardar Banco Principal
            </NexusAutonomousButton>
          </div>
        </NexusModal>
      )}

      {modal === 'mercadopago' && (
        <NexusModal
          isOpen
          title="Mercado Pago Principal"
          eyebrow="Configurar Canal"
          icon={CreditCard}
          onClose={() => setModal(null)}
          size="standard"
          zIndex={250}
        >
          <div className="flex w-full min-w-0 max-w-full flex-col" style={{ gap: 'var(--space-lg)' }}>
            <NexusInput
              label="Identidad en Extracto"
              value={config.mp_statement_descriptor || ''}
              onChange={(e) => setConfig({ ...config, mp_statement_descriptor: e.target.value.substring(0, 16).toUpperCase() })}
              icon={CreditCard}
              helperText="Texto que aparece en el extracto del cliente. Máximo 16 caracteres."
            />
            <div className="flex w-full min-w-0 max-w-full flex-col items-stretch border border-border-main bg-bg-muted sm:flex-row sm:items-center" style={{ gap: 'var(--space-md)', padding: 'var(--padding-inner)', borderRadius: 'var(--radius-inner-visual)' }}>
              <div className={`flex shrink-0 items-center justify-center ${mpReady ? 'bg-emerald-500 text-white' : 'bg-bg-card text-text-muted border border-border-main'}`} style={{ width: 'var(--size-icon-autonomous)', height: 'var(--size-icon-autonomous)', borderRadius: 'var(--radius-card-inner)' }}>
                <CheckCircle2 size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-h2 text-text-main">{mpReady ? 'Cuenta vinculada' : 'Sin cuenta vinculada'}</p>
                <p className="break-words text-secondary text-text-muted">{mpReady ? `Usuario ${config.mp_seller_user_id || 'sin id'}` : 'Vincula la pasarela principal para cobros por tarjeta.'}</p>
              </div>
            </div>
            <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] sm:grid-cols-2" style={{ gap: 'var(--space-md)' }}>
              <NexusAutonomousButton className="w-full min-w-0" onClick={() => updateConfig({ mp_statement_descriptor: config.mp_statement_descriptor || '' })} isLoading={isSaving} icon={Save}>
                Guardar Extracto
              </NexusAutonomousButton>
              <NexusAutonomousButton
                className="w-full min-w-0"
                icon={mpReady ? LogOut : LinkIcon}
                variant={mpReady ? 'danger' : 'brand'}
                onClick={mpReady ? () => setConfirmDisconnectMP(true) : connectMercadoPago}
              >
                {mpReady ? 'Desvincular' : 'Vincular'}
              </NexusAutonomousButton>
            </div>
          </div>
        </NexusModal>
      )}

      <NexusConfirmModal
        isOpen={confirmDisconnectMP}
        title="¿Desvincular Mercado Pago?"
        message="El checkout dejará de aceptar pagos con tarjeta hasta que vincules una cuenta nuevamente."
        confirmLabel={isDisconnectingMP ? 'Desvinculando...' : 'Desvincular'}
        cancelLabel="Cancelar"
        tone="danger"
        icon={LogOut}
        onConfirm={disconnectMercadoPago}
        onCancel={() => setConfirmDisconnectMP(false)}
        zIndex={270}
      />

      {modal === 'whatsapp' && (
        <NexusModal
          isOpen
          title="Mensajería Principal"
          eyebrow="Configurar Canal"
          icon={MessageCircle}
          onClose={() => setModal(null)}
          size="standard"
          zIndex={250}
        >
          <div className="flex w-full min-w-0 max-w-full flex-col overflow-x-hidden" style={{ gap: 'var(--space-lg)' }}>
            <NexusInput
              label="Número de WhatsApp"
              value={config.whatsapp_main_phone || ''}
              onChange={(e) => setConfig({ ...config, whatsapp_main_phone: e.target.value })}
              icon={Smartphone}
              helperText="Incluye código de país. Este será el teléfono físico que escaneará el QR."
            />
            <div className="flex w-full min-w-0 max-w-full flex-col items-stretch justify-between border border-border-main bg-bg-muted sm:flex-row sm:items-center" style={{ gap: 'var(--space-md)', padding: 'var(--padding-inner)', borderRadius: 'var(--radius-inner-visual)' }}>
              <div className="min-w-0 flex-1">
                <p className="text-h2 text-text-main">Dispositivo principal</p>
                <p className="break-words text-secondary text-text-muted">
                  {instanceStatus === 'open' ? 'Vinculado con Evolution API' : `Instancia: ${principalInstance}`}
                </p>
              </div>
              <span className={`shrink-0 text-label ${instanceStatus === 'open' ? 'text-emerald-600' : 'text-text-muted'}`}>
                {instanceStatus === 'loading' ? 'Revisando' : instanceStatus === 'open' ? 'En línea' : 'Desconectado'}
              </span>
            </div>
            <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] sm:grid-cols-2" style={{ gap: 'var(--space-base)' }}>
              <NexusAutonomousButton
                className="w-full min-w-0"
                density="compact"
                onClick={() => updateConfig({
                  whatsapp_main_phone: config.whatsapp_main_phone || '',
                  whatsapp_evolution_instance: principalInstance,
                })}
                isLoading={isSaving}
                icon={Save}
              >
                Guardar
              </NexusAutonomousButton>
              <NexusAutonomousButton className="w-full min-w-0" density="compact" onClick={() => openWhatsAppFlow('qr')} icon={QrCode} variant="success" disabled={instanceStatus === 'open'}>
                Vincular QR
              </NexusAutonomousButton>
              <NexusAutonomousButton className="w-full min-w-0" density="compact" onClick={() => openWhatsAppFlow('pairing_code')} icon={KeyRound} variant="success" disabled={instanceStatus === 'open'}>
                Usar código
              </NexusAutonomousButton>
              <NexusAutonomousButton className="w-full min-w-0" density="compact" onClick={() => checkInstanceStatus()} icon={RefreshCw} variant="secondary">
                Revisar
              </NexusAutonomousButton>
            </div>
            {instanceStatus === 'open' && (
              <NexusAutonomousButton onClick={disconnectWhatsApp} icon={LogOut} variant="danger" className="w-full">
                Desvincular Dispositivo
              </NexusAutonomousButton>
            )}
          </div>
        </NexusModal>
      )}

      <WhatsAppPairingModal
        data={pairingData}
        onClose={() => setPairingData(null)}
        onRegenerate={openWhatsAppFlow}
        zIndex={260}
      />
    </div>
  );
};
