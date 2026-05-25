import React, { useRef } from 'react';
import { Edit2, Trash2, Box, Package, Hash, CircleCheck, Clock, CircleX } from 'lucide-react';
import { Product } from '../../types';
import { NexusAutonomousButton } from '../ui/NexusButton';
import { NexusAutonomousCard } from '../ui/NexusCard';
import { ASSET_BASE_URL } from '../../api';

interface ProductCardProps {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  style?: React.CSSProperties;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onDelete, style }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Utilidad para asegurar que la URL sea absoluta
  const getFullUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${ASSET_BASE_URL}${cleanPath}`;
  };

  const imageUrl = getFullUrl(product.imageUrl || (product as any).thumbnail);
  const isVideo = imageUrl.toLowerCase().split('?')[0].endsWith('.mp4') || 
                  imageUrl.toLowerCase().split('?')[0].endsWith('.mov') || 
                  imageUrl.toLowerCase().split('?')[0].endsWith('.webm');

  // --- HANDLERS ---
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

  const getStatusConfig = (status?: string) => {
    const s = (status || 'available').toLowerCase();
    switch (s) {
      case 'available': 
        return { 
          innerStyles: 'border-border-main',
          thumbOverlay: '',
          thumbFilter: '',
          isMuted: false,
          pillStyle: 'bg-emerald-50 text-emerald-600 border-emerald-100', 
          label: 'Disponible',
          icon: <CircleCheck size={14} strokeWidth={2.5} />,
          showStatusPill: false
        };
      case 'reserved': 
        return { 
          innerStyles: 'border-amber-100 border-l-[3px] border-l-amber-400',
          thumbOverlay: 'bg-amber-400/[0.18]',
          thumbFilter: '',
          isMuted: false,
          pillStyle: 'bg-amber-50 text-amber-600 border-amber-100', 
          label: 'Reservado',
          icon: <Clock size={14} strokeWidth={2.5} />,
          showStatusPill: true
        };
      case 'sold': 
        return { 
          innerStyles: 'border-rose-100 border-l-[3px] border-l-rose-400',
          thumbOverlay: 'bg-stone-500/[0.22]',
          thumbFilter: 'grayscale',
          isMuted: true,
          pillStyle: 'bg-rose-50 text-rose-600 border-rose-100', 
          label: 'Vendido',
          icon: <CircleX size={14} strokeWidth={2.5} />,
          showStatusPill: true
        };
      default: 
        return { 
          innerStyles: 'border-border-main',
          thumbOverlay: '',
          thumbFilter: '',
          isMuted: false,
          pillStyle: 'bg-bg-muted text-text-muted border-border-main', 
          label: status,
          icon: <CircleCheck size={14} strokeWidth={2.5} />,
          showStatusPill: false
        };
    }
  };

  const statusConfig = getStatusConfig(product.saleStatus);

  return (
    <NexusAutonomousCard
      onEdit={onEdit}
      onDelete={onDelete}
      swipeable
      isMuted={statusConfig.isMuted}
      innerClassName={`hover:shadow-xl hover:shadow-stone-200/40 active:scale-[0.995] transition-all duration-700 ${statusConfig.innerStyles}`}
      style={style}
    >
      <div 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="flex flex-row items-center w-full"
        style={{ gap: 'var(--space-md)' }}
      >
        {/* Thumbnail: Level 2 Card Radius */}
        <div 
          className="shrink-0 overflow-hidden bg-stone-100 border border-border-main relative group/thumb shadow-inner"
          style={{ 
            width: 'var(--size-card-thumb)',
            height: 'var(--size-card-thumb)',
            borderRadius: 'var(--radius-card-inner)' 
          }}
        >
          <div className={`absolute inset-0 ${statusConfig.thumbFilter}`}>
            {isVideo ? (
              <video
                ref={videoRef}
                src={imageUrl}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                muted
                loop
                playsInline
                preload="metadata"
              />
            ) : (
              <img 
                src={imageUrl} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover/thumb:scale-110" 
                alt={product.name} 
              />
            )}
          </div>
          
          {/* Overlay de estado */}
          {statusConfig.thumbOverlay && (
            <div className={`absolute inset-0 ${statusConfig.thumbOverlay} pointer-events-none`} />
          )}
          
          <div className="absolute inset-0 bg-black/5" />
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-center" style={{ gap: 'var(--space-md)' }}>
          
          {/* Main Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ gap: 'var(--space-xs)' }}>
            <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
              <div 
                className="flex items-center gap-1.5 px-2 py-1 bg-bg-muted/80 text-text-muted border border-border-main/50 backdrop-blur-sm"
                style={{ borderRadius: 'var(--radius-card-nested)' }}
              >
                {product.type === 'BIRD' ? <Box size={10} strokeWidth={2.5} /> : <Package size={10} strokeWidth={2.5} />}
                <span className="text-label uppercase tracking-[0.15em]">
                  {product.type === 'BIRD' ? 'Ave' : 'Art.'}
                </span>
              </div>
              {product.type === 'BIRD' && product.ringNumber && (
                <div 
                  className="flex items-center gap-1.5 px-2 py-1 bg-brand-50/80 text-brand-600 border border-brand-100/50 backdrop-blur-sm"
                  style={{ borderRadius: 'var(--radius-card-nested)' }}
                >
                  <Hash size={10} strokeWidth={2.5} />
                  <span className="text-label uppercase tracking-[0.15em]">{product.ringNumber}</span>
                </div>
              )}
            </div>
            
            <h3 className="text-h2 text-text-main truncate">
              {product.name}
            </h3>
          </div>

          {/* Secondary Info: Stats */}
          <div className="flex flex-row items-center shrink-0 lg:border-l lg:border-border-main lg:pl-[var(--space-md)]" style={{ gap: 'var(--space-lg)' }}>
            {product.type === 'BIRD' ? (
              <div className="flex items-center" style={{ gap: 'var(--space-lg)' }}>
                <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <span className="text-label uppercase tracking-[0.15em] text-stone-400">Etapa</span>
                  <span className="text-secondary text-text-main">{product.age}</span>
                </div>
                <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <span className="text-label uppercase tracking-[0.15em] text-stone-400">Propósito</span>
                  <span className="text-secondary text-text-main">{product.purpose}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                <span className="text-label uppercase tracking-[0.15em] text-stone-400">Stock</span>
                <span className="text-secondary text-text-main">{product.stock} u.</span>
              </div>
            )}

            {/* Price: Highlighted */}
            <div className="flex flex-col items-end lg:border-l lg:border-border-main lg:pl-[var(--space-md)] lg:min-w-[120px]" style={{ gap: 'var(--space-xs)' }}>
              <span className="text-label uppercase tracking-[0.15em] text-stone-400">Precio</span>
              <div className="flex items-baseline text-h1 text-brand-700">
                <span className="text-secondary mr-0.5 opacity-50">$</span>
                {parseFloat(product.price.toString()).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Status & Actions */}
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
              <NexusAutonomousButton 
                variant="secondary" 
                isIconOnly
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                icon={Edit2}
                className="hover:bg-brand-50 hover:text-brand-600 hover:border-brand-100"
              />
              <NexusAutonomousButton 
                variant="secondary" 
                isIconOnly
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                icon={Trash2}
                className="hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100"
              />
            </div>
          </div>
        </div>
      </div>
    </NexusAutonomousCard>
  );
};
