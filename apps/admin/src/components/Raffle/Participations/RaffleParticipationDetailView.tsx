import React, { useEffect, useState } from "react";
import { AlertTriangle, Calendar, Clock, CreditCard, Edit2, Hash, MapPin, MessageCircle, Phone, RotateCcw, Save, Sparkles, Ticket, UserRound, Waypoints } from "lucide-react";
import { apiRaffleParticipations } from "../../../api";
import { MEXICO_STATES } from "../../../constants";
import { RaffleParticipation, RaffleParticipationTicket } from "../../../types";
import { NexusAutonomousBadge, NexusBadge, NexusCardBadge } from "../../ui/NexusBadge";
import { NexusSectionCard } from "../../ui/NexusCard";
import { NexusAutonomousIcon, NexusCardIcon } from "../../ui/NexusIcon";
import { NexusSection } from "../../ui/NexusSection";
import { NexusSpinner } from "../../ui/NexusSpinner";
import { NexusAutonomousButton, NexusSectionButton } from "../../ui/NexusButton";
import { NexusConfirmModal } from "../../ui/NexusConfirmModal";
import { NexusInput, NexusSelect } from "../../ui/NexusInputs";
import { NexusModal, NexusModalActions } from "../../ui/NexusModal";
import { NexusPhoneField } from "../../ui/NexusPhoneField";
import { isCustomerPhoneComplete } from "../../../utils/customer-phone";
import { getWhatsappDeliveryRouteLabel } from "../../../utils/whatsapp-routing";

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

const getWhatsappLogBadge = (status: string) => {
  if (status === "failed") return { label: "Fallida", variant: "danger" as const };
  if (status === "pending") return { label: "Pendiente", variant: "warning" as const };
  if (status === "server_ack") return { label: "Aceptada", variant: "info" as const };
  if (status === "delivered") return { label: "Entregada", variant: "success" as const };
  if (status === "read") return { label: "Leída", variant: "success" as const };
  return { label: "Enviada", variant: "success" as const };
};

export const RaffleParticipationDetailView: React.FC<RaffleParticipationDetailViewProps> = ({ participation, onLoaded, showToast }) => {
  const [detail, setDetail] = useState<RaffleParticipation>(participation);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const [isSavingParticipant, setIsSavingParticipant] = useState(false);
  const [isResendingWhatsApp, setIsResendingWhatsApp] = useState(false);
  const [participantForm, setParticipantForm] = useState({
    customerName: participation.customerName || "",
    customerPhone: participation.customerPhone || "",
    customerState: participation.customerState || "",
  });
  const [selectedTicket, setSelectedTicket] = useState<RaffleParticipationTicket | null>(null);

  useEffect(() => {
    setDetail(participation);
  }, [participation]);

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

  const handleOpenParticipantModal = () => {
    setParticipantForm({
      customerName: detail.customerName || "",
      customerPhone: detail.customerPhone || "",
      customerState: detail.customerState || "",
    });
    setIsParticipantModalOpen(true);
  };

  const handleSaveParticipant = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingParticipant(true);
    try {
      const updated = await apiRaffleParticipations.updateParticipant(detail.id, {
        customerName: participantForm.customerName,
        customerPhone: participantForm.customerPhone,
        customerState: participantForm.customerState || null,
      });
      setDetail(updated);
      onLoaded(updated);
      setIsParticipantModalOpen(false);
      showToast("Información del participante actualizada", "success");
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "No se pudo actualizar el participante",
        "error",
      );
    } finally {
      setIsSavingParticipant(false);
    }
  };

  const handleResendWhatsApp = async () => {
    if (isResendingWhatsApp || isPaymentHold) return;
    setIsResendingWhatsApp(true);
    try {
      await apiRaffleParticipations.resendWhatsApp(detail.id);
      showToast("Notificación enviada a la cola", "success");
      window.setTimeout(() => {
        void apiRaffleParticipations.getById(detail.id).then((updated) => {
          setDetail(updated);
          onLoaded(updated);
        });
      }, 1500);
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "No se pudo reenviar la notificación",
        "error",
      );
    } finally {
      setIsResendingWhatsApp(false);
    }
  };

  return (
    <div className="grid grid-cols-1 items-start lg:grid-cols-3" style={{ gap: "var(--space-lg)", paddingBottom: "var(--space-3xl)" }}>
      <div className="flex flex-col lg:col-span-2" style={{ gap: "var(--space-lg)" }}>
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
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "var(--space-md)" }}>
            {!(detail.tickets || []).length && (
              <p className="text-secondary text-text-muted sm:col-span-2">
                Este intento se registró antes de que Nexus conservara una copia histórica de los boletos liberados.
              </p>
            )}
            {(detail.tickets || []).map((ticket) => (
              <NexusSectionCard
                key={ticket.id}
                icon={Ticket}
                iconVariant="solid-brand"
                layout="horizontal"
                onClick={() => setSelectedTicket(ticket)}
                title={(
                  <div className="flex min-w-0 flex-col" style={{ gap: "var(--space-xs)" }}>
                    <span className="text-label uppercase tracking-[0.15em] text-text-muted">
                      Núm. princ.
                    </span>
                    <span className="text-h1 font-black leading-none text-text-main">
                      {ticket.number}
                    </span>
                  </div>
                )}
                rightContent={ticket.opportunities.length > 0 ? (
                  <NexusCardBadge variant="brand">
                    {ticket.opportunities.length + 1} núms.
                  </NexusCardBadge>
                ) : undefined}
              />
            ))}
          </div>
        </NexusSection>

        <NexusModal
          isOpen={Boolean(selectedTicket)}
          onClose={() => setSelectedTicket(null)}
          title="Oportunidades del boleto"
          eyebrow={selectedTicket ? `Boleto ${selectedTicket.number}` : undefined}
          icon={Waypoints}
          iconTone="brand"
          size="standard"
          zIndex={260}
        >
          {selectedTicket && (
            <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
              <div className="flex items-center justify-between" style={{ gap: "var(--space-md)" }}>
                <div className="flex min-w-0 items-center" style={{ gap: "var(--space-md)" }}>
                  <NexusAutonomousIcon icon={Ticket} variant="solid-brand" />
                  <div className="flex min-w-0 flex-col" style={{ gap: "var(--space-xs)" }}>
                    <span className="text-label uppercase tracking-[0.15em] text-text-muted">
                      Núm. princ.
                    </span>
                    <span className="text-display font-black leading-none text-text-main">
                      {selectedTicket.number}
                    </span>
                  </div>
                </div>
                <NexusAutonomousBadge variant="brand">
                  {selectedTicket.opportunities.length + 1}{" "}
                  {selectedTicket.opportunities.length === 0 ? "núm." : "núms."}
                </NexusAutonomousBadge>
              </div>

              <div
                className="flex flex-col border-t border-border-main pt-[var(--space-lg)]"
                style={{ gap: "var(--space-md)" }}
              >
                <div className="flex items-start" style={{ gap: "var(--space-sm)" }}>
                  <Sparkles className="mt-0.5 shrink-0 text-brand-500" size={18} strokeWidth={2.25} />
                  <div className="flex min-w-0 flex-col" style={{ gap: "var(--space-xs)" }}>
                    <h4 className="text-h2 font-bold text-text-main">
                      Oportunidades adicionales
                    </h4>
                    <p className="text-secondary text-text-muted">
                      {selectedTicket.opportunities.length > 0
                        ? "Este boleto también participa con estos números."
                        : "Este boleto participa únicamente con su número principal."}
                    </p>
                  </div>
                </div>

                {selectedTicket.opportunities.length > 0 && (
                  <div className="grid grid-cols-4" style={{ gap: "var(--space-sm)" }}>
                    {selectedTicket.opportunities.map((number) => (
                      <span
                        key={number}
                        className="flex min-w-0 items-center justify-center border border-border-main bg-bg-muted text-secondary font-bold text-text-main"
                        style={{
                          minHeight: "var(--h-button-card)",
                          borderRadius: "var(--radius-inner-visual)",
                          paddingInline: "var(--space-sm)",
                        }}
                      >
                        {number}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </NexusModal>
      </div>

      <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
        <NexusSection
          title="Participante"
          subtitle="Datos de contacto"
          icon={UserRound}
          iconVariant="emerald"
          actionPlacement="below"
          action={
            !isPaymentHold ? (
              <NexusSectionButton onClick={handleOpenParticipantModal} icon={Edit2}>
                Editar Participante
              </NexusSectionButton>
            ) : undefined
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "var(--space-lg)" }}>
            <Field label="Nombre completo" value={detail.customerName} />
            <Field label="WhatsApp" value={<span className="flex items-center" style={{ gap: "var(--space-xs)" }}><Phone size={14} />{detail.customerPhone}</span>} />
            <Field label="Estado" value={<span className="flex items-center" style={{ gap: "var(--space-xs)" }}><MapPin size={14} />{detail.customerState || "Sin especificar"}</span>} />
          </div>
        </NexusSection>

        <NexusModal
          isOpen={isParticipantModalOpen}
          onClose={() => setIsParticipantModalOpen(false)}
          title={detail.customerName || "Participante"}
          eyebrow="Editar Participante"
          icon={UserRound}
          iconTone="brand"
          size="standard"
          zIndex={260}
        >
          <form onSubmit={handleSaveParticipant} className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
            <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
              <NexusInput
                label="Nombre completo *"
                value={participantForm.customerName}
                onChange={(event) => setParticipantForm({ ...participantForm, customerName: event.target.value })}
                placeholder="Nombre del participante"
                icon={UserRound}
                required
              />
              <NexusPhoneField
                id="raffle-participant-phone"
                label="Teléfono / WhatsApp"
                required
                value={participantForm.customerPhone}
                onChange={(customerPhone) => setParticipantForm({ ...participantForm, customerPhone })}
              />
              <NexusSelect
                label="Estado"
                value={participantForm.customerState}
                onChange={(event) => setParticipantForm({ ...participantForm, customerState: event.target.value })}
                icon={MapPin}
              >
                <option value="">Sin estado</option>
                {MEXICO_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </NexusSelect>
            </div>

            <NexusModalActions>
              <NexusAutonomousButton
                type="button"
                variant="secondary"
                onClick={() => setIsParticipantModalOpen(false)}
                className="flex-1"
              >
                Cancelar
              </NexusAutonomousButton>
              <NexusAutonomousButton
                type="submit"
                variant="brand"
                icon={Save}
                isLoading={isSavingParticipant}
                disabled={!participantForm.customerName.trim() || !isCustomerPhoneComplete(participantForm.customerPhone)}
                className="flex-[2]"
              >
                Guardar Cambios
              </NexusAutonomousButton>
            </NexusModalActions>
          </form>
        </NexusModal>

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

        {!isPaymentHold && <NexusSection
          title="WhatsApp"
          subtitle="Historial de notificaciones"
          icon={MessageCircle}
          iconVariant="emerald"
          actionPlacement="below"
          action={
            <NexusSectionButton
              onClick={handleResendWhatsApp}
              isLoading={isResendingWhatsApp}
              icon={MessageCircle}
            >
              Reenviar WhatsApp
            </NexusSectionButton>
          }
        >
          {detail.whatsappLogs?.length ? (
            <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
              {detail.whatsappLogs.map((log) => {
                const badge = getWhatsappLogBadge(log.status);
                return (
                <div key={log.id} className="flex items-center justify-between border-b border-border-main pb-[var(--space-md)] last:border-0 last:pb-0" style={{ gap: "var(--space-md)" }}>
                  <div className="min-w-0">
                    <p className="text-secondary font-bold text-text-main">{log.templateUsed}</p>
                    <p className="truncate text-secondary text-text-muted">
                      {log.errorMessage || getWhatsappDeliveryRouteLabel(log.responsePayload) || log.providerStatus || "Notificación procesada"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <NexusBadge variant={badge.variant}>{badge.label}</NexusBadge>
                    <p className="text-label text-text-muted" style={{ marginTop: "var(--space-xs)" }}><Clock size={11} className="inline" /> {formatDateTime(log.sentAt)}</p>
                  </div>
                </div>
              );})}
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
