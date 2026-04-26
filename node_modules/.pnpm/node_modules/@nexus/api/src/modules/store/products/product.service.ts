import { storePrisma } from "@nexus/db/store";
import { ProductType, SaleStatus } from "@prisma/client-store";

export interface ProductFilters {
  type?: ProductType;
  status?: SaleStatus;
  search?: string;
  onlyActive?: boolean;
}

export const productService = {
  async getAll(filters: ProductFilters) {
    const where: any = {};
    
    if (filters.onlyActive !== false) where.active = true;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.saleStatus = filters.status;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    return storePrisma.product.findMany({
      where,
      include: { gallery: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(id: number) {
    return storePrisma.product.findUnique({
      where: { id },
      include: { gallery: true },
    });
  },

  async create(data: any) {
    return storePrisma.product.create({ data });
  },

  async update(id: number, data: any) {
    return storePrisma.product.update({
      where: { id },
      data,
    });
  },

  async softDelete(id: number) {
    return storePrisma.product.update({
      where: { id },
      data: { active: false },
    });
  },
};
