import { FastifyInstance } from "fastify";
import { productRoutes, productAdminRoutes } from "./products/product.routes";
import { orderRoutes } from "./orders/order.routes";
import { categoryRoutes, subcategoryRoutes } from "./categories/category.routes";
import { mediaRoutes } from "./media/media.routes";
import { settingRoutes } from "./settings/setting.routes";
import { paymentChannelRoutes } from "./payment-channels/payment-channel.routes";
import { whatsappChannelRoutes } from "./whatsapp-channels/whatsapp-channel.routes";
import { evolutionProxyRoutes } from "./whatsapp-channels/evolution-proxy.routes";
import { shippingZoneRoutes } from "./shipping-zones/shipping-zone.routes";
import { dashboardRoutes } from "./dashboard/dashboard.routes";
import { userRoutes } from "./users/user.routes";
import { billingRoutes } from "./billing/billing.routes";
import { uploadRoutes } from "./uploads/upload.routes";
import { mpRoutes } from "./payments/mercadopago.routes";

export async function storeRoutes(server: FastifyInstance) {
  // Public Storefront Routes
  await server.register(productRoutes, { prefix: "/store/products" });
  await server.register(orderRoutes, { prefix: "/store/orders" });
  await server.register(mpRoutes, { prefix: "/mp" });
  
  // Admin Routes
  await server.register(dashboardRoutes, { prefix: "/admin/dashboard" });
  await server.register(userRoutes, { prefix: "/admin/users" });
  await server.register(billingRoutes, { prefix: "/admin/billing" });
  await server.register(productAdminRoutes, { prefix: "/admin/products" });
  await server.register(categoryRoutes, { prefix: "/admin/categories" });
  await server.register(subcategoryRoutes, { prefix: "/admin/subcategories" });
  await server.register(mediaRoutes, { prefix: "/admin/media" });
  await server.register(settingRoutes, { prefix: "/admin/settings" });
  await server.register(paymentChannelRoutes, { prefix: "/admin/payment-channels" });
  await server.register(whatsappChannelRoutes, { prefix: "/admin/whatsapp-channels" });
  await server.register(evolutionProxyRoutes, { prefix: "/admin/whatsapp" });
  await server.register(shippingZoneRoutes, { prefix: "/admin/shipping-zones" });
  await server.register(uploadRoutes, { prefix: "/admin/uploads" });

  // Settings Logo Upload
  server.post("/admin/settings/logo", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { logoUrl } = request.body as { logoUrl: string };
    if (!logoUrl) return reply.status(400).send({ message: "logoUrl is required" });

    // 1. Buscar el logo actual para borrarlo de R2
    const currentLogo = await server.storePrisma.setting.findUnique({
      where: { key: "branding_logo_url" }
    });

    if (currentLogo?.value && currentLogo.value !== logoUrl) {
      const { storageService } = await import("../../services/storage.service");
      await storageService.deleteFile(currentLogo.value);
    }

    await server.storePrisma.setting.upsert({
      where: { key: "branding_logo_url" },
      update: { value: logoUrl, updated_at: new Date() },
      create: { key: "branding_logo_url", value: logoUrl, group: "branding", updated_at: new Date() },
    });
    return { success: true };
  });
}
