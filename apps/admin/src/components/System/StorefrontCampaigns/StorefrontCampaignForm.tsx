import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { CalendarClock, Megaphone, TicketPercent } from "lucide-react";
import { apiStorefrontCampaigns } from "../../../api";
import type {
  StorefrontCampaign,
  StorefrontCampaignCoupon,
  StorefrontCampaignTheme,
} from "../../../types";
import { NexusInput, NexusSelect, NexusTextarea } from "../../ui/NexusInputs";
import { NexusSection } from "../../ui/NexusSection";
import { NexusSwitch } from "../../ui/NexusSwitch";

export interface StorefrontCampaignFormRef {
  handleSave: () => void;
}

interface Props {
  initialData?: StorefrontCampaign | null;
  onSave: () => void;
  showToast: (message: string, type?: "success" | "error") => void;
  onValidationChange?: (valid: boolean) => void;
}

const mexicoDateTime = (value?: string | null) => {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
};

const mexicoDateTimeToIso = (value: string) => {
  const naive = new Date(`${value}:00Z`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(naive);
  const part = (type: string) =>
    Number(parts.find((item) => item.type === type)?.value || 0);
  const represented = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );
  return new Date(
    naive.getTime() - (represented - naive.getTime()),
  ).toISOString();
};

export const StorefrontCampaignForm = forwardRef<
  StorefrontCampaignFormRef,
  Props
>(({ initialData, onSave, showToast, onValidationChange }, ref) => {
  const [name, setName] = useState(initialData?.name || "");
  const [eyebrow, setEyebrow] = useState(initialData?.eyebrow || "");
  const [title, setTitle] = useState(initialData?.title || "");
  const [titleEmphasis, setTitleEmphasis] = useState(
    initialData?.titleEmphasis || "",
  );
  const [message, setMessage] = useState(initialData?.message || "");
  const [ctaLabel, setCtaLabel] = useState(initialData?.ctaLabel || "");
  const [ctaHref, setCtaHref] = useState(initialData?.ctaHref || "");
  const [theme, setTheme] = useState<StorefrontCampaignTheme>(
    initialData?.theme || "BRAND",
  );
  const [active, setActive] = useState(initialData?.active ?? true);
  const [startsAt, setStartsAt] = useState(
    mexicoDateTime(initialData?.startsAt),
  );
  const [endsAt, setEndsAt] = useState(mexicoDateTime(initialData?.endsAt));
  const [couponId, setCouponId] = useState(
    initialData ? String(initialData.couponId) : "",
  );
  const [coupons, setCoupons] = useState<StorefrontCampaignCoupon[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const ctaComplete =
    (!ctaLabel.trim() && !ctaHref.trim()) ||
    Boolean(ctaLabel.trim() && ctaHref.trim());
  const normalizedTitleEmphasis = titleEmphasis.trim();
  const firstEmphasisIndex = normalizedTitleEmphasis
    ? title.indexOf(normalizedTitleEmphasis)
    : -1;
  const titleEmphasisValid =
    !normalizedTitleEmphasis ||
    (firstEmphasisIndex !== -1 &&
      title.indexOf(normalizedTitleEmphasis, firstEmphasisIndex + 1) === -1);
  const valid = Boolean(
    name.trim() &&
    title.trim() &&
    titleEmphasisValid &&
    startsAt &&
    endsAt &&
    couponId &&
    new Date(endsAt) > new Date(startsAt) &&
    ctaComplete,
  );

  useEffect(() => onValidationChange?.(valid), [onValidationChange, valid]);
  useEffect(() => () => onValidationChange?.(false), [onValidationChange]);
  useEffect(() => {
    apiStorefrontCampaigns
      .getAvailableCoupons(initialData?.id)
      .then(setCoupons)
      .catch(() =>
        showToast("No se pudieron cargar los cupones disponibles", "error"),
      );
  }, [initialData?.id]);

  const save = async () => {
    if (!valid || isSaving) {
      if (!valid)
        showToast(
          "Completa nombre, título, vigencia y cupón. Revisa la frase destacada y el CTA.",
          "error",
        );
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        eyebrow: eyebrow.trim() || null,
        title: title.trim(),
        titleEmphasis: normalizedTitleEmphasis || null,
        message: message.trim() || null,
        ctaLabel: ctaLabel.trim() || null,
        ctaHref: ctaHref.trim() || null,
        theme,
        active,
        startsAt: mexicoDateTimeToIso(startsAt),
        endsAt: mexicoDateTimeToIso(endsAt),
        couponId: Number(couponId),
      };
      if (initialData)
        await apiStorefrontCampaigns.update(initialData.id, payload);
      else await apiStorefrontCampaigns.create(payload);
      showToast(
        initialData ? "Campaña actualizada" : "Campaña creada",
        "success",
      );
      onSave();
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "No se pudo guardar la campaña",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({ handleSave: () => void save() }));
  const selectedCoupon =
    coupons.find((coupon) => String(coupon.id) === couponId) ||
    initialData?.coupon;
  const titlePreviewPalette = {
    BRAND: {
      background: "oklch(28% 0.025 47)",
      foreground: "oklch(98% 0.015 82)",
      accent: "oklch(83% 0.09 72)",
    },
    RED: {
      background: "oklch(38% 0.13 28)",
      foreground: "oklch(98% 0.015 82)",
      accent: "oklch(82% 0.11 72)",
    },
    PINE: {
      background: "oklch(34% 0.09 155)",
      foreground: "oklch(98% 0.015 82)",
      accent: "oklch(84% 0.1 92)",
    },
  }[theme];
  const titlePreview = titleEmphasisValid && normalizedTitleEmphasis ? (
    <>
      {title.slice(0, firstEmphasisIndex)}
      <em style={{ color: titlePreviewPalette.accent }}>
        {normalizedTitleEmphasis}
      </em>
      {title.slice(firstEmphasisIndex + normalizedTitleEmphasis.length)}
    </>
  ) : (
    title
  );

  return (
    <div
      className="grid grid-cols-1 xl:grid-cols-2"
      style={{ gap: "var(--space-lg)" }}
    >
      <NexusSection
        title="Presentación"
        subtitle="Define el mensaje breve de la campaña"
        icon={Megaphone}
        iconVariant="brand"
      >
        <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
          <NexusInput
            label="Nombre interno"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
          />
          <NexusInput
            label="Frase superior"
            value={eyebrow}
            onChange={(event) => setEyebrow(event.target.value)}
            maxLength={48}
            placeholder="Buen Fin · 13 al 17 de noviembre"
          />
          <NexusInput
            label="Título promocional"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            required
          />
          <NexusInput
            label="Frase destacada (opcional)"
            value={titleEmphasis}
            onChange={(event) => setTitleEmphasis(event.target.value)}
            maxLength={120}
            placeholder="de descuento"
            helperText="Se mostrará en cursiva y con el acento de la campaña. Debe coincidir exactamente con una sola parte del título."
            error={
              titleEmphasisValid
                ? undefined
                : "La frase debe aparecer una sola vez en el título."
            }
          />
          <div
            className="flex flex-col border border-white/15"
            style={{
              backgroundColor: titlePreviewPalette.background,
              borderRadius: "var(--radius-inner-visual)",
              gap: "var(--space-xs)",
              padding: "var(--padding-inner)",
            }}
            role="group"
            aria-label="Vista previa del título promocional"
          >
            <span
              className="text-label uppercase"
              style={{ color: "oklch(82% 0.025 67)" }}
            >
              Vista previa
            </span>
            <p
              className="max-w-full"
              style={{
                color: titlePreviewPalette.foreground,
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: "var(--text-hero)",
                fontWeight: 400,
                letterSpacing: 0,
                lineHeight: 1.08,
                maxWidth: "18ch",
                margin: 0,
                textWrap: "balance",
              }}
            >
              {titlePreview || "Título promocional"}
            </p>
          </div>
          <NexusTextarea
            label="Mensaje"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={240}
            rows={3}
            placeholder="Aprovecha el descuento en ejemplares participantes."
          />
          <div
            className="grid grid-cols-1 md:grid-cols-2"
            style={{ gap: "var(--space-md)" }}
          >
            <NexusInput
              label="Texto del CTA"
              value={ctaLabel}
              onChange={(event) => setCtaLabel(event.target.value)}
              maxLength={32}
              placeholder="Ver promociones"
            />
            <NexusInput
              label="Destino interno"
              value={ctaHref}
              onChange={(event) => setCtaHref(event.target.value)}
              maxLength={240}
              placeholder="/store?type=BIRD"
            />
          </div>
        </div>
      </NexusSection>

      <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
        <NexusSection
          title="Promoción y vigencia"
          subtitle="La campaña reutiliza un cupón existente"
          icon={TicketPercent}
        >
          <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
            <NexusSelect
              label="Cupón asociado"
              value={couponId}
              onChange={(event) => setCouponId(event.target.value)}
              required
            >
              <option value="">Selecciona un cupón</option>
              {coupons.map((coupon) => (
                <option key={coupon.id} value={coupon.id}>
                  {coupon.code} · {coupon.discountValue}% ·{" "}
                  {coupon.name || (coupon.active ? "Activo" : "Inactivo")}
                </option>
              ))}
            </NexusSelect>
            {selectedCoupon && (
              <p className="text-secondary text-text-muted">
                {selectedCoupon.scope === "BIRD"
                  ? "Solo aves"
                  : selectedCoupon.scope === "ITEM"
                    ? "Solo artículos"
                    : "Aves y artículos"}
                {selectedCoupon.birdPurpose
                  ? ` · ${selectedCoupon.birdPurpose === "COMBAT" ? "Combate" : "Cría"}`
                  : ""}
                {selectedCoupon.usageLimit !== null &&
                selectedCoupon.usageLimit !== undefined
                  ? ` · ${Math.max(0, selectedCoupon.usageLimit - selectedCoupon.usedCount)} usos disponibles`
                  : ""}
              </p>
            )}
            <NexusSelect
              label="Acento de campaña"
              value={theme}
              onChange={(event) =>
                setTheme(event.target.value as StorefrontCampaignTheme)
              }
            >
              <option value="BRAND">Marca</option>
              <option value="RED">Rojo</option>
              <option value="PINE">Verde pino</option>
            </NexusSelect>
            <div
              className="grid grid-cols-1 md:grid-cols-2"
              style={{ gap: "var(--space-md)" }}
            >
              <NexusInput
                label="Inicia (hora de Ciudad de México)"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                required
              />
              <NexusInput
                label="Finaliza (hora de Ciudad de México)"
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                required
              />
            </div>
            {startsAt && endsAt && new Date(endsAt) <= new Date(startsAt) && (
              <p className="text-secondary text-red-700">
                La fecha de cierre debe ser posterior al inicio.
              </p>
            )}
            <div
              className="flex items-center justify-between"
              style={{ gap: "var(--space-md)" }}
            >
              <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
                <span className="text-h3 text-text-main">
                  Programar campaña
                </span>
                <span className="text-secondary text-text-muted">
                  Se mostrará automáticamente durante la vigencia.
                </span>
              </div>
              <NexusSwitch
                checked={active}
                onChange={setActive}
                aria-label="Programar campaña"
              />
            </div>
          </div>
        </NexusSection>

        <NexusSection
          title="Reglas de publicación"
          subtitle="El precio destacado debe coincidir con el checkout"
          icon={CalendarClock}
        >
          <p className="text-secondary text-text-muted">
            Solo se admiten cupones porcentuales activos, sin mínimo de compra
            ni tope de descuento. El cupón debe cubrir toda la vigencia; Nexus
            lo valida de nuevo al cerrar el pedido.
          </p>
        </NexusSection>
      </div>
    </div>
  );
});
