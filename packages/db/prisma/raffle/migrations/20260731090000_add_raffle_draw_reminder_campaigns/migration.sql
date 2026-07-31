CREATE TABLE "raffle_draw_reminder_campaigns" (
    "id" UUID NOT NULL,
    "raffle_id" INTEGER NOT NULL,
    "draw_date" TIMESTAMP(3) NOT NULL,
    "status" "RaffleResultCampaignStatus" NOT NULL DEFAULT 'QUEUED',
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

    CONSTRAINT "raffle_draw_reminder_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "raffle_draw_reminder_recipients" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "participation_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "payload" JSONB NOT NULL,
    "status" "RaffleResultRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "message_log_id" INTEGER,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raffle_draw_reminder_recipients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "raffle_draw_reminder_campaigns_raffle_id_draw_date_key"
  ON "raffle_draw_reminder_campaigns"("raffle_id", "draw_date");
CREATE INDEX "raffle_draw_reminder_campaigns_raffle_id_created_at_idx"
  ON "raffle_draw_reminder_campaigns"("raffle_id", "created_at");
CREATE UNIQUE INDEX "raffle_draw_reminder_recipients_campaign_id_phone_key"
  ON "raffle_draw_reminder_recipients"("campaign_id", "phone");
CREATE INDEX "raffle_draw_reminder_recipients_campaign_id_status_idx"
  ON "raffle_draw_reminder_recipients"("campaign_id", "status");

ALTER TABLE "raffle_draw_reminder_campaigns"
  ADD CONSTRAINT "raffle_draw_reminder_campaigns_raffle_id_fkey"
  FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "raffle_draw_reminder_recipients"
  ADD CONSTRAINT "raffle_draw_reminder_recipients_campaign_id_fkey"
  FOREIGN KEY ("campaign_id") REFERENCES "raffle_draw_reminder_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
