CREATE TYPE "WhatsappDeliveryStrategy" AS ENUM (
  'STANDARD',
  'KAPSO_PREFERRED',
  'EVOLUTION_ONLY'
);

ALTER TABLE "whatsapp_channels"
ADD COLUMN "delivery_strategy" "WhatsappDeliveryStrategy" NOT NULL DEFAULT 'STANDARD';
