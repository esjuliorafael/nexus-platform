CREATE TABLE "home_slides" (
    "id" SERIAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "eyebrow" TEXT,
    "media_url" TEXT NOT NULL,
    "poster_url" TEXT,
    "primary_href" TEXT,
    "primary_text" TEXT,
    "secondary_href" TEXT,
    "secondary_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 1,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "type" "MediaType" NOT NULL DEFAULT 'photo',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_slides_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "home_slides_active_sort_order_idx" ON "home_slides"("active", "sort_order");
