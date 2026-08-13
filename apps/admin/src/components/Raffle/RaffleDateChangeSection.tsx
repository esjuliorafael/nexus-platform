import React from "react";
import { CalendarClock, Clock3, Send } from "lucide-react";
import { apiRaffles } from "../../api";
import type { Raffle } from "../../types";
import { NexusCardBadge, NexusSectionBadge } from "../ui/NexusBadge";
import { NexusCardButton, NexusSectionButton } from "../ui/NexusButton";
import { NexusConfirmModal } from "../ui/NexusConfirmModal";
import { NexusSectionCard } from "../ui/NexusCard";
import { NexusSection } from "../ui/NexusSection";

interface Props {
  raffle: Raffle;
  canManageOperations: boolean;
  showToast: (message: string, type?: "success" | "error") => void;
  embedded?: boolean;
}

const campaignLabel = (status?: string | null) => {
  if (status === "SENT") return "Enviada";
  if (status === "PROCESSING" || status === "PARTIAL") return "Procesando";
  if (status === "FAILED") return "Fallida";
  return "No enviada";
};

export const RaffleDateChangeSection: React.FC<Props> = ({
  raffle,
  canManageOperations,
  showToast,
  embedded = false,
}) => {
  const [overview, setOverview] = React.useState<Awaited<
    ReturnType<typeof apiRaffles.getDateChange>
  > | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [scheduledFor, setScheduledFor] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setOverview(await apiRaffles.getDateChange(raffle.id));
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          "No se pudo cargar el aviso de cambio de fecha.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [raffle.id, showToast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const send = async () => {
    try {
      setSubmitting(true);
      await apiRaffles.createDateChangeCampaign(raffle.id);
      setConfirmOpen(false);
      showToast("Aviso de cambio de fecha iniciado");
      await load();
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "No se pudo enviar el aviso.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const schedule = async () => {
    if (!scheduledFor) return;
    try {
      setSubmitting(true);
      await apiRaffles.scheduleDateChangeCampaign(
        raffle.id,
        new Date(scheduledFor).toISOString(),
      );
      setScheduleOpen(false);
      showToast("Aviso de cambio de fecha programado");
      await load();
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "No se pudo programar el aviso.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const campaign = overview?.campaign;
  return (
    <NexusSection
      title="Cambio de Fecha"
      subtitle="Programa y envía avisos operativos y promocionales."
      icon={CalendarClock}
      bare={embedded}
    >
      <NexusSectionCard
        icon={CalendarClock}
        title="Cambio de Fecha"
        subtitle="Avisa a participantes activos sobre el cambio de fecha."
        rightContent={
          <div
            className="flex flex-col items-end"
            style={{ gap: "var(--space-xs)" }}
          >
            <NexusCardBadge variant={campaign ? "success" : "muted"}>
              {campaignLabel(campaign?.status)}
            </NexusCardBadge>
            <span className="text-secondary font-semibold text-text-main">
              {loading
                ? "..."
                : `${overview?.totalRecipients || 0} destinatarios`}
            </span>
          </div>
        }
        actions={
          canManageOperations ? (
            <div
              className="grid w-full grid-cols-3 md:flex md:w-auto"
              style={{ gap: "var(--space-sm)" }}
            >
              <NexusCardButton
                type="button"
                variant="secondary"
                icon={Clock3}
                className="w-full md:w-auto"
                onClick={() => setScheduleOpen(true)}
                disabled={submitting || !overview?.templateConfigured}
              >
                <span className="md:hidden">Prog.</span>
                <span className="hidden md:inline">Programar</span>
              </NexusCardButton>
              <NexusCardButton
                type="button"
                variant="brand"
                icon={Send}
                className="col-span-2 w-full md:col-auto md:w-auto"
                onClick={() => setConfirmOpen(true)}
                disabled={
                  submitting ||
                  !overview?.templateConfigured ||
                  !overview?.totalRecipients ||
                  Boolean(campaign)
                }
              >
                Enviar
              </NexusCardButton>
            </div>
          ) : undefined
        }
      />

      <NexusConfirmModal
        isOpen={confirmOpen}
        title="¿Enviar aviso de cambio de fecha?"
        message={`Se notificará a ${overview?.totalRecipients || 0} participantes activos, agrupando sus participaciones por número de WhatsApp. Los plazos de pago no cambiarán.`}
        confirmLabel="Enviar aviso"
        cancelLabel="Cancelar"
        onConfirm={() => void send()}
        onCancel={() => setConfirmOpen(false)}
        tone="brand"
        isLoading={submitting}
      />
      {scheduleOpen && (
        <div
          className="mt-[var(--space-md)] flex flex-col border border-border-main bg-bg-muted"
          style={{
            gap: "var(--space-sm)",
            padding: "var(--space-md)",
            borderRadius: "var(--radius-inner-visual)",
          }}
        >
          <label className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
            <span className="text-label uppercase text-text-muted">
              Fecha y hora del aviso
            </span>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(event) => setScheduledFor(event.target.value)}
              className="rounded-[var(--radius-inner-visual)] border border-border-main bg-bg-card px-[var(--space-md)] py-[var(--space-sm)] text-body"
            />
          </label>
          <div className="flex justify-end" style={{ gap: "var(--space-sm)" }}>
            <NexusSectionButton
              variant="secondary"
              onClick={() => setScheduleOpen(false)}
            >
              Cancelar
            </NexusSectionButton>
            <NexusSectionButton
              variant="brand"
              icon={Clock3}
              disabled={!scheduledFor || submitting}
              onClick={() => void schedule()}
            >
              Programar
            </NexusSectionButton>
          </div>
        </div>
      )}
    </NexusSection>
  );
};
