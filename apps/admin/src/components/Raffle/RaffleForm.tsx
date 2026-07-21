import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  DollarSign,
  Film,
  Gift,
  Hash,
  Image as ImageIcon,
  Layers,
  KeyRound,
  Loader2,
  PlusCircle,
  Ticket,
  Trash2,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import { apiRaffles, apiUpload } from "../../api";
import { Raffle, RaffleGalleryItem, RafflePrize } from "../../types";
import { extractFramesFromVideo } from "../../utils/video";
import { NexusInput, NexusSelect, NexusTextarea } from "../ui/NexusInputs";
import { NexusAutonomousButton, NexusCardButton, NexusSectionButton } from "../ui/NexusButton";
import { NexusInlineNotice } from "../ui/NexusInlineNotice";
import { NexusSegmentedControl } from "../ui/NexusSegmentedControl";
import { NexusSection } from "../ui/NexusSection";
import { NexusSwitch } from "../ui/NexusSwitch";
import { InteractionStage } from "../ui/InteractionStage";
import { UploadPreviewOverlay } from "../ui/UploadPreviewOverlay";

interface RaffleFormProps {
  initialData?: Raffle;
  onCancel: () => void;
  onSave: () => void;
  onValidationChange?: (isValid: boolean) => void;
  showToast: (message: string, type?: "success" | "error") => void;
}

type RaffleType = "SIMPLE" | "OPPORTUNITIES";
type PrizeShippingPolicy = "" | "INCLUDED" | "WINNER_PAYS";
type GalleryItem = Pick<RaffleGalleryItem, "filePath" | "fileType" | "posterPath">;
type PrizeItem = Pick<RafflePrize, "title" | "description" | "winnerRule">;
type SuggestedThumbnail = { blob: Blob; url: string };

const MAX_GALLERY_ITEMS = 10;
const MAX_PRIZES = 10;

const createEmptyPrize = (): PrizeItem => ({ title: "", description: "", winnerRule: "" });

const formatPrizePosition = (index: number) => index === 0 ? "1.er lugar" : `${index + 1}.º lugar`;

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const RaffleForm: React.FC<RaffleFormProps> = ({
  initialData,
  onSave,
  onValidationChange,
  showToast,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [raffleType, setRaffleType] = useState<RaffleType>(
    initialData && initialData.opportunities > 1 ? "OPPORTUNITIES" : "SIMPLE",
  );
  const [ticketQuantity, setTicketQuantity] = useState(initialData?.ticketQuantity?.toString() ?? "");
  const [opportunities, setOpportunities] = useState(initialData?.opportunities?.toString() ?? "1");
  const [distribution, setDistribution] = useState<"LINEAR" | "RANDOM">(
    initialData?.distribution ?? "LINEAR",
  );
  const [ticketPrice, setTicketPrice] = useState(initialData?.ticketPrice?.toString() ?? "");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [prizeShippingPolicy, setPrizeShippingPolicy] = useState<PrizeShippingPolicy>(
    initialData?.prizeShippingPolicy ?? "",
  );
  const [drawDate, setDrawDate] = useState(
    initialData?.drawDate ? new Date(initialData.drawDate).toISOString().split("T")[0] : "",
  );
  const [status, setStatus] = useState<Raffle["status"]>(initialData?.status ?? "ACTIVE");
  const [winningNumber, setWinningNumber] = useState(initialData?.winningNumber ?? "");
  const [participationStartsAt, setParticipationStartsAt] = useState(
    toDateTimeLocalValue(initialData?.participationStartsAt),
  );
  const [participationEndsAt, setParticipationEndsAt] = useState(
    toDateTimeLocalValue(initialData?.participationEndsAt),
  );
  const [earlyAccessEnabled, setEarlyAccessEnabled] = useState(initialData?.earlyAccessEnabled ?? false);
  const [earlyAccessCode, setEarlyAccessCode] = useState("");
  const [imageUrl, setImageUrl] = useState(initialData?.image ?? "");
  const [coverMediaType, setCoverMediaType] = useState<"PHOTO" | "VIDEO">(
    initialData?.imageType ?? "PHOTO",
  );
  const [staticThumbUrl, setStaticThumbUrl] = useState(initialData?.imagePoster ?? "");
  const [staticThumbFile, setStaticThumbFile] = useState<File | null>(null);
  const [suggestedThumbs, setSuggestedThumbs] = useState<SuggestedThumbnail[]>([]);
  const [isGeneratingThumbs, setIsGeneratingThumbs] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>(initialData?.gallery ?? []);
  const [prizes, setPrizes] = useState<PrizeItem[]>(() => {
    if (initialData?.prizes?.length) {
      return initialData.prizes.map((prize) => ({
        title: prize.title,
        description: prize.description,
        winnerRule: prize.winnerRule ?? "",
      }));
    }
    return [createEmptyPrize()];
  });

  const coverInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const autoExtractedCoverRef = useRef<string | null>(null);
  const hasActiveSales = Boolean(
    initialData && ((initialData.ticketStats?.paid ?? 0) > 0 || (initialData.ticketStats?.pending ?? 0) > 0),
  );

  const universePreview = useMemo(() => {
    const quantity = Number.parseInt(ticketQuantity, 10) || 0;
    const chances = raffleType === "SIMPLE" ? 1 : Number.parseInt(opportunities, 10) || 0;
    const total = quantity * chances;

    if (total <= 0) return null;

    const isPowerOfTen = total >= 10 && /^10*$/.test(String(total));
    const isPowerOfTenMinusOne = total >= 99 && /^10*$/.test(String(total + 1));
    const isValid = raffleType === "SIMPLE"
      ? total >= 100 && isPowerOfTen
      : isPowerOfTen || isPowerOfTenMinusOne;
    const digits = isPowerOfTen ? Math.log10(total) : String(total).length;
    const pad = (value: number) => String(value).padStart(digits, "0");
    const start = isPowerOfTen ? 0 : 1;

    return {
      total,
      digits,
      start: pad(start),
      end: pad(isPowerOfTen ? total - 1 : total),
      startsAtZero: isPowerOfTen,
      isValid,
    };
  }, [opportunities, raffleType, ticketQuantity]);

  const isUniverseValid = Boolean(
    universePreview?.isValid &&
      (raffleType === "SIMPLE" || (Number.parseInt(opportunities, 10) || 0) >= 2),
  );

  const universeGuidance = useMemo(() => {
    if (!universePreview || universePreview.isValid) return null;

    const quantity = Number.parseInt(ticketQuantity, 10) || 0;
    const chances = raffleType === "SIMPLE" ? 1 : Number.parseInt(opportunities, 10) || 0;
    if (quantity <= 0 || chances <= 0) return null;

    const validUniverses = [99, 100, 999, 1000, 9999, 10000, 99999, 100000];
    const formatNumber = (value: number) => value.toLocaleString("es-MX");
    const currentDigits = String(universePreview.total).length;
    const nextNaturalLimit = 10 ** currentDigits - 1;
    const previousNaturalLimit = 10 ** (currentDigits - 1) - 1;
    const gapMessage = universePreview.total < 99
      ? `Un universo de ${formatNumber(universePreview.total)} no completa el primer rango válido: 01–99.`
      : currentDigits >= 3 && universePreview.total > previousNaturalLimit
        ? `El universo rebasa el rango 00–${formatNumber(previousNaturalLimit)} y deja sin asignar los números ${formatNumber(universePreview.total + 1)}–${formatNumber(nextNaturalLimit)}.`
      : universePreview.total < nextNaturalLimit
        ? `Quedarían sin asignar los números ${formatNumber(universePreview.total + 1)}–${formatNumber(nextNaturalLimit)}.`
        : `El universo no forma un rango completo de ${currentDigits} cifras.`;

    if (raffleType === "SIMPLE") {
      const closest = validUniverses
        .filter((universe) => /^10*$/.test(String(universe)))
        .slice()
        .sort((left, right) => Math.abs(left - quantity) - Math.abs(right - quantity))
        .slice(0, 2)
        .map(formatNumber)
        .join(" o ");
      const zeroMessage = universePreview.total === 99
        ? "El 00 quedaría fuera, aunque pertenece naturalmente al rango 00–99."
        : "Una rifa simple debe incluir todos los números del rango, incluido el cero.";
      return `${zeroMessage} Usa ${closest} boletos para formar un universo cerrado.`;
    }

    const sameTicketOption = validUniverses
      .map((universe) => ({ universe, opportunities: universe / quantity }))
      .filter((option) => Number.isInteger(option.opportunities) && option.opportunities >= 2)
      .sort((left, right) => Math.abs(left.opportunities - chances) - Math.abs(right.opportunities - chances))[0];
    const sameOpportunityOption = validUniverses
      .map((universe) => ({ universe, tickets: universe / chances }))
      .filter((option) => Number.isInteger(option.tickets) && option.tickets > 0)
      .sort((left, right) => Math.abs(left.tickets - quantity) - Math.abs(right.tickets - quantity))[0];

    const suggestions = [
      sameTicketOption && `conserva ${formatNumber(quantity)} boletos y usa ${formatNumber(sameTicketOption.opportunities)} oportunidades (${formatNumber(sameTicketOption.universe)})`,
      sameOpportunityOption && `conserva ${formatNumber(chances)} oportunidades y usa ${formatNumber(sameOpportunityOption.tickets)} boletos (${formatNumber(sameOpportunityOption.universe)})`,
    ].filter(Boolean);

    return suggestions.length
      ? `${gapMessage} Puedes ${suggestions.join("; o ")}.`
      : `${gapMessage} Ajusta boletos u oportunidades hasta llegar a 99, 100, 999, 1000 o un nivel equivalente.`;
  }, [opportunities, raffleType, ticketQuantity, universePreview]);

  const hasCompleteParticipationWindow = Boolean(participationStartsAt) === Boolean(participationEndsAt);
  const hasValidParticipationWindow = !participationStartsAt || (
    new Date(participationStartsAt).getTime() < new Date(participationEndsAt).getTime()
  );
  const hasEarlyAccessCode = !earlyAccessEnabled || Boolean(
    earlyAccessCode.trim() || initialData?.earlyAccessConfigured,
  );
  const isFormValid = Boolean(title.trim())
    && Number.parseFloat(ticketPrice) > 0
    && Boolean(prizeShippingPolicy)
    && isUniverseValid
    && hasCompleteParticipationWindow
    && hasValidParticipationWindow
    && (!earlyAccessEnabled || Boolean(participationStartsAt))
    && hasEarlyAccessCode
    && prizes.length > 0
    && prizes.every((prize) => prize.title.trim() && prize.description.trim());

  useEffect(() => {
    onValidationChange?.(isFormValid);
  }, [isFormValid, onValidationChange]);

  useEffect(() => {
    if (
      !imageUrl ||
      coverMediaType !== "VIDEO" ||
      coverFile ||
      suggestedThumbs.length > 0 ||
      isGeneratingThumbs ||
      autoExtractedCoverRef.current === imageUrl
    ) return;

    autoExtractedCoverRef.current = imageUrl;
    setIsGeneratingThumbs(true);
    void extractFramesFromVideo(imageUrl, 3)
      .then((frames) => {
        setSuggestedThumbs(frames);
      })
      .catch((error) => console.info("No se pudieron extraer fotogramas de la portada.", error))
      .finally(() => {
        setIsGeneratingThumbs(false);
      });
  }, [coverFile, coverMediaType, imageUrl, isGeneratingThumbs, suggestedThumbs.length]);

  const handleCoverChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isVideoFile = file.type.startsWith("video/");
    setCoverFile(file);
    setImageUrl(URL.createObjectURL(file));
    setCoverMediaType(isVideoFile ? "VIDEO" : "PHOTO");
    setStaticThumbUrl("");
    setStaticThumbFile(null);
    setSuggestedThumbs([]);
    autoExtractedCoverRef.current = null;

    if (!isVideoFile) return;

    setIsGeneratingThumbs(true);
    try {
      const frames = await extractFramesFromVideo(file, 3);
      setSuggestedThumbs(frames);
      if (frames.length >= 2) {
        const defaultFrame = frames[1];
        setStaticThumbUrl(defaultFrame.url);
        setStaticThumbFile(
          new File([defaultFrame.blob], "raffle-thumbnail.jpg", { type: "image/jpeg" }),
        );
      }
    } catch (error) {
      console.info("Se usara el poster automatico del servidor.", error);
    } finally {
      setIsGeneratingThumbs(false);
    }
  };

  const selectSuggestedThumb = (frame: SuggestedThumbnail) => {
    setStaticThumbUrl(frame.url);
    setStaticThumbFile(
      new File([frame.blob], "raffle-thumbnail.jpg", { type: "image/jpeg" }),
    );
  };

  const handleThumbUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setStaticThumbUrl(URL.createObjectURL(file));
    setStaticThumbFile(file);
  };

  const handleGalleryChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = event.target.files ? Array.from(event.target.files) : [];
    const availableSlots = MAX_GALLERY_ITEMS - gallery.length;
    const selectedFiles = files.slice(0, availableSlots);
    event.target.value = "";

    if (files.length > availableSlots && availableSlots > 0) {
      showToast(
        `La galería admite hasta ${MAX_GALLERY_ITEMS} medios. Se agregarán los primeros ${availableSlots}.`,
        "error",
      );
    }

    if (!selectedFiles.length) {
      if (files.length) showToast(`La galería admite hasta ${MAX_GALLERY_ITEMS} medios.`, "error");
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await Promise.all(
        selectedFiles.map(async (file) => {
          const response = await apiUpload.upload(file);
          return {
            filePath: response.url,
            fileType: file.type.startsWith("video/") ? "VIDEO" : "PHOTO",
            posterPath: response.posterUrl,
          } satisfies GalleryItem;
        }),
      );
      setGallery((current) => [...current, ...uploaded]);
    } catch (error) {
      console.error(error);
      showToast("No se pudo subir un medio de la galería.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const removeGalleryItem = (index: number) => {
    setGallery((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const updatePrize = (index: number, changes: Partial<PrizeItem>) => {
    setPrizes((current) => current.map((prize, prizeIndex) => (
      prizeIndex === index ? { ...prize, ...changes } : prize
    )));
  };

  const addPrize = () => {
    if (prizes.length >= MAX_PRIZES) return;
    setPrizes((current) => [...current, createEmptyPrize()]);
  };

  const removePrize = (index: number) => {
    if (prizes.length === 1) return;
    setPrizes((current) => current.filter((_, prizeIndex) => prizeIndex !== index));
  };

  const movePrize = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= prizes.length) return;
    setPrizes((current) => {
      const reordered = [...current];
      [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
      return reordered;
    });
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let finalImageUrl = imageUrl;
      let finalImageType = coverMediaType;
      let finalImagePoster = staticThumbUrl || null;
      let coverPosterAssetId: string | undefined;
      if (coverFile) {
        const response = await apiUpload.upload(coverFile);
        finalImageUrl = response.url;
        finalImageType = response.type;
        finalImagePoster = response.posterUrl;
      }
      if (finalImageType === "VIDEO" && staticThumbFile) {
        const thumbnail = await apiUpload.upload(staticThumbFile);
        coverPosterAssetId = thumbnail.assetId;
        finalImagePoster = thumbnail.url;
      }

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        ticketPrice: Number.parseFloat(ticketPrice),
        ticketQuantity: Number.parseInt(ticketQuantity, 10),
        opportunities: raffleType === "SIMPLE" ? 1 : Number.parseInt(opportunities, 10),
        distribution,
        drawDate: drawDate ? new Date(drawDate).toISOString() : null,
        participationStartsAt: participationStartsAt ? new Date(participationStartsAt).toISOString() : null,
        participationEndsAt: participationEndsAt ? new Date(participationEndsAt).toISOString() : null,
        earlyAccessEnabled,
        earlyAccessCode: earlyAccessCode.trim() || undefined,
        clearEarlyAccessCode: !earlyAccessEnabled,
        image: finalImageUrl || null,
        imageType: finalImageType,
        imagePoster: finalImageType === "VIDEO" ? finalImagePoster : null,
        ...(coverPosterAssetId ? { coverPosterAssetId } : {}),
        prizeShippingPolicy,
        prizes: prizes.map((prize) => ({
          title: prize.title.trim(),
          description: prize.description.trim(),
          winnerRule: prize.winnerRule?.trim() || null,
        })),
        gallery,
        status,
        winningNumber: status === "FINISHED" ? winningNumber.trim() || null : null,
      };

      if (initialData?.id) {
        await apiRaffles.update(initialData.id, payload);
      } else {
        await apiRaffles.create(payload);
      }
      onSave();
    } catch (error) {
      console.error(error);
      showToast("No se pudo guardar la rifa. Inténtalo de nuevo.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form id="raffle-form" onSubmit={handleSubmit} className="pb-32">
      <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: "var(--space-lg)" }}>
        <div className="lg:col-span-7 flex flex-col" style={{ gap: "var(--space-lg)" }}>
          <div className="w-full">
            {!imageUrl ? (
              <InteractionStage
                level={1}
                size="normal"
                className="aspect-video w-full shadow-sm"
                icon={Upload}
                title="Portada de la Rifa"
                description="Imagen o video principal que verán los participantes."
                onClick={() => coverInputRef.current?.click()}
              />
            ) : (
              <div
                className="group relative aspect-video w-full overflow-hidden shadow-xl shadow-stone-200/40 cursor-pointer transition-all duration-500 active:scale-[0.995]"
                style={{ borderRadius: "var(--radius-outer)" }}
                onClick={() => coverInputRef.current?.click()}
              >
                {coverMediaType === "VIDEO" ? (
                  <video
                    src={imageUrl}
                    poster={staticThumbUrl || undefined}
                    className="h-full w-full object-cover"
                    muted
                    autoPlay
                    loop
                    playsInline
                  />
                ) : (
                  <img src={imageUrl} className="h-full w-full object-cover" alt="Portada de la rifa" />
                )}
                <UploadPreviewOverlay label="Cambiar Portada" />
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between"
                  style={{ padding: "var(--padding-inner)" }}
                >
                  <div className="pointer-events-auto">
                    <NexusAutonomousButton
                      type="button"
                      variant="ghost"
                      icon={coverMediaType === "VIDEO" ? Film : ImageIcon}
                      className="pointer-events-none border border-white/10 bg-black/40 text-white shadow-none backdrop-blur-md"
                    >
                      {coverMediaType === "VIDEO" ? "Video" : "Foto"}
                    </NexusAutonomousButton>
                  </div>
                  <div className="pointer-events-auto">
                    <NexusAutonomousButton
                      type="button"
                      variant="ghost"
                      isIconOnly
                      icon={X}
                      aria-label="Eliminar portada"
                      className="border border-white/10 bg-black/40 text-white shadow-none backdrop-blur-md hover:bg-rose-500"
                      onClick={(event) => {
                        event.stopPropagation();
                        setImageUrl("");
                        setCoverFile(null);
                        setCoverMediaType("PHOTO");
                        setStaticThumbUrl("");
                        setStaticThumbFile(null);
                        setSuggestedThumbs([]);
                        autoExtractedCoverRef.current = null;
                        if (coverInputRef.current) coverInputRef.current.value = "";
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            <input ref={coverInputRef} className="hidden" type="file" accept="image/*,video/*" onChange={handleCoverChange} />
          </div>

          {coverMediaType === "VIDEO" && imageUrl && (
            <NexusSection
              title="Miniatura del Video"
              subtitle="Selecciona el fotograma para la cartelera"
              icon={ImageIcon}
              iconVariant="brand"
            >
              <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5" style={{ gap: "var(--space-md)" }}>
                  {suggestedThumbs.map((frame, index) => (
                    <button
                      key={frame.url}
                      type="button"
                      onClick={() => selectSuggestedThumb(frame)}
                      className={`group relative aspect-video overflow-hidden border-2 transition-all duration-300 ${
                        staticThumbUrl === frame.url
                          ? "border-brand-500 ring-4 ring-brand-500/10 scale-[1.02]"
                          : "border-border-main opacity-60 hover:border-brand-200 hover:opacity-100"
                      }`}
                      style={{ borderRadius: "var(--radius-inner-visual)" }}
                    >
                      <img src={frame.url} className="h-full w-full object-cover" alt={`Opción ${index + 1}`} />
                      {staticThumbUrl === frame.url && (
                        <span className="absolute inset-0 flex items-center justify-center bg-brand-500/10">
                          <span
                            className="bg-brand-500 text-white shadow-lg"
                            style={{ padding: "var(--space-xs)", borderRadius: "var(--radius-nested-simple)" }}
                          >
                            <Check size={12} strokeWidth={4} />
                          </span>
                        </span>
                      )}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => thumbInputRef.current?.click()}
                    className={`group relative aspect-video overflow-hidden border-2 border-dashed flex flex-col items-center justify-center transition-all duration-300 ${
                      staticThumbUrl && !suggestedThumbs.some((frame) => frame.url === staticThumbUrl)
                        ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                        : "border-border-main/60 bg-bg-muted/20 text-text-muted hover:border-brand-300/50 hover:bg-brand-50/20"
                    }`}
                    style={{ borderRadius: "var(--radius-inner-visual)", gap: "var(--space-xs)" }}
                  >
                    {staticThumbUrl && !suggestedThumbs.some((frame) => frame.url === staticThumbUrl) ? (
                      <>
                        <img src={staticThumbUrl} className="absolute inset-0 h-full w-full object-cover opacity-20" alt="Miniatura manual" />
                        <Check size={16} className="z-10" />
                        <span className="z-10 text-label uppercase tracking-[0.15em]">
                          {staticThumbFile ? "Manual" : "Actual"}
                        </span>
                      </>
                    ) : (
                      <>
                        <span
                          className="bg-stone-100 text-stone-400 transition-colors group-hover:bg-brand-100 group-hover:text-brand-500"
                          style={{ borderRadius: "var(--radius-nested-simple)", padding: "var(--space-sm)" }}
                        >
                          {isGeneratingThumbs ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                        </span>
                        <span className="text-label uppercase tracking-[0.15em]">Manual</span>
                      </>
                    )}
                  </button>
                </div>
                <input ref={thumbInputRef} className="hidden" type="file" accept="image/*" onChange={handleThumbUpload} />
              </div>
            </NexusSection>
          )}

          <NexusSection
            title="Galería Adicional"
            subtitle={`Medios secundarios de la rifa. Máximo ${MAX_GALLERY_ITEMS}.`}
            icon={Layers}
            iconVariant="brand"
          >
            <input
              ref={galleryInputRef}
              className="hidden"
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleGalleryChange}
            />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6" style={{ gap: "var(--space-md)" }}>
              {gallery.map((item, index) => (
                <div
                  key={`${item.filePath}-${index}`}
                  className="group relative aspect-square overflow-hidden border border-border-main bg-bg-muted"
                  style={{ borderRadius: "var(--radius-inner-visual)" }}
                >
                  {item.fileType === "VIDEO" ? (
                    item.posterPath ? (
                      <img src={item.posterPath} className="h-full w-full object-cover" alt={`Video ${index + 1}`} />
                    ) : (
                      <video
                        src={item.filePath}
                        className="h-full w-full object-cover"
                        preload="metadata"
                        muted
                        playsInline
                        onLoadedMetadata={(event) => {
                          const video = event.currentTarget;
                          if (!Number.isFinite(video.duration) || video.duration <= 0) return;
                          video.currentTime = Math.min(Math.max(video.duration * 0.2, 0.2), 5);
                        }}
                      />
                    )
                  ) : (
                    <img src={item.filePath} className="h-full w-full object-cover" alt={`Medio ${index + 1}`} />
                  )}
                  {item.fileType === "VIDEO" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                      <Film size={18} />
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label={`Eliminar medio ${index + 1}`}
                    onClick={() => removeGalleryItem(index)}
                    className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-rose-500 text-white"
                    style={{
                      top: "var(--space-xs)",
                      right: "var(--space-xs)",
                      padding: "var(--space-sm)",
                      borderRadius: "var(--radius-nested-simple)",
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {gallery.length < MAX_GALLERY_ITEMS && (
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={isUploading}
                  className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-border-main/60 bg-bg-muted/20 text-text-muted transition-colors hover:border-brand-300 hover:bg-brand-50/20"
                  style={{ gap: "var(--space-xs)", borderRadius: "var(--radius-inner-visual)" }}
                >
                  {isUploading ? <Loader2 className="animate-spin" size={20} /> : <PlusCircle size={20} />}
                  <span className="text-label uppercase tracking-[0.15em]">Añadir</span>
                </button>
              )}
            </div>
          </NexusSection>

          <NexusSection
            title="Configuración del Universo"
            subtitle="Define los folios, oportunidades y costo de participación."
            icon={Hash}
            iconVariant="brand"
          >
            <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
              <div className="grid grid-cols-1" style={{ gap: "var(--space-md)" }}>
                <NexusInput
                  label="Número de Boletos (Folios) *"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  required
                  disabled={hasActiveSales}
                  value={ticketQuantity}
                  onChange={(event) => setTicketQuantity(event.target.value)}
                  placeholder="Ej. 100"
                />
              </div>

              {raffleType === "OPPORTUNITIES" && (
                <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "var(--space-md)" }}>
                  <NexusInput
                    label="Oportunidades por Boleto *"
                    type="number"
                    inputMode="numeric"
                    min="2"
                    required
                    disabled={hasActiveSales}
                    value={opportunities}
                    onChange={(event) => setOpportunities(event.target.value)}
                    placeholder="Mínimo 2"
                  />
                  <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
                    <span className="text-label uppercase tracking-[0.15em] text-text-muted">Distribución</span>
                    <NexusSegmentedControl
                      context="section"
                      value={distribution}
                      ariaLabel="Distribución de oportunidades"
                      onChange={setDistribution}
                      className="grid h-[var(--h-input)] grid-cols-2"
                      options={[
                        { value: "LINEAR", label: "Lineal", activeClassName: "bg-bg-card text-brand-600 border border-border-main shadow-sm" },
                        { value: "RANDOM", label: "Aleatoria", activeClassName: "bg-bg-card text-brand-600 border border-border-main shadow-sm" },
                      ]}
                    />
                  </div>
                </div>
              )}

              <NexusInlineNotice
                variant={universePreview?.isValid ? "success" : universePreview ? "warning" : "neutral"}
                icon={universePreview?.isValid ? Check : universePreview ? undefined : Hash}
                title={
                  universePreview?.isValid
                    ? "Universo cerrado"
                    : universePreview
                      ? "Universo no válido"
                      : "Configuración del Universo"
                }
                style={{
                  minHeight: "calc(var(--h-input) + var(--space-xl))",
                }}
              >
                {universePreview?.isValid
                  ? `El rango ${universePreview.start}–${universePreview.end} queda completamente asignado.`
                  : universeGuidance ?? "Ingresa el número de boletos y oportunidades para validar el universo."}
              </NexusInlineNotice>

            </div>
          </NexusSection>
        </div>

        <div className="lg:col-span-5 flex flex-col" style={{ gap: "var(--space-lg)" }}>
          <NexusSection
            title="Detalles de la Rifa"
            subtitle="Información que se mostrará a los participantes."
            icon={Ticket}
            iconVariant="brand"
          >
            <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
              <div className="grid grid-cols-2" style={{ gap: "var(--space-md)" }}>
                <button
                  type="button"
                  onClick={() => {
                    setRaffleType("SIMPLE");
                    setOpportunities("1");
                  }}
                  className={`flex items-center justify-center border-2 text-label uppercase tracking-[0.15em] transition-colors ${
                    raffleType === "SIMPLE"
                      ? "border-brand-500 bg-brand-50/30 text-brand-600 shadow-sm shadow-brand-500/10"
                      : "border-border-main bg-bg-card text-text-muted hover:border-brand-300 hover:bg-bg-muted"
                  }`}
                  style={{ gap: "var(--space-xs)", height: "var(--h-input)", borderRadius: "var(--radius-inner-visual)" }}
                >
                  <Ticket size={14} strokeWidth={2.5} /> Simple
                </button>
                <button
                  type="button"
                  onClick={() => setRaffleType("OPPORTUNITIES")}
                  className={`flex items-center justify-center border-2 text-label uppercase tracking-[0.15em] transition-colors ${
                    raffleType === "OPPORTUNITIES"
                      ? "border-brand-500 bg-brand-50/30 text-brand-600 shadow-sm shadow-brand-500/10"
                      : "border-border-main bg-bg-card text-text-muted hover:border-brand-300 hover:bg-bg-muted"
                  }`}
                  style={{ gap: "var(--space-xs)", height: "var(--h-input)", borderRadius: "var(--radius-inner-visual)" }}
                >
                  <Layers size={14} strokeWidth={2.5} /> Oportunidades
                </button>
              </div>

              <NexusInput
                label="Título de la Rifa *"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ej. Gran Rifa Semental Hatch"
              />
              <NexusInput
                label="Precio por Boleto *"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                required
                icon={DollarSign}
                value={ticketPrice}
                onChange={(event) => setTicketPrice(event.target.value)}
                placeholder="0.00"
              />
              <NexusTextarea
                label="Descripción"
                rows={6}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe el premio, las bases del sorteo y cualquier información importante."
              />
              <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
                <span className="text-label uppercase tracking-[0.15em] text-text-muted">
                  Envío del Premio *
                </span>
                <NexusSegmentedControl
                  context="section"
                  value={prizeShippingPolicy}
                  ariaLabel="Política de envío del premio"
                  onChange={setPrizeShippingPolicy}
                  className="grid h-[var(--h-input)] grid-cols-2"
                  options={[
                    {
                      value: "INCLUDED",
                      label: "Envío incluido",
                      activeClassName: "bg-bg-card text-brand-600 border border-border-main shadow-sm",
                    },
                    {
                      value: "WINNER_PAYS",
                      label: "A cargo del ganador",
                      activeClassName: "bg-bg-card text-brand-600 border border-border-main shadow-sm",
                    },
                  ]}
                />
              </div>
              <NexusInput
                label="Fecha de la Rifa"
                icon={Calendar}
                type="date"
                value={drawDate}
                onChange={(event) => setDrawDate(event.target.value)}
              />
              <NexusSelect label="Estado Actual" value={status} onChange={(event) => setStatus(event.target.value as Raffle["status"])}>
                <option value="ACTIVE">Activa</option>
                <option value="FINISHED">Finalizada</option>
                <option value="CANCELLED">Cancelada</option>
              </NexusSelect>
              {status === "FINISHED" && (
                <NexusInput
                  label="Número Ganador"
                  icon={Trophy}
                  inputMode="numeric"
                  value={winningNumber}
                  onChange={(event) => setWinningNumber(event.target.value.replace(/\D/g, ""))}
                  placeholder={`Ej. ${"0".repeat(Math.max(1, universePreview?.digits ?? 3))}`}
                  maxLength={universePreview?.digits}
                  helperText="Al guardar un número válido, el resultado se publicará en el Storefront."
                />
              )}

              {hasActiveSales && (
                <div
                  className="flex items-center border border-amber-200 bg-amber-50 text-amber-800"
                  style={{ gap: "var(--space-sm)", padding: "var(--space-md)", borderRadius: "var(--radius-inner-visual)" }}
                >
                  <Check size={16} />
                  <span className="text-secondary">El universo queda bloqueado mientras existan boletos activos.</span>
                </div>
              )}
            </div>
          </NexusSection>

          <NexusSection
            title="Premios por Lugar"
            subtitle="Especifica con claridad qué recibe cada lugar de la rifa."
            icon={Gift}
            iconVariant="brand"
            action={
              prizes.length < MAX_PRIZES ? (
                <NexusSectionButton type="button" icon={PlusCircle} onClick={addPrize}>
                  Añadir Premio
                </NexusSectionButton>
              ) : undefined
            }
            actionPlacement="below"
          >
            <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
              {prizes.map((prize, index) => (
                <div
                  key={`prize-${index}`}
                  className="border border-border-main bg-bg-muted"
                  style={{
                    borderRadius: "var(--radius-inner-visual)",
                    padding: "var(--padding-inner)",
                  }}
                >
                  <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
                    <div className="flex items-center justify-between" style={{ gap: "var(--space-md)" }}>
                      <div className="min-w-0">
                        <span className="text-label uppercase tracking-[0.15em] text-text-muted">Lugar</span>
                        <h4 className="text-h2 text-text-main">{formatPrizePosition(index)}</h4>
                      </div>
                      <div className="flex shrink-0" style={{ gap: "var(--space-xs)" }}>
                        <NexusCardButton
                          type="button"
                          variant="secondary"
                          isIconOnly
                          icon={ChevronUp}
                          title="Subir premio"
                          aria-label={`Subir ${formatPrizePosition(index)}`}
                          disabled={index === 0}
                          onClick={() => movePrize(index, -1)}
                        />
                        <NexusCardButton
                          type="button"
                          variant="secondary"
                          isIconOnly
                          icon={ChevronDown}
                          title="Bajar premio"
                          aria-label={`Bajar ${formatPrizePosition(index)}`}
                          disabled={index === prizes.length - 1}
                          onClick={() => movePrize(index, 1)}
                        />
                        <NexusCardButton
                          type="button"
                          variant="secondary"
                          isIconOnly
                          icon={Trash2}
                          title="Eliminar premio"
                          aria-label={`Eliminar ${formatPrizePosition(index)}`}
                          disabled={prizes.length === 1}
                          className="hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => removePrize(index)}
                        />
                      </div>
                    </div>

                    <NexusInput
                      label="Premio *"
                      value={prize.title}
                      maxLength={120}
                      onChange={(event) => updatePrize(index, { title: event.target.value })}
                      placeholder="Ej. Percha completa de diez pollos"
                    />
                    <NexusTextarea
                      label="Descripción del Premio *"
                      rows={4}
                      maxLength={1000}
                      value={prize.description}
                      onChange={(event) => updatePrize(index, { description: event.target.value })}
                      placeholder="Detalla exactamente qué recibe el ganador de este lugar."
                    />
                    <NexusTextarea
                      label="Criterio de Asignación"
                      rows={3}
                      maxLength={500}
                      value={prize.winnerRule ?? ""}
                      onChange={(event) => updatePrize(index, { winnerRule: event.target.value })}
                      placeholder="Ej. Se asigna al boleto que coincida con los últimos tres dígitos del Premio Mayor."
                      helperText="Opcional. Úsalo cuando este lugar tenga una regla distinta o requiera una aclaración adicional."
                    />
                  </div>
                </div>
              ))}
            </div>
          </NexusSection>

          <NexusSection
            title="Disponibilidad de la Participación"
            subtitle="Programa cuándo pueden apartarse boletos y habilita accesos anticipados."
            icon={Clock3}
            iconVariant="brand"
          >
            <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "var(--space-md)" }}>
                <NexusInput
                  label="Inicio de la Participación"
                  type="datetime-local"
                  value={participationStartsAt}
                  onChange={(event) => setParticipationStartsAt(event.target.value)}
                />
                <NexusInput
                  label="Cierre de la Participación"
                  type="datetime-local"
                  value={participationEndsAt}
                  onChange={(event) => setParticipationEndsAt(event.target.value)}
                />
              </div>

              <div
                className="flex items-center justify-between border border-border-main bg-bg-muted"
                style={{
                  gap: "var(--space-md)",
                  padding: "var(--padding-inner)",
                  borderRadius: "var(--radius-inner-visual)",
                }}
              >
                <div className="flex min-w-0 flex-col" style={{ gap: "var(--space-xs)" }}>
                  <span className="text-secondary font-bold text-text-main">Acceso anticipado</span>
                  <span className="text-label text-text-muted">
                    Permite participar antes del inicio mediante un código privado.
                  </span>
                </div>
                <NexusSwitch
                  checked={earlyAccessEnabled}
                  onChange={setEarlyAccessEnabled}
                  aria-label="Activar acceso anticipado"
                />
              </div>

              {earlyAccessEnabled && (
                <NexusInput
                  label={initialData?.earlyAccessConfigured ? "Nuevo Código de Acceso" : "Código de Acceso *"}
                  type="password"
                  icon={KeyRound}
                  value={earlyAccessCode}
                  onChange={(event) => setEarlyAccessCode(event.target.value)}
                  placeholder={initialData?.earlyAccessConfigured ? "Déjalo vacío para conservar el actual" : "Mínimo 4 caracteres"}
                  minLength={4}
                  required={!initialData?.earlyAccessConfigured}
                  helperText="Compártelo solo con las personas que podrán participar antes de la apertura pública."
                />
              )}

              <NexusInlineNotice
                variant={!hasCompleteParticipationWindow || !hasValidParticipationWindow ? "warning" : "neutral"}
                icon={Clock3}
                title="Periodo de Participación"
              >
                {!hasCompleteParticipationWindow
                  ? "Define tanto el inicio como el cierre para programar la participación."
                  : !hasValidParticipationWindow
                    ? "El cierre debe ser posterior al inicio."
                    : participationStartsAt
                      ? "La rifa será visible antes de abrir. Al llegar la fecha, la participación pública se habilitará automáticamente."
                      : "Sin fechas, la participación estará disponible inmediatamente mientras la rifa esté publicada y activa."}
              </NexusInlineNotice>
            </div>
          </NexusSection>

          {universePreview && (
            <NexusSection
              title="Resumen del Universo"
              subtitle="Referencia automática de los folios que se generarán."
              icon={Hash}
              iconVariant="muted"
            >
              <div className="grid grid-cols-2" style={{ gap: "var(--space-md)" }}>
                {[
                  ["Universo", universePreview.total.toLocaleString()],
                  ["Rango", `${universePreview.start} - ${universePreview.end}`],
                  ["Cifras", universePreview.digits.toString()],
                  ["Inicio", universePreview.startsAtZero ? "Cero" : "Uno"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-col border border-border-main bg-bg-muted"
                    style={{ gap: "var(--space-xs)", padding: "var(--padding-inner)", borderRadius: "var(--radius-inner-visual)" }}
                  >
                    <span className="text-label uppercase tracking-[0.15em] text-text-muted">{label}</span>
                    <span className="text-h2 tabular-nums text-text-main">{value}</span>
                  </div>
                ))}
              </div>
            </NexusSection>
          )}
        </div>
      </div>

      {isSubmitting && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ backgroundColor: "var(--modal-backdrop)" }}>
          <div
            className="flex flex-col items-center border border-border-main bg-bg-card shadow-2xl"
            style={{ gap: "var(--space-md)", padding: "var(--padding-outer)", borderRadius: "var(--radius-outer)" }}
          >
            <Loader2 className="animate-spin text-brand-500" size={32} />
            <span className="text-label uppercase tracking-[0.15em] text-text-main">Guardando Rifa</span>
          </div>
        </div>
      )}
    </form>
  );
};
