WITH ordered_slides AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (ORDER BY "sort_order" ASC, "created_at" DESC, "id" ASC) AS "next_sort_order"
    FROM "home_slides"
)
UPDATE "home_slides" AS slide
SET "sort_order" = ordered_slides."next_sort_order"
FROM ordered_slides
WHERE slide."id" = ordered_slides."id";

CREATE UNIQUE INDEX "home_slides_sort_order_key" ON "home_slides"("sort_order");
