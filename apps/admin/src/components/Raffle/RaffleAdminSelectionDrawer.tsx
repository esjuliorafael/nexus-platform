import React from "react";
import { Check, Sparkles, Tag, Ticket, Trash2 } from "lucide-react";
import {
  apiRaffleCoupons,
  type RaffleCouponValidationResponse,
  type RaffleTicketAssignment,
} from "../../api";
import { Raffle } from "../../types";
import { NexusAutonomousBadge } from "../ui/NexusBadge";
import { NexusAutonomousButton, NexusButton } from "../ui/NexusButton";
import { NexusDrawer } from "../ui/NexusDrawer";
import { NexusAutonomousIcon } from "../ui/NexusIcon";
import { NexusInput } from "../ui/NexusInputs";

interface RaffleAdminSelectionDrawerProps {
  isOpen: boolean;
  raffle: Raffle;
  selectedTickets: string[];
  assignments: RaffleTicketAssignment[];
  coupon: RaffleCouponValidationResponse | null;
  onCouponChange: (coupon: RaffleCouponValidationResponse | null) => void;
  onRemoveTicket: (ticket: string) => void;
  onClose: () => void;
  onContinue: () => void;
  showToast: (message: string, type?: "success" | "error") => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);

export const RaffleAdminSelectionDrawer: React.FC<
  RaffleAdminSelectionDrawerProps
> = ({
  isOpen,
  raffle,
  selectedTickets,
  assignments,
  coupon,
  onCouponChange,
  onRemoveTicket,
  onClose,
  onContinue,
  showToast,
}) => {
  const sortedTickets = React.useMemo(
    () =>
      [...selectedTickets].sort((left, right) =>
        left.localeCompare(right, "es-MX", { numeric: true }),
      ),
    [selectedTickets],
  );
  const opportunitiesByTicket = React.useMemo(
    () =>
      new Map(
        assignments.map((assignment) => [
          assignment.mainTicketNumber,
          assignment.extraOpportunities,
        ]),
      ),
    [assignments],
  );
  const [activeTicket, setActiveTicket] = React.useState<string | null>(null);
  const [couponCode, setCouponCode] = React.useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setActiveTicket((current) =>
      current && sortedTickets.includes(current)
        ? current
        : (sortedTickets.at(-1) ?? null),
    );
    setCouponCode(coupon?.code || "");
  }, [coupon?.code, isOpen, sortedTickets]);

  const additionalNumbers = activeTicket
    ? opportunitiesByTicket.get(activeTicket) || []
    : [];
  const subtotal = sortedTickets.length * raffle.ticketPrice;
  const discount = coupon?.discountTotal || 0;
  const total = Math.max(0, subtotal - discount);

  const applyCoupon = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!couponCode.trim()) {
      showToast("Escribe un cupón para aplicarlo.", "error");
      return;
    }

    setIsApplyingCoupon(true);
    try {
      const result = await apiRaffleCoupons.validate(
        couponCode,
        raffle.id,
        sortedTickets,
      );
      onCouponChange(result);
      setCouponCode(result.code);
      showToast("Cupón aplicado.", "success");
    } catch (error: any) {
      onCouponChange(null);
      showToast(
        error?.response?.data?.message || "No se pudo validar el cupón.",
        "error",
      );
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    onCouponChange(null);
    setCouponCode("");
  };

  return (
    <NexusDrawer
      isOpen={isOpen}
      title="Mi Selección"
      eyebrow={`${sortedTickets.length} ${sortedTickets.length === 1 ? "boleto" : "boletos"}`}
      icon={Ticket}
      onClose={onClose}
      mobileFullscreen
      footer={
        <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
          {coupon ? (
            <div
              className="flex items-center justify-between border border-border-main bg-bg-muted"
              style={{
                gap: "var(--space-md)",
                padding: "var(--space-base)",
                borderRadius: "var(--radius-card-inner)",
              }}
            >
              <div
                className="flex min-w-0 items-center"
                style={{ gap: "var(--space-sm)" }}
              >
                <Tag className="shrink-0 text-brand-600" size={18} />
                <div className="min-w-0">
                  <p className="text-label text-text-muted">Cupón Aplicado</p>
                  <p className="truncate text-secondary font-bold text-text-main">
                    {coupon.code} · -{formatCurrency(discount)}
                  </p>
                </div>
              </div>
              <NexusAutonomousButton
                type="button"
                variant="secondary"
                density="compact"
                isIconOnly
                icon={Trash2}
                aria-label="Quitar cupón"
                onClick={removeCoupon}
              />
            </div>
          ) : (
            <form
              className="grid grid-cols-[minmax(0,1fr)_auto] items-end"
              style={{ gap: "var(--space-sm)" }}
              onSubmit={applyCoupon}
            >
              <NexusInput
                label="Cupón"
                icon={Tag}
                value={couponCode}
                onChange={(event) =>
                  setCouponCode(event.target.value.toUpperCase())
                }
                placeholder="Código"
                autoComplete="off"
              />
              <NexusAutonomousButton
                type="submit"
                variant="secondary"
                icon={Check}
                isLoading={isApplyingCoupon}
              >
                Aplicar
              </NexusAutonomousButton>
            </form>
          )}

          {coupon && (
            <div className="flex items-center justify-between text-secondary text-text-muted">
              <span>Descuento</span>
              <span className="tabular-nums">-{formatCurrency(discount)}</span>
            </div>
          )}
          <div
            className="flex items-center justify-between"
            style={{ gap: "var(--space-md)" }}
          >
            <span className="text-label uppercase text-text-muted">Total</span>
            <strong className="text-h1 tabular-nums text-brand-600">
              {formatCurrency(total)}
            </strong>
          </div>
          <NexusAutonomousButton
            type="button"
            variant="brand"
            icon={Ticket}
            disabled={sortedTickets.length === 0}
            onClick={onContinue}
            className="w-full"
          >
            Finalizar Apartado
          </NexusAutonomousButton>
        </div>
      }
    >
      {activeTicket ? (
        <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
          <div className="flex flex-col" style={{ gap: "var(--space-sm)" }}>
            <h4 className="text-secondary font-bold text-text-main">
              Boletos Seleccionados
            </h4>
            <div className="no-scrollbar -mx-[var(--padding-inner)] overflow-x-auto px-[var(--padding-inner)]">
              <div
                className="flex w-max items-center"
                style={{ gap: "var(--space-sm)" }}
              >
                {sortedTickets.map((ticketNumber) => (
                  <NexusButton
                    key={ticketNumber}
                    type="button"
                    context="card"
                    variant={
                      ticketNumber === activeTicket ? "brand" : "secondary"
                    }
                    aria-pressed={ticketNumber === activeTicket}
                    onClick={() => setActiveTicket(ticketNumber)}
                  >
                    {ticketNumber}
                  </NexusButton>
                ))}
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-between"
            style={{ gap: "var(--space-md)" }}
          >
            <div
              className="flex min-w-0 items-center"
              style={{ gap: "var(--space-md)" }}
            >
              <NexusAutonomousIcon icon={Ticket} variant="brand" />
              <div className="min-w-0">
                <p className="text-label text-text-muted">Núm. Principal</p>
                <p className="text-display leading-none text-text-main">
                  {activeTicket}
                </p>
              </div>
            </div>
            <div
              className="flex shrink-0 items-center"
              style={{ gap: "var(--space-sm)" }}
            >
              <NexusAutonomousBadge variant="brand">
                {additionalNumbers.length + 1} núms.
              </NexusAutonomousBadge>
              <NexusAutonomousButton
                type="button"
                variant="ghost"
                density="compact"
                isIconOnly
                icon={Trash2}
                aria-label={`Quitar boleto ${activeTicket}`}
                onClick={() => onRemoveTicket(activeTicket)}
              />
            </div>
          </div>

          {additionalNumbers.length > 0 && (
            <div
              className="flex flex-col border-t border-border-main pt-[var(--space-lg)]"
              style={{ gap: "var(--space-md)" }}
            >
              <div
                className="flex items-start"
                style={{ gap: "var(--space-sm)" }}
              >
                <Sparkles
                  className="mt-0.5 shrink-0 text-brand-600"
                  size={18}
                />
                <div
                  className="flex flex-col"
                  style={{ gap: "var(--space-xs)" }}
                >
                  <h4 className="text-secondary font-bold text-text-main">
                    Oportunidades Adicionales
                  </h4>
                  <p className="text-secondary text-text-muted">
                    Este boleto también participa con estos números.
                  </p>
                </div>
              </div>
              <div
                className="grid grid-cols-4"
                style={{ gap: "var(--space-sm)" }}
              >
                {additionalNumbers.map((number) => (
                  <span
                    key={number}
                    className="flex items-center justify-center border border-border-main bg-bg-muted text-secondary font-bold text-text-main"
                    style={{
                      minHeight: "var(--size-button-card)",
                      borderRadius: "var(--radius-card-inner)",
                    }}
                  >
                    {number}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-secondary text-text-muted">
          Selecciona boletos disponibles para revisar el apartado.
        </p>
      )}
    </NexusDrawer>
  );
};
