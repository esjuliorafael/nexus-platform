import React from "react";
import { Megaphone, RefreshCw, Send, UsersRound } from "lucide-react";
import { apiRaffleIntelligence, apiRaffles } from "../../api";
import type {
  Raffle,
  RaffleAudience,
  RaffleInvitationOverview,
} from "../../types";
import { NexusSectionBadge } from "../ui/NexusBadge";
import { NexusSectionButton } from "../ui/NexusButton";
import { NexusConfirmModal } from "../ui/NexusConfirmModal";
import { NexusSelect } from "../ui/NexusInputs";
import { NexusSection } from "../ui/NexusSection";

interface Props {
  raffle: Raffle;
  canManageOperations: boolean;
  showToast: (message: string, type?: "success" | "error") => void;
}

const statusLabel: Record<string, string> = {
  QUEUED: "En cola",
  PROCESSING: "Procesando",
  PARTIAL: "Parcial",
  SENT: "Enviada",
  FAILED: "Fallida",
  EMPTY: "Sin destinatarios",
};

export const RaffleInvitationSection: React.FC<Props> = ({
  raffle,
  canManageOperations,
  showToast,
}) => {
  const [audiences, setAudiences] = React.useState<RaffleAudience[]>([]);
  const [audienceSelection, setAudienceSelection] = React.useState("__paid__");
  const [overview, setOverview] =
    React.useState<RaffleInvitationOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const audienceId = audienceSelection.startsWith("__") ? "" : audienceSelection;
  const audiencePreset = audienceSelection === "__authorized__"
    ? "AUTHORIZED_PARTICIPANTS" as const
    : "PAID_PARTICIPANTS" as const;

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const [audienceData, invitationData] = await Promise.all([
        apiRaffleIntelligence.getAudiences(),
        apiRaffles.getInvitationOverview(raffle.id, {
          audienceId: audienceId || undefined,
          audiencePreset,
          frequencyWindowDays: 0,
        }),
      ]);
      setAudiences(audienceData.filter((item) => item.active));
      setOverview(invitationData);
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          "No se pudo cargar la promoción de la rifa.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [audienceId, audiencePreset, raffle.id, showToast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!overview?.campaigns.some((campaign) =>
      ["QUEUED", "PROCESSING", "PARTIAL"].includes(campaign.status),
    )) return;
    const timer = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(timer);
  }, [load, overview?.campaigns]);

  const createCampaign = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      await apiRaffles.createInvitationCampaign(raffle.id, {
        audienceId: audienceId || null,
        audiencePreset,
        frequencyWindowDays: 0,
      });
      setConfirmOpen(false);
      showToast("Campaña de invitación iniciada");
      await load();
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          "No se pudo iniciar la campaña de invitación.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const retry = async (campaignId: string) => {
    try {
      await apiRaffles.retryInvitationCampaign(raffle.id, campaignId);
      showToast("Invitaciones fallidas reenviadas");
      await load();
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "No se pudo realizar el reintento.",
        "error",
      );
    }
  };

  const latest = overview?.campaigns[0] || null;
  const eligible = overview?.preview.summary.eligible || 0;
  const hasActiveCampaign = Boolean(
    latest && ["QUEUED", "PROCESSING", "PARTIAL"].includes(latest.status),
  );

  return (
    <>
      <NexusSection
        title="Promoción de la Rifa"
        subtitle="Invita a participantes con consentimiento y conserva la trazabilidad de cada envío"
        icon={Megaphone}
        action={
          canManageOperations ? (
            <NexusSectionButton
              variant="brand"
              icon={Send}
              disabled={
                loading || eligible === 0 || submitting || hasActiveCampaign
              }
              onClick={() => setConfirmOpen(true)}
            >
              Enviar Invitación
            </NexusSectionButton>
          ) : undefined
        }
      >
        <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
          <div
            className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto]"
            style={{ gap: "var(--space-md)" }}
          >
            <NexusSelect
              label="Audiencia"
              value={audienceSelection}
              onChange={(event) => setAudienceSelection(event.target.value)}
            >
              <option value="__paid__">Participantes pagados</option>
              <option value="__authorized__">Participantes autorizados</option>
              {audiences.map((audience) => (
                <option key={audience.id} value={audience.id}>
                  {audience.name}
                </option>
              ))}
            </NexusSelect>
            <div
              className="flex min-w-[12rem] items-center border border-border-main bg-bg-muted"
              style={{
                gap: "var(--space-sm)",
                padding: "var(--space-md)",
                borderRadius: "var(--radius-inner-visual)",
              }}
            >
              <UsersRound
                className="text-brand-600"
                style={{
                  width: "var(--size-inner-icon-section)",
                  height: "var(--size-inner-icon-section)",
                }}
              />
              <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
                <span className="text-label uppercase text-text-muted">
                  Destinatarios
                </span>
                <strong className="text-h1 text-text-main tabular-nums">
                  {loading ? "..." : eligible}
                </strong>
              </div>
            </div>
          </div>

          {overview && (
            <p className="text-secondary text-text-muted">
              Se excluyeron {overview.preview.summary.excluded}:{" "}
              {overview.preview.summary.exclusions.noConsent} sin consentimiento y{" "}
              {overview.preview.summary.exclusions.alreadyParticipating} ya participan.
            </p>
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
                  <NexusSectionBadge
                    variant={
                      latest.status === "FAILED"
                        ? "danger"
                        : latest.status === "SENT"
                          ? "success"
                          : "warning"
                    }
                  >
                    {statusLabel[latest.status] || latest.status}
                  </NexusSectionBadge>
                </div>
                <span className="text-secondary text-text-muted">
                  {latest.sentCount} enviadas · {latest.failedCount} fallidas ·{" "}
                  {latest.totalRecipients} destinatarios
                </span>
              </div>
              {canManageOperations && latest.failedCount > 0 && (
                <NexusSectionButton
                  variant="secondary"
                  icon={RefreshCw}
                  onClick={() => void retry(latest.id)}
                >
                  Reintentar Fallidas
                </NexusSectionButton>
              )}
            </div>
          )}
        </div>
      </NexusSection>

      <NexusConfirmModal
        isOpen={confirmOpen}
        title="Enviar invitación"
        message={`Se congelará una audiencia de ${eligible} destinatario${eligible === 1 ? "" : "s"} y se enviará la invitación a “${raffle.title}”. Los participantes actuales y contactos recientes quedan excluidos.`}
        confirmLabel="Enviar Invitación"
        cancelLabel="Cancelar"
        tone="brand"
        icon={Megaphone}
        onCancel={() => {
          if (!submitting) setConfirmOpen(false);
        }}
        onConfirm={() => void createCampaign()}
      />
    </>
  );
};
