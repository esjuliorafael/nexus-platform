import React, { useRef } from 'react';
import {
  Package, Clock, CheckCircle2, Phone, MapPin, User,
  Calendar, DollarSign, Plane, Truck, CircleX, ChevronLeft, ChevronRight, Layers, MessageCircle, Edit2, Save,
  CreditCard, RotateCcw, History, ArrowLeftRight, Search, ShoppingCart
} from 'lucide-react';
import { Order, OrderReplacementQuote, Product, WhatsAppMessageLog } from '../../../types';
import { NexusAutonomousButton, NexusSectionButton } from '../../ui/NexusButton';
import { NexusSection } from '../../ui/NexusSection';
import { NexusModal, NexusModalActions } from '../../ui/NexusModal';
import { NexusConfirmModal } from '../../ui/NexusConfirmModal';
import { NexusInput, NexusSelect } from '../../ui/NexusInputs';
import { NexusSegmentedControl } from '../../ui/NexusSegmentedControl';
import { NexusPhoneField } from '../../ui/NexusPhoneField';
import { NexusBadge } from '../../ui/NexusBadge';
import { ASSET_BASE_URL, apiOrders, apiProducts } from '../../../api';
import { MEXICO_STATES } from '../../../constants';
import { isCustomerPhoneComplete } from '../../../utils/customer-phone';
import { getWhatsappDeliveryRouteLabel } from '../../../utils/whatsapp-routing';
import { NexusActivityHistory } from '../../ui/NexusActivityHistory';

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
  canManageOrder: boolean;
  canRefundOrder: boolean;
  canSendMessages: boolean;
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
  if (status === 'PARTIALLY_PAID') return 'Pago parcial';
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

const isWhatsappAcceptedForDelivery = (
  status: string,
  providerStatus?: string | null,
) =>
  status === 'pending' &&
  ['accepted', 'pending', 'server_ack'].includes(
    String(providerStatus || '').toLowerCase(),
  );

const getWhatsAppStatusLabel = (
  status: string,
  providerStatus?: string | null,
) => {
  if (status === 'read') return 'Leído';
  if (status === 'delivered') return 'Entregado';
  if (status === 'server_ack') return 'Aceptado';
  if (isWhatsappAcceptedForDelivery(status, providerStatus)) return 'Enviado';
  if (status === 'pending') return 'Pendiente';
  if (status === 'sent') return 'Enviado';
  if (status === 'failed') return 'Fallido';
  return status;
};

const getWhatsAppPurposeLabel = (template: string) => {
  if (template === 'order-item-changed' || template === 'order_item_changed') return 'Cambio de producto';
  if (template === 'order-paid' || template === 'order_paid') return 'Pago';
  if (template === 'order-refunded' || template === 'order_refunded') return 'Devolución';
  if (template === 'order-reminder' || template === 'order_reminder') return 'Recordatorio';
  if (template === 'order-restored' || template === 'order_restored') return 'Restauración';
  if (template === 'order-cancelled' || template === 'order_cancelled') return 'Liberación';
  if (template === 'order' || template === 'order_principal' || template.startsWith('order_')) return 'Apartado';
  if (template === 'reservation') return 'Apartado de rifa';
  if (template === 'reservation-paid' || template === 'reservation_paid_rifas') return 'Pago de rifa';
  if (template === 'reservation-refunded' || template === 'reservation_refunded_rifas') return 'Devolución de rifa';
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
  showToast,
  canManageOrder,
  canRefundOrder,
  canSendMessages,
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
  const [isReplaceModalOpen, setIsReplaceModalOpen] = React.useState(false);
  const [isReplaceConfirmOpen, setIsReplaceConfirmOpen] = React.useState(false);
  const [isLoadingReplacementProducts, setIsLoadingReplacementProducts] = React.useState(false);
  const [isLoadingReplacementQuote, setIsLoadingReplacementQuote] = React.useState(false);
  const [isReplacingItem, setIsReplacingItem] = React.useState(false);
  const [replacementQuote, setReplacementQuote] = React.useState<OrderReplacementQuote | null>(null);
  const [replacementStep, setReplacementStep] = React.useState<'selection' | 'details'>('selection');
  const [replacementSource, setReplacementSource] = React.useState<'cart' | 'products'>('cart');
  const [replacementSearchQuery, setReplacementSearchQuery] = React.useState('');
  const [replacementProducts, setReplacementProducts] = React.useState<Product[]>([]);
  const [replacementForm, setReplacementForm] = React.useState({
    sourceProductId: '',
    replacementProductId: '',
    reason: '',
    customerAuthorized: false,
    deliveryConfirmed: false,
  });
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

  const loadOrderDetail = React.useCallback(async () => {
    const detailedOrder = await apiOrders.getById(String(order.id));
    setCurrentOrder(detailedOrder);
    return detailedOrder;
  }, [order.id]);

  React.useEffect(() => {
    let isActive = true;
    void apiOrders.getById(String(order.id))
      .then((detailedOrder) => {
        if (isActive) setCurrentOrder(detailedOrder);
      })
      .catch(() => {
        if (isActive) {
          showToast('No se pudo cargar el historial de la orden', 'error');
        }
      });
    return () => {
      isActive = false;
    };
  }, [order.id, order.paymentStatus, order.status, showToast]);

  const itemsList = currentOrder?.items || [];
  const hasBirds = itemsList.some(item => item?.type?.toUpperCase() === 'BIRD');
  const hasItems = itemsList.some(item => item?.type?.toUpperCase() === 'ITEM');
  const isPaymentHold = currentOrder.recordType === 'PAYMENT_HOLD';
  const isMercadoPagoOrder = currentOrder.paymentMethod === 'MERCADOPAGO';
  const replaceableBirdItems = itemsList.filter((item) =>
    item?.type?.toUpperCase() === 'BIRD' && item.quantity === 1 && item.productId,
  );
  const canReplacePaidBird =
    canManageOrder &&
    !isPaymentHold &&
    ((currentOrder.status === 'paid' &&
      currentOrder.fulfillmentStatus === 'PAID' &&
      currentOrder.paymentStatus === 'APPROVED') ||
      (currentOrder.status === 'pending' &&
        currentOrder.paymentMethod === 'TRANSFER' &&
        ['PENDING', 'PARTIALLY_PAID'].includes(currentOrder.paymentStatus || ''))) &&
    replaceableBirdItems.length > 0;
  const selectedSourceItem = replaceableBirdItems.find(
    (item) => item.productId === replacementForm.sourceProductId,
  );
  const replacementOptions = replacementProducts.filter((product) =>
    product.type === 'BIRD' &&
    product.status === 'available' &&
    product.active &&
    product.published &&
    product.id !== replacementForm.sourceProductId,
  );
  const filteredReplacementOptions = replacementOptions.filter((product) => {
    const query = replacementSearchQuery.trim().toLocaleLowerCase();
    return !query || `${product.name} ${product.ringNumber || ''}`.toLocaleLowerCase().includes(query);
  });
  const canContinueReplacement = Boolean(
    selectedSourceItem &&
    replacementOptions.some((product) => product.id === replacementForm.replacementProductId),
  );
  const canSubmitReplacement =
    Boolean(selectedSourceItem) &&
    replacementOptions.some((product) => product.id === replacementForm.replacementProductId) &&
    replacementForm.reason.trim().length >= 8 &&
    replacementForm.customerAuthorized &&
    replacementForm.deliveryConfirmed;
  const canRefundMercadoPago =
    canRefundOrder &&
    isMercadoPagoOrder &&
    String(currentOrder.status || '').toLowerCase() === 'paid' &&
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
      await loadOrderDetail();
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
      await apiOrders.updateCustomer(currentOrder.id, {
        customerName: customerForm.customerName,
        customerPhone: customerForm.customerPhone,
        shippingState: customerForm.shippingState || null,
      });
      await loadOrderDetail();
      setIsCustomerModalOpen(false);
      showToast('Información del cliente actualizada', 'success');
    } catch (error) {
      showToast('No se pudo actualizar el cliente', 'error');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleOpenReplaceModal = async () => {
    setReplacementForm({
      sourceProductId: replaceableBirdItems.length === 1 ? replaceableBirdItems[0].productId : '',
      replacementProductId: '',
      reason: '',
      customerAuthorized: false,
      deliveryConfirmed: false,
    });
    setReplacementStep('selection');
    setReplacementSource('cart');
    setReplacementSearchQuery('');
    setReplacementQuote(null);
    setIsReplaceModalOpen(true);
    setIsLoadingReplacementProducts(true);
    try {
      setReplacementProducts(await apiProducts.getAll());
    } catch (error: any) {
      setIsReplaceModalOpen(false);
      showToast(error?.response?.data?.message || 'No se pudieron cargar las aves disponibles', 'error');
    } finally {
      setIsLoadingReplacementProducts(false);
    }
  };

  const handlePreviewReplacement = async () => {
    if (!currentOrder?.id || !canContinueReplacement || isLoadingReplacementQuote) return;
    setIsLoadingReplacementQuote(true);
    try {
      const quote = await apiOrders.previewItemReplacement(currentOrder.id, {
        sourceProductId: Number(replacementForm.sourceProductId),
        replacementProductId: Number(replacementForm.replacementProductId),
      });
      setReplacementQuote(quote);
      setReplacementStep('details');
    } catch (error: any) {
      setReplacementQuote(null);
      showToast(error?.response?.data?.message || 'No se pudo calcular el nuevo total de la orden', 'error');
    } finally {
      setIsLoadingReplacementQuote(false);
    }
  };

  const handleReplacePaidBird = async () => {
    if (!currentOrder?.id || !canSubmitReplacement || isReplacingItem) return;
    setIsReplacingItem(true);
    try {
      const updatedOrder = await apiOrders.replaceItem(currentOrder.id, {
        sourceProductId: Number(replacementForm.sourceProductId),
        replacementProductId: Number(replacementForm.replacementProductId),
        reason: replacementForm.reason.trim(),
        customerAuthorized: true,
        deliveryConfirmed: true,
        expectedCurrentTotal: replacementQuote?.currentTotal ?? currentOrder.total,
        expectedNewTotal: replacementQuote?.newTotal ?? currentOrder.total,
        expectedNewSubtotal: replacementQuote?.newSubtotal ?? currentOrder.subtotal ?? currentOrder.total,
        expectedNewDiscount: replacementQuote?.newDiscount ?? currentOrder.discountTotal ?? 0,
        expectedPaidAmount: replacementQuote?.paidAmount ?? currentOrder.paidAmount ?? 0,
      });
      setCurrentOrder(updatedOrder);
      setIsReplaceConfirmOpen(false);
      setIsReplaceModalOpen(false);
      const amountMessage = replacementQuote?.totalChanged
        ? updatedOrder.paidAmount
          ? ` Saldo pendiente: ${formatCurrency(updatedOrder.balanceDue)}.`
          : ` Nuevo monto pendiente: ${formatCurrency(updatedOrder.balanceDue)}.`
        : ' El monto de la orden no cambió.';
      showToast(
        updatedOrder.whatsappNotificationQueued === false
          ? `Producto sustituido.${amountMessage} El aviso de WhatsApp no pudo ponerse en cola; revisa los registros.`
          : `Producto sustituido.${amountMessage} Aviso de WhatsApp en cola.`,
        updatedOrder.whatsappNotificationQueued === false ? 'error' : 'success',
      );
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'No se pudo sustituir el producto', 'error');
      await loadOrderDetail().catch(() => undefined);
    } finally {
      setIsReplacingItem(false);
    }
  };

  const handleRefundMercadoPago = async () => {
    if (!currentOrder?.id || isRefunding) return;
    setIsRefunding(true);
    try {
      await apiOrders.refundMercadoPago(currentOrder.id);
      await loadOrderDetail();
      setIsRefundModalOpen(false);
      showToast('Pago devuelto correctamente', 'success');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'No se pudo devolver el pago', 'error');
      await loadOrderDetail();
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
      style={{ gap: 'var(--space-lg)' }}
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
            actionPlacement="below"
            action={canReplacePaidBird ? (
              <NexusSectionButton
                onClick={handleOpenReplaceModal}
                icon={ArrowLeftRight}
                variant="secondary"
              >
                Sustituir ave
              </NexusSectionButton>
            ) : undefined}
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
                        {item?.type?.toUpperCase() === 'BIRD'
                          ? item?.ringNumber
                            ? `Ave · Anillo ${item.ringNumber}`
                            : 'Ave'
                          : 'Artículo'}
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
            {currentOrder.paymentStatus === 'PARTIALLY_PAID' && (
              <div className="grid grid-cols-2 border-t border-border-main pt-[var(--space-md)] text-secondary" style={{ gap: 'var(--space-md)' }}>
                <DetailField label="Monto recibido" value={formatCurrency(currentOrder.paidAmount)} />
                <DetailField label="Saldo pendiente" value={formatCurrency(currentOrder.balanceDue)} />
              </div>
            )}
          </NexusSection>

          <NexusModal
            isOpen={isReplaceModalOpen}
            onClose={() => setIsReplaceModalOpen(false)}
            title="Sustituir ave de la orden"
            eyebrow={replacementStep === 'selection' ? 'Paso 1 de 2 · Selección' : 'Paso 2 de 2 · Motivo y autorización'}
            icon={ArrowLeftRight}
            iconTone="brand"
            size="standard"
            zIndex={265}
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (replacementStep === 'selection') {
                  void handlePreviewReplacement();
                  return;
                }
                if (canSubmitReplacement) setIsReplaceConfirmOpen(true);
              }}
              className="flex flex-col"
              style={{ gap: 'var(--space-lg)' }}
            >
              <p className="text-secondary text-text-muted">
                {replacementStep === 'selection'
                  ? 'Elige el ave actual y una sustitución disponible. Antes de confirmar verás el total y el saldo recalculados.'
                  : 'Registra el motivo y confirma los datos acordados con el cliente.'}
              </p>

              <div
                className="border border-amber-200 bg-amber-50 text-amber-900"
                style={{ padding: 'var(--padding-inner)', borderRadius: 'var(--radius-card-inner)' }}
              >
                <p className="text-secondary font-semibold">
                  {currentOrder.paymentStatus === 'PARTIALLY_PAID'
                    ? 'La orden tiene un pago parcial.'
                    : currentOrder.paymentStatus === 'APPROVED'
                      ? 'El pago está confirmado.'
                      : 'El pago aún está pendiente.'}
                </p>
                <p className="text-label leading-relaxed" style={{ marginTop: 'var(--space-xs)' }}>
                  Se respetará el cupón registrado y se recalculará el total. Una diferencia a favor del cliente no se convierte automáticamente en devolución; el cambio se bloqueará si el total queda por debajo de lo ya recibido. Los ajustes de monto con Mercado Pago tampoco se admiten. El aviso de WhatsApp se procesa después de guardar el cambio.
                </p>
              </div>

              {replacementStep === 'selection' ? (
                <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
                  <NexusSegmentedControl
                    context="section"
                    value={replacementSource}
                    ariaLabel="Origen del ave"
                    onChange={setReplacementSource}
                    className="grid h-[var(--h-input)] w-full grid-cols-2"
                    options={[
                      {
                        value: 'cart',
                        label: 'Carrito',
                        activeClassName: 'bg-bg-card text-brand-600 border border-border-main shadow-sm',
                      },
                      {
                        value: 'products',
                        label: 'Productos',
                        activeClassName: 'bg-bg-card text-brand-600 border border-border-main shadow-sm',
                      },
                    ]}
                  />

                  {replacementSource === 'cart' ? (
                    <div className="flex flex-col" style={{ gap: 'var(--space-sm)' }}>
                      <div className="flex items-center justify-between" style={{ gap: 'var(--space-sm)' }}>
                        <div className="flex items-center text-text-main" style={{ gap: 'var(--space-sm)' }}>
                          <ShoppingCart size={18} className="text-brand-600" />
                          <p className="text-button-card font-semibold">Aves de esta orden</p>
                        </div>
                        <span className="text-caption text-text-muted">
                          {replaceableBirdItems.length} {replaceableBirdItems.length === 1 ? 'ave' : 'aves'}
                        </span>
                      </div>
                      <div
                        className="divide-y divide-border-main overflow-hidden border border-border-main"
                        style={{ borderRadius: 'var(--radius-inner-visual)' }}
                      >
                        {replaceableBirdItems.map((item) => {
                          const isSelected = item.productId === replacementForm.sourceProductId;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => {
                                setReplacementForm({
                                  ...replacementForm,
                                  sourceProductId: item.productId,
                                  replacementProductId: '',
                                });
                                setReplacementQuote(null);
                              }}
                              className={`flex w-full min-w-0 items-center text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 ${isSelected ? 'bg-brand-50/70' : 'bg-bg-card hover:bg-bg-muted/60'}`}
                              style={{ gap: 'var(--space-md)', padding: 'var(--space-md)' }}
                            >
                              <OrderItemThumbnail item={item} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-button-card font-semibold text-text-main">{item.name}</span>
                                <span className="mt-[var(--space-xs)] block text-secondary text-text-muted">
                                  {item.ringNumber ? `Anillo ${item.ringNumber} · ` : ''}{formatCurrency(item.price)}
                                </span>
                              </span>
                              {isSelected && <CheckCircle2 size={20} className="shrink-0 text-brand-600" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
                      {!selectedSourceItem ? (
                        <div
                          className="flex items-start border border-border-main bg-bg-muted/50 text-text-muted"
                          style={{ gap: 'var(--space-sm)', padding: 'var(--space-md)', borderRadius: 'var(--radius-inner-visual)' }}
                        >
                          <ShoppingCart size={18} className="mt-0.5 shrink-0" />
                          <p className="text-secondary">Selecciona primero el ave actual en Carrito para consultar aves disponibles.</p>
                        </div>
                      ) : (
                        <>
                          <NexusInput
                            label="Buscar aves disponibles"
                            icon={Search}
                            value={replacementSearchQuery}
                            onChange={(event) => setReplacementSearchQuery(event.target.value)}
                            placeholder="Ej. Morado Patas Verdes o anillo 096"
                          />

                          <div
                            className="divide-y divide-border-main overflow-y-auto border border-border-main"
                            style={{ height: 'min(22rem, 36dvh)', borderRadius: 'var(--radius-inner-visual)' }}
                          >
                            {isLoadingReplacementProducts ? (
                              <div className="flex h-full flex-col justify-evenly" style={{ paddingInline: 'var(--space-md)' }} aria-label="Cargando aves disponibles">
                                {[0, 1, 2].map((index) => (
                                  <div key={index} className="flex items-center" style={{ gap: 'var(--space-md)' }}>
                                    <div className="h-12 w-12 shrink-0 animate-pulse bg-bg-muted" style={{ borderRadius: 'var(--radius-inner-visual)' }} />
                                    <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 'var(--space-sm)' }}>
                                      <div className="h-3 w-3/4 animate-pulse bg-bg-muted" />
                                      <div className="h-3 w-1/3 animate-pulse bg-bg-muted" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : filteredReplacementOptions.length === 0 ? (
                              <div className="flex h-full items-center justify-center text-center" style={{ padding: 'var(--space-md)' }}>
                                <p className="text-secondary text-text-muted">
                                  {replacementOptions.length === 0
                                    ? 'No hay otras aves disponibles para sustituir.'
                                    : 'No encontramos aves con esa búsqueda.'}
                                </p>
                              </div>
                            ) : (
                              filteredReplacementOptions.map((product) => {
                                const isSelected = product.id === replacementForm.replacementProductId;
                                return (
                                  <button
                                    key={product.id}
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => {
                                      setReplacementForm({ ...replacementForm, replacementProductId: product.id });
                                      setReplacementQuote(null);
                                    }}
                                    className={`flex w-full min-w-0 items-center text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 ${isSelected ? 'bg-brand-50/70' : 'bg-bg-card hover:bg-bg-muted/60'}`}
                                    style={{ gap: 'var(--space-md)', padding: 'var(--space-md)' }}
                                  >
                                    <OrderItemThumbnail item={product} />
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-button-card font-semibold text-text-main">
                                        {product.name}{product.ringNumber ? ` · Anillo ${product.ringNumber}` : ''}
                                      </span>
                                      <span className="mt-[var(--space-xs)] block text-secondary text-text-muted">
                                        {formatCurrency(product.price)} · Disponible
                                      </span>
                                    </span>
                                    {isSelected
                                      ? <CheckCircle2 size={20} className="shrink-0 text-brand-600" />
                                      : <span className="shrink-0 text-label font-bold text-brand-600">Seleccionar</span>}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
                  {replacementQuote && (
                    <div
                      className="border border-border-main bg-bg-muted/50"
                      style={{ padding: 'var(--padding-inner)', borderRadius: 'var(--radius-inner-visual)' }}
                    >
                      <div className="flex justify-between text-secondary text-text-muted">
                        <span>Total actual</span><span>{formatCurrency(replacementQuote.currentTotal)}</span>
                      </div>
                      <div className="mt-[var(--space-xs)] flex justify-between text-button-card font-semibold text-text-main">
                        <span>Nuevo total</span><span>{formatCurrency(replacementQuote.newTotal)}</span>
                      </div>
                      {replacementQuote.paidAmount > 0 && (
                        <div className="mt-[var(--space-xs)] flex justify-between text-secondary text-text-muted">
                          <span>Ya recibido</span><span>{formatCurrency(replacementQuote.paidAmount)}</span>
                        </div>
                      )}
                      <div className="mt-[var(--space-xs)] flex justify-between text-button-card font-semibold text-brand-700">
                        <span>{replacementQuote.paidAmount > 0 ? 'Saldo por cubrir' : 'Pendiente de pago'}</span>
                        <span>{formatCurrency(replacementQuote.balanceDue)}</span>
                      </div>
                      {replacementQuote.couponCode && (
                        <p className="mt-[var(--space-sm)] text-label text-text-muted">
                          Cupón {replacementQuote.couponCode}: descuento recalculado de {formatCurrency(replacementQuote.newDiscount)}.
                        </p>
                      )}
                      {replacementQuote.paymentMethod === 'MERCADOPAGO' && (
                        <p className="mt-[var(--space-sm)] text-label text-text-muted">
                          Mercado Pago conserva el importe cobrado; solo se permitirá si el total final no cambia.
                        </p>
                      )}
                    </div>
                  )}
                  <div
                    className="grid grid-cols-[1fr_auto_1fr] items-center border border-border-main bg-bg-muted/50"
                    style={{ gap: 'var(--space-sm)', padding: 'var(--space-md)', borderRadius: 'var(--radius-inner-visual)' }}
                  >
                    <div className="min-w-0">
                      <p className="text-label uppercase text-text-muted">Ave actual</p>
                      <p className="truncate text-button-card font-semibold text-text-main">{selectedSourceItem?.name}</p>
                      <p className="text-secondary text-text-muted">{formatCurrency(selectedSourceItem?.price)}</p>
                    </div>
                    <ArrowLeftRight size={18} className="text-brand-600" />
                    <div className="min-w-0 text-right">
                      <p className="text-label uppercase text-text-muted">Sustitución</p>
                      <p className="truncate text-button-card font-semibold text-text-main">
                        {replacementOptions.find((product) => product.id === replacementForm.replacementProductId)?.name}
                      </p>
                      <p className="text-secondary text-text-muted">
                        {formatCurrency(replacementOptions.find((product) => product.id === replacementForm.replacementProductId)?.price)}
                      </p>
                    </div>
                  </div>

                  <NexusInput
                    label="Motivo del cambio *"
                    value={replacementForm.reason}
                    onChange={(event) => setReplacementForm({ ...replacementForm, reason: event.target.value })}
                    placeholder="Ej. El cliente eligió otra ave por error"
                    minLength={8}
                    maxLength={500}
                    required
                    helperText="Se guardará en el historial de auditoría de la orden."
                  />

                  <div className="flex flex-col" style={{ gap: 'var(--space-sm)' }}>
                    <label className="flex items-start text-secondary text-text-main" style={{ gap: 'var(--space-sm)' }}>
                      <input
                        type="checkbox"
                        checked={replacementForm.customerAuthorized}
                        onChange={(event) => setReplacementForm({ ...replacementForm, customerAuthorized: event.target.checked })}
                        className="mt-1 accent-brand-600"
                        required
                      />
                      <span>El cliente autorizó expresamente este cambio.</span>
                    </label>
                    <label className="flex items-start text-secondary text-text-main" style={{ gap: 'var(--space-sm)' }}>
                      <input
                        type="checkbox"
                        checked={replacementForm.deliveryConfirmed}
                        onChange={(event) => setReplacementForm({ ...replacementForm, deliveryConfirmed: event.target.checked })}
                        className="mt-1 accent-brand-600"
                        required
                      />
                      <span>Se conservan la dirección y el método de entrega registrados.</span>
                    </label>
                  </div>
                </div>
              )}

              <NexusModalActions>
                <NexusAutonomousButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (replacementStep === 'selection') {
                      setIsReplaceModalOpen(false);
                    } else {
                      setReplacementQuote(null);
                      setReplacementStep('selection');
                    }
                  }}
                  className="flex-1"
                >
                  {replacementStep === 'selection' ? 'Cancelar' : 'Volver'}
                </NexusAutonomousButton>
                <NexusAutonomousButton
                  type="submit"
                  variant="brand"
                  icon={replacementStep === 'selection' ? ChevronRight : ArrowLeftRight}
                  disabled={replacementStep === 'selection'
                    ? !canContinueReplacement || isLoadingReplacementProducts || isLoadingReplacementQuote
                    : !canSubmitReplacement || isLoadingReplacementProducts}
                  isLoading={replacementStep === 'selection' && isLoadingReplacementQuote}
                  className="flex-[2]"
                >
                  {replacementStep === 'selection' ? 'Continuar' : 'Revisar sustitución'}
                </NexusAutonomousButton>
              </NexusModalActions>
            </form>
          </NexusModal>

          <NexusConfirmModal
            isOpen={isReplaceConfirmOpen}
            onCancel={() => setIsReplaceConfirmOpen(false)}
            onConfirm={handleReplacePaidBird}
            title="Confirmar sustitución"
            message={(
              <span>
                Se cambiará <strong>{selectedSourceItem?.name}</strong> por{' '}
                <strong>{replacementOptions.find((product) => product.id === replacementForm.replacementProductId)?.name}</strong>.
                {' '}Se liberará el ave anterior y la nueva quedará asignada a esta orden. El historial guardará el motivo y las confirmaciones. El total cambiará de{' '}
                <strong>{formatCurrency(replacementQuote?.currentTotal ?? currentOrder.total)}</strong> a{' '}
                <strong>{formatCurrency(replacementQuote?.newTotal ?? currentOrder.total)}</strong>.{' '}
                {replacementQuote?.paidAmount
                  ? <>Quedará un saldo pendiente de <strong>{formatCurrency(replacementQuote.balanceDue)}</strong>.</>
                  : replacementQuote?.balanceDue
                    ? <>El nuevo monto pendiente será <strong>{formatCurrency(replacementQuote.balanceDue)}</strong>.</>
                    : 'No habrá saldo pendiente.'}
              </span>
            )}
            confirmLabel="Sustituir producto"
            tone="warning"
            icon={ArrowLeftRight}
            zIndex={280}
            isLoading={isReplacingItem}
          />

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
                  <h3 className="text-h2 tracking-tight">Logística de envío</h3>
                  <p className="text-label text-white/40 uppercase tracking-[0.15em]">Instrucciones de entrega</p>
               </div>
            </div>

            <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
              {hasBirds && (
                <div className="flex flex-col" style={{ gap: 'var(--space-sm)' }}>
                  <div className="flex items-center text-brand-400" style={{ gap: 'var(--space-xs)' }}>
                    <Plane size={16} strokeWidth={2.5} />
                    <span className="text-label uppercase tracking-[0.15em]">Envío de aves</span>
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
                    <span className="text-label uppercase tracking-[0.15em]">Envío de artículos</span>
                  </div>
                  <div
                    className="bg-white/5 border border-white/10"
                    style={{
                      padding: 'var(--padding-inner)',
                      borderRadius: 'var(--radius-inner-visual)'
                    }}
                  >
                    <p className="text-label text-white/30 uppercase tracking-[0.15em]" style={{ marginBottom: 'var(--space-xs)' }}>Dirección completa</p>
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
              !isPaymentHold && canManageOrder ? (
                <NexusSectionButton
                  onClick={handleOpenCustomerModal}
                  icon={Edit2}
                >
                  Editar cliente
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
            eyebrow="Editar cliente"
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

                <NexusPhoneField
                  id="order-customer-phone"
                  label="Teléfono / WhatsApp"
                  required
                  value={customerForm.customerPhone}
                  onChange={(customerPhone) => setCustomerForm({ ...customerForm, customerPhone })}
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
                  disabled={!customerForm.customerName.trim() || !isCustomerPhoneComplete(customerForm.customerPhone)}
                  className="flex-[2]"
                >
                  Guardar cambios
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
                    Devolver pago
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
            action={canSendMessages ? (
              <NexusSectionButton
                onClick={handleResendWhatsApp}
                isLoading={isResending}
                icon={MessageCircle}
              >
                Reenviar WhatsApp
              </NexusSectionButton>
            ) : undefined}
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
                const isPending =
                  log.status === 'pending' &&
                  !isWhatsappAcceptedForDelivery(log.status, log.providerStatus);
                const statusLabel = getWhatsAppStatusLabel(
                  log.status,
                  log.providerStatus,
                );

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
                          isFailed
                            ? 'border-rose-100 bg-rose-50 text-rose-500'
                            : isPending
                              ? 'border-amber-100 bg-amber-50 text-amber-600'
                              : 'border-emerald-100 bg-emerald-50 text-emerald-600'
                        }`}
                        style={{ borderRadius: 'var(--radius-nested-simple)' }}
                      >
                        {isFailed
                          ? <CircleX size={20} />
                          : isPending
                            ? <Clock size={20} />
                            : <CheckCircle2 size={20} />}
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

          {!isPaymentHold && (
            <NexusSection
              title="Historial de actividad"
              subtitle="Acciones y responsables"
              icon={History}
              iconVariant="muted"
            >
              <NexusActivityHistory events={currentOrder.activityEvents} />
            </NexusSection>
          )}

          <NexusModal
            isOpen={Boolean(selectedWhatsappLog)}
            onClose={() => setSelectedWhatsappLog(null)}
            title={
              selectedWhatsappLog
                ? getWhatsAppStatusLabel(
                    selectedWhatsappLog.status,
                    selectedWhatsappLog.providerStatus,
                  )
                : 'WhatsApp'
            }
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
                  <DetailField
                    label="Proveedor"
                    value={
                      selectedWhatsappLog.provider === "KAPSO"
                        ? "WhatsApp Cloud API"
                        : "Evolution API"
                    }
                  />
                  <DetailField
                    label="Estado del proveedor"
                    value={selectedWhatsappLog.providerStatus || "Sin estado"}
                  />
                  <DetailField
                    label="Último estado"
                    value={selectedWhatsappLog.lastStatusAt ? formatDateTime(selectedWhatsappLog.lastStatusAt) : 'Sin actualización'}
                  />
                  <DetailField label="Instancia" value={selectedWhatsappLog.instanceName} wide />
                  <DetailField
                    label="Ruta de envío"
                    value={getWhatsappDeliveryRouteLabel(selectedWhatsappLog.responsePayload) || 'Canal configurado'}
                    wide
                  />
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
