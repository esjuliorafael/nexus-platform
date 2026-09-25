export const DASHBOARD_MILESTONES = [
  { id: "revenue-10000", metric: "REVENUE", threshold: 10_000 },
  { id: "revenue-25000", metric: "REVENUE", threshold: 25_000 },
  { id: "revenue-50000", metric: "REVENUE", threshold: 50_000 },
  { id: "revenue-100000", metric: "REVENUE", threshold: 100_000 },
  { id: "revenue-200000", metric: "REVENUE", threshold: 200_000 },
  { id: "revenue-500000", metric: "REVENUE", threshold: 500_000 },
  { id: "revenue-1000000", metric: "REVENUE", threshold: 1_000_000 },
  { id: "store-orders-10", metric: "STORE_ORDERS", threshold: 10 },
  { id: "store-orders-25", metric: "STORE_ORDERS", threshold: 25 },
  { id: "store-orders-50", metric: "STORE_ORDERS", threshold: 50 },
  { id: "store-orders-100", metric: "STORE_ORDERS", threshold: 100 },
  { id: "store-orders-250", metric: "STORE_ORDERS", threshold: 250 },
  { id: "store-orders-500", metric: "STORE_ORDERS", threshold: 500 },
  { id: "store-orders-1000", metric: "STORE_ORDERS", threshold: 1_000 },
  {
    id: "raffle-participations-10",
    metric: "RAFFLE_PARTICIPATIONS",
    threshold: 10,
  },
  {
    id: "raffle-participations-25",
    metric: "RAFFLE_PARTICIPATIONS",
    threshold: 25,
  },
  {
    id: "raffle-participations-50",
    metric: "RAFFLE_PARTICIPATIONS",
    threshold: 50,
  },
  {
    id: "raffle-participations-100",
    metric: "RAFFLE_PARTICIPATIONS",
    threshold: 100,
  },
  {
    id: "raffle-participations-250",
    metric: "RAFFLE_PARTICIPATIONS",
    threshold: 250,
  },
  {
    id: "raffle-participations-500",
    metric: "RAFFLE_PARTICIPATIONS",
    threshold: 500,
  },
  {
    id: "raffle-participations-1000",
    metric: "RAFFLE_PARTICIPATIONS",
    threshold: 1_000,
  },
  { id: "raffle-tickets-10", metric: "RAFFLE_TICKETS", threshold: 10 },
  { id: "raffle-tickets-25", metric: "RAFFLE_TICKETS", threshold: 25 },
  { id: "raffle-tickets-50", metric: "RAFFLE_TICKETS", threshold: 50 },
  { id: "raffle-tickets-100", metric: "RAFFLE_TICKETS", threshold: 100 },
  { id: "raffle-tickets-250", metric: "RAFFLE_TICKETS", threshold: 250 },
  { id: "raffle-tickets-500", metric: "RAFFLE_TICKETS", threshold: 500 },
  { id: "raffle-tickets-1000", metric: "RAFFLE_TICKETS", threshold: 1_000 },
] as const;

export type DashboardMilestoneMetric =
  (typeof DASHBOARD_MILESTONES)[number]["metric"];
export type DashboardMilestoneId =
  (typeof DASHBOARD_MILESTONES)[number]["id"];
