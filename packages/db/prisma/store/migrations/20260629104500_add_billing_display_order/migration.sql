ALTER TABLE "annual_services" ADD COLUMN "display_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "extra_charges" ADD COLUMN "display_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "billing_payments" ADD COLUMN "display_order" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) - 1 AS display_order
  FROM "annual_services"
)
UPDATE "annual_services" target
SET "display_order" = ranked.display_order
FROM ranked
WHERE target.id = ranked.id;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) - 1 AS display_order
  FROM "extra_charges"
)
UPDATE "extra_charges" target
SET "display_order" = ranked.display_order
FROM ranked
WHERE target.id = ranked.id;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY payment_date DESC, created_at DESC, id DESC) - 1 AS display_order
  FROM "billing_payments"
)
UPDATE "billing_payments" target
SET "display_order" = ranked.display_order
FROM ranked
WHERE target.id = ranked.id;
