import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { storePrisma } from "@nexus/db/store";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(scriptDirectory, "../packages/db/.env") });

const databaseUrl = process.env.STORE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("No se encontró la URL de la base de datos de Tienda.");
}

const databaseHost = new URL(databaseUrl).hostname;
if (!["localhost", "127.0.0.1"].includes(databaseHost)) {
  throw new Error(
    `Seed cancelado: la base configurada no es local (${databaseHost}).`,
  );
}

const MOCK_PHONE_PREFIX = "mock-sales-overview-";

const customerNames = [
  "Mariana Ortega",
  "Luis Hernández",
  "Gabriela Flores",
  "Fernando Castillo",
  "Paola Mendoza",
  "Arturo Salazar",
  "Daniela Vázquez",
  "Sergio Domínguez",
  "Valeria Campos",
  "Ricardo Navarro",
];

const run = async () => {
  if (process.argv.includes("--clean")) {
    const result = await storePrisma.order.deleteMany({
      where: { customerPhone: { startsWith: MOCK_PHONE_PREFIX } },
    });
    console.log(`Limpieza completada: ${result.count} órdenes mock eliminadas.`);
    return;
  }

  const products = await storePrisma.product.findMany({
    where: { active: true },
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      price: true,
    },
  });

  if (products.length === 0) {
    throw new Error("Se necesita al menos un producto local para crear órdenes.");
  }

  const birds = products.filter((product) => product.type === "BIRD");
  const items = products.filter((product) => product.type === "ITEM");
  let created = 0;

  for (let index = 0; index < customerNames.length; index += 1) {
    const customerPhone = `${MOCK_PHONE_PREFIX}${String(index + 1).padStart(2, "0")}`;
    const existing = await storePrisma.order.findFirst({
      where: { customerPhone },
      select: { id: true },
    });
    if (existing) continue;

    const selectedProducts =
      index % 3 === 2 && birds.length > 0 && items.length > 0
        ? [birds[index % birds.length], items[index % items.length]]
        : index % 2 === 0 && birds.length > 0
          ? [birds[index % birds.length]]
          : items.length > 0
            ? [items[index % items.length]]
            : [products[index % products.length]];
    const lines = selectedProducts.map((product, lineIndex) => ({
      product,
      quantity: product.type === "ITEM" ? ((index + lineIndex) % 3) + 1 : 1,
    }));
    const subtotal = lines.reduce(
      (sum, line) => sum + Number(line.product.price) * line.quantity,
      0,
    );
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - index);
    createdAt.setHours(9 + (index % 8), (index * 7) % 60, 0, 0);

    await storePrisma.order.create({
      data: {
        customerName: customerNames[index],
        customerPhone,
        customerEmail: `ventas.mock.${index + 1}@nexus.local`,
        subtotal,
        discountTotal: 0,
        shippingCost: 0,
        total: subtotal,
        status:
          index % 3 === 0
            ? "DELIVERED"
            : index % 3 === 1
              ? "SHIPPED"
              : "PAID",
        paymentMethod: index % 2 === 0 ? "TRANSFER" : "MERCADOPAGO",
        paymentStatus: "APPROVED",
        createdAt,
        items: {
          create: lines.map((line) => ({
            productId: line.product.id,
            productName: line.product.name,
            productType: line.product.type,
            quantity: line.quantity,
            unitPrice: line.product.price,
          })),
        },
      },
    });
    created += 1;
  }

  const totalMockOrders = await storePrisma.order.count({
    where: { customerPhone: { startsWith: MOCK_PHONE_PREFIX } },
  });

  console.log(
    `Seed completado: ${created} órdenes nuevas, ${totalMockOrders} órdenes mock disponibles.`,
  );
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await storePrisma.$disconnect();
  });
