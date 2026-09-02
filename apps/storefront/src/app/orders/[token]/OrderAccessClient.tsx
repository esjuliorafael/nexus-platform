"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  CreditCard,
  Hash,
  MapPin,
  PackageCheck,
  ShoppingBag,
  Target,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { orderApi, type StoreOrderAccessResponse, type StoreOrderAccessStatus } from "../../../api/orders";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { StorefrontAutonomousCard, StorefrontCard } from "../../../components/ui/Card";
import { StorefrontIcon } from "../../../components/ui/Icon";
import { BankInfoCard } from "../../../components/checkout/BankInfoCard";
import { formatBirdAge, formatBirdPurpose, formatPrice } from "../../../utils/formatters";

const formatDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(date);
};

const statusPresentation = (status: StoreOrderAccessStatus) => {
  if (status === "PAID" || status === "SHIPPED" || status === "DELIVERED") {
    return {
      title: status === "PAID" ? "Pago confirmado" : "Orden en seguimiento",
      description:
        status === "PAID"
          ? "Tu orden quedó confirmada correctamente."
          : "Tu orden conserva el seguimiento de entrega.",
      icon: status === "PAID" ? CheckCircle2 : PackageCheck,
      variant: "success" as const,
    };
  }
  if (status === "CANCELLED" || status === "EXPIRED") {
    return {
      title: status === "EXPIRED" ? "Plazo concluido" : "Orden cancelada",
      description:
        status === "EXPIRED"
          ? "La orden ya no conserva la reserva de sus productos."
          : "Esta orden ya no está activa.",
      icon: CircleAlert,
      variant: "muted" as const,
    };
  }
  return {
    title: "Pago pendiente",
    description: "Consulta las instrucciones y completa tu pago dentro del plazo.",
    icon: CreditCard,
    variant: "warning" as const,
  };
};

const deliveryLabel = (type: "SHIPPING" | "PICKUP") =>
  type === "PICKUP" ? "Recoger en tienda" : "Envío a domicilio";

export function OrderAccessClient({
  token,
  initialData,
}: {
  token: string;
  initialData: StoreOrderAccessResponse | null;
}) {
  const [data, setData] = useState<StoreOrderAccessResponse | null>(initialData);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (initialData) return;
    let cancelled = false;
    const load = async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const access = await orderApi.getAccess(token);
          if (!cancelled) setData(access);
          return;
        } catch (error: any) {
          const status = error?.response?.status;
          if (status === 429 || attempt === 2) break;
          await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
        }
      }
      if (!cancelled) setFailed(true);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [initialData, token]);

  if (!data && !failed) {
    return <div className="mx-auto min-h-[58vh] max-w-5xl px-[var(--sf-inset-page)]" aria-busy="true" />;
  }

  if (failed || !data) {
    return (
      <div className="mx-auto flex min-h-[58vh] max-w-xl items-center px-[var(--sf-inset-page)]">
        <StorefrontAutonomousCard className="w-full text-center" density="default">
          <StorefrontIcon icon={CircleAlert} variant="warning" className="mx-auto" />
          <h1 className="sf-text-h2 mt-[var(--sf-space-md)] text-stone-900">Consulta no disponible</h1>
          <p className="sf-text-secondary mt-[var(--sf-space-xs)] text-stone-500">Este enlace es privado, pudo vencer o ya no está disponible.</p>
          <Button asChild context="section" className="mt-[var(--sf-space-lg)]"><Link href="/store">Ver tienda</Link></Button>
        </StorefrontAutonomousCard>
      </div>
    );
  }

  const presentation = statusPresentation(data.order.status);
  const deadline = formatDate(data.order.paymentExpiresAt);
  const delivery = data.order.delivery;
  const shippingLines = [
    delivery.street || delivery.address,
    delivery.neighborhood,
    [delivery.postalCode, delivery.city].filter(Boolean).join(", "),
    delivery.state,
  ].filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-5xl px-[var(--sf-inset-page)] pb-[var(--sf-space-2xl)] pt-[var(--sf-space-xl)] md:pt-[var(--sf-space-2xl)]">
      <div className="flex flex-col" style={{ gap: "var(--sf-space-lg)" }}>
        <header className="flex flex-col" style={{ gap: "var(--sf-space-xs)" }}>
          <Button asChild context="section" variant="outline" icon={ArrowLeft} className="self-start">
            <Link href="/store">Volver a la tienda</Link>
          </Button>
          <div className="flex items-center" style={{ gap: "var(--sf-space-sm)" }}>
            <StorefrontIcon icon={ShoppingBag} variant="brand" />
            <p className="sf-text-eyebrow text-brand-600">Consulta privada</p>
          </div>
          <h1 className="sf-text-h1 text-stone-900">Mi orden</h1>
          <p className="sf-text-secondary text-stone-500">
            Orden <span className="font-semibold text-stone-700">#{data.order.id}</span>
            {data.customerName && <> · {data.customerName}</>}
          </p>
        </header>

        <StorefrontAutonomousCard density="default">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between" style={{ gap: "var(--sf-space-md)" }}>
            <div className="flex min-w-0 items-center" style={{ gap: "var(--sf-space-sm)" }}>
              <StorefrontIcon icon={presentation.icon} variant={presentation.variant} />
              <div>
                <p className="sf-text-h3 text-stone-900">{presentation.title}</p>
                <p className="sf-text-secondary text-stone-500">{presentation.description}</p>
              </div>
            </div>
            <Badge variant={presentation.variant}>{data.order.statusLabel}</Badge>
          </div>
        </StorefrontAutonomousCard>

        <StorefrontCard level={2} density="default">
          <div className="flex items-start" style={{ gap: "var(--sf-space-sm)" }}>
            <StorefrontIcon icon={ShoppingBag} variant="brand" />
            <div className="min-w-0 flex-1">
              <h2 className="sf-text-h2 text-stone-900">Productos de tu orden</h2>
              <div className="mt-[var(--sf-space-md)] flex flex-col" style={{ gap: "var(--sf-space-sm)" }}>
                {data.order.items.map((item) => (
                  <div key={item.id} className="border-b border-stone-100 pb-[var(--sf-space-md)] last:border-0 last:pb-0">
                    <div className="flex items-start justify-between" style={{ gap: "var(--sf-space-md)" }}>
                      <div className="min-w-0">
                        <p className="sf-text-body font-semibold text-stone-800">{item.name}</p>
                        <p className="sf-text-secondary text-stone-500">{item.quantity} × ${formatPrice(item.unitPrice)}</p>
                      </div>
                      <p className="sf-text-body shrink-0 font-semibold text-stone-900">${formatPrice(item.lineTotal)}</p>
                    </div>
                    {item.productInfo && (
                      <div className="mt-[var(--sf-space-md)] border-t border-stone-100 pt-[var(--sf-space-md)]">
                        <p className="sf-text-eyebrow text-stone-500">Información del ave</p>
                        <dl className="mt-[var(--sf-space-sm)] grid grid-cols-1 gap-[var(--sf-space-sm)] sm:grid-cols-3">
                          <OrderProductInfoItem
                            icon={Hash}
                            label="No. anillo"
                            value={item.productInfo.ringNumber || "N/A"}
                          />
                          <OrderProductInfoItem
                            icon={CalendarClock}
                            label="Edad / etapa"
                            value={formatBirdAge(item.productInfo.age)}
                          />
                          <OrderProductInfoItem
                            icon={Target}
                            label="Propósito"
                            value={formatBirdPurpose(item.productInfo.purpose)}
                          />
                        </dl>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-[var(--sf-space-lg)] flex flex-col border-t border-stone-200 pt-[var(--sf-space-md)]" style={{ gap: "var(--sf-space-xs)" }}>
                <div className="flex justify-between sf-text-secondary text-stone-500"><span>Subtotal</span><span>${formatPrice(data.order.totals.subtotal)}</span></div>
                {data.order.totals.discountTotal > 0 && <div className="flex justify-between sf-text-secondary text-stone-500"><span>Descuento</span><span>-${formatPrice(data.order.totals.discountTotal)}</span></div>}
                {data.order.totals.shippingCost > 0 && <div className="flex justify-between sf-text-secondary text-stone-500"><span>Envío</span><span>${formatPrice(data.order.totals.shippingCost)}</span></div>}
                <div className="mt-[var(--sf-space-xs)] flex justify-between" style={{ gap: "var(--sf-space-md)" }}><span className="sf-text-h3 font-semibold text-stone-900">Total</span><span className="sf-text-h3 font-semibold text-stone-900">${formatPrice(data.order.totals.total)}</span></div>
              </div>
            </div>
          </div>
        </StorefrontCard>

        {deadline && data.order.status === "PENDING" && (
          <StorefrontCard level={2} density="default">
            <div className="flex items-start" style={{ gap: "var(--sf-space-sm)" }}>
              <StorefrontIcon icon={Clock3} variant="warning" />
              <div>
                <h2 className="sf-text-h2 text-stone-900">Plazo para pagar</h2>
                <p className="sf-text-secondary mt-[var(--sf-space-xs)] text-stone-500">Realiza tu pago antes de esta fecha para conservar tu orden.</p>
                <p className="sf-text-body mt-[var(--sf-space-sm)] font-semibold text-stone-800">{deadline}</p>
              </div>
            </div>
          </StorefrontCard>
        )}

        {data.bankInfo && data.order.status === "PENDING" && data.order.paymentMethod === "TRANSFER" && (
          <BankInfoCard
            bankInfo={data.bankInfo}
            onCopy={(value) => {
              void navigator.clipboard?.writeText(value);
            }}
          />
        )}

        <StorefrontCard level={2} density="default">
          <div className="flex items-start" style={{ gap: "var(--sf-space-sm)" }}>
            <StorefrontIcon icon={delivery.type === "PICKUP" ? MapPin : Truck} variant="muted" />
            <div>
              <h2 className="sf-text-h2 text-stone-900">Entrega</h2>
              <p className="sf-text-secondary mt-[var(--sf-space-xs)] text-stone-500">{deliveryLabel(delivery.type)}</p>
              {delivery.receiverName && <p className="sf-text-secondary mt-[var(--sf-space-sm)] text-stone-700">Recibe: <span className="font-semibold">{delivery.receiverName}</span></p>}
              {delivery.type === "SHIPPING" && shippingLines.length > 0 && (
                <p className="sf-text-secondary mt-[var(--sf-space-sm)] whitespace-pre-line text-stone-700">{shippingLines.join("\n")}</p>
              )}
              {delivery.type === "PICKUP" && delivery.method && <p className="sf-text-secondary mt-[var(--sf-space-sm)] text-stone-700">{delivery.method}</p>}
            </div>
          </div>
        </StorefrontCard>
      </div>
    </div>
  );
}

function OrderProductInfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center text-stone-500" style={{ gap: "var(--sf-space-xs)" }}>
        <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
        <span className="sf-text-eyebrow">{label}</span>
      </dt>
      <dd className="sf-text-secondary mt-[var(--sf-space-xs)] font-semibold text-stone-800">{value}</dd>
    </div>
  );
}
