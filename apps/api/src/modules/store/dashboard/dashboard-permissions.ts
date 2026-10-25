import type { FastifyRequest } from "fastify";
import type { PermissionId } from "@nexus/types";
import { actorHasPermission, actorHasReadPermission } from "../../../utils/user-permissions";

const hasRead = (request: FastifyRequest, permission: PermissionId) =>
  actorHasReadPermission(request, permission);

export function getDashboardAccess(request: FastifyRequest) {
  return {
    operations: actorHasPermission(request, "dashboard.operations.view"),
    sales: actorHasPermission(request, "dashboard.sales.view"),
    milestones: actorHasPermission(request, "dashboard.milestones.view"),
    messagingCost: actorHasPermission(request, "messaging.cost.view"),
    orders: hasRead(request, "orders.view"),
    raffleParticipations: hasRead(request, "raffles.participations.view"),
    products: hasRead(request, "products.view"),
    raffles: hasRead(request, "raffles.view"),
  };
}

interface AttentionStatus {
  count: number;
  amount: number;
}

interface DashboardStatsData {
  orders: { pending: AttentionStatus };
  participations: { pending: AttentionStatus };
  attention: {
    paymentReviews: {
      orders: AttentionStatus;
      participations: AttentionStatus;
    };
    inventoryIncidents: number;
    rafflesAwaitingResolution: number;
    prizesAwaitingFulfillment: number;
  };
  milestones?: unknown;
}

export function projectDashboardStats(
  stats: DashboardStatsData,
  access: ReturnType<typeof getDashboardAccess>,
) {
  const projected: {
    orders?: DashboardStatsData["orders"];
    participations?: DashboardStatsData["participations"];
    attention?: {
      paymentReviews?: Partial<DashboardStatsData["attention"]["paymentReviews"]>;
      inventoryIncidents?: number;
      rafflesAwaitingResolution?: number;
      prizesAwaitingFulfillment?: number;
    };
    milestones?: unknown;
  } = {};

  if (access.operations) {
    if (access.orders) projected.orders = stats.orders;
    if (access.raffleParticipations) {
      projected.participations = stats.participations;
    }

    const attention: NonNullable<typeof projected.attention> = {};
    if (access.orders) {
      attention.paymentReviews = { orders: stats.attention.paymentReviews.orders };
    }
    if (access.raffleParticipations) {
      attention.paymentReviews = {
        ...attention.paymentReviews,
        participations: stats.attention.paymentReviews.participations,
      };
    }
    if (access.products) {
      attention.inventoryIncidents = stats.attention.inventoryIncidents;
    }
    if (access.raffles) {
      attention.rafflesAwaitingResolution =
        stats.attention.rafflesAwaitingResolution;
    }
    if (access.raffles || access.raffleParticipations) {
      attention.prizesAwaitingFulfillment =
        stats.attention.prizesAwaitingFulfillment;
    }
    projected.attention = attention;
  }

  if (access.milestones) projected.milestones = stats.milestones;
  return projected;
}

interface CommercialOverviewData {
  period: unknown;
  source: unknown;
  paymentMethod: unknown;
  granularity: unknown;
  range: unknown;
  salesBySource: unknown;
  pulse: unknown;
  history: Array<{ kind: "ORDER" | "PARTICIPATION" }>;
  messagingCost: unknown;
}

export function projectDashboardCommercialOverview<T extends CommercialOverviewData>(
  overview: T,
  access: ReturnType<typeof getDashboardAccess>,
) {
  return {
    period: overview.period,
    source: overview.source,
    paymentMethod: overview.paymentMethod,
    granularity: overview.granularity,
    range: overview.range,
    ...(access.sales
      ? { salesBySource: overview.salesBySource, pulse: overview.pulse }
      : {}),
    history: overview.history.filter(
      ({ kind }) =>
        (kind === "ORDER" && access.orders) ||
        (kind === "PARTICIPATION" && access.raffleParticipations),
    ),
    ...(access.messagingCost ? { messagingCost: overview.messagingCost } : {}),
  };
}
