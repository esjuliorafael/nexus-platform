ALTER TABLE "storefront_campaigns"
ADD COLUMN "card_label" TEXT,
ADD COLUMN "home_card_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN "ticker_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN "ticker_message" TEXT,
ADD COLUMN "ticker_detail" TEXT,
ADD COLUMN "ticker_show_coupon_code" BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE "storefront_campaigns"
SET
  "card_label" = COALESCE(
    NULLIF(BTRIM(REGEXP_REPLACE(COALESCE("eyebrow", ''), E'\\s*[·•|].*$', '')), ''),
    NULLIF(BTRIM(REGEXP_REPLACE("name", E'\\s+[0-9]{4}$', '')), ''),
    "name"
  ),
  "ticker_message" = COALESCE(
    NULLIF(BTRIM("eyebrow"), ''),
    NULLIF(BTRIM(REGEXP_REPLACE("name", E'\\s+[0-9]{4}$', '')), ''),
    "name"
  );
