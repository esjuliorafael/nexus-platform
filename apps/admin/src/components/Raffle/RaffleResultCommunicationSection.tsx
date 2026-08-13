import React from "react";
import {
  Bell,
  CheckCircle2,
  Clock3,
  Gift,
  MessageCircle,
  RefreshCw,
  Send,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";
import { apiRaffles } from "../../api";
import {
  Raffle,
  RafflePrize,
  RafflePrizeFulfillmentStatus,
  RaffleResultCampaign,
  RaffleResultCampaignAudience,
  RaffleResultCommunicationOverview,
  RaffleDrawReminderOverview,
} from "../../types";
import { NexusCardBadge, type NexusBadgeVariant } from "../ui/NexusBadge";
import { NexusCardButton, NexusSectionButton } from "../ui/NexusButton";
import { NexusSectionCard } from "../ui/NexusCard";
import { NexusConfirmModal } from "../ui/NexusConfirmModal";
import { NexusInlineNotice } from "../ui/NexusInlineNotice";
import { NexusInput, NexusSelect, NexusTextarea } from "../ui/NexusInputs";
import { NexusModal, NexusModalActions } from "../ui/NexusModal";
import { NexusSection } from "../ui/NexusSection";

interface Props {
  raffle: Raffle;
  canManageOperations: boolean;
  showToast: (message: string, type?: "success" | "error") => void;
  content?: "all" | "reminder" | "results";
  embedded?: boolean;
}

const CAMPAIGN_PRESENTATION: Record<
  RaffleResultCampaign["status"],
  { label: string; variant: NexusBadgeVariant }
> = {
  QUEUED: { label: "En Cola", variant: "warning" },
  PROCESSING: { label: "En Proceso", variant: "warning" },
  PARTIAL: { label: "Envío Parcial", variant: "warning" },
  SENT: { label: "Procesada", variant: "success" },
  FAILED: { label: "Fallida", variant: "danger" },
  EMPTY: { label: "Sin Destinatarios", variant: "muted" },
};

const FULFILLMENT_OPTIONS: Array<{
  value: RafflePrizeFulfillmentStatus;
  label: string;
}> = [
  { value: "PENDING_CONTACT", label: "Pendiente de contacto" },
  { value: "CONTACTED", label: "Contactado" },
  { value: "DELIVERY_COORDINATED", label: "Entrega coordinada" },
  { value: "DELIVERED", label: "Premio entregado" },
  { value: "NOT_CLAIMED", label: "No reclamado" },
];

const fulfillmentLabel = (status?: RafflePrizeFulfillmentStatus | null) =>
  FULFILLMENT_OPTIONS.find((option) => option.value === status)?.label ||
  "No aplica";

const fulfillmentVariant = (
  status?: RafflePrizeFulfillmentStatus | null,
): NexusBadgeVariant => {
  if (status === "DELIVERED") return "success";
  if (status === "NOT_CLAIMED") return "danger";
  if (status === "DELIVERY_COORDINATED") return "warning";
  if (status === "CONTACTED") return "brand";
  return "muted";
};

const placeLabel = (position?: number) => {
  if (position === 1) return "Primer Lugar";
  if (position === 2) return "Segundo Lugar";
  if (position === 3) return "Tercer Lugar";
  return `Lugar ${position || 1}`;
};

const formatDrawDateTime = (value: string) =>
  new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Mexico_City",
  }).format(new Date(value));

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const RaffleResultCommunicationSection: React.FC<Props> = ({
  raffle,
  canManageOperations,
  showToast,
  content = "all",
  embedded = false,
}) => {
  const [overview, setOverview] =
    React.useState<RaffleResultCommunicationOverview | null>(null);
  const [drawReminder, setDrawReminder] =
    React.useState<RaffleDrawReminderOverview | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [pendingAudience, setPendingAudience] =
    React.useState<RaffleResultCampaignAudience | null>(null);
  const [pendingDrawReminder, setPendingDrawReminder] = React.useState(false);
  const [pendingScheduleCancellation, setPendingScheduleCancellation] =
    React.useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = React.useState(false);
  const [scheduledFor, setScheduledFor] = React.useState("");
  const [selectedCampaign, setSelectedCampaign] =
    React.useState<RaffleResultCampaign | null>(null);
  const [editingPrize, setEditingPrize] = React.useState<RafflePrize | null>(
    null,
  );
  const [fulfillmentStatus, setFulfillmentStatus] =
    React.useState<RafflePrizeFulfillmentStatus>("PENDING_CONTACT");
  const [fulfillmentNotes, setFulfillmentNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loadOverview = React.useCallback(
    async (quiet = false) => {
      if (!quiet) setIsLoading(true);
      try {
        const [resultOverview, reminderOverview] = await Promise.all([
          apiRaffles.getResultCommunication(raffle.id),
          apiRaffles.getDrawReminder(raffle.id),
        ]);
        setOverview(resultOverview);
        setDrawReminder(reminderOverview);
      } catch (error: any) {
        if (!quiet) {
          showToast(
            error?.response?.data?.message ||
              "No se pudo consultar la comunicación de resultados.",
            "error",
          );
        }
      } finally {
        if (!quiet) setIsLoading(false);
      }
    },
    [raffle.id, raffle.resultPublishedAt, showToast],
  );

  React.useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  React.useEffect(() => {
    const hasActiveCampaign = overview?.campaigns.some(
      (campaign) =>
        ["QUEUED", "PROCESSING", "PARTIAL"].includes(campaign.status) ||
        (campaign.acceptedCount > 0 &&
          Date.now() - new Date(campaign.createdAt).getTime() < 15 * 60 * 1000),
    );
    if (!hasActiveCampaign) return;
    const timer = window.setInterval(() => void loadOverview(true), 4000);
    return () => window.clearInterval(timer);
  }, [loadOverview, overview?.campaigns]);

  React.useEffect(() => {
    if (!selectedCampaign || !overview) return;
    const updated = overview.campaigns.find(
      (campaign) => campaign.id === selectedCampaign.id,
    );
    if (updated && updated !== selectedCampaign) {
      setSelectedCampaign(updated);
    }
  }, [overview, selectedCampaign]);

  const latestCampaign = (audience: RaffleResultCampaignAudience) =>
    overview?.campaigns.find((campaign) => campaign.audience === audience) ||
    null;
  const audienceEstimate = (audience: RaffleResultCampaignAudience) =>
    overview?.audienceEstimates.find(
      (estimate) => estimate.audience === audience,
    );

  const handleCreateCampaign = async () => {
    if (!pendingAudience || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiRaffles.createResultCampaign(raffle.id, pendingAudience);
      setPendingAudience(null);
      await loadOverview(true);
      showToast("La comunicación fue enviada a la cola.", "success");
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "No se pudo iniciar la comunicación.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDrawReminder = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiRaffles.createDrawReminderCampaign(raffle.id);
      setPendingDrawReminder(false);
      await loadOverview(true);
      showToast("El recordatorio de la rifa fue enviado a la cola.", "success");
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          "No se pudo iniciar el aviso de la rifa.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openScheduleModal = () => {
    setScheduledFor(toDateTimeLocalValue(drawReminder?.campaign?.scheduledFor));
    setIsScheduleModalOpen(true);
  };

  const handleScheduleDrawReminder = async () => {
    if (!scheduledFor || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiRaffles.scheduleDrawReminderCampaign(
        raffle.id,
        new Date(scheduledFor).toISOString(),
      );
      setIsScheduleModalOpen(false);
      await loadOverview(true);
      showToast("El recordatorio de la rifa quedó programado.", "success");
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          "No se pudo programar el aviso de la rifa.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelDrawReminderSchedule = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiRaffles.cancelDrawReminderSchedule(raffle.id);
      await loadOverview(true);
      showToast("La programación del aviso fue cancelada.", "success");
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          "No se pudo cancelar la programación.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = async (campaign: RaffleResultCampaign) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiRaffles.retryResultCampaign(raffle.id, campaign.id);
      await loadOverview(true);
      showToast("Los mensajes fallidos volvieron a la cola.", "success");
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          "No se pudieron reintentar los mensajes.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openFulfillment = (prize: RafflePrize) => {
    setEditingPrize(prize);
    setFulfillmentStatus(
      prize.fulfillmentStatus === "NOT_APPLICABLE" || !prize.fulfillmentStatus
        ? "PENDING_CONTACT"
        : prize.fulfillmentStatus,
    );
    setFulfillmentNotes(prize.fulfillmentNotes || "");
  };

  const handleFulfillment = async () => {
    if (!editingPrize?.id || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiRaffles.updatePrizeFulfillment(raffle.id, editingPrize.id, {
        status: fulfillmentStatus,
        notes: fulfillmentNotes.trim() || null,
      });
      setEditingPrize(null);
      await loadOverview(true);
      showToast("Seguimiento del premio actualizado.", "success");
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          "No se pudo actualizar el seguimiento del premio.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const eligiblePrizes = (overview?.prizes || []).filter(
    (prize) => prize.resultResolutionStatus === "ELIGIBLE_WINNER",
  );
  const drawReminderScheduled = Boolean(
    drawReminder?.campaign?.scheduledFor &&
    new Date(drawReminder.campaign.scheduledFor).getTime() > Date.now(),
  );
  const showReminder = content !== "results";
  const showResults = content !== "reminder";
  const drawReminderSubtitle = !drawReminder?.totalRecipients
    ? "No hay participantes con pago confirmado para notificar."
    : drawReminderScheduled
      ? "El aviso se enviará a quienes tengan una participación pagada."
      : drawReminder?.campaign
        ? "El aviso se procesó para la audiencia disponible."
        : "El aviso se enviará a quienes tengan una participación pagada.";

  const displayDrawReminderSubtitle = !drawReminder?.totalRecipients
    ? "No hay participantes con pago confirmado para notificar."
    : drawReminder?.campaign
      ? "El aviso se procesó para la audiencia disponible."
      : "Aviso operativo previo para participantes con pago confirmado.";

  return (
    <>
      {showReminder && (
        <NexusSection
          title="Recordatorio de la Rifa"
          subtitle="Comunicación operativa previa para participaciones pagadas"
          icon={Bell}
          iconVariant="brand"
          bare={embedded}
        >
          {isLoading ? (
            <div
              className="h-28 animate-pulse bg-bg-muted"
              style={{ borderRadius: "var(--radius-inner-visual)" }}
            />
          ) : !drawReminder?.drawDate ? (
            <NexusInlineNotice title="Fecha Pendiente" variant="neutral">
              Configura la fecha de la rifa para habilitar este aviso.
            </NexusInlineNotice>
          ) : (
            <NexusSectionCard
              icon={Bell}
              title="Recordatorio de la Rifa"
              subtitle={displayDrawReminderSubtitle}
              stackActionsOnMobile
              rightContent={
                <div
                  className="flex w-full flex-col md:w-auto md:items-end"
                  style={{ gap: "var(--space-xs)" }}
                >
                  <div
                    className="flex w-full items-center justify-between md:w-auto md:flex-col md:items-end"
                    style={{ gap: "var(--space-xs)" }}
                  >
                    <NexusCardBadge
                      variant={
                        drawReminderScheduled
                          ? "brand"
                          : drawReminder.campaign
                            ? CAMPAIGN_PRESENTATION[
                                drawReminder.campaign.status
                              ].variant
                            : "muted"
                      }
                    >
                      {drawReminderScheduled
                        ? "Programado"
                        : drawReminder.campaign
                          ? CAMPAIGN_PRESENTATION[drawReminder.campaign.status]
                              .label
                          : "No Enviado"}
                    </NexusCardBadge>
                    <span className="text-secondary font-semibold text-text-main">
                      {drawReminderScheduled
                        ? formatDrawDateTime(
                            drawReminder.campaign!.scheduledFor!,
                          )
                        : drawReminder.campaign
                          ? `${drawReminder.campaign.sentCount} enviados`
                          : `${drawReminder.totalRecipients} destinatarios`}
                    </span>
                  </div>
                  {drawReminder.invalidRecipients > 0 && (
                    <span className="text-label text-rose-600">
                      {drawReminder.invalidRecipients} inválidos
                    </span>
                  )}
                  {!drawReminder.templateConfigured && (
                    <span className="text-label text-rose-600">
                      Plantilla sin configurar
                    </span>
                  )}
                </div>
              }
              actions={
                canManageOperations && !drawReminder.campaign ? (
                  <div
                    className="grid w-full grid-cols-3 md:flex md:w-auto"
                    style={{ gap: "var(--space-sm)" }}
                  >
                    <NexusCardButton
                      type="button"
                      variant="secondary"
                      icon={Clock3}
                      className="w-full md:w-auto"
                      aria-label="Programar aviso"
                      title="Programar aviso"
                      disabled={
                        isSubmitting || !drawReminder.templateConfigured
                      }
                      onClick={openScheduleModal}
                    >
                      <span className="md:hidden">Prog.</span>
                      <span className="hidden md:inline">Programar</span>
                    </NexusCardButton>
                    <NexusCardButton
                      type="button"
                      variant="brand"
                      icon={Send}
                      className="col-span-2 w-full md:col-auto md:w-auto"
                      disabled={
                        isSubmitting ||
                        !drawReminder.templateConfigured ||
                        drawReminder.totalRecipients === 0
                      }
                      onClick={() => setPendingDrawReminder(true)}
                    >
                      Enviar
                    </NexusCardButton>
                  </div>
                ) : canManageOperations && drawReminderScheduled ? (
                  <div
                    className="grid w-full grid-cols-3 md:flex md:w-auto"
                    style={{ gap: "var(--space-sm)" }}
                  >
                    <NexusCardButton
                      type="button"
                      variant="secondary"
                      className="w-full md:w-auto"
                      disabled={isSubmitting}
                      onClick={() => setPendingScheduleCancellation(true)}
                    >
                      Cancelar
                    </NexusCardButton>
                    <NexusCardButton
                      type="button"
                      variant="brand"
                      icon={Clock3}
                      className="col-span-2 w-full md:col-auto md:w-auto"
                      disabled={isSubmitting}
                      onClick={openScheduleModal}
                    >
                      Reprogramar
                    </NexusCardButton>
                  </div>
                ) : undefined
              }
            />
          )}
        </NexusSection>
      )}

      {showResults && (
        <NexusSection
          title="Comunicación de Resultados"
          subtitle="Mensajes independientes de la publicación de la rifa"
          icon={MessageCircle}
          iconVariant="brand"
        >
          {isLoading ? (
            <div
              className="h-36 animate-pulse bg-bg-muted"
              style={{ borderRadius: "var(--radius-inner-visual)" }}
            />
          ) : !overview?.resultPublishedAt ? (
            <NexusInlineNotice title="Resultados Pendientes" variant="neutral">
              Publica primero los resultados para habilitar las comunicaciones.
            </NexusInlineNotice>
          ) : (
            <div
              className="grid grid-cols-1 lg:grid-cols-2"
              style={{ gap: "var(--space-md)" }}
            >
              <CampaignCard
                audience="WINNERS"
                title="Ganadores"
                description="Un mensaje por ganador, agrupando todos sus premios."
                icon={Trophy}
                campaign={latestCampaign("WINNERS")}
                estimate={audienceEstimate("WINNERS")}
                canManage={canManageOperations}
                isSubmitting={isSubmitting}
                onStart={() => setPendingAudience("WINNERS")}
                onRetry={handleRetry}
                onDetails={setSelectedCampaign}
              />
              <CampaignCard
                audience="PARTICIPANTS"
                title="Participantes"
                description="Participaciones pagadas, sin incluir a los ganadores."
                icon={UsersRound}
                campaign={latestCampaign("PARTICIPANTS")}
                estimate={audienceEstimate("PARTICIPANTS")}
                canManage={canManageOperations}
                isSubmitting={isSubmitting}
                onStart={() => setPendingAudience("PARTICIPANTS")}
                onRetry={handleRetry}
                onDetails={setSelectedCampaign}
              />
            </div>
          )}
        </NexusSection>
      )}

      {showResults && overview?.resultPublishedAt && (
        <NexusSection
          title="Entrega de Premios"
          subtitle="Seguimiento posterior para cada ganador elegible"
          icon={Gift}
        >
          {eligiblePrizes.length === 0 ? (
            <NexusInlineNotice
              title="Sin Premios Entregables"
              variant="neutral"
            >
              Ningún lugar publicado tiene una participación pagada asociada.
            </NexusInlineNotice>
          ) : (
            <div
              className="grid grid-cols-1 lg:grid-cols-2"
              style={{ gap: "var(--space-md)" }}
            >
              {eligiblePrizes.map((prize) => (
                <NexusSectionCard
                  key={prize.id}
                  icon={Gift}
                  title={prize.title}
                  subtitle={`${placeLabel(prize.position)} · Boleto ${prize.winningTicketNumber}`}
                  rightContent={
                    <NexusCardBadge
                      variant={fulfillmentVariant(prize.fulfillmentStatus)}
                    >
                      {fulfillmentLabel(prize.fulfillmentStatus)}
                    </NexusCardBadge>
                  }
                  actions={
                    canManageOperations ? (
                      <NexusCardButton
                        type="button"
                        variant="secondary"
                        onClick={() => openFulfillment(prize)}
                      >
                        Actualizar
                      </NexusCardButton>
                    ) : undefined
                  }
                />
              ))}
            </div>
          )}
        </NexusSection>
      )}

      <NexusConfirmModal
        isOpen={pendingDrawReminder}
        title="Enviar Recordatorio de la Rifa"
        message={`Se preparará un mensaje para ${drawReminder?.totalRecipients || 0} destinatario(s) único(s), agrupando todas sus participaciones pagadas. ${drawReminder?.invalidRecipients ? `${drawReminder.invalidRecipients} número(s) inválido(s) quedarán registrados como fallidos. ` : ""}La audiencia y la plantilla quedarán congeladas para evitar duplicados.`}
        confirmLabel={isSubmitting ? "Enviando..." : "Enviar Aviso"}
        cancelLabel="Cancelar"
        tone="brand"
        icon={Bell}
        onCancel={() => {
          if (!isSubmitting) setPendingDrawReminder(false);
        }}
        onConfirm={() => void handleCreateDrawReminder()}
      />

      <NexusModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          if (!isSubmitting) setIsScheduleModalOpen(false);
        }}
        eyebrow="Recordatorio de la Rifa"
        title="Programar Aviso"
        icon={Clock3}
        size="compact"
      >
        <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
          <NexusInput
            label="Fecha y Hora de Envío"
            type="datetime-local"
            value={scheduledFor}
            onChange={(event) => setScheduledFor(event.target.value)}
            helperText="La audiencia y la plantilla se prepararán al momento de enviar el aviso."
          />
          <NexusModalActions className="flex-row">
            <NexusSectionButton
              type="button"
              variant="secondary"
              className="w-full flex-1"
              disabled={isSubmitting}
              onClick={() => setIsScheduleModalOpen(false)}
            >
              Cancelar
            </NexusSectionButton>
            <NexusSectionButton
              type="button"
              variant="brand"
              icon={Clock3}
              className="w-full flex-[2]"
              disabled={!scheduledFor}
              isLoading={isSubmitting}
              onClick={() => void handleScheduleDrawReminder()}
            >
              Programar Aviso
            </NexusSectionButton>
          </NexusModalActions>
        </div>
      </NexusModal>

      <NexusConfirmModal
        isOpen={pendingScheduleCancellation}
        title="Cancelar Aviso Programado"
        message="El aviso no se enviará a la hora programada. Podrás volver a programarlo mientras la rifa no se haya definido."
        confirmLabel={isSubmitting ? "Cancelando..." : "Cancelar Aviso"}
        cancelLabel="Conservar"
        tone="danger"
        icon={Clock3}
        onCancel={() => {
          if (!isSubmitting) setPendingScheduleCancellation(false);
        }}
        onConfirm={() => {
          setPendingScheduleCancellation(false);
          void handleCancelDrawReminderSchedule();
        }}
      />

      <NexusConfirmModal
        isOpen={Boolean(pendingAudience)}
        title={
          pendingAudience === "WINNERS"
            ? "Notificar Ganadores"
            : "Notificar Participantes"
        }
        message={
          pendingAudience
            ? buildConfirmationMessage(
                pendingAudience,
                audienceEstimate(pendingAudience),
              )
            : ""
        }
        confirmLabel={isSubmitting ? "Enviando..." : "Enviar Mensajes"}
        cancelLabel="Cancelar"
        tone="brand"
        icon={Send}
        onCancel={() => {
          if (!isSubmitting) setPendingAudience(null);
        }}
        onConfirm={() => void handleCreateCampaign()}
      />

      <NexusModal
        isOpen={Boolean(selectedCampaign)}
        onClose={() => setSelectedCampaign(null)}
        eyebrow="Comunicación de Resultados"
        title={
          selectedCampaign?.audience === "WINNERS"
            ? "Mensajes a Ganadores"
            : "Mensajes a Participantes"
        }
        icon={selectedCampaign?.audience === "WINNERS" ? Trophy : UsersRound}
        size="standard"
      >
        <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
          {selectedCampaign && (
            <div
              className="grid grid-cols-2 border-b border-border-main lg:grid-cols-4"
              style={{
                gap: "var(--space-md)",
                paddingBottom: "var(--space-md)",
              }}
            >
              <CampaignMetric
                label="Entregados"
                value={selectedCampaign.deliveredCount}
              />
              <CampaignMetric
                label="Aceptados"
                value={selectedCampaign.acceptedCount}
              />
              <CampaignMetric
                label="Fallidos"
                value={
                  selectedCampaign.failedCount +
                  selectedCampaign.providerFailedCount
                }
              />
              <CampaignMetric
                label="Iniciada por"
                value={selectedCampaign.initiatedByName || "Sistema"}
              />
              <div className="col-span-2 lg:col-span-4">
                <span className="text-label text-text-muted">
                  {new Date(selectedCampaign.createdAt).toLocaleString(
                    "es-MX",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </span>
              </div>
            </div>
          )}
          {selectedCampaign?.recipients.map((recipient) => (
            <div
              key={recipient.id}
              className="flex items-center justify-between border-b border-border-main last:border-b-0"
              style={{
                gap: "var(--space-md)",
                paddingBlock: "var(--space-sm)",
              }}
            >
              <div
                className="flex min-w-0 items-center"
                style={{ gap: "var(--space-sm)" }}
              >
                <UserRound
                  className="shrink-0 text-text-muted"
                  style={{
                    width: "var(--size-inner-icon-card)",
                    height: "var(--size-inner-icon-card)",
                  }}
                />
                <div
                  className="flex min-w-0 flex-col"
                  style={{ gap: "var(--space-xs)" }}
                >
                  <strong className="truncate text-secondary text-text-main">
                    {recipient.customerName}
                  </strong>
                  <span className="text-label text-text-muted">
                    {recipient.phone}
                  </span>
                  {recipient.messageLog && (
                    <span className="text-label text-text-muted">
                      {recipient.messageLog.provider} ·{" "}
                      {recipient.messageLog.providerStatus ||
                        recipient.messageLog.status}
                    </span>
                  )}
                  {recipient.lastError && (
                    <span className="text-secondary text-rose-600">
                      {recipient.lastError}
                    </span>
                  )}
                </div>
              </div>
              <NexusCardBadge variant={recipientStatusVariant(recipient)}>
                {recipientStatusLabel(recipient)}
              </NexusCardBadge>
            </div>
          ))}
          {selectedCampaign?.recipients.length === 0 && (
            <NexusInlineNotice title="Sin Destinatarios" variant="neutral">
              Esta audiencia no contiene destinatarios válidos.
            </NexusInlineNotice>
          )}
        </div>
      </NexusModal>

      <NexusModal
        isOpen={Boolean(editingPrize)}
        onClose={() => {
          if (!isSubmitting) setEditingPrize(null);
        }}
        eyebrow={editingPrize ? placeLabel(editingPrize.position) : "Premio"}
        title="Actualizar Entrega"
        icon={Gift}
        size="compact"
      >
        <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
          <NexusSelect
            label="Estado de la Entrega"
            value={fulfillmentStatus}
            onChange={(event) =>
              setFulfillmentStatus(
                event.target.value as RafflePrizeFulfillmentStatus,
              )
            }
          >
            {FULFILLMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NexusSelect>
          <NexusTextarea
            label="Notas"
            value={fulfillmentNotes}
            maxLength={1000}
            onChange={(event) => setFulfillmentNotes(event.target.value)}
            placeholder="Agrega información útil sobre el contacto o la entrega."
          />
          <NexusModalActions className="flex-row">
            <NexusSectionButton
              type="button"
              variant="secondary"
              className="w-full flex-1"
              disabled={isSubmitting}
              onClick={() => setEditingPrize(null)}
            >
              Cancelar
            </NexusSectionButton>
            <NexusSectionButton
              type="button"
              variant="brand"
              icon={CheckCircle2}
              className="w-full flex-[2]"
              isLoading={isSubmitting}
              onClick={() => void handleFulfillment()}
            >
              Guardar Estado
            </NexusSectionButton>
          </NexusModalActions>
        </div>
      </NexusModal>
    </>
  );
};

function CampaignMetric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col" style={{ gap: "var(--space-xs)" }}>
      <span className="text-label text-text-muted">{label}</span>
      <strong className="truncate text-secondary font-semibold text-text-main">
        {value}
      </strong>
    </div>
  );
}

function CampaignCard({
  audience,
  title,
  description,
  icon,
  campaign,
  estimate,
  canManage,
  isSubmitting,
  onStart,
  onRetry,
  onDetails,
}: {
  audience: RaffleResultCampaignAudience;
  title: string;
  description: string;
  icon: typeof Trophy;
  campaign: RaffleResultCampaign | null;
  estimate:
    | RaffleResultCommunicationOverview["audienceEstimates"][number]
    | undefined;
  canManage: boolean;
  isSubmitting: boolean;
  onStart: () => void;
  onRetry: (campaign: RaffleResultCampaign) => Promise<void>;
  onDetails: (campaign: RaffleResultCampaign) => void;
}) {
  const presentation = campaign ? CAMPAIGN_PRESENTATION[campaign.status] : null;
  const canRetry = Boolean(
    campaign && (campaign.failedCount > 0 || campaign.providerFailedCount > 0),
  );
  return (
    <NexusSectionCard
      icon={icon}
      title={title}
      subtitle={description}
      rightContent={
        <div
          className="flex flex-col items-end"
          style={{ gap: "var(--space-xs)" }}
        >
          {presentation ? (
            <NexusCardBadge variant={presentation.variant}>
              {presentation.label}
            </NexusCardBadge>
          ) : (
            <NexusCardBadge variant="muted">No Enviada</NexusCardBadge>
          )}
          <span className="text-secondary font-semibold text-text-main">
            {campaign
              ? `${campaign.deliveredCount} entregados`
              : `${estimate?.totalRecipients ?? 0} destinatarios`}
          </span>
          {campaign && campaign.acceptedCount > 0 && (
            <span className="text-label text-text-muted">
              {campaign.acceptedCount} aceptados por el proveedor
            </span>
          )}
          {campaign &&
            (campaign.failedCount > 0 || campaign.providerFailedCount > 0) && (
              <span className="text-label text-rose-600">
                {campaign.failedCount + campaign.providerFailedCount} fallidos
              </span>
            )}
          {!campaign && estimate && !estimate.templateConfigured && (
            <span className="text-label text-rose-600">
              Plantilla sin configurar
            </span>
          )}
        </div>
      }
      actions={
        <div
          className="grid w-full grid-cols-3 md:flex md:w-auto"
          style={{ gap: "var(--space-sm)" }}
        >
          {campaign && (
            <NexusCardButton
              type="button"
              variant="secondary"
              className={
                canRetry && canManage
                  ? "w-full md:w-auto"
                  : "col-span-3 w-full md:col-auto md:w-auto"
              }
              onClick={() => onDetails(campaign)}
            >
              Ver Detalle
            </NexusCardButton>
          )}
          {canManage && !campaign && (
            <NexusCardButton
              type="button"
              variant="brand"
              icon={Send}
              className="col-span-3 w-full md:col-auto md:w-auto"
              disabled={
                isSubmitting ||
                !estimate?.templateConfigured ||
                estimate.totalRecipients === 0
              }
              onClick={onStart}
            >
              {audience === "WINNERS"
                ? "Notificar Ganadores"
                : "Notificar Participantes"}
            </NexusCardButton>
          )}
          {canManage && canRetry && campaign && (
            <NexusCardButton
              type="button"
              variant="secondary"
              icon={RefreshCw}
              className="col-span-2 w-full md:col-auto md:w-auto"
              disabled={isSubmitting}
              onClick={() => void onRetry(campaign)}
            >
              Reintentar Fallidos
            </NexusCardButton>
          )}
        </div>
      }
    />
  );
}

function recipientProviderFailed(
  recipient: RaffleResultCampaign["recipients"][number],
) {
  const value =
    `${recipient.messageLog?.status || ""} ${recipient.messageLog?.providerStatus || ""}`.toLowerCase();
  return ["fail", "error", "reject", "undeliver"].some((token) =>
    value.includes(token),
  );
}

function recipientDelivered(
  recipient: RaffleResultCampaign["recipients"][number],
) {
  if (recipientProviderFailed(recipient)) return false;
  const value =
    `${recipient.messageLog?.status || ""} ${recipient.messageLog?.providerStatus || ""}`.toLowerCase();
  return ["delivered", "delivery_ack", "read", "read_ack", "played"].some(
    (token) => value.includes(token),
  );
}

function recipientStatusVariant(
  recipient: RaffleResultCampaign["recipients"][number],
): NexusBadgeVariant {
  if (recipient.status === "FAILED" || recipientProviderFailed(recipient)) {
    return "danger";
  }
  if (recipientDelivered(recipient)) return "success";
  return "warning";
}

function recipientStatusLabel(
  recipient: RaffleResultCampaign["recipients"][number],
) {
  if (recipient.status === "FAILED" || recipientProviderFailed(recipient)) {
    return "Fallido";
  }
  if (recipientDelivered(recipient)) return "Entregado";
  if (recipient.status === "SENT") return "Aceptado";
  return "Pendiente";
}

function buildConfirmationMessage(
  audience: RaffleResultCampaignAudience,
  estimate:
    | RaffleResultCommunicationOverview["audienceEstimates"][number]
    | undefined,
) {
  const total = estimate?.totalRecipients || 0;
  const invalid = estimate?.invalidRecipients || 0;
  const audienceLabel =
    audience === "WINNERS" ? "ganador(es)" : "participante(s)";
  const invalidCopy = invalid
    ? ` ${invalid} número(s) inválido(s) quedarán registrados como fallidos.`
    : "";
  return `Se preparará un mensaje para ${total} ${audienceLabel}. Los destinatarios se congelarán para evitar duplicados.${invalidCopy}`;
}
