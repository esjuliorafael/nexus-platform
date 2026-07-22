CREATE TYPE "StorefrontAnnouncementScope" AS ENUM (
  'GLOBAL', 'STORE', 'RAFFLES', 'RAFFLE', 'PRODUCT', 'STORE_CHECKOUT', 'RAFFLE_CHECKOUT'
);

CREATE TYPE "StorefrontAnnouncementDisplay" AS ENUM ('POPUP');
CREATE TYPE "StorefrontAnnouncementVariant" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'CRITICAL', 'PROMO');
CREATE TYPE "StorefrontAnnouncementFrequency" AS ENUM ('ONCE_VISITOR', 'ONCE_SESSION', 'ALWAYS');

CREATE TABLE "storefront_announcements" (
  "id" SERIAL NOT NULL,
  "scope" "StorefrontAnnouncementScope" NOT NULL,
  "target_id" INTEGER,
  "presentation" "StorefrontAnnouncementDisplay" NOT NULL DEFAULT 'POPUP',
  "variant" "StorefrontAnnouncementVariant" NOT NULL DEFAULT 'INFO',
  "frequency" "StorefrontAnnouncementFrequency" NOT NULL DEFAULT 'ONCE_VISITOR',
  "eyebrow" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "cta_label" TEXT,
  "cta_href" TEXT,
  "dismissible" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "starts_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "storefront_announcements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "storefront_announcements_target_check" CHECK (
    ("scope" IN ('RAFFLE', 'PRODUCT') AND "target_id" IS NOT NULL)
    OR ("scope" NOT IN ('RAFFLE', 'PRODUCT') AND "target_id" IS NULL)
  ),
  CONSTRAINT "storefront_announcements_window_check" CHECK (
    "starts_at" IS NULL OR "ends_at" IS NULL OR "ends_at" > "starts_at"
  ),
  CONSTRAINT "storefront_announcements_cta_check" CHECK (
    ("cta_label" IS NULL AND "cta_href" IS NULL)
    OR ("cta_label" IS NOT NULL AND "cta_href" IS NOT NULL)
  )
);

CREATE INDEX "storefront_announcements_active_starts_at_ends_at_idx"
  ON "storefront_announcements"("active", "starts_at", "ends_at");
CREATE INDEX "storefront_announcements_scope_target_id_priority_idx"
  ON "storefront_announcements"("scope", "target_id", "priority");
