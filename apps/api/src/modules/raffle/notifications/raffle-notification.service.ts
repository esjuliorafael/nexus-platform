import { PrismaClient as StorePrismaClient } from "@prisma/client-store";
import { PrismaClient as RafflePrismaClient } from "@prisma/client-raffle";

export const raffleNotificationService = {
  async sendTicketReservationEmail(
    storePrisma: StorePrismaClient,
    rafflePrisma: RafflePrismaClient,
    data: {
      raffleTitle: string;
      customerName: string;
      customerPhone: string;
      tickets: string[];
      totalAmount: string;
    }
  ) {
    try {
      // Get admin users who receive notifications
      const admins = await storePrisma.user.findMany({
        where: { receiveNotifications: true, active: true },
        select: { email: true },
      });

      if (admins.length === 0) return;

      // Get email settings from raffle settings
      const settings = await rafflePrisma.setting.findMany({
        where: {
          key: {
            in: ["email_sender_name", "email_footer_text"],
          },
        },
      });

      const senderName = settings.find((s) => s.key === "email_sender_name")?.value || "Nexus Platform";
      const footerText = settings.find((s) => s.key === "email_footer_text")?.value || "";

      const emails = admins.map((a) => a.email).filter(Boolean);
      if (emails.length === 0) return;

      console.log(`[Notification] Simulating email to ${emails.join(", ")}`);
      console.log(`Subject: New Ticket Reservation - ${data.raffleTitle}`);
      console.log(`Body:
        Customer: ${data.customerName} (${data.customerPhone})
        Tickets: ${data.tickets.join(", ")}
        Total: ${data.totalAmount}
        
        ${footerText}
        Sent by ${senderName}
      `);

      // In a real implementation, we would use nodemailer or an API here.
      // For now, as per instructions, we follow existing pattern or simple approach.
    } catch (error) {
      console.error("Failed to send ticket reservation email:", error);
    }
  },
};
