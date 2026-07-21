CREATE TYPE "PaymentHoldStatus" AS ENUM ('active', 'processing', 'consumed', 'expired', 'cancelled');

CREATE TABLE "raffle_payment_holds" (
  "id" UUID NOT NULL,
  "raffle_id" INTEGER NOT NULL,
  "customer_name" TEXT NOT NULL,
  "customer_phone" TEXT NOT NULL,
  "customer_state" TEXT,
  "coupon_id" INTEGER,
  "coupon_code" TEXT,
  "discount_total" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "status" "PaymentHoldStatus" NOT NULL DEFAULT 'active',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "promoted_reservation_id" TEXT,
  "mp_payment_id" TEXT,
  "mp_seller_user_id" TEXT,
  "mp_payment_status" TEXT,
  "mp_payment_status_detail" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "raffle_payment_holds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "raffle_payment_hold_tickets" (
  "id" SERIAL NOT NULL,
  "hold_id" UUID NOT NULL,
  "raffle_id" INTEGER NOT NULL,
  "ticket_number" TEXT NOT NULL,
  CONSTRAINT "raffle_payment_hold_tickets_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "raffle_payment_attempts" ALTER COLUMN "reservation_id" DROP NOT NULL;
ALTER TABLE "raffle_payment_attempts" ADD COLUMN "hold_id" UUID;

CREATE UNIQUE INDEX "raffle_payment_holds_promoted_reservation_id_key" ON "raffle_payment_holds"("promoted_reservation_id");
CREATE INDEX "raffle_payment_holds_raffle_id_status_expires_at_idx" ON "raffle_payment_holds"("raffle_id", "status", "expires_at");
CREATE INDEX "raffle_payment_holds_mp_payment_id_idx" ON "raffle_payment_holds"("mp_payment_id");
CREATE UNIQUE INDEX "raffle_payment_hold_tickets_raffle_id_ticket_number_key" ON "raffle_payment_hold_tickets"("raffle_id", "ticket_number");
CREATE INDEX "raffle_payment_hold_tickets_hold_id_idx" ON "raffle_payment_hold_tickets"("hold_id");
CREATE INDEX "raffle_payment_attempts_hold_id_created_at_idx" ON "raffle_payment_attempts"("hold_id", "created_at");

ALTER TABLE "raffle_payment_holds" ADD CONSTRAINT "raffle_payment_holds_raffle_id_fkey" FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "raffle_payment_holds" ADD CONSTRAINT "raffle_payment_holds_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "raffle_coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "raffle_payment_hold_tickets" ADD CONSTRAINT "raffle_payment_hold_tickets_hold_id_fkey" FOREIGN KEY ("hold_id") REFERENCES "raffle_payment_holds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "raffle_payment_attempts" ADD CONSTRAINT "raffle_payment_attempts_hold_id_fkey" FOREIGN KEY ("hold_id") REFERENCES "raffle_payment_holds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
