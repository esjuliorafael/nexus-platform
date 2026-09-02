ALTER TABLE "store_payment_hold_items"
ADD COLUMN "product_ring_number" TEXT,
ADD COLUMN "product_age" "BirdAge",
ADD COLUMN "product_purpose" "BirdPurpose";

ALTER TABLE "order_items"
ADD COLUMN "product_ring_number" TEXT,
ADD COLUMN "product_age" "BirdAge",
ADD COLUMN "product_purpose" "BirdPurpose";
