import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { BadgePercent, CalendarClock, Settings2 } from "lucide-react";
import { apiCoupons } from "../../../api";
import type { Coupon, CouponDiscountType, CouponScope } from "../../../types";
import { NexusInput, NexusSelect } from "../../ui/NexusInputs";
import { NexusSection } from "../../ui/NexusSection";

interface CouponFormProps {
  initialData?: Coupon;
  onSave: () => void;
  showToast: (message: string, type?: "success" | "error") => void;
  onValidationChange?: (isValid: boolean) => void;
}

const toDateInput = (value?: string | null) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
};

const optionalNumber = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
};

export const CouponForm = forwardRef<
  { handleSave: () => void },
  CouponFormProps
>(({ initialData, onSave, showToast, onValidationChange }, ref) => {
  const [code, setCode] = useState(initialData?.code || "");
  const [name, setName] = useState(initialData?.name || "");
  const [discountType, setDiscountType] = useState<CouponDiscountType>(
    initialData?.discountType || "PERCENTAGE",
  );
  const [discountValue, setDiscountValue] = useState(
    initialData ? String(initialData.discountValue) : "",
  );
  const [scope, setScope] = useState<CouponScope>(initialData?.scope || "ALL");
  const [minSubtotal, setMinSubtotal] = useState(
    initialData?.minSubtotal ? String(initialData.minSubtotal) : "",
  );
  const [maxDiscount, setMaxDiscount] = useState(
    initialData?.maxDiscount ? String(initialData.maxDiscount) : "",
  );
  const [usageLimit, setUsageLimit] = useState(
    initialData?.usageLimit ? String(initialData.usageLimit) : "",
  );
  const [startsAt, setStartsAt] = useState(toDateInput(initialData?.startsAt));
  const [expiresAt, setExpiresAt] = useState(toDateInput(initialData?.expiresAt));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const discountNumber = Number(discountValue);
  const isFormValid = Boolean(code.trim().length >= 2 && discountNumber > 0);

  useEffect(() => {
    onValidationChange?.(isFormValid);
  }, [isFormValid, onValidationChange]);

  useEffect(() => {
    return () => onValidationChange?.(false);
  }, [onValidationChange]);

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (isSubmitting) return;
    if (!isFormValid) {
      showToast("Agrega código y descuento para guardar el cupón", "error");
      return;
    }
    if (discountType === "PERCENTAGE" && discountNumber > 100) {
      showToast("El porcentaje no puede ser mayor a 100", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim() || null,
        discountType,
        discountValue: discountNumber,
        scope,
        minSubtotal: optionalNumber(minSubtotal),
        maxDiscount: optionalNumber(maxDiscount),
        usageLimit: usageLimit.trim() ? Number(usageLimit) : null,
        startsAt: startsAt ? new Date(`${startsAt}T00:00:00`).toISOString() : null,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
      };

      if (initialData) {
        await apiCoupons.update(initialData.id, payload);
      } else {
        await apiCoupons.create(payload);
      }

      onSave();
    } catch (error: any) {
      console.error("Error guardando cupón:", error);
      showToast(error?.response?.data?.message || "No se pudo guardar el cupón", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  useImperativeHandle(ref, () => ({
    handleSave: () => handleSubmit(),
  }));

  return (
    <form
      id="coupon-form"
      onSubmit={handleSubmit}
      className="flex flex-col animate-in fade-in duration-700"
      style={{ gap: "var(--space-lg)", paddingBottom: "var(--space-lg)" }}
    >
      <NexusSection
        icon={BadgePercent}
        title="Descuento"
        subtitle="Código y valor aplicado al carrito"
      >
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-md)" }}>
          <NexusInput
            label="Código *"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="VERANO10"
          />
          <NexusInput
            label="Nombre interno"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Promoción de verano"
          />
          <NexusSelect
            label="Tipo de descuento *"
            value={discountType}
            onChange={(event) => setDiscountType(event.target.value as CouponDiscountType)}
          >
            <option value="PERCENTAGE">Porcentaje</option>
            <option value="FIXED">Monto fijo</option>
          </NexusSelect>
          <NexusInput
            label={discountType === "PERCENTAGE" ? "Porcentaje *" : "Monto *"}
            type="number"
            min="0"
            step="0.01"
            value={discountValue}
            onChange={(event) => setDiscountValue(event.target.value)}
            placeholder={discountType === "PERCENTAGE" ? "10" : "500"}
          />
        </div>
      </NexusSection>

      <NexusSection
        icon={Settings2}
        title="Reglas"
        subtitle="Alcance, límites y condiciones"
      >
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-md)" }}>
          <NexusSelect
            label="Aplicar a *"
            value={scope}
            onChange={(event) => setScope(event.target.value as CouponScope)}
          >
            <option value="ALL">Todos</option>
            <option value="BIRD">Aves</option>
            <option value="ITEM">Artículos</option>
          </NexusSelect>
          <NexusInput
            label="Límite de usos"
            type="number"
            min="1"
            step="1"
            value={usageLimit}
            onChange={(event) => setUsageLimit(event.target.value)}
            placeholder="Ej. 100"
          />
          <NexusInput
            label="Subtotal mínimo"
            type="number"
            min="0"
            step="0.01"
            value={minSubtotal}
            onChange={(event) => setMinSubtotal(event.target.value)}
            placeholder="Ej. 1000"
          />
          <NexusInput
            label="Descuento máximo"
            type="number"
            min="0"
            step="0.01"
            value={maxDiscount}
            onChange={(event) => setMaxDiscount(event.target.value)}
            placeholder="Ej. 500"
          />
        </div>
      </NexusSection>

      <NexusSection
        icon={CalendarClock}
        title="Vigencia"
        subtitle="Opcional, si el cupón tiene fechas definidas"
      >
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-md)" }}>
          <NexusInput
            label="Publicar desde"
            type="date"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
          <NexusInput
            label="Publicar hasta"
            type="date"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
        </div>
      </NexusSection>
    </form>
  );
});
