import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  Edit2,
  FileText,
  Hash,
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
      { key: 'whatsapp_global_store_rel', label: 'Liberacion de orden', variables: ['{{customer_name}}', '{{order_id}}', '{{time_store}}'] },
    ],
  },
  {
    label: 'Rifas',
    templates: [
      { key: 'whatsapp_global_raffle_res', label: 'Apartado de boletos', variables: ['{{customer_name}}', '{{ticket_list}}', '{{raffle_name}}', '{{amount}}', '{{bank_info}}', '{{time_raffle}}'] },
      { key: 'whatsapp_global_raffle_pay', label: 'Pago confirmado', variables: ['{{customer_name}}', '{{ticket_list}}', '{{raffle_name}}', '{{amount}}'] },
      { key: 'whatsapp_global_raffle_reminder', label: 'Recordatorio de pago', variables: ['{{customer_name}}', '{{ticket_list}}', '{{raffle_name}}', '{{amount}}', '{{bank_info}}', '{{time_remaining}}'] },
      { key: 'whatsapp_global_raffle_rel', label: 'Liberacion de boletos', variables: ['{{customer_name}}', '{{ticket_list}}', '{{raffle_name}}', '{{time_raffle}}'] },
    ],
  },
];

const previewMessage = (content: string) => (
  (content || 'Hola {{customer_name}}, este es un mensaje de ejemplo para validar variables y tono.')
    .replace(/\{\{greeting\}\}/g, 'Buena tarde')
    .replace(/\{\{customer_name\}\}/g, 'Carlos Ramirez')
    .replace(/\{\{order_id\}\}/g, '1284')
    .replace(/\{\{item_list\}\}/g, '1x Gallo colorado, 2x Alimento premium')
    .replace(/\{\{ticket_list\}\}/g, '018, 042, 119')
    .replace(/\{\{raffle_name\}\}/g, 'Rifa Especial de Junio')
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
  const [qrData, setQRData] = useState<{ base64?: string; instanceName?: string; timeLeft?: number } | null>(null);
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
    if (config.whatsapp_evolution_instance) checkInstanceStatus(config.whatsapp_evolution_instance);
  }, [config.whatsapp_evolution_instance]);

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
          showToast('Dispositivo principal vinculado');
          setQRData(null);
        }
      }, 3000);
    }
    return () => {
      clearInterval(timer);
      clearInterval(poll);
    };
  }, [qrData?.instanceName]);

  const openQrFlow = async () => {
    if (!config.whatsapp_main_phone?.trim()) {
      showToast('Captura primero el numero de WhatsApp principal', 'error');
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

      const res = await apiWhatsApp.getQR(instanceName);
      if (res.data?.base64) {
        setQRData({ base64: res.data.base64, instanceName, timeLeft: 40 });
      }
    } catch (error) {
      showToast('No se pudo generar el QR principal', 'error');
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
        <NexusModal isOpen title="Informacion Bancaria Principal" onClose={() => setModal(null)}>
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
        <NexusModal isOpen title="Mercado Pago Principal" onClose={() => setModal(null)}>
          <div className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>
            <NexusInput
              label="Identidad en Extracto"
              value={config.mp_statement_descriptor || ''}
              onChange={(e) => setConfig({ ...config, mp_statement_descriptor: e.target.value.substring(0, 16).toUpperCase() })}
              icon={CreditCard}
              helperText="Texto que aparece en el extracto del cliente. Maximo 16 caracteres."
            />
            <div className="bg-bg-muted border border-border-main flex items-center" style={{ gap: 'var(--space-md)', padding: 'var(--padding-inner)', borderRadius: 'var(--radius-inner-visual)' }}>
              <div className={`flex items-center justify-center ${mpReady ? 'bg-emerald-500 text-white' : 'bg-bg-card text-text-muted border border-border-main'}`} style={{ width: 'var(--size-icon-autonomous)', height: 'var(--size-icon-autonomous)', borderRadius: 'var(--radius-card-inner)' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-h2 text-text-main">{mpReady ? 'Cuenta vinculada' : 'Sin cuenta vinculada'}</p>
                <p className="text-secondary text-text-muted">{mpReady ? `Usuario ${config.mp_seller_user_id || 'sin id'}` : 'Vincula la pasarela principal para cobros por tarjeta.'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 'var(--space-md)' }}>
              <NexusAutonomousButton onClick={() => updateConfig({ mp_statement_descriptor: config.mp_statement_descriptor || '' })} isLoading={isSaving} icon={Save}>
                Guardar Extracto
              </NexusAutonomousButton>
              <NexusAutonomousButton
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
        <NexusModal isOpen title="Mensajeria Principal" onClose={() => setModal(null)}>
          <div className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>
            <NexusInput
              label="Numero de WhatsApp"
              value={config.whatsapp_main_phone || ''}
              onChange={(e) => setConfig({ ...config, whatsapp_main_phone: e.target.value })}
              icon={Smartphone}
              helperText="Incluye codigo de pais. Este sera el telefono fisico que escaneara el QR."
            />
            <div className="bg-bg-muted border border-border-main flex items-center justify-between" style={{ gap: 'var(--space-md)', padding: 'var(--padding-inner)', borderRadius: 'var(--radius-inner-visual)' }}>
              <div>
                <p className="text-h2 text-text-main">Dispositivo principal</p>
                <p className="text-secondary text-text-muted">
                  {instanceStatus === 'open' ? 'Vinculado con Evolution API' : `Instancia: ${principalInstance}`}
                </p>
              </div>
              <span className={`text-label ${instanceStatus === 'open' ? 'text-emerald-600' : 'text-text-muted'}`}>
                {instanceStatus === 'loading' ? 'Revisando' : instanceStatus === 'open' ? 'En linea' : 'Desconectado'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 'var(--space-base)' }}>
              <NexusAutonomousButton
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
              <NexusAutonomousButton density="compact" onClick={openQrFlow} icon={QrCode} variant="success">
                Vincular QR
              </NexusAutonomousButton>
              <NexusAutonomousButton density="compact" onClick={() => checkInstanceStatus()} icon={RefreshCw} variant="secondary">
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

      {qrData && (
        <NexusModal isOpen title="Vinculacion por QR" onClose={() => setQRData(null)} zIndex={260}>
          <div className="text-center">
            <div className="bg-white inline-block border-8 border-bg-muted shadow-inner relative" style={{ padding: 'var(--padding-outer)', borderRadius: 'var(--radius-outer)' }}>
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
        </NexusModal>
      )}
    </div>
  );
};
