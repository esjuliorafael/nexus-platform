import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Film,
  Image as ImageIcon,
  ImagePlus,
  MonitorPlay,
  Smartphone,
  Upload,
  X,
} from "lucide-react";
import { ASSET_BASE_URL, apiStoreHeroes, apiUpload } from "../../../api";
import type { StoreHero, StoreHeroScope } from "../../../types";
import { NexusAutonomousButton } from "../../ui/NexusButton";
import { NexusInput, NexusSelect, NexusTextarea } from "../../ui/NexusInputs";
import { NexusSection } from "../../ui/NexusSection";
import { InteractionStage } from "../../ui/InteractionStage";
import { UploadPreviewOverlay } from "../../ui/UploadPreviewOverlay";
import { useUploadQueue } from "../../uploads/UploadQueueProvider";

interface StoreHeroFormProps {
  initialData?: StoreHero;
  onSave: () => void;
  showToast: (message: string, type?: "success" | "error") => void;
  onValidationChange?: (isValid: boolean) => void;
}

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

const parseObjectPosition = (value?: string | null, fallback = "50% 50%") => {
  const [x = "50%", y = "50%"] = (value || fallback).split(" ");
  return {
    x: x === "left" ? "28%" : x === "right" ? "72%" : x === "center" ? "50%" : x,
    y: y === "top" ? "32%" : y === "bottom" ? "68%" : y === "center" ? "50%" : y,
  };
};

const getFullPreviewUrl = (path?: string | null) => {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) return path;
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return `${ASSET_BASE_URL}${cleanPath}`;
};

export const StoreHeroForm = forwardRef<
  { handleSave: () => void },
  StoreHeroFormProps
>(({ initialData, onSave, showToast, onValidationChange }, ref) => {
  const { startDirectVideoUpload } = useUploadQueue();
  const [scope, setScope] = useState<StoreHeroScope>(initialData?.scope || "ALL");
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [sortOrder, setSortOrder] = useState(String(initialData?.sortOrder || 1));
  const [active] = useState(initialData?.active ?? true);
  const initialDesktopPosition = parseObjectPosition(initialData?.desktopObjectPosition);
  const initialMobilePosition = parseObjectPosition(initialData?.mobileObjectPosition, "50% 44%");
  const [desktopFocalX, setDesktopFocalX] = useState(initialDesktopPosition.x);
  const [desktopFocalY, setDesktopFocalY] = useState(initialDesktopPosition.y);
  const [mobileFocalX, setMobileFocalX] = useState(initialMobilePosition.x);
  const [mobileFocalY, setMobileFocalY] = useState(initialMobilePosition.y);
  const [assetId, setAssetId] = useState<string | null>(initialData?.assetId || null);
  const [previewUrl, setPreviewUrl] = useState(
    getFullPreviewUrl(initialData?.posterUrl || initialData?.mediaUrl),
  );
  const [previewType, setPreviewType] = useState<"PHOTO" | "VIDEO" | null>(
    initialData?.type || null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFormValid = Boolean(assetId && title.trim());
  const isVideoPreview = previewType === "VIDEO";
  const desktopObjectPosition = `${desktopFocalX} ${desktopFocalY}`;
  const mobileObjectPosition = `${mobileFocalX} ${mobileFocalY}`;

  useEffect(() => {
    onValidationChange?.(isFormValid);
  }, [isFormValid, onValidationChange]);

  useEffect(() => {
    return () => onValidationChange?.(false);
  }, [onValidationChange]);

  const uploadHeroFile = async (file: File) => {
    if (file.type.startsWith("video/")) {
      return startDirectVideoUpload(file, { label: "Hero de tienda" });
    }
    return apiUpload.upload(file);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setPreviewUrl(URL.createObjectURL(selectedFile));
    setPreviewType(selectedFile.type.startsWith("video/") ? "VIDEO" : "PHOTO");

    try {
      const result = await uploadHeroFile(selectedFile);
      setAssetId(result.assetId);
    } catch (error) {
      console.error("Error subiendo hero:", error);
      showToast("No se pudo subir el medio del hero", "error");
    }
  };

  const clearMedia = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    setAssetId(null);
    setPreviewUrl("");
    setPreviewType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (isSubmitting) return;
    if (!isFormValid) {
      showToast("Agrega medio y título para guardar el hero", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        scope,
        assetId: assetId!,
        title: title.trim(),
        description: description.trim() || undefined,
        sortOrder: Number(sortOrder || 1),
        active,
        desktopObjectPosition,
        mobileObjectPosition,
      };

      if (initialData) {
        await apiStoreHeroes.update(initialData.id, payload);
      } else {
        await apiStoreHeroes.create(payload);
      }

      onSave();
    } catch (error: any) {
      console.error("Error guardando hero:", error);
      showToast(error?.response?.data?.message || "No se pudo guardar el hero", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  useImperativeHandle(ref, () => ({
    handleSave: () => handleSubmit(),
  }));

  return (
    <form
      id="store-hero-form"
      onSubmit={handleSubmit}
      className="flex flex-col animate-in fade-in duration-700"
      style={{ gap: "var(--space-lg)", paddingBottom: "var(--space-lg)" }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        className="grid grid-cols-1 items-start lg:grid-cols-12"
        style={{ gap: "var(--space-lg)" }}
      >
        <div
          className="contents lg:col-span-7 lg:flex lg:flex-col"
          style={{ gap: "var(--space-lg)" }}
        >
          <div className="order-1 w-full">
            {!previewUrl ? (
              <InteractionStage
                level={1}
                size="normal"
                className="aspect-video w-full shadow-sm"
                icon={Upload}
                title="Medio del Hero"
                description="Imagen o video principal para la tienda (16:9 recomendado)."
                onClick={() => fileInputRef.current?.click()}
              />
            ) : (
              <div
                className="group relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center overflow-hidden shadow-xl shadow-stone-200/40 transition-all duration-500 active:scale-[0.995]"
                style={{ borderRadius: "var(--radius-outer)" }}
                onClick={() => fileInputRef.current?.click()}
              >
                {isVideoPreview ? (
                  <video src={previewUrl} className="h-full w-full object-cover" muted autoPlay loop playsInline />
                ) : (
                  <img src={previewUrl} className="h-full w-full object-cover" alt="Medio del hero" />
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
                      onClick={clearMedia}
                      className="border border-white/10 bg-black/40 text-white shadow-none backdrop-blur-md hover:bg-rose-500"
                    />
                  </div>
                </div>
              </div>
            )}
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
                  mediaUrl={previewUrl}
                  isVideo={isVideoPreview}
                  objectPosition={desktopObjectPosition}
                  className="aspect-[16/9]"
                />
              )}
            </div>
          </NexusSection>

          <NexusSection
            title="Encuadre en Celular"
            subtitle="Ajuste del medio en el hero móvil"
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
                  mediaUrl={previewUrl}
                  isVideo={isVideoPreview}
                  objectPosition={mobileObjectPosition}
                  className="mx-auto aspect-[1.95/1] w-full"
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
            title="Detalles del Hero"
            subtitle="Contenido editorial de la tienda"
            icon={ImagePlus}
            iconVariant="brand"
            className="order-2"
          >
            <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
              <div className="grid grid-cols-2" style={{ gap: "var(--space-md)" }}>
                <NexusSelect
                  label="Tipo de producto"
                  value={scope}
                  onChange={(event) => setScope(event.target.value as StoreHeroScope)}
                >
                  <option value="ALL">Todo</option>
                  <option value="BIRD">Aves</option>
                  <option value="ITEM">Artículos</option>
                </NexusSelect>

                <NexusInput
                  label="Orden"
                  type="number"
                  min={1}
                  step={1}
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                />
              </div>

              <NexusInput
                label="Título *"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ej. Selección para crianza"
              />

              <NexusTextarea
                label="Descripción"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                placeholder="Texto breve del hero..."
              />

            </div>
          </NexusSection>
        </div>
      </div>
    </form>
  );
});

interface FocalPointControlsProps {
  xValue: string;
  yValue: string;
  onXChange: (value: string) => void;
  onYChange: (value: string) => void;
}

function FocalPointControls({
  xValue,
  yValue,
  onXChange,
  onYChange,
}: FocalPointControlsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "var(--space-md)" }}>
      <NexusSelect label="Horizontal" value={xValue} onChange={(event) => onXChange(event.target.value)}>
        {FOCAL_X_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NexusSelect>

      <NexusSelect label="Vertical" value={yValue} onChange={(event) => onYChange(event.target.value)}>
        {FOCAL_Y_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NexusSelect>
    </div>
  );
}

interface HeroPreviewFrameProps {
  label: string;
  mediaUrl: string;
  isVideo: boolean;
  objectPosition: string;
  className: string;
}

function HeroPreviewFrame({
  label,
  mediaUrl,
  isVideo,
  objectPosition,
  className,
}: HeroPreviewFrameProps) {
  return (
    <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
      <div className="flex items-center justify-between" style={{ paddingInline: "var(--space-xs)" }}>
        <span className="text-label uppercase tracking-[0.15em] text-text-muted">{label}</span>
        <span className="text-label uppercase tracking-[0.15em] text-brand-600">{objectPosition}</span>
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
          <img src={mediaUrl} className="h-full w-full object-cover" style={{ objectPosition }} alt="" />
        )}
      </div>
    </div>
  );
}
