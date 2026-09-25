import React, { useEffect, useState } from "react";
import { AlertTriangle, Calendar, CheckCircle2, CircleX, Clock, CreditCard, Edit2, Hash, History, MapPin, MessageCircle, Phone, RotateCcw, Save, ShieldCheck, Sparkles, Ticket, UserRound, UsersRound, Waypoints } from "lucide-react";
import { apiRaffleParticipations } from "../../../api";
import { MEXICO_STATES } from "../../../constants";
import { RaffleFinancialReason, RaffleParticipation, RaffleParticipationTicket, WhatsAppMessageLog } from "../../../types";
import { NexusAutonomousBadge, NexusBadge, NexusCardBadge } from "../../ui/NexusBadge";
import { NexusSectionCard } from "../../ui/NexusCard";
import { NexusAutonomousIcon, NexusCardIcon } from "../../ui/NexusIcon";
import { NexusSection } from "../../ui/NexusSection";
import { NexusSpinner } from "../../ui/NexusSpinner";
import { NexusAutonomousButton, NexusSectionButton } from "../../ui/NexusButton";
import { NexusConfirmModal } from "../../ui/NexusConfirmModal";
import { NexusInput, NexusSelect, NexusTextarea } from "../../ui/NexusInputs";
import { NexusModal, NexusModalActions } from "../../ui/NexusModal";
import { NexusPhoneField } from "../../ui/NexusPhoneField";
import { isCustomerPhoneComplete } from "../../../utils/customer-phone";
import { getWhatsappDeliveryRouteLabel, getWhatsappProviderLabel } from "../../../utils/whatsapp-routing";
import { NexusActivityHistory } from "../../ui/NexusActivityHistory";

interface RaffleParticipationDetailViewProps {
  participation: RaffleParticipation;
  onLoaded: (participation: RaffleParticipation) => void;
  showToast: (message: string, type?: "success" | "error") => void;
  canManageOperations: boolean;
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

const metadataIconStyle = {
  width: "var(--size-inner-icon-metadata)",
  height: "var(--size-inner-icon-metadata)",
};

const badgeIconStyle = {
  width: "var(--size-inner-icon-badge)",
  height: "var(--size-inner-icon-badge)",
};

const sectionCompactIconStyle = {
  width: "var(--size-inner-icon-section-compact)",
  height: "var(--size-inner-icon-section-compact)",
};

const Field = ({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) => (
  <div className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
    <p className="text-metadata-label text-text-muted">{label}</p>
    <div
      className="min-w-0 break-words text-metadata-value text-text-main [overflow-wrap:anywhere]"
      style={{ marginTop: "var(--space-xs)" }}
    >
      {value}
    </div>
  </div>
);

const getMercadoPagoStatusPresentation = (
  status?: string | null,
  participationStatus?: RaffleParticipation["status"],
) => {
  const normalized = status?.toLowerCase();
  if (normalized === "approved") return { label: "Pagado", variant: "success" as const, icon: CheckCircle2 };
  if (normalized === "refunded") return { label: "Devuelto", variant: "warning" as const, icon: RotateCcw };
  if (normalized === "rejected" || normalized === "failed") return { label: "Fallido", variant: "danger" as const, icon: CircleX };
  if (normalized === "cancelled") return { label: "Cancelado", variant: "danger" as const, icon: CircleX };
  if (normalized === "in_process" || normalized === "pending") return { label: "Pendiente", variant: "warning" as const, icon: Clock };
  if (participationStatus === "PAID") return { label: "Pagado", variant: "success" as const, icon: CheckCircle2 };
  if (participationStatus === "CANCELLED") return { label: "Cancelado", variant: "danger" as const, icon: CircleX };
  return { label: "Pendiente", variant: "warning" as const, icon: Clock };
};

const getWhatsappLogBadge = (
  status: string,
  providerStatus?: string | null,
) => {
  const normalizedProviderStatus = String(providerStatus || "").toLowerCase();
  if (status === "failed") return { label: "Fallida", variant: "danger" as const, icon: CircleX };
  if (
    status === "pending" &&
    ["accepted", "pending", "server_ack"].includes(normalizedProviderStatus)
  ) {
    return { label: "Enviada", variant: "info" as const, icon: MessageCircle };
  }
  if (status === "pending") return { label: "Pendiente", variant: "warning" as const, icon: Clock };
  if (status === "server_ack") return { label: "Enviada", variant: "info" as const, icon: MessageCircle };
  if (status === "delivered") return { label: "Entregada", variant: "success" as const, icon: CheckCircle2 };
  if (status === "read") return { label: "Leída", variant: "success" as const, icon: CheckCircle2 };
  return { label: "Enviada", variant: "success" as const, icon: MessageCircle };
};

const getWhatsappPurposeLabel = (template: string) => {
  if (template === "reservation") return "Apartado de boletos";
  if (template === "reservation-restored" || template === "reservation_restored_rifas") return "Apartado restaurado";
  if (template === "reservation-paid" || template === "reservation_paid_rifas") return "Pago confirmado";
  if (template === "reservation-refunded" || template === "reservation_refunded_rifas") return "Devolución de pago";
  if (template === "reservation-reminder" || template === "reservation_reminder_rifas") return "Recordatorio de pago";
  if (template === "reservation-cancelled") return "Liberación de boletos";
  if (template === "raffle-winner") return "Ganador de la rifa";
  if (template === "raffle-results") return "Resultados de la rifa";
  return template;
};

const financialReasonOptions: Array<{ value: RaffleFinancialReason; label: string }> = [
  { value: "OPERATIONAL_PROTECTION", label: "Protección operativa" },
  { value: "PAYMENT_NOT_RECEIVED", label: "Pago no recibido" },
  { value: "DATA_ENTRY_ERROR", label: "Error de captura" },
  { value: "DUPLICATE", label: "Registro duplicado" },
  { value: "REFUND_OR_RETURN", label: "Reembolso o devolución" },
  { value: "OTHER", label: "Otro" },
];

const financialReasonLabel = (value?: string | null) =>
  financialReasonOptions.find((option) => option.value === value)?.label || value || "Sin motivo";

export const RaffleParticipationDetailView: React.FC<RaffleParticipationDetailViewProps> = ({ participation, onLoaded, showToast, canManageOperations }) => {
  const [detail, setDetail] = useState<RaffleParticipation>(participation);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const [isSavingParticipant, setIsSavingParticipant] = useState(false);
  const [isFinancialDispositionModalOpen, setIsFinancialDispositionModalOpen] = useState(false);
  const [isSavingFinancialDisposition, setIsSavingFinancialDisposition] = useState(false);
  const [isResendingWhatsApp, setIsResendingWhatsApp] = useState(false);
  const [selectedWhatsappLog, setSelectedWhatsappLog] = useState<WhatsAppMessageLog | null>(null);
  const [participantForm, setParticipantForm] = useState({
    customerName: participation.customerName || "",
    customerPhone: participation.customerPhone || "",
    customerState: participation.customerState || "",
  });
  const [selectedTicket, setSelectedTicket] = useState<RaffleParticipationTicket | null>(null);
  const [financialForm, setFinancialForm] = useState<{
    financialStatus: "RECOGNIZED" | "NOT_RECOGNIZED";
    origin: "PARTICIPANT" | "OPERATIONAL_PROTECTION";
    reason: RaffleFinancialReason | "";
    note: string;
  }>({
    financialStatus: "RECOGNIZED",
    origin: "PARTICIPANT",
    reason: "",
    note: "",
  });

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

  useEffect(() => {
    if ((detail.whatsappLogs?.length || 0) > 0) return;

    let active = true;
    const refreshNotificationHistory = () => {
      void apiRaffleParticipations.getById(participation.id)
        .then((updated) => {
          if (!active) return;
          setDetail(updated);
          onLoaded(updated);
        })
        .catch(() => {
          // Keep the detail usable while the asynchronous notification catches up.
        });
    };
    const timers = [
      window.setTimeout(refreshNotificationHistory, 1200),
      window.setTimeout(refreshNotificationHistory, 3200),
    ];

    return () => {
      active = false;
      timers.forEach(window.clearTimeout);
    };
  }, [detail.whatsappLogs?.length, onLoaded, participation.id]);

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
  const statusIcon = detail.status === "PAID"
    ? CheckCircle2
    : ["CANCELLED", "NOT_COMPLETED"].includes(detail.status)
      ? CircleX
      : Clock;
  const financialStatusIsMixed = detail.financialStatus === "MIXED";
  const financialStatusIsRecognized = detail.financialStatus !== "NOT_RECOGNIZED" && !financialStatusIsMixed;
  const financialStatusLabel = financialStatusIsMixed
    ? "Mixta"
    : financialStatusIsRecognized
      ? "Reconocida"
      : "No reconocida";
  const financialStatusVariant = financialStatusIsMixed
    ? "muted" as const
    : financialStatusIsRecognized
      ? "success" as const
      : "warning" as const;
  const financialStatusIcon = financialStatusIsMixed
    ? AlertTriangle
    : financialStatusIsRecognized
      ? CheckCircle2
      : AlertTriangle;
  const originLabel = detail.origin === "OPERATIONAL_PROTECTION"
    ? "Protección operativa"
    : detail.origin === "MIXED"
      ? "Mixto"
      : "Participante";
  const originIcon = detail.origin === "OPERATIONAL_PROTECTION" ? ShieldCheck : UsersRound;
  const originVariant = detail.origin === "OPERATIONAL_PROTECTION" ? "info" as const : "muted" as const;
  const mercadoPagoStatus = getMercadoPagoStatusPresentation(detail.mpPaymentStatus, detail.status);
  const canRefundMercadoPago =
    canManageOperations &&
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

  const handleOpenFinancialDispositionModal = () => {
    setFinancialForm({
      financialStatus: detail.financialStatus === "NOT_RECOGNIZED" ? "NOT_RECOGNIZED" : "RECOGNIZED",
      origin: detail.origin === "OPERATIONAL_PROTECTION" ? "OPERATIONAL_PROTECTION" : "PARTICIPANT",
      reason: (detail.financialStatusReason as RaffleFinancialReason) || "",
      note: detail.financialStatusNote || "",
    });
    setIsFinancialDispositionModalOpen(true);
  };

  const handleSaveFinancialDisposition = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      isSavingFinancialDisposition ||
      (financialForm.financialStatus === "NOT_RECOGNIZED" && !financialForm.reason)
    ) {
      if (!financialForm.reason) {
        showToast("Selecciona un motivo para marcarla como no reconocida.", "error");
      }
      return;
    }

    setIsSavingFinancialDisposition(true);
    try {
      const updated = await apiRaffleParticipations.updateFinancialDisposition(detail.id, {
        financialStatus: financialForm.financialStatus,
        origin: financialForm.origin,
        reason: financialForm.reason || null,
        note: financialForm.note.trim() || null,
      });
      setDetail(updated);
      onLoaded(updated);
      setIsFinancialDispositionModalOpen(false);
      showToast("Estado financiero actualizado.", "success");
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "No se pudo actualizar el estado financiero.",
        "error",
      );
    } finally {
      setIsSavingFinancialDisposition(false);
    }
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
    if (isResendingWhatsApp || isPaymentHold || detail.origin === "OPERATIONAL_PROTECTION") return;
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
    <div className="grid grid-cols-1 items-start lg:grid-cols-3" style={{ gap: "var(--space-lg)" }}>
      <div className="flex flex-col lg:col-span-2" style={{ gap: "var(--space-lg)" }}>
        <NexusSection
          title={isPaymentHold ? "Intento de participación" : "Participación"}
          subtitle={isPaymentHold ? "Trazabilidad del pago con tarjeta" : "Resumen del apartado"}
          icon={isPaymentHold ? AlertTriangle : Ticket}
          iconVariant={detail.status === "PAYMENT_REVIEW" ? "orange" : "brand"}
          actionPlacement="below"
          action={
            !isPaymentHold && canManageOperations ? (
              <NexusSectionButton
                onClick={handleOpenFinancialDispositionModal}
                icon={ShieldCheck}
                variant="secondary"
              >
                Ajustar estado financiero
              </NexusSectionButton>
            ) : undefined
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "var(--space-lg)" }}>
            <Field label="Estado" value={<NexusBadge variant={statusVariant} icon={statusIcon}>{statusLabel}</NexusBadge>} />
            <Field label="Método de pago" value={detail.paymentMethod === "MERCADOPAGO" ? "Tarjeta de crédito o débito" : "Depósito / Transferencia"} />
            {!isPaymentHold && (
              <Field
                label="Estado financiero"
                value={(
                  <div className="flex flex-col items-start" style={{ gap: "var(--space-xs)" }}>
                    <NexusBadge variant={financialStatusVariant} icon={financialStatusIcon}>
                      {financialStatusLabel}
                    </NexusBadge>
                    {!financialStatusIsRecognized && detail.financialStatusReason && (
                      <span className="text-secondary text-text-muted">
                        {financialReasonLabel(detail.financialStatusReason)}
                      </span>
                    )}
                  </div>
                )}
              />
            )}
            {!isPaymentHold && (
              <Field
                label="Origen"
                value={<NexusBadge variant={originVariant} icon={originIcon}>{originLabel}</NexusBadge>}
              />
            )}
            <Field
              label="Modalidad"
              value={detail.participationMode === "SHARED"
                ? <NexusBadge variant="info" icon={UsersRound}>Compartida</NexusBadge>
                : <NexusBadge variant="muted" icon={Ticket}>Completa</NexusBadge>}
            />
            <Field label="Rifa" value={detail.raffleTitle} />
            <Field label="Fecha" value={<span className="flex items-center" style={{ gap: "var(--space-xs)" }}><Calendar style={metadataIconStyle} aria-hidden="true" />{formatDateTime(detail.createdAt)}</span>} />
            {isPaymentHold && detail.expiresAt && <Field label="Retención hasta" value={formatDateTime(detail.expiresAt)} />}
            <Field label="Subtotal" value={formatCurrency(detail.subtotal)} />
            <Field label="Descuento" value={formatCurrency(detail.discountTotal)} />
            <Field label="Total" value={<span className="text-h1 tabular-nums">{detail.ticketCount > 0 ? formatCurrency(detail.total) : "No disponible"}</span>} />
            {detail.couponCode && <Field label="Cupón" value={detail.couponCode} />}
          </div>
        </NexusSection>

        <NexusModal
          isOpen={isFinancialDispositionModalOpen}
          onClose={() => setIsFinancialDispositionModalOpen(false)}
          title="Estado financiero"
          eyebrow="Ajuste administrativo"
          icon={ShieldCheck}
          iconTone="brand"
          size="standard"
          zIndex={260}
        >
          <form onSubmit={handleSaveFinancialDisposition} className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
            <div
              className="border border-blue-100 bg-blue-50 text-blue-800"
              style={{ padding: "var(--padding-inner)", borderRadius: "var(--radius-card-inner)" }}
            >
              <p className="text-secondary leading-relaxed">
                Este ajuste no cambia el pago, no libera boletos y no modifica un resultado publicado. Solo determina si el importe se reconoce en las métricas financieras.
              </p>
            </div>

            <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
              <NexusSelect
                label="Estado financiero"
                icon={financialForm.financialStatus === "RECOGNIZED" ? CheckCircle2 : AlertTriangle}
                value={financialForm.financialStatus}
                onChange={(event) => setFinancialForm((current) => ({
                  ...current,
                  financialStatus: event.target.value as "RECOGNIZED" | "NOT_RECOGNIZED",
                  origin: event.target.value === "RECOGNIZED" ? "PARTICIPANT" : current.origin,
                  reason: event.target.value === "RECOGNIZED" ? "" : current.reason,
                }))}
              >
                <option value="RECOGNIZED">Reconocida</option>
                <option value="NOT_RECOGNIZED">No reconocida</option>
              </NexusSelect>
              <NexusSelect
                label="Origen"
                icon={ShieldCheck}
                value={financialForm.origin}
                onChange={(event) => setFinancialForm((current) => ({
                  ...current,
                  financialStatus: event.target.value === "OPERATIONAL_PROTECTION"
                    ? "NOT_RECOGNIZED"
                    : current.financialStatus,
                  origin: event.target.value as "PARTICIPANT" | "OPERATIONAL_PROTECTION",
                  reason: event.target.value === "OPERATIONAL_PROTECTION"
                    ? "OPERATIONAL_PROTECTION"
                    : current.reason === "OPERATIONAL_PROTECTION" ? "" : current.reason,
                }))}
              >
                <option value="PARTICIPANT">Participante</option>
                <option value="OPERATIONAL_PROTECTION">Protección operativa</option>
              </NexusSelect>
              {financialForm.financialStatus === "NOT_RECOGNIZED" && (
                <NexusSelect
                  label="Motivo *"
                  icon={AlertTriangle}
                  value={financialForm.reason}
                  onChange={(event) => setFinancialForm((current) => ({
                    ...current,
                    reason: event.target.value as RaffleFinancialReason | "",
                  }))}
                >
                  <option value="">Selecciona un motivo</option>
                  {financialReasonOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </NexusSelect>
              )}
              <NexusTextarea
                label="Nota interna"
                value={financialForm.note}
                onChange={(event) => setFinancialForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="Añade contexto para la revisión administrativa."
                rows={4}
                maxLength={500}
              />
            </div>

            <NexusModalActions>
              <NexusAutonomousButton
                type="button"
                variant="secondary"
                className="flex-1"
                disabled={isSavingFinancialDisposition}
                onClick={() => setIsFinancialDispositionModalOpen(false)}
              >
                Cancelar
              </NexusAutonomousButton>
              <NexusAutonomousButton
                type="submit"
                variant="brand"
                icon={Save}
                isLoading={isSavingFinancialDisposition}
                disabled={financialForm.financialStatus === "NOT_RECOGNIZED" && !financialForm.reason}
                className="flex-[2]"
              >
                Guardar ajuste
              </NexusAutonomousButton>
            </NexusModalActions>
          </form>
        </NexusModal>

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
                    <span className="text-metadata-label text-text-muted">
                      Núm. princ.
                    </span>
                    <span className="text-h1 leading-none tabular-nums text-text-main">
                      {ticket.number}
                    </span>
                  </div>
                )}
                rightContent={(
                  <div className="flex flex-wrap items-center justify-end" style={{ gap: "var(--space-xs)" }}>
                    {ticket.shareIndex && (
                      <NexusCardBadge variant="info" icon={UsersRound}>
                        Parte {ticket.shareIndex}/2
                      </NexusCardBadge>
                    )}
                    {ticket.opportunities.length > 0 && (
                      <NexusCardBadge variant="brand" icon={Waypoints}>
                        {ticket.opportunities.length + 1} núms.
                      </NexusCardBadge>
                    )}
                  </div>
                )}
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
                    <span className="text-metadata-label text-text-muted">
                      Núm. princ.
                    </span>
                    <span className="text-display leading-none tabular-nums text-text-main">
                      {selectedTicket.number}
                    </span>
                  </div>
                </div>
                <NexusAutonomousBadge variant="brand" icon={Hash}>
                  {selectedTicket.opportunities.length + 1}{" "}
                  {selectedTicket.opportunities.length === 0 ? "núm." : "núms."}
                </NexusAutonomousBadge>
              </div>

              <div
                className="flex flex-col border-t border-border-main pt-[var(--space-lg)]"
                style={{ gap: "var(--space-md)" }}
              >
                <div className="flex items-start" style={{ gap: "var(--space-sm)" }}>
                  <Sparkles
                    className="shrink-0 text-brand-500"
                    style={{ ...sectionCompactIconStyle, marginTop: "calc(var(--space-xs) / 2)" }}
                    strokeWidth={2.25}
                    aria-hidden="true"
                  />
                  <div className="flex min-w-0 flex-col" style={{ gap: "var(--space-xs)" }}>
                    <h4 className="text-h2 text-text-main">
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
                        className="flex min-w-0 items-center justify-center border border-border-main bg-bg-muted text-metadata-value text-text-main"
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
            !isPaymentHold && canManageOperations ? (
              <NexusSectionButton onClick={handleOpenParticipantModal} icon={Edit2}>
                Editar Participante
              </NexusSectionButton>
            ) : undefined
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "var(--space-lg)" }}>
            <Field label="Nombre completo" value={detail.customerName} />
            <Field label="WhatsApp" value={<span className="flex items-center" style={{ gap: "var(--space-xs)" }}><Phone style={metadataIconStyle} aria-hidden="true" />{detail.customerPhone}</span>} />
            <Field label="Estado" value={<span className="flex items-center" style={{ gap: "var(--space-xs)" }}><MapPin style={metadataIconStyle} aria-hidden="true" />{detail.customerState || "Sin especificar"}</span>} />
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
                value={<NexusBadge variant={mercadoPagoStatus.variant} icon={mercadoPagoStatus.icon}>{mercadoPagoStatus.label}</NexusBadge>}
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
                  <h3 className="text-h2 text-text-main">Historial de intentos</h3>
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
                  const attemptIcon = attemptStatus === "APPROVED"
                    ? CheckCircle2
                    : ["PROCESSING", "UNKNOWN"].includes(attemptStatus)
                      ? Clock
                      : CircleX;

                  return (
                    <div
                      key={attempt.id}
                      className="border border-border-main bg-bg-muted/50 p-[var(--padding-card-nested)]"
                      style={{ borderRadius: "var(--radius-card-nested)" }}
                    >
                      <div className="flex flex-wrap items-center justify-between" style={{ gap: "var(--space-sm)" }}>
                        <div className="flex items-center" style={{ gap: "var(--space-sm)" }}>
                          <span className="text-metadata-label text-text-muted">Intento {detail.paymentAttempts!.length - index}</span>
                          <NexusBadge variant={attemptVariant} icon={attemptIcon}>{attemptLabel}</NexusBadge>
                        </div>
                        <span className="text-metadata-label text-text-muted">{formatDateTime(attempt.createdAt)}</span>
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
          action={canManageOperations && detail.origin !== "OPERATIONAL_PROTECTION" ? (
            <NexusSectionButton
              onClick={handleResendWhatsApp}
              isLoading={isResendingWhatsApp}
              icon={MessageCircle}
            >
              Reenviar WhatsApp
            </NexusSectionButton>
          ) : undefined}
        >
          {detail.whatsappLogs?.length ? (
            <div className="flex flex-col">
              {detail.whatsappLogs.map((log) => {
                const badge = getWhatsappLogBadge(log.status, log.providerStatus);
                return (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => setSelectedWhatsappLog(log)}
                  className="flex w-full items-center justify-between border-b border-border-main pb-[var(--space-md)] text-left transition-colors hover:text-text-main last:border-0 last:pb-0"
                  style={{ gap: "var(--space-md)" }}
                >
                  <div className="min-w-0">
                    <p className="text-secondary font-semibold text-text-main">{getWhatsappPurposeLabel(log.templateUsed)}</p>
                    <p className="truncate text-secondary text-text-muted">
                      {getWhatsappProviderLabel(log.provider)} · {getWhatsappDeliveryRouteLabel(log.responsePayload) || "Ruta no identificada"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <NexusBadge variant={badge.variant} icon={badge.icon}>{badge.label}</NexusBadge>
                    <p className="text-metadata-label text-text-muted" style={{ marginTop: "var(--space-xs)" }}><Clock style={badgeIconStyle} className="inline" aria-hidden="true" /> {formatDateTime(log.sentAt)}</p>
                  </div>
                </button>
              );})}
            </div>
          ) : (
            <p className="text-secondary text-text-muted">Aún no hay notificaciones registradas para esta participación.</p>
          )}
        </NexusSection>}

        <NexusModal
          isOpen={Boolean(selectedWhatsappLog)}
          onClose={() => setSelectedWhatsappLog(null)}
          title={
            selectedWhatsappLog
              ? getWhatsappLogBadge(
                  selectedWhatsappLog.status,
                  selectedWhatsappLog.providerStatus,
                ).label
              : "WhatsApp"
          }
          eyebrow="Detalle de notificación"
          icon={MessageCircle}
          iconTone={selectedWhatsappLog?.status === "failed" ? "danger" : "brand"}
          size="standard"
        >
          {selectedWhatsappLog && (
            <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "var(--space-md)" }}>
                <Field label="Propósito" value={getWhatsappPurposeLabel(selectedWhatsappLog.templateUsed)} />
                <Field label="Fecha del intento" value={formatDateTime(selectedWhatsappLog.sentAt)} />
                <Field label="Teléfono" value={selectedWhatsappLog.recipientPhone} />
                <Field label="Intento" value={String(selectedWhatsappLog.attempt)} />
                <Field label="Proveedor" value={getWhatsappProviderLabel(selectedWhatsappLog.provider)} />
                <Field label="Estado del proveedor" value={selectedWhatsappLog.providerStatus || "Sin estado"} />
                <Field label="Último estado" value={selectedWhatsappLog.lastStatusAt ? formatDateTime(selectedWhatsappLog.lastStatusAt) : "Sin actualización"} />
                <Field label="Instancia" value={selectedWhatsappLog.instanceName || "No disponible"} />
                <Field label="Ruta de envío" value={getWhatsappDeliveryRouteLabel(selectedWhatsappLog.responsePayload) || "Ruta no identificada"} wide />
                <Field label="Message ID" value={selectedWhatsappLog.messageId || "No disponible"} wide />
                {selectedWhatsappLog.jobId && <Field label="Job ID" value={selectedWhatsappLog.jobId} wide />}
              </div>

              {selectedWhatsappLog.errorMessage && (
                <div
                  className="border border-rose-100 bg-rose-50 text-rose-600"
                  style={{ padding: "var(--padding-inner)", borderRadius: "var(--radius-card-inner)" }}
                >
                  <p className="text-metadata-label">Error</p>
                  <p className="break-words text-secondary leading-relaxed [overflow-wrap:anywhere]" style={{ marginTop: "var(--space-xs)" }}>
                    {selectedWhatsappLog.errorMessage}
                  </p>
                </div>
              )}

              {selectedWhatsappLog.status === "failed" && canManageOperations && (
                <NexusModalActions>
                  <NexusAutonomousButton
                    onClick={() => {
                      setSelectedWhatsappLog(null);
                      void handleResendWhatsApp();
                    }}
                    isLoading={isResendingWhatsApp}
                    icon={MessageCircle}
                  >
                    Reenviar WhatsApp
                  </NexusAutonomousButton>
                </NexusModalActions>
              )}
            </div>
          )}
        </NexusModal>

        {!isPaymentHold && (
          <NexusSection
            title="Historial de Actividad"
            subtitle="Acciones y responsables"
            icon={History}
            iconVariant="muted"
          >
            <NexusActivityHistory events={detail.activityEvents} />
          </NexusSection>
        )}

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
