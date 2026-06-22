UPDATE "home_slides"
SET "sort_order" = 1
WHERE "sort_order" < 1;

ALTER TABLE "home_slides"
ALTER COLUMN "sort_order" SET DEFAULT 1;

ALTER TABLE "home_slides"
ADD CONSTRAINT "home_slides_sort_order_min_check" CHECK ("sort_order" >= 1);
