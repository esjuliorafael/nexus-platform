DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'TemplateType'
      AND e.enumlabel = 'DATE_CHANGE'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'TemplateType'
      AND e.enumlabel = 'date_change'
  ) THEN
    ALTER TYPE "TemplateType" RENAME VALUE 'DATE_CHANGE' TO 'date_change';
  END IF;
END $$;
