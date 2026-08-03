CREATE TABLE "whatsapp_customer_service_windows" (
  "id" SERIAL NOT NULL,
  "recipient_phone" TEXT NOT NULL,
  "channel_identity" TEXT NOT NULL,
  "provider" "WhatsappProvider" NOT NULL DEFAULT 'KAPSO',
  "last_inbound_message_id" TEXT,
  "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_customer_service_windows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_customer_service_windows_recipient_phone_channel_identity_provider_key"
ON "whatsapp_customer_service_windows"("recipient_phone", "channel_identity", "provider");

CREATE INDEX "whatsapp_customer_service_windows_provider_channel_identity_expires_at_idx"
ON "whatsapp_customer_service_windows"("provider", "channel_identity", "expires_at");
