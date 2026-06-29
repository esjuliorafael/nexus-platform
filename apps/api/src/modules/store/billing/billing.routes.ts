import { FastifyInstance } from "fastify";
import { billingService } from "./billing.service";
import { 
  createExtraChargeSchema, 
  updateExtraChargeSchema, 
  createAnnualServiceSchema, 
  updateAnnualServiceSchema,
  createBillingPaymentSchema,
  updateBillingPaymentSchema,
  reorderBillingItemsSchema
} from "./billing.schema";

export async function billingRoutes(server: FastifyInstance) {
  server.addHook("preHandler", server.authenticate);

  // Extra Charges
  server.get("/extra-charges", async () => billingService.getExtraCharges());
  server.post("/extra-charges", async (request, reply) => {
    try {
      const validated = createExtraChargeSchema.parse(request.body);
      return billingService.createExtraCharge(validated);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
  });
  server.put("/extra-charges/reorder", async (request, reply) => {
    try {
      const validated = reorderBillingItemsSchema.parse(request.body);
      return billingService.reorderExtraCharges(validated.ids);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
  });
  server.put("/extra-charges/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const validated = updateExtraChargeSchema.parse(request.body);
      return billingService.updateExtraCharge(parseInt(id), validated);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
  });
  server.delete("/extra-charges/:id", async (request) => {
    const { id } = request.params as { id: string };
    return billingService.deleteExtraCharge(parseInt(id));
  });

  // Annual Services
  server.get("/annual-services", async () => billingService.getAnnualServices());
  server.post("/annual-services", async (request, reply) => {
    try {
      const validated = createAnnualServiceSchema.parse(request.body);
      return billingService.createAnnualService(validated);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
  });
  server.put("/annual-services/reorder", async (request, reply) => {
    try {
      const validated = reorderBillingItemsSchema.parse(request.body);
      return billingService.reorderAnnualServices(validated.ids);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
  });
  server.put("/annual-services/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const validated = updateAnnualServiceSchema.parse(request.body);
      return billingService.updateAnnualService(parseInt(id), validated);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
  });
  server.delete("/annual-services/:id", async (request) => {
    const { id } = request.params as { id: string };
    return billingService.deleteAnnualService(parseInt(id));
  });

  // Payments
  server.get("/payments", async () => billingService.getPayments());
  server.post("/payments", async (request, reply) => {
    try {
      const validated = createBillingPaymentSchema.parse(request.body);
      return billingService.createPayment(validated);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
  });
  server.put("/payments/reorder", async (request, reply) => {
    try {
      const validated = reorderBillingItemsSchema.parse(request.body);
      return billingService.reorderPayments(validated.ids);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
  });
  server.put("/payments/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const validated = updateBillingPaymentSchema.parse(request.body);
      return billingService.updatePayment(parseInt(id), validated);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
  });
  server.delete("/payments/:id", async (request) => {
    const { id } = request.params as { id: string };
    return billingService.deletePayment(parseInt(id));
  });
}
