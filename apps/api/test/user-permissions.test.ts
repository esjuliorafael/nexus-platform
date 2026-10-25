import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeAdminRequest,
  isAdminManagedRequest,
  requiredPermissionForRequest,
} from "../src/utils/user-permissions";
import { createUserSchema } from "../src/modules/store/users/user.schema";

function makeRequest(url: string, method = "GET", permissions: string[] = [], body?: unknown) {
  return { url, method, user: { permissions }, body } as any;
}

test("maps high-impact admin operations to explicit permissions", () => {
  assert.equal(
    requiredPermissionForRequest(makeRequest("/api/v1/admin/dashboard/stats")),
    "dashboard.operations.view",
  );
  assert.equal(
    requiredPermissionForRequest(makeRequest("/api/v1/admin/dashboard/commercial-overview")),
    "dashboard.sales.view",
  );
  assert.equal(
    requiredPermissionForRequest(makeRequest("/api/v1/admin/dashboard/sales-overview")),
    "orders.view",
  );
  assert.equal(
    requiredPermissionForRequest(makeRequest("/api/v1/admin/shipping-zones/4", "PUT")),
    "shipping.manage",
  );
  assert.equal(
    requiredPermissionForRequest(makeRequest("/api/v1/admin/storefront-announcements", "POST")),
    "storefront.content.manage",
  );
  assert.equal(
    requiredPermissionForRequest(makeRequest("/api/v1/admin/whatsapp-channels", "GET")),
    "messaging.view",
  );
  assert.equal(
    requiredPermissionForRequest(makeRequest("/api/v1/store/orders/admin/52", "DELETE")),
    "orders.manage",
  );
  assert.equal(
    requiredPermissionForRequest(makeRequest("/api/v1/store/orders/admin/52/refund", "POST")),
    "orders.refund",
  );
  assert.equal(
    requiredPermissionForRequest(makeRequest("/api/v1/ticket-sales/admin/participations/8/status", "PATCH", [], {
      paymentStatus: "PAID",
    })),
    "raffles.financial.manage",
  );
  assert.equal(
    requiredPermissionForRequest(makeRequest("/api/v1/ticket-sales/admin/participations/8/status", "PATCH", [], {
      paymentStatus: "CANCELLED",
    })),
    "raffles.participations.manage",
  );
  assert.equal(
    requiredPermissionForRequest(makeRequest("/api/v1/raffles/admin/42/result/campaigns", "POST")),
    "messaging.send",
  );
  assert.equal(
    requiredPermissionForRequest(makeRequest("/api/v1/admin/settings", "PUT", [], {
      settings: [{ key: "raffle_enabled", value: "0" }],
    })),
    "raffles.settings.manage",
  );
  assert.equal(
    requiredPermissionForRequest(makeRequest("/api/v1/admin/settings", "PUT", [], {
      settings: [{ key: "raffle_enabled", value: "0" }, { key: "shipping_cost", value: "1" }],
    })),
    "settings.manage",
  );
});

test("dashboard endpoints accept only the relevant granular permissions", async () => {
  const makeReply = () => ({
    sent: false,
    statusCode: 200,
    status(code: number) { this.statusCode = code; return this; },
    send(body: unknown) { this.sent = true; this.body = body; return body; },
  });
  const authorize = (url: string, permissions: string[]) => {
    const reply: any = makeReply();
    return authorizeAdminRequest(
      { authenticate: async () => undefined } as any,
      makeRequest(url, url.includes("acknowledge") ? "POST" : "GET", permissions),
      reply,
    ).then(() => reply);
  };

  assert.equal(
    (await authorize("/api/v1/admin/dashboard/stats", ["dashboard.milestones.view"])).sent,
    false,
  );
  assert.equal(
    (await authorize("/api/v1/admin/dashboard/commercial-overview", ["orders.view"])).sent,
    false,
  );
  assert.equal(
    (await authorize("/api/v1/admin/dashboard/commercial-overview", ["dashboard.operations.view"])).statusCode,
    403,
  );
  assert.equal(
    (await authorize("/api/v1/admin/dashboard/milestones/REVENUE_1/acknowledge", ["dashboard.milestones.acknowledge"])).statusCode,
    403,
  );
  const acknowledgedWithBothPermissions = await authorize(
    "/api/v1/admin/dashboard/milestones/REVENUE_1/acknowledge",
    [
      "dashboard.milestones.acknowledge",
      "dashboard.milestones.view",
    ],
  );
  assert.equal(acknowledgedWithBothPermissions.sent, false, JSON.stringify(acknowledgedWithBothPermissions));
});

test("milestone acknowledgement permission requires milestone visibility", () => {
  const baseUser = { username: "staff", password: "long-enough-password", name: "Staff" };
  assert.equal(
    createUserSchema.safeParse({
      ...baseUser,
      permissions: ["dashboard.milestones.acknowledge"],
    }).success,
    false,
  );
  assert.equal(
    createUserSchema.safeParse({
      ...baseUser,
      permissions: [
        "dashboard.milestones.view",
        "dashboard.milestones.acknowledge",
      ],
    }).success,
    true,
  );
});

test("keeps the intentionally public shipping-zone endpoint outside admin authorization", () => {
  const request = makeRequest("/api/v1/admin/shipping-zones/public");
  assert.equal(isAdminManagedRequest(request), false);
});

test("rejects protected admin requests without the assigned permission", async () => {
  const request = makeRequest("/api/v1/admin/shipping-zones/4", "PUT");
  const reply: any = {
    sent: false,
    statusCode: 200,
    status(code: number) { this.statusCode = code; return this; },
    send(body: unknown) { this.sent = true; this.body = body; return body; },
  };

  await authorizeAdminRequest({ authenticate: async () => undefined } as any, request, reply);
  assert.equal(reply.statusCode, 403);
  assert.equal(reply.body.code, "USER_PERMISSION_REQUIRED");
});

test("fails closed for an admin endpoint with no permission mapping", async () => {
  const request = makeRequest("/api/v1/admin/unmapped-operation");
  const reply: any = {
    sent: false,
    status(code: number) { this.statusCode = code; return this; },
    send(body: unknown) { this.sent = true; this.body = body; return body; },
  };

  await authorizeAdminRequest({ authenticate: async () => undefined } as any, request, reply);
  assert.equal(reply.statusCode, 403);
  assert.equal(reply.body.code, "USER_PERMISSION_REQUIRED");
});

test("allows a request when the current account has the required permission", async () => {
  const request = makeRequest("/api/v1/admin/shipping-zones/4", "PUT", ["shipping.manage"]);
  const reply: any = {
    sent: false,
    status(code: number) { this.statusCode = code; return this; },
    send(body: unknown) { this.sent = true; this.body = body; return body; },
  };

  await authorizeAdminRequest({ authenticate: async () => undefined } as any, request, reply);
  assert.equal(reply.sent, false);
});

test("a management grant also permits reading that same resource", async () => {
  const request = makeRequest("/api/v1/admin/products", "GET", ["products.manage"]);
  const reply: any = {
    sent: false,
    status(code: number) { this.statusCode = code; return this; },
    send(body: unknown) { this.sent = true; this.body = body; return body; },
  };

  await authorizeAdminRequest({ authenticate: async () => undefined } as any, request, reply);
  assert.equal(reply.sent, false);
});

test("raffle-specific grants allow the read context without granting raffle edits", async () => {
  const readRequest = makeRequest("/api/v1/raffles/admin/42", "GET", ["raffles.coupons.manage"]);
  const writeRequest = makeRequest("/api/v1/raffles/admin/42", "PUT", ["raffles.coupons.manage"]);
  const makeReply = () => ({
    sent: false,
    statusCode: 200,
    status(code: number) { this.statusCode = code; return this; },
    send(body: unknown) { this.sent = true; this.body = body; return body; },
  });
  const readReply: any = makeReply();
  const writeReply: any = makeReply();

  await authorizeAdminRequest({ authenticate: async () => undefined } as any, readRequest, readReply);
  await authorizeAdminRequest({ authenticate: async () => undefined } as any, writeRequest, writeReply);

  assert.equal(readReply.sent, false);
  assert.equal(writeReply.statusCode, 403);
  assert.equal(writeReply.body.permission, "raffles.manage");
});

test("message-sending grants allow communication reads but not channel configuration", async () => {
  const readRequest = makeRequest("/api/v1/admin/whatsapp-channels", "GET", ["messaging.send"]);
  const writeRequest = makeRequest("/api/v1/admin/whatsapp-channels", "PUT", ["messaging.send"]);
  const makeReply = () => ({
    sent: false,
    statusCode: 200,
    status(code: number) { this.statusCode = code; return this; },
    send(body: unknown) { this.sent = true; this.body = body; return body; },
  });
  const readReply: any = makeReply();
  const writeReply: any = makeReply();

  await authorizeAdminRequest({ authenticate: async () => undefined } as any, readRequest, readReply);
  await authorizeAdminRequest({ authenticate: async () => undefined } as any, writeRequest, writeReply);

  assert.equal(readReply.sent, false);
  assert.equal(writeReply.statusCode, 403);
  assert.equal(writeReply.body.permission, "messaging.manage");
});
