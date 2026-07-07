import React, { useMemo, useRef } from 'react';
import {
  Bird,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleX,
  Clock,
  Hash,
  Layers,
  MapPin,
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
  onViewDetail: (order: Order) => void;
  onMarkAsPaid: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void;
  style?: React.CSSProperties;
}

const getStateAbbr = (stateName: string) => {
  const map: Record<string, string> = {
    Aguascalientes: 'Ags.',
    'Baja California': 'B.C.',
    'Baja California Sur': 'B.C.S.',
    Campeche: 'Camp.',
    Chiapas: 'Chis.',
    Chihuahua: 'Chih.',
    'Ciudad de Mexico': 'CDMX',
    'Ciudad de México': 'CDMX',
    Coahuila: 'Coah.',
    Colima: 'Col.',
    Durango: 'Dgo.',
    Guanajuato: 'Gto.',
    Guerrero: 'Gro.',
    Hidalgo: 'Hgo.',
    Jalisco: 'Jal.',
    Mexico: 'Edo. Mex.',
    México: 'Edo. Méx.',
    Michoacan: 'Mich.',
    Michoacán: 'Mich.',
    Morelos: 'Mor.',
    Nayarit: 'Nay.',
    'Nuevo Leon': 'N.L.',
    'Nuevo León': 'N.L.',
    Oaxaca: 'Oax.',
    Puebla: 'Pue.',
    Queretaro: 'Qro.',
    Querétaro: 'Qro.',
    'Quintana Roo': 'Q. Roo',
    'San Luis Potosi': 'S.L.P.',
    Sinaloa: 'Sin.',
    Sonora: 'Son.',
    Tabasco: 'Tab.',
    Tamaulipas: 'Tamps.',
    Tlaxcala: 'Tlax.',
    Veracruz: 'Ver.',
    Yucatan: 'Yuc.',
    Yucatán: 'Yuc.',
    Zacatecas: 'Zac.',
  };

  return map[stateName] || `${stateName.substring(0, 3)}.`;
};

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
  onViewDetail,
  onMarkAsPaid,
  onCancelOrder,
  style,
}) => {
  const lastTap = useRef<number>(0);

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

  const statusConfig = useMemo<{
    cardOpacity: string;
    iconVariant: 'emerald' | 'brand' | 'muted';
    badgeVariant: NexusBadgeVariant;
    icon: LucideIcon;
    label: string;
    showStatusPill: boolean;
  }>(() => {
    switch (order.status) {
      case 'paid':
        return {
          cardOpacity: '',
          iconVariant: 'emerald',
          badgeVariant: 'success',
          icon: CheckCircle2,
          label: 'Pagada',
          showStatusPill: true,
        };
      case 'pending':
        return {
          cardOpacity: '',
          iconVariant: 'brand',
          badgeVariant: 'warning',
          icon: Clock,
          label: 'Pendiente',
          showStatusPill: false,
        };
      case 'cancelled':
        return {
          cardOpacity: 'opacity-70 grayscale-[0.5]',
          iconVariant: 'muted',
          badgeVariant: 'danger',
          icon: CircleX,
          label: 'Cancelada',
          showStatusPill: true,
        };
      default:
        return {
          cardOpacity: '',
          iconVariant: 'muted',
          badgeVariant: 'muted',
          icon: Package,
          label: order.status,
          showStatusPill: false,
        };
    }
  }, [order.status]);

  return (
    <NexusAutonomousCard
      swipeable={order.status === 'pending'}
      isMuted={order.status === 'cancelled'}
      className={`group ${statusConfig.cardOpacity} animate-in fade-in duration-500`}
      style={style}
      customSwipeLeft={
        <NexusAutonomousButton
          onClick={() => onMarkAsPaid(order.id)}
          variant="success"
          className="h-full w-full flex-col rounded-none"
          isIconOnly
          icon={Check}
        />
      }
      customSwipeRight={
        <NexusAutonomousButton
          onClick={() => onCancelOrder(order.id)}
          variant="danger"
          className="h-full w-full flex-col rounded-none"
          isIconOnly
          icon={CircleX}
        />
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
            isMuted={order.status === 'cancelled'}
            style={{
              width: 'var(--size-card-thumb)',
              height: 'var(--size-card-thumb)',
            }}
          />

          <div className="flex min-w-0 flex-1 flex-col justify-center" style={{ gap: 'var(--space-sm)' }}>
            <div className="flex min-w-0 flex-wrap items-center" style={{ gap: 'var(--space-xs)' }}>
              <NexusAutonomousBadge
                variant="muted"
                icon={orderType.icon}
                className="border-border-main/50 bg-bg-muted/80 backdrop-blur-sm"
              >
                {orderType.label}
              </NexusAutonomousBadge>
              <NexusAutonomousBadge
                variant="brand"
                icon={Hash}
                className="border-brand-100/50 bg-brand-50/80 backdrop-blur-sm"
              >
                {order.id}
              </NexusAutonomousBadge>
              {statusConfig.showStatusPill && (
                <NexusAutonomousBadge
                  variant={statusConfig.badgeVariant}
                  icon={statusConfig.icon}
                  className="shadow-sm transition-colors duration-500 dark:shadow-none"
                >
                  {statusConfig.label}
                </NexusAutonomousBadge>
              )}
            </div>

            <h3 className="truncate text-h2 font-bold text-text-main">
              {order.customer}
            </h3>
          </div>
        </div>

        <div
          className="flex w-full items-center justify-between border-t border-border-main pt-[var(--space-md)]"
          style={{ gap: 'var(--space-md)' }}
        >
          <div className="flex min-w-0 flex-col" style={{ gap: 'var(--space-xs)' }}>
            <span className="text-label uppercase tracking-[0.15em] text-stone-400">Fecha</span>
            <div className="flex items-center text-secondary font-bold text-text-main" style={{ gap: 'var(--space-xs)' }}>
              <Calendar size={12} className="text-stone-300" strokeWidth={2.5} />
              {formatDate(order.date)}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end" style={{ gap: 'var(--space-xs)' }}>
            <span className="text-label uppercase tracking-[0.15em] text-stone-400">Total</span>
            <div className="flex items-baseline text-h1 font-black text-text-main">
              <span className="mr-0.5 text-secondary opacity-50">$</span>
              {order.total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
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
          isMuted={order.status === 'cancelled'}
          style={{
            width: 'var(--size-card-thumb)',
            height: 'var(--size-card-thumb)',
          }}
        />

        <div className="flex min-w-0 flex-1 flex-col lg:flex-row lg:items-center" style={{ gap: 'var(--space-md)' }}>
          <div className="flex min-w-0 flex-1 flex-col justify-center" style={{ gap: 'var(--space-sm)' }}>
            <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
              <NexusAutonomousBadge
                variant="muted"
                icon={orderType.icon}
                className="border-border-main/50 bg-bg-muted/80 backdrop-blur-sm"
              >
                {orderType.label}
              </NexusAutonomousBadge>
              <NexusAutonomousBadge
                variant="brand"
                icon={Hash}
                className="border-brand-100/50 bg-brand-50/80 backdrop-blur-sm"
              >
                {order.id}
              </NexusAutonomousBadge>
            </div>

            <h3 className="truncate text-h2 font-bold text-text-main">{order.customer}</h3>
          </div>

          <div className="flex shrink-0 flex-row items-center lg:border-l lg:border-border-main lg:pl-[var(--space-md)]" style={{ gap: 'var(--space-lg)' }}>
            <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
              <span className="text-label uppercase tracking-[0.15em] text-stone-400">Fecha</span>
              <div className="flex items-center text-secondary font-bold text-text-main" style={{ gap: 'var(--space-xs)' }}>
                <Calendar size={12} className="text-stone-300" strokeWidth={2.5} />
                {formatDate(order.date)}
              </div>
            </div>

            <div className="hidden flex-col sm:flex" style={{ gap: 'var(--space-xs)' }}>
              <span className="text-label uppercase tracking-[0.15em] text-stone-400">Destino</span>
              <div className="flex items-center text-secondary font-bold capitalize text-text-main" style={{ gap: 'var(--space-xs)' }}>
                <MapPin size={12} className="text-stone-300" strokeWidth={2.5} />
                {getStateAbbr(order.customerState)}
              </div>
            </div>

            <div className="flex flex-col items-end lg:min-w-[120px] lg:border-l lg:border-border-main lg:pl-[var(--space-md)]" style={{ gap: 'var(--space-xs)' }}>
              <span className="text-label uppercase tracking-[0.15em] text-stone-400">Total</span>
              <div className="flex items-baseline text-h1 font-black text-text-main">
                <span className="mr-0.5 text-secondary opacity-50">$</span>
                {order.total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between lg:justify-end lg:border-l lg:border-border-main lg:pl-[var(--space-md)]" style={{ gap: 'var(--space-sm)' }}>
            {statusConfig.showStatusPill && (
              <div className="hidden sm:block">
                <NexusAutonomousBadge
                  variant={statusConfig.badgeVariant}
                  icon={statusConfig.icon}
                  className="shadow-sm transition-colors duration-500 dark:shadow-none"
                >
                  {statusConfig.label}
                </NexusAutonomousBadge>
              </div>
            )}

            <div className="ml-auto hidden items-center sm:ml-0 sm:flex" style={{ gap: 'var(--space-sm)' }}>
              {order.status === 'pending' && (
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
              {(order.status === 'pending' || order.status === 'paid') && (
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
            </div>
          </div>
        </div>
      </div>
    </NexusAutonomousCard>
  );
};
