CREATE TYPE "WhatsappProvider" AS ENUM ('EVOLUTION', 'KAPSO');

ALTER TABLE "whatsapp_channels"
ADD COLUMN "provider" "WhatsappProvider" NOT NULL DEFAULT 'EVOLUTION',
ADD COLUMN "kapso_phone_number_id" TEXT,
ADD COLUMN "kapso_business_account_id" TEXT;

ALTER TABLE "whatsapp_message_logs"
ADD COLUMN "provider" "WhatsappProvider" NOT NULL DEFAULT 'EVOLUTION';

CREATE INDEX "whatsapp_channels_provider_active_idx"
ON "whatsapp_channels"("provider", "active");
