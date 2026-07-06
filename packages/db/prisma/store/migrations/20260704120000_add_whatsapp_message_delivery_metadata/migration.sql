ALTER TABLE "whatsapp_message_logs" ADD COLUMN "attempt" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "whatsapp_message_logs" ADD COLUMN "job_id" TEXT;
ALTER TABLE "whatsapp_message_logs" ADD COLUMN "message_id" TEXT;
ALTER TABLE "whatsapp_message_logs" ADD COLUMN "provider_status" TEXT;
ALTER TABLE "whatsapp_message_logs" ADD COLUMN "response_payload" JSONB;

CREATE INDEX "whatsapp_message_logs_order_id_sent_at_idx"
ON "whatsapp_message_logs"("order_id", "sent_at");

CREATE INDEX "whatsapp_message_logs_message_id_idx"
ON "whatsapp_message_logs"("message_id");
