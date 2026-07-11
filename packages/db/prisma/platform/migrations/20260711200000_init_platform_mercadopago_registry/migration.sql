CREATE TABLE "mercadopago_connections" (
    "id" SERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "seller_user_id" TEXT NOT NULL,
    "channel_id" TEXT,
    "tenant_api_url" TEXT NOT NULL,
    "admin_url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_refreshed_at" TIMESTAMP(3),
    "last_webhook_at" TIMESTAMP(3),
    "last_webhook_type" TEXT,
    "disconnected_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "mercadopago_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mercadopago_connections_seller_user_id_key"
ON "mercadopago_connections"("seller_user_id");

CREATE INDEX "mercadopago_connections_tenant_id_status_idx"
ON "mercadopago_connections"("tenant_id", "status");
