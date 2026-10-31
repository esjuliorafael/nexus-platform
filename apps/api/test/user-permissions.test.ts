import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeAdminRequest,
  canReadSettingKey,
  isAdminManagedRequest,
  redactSettingValueForReader,
  requiredPermissionForRequest,
} from "../src/utils/user-permissions";
import { createUserSchema } from "../src/modules/store/users/user.schema";

function makeRequest(url: string, method = "GET", permissions: string[] = [], body?: unknown, role = "STAFF") {
  return { url, method, user: { permissions, role }, body } as any;
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
    "storefront.announcements.manage",
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
    requiredPermissionForRequest(makeRequest("/api/v1/ticket-sales/admin/participations/8/private-link", "POST")),
    "raffles.participations.link.share",
  );
  assert.equal(
    requiredPermissionForRequest(makeRequest("/api/v1/ticket-sales/admin/participations/8/private-link/send", "POST")),
    "raffles.participations.link.share",
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
    "raffles.settings.manage",
  );
  assert.equal(
    requiredPermissionForRequest(makeRequest("/api/v1/admin/settings/unknown_runtime_key", "PUT")),
    "platform.settings.manage",
  );
});

test("private participation links require both participation access and the dedicated share permission", async () => {
  const makeReply = () => ({
    sent: false,
    statusCode: 200,
    status(code: number) { this.statusCode = code; return this; },
    send(body: unknown) { this.sent = true; this.body = body; return body; },
  });
  const authorize = async (permissions: string[]) => {
    const reply: any = makeReply();
    await authorizeAdminRequest(
      { authenticate: async () => undefined } as any,
      makeRequest("/api/v1/ticket-sales/admin/participations/8/private-link/send", "POST", permissions),
      reply,
    );
    return reply;
  };

  assert.equal(
    (await authorize(["raffles.participations.link.share"])).statusCode,
    403,
  );
  assert.equal(
    (await authorize(["raffles.participations.view", "messaging.send"])).statusCode,
    403,
  );
  assert.equal(
    (await authorize(["raffles.participations.view", "raffles.participations.link.share"])).sent,
    false,
  );
  assert.equal(
    (await authorize(["raffles.participations.manage", "raffles.participations.link.share"])).sent,
    false,
  );
});

test("scopes settings reads by key and reserves platform values for Superadmin", () => {
  const shippingReader = makeRequest("/api/v1/admin/settings", "GET", ["shipping.view"]);
  assert.equal(canReadSettingKey(shippingReader, "shipping_cost"), true);
  assert.equal(canReadSettingKey(shippingReader, "storage_r2_secret_key"), false);
  assert.equal(canReadSettingKey(shippingReader, "whatsapp_evolution_instance"), false);
  assert.equal(canReadSettingKey(makeRequest("/api/v1/admin/settings", "GET", ["settings.manage"]), "unknown_runtime_key"), false);
  assert.equal(
    canReadSettingKey(makeRequest("/api/v1/admin/settings", "GET", ["platform.settings.view"]), "storage_r2_secret_key"),
    false,
  );
  assert.equal(
    canReadSettingKey(makeRequest("/api/v1/admin/settings", "GET", ["platform.settings.view"], undefined, "SUPERADMIN"), "storage_r2_secret_key"),
    true,
  );
  assert.equal(
    redactSettingValueForReader(makeRequest("/api/v1/admin/settings", "GET", ["platform.settings.view"], undefined, "SUPERADMIN"), "storage_r2_secret_key"),
    true,
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
    (await authorize("/api/v1/admin/dashboard/commercial-overview", ["dashboard.history.view"])).sent,
    false,
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

test("accepts the explicit dashboard history permission", () => {
  const baseUser = { username: "staff", password: "long-enough-password", name: "Staff" };
  assert.equal(
    createUserSchema.safeParse({
      ...baseUser,
      permissions: ["dashboard.history.view"],
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

test("settings batch updates require every domain permission and platform role", async () => {
  const makeReply = () => ({
    sent: false,
    statusCode: 200,
    status(code: number) { this.statusCode = code; return this; },
    send(body: unknown) { this.sent = true; this.body = body; return body; },
  });
  const body = {
    settings: [
      { key: "raffle_enabled", value: "0" },
      { key: "shipping_cost", value: "1" },
    ],
  };
  const actorWithBothScopes = makeRequest(
    "/api/v1/admin/settings",
    "PUT",
    ["raffles.settings.manage", "shipping.manage"],
    body,
  );
  const allowedReply: any = makeReply();
  await authorizeAdminRequest({ authenticate: async () => undefined } as any, actorWithBothScopes, allowedReply);
  assert.equal(allowedReply.sent, false);

  const missingScopeReply: any = makeReply();
  await authorizeAdminRequest(
    { authenticate: async () => undefined } as any,
    makeRequest("/api/v1/admin/settings", "PUT", ["raffles.settings.manage"], body),
    missingScopeReply,
  );
  assert.equal(missingScopeReply.statusCode, 403);

  const platformBody = { settings: [{ key: "storage_r2_bucket_name", value: "assets" }] };
  const nonSuperadminReply: any = makeReply();
  await authorizeAdminRequest(
    { authenticate: async () => undefined } as any,
    makeRequest("/api/v1/admin/settings", "PUT", ["platform.settings.manage"], platformBody),
    nonSuperadminReply,
  );
  assert.equal(nonSuperadminReply.statusCode, 403);
  assert.equal(nonSuperadminReply.body.code, "SUPERADMIN_REQUIRED");

  const superadminReply: any = makeReply();
  await authorizeAdminRequest(
    { authenticate: async () => undefined } as any,
    makeRequest("/api/v1/admin/settings", "PUT", ["platform.settings.manage"], platformBody, "SUPERADMIN"),
    superadminReply,
  );
  assert.equal(superadminReply.sent, false);
});

test("specialized channel writes require routing, payment, and messaging permissions", async () => {
  const makeReply = () => ({
    sent: false,
    statusCode: 200,
    status(code: number) { this.statusCode = code; return this; },
    send(body: unknown) { this.sent = true; this.body = body; return body; },
  });
  const authorize = async (permissions: string[]) => {
    const reply: any = makeReply();
    await authorizeAdminRequest(
      { authenticate: async () => undefined } as any,
      makeRequest("/api/v1/admin/channels/COMBAT", "DELETE", permissions),
      reply,
    );
    return reply;
  };

  assert.equal((await authorize(["channels.manage"])).statusCode, 403);
  assert.equal(
    (await authorize(["channels.manage", "payments.config.manage"])).statusCode,
    403,
  );
  assert.equal(
    (await authorize(["channels.manage", "payments.config.manage", "messaging.manage"])).sent,
    false,
  );
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

test("store, storefront, raffle-coupon, and media permissions separate reads from mutations", async () => {
  const routeCases = [
    ["/api/v1/admin/products", "GET", "products.view"],
    ["/api/v1/admin/products", "POST", "products.create"],
    ["/api/v1/admin/products/12", "PUT", "products.update"],
    ["/api/v1/admin/products/12", "DELETE", "products.delete"],
    ["/api/v1/admin/products/assisted-checkout-options", "GET", "payment-links.generate"],
    ["/api/v1/store/orders/admin/assisted-checkout-links/12/revoke", "POST", "payment-links.revoke"],
    ["/api/v1/admin/store-heroes", "GET", "storefront.heroes.view"],
    ["/api/v1/admin/store-heroes/12", "DELETE", "storefront.heroes.delete"],
    ["/api/v1/admin/home-slides", "GET", "storefront.slides.view"],
    ["/api/v1/admin/home-slides/12", "DELETE", "storefront.slides.delete"],
    ["/api/v1/admin/coupons", "GET", "coupons.view"],
    ["/api/v1/admin/coupons/12", "DELETE", "coupons.delete"],
    ["/api/v1/admin/raffle-coupons", "GET", "raffles.coupons.view"],
    ["/api/v1/admin/raffle-coupons/raffle-options", "GET", "raffles.coupons.manage"],
    ["/api/v1/admin/raffle-coupons/12", "DELETE", "raffles.coupons.delete"],
    ["/api/v1/admin/categories", "GET", "categories.view"],
    ["/api/v1/admin/subcategories/12", "DELETE", "categories.delete"],
    ["/api/v1/admin/media", "GET", "media.view"],
    ["/api/v1/admin/media/12", "DELETE", "media.delete"],
    ["/api/v1/admin/media-vault", "GET", "media.vault.view"],
    ["/api/v1/admin/media-vault/12", "DELETE", "media.vault.delete"],
  ] as const;

  for (const [url, method, expected] of routeCases) {
    assert.equal(
      requiredPermissionForRequest(makeRequest(url, method)),
      expected,
      `${method} ${url}`,
    );
  }

  const makeReply = () => ({
    sent: false,
    statusCode: 200,
    status(code: number) { this.statusCode = code; return this; },
    send(body: unknown) { this.sent = true; this.body = body; return body; },
  });
  const authorize = async (url: string, method: string, permissions: string[]) => {
    const reply: any = makeReply();
    await authorizeAdminRequest(
      { authenticate: async () => undefined } as any,
      makeRequest(url, method, permissions),
      reply,
    );
    return reply;
  };

  assert.equal((await authorize("/api/v1/admin/products", "GET", ["products.update"])).sent, false);
  assert.equal((await authorize("/api/v1/admin/products", "GET", ["products.create"])).sent, false);
  assert.equal((await authorize("/api/v1/admin/products", "GET", ["payment-links.generate"])).statusCode, 403);
  assert.equal((await authorize("/api/v1/admin/products/assisted-checkout-options", "GET", ["payment-links.generate"])).sent, false);
  assert.equal((await authorize("/api/v1/admin/products/12", "DELETE", ["products.update"])).statusCode, 403);
  assert.equal((await authorize("/api/v1/admin/products/12", "DELETE", ["products.delete"])).sent, false);
  assert.equal((await authorize("/api/v1/admin/products/12/overview", "GET", ["products.view"])).statusCode, 403);
  assert.equal((await authorize("/api/v1/admin/products/12/overview", "GET", ["products.view", "orders.view"])).sent, false);
  assert.equal((await authorize("/api/v1/admin/raffle-coupons", "GET", ["raffles.coupons.delete"])).sent, false);
  assert.equal((await authorize("/api/v1/admin/raffle-coupons/12", "DELETE", ["raffles.coupons.manage"])).statusCode, 403);
  assert.equal((await authorize("/api/v1/admin/raffle-coupons/12", "DELETE", ["raffles.coupons.delete"])).sent, false);
});

test("raffle-coupon permissions do not grant access to raffle records", async () => {
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

  assert.equal(readReply.statusCode, 403);
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
