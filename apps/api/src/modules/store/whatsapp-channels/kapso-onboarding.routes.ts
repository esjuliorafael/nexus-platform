import { createHash, randomBytes } from "node:crypto";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { kapsoClient } from "../../../services/kapso/kapso.client";
import {
  getKapsoConfigForChannel,
  requireKapsoPlatformConfig,
} from "../../../services/kapso/kapso.config";
import { verifyKapsoWebhookSignature } from "../../../services/kapso/kapso-webhook";
import { getTenantId } from "../payments/mercadopago-gateway.security";

const createSetupLinkSchema = z
  .object({
    target: z.enum(["PRINCIPAL", "SPECIALIZED"]),
    channelId: z.coerce.number().int().positive().optional(),
    returnUrl: z.string().url(),
  })
  .superRefine((data, context) => {
    if (data.target === "SPECIALIZED" && !data.channelId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["channelId"],
        message: "El canal especializado es obligatorio.",
      });
    }
  });

const callbackSchema = z
  .object({
    token: z.string().min(32),
    status: z.string().optional(),
    phone_number_id: z.string().optional(),
    business_account_id: z.string().optional(),
    display_phone_number: z.string().optional(),
    setup_link_id: z.string().optional(),
    error: z.string().optional(),
  })
  .passthrough();

const disconnectSchema = z
  .object({
    target: z.enum(["PRINCIPAL", "SPECIALIZED"]),
    channelId: z.coerce.number().int().positive().optional(),
  })
  .superRefine((data, context) => {
    if (data.target === "SPECIALIZED" && !data.channelId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["channelId"],
        message: "El canal especializado es obligatorio.",
      });
    }
  });

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

function publicApiBase(request: any) {
  const configured =
    process.env.KAPSO_WEBHOOK_BASE_URL ||
    process.env.API_PUBLIC_URL ||
    process.env.PUBLIC_API_URL ||
    process.env.MP_TENANT_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const protocol =
    request.headers["x-forwarded-proto"] || request.protocol || "http";
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  return `${protocol}://${host}`;
}

function safeReturnUrl(value: string) {
  const configured = process.env.ADMIN_URL?.replace(/\/+$/, "");
  const parsed = new URL(value);
  if (configured && parsed.origin !== new URL(configured).origin) {
    throw Object.assign(new Error("La URL de retorno no pertenece al Admin."), {
      statusCode: 400,
    });
  }
  return value;
}

async function ensureKapsoPlatformWebhook(
  server: FastifyInstance,
  request: any,
) {
  const config = requireKapsoPlatformConfig();
  if (!config.platformWebhookSecret) {
    throw Object.assign(
      new Error(
        "KAPSO_PLATFORM_WEBHOOK_SECRET es obligatorio para vincular canales con Kapso.",
      ),
      { statusCode: 503 },
    );
  }

  const webhookUrl = `${publicApiBase(request)}/api/v1/webhooks/kapso/platform`;
  const current = await kapsoClient.listProjectWebhooks(config);
  const events = [
    "whatsapp.phone_number.created",
    "whatsapp.phone_number.deleted",
  ] as const;
  const existing = current.data.find(
    (item) =>
      String(item.url || "") === webhookUrl &&
      item.active !== false &&
      events.every((event) =>
        Array.isArray(item.events) && item.events.includes(event),
      ),
  );
  if (existing) return existing;

  const created = await kapsoClient.createProjectWebhook(
    config,
    webhookUrl,
    config.platformWebhookSecret,
    [...events],
  );
  return created.data;
}

async function tenantDisplayName(server: FastifyInstance) {
  const setting = await server.storePrisma.setting.findFirst({
    where: {
      key: { in: ["branding_brand_name", "brand_name"] },
      value: { not: null },
    },
    orderBy: { key: "asc" },
  });
  return setting?.value?.trim() || getTenantId();
}

async function ensureKapsoCustomer(server: FastifyInstance) {
  const platformConfig = requireKapsoPlatformConfig();
  const stored = await server.storePrisma.setting.findUnique({
    where: { key: "kapso_customer_id" },
  });
  if (stored?.value) return stored.value;

  const externalCustomerId = getTenantId();
  const current = await kapsoClient.listCustomers(
    platformConfig,
    externalCustomerId,
  );
  const existing = current.data.find(
    (item) =>
      String(item.external_customer_id || "") === externalCustomerId,
  );
  const customer =
    existing ||
    (
      await kapsoClient.createCustomer(platformConfig, {
        name: await tenantDisplayName(server),
        externalCustomerId,
      })
    ).data;
  const customerId = String(customer.id || "");
  if (!customerId) {
    throw Object.assign(
      new Error("Kapso no devolvió el identificador del Customer."),
      { statusCode: 502 },
    );
  }

  await server.storePrisma.setting.upsert({
    where: { key: "kapso_customer_id" },
    update: { value: customerId, group: "whatsapp" },
    create: {
      key: "kapso_customer_id",
      value: customerId,
      group: "whatsapp",
      description: "Customer de Kapso asociado al tenant.",
    },
  });
  return customerId;
}

async function resolvePhoneIdentity(
  phoneNumberId: string,
  businessAccountId?: string,
) {
  if (businessAccountId) {
    return { phoneNumberId, businessAccountId, displayPhoneNumber: "" };
  }
  const config = getKapsoConfigForChannel({ phoneNumberId });
  if (!config) {
    return { phoneNumberId, businessAccountId: "", displayPhoneNumber: "" };
  }
  const response = await kapsoClient.getPhoneNumber(config);
  const phone = response.data;
  return {
    phoneNumberId,
    businessAccountId: String(phone.business_account_id || ""),
    displayPhoneNumber: String(
      phone.display_phone_number || phone.display_phone_number_normalized || "",
    ),
  };
}

async function completeSession(
  server: FastifyInstance,
  sessionId: string,
  identity: {
    phoneNumberId: string;
    businessAccountId: string;
    displayPhoneNumber?: string;
    setupLinkId?: string;
  },
) {
  const session = await server.storePrisma.kapsoOnboardingSession.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.status === "COMPLETED") return session;
  if (!identity.phoneNumberId || !identity.businessAccountId) {
    throw Object.assign(
      new Error("Kapso no devolvió la identidad completa del número."),
      { statusCode: 422 },
    );
  }

  await server.storePrisma.$transaction(async (tx) => {
    if (session.target === "PRINCIPAL") {
      const settings: Array<readonly [string, string]> = [
        ["whatsapp_main_provider", "KAPSO"],
        ["whatsapp_main_kapso_phone_number_id", identity.phoneNumberId],
        [
          "whatsapp_main_kapso_business_account_id",
          identity.businessAccountId,
        ],
      ];
      const displayPhoneNumber =
        identity.displayPhoneNumber || session.displayPhoneNumber || "";
      if (displayPhoneNumber) {
        settings.push([
          "whatsapp_main_phone",
          displayPhoneNumber,
        ]);
      }
      for (const [key, value] of settings) {
        await tx.setting.upsert({
          where: { key },
          update: { value, group: "general" },
          create: { key, value, group: "general" },
        });
      }
    } else {
      if (!session.channelId) {
        throw Object.assign(
          new Error("La sesión perdió su Canal Especializado."),
          { statusCode: 409 },
        );
      }
      await tx.whatsappChannel.update({
        where: { id: session.channelId },
        data: {
          provider: "KAPSO",
          kapsoPhoneNumberId: identity.phoneNumberId,
          kapsoBusinessAccountId: identity.businessAccountId,
          ...(identity.displayPhoneNumber
            ? { phone: identity.displayPhoneNumber }
            : {}),
          updated_at: new Date(),
        },
      });
    }

    await tx.kapsoOnboardingSession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        phoneNumberId: identity.phoneNumberId,
        businessAccountId: identity.businessAccountId,
        displayPhoneNumber:
          identity.displayPhoneNumber || session.displayPhoneNumber,
        setupLinkId: identity.setupLinkId || session.setupLinkId,
        completedAt: new Date(),
        errorMessage: null,
      },
    });
  });
  return session;
}

async function clearKapsoIdentity(
  server: FastifyInstance,
  phoneNumberId: string,
) {
  await server.storePrisma.$transaction(async (tx) => {
    const principalPhone = await tx.setting.findUnique({
      where: { key: "whatsapp_main_kapso_phone_number_id" },
      select: { value: true },
    });

    if (principalPhone?.value === phoneNumberId) {
      const principalSettings: Array<readonly [string, string]> = [
        ["whatsapp_main_provider", "EVOLUTION"],
        ["whatsapp_main_kapso_phone_number_id", ""],
        ["whatsapp_main_kapso_business_account_id", ""],
      ];
      for (const [key, value] of principalSettings) {
        await tx.setting.upsert({
          where: { key },
          update: { value, group: "general" },
          create: { key, value, group: "general" },
        });
      }
    }

    await tx.whatsappChannel.updateMany({
      where: { kapsoPhoneNumberId: phoneNumberId },
      data: {
        provider: "EVOLUTION",
        deliveryStrategy: "STANDARD",
        kapsoPhoneNumberId: null,
        kapsoBusinessAccountId: null,
        updated_at: new Date(),
      },
    });
  });
}

export async function kapsoOnboardingAdminRoutes(server: FastifyInstance) {
  server.post(
    "/setup-link",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      let body: z.infer<typeof createSetupLinkSchema>;
      try {
        body = createSetupLinkSchema.parse(request.body);
      } catch (error: any) {
        if (error?.issues) {
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        }
        throw error;
      }

      if (body.channelId) {
        const channel = await server.storePrisma.whatsappChannel.findUnique({
          where: { id: body.channelId },
          select: { id: true },
        });
        if (!channel) {
          return reply.status(404).send({ message: "Canal no encontrado." });
        }
      }

      const customerId = await ensureKapsoCustomer(server);
      await ensureKapsoPlatformWebhook(server, request);
      const token = randomBytes(32).toString("base64url");
      const returnUrl = safeReturnUrl(body.returnUrl);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await server.storePrisma.kapsoOnboardingSession.updateMany({
        where: {
          customerId,
          status: "PENDING",
          target: body.target,
          ...(body.target === "SPECIALIZED"
            ? { channelId: body.channelId || null }
            : {}),
        },
        data: {
          status: "EXPIRED",
          errorMessage: "Reemplazada por una nueva vinculación.",
        },
      });
      const session = await server.storePrisma.kapsoOnboardingSession.create({
        data: {
          tokenHash: hashToken(token),
          customerId,
          target: body.target,
          channelId: body.channelId || null,
          returnUrl,
          expiresAt,
        },
      });

      const callback = `${publicApiBase(request)}/api/v1/webhooks/kapso/onboarding/callback?token=${encodeURIComponent(token)}`;
      try {
        const result = await kapsoClient.createSetupLink(
          requireKapsoPlatformConfig(),
          customerId,
          {
            successRedirectUrl: callback,
            failureRedirectUrl: `${callback}&status=failed`,
          },
        );
        const setupLinkId = String(result.data.id || "");
        const setupUrl = String(result.data.url || "");
        if (!setupUrl) throw new Error("Kapso no devolvió el Setup Link.");
        await server.storePrisma.kapsoOnboardingSession.update({
          where: { id: session.id },
          data: {
            setupLinkId: setupLinkId || null,
            expiresAt: result.data.expires_at
              ? new Date(String(result.data.expires_at))
              : expiresAt,
          },
        });
        return {
          url: setupUrl,
          sessionId: session.id,
          expiresAt,
          customerId,
        };
      } catch (error: any) {
        await server.storePrisma.kapsoOnboardingSession.update({
          where: { id: session.id },
          data: {
            status: "FAILED",
            errorMessage: String(error?.message || error),
          },
        });
        throw error;
      }
    },
  );

  server.get(
    "/sessions/:id",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const session =
        await server.storePrisma.kapsoOnboardingSession.findUnique({
          where: { id },
          select: {
            id: true,
            status: true,
            target: true,
            channelId: true,
            displayPhoneNumber: true,
            errorMessage: true,
            expiresAt: true,
            completedAt: true,
          },
        });
      if (!session) {
        return reply.status(404).send({ message: "Sesión no encontrada." });
      }
      return session;
    },
  );

  server.post(
    "/disconnect",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      let body: z.infer<typeof disconnectSchema>;
      try {
        body = disconnectSchema.parse(request.body);
      } catch (error: any) {
        if (error?.issues) {
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        }
        throw error;
      }

      let phoneNumberId = "";
      if (body.target === "PRINCIPAL") {
        const setting = await server.storePrisma.setting.findUnique({
          where: { key: "whatsapp_main_kapso_phone_number_id" },
          select: { value: true },
        });
        phoneNumberId = setting?.value?.trim() || "";
      } else {
        const channel = await server.storePrisma.whatsappChannel.findUnique({
          where: { id: body.channelId! },
          select: { kapsoPhoneNumberId: true },
        });
        if (!channel) {
          return reply.status(404).send({ message: "Canal no encontrado." });
        }
        phoneNumberId = channel.kapsoPhoneNumberId?.trim() || "";
      }

      if (!phoneNumberId) {
        return reply
          .status(409)
          .send({ message: "El canal no tiene un número Cloud vinculado." });
      }

      const config = getKapsoConfigForChannel({ phoneNumberId });
      if (!config) {
        return reply.status(503).send({
          message: "Kapso no está configurado para desvincular el número.",
        });
      }

      try {
        await kapsoClient.deletePhoneNumber(config);
      } catch (error: any) {
        if (error?.statusCode !== 404) throw error;
      }

      await clearKapsoIdentity(server, phoneNumberId);
      return {
        ok: true,
        phoneNumberId,
        provider: "EVOLUTION",
      };
    },
  );
}

export async function kapsoOnboardingPublicRoutes(server: FastifyInstance) {
  server.get("/kapso/onboarding/callback", async (request, reply) => {
    let query: z.infer<typeof callbackSchema>;
    try {
      query = callbackSchema.parse(request.query);
    } catch (error: any) {
      if (error?.issues) {
        return reply
          .status(400)
          .send({ message: "Validation error", errors: error.issues });
      }
      throw error;
    }

    const session = await server.storePrisma.kapsoOnboardingSession.findUnique({
      where: { tokenHash: hashToken(query.token) },
    });
    if (!session || session.expiresAt < new Date()) {
      return reply.status(410).send({ message: "La vinculación expiró." });
    }

    const failed = query.status === "failed" || Boolean(query.error);
    if (failed) {
      await server.storePrisma.kapsoOnboardingSession.update({
        where: { id: session.id },
        data: {
          status: "FAILED",
          errorMessage: query.error || "La vinculación fue cancelada.",
        },
      });
    } else if (query.phone_number_id) {
      const identity = await resolvePhoneIdentity(
        query.phone_number_id,
        query.business_account_id,
      );
      await completeSession(server, session.id, {
        ...identity,
        displayPhoneNumber:
          query.display_phone_number || identity.displayPhoneNumber,
        setupLinkId: query.setup_link_id,
      });
    }

    const redirectUrl = new URL(session.returnUrl);
    const outcome = failed
      ? "failed"
      : query.phone_number_id
        ? "success"
        : "pending";
    redirectUrl.searchParams.set("kapso_onboarding", outcome);
    return reply.redirect(redirectUrl.toString());
  });

  server.post("/kapso/platform", async (request, reply) => {
    const config = requireKapsoPlatformConfig();
    if (
      !config.platformWebhookSecret ||
      !verifyKapsoWebhookSignature(
        request.body,
        request.headers["x-webhook-signature"],
        config.platformWebhookSecret,
      )
    ) {
      return reply.status(401).send({ message: "Invalid webhook signature." });
    }
    const body = request.body as any;
    const eventName = String(
      request.headers["x-webhook-event"] || body?.event || "",
    );
    const payload = body?.data || body;
    if (eventName === "whatsapp.phone_number.deleted") {
      const phoneNumberId = String(payload?.phone_number_id || "");
      if (!phoneNumberId) return { ok: true, matched: false };
      await clearKapsoIdentity(server, phoneNumberId);
      return { ok: true, matched: true };
    }

    if (eventName !== "whatsapp.phone_number.created") {
      return { ok: true, ignored: true };
    }

    const customerId = String(payload?.customer?.id || "");
    const phoneNumberId = String(payload?.phone_number_id || "");
    const session = await server.storePrisma.kapsoOnboardingSession.findFirst({
      where: { customerId, status: "PENDING", expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!session || !phoneNumberId) return { ok: true, matched: false };

    const identity = await resolvePhoneIdentity(phoneNumberId);
    await completeSession(server, session.id, identity);
    return { ok: true, matched: true };
  });
}
