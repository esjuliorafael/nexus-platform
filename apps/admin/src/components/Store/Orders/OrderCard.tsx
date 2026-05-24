import React, { useState, useRef, useEffect } from 'react';
import { 
  Package, Clock, CheckCircle2, CircleX, ChevronRight, Check, 
  Hash, MapPin, Calendar, Layers, Bird, ShoppingBag 
} from 'lucide-react';
import { Order } from '../../../types';
import { NexusButton, NexusAutonomousButton } from '../../ui/NexusButton';
import { NexusAutonomousCard } from '../../ui/NexusCard';
import { NexusAutonomousIcon } from '../../ui/NexusIcon';

interface OrderCardProps {
  order: Order;
  onViewDetail: (order: Order) => void;
  onMarkAsPaid: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void;
  isSwiped: boolean;
  onSwipe: (orderId: string | null) => void;
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
  isSwiped,
  onSwipe,
  style
}) => {
  // --- Swipe State ---
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [activeSide, setActiveSide] = useState<'none' | 'left' | 'right'>('none');
  
  const touchStart = useRef(0);
  const touchX = useRef(0);
  const touchY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  
  const SWIPE_THRESHOLD = 80;
  const ACTION_WIDTH = 100; 

  useEffect(() => {
    if (!isSwiped && activeSide !== 'none') {
      setTranslateX(0);
      setActiveSide('none');
    }
  }, [isSwiped]);

  // --- Lógica de Contenido ---
  const getOrderTypeConfig = () => {
    const hasBirds = order.items.some(i => i.type === 'BIRD');
    const hasItems = order.items.some(i => i.type === 'ITEM');

    if (hasBirds && hasItems) return { label: 'Mixto', icon: <Layers size={10} strokeWidth={2.5} />, mainIcon: Layers };
    if (hasBirds) return { label: 'Aves', icon: <Bird size={10} strokeWidth={2.5} />, mainIcon: Bird };
    return { label: 'Artículos', icon: <ShoppingBag size={10} strokeWidth={2.5} />, mainIcon: ShoppingBag };
  };

  const orderType = getOrderTypeConfig();

  // --- Configuración de Estados ---
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid': 
        return { 
          mobileBorder: 'border-border-main',
          mobileAccent: '',
          cardOpacity: '',
          iconFilter: '',
          iconVariant: 'emerald' as const,
          pillStyle: 'bg-emerald-50 text-emerald-600 border-emerald-100', 
          icon: <CheckCircle2 size={14} strokeWidth={2.5} />,
          label: 'Pagada',
          showStatusPill: true,
          showQuickAction: false
        };
      case 'pending': 
        return { 
          mobileBorder: 'border-amber-100',
          mobileAccent: 'border-l-[3px] border-l-amber-400',
          cardOpacity: '',
          iconFilter: '',
          iconVariant: 'brand' as const,
          pillStyle: 'bg-amber-50 text-amber-600 border-amber-100', 
          icon: <Clock size={14} strokeWidth={2.5} />,
          label: 'Pendiente',
          showStatusPill: false,
          showQuickAction: true
        };
      case 'cancelled': 
        return { 
          mobileBorder: 'border-rose-100',
          mobileAccent: 'border-l-[3px] border-l-rose-400',
          cardOpacity: 'opacity-70',
          iconFilter: 'grayscale',
          iconVariant: 'muted' as const,
          pillStyle: 'bg-rose-50 text-rose-600 border-rose-100', 
          icon: <CircleX size={14} strokeWidth={2.5} />,
          label: 'Cancelada',
          showStatusPill: true,
          showQuickAction: false
        };
      default: 
        return { 
          mobileBorder: 'border-border-main',
          mobileAccent: '',
          cardOpacity: '',
          iconFilter: '',
          iconVariant: 'muted' as const,
          pillStyle: 'bg-bg-muted text-text-muted border-border-main', 
          icon: <Package size={14} strokeWidth={2.5} />,
          label: status,
          showStatusPill: false,
          showQuickAction: false
        };
    }
  };

  const statusConfig = getStatusConfig(order.status);

  // --- Touch Handlers ---
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
    touchX.current = touchStart.current;
    touchY.current = e.touches[0].clientY;
    setIsSwiping(true);
    isHorizontalSwipe.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStart.current;
    const diffY = currentY - touchY.current;

    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
        isHorizontalSwipe.current = true;
      } else if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 10) {
        isHorizontalSwipe.current = false;
        setIsSwiping(false);
        return;
      }
    }

    if (isHorizontalSwipe.current) {
      if (e.cancelable) e.preventDefault();
      let finalTranslate = diffX;
      if (activeSide === 'left') finalTranslate = ACTION_WIDTH + diffX;
      if (activeSide === 'right') finalTranslate = -ACTION_WIDTH + diffX;

      const canSwipeRight = order.status === 'pending'; 
      const canSwipeLeft = order.status === 'pending'; 

      if (finalTranslate > 0 && !canSwipeRight) finalTranslate = 0;
      if (finalTranslate < 0 && !canSwipeLeft) finalTranslate = 0;

      setTranslateX(finalTranslate);
      touchX.current = currentX;
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping || !isHorizontalSwipe.current) {
      setIsSwiping(false);
      return;
    }
    setIsSwiping(false);
    const diff = touchX.current - touchStart.current;
    
    if (diff > SWIPE_THRESHOLD && order.status === 'pending') {
      setTranslateX(ACTION_WIDTH);
      setActiveSide('left');
      onSwipe(order.id);
    } else if (diff < -SWIPE_THRESHOLD && order.status === 'pending') {
      setTranslateX(-ACTION_WIDTH);
      setActiveSide('right');
      onSwipe(order.id);
    } else {
      setTranslateX(0);
      setActiveSide('none');
      if (isSwiped) onSwipe(null);
    }
  };

  const resetSwipe = () => {
    setTranslateX(0);
    setActiveSide('none');
    onSwipe(null);
  };

  return (
    <NexusAutonomousCard
      className={`group ${statusConfig.cardOpacity} animate-in fade-in duration-500`}
      style={style}
    >
      {/* Background Actions (Mobile Swipe) */}
      <div className="absolute inset-0 flex sm:hidden">
        {order.status === 'pending' && (
          <NexusButton 
            onClick={() => { onMarkAsPaid(order.id); resetSwipe(); }}
            variant="success"
            className="absolute inset-y-0 left-0 w-[100px] h-full rounded-none"
            isIconOnly
            icon={Check}
          >
            Pagada
          </NexusButton>
        )}
        {order.status === 'pending' && (
          <NexusButton 
            onClick={() => { onCancelOrder(order.id); resetSwipe(); }}
            variant="danger"
            className="absolute inset-y-0 right-0 w-[100px] h-full rounded-none"
            isIconOnly
            icon={CircleX}
          >
            Cancelar
          </NexusButton>
        )}
      </div>

      {/* Main Content Layer */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.4s var(--ease-emil)',
          margin: 'calc(var(--padding-inner) * -1)', 
          padding: 'var(--padding-inner)',
          gap: 'var(--space-md)'
        }}
        className="relative z-10 bg-bg-card flex flex-row items-center w-full"
      >
        
        {/* Thumbnail: Icono inteligente (Nivel 2 Radius) */}
        <NexusAutonomousIcon 
          icon={orderType.mainIcon} 
          variant={statusConfig.iconVariant}
          isMuted={order.status === 'cancelled'}
          className={statusConfig.iconFilter}
        />

        {/* Content Section */}
        <div className="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-center" style={{ gap: 'var(--space-md)' }}>
          
          {/* Block 1: Info Principal */}
          <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ gap: 'var(--space-xs)' }}>
            <div className="flex items-center justify-between gap-2">
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

              {/* Botón de acción rápida en mobile */}
              {statusConfig.showQuickAction && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMarkAsPaid(order.id); }}
                  className="sm:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 active:scale-90 transition-all shadow-sm shadow-emerald-500/10"
                >
                  <Check size={16} strokeWidth={3} />
                </button>
              )}
            </div>
            
            <h3 className="text-h2 text-text-main truncate mt-1">
              {order.customer}
            </h3>
          </div>

          {/* Block 2: Metadata */}
          <div className="flex flex-row items-center shrink-0 lg:border-l lg:border-border-main lg:pl-[var(--space-md)]" style={{ gap: 'var(--space-lg)' }}>
            {/* Columna Fecha */}
            <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
              <span className="text-label uppercase tracking-[0.15em] text-stone-400">Fecha</span>
              <div className="flex items-center gap-1.5 text-secondary text-text-main">
                <Calendar size={12} className="text-stone-300" strokeWidth={2.5} />
                {formatDate(order.date)}
              </div>
            </div>
            
            {/* Columna Ubicación — ocultar en mobile */}
            <div className="hidden sm:flex flex-col" style={{ gap: 'var(--space-xs)' }}>
              <span className="text-label uppercase tracking-[0.15em] text-stone-400">Destino</span>
              <div className="flex items-center gap-1.5 text-secondary text-text-main capitalize">
                <MapPin size={12} className="text-stone-300" strokeWidth={2.5} />
                {getStateAbbr(order.customerState)}
              </div>
            </div>

            {/* Columna Precio */}
            <div className="flex flex-col items-end lg:border-l lg:border-border-main lg:pl-[var(--space-md)] lg:min-w-[120px]" style={{ gap: 'var(--space-xs)' }}>
              <span className="text-label uppercase tracking-[0.15em] text-stone-400">Total</span>
              <div className="flex items-baseline text-h1 text-text-main">
                <span className="text-secondary mr-0.5 opacity-50 font-bold">$</span>
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
                <span className="text-label uppercase tracking-[0.15em]">{statusConfig.label}</span>
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