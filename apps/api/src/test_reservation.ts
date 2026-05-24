import { PrismaClient as RafflePrisma } from "@prisma/client-raffle";
import { PrismaClient as StorePrisma } from "@prisma/client-store";

const rafflePrisma = new RafflePrisma();
const storePrisma = new StorePrisma();

async function test() {
  console.log("Checking for active raffles...");
  const raffle = await rafflePrisma.raffle.findFirst({
    where: { status: "ACTIVE" },
    include: { extraOpportunities: { take: 1 } }
  });

  if (!raffle) {
    console.log("No active raffle found. Creating one...");
    // This would require more logic to generate opportunities, 
    // better to use an existing one or create a basic one.
    return;
  }

  const ticketNumber = raffle.extraOpportunities[0]?.mainTicketNumber || "001";
  console.log(`Using ticket number: ${ticketNumber} for raffle ID: ${raffle.id}`);

  // We'll simulate the call to the service directly to avoid HTTP overhead in this environment
  const { ticketSaleService } = await import("./modules/raffle/ticket-sales/ticket-sale.service");
  
  try {
    const result = await ticketSaleService.reserveTickets(rafflePrisma, storePrisma, {
      raffleId: raffle.id,
      tickets: [ticketNumber],
      customerName: "Test Customer",
      customerPhone: "1234567890"
    });
    console.log("Reservation result:", result);

    // Wait a bit for the background notification to be logged (it's fire and forget)
    console.log("Waiting for logs...");
    await new Promise(r => setTimeout(r, 2000));

    const logs = await storePrisma.whatsappMessageLog.findMany({
      orderBy: { sentAt: "desc" },
      take: 5
    });
    console.log("Recent WhatsApp logs:", JSON.stringify(logs, null, 2));

  } catch (err: any) {
    console.error("Test failed:", err.message);
  }
}

test().catch(console.error).finally(() => {
  rafflePrisma.$disconnect();
  storePrisma.$disconnect();
});
