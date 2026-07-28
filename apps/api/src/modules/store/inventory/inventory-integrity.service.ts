import { Prisma, ProductType } from "@prisma/client-store";
import { storePrisma } from "@nexus/db/store";
import { auditActorData, type AuditActor } from "../../../utils/admin-authorization";

export const ORPHAN_RESERVED_BIRD = "ORPHAN_RESERVED_BIRD";
export const COMPLETED_ORDER_RESERVED_BIRD = "COMPLETED_ORDER_RESERVED_BIRD";

const protectedHoldStatuses = ["ACTIVE", "PROCESSING"] as const;
const completedOrderStatuses = ["PAID", "SHIPPED", "DELIVERED"] as const;

type IntegrityIssue = {
  productId: number;
  productName: string;
  issueType: typeof ORPHAN_RESERVED_BIRD | typeof COMPLETED_ORDER_RESERVED_BIRD;
  message: string;
  canRelease: boolean;
  orderReferences: Array<{
    id: number;
    status: string;
    customerName: string;
    createdAt: Date;
  }>;
  paymentHoldReferences: Array<{
    id: string;
    status: string;
    expiresAt: Date;
  }>;
};

const currentReservedBirds = () =>
  storePrisma.product.findMany({
    where: { type: ProductType.BIRD, saleStatus: "RESERVED" },
    select: {
      id: true,
      name: true,
      orderItems: {
        select: {
          order: {
            select: {
              id: true,
              status: true,
              customerName: true,
              createdAt: true,
            },
          },
        },
      },
      paymentHoldItems: {
        select: {
          hold: {
            select: {
              id: true,
              status: true,
              expiresAt: true,
            },
          },
        },
      },
    },
    orderBy: { id: "asc" },
  });

const findIssues = async (): Promise<IntegrityIssue[]> => {
  const products = await currentReservedBirds();

  return products.flatMap<IntegrityIssue>((product): IntegrityIssue[] => {
    const orderReferences = product.orderItems.map(({ order }) => order);
    const paymentHoldReferences = product.paymentHoldItems.map(({ hold }) => hold);
    const hasActiveCommercialOrder = orderReferences.some((order) => order.status === "PENDING");
    const hasProtectedPaymentHold = paymentHoldReferences.some((hold) =>
      protectedHoldStatuses.includes(hold.status as (typeof protectedHoldStatuses)[number]),
    );
    const completedOrder = orderReferences.find((order) =>
      completedOrderStatuses.includes(order.status as (typeof completedOrderStatuses)[number]),
    );

    if (completedOrder) {
      return [{
        productId: product.id,
        productName: product.name,
        issueType: COMPLETED_ORDER_RESERVED_BIRD,
        message: "El ave sigue reservada, pero está vinculada a una orden concluida. Requiere revisión; no se puede liberar desde esta pantalla.",
        canRelease: false,
        orderReferences,
        paymentHoldReferences,
      }];
    }

    if (!hasActiveCommercialOrder && !hasProtectedPaymentHold) {
      return [{
        productId: product.id,
        productName: product.name,
        issueType: ORPHAN_RESERVED_BIRD,
        message: "El ave está reservada sin una orden pendiente ni una retención de pago activa.",
        canRelease: true,
        orderReferences,
        paymentHoldReferences,
      }];
    }

    return [];
  });
};

const issueSnapshot = (issue: IntegrityIssue) => ({
  productName: issue.productName,
  orderReferences: issue.orderReferences.map((order) => ({
    id: order.id,
    status: order.status,
    customerName: order.customerName,
    createdAt: order.createdAt.toISOString(),
  })),
  paymentHoldReferences: issue.paymentHoldReferences.map((hold) => ({
    id: hold.id,
    status: hold.status,
    expiresAt: hold.expiresAt.toISOString(),
  })),
});

export const inventoryIntegrityService = {
  async audit() {
    const issues = await findIssues();
    const now = new Date();

    await storePrisma.$transaction(async (tx) => {
      for (const issue of issues) {
        await tx.inventoryIntegrityIncident.upsert({
          where: {
            productId_issueType: {
              productId: issue.productId,
              issueType: issue.issueType,
            },
          },
          create: {
            productId: issue.productId,
            issueType: issue.issueType,
            status: "OPEN",
            firstDetectedAt: now,
            lastDetectedAt: now,
            snapshot: issueSnapshot(issue),
          },
          update: {
            status: "OPEN",
            lastDetectedAt: now,
            resolvedAt: null,
            resolvedByUserId: null,
            resolvedByName: null,
            resolution: null,
            snapshot: issueSnapshot(issue),
          },
        });
      }

      const currentIssueKeys = new Set(issues.map((issue) => `${issue.productId}:${issue.issueType}`));
      const openIncidents = await tx.inventoryIntegrityIncident.findMany({
        where: { status: "OPEN" },
        select: { id: true, productId: true, issueType: true },
      });
      const resolvedIds = openIncidents
        .filter((incident) => !currentIssueKeys.has(`${incident.productId}:${incident.issueType}`))
        .map((incident) => incident.id);

      if (resolvedIds.length) {
        await tx.inventoryIntegrityIncident.updateMany({
          where: { id: { in: resolvedIds } },
          data: {
            status: "RESOLVED",
            resolvedAt: now,
            resolution: "La auditoría posterior confirmó que la inconsistencia ya no aplica.",
          },
        });
      }
    });

    return {
      checkedAt: now.toISOString(),
      issues,
      count: issues.length,
    };
  },

  async releaseOrphanReservation(productId: number, actor: AuditActor) {
    const result = await storePrisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM products WHERE id = ${productId} FOR UPDATE`);

      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, type: true, saleStatus: true },
      });
      if (!product || product.type !== "BIRD") {
        throw Object.assign(new Error("El ave indicada no existe."), { statusCode: 404 });
      }

      const released = await tx.product.updateMany({
        where: {
          id: productId,
          type: "BIRD",
          saleStatus: "RESERVED",
          orderItems: { none: { order: { status: { not: "CANCELLED" } } } },
          paymentHoldItems: {
            none: { hold: { status: { in: [...protectedHoldStatuses] } } },
          },
        },
        data: { saleStatus: "AVAILABLE", updated_at: new Date() },
      });

      if (released.count !== 1) {
        throw Object.assign(
          new Error("La reserva ya tiene una orden vigente o una retención de pago activa."),
          { statusCode: 409 },
        );
      }

      await tx.inventoryIntegrityIncident.upsert({
        where: {
          productId_issueType: { productId, issueType: ORPHAN_RESERVED_BIRD },
        },
        create: {
          productId,
          issueType: ORPHAN_RESERVED_BIRD,
          status: "RESOLVED",
          firstDetectedAt: new Date(),
          lastDetectedAt: new Date(),
          resolvedAt: new Date(),
          resolvedByUserId: actor.userId ?? null,
          resolvedByName: actor.name,
          resolution: "Reserva huérfana liberada manualmente desde Salud del inventario.",
        },
        update: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolvedByUserId: actor.userId ?? null,
          resolvedByName: actor.name,
          resolution: "Reserva huérfana liberada manualmente desde Salud del inventario.",
        },
      });

      const historicalOrder = await tx.order.findFirst({
        where: {
          status: "CANCELLED",
          items: { some: { productId } },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (historicalOrder) {
        await tx.orderEvent.create({
          data: {
            orderId: historicalOrder.id,
            eventType: "INVENTORY_ORPHAN_RELEASED",
            message: `Reserva huérfana de "${product.name}" liberada desde Salud del inventario.`,
            ...auditActorData(actor),
            previousState: { saleStatus: "RESERVED" },
            nextState: { saleStatus: "AVAILABLE" },
            metadata: { productId, source: "inventory_integrity" },
          },
        });
      }

      return { productId: product.id, productName: product.name };
    });

    return result;
  },
};
