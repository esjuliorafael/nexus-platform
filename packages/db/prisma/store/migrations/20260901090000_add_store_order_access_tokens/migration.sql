CREATE TABLE "store_order_access_tokens" (
    "id" UUID NOT NULL,
    "order_id" INTEGER NOT NULL,
    "phone_hash" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_order_access_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_order_access_tokens_token_hash_key"
    ON "store_order_access_tokens"("token_hash");

CREATE INDEX "store_order_access_tokens_order_id_phone_hash_idx"
    ON "store_order_access_tokens"("order_id", "phone_hash");

CREATE INDEX "store_order_access_tokens_order_id_expires_at_idx"
    ON "store_order_access_tokens"("order_id", "expires_at");

ALTER TABLE "store_order_access_tokens"
    ADD CONSTRAINT "store_order_access_tokens_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
