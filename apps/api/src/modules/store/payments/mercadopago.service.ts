import { storePrisma } from "@nexus/db/store";
import { rafflePrisma } from "@nexus/db/raffle";
import { MercadoPagoConfig, Preference, PaymentRefund } from 'mercadopago';
import axios from "axios";
import crypto from "crypto";
import { whatsappQueue } from "../../../queues/whatsapp.queue";
import type { OrderItemPurpose } from "../../../services/evolution/channel.resolver";
import { getTenantId, signGatewayPayload } from "./mercadopago-gateway.security";

const getRedirectUri = () => `${process.env.API_URL}/api/v1/mp/callback`;
const getGatewayUrl = () => process.env.MP_GATEWAY_URL?.replace(/\/$/, "");
const TOKEN_REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type OAuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
};

const isTokenExpiring = (value?: Date | string | null) => {
  if (!value) return true;
  const expiresAt = new Date(value).getTime();
  return !Number.isFinite(expiresAt) || expiresAt <= Date.now() + TOKEN_REFRESH_WINDOW_MS;
};

const fallbackExpiration = () => new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString();

export const mpService = {
  async getAuthUrl(targetChannel?: string) {
    const gatewayUrl = getGatewayUrl();
    const gatewaySecret = process.env.MP_GATEWAY_SHARED_SECRET;
    if (gatewayUrl && gatewaySecret) {
      const tenantApiUrl = (process.env.MP_TENANT_API_URL || "").replace(/\/$/, "");
      const adminUrl = process.env.ADMIN_URL || "";
      if (!tenantApiUrl || !adminUrl) {
        throw new Error("Mercado Pago gateway tenant configuration is incomplete");
      }

      const state = signGatewayPayload({
        tenantId: getTenantId(),
        tenantApiUrl,
        adminUrl,
        channelId: targetChannel || undefined,
      }, gatewaySecret);
      return `${gatewayUrl}/api/v1/mp/oauth/start?state=${encodeURIComponent(state)}`;
    }

    const clientId = await this.getSetting("mp_app_client_id");
    if (!clientId) throw new Error("Mercado Pago App Client ID not configured");
    
    const state = targetChannel || 'main';
    
    return `https://auth.mercadopago.com.mx/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${state}&redirect_uri=${encodeURIComponent(getRedirectUri())}`;
  },

  async handleCallback(code: string, state: string) {
    const clientId = await this.getSetting("mp_app_client_id");
    const clientSecret = await this.getSetting("mp_app_client_secret");

    if (!clientId || !clientSecret) throw new Error("Mercado Pago credentials not configured");

    const response = await axios.post("https://api.mercadopago.com/oauth/token", {
      client_secret: clientSecret,
      client_id: clientId,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: getRedirectUri(),
    });

    const { access_token, refresh_token, user_id, expires_in } = response.data as any;
    const accessTokenExpiresAt = Number(expires_in) > 0
      ? new Date(Date.now() + Number(expires_in) * 1000).toISOString()
      : fallbackExpiration();

    if (state === 'main') {
      // Guardar tokens del vendedor GLOBAL
      await this.saveSetting("mp_seller_access_token", access_token);
      await this.saveSetting("mp_seller_refresh_token", refresh_token);
      await this.saveSetting("mp_seller_user_id", user_id.toString());
      await this.saveSetting("mp_seller_access_token_expires_at", accessTokenExpiresAt);
    } else {
      // Guardar tokens en un CANAL espec\u00edfico
      await storePrisma.paymentChannel.update({
        where: { id: parseInt(state) },
        data: {
          mpAccessToken: access_token,
          mpRefreshToken: refresh_token,
          mpUserId: user_id.toString(),
          mpAccessTokenExpiresAt: new Date(accessTokenExpiresAt),
        }
      });
    }

    return { success: true };
  },

  async createPreference(orderId: number, isRaffle: boolean = false) {
    const feePercentage = parseFloat(await this.getSetting("mp_app_fee_percentage") || "0");
    
    let sellerToken = "";
    let items = [];
    let externalReference = "";
    let totalAmount = 0;
    let order: any = null;
    let tickets: any[] = [];

    if (isRaffle) {
      tickets = await rafflePrisma.ticketSale.findMany({
        where: { id: orderId },
        include: { raffle: true }
      });
      if (tickets.length === 0) throw new Error("Venta de boletos no encontrada");
      
      const raffle = tickets[0].raffle;
      totalAmount = Number(raffle.ticketPrice) * tickets.length;
      externalReference = `raffle_${orderId}`;
      
      // Buscar canal de Rifas
      const raffleChannel = await storePrisma.paymentChannel.findFirst({
        where: { purpose: 'RAFFLES' }
      });
      
      sellerToken = await this.getPaymentChannelToken(raffleChannel) || await this.getMainSellerToken() || "";

      items.push({
        id: raffle.id.toString(),
        title: `${raffle.title} - ${tickets.length} Boletos`,
        quantity: 1,
        unit_price: totalAmount,
        currency_id: 'MXN'
      });
    } else {
      order = await storePrisma.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      });
      if (!order) throw new Error("Orden no encontrada");

      totalAmount = Number(order.total);
      externalReference = `order_${orderId}`;

      // Determinar Prop\u00f3sito para elegir canal
      const products = await storePrisma.product.findMany({
        where: { id: { in: (order.items as any[]).map((i: any) => i.productId) } }
      });

      const birds = products.filter(p => p.type === 'BIRD');
      const hasItems = products.some(p => p.type === 'ITEM');

      if (birds.length > 0 && !hasItems) {
        const firstPurpose = birds[0].purpose as OrderItemPurpose;
        if (firstPurpose) {
          const allSamePurpose = birds.every(b => b.purpose === firstPurpose);
          if (allSamePurpose) {
            const channel = await storePrisma.paymentChannel.findFirst({
              where: { purpose: firstPurpose as string }
            });
            sellerToken = await this.getPaymentChannelToken(channel) || "";
          }
        }
      }

      // Fallback a token principal
      if (!sellerToken) {
          sellerToken = await this.getMainSellerToken() || "";
      }

      if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
        throw new Error("El total de la orden no es válido para Mercado Pago");
      }

      items = [{
        id: `order_${order.id}`,
        title: `Orden #${order.id}`,
        description: [
          `Subtotal: $${Number(order.subtotal).toFixed(2)}`,
          Number(order.discountTotal) > 0 ? `Descuento: -$${Number(order.discountTotal).toFixed(2)}` : null,
          Number(order.shippingCost) > 0 ? `Envío: $${Number(order.shippingCost).toFixed(2)}` : null,
        ].filter(Boolean).join(" · "),
        quantity: 1,
        unit_price: totalAmount,
        currency_id: 'MXN'
      }];
    }

    if (!sellerToken) throw new Error("Pasarela no disponible para este canal");

    const client = new MercadoPagoConfig({ accessToken: sellerToken });
    const preference = new Preference(client);

    const marketplaceFee = (totalAmount * feePercentage) / 100;

    const storefrontUrl = process.env.STOREFRONT_HTTPS_URL || process.env.STOREFRONT_URL || 'http://localhost:3000';
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    // The gateway owns notifications, while each tenant keeps its own checkout return URLs.
    const tenantPublicApiUrl = (process.env.MP_TENANT_PUBLIC_API_URL || apiUrl).replace(/\/$/, "");
    const notificationUrl = getGatewayUrl()
      ? `${getGatewayUrl()}/api/v1/mp/webhook`
      : `${apiUrl}/api/v1/mp/webhook`;

    // Mercado Pago doesn't like auto_return with localhost in some cases
    const isLocal = storefrontUrl.includes('localhost');

    const statementDescriptor = await this.getSetting("mp_statement_descriptor") || "NEXUS*SHOP";

    const payerEmail = isRaffle ? tickets[0].customerEmail : order!.customerEmail;
    const payer: any = {
      name: isRaffle ? tickets[0].customerName : order!.customerName,
      phone: {
          area_code: '52',
          number: isRaffle ? tickets[0].customerPhone : order!.customerPhone
      }
    };

    if (payerEmail && String(payerEmail).trim()) {
      payer.email = String(payerEmail).trim();
    }

    const body: any = {
      items: items.map((item: any) => ({
        ...item,
        unit_price: Number(Number(item.unit_price).toFixed(2))
      })),
      external_reference: externalReference,
      notification_url: notificationUrl,
      back_urls: {
        success: `${tenantPublicApiUrl}/api/v1/mp/redirect?target=success&ref=${externalReference}`,
        failure: `${tenantPublicApiUrl}/api/v1/mp/redirect?target=failure&ref=${externalReference}`,
        pending: `${tenantPublicApiUrl}/api/v1/mp/redirect?target=pending&ref=${externalReference}`,
      },
      payer,
      binary_mode: true, // Quality score: Approved or Rejected instantly
      statement_descriptor: statementDescriptor, // dynamic brand name
    };

    if (!isRaffle && order?.paymentExpiresAt) {
      body.expires = true;
      body.expiration_date_to = order.paymentExpiresAt.toISOString();
    }

    if (marketplaceFee > 0) {
      body.marketplace_fee = Number(marketplaceFee.toFixed(2));
    }

    body.auto_return = 'approved';

    console.log('[MP] Creating Preference with body:', JSON.stringify(body, null, 2));
    console.log('[MP] Using Seller Token:', sellerToken.substring(0, 10) + '...');

    return preference.create({ body });
  },

  async refreshOAuthToken(refreshToken: string): Promise<OAuthTokens> {
    const gatewayUrl = getGatewayUrl();
    const gatewaySecret = process.env.MP_GATEWAY_SHARED_SECRET;

    if (gatewayUrl && gatewaySecret) {
      const body = { refreshToken };
      const proof = signGatewayPayload(body, gatewaySecret, 5 * 60 * 1000);
      const response = await axios.post<OAuthTokens>(`${gatewayUrl}/api/v1/mp/internal/refresh`, body, {
        timeout: 15_000,
        headers: { "x-nexus-mp-gateway-proof": proof },
      });
      return response.data;
    }

    const clientId = await this.getSetting("mp_app_client_id");
    const clientSecret = await this.getSetting("mp_app_client_secret");
    if (!clientId || !clientSecret) throw new Error("Mercado Pago credentials are not configured");

    const response = await axios.post("https://api.mercadopago.com/oauth/token", new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const data = response.data as { access_token: string; refresh_token: string; expires_in?: number | string };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      accessTokenExpiresAt: Number(data.expires_in) > 0
        ? new Date(Date.now() + Number(data.expires_in) * 1000).toISOString()
        : fallbackExpiration(),
    };
  },

  async getMainSellerToken() {
    const accessToken = await this.getSetting("mp_seller_access_token");
    const refreshToken = await this.getSetting("mp_seller_refresh_token");
    const expiresAt = await this.getSetting("mp_seller_access_token_expires_at");
    if (!accessToken) return null;
    if (!refreshToken || !isTokenExpiring(expiresAt)) return accessToken;

    const refreshed = await this.refreshOAuthToken(refreshToken);
    await Promise.all([
      this.saveSetting("mp_seller_access_token", refreshed.accessToken),
      this.saveSetting("mp_seller_refresh_token", refreshed.refreshToken),
      this.saveSetting("mp_seller_access_token_expires_at", refreshed.accessTokenExpiresAt),
    ]);
    return refreshed.accessToken;
  },

  async getPaymentChannelToken(channel?: {
    mpAccessToken?: string | null;
    mpRefreshToken?: string | null;
    mpAccessTokenExpiresAt?: Date | null;
    id: number;
  } | null) {
    if (!channel?.mpAccessToken) return null;
    if (!channel.mpRefreshToken || !isTokenExpiring(channel.mpAccessTokenExpiresAt)) {
      return channel.mpAccessToken;
    }

    const refreshed = await this.refreshOAuthToken(channel.mpRefreshToken);
    await storePrisma.paymentChannel.update({
      where: { id: channel.id },
      data: {
        mpAccessToken: refreshed.accessToken,
        mpRefreshToken: refreshed.refreshToken,
        mpAccessTokenExpiresAt: new Date(refreshed.accessTokenExpiresAt),
      },
    });
    return refreshed.accessToken;
  },

  async refreshExpiringConnections() {
    const result = { refreshed: 0, failed: 0 };
    const refreshMain = async () => {
      const accessToken = await this.getSetting("mp_seller_access_token");
      const refreshToken = await this.getSetting("mp_seller_refresh_token");
      const expiresAt = await this.getSetting("mp_seller_access_token_expires_at");
      if (!accessToken || !refreshToken || !isTokenExpiring(expiresAt)) return;
      await this.getMainSellerToken();
      result.refreshed += 1;
    };

    try {
      await refreshMain();
    } catch (error) {
      result.failed += 1;
      console.error("[MP] Could not refresh main seller token", error);
    }

    const channels = await storePrisma.paymentChannel.findMany({
      where: { mpAccessToken: { not: null }, mpRefreshToken: { not: null } },
      select: { id: true, mpAccessToken: true, mpRefreshToken: true, mpAccessTokenExpiresAt: true },
    });
    for (const channel of channels) {
      if (!isTokenExpiring(channel.mpAccessTokenExpiresAt)) continue;
      try {
        await this.getPaymentChannelToken(channel);
        result.refreshed += 1;
      } catch (error) {
        result.failed += 1;
        console.error(`[MP] Could not refresh payment channel ${channel.id}`, error);
      }
    }
    return result;
  },

  async getSellerTokenByUserId(sellerUserId?: string | null) {
    if (sellerUserId) {
      const channel = await storePrisma.paymentChannel.findFirst({
        where: { mpUserId: sellerUserId },
      });
      if (channel) return this.getPaymentChannelToken(channel);

      const globalSellerId = await this.getSetting("mp_seller_user_id");
      if (globalSellerId === sellerUserId) {
        return this.getMainSellerToken();
      }
    }

    return this.getMainSellerToken();
  },

  async recordOrderPayment(orderId: number, payment: any, sellerUserId?: string | null) {
    const paidAmount = Number(payment.transaction_amount || payment.total_paid_amount || 0);

    return storePrisma.order.update({
      where: { id: orderId },
      data: {
        mpPaymentId: payment.id ? String(payment.id) : null,
        mpSellerUserId: sellerUserId || payment.collector_id?.toString() || null,
        mpPaymentStatus: payment.status || null,
        mpPaymentStatusDetail: payment.status_detail || null,
        mpPaymentMethodId: payment.payment_method_id || null,
        mpPaymentTypeId: payment.payment_type_id || null,
        mpPaidAmount: Number.isFinite(paidAmount) && paidAmount > 0 ? paidAmount : null,
      },
    });
  },

  async refundOrder(orderId: number) {
    const order = await storePrisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      const error = new Error("Orden no encontrada") as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    if (order.paymentMethod !== "MERCADOPAGO") {
      const error = new Error("Esta orden no fue pagada con Mercado Pago.") as Error & { statusCode?: number };
      error.statusCode = 409;
      throw error;
    }

    if (Number(order.mpRefundedAmount) > 0 || order.paymentStatus === "REFUNDED") {
      const error = new Error("El pago de esta orden ya fue devuelto.") as Error & { statusCode?: number };
      error.statusCode = 409;
      throw error;
    }

    if (order.status !== "PAID" || order.paymentStatus !== "APPROVED") {
      const error = new Error("Solo se pueden devolver órdenes pagadas con tarjeta.") as Error & { statusCode?: number };
      error.statusCode = 409;
      throw error;
    }

    if (!order.mpPaymentId) {
      const error = new Error("La orden no tiene un ID de pago de Mercado Pago.") as Error & { statusCode?: number };
      error.statusCode = 409;
      throw error;
    }

    const sellerToken = await this.getSellerTokenByUserId(order.mpSellerUserId);
    if (!sellerToken) {
      const error = new Error("No se encontró la cuenta de Mercado Pago para procesar la devolución.") as Error & { statusCode?: number };
      error.statusCode = 409;
      throw error;
    }

    const client = new MercadoPagoConfig({ accessToken: sellerToken });
    const refundClient = new PaymentRefund(client);
    const refund = await refundClient.create({ payment_id: order.mpPaymentId });
    const refundAmount = Number((refund as any).amount || order.mpPaidAmount || order.total);

    return storePrisma.$transaction(async (tx) => {
      const refundedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED",
          paymentStatus: "REFUNDED",
          paymentExpiresAt: null,
          expiresAt: null,
          mpPaymentStatus: "refunded",
          mpRefundId: (refund as any).id ? String((refund as any).id) : null,
          mpRefundedAmount: Number.isFinite(refundAmount) ? refundAmount : Number(order.total),
          mpRefundedAt: new Date(),
        },
        include: { items: true },
      });

      for (const item of order.items) {
        if (item.productType === "BIRD") {
          await tx.product.update({
            where: { id: item.productId },
            data: { saleStatus: "AVAILABLE" },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      await tx.orderEvent.create({
        data: {
          orderId,
          eventType: "PAYMENT_REFUNDED",
          message: "Pago devuelto en Mercado Pago. Orden cancelada e inventario liberado.",
        },
      });

      return refundedOrder;
    });
  },

  async handleWebhook(data: any, headers?: any) {
    console.log('[MP] Webhook Received:', JSON.stringify(data, null, 2));

    // VALIDATION: Security & Quality Score
    const xSignature = headers?.['x-signature'];
    const xRequestId = headers?.['x-request-id'];
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;

    if (webhookSecret && xSignature && xRequestId) {
      try {
        const parts = xSignature.split(',');
        let ts: string | null = null;
        let hash: string | null = null;

        parts.forEach((part: string) => {
          const [splitKey, splitValue] = part.split('=');
          if (splitKey === 'ts') ts = splitValue;
          if (splitKey === 'v1') hash = splitValue;
        });

        const manifest = `id:${data.data?.id || data.id};request-id:${xRequestId};ts:${ts};`;
        const hmac = crypto.createHmac('sha256', webhookSecret);
        hmac.update(manifest);
        const expectedHash = hmac.digest('hex');

        if (expectedHash !== hash) {
          console.error('[MP] Invalid Webhook Signature. Potential fraud attempt.');
          return { received: true }; // Still return 200 to not leak existence
        }
        console.log('[MP] Webhook Signature Validated ✅');
      } catch (err: any) {
        console.error('[MP] Error validating signature:', err.message);
      }
    }

    const { action, data: resourceData, type } = data;
    const resourceId = resourceData?.id || data.resource?.split('/').pop();
    if (!resourceId) {
      console.log('[MP] No resource ID found in webhook data');
      return { received: true };
    }

    if (action === "payment.created" || action === "payment.updated" || type === "payment") {
      console.log(`[MP] Processing payment ${resourceId} (${action || type})`);
      // Aqu\u00ed hay un reto: \u00bfcon qu\u00e9 token consultamos el pago?
      // MP env\u00eda el user_id del vendedor en el webhook si es Marketplace.
      const sellerId = data.user_id?.toString();
      
      let sellerToken = "";
      if (sellerId) {
        console.log(`[MP] Webhook for seller ${sellerId}`);
        sellerToken = await this.getSellerTokenByUserId(sellerId) || "";
      }

      if (!sellerToken) {
        console.log('[MP] Could not determine seller token for this webhook');
        return { received: true };
      }

      try {
        const response = await axios.get(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
          headers: { Authorization: `Bearer ${sellerToken}` }
        });

        const payment = response.data as any;
        console.log(`[MP] Payment details for ${resourceId}: status=${payment.status}, external_ref=${payment.external_reference}`);

        const externalReference = payment.external_reference;
        if (payment.status === "approved") {
          
          if (externalReference?.startsWith("order_")) {
            const orderId = parseInt(externalReference.replace("order_", ""));
            console.log(`[MP] Approving Order #${orderId}`);
            const { orderService } = await import("../orders/order.service");
            const order = await storePrisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
            
            if (order && order.status === 'PENDING' && order.paymentStatus === 'PENDING') {
              await this.recordOrderPayment(orderId, payment, sellerId || payment.collector_id?.toString() || null);
              await orderService.updateStatus(orderId, "PAID");
              console.log(`[MP] Order #${orderId} marked as PAID`);
            }
          } else if (externalReference?.startsWith("raffle_")) {
            const saleId = parseInt(externalReference.replace("raffle_", ""));
            console.log(`[MP] Approving Raffle Sale #${saleId}`);
            const sale = await rafflePrisma.ticketSale.findUnique({ where: { id: saleId } });
            if (sale && sale.paymentStatus !== 'PAID') {
              await rafflePrisma.ticketSale.update({ where: { id: saleId }, data: { paymentStatus: 'PAID' } });
              await whatsappQueue.add("reservation-paid", {
                kind: "reservation-paid",
                ticketSaleIds: [sale.id],
                recipientPhone: sale.customerPhone
              });
              console.log(`[MP] Raffle Sale #${saleId} marked as PAID and WhatsApp notification queued`);
            }
          }
        } else if (["cancelled", "rejected", "refunded", "charged_back"].includes(payment.status)) {
          if (externalReference?.startsWith("order_")) {
            const orderId = parseInt(externalReference.replace("order_", ""));
            const { orderService } = await import("../orders/order.service");
            await orderService.cancelPaymentAttempt(orderId, "FAILED");
          }
        }
      } catch (e: any) {
        console.error("Error fetching payment details from MP:", e.message);
      }
    }

    return { received: true };
  },

  async getSetting(key: string) {
    const s = await storePrisma.setting.findUnique({ where: { key } });
    return s?.value || null;
  },

  async saveSetting(key: string, value: string) {
    return storePrisma.setting.upsert({
      where: { key },
      update: { value, updated_at: new Date() },
      create: { key, value, group: "payments", updated_at: new Date() }
    });
  },

  async disconnectMainAccount() {
    const sellerUserId = await this.getSetting("mp_seller_user_id");
    const gatewayUrl = getGatewayUrl();
    const gatewaySecret = process.env.MP_GATEWAY_SHARED_SECRET;

    if (sellerUserId && gatewayUrl && gatewaySecret) {
      const body = { tenantId: getTenantId(), sellerUserId };
      const proof = signGatewayPayload(body, gatewaySecret, 5 * 60 * 1000);
      await axios.post(`${gatewayUrl}/api/v1/mp/internal/disconnect`, body, {
        timeout: 15_000,
        headers: { "x-nexus-mp-gateway-proof": proof },
      });
    }

    const keys = [
      "mp_seller_access_token",
      "mp_seller_refresh_token",
      "mp_seller_user_id",
      "mp_main_checkout_enabled",
    ];

    await storePrisma.setting.updateMany({
      where: { key: { in: keys } },
      data: { value: "", updated_at: new Date() },
    });

    await this.saveSetting("mp_main_checkout_enabled", "0");

    return { success: true };
  },

  async saveGatewayConnection(data: {
    channelId: string | null;
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
    sellerUserId: string;
  }) {
    if (data.channelId) {
      await storePrisma.paymentChannel.update({
        where: { id: Number(data.channelId) },
        data: {
          mpAccessToken: data.accessToken,
          mpRefreshToken: data.refreshToken,
          mpAccessTokenExpiresAt: new Date(data.accessTokenExpiresAt),
          mpUserId: data.sellerUserId,
        },
      });
      return;
    }

    await Promise.all([
      this.saveSetting("mp_seller_access_token", data.accessToken),
      this.saveSetting("mp_seller_refresh_token", data.refreshToken),
      this.saveSetting("mp_seller_access_token_expires_at", data.accessTokenExpiresAt),
      this.saveSetting("mp_seller_user_id", data.sellerUserId),
    ]);
  },
};
