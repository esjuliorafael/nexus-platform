import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  subcategories: z.array(z.string()).optional(),
});

export const createSubcategorySchema = z.object({
  name: z.string().min(1),
});
