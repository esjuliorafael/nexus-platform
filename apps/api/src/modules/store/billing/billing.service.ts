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

const nextDisplayOrder = async (model: any) => {
  const result = await model.aggregate({ _max: { displayOrder: true } });
  return (result._max.displayOrder ?? -1) + 1;
};

export const billingService = {
  // Extra Charges
  async getExtraCharges() {
    const charges = await storePrisma.extraCharge.findMany({ 
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }]
    });
    return charges.map(mapCharge);
  },
  async createExtraCharge(data: any) {
    const displayOrder = data.displayOrder ?? await nextDisplayOrder(storePrisma.extraCharge);
    const charge = await storePrisma.extraCharge.create({
      data: {
        ...data,
        displayOrder,
      },
    });
    return mapCharge(charge);
  },
  async updateExtraCharge(id: number, data: any) {
    const charge = await storePrisma.extraCharge.update({ where: { id }, data });
    return mapCharge(charge);
  },
  async deleteExtraCharge(id: number) {
    return storePrisma.extraCharge.delete({ where: { id } });
  },
  async reorderExtraCharges(ids: number[]) {
    await storePrisma.$transaction(
      ids.map((id, displayOrder) =>
        storePrisma.extraCharge.update({ where: { id }, data: { displayOrder } })
      )
    );
    return this.getExtraCharges();
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
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }]
    });
    return services.map(mapService);
  },
  async createAnnualService(data: any) {
    const displayOrder = data.displayOrder ?? await nextDisplayOrder(storePrisma.annualService);
    const service = await storePrisma.annualService.create({
      data: {
        ...data,
        displayOrder,
      },
    });
    return mapService(service);
  },
  async updateAnnualService(id: number, data: any) {
    const service = await storePrisma.annualService.update({ where: { id }, data });
    return mapService(service);
  },
  async deleteAnnualService(id: number) {
    return storePrisma.annualService.delete({ where: { id } });
  },
  async reorderAnnualServices(ids: number[]) {
    await storePrisma.$transaction(
      ids.map((id, displayOrder) =>
        storePrisma.annualService.update({ where: { id }, data: { displayOrder } })
      )
    );
    return this.getAnnualServices();
  },

  // Payments
  async getPayments() {
    const payments = await storePrisma.billingPayment.findMany({ 
      orderBy: [{ displayOrder: 'asc' }, { paymentDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
    });
    return payments.map(mapPayment);
  },
  async createPayment(data: any) {
    const displayOrder = data.displayOrder ?? await nextDisplayOrder(storePrisma.billingPayment);
    const payment = await storePrisma.billingPayment.create({
      data: {
        ...data,
        displayOrder,
      },
    });
    return mapPayment(payment);
  },
  async updatePayment(id: number, data: any) {
    const payment = await storePrisma.billingPayment.update({ where: { id }, data });
    return mapPayment(payment);
  },
  async deletePayment(id: number) {
    return storePrisma.billingPayment.delete({ where: { id } });
  },
  async reorderPayments(ids: number[]) {
    await storePrisma.$transaction(
      ids.map((id, displayOrder) =>
        storePrisma.billingPayment.update({ where: { id }, data: { displayOrder } })
      )
    );
    return this.getPayments();
  },
};
