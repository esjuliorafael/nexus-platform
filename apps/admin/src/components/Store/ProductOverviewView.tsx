import React, { useEffect, useState } from "react";
import {
  Banknote,
  Boxes,
  CircleDollarSign,
  Clock3,
  History,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { apiProducts, ASSET_BASE_URL } from "../../api";
import type { ProductOverview, ProductSale } from "../../types";
import { NexusAutonomousBadge, NexusBadge } from "../ui/NexusBadge";
import { NexusSectionButton } from "../ui/NexusButton";
import { NexusAutonomousCard, NexusSectionCard } from "../ui/NexusCard";
import { NexusActivityHistory } from "../ui/NexusActivityHistory";
import { NexusSection } from "../ui/NexusSection";
import { NexusSpinner } from "../ui/NexusSpinner";

type ProductOverviewViewProps = {
  productId: string;
  showToast: (message: string, type?: "success" | "error") => void;
  onOpenOrder: (orderId: string) => void;
};

const money = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(value);

const dateTime = (value: string) =>
  new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const fullAssetUrl = (value?: string | null) => {
  if (!value) return "";
  if (/^(https?:|blob:|data:)/.test(value)) return value;
  return `${ASSET_BASE_URL}${value.replace(/^\//, "")}`;
};

const MetricCard = ({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}) => (
  <NexusAutonomousCard density="micro">
    <div className="flex items-center" style={{ gap: "var(--space-md)" }}>
      <div
        className="grid shrink-0 place-items-center border border-border-main bg-bg-muted text-text-muted"
        style={{
          width: "var(--h-button-card)",
          height: "var(--h-button-card)",
          borderRadius: "var(--radius-inner-visual)",
        }}
      >
        <Icon size={18} strokeWidth={2} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col" style={{ gap: "var(--space-xs)" }}>
        <span className="text-label text-text-muted">{label}</span>
        <strong className="text-h2 text-text-main">{value}</strong>
        <span className="text-caption text-text-muted">{helper}</span>
      </div>
    </div>
  </NexusAutonomousCard>
);

const SaleCard = ({ sale, onOpenOrder }: { sale: ProductSale; onOpenOrder: () => void }) => (
  <NexusSectionCard
    icon={UserRound}
    title={sale.customerName}
    subtitle={`${dateTime(sale.confirmedAt)} · ${sale.quantity} ${sale.quantity === 1 ? "unidad" : "unidades"}`}
    rightContent={
      <div className="flex flex-col items-end" style={{ gap: "var(--space-xs)" }}>
        <NexusBadge variant={sale.refundedAt ? "warning" : "success"}>
          {sale.refundedAt ? "Con devolución" : "Pagada"}
        </NexusBadge>
        <strong className="text-secondary text-text-main">{money(sale.lineTotal)}</strong>
      </div>
    }
    actions={
      <NexusSectionButton type="button" variant="secondary" icon={ReceiptText} onClick={onOpenOrder}>
        Ver orden
      </NexusSectionButton>
    }
  />
);

export const ProductOverviewView = ({
  productId,
  showToast,
  onOpenOrder,
}: ProductOverviewViewProps) => {
  const [overview, setOverview] = useState<ProductOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiProducts
      .getOverview(productId)
      .then((data) => {
        if (active) setOverview(data);
      })
      .catch(() => {
        if (active) showToast("No se pudo cargar el resumen del producto", "error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId, showToast]);

  if (loading) return <NexusSpinner label="Cargando resumen del producto..." />;
  if (!overview) return null;

  const { product, metrics } = overview;
  const isBird = product.type === "BIRD";
  const mediaUrl = fullAssetUrl(product.coverPosterUrl || product.coverMediaUrl || product.imageUrl);
  const statusLabel = product.status === "sold" ? "Vendido" : product.status === "reserved" ? "Reservado" : "Disponible";
  const sales = isBird ? (overview.finalSale ? [overview.finalSale] : []) : overview.recentSales;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col" style={{ gap: "var(--space-lg)" }}>
      <NexusAutonomousCard>
        <div className="flex flex-col sm:flex-row sm:items-center" style={{ gap: "var(--space-lg)" }}>
          <div
            className="shrink-0 overflow-hidden border border-border-main bg-bg-muted"
            style={{
              width: "var(--size-card-thumb)",
              height: "var(--size-card-thumb)",
              borderRadius: "var(--radius-card-inner)",
            }}
          >
            {mediaUrl ? (
              <img src={mediaUrl} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-text-muted">
                <ShoppingBag size={22} />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col" style={{ gap: "var(--space-sm)" }}>
            <div className="flex flex-wrap items-center" style={{ gap: "var(--space-xs)" }}>
              <NexusAutonomousBadge variant="muted">{isBird ? "Ave" : "Artículo"}</NexusAutonomousBadge>
              <NexusAutonomousBadge variant={product.status === "available" ? "success" : product.status === "reserved" ? "warning" : "danger"}>
                {statusLabel}
              </NexusAutonomousBadge>
              <NexusAutonomousBadge variant={product.published ? "brand" : "muted"}>
                {product.published ? "Publicado" : "Pausado"}
              </NexusAutonomousBadge>
            </div>
            <h2 className="text-h1 text-text-main">{product.name}</h2>
            <p className="text-secondary text-text-muted">
              {isBird && product.ringNumber ? `Anillo ${product.ringNumber} · ` : ""}
              {money(product.price)}
            </p>
          </div>
        </div>
      </NexusAutonomousCard>

      <div className="grid grid-cols-1 gap-[var(--space-md)] sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Importe vendido" value={money(metrics.confirmedRevenue)} helper="Ventas confirmadas" icon={CircleDollarSign} />
        <MetricCard label={isBird ? "Venta confirmada" : "Unidades vendidas"} value={isBird ? String(metrics.confirmedOrders) : String(metrics.unitsSold)} helper={isBird ? "Orden con pago confirmado" : "Suma histórica confirmada"} icon={PackageCheck} />
        <MetricCard label="Apartados activos" value={String(metrics.activeReservations)} helper="Inventario pendiente de pago" icon={Clock3} />
        <MetricCard label={isBird ? "Apartados liberados" : "Stock actual"} value={String(isBird ? metrics.releasedReservations : metrics.currentStock)} helper={isBird ? "Conteo agregado, sin clientes" : "Existencias disponibles"} icon={isBird ? History : Boxes} />
      </div>

      <NexusSection
        title={isBird ? "Venta confirmada" : "Ventas confirmadas"}
        subtitle={isBird ? "Comprador final y orden asociada." : "Últimas órdenes que incluyen este artículo."}
        icon={Banknote}
      >
        {sales.length > 0 ? (
          <div className="grid grid-cols-1 gap-[var(--space-md)] xl:grid-cols-2">
            {sales.map((sale) => (
              <SaleCard key={`${sale.orderId}-${sale.confirmedAt}`} sale={sale} onOpenOrder={() => onOpenOrder(sale.orderId)} />
            ))}
          </div>
        ) : (
          <p className="text-secondary text-text-muted">Este producto todavía no tiene una venta confirmada.</p>
        )}
      </NexusSection>

      <NexusSection
        title="Historial de actividad"
        subtitle="Cambios administrativos y desenlaces comerciales relevantes."
        icon={History}
      >
        <NexusActivityHistory events={overview.activityEvents} emptyMessage="Aún no hay actividad registrada para este producto." />
      </NexusSection>
    </div>
  );
};
