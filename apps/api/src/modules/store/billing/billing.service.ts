import { storePrisma } from "@nexus/db/store";

const mapService = (s: any) => ({
  ...s,
  amount: s.amount ? Number(s.amount) : 0,
});

const mapCharge = (c: any) => ({
  ...c,
  amount: c.amount ? Number(c.amount) : 0,
});

const mapPayment = (p: any) => ({
  ...p,
  amount: p.amount ? Number(p.amount) : 0,
});

export const billingService = {
  // Extra Charges
  async getExtraCharges() {
    const charges = await storePrisma.extraCharge.findMany({ 
      orderBy: { createdAt: 'asc' } 
    });
    return charges.map(mapCharge);
  },
  async createExtraCharge(data: any) {
    const charge = await storePrisma.extraCharge.create({ data });
    return mapCharge(charge);
  },
  async updateExtraCharge(id: number, data: any) {
    const charge = await storePrisma.extraCharge.update({ where: { id }, data });
    return mapCharge(charge);
  },
  async deleteExtraCharge(id: number) {
    return storePrisma.extraCharge.delete({ where: { id } });
  },

  // Annual Services
  async getAnnualServices() {
    const now = new Date();
    
    // Check for expired services that are marked as paid and revert them to unpaid
    const expiredPaidServices = await storePrisma.annualService.findMany({
      where: {
        isPaid: true,
        expirationDate: {
          lt: now
        }
      }
    });

    if (expiredPaidServices.length > 0) {
      await storePrisma.annualService.updateMany({
        where: {
          id: {
            in: expiredPaidServices.map(s => s.id)
          }
        },
        data: {
          isPaid: false
        }
      });
    }

    const services = await storePrisma.annualService.findMany({ 
      orderBy: { createdAt: 'asc' } 
    });
    return services.map(mapService);
  },
  async createAnnualService(data: any) {
    const service = await storePrisma.annualService.create({ data });
    return mapService(service);
  },
  async updateAnnualService(id: number, data: any) {
    const service = await storePrisma.annualService.update({ where: { id }, data });
    return mapService(service);
  },
  async deleteAnnualService(id: number) {
    return storePrisma.annualService.delete({ where: { id } });
  },

  // Payments
  async getPayments() {
    const payments = await storePrisma.billingPayment.findMany({ 
      orderBy: { paymentDate: 'desc' } 
    });
    return payments.map(mapPayment);
  },
  async createPayment(data: any) {
    const payment = await storePrisma.billingPayment.create({ data });
    return mapPayment(payment);
  },
  async updatePayment(id: number, data: any) {
    const payment = await storePrisma.billingPayment.update({ where: { id }, data });
    return mapPayment(payment);
  },
  async deletePayment(id: number) {
    return storePrisma.billingPayment.delete({ where: { id } });
  },
};
