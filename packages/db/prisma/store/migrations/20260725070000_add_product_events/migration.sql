CREATE TABLE "product_events" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "message" TEXT,
    "actor_type" TEXT NOT NULL DEFAULT 'SYSTEM',
    "actor_user_id" INTEGER,
    "actor_name" TEXT,
    "actor_role" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'SYSTEM',
    "previous_state" JSONB,
    "next_state" JSONB,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_events_product_id_created_at_idx"
ON "product_events"("product_id", "created_at");

CREATE INDEX "product_events_actor_user_id_created_at_idx"
ON "product_events"("actor_user_id", "created_at");

ALTER TABLE "product_events"
ADD CONSTRAINT "product_events_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_events"
ADD CONSTRAINT "product_events_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
