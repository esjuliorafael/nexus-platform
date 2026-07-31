'use client';

import { Check } from 'lucide-react';

interface MarketingConsentFieldProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function MarketingConsentField({
  checked,
  onChange,
}: MarketingConsentFieldProps) {
  return (
    <label
      className="group flex cursor-pointer items-center justify-between border border-stone-200 bg-white transition-all duration-300 focus-within:border-brand-500/50 focus-within:ring-4 focus-within:ring-brand-500/10"
      style={{
        minHeight: 'var(--sf-h-input)',
        borderRadius: 'var(--sf-radius-inner)',
        padding: 'var(--sf-space-sm) var(--sf-space-md)',
        gap: 'var(--sf-space-md)',
        transitionTimingFunction: 'var(--sf-ease)',
      }}
    >
      <span className="flex min-w-0 flex-col" style={{ gap: 'var(--sf-space-2xs)' }}>
        <span className="sf-text-secondary font-bold text-stone-700">
          Quiero recibir invitaciones y novedades por WhatsApp
        </span>
        <span className="sf-text-caption text-stone-500">
          Es opcional. Puedes cancelar cuando quieras respondiendo BAJA.
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        className={`flex shrink-0 items-center justify-center border text-white transition-all duration-300 ${
          checked
            ? 'border-brand-500 bg-brand-500'
            : 'border-stone-200 bg-stone-50'
        }`}
        style={{
          width: 'var(--sf-size-check-control)',
          height: 'var(--sf-size-check-control)',
          borderRadius: 'var(--sf-radius-nested)',
          transitionTimingFunction: 'var(--sf-ease)',
        }}
        aria-hidden="true"
      >
        <Check
          className={`transition-opacity duration-200 ${
            checked ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            width: 'var(--sf-size-check-icon)',
            height: 'var(--sf-size-check-icon)',
          }}
          strokeWidth={2.75}
        />
      </span>
    </label>
  );
}
