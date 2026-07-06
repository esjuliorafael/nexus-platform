import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ExternalLink,
  Film,
  Image as ImageIcon,
  MonitorPlay,
  Sparkles,
  Smartphone,
  Upload,
  X,
} from "lucide-react";
import { ASSET_BASE_URL, apiSystem, apiUpload } from "../../../api";
import { NexusAutonomousButton, NexusSectionButton } from "../../ui/NexusButton";
import { NexusInput, NexusSelect, NexusTextarea } from "../../ui/NexusInputs";
import { NexusSection } from "../../ui/NexusSection";
import { NexusSwitch } from "../../ui/NexusSwitch";
import { InteractionStage } from "../../ui/InteractionStage";
import { UploadPreviewOverlay } from "../../ui/UploadPreviewOverlay";
import { useUploadQueue } from "../../uploads/UploadQueueProvider";
import {
  StorefrontTemplateConfig,
  StorefrontTemplateMediaType,
  serializeStorefrontTemplate,
  storefrontTemplateMeta,
} from "./storefrontTemporaryTemplates";

interface StorefrontTemplateFormProps {
  template: StorefrontTemplateConfig;
  onBack: () => void;
  onSave: (template: StorefrontTemplateConfig) => void;
  showToast: (message: string, type?: "success" | "error") => void;
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

const getFullPreviewUrl = (path?: string | null) => {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) return path;
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return `${ASSET_BASE_URL}${cleanPath}`;
};

const parseObjectPosition = (value?: string | null) => {
  const [x = "50%", y = "50%"] = (value || "50% 50%").split(" ");
  return { x, y };
};

export const StorefrontTemplateForm = forwardRef<
  { handleSave: () => void },
  StorefrontTemplateFormProps
>(({ template, onBack, onSave, showToast }, ref) => {
  const { startDirectVideoUpload } = useUploadQueue();
  const meta = storefrontTemplateMeta[template.mode];
  const initialDesktop = parseObjectPosition(template.desktopObjectPosition);
  const initialMobile = parseObjectPosition(template.mobileObjectPosition);
  const [form, setForm] = useState(template);
  const [desktopFocalX, setDesktopFocalX] = useState(initialDesktop.x);
  const [desktopFocalY, setDesktopFocalY] = useState(initialDesktop.y);
  const [mobileFocalX, setMobileFocalX] = useState(initialMobile.x);
  const [mobileFocalY, setMobileFocalY] = useState(initialMobile.y);
  const [previewUrl, setPreviewUrl] = useState(getFullPreviewUrl(template.posterUrl || template.mediaUrl));
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVideoPreview = form.mediaType === "VIDEO";
  const desktopObjectPosition = `${desktopFocalX} ${desktopFocalY}`;
  const mobileObjectPosition = `${mobileFocalX} ${mobileFocalY}`;

  const uploadTemplateFile = async (file: File) => {
    if (file.type.startsWith("video/")) {
      return startDirectVideoUpload(file, { label: `Pantalla ${meta.label}` });
    }

    return apiUpload.upload(file);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const mediaType: StorefrontTemplateMediaType = selectedFile.type.startsWith("video/")
      ? "VIDEO"
      : "PHOTO";
    const localPreviewUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(localPreviewUrl);
    setForm((current) => ({
      ...current,
      mediaType,
      mediaUrl: localPreviewUrl,
      posterUrl: "",
    }));

    try {
      const result = await uploadTemplateFile(selectedFile);
      setForm((current) => ({
        ...current,
        mediaType: result.type === "VIDEO" ? "VIDEO" : mediaType,
        mediaUrl: result.url || current.mediaUrl,
        posterUrl: result.posterUrl || "",
      }));
      setPreviewUrl(getFullPreviewUrl(result.posterUrl || result.url || localPreviewUrl));
    } catch (error) {
      console.error("Error subiendo pantalla temporal:", error);
      showToast("No se pudo subir el medio de la pantalla temporal", "error");
    }
  };

  const clearMedia = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    setPreviewUrl("");
    setForm((current) => ({
      ...current,
      mediaUrl: "",
      posterUrl: "",
      mediaType: "PHOTO",
    }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!form.title.trim()) {
      showToast("Agrega un título para guardar la pantalla temporal", "error");
      return;
    }

    const nextTemplate = {
      ...form,
      title: form.title.trim(),
      eyebrow: form.eyebrow.trim() || meta.eyebrow,
      description: form.description.trim(),
      desktopObjectPosition,
      mobileObjectPosition,
    };

    setIsSaving(true);
    try {
      await apiSystem.updateConfig(serializeStorefrontTemplate(nextTemplate));
      showToast(`Pantalla de ${meta.label.toLowerCase()} actualizada`, "success");
      onSave(nextTemplate);
    } catch (error) {
      showToast("No se pudo guardar la pantalla temporal", "error");
    } finally {
      setIsSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({ handleSave }));

  return (
    <form
      className="flex flex-col animate-in fade-in duration-500"
      style={{ gap: "var(--space-lg)", paddingBottom: "var(--space-xl)" }}
      onSubmit={(event) => {
        event.preventDefault();
        handleSave();
      }}
    >
      <div className="flex items-center justify-between" style={{ gap: "var(--space-md)" }}>
        <NexusSectionButton type="button" variant="secondary" icon={ArrowLeft} onClick={onBack}>
          Volver
        </NexusSectionButton>
        <NexusSectionButton type="submit" icon={MonitorPlay} isLoading={isSaving}>
          Guardar Pantalla
        </NexusSectionButton>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="grid grid-cols-1 items-start lg:grid-cols-12" style={{ gap: "var(--space-lg)" }}>
        <div className="contents lg:col-span-7 lg:flex lg:flex-col" style={{ gap: "var(--space-lg)" }}>
          <div className="order-1 w-full">
            {!previewUrl ? (
              <InteractionStage
                level={1}
                size="normal"
                className="aspect-video w-full shadow-sm"
                icon={Upload}
                title={`Medio de ${meta.label}`}
                description="Imagen o video para la pantalla temporal."
                onClick={() => fileInputRef.current?.click()}
              />
            ) : (
              <div
                className="group relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center overflow-hidden shadow-xl shadow-stone-200/40 transition-all duration-500 active:scale-[0.995]"
                style={{ borderRadius: "var(--radius-outer)" }}
                onClick={() => fileInputRef.current?.click()}
              >
                {isVideoPreview ? (
                  <video src={getFullPreviewUrl(form.mediaUrl)} poster={getFullPreviewUrl(form.posterUrl) || undefined} className="h-full w-full object-cover" muted autoPlay loop playsInline />
                ) : (
                  <img src={previewUrl} className="h-full w-full object-cover" alt={`Medio de ${meta.label}`} />
                )}

                <UploadPreviewOverlay label="Cambiar Medio" />

                <div
                  className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between"
                  style={{ padding: "var(--padding-inner)" }}
                >
                  <NexusAutonomousButton
                    type="button"
                    variant="ghost"
                    icon={isVideoPreview ? Film : ImageIcon}
                    className="pointer-events-none border border-white/10 bg-black/40 text-white shadow-none backdrop-blur-md"
                  >
                    {isVideoPreview ? "Video" : "Foto"}
                  </NexusAutonomousButton>

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
            )}
          </div>

          <NexusSection
            title="Encuadre en Computadora"
            subtitle="Ajuste visual para pantallas amplias"
            icon={MonitorPlay}
            iconVariant="brand"
            className="order-3"
          >
            <FocalPointControls
              xValue={desktopFocalX}
              yValue={desktopFocalY}
              onXChange={setDesktopFocalX}
              onYChange={setDesktopFocalY}
            />
          </NexusSection>

          <NexusSection
            title="Encuadre en Celular"
            subtitle="Ajuste visual para pantallas verticales"
            icon={Smartphone}
            iconVariant="blue"
            className="order-4"
          >
            <FocalPointControls
              xValue={mobileFocalX}
              yValue={mobileFocalY}
              onXChange={setMobileFocalX}
              onYChange={setMobileFocalY}
            />
          </NexusSection>
        </div>

        <div className="order-2 flex flex-col lg:col-span-5" style={{ gap: "var(--space-lg)" }}>
          <NexusSection
            title={`Detalles de ${meta.label}`}
            subtitle="Mensaje editorial de la pantalla temporal"
            icon={meta.icon}
            iconVariant={meta.iconVariant}
          >
            <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
              <NexusInput
                label="Subtítulo"
                value={form.eyebrow}
                onChange={(event) => setForm({ ...form, eyebrow: event.target.value })}
                placeholder={meta.eyebrow}
                icon={Sparkles}
              />
              <NexusInput
                label="Título"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder={meta.title}
                icon={MonitorPlay}
              />
              <NexusTextarea
                label="Descripción"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                rows={5}
                placeholder={meta.description}
              />

              <div
                className="flex items-center justify-between border border-border-main bg-bg-muted"
                style={{
                  borderRadius: "var(--radius-inner-visual)",
                  padding: "var(--space-md)",
                  gap: "var(--space-md)",
                }}
              >
                <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
                  <h4 className="text-h2 text-text-main">Mostrar Logo</h4>
                  <p className="text-secondary text-text-muted">Usa el logo cargado en Identidad.</p>
                </div>
                <div className="flex flex-col items-center" style={{ gap: "var(--space-xs)" }}>
                  <NexusSwitch
                    checked={form.showLogo}
                    onChange={(checked) => setForm({ ...form, showLogo: checked })}
                    aria-label="Mostrar logo en pantalla temporal"
                  />
                  <span className="text-label uppercase tracking-[0.15em] text-text-muted">
                    {form.showLogo ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
            </div>
          </NexusSection>

          <NexusSection
            title="CTAs"
            subtitle="Acciones opcionales para visitantes"
            icon={ExternalLink}
            iconVariant="emerald"
          >
            <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
              <NexusInput
                label="CTA principal"
                value={form.primaryText}
                onChange={(event) => setForm({ ...form, primaryText: event.target.value })}
                placeholder="Ej. Contactar por WhatsApp"
                icon={ExternalLink}
              />
              <NexusInput
                label="URL principal"
                value={form.primaryHref}
                onChange={(event) => setForm({ ...form, primaryHref: event.target.value })}
                placeholder="https://wa.me/..."
                icon={ExternalLink}
              />
              <NexusInput
                label="CTA secundario"
                value={form.secondaryText}
                onChange={(event) => setForm({ ...form, secondaryText: event.target.value })}
                placeholder="Ej. Ver galería"
                icon={ExternalLink}
              />
              <NexusInput
                label="URL secundaria"
                value={form.secondaryHref}
                onChange={(event) => setForm({ ...form, secondaryHref: event.target.value })}
                placeholder="/gallery"
                icon={ExternalLink}
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

const FocalPointControls: React.FC<FocalPointControlsProps> = ({
  xValue,
  yValue,
  onXChange,
  onYChange,
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "var(--space-md)" }}>
    <NexusSelect label="Posición horizontal" value={xValue} onChange={(event) => onXChange(event.target.value)}>
      {FOCAL_X_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </NexusSelect>
    <NexusSelect label="Posición vertical" value={yValue} onChange={(event) => onYChange(event.target.value)}>
      {FOCAL_Y_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </NexusSelect>
  </div>
);
