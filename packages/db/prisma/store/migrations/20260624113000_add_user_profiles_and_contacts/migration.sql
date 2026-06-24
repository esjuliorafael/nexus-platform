ALTER TABLE "users" ADD COLUMN "phone" TEXT;

CREATE TYPE "ContactChannelType" AS ENUM ('whatsapp', 'phone');

CREATE TABLE "contact_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "display_name" TEXT,
    "responsibility" TEXT NOT NULL,
    "description" TEXT,
    "schedule_text" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contact_channels" (
    "id" SERIAL NOT NULL,
    "contact_profile_id" INTEGER NOT NULL,
    "type" "ContactChannelType" NOT NULL,
    "phone_number" TEXT NOT NULL,
    "label" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "contact_channels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contact_profiles_user_id_key" ON "contact_profiles"("user_id");
CREATE INDEX "contact_profiles_published_sort_order_idx" ON "contact_profiles"("published", "sort_order");
CREATE UNIQUE INDEX "contact_channels_contact_profile_id_type_phone_number_key"
ON "contact_channels"("contact_profile_id", "type", "phone_number");
CREATE INDEX "contact_channels_contact_profile_id_active_sort_order_idx"
ON "contact_channels"("contact_profile_id", "active", "sort_order");

ALTER TABLE "contact_profiles"
ADD CONSTRAINT "contact_profiles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contact_channels"
ADD CONSTRAINT "contact_channels_contact_profile_id_fkey"
FOREIGN KEY ("contact_profile_id") REFERENCES "contact_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
