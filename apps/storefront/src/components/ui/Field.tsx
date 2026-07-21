import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
}

export function StorefrontField({ label, icon: Icon, error, className, style, ...props }: FieldProps) {
  return (
    <label className="group flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
      {label && <span className="sf-text-label text-[var(--sf-text-field-label)] group-focus-within:text-brand-500">{label}</span>}
      <div className="relative flex items-center h-[var(--sf-h-input)]">
        {Icon && (
          <Icon
            className="absolute left-5 text-stone-400 group-focus-within:text-brand-500"
            size="var(--sf-size-inner-icon-card)"
            strokeWidth={1.7}
          />
        )}
        <input
          className={cn(
            'h-full w-full border border-[var(--sf-border-field)] bg-[var(--sf-bg-field)] text-[length:var(--sf-text-body)] font-semibold text-[var(--sf-text-main)] transition-all duration-300 placeholder:text-[var(--sf-text-field-label)] focus:border-brand-500/50 focus:outline-none focus:ring-4 focus:ring-brand-500/10',
            Icon ? 'pl-14 pr-5' : 'px-5',
            className
          )}
          style={{
            borderRadius: 'var(--sf-radius-inner)',
            transitionTimingFunction: 'var(--sf-ease)',
            ...style,
          }}
          {...props}
        />
      </div>
      {error && <span className="sf-text-label text-red-500">{error}</span>}
    </label>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function StorefrontTextarea({ label, error, className, style, ...props }: TextareaProps) {
  return (
    <label className="group flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
      {label && <span className="sf-text-label text-[var(--sf-text-field-label)] group-focus-within:text-brand-500">{label}</span>}
      <textarea
        className={cn(
          'min-h-32 w-full resize-none border border-[var(--sf-border-field)] bg-[var(--sf-bg-field)] p-5 text-[length:var(--sf-text-body)] font-semibold text-[var(--sf-text-main)] transition-all duration-300 placeholder:text-[var(--sf-text-field-label)] focus:border-brand-500/50 focus:outline-none focus:ring-4 focus:ring-brand-500/10',
          className
        )}
        style={{
          borderRadius: 'var(--sf-radius-inner)',
          transitionTimingFunction: 'var(--sf-ease)',
          ...style,
        }}
        {...props}
      />
      {error && <span className="sf-text-label text-red-500">{error}</span>}
    </label>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
}

export function StorefrontSelect({ label, icon: Icon, error, className, style, children, ...props }: SelectProps) {
  return (
    <label className="group flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
      {label && <span className="sf-text-label text-[var(--sf-text-field-label)] group-focus-within:text-brand-500">{label}</span>}
      <div className="relative flex items-center h-[var(--sf-h-input)]">
        {Icon && (
          <Icon
            className="absolute left-5 text-stone-400 group-focus-within:text-brand-500"
            size="var(--sf-size-inner-icon-card)"
            strokeWidth={1.7}
          />
        )}
        <select
          className={cn(
            'h-full w-full appearance-none border border-[var(--sf-border-field)] bg-[var(--sf-bg-field)] text-[length:var(--sf-text-body)] font-semibold text-[var(--sf-text-main)] transition-all duration-300 focus:border-brand-500/50 focus:outline-none focus:ring-4 focus:ring-brand-500/10',
            Icon ? 'pl-14 pr-10' : 'px-5 pr-10',
            className
          )}
          style={{
            borderRadius: 'var(--sf-radius-inner)',
            transitionTimingFunction: 'var(--sf-ease)',
            ...style,
          }}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-5 text-stone-400" size={18} strokeWidth={2} />
      </div>
      {error && <span className="sf-text-label text-red-500">{error}</span>}
    </label>
  );
}
