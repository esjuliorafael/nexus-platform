CREATE TABLE "order_reads" (
    "order_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_reads_pkey" PRIMARY KEY ("order_id", "user_id")
);

CREATE INDEX "order_reads_user_id_read_at_idx"
ON "order_reads"("user_id", "read_at");

ALTER TABLE "order_reads"
ADD CONSTRAINT "order_reads_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_reads"
ADD CONSTRAINT "order_reads_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing orders predate read tracking and should not notify every current user.
INSERT INTO "order_reads" ("order_id", "user_id", "read_at")
SELECT orders."id", users."id", CURRENT_TIMESTAMP
FROM "orders" AS orders
CROSS JOIN "users" AS users
ON CONFLICT ("order_id", "user_id") DO NOTHING;
