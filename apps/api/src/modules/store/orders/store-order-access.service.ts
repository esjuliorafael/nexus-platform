import { createHash, randomBytes } from "node:crypto";
import { storePrisma } from "@nexus/db/store";
import { normalizeCustomerPhone } from "../../../utils/customer-phone";

const ACCESS_TOKEN_TTL_DAYS = 180;

const hash = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");

const storefrontBaseUrl = () =>
  (
    process.env.STOREFRONT_HTTPS_URL ||
    process.env.STOREFRONT_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");

const participantDisplayName = (value: string | null | undefined) => {
  const parts = String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean);
  if (parts.length <= 2) return parts.join(" ");
  const last = parts.at(-1) || "";
  return `${parts.slice(0, -1).join(" ")} ${last.charAt(0)}.`;
};

export async function createStoreOrderAccess(params: {
  orderId: number;
  phone: string;
}) {
  const normalizedPhone = normalizeCustomerPhone(params.phone);
  if (!normalizedPhone) {
    throw new Error("El número de WhatsApp no tiene un formato internacional válido.");
  }

  const order = await storePrisma.order.findUnique({
    where: { id: params.orderId },
    select: { id: true, customerPhone: true },
  });
  if (!order) throw new Error("La orden no existe.");

  const orderPhone = normalizeCustomerPhone(order.customerPhone);
  if (!orderPhone || hash(orderPhone) !== hash(normalizedPhone)) {
    throw new Error("El teléfono no coincide con la orden.");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_DAYS * 86_400_000);
  await storePrisma.storeOrderAccessToken.create({
    data: {
      orderId: order.id,
      phoneHash: hash(normalizedPhone),
      tokenHash: hash(token),
      expiresAt,
    },
  });

  return {
    token,
    url: `${storefrontBaseUrl()}/orders/${token}`,
    expiresAt,
  };
}

export type StoreBankInfo = {
  source: "SPECIALIZED" | "MAIN";
  label: string;
  bank: string;
  beneficiary: string;
  accountNumber: string | null;
  clabe: string | null;
  card: string | null;
};

export async function getStoreBankInfo(
  items: Array<{ productId: number; productType: string }>,
): Promise<StoreBankInfo | null> {
  const birdItems = items.filter(
    (item) => String(item.productType).toUpperCase() === "BIRD",
  );
  const hasStoreItems = items.some(
    (item) => String(item.productType).toUpperCase() === "ITEM",
  );

  let purpose: string | null = null;
  if (birdItems.length > 0 && !hasStoreItems) {
    const products = await storePrisma.product.findMany({
      where: { id: { in: birdItems.map((item) => item.productId) } },
      select: { purpose: true },
    });
    const firstPurpose = products[0]?.purpose ? String(products[0].purpose) : null;
    if (firstPurpose && products.every((product) => String(product.purpose) === firstPurpose)) {
      purpose = firstPurpose;
    }
  }

  const [specializedChannel, settings] = await Promise.all([
    purpose
      ? storePrisma.paymentChannel.findFirst({
          where: { purpose },
          select: {
            bank: true,
            beneficiary: true,
            accountNumber: true,
            clabe: true,
            card: true,
            name: true,
          },
        })
      : Promise.resolve(null),
    storePrisma.setting.findMany({
      where: {
        key: {
          in: [
            "bank_main_name",
            "bank_main_beneficiary",
            "bank_main_account",
            "bank_main_clabe",
            "bank_main_card",
          ],
        },
      },
      select: { key: true, value: true },
    }),
  ]);

  const main = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
  const specializedReady = Boolean(
    specializedChannel?.bank?.trim() && specializedChannel?.beneficiary?.trim(),
  );
  const mainReady = Boolean(
    main.bank_main_name?.trim() && main.bank_main_beneficiary?.trim(),
  );
  if (!specializedReady && !mainReady) return null;

  return specializedReady
    ? {
        source: "SPECIALIZED" as const,
        label: specializedChannel?.name || "Canal especializado",
        bank: specializedChannel!.bank,
        beneficiary: specializedChannel!.beneficiary,
        accountNumber: specializedChannel!.accountNumber,
        clabe: specializedChannel!.clabe,
        card: specializedChannel!.card,
      }
    : {
        source: "MAIN" as const,
        label: "Canal Principal, respaldo",
        bank: main.bank_main_name!,
        beneficiary: main.bank_main_beneficiary!,
        accountNumber: main.bank_main_account || null,
        clabe: main.bank_main_clabe || null,
        card: main.bank_main_card || null,
      };
}

const getOrderStatus = (order: {
  status: string;
  paymentStatus: string;
  expiresAt: Date | null;
}) => {
  const status = String(order.status).toUpperCase();
  const paymentStatus = String(order.paymentStatus).toUpperCase();
  if (status === "CANCELLED" || paymentStatus === "CANCELLED") return "CANCELLED" as const;
  if (status === "DELIVERED") return "DELIVERED" as const;
  if (status === "SHIPPED") return "SHIPPED" as const;
  if (status === "PAID" || paymentStatus === "APPROVED" || paymentStatus === "PAID") return "PAID" as const;
  if (order.expiresAt && order.expiresAt <= new Date()) return "EXPIRED" as const;
  return "PENDING" as const;
};

export function toStoreOrderAccessItem(item: {
  id: number;
  productId: number;
  productName: string | null;
  productType: string;
  productRingNumber?: string | null;
  productAge?: string | null;
  productPurpose?: string | null;
  quantity: number;
  unitPrice: unknown;
  product?: {
    ringNumber: string | null;
    age: string | null;
    purpose: string | null;
  } | null;
}) {
  const isBird = String(item.productType).toUpperCase() === "BIRD";
  return {
    id: item.id,
    productId: item.productId,
    name: item.productName || `Producto ${item.productId}`,
    type: String(item.productType).toLowerCase(),
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    lineTotal: Number(item.unitPrice) * item.quantity,
    productInfo: isBird
      ? {
          ringNumber: item.productRingNumber ?? item.product?.ringNumber ?? null,
          age: item.productAge ?? item.product?.age ?? null,
          purpose: item.productPurpose ?? item.product?.purpose ?? null,
        }
      : null,
  };
}

export async function getStoreOrderAccess(token: string) {
  const access = await storePrisma.storeOrderAccessToken.findUnique({
    where: { tokenHash: hash(token) },
    include: {
      order: {
        include: {
          items: {
            include: {
              product: {
                select: {
                  ringNumber: true,
                  age: true,
                  purpose: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!access || access.revokedAt || (access.expiresAt && access.expiresAt < new Date())) {
    return null;
  }

  const orderPhone = normalizeCustomerPhone(access.order.customerPhone);
  if (!orderPhone || hash(orderPhone) !== access.phoneHash) return null;

  const order = access.order;
  const status = getOrderStatus(order);
  const paymentPending = status === "PENDING" && String(order.paymentMethod).toUpperCase() === "TRANSFER";
  const bankInfo = paymentPending ? await getStoreBankInfo(order.items) : null;
  const paymentExpiresAt = order.paymentExpiresAt || order.expiresAt;

  return {
    customerName: participantDisplayName(order.customerName),
    order: {
      id: order.id,
      createdAt: order.createdAt,
      status,
      statusLabel:
        status === "PAID"
          ? "Pago confirmado"
          : status === "SHIPPED"
            ? "En preparación"
            : status === "DELIVERED"
              ? "Entregada"
              : status === "CANCELLED"
                ? "Cancelada"
                : status === "EXPIRED"
                  ? "Plazo concluido"
                  : "Pago pendiente",
      paymentMethod: String(order.paymentMethod).toUpperCase(),
      paymentExpiresAt,
      delivery: {
        type: order.deliveryType,
        method: order.deliveryMethod,
        receiverName: order.receiverName,
        address: order.shippingAddress,
        street: order.shippingStreet,
        neighborhood: order.shippingNeighborhood,
        postalCode: order.shippingPostalCode,
        city: order.shippingCity,
        state: order.shippingState,
      },
      totals: {
        subtotal: Number(order.subtotal),
        discountTotal: Number(order.discountTotal),
        shippingCost: Number(order.shippingCost),
        total: Number(order.total),
      },
      items: order.items.map(toStoreOrderAccessItem),
    },
    bankInfo,
    expiresAt: access.expiresAt,
  };
}
