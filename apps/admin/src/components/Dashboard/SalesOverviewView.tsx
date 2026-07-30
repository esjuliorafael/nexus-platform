import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bird,
  CircleDollarSign,
  Hash,
  Layers,
  Minus,
  Package,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiDashboard } from "../../api";
import type {
  SalesOverview,
  SalesOverviewPaymentMethod,
  SalesOverviewPeriod,
  SalesOverviewProductType,
} from "../../types";
import { NexusAutonomousBadge, NexusSectionBadge } from "../ui/NexusBadge";
import { NexusSectionButton } from "../ui/NexusButton";
import { NexusAutonomousCard } from "../ui/NexusCard";
import { NexusSection } from "../ui/NexusSection";
import { NexusPaginator } from "../ui/NexusPaginator";
import { NexusSectionSearch } from "../ui/NexusSearchInput";
import { NexusSpinner } from "../ui/NexusSpinner";
import {
  compactMoneyAxis,
  SALES_CHART_AXIS_TICK,
  SALES_CHART_BAR_RADIUS,
  SALES_CHART_MARGIN,
  SALES_CHART_MIN_TICK_GAP,
  SALES_CHART_TOOLTIP_ITEM_STYLE,
  SALES_CHART_TOOLTIP_LABEL_STYLE,
  SALES_CHART_TOOLTIP_SEPARATOR,
  SALES_CHART_TOOLTIP_STYLE,
} from "../Widgets/salesChartSystem";

type SalesOverviewViewProps = {
  period: SalesOverviewPeriod;
  productType: SalesOverviewProductType;
  paymentMethod: SalesOverviewPaymentMethod;
  showToast: (message: string, type?: "success" | "error") => void;
  onOpenOrder: (orderId: string) => void;
};

const money = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(value);

const decimal = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);

const localDateKey = (value: Date) =>
  [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");

const compactDate = (value: string) =>
  new Date(value).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const compactTime = (value: string) =>
  new Date(value).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

const comparisonLabel: Record<Exclude<SalesOverviewPeriod, "ALL">, string> = {
  TODAY: "que ayer",
  "7D": "que los 7 días anteriores",
  "15D": "que los 15 días anteriores",
  MONTH: "que el periodo anterior equivalente",
};

export const SalesOverviewView = ({
  period,
  productType,
  paymentMethod,
  showToast,
  onOpenOrder,
}: SalesOverviewViewProps) => {
  const [overview, setOverview] = useState<SalesOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [historySearch, setHistorySearch] = useState("");
  const [debouncedHistorySearch, setDebouncedHistorySearch] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedHistorySearch(historySearch.trim()),
      250,
    );

    return () => window.clearTimeout(timeoutId);
  }, [historySearch]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiDashboard
      .getSalesOverview(
        period,
        productType,
        paymentMethod,
        debouncedHistorySearch,
        page,
      )
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
  }, [
    debouncedHistorySearch,
    page,
    paymentMethod,
    period,
    productType,
    showToast,
  ]);

  useEffect(() => {
    setPage(1);
  }, [debouncedHistorySearch, paymentMethod, period, productType]);

  const chartData = useMemo(() => {
    const salesByDay: Record<string, number> = overview?.salesByDay ?? {};

    if (period === "ALL") {
      const monthlySales = Object.entries(salesByDay).reduce<
        Record<string, number>
      >((result, [date, value]) => {
        const monthKey = date.slice(0, 7);
        result[monthKey] = (result[monthKey] || 0) + value;
        return result;
      }, {});

      return Object.entries(monthlySales)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([month, value]) => {
          const date = `${month}-01`;
          return {
            date,
            label: new Date(`${date}T12:00:00`).toLocaleDateString("es-MX", {
              month: "short",
              year: "2-digit",
            }),
            value,
            isCurrent: false,
          };
        });
    }

    const from = overview?.trendRange?.from ?? overview?.range.from;
    const to = overview?.trendRange?.to ?? overview?.range.to;
    if (!from || !to) return [];

    const cursor = new Date(from);
    const end = new Date(to);
    cursor.setHours(12, 0, 0, 0);
    end.setHours(12, 0, 0, 0);
    const todayKey = localDateKey(new Date());
    const points = [];

    while (cursor <= end) {
      const date = localDateKey(cursor);
      const label =
        period === "TODAY"
          ? cursor.toLocaleDateString("es-MX", { weekday: "short" })
          : period === "7D"
            ? cursor.toLocaleDateString("es-MX", {
                weekday: "short",
                day: "numeric",
              })
            : cursor.toLocaleDateString("es-MX", { day: "numeric" });

      points.push({
        date,
        label: label.replace(".", ""),
        value: salesByDay[date] || 0,
        isCurrent: date === todayKey,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return points;
  }, [overview?.salesByDay, overview?.trendRange, period]);

  const selectedMetrics =
    overview?.metricsByProductType?.[productType] ??
    (overview
      ? {
          netRevenue: overview.metrics.netRevenue,
          refundedAmount: overview.metrics.refundedAmount,
          orders: overview.metrics.orders,
          units: overview.metrics.unitsSold,
          previousNetRevenue: overview.comparison?.previousNetRevenue || 0,
          percentageChange: overview.comparison?.percentageChange ?? null,
          direction: overview.comparison?.direction || null,
        }
      : undefined);
  const orderHistory = overview?.orderHistory ?? [];
  const historyPagination = overview?.pagination ?? {
    page: 1,
    pageSize: 8,
    totalItems: orderHistory.length,
    totalPages: 1,
  };

  const comparison = useMemo(() => {
    if (!selectedMetrics || period === "ALL") return null;

    const { direction, percentageChange } = selectedMetrics;
    if (!direction) return null;
    if (direction === "NEW") {
      return {
        badge: "Nuevo",
        icon: Sparkles,
        variant: "success" as const,
        text: "sin ventas en el periodo anterior",
      };
    }

    const percentage = `${Math.abs(percentageChange || 0).toLocaleString("es-MX", {
      maximumFractionDigits: 1,
    })}%`;

    if (direction === "UP") {
      return {
        badge: `+${percentage}`,
        icon: ArrowUpRight,
        variant: "success" as const,
        text: comparisonLabel[period],
      };
    }

    if (direction === "DOWN") {
      return {
        badge: `-${percentage}`,
        icon: ArrowDownRight,
        variant: "danger" as const,
        text: comparisonLabel[period],
      };
    }

    return {
      badge: percentage,
      icon: Minus,
      variant: "muted" as const,
      text: comparisonLabel[period],
    };
  }, [period, selectedMetrics]);

  return (
    <div
      className="mx-auto flex w-full max-w-7xl flex-col"
      style={{ gap: "var(--space-lg)", paddingBottom: "var(--space-3xl)" }}
    >
      {loading ? (
        <NexusSpinner label="Calculando ventas confirmadas..." />
      ) : overview ? (
        <>
          <div className="grid grid-cols-1 items-stretch gap-[var(--space-lg)] xl:grid-cols-2">
            <NexusAutonomousCard className="h-full">
              <div className="flex h-full flex-col" style={{ gap: "var(--space-md)" }}>
                <div className="flex min-w-0 items-center">
                  <div className="flex min-w-0 items-center" style={{ gap: "var(--space-md)" }}>
                    <div
                      className="grid shrink-0 place-items-center border border-border-main bg-bg-muted text-brand-600"
                      style={{
                        width: "var(--size-button-autonomous)",
                        height: "var(--size-button-autonomous)",
                        borderRadius: "var(--radius-card-inner)",
                      }}
                    >
                      <CircleDollarSign size={20} strokeWidth={2.2} />
                    </div>
                    <div
                      className="flex min-w-0 flex-1 flex-col"
                      style={{ gap: "var(--space-xs)" }}
                    >
                      <h3 className="text-h1 text-text-main">Ingresos Netos</h3>
                      <p className="text-secondary text-text-muted">
                        Ventas confirmadas del periodo.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="flex min-w-0 flex-col"
                  style={{ gap: "var(--space-sm)" }}
                >
                  <strong className="text-display tabular-nums text-text-main">
                    {money(selectedMetrics?.netRevenue || 0)}
                  </strong>
                  {comparison ? (
                    <div
                      className="flex flex-wrap items-center"
                      style={{ gap: "var(--space-sm)" }}
                    >
                      <NexusAutonomousBadge
                        icon={comparison.icon}
                        variant={comparison.variant}
                      >
                        {comparison.badge}
                      </NexusAutonomousBadge>
                      <span className="text-secondary text-text-muted">
                        {comparison.text}
                      </span>
                    </div>
                  ) : null}
                  {(selectedMetrics?.refundedAmount || 0) > 0 ? (
                    <span className="text-label text-text-muted">
                      {money(selectedMetrics?.refundedAmount || 0)} devueltos
                    </span>
                  ) : null}
                </div>

                <div
                  className="mt-auto grid grid-cols-2 border border-border-main bg-bg-muted"
                  style={{
                    borderRadius: "var(--radius-card-inner)",
                    padding: "var(--padding-card-inner)",
                    gap: "var(--space-sm)",
                  }}
                >
                  <div
                    className="flex min-w-0 flex-col border border-border-main bg-bg-card"
                    style={{
                      gap: "var(--space-sm)",
                      padding: "var(--padding-card-nested)",
                      borderRadius: "var(--radius-card-nested-compact)",
                    }}
                  >
                    <div
                      className="flex min-w-0 items-center justify-between"
                      style={{ gap: "var(--space-sm)" }}
                    >
                      <span className="text-secondary font-semibold text-text-main">
                        Órdenes
                      </span>
                      <div
                        className="grid shrink-0 place-items-center border border-brand-100 bg-brand-50 text-brand-600"
                        style={{
                          width: "var(--size-icon-container-card-nested)",
                          height: "var(--size-icon-container-card-nested)",
                          borderRadius: "var(--radius-card-nested-control)",
                        }}
                      >
                        <ReceiptText
                          style={{
                            width: "var(--size-inner-icon-card)",
                            height: "var(--size-inner-icon-card)",
                          }}
                          strokeWidth={2}
                        />
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-col" style={{ gap: "var(--space-xs)" }}>
                      <strong className="text-h1 tabular-nums text-text-main">
                        {(selectedMetrics?.orders || 0).toLocaleString("es-MX")}
                      </strong>
                      <span className="text-label text-text-muted">
                        Promedio{" "}
                        {money(
                          (selectedMetrics?.orders || 0) > 0
                            ? (selectedMetrics?.netRevenue || 0) /
                                (selectedMetrics?.orders || 1)
                            : 0,
                        )}
                      </span>
                    </div>
                  </div>
                  <div
                    className="flex min-w-0 flex-col border border-border-main bg-bg-card"
                    style={{
                      gap: "var(--space-sm)",
                      padding: "var(--padding-card-nested)",
                      borderRadius: "var(--radius-card-nested-compact)",
                    }}
                  >
                    <div
                      className="flex min-w-0 items-center justify-between"
                      style={{ gap: "var(--space-sm)" }}
                    >
                      <span className="text-secondary font-semibold text-text-main">
                        Unidades
                      </span>
                      <div
                        className="grid shrink-0 place-items-center border border-emerald-200 bg-emerald-50 text-emerald-700"
                        style={{
                          width: "var(--size-icon-container-card-nested)",
                          height: "var(--size-icon-container-card-nested)",
                          borderRadius: "var(--radius-card-nested-control)",
                        }}
                      >
                        <PackageCheck
                          style={{
                            width: "var(--size-inner-icon-card)",
                            height: "var(--size-inner-icon-card)",
                          }}
                          strokeWidth={2}
                        />
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-col" style={{ gap: "var(--space-xs)" }}>
                      <strong className="text-h1 tabular-nums text-text-main">
                        {(selectedMetrics?.units || 0).toLocaleString("es-MX")}
                      </strong>
                      <span className="text-label text-text-muted">
                        {decimal(
                          (selectedMetrics?.orders || 0) > 0
                            ? (selectedMetrics?.units || 0) /
                                (selectedMetrics?.orders || 1)
                            : 0,
                        )}{" "}
                        por orden
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </NexusAutonomousCard>

            <NexusAutonomousCard className="h-full">
              <div className="flex h-full flex-col">
                <div
                  className="flex min-w-0 items-center"
                  style={{
                    gap: "var(--space-md)",
                    marginBottom: "var(--space-lg)",
                  }}
                >
                  <div
                    className="grid shrink-0 place-items-center border border-emerald-200 bg-emerald-50 text-emerald-700"
                    style={{
                      width: "var(--size-button-autonomous)",
                      height: "var(--size-button-autonomous)",
                      borderRadius: "var(--radius-card-inner)",
                    }}
                  >
                    <TrendingUp
                      style={{
                        width: "var(--size-inner-icon-autonomous)",
                        height: "var(--size-inner-icon-autonomous)",
                      }}
                      strokeWidth={2.2}
                    />
                  </div>
                  <div
                    className="flex min-w-0 flex-1 flex-col"
                    style={{ gap: "var(--space-xs)" }}
                  >
                    <h3 className="text-h1 text-text-main">
                      Tendencia de Ventas
                    </h3>
                    <p className="text-secondary text-text-muted">
                      Ingresos netos del periodo.
                    </p>
                  </div>
                </div>

                {chartData.length > 0 ? (
                  <div className="h-[260px] w-full flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={SALES_CHART_MARGIN}>
                        <CartesianGrid vertical={false} stroke="var(--border-main)" opacity={0.5} />
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          tick={SALES_CHART_AXIS_TICK}
                          minTickGap={SALES_CHART_MIN_TICK_GAP}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={SALES_CHART_AXIS_TICK}
                          tickFormatter={(value) => compactMoneyAxis(Number(value))}
                        />
                        <Tooltip
                          cursor={{ fill: "var(--bg-muted)", opacity: 0.5 }}
                          separator={SALES_CHART_TOOLTIP_SEPARATOR}
                          formatter={(value: number) => [money(Number(value)), "Ingresos netos"]}
                          labelFormatter={(_, payload) =>
                            payload?.[0]?.payload?.date
                              ? new Date(`${payload[0].payload.date}T12:00:00`).toLocaleDateString(
                                  "es-MX",
                                  { day: "numeric", month: "long", year: "numeric" },
                                )
                              : ""
                          }
                          contentStyle={SALES_CHART_TOOLTIP_STYLE}
                          labelStyle={SALES_CHART_TOOLTIP_LABEL_STYLE}
                          itemStyle={SALES_CHART_TOOLTIP_ITEM_STYLE}
                        />
                        <Bar
                          dataKey="value"
                          fill="var(--brand-600)"
                          radius={[
                            SALES_CHART_BAR_RADIUS,
                            SALES_CHART_BAR_RADIUS,
                            SALES_CHART_BAR_RADIUS,
                            SALES_CHART_BAR_RADIUS,
                          ]}
                        >
                          {chartData.map((entry) => (
                            <Cell
                              key={entry.date}
                              fill={
                                period !== "TODAY" || entry.isCurrent
                                  ? "var(--brand-600)"
                                  : "var(--text-muted)"
                              }
                              fillOpacity={
                                period !== "TODAY" || entry.isCurrent ? 1 : 0.28
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p
                    className="text-center text-secondary text-text-muted"
                    style={{ paddingBlock: "var(--space-lg)" }}
                  >
                    No hay ventas confirmadas en este periodo.
                  </p>
                )}
              </div>
            </NexusAutonomousCard>
          </div>

          <NexusSection
            title="Historial de Órdenes"
            subtitle={`${historyPagination.totalItems.toLocaleString("es-MX")} ${
              historyPagination.totalItems === 1 ? "orden pagada" : "órdenes pagadas"
            } en el periodo y tipo seleccionados.`}
            icon={ReceiptText}
            action={
              <NexusSectionSearch
                value={historySearch}
                onValueChange={setHistorySearch}
                placeholder="Buscar orden, cliente o producto..."
                aria-label="Buscar en el historial de órdenes"
              />
            }
          >
            <div className="divide-y divide-border-main">
              {orderHistory.length > 0 ? (
                orderHistory.map((order) => (
                  <article
                    key={order.id}
                    className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center py-[var(--space-md)] first:pt-0 last:pb-0 lg:grid-cols-[var(--size-button-card)_minmax(0,1.15fr)_minmax(0,1fr)_7.5rem_8rem_9rem]"
                    style={{ gap: "var(--space-md)" }}
                  >
                    <div
                      className="grid shrink-0 place-items-center border border-border-main bg-bg-muted text-brand-600"
                      style={{
                        width: "var(--size-icon-section-compact)",
                        height: "var(--size-icon-section-compact)",
                        borderRadius: "var(--radius-inner-visual)",
                      }}
                    >
                      <ShoppingBag
                        style={{
                          width: "var(--size-inner-icon-section-compact)",
                          height: "var(--size-inner-icon-section-compact)",
                        }}
                        strokeWidth={2}
                      />
                    </div>

                    <div
                      className="flex min-w-0 flex-col"
                      style={{ gap: "var(--space-sm)" }}
                    >
                      <div
                        className="flex min-w-0 flex-wrap items-center"
                        style={{ gap: "var(--space-base)" }}
                      >
                        <NexusSectionBadge icon={Hash} variant="brand">
                          {order.id}
                        </NexusSectionBadge>
                        <NexusSectionBadge
                          icon={
                            order.productType === "BIRD"
                              ? Bird
                              : order.productType === "ITEM"
                                ? Package
                                : Layers
                          }
                          variant="muted"
                        >
                          {order.productType === "BIRD"
                            ? "Ave"
                            : order.productType === "ITEM"
                              ? "Artículo"
                              : "Mixta"}
                        </NexusSectionBadge>
                      </div>
                      <strong
                        className="truncate text-body font-bold text-text-main"
                        title={order.customerName}
                      >
                        {order.customerName}
                      </strong>
                    </div>

                    <div
                      className="col-span-2 flex min-w-0 items-center lg:col-span-1"
                      style={{ gap: "var(--space-xs)" }}
                      title={order.itemNames.join(", ")}
                    >
                      <p className="min-w-0 flex-1 truncate text-secondary text-text-muted">
                        {order.itemNames[0]}
                      </p>
                      {order.itemNames.length > 1 && (
                        <NexusSectionBadge variant="muted">
                          +{order.itemNames.length - 1}{" "}
                          {order.itemNames.length === 2
                            ? "producto"
                            : "productos"}
                        </NexusSectionBadge>
                      )}
                    </div>

                    <div
                      className="hidden min-w-0 flex-col lg:flex"
                      style={{ gap: "var(--space-xs)" }}
                    >
                      <strong className="whitespace-nowrap text-body font-bold tabular-nums text-text-main">
                        {compactDate(order.createdAt)}
                      </strong>
                      <span className="text-secondary tabular-nums text-text-muted">
                        {compactTime(order.createdAt)}
                      </span>
                    </div>

                    <div
                      className="col-span-2 flex min-w-0 items-center justify-between lg:col-span-1 lg:flex-col lg:items-end"
                      style={{ gap: "var(--space-sm)" }}
                    >
                      <div
                        className="flex min-w-0 flex-col lg:hidden"
                        style={{ gap: "var(--space-xs)" }}
                      >
                        <strong className="text-body font-bold tabular-nums text-text-main">
                          {compactDate(order.createdAt)}
                        </strong>
                        <span className="text-secondary tabular-nums text-text-muted">
                          {compactTime(order.createdAt)}
                        </span>
                      </div>
                      <div
                        className="flex min-w-0 flex-col items-end"
                        style={{ gap: "var(--space-xs)" }}
                      >
                        <strong className="text-body font-bold tabular-nums text-text-main">
                          {money(order.netRevenue)}
                        </strong>
                        <span className="text-secondary text-text-muted">
                          {order.itemCount.toLocaleString("es-MX")}{" "}
                          {order.itemCount === 1 ? "unidad" : "unidades"}
                        </span>
                      </div>
                    </div>

                    <NexusSectionButton
                      type="button"
                      variant="secondary"
                      icon={ReceiptText}
                      onClick={() => onOpenOrder(String(order.id))}
                      className="col-span-2 w-full lg:col-span-1"
                      aria-label={`Ver detalle de la orden ${order.id}`}
                      title={`Ver detalle de la orden ${order.id}`}
                    >
                      Ver
                    </NexusSectionButton>
                  </article>
                ))
              ) : (
                <p
                  className="text-center text-secondary text-text-muted"
                  style={{ paddingBlock: "var(--space-lg)" }}
                >
                  No hay órdenes pagadas para estos filtros.
                </p>
              )}
            </div>
            <NexusPaginator
              currentPage={historyPagination.page}
              totalPages={historyPagination.totalPages}
              onPageChange={setPage}
              context="section"
            />
          </NexusSection>
        </>
      ) : null}
    </div>
  );
};
