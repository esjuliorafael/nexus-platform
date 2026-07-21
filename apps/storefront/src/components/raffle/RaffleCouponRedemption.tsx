import { FormEvent, useState } from 'react';
import { Check, Tag, Trash2 } from 'lucide-react';
import { raffleCouponApi, RaffleCouponValidationResponse } from '../../api/raffle-coupons';
import { formatPrice } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { StorefrontSectionCard } from '../ui/Card';
import { StorefrontField } from '../ui/Field';
import { useToastStore } from '../../store/toast.store';

interface Props {
  raffleId: number;
  tickets: string[];
  coupon: RaffleCouponValidationResponse | null;
  onCouponChange: (coupon: RaffleCouponValidationResponse | null) => void;
}

const errorMessage = (error: any) => error?.response?.data?.message || 'No se pudo validar el cupón.';

export function RaffleCouponRedemption({ raffleId, tickets, coupon, onCouponChange }: Props) {
  const [code, setCode] = useState(coupon?.code || '');
  const [isLoading, setIsLoading] = useState(false);
  const showToast = useToastStore((state) => state.showToast);

  const apply = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return showToast('Escribe un cupón para aplicarlo.', 'info');
    setIsLoading(true);
    try {
      const result = await raffleCouponApi.validate(code, raffleId, tickets);
      onCouponChange(result);
      setCode(result.code);
      showToast('Cupón aplicado.', 'success');
    } catch (error) {
      onCouponChange(null);
      showToast(errorMessage(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StorefrontSectionCard style={{ padding: 'var(--sf-space-md)' }}>
      <div className="flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
        <div className="flex items-center justify-between" style={{ gap: 'var(--sf-space-md)' }}>
          <div className="flex min-w-0 items-center" style={{ gap: 'var(--sf-space-sm)' }}>
            <span className="flex shrink-0 items-center justify-center bg-brand-50 text-brand-500" style={{ width: 'var(--sf-h-button-card)', height: 'var(--sf-h-button-card)', borderRadius: 'var(--sf-radius-card-nested)' }}>
              <Tag style={{ width: 'var(--sf-size-inner-icon-card)', height: 'var(--sf-size-inner-icon-card)' }} />
            </span>
            <div className="min-w-0">
              <p className="sf-text-label text-stone-400">Cupón</p>
              <p className="sf-text-secondary font-bold text-stone-850">{coupon ? `-$${formatPrice(coupon.discountTotal)}` : 'Agregar descuento'}</p>
            </div>
          </div>
          {coupon && <button type="button" aria-label="Quitar cupón" onClick={() => { onCouponChange(null); setCode(''); }} className="flex shrink-0 items-center justify-center bg-stone-100 text-stone-500 hover:text-stone-800" style={{ width: 'var(--sf-h-button-card)', height: 'var(--sf-h-button-card)', borderRadius: 'var(--sf-radius-card-nested)' }}><Trash2 size={16} /></button>}
        </div>
        {!coupon ? (
          <form onSubmit={apply} className="grid grid-cols-[minmax(0,1fr)_auto]" style={{ gap: 'var(--sf-space-sm)' }}>
            <StorefrontField value={code} onChange={(event) => setCode(event.target.value)} placeholder="Código" aria-label="Código de cupón" style={{ borderRadius: 'var(--sf-radius-card-nested)' }} />
            <Button type="submit" context="card" icon={Check} isLoading={isLoading} className="sf-text-button-field" style={{ height: 'var(--sf-h-button-field)', borderRadius: 'var(--sf-radius-card-nested)' }}>Aplicar</Button>
          </form>
        ) : <p className="sf-text-label text-stone-500">{coupon.code} aplicado correctamente.</p>}
      </div>
    </StorefrontSectionCard>
  );
}
