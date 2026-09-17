import React from "react";
import {
  Gift,
  Info,
  RefreshCw,
  Send,
  TicketPercent,
  UsersRound,
} from "lucide-react";
import { apiRaffles } from "../../api";
import type {
  RaffleParticipantCouponOption,
  RaffleParticipantCouponOverview,
  RaffleParticipantCouponPurpose,
  Raffle,
} from "../../types";
import { NexusCardBadge, NexusSectionBadge } from "../ui/NexusBadge";
import { NexusCardButton, NexusSectionButton } from "../ui/NexusButton";
import { NexusModal, NexusModalActions } from "../ui/NexusModal";
import { NexusSectionCard } from "../ui/NexusCard";
import { NexusSection } from "../ui/NexusSection";
import { NexusSelect, NexusTextarea } from "../ui/NexusInputs";

interface Props {
  raffle: Raffle;
  canManageOperations: boolean;
  showToast: (message: string, type?: "success" | "error") => void;
  embedded?: boolean;
}

const purposeLabels: Record<RaffleParticipantCouponPurpose, string> = {
  DATE_CHANGE: "Compensación por cambio de fecha",
  SEASONAL_PROMOTION: "Promoción especial",
  OTHER: "Otro motivo",
};

const statusLabels: Record<string, string> = {
  QUEUED: "En cola",
  PROCESSING: "Procesando",
  PARTIAL: "Parcial",
  SENT: "Enviada",
  FAILED: "Fallida",
  EMPTY: "Sin destinatarios",
};

const statusVariant = (status?: string | null) =>
  status === "SENT"
    ? "success"
    : status === "FAILED"
      ? "danger"
      : status
        ? "warning"
        : "muted";

const formatDiscount = (coupon: RaffleParticipantCouponOption) =>
  coupon.discountType === "PERCENTAGE"
    ? `${coupon.discountValue}%`
    : coupon.discountValue.toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });

const formatExpiration = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "sin vencimiento";

const defaultMessage =
  "Gracias por seguir participando con nosotros. Queremos ofrecerte un descuento en tu próxima participación.";

export const RaffleParticipantCouponSection: React.FC<Props> = ({
  raffle,
  canManageOperations,
  showToast,
  embedded = false,
}) => {
  const [overview, setOverview] =
    React.useState<RaffleParticipantCouponOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [couponId, setCouponId] = React.useState("");
  const [purpose, setPurpose] =
    React.useState<RaffleParticipantCouponPurpose>("SEASONAL_PROMOTION");
  const [message, setMessage] = React.useState(defaultMessage);
  const [instructions, setInstructions] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setOverview(await apiRaffles.getParticipantCouponOverview(raffle.id));
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          "No se pudo cargar la comunicación de cupones.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [raffle.id, showToast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const latest = overview?.campaigns[0] || null;
  const marketingEligible = overview?.preview.summary.eligible || 0;
  const paidParticipantEligible =
    overview?.paidParticipantPreview.summary.eligible || 0;
  const selectedAudience =
    purpose === "DATE_CHANGE"
      ? overview?.paidParticipantPreview
      : overview?.preview;
  const eligible = selectedAudience?.summary.eligible || 0;
  const audienceLabel =
    purpose === "DATE_CHANGE" ? "Participantes pagados" : "Audiencia consentida";
  const selectedCoupon = overview?.coupons.find((coupon) => coupon.id === couponId) || null;
  const hasActiveCampaign = Boolean(
    latest && ["QUEUED", "PROCESSING", "PARTIAL"].includes(latest.status),
  );
  const usageIsEnough =
    !selectedCoupon ||
    selectedCoupon.availableUses === null ||
    selectedCoupon.availableUses >= eligible;

  const openModal = () => {
    const firstCoupon = overview?.coupons[0];
    setCouponId(firstCoupon?.id || "");
    setPurpose("SEASONAL_PROMOTION");
    setMessage(defaultMessage);
    setInstructions("");
    setModalOpen(true);
  };

  const send = async () => {
    if (!selectedCoupon || !message.trim() || !usageIsEnough || submitting) return;
    try {
      setSubmitting(true);
      await apiRaffles.createParticipantCouponCampaign(raffle.id, {
        couponId: Number(selectedCoupon.id),
        purpose,
        message: message.trim(),
        instructions: instructions.trim() || undefined,
      });
      setModalOpen(false);
      showToast("Campaña de cupón iniciada");
      await load();
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "No se pudo iniciar la campaña de cupón.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const retry = async (campaignId: string) => {
    try {
      setSubmitting(true);
      await apiRaffles.retryParticipantCouponCampaign(raffle.id, campaignId);
      showToast("Envíos fallidos reenviados");
      await load();
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "No se pudieron reintentar los envíos.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const previewCoupon = selectedCoupon || overview?.coupons[0] || null;
  const previewInstructions =
    instructions.trim() || "Úsalo al finalizar tu próxima participación.";

  return (
    <>
      <NexusSection
        title="Cupón para Participantes"
        subtitle="Envía una promoción a quienes ya participan en esta rifa."
        icon={Gift}
        bare={embedded}
      >
        <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
          <NexusSectionCard
            icon={Gift}
            title="Cupón para Participantes"
            subtitle="Personaliza el motivo y las instrucciones del descuento."
            rightContent={
              <div
                className="flex w-full min-w-0 flex-col md:w-[18rem]"
                style={{ gap: "var(--space-sm)" }}
              >
                <NexusCardBadge variant="brand">Audiencias según motivo</NexusCardBadge>
                <div
                  className="flex flex-col items-start md:items-end"
                  style={{ gap: "var(--space-sm)" }}
                >
                  <div className="flex items-center" style={{ gap: "var(--space-sm)" }}>
                    <UsersRound
                      className="text-brand-600"
                      style={{
                        width: "var(--size-inner-icon-card)",
                        height: "var(--size-inner-icon-card)",
                      }}
                    />
                    <span className="text-secondary font-semibold text-text-main tabular-nums">
                      {loading ? "..." : `${paidParticipantEligible} pagados`}
                    </span>
                  </div>
                  <span className="text-label text-text-muted">
                    {loading ? "..." : `${marketingEligible} con consentimiento para promociones`}
                  </span>
                  {latest && (
                    <NexusCardBadge variant={statusVariant(latest.status)}>
                      {statusLabels[latest.status] || latest.status}
                    </NexusCardBadge>
                  )}
                </div>
              </div>
            }
            actions={
              canManageOperations ? (
                <div
                  className="flex w-full items-center md:w-auto"
                  style={{ gap: "var(--space-sm)" }}
                >
                  {latest?.failedCount > 0 && (
                    <NexusCardButton
                      variant="secondary"
                      icon={RefreshCw}
                      onClick={() => void retry(latest.id)}
                      disabled={submitting}
                    >
                      Reintentar Fallidas
                    </NexusCardButton>
                  )}
                  <NexusCardButton
                    variant="brand"
                    icon={Send}
                    className="w-full md:w-auto"
                    disabled={
                      loading ||
                      marketingEligible === 0 && paidParticipantEligible === 0 ||
                      !overview?.templateConfigured ||
                      !overview?.coupons.length ||
                      submitting ||
                      hasActiveCampaign
                    }
                    onClick={openModal}
                  >
                    Configurar y enviar
                  </NexusCardButton>
                </div>
              ) : undefined
            }
          />

          <div
            className="flex items-start border border-blue-200 bg-blue-50 text-blue-800"
            style={{
              gap: "var(--space-sm)",
              padding: "var(--space-md)",
              borderRadius: "var(--radius-inner-visual)",
            }}
          >
            <Info className="mt-0.5 shrink-0" size={18} />
            <p className="text-secondary">
              La compensación por cambio de fecha puede enviarse a participantes pagados. Las promociones especiales se envían solo a quienes tienen consentimiento para recibir novedades de WhatsApp; se respetan las bajas solicitadas.
            </p>
          </div>

          {!loading && overview && !overview.templateConfigured && (
            <div
              className="border border-amber-200 bg-amber-50 text-amber-800"
              style={{
                padding: "var(--space-md)",
                borderRadius: "var(--radius-inner-visual)",
              }}
            >
              <p className="text-secondary">
                Configura la plantilla “Cupón para Participantes” en Canales de WhatsApp para habilitar el envío.
              </p>
            </div>
          )}

          {!loading && overview && overview.templateConfigured && !overview.coupons.length && (
            <div
              className="border border-amber-200 bg-amber-50 text-amber-800"
              style={{
                padding: "var(--space-md)",
                borderRadius: "var(--radius-inner-visual)",
              }}
            >
              <p className="text-secondary">
                Crea o activa un cupón vigente para esta rifa antes de iniciar una campaña.
              </p>
            </div>
          )}

          {latest && (
            <div
              className="flex flex-col border-t border-border-main pt-[var(--space-md)] sm:flex-row sm:items-center sm:justify-between"
              style={{ gap: "var(--space-md)" }}
            >
              <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
                <div
                  className="flex flex-wrap items-center"
                  style={{ gap: "var(--space-sm)" }}
                >
                  <strong className="text-body text-text-main">
                    Última campaña
                  </strong>
                  <NexusSectionBadge variant={statusVariant(latest.status)}>
                    {statusLabels[latest.status] || latest.status}
                  </NexusSectionBadge>
                </div>
                <span className="text-secondary text-text-muted">
                  {latest.sentCount} enviados · {latest.failedCount} fallidos · {latest.totalRecipients} participantes
                </span>
              </div>
              <span className="text-secondary text-text-muted">
                {latest.coupon.code}
              </span>
            </div>
          )}
        </div>
      </NexusSection>

      <NexusModal
        isOpen={modalOpen}
        onClose={() => {
          if (!submitting) setModalOpen(false);
        }}
        title="Enviar cupón a participantes"
        eyebrow="Comunicación promocional"
        icon={TicketPercent}
        size="standard"
        footer={
          <NexusModalActions className="flex-col-reverse sm:flex-row sm:justify-end">
            <NexusSectionButton
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </NexusSectionButton>
            <NexusSectionButton
              variant="brand"
              icon={Send}
              className="w-full sm:w-auto"
              onClick={() => void send()}
              disabled={
                submitting ||
                !selectedCoupon ||
                !message.trim() ||
                !usageIsEnough
              }
            >
              Enviar cupón
            </NexusSectionButton>
          </NexusModalActions>
        }
      >
        <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
          <div className="grid grid-cols-1 gap-[var(--space-md)] sm:grid-cols-2">
            <NexusSelect
              label="Cupón"
              value={couponId}
              onChange={(event) => setCouponId(event.target.value)}
              icon={TicketPercent}
            >
              <option value="">Selecciona un cupón</option>
              {(overview?.coupons || []).map((coupon) => (
                <option key={coupon.id} value={coupon.id}>
                  {coupon.code} · {formatDiscount(coupon)} · vence {formatExpiration(coupon.expiresAt)}
                </option>
              ))}
            </NexusSelect>
            <NexusSelect
              label="Motivo"
              value={purpose}
              onChange={(event) =>
                setPurpose(event.target.value as RaffleParticipantCouponPurpose)
              }
              icon={Gift}
            >
              {Object.entries(purposeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NexusSelect>
          </div>

          <p className="text-secondary text-text-muted">
            {purpose === "DATE_CHANGE"
              ? "Este motivo se enviará a participantes pagados de la rifa. Se respetan las bajas solicitadas."
              : "Este motivo se enviará únicamente a participantes pagados con consentimiento para recibir novedades de WhatsApp."}
          </p>

          <NexusTextarea
            label="Mensaje"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={280}
            rows={4}
            helperText={`${message.length}/280 caracteres`}
            placeholder="Explica el motivo de la promoción."
          />

          <NexusTextarea
            label="Instrucciones del cupón"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            maxLength={240}
            rows={3}
            helperText={`${instructions.length}/240 caracteres. Si lo dejas vacío, se usará una instrucción predeterminada.`}
            placeholder="Ej. Úsalo al finalizar tu próxima participación."
          />

          {selectedCoupon && !usageIsEnough && (
            <div
              className="border border-amber-200 bg-amber-50 text-amber-800"
              style={{
                padding: "var(--space-md)",
                borderRadius: "var(--radius-inner-visual)",
              }}
            >
              <p className="text-secondary">
                El cupón tiene {selectedCoupon.availableUses} usos disponibles y la audiencia elegible contiene {eligible} participantes.
              </p>
            </div>
          )}

          <div
            className="border border-border-main bg-bg-muted"
            style={{
              padding: "var(--space-md)",
              borderRadius: "var(--radius-inner-visual)",
            }}
          >
            <div className="flex items-center" style={{ gap: "var(--space-sm)" }}>
              <Gift className="text-brand-600" size={18} />
              <span className="text-label text-text-muted">Vista previa</span>
            </div>
            <p className="mt-[var(--space-sm)] whitespace-pre-line text-secondary text-text-main">
              {`¡Hola, Carlos! 🎁\n\n${message || "Escribe el mensaje de la campaña."}\n\nCupón: ${previewCoupon?.code || "CUPON"}\nDescuento: ${previewCoupon ? formatDiscount(previewCoupon) : "$100"}\n\n${previewInstructions}\n\nVálido hasta ${previewCoupon ? formatExpiration(previewCoupon.expiresAt) : "sin vencimiento"}.`}
            </p>
          </div>

          <p className="text-secondary text-text-muted">
            La campaña se enviará a {eligible} participante{eligible === 1 ? "" : "s"} de “{raffle.title}” ({audienceLabel.toLowerCase()}).
          </p>
        </div>
      </NexusModal>
    </>
  );
};
