-- Normalize the Mercado Pago marketplace fee setting to one canonical key.
INSERT INTO "settings" ("key", "value", "description", "group", "updated_at")
SELECT
  'mp_app_fee_percentage',
  "value",
  COALESCE("description", 'Porcentaje de comision de Nexus en pagos de Mercado Pago'),
  "group",
  CURRENT_TIMESTAMP
FROM "settings"
WHERE "key" = 'mp_application_fee'
  AND NOT EXISTS (
    SELECT 1
    FROM "settings"
    WHERE "key" = 'mp_app_fee_percentage'
  );

DELETE FROM "settings"
WHERE "key" = 'mp_application_fee';
