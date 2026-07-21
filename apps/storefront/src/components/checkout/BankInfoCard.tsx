import { Copy, Info } from 'lucide-react';
import type { PublicBankInfo } from '../../api/payments';
import { StorefrontSectionCard } from '../ui/Card';

interface BankInfoCardProps {
  bankInfo: PublicBankInfo | null;
  onCopy: (value: string) => void;
}

export function formatBankInfo(bankInfo: PublicBankInfo | null) {
  if (!bankInfo) return '';
  return [
    bankInfo.bank ? `Banco: ${bankInfo.bank}` : '',
    bankInfo.beneficiary ? `Beneficiario: ${bankInfo.beneficiary}` : '',
    bankInfo.accountNumber ? `No. Cuenta: ${bankInfo.accountNumber}` : '',
    bankInfo.clabe ? `CLABE: ${bankInfo.clabe}` : '',
    bankInfo.card ? `Tarjeta: ${bankInfo.card}` : '',
  ].filter(Boolean).join('\n');
}

export function BankInfoCard({ bankInfo, onCopy }: BankInfoCardProps) {
  const rows = bankInfo
    ? [
        { label: 'Banco', value: bankInfo.bank },
        { label: 'Beneficiario', value: bankInfo.beneficiary },
        { label: 'No. Cuenta', value: bankInfo.accountNumber },
        { label: 'CLABE', value: bankInfo.clabe },
        { label: 'No. Tarjeta', value: bankInfo.card },
      ].filter((row) => row.value && String(row.value).trim())
    : [];

  if (!bankInfo || rows.length === 0) {
    return (
      <div
        className="flex items-start border border-amber-200 bg-amber-50 text-amber-900"
        style={{ borderRadius: 'var(--sf-radius-inner)', padding: 'var(--sf-padding-inner)', gap: 'var(--sf-space-md)' }}
      >
        <span
          className="flex shrink-0 items-center justify-center bg-amber-100 text-amber-700"
          style={{ width: 'var(--sf-h-button-card)', height: 'var(--sf-h-button-card)', borderRadius: 'var(--sf-radius-nested)' }}
        >
          <Info style={{ width: 'var(--sf-size-inner-icon-card)', height: 'var(--sf-size-inner-icon-card)' }} />
        </span>
        <p className="sf-text-secondary font-semibold leading-relaxed">
          La información bancaria aún no está configurada. Te contactaremos por WhatsApp para completar el pago.
        </p>
      </div>
    );
  }

  return (
    <StorefrontSectionCard className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }}>
      <div className="flex items-start justify-between" style={{ gap: 'var(--sf-space-md)' }}>
        <div className="flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
          <p className="sf-text-label font-black uppercase tracking-[0.2em] text-brand-500">{bankInfo.label}</p>
          <h4 className="sf-text-h2 text-stone-850">Información bancaria</h4>
        </div>
        <button
          type="button"
          onClick={() => onCopy(formatBankInfo(bankInfo))}
          className="flex shrink-0 items-center justify-center border border-stone-200 bg-white text-stone-500 transition-all hover:text-brand-500 active:scale-95"
          style={{
            width: 'var(--sf-h-button-card)',
            height: 'var(--sf-h-button-card)',
            borderRadius: 'var(--sf-radius-nested)',
          }}
          aria-label="Copiar información bancaria"
        >
          <Copy style={{ width: 'var(--sf-size-inner-icon-card)', height: 'var(--sf-size-inner-icon-card)' }} />
        </button>
      </div>
      <div className="flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-stone-100 pb-[var(--sf-space-base)] last:border-0 last:pb-0" style={{ gap: 'var(--sf-space-md)' }}>
            <span className="sf-text-label font-black uppercase tracking-widest text-stone-400">{row.label}</span>
            <button
              type="button"
              onClick={() => onCopy(String(row.value))}
              className="max-w-[60%] truncate text-right sf-text-secondary font-black text-stone-800 transition-colors hover:text-brand-500"
            >
              {row.value}
            </button>
          </div>
        ))}
      </div>
    </StorefrontSectionCard>
  );
}
