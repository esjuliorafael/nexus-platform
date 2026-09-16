import React, { useEffect, useId, useRef, useState } from 'react';
import { LucideIcon, Copy, Check, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useNexusTemporarySurfaceContext } from './NexusTemporarySurface';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  error?: string;
  helperText?: string;
  copyable?: boolean;
  suffix?: React.ReactNode;
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
  suffix,
  animationDelay,
  className = '', 
  ...props 
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isCopied, setIsPaid] = useState(false);
  const isInsideTemporarySurface = useNexusTemporarySurfaceContext();
  
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
      className={`group flex w-full min-w-0 flex-col ${isInsideTemporarySurface ? '' : 'animate-in fade-in zoom-in-95 duration-300'}`}
      style={{ animationDelay, animationTimingFunction: 'var(--ease-emil)', animationFillMode: 'both', gap: 'var(--space-xs)' }}
    >
      <label className="text-form-label ml-[var(--inset-field-label)] text-text-muted group-focus-within:text-brand-500 transition-colors">
        {label}
      </label>
      <div className="relative flex h-[var(--h-input)] w-full min-w-0 items-center">
        {Icon && (
          <div className="absolute left-[var(--inset-input-icon)] text-text-muted group-focus-within:text-brand-500 transition-colors pointer-events-none z-10 flex items-center justify-center">
            <Icon style={{ width: 'var(--size-inner-icon-card)', height: 'var(--size-inner-icon-card)' }} strokeWidth={1.5} />
          </div>
        )}
        <input 
          {...props}
          type={inputType}
          className={`h-full w-full min-w-0 bg-bg-muted border border-border-main focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/50 focus:bg-bg-card transition-all duration-300 font-medium text-text-main disabled:opacity-50 disabled:cursor-not-allowed tabular-nums
            ${Icon ? 'pl-[var(--padding-input-inline-with-icon)]' : 'px-[var(--padding-input-inline)]'}
            ${(isPasswordField || copyable || suffix) ? 'pr-[var(--padding-input-inline-with-action)]' : 'pr-[var(--padding-input-inline)]'}
            ${className}`}
          style={{ transitionTimingFunction: 'var(--ease-emil)', borderRadius: 'var(--radius-inner-visual)' }}
        />

        <div className="absolute right-[var(--inset-input-action)] flex items-center gap-[var(--space-xs)]">
          {suffix && (
            <span className="pointer-events-none px-[var(--space-sm)] text-label text-text-muted uppercase">
              {suffix}
            </span>
          )}
          {copyable && props.value && (
            <button
              type="button"
              onClick={handleCopy}
              className={`p-[var(--padding-input-action)] rounded-xl transition-all active:scale-90 ${isCopied ? 'text-emerald-500 bg-emerald-50' : 'text-text-muted hover:bg-bg-muted hover:text-text-main'}`}
            >
              {isCopied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} />}
            </button>
          )}

          {isPasswordField && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-[var(--padding-input-action)] rounded-xl text-text-muted hover:bg-bg-muted hover:text-text-main transition-all active:scale-90"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
      </div>
      {helperText && !error && (
        <p className="text-secondary italic text-text-muted px-[var(--inset-field-label)] leading-relaxed">{helperText}</p>
      )}
      {error && (
        <p className="text-label text-rose-500 mt-[var(--space-sm)] flex items-center gap-[var(--space-sm)] px-[var(--inset-field-label)]">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          {error}
        </p>
      )}
    </div>
  );
};

interface DateTimeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon?: LucideIcon;
  error?: string;
  helperText?: string;
  animationDelay?: string;
  disabled?: boolean;
  required?: boolean;
}

const splitDateTimeValue = (value: string) => {
  const [date = '', time = ''] = value.split('T');
  return { date, time: time.slice(0, 5) };
};

const formatDateSegment = (value: string) => {
  if (!value) return 'dd/mm/aaaa';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

/**
 * Date and time stay independently editable while the parent keeps the
 * existing datetime-local value contract.
 */
export const NexusDateTimeInput: React.FC<DateTimeInputProps> = ({
  label,
  value,
  onChange,
  icon: Icon,
  error,
  helperText,
  animationDelay,
  disabled = false,
  required = false,
}) => {
  const generatedId = useId();
  const dateId = `${generatedId}-date`;
  const timeId = `${generatedId}-time`;
  const [draft, setDraft] = useState(() => splitDateTimeValue(value));
  const lastExternalValue = useRef(value);
  const isInsideTemporarySurface = useNexusTemporarySurfaceContext();

  useEffect(() => {
    if (value === lastExternalValue.current) return;
    lastExternalValue.current = value;
    setDraft(splitDateTimeValue(value));
  }, [value]);

  const updateDraft = (nextDraft: { date: string; time: string }) => {
    setDraft(nextDraft);
    onChange(nextDraft.date && nextDraft.time ? `${nextDraft.date}T${nextDraft.time}` : '');
  };

  const dateDisplayClass = draft.date ? 'text-text-main' : 'text-text-muted';
  const timeDisplayClass = draft.time ? 'text-text-main' : 'text-text-muted';

  return (
    <div
      className={`group flex w-full min-w-0 flex-col ${isInsideTemporarySurface ? '' : 'animate-in fade-in zoom-in-95 duration-300'}`}
      style={{ animationDelay, animationTimingFunction: 'var(--ease-emil)', animationFillMode: 'both', gap: 'var(--space-xs)' }}
    >
      <label htmlFor={dateId} className="text-form-label ml-[var(--inset-field-label)] text-text-muted group-focus-within:text-brand-500 transition-colors">
        {label}
      </label>
      <div
        className="relative flex h-[var(--h-input)] w-full min-w-0 items-center border border-border-main bg-bg-muted transition-all duration-300 group-focus-within:border-brand-500/50 group-focus-within:bg-bg-card group-focus-within:ring-4 group-focus-within:ring-brand-500/5"
        style={{ borderRadius: 'var(--radius-inner-visual)' }}
      >
        {Icon && (
          <div className="pointer-events-none absolute left-[var(--inset-input-icon)] z-10 flex items-center justify-center text-text-muted transition-colors group-focus-within:text-brand-500">
            <Icon style={{ width: 'var(--size-inner-icon-card)', height: 'var(--size-inner-icon-card)' }} strokeWidth={1.5} />
          </div>
        )}
        <div className={`flex h-full min-w-0 flex-1 items-center ${Icon ? 'pl-[var(--padding-input-inline-with-icon)]' : 'pl-[var(--padding-input-inline)]'} pr-[var(--padding-input-inline)]`}>
          <div className="relative flex min-w-0 flex-[1.35] flex-col justify-center rounded-[var(--radius-inner-visual)] px-[var(--space-xs)]" style={{ gap: 'var(--space-xs)' }}>
            <span className="pointer-events-none text-caption uppercase text-text-muted">Fecha</span>
            <span className={`pointer-events-none text-body font-medium tabular-nums ${dateDisplayClass}`}>
              {formatDateSegment(draft.date)}
            </span>
            <input
              id={dateId}
              type="date"
              value={draft.date}
              onChange={(event) => updateDraft({ date: event.target.value, time: draft.time })}
              aria-label={`${label}: fecha`}
              aria-invalid={Boolean(error)}
              disabled={disabled}
              required={required}
              className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
          </div>
          <div aria-hidden="true" className="mx-[var(--space-md)] h-[calc(100%-var(--space-md))] w-px shrink-0 bg-border-main" />
          <div className="relative flex min-w-0 flex-[0.85] flex-col justify-center rounded-[var(--radius-inner-visual)] px-[var(--space-xs)]" style={{ gap: 'var(--space-xs)' }}>
            <span className="pointer-events-none text-caption uppercase text-text-muted">Hora</span>
            <span className={`pointer-events-none text-body font-medium tabular-nums ${timeDisplayClass}`}>
              {draft.time || 'hh:mm'}
            </span>
            <input
              id={timeId}
              type="time"
              value={draft.time}
              onChange={(event) => updateDraft({ date: draft.date, time: event.target.value })}
              aria-label={`${label}: hora`}
              aria-invalid={Boolean(error)}
              disabled={disabled}
              required={required}
              className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>
      {helperText && !error && (
        <p className="text-secondary italic text-text-muted px-[var(--inset-field-label)] leading-relaxed">{helperText}</p>
      )}
      {error && (
        <p className="text-label text-rose-500 mt-[var(--space-sm)] flex items-center gap-[var(--space-sm)] px-[var(--inset-field-label)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
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
  const isInsideTemporarySurface = useNexusTemporarySurfaceContext();

  return (
    <div 
      className={`group flex flex-col ${isInsideTemporarySurface ? '' : 'animate-in fade-in zoom-in-95 duration-200'}`}
      style={{ animationDelay, animationTimingFunction: 'var(--ease-emil)', animationFillMode: 'both', gap: 'var(--space-xs)' }}
    >
      <label className="text-form-label ml-[var(--inset-field-label)] text-text-muted group-focus-within:text-brand-500 transition-colors">
        {label}
      </label>
      <textarea 
        className={`w-full bg-bg-muted border border-border-main p-[var(--padding-input-textarea)] focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/50 focus:bg-bg-card transition-all duration-300 font-medium text-text-main resize-none leading-relaxed ${className}`}
        style={{ borderRadius: 'var(--radius-inner-visual)' }}
        {...props}
      />
      {helperText && (
        <p className="text-secondary italic text-text-muted px-[var(--inset-field-label)] leading-relaxed">{helperText}</p>
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
  const isInsideTemporarySurface = useNexusTemporarySurfaceContext();

  return (
    <div 
      className={`group flex w-full min-w-0 flex-col ${isInsideTemporarySurface ? '' : 'animate-in fade-in zoom-in-95 duration-200'}`}
      style={{ animationDelay, animationTimingFunction: 'var(--ease-emil)', animationFillMode: 'both', gap: 'var(--space-xs)' }}
    >
      <label className="text-form-label ml-[var(--inset-field-label)] text-text-muted group-focus-within:text-brand-500 transition-colors">
        {label}
      </label>
      <div className="relative flex items-center h-[var(--h-input)]">
        <select 
          className={`h-full w-full min-w-0 appearance-none border border-border-main bg-bg-muted pl-[var(--padding-input-inline)] pr-[var(--padding-input-inline-with-affordance)] font-medium text-text-main transition-all duration-300 cursor-pointer focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/50 focus:bg-bg-card ${className}`}
          style={{ borderRadius: 'var(--radius-inner-visual)' }}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-[var(--inset-input-icon)] pointer-events-none text-text-muted group-focus-within:text-brand-500 transition-colors flex items-center justify-center">
          {Icon ? <Icon size={16} /> : <ChevronDown size={16} strokeWidth={2} />}
        </div>
      </div>
    </div>
  );
};
