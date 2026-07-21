"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, CreditCard, MessageCircle, ShieldCheck, Ticket, User, WalletCards } from 'lucide-react';
import { raffleApi } from '../../../../api/raffles';
import {
  MercadoPagoCardFormData,
  MercadoPagoCheckoutConfig,
  paymentApi,
  PublicPaymentOptions,
} from '../../../../api/payments';
import { Raffle } from '../../../../types';
import {
  clearRaffleCheckoutDraft,
  clearPendingRafflePaymentAttempt,
  getRaffleCheckoutDraft,
  getPendingRafflePaymentAttempt,
  RaffleCheckoutDraft,
  savePendingRafflePaymentAttempt,
} from '../../../../lib/raffle-checkout-draft';
import { formatPrice } from '../../../../utils/formatters';
import { Button } from '../../../../components/ui/Button';
import { StorefrontAutonomousCard } from '../../../../components/ui/Card';
import { StorefrontCheckoutSection } from '../../../../components/ui/CheckoutSection';
import { StorefrontCheckoutTopBar } from '../../../../components/ui/CheckoutTopBar';
import { BottomSheet } from '../../../../components/ui/BottomSheet';
import { StorefrontField } from '../../../../components/ui/Field';
import { StorefrontPurchaseBar } from '../../../../components/ui/PurchaseBar';
import { RaffleSelectionSummaryCard } from '../../../../components/raffle/RaffleSelectionSummaryCard';
import { RaffleTicketSelectionExplorer } from '../../../../components/raffle/RaffleTicketSelectionExplorer';
import { useToastStore } from '../../../../store/toast.store';
import { useCheckoutTransitionReady } from '../../../../hooks/useCheckoutTransitionReady';
import { PaymentMethodCard } from '../../../../components/checkout/PaymentMethodCard';
import { BankInfoCard } from '../../../../components/checkout/BankInfoCard';
import { MercadoPagoCardPayment } from '../../../../components/checkout/MercadoPagoCardPayment';
import { getRaffleEarlyAccessToken } from '../../../../lib/raffle-early-access';
import {
  StorefrontCheckoutMotion,
  useStorefrontCheckoutMotionReady,
} from '../../../../components/ui/CheckoutMotion';
import {
  STOREFRONT_CHECKOUT_SEQUENCE_MS,
  STOREFRONT_EASING,
  STOREFRONT_MOTION_MS,
  toMotionSeconds,
} from '../../../../lib/motion';
import { useFeedbackSound } from '../../../../hooks/useFeedbackSound';
import { StorefrontIcon } from '../../../../components/ui/Icon';

type RaffleCheckoutStep = 0 | 1;
type CompletionState = 'reserved' | 'approved' | 'pending' | null;
type CompletionDetails = {
  paymentExpiresAt: string | null;
  reservationId: string | null;
};

const raffleCheckoutSteps = [
  { label: 'Datos del participante' },
  { label: 'Método de pago' },
] as const;

export function RaffleCheckoutClient({ raffleId }: { raffleId: number }) {
  const router = useRouter();
  const showToast = useToastStore((state) => state.showToast);
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [draft, setDraft] = useState<RaffleCheckoutDraft | null>(() => getRaffleCheckoutDraft(raffleId));
  const [isInitialized, setIsInitialized] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'MERCADOPAGO'>('TRANSFER');
  const [paymentOptions, setPaymentOptions] = useState<PublicPaymentOptions | null>(null);
  const [mpCheckoutConfig, setMpCheckoutConfig] = useState<MercadoPagoCheckoutConfig | null>(null);
  const [embeddedPaymentHoldId, setEmbeddedPaymentHoldId] = useState<string | null>(
    () => getPendingRafflePaymentAttempt(raffleId)?.paymentHoldId ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionState, setCompletionState] = useState<CompletionState>(null);
  const [completionDetails, setCompletionDetails] = useState<CompletionDetails | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<RaffleCheckoutStep>(0);
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const [cardSubmitRequest, setCardSubmitRequest] = useState(0);
  const [isCardPaymentReady, setIsCardPaymentReady] = useState(false);
  const confirmationFeedbackPlayedRef = useRef(false);
  const errorFeedbackPlayedRef = useRef(false);
  const {
    play: playConfirmationSound,
    prepare: prepareConfirmationSound,
  } = useFeedbackSound('confirmation');
  const {
    play: playErrorSound,
    prepare: prepareErrorSound,
  } = useFeedbackSound('error');

  const playConfirmationFeedback = useCallback(() => {
    if (confirmationFeedbackPlayedRef.current) return;
    confirmationFeedbackPlayedRef.current = true;
    playConfirmationSound();
  }, [playConfirmationSound]);

  const playErrorFeedback = useCallback(() => {
    if (errorFeedbackPlayedRef.current) return;
    errorFeedbackPlayedRef.current = true;
    playErrorSound();
  }, [playErrorSound]);

  const prepareCheckoutFeedback = useCallback(async () => {
    errorFeedbackPlayedRef.current = false;
    await Promise.all([prepareConfirmationSound(), prepareErrorSound()]);
  }, [prepareConfirmationSound, prepareErrorSound]);

  useCheckoutTransitionReady(`/raffles/${raffleId}/checkout`, isInitialized);
  const checkoutMotionReady = useStorefrontCheckoutMotionReady(`/raffles/${raffleId}/checkout`);

  useEffect(() => {
    let active = true;
    setDraft(getRaffleCheckoutDraft(raffleId));
    const storedPaymentAttempt = getPendingRafflePaymentAttempt(raffleId);
    if (storedPaymentAttempt) {
      setEmbeddedPaymentHoldId(storedPaymentAttempt.paymentHoldId);
      setCustomerName(storedPaymentAttempt.customerName);
      setCustomerPhone(storedPaymentAttempt.customerPhone);
      setCustomerState(storedPaymentAttempt.customerState || '');
      setPaymentMethod('MERCADOPAGO');
      setCheckoutStep(1);
    }
    void Promise.allSettled([
      raffleApi.getById(raffleId),
      paymentApi.getOptions('RAFFLES'),
      paymentApi.getCheckoutConfig(),
    ]).then(([raffleResult, paymentResult, configResult]) => {
      if (!active) return;
      setRaffle(raffleResult.status === 'fulfilled' ? raffleResult.value : null);
      setPaymentOptions(paymentResult.status === 'fulfilled' ? paymentResult.value : null);
      setMpCheckoutConfig(configResult.status === 'fulfilled'
        ? configResult.value
        : { mode: 'redirect', publicKey: null });
      setIsInitialized(true);
    });

    return () => {
      active = false;
    };
  }, [raffleId]);

  useEffect(() => {
    if (mpCheckoutConfig?.mode !== 'embedded' || !embeddedPaymentHoldId) return;
    const storedPaymentAttempt = getPendingRafflePaymentAttempt(raffleId);
    if (!storedPaymentAttempt) return;
    let active = true;
    const checkStatus = () => paymentApi.getCardPaymentStatus({
      rafflePaymentHoldId: embeddedPaymentHoldId,
      customerPhone: storedPaymentAttempt.customerPhone,
    }).then((result) => {
      if (!active) return;
      if (result.status === 'approved') {
        setCompletionDetails({
          paymentExpiresAt: null,
          reservationId: String(result.referenceId),
        });
        clearRaffleCheckoutDraft();
        clearPendingRafflePaymentAttempt(raffleId);
        setEmbeddedPaymentHoldId(null);
        playConfirmationFeedback();
        setCompletionState('approved');
      } else if (result.status === 'rejected') {
        setCompletionState(null);
        showToast(result.message || 'El banco no aprobó el pago. Puedes intentarlo nuevamente.', {
          type: 'info',
          title: 'Pago no aprobado',
        });
      } else if (result.status === 'unavailable') {
        clearPendingRafflePaymentAttempt(raffleId);
        setEmbeddedPaymentHoldId(null);
        showToast('El intento de pago ya no está disponible.', 'info');
      }
    }).catch(() => {
      // Preserve the reservation when the status endpoint is temporarily unavailable.
    });
    void checkStatus();
    const interval = completionState === 'pending' ? window.setInterval(checkStatus, 2_000) : null;
    return () => {
      active = false;
      if (interval) window.clearInterval(interval);
    };
  }, [completionState, embeddedPaymentHoldId, mpCheckoutConfig?.mode, playConfirmationFeedback, raffleId, showToast]);

  const subtotal = useMemo(
    () => (raffle && draft ? draft.tickets.length * Number(raffle.ticketPrice) : 0),
    [draft, raffle],
  );
  const discount = draft?.coupon?.discountTotal || 0;
  const total = Math.max(0, subtotal - discount);
  const participantComplete = Boolean(customerName.trim() && customerPhone.trim());
  const canContinue = Boolean(draft?.tickets.length && participantComplete);
  const isEmbeddedMP = paymentOptions?.mercadoPago.available
    && mpCheckoutConfig?.mode === 'embedded'
    && Boolean(mpCheckoutConfig.publicKey);

  const createRaffleReservation = () => {
    const pendingAttempt = getPendingRafflePaymentAttempt(raffle!.id);
    if (embeddedPaymentHoldId && pendingAttempt) {
      return raffleApi.convertPaymentHoldToTransfer(
        raffle!.id,
        embeddedPaymentHoldId,
        pendingAttempt.customerPhone,
      );
    }
    return raffleApi.reserveTickets(raffle!.id, {
      tickets: draft!.tickets,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerState: customerState.trim() || undefined,
      paymentMethod,
      couponCode: draft?.coupon?.code,
      earlyAccessToken: getRaffleEarlyAccessToken(raffle!.id) || undefined,
    });
  };

  const reserve = async () => {
    if (!draft || !raffle || !canContinue || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (paymentMethod === 'MERCADOPAGO') throw new Error('El pago con tarjeta requiere el formulario integrado de Mercado Pago.');
      const reservation = await createRaffleReservation();
      clearRaffleCheckoutDraft();
      clearPendingRafflePaymentAttempt(raffleId);
      setEmbeddedPaymentHoldId(null);
      setCompletionDetails({
        paymentExpiresAt: reservation.paymentExpiresAt,
        reservationId: reservation.reservationId,
      });
      playConfirmationFeedback();
      setCompletionState(reservation.paymentStatus === 'PAID' ? 'approved' : 'reserved');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      playErrorFeedback();
      const unavailable = error?.response?.data?.ticketNumbers;
      if (Array.isArray(unavailable) && unavailable.length) {
        showToast('Uno o más boletos ya no están disponibles. Vuelve a revisar tu selección.', {
          type: 'info',
          title: 'Disponibilidad actualizada',
        });
        router.replace(`/raffles/${raffleId}`);
      } else if (error?.response?.data?.code === 'PAYMENT_REQUIRES_RESOLUTION') {
        showToast(error.response.data.message, {
          type: 'info',
          title: 'Pago en verificación',
        });
      } else {
        showToast(error?.response?.data?.message || 'No fue posible completar la reserva.', {
          type: 'error',
          title: 'No se pudo completar la reserva',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (showMobileSummary) {
      setShowMobileSummary(false);
      return;
    }
    if (completionState) {
      router.push(`/raffles/${raffleId}`);
      return;
    }
    if (checkoutStep > 0) {
      setCheckoutStep(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    router.push(`/raffles/${raffleId}`);
  };

  const handlePrimaryAction = async () => {
    if (checkoutStep === 0) {
      if (!participantComplete) return;
      setCheckoutStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    await prepareCheckoutFeedback();
    if (paymentMethod === 'MERCADOPAGO' && isEmbeddedMP) {
      if (!isCardPaymentReady) {
        showToast('El formulario de pago aún se está preparando.', 'info');
        return;
      }
      setCardSubmitRequest((current) => current + 1);
      return;
    }
    void reserve();
  };

  const handleEmbeddedCardPayment = async (formData: MercadoPagoCardFormData) => {
    if (!draft || !raffle || !canContinue) {
      throw new Error('Completa los datos del participante antes de pagar.');
    }

    setIsSubmitting(true);
    try {
      let paymentHoldId = embeddedPaymentHoldId;
      if (!paymentHoldId) {
        const hold = await raffleApi.createPaymentHold(raffle.id, {
          tickets: draft.tickets,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerState: customerState.trim() || undefined,
          couponCode: draft.coupon?.code,
          earlyAccessToken: getRaffleEarlyAccessToken(raffle.id) || undefined,
        });
        paymentHoldId = hold.paymentHoldId;
        setEmbeddedPaymentHoldId(paymentHoldId);
        savePendingRafflePaymentAttempt(raffleId, {
          paymentHoldId,
          expiresAt: hold.expiresAt,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerState: customerState.trim() || undefined,
        });
      }
      return await paymentApi.processRaffleCardPayment(paymentHoldId, customerPhone.trim(), formData);
    } catch (error: any) {
      const unavailable = error?.response?.data?.ticketNumbers;
      if (Array.isArray(unavailable) && unavailable.length) {
        showToast('Uno o más boletos ya no están disponibles. No se realizó ningún cobro.', {
          type: 'info',
          title: 'Disponibilidad actualizada',
        });
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmbeddedPaymentApproved = (result: { referenceId: number | string }) => {
    setCompletionDetails({
      paymentExpiresAt: null,
      reservationId: String(result.referenceId),
    });
    clearRaffleCheckoutDraft();
    clearPendingRafflePaymentAttempt(raffleId);
    setEmbeddedPaymentHoldId(null);
    playConfirmationFeedback();
    setCompletionState('approved');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEmbeddedPaymentPending = () => {
    setCompletionDetails({
      paymentExpiresAt: null,
      reservationId: embeddedPaymentHoldId,
    });
    showToast('Mercado Pago está revisando el pago. Te notificaremos cuando quede confirmado.', {
      type: 'info',
      title: 'Pago en revisión',
    });
    setCompletionState('pending');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isInitialized) return <main className="min-h-screen bg-stone-50" aria-busy="true" />;

  if (!raffle || !draft) {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-xl items-center px-[var(--sf-inset-page)]">
        <StorefrontAutonomousCard className="w-full text-center">
          <div className="flex flex-col items-center" style={{ gap: 'var(--sf-space-md)' }}>
            <Ticket className="text-brand-500" size={36} />
            <h1 className="sf-text-h1">Tu selección está vacía</h1>
            <p className="sf-text-secondary text-stone-500">Elige tus boletos antes de continuar.</p>
            <Button context="section" onClick={() => router.push(`/raffles/${raffleId}`)}>Volver a la rifa</Button>
          </div>
        </StorefrontAutonomousCard>
      </div>
    );
  }

  const finalActionLabel = paymentMethod === 'MERCADOPAGO'
    ? 'Pagar apartado'
    : 'Finalizar apartado';
  const usesEmbeddedCardAction = paymentMethod === 'MERCADOPAGO' && isEmbeddedMP;
  const completionPresentation = completionState
    ? getRaffleCheckoutCompletionPresentation(completionState)
    : null;

  return (
    <main className="mx-auto max-w-[var(--sf-max-width-content)] px-[var(--sf-inset-page)] pb-[var(--sf-mobile-chrome-content-padding-bottom)] pt-[var(--sf-mobile-chrome-content-padding-top)] md:py-[var(--sf-space-xl)]">
      <StorefrontCheckoutTopBar
        title={completionPresentation?.title ?? raffleCheckoutSteps[checkoutStep].label}
        summaryOpen={showMobileSummary}
        summaryIcon={Ticket}
        summaryLabel="Ver mi selección"
        onBack={handleBack}
        onToggleSummary={() => setShowMobileSummary((current) => !current)}
        entranceReady={checkoutMotionReady}
      />

      <StorefrontCheckoutMotion phase="chrome" ready={checkoutMotionReady}>
        <button
          type="button"
          onClick={() => router.push(`/raffles/${raffleId}`)}
          className="mb-[var(--sf-space-lg)] hidden items-center sf-text-secondary font-semibold text-stone-500 hover:text-stone-950 md:flex"
          style={{ gap: 'var(--sf-space-sm)' }}
        >
          <ArrowLeft size={16} />
          Volver a la rifa
        </button>
      </StorefrontCheckoutMotion>

      <div
        className="grid grid-cols-1 items-start lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]"
        style={{ gap: 'var(--sf-space-xl)' }}
      >
        <div className="flex min-w-0 flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
          <AnimatePresence mode="wait" initial={false}>
            {completionState ? (
              <RaffleCheckoutCompletion
                key={`raffle-checkout-completion-${completionState}`}
                state={completionState}
                customerName={customerName}
                ticketCount={draft.tickets.length}
                paymentExpiresAt={completionDetails?.paymentExpiresAt ?? null}
                onBackToRaffle={() => router.push(`/raffles/${raffleId}`)}
                onExploreRaffles={() => router.push('/raffles')}
              />
            ) : (
              <motion.div
                key="raffle-checkout-form"
                className="flex min-w-0 flex-col"
                style={{ gap: 'var(--sf-space-lg)' }}
                exit={{ opacity: 0, y: -8 }}
                transition={{
                  duration: toMotionSeconds(STOREFRONT_MOTION_MS.duration.fast),
                  ease: STOREFRONT_EASING.exit,
                }}
              >
          <StorefrontCheckoutMotion phase="intro" ready={checkoutMotionReady}>
          <section className="hidden flex-col md:flex" style={{ gap: 'var(--sf-space-xs)' }}>
            <h1 className="sf-text-display text-stone-950">Completa tu participación</h1>
            <p className="sf-text-body text-stone-500">Confirma tus datos y el método de pago para apartar tus boletos.</p>
          </section>

          <div key={`raffle-checkout-progress-${checkoutStep}`} className="sf-checkout-step-progress flex flex-col md:hidden" style={{ gap: 'var(--sf-space-sm)' }}>
            <div className="flex items-center justify-between" style={{ gap: 'var(--sf-space-md)' }}>
              <span className="sf-text-label font-black uppercase tracking-[0.2em] text-brand-500">
                Paso {checkoutStep + 1} de {raffleCheckoutSteps.length}
              </span>
              <span className="sf-text-secondary font-bold text-stone-500">
                {raffleCheckoutSteps[checkoutStep].label}
              </span>
            </div>
            <div className="h-2 overflow-hidden bg-stone-100" style={{ borderRadius: 'var(--sf-radius-pill)' }}>
              <div
                className="h-full bg-brand-500 transition-all duration-300"
                style={{
                  width: `${((checkoutStep + 1) / raffleCheckoutSteps.length) * 100}%`,
                  borderRadius: 'var(--sf-radius-pill)',
                  transitionTimingFunction: 'var(--sf-ease)',
                }}
              />
            </div>
          </div>
          </StorefrontCheckoutMotion>

          <div className={checkoutStep === 0 ? 'sf-checkout-step-raffle-active block' : 'hidden md:block'}>
            <StorefrontCheckoutSection
              title="Datos del participante"
              icon={User}
              motionKey={`raffle-checkout-${checkoutStep}-participant`}
              motionReady={checkoutMotionReady}
              motionDelayMs={STOREFRONT_CHECKOUT_SEQUENCE_MS.stepHeaderDelayMs}
            >
              <p className="sf-text-secondary text-stone-500">
                Indícanos quién participará en la rifa. Usaremos estos datos para confirmar tu apartado y contactarte por WhatsApp.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 'var(--sf-space-md)' }}>
                <StorefrontField
                  label="Nombre completo"
                  required
                  icon={User}
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Tu nombre"
                />
                <StorefrontField
                  label="WhatsApp o teléfono"
                  required
                  type="tel"
                  icon={User}
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="10 dígitos"
                />
                <div className="sm:col-span-2">
                  <StorefrontField
                    label="Estado"
                    value={customerState}
                    onChange={(event) => setCustomerState(event.target.value)}
                    placeholder="Ej. Jalisco"
                  />
                </div>
              </div>
            </StorefrontCheckoutSection>
          </div>

          <div className={checkoutStep === 1 ? 'sf-checkout-step-raffle-active block' : 'hidden md:block'}>
            <StorefrontCheckoutSection
              title="Método de pago"
              icon={CreditCard}
              motionKey={`raffle-checkout-${checkoutStep}-payment`}
              motionReady={checkoutMotionReady}
              motionDelayMs={
                STOREFRONT_CHECKOUT_SEQUENCE_MS.stepHeaderDelayMs
                + (checkoutStep === 1 ? 0 : STOREFRONT_CHECKOUT_SEQUENCE_MS.stepItemStaggerMs)
              }
            >
              <p className="sf-text-secondary text-stone-500">
                Elige cómo deseas completar tu apartado. Te mostraremos el siguiente paso según el método seleccionado.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 'var(--sf-space-md)' }}>
                <PaymentMethodCard
                  icon={WalletCards}
                  title="Depósito / transferencia"
                  subtitle="Pago manual verificado"
                  active={paymentMethod === 'TRANSFER'}
                  onClick={() => setPaymentMethod('TRANSFER')}
                />
                {paymentOptions?.mercadoPago.available && (
                  <PaymentMethodCard
                    icon={CreditCard}
                    title="Tarjeta de crédito o débito"
                    subtitle="Pago seguro con Mercado Pago"
                    active={paymentMethod === 'MERCADOPAGO'}
                    onClick={() => setPaymentMethod('MERCADOPAGO')}
                  />
                )}
              </div>
              {paymentMethod === 'TRANSFER' && (
                <BankInfoCard
                  bankInfo={paymentOptions?.bank ?? null}
                  onCopy={(value) => {
                    void navigator.clipboard.writeText(value);
                    showToast('Dato bancario copiado.', 'success');
                  }}
                />
              )}
              {paymentMethod === 'MERCADOPAGO' && isEmbeddedMP && mpCheckoutConfig?.publicKey && (
                <MercadoPagoCardPayment
                  publicKey={mpCheckoutConfig.publicKey}
                  amount={total}
                  submitLabel="Pagar apartado"
                  externalSubmitRequest={cardSubmitRequest}
                  onReadyChange={setIsCardPaymentReady}
                  onSubmit={handleEmbeddedCardPayment}
                  onApproved={handleEmbeddedPaymentApproved}
                  onPending={handleEmbeddedPaymentPending}
                  onCheckStatus={() => {
                    const attempt = getPendingRafflePaymentAttempt(raffleId);
                    const paymentHoldId = embeddedPaymentHoldId || attempt?.paymentHoldId;
                    if (!attempt || !paymentHoldId) throw new Error('No hay un pago activo para verificar.');
                    return paymentApi.getCardPaymentStatus({
                      rafflePaymentHoldId: paymentHoldId,
                      customerPhone: attempt.customerPhone,
                    });
                  }}
                  onFailure={playErrorFeedback}
                />
              )}
            </StorefrontCheckoutSection>
          </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <StorefrontCheckoutMotion phase="summary" ready={checkoutMotionReady} className="hidden md:block">
        <aside>
          <RaffleSelectionSummaryCard
            selectedTickets={draft.tickets}
            ticketOpportunities={raffle.extraOpportunities ?? []}
            total={total}
            coupon={draft.coupon}
            discount={discount}
            completionStatus={completionPresentation
              ? {
                  label: completionPresentation.summaryStatus,
                  tone: completionState === 'pending' ? 'pending' : 'success',
                }
              : undefined}
            actionLabel={completionState ? undefined : finalActionLabel}
            onAction={completionState ? undefined : usesEmbeddedCardAction
              ? async () => {
                  await prepareCheckoutFeedback();
                  if (!isCardPaymentReady) {
                    showToast('El formulario de pago aún se está preparando.', 'info');
                    return;
                  }
                  setCardSubmitRequest((current) => current + 1);
                }
              : async () => {
                  await prepareCheckoutFeedback();
                  void reserve();
                }}
            actionDisabled={!canContinue || (usesEmbeddedCardAction && !isCardPaymentReady)}
            actionLoading={isSubmitting}
            actionTestId="raffle-checkout-submit"
          />
        </aside>
        </StorefrontCheckoutMotion>
      </div>

      <BottomSheet
        isOpen={showMobileSummary}
        onClose={() => setShowMobileSummary(false)}
        title="Mi selección"
        icon={Ticket}
      >
        <RaffleCheckoutSummarySheet raffle={raffle} draft={draft} total={total} discount={discount} />
      </BottomSheet>

      <StorefrontPurchaseBar
        total={total}
        totalLabel={completionPresentation ? 'Estado' : 'Total'}
        totalValue={completionPresentation?.mobileStatus}
        buttonLabel={completionState
          ? 'Volver a la rifa'
          : checkoutStep === 0
            ? 'Continuar'
            : finalActionLabel}
        buttonIcon={completionState
          ? ArrowLeft
          : checkoutStep === 0
          ? ArrowRight
          : paymentMethod === 'MERCADOPAGO'
            ? CreditCard
            : CheckCircle2}
        onAction={completionState
          ? () => router.push(`/raffles/${raffleId}`)
          : handlePrimaryAction}
        loading={isSubmitting}
        disabled={completionState
          ? false
          : checkoutStep === 0
          ? !participantComplete
          : !canContinue || (usesEmbeddedCardAction && !isCardPaymentReady)}
        entrance="checkout"
        entranceReady={checkoutMotionReady}
      />
    </main>
  );
}

const completionMotionItem = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: toMotionSeconds(STOREFRONT_MOTION_MS.duration.deliberate),
      ease: STOREFRONT_EASING.reveal,
    },
  },
} as const;

function RaffleCheckoutCompletion({
  state,
  customerName,
  ticketCount,
  paymentExpiresAt,
  onBackToRaffle,
  onExploreRaffles,
}: {
  state: Exclude<CompletionState, null>;
  customerName: string;
  ticketCount: number;
  paymentExpiresAt: string | null;
  onBackToRaffle: () => void;
  onExploreRaffles: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const presentation = getRaffleCheckoutCompletionPresentation(state);
  const firstName = customerName.trim().split(/\s+/)[0] || 'Participante';
  const deadline = formatReservationDeadline(paymentExpiresAt);
  const ticketLabel = `${ticketCount} boleto${ticketCount === 1 ? '' : 's'}`;

  const steps = state === 'reserved'
    ? [
        {
          icon: MessageCircle,
          title: 'Revisa tu WhatsApp',
          description: 'Te enviamos las instrucciones y los datos bancarios para completar el pago.',
        },
        {
          icon: Clock3,
          title: 'Confirma dentro del plazo',
          description: deadline
            ? `Realiza tu depósito o transferencia antes de ${deadline}.`
            : 'Realiza tu depósito o transferencia dentro del plazo informado por WhatsApp.',
        },
        {
          icon: ShieldCheck,
          title: 'Envía tu comprobante',
          description: `Conservaremos ${ticketLabel} mientras nuestro equipo valida tu pago.`,
        },
      ]
    : state === 'approved'
      ? [
          {
            icon: ShieldCheck,
            title: 'Pago aprobado',
            description: 'Mercado Pago confirmó la operación correctamente.',
          },
          {
            icon: Ticket,
            title: 'Boletos confirmados',
            description: `${ticketLabel} ya ${ticketCount === 1 ? 'está participando' : 'están participando'} en el sorteo.`,
          },
          {
            icon: MessageCircle,
            title: 'Conserva tu confirmación',
            description: 'Te enviamos por WhatsApp el detalle completo de tu participación.',
          },
        ]
      : [
          {
            icon: Clock3,
            title: 'Validación en proceso',
            description: 'Mercado Pago está revisando la operación. No necesitas intentar pagar nuevamente.',
          },
          {
            icon: ShieldCheck,
            title: 'Selección protegida',
            description: `Conservaremos ${ticketLabel} mientras recibimos la confirmación final.`,
          },
          {
            icon: MessageCircle,
            title: 'Te mantendremos informado',
            description: 'Recibirás por WhatsApp la actualización de tu participación.',
          },
        ];

  return (
    <motion.section
      className="flex min-w-0 flex-col"
      style={{ gap: 'var(--sf-space-xl)' }}
      initial={reduceMotion ? false : 'hidden'}
      animate="visible"
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: reduceMotion ? 0 : toMotionSeconds(STOREFRONT_MOTION_MS.pulse.half),
            staggerChildren: reduceMotion ? 0 : toMotionSeconds(STOREFRONT_MOTION_MS.stagger.standard),
          },
        },
      }}
      transition={{
        duration: toMotionSeconds(
          reduceMotion
            ? STOREFRONT_MOTION_MS.duration.instant
            : STOREFRONT_MOTION_MS.duration.deliberate,
        ),
        ease: STOREFRONT_EASING.reveal,
      }}
      aria-live="polite"
    >
      <motion.div className="flex items-start" style={{ gap: 'var(--sf-space-md)' }} variants={completionMotionItem}>
        <StorefrontIcon
          icon={presentation.icon}
          context="autonomous"
          variant={state === 'pending' ? 'warning' : 'success'}
        />
        <div className="flex min-w-0 flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
          <span className={`sf-text-label font-black uppercase tracking-[0.2em] ${
            state === 'pending' ? 'text-amber-600' : 'text-emerald-600'
          }`}>
            {presentation.title}
          </span>
          <h1 className="sf-text-display text-stone-950">{presentation.greeting(firstName)}</h1>
          <p className="sf-text-body max-w-2xl text-stone-500">{presentation.description}</p>
        </div>
      </motion.div>

      <motion.div className="flex flex-col border-y border-stone-200 py-[var(--sf-space-lg)]" style={{ gap: 'var(--sf-space-lg)' }} variants={completionMotionItem}>
        <h2 className="sf-text-h2 text-stone-950">Qué sigue</h2>
        <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
          {steps.map((step) => (
            <div key={step.title} className="flex items-center" style={{ gap: 'var(--sf-space-md)' }}>
              <StorefrontIcon icon={step.icon} context="card" variant={state === 'pending' ? 'warning' : 'muted'} />
              <div className="flex min-w-0 flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
                <h3 className="sf-text-secondary font-bold text-stone-950">{step.title}</h3>
                <p className="sf-text-secondary text-stone-500">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div className="hidden grid-cols-1 sm:grid-cols-2 md:grid" style={{ gap: 'var(--sf-space-md)' }} variants={completionMotionItem}>
        <Button type="button" context="section" onClick={onBackToRaffle} icon={ArrowLeft}>
          Volver a la rifa
        </Button>
        <Button type="button" context="section" variant="outline" onClick={onExploreRaffles}>
          Explorar rifas
        </Button>
      </motion.div>
    </motion.section>
  );
}

function getRaffleCheckoutCompletionPresentation(state: Exclude<CompletionState, null>) {
  if (state === 'approved') {
    return {
      icon: CheckCircle2,
      title: 'Pago confirmado',
      greeting: (firstName: string) => `Tu participación está lista, ${firstName}`,
      description: 'El pago fue aprobado y tus boletos quedaron confirmados para el sorteo.',
      summaryStatus: 'Pago confirmado',
      mobileStatus: 'Pagado',
    };
  }

  if (state === 'pending') {
    return {
      icon: Clock3,
      title: 'Pago en revisión',
      greeting: (firstName: string) => `Estamos validando tu pago, ${firstName}`,
      description: 'La operación todavía está siendo procesada. Tu selección permanecerá protegida mientras recibimos la respuesta final.',
      summaryStatus: 'Pago en revisión',
      mobileStatus: 'En revisión',
    };
  }

  return {
    icon: CheckCircle2,
    title: 'Apartado confirmado',
    greeting: (firstName: string) => `Gracias, ${firstName}`,
    description: 'Tu selección quedó apartada correctamente. Completa el pago dentro del plazo para confirmar tu participación.',
    summaryStatus: 'Apartado confirmado',
    mobileStatus: 'Confirmado',
  };
}

function formatReservationDeadline(value: string | null) {
  if (!value) return null;
  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return null;

  const formatted = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(deadline);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function RaffleCheckoutSummarySheet({
  raffle,
  draft,
  total,
  discount,
}: {
  raffle: Raffle;
  draft: RaffleCheckoutDraft;
  total: number;
  discount: number;
}) {
  return (
    <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
      <p className="sf-text-secondary text-stone-500">
        {draft.tickets.length} boleto{draft.tickets.length === 1 ? '' : 's'} seleccionado{draft.tickets.length === 1 ? '' : 's'}.
      </p>
      <RaffleTicketSelectionExplorer
        selectedTickets={draft.tickets}
        ticketOpportunities={raffle.extraOpportunities ?? []}
        variant="sheet"
      />
      <div className="flex flex-col border-t border-stone-100 pt-[var(--sf-space-lg)]" style={{ gap: 'var(--sf-space-md)' }}>
        {draft.coupon && (
          <div className="flex items-center justify-between sf-text-secondary text-stone-500" style={{ gap: 'var(--sf-space-md)' }}>
            <span className="truncate">Cupón {draft.coupon.code}</span>
            <span className="shrink-0 text-emerald-600">-${formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between" style={{ gap: 'var(--sf-space-md)' }}>
          <span className="sf-text-label text-stone-400">Total</span>
          <strong className="sf-text-display text-brand-500">${formatPrice(total)}</strong>
        </div>
      </div>
    </div>
  );
}
