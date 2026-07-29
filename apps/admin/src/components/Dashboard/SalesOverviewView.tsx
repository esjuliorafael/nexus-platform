import React, { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Bird,
  Boxes,
  CircleDollarSign,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiDashboard } from "../../api";
import type { SalesOverview, SalesOverviewPeriod } from "../../types";
import { NexusSectionButton } from "../ui/NexusButton";
import { NexusAutonomousCard, NexusSectionCard } from "../ui/NexusCard";
import { NexusSegmentedControl } from "../ui/NexusSegmentedControl";
import { NexusSection } from "../ui/NexusSection";
import { NexusSpinner } from "../ui/NexusSpinner";

type SalesOverviewViewProps = {
  showToast: (message: string, type?: "success" | "error") => void;
  onOpenOrder: (orderId: string) => void;
};

const PERIODS: Array<{ value: SalesOverviewPeriod; label: string }> = [
  { value: "TODAY", label: "Hoy" },
  { value: "7D", label: "7 días" },
  { value: "30D", label: "30 días" },
  { value: "MONTH", label: "Este mes" },
  { value: "ALL", label: "Histórico" },
];

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
        <strong className="text-h2 text-text-main tabular-nums">{value}</strong>
        <span className="text-caption text-text-muted">{helper}</span>
      </div>
    </div>
  </NexusAutonomousCard>
);

export const SalesOverviewView = ({
  showToast,
  onOpenOrder,
}: SalesOverviewViewProps) => {
  const [period, setPeriod] = useState<SalesOverviewPeriod>("30D");
  const [overview, setOverview] = useState<SalesOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiDashboard
      .getSalesOverview(period)
      .then((data) => {
        if (active) setOverview(data);
      })
      .catch(() => {
        if (active) showToast("No se pudo cargar el resumen de ventas", "error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period, showToast]);

  const chartData = useMemo(
    () =>
      Object.entries(overview?.salesByDay || {})
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, value]) => ({
          date,
          label: new Date(`${date}T12:00:00`).toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "short",
          }),
          value,
        })),
    [overview?.salesByDay],
  );

  return (
    <div
      className="mx-auto flex w-full max-w-7xl flex-col"
      style={{ gap: "var(--space-lg)", paddingBottom: "var(--space-3xl)" }}
    >
      <NexusAutonomousCard density="micro">
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NexusSegmentedControl
            value={period}
            options={PERIODS}
            onChange={setPeriod}
            ariaLabel="Periodo del resumen de ventas"
            className="min-w-max"
          />
        </div>
      </NexusAutonomousCard>

      {loading ? (
        <NexusSpinner label="Calculando ventas confirmadas..." />
      ) : overview ? (
        <>
          <div className="grid grid-cols-1 gap-[var(--space-md)] sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Ingresos netos"
              value={money(overview.metrics.netRevenue)}
              helper={
                overview.metrics.refundedAmount > 0
                  ? `${money(overview.metrics.refundedAmount)} devueltos`
                  : "Después de devoluciones"
              }
              icon={CircleDollarSign}
            />
            <MetricCard
              label="Órdenes pagadas"
              value={overview.metrics.orders.toLocaleString("es-MX")}
              helper={`Ticket promedio ${money(overview.metrics.ticketAverage)}`}
              icon={ReceiptText}
            />
            <MetricCard
              label="Unidades vendidas"
              value={overview.metrics.unitsSold.toLocaleString("es-MX")}
              helper={`${overview.metrics.distinctProducts} productos distintos`}
              icon={PackageCheck}
            />
            <MetricCard
              label="Aves / Artículos"
              value={`${overview.metrics.birdsSold} / ${overview.metrics.itemUnitsSold}`}
              helper="Unidades con pago confirmado"
              icon={Boxes}
            />
          </div>

          <NexusSection
            title="Tendencia de ventas"
            subtitle="Ingresos netos confirmados dentro del periodo seleccionado."
            icon={TrendingUp}
            iconVariant="emerald"
          >
            {chartData.length > 0 ? (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 0, left: -16, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border-main)" opacity={0.5} />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--text-muted)", fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--text-muted)", fontSize: 11, fontWeight: 600 }}
                      tickFormatter={(value) => `$${Number(value).toLocaleString("es-MX")}`}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--bg-muted)", opacity: 0.5 }}
                      formatter={(value: number) => [money(Number(value)), "Ingresos netos"]}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.date
                          ? new Date(`${payload[0].payload.date}T12:00:00`).toLocaleDateString(
                              "es-MX",
                              { day: "numeric", month: "long", year: "numeric" },
                            )
                          : ""
                      }
                      contentStyle={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-main)",
                        borderRadius: "var(--radius-card-inner)",
                      }}
                    />
                    <Bar dataKey="value" fill="var(--brand-600)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-secondary text-text-muted">
                No hay ventas confirmadas en este periodo.
              </p>
            )}
          </NexusSection>

          <div className="grid grid-cols-1 gap-[var(--space-lg)] xl:grid-cols-2">
            <NexusSection
              title="Composición"
              subtitle="Unidades e ingresos aportados por cada tipo de producto."
              icon={ShoppingBag}
            >
              <div className="grid grid-cols-1 gap-[var(--space-md)] sm:grid-cols-2">
                <NexusSectionCard
                  icon={Bird}
                  title="Aves"
                  subtitle={`${overview.typeBreakdown.birds.units} unidades vendidas`}
                  rightContent={
                    <strong className="text-secondary text-text-main">
                      {money(overview.typeBreakdown.birds.revenue)}
                    </strong>
                  }
                />
                <NexusSectionCard
                  icon={Boxes}
                  title="Artículos"
                  subtitle={`${overview.typeBreakdown.items.units} unidades vendidas`}
                  rightContent={
                    <strong className="text-secondary text-text-main">
                      {money(overview.typeBreakdown.items.revenue)}
                    </strong>
                  }
                />
              </div>
            </NexusSection>

            <NexusSection
              title="Mayor movimiento"
              subtitle="Productos ordenados por unidades confirmadas."
              icon={Banknote}
            >
              <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
                {overview.topProducts.length > 0 ? (
                  overview.topProducts.slice(0, 4).map((product) => (
                    <NexusSectionCard
                      key={product.productId}
                      icon={product.type === "BIRD" ? Bird : Boxes}
                      title={product.name}
                      subtitle={`${product.units} ${
                        product.units === 1 ? "unidad" : "unidades"
                      } · ${product.orders} ${product.orders === 1 ? "orden" : "órdenes"}`}
                      rightContent={
                        <strong className="text-secondary text-text-main">
                          {money(product.revenue)}
                        </strong>
                      }
                    />
                  ))
                ) : (
                  <p className="text-secondary text-text-muted">
                    No hay productos vendidos en este periodo.
                  </p>
                )}
              </div>
            </NexusSection>
          </div>

          <NexusSection
            title="Órdenes recientes"
            subtitle="Operaciones pagadas que integran este resumen."
            icon={ReceiptText}
          >
            <div className="grid grid-cols-1 gap-[var(--space-md)] xl:grid-cols-2">
              {overview.recentOrders.length > 0 ? (
                overview.recentOrders.map((order) => (
                  <NexusSectionCard
                    key={order.id}
                    icon={ShoppingBag}
                    title={`Orden #${order.id} · ${order.customerName}`}
                    subtitle={`${dateTime(order.createdAt)} · ${order.itemCount} ${
                      order.itemCount === 1 ? "unidad" : "unidades"
                    }`}
                    rightContent={
                      <div className="flex flex-col items-end" style={{ gap: "var(--space-xs)" }}>
                        <strong className="text-secondary text-text-main">
                          {money(Math.max(0, order.total - order.refundedAmount))}
                        </strong>
                        <span className="text-caption text-text-muted">
                          {order.itemNames.join(", ")}
                        </span>
                      </div>
                    }
                    actions={
                      <NexusSectionButton
                        type="button"
                        variant="secondary"
                        icon={ReceiptText}
                        onClick={() => onOpenOrder(String(order.id))}
                      >
                        Ver Orden
                      </NexusSectionButton>
                    }
                  />
                ))
              ) : (
                <p className="text-secondary text-text-muted">
                  No hay órdenes pagadas en este periodo.
                </p>
              )}
            </div>
          </NexusSection>
        </>
      ) : null}
    </div>
  );
};
