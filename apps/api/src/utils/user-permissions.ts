import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { PermissionId } from "@nexus/types";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const readImpliedPermissions: Partial<Record<PermissionId, PermissionId[]>> = {
  "orders.view": [
    "orders.manage", "orders.financial.manage", "orders.refund", "orders.restore",
  ],
  "products.view": ["products.create", "products.update", "products.delete"],
  "categories.view": ["categories.manage", "categories.delete"],
  "storefront.heroes.view": ["storefront.heroes.manage", "storefront.heroes.delete"],
  "storefront.slides.view": ["storefront.slides.manage", "storefront.slides.delete"],
  "storefront.announcements.view": ["storefront.announcements.manage", "storefront.announcements.delete"],
  "coupons.view": ["coupons.manage", "coupons.delete"],
  "payment-links.view": ["payment-links.generate", "payment-links.revoke"],
  "media.view": ["media.manage", "media.delete"],
  "media.vault.view": ["media.vault.upload", "media.vault.delete"],
  "shipping.view": ["shipping.manage"],
  "billing.view": ["billing.manage"],
  "channels.view": ["channels.manage"],
  "payments.config.view": ["payments.config.manage"],
  "storefront.status.view": ["storefront.status.manage"],
  "storefront.branding.view": ["storefront.branding.manage"],
  "inventory.policies.view": ["inventory.policies.manage"],
  "inventory.audit": ["inventory.reservations.release"],
  "raffles.settings.view": ["raffles.settings.manage"],
  "platform.settings.view": ["platform.settings.manage"],
  "users.view": ["users.create", "users.update", "users.delete", "users.permissions.manage", "users.roles.manage"],
  "messaging.view": ["messaging.manage", "messaging.send"],
  "raffles.view": [
    "raffles.manage", "raffles.results.manage", "raffles.participations.manage",
    "raffles.financial.manage", "raffles.settings.manage",
    "raffles.intelligence.view", "raffles.intelligence.manage",
  ],
  "raffles.participations.view": [
    "raffles.participations.manage", "raffles.financial.manage",
  ],
  "raffles.coupons.view": ["raffles.coupons.manage", "raffles.coupons.delete"],
  "raffles.intelligence.view": ["raffles.intelligence.manage", "raffles.intelligence.export"],
  "raffles.intelligence.export": ["raffles.intelligence.manage"],
};

const legacyPermissionGrants: Record<string, PermissionId[]> = {
  "users.manage": ["users.view", "users.create", "users.update", "users.delete", "users.permissions.manage"],
  "settings.view": [
    "storefront.status.view", "storefront.branding.view", "storefront.heroes.view",
    "storefront.slides.view", "storefront.announcements.view", "inventory.policies.view",
    "raffles.settings.view", "payments.config.view", "shipping.view", "messaging.view",
  ],
  "settings.manage": [
    "storefront.status.manage", "storefront.branding.manage", "inventory.policies.manage",
    "shipping.manage", "payments.config.manage", "messaging.manage",
  ],
  "products.manage": ["products.view", "products.create", "products.update", "products.delete"],
  "payment-links.manage": ["payment-links.view", "payment-links.generate", "payment-links.revoke"],
  "storefront.content.view": [
    "storefront.heroes.view", "storefront.slides.view", "storefront.announcements.view",
  ],
  "storefront.content.manage": [
    "storefront.heroes.view", "storefront.heroes.manage", "storefront.heroes.delete",
    "storefront.slides.view", "storefront.slides.manage", "storefront.slides.delete",
    "storefront.announcements.view", "storefront.announcements.manage", "storefront.announcements.delete",
    "storefront.branding.view", "storefront.branding.manage",
  ],
  "media.vault.manage": ["media.vault.view", "media.vault.upload", "media.vault.delete"],
};

const pathOf = (request: FastifyRequest) => request.url.split("?")[0];
const methodOf = (request: FastifyRequest) => request.method.toUpperCase() as Method;
const starts = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);
const isWrite = (method: Method) => method !== "GET";

function settingPermissionForKey(key: string, write: boolean): PermissionId {
  const normalized = key.toLowerCase();
  if (
    normalized.startsWith("storage_r2_") ||
    normalized.startsWith("whatsapp_evolution_") ||
    normalized.startsWith("mp_app_") ||
    normalized.startsWith("kapso_")
  ) {
    return write ? "platform.settings.manage" : "platform.settings.view";
  }
  if (normalized.startsWith("branding_") || normalized === "brand_name") {
    return write ? "storefront.branding.manage" : "storefront.branding.view";
  }
  if (normalized.startsWith("storefront_")) {
    return write ? "storefront.status.manage" : "storefront.status.view";
  }
  if (normalized.startsWith("shipping_")) return write ? "shipping.manage" : "shipping.view";
  if (normalized.startsWith("raffle_")) return write ? "raffles.settings.manage" : "raffles.settings.view";
  if (normalized.startsWith("inventory_") || normalized === "mp_payment_hold_minutes" || normalized.startsWith("payment_recovery_")) {
    return write ? "inventory.policies.manage" : "inventory.policies.view";
  }
  if (normalized.startsWith("bank_main_") || normalized.startsWith("mp_")) {
    return write ? "payments.config.manage" : "payments.config.view";
  }
  if (normalized.startsWith("whatsapp_")) return write ? "messaging.manage" : "messaging.view";
  if (normalized.startsWith("payment_") || normalized.startsWith("mercadopago_")) {
    return write ? "payments.config.manage" : "payments.config.view";
  }
  return write ? "platform.settings.manage" : "platform.settings.view";
}

function settingKeysForRequest(request: FastifyRequest, path: string): string[] {
  const keyMatch = path.match(/^\/api\/v1\/admin\/settings\/([^/]+)$/);
  if (keyMatch) return [decodeURIComponent(keyMatch[1])];
  if (path !== "/api/v1/admin/settings") return [];
  const settings = (request.body as { settings?: Array<{ key?: string }> } | undefined)?.settings;
  return Array.isArray(settings)
    ? settings.map((setting) => setting.key).filter((key): key is string => typeof key === "string")
    : [];
}

const settingReadPermissions: PermissionId[] = [
  "storefront.status.view", "storefront.branding.view",
  "storefront.heroes.view", "storefront.slides.view", "storefront.announcements.view",
  "shipping.view", "inventory.policies.view",
  "payments.config.view", "messaging.view", "raffles.settings.view",
  "platform.settings.view",
];

function hasPermission(request: FastifyRequest, permission: PermissionId) {
  const permissions = expandedRequestPermissions(request);
  return [permission, ...(readImpliedPermissions[permission] ?? [])].some((id) => permissions.has(id));
}

function expandedRequestPermissions(request: FastifyRequest) {
  const assigned = (request.user as { permissions?: string[] } | undefined)?.permissions ?? [];
  const expanded = new Set(assigned);
  assigned.forEach((permission) => legacyPermissionGrants[permission]?.forEach((grant) => expanded.add(grant)));
  return expanded;
}

export function canReadSettingKey(request: FastifyRequest, key: string) {
  const permission = settingPermissionForKey(key, false);
  if (!hasPermission(request, permission)) return false;
  if (permission === "platform.settings.view" && (request.user as any)?.role !== "SUPERADMIN") return false;
  return true;
}

export function redactSettingValueForReader(request: FastifyRequest, key: string) {
  const permissions = expandedRequestPermissions(request);
  const sensitive = /(secret|token|api_key|access_key|private_key|client_id|evolution_key|password|kapso_customer)/i.test(key);
  const permission = settingPermissionForKey(key, true);
  const canManage = permissions.has(permission);
  return sensitive && !canManage;
}

export function requiredPermissionForRequest(request: FastifyRequest): PermissionId | null {
  const path = pathOf(request);
  const method = methodOf(request);

  if (starts(path, "/api/v1/admin/dashboard")) {
    if (/^\/api\/v1\/admin\/dashboard\/milestones\/[^/]+\/acknowledge$/.test(path)) {
      return "dashboard.milestones.acknowledge";
    }
    if (path === "/api/v1/admin/dashboard/stats") return "dashboard.operations.view";
    if (path === "/api/v1/admin/dashboard/commercial-overview") return "dashboard.sales.view";
    if (path === "/api/v1/admin/dashboard/sales-overview") return "orders.view";
    return null;
  }
  if (starts(path, "/api/v1/admin/users")) {
    if (path.endsWith("/contact")) return "users.update";
    if (method === "POST") return "users.create";
    if (method === "DELETE") return "users.delete";
    if (method === "PUT") return "users.update";
    return "users.view";
  }
  if (starts(path, "/api/v1/admin/billing")) return isWrite(method) ? "billing.manage" : "billing.view";
  if (starts(path, "/api/v1/admin/products")) {
    if (path === "/api/v1/admin/products/assisted-checkout-options") return "payment-links.generate";
    if (method === "GET") return "products.view";
    if (method === "POST") return "products.create";
    return method === "DELETE" ? "products.delete" : "products.update";
  }
  if (starts(path, "/api/v1/admin/home-slides")) {
    if (method === "GET") return "storefront.slides.view";
    return method === "DELETE" ? "storefront.slides.delete" : "storefront.slides.manage";
  }
  if (starts(path, "/api/v1/admin/store-heroes")) {
    if (method === "GET") return "storefront.heroes.view";
    return method === "DELETE" ? "storefront.heroes.delete" : "storefront.heroes.manage";
  }
  if (starts(path, "/api/v1/admin/storefront-announcements")) {
    if (method === "GET") return "storefront.announcements.view";
    return method === "DELETE" ? "storefront.announcements.delete" : "storefront.announcements.manage";
  }
  if (starts(path, "/api/v1/admin/categories") || starts(path, "/api/v1/admin/subcategories")) {
    if (method === "GET") return "categories.view";
    return method === "DELETE" ? "categories.delete" : "categories.manage";
  }
  if (starts(path, "/api/v1/admin/media-vault")) {
    if (method === "GET" || path.endsWith("/download")) return "media.vault.view";
    return method === "DELETE" ? "media.vault.delete" : "media.vault.upload";
  }
  if (starts(path, "/api/v1/admin/media")) {
    if (method === "GET") return "media.view";
    return method === "DELETE" ? "media.delete" : "media.manage";
  }
  if (starts(path, "/api/v1/admin/uploads")) return "media.upload";
  if (starts(path, "/api/v1/admin/settings")) {
    if (path === "/api/v1/admin/settings/logo") return "storefront.branding.manage";
    const keys = settingKeysForRequest(request, path);
    if (keys.length) return settingPermissionForKey(keys[0], isWrite(method));
    return isWrite(method) ? "platform.settings.manage" : "platform.settings.view";
  }
  if (starts(path, "/api/v1/admin/payment-channels")) return isWrite(method) ? "payments.config.manage" : "payments.config.view";
  if (starts(path, "/api/v1/admin/whatsapp-channels")) return isWrite(method) ? "messaging.manage" : "messaging.view";
  if (starts(path, "/api/v1/admin/whatsapp")) return isWrite(method) ? "messaging.manage" : "messaging.view";
  if (starts(path, "/api/v1/admin/shipping-zones")) return path.endsWith("/public") ? null : isWrite(method) ? "shipping.manage" : "shipping.view";
  if (starts(path, "/api/v1/admin/channels")) return isWrite(method) ? "channels.manage" : "channels.view";
  if (starts(path, "/api/v1/admin/coupons")) {
    if (method === "GET") return "coupons.view";
    return method === "DELETE" ? "coupons.delete" : "coupons.manage";
  }
  if (starts(path, "/api/v1/admin/inventory-integrity")) return path.endsWith("/release") ? "inventory.reservations.release" : "inventory.audit";
  if (starts(path, "/api/v1/admin/raffle-intelligence")) {
    if (path.endsWith("/export")) return "raffles.intelligence.export";
    return isWrite(method) ? "raffles.intelligence.manage" : "raffles.intelligence.view";
  }
  if (starts(path, "/api/v1/admin/raffle-coupons")) {
    if (path.endsWith("/raffle-options")) return "raffles.coupons.manage";
    if (method === "GET") return "raffles.coupons.view";
    return method === "DELETE" ? "raffles.coupons.delete" : "raffles.coupons.manage";
  }

  if (starts(path, "/api/v1/store/orders/admin")) {
    if (starts(path, "/api/v1/store/orders/admin/assisted-checkout-links")) {
      if (path.endsWith("/revoke")) return "payment-links.revoke";
      return method === "GET" ? "payment-links.view" : "payment-links.generate";
    }
    if (path.endsWith("/refund")) return "orders.refund";
    if (path.endsWith("/restore")) return "orders.restore";
    if (method === "DELETE") return "orders.manage";
    if (path.endsWith("/read")) return "orders.view";
    if (path.endsWith("/status")) {
      return (request.body as { status?: string } | undefined)?.status === "PAID"
        ? "orders.financial.manage"
        : "orders.manage";
    }
    if (path.endsWith("/resend-whatsapp") || path.endsWith("/whatsapp-logs")) return path.endsWith("/resend-whatsapp") ? "messaging.send" : "orders.view";
    return isWrite(method) ? "orders.manage" : "orders.view";
  }

  if (path === "/api/v1/mp/auth-url" || path === "/api/v1/mp/disconnect-main") return "payments.config.manage";
  if (path === "/api/v1/settings" || starts(path, "/api/v1/settings/")) return method === "GET" ? null : "raffles.settings.manage";
  if (starts(path, "/api/v1/raffles/admin")) {
    if (path.includes("/participant-coupon")) return "raffles.coupons.manage";
    if (path.includes("/result/campaigns") || path.includes("/invitations") || path.includes("/draw-reminder") || path.includes("/date-change")) {
      return method === "GET" ? "messaging.view" : "messaging.send";
    }
    if (path.includes("/result")) return method === "GET" ? "raffles.view" : "raffles.results.manage";
    return isWrite(method) ? "raffles.manage" : "raffles.view";
  }
  if (path === "/api/v1/raffles/featured/reorder") return "raffles.manage";
  if (path === "/api/v1/raffles" && isWrite(method)) return "raffles.manage";
  if (starts(path, "/api/v1/raffles/") && ["PUT", "PATCH", "DELETE"].includes(method)) {
    if (path.includes("/result")) return "raffles.results.manage";
    return "raffles.manage";
  }
  if (starts(path, "/api/v1/ticket-sales/admin")) {
    if (path.endsWith("/status")) {
      return (request.body as { paymentStatus?: string } | undefined)?.paymentStatus === "PAID"
        ? "raffles.financial.manage"
        : "raffles.participations.manage";
    }
    if (path.endsWith("/financial-disposition") || path.endsWith("/revert-payment-confirmation") || path.endsWith("/restore-paid") || path.endsWith("/refund")) return "raffles.financial.manage";
    if (path.endsWith("/resend-whatsapp")) return "messaging.send";
    if (path.endsWith("/restore") || method === "DELETE") return "raffles.participations.manage";
    return isWrite(method) ? "raffles.participations.manage" : "raffles.participations.view";
  }
  if (starts(path, "/api/v1/raffle-coupons/admin")) {
    if (method === "GET") return "raffles.coupons.view";
    return method === "DELETE" ? "raffles.coupons.delete" : "raffles.coupons.manage";
  }
  if (starts(path, "/api/v1/raffle-coupons")) return method === "GET" ? "raffles.coupons.view" : null;

  return null;
}

function permissionsAllowedForRequest(request: FastifyRequest, required: PermissionId) {
  if (methodOf(request) !== "GET") return [required];
  return [required, ...(readImpliedPermissions[required] ?? [])];
}

function permissionRequirementGroupsForRequest(
  request: FastifyRequest,
): PermissionId[][] {
  const path = pathOf(request);
  if (
    methodOf(request) === "GET" &&
    starts(path, "/api/v1/admin/products") &&
    path.endsWith("/overview")
  ) {
    return [["products.view"], ["orders.view"]];
  }
  if (starts(path, "/api/v1/admin/dashboard")) {
    if (/^\/api\/v1\/admin\/dashboard\/milestones\/[^/]+\/acknowledge$/.test(path)) {
      return [["dashboard.milestones.acknowledge"], ["dashboard.milestones.view"]];
    }
    if (path.endsWith("/stats")) {
      return [["dashboard.operations.view", "dashboard.milestones.view"]];
    }
    if (path.endsWith("/commercial-overview")) {
      return [[
        "dashboard.sales.view",
        "dashboard.history.view",
        "messaging.cost.view",
        "orders.view",
        "raffles.participations.view",
      ]];
    }
    if (path.endsWith("/sales-overview")) return [["orders.view"]];
  }

  if (path === "/api/v1/admin/settings" && methodOf(request) === "GET") {
    return [settingReadPermissions];
  }
  if (starts(path, "/api/v1/admin/channels") && isWrite(methodOf(request))) {
    return [["channels.manage"], ["payments.config.manage"], ["messaging.manage"]];
  }
  if (starts(path, "/api/v1/admin/settings") && isWrite(methodOf(request))) {
    const keys = settingKeysForRequest(request, path);
    if (keys.length) return keys.map((key) => [settingPermissionForKey(key, true)]);
  }
  if (starts(path, "/api/v1/admin/users") && methodOf(request) !== "GET") {
    const body = request.body as { permissions?: unknown; role?: unknown } | undefined;
    const groups: PermissionId[][] = [];
    if (methodOf(request) === "POST" || Array.isArray(body?.permissions)) {
      groups.push(["users.permissions.manage"]);
    }
    if (typeof body?.role === "string" && body.role.toUpperCase() !== "STAFF") {
      groups.push(["users.roles.manage"]);
    }
    return [[requiredPermissionForRequest(request)!], ...groups];
  }
  if (starts(path, "/api/v1/store/orders/admin/assisted-checkout-links/") && path.endsWith("/regenerate")) {
    return [["payment-links.generate"], ["payment-links.revoke"]];
  }

  const required = requiredPermissionForRequest(request);
  return required ? [[required]] : [];
}

export function actorHasReadPermission(
  request: FastifyRequest,
  required: PermissionId,
) {
  const permissions = expandedRequestPermissions(request);
  return [required, ...(readImpliedPermissions[required] ?? [])].some((permission) =>
    permissions.has(permission),
  );
}

export function isAdminManagedRequest(request: FastifyRequest) {
  const path = pathOf(request);
  return path !== "/api/v1/admin/shipping-zones/public" && (path.startsWith("/api/v1/admin/")
    || starts(path, "/api/v1/store/orders/admin")
    || starts(path, "/api/v1/raffles/admin")
    || starts(path, "/api/v1/ticket-sales/admin")
    || starts(path, "/api/v1/raffle-coupons/admin")
    || (path === "/api/v1/settings" && methodOf(request) !== "GET")
    || (starts(path, "/api/v1/settings/") && methodOf(request) !== "GET")
    || (starts(path, "/api/v1/raffles/") && ["PUT", "PATCH", "DELETE"].includes(methodOf(request)))
    || (path === "/api/v1/raffles" && methodOf(request) !== "GET")
    || path === "/api/v1/raffles/featured/reorder"
    || path === "/api/v1/mp/auth-url"
    || path === "/api/v1/mp/disconnect-main");
}

export async function authorizeAdminRequest(
  server: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!isAdminManagedRequest(request)) return;

  await server.authenticate(request, reply);
  if (reply.sent) return;

  const permission = requiredPermissionForRequest(request);
  const permissions = expandedRequestPermissions(request);
  const requirementGroups = permissionRequirementGroupsForRequest(request);
  const requiresPlatformRole = requirementGroups.some((group) =>
    group.length === 1 && (group[0] === "platform.settings.view" || group[0] === "platform.settings.manage"),
  );
  if (requiresPlatformRole && (request.user as any)?.role !== "SUPERADMIN") {
    return reply.status(403).send({
      message: "Esta configuración está reservada al Superadmin.",
      code: "SUPERADMIN_REQUIRED",
      permission,
    });
  }
  const hasPermissionForEveryGroup = requirementGroups.every((group) =>
    group.some((required) =>
      permissionsAllowedForRequest(request, required).some((allowed) =>
        permissions.has(allowed),
      ),
    ),
  );
  if (
    !permission ||
    requirementGroups.length === 0 ||
    !hasPermissionForEveryGroup
  ) {
    return reply.status(403).send({
      message: "No tienes el permiso necesario para realizar esta acción.",
      code: "USER_PERMISSION_REQUIRED",
      permission,
    });
  }
}

export function actorHasPermission(request: FastifyRequest, permission: PermissionId) {
  return expandedRequestPermissions(request).has(permission);
}
