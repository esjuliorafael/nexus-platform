-- AlterTable
ALTER TABLE "whatsapp_channels" ADD COLUMN     "evolution_instance" TEXT,
ADD COLUMN     "evolution_key" TEXT,
ADD COLUMN     "evolution_url" TEXT;

-- CreateTable
CREATE TABLE "whatsapp_message_logs" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT,
    "ticketSaleId" INTEGER,
    "recipientPhone" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "templateUsed" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_message_logs_pkey" PRIMARY KEY ("id")
);
