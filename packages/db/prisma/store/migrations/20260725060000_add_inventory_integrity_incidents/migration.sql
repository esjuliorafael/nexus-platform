CREATE TABLE "inventory_integrity_incidents" (
  "id" SERIAL NOT NULL,
  "product_id" INTEGER NOT NULL,
  "issue_type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "first_detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  "resolved_by_user_id" INTEGER,
  "resolved_by_name" TEXT,
  "resolution" TEXT,
  "snapshot" JSONB,
  CONSTRAINT "inventory_integrity_incidents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventory_integrity_incidents_product_id_issue_type_key"
  ON "inventory_integrity_incidents"("product_id", "issue_type");

CREATE INDEX "inventory_integrity_incidents_status_last_detected_at_idx"
  ON "inventory_integrity_incidents"("status", "last_detected_at");

ALTER TABLE "inventory_integrity_incidents"
  ADD CONSTRAINT "inventory_integrity_incidents_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
