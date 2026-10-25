import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { PERMISSION_IDS, type PermissionId } from "@nexus/types";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const pathOf = (request: FastifyRequest) => request.url.split("?")[0];
const methodOf = (request: FastifyRequest) => request.method.toUpperCase() as Method;
const starts = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);
const isWrite = (method: Method) => method !== "GET";

function isRaffleSettingsWrite(request: FastifyRequest, path: string) {
  if (!isWrite(methodOf(request))) return false;
  const keyMatch = path.match(/^\/api\/v1\/admin\/settings\/([^/]+)$/);
  if (keyMatch) return decodeURIComponent(keyMatch[1]).startsWith("raffle_");
  if (path !== "/api/v1/admin/settings") return false;
  const settings = (request.body as { settings?: Array<{ key?: string }> } | undefined)?.settings;
  return Array.isArray(settings) && settings.length > 0 &&
    settings.every((setting) => typeof setting.key === "string" && setting.key.startsWith("raffle_"));
}

export function requiredPermissionForRequest(request: FastifyRequest): PermissionId | null {
  const path = pathOf(request);
  const method = methodOf(request);

  if (starts(path, "/api/v1/admin/dashboard")) return "dashboard.view";
  if (starts(path, "/api/v1/admin/users")) return "users.manage";
  if (starts(path, "/api/v1/admin/billing")) return isWrite(method) ? "billing.manage" : "billing.view";
  if (starts(path, "/api/v1/admin/products")) return isWrite(method) ? "products.manage" : "products.view";
  if (starts(path, "/api/v1/admin/home-slides") || starts(path, "/api/v1/admin/store-heroes") || starts(path, "/api/v1/admin/storefront-announcements")) return "storefront.content.manage";
  if (starts(path, "/api/v1/admin/categories") || starts(path, "/api/v1/admin/subcategories")) return "categories.manage";
  if (starts(path, "/api/v1/admin/media-vault")) return "media.vault.manage";
  if (starts(path, "/api/v1/admin/media")) return isWrite(method) ? "media.manage" : "media.manage";
  if (starts(path, "/api/v1/admin/uploads")) return "media.upload";
  if (starts(path, "/api/v1/admin/settings")) {
    if (path === "/api/v1/admin/settings/logo") return "storefront.content.manage";
    if (isRaffleSettingsWrite(request, path)) return "raffles.settings.manage";
    return isWrite(method) ? "settings.manage" : "settings.view";
  }
  if (starts(path, "/api/v1/admin/payment-channels")) return "payments.config.manage";
  if (starts(path, "/api/v1/admin/whatsapp-channels")) return isWrite(method) ? "messaging.manage" : "messaging.view";
  if (starts(path, "/api/v1/admin/whatsapp")) return isWrite(method) ? "messaging.manage" : "messaging.view";
  if (starts(path, "/api/v1/admin/shipping-zones")) return path.endsWith("/public") ? null : isWrite(method) ? "shipping.manage" : "shipping.view";
  if (starts(path, "/api/v1/admin/channels")) return isWrite(method) ? "channels.manage" : "channels.view";
  if (starts(path, "/api/v1/admin/coupons")) return "coupons.manage";
  if (starts(path, "/api/v1/admin/inventory-integrity")) return "inventory.audit";
  if (starts(path, "/api/v1/admin/raffle-intelligence")) return isWrite(method) ? "raffles.intelligence.manage" : "raffles.intelligence.view";
  if (starts(path, "/api/v1/admin/raffle-coupons")) return "raffles.coupons.manage";

  if (starts(path, "/api/v1/store/orders/admin")) {
    if (starts(path, "/api/v1/store/orders/admin/assisted-checkout-links")) return "payment-links.manage";
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
  if (starts(path, "/api/v1/raffle-coupons/admin")) return "raffles.coupons.manage";
  if (starts(path, "/api/v1/raffle-coupons")) return method === "GET" ? "raffles.coupons.manage" : null;

  return null;
}

function permissionsAllowedForRequest(request: FastifyRequest, required: PermissionId) {
  if (methodOf(request) !== "GET") return [required];

  const readImpliedPermissions: Partial<Record<PermissionId, PermissionId[]>> = {
    "orders.view": [
      "orders.manage", "orders.financial.manage", "orders.refund", "orders.restore",
    ],
    "products.view": ["products.manage", "payment-links.manage", "coupons.manage"],
    "shipping.view": ["shipping.manage"],
    "settings.view": ["settings.manage"],
    "billing.view": ["billing.manage"],
    "channels.view": ["channels.manage"],
    "messaging.view": ["messaging.manage", "messaging.send"],
    "raffles.view": [
      "raffles.manage", "raffles.results.manage", "raffles.participations.manage",
      "raffles.financial.manage", "raffles.coupons.manage", "raffles.settings.manage",
      "raffles.intelligence.view", "raffles.intelligence.manage",
    ],
    "raffles.participations.view": [
      "raffles.participations.manage", "raffles.financial.manage",
    ],
    "raffles.intelligence.view": ["raffles.intelligence.manage"],
  };
  return [required, ...(readImpliedPermissions[required] ?? [])];
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
  const permissions = (request.user as { permissions?: string[] } | undefined)?.permissions ?? [];
  const allowedPermissions = permission
    ? permissionsAllowedForRequest(request, permission)
    : [];
  if (
    !permission ||
    !PERMISSION_IDS.includes(permission) ||
    !allowedPermissions.some((allowed) => permissions.includes(allowed))
  ) {
    return reply.status(403).send({
      message: "No tienes el permiso necesario para realizar esta acción.",
      code: "USER_PERMISSION_REQUIRED",
      permission,
    });
  }
}

export function actorHasPermission(request: FastifyRequest, permission: PermissionId) {
  return ((request.user as { permissions?: string[] } | undefined)?.permissions ?? []).includes(permission);
}
