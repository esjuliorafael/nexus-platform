import React from "react";
import { Megaphone, RefreshCw, Send, UsersRound } from "lucide-react";
import { apiRaffles } from "../../api";
import type { Raffle, RaffleInvitationOverview } from "../../types";
import { NexusCardBadge, NexusSectionBadge } from "../ui/NexusBadge";
import { NexusCardButton } from "../ui/NexusButton";
import { NexusConfirmModal } from "../ui/NexusConfirmModal";
import { NexusSectionCard } from "../ui/NexusCard";
import { NexusSection } from "../ui/NexusSection";

interface Props {
  raffle: Raffle;
  canManageOperations: boolean;
  showToast: (message: string, type?: "success" | "error") => void;
  embedded?: boolean;
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
  embedded = false,
}) => {
  const [overview, setOverview] =
    React.useState<RaffleInvitationOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const invitationData = await apiRaffles.getInvitationOverview(raffle.id, {
        audiencePreset: "AUTHORIZED_PARTICIPANTS",
        frequencyWindowDays: 0,
      });
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
  }, [raffle.id, showToast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (
      !overview?.campaigns.some((campaign) =>
        ["QUEUED", "PROCESSING", "PARTIAL"].includes(campaign.status),
      )
    ) {
      return;
    }
    const timer = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(timer);
  }, [load, overview?.campaigns]);

  const createCampaign = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      await apiRaffles.createInvitationCampaign(raffle.id, {
        audiencePreset: "AUTHORIZED_PARTICIPANTS",
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
        subtitle="Invita a participantes autorizados y conserva la trazabilidad de cada envío"
        icon={Megaphone}
        bare={embedded}
      >
        <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
          <NexusSectionCard
            icon={Megaphone}
            title="Promoción de la Rifa"
            subtitle="Envía una invitación a una audiencia autorizada."
            rightContent={
              <div
                className="flex w-full min-w-0 flex-col md:w-[18rem]"
                style={{ gap: "var(--space-sm)" }}
              >
                <NexusCardBadge variant="brand">
                  Audiencia autorizada
                </NexusCardBadge>
                <div
                  className="flex items-center justify-between md:justify-end"
                  style={{ gap: "var(--space-sm)" }}
                >
                  <UsersRound
                    className="text-brand-600"
                    style={{
                      width: "var(--size-inner-icon-card)",
                      height: "var(--size-inner-icon-card)",
                    }}
                  />
                  <span className="text-secondary font-semibold text-text-main tabular-nums">
                    {loading ? "..." : `${eligible} destinatarios`}
                  </span>
                  {latest && (
                    <NexusCardBadge
                      variant={
                        latest.status === "FAILED"
                          ? "danger"
                          : latest.status === "SENT"
                            ? "success"
                            : "warning"
                      }
                    >
                      {statusLabel[latest.status] || latest.status}
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
                    >
                      Reintentar Fallidas
                    </NexusCardButton>
                  )}
                  <NexusCardButton
                    variant="brand"
                    icon={Send}
                    className="w-full md:w-auto"
                    disabled={
                      loading || eligible === 0 || submitting || hasActiveCampaign
                    }
                    onClick={() => setConfirmOpen(true)}
                  >
                    Enviar Invitación
                  </NexusCardButton>
                </div>
              ) : undefined
            }
          />

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
                  {latest.sentCount} enviadas · {latest.failedCount} fallidas · {" "}
                  {latest.totalRecipients} destinatarios
                </span>
              </div>
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
