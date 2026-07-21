import React, { useEffect, useState } from "react";
import { AlertTriangle, Calendar, Clock, CreditCard, Hash, MapPin, MessageCircle, Phone, RotateCcw, Ticket, UserRound } from "lucide-react";
import { apiRaffleParticipations } from "../../../api";
import { RaffleParticipation } from "../../../types";
import { NexusBadge } from "../../ui/NexusBadge";
import { NexusSection } from "../../ui/NexusSection";
import { NexusSpinner } from "../../ui/NexusSpinner";
import { NexusSectionButton } from "../../ui/NexusButton";
import { NexusConfirmModal } from "../../ui/NexusConfirmModal";

interface RaffleParticipationDetailViewProps {
  participation: RaffleParticipation;
  onLoaded: (participation: RaffleParticipation) => void;
  showToast: (message: string, type?: "success" | "error") => void;
}

const formatCurrency = (value: number) =>
  value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const Field = ({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) => (
  <div className={wide ? "sm:col-span-2" : ""}>
    <p className="text-label uppercase tracking-[0.15em] text-text-muted">{label}</p>
    <div className="text-secondary font-bold text-text-main" style={{ marginTop: "var(--space-xs)" }}>{value}</div>
  </div>
);

const getMercadoPagoStatusLabel = (
  status?: string | null,
  participationStatus?: RaffleParticipation["status"],
) => {
  const normalized = status?.toLowerCase();
  if (normalized === "approved") return "Pagado";
  if (normalized === "refunded") return "Devuelto";
  if (normalized === "rejected" || normalized === "failed") return "Fallido";
  if (normalized === "cancelled") return "Cancelado";
  if (normalized === "in_process" || normalized === "pending") return "Pendiente";
  if (participationStatus === "PAID") return "Pagado";
  if (participationStatus === "CANCELLED") return "Cancelado";
  return "Pendiente";
};

export const RaffleParticipationDetailView: React.FC<RaffleParticipationDetailViewProps> = ({ participation, onLoaded, showToast }) => {
  const [detail, setDetail] = useState<RaffleParticipation>(participation);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    void apiRaffleParticipations.getById(participation.id)
      .then((data) => {
        setDetail(data);
        onLoaded(data);
      })
      .catch(() => showToast("No se pudo cargar el detalle de la participación", "error"))
      .finally(() => setIsLoading(false));
  }, [onLoaded, participation.id, showToast]);

  if (isLoading) return <NexusSpinner label="Cargando participación..." />;

  const isPaymentHold = detail.recordType === "PAYMENT_HOLD";
  const statusLabel = detail.status === "PAID"
    ? "Pagada"
    : detail.status === "CANCELLED"
      ? "Cancelada"
      : detail.status === "MIXED"
        ? "Mixta"
        : detail.status === "PAYMENT_REVIEW"
          ? "En revisión"
          : detail.status === "NOT_COMPLETED"
            ? "No concretada"
            : "Apartada";
  const statusVariant = detail.status === "PAID"
    ? "success"
    : ["CANCELLED", "NOT_COMPLETED"].includes(detail.status)
      ? "danger"
      : detail.status === "MIXED"
        ? "muted"
        : "warning";
  const canRefundMercadoPago =
    detail.paymentMethod === "MERCADOPAGO" &&
    detail.status === "PAID" &&
    Boolean(detail.mpPaymentId) &&
    !detail.mpRefundedAt;

  const handleRefundMercadoPago = async () => {
    if (isRefunding) return;
    setIsRefunding(true);
    try {
      const updated = await apiRaffleParticipations.refundMercadoPago(detail.id);
      setDetail(updated);
      onLoaded(updated);
      setIsRefundModalOpen(false);
      showToast("Pago devuelto correctamente", "success");
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "No se pudo devolver el pago",
        "error",
      );
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="grid grid-cols-1 items-start lg:grid-cols-2" style={{ gap: "var(--space-lg)", paddingBottom: "var(--space-3xl)" }}>
      <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
        <NexusSection
          title={isPaymentHold ? "Intento de participación" : "Participación"}
          subtitle={isPaymentHold ? "Trazabilidad del pago con tarjeta" : "Resumen del apartado"}
          icon={isPaymentHold ? AlertTriangle : Ticket}
          iconVariant={detail.status === "PAYMENT_REVIEW" ? "orange" : "brand"}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "var(--space-lg)" }}>
            <Field label="Estado" value={<NexusBadge variant={statusVariant}>{statusLabel}</NexusBadge>} />
            <Field label="Método de pago" value={detail.paymentMethod === "MERCADOPAGO" ? "Tarjeta de crédito o débito" : "Depósito / Transferencia"} />
            <Field label="Rifa" value={detail.raffleTitle} />
            <Field label="Fecha" value={<span className="flex items-center" style={{ gap: "var(--space-xs)" }}><Calendar size={14} />{formatDateTime(detail.createdAt)}</span>} />
            {isPaymentHold && detail.expiresAt && <Field label="Retención hasta" value={formatDateTime(detail.expiresAt)} />}
            <Field label="Subtotal" value={formatCurrency(detail.subtotal)} />
            <Field label="Descuento" value={formatCurrency(detail.discountTotal)} />
            <Field label="Total" value={<span className="text-h1 font-black">{detail.ticketCount > 0 ? formatCurrency(detail.total) : "No disponible"}</span>} />
            {detail.couponCode && <Field label="Cupón" value={detail.couponCode} />}
          </div>
        </NexusSection>

        <NexusSection
          title="Boletos"
          subtitle={detail.ticketCount > 0 ? `${detail.ticketCount} seleccionados` : "Selección histórica no disponible"}
          icon={Hash}
          iconVariant="blue"
        >
          <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
            {!(detail.tickets || []).length && (
              <p className="text-secondary text-text-muted">
                Este intento se registró antes de que Nexus conservara una copia histórica de los boletos liberados.
              </p>
            )}
            {(detail.tickets || []).map((ticket) => (
              <div key={ticket.id} className="border border-border-main bg-bg-muted/50 p-[var(--padding-card-nested)]" style={{ borderRadius: "var(--radius-card-nested)" }}>
                <div className="flex items-center justify-between" style={{ gap: "var(--space-md)" }}>
                  <div>
                    <p className="text-label uppercase tracking-[0.15em] text-text-muted">Boleto</p>
                    <p className="text-h2 font-black text-text-main" style={{ marginTop: "var(--space-xs)" }}>{ticket.number}</p>
                  </div>
                  {ticket.opportunities.length > 0 && (
                    <NexusBadge variant="brand">{ticket.opportunities.length + 1} oportunidades</NexusBadge>
                  )}
                </div>
                {ticket.opportunities.length > 0 && (
                  <p className="text-secondary text-text-muted" style={{ marginTop: "var(--space-md)" }}>
                    Adicionales: {ticket.opportunities.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </NexusSection>
      </div>

      <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
        <NexusSection title="Participante" subtitle="Datos de contacto" icon={UserRound} iconVariant="emerald">
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "var(--space-lg)" }}>
            <Field label="Nombre completo" value={detail.customerName} />
            <Field label="WhatsApp" value={<span className="flex items-center" style={{ gap: "var(--space-xs)" }}><Phone size={14} />{detail.customerPhone}</span>} />
            <Field label="Estado" value={<span className="flex items-center" style={{ gap: "var(--space-xs)" }}><MapPin size={14} />{detail.customerState || "Sin especificar"}</span>} />
          </div>
        </NexusSection>

        {detail.paymentMethod === "MERCADOPAGO" && (
          <NexusSection
            title="Mercado Pago"
            subtitle="Pago con tarjeta"
            icon={CreditCard}
            iconVariant={detail.status === "PAID" ? "emerald" : "brand"}
            actionPlacement="below"
            action={
              canRefundMercadoPago ? (
                <NexusSectionButton
                  onClick={() => setIsRefundModalOpen(true)}
                  icon={RotateCcw}
                  variant="secondary"
                >
                  Devolver Pago
                </NexusSectionButton>
              ) : undefined
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "var(--space-md)" }}>
              <Field
                label="Estado"
                value={getMercadoPagoStatusLabel(detail.mpPaymentStatus, detail.status)}
              />
              <Field
                label="Monto pagado"
                value={detail.status === "PAID"
                  ? formatCurrency(detail.mpPaidAmount ?? detail.total)
                  : "Sin cobro confirmado"}
              />
              <Field
                label="ID de pago"
                value={detail.mpPaymentId || "No disponible"}
                wide
              />
              <Field
                label="Método"
                value={
                  [detail.mpPaymentMethodId, detail.mpPaymentTypeId]
                    .filter(Boolean)
                    .join(" / ") || "Mercado Pago"
                }
                wide
              />
              {detail.mpPaymentStatusDetail && (
                <Field label="Detalle del estado" value={detail.mpPaymentStatusDetail} wide />
              )}
              {detail.mpRefundedAt && (
                <>
                  <Field
                    label="Monto devuelto"
                    value={formatCurrency(detail.mpRefundedAmount ?? detail.total)}
                  />
                  <Field
                    label="Fecha de devolución"
                    value={formatDateTime(detail.mpRefundedAt)}
                  />
                  <Field
                    label="ID de devolución"
                    value={detail.mpRefundId || "No disponible"}
                    wide
                  />
                </>
              )}
            </div>

            {isPaymentHold && detail.paymentAttempts?.length ? (
              <div className="flex flex-col border-t border-border-main pt-[var(--space-lg)]" style={{ gap: "var(--space-md)", marginTop: "var(--space-lg)" }}>
                <div>
                  <h3 className="text-h2 font-bold text-text-main">Historial de intentos</h3>
                  <p className="text-secondary text-text-muted" style={{ marginTop: "var(--space-xs)" }}>
                    Cada envío de tarjeta se registra por separado para conservar la trazabilidad.
                  </p>
                </div>
                {detail.paymentAttempts.map((attempt, index) => {
                  const attemptStatus = attempt.status.toUpperCase();
                  const attemptVariant = attemptStatus === "APPROVED"
                    ? "success"
                    : ["PROCESSING", "UNKNOWN"].includes(attemptStatus)
                      ? "warning"
                      : "danger";
                  const attemptLabel = attemptStatus === "APPROVED"
                    ? "Aprobado"
                    : attemptStatus === "PROCESSING"
                      ? "En revisión"
                      : attemptStatus === "UNKNOWN"
                        ? "Por conciliar"
                        : "Rechazado";

                  return (
                    <div
                      key={attempt.id}
                      className="border border-border-main bg-bg-muted/50 p-[var(--padding-card-nested)]"
                      style={{ borderRadius: "var(--radius-card-nested)" }}
                    >
                      <div className="flex flex-wrap items-center justify-between" style={{ gap: "var(--space-sm)" }}>
                        <div className="flex items-center" style={{ gap: "var(--space-sm)" }}>
                          <span className="text-label uppercase tracking-[0.15em] text-text-muted">Intento {detail.paymentAttempts!.length - index}</span>
                          <NexusBadge variant={attemptVariant}>{attemptLabel}</NexusBadge>
                        </div>
                        <span className="text-label text-text-muted">{formatDateTime(attempt.createdAt)}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "var(--space-md)", marginTop: "var(--space-md)" }}>
                        <Field label="Mensaje" value={attempt.customerMessage || "Sin mensaje"} wide />
                        <Field label="Detalle" value={attempt.statusDetail || "No disponible"} />
                        <Field label="ID de pago" value={attempt.mpPaymentId || "No disponible"} />
                        <Field label="Reintento" value={attempt.retryable ? "Permitido" : "No disponible"} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </NexusSection>
        )}

        {!isPaymentHold && <NexusSection title="WhatsApp" subtitle="Historial de notificaciones" icon={MessageCircle} iconVariant="emerald">
          {detail.whatsappLogs?.length ? (
            <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
              {detail.whatsappLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between border-b border-border-main pb-[var(--space-md)] last:border-0 last:pb-0" style={{ gap: "var(--space-md)" }}>
                  <div className="min-w-0">
                    <p className="text-secondary font-bold text-text-main">{log.templateUsed}</p>
                    <p className="truncate text-secondary text-text-muted">{log.errorMessage || log.providerStatus || "Notificación procesada"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <NexusBadge variant={log.status === "failed" ? "danger" : "success"}>{log.status === "failed" ? "Fallida" : "Enviada"}</NexusBadge>
                    <p className="text-label text-text-muted" style={{ marginTop: "var(--space-xs)" }}><Clock size={11} className="inline" /> {formatDateTime(log.sentAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-secondary text-text-muted">Aún no hay notificaciones registradas para esta participación.</p>
          )}
        </NexusSection>}

        <NexusConfirmModal
          isOpen={isRefundModalOpen}
          onCancel={() => setIsRefundModalOpen(false)}
          onConfirm={handleRefundMercadoPago}
          title="¿Devolver pago?"
          message="Se realizará la devolución total en Mercado Pago, se cancelará la participación y se liberarán los boletos."
          confirmLabel={isRefunding ? "Devolviendo..." : "Devolver pago"}
          tone="danger"
          icon={RotateCcw}
          zIndex={270}
        />
      </div>
    </div>
  );
};
