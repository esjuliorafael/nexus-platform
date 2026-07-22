import { storePrisma } from "@nexus/db/store";
import { rafflePrisma } from "@nexus/db/raffle";
import { MercadoPagoConfig, Preference, PaymentRefund } from 'mercadopago';
import axios from "axios";
import crypto from "crypto";
import { whatsappQueue } from "../../../queues/whatsapp.queue";
import type { OrderItemPurpose } from "../../../services/evolution/channel.resolver";
import { getTenantId, signGatewayPayload } from "./mercadopago-gateway.security";
import { resolvePaymentHoldMinutes } from "./payment-hold-policy";
import { customerPhoneIdentity } from "../../../utils/customer-phone";

const getRedirectUri = () => `${process.env.API_URL}/api/v1/mp/callback`;
const getGatewayUrl = () => process.env.MP_GATEWAY_URL?.replace(/\/$/, "");
const TOKEN_REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type OAuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
};

type CardPaymentInput = {
  paymentAttemptId: string;
  storePaymentHoldId?: string;
  rafflePaymentHoldId?: string;
  customerPhone: string;
  token: string;
  issuerId?: string;
  paymentMethodId: string;
  installments: number;
  payer: {
    email: string;
    identification?: {
      type: string;
      number: string;
    };
  };
};

type CardPaymentAttemptOutcome = "approved" | "processing" | "rejected";

const cardPaymentStatus = (status?: string | null): CardPaymentAttemptOutcome => {
  if (status === "approved") return "approved";
  if (["pending", "in_process", "authorized"].includes(status || "")) return "processing";
  return "rejected";
};

const cardPaymentMessage = (statusDetail?: string | null) => {
  const messages: Record<string, string> = {
    cc_rejected_bad_filled_card_number: "Revisa el número de la tarjeta.",
    cc_rejected_bad_filled_date: "Revisa la fecha de vencimiento.",
    cc_rejected_bad_filled_security_code: "Revisa el código de seguridad.",
    cc_rejected_bad_filled_other: "Revisa los datos de la tarjeta.",
    cc_rejected_insufficient_amount: "La tarjeta no tiene fondos suficientes.",
    cc_rejected_call_for_authorize: "Autoriza el pago con tu banco e intenta nuevamente.",
    cc_rejected_card_disabled: "La tarjeta está deshabilitada. Comunícate con tu banco.",
    cc_rejected_duplicated_payment: "Este pago ya fue procesado.",
    cc_rejected_high_risk: "Mercado Pago no pudo aprobar esta operación.",
    cc_rejected_max_attempts: "Se alcanzó el límite de intentos para esta tarjeta. Usa otra tarjeta.",
    cc_rejected_other_reason: "El banco no aprobó el pago. Intenta con otra tarjeta.",
    pending_challenge: "Completa la verificación de seguridad de tu banco.",
    pending_review_manual: "Mercado Pago está revisando el pago.",
    network_confirmation_pending: "Estamos verificando el resultado con Mercado Pago.",
  };
  return statusDetail && messages[statusDetail]
    ? messages[statusDetail]
    : "El pago no fue aprobado. Revisa los datos o intenta con otra tarjeta.";
};

const isRetryableCardRejection = (statusDetail?: string | null) =>
  statusDetail !== "cc_rejected_duplicated_payment";

const normalizePhone = customerPhoneIdentity;

const isTokenExpiring = (value?: Date | string | null) => {
  if (!value) return true;
  const expiresAt = new Date(value).getTime();
  return !Number.isFinite(expiresAt) || expiresAt <= Date.now() + TOKEN_REFRESH_WINDOW_MS;
};

const fallbackExpiration = () => new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString();

export const mpService = {
  async getPublicCheckoutConfig() {
    const publicKey = process.env.MP_PUBLIC_KEY || await this.getSetting("mp_app_public_key") || "";
    const enabled = Boolean(publicKey) && process.env.MP_EMBEDDED_CHECKOUT_ENABLED !== "0";

    return {
      mode: enabled ? "embedded" as const : "redirect" as const,
      publicKey: enabled ? publicKey : null,
    };
  },

  async isRaffleCheckoutAvailable() {
    const raffleChannel = await storePrisma.paymentChannel.findFirst({
      where: { purpose: "RAFFLES" },
      select: { mpAccessToken: true },
    });
    if (raffleChannel?.mpAccessToken) return true;

    const [mainToken, mainEnabled] = await Promise.all([
      this.getSetting("mp_seller_access_token"),
      this.getSetting("mp_main_checkout_enabled"),
    ]);
    return Boolean(mainToken) && mainEnabled !== "0";
  },

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

  async createPreference(orderId: number | null, isRaffle: boolean = false, raffleReservationId?: string) {
    const feePercentage = await this.getApplicationFeePercentage();
    
    let sellerToken = "";
    let items = [];
    let externalReference = "";
    let totalAmount = 0;
    let order: any = null;
    let tickets: any[] = [];
    let rafflePaymentExpiresAt: Date | null = null;

    if (isRaffle) {
      if (!raffleReservationId) throw new Error("Reserva de rifa no especificada");
      tickets = await rafflePrisma.ticketSale.findMany({
        where: { reservationId: raffleReservationId, paymentStatus: "PENDING", paymentMethod: "MERCADOPAGO" },
        include: { raffle: true }
      });
      if (tickets.length === 0) throw new Error("Venta de boletos no encontrada");
      
      const raffle = tickets[0].raffle;
      const subtotal = Number(raffle.ticketPrice) * tickets.length;
      const discountTotal = Number(tickets[0].discountTotal || 0);
      totalAmount = Math.max(0, subtotal - discountTotal);
      externalReference = `raffle_${raffle.id}_${raffleReservationId}`;
      const holdSetting = await storePrisma.setting.findUnique({
        where: { key: "mp_payment_hold_minutes" },
        select: { value: true },
      });
      const holdMinutes = resolvePaymentHoldMinutes(holdSetting?.value);
      rafflePaymentExpiresAt = new Date(tickets[0].createdAt.getTime() + holdMinutes * 60 * 1000);
      
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
      if (!orderId) throw new Error("Orden no especificada");
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
    if (isRaffle && rafflePaymentExpiresAt) {
      body.expires = true;
      body.expiration_date_to = rafflePaymentExpiresAt.toISOString();
    }

    if (marketplaceFee > 0) {
      body.marketplace_fee = Number(marketplaceFee.toFixed(2));
    }

    body.auto_return = 'approved';

    console.log('[MP] Creating Preference with body:', JSON.stringify(body, null, 2));
    console.log('[MP] Using Seller Token:', sellerToken.substring(0, 10) + '...');

    return preference.create({ body });
  },

  async createCardPayment(input: CardPaymentInput) {
    const isRaffle = Boolean(input.rafflePaymentHoldId);
    const feePercentage = await this.getApplicationFeePercentage();
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    const notificationUrl = getGatewayUrl()
      ? `${getGatewayUrl()}/api/v1/mp/webhook`
      : `${apiUrl}/api/v1/mp/webhook`;
    const statementDescriptor = await this.getSetting("mp_statement_descriptor") || "NEXUS*SHOP";

    let sellerToken = "";
    let sellerUserId: string | null = null;
    let totalAmount = 0;
    let externalReference = "";
    let description = "";
    let raffleId: number | null = null;
    let additionalItems: Array<Record<string, unknown>> = [];

    if (isRaffle) {
      const hold = await rafflePrisma.rafflePaymentHold.findUnique({
        where: { id: input.rafflePaymentHoldId! },
        include: { raffle: true, tickets: true },
      });
      if (!hold || !["ACTIVE", "PROCESSING"].includes(hold.status) || hold.expiresAt.getTime() <= Date.now()) {
        throw Object.assign(new Error("La retención de boletos ya no está disponible."), { statusCode: 409 });
      }
      if (normalizePhone(hold.customerPhone) !== normalizePhone(input.customerPhone)) {
        throw Object.assign(new Error("No fue posible validar al participante."), { statusCode: 403 });
      }

      const raffle = hold.raffle;
      raffleId = raffle.id;
      const subtotal = Number(raffle.ticketPrice) * hold.tickets.length;
      totalAmount = Math.max(0, subtotal - Number(hold.discountTotal || 0));
      externalReference = `raffle_hold_${raffle.id}_${hold.id}`;
      description = `${raffle.title} - ${hold.tickets.length} boleto${hold.tickets.length === 1 ? "" : "s"}`;

      const raffleChannel = await storePrisma.paymentChannel.findFirst({ where: { purpose: "RAFFLES" } });
      const raffleChannelToken = await this.getPaymentChannelToken(raffleChannel);
      if (raffleChannelToken) {
        sellerToken = raffleChannelToken;
        sellerUserId = raffleChannel?.mpUserId || null;
      } else {
        sellerToken = await this.getMainSellerToken() || "";
        sellerUserId = await this.getSetting("mp_seller_user_id") || null;
      }
      additionalItems = [{
        id: String(raffle.id),
        title: raffle.title,
        quantity: hold.tickets.length,
        unit_price: Number(raffle.ticketPrice),
      }];
    } else {
      if (!input.storePaymentHoldId) throw Object.assign(new Error("Retención de compra no especificada."), { statusCode: 400 });
      const hold = await storePrisma.storePaymentHold.findUnique({
        where: { id: input.storePaymentHoldId },
        include: { items: true },
      });
      if (!hold || !["ACTIVE", "PROCESSING"].includes(hold.status) || hold.expiresAt.getTime() <= Date.now()) {
        throw Object.assign(new Error("La retención de inventario ya no está disponible."), { statusCode: 409 });
      }
      if (normalizePhone(hold.customerPhone) !== normalizePhone(input.customerPhone)) {
        throw Object.assign(new Error("No fue posible validar al comprador."), { statusCode: 403 });
      }
      totalAmount = Number(hold.total);
      externalReference = `store_hold_${hold.id}`;
      description = "Compra en tienda";
      additionalItems = hold.items.map((item) => ({
        id: String(item.productId),
        title: item.productName,
        quantity: item.quantity,
        unit_price: Number(item.unitPrice),
      }));

      const products = await storePrisma.product.findMany({
        where: { id: { in: hold.items.map((item) => item.productId) } },
      });
      const birds = products.filter((product) => product.type === "BIRD");
      const hasItems = products.some((product) => product.type === "ITEM");
      if (birds.length && !hasItems) {
        const purpose = birds[0].purpose as OrderItemPurpose;
        if (purpose && birds.every((bird) => bird.purpose === purpose)) {
          const channel = await storePrisma.paymentChannel.findFirst({ where: { purpose } });
          sellerToken = await this.getPaymentChannelToken(channel) || "";
          sellerUserId = channel?.mpUserId || null;
        }
      }
      if (!sellerToken) {
        sellerToken = await this.getMainSellerToken() || "";
        sellerUserId = await this.getSetting("mp_seller_user_id") || null;
      }
    }

    if (!sellerToken) throw Object.assign(new Error("La cuenta de Mercado Pago no está disponible."), { statusCode: 409 });
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw Object.assign(new Error("El total no es válido para Mercado Pago."), { statusCode: 409 });
    }

    const applicationFee = Number(((totalAmount * feePercentage) / 100).toFixed(2));
    const idempotencyKey = `nexus-card-${input.paymentAttemptId}`;
    const existingAttempt = isRaffle
      ? await rafflePrisma.rafflePaymentAttempt.findUnique({ where: { id: input.paymentAttemptId } })
      : await storePrisma.orderPaymentAttempt.findUnique({ where: { id: input.paymentAttemptId } });

    if (existingAttempt) {
      const belongsToReference = isRaffle
        ? "holdId" in existingAttempt && existingAttempt.holdId === input.rafflePaymentHoldId
        : "holdId" in existingAttempt && existingAttempt.holdId === input.storePaymentHoldId;
      if (!belongsToReference) {
        throw Object.assign(new Error("El intento de pago no corresponde a esta compra."), { statusCode: 409 });
      }
      if (["APPROVED", "PROCESSING", "REJECTED", "UNKNOWN"].includes(existingAttempt.status)) {
        const outcome = existingAttempt.status === "APPROVED"
          ? "approved"
          : existingAttempt.status === "REJECTED"
            ? "rejected"
            : "processing";
        const promotedReference = existingAttempt.status === "APPROVED"
          ? isRaffle
            ? (await rafflePrisma.rafflePaymentHold.findUnique({ where: { id: input.rafflePaymentHoldId! }, select: { promotedReservationId: true } }))?.promotedReservationId
            : (await storePrisma.storePaymentHold.findUnique({ where: { id: input.storePaymentHoldId! }, select: { promotedOrderId: true } }))?.promotedOrderId
          : null;
        return {
          attemptId: existingAttempt.id,
          paymentId: existingAttempt.mpPaymentId || "",
          referenceId: promotedReference || (isRaffle ? input.rafflePaymentHoldId : input.storePaymentHoldId),
          status: outcome === "approved" ? "approved" : outcome === "rejected" ? "rejected" : "in_process",
          statusDetail: existingAttempt.statusDetail,
          outcome,
          retryable: existingAttempt.retryable,
          uncertain: existingAttempt.uncertain,
          message: existingAttempt.customerMessage,
          threeDsInfo: null,
        };
      }
    } else if (isRaffle && raffleId && input.rafflePaymentHoldId) {
      await rafflePrisma.rafflePaymentAttempt.create({
        data: {
          id: input.paymentAttemptId,
          raffleId,
          holdId: input.rafflePaymentHoldId,
          idempotencyKey,
          status: "INITIATED",
        },
      });
    } else if (!isRaffle && input.storePaymentHoldId) {
      await storePrisma.orderPaymentAttempt.create({
        data: {
          id: input.paymentAttemptId,
          holdId: input.storePaymentHoldId,
          idempotencyKey,
          status: "INITIATED",
        },
      });
    }

    let claimedHold = false;
    if (isRaffle && input.rafflePaymentHoldId) {
      const claimed = await rafflePrisma.rafflePaymentHold.updateMany({
        where: { id: input.rafflePaymentHoldId, status: "ACTIVE" },
        data: { status: "PROCESSING", mpPaymentId: null, mpSellerUserId: sellerUserId, mpPaymentStatus: "processing", mpPaymentStatusDetail: null },
      });
      claimedHold = claimed.count === 1;
    } else if (input.storePaymentHoldId) {
      const claimed = await storePrisma.storePaymentHold.updateMany({
        where: { id: input.storePaymentHoldId, status: "ACTIVE" },
        data: { status: "PROCESSING", mpPaymentId: null, mpSellerUserId: sellerUserId, mpPaymentStatus: "processing", mpPaymentStatusDetail: null },
      });
      claimedHold = claimed.count === 1;
    }
    if (!claimedHold) {
      await this.updateCardPaymentAttempt({
        isRaffle,
        attemptId: input.paymentAttemptId,
        status: "CANCELLED",
        retryable: false,
        uncertain: false,
        customerMessage: "El inventario cambió antes de iniciar el cobro.",
      });
      throw Object.assign(
        new Error("El intento de pago ya no está disponible. No se realizó ningún cobro."),
        { statusCode: 409 },
      );
    }
    await this.updateCardPaymentAttempt({
      isRaffle,
      attemptId: input.paymentAttemptId,
      status: "PROCESSING",
      retryable: false,
      uncertain: false,
    });
    const paymentBody: Record<string, unknown> = {
      transaction_amount: Number(totalAmount.toFixed(2)),
      token: input.token,
      description,
      installments: input.installments,
      payment_method_id: input.paymentMethodId,
      payer: input.payer,
      external_reference: externalReference,
      notification_url: notificationUrl,
      statement_descriptor: statementDescriptor,
      binary_mode: false,
      capture: true,
      three_d_secure_mode: "optional",
      additional_info: { items: additionalItems },
      metadata: {
        tenant_id: getTenantId(),
        checkout_source: isRaffle ? "raffle" : "store",
      },
    };
    if (input.issuerId) paymentBody.issuer_id = input.issuerId;
    if (applicationFee > 0) paymentBody.application_fee = applicationFee;

    let receivedPayment: any = null;
    try {
      const response = await axios.post("https://api.mercadopago.com/v1/payments", paymentBody, {
        headers: {
          Authorization: `Bearer ${sellerToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey,
        },
        timeout: 30_000,
      });
      const payment = response.data as any;
      receivedPayment = payment;
      const outcome = cardPaymentStatus(payment.status);
      const retryable = outcome === "rejected" && isRetryableCardRejection(payment.status_detail);
      const message = outcome === "approved"
        ? "Pago confirmado."
        : outcome === "processing"
          ? cardPaymentMessage(payment.status_detail || "pending_review_manual")
          : cardPaymentMessage(payment.status_detail);

      await this.updateCardPaymentAttempt({
        isRaffle,
        attemptId: input.paymentAttemptId,
        status: outcome.toUpperCase(),
        statusDetail: payment.status_detail || null,
        mpPaymentId: payment.id ? String(payment.id) : null,
        retryable,
        uncertain: false,
        customerMessage: message,
      });
      let approvedReferenceId: number | string | null = null;
      if (payment.status === "approved") {
        if (isRaffle && input.rafflePaymentHoldId) {
          await this.recordRaffleHoldPayment(input.rafflePaymentHoldId, payment, sellerUserId || payment.collector_id?.toString() || null);
        } else if (input.storePaymentHoldId) {
          await this.recordStoreHoldPayment(input.storePaymentHoldId, payment, sellerUserId || payment.collector_id?.toString() || null);
        }
        await this.applyApprovedPayment(payment, sellerUserId || payment.collector_id?.toString() || null);
        if (isRaffle && input.rafflePaymentHoldId) {
          const promoted = await rafflePrisma.rafflePaymentHold.findUnique({ where: { id: input.rafflePaymentHoldId }, select: { promotedReservationId: true } });
          approvedReferenceId = promoted?.promotedReservationId || null;
        } else if (input.storePaymentHoldId) {
          const promoted = await storePrisma.storePaymentHold.findUnique({ where: { id: input.storePaymentHoldId }, select: { promotedOrderId: true } });
          approvedReferenceId = promoted?.promotedOrderId || null;
        }
      } else if (isRaffle && input.rafflePaymentHoldId) {
        await this.recordRaffleHoldPayment(input.rafflePaymentHoldId, payment, sellerUserId || payment.collector_id?.toString() || null);
      } else if (!isRaffle && input.storePaymentHoldId) {
        await this.recordStoreHoldPayment(input.storePaymentHoldId, payment, sellerUserId || payment.collector_id?.toString() || null);
      }

      return {
        attemptId: input.paymentAttemptId,
        paymentId: String(payment.id),
        referenceId: approvedReferenceId || (isRaffle ? input.rafflePaymentHoldId : input.storePaymentHoldId),
        status: payment.status,
        statusDetail: payment.status_detail,
        outcome,
        retryable,
        uncertain: false,
        message,
        threeDsInfo: payment.three_ds_info ? {
          externalResourceUrl: payment.three_ds_info.external_resource_url,
          creq: payment.three_ds_info.creq,
        } : null,
      };
    } catch (error: any) {
      if (receivedPayment?.status === "approved") {
        console.error("[MP] Payment approved but local promotion is still pending:", error);
        return {
          attemptId: input.paymentAttemptId,
          paymentId: String(receivedPayment.id || ""),
          referenceId: isRaffle ? input.rafflePaymentHoldId : input.storePaymentHoldId,
          status: "in_process",
          statusDetail: "local_confirmation_pending",
          outcome: "processing" as const,
          retryable: false,
          uncertain: true,
          message: "El pago fue aprobado y estamos confirmando tu compra.",
          threeDsInfo: null,
        };
      }
      const hasResponse = Boolean(error?.response);
      const statusDetail = error?.response?.data?.status_detail
        || error?.response?.data?.cause?.[0]?.code
        || (hasResponse ? "payment_request_invalid" : "network_confirmation_pending");
      const uncertain = !hasResponse;
      const retryable = hasResponse && isRetryableCardRejection(statusDetail);
      const message = uncertain
        ? cardPaymentMessage("network_confirmation_pending")
        : cardPaymentMessage(statusDetail);

      await this.updateCardPaymentAttempt({
        isRaffle,
        attemptId: input.paymentAttemptId,
        status: uncertain ? "UNKNOWN" : "REJECTED",
        statusDetail,
        retryable,
        uncertain,
        customerMessage: message,
      });
      const holdState = uncertain
        ? { status: "PROCESSING" as const, mpPaymentStatus: "processing", mpPaymentStatusDetail: statusDetail }
        : { status: "ACTIVE" as const, mpPaymentStatus: "rejected", mpPaymentStatusDetail: statusDetail };
      if (isRaffle && input.rafflePaymentHoldId) {
        await rafflePrisma.rafflePaymentHold.update({ where: { id: input.rafflePaymentHoldId }, data: holdState });
      } else if (input.storePaymentHoldId) {
        await storePrisma.storePaymentHold.update({ where: { id: input.storePaymentHoldId }, data: holdState });
      }

      if (uncertain) {
        return {
          attemptId: input.paymentAttemptId,
          paymentId: "",
          referenceId: isRaffle ? input.rafflePaymentHoldId : input.storePaymentHoldId,
          status: "in_process",
          statusDetail,
          outcome: "processing" as const,
          retryable: false,
          uncertain: true,
          message,
          threeDsInfo: null,
        };
      }

      const paymentError = new Error(message) as Error & {
        statusCode?: number;
        statusDetail?: string;
        retryable?: boolean;
        uncertain?: boolean;
        attemptId?: string;
      };
      paymentError.statusCode = 422;
      paymentError.statusDetail = statusDetail;
      paymentError.retryable = retryable;
      paymentError.uncertain = false;
      paymentError.attemptId = input.paymentAttemptId;
      throw paymentError;
    }
  },

  async updateCardPaymentAttempt(input: {
    isRaffle: boolean;
    attemptId: string;
    status: string;
    statusDetail?: string | null;
    mpPaymentId?: string | null;
    retryable: boolean;
    uncertain: boolean;
    customerMessage?: string | null;
  }) {
    const data = {
      status: input.status,
      statusDetail: input.statusDetail,
      mpPaymentId: input.mpPaymentId,
      retryable: input.retryable,
      uncertain: input.uncertain,
      customerMessage: input.customerMessage,
    };
    if (input.isRaffle) {
      return rafflePrisma.rafflePaymentAttempt.update({ where: { id: input.attemptId }, data });
    }
    return storePrisma.orderPaymentAttempt.update({ where: { id: input.attemptId }, data });
  },

  async recordStoreHoldPayment(holdId: string, payment: any, sellerUserId?: string | null) {
    await storePrisma.storePaymentHold.update({
      where: { id: holdId },
      data: {
        status: ["approved", "processing"].includes(cardPaymentStatus(payment.status)) ? "PROCESSING" : "ACTIVE",
        mpPaymentId: payment.id ? String(payment.id) : null,
        mpSellerUserId: sellerUserId || payment.collector_id?.toString() || null,
        mpPaymentStatus: payment.status || null,
        mpPaymentStatusDetail: payment.status_detail || null,
      },
    });
  },

  async recordRaffleHoldPayment(holdId: string, payment: any, sellerUserId?: string | null) {
    await rafflePrisma.rafflePaymentHold.update({
      where: { id: holdId },
      data: {
        status: ["approved", "processing"].includes(cardPaymentStatus(payment.status)) ? "PROCESSING" : "ACTIVE",
        mpPaymentId: payment.id ? String(payment.id) : null,
        mpSellerUserId: sellerUserId || payment.collector_id?.toString() || null,
        mpPaymentStatus: payment.status || null,
        mpPaymentStatusDetail: payment.status_detail || null,
      },
    });
  },

  async recordRafflePayment(
    reservationId: string,
    payment: any,
    sellerUserId?: string | null,
  ) {
    await rafflePrisma.ticketSale.updateMany({
      where: { reservationId, paymentMethod: "MERCADOPAGO" },
      data: {
        mpPaymentId: payment.id ? String(payment.id) : null,
        mpSellerUserId: sellerUserId || payment.collector_id?.toString() || null,
        mpPaymentStatus: payment.status || null,
        mpPaymentStatusDetail: payment.status_detail || null,
        mpPaymentMethodId: payment.payment_method_id || null,
        mpPaymentTypeId: payment.payment_type_id || null,
        mpPaidAmount:
          payment.transaction_amount == null
            ? null
            : Number(payment.transaction_amount),
        mpRefundId: payment.refunds?.[0]?.id
          ? String(payment.refunds[0].id)
          : undefined,
        mpRefundedAmount:
          Number(payment.transaction_amount_refunded || 0) > 0
            ? Number(payment.transaction_amount_refunded)
            : undefined,
        mpRefundedAt:
          ["refunded", "charged_back"].includes(payment.status) &&
          payment.date_last_updated
            ? new Date(payment.date_last_updated)
            : undefined,
      },
    });

    const attempt = await rafflePrisma.rafflePaymentAttempt.findFirst({
      where: {
        reservationId,
        OR: [
          { mpPaymentId: payment.id ? String(payment.id) : undefined },
          { mpPaymentId: null },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    if (attempt) {
      const outcome = cardPaymentStatus(payment.status);
      await rafflePrisma.rafflePaymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: outcome.toUpperCase(),
          statusDetail: payment.status_detail || null,
          mpPaymentId: payment.id ? String(payment.id) : attempt.mpPaymentId,
          retryable: outcome === "rejected" && isRetryableCardRejection(payment.status_detail),
          uncertain: false,
          customerMessage: outcome === "approved" ? "Pago confirmado." : cardPaymentMessage(payment.status_detail),
        },
      });
    }
  },

  async getCardPaymentStatus(input: { storePaymentHoldId?: string; rafflePaymentHoldId?: string; customerPhone: string }) {
    const isRaffle = Boolean(input.rafflePaymentHoldId);
    const hold = isRaffle
      ? await rafflePrisma.rafflePaymentHold.findUnique({ where: { id: input.rafflePaymentHoldId! } })
      : await storePrisma.storePaymentHold.findUnique({ where: { id: input.storePaymentHoldId! } });
    if (!hold || normalizePhone(hold.customerPhone) !== normalizePhone(input.customerPhone)) {
      throw Object.assign(new Error("No fue posible consultar el intento de pago."), { statusCode: 404 });
    }
    if (hold.status === "CONSUMED") {
      if (hold.mpPaymentStatus === "converted_to_transfer") {
        return {
          status: "unavailable",
          referenceId: "promotedReservationId" in hold ? hold.promotedReservationId : hold.promotedOrderId,
          message: "El método de pago cambió a depósito o transferencia.",
        };
      }
      return {
        status: "approved",
        referenceId: "promotedReservationId" in hold ? hold.promotedReservationId : hold.promotedOrderId,
      };
    }
    if (["EXPIRED", "CANCELLED"].includes(hold.status)) {
      return { status: "unavailable", referenceId: hold.id };
    }
    const attempt = isRaffle
      ? await rafflePrisma.rafflePaymentAttempt.findFirst({ where: { holdId: hold.id }, orderBy: { createdAt: "desc" } })
      : await storePrisma.orderPaymentAttempt.findFirst({ where: { holdId: hold.id }, orderBy: { createdAt: "desc" } });
    return {
      status: attempt?.status === "REJECTED" ? "rejected" : ["APPROVED", "PROCESSING", "UNKNOWN"].includes(attempt?.status || "") ? "processing" : "ready",
      referenceId: hold.id,
      statusDetail: attempt?.statusDetail || null,
      retryable: attempt?.retryable || false,
      uncertain: attempt?.uncertain || false,
      message: attempt?.customerMessage || null,
    };
  },

  async reconcilePayment(paymentId: string, sellerUserId?: string | null) {
    const sellerToken = await this.getSellerTokenByUserId(sellerUserId || null);
    if (!sellerToken) return null;
    const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${sellerToken}` },
      timeout: 15_000,
    });
    const payment = response.data as any;
    const externalReference = String(payment.external_reference || "");
    const raffleHoldReference = /^raffle_hold_(\d+)_([0-9a-f-]{36})$/i.exec(externalReference);
    const storeHoldReference = /^store_hold_([0-9a-f-]{36})$/i.exec(externalReference);
    const raffleReference = /^raffle_(\d+)_([0-9a-f-]{36})$/i.exec(externalReference);
    if (raffleHoldReference) {
      await this.recordRaffleHoldPayment(raffleHoldReference[2], payment, sellerUserId || null);
    } else if (storeHoldReference) {
      await this.recordStoreHoldPayment(storeHoldReference[1], payment, sellerUserId || null);
    } else if (raffleReference) {
      await this.recordRafflePayment(raffleReference[2], payment, sellerUserId || null);
    } else if (externalReference.startsWith("order_")) {
      const orderId = Number(externalReference.replace("order_", ""));
      if (Number.isInteger(orderId)) await this.recordOrderPayment(orderId, payment, sellerUserId || null);
    }
    if (payment.status === "approved") {
      await this.applyApprovedPayment(payment, sellerUserId || payment.collector_id?.toString() || null);
    }
    return payment;
  },

  async cancelPendingPayment(paymentId: string, sellerUserId?: string | null) {
    const sellerToken = await this.getSellerTokenByUserId(sellerUserId || null);
    if (!sellerToken) throw new Error("No hay una cuenta de Mercado Pago disponible para cancelar el pago.");

    const response = await axios.put(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { status: "cancelled" },
      {
        headers: { Authorization: `Bearer ${sellerToken}` },
        timeout: 15_000,
      },
    );
    return response.data as any;
  },

  async reconcilePaymentReference(externalReference: string, sellerUserId?: string | null) {
    const sellerToken = await this.getSellerTokenByUserId(sellerUserId || null);
    if (!sellerToken) return null;
    const response = await axios.get<any>("https://api.mercadopago.com/v1/payments/search", {
      headers: { Authorization: `Bearer ${sellerToken}` },
      params: { external_reference: externalReference, sort: "date_created", criteria: "desc", limit: 1 },
      timeout: 15_000,
    });
    const payment = response.data?.results?.[0] || null;
    if (!payment) return null;
    await this.reconcilePayment(String(payment.id), sellerUserId);
    return payment;
  },

  async applyApprovedPayment(payment: any, sellerUserId?: string | null) {
    const externalReference = String(payment.external_reference || "");
    const storeHoldMatch = /^store_hold_([0-9a-f-]{36})$/i.exec(externalReference);
    if (storeHoldMatch) {
      const { storePaymentHoldService } = await import("../orders/store-payment-hold.service");
      await storePaymentHoldService.promote(storeHoldMatch[1], payment, sellerUserId);
      return;
    }
    const raffleHoldMatch = /^raffle_hold_(\d+)_([0-9a-f-]{36})$/i.exec(externalReference);
    if (raffleHoldMatch) {
      const { rafflePaymentHoldService } = await import("../../raffle/ticket-sales/raffle-payment-hold.service");
      await rafflePaymentHoldService.promote(rafflePrisma, raffleHoldMatch[2], payment, sellerUserId);
      return;
    }
    if (externalReference.startsWith("order_")) {
      const orderId = Number(externalReference.replace("order_", ""));
      if (!Number.isInteger(orderId)) return;
      const order = await storePrisma.order.findUnique({ where: { id: orderId } });
      if (order?.status === "PENDING" && order.paymentStatus === "PENDING") {
        const { orderService } = await import("../orders/order.service");
        await this.recordOrderPayment(orderId, payment, sellerUserId);
        await orderService.updateStatus(orderId, "PAID");
      }
      return;
    }

    const raffleMatch = /^raffle_(\d+)_([0-9a-f-]{36})$/i.exec(externalReference);
    if (!raffleMatch) return;
    const raffleId = Number(raffleMatch[1]);
    const reservationId = raffleMatch[2];
    await this.recordRafflePayment(reservationId, payment, sellerUserId);
    const sales = await rafflePrisma.ticketSale.findMany({
      where: { raffleId, reservationId, paymentStatus: "PENDING", paymentMethod: "MERCADOPAGO" },
    });
    if (!sales.length) return;

    await rafflePrisma.ticketSale.updateMany({
      where: { id: { in: sales.map((sale) => sale.id) } },
      data: { paymentStatus: "PAID" },
    });
    const { publishTicketAvailabilityChanged } = await import("../../raffle/ticket-sales/ticket-availability.events");
    void publishTicketAvailabilityChanged(raffleId).catch((error) => {
      console.error("[Raffle availability] Could not publish payment change:", error);
    });
    await whatsappQueue.add("reservation-paid", {
      kind: "reservation-paid",
      ticketSaleIds: sales.map((sale) => sale.id),
      recipientPhone: sales[0].customerPhone,
    });
  },

  async refreshOAuthToken(refreshToken: string, sellerUserId?: string | null): Promise<OAuthTokens> {
    const gatewayUrl = getGatewayUrl();
    const gatewaySecret = process.env.MP_GATEWAY_SHARED_SECRET;

    if (gatewayUrl && gatewaySecret) {
      const body = sellerUserId ? { refreshToken, sellerUserId } : { refreshToken };
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
    const sellerUserId = await this.getSetting("mp_seller_user_id");
    const expiresAt = await this.getSetting("mp_seller_access_token_expires_at");
    if (!accessToken) return null;
    if (!refreshToken || !isTokenExpiring(expiresAt)) return accessToken;

    const refreshed = await this.refreshOAuthToken(refreshToken, sellerUserId);
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
    mpUserId?: string | null;
    id: number;
  } | null) {
    if (!channel?.mpAccessToken) return null;
    if (!channel.mpRefreshToken || !isTokenExpiring(channel.mpAccessTokenExpiresAt)) {
      return channel.mpAccessToken;
    }

    const refreshed = await this.refreshOAuthToken(channel.mpRefreshToken, channel.mpUserId);
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
      select: { id: true, mpAccessToken: true, mpRefreshToken: true, mpAccessTokenExpiresAt: true, mpUserId: true },
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

    const order = await storePrisma.order.update({
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
    const attempt = await storePrisma.orderPaymentAttempt.findFirst({
      where: {
        orderId,
        OR: [
          { mpPaymentId: payment.id ? String(payment.id) : undefined },
          { mpPaymentId: null },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    if (attempt) {
      const outcome = cardPaymentStatus(payment.status);
      await storePrisma.orderPaymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: outcome.toUpperCase(),
          statusDetail: payment.status_detail || null,
          mpPaymentId: payment.id ? String(payment.id) : attempt.mpPaymentId,
          retryable: outcome === "rejected" && isRetryableCardRejection(payment.status_detail),
          uncertain: false,
          customerMessage: outcome === "approved" ? "Pago confirmado." : cardPaymentMessage(payment.status_detail),
        },
      });
    }
    return order;
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

  async refundRaffleParticipation(participationId: string) {
    const legacyMatch = /^sale-(\d+)$/.exec(participationId);
    const sales = await rafflePrisma.ticketSale.findMany({
      where: legacyMatch
        ? { id: Number(legacyMatch[1]) }
        : { reservationId: participationId },
      orderBy: { id: "asc" },
    });

    if (!sales.length) {
      throw Object.assign(new Error("Participación no encontrada."), {
        statusCode: 404,
      });
    }

    const first = sales[0];
    if (first.paymentMethod !== "MERCADOPAGO") {
      throw Object.assign(
        new Error("Esta participación no fue pagada con Mercado Pago."),
        { statusCode: 409 },
      );
    }
    if (first.mpRefundedAt || Number(first.mpRefundedAmount || 0) > 0) {
      throw Object.assign(new Error("El pago de esta participación ya fue devuelto."), {
        statusCode: 409,
      });
    }
    if (!sales.every((sale) => sale.paymentStatus === "PAID")) {
      throw Object.assign(
        new Error("Solo se pueden devolver participaciones pagadas con tarjeta."),
        { statusCode: 409 },
      );
    }
    if (!first.mpPaymentId) {
      throw Object.assign(
        new Error("La participación no tiene un ID de pago de Mercado Pago."),
        { statusCode: 409 },
      );
    }

    const sellerToken = await this.getSellerTokenByUserId(first.mpSellerUserId);
    if (!sellerToken) {
      throw Object.assign(
        new Error("No se encontró la cuenta de Mercado Pago para procesar la devolución."),
        { statusCode: 409 },
      );
    }

    const client = new MercadoPagoConfig({ accessToken: sellerToken });
    const refundClient = new PaymentRefund(client);
    const refund = await refundClient.create({ payment_id: first.mpPaymentId });
    const paidAmount = Number(first.mpPaidAmount || 0);
    const refundAmount = Number((refund as any).amount || paidAmount);
    const refundedAt = new Date();

    await rafflePrisma.$transaction(async (tx) => {
      await tx.ticketSale.updateMany({
        where: { id: { in: sales.map((sale) => sale.id) } },
        data: {
          paymentStatus: "CANCELLED",
          mpPaymentStatus: "refunded",
          mpRefundId: (refund as any).id ? String((refund as any).id) : null,
          mpRefundedAmount: Number.isFinite(refundAmount) ? refundAmount : paidAmount,
          mpRefundedAt: refundedAt,
        },
      });

      if (first.couponId) {
        await tx.raffleCoupon.update({
          where: { id: first.couponId },
          data: { usedCount: { decrement: 1 } },
        });
      }
    });

    const { publishTicketAvailabilityChanged } = await import(
      "../../raffle/ticket-sales/ticket-availability.events"
    );
    void publishTicketAvailabilityChanged(first.raffleId).catch(() => undefined);
    await whatsappQueue.add("reservation-cancelled", {
      kind: "reservation-cancelled",
      ticketSaleIds: sales.map((sale) => sale.id),
      recipientPhone: first.customerPhone,
    });

    const { ticketSaleService } = await import(
      "../../raffle/ticket-sales/ticket-sale.service"
    );
    return ticketSaleService.getParticipationAdmin(
      rafflePrisma as any,
      participationId,
    );
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
        const storeHoldReference = /^store_hold_([0-9a-f-]{36})$/i.exec(String(externalReference || ""));
        const raffleHoldReference = /^raffle_hold_(\d+)_([0-9a-f-]{36})$/i.exec(String(externalReference || ""));
        if (storeHoldReference) {
          await this.recordStoreHoldPayment(storeHoldReference[1], payment, sellerId || payment.collector_id?.toString() || null);
        } else if (raffleHoldReference) {
          await this.recordRaffleHoldPayment(raffleHoldReference[2], payment, sellerId || payment.collector_id?.toString() || null);
        }
        const raffleReference = /^raffle_(\d+)_([0-9a-f-]{36})$/i.exec(
          String(externalReference || ""),
        );
        if (raffleReference) {
          await this.recordRafflePayment(
            raffleReference[2],
            payment,
            sellerId || payment.collector_id?.toString() || null,
          );
        }
        if (payment.status === "approved") {
          await this.applyApprovedPayment(payment, sellerId || payment.collector_id?.toString() || null);
        } else if (["cancelled", "rejected", "refunded", "charged_back"].includes(payment.status)) {
          // A declined embedded payment must not release the reservation immediately: the
          // customer may retry with another card while the short hold is still active.
          if (["cancelled", "rejected"].includes(payment.status)) {
            if (externalReference?.startsWith("order_")) {
              const orderId = parseInt(externalReference.replace("order_", ""));
              await this.recordOrderPayment(orderId, payment, sellerId || payment.collector_id?.toString() || null);
            }
            return { received: true };
          }
          if (externalReference?.startsWith("order_")) {
            const orderId = parseInt(externalReference.replace("order_", ""));
            const { orderService } = await import("../orders/order.service");
            await orderService.cancelPaymentAttempt(orderId, "FAILED");
          } else if (externalReference?.startsWith("raffle_")) {
            const raffleMatch = /^raffle_(\d+)_([0-9a-f-]{36})$/i.exec(externalReference);
            if (raffleMatch) {
              const raffleId = Number(raffleMatch[1]);
              const activeSales = await rafflePrisma.ticketSale.findMany({
                where: {
                  raffleId,
                  reservationId: raffleMatch[2],
                  paymentStatus: { in: ["PENDING", "PAID"] },
                  paymentMethod: "MERCADOPAGO",
                },
                select: { id: true, couponId: true, customerPhone: true },
              });
              await rafflePrisma.ticketSale.updateMany({
                where: {
                  raffleId,
                  reservationId: raffleMatch[2],
                  paymentStatus: { in: ["PENDING", "PAID"] },
                  paymentMethod: "MERCADOPAGO",
                },
                data: { paymentStatus: "CANCELLED" },
              });
              const couponIds = Array.from(new Set(activeSales.map((sale) => sale.couponId).filter((id): id is number => Boolean(id))));
              await Promise.all(couponIds.map((couponId) => rafflePrisma.raffleCoupon.update({
                where: { id: couponId },
                data: { usedCount: { decrement: 1 } },
              })));
              const { publishTicketAvailabilityChanged } = await import("../../raffle/ticket-sales/ticket-availability.events");
              void publishTicketAvailabilityChanged(raffleId).catch(() => undefined);
              if (activeSales.length > 0) {
                await whatsappQueue.add("reservation-cancelled", {
                  kind: "reservation-cancelled",
                  ticketSaleIds: activeSales.map((sale) => sale.id),
                  recipientPhone: activeSales[0].customerPhone,
                });
              }
            }
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

  async getApplicationFeePercentage() {
    const configuredValue =
      (await this.getSetting("mp_app_fee_percentage")) ?? "0";
    const percentage = Number(configuredValue);
    return Number.isFinite(percentage) && percentage > 0
      ? Math.min(percentage, 100)
      : 0;
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
