import { ProductType, SaleStatus } from "@prisma/client-store";

export async function synchronizeItemAvailability(tx: any, productId: number) {
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { type: true, stock: true, saleStatus: true },
  });
  if (!product || product.type !== ProductType.ITEM) return;

  const saleStatus =
    product.stock > 0 ? SaleStatus.AVAILABLE : SaleStatus.SOLD;
  if (product.saleStatus === saleStatus) return;

  await tx.product.update({
    where: { id: productId },
    data: { saleStatus },
  });
}
