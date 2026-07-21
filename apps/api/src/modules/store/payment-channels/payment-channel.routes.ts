import { FastifyInstance } from "fastify";
import { storePrisma } from "@nexus/db/store";
import { paymentChannelSchema } from "../shared.schema";

export async function paymentChannelRoutes(server: FastifyInstance) {
  server.get("/", { preHandler: [server.authenticate] }, async () => {
    return storePrisma.paymentChannel.findMany();
  });

  server.post("/", { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const validated = paymentChannelSchema.parse(request.body);
      return storePrisma.paymentChannel.create({ data: validated });
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: error.issues });
      }
      throw error;
    }
  });

  server.put("/:id", { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validated = paymentChannelSchema.parse(request.body);
      return storePrisma.paymentChannel.update({
        where: { id: parseInt(id) },
        data: validated,
      });
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: error.issues });
      }
      throw error;
    }
  });

  server.delete("/:id", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return storePrisma.paymentChannel.delete({ where: { id: parseInt(id) } });
  });
}

const PURPOSE_LABELS: Record<string, string> = {
  COMBAT: "Canal de Combate",
  BREEDING: "Canal de Cría",
  RAFFLES: "Canal de Rifas",
};

export async function publicPaymentOptionRoutes(server: FastifyInstance) {
  server.get("/", async (request, reply) => {
    const requestedPurpose = String(
      (request.query as { purpose?: string }).purpose || "MAIN",
    ).toUpperCase();

    if (!["MAIN", "COMBAT", "BREEDING", "RAFFLES"].includes(requestedPurpose)) {
      return reply.status(400).send({ message: "Propósito de pago no válido" });
    }

    const [specializedChannel, settings] = await Promise.all([
      requestedPurpose === "MAIN"
        ? Promise.resolve(null)
        : storePrisma.paymentChannel.findFirst({
            where: { purpose: requestedPurpose },
            select: {
              bank: true,
              beneficiary: true,
              accountNumber: true,
              clabe: true,
              card: true,
              mpAccessToken: true,
            },
          }),
      storePrisma.setting.findMany({
        where: {
          key: {
            in: [
              "bank_main_name",
              "bank_main_beneficiary",
              "bank_main_account",
              "bank_main_clabe",
              "bank_main_card",
              "mp_seller_access_token",
              "mp_main_checkout_enabled",
            ],
          },
        },
        select: { key: true, value: true },
      }),
    ]);

    const setting = Object.fromEntries(settings.map((item) => [item.key, item.value]));
    const specializedBankReady = Boolean(
      specializedChannel?.bank?.trim() && specializedChannel?.beneficiary?.trim(),
    );
    const mainBankReady = Boolean(
      setting.bank_main_name?.trim() && setting.bank_main_beneficiary?.trim(),
    );
    const specializedMercadoPagoReady = Boolean(specializedChannel?.mpAccessToken);
    const mainMercadoPagoReady = Boolean(setting.mp_seller_access_token)
      && setting.mp_main_checkout_enabled !== "0";

    return {
      requestedPurpose,
      bank: specializedBankReady
        ? {
            source: "SPECIALIZED",
            label: PURPOSE_LABELS[requestedPurpose],
            bank: specializedChannel!.bank,
            beneficiary: specializedChannel!.beneficiary,
            accountNumber: specializedChannel!.accountNumber,
            clabe: specializedChannel!.clabe,
            card: specializedChannel!.card,
          }
        : mainBankReady
          ? {
              source: "MAIN",
              label: requestedPurpose === "MAIN"
                ? "Canal Principal"
                : "Canal Principal, respaldo",
              bank: setting.bank_main_name,
              beneficiary: setting.bank_main_beneficiary,
              accountNumber: setting.bank_main_account || null,
              clabe: setting.bank_main_clabe || null,
              card: setting.bank_main_card || null,
            }
          : null,
      mercadoPago: {
        available: specializedMercadoPagoReady || mainMercadoPagoReady,
        source: specializedMercadoPagoReady
          ? "SPECIALIZED"
          : mainMercadoPagoReady
            ? "MAIN"
            : null,
      },
    };
  });
}
