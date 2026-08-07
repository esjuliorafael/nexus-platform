ALTER TABLE "whatsapp_cloud_templates"
  ADD COLUMN "variant" TEXT NOT NULL DEFAULT 'LEGACY';

ALTER TABLE "whatsapp_cloud_template_candidates"
  ADD COLUMN "variant" TEXT NOT NULL DEFAULT 'LEGACY';

ALTER TABLE "whatsapp_cloud_templates"
  DROP CONSTRAINT IF EXISTS "whatsapp_cloud_templates_owner_key_scope_type_key";

ALTER TABLE "whatsapp_cloud_template_candidates"
  DROP CONSTRAINT IF EXISTS "whatsapp_cloud_template_candidates_owner_key_scope_type_content_hash_key";

CREATE UNIQUE INDEX "whatsapp_cloud_templates_owner_scope_type_variant_key"
  ON "whatsapp_cloud_templates"("owner_key", "scope", "type", "variant");

CREATE UNIQUE INDEX "whatsapp_cloud_template_candidates_owner_scope_type_variant_hash_key"
  ON "whatsapp_cloud_template_candidates"("owner_key", "scope", "type", "variant", "content_hash");
