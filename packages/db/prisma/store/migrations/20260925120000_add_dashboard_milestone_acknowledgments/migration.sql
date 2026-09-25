CREATE TABLE "dashboard_milestone_acknowledgments" (
    "id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "milestone_id" TEXT NOT NULL,
    "acknowledged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_milestone_acknowledgments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dashboard_milestone_acknowledgments_user_id_milestone_id_key"
    ON "dashboard_milestone_acknowledgments"("user_id", "milestone_id");

CREATE INDEX "dashboard_milestone_acknowledgments_user_id_idx"
    ON "dashboard_milestone_acknowledgments"("user_id");

ALTER TABLE "dashboard_milestone_acknowledgments"
    ADD CONSTRAINT "dashboard_milestone_acknowledgments_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
