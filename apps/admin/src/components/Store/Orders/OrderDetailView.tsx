import React, { useRef } from 'react';
import {
  Package, Clock, CheckCircle2, Phone, MapPin, User,
  Calendar, DollarSign, Plane, Truck, CircleX, ChevronLeft, Layers, MessageCircle, Edit2, Save,
  CreditCard, RotateCcw
} from 'lucide-react';
import { Order, WhatsAppMessageLog } from '../../../types';
import { NexusAutonomousButton, NexusSectionButton } from '../../ui/NexusButton';
import { NexusSection } from '../../ui/NexusSection';
import { NexusModal, NexusModalActions } from '../../ui/NexusModal';
import { NexusConfirmModal } from '../../ui/NexusConfirmModal';
import { NexusInput, NexusSelect } from '../../ui/NexusInputs';
import { NexusBadge } from '../../ui/NexusBadge';
import { ASSET_BASE_URL, apiOrders } from '../../../api';
import { MEXICO_STATES } from '../../../constants';

// --- SUB-COMPONENTES ---

/**
 * OrderItemThumbnail: Miniatura refinada para los productos dentro de la orden.
 * Aplica Geometría Nivel 2 y carga de assets absolutos.
 */
const OrderItemThumbnail = ({ item }: { item: any }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const getFullUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${ASSET_BASE_URL}${cleanPath}`;
  };

  const imageUrl = getFullUrl(item.imageUrl);
  const isVideo = imageUrl.toLowerCase().split('?')[0].endsWith('.mp4') ||
                  imageUrl.toLowerCase().split('?')[0].endsWith('.mov');

  const handleMouseEnter = () => {
    if (isVideo && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) playPromise.catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (isVideo && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  if (!item.imageUrl) {
    return (
      <div
        className={`w-16 h-16 shrink-0 flex items-center justify-center border ${item.type === 'BIRD' ? 'bg-brand-50 text-brand-600 border-brand-100/50' : 'bg-bg-muted text-text-muted border-border-main'}`}
        style={{ borderRadius: 'var(--radius-inner-visual)' }}
      >
        {item.type === 'BIRD' ? <Plane size={24} strokeWidth={1.5} /> : <Package size={24} strokeWidth={1.5} />}
      </div>
    );
  }

  return (
    <div
      className="w-16 h-16 shrink-0 overflow-hidden bg-stone-100 border border-border-main shadow-inner relative group"
      style={{ borderRadius: 'var(--radius-inner-visual)' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isVideo ? (
        <video
          ref={videoRef}
          src={imageUrl}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          src={imageUrl}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      )}
      <div className="absolute inset-0 bg-black/5" />
    </div>
  );
};

const DetailField = ({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) => (
  <div className={wide ? 'sm:col-span-2' : ''}>
    <p className="text-label uppercase tracking-[0.15em] text-text-muted">{label}</p>
    <p className="text-secondary break-words font-bold text-text-main" style={{ marginTop: 'var(--space-xs)' }}>
      {value}
    </p>
  </div>
);

interface OrderDetailViewProps {
  order: Order;
  onBack: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

// Utilidad para formatear fecha (YYYY-MM-DD... -> DD/MM/YYYY)
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const pureDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
  const parts = pureDate.split('-');
  if (parts.length < 3) return pureDate;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (value?: number | null) => {
  return (value || 0).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  });
};

const getPaymentStatusLabel = (status?: string | null) => {
  if (status === 'APPROVED') return 'Pagado';
  if (status === 'REFUNDED') return 'Devuelto';
  if (status === 'FAILED') return 'Fallido';
  if (status === 'EXPIRED') return 'Expirado';
  if (status === 'CANCELLED') return 'Cancelado';
  return 'Pendiente';
};

const formatShortDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = startOfToday.getTime() - startOfDate.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Hoy';

  if (diffDays > 0 && diffDays <= 31) {
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
    });
  }

  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatShortTime = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getWhatsAppStatusLabel = (status: string) => {
  if (status === 'read') return 'Leído';
  if (status === 'delivered') return 'Entregado';
  if (status === 'server_ack') return 'Aceptado';
  if (status === 'sent') return 'Enviado';
  if (status === 'failed') return 'Fallido';
  return status;
};

const getWhatsAppPurposeLabel = (template: string) => {
  if (template === 'order-paid' || template === 'order_paid') return 'Pago';
  if (template === 'order-reminder' || template === 'order_reminder') return 'Recordatorio';
  if (template === 'order-restored' || template === 'order_restored') return 'Restauración';
  if (template === 'order-cancelled' || template === 'order_cancelled') return 'Liberación';
  if (template === 'order' || template === 'order_principal' || template.startsWith('order_')) return 'Apartado';
  if (template === 'reservation') return 'Apartado de rifa';
  if (template === 'reservation-paid' || template === 'reservation_paid_rifas') return 'Pago de rifa';
  if (template === 'reservation-reminder' || template === 'reservation_reminder_rifas') return 'Recordatorio de rifa';
  if (template === 'reservation-cancelled') return 'Liberación de rifa';
  if (template === 'configuration') return 'Configuración';
  if (template === 'webhook') return 'Webhook';
  return template;
};

// Truncado inteligente a 2 palabras
const truncateProductName = (name: string) => {
  if (!name) return 'Sin nombre';
  const words = name.split(' ');
  if (words.length <= 2) return name;
  return `${words.slice(0, 2).join(' ')}...`;
};

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({
  order,
  onBack,
  showToast
  }) => {
  const [currentOrder, setCurrentOrder] = React.useState(order);
  const [isResending, setIsResending] = React.useState(false);
  const [whatsappLogs, setWhatsappLogs] = React.useState<WhatsAppMessageLog[]>([]);
  const [isLoadingWhatsappLogs, setIsLoadingWhatsappLogs] = React.useState(false);
  const [selectedWhatsappLog, setSelectedWhatsappLog] = React.useState<WhatsAppMessageLog | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = React.useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = React.useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = React.useState(false);
  const [isRefunding, setIsRefunding] = React.useState(false);
  const [customerForm, setCustomerForm] = React.useState({
    customerName: order.customer || '',
    customerPhone: order.customerPhone || '',
    shippingState: order.customerState === 'N/A' ? '' : order.customerState || '',
  });

  React.useEffect(() => {
    setCurrentOrder(order);
    setCustomerForm({
      customerName: order.customer || '',
      customerPhone: order.customerPhone || '',
      shippingState: order.customerState === 'N/A' ? '' : order.customerState || '',
    });
  }, [order]);

  const itemsList = currentOrder?.items || [];
  const hasBirds = itemsList.some(item => item?.type?.toUpperCase() === 'BIRD');
  const hasItems = itemsList.some(item => item?.type?.toUpperCase() === 'ITEM');
  const isPaymentHold = currentOrder.recordType === 'PAYMENT_HOLD';
  const isMercadoPagoOrder = currentOrder.paymentMethod === 'MERCADOPAGO';
  const canRefundMercadoPago =
    isMercadoPagoOrder &&
    currentOrder.status === 'paid' &&
    currentOrder.paymentStatus === 'APPROVED' &&
    Boolean(currentOrder.mpPaymentId) &&
    Number(currentOrder.mpRefundedAmount || 0) <= 0;

  const loadWhatsappLogs = async () => {
    if (!currentOrder?.id || isPaymentHold) return;
    setIsLoadingWhatsappLogs(true);
    try {
      const logs = await apiOrders.getWhatsAppLogs(String(currentOrder.id));
      setWhatsappLogs(logs);
    } catch (error) {
      setWhatsappLogs([]);
    } finally {
      setIsLoadingWhatsappLogs(false);
    }
  };

  React.useEffect(() => {
    if (isPaymentHold) {
      setWhatsappLogs([]);
      return;
    }
    loadWhatsappLogs();
    const timer = window.setTimeout(() => {
      loadWhatsappLogs();
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [currentOrder?.id, currentOrder?.status, isPaymentHold]);

  const handleResendWhatsApp = async () => {
    if (!currentOrder?.id) return;
    setIsResending(true);
    try {
      await apiOrders.resendWhatsApp(String(currentOrder.id));
      await loadWhatsappLogs();
      showToast('Notificación enviada a la cola', 'success');
    } catch (error) {
      showToast('No se pudo re-enviar la notificación', 'error');
    } finally {
      setIsResending(false);
    }
  };

  const handleOpenCustomerModal = () => {
    setCustomerForm({
      customerName: currentOrder.customer || '',
      customerPhone: currentOrder.customerPhone || '',
      shippingState: currentOrder.customerState === 'N/A' ? '' : currentOrder.customerState || '',
    });
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentOrder?.id) return;
    setIsSavingCustomer(true);
    try {
      const updatedOrder = await apiOrders.updateCustomer(currentOrder.id, {
        customerName: customerForm.customerName,
        customerPhone: customerForm.customerPhone,
        shippingState: customerForm.shippingState || null,
      });
      setCurrentOrder(updatedOrder);
      setIsCustomerModalOpen(false);
      showToast('Información del cliente actualizada', 'success');
    } catch (error) {
      showToast('No se pudo actualizar el cliente', 'error');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleRefundMercadoPago = async () => {
    if (!currentOrder?.id || isRefunding) return;
    setIsRefunding(true);
    try {
      const updatedOrder = await apiOrders.refundMercadoPago(currentOrder.id);
      setCurrentOrder(updatedOrder);
      setIsRefundModalOpen(false);
      showToast('Pago devuelto correctamente', 'success');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'No se pudo devolver el pago', 'error');
    } finally {
      setIsRefunding(false);
    }
  };

  if (!order) {
    return (
      <div className="text-center" style={{ paddingBlock: 'var(--space-3xl)' }}>
        <p className="text-text-muted">No se pudo cargar la información de la orden.</p>
        <NexusSectionButton
          variant="secondary"
          onClick={onBack}
          icon={ChevronLeft}
          style={{ marginTop: 'var(--space-md)' }}
        >
          Volver
        </NexusSectionButton>
      </div>
    );
  }

  return (
    <div
      className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col"
      style={{ gap: 'var(--space-lg)', paddingBottom: 'var(--space-xl)' }}
    >

      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 'var(--space-lg)' }}>

        {/* Left Column: Order Summary & Items */}
        <div className="lg:col-span-2 flex flex-col" style={{ gap: 'var(--space-lg)' }}>

          {/* General Info Section */}
          <NexusSection
            title={isPaymentHold ? 'Intento de compra' : `Orden #${currentOrder.id}`}
            subtitle={isPaymentHold ? 'Trazabilidad del pago con tarjeta' : 'Detalle de Orden de Venta'}
            icon={Layers}
            iconVariant="brand"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 'var(--space-lg)' }}>
              <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                <div className="flex items-center text-stone-400" style={{ gap: 'var(--space-xs)' }}>
                  <Calendar size={14} className="opacity-50" />
                  <span className="text-label uppercase tracking-[0.15em]">Fecha</span>
                </div>
                <p className="text-secondary text-text-main font-bold">{formatDate(currentOrder.date)}</p>
              </div>
              <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                <div className="flex items-center text-stone-400" style={{ gap: 'var(--space-xs)' }}>
                  <DollarSign size={14} className="opacity-50" />
                  <span className="text-label uppercase tracking-[0.15em]">Total</span>
                </div>
                <p className="text-secondary text-text-main font-bold">${(currentOrder.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                <div className="flex items-center text-stone-400" style={{ gap: 'var(--space-xs)' }}>
                  <Package size={14} className="opacity-50" />
                  <span className="text-label uppercase tracking-[0.15em]">Artículos</span>
                </div>
                <p className="text-secondary text-text-main font-bold">{itemsList.length}</p>
              </div>
            </div>
          </NexusSection>

          {/* Items List Section */}
          <NexusSection
            title="Productos"
            subtitle="Detalle del pedido"
            icon={Package}
            iconVariant="muted"
          >
            <div className="flex flex-col divide-y divide-border-main/50">
              {itemsList.map((item) => (
                <div
                  key={item?.id}
                  className="flex items-center justify-between hover:bg-bg-muted/30 transition-colors"
                  style={{
                    gap: 'var(--space-md)',
                    paddingBlock: 'var(--space-md)',
                    paddingInline: 'var(--space-xs)',
                    borderRadius: 'var(--radius-inner-visual)'
                  }}
                >
                  <div className="flex items-center min-w-0" style={{ gap: 'var(--space-md)' }}>
                    <OrderItemThumbnail item={item} />
                    <div className="flex flex-col min-w-0" style={{ gap: 'var(--space-xs)' }}>
                      <p className="text-h2 text-text-main truncate" title={item?.name || 'Producto'}>
                        {truncateProductName(item?.name || 'Producto sin nombre')}
                      </p>
                      <p className="text-label text-stone-400 uppercase tracking-[0.15em]">
                        {item?.type?.toUpperCase() === 'BIRD' ? 'Ave' : 'Artículo'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col shrink-0" style={{ gap: 'var(--space-xs)' }}>
                    <p className="text-h2 text-text-main font-black">${(item?.price || 0).toLocaleString('es-MX')}</p>
                    <p className="text-label text-stone-400 font-bold">Cant: {item?.quantity || 0}</p>
                  </div>
                </div>
              ))}
            </div>
            <div
              className="bg-bg-muted/50 flex justify-between items-center border-t border-border-main"
              style={{
                marginTop: 'var(--space-lg)',
                padding: 'var(--padding-inner)',
                borderRadius: 'var(--radius-inner-visual)'
              }}
            >
              <span className="text-label text-text-muted uppercase tracking-[0.15em]">
                {isPaymentHold ? 'Total del intento' : 'Total de la Orden'}
              </span>
              <span className="text-h1 text-text-main">${(currentOrder.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          </NexusSection>

          {/* Shipping Logic Section: Dark Variant */}
          <div
            className="bg-stone-900 p-[var(--padding-outer)] text-white shadow-xl shadow-stone-900/20 border border-stone-800 flex flex-col"
            style={{ borderRadius: 'var(--radius-outer)', gap: 'var(--space-lg)' }}
          >
            <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
               <div
                 className="w-12 h-12 bg-white/10 flex items-center justify-center text-brand-400 border border-white/10"
                 style={{ borderRadius: 'var(--radius-inner-visual)' }}
               >
                  <Truck size={24} strokeWidth={1.5} />
               </div>
               <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <h3 className="text-h2 tracking-tight">Logística de Envío</h3>
                  <p className="text-label text-white/40 uppercase tracking-[0.15em]">Instrucciones de entrega</p>
               </div>
            </div>

            <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
              {hasBirds && (
                <div className="flex flex-col" style={{ gap: 'var(--space-sm)' }}>
                  <div className="flex items-center text-brand-400" style={{ gap: 'var(--space-xs)' }}>
                    <Plane size={16} strokeWidth={2.5} />
                    <span className="text-label uppercase tracking-[0.15em]">Envío de Aves</span>
                  </div>
                  <div
                    className="bg-white/5 border border-white/10"
                    style={{
                      padding: 'var(--padding-inner)',
                      borderRadius: 'var(--radius-inner-visual)'
                    }}
                  >
                    <p className="text-secondary leading-relaxed text-stone-300">
                      {hasItems
                        ? `El envío se realizará al aeropuerto o terminal más cercana al estado de ${currentOrder.customerState}.`
                        : (currentOrder.customerAddress || `El envío se realizará al aeropuerto o terminal más cercana al estado de ${currentOrder.customerState}.`)
                      }
                    </p>
                  </div>
                </div>
              )}

              {hasItems && (
                <div className="flex flex-col" style={{ gap: 'var(--space-sm)' }}>
                  <div className="flex items-center text-blue-400" style={{ gap: 'var(--space-xs)' }}>
                    <Truck size={16} strokeWidth={2.5} />
                    <span className="text-label uppercase tracking-[0.15em]">Envío de Artículos</span>
                  </div>
                  <div
                    className="bg-white/5 border border-white/10"
                    style={{
                      padding: 'var(--padding-inner)',
                      borderRadius: 'var(--radius-inner-visual)'
                    }}
                  >
                    <p className="text-label text-white/30 uppercase tracking-[0.15em]" style={{ marginBottom: 'var(--space-xs)' }}>Dirección Completa</p>
                    <p className="text-secondary leading-relaxed text-stone-300">
                      {currentOrder.customerAddress || 'No se proporcionó dirección completa.'}
                    </p>
                  </div>
                </div>
              )}

              {!hasBirds && !hasItems && (
                <p className="text-stone-400 text-secondary italic">No hay información de envío disponible.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Customer & WhatsApp */}
        <div className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>

          {/* Customer Info Section */}
          <NexusSection
            title="Cliente"
            subtitle="Datos de contacto"
            icon={User}
            iconVariant="brand"
            actionPlacement="below"
            action={
              !isPaymentHold ? (
                <NexusSectionButton
                  onClick={handleOpenCustomerModal}
                  icon={Edit2}
                >
                  Editar Cliente
                </NexusSectionButton>
              ) : undefined
            }
          >
            <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
              <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
                <div
                  className="w-12 h-12 bg-bg-muted border border-border-main flex items-center justify-center text-stone-400 shrink-0"
                  style={{ borderRadius: 'var(--radius-inner-visual)' }}
                >
                  <User size={20} strokeWidth={2} />
                </div>
                <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <p className="text-label text-stone-400 uppercase tracking-[0.15em]">Nombre</p>
                  <p className="text-secondary text-text-main font-bold">{currentOrder.customer}</p>
                </div>
              </div>

              <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
                <div
                  className="w-12 h-12 bg-bg-muted border border-border-main flex items-center justify-center text-stone-400 shrink-0"
                  style={{ borderRadius: 'var(--radius-inner-visual)' }}
                >
                  <Phone size={20} strokeWidth={2} />
                </div>
                <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <p className="text-label text-stone-400 uppercase tracking-[0.15em]">Teléfono</p>
                  <p className="text-secondary text-text-main font-bold">{currentOrder.customerPhone}</p>
                </div>
              </div>

              <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
                <div
                  className="w-12 h-12 bg-bg-muted border border-border-main flex items-center justify-center text-stone-400 shrink-0"
                  style={{ borderRadius: 'var(--radius-inner-visual)' }}
                >
                  <MapPin size={20} strokeWidth={2} />
                </div>
                <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <p className="text-label text-stone-400 uppercase tracking-[0.15em]">Estado</p>
                  <p className="text-secondary text-text-main font-bold">{currentOrder.customerState}</p>
                </div>
              </div>
            </div>
          </NexusSection>

          <NexusModal
            isOpen={isCustomerModalOpen}
            onClose={() => setIsCustomerModalOpen(false)}
            title={currentOrder.customer || 'Cliente'}
            eyebrow="Editar Cliente"
            icon={User}
            iconTone="brand"
            size="standard"
            zIndex={260}
          >
            <form onSubmit={handleSaveCustomer} className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>
              <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
                <NexusInput
                  label="Nombre *"
                  value={customerForm.customerName}
                  onChange={(event) => setCustomerForm({ ...customerForm, customerName: event.target.value })}
                  placeholder="Nombre del cliente"
                  icon={User}
                  required
                />

                <NexusInput
                  label="Teléfono / WhatsApp *"
                  value={customerForm.customerPhone}
                  onChange={(event) => setCustomerForm({ ...customerForm, customerPhone: event.target.value })}
                  placeholder="Ej. 2225251930"
                  icon={Phone}
                  required
                />

                <NexusSelect
                  label="Estado"
                  value={customerForm.shippingState}
                  onChange={(event) => setCustomerForm({ ...customerForm, shippingState: event.target.value })}
                  icon={MapPin}
                >
                  <option value="">Sin estado</option>
                  {MEXICO_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </NexusSelect>
              </div>

              <NexusModalActions>
                <NexusAutonomousButton
                  type="button"
                  variant="secondary"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </NexusAutonomousButton>
                <NexusAutonomousButton
                  type="submit"
                  variant="brand"
                  icon={Save}
                  isLoading={isSavingCustomer}
                  disabled={!customerForm.customerName.trim() || !customerForm.customerPhone.trim()}
                  className="flex-[2]"
                >
                  Guardar Cambios
                </NexusAutonomousButton>
              </NexusModalActions>
            </form>
          </NexusModal>

          {isMercadoPagoOrder && (
            <NexusSection
              title="Mercado Pago"
              subtitle="Pago con tarjeta"
              icon={CreditCard}
              iconVariant={currentOrder.paymentStatus === 'APPROVED' ? 'emerald' : 'brand'}
              actionPlacement="below"
              action={
                canRefundMercadoPago ? (
                  <NexusSectionButton
                    onClick={() => setIsRefundModalOpen(true)}
                    icon={RotateCcw}
                    variant="secondary"
                  >
                    Devolver Pago
                  </NexusSectionButton>
                ) : undefined
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 'var(--space-md)' }}>
                <DetailField label="Estado" value={getPaymentStatusLabel(currentOrder.paymentStatus)} />
                <DetailField
                  label={isPaymentHold ? 'Resultado' : 'Monto pagado'}
                  value={isPaymentHold ? 'Sin cobro confirmado' : formatCurrency(currentOrder.mpPaidAmount || currentOrder.total)}
                />
                <DetailField label="ID de pago" value={currentOrder.mpPaymentId || 'No disponible'} wide />
                {currentOrder.mpPaymentStatusDetail && (
                  <DetailField label="Detalle de Mercado Pago" value={currentOrder.mpPaymentStatusDetail} wide />
                )}
                {isPaymentHold && (
                  <>
                    <DetailField label="Estado de retención" value={currentOrder.holdStatus || 'No disponible'} />
                    <DetailField label="Vencimiento" value={currentOrder.expiresAt ? formatDateTime(currentOrder.expiresAt) : 'No disponible'} />
                  </>
                )}
                <DetailField
                  label="Método"
                  value={[
                    currentOrder.mpPaymentMethodId,
                    currentOrder.mpPaymentTypeId,
                  ].filter(Boolean).join(' / ') || 'Mercado Pago'}
                  wide
                />
                {currentOrder.mpRefundedAt && (
                  <>
                    <DetailField label="Monto devuelto" value={formatCurrency(currentOrder.mpRefundedAmount)} />
                    <DetailField label="Fecha de devolución" value={formatDateTime(currentOrder.mpRefundedAt)} />
                    <DetailField label="ID de devolución" value={currentOrder.mpRefundId || 'No disponible'} wide />
                  </>
                )}
              </div>

              {isPaymentHold && currentOrder.paymentAttempts?.length ? (
                <div
                  className="flex flex-col border-t border-border-main pt-[var(--space-lg)]"
                  style={{ gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}
                >
                  <div>
                    <h3 className="text-h2 font-bold text-text-main">Historial de intentos</h3>
                    <p className="text-secondary text-text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                      Cada envío de tarjeta se conserva por separado para mantener la trazabilidad.
                    </p>
                  </div>
                  {currentOrder.paymentAttempts.map((attempt, index) => {
                    const attemptStatus = attempt.status.toUpperCase();
                    const attemptVariant = attemptStatus === 'APPROVED'
                      ? 'success'
                      : ['PROCESSING', 'UNKNOWN'].includes(attemptStatus)
                        ? 'warning'
                        : 'danger';
                    const attemptLabel = attemptStatus === 'APPROVED'
                      ? 'Aprobado'
                      : attemptStatus === 'PROCESSING'
                        ? 'En revisión'
                        : attemptStatus === 'UNKNOWN'
                          ? 'Por conciliar'
                          : 'Rechazado';

                    return (
                      <div
                        key={attempt.id}
                        className="border border-border-main bg-bg-muted/50 p-[var(--padding-card-nested)]"
                        style={{ borderRadius: 'var(--radius-card-nested)' }}
                      >
                        <div className="flex flex-wrap items-center justify-between" style={{ gap: 'var(--space-sm)' }}>
                          <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
                            <span className="text-label uppercase tracking-[0.15em] text-text-muted">
                              Intento {currentOrder.paymentAttempts!.length - index}
                            </span>
                            <NexusBadge variant={attemptVariant}>{attemptLabel}</NexusBadge>
                          </div>
                          <span className="text-label text-text-muted">{formatDateTime(attempt.createdAt)}</span>
                        </div>
                        <div
                          className="grid grid-cols-1 sm:grid-cols-2"
                          style={{ gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}
                        >
                          <DetailField label="Mensaje" value={attempt.customerMessage || 'Sin mensaje'} wide />
                          <DetailField label="Detalle" value={attempt.statusDetail || 'No disponible'} />
                          <DetailField label="ID de pago" value={attempt.mpPaymentId || 'No disponible'} />
                          <DetailField label="Reintento" value={attempt.retryable ? 'Permitido' : 'No disponible'} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </NexusSection>
          )}

          {!isPaymentHold && <NexusSection
            title="WhatsApp"
            subtitle="Historial de notificaciones"
            icon={MessageCircle}
            iconVariant="emerald"
            actionPlacement="below"
            action={
              <NexusSectionButton
                onClick={handleResendWhatsApp}
                isLoading={isResending}
                icon={MessageCircle}
              >
                Reenviar WhatsApp
              </NexusSectionButton>
            }
          >
            <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
              {isLoadingWhatsappLogs && (
                <p className="text-secondary text-text-muted">Cargando historial...</p>
              )}

              {!isLoadingWhatsappLogs && whatsappLogs.length === 0 && (
                <div
                  className="border border-border-main bg-bg-muted text-text-muted"
                  style={{
                    padding: 'var(--padding-inner)',
                    borderRadius: 'var(--radius-inner-visual)',
                  }}
                >
                  <p className="text-secondary">Aún no hay intentos registrados para esta orden.</p>
                </div>
              )}

              {whatsappLogs.map((log) => {
                const isFailed = log.status === 'failed';
                const statusLabel = getWhatsAppStatusLabel(log.status);

                return (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => setSelectedWhatsappLog(log)}
                    className="flex w-full flex-col border border-border-main bg-bg-muted/40 text-left transition-all duration-300 hover:-translate-y-0.5 hover:bg-bg-muted"
                    style={{
                      gap: 'var(--space-md)',
                      padding: 'var(--padding-inner)',
                      borderRadius: 'var(--radius-inner-visual)',
                    }}
                  >
                    <div className="flex min-w-0 items-center" style={{ gap: 'var(--space-md)' }}>
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center border ${
                          !isFailed
                            ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                            : 'border-rose-100 bg-rose-50 text-rose-500'
                        }`}
                        style={{ borderRadius: 'var(--radius-nested-simple)' }}
                      >
                        {!isFailed ? <CheckCircle2 size={20} /> : <CircleX size={20} />}
                      </div>

                      <div className="flex min-w-0 flex-col" style={{ gap: 'var(--space-xs)' }}>
                        <p className="text-secondary font-bold text-text-main">
                          {statusLabel}
                        </p>
                        <p className="text-label truncate uppercase tracking-[0.15em] text-text-muted">
                          {getWhatsAppPurposeLabel(log.templateUsed)}
                        </p>
                      </div>
                    </div>

                    <div
                      className="flex flex-wrap items-center justify-between border-t border-border-main"
                      style={{ gap: 'var(--space-sm)', paddingTop: 'var(--space-md)' }}
                    >
                      <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
                        <span className="flex shrink-0 flex-col uppercase tracking-[0.15em]" style={{ gap: 'var(--space-xs)' }}>
                          <span className="text-label font-bold text-text-main">
                            {formatShortDate(log.sentAt)}
                          </span>
                          <span className="text-label text-text-muted">
                            {formatShortTime(log.sentAt)}
                          </span>
                        </span>
                        {log.attempt > 1 && (
                          <span className="text-label uppercase tracking-[0.15em] text-text-muted">
                            Intento {log.attempt}
                          </span>
                        )}
                      </div>
                      <span className="text-label uppercase tracking-[0.15em] text-brand-600">
                        Ver detalle
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </NexusSection>}

          <NexusModal
            isOpen={Boolean(selectedWhatsappLog)}
            onClose={() => setSelectedWhatsappLog(null)}
            title={selectedWhatsappLog ? getWhatsAppStatusLabel(selectedWhatsappLog.status) : 'WhatsApp'}
            eyebrow="Detalle de notificación"
            icon={MessageCircle}
            iconTone={selectedWhatsappLog?.status === 'failed' ? 'danger' : 'brand'}
            size="standard"
            zIndex={260}
          >
            {selectedWhatsappLog && (
              <div className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 'var(--space-md)' }}>
                  <DetailField label="Propósito" value={getWhatsAppPurposeLabel(selectedWhatsappLog.templateUsed)} />
                  <DetailField label="Fecha del intento" value={formatDateTime(selectedWhatsappLog.sentAt)} />
                  <DetailField label="Teléfono" value={selectedWhatsappLog.recipientPhone} />
                  <DetailField label="Intento" value={String(selectedWhatsappLog.attempt)} />
                  <DetailField label="Evolution" value={selectedWhatsappLog.providerStatus || 'Sin estado'} />
                  <DetailField
                    label="Último estado"
                    value={selectedWhatsappLog.lastStatusAt ? formatDateTime(selectedWhatsappLog.lastStatusAt) : 'Sin actualización'}
                  />
                  <DetailField label="Instancia" value={selectedWhatsappLog.instanceName} wide />
                  <DetailField label="Message ID" value={selectedWhatsappLog.messageId || 'No disponible'} wide />
                  {selectedWhatsappLog.jobId && (
                    <DetailField label="Job ID" value={selectedWhatsappLog.jobId} wide />
                  )}
                </div>

                {selectedWhatsappLog.errorMessage && (
                  <div
                    className="border border-rose-100 bg-rose-50 text-rose-600"
                    style={{
                      padding: 'var(--padding-inner)',
                      borderRadius: 'var(--radius-card-inner)',
                    }}
                  >
                    <p className="text-label uppercase tracking-[0.15em]">Error</p>
                    <p className="text-secondary leading-relaxed" style={{ marginTop: 'var(--space-xs)' }}>
                      {selectedWhatsappLog.errorMessage}
                    </p>
                  </div>
                )}

                {selectedWhatsappLog.status === 'failed' && (
                  <NexusModalActions>
                    <NexusAutonomousButton
                      onClick={handleResendWhatsApp}
                      isLoading={isResending}
                      icon={MessageCircle}
                      variant="brand"
                      className="w-full"
                    >
                      Reenviar WhatsApp
                    </NexusAutonomousButton>
                  </NexusModalActions>
                )}
              </div>
            )}
          </NexusModal>

          <NexusConfirmModal
            isOpen={isRefundModalOpen}
            onCancel={() => setIsRefundModalOpen(false)}
            onConfirm={handleRefundMercadoPago}
            title="¿Devolver pago?"
            message="Se realizará la devolución total en Mercado Pago, se cancelará la orden y se liberará el inventario."
            confirmLabel={isRefunding ? 'Devolviendo...' : 'Devolver pago'}
            tone="danger"
            icon={RotateCcw}
            zIndex={270}
          />

        </div>
      </div>

    </div>
  );
};
