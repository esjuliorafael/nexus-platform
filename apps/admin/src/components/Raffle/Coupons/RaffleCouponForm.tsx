import React, { useEffect, useState } from "react";
import { BadgePercent, CalendarClock, Settings2 } from "lucide-react";
import {
  apiRaffleCoupons,
  apiRaffles,
  type RaffleCouponRecord,
} from "../../../api";
import type { Raffle } from "../../../types";
import { NexusInput, NexusSelect } from "../../ui/NexusInputs";
import { NexusSection } from "../../ui/NexusSection";

interface RaffleCouponFormProps {
  initialData?: RaffleCouponRecord;
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

export const RaffleCouponForm: React.FC<RaffleCouponFormProps> = ({
  initialData,
  onSave,
  showToast,
  onValidationChange,
}) => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [code, setCode] = useState(initialData?.code || "");
  const [name, setName] = useState(initialData?.name || "");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED">(
    initialData?.discountType || "PERCENTAGE",
  );
  const [discountValue, setDiscountValue] = useState(
    initialData ? String(initialData.discountValue) : "",
  );
  const [raffleId, setRaffleId] = useState(initialData?.raffleId || "");
  const [minTickets, setMinTickets] = useState(
    initialData?.minTickets ? String(initialData.minTickets) : "",
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
  const isFormValid = Boolean(code.trim().length >= 3 && discountNumber > 0);

  useEffect(() => {
    let cancelled = false;
    apiRaffles
      .getAll()
      .then((data) => {
        if (!cancelled) setRaffles(data);
      })
      .catch(() => showToast("No se pudieron cargar las rifas", "error"));
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    onValidationChange?.(isFormValid);
  }, [isFormValid, onValidationChange]);

  useEffect(() => () => onValidationChange?.(false), [onValidationChange]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!isFormValid) {
      showToast("Agrega un código válido y el valor del descuento", "error");
      return;
    }
    if (discountType === "PERCENTAGE" && discountNumber > 100) {
      showToast("El porcentaje no puede ser mayor a 100", "error");
      return;
    }
    if (startsAt && expiresAt && new Date(startsAt) > new Date(expiresAt)) {
      showToast("La fecha final debe ser posterior a la fecha inicial", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim() || null,
        discountType,
        discountValue: discountNumber,
        raffleId: raffleId || null,
        minTickets: optionalNumber(minTickets),
        maxDiscount: optionalNumber(maxDiscount),
        usageLimit: optionalNumber(usageLimit),
        startsAt: startsAt ? new Date(`${startsAt}T00:00:00`).toISOString() : null,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
      };

      if (initialData) await apiRaffleCoupons.update(initialData.id, payload);
      else await apiRaffleCoupons.create(payload);
      onSave();
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "No se pudo guardar el cupón",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      id="raffle-coupon-form"
      onSubmit={handleSubmit}
      className="flex flex-col animate-in fade-in duration-700"
      style={{ gap: "var(--space-lg)", paddingBottom: "var(--space-lg)" }}
    >
      <NexusSection
        icon={BadgePercent}
        title="Descuento"
        subtitle="Código y valor aplicado a la participación"
      >
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-md)" }}>
          <NexusInput
            label="Código *"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="SUERTE10"
          />
          <NexusInput
            label="Nombre interno"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Promoción de lanzamiento"
          />
          <NexusSelect
            label="Tipo de descuento *"
            value={discountType}
            onChange={(event) =>
              setDiscountType(event.target.value as "PERCENTAGE" | "FIXED")
            }
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
            placeholder={discountType === "PERCENTAGE" ? "10" : "100"}
          />
        </div>
      </NexusSection>

      <NexusSection
        icon={Settings2}
        title="Reglas"
        subtitle="Alcance, requisitos y límites del cupón"
      >
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-md)" }}>
          <NexusSelect
            label="Aplicar a *"
            value={raffleId}
            onChange={(event) => setRaffleId(event.target.value)}
          >
            <option value="">Todas las rifas</option>
            {raffles.map((raffle) => (
              <option key={raffle.id} value={raffle.id}>
                {raffle.title}
              </option>
            ))}
          </NexusSelect>
          <NexusInput
            label="Mínimo de boletos"
            type="number"
            min="1"
            step="1"
            value={minTickets}
            onChange={(event) => setMinTickets(event.target.value)}
            placeholder="Ej. 2"
          />
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
            label="Descuento máximo"
            type="number"
            min="0"
            step="0.01"
            value={maxDiscount}
            onChange={(event) => setMaxDiscount(event.target.value)}
            placeholder="Ej. 500"
            disabled={discountType === "FIXED"}
          />
        </div>
      </NexusSection>

      <NexusSection
        icon={CalendarClock}
        title="Vigencia"
        subtitle="Periodo opcional durante el que podrá utilizarse"
      >
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-md)" }}>
          <NexusInput
            label="Disponible desde"
            type="date"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
          <NexusInput
            label="Disponible hasta"
            type="date"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
        </div>
      </NexusSection>
    </form>
  );
};
