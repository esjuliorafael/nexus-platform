import React, { useRef, useMemo } from 'react';
import { 
  Package, Clock, CheckCircle2, CircleX, ChevronRight, Check, 
  Hash, MapPin, Calendar, Layers, Bird, ShoppingBag 
} from 'lucide-react';
import { Order } from '../../../types';
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

// Mapa de Abreviaturas de Estados (MX)
const getStateAbbr = (stateName: string) => {
  const map: Record<string, string> = {
    'Aguascalientes': 'Ags.', 'Baja California': 'B.C.', 'Baja California Sur': 'B.C.S.',
    'Campeche': 'Camp.', 'Chiapas': 'Chis.', 'Chihuahua': 'Chih.',
    'Ciudad de México': 'CDMX', 'Coahuila': 'Coah.', 'Colima': 'Col.',
    'Durango': 'Dgo.', 'Guanajuato': 'Gto.', 'Guerrero': 'Gro.',
    'Hidalgo': 'Hgo.', 'Jalisco': 'Jal.', 'México': 'Edo. Méx.',
    'Michoacán': 'Mich.', 'Morelos': 'Mor.', 'Nayarit': 'Nay.',
    'Nuevo León': 'N.L.', 'Oaxaca': 'Oax.', 'Puebla': 'Pue.',
    'Querétaro': 'Qro.', 'Quintana Roo': 'Q. Roo', 'San Luis Potosí': 'S.L.P.',
    'Sinaloa': 'Sin.', 'Sonora': 'Son.', 'Tabasco': 'Tab.',
    'Tamaulipas': 'Tamps.', 'Tlaxcala': 'Tlax.', 'Veracruz': 'Ver.',
    'Yucatán': 'Yuc.', 'Zacatecas': 'Zac.'
  };
  return map[stateName] || stateName.substring(0, 3) + '.';
};

// Utilidad para formatear fecha (YYYY-MM-DD... -> DD/MM/YYYY)
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
  style
}) => {
  // --- Double Click/Tap Logic ---
  const lastTap = useRef<number>(0);
  const handleCardInteraction = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      onViewDetail(order);
    }
    lastTap.current = now;
  };

  // --- Lógica de Contenido ---
  const orderType = useMemo(() => {
    const items = order.items || [];
    const hasBirds = items.some(i => i.type?.toUpperCase() === 'BIRD');
    const hasItems = items.some(i => i.type?.toUpperCase() === 'ITEM');

    if (hasBirds && hasItems) return { label: 'Mixto', icon: <Layers size={10} strokeWidth={2.5} />, mainIcon: Layers };
    if (hasBirds) return { label: 'Aves', icon: <Bird size={10} strokeWidth={2.5} />, mainIcon: Bird };
    return { label: 'Artículos', icon: <ShoppingBag size={10} strokeWidth={2.5} />, mainIcon: ShoppingBag };
  }, [order.items]);

  // --- Configuración de Estados ---
  const statusConfig = useMemo(() => {
    switch (order.status) {
      case 'paid': 
        return { 
          cardOpacity: '',
          iconVariant: 'emerald' as const,
          pillStyle: 'bg-emerald-50 text-emerald-600 border-emerald-100', 
          icon: <CheckCircle2 size={14} strokeWidth={2.5} />,
          label: 'Pagada',
          showStatusPill: true
        };
      case 'pending': 
        return { 
          cardOpacity: '',
          iconVariant: 'brand' as const,
          pillStyle: 'bg-amber-50 text-amber-600 border-amber-100', 
          icon: <Clock size={14} strokeWidth={2.5} />,
          label: 'Pendiente',
          showStatusPill: false
        };
      case 'cancelled': 
        return { 
          cardOpacity: 'opacity-70 grayscale-[0.5]',
          iconVariant: 'muted' as const,
          pillStyle: 'bg-rose-50 text-rose-600 border-rose-100', 
          icon: <CircleX size={14} strokeWidth={2.5} />,
          label: 'Cancelada',
          showStatusPill: true
        };
      default: 
        return { 
          cardOpacity: '',
          iconVariant: 'muted' as const,
          pillStyle: 'bg-bg-muted text-text-muted border-border-main', 
          icon: <Package size={14} strokeWidth={2.5} />,
          label: order.status,
          showStatusPill: false
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
          className="w-full h-full rounded-none flex flex-col items-center justify-center gap-1"
          isIconOnly
          icon={Check}
        >
          <span className="text-[10px] font-black uppercase tracking-widest text-white mt-1">Pagada</span>
        </NexusAutonomousButton>
      }
      customSwipeRight={
        <NexusAutonomousButton 
          onClick={() => onCancelOrder(order.id)}
          variant="danger"
          className="w-full h-full rounded-none flex flex-col items-center justify-center gap-1"
          isIconOnly
          icon={CircleX}
        >
          <span className="text-[10px] font-black uppercase tracking-widest text-white mt-1">Cancelar</span>
        </NexusAutonomousButton>
      }
    >
      <div 
        onClick={handleCardInteraction}
        onDoubleClick={() => onViewDetail(order)}
        className="flex flex-row items-center w-full cursor-pointer select-none"
        style={{ gap: 'var(--space-md)' }}
      >
        
        {/* Thumbnail: Icono inteligente (Nivel 2 Radius) */}
        <NexusAutonomousIcon 
          icon={orderType.mainIcon} 
          variant={statusConfig.iconVariant}
          isMuted={order.status === 'cancelled'}
        />

        {/* Content Section */}
        <div className="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-center" style={{ gap: 'var(--space-md)' }}>
          
          {/* Block 1: Info Principal */}
          <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ gap: 'var(--space-xs)' }}>
            <div className="flex items-center gap-2">
              <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
                {/* Píldora de Tipo */}
                <div 
                  className="flex items-center gap-1.5 px-2 py-1 bg-bg-muted/80 text-text-muted border border-border-main/50 backdrop-blur-sm"
                  style={{ borderRadius: 'var(--radius-card-nested)' }}
                >
                  {orderType.icon}
                  <span className="text-label uppercase tracking-[0.15em]">{orderType.label}</span>
                </div>
                {/* Píldora de ID */}
                <div 
                  className="flex items-center gap-1.5 px-2 py-1 bg-brand-50/80 text-brand-600 border border-brand-100/50 backdrop-blur-sm"
                  style={{ borderRadius: 'var(--radius-card-nested)' }}
                >
                  <Hash size={10} strokeWidth={2.5} />
                  <span className="text-label uppercase tracking-[0.15em]">{order.id}</span>
                </div>
              </div>
            </div>
            
            <h3 className="text-h2 text-text-main truncate mt-1 font-bold">
              {order.customer}
            </h3>
          </div>

          {/* Block 2: Metadata */}
          <div className="flex flex-row items-center shrink-0 lg:border-l lg:border-border-main lg:pl-[var(--space-md)]" style={{ gap: 'var(--space-lg)' }}>
            {/* Columna Fecha */}
            <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
              <span className="text-label uppercase tracking-[0.15em] text-stone-400">Fecha</span>
              <div className="flex items-center gap-1.5 text-secondary text-text-main font-bold">
                <Calendar size={12} className="text-stone-300" strokeWidth={2.5} />
                {formatDate(order.date)}
              </div>
            </div>
            
            {/* Columna Ubicación — ocultar en mobile */}
            <div className="hidden sm:flex flex-col" style={{ gap: 'var(--space-xs)' }}>
              <span className="text-label uppercase tracking-[0.15em] text-stone-400">Destino</span>
              <div className="flex items-center gap-1.5 text-secondary text-text-main capitalize font-bold">
                <MapPin size={12} className="text-stone-300" strokeWidth={2.5} />
                {getStateAbbr(order.customerState)}
              </div>
            </div>

            {/* Columna Precio */}
            <div className="flex flex-col items-end lg:border-l lg:border-border-main lg:pl-[var(--space-md)] lg:min-w-[120px]" style={{ gap: 'var(--space-xs)' }}>
              <span className="text-label uppercase tracking-[0.15em] text-stone-400">Total</span>
              <div className="flex items-baseline text-h1 text-text-main font-black">
                <span className="text-secondary mr-0.5 opacity-50">$</span>
                {order.total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Block 3: Desktop Status & Actions */}
          <div className="flex items-center justify-between lg:justify-end shrink-0 lg:border-l lg:border-border-main lg:pl-[var(--space-md)]" style={{ gap: 'var(--space-sm)' }}>
            {statusConfig.showStatusPill && (
              <div 
                className={`hidden sm:flex px-4 py-2 border items-center shadow-sm dark:shadow-none transition-colors duration-500 ${statusConfig.pillStyle}`}
                style={{ borderRadius: 'var(--radius-card-inner)', gap: 'var(--space-sm)' }}
              >
                {statusConfig.icon}
                <span className="text-label uppercase tracking-[0.15em] font-black">{statusConfig.label}</span>
              </div>
            )}

            <div className="hidden sm:flex items-center ml-auto sm:ml-0" style={{ gap: 'var(--space-sm)' }}>
              {order.status === 'pending' && (
                <NexusAutonomousButton 
                  onClick={(e) => { e.stopPropagation(); onMarkAsPaid(order.id); }}
                  variant="success"
                  isIconOnly
                  icon={Check}
                  title="Marcar Pagada"
                />
              )}
              {(order.status === 'pending' || order.status === 'paid') && (
                <NexusAutonomousButton 
                  onClick={(e) => { e.stopPropagation(); onCancelOrder(order.id); }}
                  variant="secondary"
                  isIconOnly
                  icon={CircleX}
                  className="hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100"
                  title="Cancelar"
                />
              )}
              <NexusAutonomousButton 
                onClick={(e) => { e.stopPropagation(); onViewDetail(order); }}
                variant="dark"
                isIconOnly
                icon={ChevronRight}
                title="Ver Detalles"
              />
            </div>
          </div>

        </div>
      </div>
    </NexusAutonomousCard>
  );
};
