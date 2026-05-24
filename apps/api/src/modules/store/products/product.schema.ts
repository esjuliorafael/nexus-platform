import { z } from "zod";

export const productTypeEnum = z.preprocess(
  (val) => (typeof val === "string" ? val.toUpperCase() : val),
  z.enum(["ITEM", "BIRD"])
);

export const saleStatusEnum = z.preprocess(
  (val) => (typeof val === "string" ? val.toUpperCase() : val),
  z.enum(["AVAILABLE", "RESERVED", "SOLD"])
);

export const createProductSchema = z.object({
  type: productTypeEnum,
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  thumbnail: z.string().optional(),
  stock: z.number().int().min(0).default(1),
  ringNumber: z.string().optional(),
  age: z.string().optional(),
  purpose: z.string().optional(),
  gallery: z.array(z.string()).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const updateProductStatusSchema = z.object({
  saleStatus: saleStatusEnum,
});
