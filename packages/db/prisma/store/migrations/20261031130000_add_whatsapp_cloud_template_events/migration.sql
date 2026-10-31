CREATE TABLE "whatsapp_cloud_template_events" (
    "id" TEXT NOT NULL,
    "owner_key" TEXT NOT NULL,
    "channel_id" INTEGER,
    "channel_name" TEXT,
    "channel_purpose" TEXT,
    "scope" "WhatsappCloudTemplateScope" NOT NULL,
    "type" "TemplateType" NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'LEGACY',
    "event_type" TEXT NOT NULL,
    "template_name" TEXT,
    "template_id" TEXT,
    "category" TEXT,
    "language_code" TEXT,
    "content_hash" TEXT,
    "previous_content_hash" TEXT,
    "next_content_hash" TEXT,
    "previous_status" TEXT,
    "next_status" TEXT,
    "definition_snapshot" JSONB,
    "metadata" JSONB,
    "actor_type" TEXT,
    "actor_id" TEXT,
    "actor_name" TEXT,
    "actor_role" TEXT,
    "origin" TEXT NOT NULL,
    "request_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "observed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_cloud_template_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "whatsapp_cloud_template_events_owner_key_scope_type_variant_idx"
ON "whatsapp_cloud_template_events"("owner_key", "scope", "type", "variant", "created_at");

CREATE INDEX "whatsapp_cloud_template_events_template_name_created_at_idx"
ON "whatsapp_cloud_template_events"("template_name", "created_at");

CREATE INDEX "whatsapp_cloud_template_events_event_type_created_at_idx"
ON "whatsapp_cloud_template_events"("event_type", "created_at");

INSERT INTO "whatsapp_cloud_template_events" (
    "id", "owner_key", "channel_id", "channel_name", "channel_purpose", "scope", "type", "variant",
    "event_type", "template_name", "template_id", "category", "language_code",
    "content_hash", "next_content_hash", "next_status", "metadata", "actor_type",
    "origin", "observed_at"
)
SELECT
    gen_random_uuid()::TEXT,
    current."owner_key",
    current."channel_id",
    channel."name",
    channel."purpose",
    current."scope",
    current."type",
    current."variant",
    current."event_type",
    current."template_name",
    current."template_id",
    current."category",
    current."language_code",
    current."content_hash",
    current."content_hash",
    current."status",
    '{"baseline":true,"definitionSnapshotUnavailable":true,"note":"Only the current record was available during migration; prior approvals, rejections, edits, and deletions were not retained."}'::JSONB,
    'SYSTEM',
    'migration_baseline',
    CURRENT_TIMESTAMP
FROM (
    SELECT
        "owner_key", "channel_id", "scope", "type", "variant", "template_name",
        "template_id", "category", "language_code", "content_hash", "status",
        'BASELINE_ACTIVE_MAPPING' AS "event_type"
    FROM "whatsapp_cloud_templates"
    UNION ALL
    SELECT
        "owner_key", "channel_id", "scope", "type", "variant", "template_name",
        "template_id", "category", "language_code", "content_hash", "status",
        'BASELINE_CANDIDATE' AS "event_type"
    FROM "whatsapp_cloud_template_candidates"
) AS current
LEFT JOIN "whatsapp_channels" AS channel ON channel."id" = current."channel_id";
