/*
  Warnings:

  - The values [normal] on the enum `ShippingType` will be removed. If these variants are still used in the database, this will fail.
  - The `age` column on the `products` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `purpose` column on the `products` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "BirdAge" AS ENUM ('cock', 'stag', 'hen', 'pullet');

-- CreateEnum
CREATE TYPE "BirdPurpose" AS ENUM ('combat', 'breeding');

-- AlterEnum
BEGIN;
CREATE TYPE "ShippingType_new" AS ENUM ('standard', 'extended');
ALTER TABLE "shipping_zones" ALTER COLUMN "zone_type" DROP DEFAULT;
ALTER TABLE "shipping_zones" ALTER COLUMN "zone_type" TYPE "ShippingType_new" USING ("zone_type"::text::"ShippingType_new");
ALTER TYPE "ShippingType" RENAME TO "ShippingType_old";
ALTER TYPE "ShippingType_new" RENAME TO "ShippingType";
DROP TYPE "ShippingType_old";
ALTER TABLE "shipping_zones" ALTER COLUMN "zone_type" SET DEFAULT 'standard';
COMMIT;

-- AlterEnum
ALTER TYPE "TemplateType" ADD VALUE 'payment_confirmed';

-- AlterTable
ALTER TABLE "payment_channels" ADD COLUMN     "mp_access_token" TEXT,
ADD COLUMN     "mp_refresh_token" TEXT,
ADD COLUMN     "mp_user_id" TEXT;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "age",
ADD COLUMN     "age" "BirdAge",
DROP COLUMN "purpose",
ADD COLUMN     "purpose" "BirdPurpose";

-- AlterTable
ALTER TABLE "shipping_zones" ALTER COLUMN "zone_type" SET DEFAULT 'standard';
