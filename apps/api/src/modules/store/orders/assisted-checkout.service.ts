import crypto from "crypto";
import { PaymentHoldStatus, ProductType, Prisma } from "@prisma/client-store";
import { storePrisma } from "@nexus/db/store";

const LINK_TTL_MS = 2 * 60 * 60 * 1000;

const assistedError = (message: string, statusCode = 400, code?: string) =>
  Object.assign(new Error(message), { statusCode, code });

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const createRawToken = () => crypto.randomBytes(32).toString("base64url");

type AssistedCheckoutItemInput = { productId: number; quantity: number };

export type AssistedCheckoutLinkStatus =
  | "ACTIVE"
  | "IN_PAYMENT"
  | "PAID"
  | "EXPIRED"
  | "REVOKED";

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

const serializeManagedProduct = (product: any) => ({
  id: product.id,
  name: product.name,
  ringNumber: product.ringNumber || null,
  type: product.type === ProductType.BIRD ? "BIRD" : "ITEM",
  price: Number(product.price),
  saleStatus: String(product.saleStatus).toLowerCase(),
  stock: product.stock,
  thumbnail: product.coverAsset?.posterUrl || product.coverAsset?.mediaUrl || null,
});

const getLinkItems = (link: any): Array<{ product: any; quantity: number; productId: number }> => {
  if (Array.isArray(link.items) && link.items.length > 0) {
    return link.items.map((item: any) => ({
      product: item.product,
      productId: item.productId,
      quantity: item.quantity,
    }));
  }
  return [{ product: link.product, productId: link.productId, quantity: link.quantity }];
};

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

const getLinkStatus = (link: any, now = Date.now()): AssistedCheckoutLinkStatus => {
  if (link.revokedAt) return "REVOKED";
  if (link.claimedHold?.promotedOrderId || link.claimedHold?.status === PaymentHoldStatus.CONSUMED) {
    return "PAID";
  }
  if (
    link.claimedHold &&
    [PaymentHoldStatus.ACTIVE, PaymentHoldStatus.PROCESSING].includes(link.claimedHold.status)
  ) {
    return "IN_PAYMENT";
  }
  if (link.expiresAt.getTime() <= now || link.usedAt) return "EXPIRED";
  return "ACTIVE";
};

const serializeManagedLink = (link: any) => ({
  id: link.id,
  status: getLinkStatus(link),
  quantity: getLinkItems(link)[0]?.quantity || link.quantity,
  expiresAt: link.expiresAt.toISOString(),
  createdAt: link.createdAt.toISOString(),
  openedAt: link.openedAt?.toISOString() || null,
  usedAt: link.usedAt?.toISOString() || null,
  revokedAt: link.revokedAt?.toISOString() || null,
  items: getLinkItems(link).map((item) => ({
    ...serializeManagedProduct(item.product),
    quantity: item.quantity,
  })),
  product: serializeManagedProduct(getLinkItems(link)[0].product),
  createdBy: link.createdBy
    ? { id: link.createdBy.id, name: link.createdBy.name, username: link.createdBy.username }
    : null,
  revokedBy: link.revokedBy
    ? { id: link.revokedBy.id, name: link.revokedBy.name, username: link.revokedBy.username }
    : null,
  paymentHold: link.claimedHold
    ? {
        id: link.claimedHold.id,
        status: String(link.claimedHold.status).toLowerCase(),
        customerName: link.claimedHold.customerName,
        customerPhone: link.claimedHold.customerPhone,
        expiresAt: link.claimedHold.expiresAt.toISOString(),
        promotedOrderId: link.claimedHold.promotedOrderId,
        mpPaymentStatus: link.claimedHold.mpPaymentStatus,
      }
    : null,
});

const managedLinkInclude = {
  product: { include: { coverAsset: true } },
  items: { include: { product: { include: { coverAsset: true } } } },
  createdBy: { select: { id: true, name: true, username: true } },
  revokedBy: { select: { id: true, name: true, username: true } },
  claimedHold: {
    select: {
      id: true,
      status: true,
      customerName: true,
      customerPhone: true,
      expiresAt: true,
      promotedOrderId: true,
      mpPaymentStatus: true,
    },
  },
};

export const assistedCheckoutService = {
  async createLink(items: AssistedCheckoutItemInput[], createdByUserId?: number | null) {
    if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
      throw assistedError("El enlace debe contener entre 1 y 20 productos.", 400, "INVALID_ASSISTED_ITEMS");
    }

    const normalizedItems = items.map((item) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity),
    }));
    if (
      normalizedItems.some(
        (item) =>
          !Number.isInteger(item.productId) ||
          item.productId < 1 ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 99,
      ) || new Set(normalizedItems.map((item) => item.productId)).size !== normalizedItems.length
    ) {
      throw assistedError("Los productos o las cantidades no son válidos.", 400, "INVALID_ASSISTED_ITEMS");
    }

    const products = await storePrisma.product.findMany({
      where: { id: { in: normalizedItems.map((item) => item.productId) } },
      include: { coverAsset: true },
    });
    const productsById = new Map(products.map((product) => [product.id, product]));
    normalizedItems.forEach((item) => ensureProductAvailable(productsById.get(item.productId), item.quantity));

    const rawToken = createRawToken();
    const expiresAt = new Date(Date.now() + LINK_TTL_MS);
    const link = await storePrisma.storeAssistedCheckoutLink.create({
      data: {
        tokenHash: hashToken(rawToken),
        productId: normalizedItems[0].productId,
        quantity: normalizedItems[0].quantity,
        expiresAt,
        createdByUserId: createdByUserId || null,
        items: {
          create: normalizedItems,
        },
      },
    });

    return {
      id: link.id,
      url: `${storefrontUrl()}/checkout?assisted=${encodeURIComponent(rawToken)}`,
      expiresAt: expiresAt.toISOString(),
      items: normalizedItems.map((item) => serializeProduct(productsById.get(item.productId), item.quantity, expiresAt)),
      product: serializeProduct(productsById.get(normalizedItems[0].productId), normalizedItems[0].quantity, expiresAt),
    };
  },

  async resolveLink(rawToken: string) {
    const link = await storePrisma.storeAssistedCheckoutLink.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { product: { include: { coverAsset: true } }, items: { include: { product: { include: { coverAsset: true } } } } },
    });
    if (!link || link.usedAt || link.revokedAt || link.expiresAt.getTime() <= Date.now()) {
      throw assistedError("Este enlace de compra ya no está disponible.", 410, "ASSISTED_LINK_UNAVAILABLE");
    }
    const linkItems = getLinkItems(link);
    linkItems.forEach((item) => ensureProductAvailable(item.product, item.quantity));
    if (!link.openedAt) {
      await storePrisma.storeAssistedCheckoutLink.update({
        where: { id: link.id },
        data: { openedAt: new Date() },
      });
    }
    const serializedItems = linkItems.map((item) => serializeProduct(item.product, item.quantity, link.expiresAt));
    return { ...serializedItems[0], items: serializedItems, linkId: link.id };
  },

  async listLinks(status?: AssistedCheckoutLinkStatus, search?: string) {
    const normalizedSearch = search?.trim();
    const links = await storePrisma.storeAssistedCheckoutLink.findMany({
      where: normalizedSearch
        ? {
            OR: [
              {
                product: {
                  OR: [
                    { name: { contains: normalizedSearch, mode: "insensitive" } },
                    { ringNumber: { contains: normalizedSearch, mode: "insensitive" } },
                  ],
                },
              },
              {
                items: {
                  some: {
                    product: {
                      OR: [
                        { name: { contains: normalizedSearch, mode: "insensitive" } },
                        { ringNumber: { contains: normalizedSearch, mode: "insensitive" } },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : undefined,
      include: managedLinkInclude,
      orderBy: { createdAt: "desc" },
    });

    const serialized = links.map(serializeManagedLink);
    const items = status ? serialized.filter((link) => link.status === status) : serialized;
    return {
      items,
      total: items.length,
    };
  },

  async revokeLink(id: string, revokedByUserId: number) {
    const link = await storePrisma.storeAssistedCheckoutLink.findUnique({
      where: { id },
      include: { items: true, claimedHold: { select: { status: true, promotedOrderId: true } } },
    });
    if (!link) throw assistedError("El enlace no existe.", 404, "ASSISTED_LINK_NOT_FOUND");

    const status = getLinkStatus(link);
    if (status === "PAID") {
      throw assistedError("La compra ya fue confirmada; no se puede revocar este enlace.", 409, "ASSISTED_LINK_PAID");
    }
    if (status === "IN_PAYMENT") {
      throw assistedError("La retención de inventario sigue activa; cancela o deja vencer el intento antes de revocar el enlace.", 409, "ASSISTED_LINK_IN_PAYMENT");
    }
    if (!link.revokedAt) {
      await storePrisma.storeAssistedCheckoutLink.update({
        where: { id },
        data: { revokedAt: new Date(), revokedByUserId },
      });
    }
    return this.getById(id);
  },

  async regenerateLink(id: string, createdByUserId: number) {
    const link = await storePrisma.storeAssistedCheckoutLink.findUnique({
      where: { id },
      include: { items: true, claimedHold: { select: { status: true, promotedOrderId: true } } },
    });
    if (!link) throw assistedError("El enlace no existe.", 404, "ASSISTED_LINK_NOT_FOUND");

    const status = getLinkStatus(link);
    if (status === "PAID") {
      throw assistedError("La compra ya fue confirmada; no se puede regenerar este enlace.", 409, "ASSISTED_LINK_PAID");
    }
    if (status === "IN_PAYMENT") {
      throw assistedError("La retención de inventario sigue activa; no se puede generar otro enlace para este producto.", 409, "ASSISTED_LINK_IN_PAYMENT");
    }

    const next = await this.createLink(
      (link.items?.length ? link.items : [{ productId: link.productId, quantity: link.quantity }]).map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      createdByUserId,
    );
    await storePrisma.storeAssistedCheckoutLink.update({
      where: { id },
      data: { revokedAt: new Date(), revokedByUserId: createdByUserId },
    });
    return { previousId: id, ...next };
  },

  async getById(id: string) {
    const link = await storePrisma.storeAssistedCheckoutLink.findUnique({
      where: { id },
      include: managedLinkInclude,
    });
    if (!link) throw assistedError("El enlace no existe.", 404, "ASSISTED_LINK_NOT_FOUND");
    return serializeManagedLink(link);
  },

  async claimForHold(
    tx: Prisma.TransactionClient,
    rawToken: string,
    holdId: string,
    items: Array<{ productId: number; quantity: number }>,
  ) {
    const link = await tx.storeAssistedCheckoutLink.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { items: true },
    });
    if (!link || link.usedAt || link.revokedAt || link.expiresAt.getTime() <= Date.now()) {
      throw assistedError("Este enlace de compra ya no está disponible.", 410, "ASSISTED_LINK_UNAVAILABLE");
    }
    const expectedItems = link.items?.length
      ? link.items.map((item: any) => ({ productId: item.productId, quantity: item.quantity }))
      : [{ productId: link.productId, quantity: link.quantity }];
    const actual = [...items].sort((a, b) => a.productId - b.productId);
    const expected = [...expectedItems].sort((a, b) => a.productId - b.productId);
    if (
      actual.length !== expected.length ||
      actual.some((item, index) => item.productId !== expected[index].productId || item.quantity !== expected[index].quantity)
    ) {
      throw assistedError("El carrito ya no coincide con el enlace de compra.", 409, "ASSISTED_LINK_CART_MISMATCH");
    }

    const claimed = await tx.storeAssistedCheckoutLink.updateMany({
      where: { id: link.id, usedAt: null, revokedAt: null },
      data: { usedAt: new Date(), claimedHoldId: holdId },
    });
    if (claimed.count !== 1) {
      throw assistedError("Este enlace de compra ya fue utilizado.", 409, "ASSISTED_LINK_USED");
    }
  },
};
