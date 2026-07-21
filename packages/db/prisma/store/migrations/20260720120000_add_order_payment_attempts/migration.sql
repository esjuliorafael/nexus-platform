CREATE TABLE "order_payment_attempts" (
  "id" UUID NOT NULL,
  "order_id" INTEGER NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'INITIATED',
  "status_detail" TEXT,
  "mp_payment_id" TEXT,
  "retryable" BOOLEAN NOT NULL DEFAULT false,
  "uncertain" BOOLEAN NOT NULL DEFAULT false,
  "customer_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "order_payment_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_payment_attempts_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "order_payment_attempts_idempotency_key_key"
ON "order_payment_attempts"("idempotency_key");

CREATE INDEX "order_payment_attempts_order_id_created_at_idx"
ON "order_payment_attempts"("order_id", "created_at");

CREATE INDEX "order_payment_attempts_mp_payment_id_idx"
ON "order_payment_attempts"("mp_payment_id");
