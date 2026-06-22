ALTER TABLE "home_slides"
ADD COLUMN IF NOT EXISTS "display_duration_ms" INTEGER NOT NULL DEFAULT 8000;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'home_slides_display_duration_ms_check'
  ) THEN
    ALTER TABLE "home_slides"
    ADD CONSTRAINT "home_slides_display_duration_ms_check"
    CHECK ("display_duration_ms" BETWEEN 3000 AND 60000);
  END IF;
END $$;
