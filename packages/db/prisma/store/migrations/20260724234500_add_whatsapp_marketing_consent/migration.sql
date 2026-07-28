CREATE TYPE "WhatsappMarketingConsentStatus" AS ENUM ('UNKNOWN', 'GRANTED', 'OPTED_OUT');

CREATE TYPE "WhatsappMarketingConsentSource" AS ENUM (
  'STORE_CHECKOUT',
  'RAFFLE_CHECKOUT',
  'INBOUND_KEYWORD',
  'ADMIN',
  'IMPORT'
);

CREATE TABLE "whatsapp_marketing_preferences" (
  "id" SERIAL NOT NULL,
  "phone" TEXT NOT NULL,
  "display_name" TEXT,
  "status" "WhatsappMarketingConsentStatus" NOT NULL DEFAULT 'UNKNOWN',
  "consent_at" TIMESTAMP(3),
  "consent_source" "WhatsappMarketingConsentSource",
  "consent_version" TEXT,
  "opted_out_at" TIMESTAMP(3),
  "last_marketing_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_marketing_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_marketing_consent_events" (
  "id" SERIAL NOT NULL,
  "preference_id" INTEGER NOT NULL,
  "previous_status" "WhatsappMarketingConsentStatus",
  "next_status" "WhatsappMarketingConsentStatus" NOT NULL,
  "source" "WhatsappMarketingConsentSource" NOT NULL,
  "policy_version" TEXT,
  "keyword" TEXT,
  "external_event_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_marketing_consent_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_marketing_preferences_phone_key"
  ON "whatsapp_marketing_preferences"("phone");

CREATE INDEX "whatsapp_marketing_preferences_status_idx"
  ON "whatsapp_marketing_preferences"("status");

CREATE INDEX "whatsapp_marketing_consent_events_preference_id_created_at_idx"
  ON "whatsapp_marketing_consent_events"("preference_id", "created_at");

CREATE UNIQUE INDEX "whatsapp_marketing_consent_events_external_event_id_key"
  ON "whatsapp_marketing_consent_events"("external_event_id");

ALTER TABLE "whatsapp_marketing_consent_events"
  ADD CONSTRAINT "whatsapp_marketing_consent_events_preference_id_fkey"
  FOREIGN KEY ("preference_id")
  REFERENCES "whatsapp_marketing_preferences"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
