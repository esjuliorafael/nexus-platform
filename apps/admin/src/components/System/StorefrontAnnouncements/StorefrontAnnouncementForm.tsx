import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { BellRing, CalendarClock, Crosshair, Megaphone } from "lucide-react";
import { apiProducts, apiRaffles, apiStorefrontAnnouncements } from "../../../api";
import type {
  Product,
  Raffle,
  StorefrontAnnouncement,
  StorefrontAnnouncementFrequency,
  StorefrontAnnouncementScope,
  StorefrontAnnouncementVariant,
} from "../../../types";
import { NexusInput, NexusSelect, NexusTextarea } from "../../ui/NexusInputs";
import { NexusSection } from "../../ui/NexusSection";
import { NexusSwitch } from "../../ui/NexusSwitch";

export interface StorefrontAnnouncementFormRef { handleSave: () => void }

interface Props {
  initialData?: StorefrontAnnouncement | null;
  onSave: () => void;
  showToast: (message: string, type?: "success" | "error") => void;
  onValidationChange?: (valid: boolean) => void;
}

const toLocalDateTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const toIso = (value: string) => value ? new Date(value).toISOString() : null;

export const StorefrontAnnouncementForm = forwardRef<StorefrontAnnouncementFormRef, Props>(
  ({ initialData, onSave, showToast, onValidationChange }, ref) => {
    const [scope, setScope] = useState<StorefrontAnnouncementScope>(initialData?.scope || "GLOBAL");
    const [targetId, setTargetId] = useState(initialData?.targetId ? String(initialData.targetId) : "");
    const [variant, setVariant] = useState<StorefrontAnnouncementVariant>(initialData?.variant || "INFO");
    const [frequency, setFrequency] = useState<StorefrontAnnouncementFrequency>(initialData?.frequency || "ONCE_VISITOR");
    const [eyebrow, setEyebrow] = useState(initialData?.eyebrow || "");
    const [title, setTitle] = useState(initialData?.title || "");
    const [message, setMessage] = useState(initialData?.message || "");
    const [ctaLabel, setCtaLabel] = useState(initialData?.ctaLabel || "");
    const [ctaHref, setCtaHref] = useState(initialData?.ctaHref || "");
    const [startsAt, setStartsAt] = useState(toLocalDateTime(initialData?.startsAt));
    const [endsAt, setEndsAt] = useState(toLocalDateTime(initialData?.endsAt));
    const [priority, setPriority] = useState(String(initialData?.priority ?? 0));
    const [dismissible, setDismissible] = useState(initialData?.dismissible ?? true);
    const [active, setActive] = useState(initialData?.active ?? true);
    const [products, setProducts] = useState<Product[]>([]);
    const [raffles, setRaffles] = useState<Raffle[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const needsTarget = scope === "PRODUCT" || scope === "RAFFLE";
    const ctaComplete = (!ctaLabel && !ctaHref) || Boolean(ctaLabel.trim() && ctaHref.trim());
    const valid = Boolean(title.trim() && message.trim() && (!needsTarget || targetId) && ctaComplete && (dismissible || ctaLabel));

    useEffect(() => onValidationChange?.(valid), [onValidationChange, valid]);
    useEffect(() => () => onValidationChange?.(false), [onValidationChange]);

    useEffect(() => {
      if (scope === "PRODUCT" && products.length === 0) void apiProducts.getAll().then(setProducts).catch(() => undefined);
      if (scope === "RAFFLE" && raffles.length === 0) void apiRaffles.getAll().then(setRaffles).catch(() => undefined);
      if (!needsTarget) setTargetId("");
    }, [needsTarget, products.length, raffles.length, scope]);

    const targetOptions = useMemo(() => scope === "PRODUCT"
      ? products.map((item) => ({ value: item.id, label: item.name }))
      : raffles.map((item) => ({ value: item.id, label: item.title })), [products, raffles, scope]);

    const save = async () => {
      if (!valid || isSaving) {
        if (!valid) showToast("Completa la información obligatoria del aviso", "error");
        return;
      }
      setIsSaving(true);
      try {
        const payload = {
          scope,
          targetId: needsTarget ? Number(targetId) : null,
          presentation: "POPUP" as const,
          variant,
          frequency,
          eyebrow: eyebrow.trim() || null,
          title: title.trim(),
          message: message.trim(),
          ctaLabel: ctaLabel.trim() || null,
          ctaHref: ctaHref.trim() || null,
          dismissible,
          active,
          priority: Number(priority || 0),
          startsAt: toIso(startsAt),
          endsAt: toIso(endsAt),
        };
        if (initialData) await apiStorefrontAnnouncements.update(initialData.id, payload);
        else await apiStorefrontAnnouncements.create(payload as any);
        showToast(initialData ? "Aviso actualizado" : "Aviso creado", "success");
        onSave();
      } catch (error: any) {
        showToast(error?.response?.data?.message || "No se pudo guardar el aviso", "error");
      } finally {
        setIsSaving(false);
      }
    };

    useImperativeHandle(ref, () => ({ handleSave: () => void save() }));

    return (
      <div className="grid grid-cols-1 xl:grid-cols-2" style={{ gap: "var(--space-lg)", paddingBottom: "var(--space-xl)" }}>
        <NexusSection title="Contenido del Aviso" subtitle="Define el mensaje que verá el visitante" icon={Megaphone} iconVariant="brand">
          <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
            <NexusInput label="Subtítulo" value={eyebrow} onChange={(event) => setEyebrow(event.target.value)} maxLength={60} placeholder="Aviso importante" />
            <NexusInput label="Título" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required />
            <NexusTextarea label="Mensaje" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} rows={6} required />
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-md)" }}>
              <NexusInput label="Texto del CTA" value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} placeholder="Ver detalles" />
              <NexusInput label="Destino del CTA" value={ctaHref} onChange={(event) => setCtaHref(event.target.value)} placeholder="/raffles/1" />
            </div>
          </div>
        </NexusSection>

        <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
          <NexusSection title="Destino y Comportamiento" subtitle="Controla dónde y con qué frecuencia aparece" icon={Crosshair}>
            <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
              <NexusSelect label="Destino" value={scope} onChange={(event) => setScope(event.target.value as StorefrontAnnouncementScope)}>
                <option value="GLOBAL">Todo el Storefront</option><option value="STORE">Tienda</option><option value="RAFFLES">Rifas</option>
                <option value="RAFFLE">Rifa específica</option><option value="PRODUCT">Producto específico</option>
                <option value="STORE_CHECKOUT">Checkout de tienda</option><option value="RAFFLE_CHECKOUT">Checkout de rifas</option>
              </NexusSelect>
              {needsTarget && (
                <NexusSelect label={scope === "PRODUCT" ? "Producto" : "Rifa"} value={targetId} onChange={(event) => setTargetId(event.target.value)}>
                  <option value="">Selecciona una opción</option>
                  {targetOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </NexusSelect>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-md)" }}>
                <NexusSelect label="Intención" value={variant} onChange={(event) => setVariant(event.target.value as StorefrontAnnouncementVariant)}>
                  <option value="INFO">Informativo</option><option value="SUCCESS">Confirmación</option><option value="WARNING">Advertencia</option>
                  <option value="CRITICAL">Crítico</option><option value="PROMO">Promoción</option>
                </NexusSelect>
                <NexusSelect label="Frecuencia" value={frequency} onChange={(event) => setFrequency(event.target.value as StorefrontAnnouncementFrequency)}>
                  <option value="ONCE_VISITOR">Una vez por visitante</option><option value="ONCE_SESSION">Una vez por sesión</option><option value="ALWAYS">En cada visita</option>
                </NexusSelect>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-md)" }}>
                <NexusInput label="Prioridad" type="number" min={0} max={100} value={priority} onChange={(event) => setPriority(event.target.value)} />
                <NexusSelect label="Cierre" value={dismissible ? "YES" : "NO"} onChange={(event) => setDismissible(event.target.value === "YES")}>
                  <option value="YES">El visitante puede cerrarlo</option><option value="NO">Requiere usar el CTA</option>
                </NexusSelect>
              </div>
            </div>
          </NexusSection>

          <NexusSection title="Publicación" subtitle="Programa su vigencia y estado" icon={CalendarClock}>
            <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-md)" }}>
                <NexusInput label="Inicia" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
                <NexusInput label="Finaliza" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
              </div>
              <div className="flex items-center justify-between" style={{ gap: "var(--space-md)" }}>
                <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
                  <span className="text-h3 text-text-main">Publicar aviso</span>
                  <span className="text-secondary text-text-muted">También podrás pausarlo desde su tarjeta.</span>
                </div>
                <NexusSwitch checked={active} onChange={setActive} aria-label="Publicar aviso" />
              </div>
            </div>
          </NexusSection>
        </div>
      </div>
    );
  },
);

