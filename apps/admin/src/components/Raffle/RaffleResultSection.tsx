import React from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  Hash,
  History,
  Search,
  Ticket,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { apiRaffles, apiSystem } from "../../api";
import {
  Raffle,
  RafflePrize,
  RafflePrizeResultPreview,
  RaffleResultAdmin,
  RaffleResultPreview,
  RaffleResultResolutionStatus,
} from "../../types";
import { NexusActivityHistory } from "../ui/NexusActivityHistory";
import {
  NexusCardBadge,
  NexusSectionBadge,
  type NexusBadgeVariant,
} from "../ui/NexusBadge";
import { NexusSectionButton } from "../ui/NexusButton";
import { NexusConfirmModal } from "../ui/NexusConfirmModal";
import {
  NexusInlineNotice,
  type NexusInlineNoticeVariant,
} from "../ui/NexusInlineNotice";
import { NexusInput } from "../ui/NexusInputs";
import { NexusModal, NexusModalActions } from "../ui/NexusModal";
import { NexusSection } from "../ui/NexusSection";
import { downloadRaffleResultImage } from "../../utils/raffle-result-image";

interface RaffleResultSectionProps {
  raffle: Raffle;
  canManageOperations: boolean;
  showToast: (message: string, type?: "success" | "error") => void;
  onRaffleChange: (raffle: Raffle) => void;
}

type ResolutionPresentation = {
  label: string;
  title: string;
  description: string;
  badge: NexusBadgeVariant;
  icon: LucideIcon;
  notice: NexusInlineNoticeVariant;
};

type ResultConfirmation = "save" | "discard" | "publish" | null;

const RESOLUTION_PRESENTATION: Record<
  RaffleResultResolutionStatus,
  ResolutionPresentation
> = {
  ELIGIBLE_WINNER: {
    label: "Ganador Elegible",
    title: "Participación pagada",
    description:
      "El número pertenece a una participación con pago confirmado.",
    badge: "success",
    icon: CheckCircle2,
    notice: "success",
  },
  UNPAID_RESERVED: {
    label: "Boleto Sin Pago",
    title: "Participación no elegible",
    description:
      "El boleto está apartado, pero su pago no fue confirmado antes de la rifa.",
    badge: "warning",
    icon: Clock3,
    notice: "warning",
  },
  PAYMENT_REVIEW: {
    label: "Pago en Revisión",
    title: "Resolución pendiente",
    description:
      "Mercado Pago todavía puede confirmar o rechazar esta operación. No publiques hasta conocer el desenlace.",
    badge: "warning",
    icon: Clock3,
    notice: "warning",
  },
  UNASSIGNED_NUMBER: {
    label: "Número No Vendido",
    title: "Sin participación asociada",
    description:
      "El número pertenece al universo, pero su boleto principal no fue pagado ni apartado.",
    badge: "muted",
    icon: Ticket,
    notice: "neutral",
  },
  OUTSIDE_UNIVERSE: {
    label: "Fuera del Universo",
    title: "Sin boleto asociado",
    description:
      "Los últimos dígitos no pertenecen al universo cerrado de esta rifa.",
    badge: "danger",
    icon: Hash,
    notice: "warning",
  },
};

const RESULT_SOURCE_LABELS: Record<RafflePrize["resultSource"], string> = {
  MAJOR_PRIZE: "Premio Mayor",
  SECOND_PRIZE: "Segundo Premio",
  THIRD_PRIZE: "Tercer Premio",
  CUSTOM: "Referencia Personalizada",
};

const getResultSourceLabel = (
  source: RafflePrize["resultSource"],
  customLabel?: string | null,
) => (source === "CUSTOM" ? customLabel || RESULT_SOURCE_LABELS.CUSTOM : RESULT_SOURCE_LABELS[source]);

const getPlaceLabel = (position: number) =>
  position === 1 ? "Primer Lugar" : position === 2 ? "Segundo Lugar" : position === 3 ? "Tercer Lugar" : `Lugar ${position}`;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const RaffleResultSection: React.FC<RaffleResultSectionProps> = ({
  raffle,
  canManageOperations,
  showToast,
  onRaffleChange,
}) => {
  const [result, setResult] = React.useState<RaffleResultAdmin | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [activePrizeId, setActivePrizeId] = React.useState<number | null>(null);
  const [activeReferenceNumber, setActiveReferenceNumber] = React.useState("");
  const [referenceNumbers, setReferenceNumbers] = React.useState<Record<number, string>>({});
  const [preview, setPreview] = React.useState<RaffleResultPreview | null>(null);
  const [previewPrizeIndex, setPreviewPrizeIndex] = React.useState(0);
  const [isPreviewing, setIsPreviewing] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  const [confirmation, setConfirmation] =
    React.useState<ResultConfirmation>(null);
  const [brandIdentity, setBrandIdentity] = React.useState({
    name: "Nexus",
    logoUrl: null as string | null,
  });

  const loadResult = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const nextResult = await apiRaffles.getResult(raffle.id);
      setResult(nextResult);
      setReferenceNumbers(
        Object.fromEntries(
          nextResult.prizes
            .filter((prize) => Boolean(prize.draftReferenceNumber))
            .map((prize) => [
              prize.prizeId,
              prize.draftReferenceNumber!,
            ]),
        ),
      );
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          "No se pudo consultar el resultado de la rifa.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [raffle.id, showToast]);

  React.useEffect(() => {
    void loadResult();
  }, [loadResult]);

  React.useEffect(() => {
    void apiSystem
      .getConfig()
      .then((config) =>
        setBrandIdentity({
          name:
            config.branding_brand_name ||
            config.brand_name ||
            "Nexus",
          logoUrl: config.branding_logo_url || null,
        }),
      )
      .catch(() => undefined);
  }, []);

  const configuredPrizes = raffle.prizes ?? [];
  const resultInputs = configuredPrizes
    .filter((prize): prize is typeof prize & { id: number } => Boolean(prize.id))
    .map((prize) => ({
      prizeId: prize.id,
      referenceNumber: referenceNumbers[prize.id] || "",
    }));
  const hasCompleteInputs =
    resultInputs.length > 0 &&
    resultInputs.length === configuredPrizes.length &&
    resultInputs.every(({ referenceNumber }) => referenceNumber.length >= raffle.digits);
  const activePrize = configuredPrizes.find(
    (prize) => prize.id === activePrizeId,
  );

  const closeModal = () => {
    if (isPreviewing || isPublishing) return;
    setIsModalOpen(false);
  };

  const finishModalClose = React.useCallback(() => {
    setActivePrizeId(null);
    setActiveReferenceNumber("");
    setPreview(null);
    setPreviewPrizeIndex(0);
  }, []);

  const openPrizeResolution = (prizeId: number) => {
    setPreview(null);
    setActivePrizeId(prizeId);
    setActiveReferenceNumber(referenceNumbers[prizeId] || "");
    setIsModalOpen(true);
  };

  const hasUnsavedPrizeChanges =
    activePrizeId !== null &&
    activeReferenceNumber !== (referenceNumbers[activePrizeId] || "");

  const requestModalClose = () => {
    if (isSavingDraft || isPreviewing || isPublishing) return;
    if (hasUnsavedPrizeChanges) {
      setConfirmation("discard");
      return;
    }
    closeModal();
  };

  const saveActivePrizeDraft = async () => {
    if (
      activePrizeId === null ||
      activeReferenceNumber.length < raffle.digits ||
      isSavingDraft
    ) {
      return;
    }
    setIsSavingDraft(true);
    try {
      const saved = await apiRaffles.saveResultDraft(
        raffle.id,
        activePrizeId,
        activeReferenceNumber,
      );
      setReferenceNumbers((current) => ({
        ...current,
        [activePrizeId]: saved.draftReferenceNumber,
      }));
      setResult((current) =>
        current
          ? {
              ...current,
              prizes: current.prizes.map((prize) =>
                prize.prizeId === activePrizeId
                  ? {
                      ...prize,
                      draftReferenceNumber: saved.draftReferenceNumber,
                    }
                  : prize,
              ),
            }
          : current,
      );
      setConfirmation(null);
      setIsModalOpen(false);
      showToast("Resultado guardado como borrador.", "success");
    } catch (error: any) {
      setConfirmation(null);
      showToast(
        error?.response?.data?.message ||
          "No se pudo guardar el resultado.",
        "error",
      );
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handlePreview = async () => {
    if (!hasCompleteInputs || isPreviewing) return;
    setIsPreviewing(true);
    try {
      setPreview(await apiRaffles.previewResult(raffle.id, resultInputs));
      setPreviewPrizeIndex(0);
    } catch (error: any) {
      setPreview(null);
      showToast(
        error?.response?.data?.message || "No se pudieron validar los resultados.",
        "error",
      );
    } finally {
      setIsPreviewing(false);
    }
  };

  const handlePublish = async () => {
    if (!preview?.canPublish || isPublishing) return;
    setIsPublishing(true);
    try {
      const published = await apiRaffles.publishResult(raffle.id, resultInputs);
      onRaffleChange(published.raffle);
      setIsModalOpen(false);
      setReferenceNumbers({});
      await loadResult();
      showToast("Resultados publicados correctamente.", "success");
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "No se pudieron publicar los resultados.",
        "error",
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const published = Boolean(
    result?.resultPublishedAt &&
      result.prizes.length > 0 &&
      result.prizes.every((prize) => prize.winningNumber),
  );

  return (
    <>
      <NexusSection
        title="Resolución de la Rifa"
        subtitle={
          published
            ? "Resultados oficiales publicados en el Storefront"
            : "Valida la referencia oficial de cada premio antes de finalizar la rifa"
        }
        icon={Trophy}
        iconVariant="brand"
        action={
          canManageOperations && !published && !isLoading ? (
            <NexusSectionButton
              type="button"
              variant="brand"
              icon={Search}
              disabled={
                raffle.status === "CANCELLED" ||
                configuredPrizes.length === 0 ||
                !hasCompleteInputs
              }
              onClick={() => {
                setActivePrizeId(null);
                setIsModalOpen(true);
                void handlePreview();
              }}
            >
              Validar Resultados
            </NexusSectionButton>
          ) : undefined
        }
      >
        {isLoading ? (
          <div
            className="h-32 animate-pulse bg-bg-muted"
            style={{ borderRadius: "var(--radius-inner-visual)" }}
          />
        ) : published && result ? (
          <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
            {result.prizes.map((prize) => (
              <PublishedPrize key={prize.prizeId} prize={prize} />
            ))}
            <ResultField
              icon={Clock3}
              label="Publicación"
              value={formatDateTime(result.resultPublishedAt!)}
            />
          </div>
        ) : configuredPrizes.length > 0 &&
          raffle.status !== "CANCELLED" ? (
          <div
            className="grid grid-cols-1 md:grid-cols-2"
            style={{ gap: "var(--space-md)" }}
          >
            {configuredPrizes.map((prize) =>
              prize.id ? (
                <PrizeCaptureCard
                  key={prize.id}
                  prize={prize}
                  capturedValue={referenceNumbers[prize.id] || ""}
                  disabled={!canManageOperations}
                  onResolve={() => openPrizeResolution(prize.id!)}
                />
              ) : null,
            )}
          </div>
        ) : (
          <NexusInlineNotice
            title={raffle.status === "CANCELLED" ? "Rifa Cancelada" : "Resultado Pendiente"}
            variant={raffle.status === "CANCELLED" ? "danger" : "neutral"}
          >
            {raffle.status === "CANCELLED"
              ? "Una rifa cancelada no puede resolverse ni publicar ganadores."
              : configuredPrizes.length === 0
                ? "Configura al menos un premio antes de resolver la rifa."
                : `Nexus tomará los últimos ${raffle.digits} dígitos de cada resultado oficial, localizará su boleto principal y verificará el pago de cada participación.`}
          </NexusInlineNotice>
        )}
      </NexusSection>

      <NexusSection
        title="Historial de la Rifa"
        subtitle="Registro de las acciones realizadas sobre los resultados"
        icon={History}
      >
        <NexusActivityHistory
          events={result?.events}
          emptyMessage="Aún no hay acciones registradas sobre los resultados."
        />
      </NexusSection>

      <NexusModal
        isOpen={isModalOpen}
        onClose={requestModalClose}
        onAfterClose={finishModalClose}
        eyebrow="Resolución de la Rifa"
        title={
          activePrize
            ? getPlaceLabel(activePrize.position || 1)
            : preview?.prizes[previewPrizeIndex]
              ? getPlaceLabel(preview.prizes[previewPrizeIndex].position)
            : "Validar Resultados Oficiales"
        }
        icon={Trophy}
        size="standard"
      >
        <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
          {isPreviewing && activePrizeId === null ? (
            <div
              className="h-32 animate-pulse bg-bg-muted"
              style={{ borderRadius: "var(--radius-inner-visual)" }}
            />
          ) : !preview ? (
            <>
              <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
                {configuredPrizes
                  .filter(
                    (prize) =>
                      activePrizeId === null || prize.id === activePrizeId,
                  )
                  .map((prize) => {
                  if (!prize.id) return null;
                  return (
                    <div
                      key={prize.id}
                      className="flex flex-col border border-border-main bg-bg-card"
                      style={{
                        gap: "var(--space-sm)",
                        padding: "var(--space-md)",
                        borderRadius: "var(--radius-inner-visual)",
                      }}
                    >
                      <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
                        <span className="text-label uppercase text-text-muted">
                          {getPlaceLabel(prize.position || 1)}
                        </span>
                        <strong className="text-secondary text-text-main">{prize.title}</strong>
                      </div>
                      <NexusInput
                        label={`Número Completo del ${getResultSourceLabel(prize.resultSource, prize.resultSourceLabel)}`}
                        icon={Hash}
                        inputMode="numeric"
                        value={
                          activePrizeId === prize.id
                            ? activeReferenceNumber
                            : referenceNumbers[prize.id] || ""
                        }
                        onChange={(event) => {
                          const value = event.target.value.replace(/\D/g, "");
                          if (activePrizeId === prize.id) {
                            setActiveReferenceNumber(value);
                          } else {
                            setReferenceNumbers((current) => ({
                              ...current,
                              [prize.id!]: value,
                            }));
                          }
                        }}
                        maxLength={20}
                        placeholder="Ej. 48217"
                        helperText={`Se utilizarán los últimos ${raffle.digits} dígitos.`}
                      />
                    </div>
                  );
                  })}
              </div>
              <NexusInlineNotice title="Publicación Atómica" variant="neutral">
                Nexus validará todos los lugares y los publicará juntos. Ningún resultado quedará incompleto.
              </NexusInlineNotice>
            </>
          ) : (
            <ResultPreview
              preview={preview}
              prizeIndex={previewPrizeIndex}
              raffleTitle={raffle.title}
              raffleDrawDate={raffle.drawDate}
              raffleDigits={raffle.digits}
              brandName={brandIdentity.name}
              logoUrl={brandIdentity.logoUrl}
              onDownloadError={() =>
                showToast("No se pudo descargar la imagen del resultado.", "error")
              }
            />
          )}

          <NexusModalActions className="flex-row">
            <NexusSectionButton
              type="button"
              variant="secondary"
              className="w-full flex-1"
              disabled={isPreviewing || isPublishing}
              onClick={() => {
                if (preview) {
                  if (previewPrizeIndex > 0) {
                    setPreviewPrizeIndex((current) => current - 1);
                    return;
                  }
                  setIsModalOpen(false);
                  return;
                }
                requestModalClose();
              }}
            >
              {preview
                ? previewPrizeIndex > 0
                  ? "Anterior"
                  : "Corregir"
                : "Cancelar"}
            </NexusSectionButton>
            {!preview ? (
              <NexusSectionButton
                type="button"
                variant="brand"
                icon={activePrizeId === null ? Search : CheckCircle2}
                isLoading={isPreviewing || isSavingDraft}
                disabled={
                  activePrizeId === null
                    ? !hasCompleteInputs
                    : !activePrizeId ||
                      activeReferenceNumber.length < raffle.digits
                }
                className="w-full flex-[2]"
                onClick={() => {
                  if (activePrizeId !== null) {
                    setConfirmation("save");
                    return;
                  }
                  void handlePreview();
                }}
              >
                {activePrizeId === null
                  ? "Validar Resultados"
                  : "Guardar Resultado"}
              </NexusSectionButton>
            ) : (
              <NexusSectionButton
                type="button"
                variant="brand"
                icon={
                  previewPrizeIndex < preview.prizes.length - 1
                    ? ArrowRight
                    : CheckCircle2
                }
                isLoading={isPublishing}
                disabled={
                  previewPrizeIndex === preview.prizes.length - 1 &&
                  !preview.canPublish
                }
                className="w-full flex-[2]"
                onClick={() => {
                  if (previewPrizeIndex < preview.prizes.length - 1) {
                    setPreviewPrizeIndex((current) => current + 1);
                    return;
                  }
                  setConfirmation("publish");
                }}
              >
                {previewPrizeIndex < preview.prizes.length - 1
                  ? "Siguiente Lugar"
                  : "Publicar Resultados"}
              </NexusSectionButton>
            )}
          </NexusModalActions>
        </div>
      </NexusModal>

      <NexusConfirmModal
        isOpen={confirmation === "save"}
        title="¿Guardar resultado?"
        message="El número oficial quedará guardado como borrador para este lugar. Aún no se publicará el resultado de la rifa."
        confirmLabel="Sí, Guardar"
        cancelLabel="Seguir Editando"
        tone="brand"
        icon={CheckCircle2}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => void saveActivePrizeDraft()}
      />

      <NexusConfirmModal
        isOpen={confirmation === "discard"}
        title="¿Descartar cambios?"
        message="El número capturado no se ha guardado. Si descartas los cambios, se conservará el último borrador guardado."
        confirmLabel="Sí, Descartar"
        cancelLabel="Seguir Editando"
        tone="warning"
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          setConfirmation(null);
          setIsModalOpen(false);
        }}
      />

      <NexusConfirmModal
        isOpen={confirmation === "publish"}
        title="¿Publicar resultados?"
        message="Esta acción finalizará la rifa y publicará todos los lugares en el Storefront. Verifica cuidadosamente los resultados oficiales antes de continuar."
        confirmLabel="Sí, Publicar"
        cancelLabel="Revisar Resultados"
        tone="warning"
        icon={Trophy}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          setConfirmation(null);
          void handlePublish();
        }}
      />
    </>
  );
};

function PrizeCaptureCard({
  prize,
  capturedValue,
  disabled,
  onResolve,
}: {
  prize: RafflePrize;
  capturedValue: string;
  disabled: boolean;
  onResolve: () => void;
}) {
  const captured = Boolean(capturedValue);
  return (
    <div
      className="flex min-w-0 flex-col border border-border-main bg-bg-card"
      style={{
        gap: "var(--space-md)",
        padding: "var(--space-md)",
        borderRadius: "var(--radius-inner-visual)",
      }}
    >
      <div
        className="flex min-w-0 items-center"
        style={{ gap: "var(--space-sm)" }}
      >
        <div
          className="flex shrink-0 items-center justify-center bg-bg-muted text-primary"
          style={{
            width: "var(--h-button-card)",
            height: "var(--h-button-card)",
            borderRadius: "var(--radius-nested-simple)",
          }}
        >
          <Trophy
            style={{
              width: "var(--size-inner-icon-card)",
              height: "var(--size-inner-icon-card)",
            }}
          />
        </div>
        <div
          className="flex min-w-0 flex-1 flex-col"
          style={{ gap: "var(--space-xs)" }}
        >
          <span className="text-label uppercase text-text-muted">
            {getPlaceLabel(prize.position || 1)}
          </span>
          <strong className="truncate text-secondary text-text-main">
            {prize.title}
          </strong>
        </div>
        <NexusSectionBadge variant={captured ? "success" : "muted"}>
          {captured ? "Capturado" : "Pendiente"}
        </NexusSectionBadge>
      </div>

      <div
        className="flex items-end justify-between border-t border-border-main"
        style={{
          gap: "var(--space-sm)",
          paddingTop: "var(--space-md)",
        }}
      >
        <div
          className="flex min-w-0 flex-col"
          style={{ gap: "var(--space-xs)" }}
        >
          <span className="text-label uppercase text-text-muted">
            Referencia
          </span>
          <span className="truncate text-body text-text-main">
            {captured
              ? capturedValue
              : getResultSourceLabel(
                  prize.resultSource,
                  prize.resultSourceLabel,
                )}
          </span>
        </div>
        <NexusSectionButton
          type="button"
          variant={captured ? "secondary" : "brand"}
          icon={captured ? Search : Trophy}
          disabled={disabled}
          onClick={onResolve}
        >
          {captured ? "Revisar" : "Resolver"}
        </NexusSectionButton>
      </div>
    </div>
  );
}

function ResultPreview({
  preview,
  prizeIndex,
  raffleTitle,
  raffleDrawDate,
  raffleDigits,
  brandName,
  logoUrl,
  onDownloadError,
}: {
  preview: RaffleResultPreview;
  prizeIndex: number;
  raffleTitle: string;
  raffleDrawDate?: string | null;
  raffleDigits: number;
  brandName: string;
  logoUrl: string | null;
  onDownloadError: () => void;
}) {
  const [isDownloading, setIsDownloading] = React.useState(false);
  const prize = preview.prizes[prizeIndex];
  if (!prize) return null;
  const repeatedTicket =
    prize.winningTicketNumber &&
    preview.duplicateWinningTickets.includes(prize.winningTicketNumber);

  return (
    <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
      {repeatedTicket && (
        <NexusInlineNotice title="Boleto Repetido Entre Lugares" variant="warning">
          {`El boleto ${prize.winningTicketNumber} obtiene más de un lugar. Nexus respetará los resultados oficiales capturados.`}
        </NexusInlineNotice>
      )}
      <PrizeResolution prize={prize} />
      <NexusSectionButton
        type="button"
        variant="secondary"
        icon={Download}
        isLoading={isDownloading}
        className="w-full"
        onClick={() => {
          setIsDownloading(true);
          void downloadRaffleResultImage({
            brandName,
            logoUrl,
            raffleTitle,
            drawDate: raffleDrawDate,
            digits: raffleDigits,
            prize,
          })
            .catch(onDownloadError)
            .finally(() => setIsDownloading(false));
        }}
      >
        Descargar Resultado
      </NexusSectionButton>
    </div>
  );
}

function PublishedPrize({
  prize,
}: {
  prize: RaffleResultAdmin["prizes"][number];
}) {
  if (!prize.resolutionStatus || !prize.winningNumber) return null;
  return <PrizeResolution prize={{ ...prize, canPublish: true, referenceNumber: prize.referenceNumber || "" }} />;
}

function PrizeResolution({ prize }: { prize: RafflePrizeResultPreview }) {
  const presentation = RESOLUTION_PRESENTATION[prize.resolutionStatus];
  const statusTone = {
    success: "bg-emerald-50 text-emerald-800",
    warning: "bg-amber-50 text-amber-800",
    neutral: "bg-bg-muted text-text-main",
  }[presentation.notice];
  return (
    <div
      className="flex flex-col border border-border-main bg-bg-card"
      style={{
        gap: "var(--space-md)",
        padding: "var(--space-md)",
        borderRadius: "var(--radius-inner-visual)",
      }}
    >
      <div className="flex items-start" style={{ gap: "var(--space-sm)" }}>
        <div
          className="flex shrink-0 items-center justify-center bg-bg-muted text-text-main"
          style={{
            width: "var(--h-button-card)",
            height: "var(--h-button-card)",
            borderRadius: "var(--radius-nested-simple)",
          }}
        >
          <Trophy size={18} />
        </div>
        <div className="flex min-w-0 flex-col" style={{ gap: "var(--space-xs)" }}>
          <span className="text-label uppercase text-text-muted">
            {getPlaceLabel(prize.position)}
          </span>
          <strong className="text-h2 text-text-main">{prize.title}</strong>
        </div>
      </div>
      <div
        className="grid grid-cols-1 border-y border-border-main py-[var(--space-md)] sm:grid-cols-3"
        style={{ gap: "var(--space-md)" }}
      >
        <ResultField icon={Hash} label="Resultado Oficial" value={prize.referenceNumber} />
        <ResultField icon={Trophy} label="Número Ganador" value={prize.winningNumber} />
        <ResultField icon={Ticket} label="Boleto Principal" value={prize.winningTicketNumber || "Sin boleto"} />
      </div>
      <div
        className={`flex flex-col ${statusTone}`}
        style={{
          gap: "var(--space-sm)",
          padding: "var(--space-md)",
          borderRadius: "var(--radius-nested-simple)",
        }}
      >
        <div className="flex items-center justify-between" style={{ gap: "var(--space-sm)" }}>
          <strong className="text-secondary">{presentation.title}</strong>
          <div className="shrink-0">
            <NexusCardBadge
              icon={presentation.icon}
              variant={presentation.badge}
            >
              {presentation.label}
            </NexusCardBadge>
          </div>
        </div>
        <p className="text-body">
          {prize.resolutionStatus === "ELIGIBLE_WINNER" && prize.participant
            ? `${presentation.description.replace(/\.$/, "")} a nombre de ${prize.participant.name}.`
            : presentation.description}
        </p>
      </div>
    </div>
  );
}

function ResultField({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center" style={{ gap: "var(--space-sm)" }}>
      <div
        className="flex shrink-0 items-center justify-center bg-bg-muted text-text-muted"
        style={{
          width: "var(--h-button-card)",
          height: "var(--h-button-card)",
          borderRadius: "var(--radius-nested-simple)",
        }}
      >
        <Icon
          style={{
            width: "var(--size-inner-icon-card)",
            height: "var(--size-inner-icon-card)",
          }}
        />
      </div>
      <div className="flex min-w-0 flex-col" style={{ gap: "var(--space-xs)" }}>
        <span className="text-label uppercase text-text-muted">{label}</span>
        <strong className="truncate text-h2 text-text-main tabular-nums">{value}</strong>
      </div>
    </div>
  );
}
