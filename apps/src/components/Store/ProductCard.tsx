import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Trash2, Box, Package, Hash, CircleCheck, Clock, CircleX } from 'lucide-react';
import { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  style?: React.CSSProperties;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onDelete, style }) => {
  // Swipe State
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [activeSide, setActiveSide] = useState<'none' | 'left' | 'right'>('none');
  
  const touchStart = useRef(0);
  const touchX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // NUEVO: Referencia para controlar el video
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const SWIPE_THRESHOLD = 80;
  const ACTION_WIDTH = 100;

  // Detectar si es video (.mp4)
  const isVideo = product.imageUrl?.toLowerCase().endsWith('.mp4');

  // Lógica de reproducción al pasar el mouse (Hover)
  const handleMouseEnter = () => {
    if (isVideo && videoRef.current) {
      // Promesa para evitar errores si el usuario pasa el mouse muy rápido
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Auto-play fue prevenido (silencioso)
        });
      }
    }
  };

  const handleMouseLeave = () => {
    if (isVideo && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0; // Reinicia al primer frame (foto)
    }
  };

  // Configuración de Estados (Móvil vs Escritorio)
  const getStatusConfig = (status: Product['status']) => {
    switch (status) {
      case 'available': 
        return { 
          mobileStyle: 'bg-white border-stone-200',
          pillStyle: 'bg-green-500/10 text-green-600 border-green-500/20', 
          label: 'Disponible',
          icon: <CircleCheck size={12} strokeWidth={2.5} />
        };
      case 'reserved': 
        return { 
          mobileStyle: 'bg-amber-50/60 border-amber-200',
          pillStyle: 'bg-amber-500/10 text-amber-600 border-amber-500/20', 
          label: 'Reservado',
          icon: <Clock size={12} strokeWidth={2.5} />
        };
      case 'sold': 
        return { 
          mobileStyle: 'bg-rose-50/60 border-rose-200',
          pillStyle: 'bg-rose-500/10 text-rose-600 border-rose-500/20', 
          label: 'Vendido',
          icon: <CircleX size={12} strokeWidth={2.5} />
        };
      default: 
        return { 
          mobileStyle: 'bg-white border-stone-200',
          pillStyle: 'bg-stone-100 text-stone-500 border-stone-200', 
          label: status,
          icon: <CircleCheck size={12} strokeWidth={2.5} />
        };
    }
  };

  const statusConfig = getStatusConfig(product.status);

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
    touchX.current = touchStart.current;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStart.current;
    
    let finalTranslate = diff;
    if (activeSide === 'left') finalTranslate = ACTION_WIDTH + diff;
    if (activeSide === 'right') finalTranslate = -ACTION_WIDTH + diff;

    setTranslateX(finalTranslate);
    touchX.current = currentX;
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    const diff = touchX.current - touchStart.current;
    
    if (diff > SWIPE_THRESHOLD && activeSide !== 'right') {
      setTranslateX(ACTION_WIDTH);
      setActiveSide('left');
    } else if (diff < -SWIPE_THRESHOLD && activeSide !== 'left') {
      setTranslateX(-ACTION_WIDTH);
      setActiveSide('right');
    } else {
      setTranslateX(0);
      setActiveSide('none');
    }
  };

  const resetSwipe = () => {
    setTranslateX(0);
    setActiveSide('none');
  };

  return (
    <div 
      style={style}
      // Agregamos los eventos de mouse aquí al contenedor principal
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative rounded-[2.5rem] shadow-sm hover:shadow-md overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95 border ${statusConfig.mobileStyle} sm:bg-white sm:border-stone-200`}
    >
      {/* Background Actions (Mobile) */}
      <div className="absolute inset-0 flex sm:hidden">
        <button 
          onClick={() => { onEdit(); resetSwipe(); }}
          className={`absolute inset-y-0 left-0 w-[100px] bg-brand-500 text-white flex flex-col items-center justify-center gap-1 transition-opacity ${translateX > 0 ? 'opacity-100' : 'opacity-0'}`}
        >
          <Edit2 size={20} strokeWidth={2.5} />
          <span className="text-[10px] font-black uppercase tracking-widest">Editar</span>
        </button>

        <button 
          onClick={() => { onDelete(); resetSwipe(); }}
          className={`absolute inset-y-0 right-0 w-[100px] bg-rose-500 text-white flex flex-col items-center justify-center gap-1 transition-opacity ${translateX < 0 ? 'opacity-100' : 'opacity-0'}`}
        >
          <Trash2 size={20} strokeWidth={2.5} />
          <span className="text-[10px] font-black uppercase tracking-widest">Eliminar</span>
        </button>
      </div>

      {/* Main Content Layer */}
      <div 
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
        className="relative z-10 bg-transparent sm:bg-white p-4 flex flex-row items-center gap-3 sm:gap-6 w-full"
      >
        
        {/* Thumbnail */}
        <div className="w-20 h-20 sm:w-28 sm:h-28 shrink-0 rounded-[1.5rem] overflow-hidden bg-stone-100 border border-stone-200 shadow-inner relative">
          {isVideo ? (
            <video
              ref={videoRef} // Conectamos la referencia
              src={product.imageUrl}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              muted
              loop
              playsInline
              preload="metadata" // Carga el primer frame sin descargar todo el video
              // IMPORTANTE: Hemos quitado 'autoPlay'
            />
          ) : (
            <img 
              src={product.imageUrl} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
              alt={product.name} 
            />
          )}
          <div className="absolute inset-0 bg-black/5" />
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          
          {/* Block 1: Main Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-stone-50/80 text-stone-400 rounded-md border border-stone-200/50 backdrop-blur-sm">
                  {product.type === 'ave' ? <Box size={9} /> : <Package size={9} />}
                  <span className="text-[7px] font-black uppercase tracking-widest leading-none">
                    {product.type === 'ave' ? 'Ave' : 'Art.'}
                  </span>
                </div>
                {product.type === 'ave' && product.ringNumber && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-brand-50/80 text-brand-600 rounded-md border border-brand-100/50 backdrop-blur-sm">
                    <Hash size={9} />
                    <span className="text-[7px] font-black uppercase tracking-widest leading-none">{product.ringNumber}</span>
                  </div>
                )}
              </div>
            </div>
            
            <h3 className="text-sm sm:text-base font-black text-stone-800 tracking-tight leading-tight truncate">
              {product.name}
            </h3>
          </div>

          {/* Block 2: Metadata */}
          <div className="flex flex-row items-center gap-4 sm:gap-6 shrink-0 sm:border-l sm:border-stone-200 sm:pl-6">
            {product.type === 'ave' ? (
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="flex flex-col">
                  <span className="text-[7px] font-black uppercase text-stone-400 tracking-widest mb-0.5">Etapa</span>
                  <span className="text-[10px] font-bold text-stone-700 capitalize leading-none">{product.age}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] font-black uppercase text-stone-400 tracking-widest mb-0.5">Propósito</span>
                  <span className="text-[10px] font-bold text-stone-700 capitalize leading-none">{product.purpose}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-[7px] font-black uppercase text-stone-400 tracking-widest mb-0.5">Stock</span>
                <span className="text-[10px] font-bold text-stone-700 leading-none">{product.stock} u.</span>
              </div>
            )}

            {/* Price */}
            <div className="flex flex-col items-end sm:border-l sm:border-stone-200 sm:pl-6 sm:min-w-[90px]">
              <span className="text-[7px] font-black uppercase text-stone-400 tracking-widest mb-0.5">Precio</span>
              <div className="flex items-baseline text-base sm:text-lg font-black text-brand-700 tracking-tighter leading-none">
                <span className="text-[10px] mr-0.5 opacity-50">$</span>
                {product.price.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Block 3: Desktop Status & Actions */}
          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 shrink-0 sm:border-l sm:border-stone-200 sm:pl-6">
            {/* Desktop-only status badge */}
            <div className={`hidden sm:flex px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest items-center gap-2 shadow-sm ${statusConfig.pillStyle}`}>
              {statusConfig.icon}
              {statusConfig.label}
            </div>

            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-1.5 ml-auto sm:ml-0">
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-2 sm:p-2.5 bg-stone-50 text-stone-400 rounded-lg sm:rounded-xl hover:bg-brand-500 hover:text-white transition-all active:scale-90"
                title="Editar"
              >
                <Edit2 size={14} strokeWidth={2.5} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-2 sm:p-2.5 bg-stone-50 text-stone-400 rounded-lg sm:rounded-xl hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                title="Eliminar"
              >
                <Trash2 size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};