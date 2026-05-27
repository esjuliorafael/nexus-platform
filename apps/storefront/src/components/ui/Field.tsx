import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
}

export function StorefrontField({ label, icon: Icon, error, className, style, ...props }: FieldProps) {
  return (
    <label className="group flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
      {label && <span className="sf-text-label text-stone-400 group-focus-within:text-brand-500">{label}</span>}
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
            'h-full w-full border border-stone-200 bg-white font-semibold text-stone-800 transition-all duration-300 placeholder:text-stone-400 focus:border-brand-500/50 focus:outline-none focus:ring-4 focus:ring-brand-500/10',
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
      {label && <span className="sf-text-label text-stone-400 group-focus-within:text-brand-500">{label}</span>}
      <textarea
        className={cn(
          'min-h-32 w-full resize-none border border-stone-200 bg-white p-5 font-semibold text-stone-800 transition-all duration-300 placeholder:text-stone-400 focus:border-brand-500/50 focus:outline-none focus:ring-4 focus:ring-brand-500/10',
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
