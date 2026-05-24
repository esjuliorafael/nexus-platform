import React, { useState } from 'react';
import { LucideIcon, Copy, Check, Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  error?: string;
  helperText?: string;
  copyable?: boolean;
  animationDelay?: string;
}

/**
 * NexusInput: Unificado bajo los principios de Emil Kowalski.
 * Soporta toggles de contraseña premium y copiado rápido.
 */
export const NexusInput: React.FC<InputProps> = ({ 
  label, 
  icon: Icon, 
  error, 
  helperText, 
  copyable,
  animationDelay,
  className = '', 
  ...props 
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isCopied, setIsPaid] = useState(false);
  
  const isPasswordField = props.type === 'password';
  const inputType = isPasswordField ? (showPassword ? 'text' : 'password') : props.type;

  const handleCopy = () => {
    if (props.value) {
      navigator.clipboard.writeText(props.value.toString());
      setIsPaid(true);
      setTimeout(() => setIsPaid(false), 2000);
    }
  };

  return (
    <div 
      className="group flex flex-col animate-in fade-in zoom-in-95 duration-300"
      style={{ animationDelay, animationTimingFunction: 'var(--ease-emil)', animationFillMode: 'both', gap: 'var(--space-xs)' }}
    >
      <label className="text-label uppercase tracking-[0.15em] text-text-muted ml-1 group-focus-within:text-brand-500 transition-colors">
        {label}
      </label>
      <div className="relative flex items-center h-[var(--h-input)]">
        {Icon && (
          <div className="absolute left-5 text-text-muted group-focus-within:text-brand-500 transition-colors pointer-events-none z-10 flex items-center justify-center">
            <Icon style={{ width: 'var(--size-inner-icon-card)', height: 'var(--size-inner-icon-card)' }} strokeWidth={1.5} />
          </div>
        )}
        <input 
          {...props}
          type={inputType}
          className={`w-full h-full bg-bg-muted border border-border-main focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/50 focus:bg-bg-card transition-all duration-300 font-medium text-text-main disabled:opacity-50 disabled:cursor-not-allowed tabular-nums 
            ${Icon ? 'pl-14' : 'px-6'} 
            ${(isPasswordField || copyable) ? 'pr-14' : 'pr-6'}
            ${props.type === 'date' ? '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:invert' : ''}
            ${className}`}
          style={{ transitionTimingFunction: 'var(--ease-emil)', borderRadius: 'var(--radius-inner-visual)' }}
        />

        <div className="absolute right-3 flex items-center gap-1">
          {copyable && props.value && (
            <button
              type="button"
              onClick={handleCopy}
              className={`p-2.5 rounded-xl transition-all active:scale-90 ${isCopied ? 'text-emerald-500 bg-emerald-50' : 'text-text-muted hover:bg-bg-muted hover:text-text-main'}`}
            >
              {isCopied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} />}
            </button>
          )}

          {isPasswordField && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-2.5 rounded-xl text-text-muted hover:bg-bg-muted hover:text-text-main transition-all active:scale-90"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
      </div>
      {helperText && !error && (
        <p className="text-secondary italic text-text-muted px-1 leading-relaxed">{helperText}</p>
      )}
      {error && (
        <p className="text-label text-rose-500 mt-2 flex items-center gap-2 px-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          {error}
        </p>
      )}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  helperText?: string;
  animationDelay?: string;
}

export const NexusTextarea: React.FC<TextareaProps> = ({ 
  label, 
  helperText, 
  animationDelay,
  className = '', 
  ...props 
}) => {
  return (
    <div 
      className="group flex flex-col animate-in fade-in zoom-in-95 duration-200"
      style={{ animationDelay, animationTimingFunction: 'var(--ease-emil)', animationFillMode: 'both', gap: 'var(--space-xs)' }}
    >
      <label className="text-label uppercase tracking-[0.15em] text-text-muted ml-1 group-focus-within:text-brand-500 transition-colors">
        {label}
      </label>
      <textarea 
        className={`w-full bg-bg-muted border border-border-main p-5 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/50 focus:bg-bg-card transition-all duration-300 font-medium text-text-main resize-none leading-relaxed ${className}`}
        style={{ borderRadius: 'var(--radius-inner-visual)' }}
        {...props}
      />
      {helperText && (
        <p className="text-secondary italic text-text-muted px-1 leading-relaxed">{helperText}</p>
      )}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  icon?: LucideIcon;
  animationDelay?: string;
}

export const NexusSelect: React.FC<SelectProps> = ({ 
  label, 
  icon: Icon, 
  children, 
  animationDelay,
  className = '', 
  ...props 
}) => {
  return (
    <div 
      className="group flex flex-col animate-in fade-in zoom-in-95 duration-200"
      style={{ animationDelay, animationTimingFunction: 'var(--ease-emil)', animationFillMode: 'both', gap: 'var(--space-xs)' }}
    >
      <label className="text-label uppercase tracking-[0.15em] text-text-muted ml-1 group-focus-within:text-brand-500 transition-colors">
        {label}
      </label>
      <div className="relative flex items-center h-[var(--h-input)]">
        <select 
          className={`w-full h-full bg-bg-muted border border-border-main px-5 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/50 focus:bg-bg-card transition-all duration-300 font-medium text-text-main appearance-none cursor-pointer ${className}`}
          style={{ borderRadius: 'var(--radius-inner-visual)' }}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-5 pointer-events-none text-text-muted group-focus-within:text-brand-500 transition-colors flex items-center justify-center">
          {Icon ? <Icon size={16} /> : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};
