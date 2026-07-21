import { LucideIcon, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';
import { StorefrontIcon } from './Icon';
import { StorefrontTemporarySurfaceHeaderItem } from './TemporarySurfaceMotion';

interface StorefrontDrawerHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  closeLabel: string;
  onClose: () => void;
  className?: string;
}

export function StorefrontDrawerHeader({
  icon,
  title,
  subtitle,
  closeLabel,
  onClose,
  className,
}: StorefrontDrawerHeaderProps) {
  return (
    <div
      className={cn(
        'shrink-0 items-center justify-between border-b border-stone-100',
        className,
      )}
      style={{ padding: 'var(--sf-padding-inner)', gap: 'var(--sf-space-md)' }}
    >
      <StorefrontTemporarySurfaceHeaderItem
        part="identity"
        className="flex min-w-0 items-center"
        style={{ gap: 'var(--sf-space-md)' }}
      >
        <StorefrontIcon icon={icon} context="section" variant="brand" />
        <div className="min-w-0">
          <h2 className="truncate sf-text-h2 text-stone-950">{title}</h2>
          {subtitle && <p className="sf-text-label text-stone-400">{subtitle}</p>}
        </div>
      </StorefrontTemporarySurfaceHeaderItem>

      <StorefrontTemporarySurfaceHeaderItem part="close" className="shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          context="section"
          icon={X}
          isIconOnly
          onClick={onClose}
          aria-label={closeLabel}
        />
      </StorefrontTemporarySurfaceHeaderItem>
    </div>
  );
}
