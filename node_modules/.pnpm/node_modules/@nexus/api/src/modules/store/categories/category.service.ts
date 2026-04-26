import { storePrisma } from "@nexus/db/store";

export const categoryService = {
  async getAll() {
    return storePrisma.category.findMany({
      include: { subcategories: true },
      where: { active: true },
    });
  },

  async create(data: { name: string; icon?: string }) {
    return storePrisma.category.create({ data });
  },

  async update(id: number, data: { name?: string; icon?: string; subcategories?: string[] }) {
    return storePrisma.$transaction(async (tx) => {
      const category = await tx.category.update({
        where: { id },
        data: { name: data.name, icon: data.icon },
      });

      if (data.subcategories) {
        // Simple strategy: delete all and recreate for this category
        // or just add missing ones. The legacy admin seems to send a list.
        await tx.subcategory.deleteMany({ where: { categoryId: id } });
        await tx.subcategory.createMany({
          data: data.subcategories.map((name) => ({ name, categoryId: id })),
        });
      }

      return category;
    });
  },

  async delete(id: number) {
    return storePrisma.category.update({
      where: { id },
      data: { active: false },
    });
  },

  async addSubcategory(categoryId: number, name: string) {
    return storePrisma.subcategory.create({
      data: { categoryId, name },
    });
  },

  async removeSubcategory(id: number) {
    return storePrisma.subcategory.delete({ where: { id } });
  },
};
