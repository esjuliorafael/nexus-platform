import crypto from "crypto";
import { ProductType, Prisma } from "@prisma/client-store";
import { storePrisma } from "@nexus/db/store";

const LINK_TTL_MS = 2 * 60 * 60 * 1000;

const assistedError = (message: string, statusCode = 400, code?: string) =>
  Object.assign(new Error(message), { statusCode, code });

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const createRawToken = () => crypto.randomBytes(32).toString("base64url");

const storefrontUrl = () =>
  (process.env.STOREFRONT_HTTPS_URL || process.env.STOREFRONT_URL || "http://localhost:3000").replace(/\/$/, "");

const serializeProduct = (product: any, quantity: number, expiresAt: Date) => ({
  productId: product.id,
  name: product.name,
  price: Number(product.price),
  quantity,
  type: product.type === ProductType.BIRD ? "bird" : "item",
  thumbnail: product.coverAsset?.posterUrl || product.coverAsset?.mediaUrl || null,
  expiresAt: expiresAt.toISOString(),
});

const ensureProductAvailable = (product: any, quantity: number) => {
  if (!product || !product.active || !product.published || product.saleStatus !== "AVAILABLE") {
    throw assistedError("Este producto ya no está disponible para generar un enlace.", 409, "PRODUCT_UNAVAILABLE");
  }
  if (product.type === ProductType.BIRD && quantity !== 1) {
    throw assistedError("Una compra asistida de ave solo puede contener una unidad.", 400, "INVALID_ASSISTED_QUANTITY");
  }
  if (product.type === ProductType.ITEM && product.stock < quantity) {
    throw assistedError("No hay existencias suficientes para generar el enlace.", 409, "PRODUCT_UNAVAILABLE");
  }
};

export const assistedCheckoutService = {
  async createLink(productId: number, quantity: number) {
    if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw assistedError("El producto o la cantidad no son válidos.", 400, "INVALID_ASSISTED_PRODUCT");
    }

    const product = await storePrisma.product.findUnique({
      where: { id: productId },
      include: { coverAsset: true },
    });
    ensureProductAvailable(product, quantity);

    const rawToken = createRawToken();
    const expiresAt = new Date(Date.now() + LINK_TTL_MS);
    const link = await storePrisma.storeAssistedCheckoutLink.create({
      data: {
        tokenHash: hashToken(rawToken),
        productId,
        quantity,
        expiresAt,
      },
    });

    return {
      id: link.id,
      url: `${storefrontUrl()}/checkout?assisted=${encodeURIComponent(rawToken)}`,
      expiresAt: expiresAt.toISOString(),
      product: serializeProduct(product, quantity, expiresAt),
    };
  },

  async resolveLink(rawToken: string) {
    const link = await storePrisma.storeAssistedCheckoutLink.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { product: { include: { coverAsset: true } } },
    });
    if (!link || link.usedAt || link.expiresAt.getTime() <= Date.now()) {
      throw assistedError("Este enlace de compra ya no está disponible.", 410, "ASSISTED_LINK_UNAVAILABLE");
    }
    ensureProductAvailable(link.product, link.quantity);
    return { ...serializeProduct(link.product, link.quantity, link.expiresAt), linkId: link.id };
  },

  async claimForHold(
    tx: Prisma.TransactionClient,
    rawToken: string,
    items: Array<{ productId: number; quantity: number }>,
  ) {
    const link = await tx.storeAssistedCheckoutLink.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });
    if (!link || link.usedAt || link.expiresAt.getTime() <= Date.now()) {
      throw assistedError("Este enlace de compra ya no está disponible.", 410, "ASSISTED_LINK_UNAVAILABLE");
    }
    if (items.length !== 1 || items[0].productId !== link.productId || items[0].quantity !== link.quantity) {
      throw assistedError("El carrito ya no coincide con el enlace de compra.", 409, "ASSISTED_LINK_CART_MISMATCH");
    }

    const claimed = await tx.storeAssistedCheckoutLink.updateMany({
      where: { id: link.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw assistedError("Este enlace de compra ya fue utilizado.", 409, "ASSISTED_LINK_USED");
    }
  },
};
