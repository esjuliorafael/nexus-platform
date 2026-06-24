CREATE TABLE "media_subcategories" (
    "media_id" INTEGER NOT NULL,
    "subcategory_id" INTEGER NOT NULL,

    CONSTRAINT "media_subcategories_pkey" PRIMARY KEY ("media_id", "subcategory_id")
);

INSERT INTO "media_subcategories" ("media_id", "subcategory_id")
SELECT "id", "subcategory_id"
FROM "media"
WHERE "subcategory_id" IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE INDEX "media_subcategories_subcategory_id_media_id_idx"
ON "media_subcategories"("subcategory_id", "media_id");

ALTER TABLE "media_subcategories"
    ADD CONSTRAINT "media_subcategories_media_id_fkey"
    FOREIGN KEY ("media_id") REFERENCES "media"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "media_subcategories"
    ADD CONSTRAINT "media_subcategories_subcategory_id_fkey"
    FOREIGN KEY ("subcategory_id") REFERENCES "subcategories"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "media" DROP CONSTRAINT "media_subcategory_id_fkey";
ALTER TABLE "media" DROP COLUMN "subcategory_id";
