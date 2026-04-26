import React, { useState, useRef, useEffect } from 'react';
import { 
  Package, Clock, CheckCircle2, CircleX, ChevronRight, Check, 
  Hash, MapPin, Calendar, Layers, Bird, ShoppingBag 
} from 'lucide-react';
import { Order } from '../../types';

interface OrderCardProps {
  order: Order;
  onViewDetail: (order: Order) => void;
  onMarkAsPaid: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void;
  isSwiped: boolean;
  onSwipe: (orderId: string | null) => void;
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

// Utilidad para formatear fecha (YYYY-MM-DD -> DD/MM/YYYY)
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const datePart = dateStr.split(' ')[0]; 
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
};

export const OrderCard: React.FC<OrderCardProps> = ({ 
  order, 
  onViewDetail, 
  onMarkAsPaid, 
  onCancelOrder,
  isSwiped,
  onSwipe
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
    const hasBirds = order.items.some(i => i.type === 'ave');
    const hasArticles = order.items.some(i => i.type === 'articulo');

    if (hasBirds && hasArticles) return { label: 'Mixto', icon: <Layers size={9} />, mainIcon: <Layers size={32} strokeWidth={1.5} /> };
    if (hasBirds) return { label: 'Aves', icon: <Bird size={9} />, mainIcon: <Bird size={32} strokeWidth={1.5} /> };
    return { label: 'Artículos', icon: <ShoppingBag size={9} />, mainIcon: <ShoppingBag size={32} strokeWidth={1.5} /> };
  };

  const orderType = getOrderTypeConfig();

  // --- Configuración de Estados ---
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid': 
        return { 
          mobileStyle: 'bg-green-50/60 border-green-200',
          pillStyle: 'bg-green-500/10 text-green-600 border-green-500/20', 
          icon: <CheckCircle2 size={12} strokeWidth={2.5} />,
          label: 'Pagada'
        };
      case 'pending': 
        return { 
          mobileStyle: 'bg-amber-50/60 border-amber-200',
          pillStyle: 'bg-amber-500/10 text-amber-600 border-amber-500/20', 
          icon: <Clock size={12} strokeWidth={2.5} />,
          label: 'Pendiente'
        };
      case 'cancelled': 
        return { 
          mobileStyle: 'bg-rose-50/60 border-rose-200',
          pillStyle: 'bg-rose-500/10 text-rose-600 border-rose-500/20', 
          icon: <CircleX size={12} strokeWidth={2.5} />,
          label: 'Cancelada'
        };
      default: 
        return { 
          mobileStyle: 'bg-white border-stone-200',
          pillStyle: 'bg-stone-100 text-stone-500 border-stone-200', 
          icon: <Package size={12} strokeWidth={2.5} />,
          label: status 
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
    <div className={`group relative rounded-[2.5rem] shadow-sm hover:shadow-md overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95 border ${statusConfig.mobileStyle} sm:bg-white sm:border-stone-200`}>
      
      {/* Background Actions */}
      <div className="absolute inset-0 flex sm:hidden">
        {order.status === 'pending' && (
          <button 
            onClick={() => { onMarkAsPaid(order.id); resetSwipe(); }}
            className={`absolute inset-y-0 left-0 w-[100px] bg-green-500 text-white flex flex-col items-center justify-center gap-1 transition-opacity ${translateX > 0 ? 'opacity-100' : 'opacity-0'}`}
          >
            <Check size={20} strokeWidth={2.5} />
            <span className="text-[10px] font-black uppercase tracking-widest">Pagada</span>
          </button>
        )}
        {order.status === 'pending' && (
          <button 
            onClick={() => { onCancelOrder(order.id); resetSwipe(); }}
            className={`absolute inset-y-0 right-0 w-[100px] bg-rose-500 text-white flex flex-col items-center justify-center gap-1 transition-opacity ${translateX < 0 ? 'opacity-100' : 'opacity-0'}`}
          >
            <CircleX size={20} strokeWidth={2.5} />
            <span className="text-[10px] font-black uppercase tracking-widest">Cancelar</span>
          </button>
        )}
      </div>

      {/* Main Content Layer */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
        className="relative z-10 bg-transparent sm:bg-white p-4 flex flex-row items-center gap-3 sm:gap-6 w-full"
      >
        
        {/* Thumbnail: Icono inteligente */}
        <div className="w-20 h-20 sm:w-28 sm:h-28 shrink-0 rounded-[1.5rem] overflow-hidden bg-stone-50/50 border border-stone-200/50 shadow-inner relative flex items-center justify-center text-stone-300">
          {orderType.mainIcon}
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          
          {/* Block 1: Info Principal */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {/* Píldoras Superiores */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                {/* Píldora de Tipo */}
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-stone-50/80 text-stone-400 rounded-md border border-stone-200/50 backdrop-blur-sm">
                  {orderType.icon}
                  <span className="text-[7px] font-black uppercase tracking-widest leading-none">{orderType.label}</span>
                </div>
                {/* Píldora de ID */}
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-brand-50/80 text-brand-600 rounded-md border border-brand-100/50 backdrop-blur-sm">
                  <Hash size={9} />
                  <span className="text-[7px] font-black uppercase tracking-widest leading-none">{order.id}</span>
                </div>
              </div>
            </div>
            
            {/* Nombre Cliente */}
            <h3 className="text-sm sm:text-base font-black text-stone-800 tracking-tight leading-tight truncate">
              {order.customer}
            </h3>
          </div>

          {/* Block 2: Metadata (Enriquecimiento Visual) */}
          <div className="flex flex-row items-center gap-4 sm:gap-6 shrink-0 sm:border-l sm:border-stone-200 sm:pl-6">
            {/* Columna Fecha */}
            <div className="flex flex-col">
              <span className="text-[7px] font-black uppercase text-stone-400 tracking-widest mb-0.5">Fecha</span>
              <div className="flex items-center gap-1 text-[10px] font-bold text-stone-700 leading-none">
                <Calendar size={10} className="text-stone-300" />
                {/* APLICADO: Formato DD/MM/YYYY */}
                {formatDate(order.date)}
              </div>
            </div>
            
            {/* Columna Ubicación (Abreviada) */}
            <div className="flex flex-col">
              <span className="text-[7px] font-black uppercase text-stone-400 tracking-widest mb-0.5">Destino</span>
              <div className="flex items-center gap-1 text-[10px] font-bold text-stone-700 leading-none capitalize">
                <MapPin size={10} className="text-stone-300" />
                {getStateAbbr(order.customerState)}
              </div>
            </div>

            {/* Columna Precio */}
            <div className="flex flex-col items-end sm:border-l sm:border-stone-200 sm:pl-6 sm:min-w-[90px]">
              <span className="text-[7px] font-black uppercase text-stone-400 tracking-widest mb-0.5">Total</span>
              <div className="flex items-baseline text-base sm:text-lg font-black text-stone-900 tracking-tighter leading-none">
                <span className="text-[10px] mr-0.5 opacity-50">$</span>
                {order.total.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Block 3: Desktop Status & Actions */}
          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 shrink-0 sm:border-l sm:border-stone-200 sm:pl-6">
            <div className={`hidden sm:flex px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest items-center gap-2 shadow-sm ${statusConfig.pillStyle}`}>
              {statusConfig.icon}
              {statusConfig.label}
            </div>

            <div className="hidden sm:flex items-center gap-1.5 ml-auto sm:ml-0">
              {order.status === 'pending' && (
                <>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onMarkAsPaid(order.id); }}
                    className="p-2 sm:p-2.5 bg-green-50 text-green-600 rounded-lg sm:rounded-xl hover:bg-green-500 hover:text-white transition-all active:scale-90"
                    title="Marcar Pagada"
                  >
                    <Check size={14} strokeWidth={3} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onCancelOrder(order.id); }}
                    className="p-2 sm:p-2.5 bg-stone-50 text-stone-400 rounded-lg sm:rounded-xl hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                    title="Cancelar"
                  >
                    <CircleX size={14} strokeWidth={2.5} />
                  </button>
                </>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); onViewDetail(order); }}
                className="p-2 sm:p-2.5 bg-stone-900 text-white rounded-lg sm:rounded-xl hover:bg-stone-700 transition-all active:scale-90 shadow-lg shadow-stone-900/20"
                title="Ver Detalles"
              >
                <ChevronRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};