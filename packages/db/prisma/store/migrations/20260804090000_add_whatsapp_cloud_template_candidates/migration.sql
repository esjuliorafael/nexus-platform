CREATE TABLE "whatsapp_cloud_template_candidates" (
    "id" SERIAL NOT NULL,
    "channel_id" INTEGER,
    "owner_key" TEXT NOT NULL,
    "scope" "WhatsappCloudTemplateScope" NOT NULL,
    "type" "TemplateType" NOT NULL,
    "template_name" TEXT NOT NULL,
    "template_id" TEXT,
    "category" TEXT,
    "language_code" TEXT NOT NULL DEFAULT 'es_MX',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "parameter_names" JSONB NOT NULL,
    "content_hash" TEXT NOT NULL,
    "last_error" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_cloud_template_candidates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_cloud_template_candidates_owner_key_scope_type_content_hash_key"
ON "whatsapp_cloud_template_candidates"("owner_key", "scope", "type", "content_hash");

CREATE INDEX "whatsapp_cloud_template_candidates_channel_id_status_idx"
ON "whatsapp_cloud_template_candidates"("channel_id", "status");

ALTER TABLE "whatsapp_cloud_template_candidates"
ADD CONSTRAINT "whatsapp_cloud_template_candidates_channel_id_fkey"
FOREIGN KEY ("channel_id") REFERENCES "whatsapp_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
