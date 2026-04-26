import { storePrisma } from "@nexus/db/store";

export const billingService = {
  // Extra Charges
  async getExtraCharges() {
    return storePrisma.extraCharge.findMany({ orderBy: { chargeDate: 'desc' } });
  },
  async createExtraCharge(data: any) {
    return storePrisma.extraCharge.create({ data });
  },
  async updateExtraCharge(id: number, data: any) {
    return storePrisma.extraCharge.update({ where: { id }, data });
  },
  async deleteExtraCharge(id: number) {
    return storePrisma.extraCharge.delete({ where: { id } });
  },

  // Annual Services
  async getAnnualServices() {
    return storePrisma.annualService.findMany({ orderBy: { createdAt: 'desc' } });
  },
  async createAnnualService(data: any) {
    return storePrisma.annualService.create({ data });
  },
  async updateAnnualService(id: number, data: any) {
    return storePrisma.annualService.update({ where: { id }, data });
  },
  async deleteAnnualService(id: number) {
    return storePrisma.annualService.delete({ where: { id } });
  },
};
