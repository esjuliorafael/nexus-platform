ALTER TABLE "raffles"
ADD COLUMN "participation_starts_at" TIMESTAMP(3),
ADD COLUMN "participation_ends_at" TIMESTAMP(3),
ADD COLUMN "early_access_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "early_access_code_hash" TEXT;
