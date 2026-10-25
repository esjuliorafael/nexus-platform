import assert from "node:assert/strict";
import test from "node:test";
import {
  getDashboardAccess,
  projectDashboardCommercialOverview,
  projectDashboardStats,
} from "../src/modules/store/dashboard/dashboard-permissions";

const makeRequest = (permissions: string[]) =>
  ({ user: { permissions } }) as any;

test("dashboard stats expose only enabled sections and permitted source alerts", () => {
  const access = getDashboardAccess(
    makeRequest(["dashboard.operations.view", "orders.view"]),
  );
  const result = projectDashboardStats(
    {
      orders: { pending: { count: 3, amount: 500 } },
      participations: { pending: { count: 4, amount: 800 } },
      attention: {
        paymentReviews: {
          orders: { count: 1, amount: 200 },
          participations: { count: 2, amount: 300 },
        },
        inventoryIncidents: 5,
        rafflesAwaitingResolution: 6,
        prizesAwaitingFulfillment: 7,
      },
      milestones: [{ id: "private-milestone" }],
    },
    access,
  );

  assert.deepEqual(result.orders, { pending: { count: 3, amount: 500 } });
  assert.equal(result.participations, undefined);
  assert.deepEqual(result.attention?.paymentReviews, {
    orders: { count: 1, amount: 200 },
  });
  assert.equal(result.attention?.inventoryIncidents, undefined);
  assert.equal(result.attention?.rafflesAwaitingResolution, undefined);
  assert.equal(result.milestones, undefined);
});

test("commercial overview filters history and removes unassigned financial sections", () => {
  const access = getDashboardAccess(makeRequest(["orders.view"]));
  const result = projectDashboardCommercialOverview(
    {
      period: "7D",
      source: "ALL",
      paymentMethod: "ALL",
      granularity: "DAY",
      range: { from: null, to: "2026-10-25" },
      salesBySource: { total: { store: 100, raffles: 200 } },
      pulse: { confirmed: { count: 3, amount: 300 } },
      history: [
        { kind: "ORDER", id: "52" },
        { kind: "PARTICIPATION", id: "raffle-8" },
      ],
      messagingCost: { estimatedMxn: 90 },
    },
    access,
  );

  assert.equal("salesBySource" in result, false);
  assert.equal("pulse" in result, false);
  assert.equal("messagingCost" in result, false);
  assert.deepEqual(result.history, [{ kind: "ORDER", id: "52" }]);
});

test("commercial indicators do not grant access to transaction history", () => {
  const access = getDashboardAccess(makeRequest(["dashboard.sales.view"]));
  const result = projectDashboardCommercialOverview(
    {
      period: "7D",
      source: "ALL",
      paymentMethod: "ALL",
      granularity: "DAY",
      range: { from: null, to: "2026-10-25" },
      salesBySource: { total: { store: 100, raffles: 200 } },
      pulse: { confirmed: { count: 3, amount: 300 } },
      history: [{ kind: "ORDER", id: "52" }],
      messagingCost: { estimatedMxn: 90 },
    },
    access,
  );

  assert.deepEqual(result.salesBySource, { total: { store: 100, raffles: 200 } });
  assert.deepEqual(result.history, []);
  assert.equal("messagingCost" in result, false);
});
