import { FastifyInstance } from "fastify";
import { billingService } from "./billing.service";
import { 
  createExtraChargeSchema, 
  updateExtraChargeSchema, 
  createAnnualServiceSchema, 
  updateAnnualServiceSchema,
  createBillingPaymentSchema,
  updateBillingPaymentSchema
} from "./billing.schema";

export async function billingRoutes(server: FastifyInstance) {
  server.addHook("preHandler", server.authenticate);

  // Extra Charges
  server.get("/extra-charges", async () => billingService.getExtraCharges());
  server.post("/extra-charges", async (request) => {
    const validated = createExtraChargeSchema.parse(request.body);
    return billingService.createExtraCharge(validated);
  });
  server.put("/extra-charges/:id", async (request) => {
    const { id } = request.params as { id: string };
    const validated = updateExtraChargeSchema.parse(request.body);
    return billingService.updateExtraCharge(parseInt(id), validated);
  });
  server.delete("/extra-charges/:id", async (request) => {
    const { id } = request.params as { id: string };
    return billingService.deleteExtraCharge(parseInt(id));
  });

  // Annual Services
  server.get("/annual-services", async () => billingService.getAnnualServices());
  server.post("/annual-services", async (request) => {
    const validated = createAnnualServiceSchema.parse(request.body);
    return billingService.createAnnualService(validated);
  });
  server.put("/annual-services/:id", async (request) => {
    const { id } = request.params as { id: string };
    const validated = updateAnnualServiceSchema.parse(request.body);
    return billingService.updateAnnualService(parseInt(id), validated);
  });
  server.delete("/annual-services/:id", async (request) => {
    const { id } = request.params as { id: string };
    return billingService.deleteAnnualService(parseInt(id));
  });

  // Payments
  server.get("/payments", async () => billingService.getPayments());
  server.post("/payments", async (request) => {
    const validated = createBillingPaymentSchema.parse(request.body);
    return billingService.createPayment(validated);
  });
  server.put("/payments/:id", async (request) => {
    const { id } = request.params as { id: string };
    const validated = updateBillingPaymentSchema.parse(request.body);
    return billingService.updatePayment(parseInt(id), validated);
  });
  server.delete("/payments/:id", async (request) => {
    const { id } = request.params as { id: string };
    return billingService.deletePayment(parseInt(id));
  });
}
