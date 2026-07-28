CREATE TYPE "RaffleResultCampaignAudience" AS ENUM (
  'WINNERS',
  'PARTICIPANTS'
);

CREATE TYPE "RaffleResultCampaignStatus" AS ENUM (
  'QUEUED',
  'PROCESSING',
  'PARTIAL',
  'SENT',
  'FAILED',
  'EMPTY'
);

CREATE TYPE "RaffleResultRecipientStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED'
);

CREATE TYPE "RafflePrizeFulfillmentStatus" AS ENUM (
  'PENDING_CONTACT',
  'CONTACTED',
  'DELIVERY_COORDINATED',
  'DELIVERED',
  'NOT_CLAIMED',
  'NOT_APPLICABLE'
);

ALTER TABLE "raffle_prizes"
  ADD COLUMN "fulfillment_status" "RafflePrizeFulfillmentStatus",
  ADD COLUMN "fulfillment_updated_at" TIMESTAMP(3),
  ADD COLUMN "fulfillment_updated_by" INTEGER,
  ADD COLUMN "fulfillment_notes" TEXT;

UPDATE "raffle_prizes"
SET
  "fulfillment_status" = CASE
    WHEN "result_resolution_status" = 'ELIGIBLE_WINNER'
      THEN 'PENDING_CONTACT'::"RafflePrizeFulfillmentStatus"
    ELSE 'NOT_APPLICABLE'::"RafflePrizeFulfillmentStatus"
  END,
  "fulfillment_updated_at" = COALESCE("result_published_at", CURRENT_TIMESTAMP)
WHERE "result_published_at" IS NOT NULL;

CREATE TABLE "raffle_result_campaigns" (
  "id" UUID NOT NULL,
  "raffle_id" INTEGER NOT NULL,
  "audience" "RaffleResultCampaignAudience" NOT NULL,
  "status" "RaffleResultCampaignStatus" NOT NULL DEFAULT 'QUEUED',
  "result_published_at" TIMESTAMP(3) NOT NULL,
  "template_content" TEXT NOT NULL,
  "principal_template_content" TEXT NOT NULL,
  "total_recipients" INTEGER NOT NULL DEFAULT 0,
  "sent_count" INTEGER NOT NULL DEFAULT 0,
  "failed_count" INTEGER NOT NULL DEFAULT 0,
  "initiated_by_user_id" INTEGER,
  "initiated_by_name" TEXT,
  "initiated_by_role" TEXT,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "raffle_result_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "raffle_result_recipients" (
  "id" UUID NOT NULL,
  "campaign_id" UUID NOT NULL,
  "phone" TEXT NOT NULL,
  "customer_name" TEXT NOT NULL,
  "participation_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "payload" JSONB NOT NULL,
  "status" "RaffleResultRecipientStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "message_log_id" INTEGER,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "raffle_result_recipients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "raffle_result_campaigns_raffle_id_audience_result_published_at_key"
  ON "raffle_result_campaigns"("raffle_id", "audience", "result_published_at");
CREATE INDEX "raffle_result_campaigns_raffle_id_created_at_idx"
  ON "raffle_result_campaigns"("raffle_id", "created_at");
CREATE UNIQUE INDEX "raffle_result_recipients_campaign_id_phone_key"
  ON "raffle_result_recipients"("campaign_id", "phone");
CREATE INDEX "raffle_result_recipients_campaign_id_status_idx"
  ON "raffle_result_recipients"("campaign_id", "status");

ALTER TABLE "raffle_result_campaigns"
  ADD CONSTRAINT "raffle_result_campaigns_raffle_id_fkey"
  FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "raffle_result_recipients"
  ADD CONSTRAINT "raffle_result_recipients_campaign_id_fkey"
  FOREIGN KEY ("campaign_id") REFERENCES "raffle_result_campaigns"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
