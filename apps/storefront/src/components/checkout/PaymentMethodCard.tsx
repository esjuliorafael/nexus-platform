import type { LucideIcon } from 'lucide-react';

interface PaymentMethodCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
}

export function PaymentMethodCard({
  icon: Icon,
  title,
  subtitle,
  active,
  onClick,
}: PaymentMethodCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center border-2 text-left transition-all duration-500 active:scale-95 ${
        active
          ? 'border-stone-800 bg-stone-900 text-white shadow-2xl shadow-stone-900/20'
          : 'border-stone-100 bg-stone-50/70 text-stone-500 hover:border-stone-200'
      }`}
      style={{
        borderRadius: 'var(--sf-radius-inner)',
        padding: 'var(--sf-padding-inner)',
        gap: 'var(--sf-space-md)',
        transitionTimingFunction: 'var(--sf-ease)',
      }}
    >
      <span
        className={`flex shrink-0 items-center justify-center transition-all duration-500 ${
          active ? 'bg-white/10 text-white' : 'bg-stone-200/60 text-stone-400'
        }`}
        style={{
          width: 'var(--sf-h-button-card)',
          height: 'var(--sf-h-button-card)',
          borderRadius: 'var(--sf-radius-nested)',
        }}
      >
        <Icon style={{ width: 'var(--sf-size-inner-icon-card)', height: 'var(--sf-size-inner-icon-card)' }} />
      </span>
      <span className="flex min-w-0 flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
        <span className={`sf-text-secondary-strong transition-colors duration-500 ${active ? 'text-white' : 'text-stone-800'}`}>
          {title}
        </span>
        <span className={`sf-text-secondary opacity-70 transition-colors duration-500 ${active ? 'text-stone-300' : 'text-stone-500'}`}>
          {subtitle}
        </span>
      </span>
    </button>
  );
}
