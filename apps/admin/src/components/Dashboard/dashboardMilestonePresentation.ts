import {
  BadgeDollarSign,
  ShoppingBag,
  Ticket,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { DashboardMilestoneMetric } from "../../types";

export interface DashboardMilestoneMetricPresentation {
  label: string;
  description: string;
  icon: LucideIcon;
  iconVariant: "brand" | "blue" | "emerald" | "orange";
  format: (value: number) => string;
}

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);

const formatCount = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 0,
  }).format(value);

export const DASHBOARD_MILESTONE_PRESENTATION: Record<
  DashboardMilestoneMetric,
  DashboardMilestoneMetricPresentation
> = {
  REVENUE: {
    label: "Ingresos reconocidos",
    description: "Acumulado comercial válido de la operación.",
    icon: BadgeDollarSign,
    iconVariant: "emerald",
    format: formatMoney,
  },
  STORE_ORDERS: {
    label: "Órdenes completadas en tienda",
    description: "Órdenes reconocidas y no anuladas.",
    icon: ShoppingBag,
    iconVariant: "blue",
    format: formatCount,
  },
  RAFFLE_PARTICIPATIONS: {
    label: "Participaciones confirmadas",
    description: "Apartados de rifas con pago confirmado.",
    icon: UsersRound,
    iconVariant: "brand",
    format: formatCount,
  },
  RAFFLE_TICKETS: {
    label: "Boletos vendidos",
    description: "Boletos vendidos, incluidos los compartidos.",
    icon: Ticket,
    iconVariant: "orange",
    format: formatCount,
  },
};

export const DASHBOARD_MILESTONE_METRIC_ORDER: DashboardMilestoneMetric[] = [
  "REVENUE",
  "STORE_ORDERS",
  "RAFFLE_PARTICIPATIONS",
  "RAFFLE_TICKETS",
];
