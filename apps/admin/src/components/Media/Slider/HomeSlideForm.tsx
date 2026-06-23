import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Film,
  Image as ImageIcon,
  Smartphone,
  MonitorPlay,
  PlusCircle,
  Upload,
  X,
} from "lucide-react";
import { ASSET_BASE_URL, apiHomeSlides, apiUpload } from "../../../api";
import { HomeSlide } from "../../../types";
import { NexusInput, NexusSelect, NexusTextarea } from "../../ui/NexusInputs";
import { NexusAutonomousButton } from "../../ui/NexusButton";
import { NexusSection } from "../../ui/NexusSection";
import { InteractionStage } from "../../ui/InteractionStage";
import { UploadPreviewOverlay } from "../../ui/UploadPreviewOverlay";

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

const toIsoDateValue = (value: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

const getNextSortOrder = (slides: HomeSlide[]) => {
  return slides.reduce((max, slide) => Math.max(max, slide.sortOrder), 0) + 1;
};

const getDurationSeconds = (durationMs?: number | null) => {
  return String(Math.round((durationMs ?? 8000) / 1000));
};

const FOCAL_X_OPTIONS = [
  { label: "Izquierda", value: "28%" },
  { label: "Centro", value: "50%" },
  { label: "Derecha", value: "72%" },
];

const FOCAL_Y_OPTIONS = [
  { label: "Arriba", value: "32%" },
  { label: "Superior", value: "40%" },
  { label: "Centro", value: "50%" },
  { label: "Inferior", value: "60%" },
  { label: "Abajo", value: "68%" },
];

const parseObjectPosition = (
  value?: string | null,
  fallback = "50% 50%",
) => {
  const [x = "50%", y = "50%"] = (value || fallback).split(" ");
  const normalizedX = x === "left" ? "28%" : x === "right" ? "72%" : x;
  const normalizedY =
    y === "top" ? "32%" : y === "center" ? "50%" : y === "bottom" ? "68%" : y;

  return {
    x: normalizedX === "center" ? "50%" : normalizedX,
    y: normalizedY,
  };
};

const getFullPreviewUrl = (path?: string | null) => {
  if (!path) return "";
  if (
    path.startsWith("http") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  ) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return `${ASSET_BASE_URL}${cleanPath}`;
};

interface HomeSlideFormProps {
  initialData?: HomeSlide;
  existingSlides?: HomeSlide[];
  onCancel: () => void;
  onSave: () => void;
  showToast: (message: string, type?: "success" | "error") => void;
  onValidationChange?: (isValid: boolean) => void;
}

export const HomeSlideForm = forwardRef<
  { handleSave: () => void },
  HomeSlideFormProps
>(
  (
    { initialData, existingSlides = [], onSave, showToast, onValidationChange },
    ref,
  ) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [type, setType] = useState<"PHOTO" | "VIDEO">(
      initialData?.type || "PHOTO",
    );
    const [title, setTitle] = useState(initialData?.title || "");
    const [eyebrow, setEyebrow] = useState(initialData?.eyebrow || "");
    const [description, setDescription] = useState(
      initialData?.description || "",
    );
    const initialDesktopPosition = parseObjectPosition(
      initialData?.desktopObjectPosition,
      "50% 50%",
    );
    const initialMobilePosition = parseObjectPosition(
      initialData?.mobileObjectPosition,
      "50% 44%",
    );
    const [desktopFocalX, setDesktopFocalX] = useState(
      initialDesktopPosition.x,
    );
    const [desktopFocalY, setDesktopFocalY] = useState(
      initialDesktopPosition.y,
    );
    const [mobileFocalX, setMobileFocalX] = useState(
      initialMobilePosition.x,
    );
    const [mobileFocalY, setMobileFocalY] = useState(
      initialMobilePosition.y,
    );
    const [primaryText, setPrimaryText] = useState(
      initialData?.primaryText || "Ver Catalogo",
    );
    const [primaryHref, setPrimaryHref] = useState(
      initialData?.primaryHref || "/store",
    );
    const [secondaryText, setSecondaryText] = useState(
      initialData?.secondaryText || "Explorar Rancho",
    );
    const [secondaryHref, setSecondaryHref] = useState(
      initialData?.secondaryHref || "/gallery",
    );
    const [sortOrder, setSortOrder] = useState(
      String(initialData?.sortOrder ?? getNextSortOrder(existingSlides)),
    );
    const [displayDurationSeconds, setDisplayDurationSeconds] = useState(
      getDurationSeconds(initialData?.displayDurationMs),
    );
    const active = initialData?.active ?? true;
    const [startsAt, setStartsAt] = useState(
      toDateTimeLocalValue(initialData?.startsAt),
    );
    const [endsAt, setEndsAt] = useState(
      toDateTimeLocalValue(initialData?.endsAt),
    );
    const [file, setFile] = useState<File | null>(null);
    const [assetId, setAssetId] = useState<string | null>(
      initialData?.assetId || null,
    );
    const [previewUrl, setPreviewUrl] = useState<string | null>(
      initialData?.mediaUrl || null,
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isVideoPreview = useMemo(() => {
      if (type === "VIDEO") return true;
      if (!previewUrl) return false;
      return /\.(mp4|mov|webm)(\?.*)?$/i.test(previewUrl);
    }, [previewUrl, type]);
    const fullPreviewUrl = getFullPreviewUrl(previewUrl);

    const parsedSortOrder = Number.parseInt(sortOrder, 10);
    const isSortOrderValid =
      Number.isInteger(parsedSortOrder) && parsedSortOrder >= 1;
    const parsedDisplayDurationSeconds = Number.parseInt(
      displayDurationSeconds,
      10,
    );
    const isDisplayDurationValid =
      Number.isInteger(parsedDisplayDurationSeconds) &&
      parsedDisplayDurationSeconds >= 3 &&
      parsedDisplayDurationSeconds <= 60;
    const hasDuplicateSortOrder = existingSlides.some(
      (slide) =>
        slide.id !== initialData?.id && slide.sortOrder === parsedSortOrder,
    );
    const hasInvalidDateRange =
      startsAt &&
      endsAt &&
      new Date(startsAt).getTime() > new Date(endsAt).getTime();
    const desktopObjectPosition = `${desktopFocalX} ${desktopFocalY}`;
    const mobileObjectPosition = `${mobileFocalX} ${mobileFocalY}`;
    const isFormValid =
      (!!assetId || !!file) && !!previewUrl && title.trim().length > 0 && !isSubmitting;

    useEffect(() => {
      onValidationChange?.(isFormValid);
    }, [isFormValid, onValidationChange]);

    useEffect(() => {
      return () => onValidationChange?.(false);
    }, [onValidationChange]);

    useImperativeHandle(ref, () => ({
      handleSave: () => {
        handleSubmit();
      },
    }));

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = event.target.files?.[0];
      if (!selected) return;

      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setType(selected.type.startsWith("video/") ? "VIDEO" : "PHOTO");
    };

    const handleSubmit = async () => {
      if (!isFormValid || isSubmitting) return;
      if (!isSortOrderValid) {
        showToast("El orden debe comenzar en 1.", "error");
        return;
      }
      if (hasDuplicateSortOrder) {
        showToast("Ya existe un slide con ese orden.", "error");
        return;
      }
      if (hasInvalidDateRange) {
        showToast("La fecha final debe ser posterior al inicio.", "error");
        return;
      }
      if (!isDisplayDurationValid) {
        showToast("La duracion debe estar entre 3 y 60 segundos.", "error");
        return;
      }

      setIsSubmitting(true);

      try {
        let finalAssetId = assetId;

        if (file) {
          const uploadRes = await apiUpload.upload(file);
          finalAssetId = uploadRes.assetId;
          setAssetId(uploadRes.assetId);
        }

        if (!finalAssetId) throw new Error("Selecciona un medio para el slide.");

        const payload = {
          assetId: finalAssetId,
          title: title.trim(),
          eyebrow: eyebrow.trim() || undefined,
          description: description.trim() || undefined,
          displayDurationMs: parsedDisplayDurationSeconds * 1000,
          desktopObjectPosition,
          mobileObjectPosition,
          primaryText: primaryText.trim() || undefined,
          primaryHref: primaryHref.trim() || undefined,
          secondaryText: secondaryText.trim() || undefined,
          secondaryHref: secondaryHref.trim() || undefined,
          sortOrder: parsedSortOrder,
          active,
          startsAt: toIsoDateValue(startsAt),
          endsAt: toIsoDateValue(endsAt),
        };

        if (initialData?.id) {
          await apiHomeSlides.update(initialData.id, payload);
        } else {
          await apiHomeSlides.create(payload);
        }

        onSave();
      } catch (error: any) {
        const message =
          error?.response?.data?.message || error?.message || "No se pudo guardar el slide.";
        showToast(message, "error");
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <form
        id="home-slide-form"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
        className="flex flex-col animate-in fade-in duration-700"
        style={{ gap: "var(--space-lg)", paddingBottom: "var(--space-lg)" }}
      >
        <div
          className="grid grid-cols-1 items-start lg:grid-cols-12"
          style={{ gap: "var(--space-lg)" }}
        >
          <div
            className="contents lg:col-span-7 lg:flex lg:flex-col"
            style={{ gap: "var(--space-lg)" }}
          >
            <div className="order-1 w-full">
              <div className="w-full">
                {!previewUrl ? (
                  <InteractionStage
                    level={1}
                    size="normal"
                    className="aspect-video w-full shadow-sm"
                    icon={Upload}
                    title="Medio del Slide"
                    description="Imagen o video principal para el hero (16:9 recomendado)."
                    onClick={() => fileInputRef.current?.click()}
                  />
                ) : (
                  <div
                    className="group relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center overflow-hidden shadow-xl shadow-stone-200/40 transition-all duration-500 active:scale-[0.995]"
                    style={{ borderRadius: "var(--radius-outer)" }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isVideoPreview ? (
                      <video
                        src={previewUrl}
                        className="h-full w-full object-cover"
                        muted
                        autoPlay
                        loop
                        playsInline
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        className="h-full w-full object-cover"
                        alt="Portada del slide"
                      />
                    )}

                    <UploadPreviewOverlay label="Cambiar Medio" />

                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between"
                      style={{ padding: "var(--padding-inner)" }}
                    >
                      <div className="pointer-events-auto">
                        <NexusAutonomousButton
                          type="button"
                          variant="ghost"
                          icon={isVideoPreview ? Film : ImageIcon}
                          className="pointer-events-none border border-white/10 bg-black/40 text-white shadow-none backdrop-blur-md"
                        >
                          {isVideoPreview ? "Video" : "Foto"}
                        </NexusAutonomousButton>
                      </div>

                      <div className="pointer-events-auto">
                        <NexusAutonomousButton
                          type="button"
                          variant="ghost"
                          isIconOnly
                          icon={X}
                          onClick={(event) => {
                            event.stopPropagation();
                            setFile(null);
                            setPreviewUrl(null);
                            setAssetId(null);
                            if (fileInputRef.current)
                              fileInputRef.current.value = "";
                          }}
                          className="border border-white/10 bg-black/40 text-white shadow-none backdrop-blur-md hover:bg-rose-500"
                        />
                      </div>
                    </div>

                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <NexusSection
              title="Encuadre en Computadora"
              subtitle="Ajuste del medio en el hero de escritorio"
              icon={MonitorPlay}
              iconVariant="brand"
              className="order-3"
            >
              <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
                <FocalPointControls
                  xValue={desktopFocalX}
                  yValue={desktopFocalY}
                  onXChange={setDesktopFocalX}
                  onYChange={setDesktopFocalY}
                />

                {previewUrl && (
                  <HeroPreviewFrame
                    label="Desktop"
                    mediaUrl={fullPreviewUrl}
                    isVideo={isVideoPreview}
                    objectPosition={desktopObjectPosition}
                    className="aspect-[16/9]"
                  />
                )}
              </div>
            </NexusSection>

            <NexusSection
              title="Encuadre en Celular"
              subtitle="Ajuste del medio en el hero movil"
              icon={Smartphone}
              iconVariant="brand"
              className="order-4"
            >
              <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
                <FocalPointControls
                  xValue={mobileFocalX}
                  yValue={mobileFocalY}
                  onXChange={setMobileFocalX}
                  onYChange={setMobileFocalY}
                />

                {previewUrl && (
                  <HeroPreviewFrame
                    label="Mobile"
                    mediaUrl={fullPreviewUrl}
                    isVideo={isVideoPreview}
                    objectPosition={mobileObjectPosition}
                    className="mx-auto aspect-[9/16] max-h-[360px] max-w-[220px]"
                    compact
                  />
                )}
              </div>
            </NexusSection>
          </div>

          <div
            className="contents lg:col-span-5 lg:flex lg:flex-col"
            style={{ gap: "var(--space-lg)" }}
          >
            <NexusSection
              title="Detalles del Slide"
              subtitle="Contenido editorial del inicio"
              icon={MonitorPlay}
              iconVariant="brand"
              className="order-2"
            >
              <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
                <div
                  className="grid grid-cols-2"
                  style={{ gap: "var(--space-md)" }}
                >
                  <NexusSelect
                    label="Tipo"
                    value={type}
                    onChange={(e) =>
                      setType(e.target.value as "PHOTO" | "VIDEO")
                    }
                  >
                    <option value="PHOTO">Foto</option>
                    <option value="VIDEO">Video</option>
                  </NexusSelect>

                  <NexusInput
                    label="Orden"
                    type="number"
                    min={1}
                    step={1}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                  />
                </div>

                <NexusInput
                  label="Duracion en segundos"
                  type="number"
                  min={3}
                  max={60}
                  step={1}
                  value={displayDurationSeconds}
                  onChange={(e) => setDisplayDurationSeconds(e.target.value)}
                />

                <NexusInput
                  label="Subtitulo corto"
                  placeholder="Ej. Lineas de elite"
                  value={eyebrow}
                  onChange={(e) => setEyebrow(e.target.value)}
                />

                <NexusInput
                  label="Titulo *"
                  placeholder="Ej. Excelencia genetica certificada"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <NexusTextarea
                  label="Descripcion"
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />

                <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
                  <NexusInput
                    label="Publicar desde"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                  <NexusInput
                    label="Publicar hasta"
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </div>

                {isSubmitting && (
                  <div
                    className="flex items-center justify-center border border-brand-100 bg-brand-50 animate-pulse"
                    style={{
                      gap: "var(--space-sm)",
                      paddingBlock: "var(--space-md)",
                      borderRadius: "var(--radius-nested-simple)",
                    }}
                  >
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                    <span className="text-label uppercase tracking-widest text-brand-700">
                      Guardando slide...
                    </span>
                  </div>
                )}
              </div>
            </NexusSection>

            <NexusSection
              title="CTAs"
              subtitle="Acciones visibles en el hero"
              icon={PlusCircle}
              iconVariant="brand"
              className="order-5"
            >
              <div
                className="grid grid-cols-1 sm:grid-cols-2"
                style={{ gap: "var(--space-md)" }}
              >
                <NexusInput
                  label="Boton Primario"
                  value={primaryText}
                  onChange={(e) => setPrimaryText(e.target.value)}
                />
                <NexusInput
                  label="URL Primaria"
                  value={primaryHref}
                  onChange={(e) => setPrimaryHref(e.target.value)}
                />
                <NexusInput
                  label="Boton Secundario"
                  value={secondaryText}
                  onChange={(e) => setSecondaryText(e.target.value)}
                />
                <NexusInput
                  label="URL Secundaria"
                  value={secondaryHref}
                  onChange={(e) => setSecondaryHref(e.target.value)}
                />
              </div>
            </NexusSection>
          </div>
        </div>
      </form>
    );
  },
);

interface FocalPointControlsProps {
  title?: string;
  xValue: string;
  yValue: string;
  onXChange: (value: string) => void;
  onYChange: (value: string) => void;
}

function FocalPointControls({
  title,
  xValue,
  yValue,
  onXChange,
  onYChange,
}: FocalPointControlsProps) {
  return (
    <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
      {title && (
        <span
          className="text-label uppercase tracking-[0.15em] text-text-muted"
          style={{ marginLeft: "var(--space-xs)" }}
        >
          {title}
        </span>
      )}
      <div
        className="grid grid-cols-1 sm:grid-cols-2"
        style={{ gap: "var(--space-md)" }}
      >
        <NexusSelect
          label="Horizontal"
          value={xValue}
          onChange={(event) => onXChange(event.target.value)}
        >
          {FOCAL_X_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NexusSelect>

        <NexusSelect
          label="Vertical"
          value={yValue}
          onChange={(event) => onYChange(event.target.value)}
        >
          {FOCAL_Y_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NexusSelect>
      </div>
    </div>
  );
}

interface HeroPreviewFrameProps {
  label: string;
  mediaUrl: string;
  isVideo: boolean;
  objectPosition: string;
  className: string;
  compact?: boolean;
}

function HeroPreviewFrame({
  label,
  mediaUrl,
  isVideo,
  objectPosition,
  className,
  compact,
}: HeroPreviewFrameProps) {
  return (
    <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
      <div
        className="flex items-center justify-between"
        style={{ paddingInline: "var(--space-xs)" }}
      >
        <span className="text-label uppercase tracking-[0.15em] text-text-muted">
          {label}
        </span>
        <span className="text-label uppercase tracking-[0.15em] text-brand-600">
          {objectPosition}
        </span>
      </div>

      <div
        className={`relative w-full overflow-hidden border border-border-main bg-stone-950 shadow-sm ${className}`}
        style={{ borderRadius: "var(--radius-inner-visual)" }}
      >
        {isVideo ? (
          <video
            src={mediaUrl}
            className="h-full w-full object-cover"
            style={{ objectPosition }}
            muted
            autoPlay
            loop
            playsInline
          />
        ) : (
          <img
            src={mediaUrl}
            className="h-full w-full object-cover"
            style={{ objectPosition }}
            alt=""
          />
        )}

        <div
          className="absolute inset-0"
          style={{
            background: compact
              ? "radial-gradient(ellipse at center 36%, transparent 0%, transparent 34%, rgba(12,10,9,0.36) 62%, rgba(12,10,9,0.92) 100%), linear-gradient(to bottom, rgba(12,10,9,0.08) 0%, rgba(12,10,9,0.22) 36%, rgba(12,10,9,0.9) 72%, rgba(12,10,9,0.98) 100%)"
              : "linear-gradient(to right, rgba(12,10,9,0.74) 0%, rgba(12,10,9,0.45) 44%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
}
