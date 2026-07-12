import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Check,
  DollarSign,
  Film,
  Hash,
  Image as ImageIcon,
  Layers,
  Loader2,
  PlusCircle,
  Ticket,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { apiRaffles, apiUpload } from "../../api";
import { Raffle, RaffleGalleryItem } from "../../types";
import { NexusInput, NexusSelect, NexusTextarea } from "../ui/NexusInputs";
import { NexusAutonomousButton } from "../ui/NexusButton";
import { NexusInlineNotice } from "../ui/NexusInlineNotice";
import { NexusSegmentedControl } from "../ui/NexusSegmentedControl";
import { NexusSection } from "../ui/NexusSection";
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
type GalleryItem = Pick<RaffleGalleryItem, "filePath" | "fileType">;

const MAX_GALLERY_ITEMS = 6;

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
  const [drawDate, setDrawDate] = useState(
    initialData?.drawDate ? new Date(initialData.drawDate).toISOString().split("T")[0] : "",
  );
  const [status, setStatus] = useState<Raffle["status"]>(initialData?.status ?? "ACTIVE");
  const [imageUrl, setImageUrl] = useState(initialData?.image ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>(initialData?.gallery ?? []);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
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

  const isFormValid = Boolean(title.trim()) && Number.parseFloat(ticketPrice) > 0 && isUniverseValid;

  useEffect(() => {
    onValidationChange?.(isFormValid);
  }, [isFormValid, onValidationChange]);

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCoverFile(file);
    setImageUrl(URL.createObjectURL(file));
  };

  const handleGalleryChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = event.target.files ? Array.from(event.target.files) : [];
    const availableSlots = MAX_GALLERY_ITEMS - gallery.length;
    const selectedFiles = files.slice(0, availableSlots);
    event.target.value = "";

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

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let finalImageUrl = imageUrl;
      if (coverFile) {
        const response = await apiUpload.upload(coverFile);
        finalImageUrl = response.url;
      }

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        ticketPrice: Number.parseFloat(ticketPrice),
        ticketQuantity: Number.parseInt(ticketQuantity, 10),
        opportunities: raffleType === "SIMPLE" ? 1 : Number.parseInt(opportunities, 10),
        distribution,
        drawDate: drawDate ? new Date(drawDate).toISOString() : null,
        image: finalImageUrl || null,
        gallery,
        status,
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
                description="Imagen principal que verán los participantes."
                onClick={() => coverInputRef.current?.click()}
              />
            ) : (
              <div
                className="group relative aspect-video w-full overflow-hidden shadow-xl shadow-stone-200/40 cursor-pointer transition-all duration-500 active:scale-[0.995]"
                style={{ borderRadius: "var(--radius-outer)" }}
                onClick={() => coverInputRef.current?.click()}
              >
                <img src={imageUrl} className="h-full w-full object-cover" alt="Portada de la rifa" />
                <UploadPreviewOverlay label="Cambiar Portada" />
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between"
                  style={{ padding: "var(--padding-inner)" }}
                >
                  <div className="pointer-events-auto">
                    <NexusAutonomousButton
                      type="button"
                      variant="ghost"
                      icon={ImageIcon}
                      className="pointer-events-none border border-white/10 bg-black/40 text-white shadow-none backdrop-blur-md"
                    >
                      Foto
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
                        if (coverInputRef.current) coverInputRef.current.value = "";
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            <input ref={coverInputRef} className="hidden" type="file" accept="image/*" onChange={handleCoverChange} />
          </div>

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
                    <video src={`${item.filePath}#t=0.5`} className="h-full w-full object-cover" preload="metadata" muted playsInline />
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
