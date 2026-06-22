import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LucideIcon, X } from 'lucide-react';
import { NexusAutonomousButton } from './NexusButton';

interface NexusModalProps {
  isOpen: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  icon?: LucideIcon;
  iconTone?: 'brand' | 'danger' | 'warning';
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  zIndex?: number;
}

interface NexusModalActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const widthBySize = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export const NexusModal: React.FC<NexusModalProps> = ({
  isOpen,
  title,
  subtitle,
  eyebrow,
  icon: Icon,
  iconTone = 'brand',
  onClose,
  children,
  maxWidth = 'lg',
  zIndex = 100,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('overflow-hidden');
    return () => document.body.classList.remove('overflow-hidden');
  }, [isOpen]);

  if (!isOpen) return null;

  const iconToneClasses = {
    brand: 'border-brand-100 bg-brand-50 text-brand-600',
    danger: 'border-rose-100 bg-rose-50 text-rose-500',
    warning: 'border-amber-100 bg-amber-50 text-amber-500',
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 flex items-end justify-center p-0 animate-in fade-in duration-300 sm:items-center sm:p-[var(--space-lg)]"
      style={{ zIndex }}
    >
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" onClick={onClose} />
      <div
        className={`relative w-full ${widthBySize[maxWidth]} bg-bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300 sm:zoom-in-95`}
        style={{ borderRadius: 'var(--radius-outer)' }}
      >
        <div style={{ padding: 'var(--padding-inner)' }}>
          <div
            className="flex items-start justify-between"
            style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}
          >
            <div className="flex min-w-0 items-start" style={{ gap: 'var(--space-md)' }}>
              {Icon && (
                <div
                  className={`flex shrink-0 items-center justify-center border ${iconToneClasses[iconTone]}`}
                  style={{
                    width: 'var(--size-icon-autonomous)',
                    height: 'var(--size-icon-autonomous)',
                    borderRadius: 'var(--radius-card-inner)',
                  }}
                >
                  <Icon size={22} />
                </div>
              )}
              <div className="flex min-w-0 flex-col" style={{ gap: 'var(--space-xs)' }}>
                {eyebrow && (
                  <span className="text-label uppercase tracking-[0.15em] text-brand-500">
                    {eyebrow}
                  </span>
                )}
                <h3 className="text-h1 text-text-main">{title}</h3>
                {subtitle && <p className="text-secondary text-text-muted">{subtitle}</p>}
              </div>
            </div>
            <NexusAutonomousButton
              onClick={onClose}
              type="button"
              variant="secondary"
              density="compact"
              isIconOnly
              icon={X}
              className="shrink-0"
              aria-label="Cerrar"
            />
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export const NexusModalActions: React.FC<NexusModalActionsProps> = ({
  children,
  className = '',
  style,
  ...props
}) => (
  <div
    className={`flex ${className}`}
    style={{ gap: 'var(--space-sm)', ...style }}
    {...props}
  >
    {children}
  </div>
);
