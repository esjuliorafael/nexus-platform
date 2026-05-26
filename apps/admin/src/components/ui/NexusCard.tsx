import React from 'react';
import { LucideIcon, Edit2, Trash2 } from 'lucide-react';
import { NexusCardIcon, NexusCardThumbnailIcon } from './NexusIcon';
import { NexusButton, NexusCardButton } from './NexusButton';

interface NexusCardBaseProps {
  children: React.ReactNode;
  level: 1 | 2;
  swipeable?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  isMuted?: boolean;
  className?: string;
  innerClassName?: string;
  delay?: string;
  style?: React.CSSProperties;
}

const NexusCardBase: React.FC<NexusCardBaseProps> = ({
  children, level, swipeable, onEdit, onDelete, isMuted, className = '', innerClassName = '', delay = '0ms', style
}) => {
  const [translateX, setTranslateX] = React.useState(0);
  const [isSwiping, setIsSwiping] = React.useState(false);
  const [activeSide, setActiveSide] = React.useState<'none' | 'left' | 'right'>('none');
  const touchStart = React.useRef(0);
  const touchX = React.useRef(0);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!swipeable) return;
    touchStart.current = e.touches[0].clientX;
    touchX.current = touchStart.current;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || !swipeable) return;
    const diff = e.touches[0].clientX - touchStart.current;
    let finalTranslate = diff;
    if (activeSide === 'left') finalTranslate = 100 + diff;
    if (activeSide === 'right') finalTranslate = -100 + diff;
    setTranslateX(finalTranslate);
    touchX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!swipeable) return;
    setIsSwiping(false);
    const diff = touchX.current - touchStart.current;
    if (diff > 80 && activeSide !== 'right') { setTranslateX(100); setActiveSide('left'); }
    else if (diff < -80 && activeSide !== 'left') { setTranslateX(-100); setActiveSide('right'); }
    else { setTranslateX(0); setActiveSide('none'); }
  };

  const radiusToken = level === 1 ? 'var(--radius-outer)' : 'var(--radius-inner-visual)';

  return (
    <div className={`animate-in fade-in zoom-in-95 duration-300 [animation-fill-mode:both] ${className}`} style={{ animationDelay: delay, ...style }}>
      <div className="relative overflow-hidden group/card h-full flex flex-col" style={{ borderRadius: radiusToken }}>
        {swipeable && (
          <div className="absolute inset-0 flex sm:hidden">
            <NexusCardButton onClick={() => { onEdit?.(); setTranslateX(0); setActiveSide('none'); }} variant="brand" isIconOnly icon={Edit2} className="absolute inset-y-0 left-0 w-[100px] h-full rounded-none" />
            <NexusCardButton onClick={() => { onDelete?.(); setTranslateX(0); setActiveSide('none'); }} variant="danger" isIconOnly icon={Trash2} className="absolute inset-y-0 right-0 w-[100px] h-full rounded-none" />
          </div>
        )}
        <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
          style={{ 
            transform: swipeable ? `translateX(${translateX}px)` : 'none', 
            transition: isSwiping ? 'none' : 'transform 0.4s var(--ease-emil)', 
            borderRadius: radiusToken, 
            padding: 'var(--padding-inner)' 
          }}
          className={`relative z-10 bg-bg-card border border-border-main transition-all duration-700 hover:shadow-xl hover:shadow-stone-200/30 overflow-hidden flex-1 flex flex-col shadow-sm ${innerClassName}`}
        >
          <div className="absolute inset-0 pointer-events-none opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '20px 20px' }} />
          <div className={`relative z-10 flex-1 flex flex-col transition-opacity duration-500 ${isMuted ? 'opacity-60 grayscale-[0.5]' : 'opacity-100'}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

interface LegacyCardProps {
  title: string | React.ReactNode; 
  subtitle?: string | React.ReactNode; 
  icon?: LucideIcon; 
  thumbnail?: string;
  iconVariant?: any; 
  isMuted?: boolean; 
  delay?: string; 
  rightContent?: React.ReactNode; 
  actions?: React.ReactNode; 
  onEdit?: () => void; 
  onDelete?: () => void; 
  onClick?: () => void;
  className?: string; 
  swipeable?: boolean;
}

/**
 * NexusWidgetCard: Tarjeta de Nivel 3 (Slim).
 * Diseñada para alta densidad dentro de Widgets (NexusAutonomousCard).
 * Usa la FÓRMULA SIMPLE: radius = max(0.5rem, calc(parent_radius - padding))
 */
export const NexusWidgetCard: React.FC<LegacyCardProps> = ({ 
  title, subtitle, icon, thumbnail, iconVariant, isMuted, delay, rightContent, actions, onClick, className 
}) => (
  <div 
    onClick={onClick}
    className={`animate-in fade-in zoom-in-95 duration-300 [animation-fill-mode:both] group/card relative overflow-hidden border border-border-main/50 bg-bg-card transition-all duration-500 hover:shadow-lg hover:shadow-stone-200/20 ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''} ${isMuted ? 'opacity-60' : ''} ${className}`}
    style={{ 
      animationDelay: delay,
      borderRadius: 'var(--radius-card-nested)',
      padding: 'var(--space-sm)'
    }}
  >
    <div className="flex items-center justify-between" style={{ gap: 'var(--space-md)' }}>
      <div className="flex items-center min-w-0" style={{ gap: 'var(--space-sm)' }}>
        {thumbnail ? (
          <NexusCardThumbnailIcon src={thumbnail} alt={typeof title === 'string' ? title : ''} isMuted={isMuted} hoverGroup="group/card" />
        ) : icon ? (
          <NexusCardIcon icon={icon} variant={iconVariant} isMuted={isMuted} hoverGroup="group/card" />
        ) : null}
        <div className="flex flex-col min-w-0" style={{ gap: 'var(--space-xs)' }}>
          {typeof title === 'string' ? (
            <h4 className={`text-secondary font-bold transition-colors duration-500 truncate ${isMuted ? 'text-text-muted' : 'text-text-main'} ${onClick ? 'group-hover/card:text-brand-600' : ''}`}>{title}</h4>
          ) : (
            <div className="min-w-0">{title}</div>
          )}
          {subtitle && <div className="text-label text-text-muted/60 flex items-center gap-1.5 truncate">{subtitle}</div>}
        </div>
      </div>
      <div className="flex items-center shrink-0" style={{ gap: 'var(--space-md)' }}>
        {rightContent && <div className="text-right hidden sm:flex flex-col items-end">{rightContent}</div>}
        {actions && <div className="flex items-center" style={{ gap: 'var(--space-xs)' }}>{actions}</div>}
      </div>
    </div>
  </div>
);

/**
 * NexusControlRow: Componente de alta densidad para listas de control.
 * Basado en NexusWidgetCard para integrarse perfectamente en rejillas masivas.
 * Estructura de flujo libre para evitar desbordamientos en móvil.
 */
export const NexusControlRow: React.FC<LegacyCardProps & { statusColor?: string }> = ({
  title, subtitle, icon, statusColor, actions, className = '', delay, isMuted
}) => (
  <div 
    className={`animate-in fade-in zoom-in-95 duration-300 [animation-fill-mode:both] group/card relative overflow-hidden border border-border-main/50 bg-bg-card transition-all duration-500 hover:shadow-lg hover:shadow-stone-200/20 ${isMuted ? 'opacity-60' : ''} ${className}`}
    style={{ 
      animationDelay: delay,
      borderRadius: 'var(--radius-card-nested)',
      padding: 'var(--space-md)'
    }}
  >
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Name and Dot always stay together */}
      <div className="flex items-center gap-3">
        {statusColor && (
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 shrink-0 ${statusColor}`} />
        )}
        <span className={`font-black text-xs uppercase tracking-tight truncate ${isMuted ? 'text-stone-400' : 'text-stone-800'}`}>
          {title}
        </span>
      </div>

      {/* Actions: In mobile they fill the row, in desktop they stay right */}
      {actions && (
        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 border-t sm:border-t-0 border-border-main/30 pt-3 sm:pt-0 w-full sm:w-auto">
          {actions}
        </div>
      )}
    </div>
  </div>
);

/**
 * NexusSectionCard: Tarjeta de Nivel 2.
 * Diseñada para vivir dentro de una NexusSection.
 * Mantiene el espaciado y jerarquía visual de nivel medio.
 */
export const NexusSectionCard: React.FC<LegacyCardProps> = ({ 
  title, subtitle, icon, thumbnail, iconVariant, isMuted, delay, rightContent, actions, onEdit, onDelete, onClick, className, swipeable 
}) => (
  <NexusCardBase level={2} swipeable={swipeable} onEdit={onEdit} onDelete={onDelete} isMuted={isMuted} delay={delay} className={`${className} ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''}`}>
    <div onClick={onClick} className="flex flex-col md:flex-row md:items-center justify-between h-full" style={{ gap: 'var(--space-lg)' }}>
      <div className="flex items-center min-w-0 flex-1" style={{ gap: 'var(--space-md)' }}>
        {thumbnail ? (
          <NexusCardThumbnailIcon src={thumbnail} alt={typeof title === 'string' ? title : ''} isMuted={isMuted} hoverGroup="group/card" />
        ) : icon ? (
          <NexusCardIcon icon={icon} variant={iconVariant} isMuted={isMuted} hoverGroup="group/card" />
        ) : null}
        <div className="flex flex-col min-w-0 flex-1" style={{ gap: 'var(--space-xs)' }}>
          {typeof title === 'string' ? (
            <h4 className={`text-h2 transition-colors duration-500 truncate ${isMuted ? 'text-text-muted' : 'text-text-main'} ${onClick ? 'group-hover/card:text-brand-600' : ''}`}>{title}</h4>
          ) : (
            <div className="min-w-0">{title}</div>
          )}
          {subtitle && <div className="text-secondary text-text-muted/60 flex items-center gap-2 truncate">{subtitle}</div>}
        </div>
      </div>
      <div className="flex items-center justify-between md:justify-end shrink-0 border-t md:border-t-0 border-border-main pt-[var(--space-md)] md:pt-0" style={{ gap: 'var(--space-lg)' }}>
        {rightContent && <div className="text-left md:text-right flex flex-col items-start md:items-end" style={{ gap: 'var(--space-xs)' }}>{rightContent}</div>}
        <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
          {actions}
          {(onEdit || onDelete) && (
            <div className="hidden sm:flex opacity-0 group-hover/card:opacity-100 transition-all duration-500 translate-x-2 group-hover/card:translate-x-0" style={{ gap: 'var(--space-sm)' }}>
              {onEdit && <NexusCardButton onClick={(e) => { e.stopPropagation(); onEdit(); }} variant="secondary" isIconOnly icon={Edit2} />}
              {onDelete && <NexusCardButton onClick={(e) => { e.stopPropagation(); onDelete(); }} variant="secondary" isIconOnly icon={Trash2} className="hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200" />}
            </div>
          )}
        </div>
      </div>
    </div>
  </NexusCardBase>
);

/**
 * NexusAutonomousCard: Tarjeta de Nivel 1 (Widget).
 * El contenedor raíz para bloques independientes.
 */
export const NexusAutonomousCard: React.FC<{ children: React.ReactNode; className?: string; delay?: string; style?: React.CSSProperties; }> = (props) => <NexusCardBase {...props} level={1} />;
