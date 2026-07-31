import React, { useMemo, useRef, useState } from 'react';
import {
  Bird,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleX,
  Clock,
  CreditCard,
  Hash,
  Layers,
  MoreVertical,
  Package,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';
import { Order } from '../../../types';
import { NexusAutonomousBadge, type NexusBadgeVariant } from '../../ui/NexusBadge';
import { NexusAutonomousButton } from '../../ui/NexusButton';
import { NexusAutonomousCard } from '../../ui/NexusCard';
import { NexusAutonomousIcon } from '../../ui/NexusIcon';

interface OrderCardProps {
  order: Order;
  canManageOperations: boolean;
  onViewDetail: (order: Order) => void;
  onMarkAsPaid: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void;
  style?: React.CSSProperties;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const pureDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
  const parts = pureDate.split('-');
  if (parts.length < 3) return pureDate;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  canManageOperations,
  onViewDetail,
  onMarkAsPaid,
  onCancelOrder,
  style,
}) => {
  const lastTap = useRef<number>(0);
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  const handleCardInteraction = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      onViewDetail(order);
    }
    lastTap.current = now;
  };

  const orderType = useMemo(() => {
    const items = order.items || [];
    const hasBirds = items.some((item) => item.type?.toUpperCase() === 'BIRD');
    const hasItems = items.some((item) => item.type?.toUpperCase() === 'ITEM');

    if (hasBirds && hasItems) return { label: 'Mixto', icon: Layers, mainIcon: Layers };
    if (hasBirds) return { label: 'Aves', icon: Bird, mainIcon: Bird };
    return { label: 'Artículos', icon: ShoppingBag, mainIcon: ShoppingBag };
  }, [order.items]);
  const productSummary = useMemo(() => {
    const items = order.items || [];
    if (items.length === 0) return 'Sin productos';

    const firstItem = items[0];
    const firstLabel = firstItem.quantity > 1
      ? `${firstItem.quantity} × ${firstItem.name}`
      : firstItem.name;
    const remainingProducts = items.length - 1;

    return remainingProducts > 0
      ? `${firstLabel} + ${remainingProducts} ${remainingProducts === 1 ? 'producto' : 'productos'}`
      : firstLabel;
  }, [order.items]);
  const isPaymentHold = order.recordType === 'PAYMENT_HOLD';

  const statusConfig = useMemo<{
    cardOpacity: string;
    iconVariant: 'emerald' | 'brand' | 'orange' | 'muted';
    badgeVariant: NexusBadgeVariant;
    icon: LucideIcon;
    label: string;
  }>(() => {
    switch (order.status) {
      case 'paid':
        return {
          cardOpacity: '',
          iconVariant: 'emerald',
          badgeVariant: 'success',
          icon: CheckCircle2,
          label: 'Pagada',
        };
      case 'pending':
        return {
          cardOpacity: '',
          iconVariant: 'brand',
          badgeVariant: 'warning',
          icon: Clock,
          label: 'Apartada',
        };
      case 'cancelled':
        return {
          cardOpacity: 'opacity-70 grayscale-[0.5]',
          iconVariant: 'muted',
          badgeVariant: 'danger',
          icon: CircleX,
          label: 'Cancelada',
        };
      case 'payment_review':
        return {
          cardOpacity: '',
          iconVariant: 'orange',
          badgeVariant: 'warning',
          icon: Clock,
          label: 'En revisión',
        };
      case 'not_completed':
        return {
          cardOpacity: 'opacity-70 grayscale-[0.5]',
          iconVariant: 'muted',
          badgeVariant: 'danger',
          icon: CircleX,
          label: 'No concretada',
        };
      default:
        return {
          cardOpacity: '',
          iconVariant: 'muted',
          badgeVariant: 'muted',
          icon: Package,
          label: order.status,
        };
    }
  }, [order.status]);

  const mobileStatusLabel =
    statusConfig.label === 'Apartada'
      ? 'Apart.'
      : statusConfig.label === 'Pagada'
        ? 'Pag.'
        : statusConfig.label === 'Cancelada'
          ? 'Cancel.'
          : statusConfig.label;

  const isCardPayment = order.paymentMethod === 'MERCADOPAGO';
  const paymentMethodLabel = isCardPayment ? 'Tarjeta' : 'Dep. / Trans.';

  return (
    <NexusAutonomousCard
      swipeable={canManageOperations && !isPaymentHold && order.status === 'pending'}
      isMuted={order.status === 'cancelled' || order.status === 'not_completed'}
      className={`group ${statusConfig.cardOpacity} animate-in fade-in duration-500`}
      style={style}
      customSwipeLeft={
        <NexusAutonomousButton
          onClick={() => onMarkAsPaid(order.id)}
          variant="success"
          icon={Check}
        >
          Confirmar pago
        </NexusAutonomousButton>
      }
      customSwipeRight={
        <NexusAutonomousButton
          onClick={() => onCancelOrder(order.id)}
          variant="secondary"
          className="border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
          icon={CircleX}
        >
          Cancelar orden
        </NexusAutonomousButton>
      }
    >
      <div
        onClick={handleCardInteraction}
        onDoubleClick={() => onViewDetail(order)}
        className="flex w-full cursor-pointer select-none flex-col sm:hidden"
        style={{ gap: 'var(--space-md)' }}
      >
        <div className="flex w-full items-center" style={{ gap: 'var(--space-md)' }}>
          <NexusAutonomousIcon
            icon={orderType.mainIcon}
            variant={statusConfig.iconVariant}
            isMuted={order.status === 'cancelled' || order.status === 'not_completed'}
            style={{
              width: 'var(--size-card-thumb)',
              height: 'var(--size-card-thumb)',
            }}
          />

          <div className="flex min-w-0 flex-1 flex-col justify-center" style={{ gap: 'var(--space-sm)' }}>
            <div className="flex min-w-0 flex-wrap items-center" style={{ gap: 'var(--space-xs)' }}>
              <NexusAutonomousBadge
                variant={statusConfig.badgeVariant}
                icon={statusConfig.icon}
              >
                {mobileStatusLabel}
              </NexusAutonomousBadge>
              <NexusAutonomousBadge
                variant="muted"
                icon={CreditCard}
              >
                {paymentMethodLabel}
              </NexusAutonomousBadge>
            </div>

            <div className="flex min-w-0 flex-col" style={{ gap: 'var(--space-xs)' }}>
              <h3 className="truncate text-h2 font-bold text-text-main">
                {order.customer}
              </h3>
              <p className="truncate text-secondary text-text-muted">{productSummary}</p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center" style={{ gap: 'var(--space-xs)' }}>
          <NexusAutonomousBadge
            variant="brand"
            icon={isPaymentHold ? CreditCard : Hash}
          >
            {isPaymentHold ? 'Intento MP' : order.id}
          </NexusAutonomousBadge>
          <NexusAutonomousBadge
            variant="muted"
            icon={orderType.icon}
          >
            {orderType.label}
          </NexusAutonomousBadge>
        </div>

        <div
          className="flex w-full items-center justify-between border-t border-border-main pt-[var(--space-md)]"
          style={{ gap: 'var(--space-md)' }}
        >
          <div className="flex min-w-0 flex-col" style={{ gap: 'var(--space-xs)' }}>
            <span className="text-label uppercase tracking-[0.15em] text-text-muted">Fecha</span>
            <div className="flex items-center text-secondary font-bold text-text-main" style={{ gap: 'var(--space-xs)' }}>
              <Calendar
                className="text-text-muted"
                strokeWidth={2.5}
                style={{ width: 'var(--size-inner-icon-badge)', height: 'var(--size-inner-icon-badge)' }}
              />
              {formatDate(order.date)}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end" style={{ gap: 'var(--space-xs)' }}>
            <span className="text-label uppercase tracking-[0.15em] text-text-muted">Total</span>
            <div className="flex items-baseline text-secondary font-bold text-text-main">
              <span className="mr-0.5 text-secondary opacity-50">$</span>
              {order.total.toLocaleString('es-MX', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      </div>

      <div
        onClick={handleCardInteraction}
        onDoubleClick={() => onViewDetail(order)}
        className="hidden w-full cursor-pointer select-none flex-row items-center sm:flex"
        style={{ gap: 'var(--space-md)' }}
      >
          <NexusAutonomousIcon
            icon={orderType.mainIcon}
            variant={statusConfig.iconVariant}
            isMuted={order.status === 'cancelled' || order.status === 'not_completed'}
          style={{
            width: 'var(--size-card-thumb)',
            height: 'var(--size-card-thumb)',
          }}
        />

        <div className="flex min-w-0 flex-1 flex-row items-center" style={{ gap: 'var(--space-md)' }}>
          <div className="flex min-w-0 flex-1 flex-col justify-center" style={{ gap: 'var(--space-sm)' }}>
            <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-xs)' }}>
              <NexusAutonomousBadge
                variant={statusConfig.badgeVariant}
                icon={statusConfig.icon}
              >
                {statusConfig.label}
              </NexusAutonomousBadge>
              <NexusAutonomousBadge
                variant="muted"
                icon={CreditCard}
              >
                {paymentMethodLabel}
              </NexusAutonomousBadge>
              <NexusAutonomousBadge
                variant="brand"
                icon={isPaymentHold ? CreditCard : Hash}
              >
                {isPaymentHold ? 'Intento MP' : order.id}
              </NexusAutonomousBadge>
              <NexusAutonomousBadge
                variant="muted"
                icon={orderType.icon}
              >
                {orderType.label}
              </NexusAutonomousBadge>
            </div>

            <div className="flex min-w-0 flex-col" style={{ gap: 'var(--space-xs)' }}>
              <h3 className="truncate text-h2 font-bold text-text-main">{order.customer}</h3>
              <p className="truncate text-secondary text-text-muted">{productSummary}</p>
            </div>
          </div>

          <div
            className="nexus-card-divider-desktop relative hidden shrink-0 items-center pl-[var(--space-md)] sm:flex"
            style={{ minWidth: 'var(--width-operation-card-summary)', minHeight: 'var(--size-button-card)' }}
          >
            {isActionsOpen ? (
              <div
                className="animate-raffle-actions-enter absolute inset-y-0 right-0 flex items-center justify-end"
                style={{ gap: 'var(--space-sm)', left: 'var(--space-md)' }}
              >
              {canManageOperations && !isPaymentHold && order.status === 'pending' && (
                <NexusAutonomousButton
                  density="compact"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsPaid(order.id);
                  }}
                  variant="success"
                  isIconOnly
                  icon={Check}
                  title="Marcar pagada"
                />
              )}
              {canManageOperations && !isPaymentHold && (order.status === 'pending' || order.status === 'paid') && (
                <NexusAutonomousButton
                  density="compact"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelOrder(order.id);
                  }}
                  variant="secondary"
                  isIconOnly
                  icon={CircleX}
                  className="hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600"
                  title="Cancelar"
                />
              )}
              <NexusAutonomousButton
                density="compact"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetail(order);
                }}
                variant="dark"
                isIconOnly
                icon={ChevronRight}
                  title="Ver detalles"
                />
                <NexusAutonomousButton
                  density="compact"
                  variant="secondary"
                  isIconOnly
                  icon={MoreVertical}
                  title="Cerrar acciones"
                  aria-expanded
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsActionsOpen(false);
                  }}
                />
              </div>
            ) : (
              <div
                className="animate-raffle-summary-enter absolute inset-y-0 right-0 flex items-center justify-end"
                style={{ gap: 'var(--space-lg)', left: 'var(--space-md)' }}
              >
                <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <span className="text-label uppercase tracking-[0.15em] text-text-muted">Fecha</span>
                  <div className="flex items-center text-secondary font-bold text-text-main" style={{ gap: 'var(--space-xs)' }}>
                    <Calendar
                      className="text-text-muted"
                      strokeWidth={2.5}
                      style={{ width: 'var(--size-inner-icon-badge)', height: 'var(--size-inner-icon-badge)' }}
                    />
                    {formatDate(order.date)}
                  </div>
                </div>
                <div
                  className="flex flex-col items-end"
                  style={{ gap: 'var(--space-xs)', minWidth: 'var(--width-operation-card-total)' }}
                >
                  <span className="text-label uppercase tracking-[0.15em] text-text-muted">Total</span>
                  <div className="flex items-baseline text-secondary font-bold text-text-main">
                    <span className="mr-0.5 text-secondary opacity-50">$</span>
                    {order.total.toLocaleString('es-MX', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <NexusAutonomousButton
                  density="compact"
                  variant="secondary"
                  isIconOnly
                  icon={MoreVertical}
                  title="Más acciones"
                  aria-expanded={false}
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsActionsOpen(true);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </NexusAutonomousCard>
  );
};
