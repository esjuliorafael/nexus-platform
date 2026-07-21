CREATE TABLE "raffle_payment_attempts" (
  "id" UUID NOT NULL,
  "raffle_id" INTEGER NOT NULL,
  "reservation_id" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'INITIATED',
  "status_detail" TEXT,
  "mp_payment_id" TEXT,
  "retryable" BOOLEAN NOT NULL DEFAULT false,
  "uncertain" BOOLEAN NOT NULL DEFAULT false,
  "customer_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "raffle_payment_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "raffle_payment_attempts_idempotency_key_key"
ON "raffle_payment_attempts"("idempotency_key");

CREATE INDEX "raffle_payment_attempts_raffle_id_reservation_id_created_at_idx"
ON "raffle_payment_attempts"("raffle_id", "reservation_id", "created_at");

CREATE INDEX "raffle_payment_attempts_mp_payment_id_idx"
ON "raffle_payment_attempts"("mp_payment_id");
