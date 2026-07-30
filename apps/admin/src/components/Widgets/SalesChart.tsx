import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import type {
  DashboardCommercialSource,
  SalesOverviewPeriod,
} from '../../types';
import { NexusAutonomousCard } from '../ui/NexusCard';
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
} from './salesChartSystem';

interface SalesChartProps {
  data?: Record<string, { store: number; raffles: number }>;
  period?: SalesOverviewPeriod;
  source?: DashboardCommercialSource;
  totalAmount?: number;
  isLoading?: boolean;
}

interface ChartPoint {
  date: string;
  label: string;
  store: number;
  raffles: number;
  isMuted: boolean;
}

const SKELETON_BARS = [55, 80, 40, 90, 65, 75, 100];

const money = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

const localDateKey = (value: Date) =>
  [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');

const SalesChartSkeleton: React.FC = () => (
  <NexusAutonomousCard className="h-full min-h-[320px] animate-pulse">
    <div
      className="flex items-center"
      style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}
    >
      <div
        className="shrink-0 bg-bg-muted"
        style={{
          width: 'var(--size-button-autonomous)',
          height: 'var(--size-button-autonomous)',
          borderRadius: 'var(--radius-card-inner)',
        }}
      />
      <div className="flex flex-1 flex-col" style={{ gap: 'var(--space-xs)' }}>
        <div className="h-5 w-44 rounded-full bg-bg-muted" />
        <div className="h-3 w-36 rounded-full bg-bg-muted" />
      </div>
    </div>
    <div className="flex h-full flex-col justify-between">
      <div
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between"
        style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}
      >
        <div className="h-9 w-40 rounded-full bg-bg-muted" />
        <div className="flex items-center" style={{ gap: 'var(--space-base)' }}>
          <div className="h-3 w-16 rounded-full bg-bg-muted" />
          <div className="h-3 w-16 rounded-full bg-bg-muted" />
        </div>
      </div>
      <div
        className="flex min-h-[180px] flex-grow items-end justify-between pt-[var(--space-md)]"
        style={{ gap: 'var(--space-sm)' }}
      >
        {SKELETON_BARS.map((height, index) => (
          <div
            key={index}
            className="flex flex-1 flex-col items-center"
            style={{ gap: 'var(--space-sm)' }}
          >
            <div
              className="w-full bg-bg-muted"
              style={{
                height: `${height}%`,
                borderRadius: 'var(--radius-card-nested-compact)',
              }}
            />
            <div className="h-2.5 w-5 rounded-full bg-bg-muted" />
          </div>
        ))}
      </div>
    </div>
  </NexusAutonomousCard>
);

type StackedBarShapeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  opacity?: number;
  payload?: ChartPoint;
  source: 'store' | 'raffles';
};

const StackedBarShape = ({
  payload,
  source,
  ...props
}: StackedBarShapeProps) => {
  if (!payload || !props.height || props.height <= 0) return null;

  const hasOtherSource =
    source === 'store' ? payload.raffles > 0 : payload.store > 0;
  const radius: [number, number, number, number] =
    !hasOtherSource
      ? [
          SALES_CHART_BAR_RADIUS,
          SALES_CHART_BAR_RADIUS,
          SALES_CHART_BAR_RADIUS,
          SALES_CHART_BAR_RADIUS,
        ]
      : source === 'store'
        ? [0, 0, SALES_CHART_BAR_RADIUS, SALES_CHART_BAR_RADIUS]
        : [SALES_CHART_BAR_RADIUS, SALES_CHART_BAR_RADIUS, 0, 0];

  return (
    <Rectangle
      {...props}
      opacity={payload.isMuted ? 0.28 : 1}
      radius={radius}
    />
  );
};

export const SalesChart: React.FC<SalesChartProps> = ({
  data = {},
  period = '7D',
  source = 'ALL',
  totalAmount,
  isLoading = false,
}) => {
  const chartData = useMemo(() => {
    const today = new Date();
    const todayKey = localDateKey(today);

    return Object.entries(data)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([dateKey, values]) => {
        const isMonthly = dateKey.length === 7;
        const date = new Date(
          `${isMonthly ? `${dateKey}-01` : dateKey}T12:00:00`,
        );
        const label = isMonthly
          ? date.toLocaleDateString('es-MX', {
              month: 'short',
              year: '2-digit',
            })
          : period === 'TODAY'
            ? date
                .toLocaleDateString('es-MX', { weekday: 'short' })
                .replace('.', '')
            : period === 'MONTH'
              ? date.toLocaleDateString('es-MX', { day: 'numeric' })
              : date.toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                });

        return {
          date: dateKey,
          label,
          store: Number(data[dateKey]?.store || 0),
          raffles: Number(data[dateKey]?.raffles || 0),
          isMuted: period === 'TODAY' && dateKey !== todayKey,
        };
      });
  }, [data, period]);

  const chartRevenue = chartData.reduce(
    (total, point) => total + point.store + point.raffles,
    0,
  );
  const displayedRevenue = totalAmount ?? chartRevenue;

  if (isLoading) return <SalesChartSkeleton />;

  const periodDescription =
    period === 'TODAY'
      ? 'Ingresos netos de hoy.'
      : period === '7D'
        ? 'Ingresos netos de los últimos 7 días.'
        : period === '15D'
          ? 'Ingresos netos de los últimos 15 días.'
          : period === 'MONTH'
            ? 'Ingresos netos de este mes.'
            : 'Evolución histórica de los ingresos netos.';

  return (
    <NexusAutonomousCard className="h-full min-h-[320px]">
      <div className="flex h-full flex-col">
        <div
          className="flex min-w-0 items-center"
          style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}
        >
          <div
            className="grid shrink-0 place-items-center border border-emerald-200 bg-emerald-50 text-emerald-700"
            style={{
              width: 'var(--size-button-autonomous)',
              height: 'var(--size-button-autonomous)',
              borderRadius: 'var(--radius-card-inner)',
            }}
          >
            <TrendingUp
              style={{
                width: 'var(--size-inner-icon-autonomous)',
                height: 'var(--size-inner-icon-autonomous)',
              }}
              strokeWidth={2.2}
            />
          </div>

          <div
            className="flex min-w-0 flex-1 flex-col"
            style={{ gap: 'var(--space-xs)' }}
          >
            <h3 className="text-h1 text-text-main">Tendencia de Ventas</h3>
            <p className="text-secondary text-text-muted">
              {periodDescription}
            </p>
          </div>
        </div>

        <div
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between"
          style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}
        >
          <div className="flex items-baseline" style={{ gap: 'var(--space-xs)' }}>
            <strong className="text-display tabular-nums text-text-main">
              {money(displayedRevenue)}
            </strong>
            <span className="text-label text-text-muted">MXN</span>
          </div>

          <div
            className="flex flex-wrap items-center"
            aria-label="Fuentes de ingreso"
            style={{ gap: 'var(--space-base)' }}
          >
            {source !== 'RAFFLES' && (
              <span
                className="flex items-center text-secondary text-text-muted"
                style={{ gap: 'var(--space-sm)' }}
              >
                <span
                  aria-hidden="true"
                  className="bg-brand-600"
                  style={{
                    width: 'var(--space-base)',
                    height: 'var(--space-base)',
                    borderRadius: 'var(--radius-circle)',
                  }}
                />
                Tienda
              </span>
            )}
            {source !== 'STORE' && (
              <span
                className="flex items-center text-secondary text-text-muted"
                style={{ gap: 'var(--space-sm)' }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 'var(--space-base)',
                    height: 'var(--space-base)',
                    borderRadius: 'var(--radius-circle)',
                    backgroundColor: 'var(--chart-raffle)',
                  }}
                />
                Rifas
              </span>
            )}
          </div>
        </div>

        <div className="mt-auto min-h-[200px] w-full flex-grow">
          {chartRevenue === 0 ? (
            <div
              className="flex h-[220px] items-center justify-center text-center"
              style={{ paddingInline: 'var(--space-lg)' }}
            >
              <p className="max-w-md text-secondary text-text-muted">
                No hay ingresos confirmados para los filtros seleccionados.
              </p>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={chartData}
              margin={SALES_CHART_MARGIN}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--border-main)"
                opacity={0.5}
              />
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
                cursor={{ fill: 'var(--bg-muted)', opacity: 0.4 }}
                separator={SALES_CHART_TOOLTIP_SEPARATOR}
                contentStyle={SALES_CHART_TOOLTIP_STYLE}
                labelStyle={SALES_CHART_TOOLTIP_LABEL_STYLE}
                itemStyle={SALES_CHART_TOOLTIP_ITEM_STYLE}
                formatter={(value: number, name: string) => [
                  money(Number(value)),
                  name === 'store' ? 'Tienda' : 'Rifas',
                ]}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.date
                    ? new Date(
                        `${payload[0].payload.date.length === 7 ? `${payload[0].payload.date}-01` : payload[0].payload.date}T12:00:00`,
                      ).toLocaleDateString('es-MX', {
                        ...(payload[0].payload.date.length === 7
                          ? { month: 'long' as const, year: 'numeric' as const }
                          : {
                              day: 'numeric' as const,
                              month: 'long' as const,
                              year: 'numeric' as const,
                            }),
                      })
                    : ''
                }
              />
              <Bar
                dataKey="store"
                stackId="revenue"
                fill="var(--brand-600)"
                shape={(props) => (
                  <StackedBarShape
                    {...(props as unknown as StackedBarShapeProps)}
                    source="store"
                  />
                )}
              />
              <Bar
                dataKey="raffles"
                stackId="revenue"
                fill="var(--chart-raffle)"
                shape={(props) => (
                  <StackedBarShape
                    {...(props as unknown as StackedBarShapeProps)}
                    source="raffles"
                  />
                )}
              />
            </BarChart>
          </ResponsiveContainer>
          )}
        </div>
      </div>
    </NexusAutonomousCard>
  );
};
