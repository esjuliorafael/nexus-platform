CREATE TYPE "RafflePrizeShippingPolicy" AS ENUM (
  'included',
  'winner_pays'
);

ALTER TABLE "raffles"
  ADD COLUMN "prize_shipping_policy" "RafflePrizeShippingPolicy";
