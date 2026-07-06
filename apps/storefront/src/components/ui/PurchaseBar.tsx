import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { Spinner } from './Spinner';
import { formatPrice } from '../../utils/formatters';

interface StorefrontPurchaseBarProps {
  total: number;
  buttonLabel: string;
  buttonIcon: LucideIcon;
  onAction: () => void;
  loading?: boolean;
  disabled?: boolean;
  totalLabel?: string;
  className?: string;
}

export function StorefrontPurchaseBar({
  total,
  buttonLabel,
  buttonIcon,
  onAction,
  loading = false,
  disabled = false,
  totalLabel = 'Total',
  className = '',
}: StorefrontPurchaseBarProps) {
  const ButtonIcon = buttonIcon;

  return (
    <div
      className={`fixed z-40 md:hidden ${className}`}
      style={{
        bottom: 'var(--sf-inset-mobile-chrome-block)',
        left: 'var(--sf-inset-mobile-chrome)',
        right: 'var(--sf-inset-mobile-chrome)',
      }}
    >
      <div
        className="flex items-center justify-between border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]"
        style={{
          height: 'var(--sf-h-mobile-nav)',
          borderRadius: 'var(--sf-radius-outer)',
          gap: 'var(--sf-space-sm)',
          padding: 'var(--sf-space-sm)',
        }}
      >
        <div className="min-w-0 shrink-0 pl-[var(--sf-space-sm)]">
          <span className="block sf-text-caption text-stone-400">{totalLabel}</span>
          <p className="truncate sf-text-h2 font-black text-brand-500">
            ${formatPrice(total)}
          </p>
        </div>

        <Button
          type="button"
          context="autonomous"
          variant="primary"
          icon={ButtonIcon}
          disabled={disabled || loading}
          onClick={onAction}
          className="shrink-0"
          style={{
            height: 'var(--sf-size-mobile-nav-item)',
            borderRadius: 'var(--sf-radius-mobile-nav-item)',
            '--sf-button-icon-size': 'var(--sf-size-mobile-nav-icon)',
          } as CSSProperties}
        >
          {loading ? <Spinner className="text-white" /> : buttonLabel}
        </Button>
      </div>
    </div>
  );
}
