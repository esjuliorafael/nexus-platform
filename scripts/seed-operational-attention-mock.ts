import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(scriptDirectory, "../apps/api/.env") });

const storeDatabaseUrl = process.env.DATABASE_URL;
const raffleDatabaseUrl = process.env.RAFFLE_DATABASE_URL;

const assertLocalDatabase = (value: string | undefined, label: string) => {
  if (!value) throw new Error(`No se encontró la URL de ${label}.`);

  const host = new URL(value).hostname;
  if (!["localhost", "127.0.0.1"].includes(host)) {
    throw new Error(`Seed cancelado: ${label} no es local (${host}).`);
  }
};

assertLocalDatabase(storeDatabaseUrl, "la base de Tienda");
assertLocalDatabase(raffleDatabaseUrl, "la base de Rifas");

let storePrisma: any;
let rafflePrisma: any;

const PREFIX = "mock-operational-attention-";
const PRODUCT_NAME = "Mock Atención Operativa - Producto de prueba";
const RAFFLE_TITLE = "Mock Atención Operativa - Rifa de prueba";
const FULFILLMENT_RAFFLE_TITLE = "Mock Atención Operativa - Premio por entregar";

const clean = async () => {
  await rafflePrisma.raffle.deleteMany({
    where: { title: { startsWith: PREFIX } },
  });
  await storePrisma.order.deleteMany({
    where: { customerPhone: { startsWith: PREFIX } },
  });
  await storePrisma.storePaymentHold.deleteMany({
    where: { customerPhone: { startsWith: PREFIX } },
  });
  await storePrisma.inventoryIntegrityIncident.deleteMany({
    where: { issueType: "MOCK_OPERATIONAL_ATTENTION" },
  });
  await storePrisma.product.deleteMany({ where: { name: PRODUCT_NAME } });
};

const run = async () => {
  ({ storePrisma } = await import("../packages/db/src/store.ts"));
  ({ rafflePrisma } = await import("../packages/db/src/raffle.ts"));

  await clean();

  if (process.argv.includes("--clean")) {
    console.log("Datos mock de Atención Operativa eliminados.");
    return;
  }

  const product = await storePrisma.product.create({
    data: {
      name: PRODUCT_NAME,
      description: "Registro local para probar Atención Operativa.",
      type: "ITEM",
      price: 450,
      stock: 12,
      active: false,
      published: false,
      saleStatus: "AVAILABLE",
    },
  });

  await storePrisma.order.create({
    data: {
      customerName: "Mock Atención - Mariana Ortega",
      customerPhone: `${PREFIX}order-01`,
      subtotal: 450,
      discountTotal: 0,
      shippingCost: 0,
      total: 450,
      status: "PENDING",
      paymentMethod: "TRANSFER",
      paymentStatus: "PENDING",
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          productType: product.type,
          quantity: 1,
          unitPrice: product.price,
        },
      },
    },
  });

  await storePrisma.order.create({
    data: {
      customerName: "Mock Atención - Luis Hernández",
      customerPhone: `${PREFIX}order-02`,
      subtotal: 900,
      discountTotal: 0,
      shippingCost: 0,
      total: 900,
      status: "PENDING",
      paymentMethod: "TRANSFER",
      paymentStatus: "PENDING",
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          productType: product.type,
          quantity: 2,
          unitPrice: product.price,
        },
      },
    },
  });

  await storePrisma.storePaymentHold.create({
    data: {
      customerName: "Mock Atención - Pago en revisión",
      customerPhone: `${PREFIX}store-review`,
      subtotal: 450,
      discountTotal: 0,
      shippingCost: 0,
      total: 450,
      status: "PROCESSING",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      recoveryTokenHash: `${PREFIX}store-review`,
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          productType: product.type,
          quantity: 1,
          unitPrice: product.price,
        },
      },
    },
  });

  await storePrisma.inventoryIntegrityIncident.create({
    data: {
      productId: product.id,
      issueType: "MOCK_OPERATIONAL_ATTENTION",
      status: "OPEN",
      snapshot: { source: "local-mock" },
    },
  });

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const raffle = await rafflePrisma.raffle.create({
    data: {
      title: RAFFLE_TITLE,
      description: "Registro local para probar Atención Operativa.",
      ticketPrice: 100,
      ticketQuantity: 50,
      opportunities: 1,
      digits: 3,
      status: "ACTIVE",
      published: false,
      drawDate: yesterday,
      participationStartsAt: new Date(yesterday.getTime() - 7 * 24 * 60 * 60 * 1000),
      participationEndsAt: yesterday,
    },
  });

  await rafflePrisma.ticketSale.createMany({
    data: [
      {
        raffleId: raffle.id,
        ticketNumber: "001",
        customerName: "Mock Atención - Karina Fernanda",
        customerPhone: `${PREFIX}participation-01`,
        reservationId: `${PREFIX}reservation-01`,
        paymentStatus: "PENDING",
        paymentMethod: "TRANSFER",
      },
      {
        raffleId: raffle.id,
        ticketNumber: "002",
        customerName: "Mock Atención - Karina Fernanda",
        customerPhone: `${PREFIX}participation-01`,
        reservationId: `${PREFIX}reservation-01`,
        paymentStatus: "PENDING",
        paymentMethod: "TRANSFER",
      },
      {
        raffleId: raffle.id,
        ticketNumber: "003",
        customerName: "Mock Atención - Gustavo Vargas",
        customerPhone: `${PREFIX}participation-02`,
        reservationId: `${PREFIX}reservation-02`,
        paymentStatus: "PENDING",
        paymentMethod: "TRANSFER",
      },
    ],
  });

  await rafflePrisma.rafflePaymentHold.create({
    data: {
      raffleId: raffle.id,
      customerName: "Mock Atención - Pago en revisión",
      customerPhone: `${PREFIX}raffle-review`,
      ticketNumbers: ["004"],
      status: "PROCESSING",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      recoveryTokenHash: `${PREFIX}raffle-review`,
      tickets: {
        create: {
          raffleId: raffle.id,
          ticketNumber: "004",
        },
      },
    },
  });

  const publishedAt = new Date();
  await rafflePrisma.raffle.create({
    data: {
      title: FULFILLMENT_RAFFLE_TITLE,
      description: "Registro local para probar seguimiento de premios.",
      ticketPrice: 100,
      ticketQuantity: 10,
      opportunities: 1,
      digits: 2,
      status: "FINISHED",
      published: false,
      drawDate: yesterday,
      resultPublishedAt: publishedAt,
      prizes: {
        create: {
          position: 1,
          title: "Premio mock pendiente de entrega",
          description: "Seguimiento local de prueba.",
          resultPublishedAt: publishedAt,
          fulfillmentStatus: "PENDING_CONTACT",
        },
      },
    },
  });

  console.log(
    "Datos mock creados: 2 órdenes apartadas, 2 participaciones apartadas, 2 pagos en revisión, 1 incidencia de inventario, 1 rifa por resolver y 1 premio por entregar.",
  );
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([
      storePrisma?.$disconnect(),
      rafflePrisma?.$disconnect(),
    ]);
  });
