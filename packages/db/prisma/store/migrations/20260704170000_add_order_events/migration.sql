CREATE TABLE "order_events" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_events_order_id_created_at_idx" ON "order_events"("order_id", "created_at");

ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
