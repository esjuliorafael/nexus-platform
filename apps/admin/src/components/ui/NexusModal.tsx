import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface NexusModalProps {
  isOpen: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  zIndex?: number;
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
  onClose,
  children,
  maxWidth = 'lg',
  zIndex = 100,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300"
      style={{ zIndex }}
    >
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" onClick={onClose} />
      <div className={`relative w-full ${widthBySize[maxWidth]} bg-bg-card rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200`}>
        <div className="p-8 sm:p-12">
          <div className="flex items-start justify-between gap-6 mb-10">
            <div>
              <h3 className="text-display text-text-main">{title}</h3>
              {subtitle && <p className="text-secondary text-text-muted mt-2">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-3 bg-bg-muted hover:bg-stone-200 text-text-muted rounded-2xl transition-all active:scale-90"
              type="button"
            >
              <X size={20} strokeWidth={3} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
