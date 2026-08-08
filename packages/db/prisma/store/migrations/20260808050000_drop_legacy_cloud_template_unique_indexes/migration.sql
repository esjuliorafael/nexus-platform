-- The variant migration replaced these unique indexes with variant-aware
-- indexes, but the original indexes were created as indexes rather than
-- constraints and therefore survived the DROP CONSTRAINT statement.
DROP INDEX IF EXISTS "whatsapp_cloud_templates_owner_key_scope_type_key";
DROP INDEX IF EXISTS "whatsapp_cloud_template_candidates_owner_key_scope_type_content";
