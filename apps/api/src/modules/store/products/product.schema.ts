import { z } from "zod";

export const productTypeEnum = z.preprocess(
  (value) => (typeof value === "string" ? value.toUpperCase() : value),
  z.enum(["ITEM", "BIRD"]),
);

export const saleStatusEnum = z.preprocess(
  (value) => (typeof value === "string" ? value.toUpperCase() : value),
  z.enum(["AVAILABLE", "RESERVED", "SOLD"]),
);

const productGalleryAssetSchema = z.object({
  assetId: z.string().uuid(),
});

export const createProductSchema = z.object({
  type: productTypeEnum,
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  coverAssetId: z.string().uuid().nullable().optional(),
  coverPosterAssetId: z.string().uuid().optional(),
  stock: z.number().int().min(0).default(1),
  ringNumber: z.string().optional(),
  age: z.string().optional(),
  purpose: z.string().optional(),
  gallery: z.array(productGalleryAssetSchema).optional(),
  saleStatus: saleStatusEnum.optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const updateProductStatusSchema = z.object({
  saleStatus: saleStatusEnum,
});
