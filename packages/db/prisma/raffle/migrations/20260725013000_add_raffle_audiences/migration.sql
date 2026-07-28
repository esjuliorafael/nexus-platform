CREATE TABLE "raffle_audiences" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rules" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" INTEGER,
    "created_by_name" TEXT,
    "created_by_role" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raffle_audiences_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "raffle_audiences_active_updated_at_idx"
ON "raffle_audiences"("active", "updated_at");
