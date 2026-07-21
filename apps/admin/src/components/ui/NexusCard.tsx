import React from 'react';
import { LucideIcon, Edit2, Trash2 } from 'lucide-react';
import { NexusCardIcon, NexusCardThumbnailIcon } from './NexusIcon';
import { NexusAutonomousButton, NexusButton, NexusCardButton, NexusSectionButton } from './NexusButton';

interface NexusCardBaseProps {
  children: React.ReactNode;
  level: 1 | 2;
  density?: 'default' | 'micro' | 'rail';
  swipeable?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  customSwipeLeft?: React.ReactNode;
  customSwipeRight?: React.ReactNode;
  isMuted?: boolean;
  className?: string;
  innerClassName?: string;
  delay?: string;
  style?: React.CSSProperties;
}

const NexusCardBase: React.FC<NexusCardBaseProps> = ({
  children, level, density = 'default', swipeable, onEdit, onDelete, customSwipeLeft, customSwipeRight, isMuted, className = '', innerClassName = '', delay = '0ms', style
}) => {
  const [translateX, setTranslateX] = React.useState(0);
  const [isSwiping, setIsSwiping] = React.useState(false);
  const touchStartX = React.useRef(0);
  const touchStartY = React.useRef(0);
  const dragStartTranslate = React.useRef(0);
  const dragTranslate = React.useRef(0);
  const gestureAxis = React.useRef<'pending' | 'horizontal' | 'vertical'>('pending');
  const swipeLeftActionRef = React.useRef<HTMLDivElement>(null);
  const swipeRightActionRef = React.useRef<HTMLDivElement>(null);

  const getSwipeActionWidth = (side: 'left' | 'right') =>
    (side === 'left' ? swipeLeftActionRef : swipeRightActionRef).current?.getBoundingClientRect().width || 120;

  const resetSwipe = () => {
    dragTranslate.current = 0;
    setTranslateX(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!swipeable) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    dragStartTranslate.current = translateX;
    dragTranslate.current = translateX;
    gestureAxis.current = 'pending';
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeable || gestureAxis.current === 'vertical') return;

    const diffX = e.touches[0].clientX - touchStartX.current;
    const diffY = e.touches[0].clientY - touchStartY.current;

    if (gestureAxis.current === 'pending') {
      const horizontalDistance = Math.abs(diffX);
      const verticalDistance = Math.abs(diffY);
      if (Math.max(horizontalDistance, verticalDistance) < 8) return;

      if (verticalDistance > horizontalDistance * 1.15) {
        gestureAxis.current = 'vertical';
        return;
      }

      if (horizontalDistance <= verticalDistance * 1.15) return;

      gestureAxis.current = 'horizontal';
      setIsSwiping(true);
    }

    if (e.cancelable) e.preventDefault();

    const leftActionWidth = getSwipeActionWidth('left');
    const rightActionWidth = getSwipeActionWidth('right');
    const canRevealLeft = Boolean(customSwipeLeft || onEdit);
    const canRevealRight = Boolean(customSwipeRight || onDelete);
    const minTranslate = canRevealRight ? -rightActionWidth : 0;
    const maxTranslate = canRevealLeft ? leftActionWidth : 0;
    const nextTranslate = Math.max(
      minTranslate,
      Math.min(maxTranslate, dragStartTranslate.current + diffX)
    );

    dragTranslate.current = nextTranslate;
    setTranslateX(nextTranslate);
  };

  const handleTouchEnd = () => {
    if (!swipeable) return;

    if (gestureAxis.current !== 'horizontal') {
      gestureAxis.current = 'pending';
      setIsSwiping(false);
      return;
    }

    setIsSwiping(false);
    const finalTranslate = dragTranslate.current;

    if (finalTranslate > getSwipeActionWidth('left') * 0.55) {
      const leftActionWidth = getSwipeActionWidth('left');
      dragTranslate.current = leftActionWidth;
      setTranslateX(leftActionWidth);
    } else if (finalTranslate < -getSwipeActionWidth('right') * 0.55) {
      const rightActionWidth = getSwipeActionWidth('right');
      dragTranslate.current = -rightActionWidth;
      setTranslateX(-rightActionWidth);
    } else {
      resetSwipe();
    }

    gestureAxis.current = 'pending';
  };

  const handleTouchCancel = () => {
    gestureAxis.current = 'pending';
    setIsSwiping(false);
    resetSwipe();
  };

  const radiusToken = level === 1 ? 'var(--radius-outer)' : 'var(--radius-inner-visual)';
  const paddingToken = level !== 1
    ? 'var(--padding-inner)'
    : density === 'micro'
      ? 'var(--padding-card-micro)'
      : density === 'rail'
        ? 'var(--padding-card-rail)'
        : 'var(--padding-inner)';
  const SwipeActionButton = level === 1 ? NexusAutonomousButton : NexusSectionButton;
  const elevationClass = level === 1
    ? 'shadow-sm hover:shadow-xl hover:shadow-stone-200/30 dark:hover:shadow-none'
    : 'shadow-none';

  return (
    <div className={`animate-in fade-in zoom-in-95 duration-300 [animation-fill-mode:both] ${className}`} style={{ animationDelay: delay, ...style }}>
      <div
        className={`relative group/card h-full flex flex-col overflow-hidden ${
          swipeable
            ? `nexus-swipe-stage nexus-swipe-stage--${level === 1 ? 'autonomous' : 'nested'}`
            : ''
        }`}
        style={!swipeable || level === 2 ? { borderRadius: radiusToken } : undefined}
      >
        {swipeable && (
          <div className="absolute inset-0 sm:hidden">
            <div
              ref={swipeLeftActionRef}
              className="absolute inset-y-0 left-0 flex items-center justify-center transition-opacity duration-200"
              style={{
                left: level === 1 ? 'var(--space-md)' : 0,
                width: 'max-content',
                paddingInlineEnd: 'var(--space-base)',
                opacity: translateX > 0 ? 1 : 0,
                pointerEvents: translateX > 0 ? 'auto' : 'none',
              }}
              onClick={customSwipeLeft ? resetSwipe : undefined}
            >
              {customSwipeLeft ? (
                translateX > 0 ? customSwipeLeft : null
              ) : (
                onEdit ? (
                  <SwipeActionButton
                    variant="secondary"
                    icon={Edit2}
                    onClick={() => { onEdit(); resetSwipe(); }}
                    tabIndex={translateX > 0 ? 0 : -1}
                    aria-hidden={translateX <= 0}
                  >
                    Editar
                  </SwipeActionButton>
                ) : null
              )}
            </div>

            <div
              ref={swipeRightActionRef}
              className="absolute inset-y-0 right-0 flex items-center justify-center transition-opacity duration-200"
              style={{
                right: level === 1 ? 'var(--space-md)' : 0,
                width: 'max-content',
                paddingInlineStart: 'var(--space-base)',
                opacity: translateX < 0 ? 1 : 0,
                pointerEvents: translateX < 0 ? 'auto' : 'none',
              }}
              onClick={customSwipeRight ? resetSwipe : undefined}
            >
              {customSwipeRight ? (
                translateX < 0 ? customSwipeRight : null
              ) : (
                onDelete ? (
                  <SwipeActionButton
                    variant="secondary"
                    icon={Trash2}
                    onClick={() => { onDelete(); resetSwipe(); }}
                    className="border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
                    tabIndex={translateX < 0 ? 0 : -1}
                    aria-hidden={translateX >= 0}
                  >
                    Eliminar
                  </SwipeActionButton>
                ) : null
              )}
            </div>
          </div>
        )}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          style={{
            transform: swipeable ? `translateX(${translateX}px)` : 'none',
            transition: isSwiping ? 'none' : 'transform 0.4s var(--ease-emil)',
            borderRadius: radiusToken,
            padding: paddingToken
          }}
          className={`relative z-10 bg-bg-card border border-border-main transition-all duration-700 overflow-hidden flex-1 flex flex-col ${elevationClass} ${innerClassName}`}
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
  showActionsAlways?: boolean;
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
      borderRadius: 'var(--radius-inner-visual)',
      padding: 'var(--space-md)'
    }}
  >
    <div className="flex flex-col lg:flex-row lg:items-center justify-between" style={{ gap: 'var(--space-md)' }}>
      {/* Name and Dot Row */}
      <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
        {statusColor && (
          <div
            className={`rounded-full transition-all duration-500 shrink-0 ${statusColor}`}
            style={{
              width: 'var(--size-inner-icon-badge)',
              height: 'var(--size-inner-icon-badge)',
            }}
          />
        )}
        <span className={`text-secondary font-black uppercase tracking-tight truncate ${isMuted ? 'text-stone-400' : 'text-stone-800'}`}>
          {title}
        </span>
      </div>

      {/* Actions Row: Full width distribution on mobile */}
      {actions && (
        <div className="flex items-center justify-between lg:justify-end border-t lg:border-t-0 border-border-main/30 pt-[var(--space-sm)] lg:pt-0 w-full lg:w-auto" style={{ gap: 'var(--space-lg)' }}>
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
  title, subtitle, icon, thumbnail, iconVariant, isMuted, delay, rightContent, actions, onEdit, onDelete, showActionsAlways, onClick, className, swipeable
}) => {
  const hasActionContent = Boolean(actions || onEdit || onDelete);

  return (
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
          {hasActionContent && (
            <div className="flex w-full items-center md:w-auto" style={{ gap: 'var(--space-sm)' }}>
              {actions}
              {(onEdit || onDelete) && (
                <div
                  className={`${swipeable ? 'hidden sm:flex' : showActionsAlways ? 'flex' : 'hidden sm:flex'} transition-all duration-500 ${
                    showActionsAlways
                      ? 'opacity-100 translate-x-0'
                      : 'opacity-0 translate-x-2 group-hover/card:opacity-100 group-hover/card:translate-x-0'
                  }`}
                  style={{ gap: 'var(--space-sm)' }}
                >
                  {onEdit && <NexusCardButton onClick={(e) => { e.stopPropagation(); onEdit(); }} variant="secondary" isIconOnly icon={Edit2} />}
                  {onDelete && <NexusCardButton onClick={(e) => { e.stopPropagation(); onDelete(); }} variant="secondary" isIconOnly icon={Trash2} className="hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200" />}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </NexusCardBase>
  );
};

/**
 * NexusAutonomousCard: Tarjeta de Nivel 1 (Widget).
 * El contenedor raíz para bloques independientes.
 */
export const NexusAutonomousCard: React.FC<{
  children: React.ReactNode;
  density?: 'default' | 'micro' | 'rail';
  className?: string;
  delay?: string;
  style?: React.CSSProperties;
  swipeable?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  customSwipeLeft?: React.ReactNode;
  customSwipeRight?: React.ReactNode;
  isMuted?: boolean;
}> = (props) => <NexusCardBase {...props} level={1} />;
