CREATE TYPE "KapsoOnboardingTarget" AS ENUM ('PRINCIPAL', 'SPECIALIZED');
CREATE TYPE "KapsoOnboardingStatus" AS ENUM (
  'PENDING',
  'COMPLETED',
  'FAILED',
  'EXPIRED'
);

CREATE TABLE "kapso_onboarding_sessions" (
  "id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "target" "KapsoOnboardingTarget" NOT NULL,
  "channel_id" INTEGER,
  "status" "KapsoOnboardingStatus" NOT NULL DEFAULT 'PENDING',
  "setup_link_id" TEXT,
  "phone_number_id" TEXT,
  "business_account_id" TEXT,
  "display_phone_number" TEXT,
  "return_url" TEXT NOT NULL,
  "error_message" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "kapso_onboarding_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "kapso_onboarding_sessions_token_hash_key"
ON "kapso_onboarding_sessions"("token_hash");

CREATE INDEX "kapso_onboarding_sessions_customer_id_status_created_at_idx"
ON "kapso_onboarding_sessions"("customer_id", "status", "created_at");

CREATE INDEX "kapso_onboarding_sessions_channel_id_status_idx"
ON "kapso_onboarding_sessions"("channel_id", "status");

ALTER TABLE "kapso_onboarding_sessions"
ADD CONSTRAINT "kapso_onboarding_sessions_channel_id_fkey"
FOREIGN KEY ("channel_id") REFERENCES "whatsapp_channels"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
