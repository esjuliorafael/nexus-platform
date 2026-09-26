import type {
  DashboardMilestoneMetric,
  DashboardMilestoneProgress,
} from "../../types";

export interface DashboardMilestonePreviewOption {
  id: string;
  metric: DashboardMilestoneMetric;
  threshold: number;
  label: string;
}

export const DASHBOARD_MILESTONE_PREVIEW_GROUPS = [
  { metric: "REVENUE", label: "Ingresos reconocidos" },
  { metric: "STORE_ORDERS", label: "Órdenes completadas en tienda" },
  { metric: "RAFFLE_PARTICIPATIONS", label: "Participaciones confirmadas" },
  { metric: "RAFFLE_TICKETS", label: "Boletos vendidos" },
] as const satisfies ReadonlyArray<{
  metric: DashboardMilestoneMetric;
  label: string;
}>;

export const DASHBOARD_MILESTONE_PREVIEW_OPTIONS: DashboardMilestonePreviewOption[] = [
  { id: "revenue-10000", metric: "REVENUE", threshold: 10_000, label: "$10,000" },
  { id: "revenue-25000", metric: "REVENUE", threshold: 25_000, label: "$25,000" },
  { id: "revenue-50000", metric: "REVENUE", threshold: 50_000, label: "$50,000" },
  { id: "revenue-100000", metric: "REVENUE", threshold: 100_000, label: "$100,000" },
  { id: "revenue-200000", metric: "REVENUE", threshold: 200_000, label: "$200,000" },
  { id: "revenue-500000", metric: "REVENUE", threshold: 500_000, label: "$500,000" },
  { id: "revenue-1000000", metric: "REVENUE", threshold: 1_000_000, label: "$1,000,000" },
  { id: "store-orders-10", metric: "STORE_ORDERS", threshold: 10, label: "10 órdenes" },
  { id: "store-orders-25", metric: "STORE_ORDERS", threshold: 25, label: "25 órdenes" },
  { id: "store-orders-50", metric: "STORE_ORDERS", threshold: 50, label: "50 órdenes" },
  { id: "store-orders-100", metric: "STORE_ORDERS", threshold: 100, label: "100 órdenes" },
  { id: "store-orders-250", metric: "STORE_ORDERS", threshold: 250, label: "250 órdenes" },
  { id: "store-orders-500", metric: "STORE_ORDERS", threshold: 500, label: "500 órdenes" },
  { id: "store-orders-1000", metric: "STORE_ORDERS", threshold: 1_000, label: "1,000 órdenes" },
  {
    id: "raffle-participations-10",
    metric: "RAFFLE_PARTICIPATIONS",
    threshold: 10,
    label: "10 participaciones",
  },
  {
    id: "raffle-participations-25",
    metric: "RAFFLE_PARTICIPATIONS",
    threshold: 25,
    label: "25 participaciones",
  },
  {
    id: "raffle-participations-50",
    metric: "RAFFLE_PARTICIPATIONS",
    threshold: 50,
    label: "50 participaciones",
  },
  {
    id: "raffle-participations-100",
    metric: "RAFFLE_PARTICIPATIONS",
    threshold: 100,
    label: "100 participaciones",
  },
  {
    id: "raffle-participations-250",
    metric: "RAFFLE_PARTICIPATIONS",
    threshold: 250,
    label: "250 participaciones",
  },
  {
    id: "raffle-participations-500",
    metric: "RAFFLE_PARTICIPATIONS",
    threshold: 500,
    label: "500 participaciones",
  },
  {
    id: "raffle-participations-1000",
    metric: "RAFFLE_PARTICIPATIONS",
    threshold: 1_000,
    label: "1,000 participaciones",
  },
  { id: "raffle-tickets-10", metric: "RAFFLE_TICKETS", threshold: 10, label: "10 boletos" },
  { id: "raffle-tickets-25", metric: "RAFFLE_TICKETS", threshold: 25, label: "25 boletos" },
  { id: "raffle-tickets-50", metric: "RAFFLE_TICKETS", threshold: 50, label: "50 boletos" },
  { id: "raffle-tickets-100", metric: "RAFFLE_TICKETS", threshold: 100, label: "100 boletos" },
  { id: "raffle-tickets-250", metric: "RAFFLE_TICKETS", threshold: 250, label: "250 boletos" },
  { id: "raffle-tickets-500", metric: "RAFFLE_TICKETS", threshold: 500, label: "500 boletos" },
  { id: "raffle-tickets-1000", metric: "RAFFLE_TICKETS", threshold: 1_000, label: "1,000 boletos" },
];

export const DASHBOARD_MILESTONE_PREVIEW_PARAM = "milestonePreview";

export const getDashboardMilestonePreview = (
  milestoneId: string | null,
): {
  selectedId: string;
  milestones: DashboardMilestoneProgress[];
} | null => {
  if (!milestoneId) return null;

  const selected = DASHBOARD_MILESTONE_PREVIEW_OPTIONS.find(
    (option) => option.id === milestoneId,
  );
  if (!selected) return null;

  const milestones = DASHBOARD_MILESTONE_PREVIEW_OPTIONS.filter(
    (option) => option.metric === selected.metric,
  ).map<DashboardMilestoneProgress>((option) => ({
    id: option.id,
    metric: option.metric,
    threshold: option.threshold,
    currentValue: selected.threshold,
    reached: option.threshold <= selected.threshold,
    acknowledged: option.threshold < selected.threshold,
  }));

  return { selectedId: selected.id, milestones };
};
