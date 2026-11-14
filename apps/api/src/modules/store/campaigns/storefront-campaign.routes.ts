import { FastifyInstance } from "fastify";
import {
  createStorefrontCampaignSchema,
  updateStorefrontCampaignActiveSchema,
  updateStorefrontCampaignSchema,
} from "./storefront-campaign.schema";
import { storefrontCampaignService } from "./storefront-campaign.service";

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1)
    throw Object.assign(new Error("Id de campaña inválido."), {
      statusCode: 400,
    });
  return id;
}

function handleError(error: any, reply: any) {
  if (error?.issues)
    return reply
      .status(400)
      .send({ message: "Validation error", errors: error.issues });
  if (error?.statusCode)
    return reply.status(error.statusCode).send({ message: error.message });
  throw error;
}

export async function storefrontCampaignPublicRoutes(server: FastifyInstance) {
  server.get("/active", async () =>
    storefrontCampaignService.getPublicActive(),
  );
}

export async function storefrontCampaignAdminRoutes(server: FastifyInstance) {
  server.addHook("preHandler", server.authenticate);

  server.get("/", () => storefrontCampaignService.getAdmin());
  server.get("/available-coupons", async (request, reply) => {
    try {
      const query = request.query as { campaignId?: string };
      const campaignId = query.campaignId
        ? parseId(query.campaignId)
        : undefined;
      return await storefrontCampaignService.getAvailableCoupons(campaignId);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  server.post("/", async (request, reply) => {
    try {
      const body = createStorefrontCampaignSchema.parse(request.body);
      return await storefrontCampaignService.create(body);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  server.put("/:id", async (request, reply) => {
    try {
      const id = parseId((request.params as { id: string }).id);
      const body = updateStorefrontCampaignSchema.parse(request.body);
      return await storefrontCampaignService.update(id, body);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  server.patch("/:id/active", async (request, reply) => {
    try {
      const id = parseId((request.params as { id: string }).id);
      const { active } = updateStorefrontCampaignActiveSchema.parse(
        request.body,
      );
      return await storefrontCampaignService.update(id, { active });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  server.delete("/:id", async (request, reply) => {
    try {
      await storefrontCampaignService.delete(
        parseId((request.params as { id: string }).id),
      );
      return { success: true };
    } catch (error) {
      return handleError(error, reply);
    }
  });
}
