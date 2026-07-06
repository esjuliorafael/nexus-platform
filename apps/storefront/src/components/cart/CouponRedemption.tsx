import { FormEvent, useState } from 'react';
import { Check, Tag, X } from 'lucide-react';
import { couponApi } from '../../api/coupons';
import { useCartStore } from '../../store/cart.store';
import { useToastStore } from '../../store/toast.store';
import { formatPrice } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { StorefrontSectionCard } from '../ui/Card';
import { StorefrontField } from '../ui/Field';

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message;
  }

  return 'No se pudo validar el cupón.';
}

export function CouponRedemption({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { items, coupon, setCoupon, clearCoupon } = useCartStore();
  const { showToast } = useToastStore();
  const [code, setCode] = useState(coupon?.code || '');
  const [loading, setLoading] = useState(false);
  const isDark = tone === 'dark';

  const handleApply = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedCode = code.trim();

    if (!normalizedCode) {
      showToast('Escribe un cupón para aplicarlo.', 'info');
      return;
    }

    setLoading(true);
    try {
      const result = await couponApi.validate(
        normalizedCode,
        items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      );
      setCoupon(result);
      setCode(result.code);
      showToast('Cupón aplicado.', 'success');
    } catch (error) {
      clearCoupon();
      showToast(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StorefrontSectionCard
      className={isDark ? 'border-white/10 bg-white/5 text-white shadow-none' : ''}
      style={{ padding: 'var(--sf-space-md)' }}
    >
      <div className="flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
        <div className="flex items-center justify-between" style={{ gap: 'var(--sf-space-md)' }}>
          <div className="flex min-w-0 items-center" style={{ gap: 'var(--sf-space-sm)' }}>
            <span
              className={`flex shrink-0 items-center justify-center ${isDark ? 'bg-white/10 text-brand-400' : 'bg-brand-50 text-brand-500'}`}
              style={{
                width: 'var(--sf-h-button-card)',
                height: 'var(--sf-h-button-card)',
                borderRadius: 'var(--sf-radius-card-nested)',
              }}
            >
              <Tag style={{ width: 'var(--sf-size-inner-icon-card)', height: 'var(--sf-size-inner-icon-card)' }} />
            </span>
            <div className="min-w-0">
              <p className={`sf-text-label uppercase tracking-widest font-black ${isDark ? 'text-stone-400' : 'text-stone-400'}`}>
                Cupón
              </p>
              <p className={`sf-text-secondary font-bold ${isDark ? 'text-white' : 'text-stone-850'}`}>
                {coupon ? `-$${formatPrice(coupon.discountTotal)}` : 'Agregar descuento'}
              </p>
            </div>
          </div>

          {coupon && (
            <button
              type="button"
              onClick={() => {
                clearCoupon();
                setCode('');
              }}
              className={`flex shrink-0 items-center justify-center transition-colors ${isDark ? 'bg-white/10 text-white/70 hover:text-white' : 'bg-stone-100 text-stone-500 hover:text-stone-800'}`}
              style={{
                width: 'var(--sf-h-button-card)',
                height: 'var(--sf-h-button-card)',
                borderRadius: 'var(--sf-radius-card-nested)',
              }}
              aria-label="Quitar cupón"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {!coupon ? (
          <form onSubmit={handleApply} className="grid grid-cols-[minmax(0,1fr)_auto]" style={{ gap: 'var(--sf-space-sm)' }}>
            <StorefrontField
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Código"
              className={isDark ? 'border-white/10 bg-white/10 text-white placeholder:text-stone-500' : ''}
              aria-label="Código de cupón"
              style={{ borderRadius: 'var(--sf-radius-card-nested)' }}
            />
            <Button
              type="submit"
              context="card"
              icon={Check}
              isLoading={loading}
              className="sf-text-button-field"
              style={{
                height: 'var(--sf-h-button-field)',
                borderRadius: 'var(--sf-radius-card-nested)',
              }}
            >
              Aplicar
            </Button>
          </form>
        ) : (
          <p className={`sf-text-label leading-relaxed ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
            {coupon.code} aplicado correctamente.
          </p>
        )}
      </div>
    </StorefrontSectionCard>
  );
}
