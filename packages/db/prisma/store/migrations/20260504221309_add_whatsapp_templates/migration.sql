/*
  Warnings:

  - The values [envio,recoger] on the enum `DeliveryType` will be removed. If these variants are still used in the database, this will fail.
  - The values [foto] on the enum `MediaType` will be removed. If these variants are still used in the database, this will fail.
  - The values [pendiente,pagado,enviado,entregado,cancelado] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [articulo,ave] on the enum `ProductType` will be removed. If these variants are still used in the database, this will fail.
  - The values [disponible,reservado,vendido] on the enum `SaleStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [extendida] on the enum `ShippingType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `concepto` on the `annual_services` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `annual_services` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_contrato` on the `annual_services` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_creacion` on the `annual_services` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_vencimiento` on the `annual_services` table. All the data in the column will be lost.
  - You are about to drop the column `monto` on the `annual_services` table. All the data in the column will be lost.
  - You are about to drop the column `pagado` on the `annual_services` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_icono` on the `annual_services` table. All the data in the column will be lost.
  - You are about to drop the column `activo` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_creacion` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `icono` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `concepto` on the `extra_charges` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_cargo` on the `extra_charges` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_creacion` on the `extra_charges` table. All the data in the column will be lost.
  - You are about to drop the column `monto` on the `extra_charges` table. All the data in the column will be lost.
  - You are about to drop the column `pagado` on the `extra_charges` table. All the data in the column will be lost.
  - You are about to drop the column `activo` on the `media` table. All the data in the column will be lost.
  - You are about to drop the column `categoria_id` on the `media` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `media` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_creacion` on the `media` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_media` on the `media` table. All the data in the column will be lost.
  - You are about to drop the column `ruta_archivo` on the `media` table. All the data in the column will be lost.
  - You are about to drop the column `subcategoria_id` on the `media` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `media` table. All the data in the column will be lost.
  - You are about to drop the column `titulo` on the `media` table. All the data in the column will be lost.
  - You are about to drop the column `ubicacion` on the `media` table. All the data in the column will be lost.
  - You are about to drop the column `cantidad` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `nombre_producto` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `orden_id` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `precio_unitario` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `producto_id` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_producto` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `cliente_nombre` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `cliente_telefono` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `costo_envio` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `direccion_envio` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `estado_envio` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `estatus` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_creacion` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_entrega` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `banco` on the `payment_channels` table. All the data in the column will be lost.
  - You are about to drop the column `beneficiario` on the `payment_channels` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_creacion` on the `payment_channels` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `payment_channels` table. All the data in the column will be lost.
  - You are about to drop the column `proposito` on the `payment_channels` table. All the data in the column will be lost.
  - You are about to drop the column `tarjeta` on the `payment_channels` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_subida` on the `product_gallery` table. All the data in the column will be lost.
  - You are about to drop the column `producto_id` on the `product_gallery` table. All the data in the column will be lost.
  - You are about to drop the column `ruta_archivo` on the `product_gallery` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_archivo` on the `product_gallery` table. All the data in the column will be lost.
  - You are about to drop the column `activo` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `anillo` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `edad` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `estado_venta` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_actualizacion` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_creacion` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `portada` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `precio` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `proposito` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `shipping_zones` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_zona` on the `shipping_zones` table. All the data in the column will be lost.
  - You are about to drop the column `activo` on the `subcategories` table. All the data in the column will be lost.
  - You are about to drop the column `categoria_id` on the `subcategories` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `subcategories` table. All the data in the column will be lost.
  - You are about to drop the column `activo` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `email_notificaciones` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_creacion` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `recibir_notificaciones` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `activo` on the `whatsapp_channels` table. All the data in the column will be lost.
  - You are about to drop the column `evolution_instance` on the `whatsapp_channels` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_creacion` on the `whatsapp_channels` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `whatsapp_channels` table. All the data in the column will be lost.
  - You are about to drop the column `plantilla` on the `whatsapp_channels` table. All the data in the column will be lost.
  - You are about to drop the column `proposito` on the `whatsapp_channels` table. All the data in the column will be lost.
  - You are about to drop the column `telefono` on the `whatsapp_channels` table. All the data in the column will be lost.
  - You are about to drop the column `errorMessage` on the `whatsapp_message_logs` table. All the data in the column will be lost.
  - You are about to drop the column `instanceName` on the `whatsapp_message_logs` table. All the data in the column will be lost.
  - You are about to drop the column `orderId` on the `whatsapp_message_logs` table. All the data in the column will be lost.
  - You are about to drop the column `recipientPhone` on the `whatsapp_message_logs` table. All the data in the column will be lost.
  - You are about to drop the column `sentAt` on the `whatsapp_message_logs` table. All the data in the column will be lost.
  - You are about to drop the column `templateUsed` on the `whatsapp_message_logs` table. All the data in the column will be lost.
  - You are about to drop the column `ticketSaleId` on the `whatsapp_message_logs` table. All the data in the column will be lost.
  - Added the required column `amount` to the `annual_services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `concept` to the `annual_services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount` to the `extra_charges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `charge_date` to the `extra_charges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `concept` to the `extra_charges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `file_path` to the `media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order_id` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_id` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_type` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit_price` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customer_name` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customer_phone` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipping_cost` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bank` to the `payment_channels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `beneficiary` to the `payment_channels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `payment_channels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purpose` to the `payment_channels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `file_path` to the `product_gallery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_id` to the `product_gallery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `shipping_zones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category_id` to the `subcategories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `subcategories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `whatsapp_channels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `whatsapp_channels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purpose` to the `whatsapp_channels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `template` to the `whatsapp_channels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `instance_name` to the `whatsapp_message_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipient_phone` to the `whatsapp_message_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `template_used` to the `whatsapp_message_logs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('reservation', 'release');

-- AlterEnum
BEGIN;
CREATE TYPE "DeliveryType_new" AS ENUM ('shipping', 'pickup');
ALTER TABLE "orders" ALTER COLUMN "tipo_entrega" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "tipo_entrega" TYPE "DeliveryType_new" USING ("tipo_entrega"::text::"DeliveryType_new");
ALTER TYPE "DeliveryType" RENAME TO "DeliveryType_old";
ALTER TYPE "DeliveryType_new" RENAME TO "DeliveryType";
DROP TYPE "DeliveryType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "MediaType_new" AS ENUM ('photo', 'video');
ALTER TABLE "product_gallery" ALTER COLUMN "tipo_archivo" DROP DEFAULT;
ALTER TABLE "product_gallery" ALTER COLUMN "tipo_archivo" TYPE "MediaType_new" USING ("tipo_archivo"::text::"MediaType_new");
ALTER TABLE "media" ALTER COLUMN "tipo" TYPE "MediaType_new" USING ("tipo"::text::"MediaType_new");
ALTER TYPE "MediaType" RENAME TO "MediaType_old";
ALTER TYPE "MediaType_new" RENAME TO "MediaType";
DROP TYPE "MediaType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled');
ALTER TABLE "orders" ALTER COLUMN "estatus" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "estatus" TYPE "OrderStatus_new" USING ("estatus"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ProductType_new" AS ENUM ('item', 'bird');
ALTER TABLE "products" ALTER COLUMN "tipo" TYPE "ProductType_new" USING ("tipo"::text::"ProductType_new");
ALTER TABLE "order_items" ALTER COLUMN "tipo_producto" TYPE "ProductType_new" USING ("tipo_producto"::text::"ProductType_new");
ALTER TYPE "ProductType" RENAME TO "ProductType_old";
ALTER TYPE "ProductType_new" RENAME TO "ProductType";
DROP TYPE "ProductType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "SaleStatus_new" AS ENUM ('available', 'reserved', 'sold');
ALTER TABLE "products" ALTER COLUMN "estado_venta" DROP DEFAULT;
ALTER TABLE "products" ALTER COLUMN "estado_venta" TYPE "SaleStatus_new" USING ("estado_venta"::text::"SaleStatus_new");
ALTER TYPE "SaleStatus" RENAME TO "SaleStatus_old";
ALTER TYPE "SaleStatus_new" RENAME TO "SaleStatus";
DROP TYPE "SaleStatus_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ShippingType_new" AS ENUM ('normal', 'extended');
ALTER TABLE "shipping_zones" ALTER COLUMN "tipo_zona" DROP DEFAULT;
ALTER TABLE "shipping_zones" ALTER COLUMN "tipo_zona" TYPE "ShippingType_new" USING ("tipo_zona"::text::"ShippingType_new");
ALTER TYPE "ShippingType" RENAME TO "ShippingType_old";
ALTER TYPE "ShippingType_new" RENAME TO "ShippingType";
DROP TYPE "ShippingType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "media" DROP CONSTRAINT "media_categoria_id_fkey";

-- DropForeignKey
ALTER TABLE "media" DROP CONSTRAINT "media_subcategoria_id_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_orden_id_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_producto_id_fkey";

-- DropForeignKey
ALTER TABLE "product_gallery" DROP CONSTRAINT "product_gallery_producto_id_fkey";

-- DropForeignKey
ALTER TABLE "subcategories" DROP CONSTRAINT "subcategories_categoria_id_fkey";

-- AlterTable
ALTER TABLE "annual_services" DROP COLUMN "concepto",
DROP COLUMN "descripcion",
DROP COLUMN "fecha_contrato",
DROP COLUMN "fecha_creacion",
DROP COLUMN "fecha_vencimiento",
DROP COLUMN "monto",
DROP COLUMN "pagado",
DROP COLUMN "tipo_icono",
ADD COLUMN     "amount" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "concept" TEXT NOT NULL,
ADD COLUMN     "contract_date" TIMESTAMP(3),
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "expiration_date" TIMESTAMP(3),
ADD COLUMN     "icon_type" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "is_paid" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "activo",
DROP COLUMN "fecha_creacion",
DROP COLUMN "icono",
DROP COLUMN "nombre",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "extra_charges" DROP COLUMN "concepto",
DROP COLUMN "fecha_cargo",
DROP COLUMN "fecha_creacion",
DROP COLUMN "monto",
DROP COLUMN "pagado",
ADD COLUMN     "amount" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "charge_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "concept" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_paid" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "media" DROP COLUMN "activo",
DROP COLUMN "categoria_id",
DROP COLUMN "descripcion",
DROP COLUMN "fecha_creacion",
DROP COLUMN "fecha_media",
DROP COLUMN "ruta_archivo",
DROP COLUMN "subcategoria_id",
DROP COLUMN "tipo",
DROP COLUMN "titulo",
DROP COLUMN "ubicacion",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "category_id" INTEGER,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "file_path" TEXT NOT NULL,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "media_date" TIMESTAMP(3),
ADD COLUMN     "subcategory_id" INTEGER,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "type" "MediaType" NOT NULL;

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "cantidad",
DROP COLUMN "nombre_producto",
DROP COLUMN "orden_id",
DROP COLUMN "precio_unitario",
DROP COLUMN "producto_id",
DROP COLUMN "tipo_producto",
ADD COLUMN     "order_id" INTEGER NOT NULL,
ADD COLUMN     "product_id" INTEGER NOT NULL,
ADD COLUMN     "product_name" TEXT,
ADD COLUMN     "product_type" "ProductType" NOT NULL,
ADD COLUMN     "quantity" INTEGER NOT NULL,
ADD COLUMN     "unit_price" DECIMAL(65,30) NOT NULL;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "cliente_nombre",
DROP COLUMN "cliente_telefono",
DROP COLUMN "costo_envio",
DROP COLUMN "direccion_envio",
DROP COLUMN "estado_envio",
DROP COLUMN "estatus",
DROP COLUMN "fecha_creacion",
DROP COLUMN "tipo_entrega",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "customer_name" TEXT NOT NULL,
ADD COLUMN     "customer_phone" TEXT NOT NULL,
ADD COLUMN     "delivery_type" "DeliveryType" NOT NULL DEFAULT 'shipping',
ADD COLUMN     "shipping_address" TEXT,
ADD COLUMN     "shipping_cost" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "shipping_state" TEXT,
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "payment_channels" DROP COLUMN "banco",
DROP COLUMN "beneficiario",
DROP COLUMN "fecha_creacion",
DROP COLUMN "nombre",
DROP COLUMN "proposito",
DROP COLUMN "tarjeta",
ADD COLUMN     "bank" TEXT NOT NULL,
ADD COLUMN     "beneficiary" TEXT NOT NULL,
ADD COLUMN     "card" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "purpose" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "product_gallery" DROP COLUMN "fecha_subida",
DROP COLUMN "producto_id",
DROP COLUMN "ruta_archivo",
DROP COLUMN "tipo_archivo",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "file_path" TEXT NOT NULL,
ADD COLUMN     "file_type" "MediaType" NOT NULL DEFAULT 'photo',
ADD COLUMN     "product_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "activo",
DROP COLUMN "anillo",
DROP COLUMN "descripcion",
DROP COLUMN "edad",
DROP COLUMN "estado_venta",
DROP COLUMN "fecha_actualizacion",
DROP COLUMN "fecha_creacion",
DROP COLUMN "nombre",
DROP COLUMN "portada",
DROP COLUMN "precio",
DROP COLUMN "proposito",
DROP COLUMN "tipo",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "age" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "price" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
ADD COLUMN     "purpose" TEXT,
ADD COLUMN     "ring_number" TEXT,
ADD COLUMN     "sale_status" "SaleStatus" NOT NULL DEFAULT 'available',
ADD COLUMN     "thumbnail" TEXT,
ADD COLUMN     "type" "ProductType" NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "shipping_zones" DROP COLUMN "estado",
DROP COLUMN "tipo_zona",
ADD COLUMN     "state" TEXT NOT NULL,
ADD COLUMN     "zone_type" "ShippingType" NOT NULL DEFAULT 'normal';

-- AlterTable
ALTER TABLE "subcategories" DROP COLUMN "activo",
DROP COLUMN "categoria_id",
DROP COLUMN "nombre",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "category_id" INTEGER NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "activo",
DROP COLUMN "email_notificaciones",
DROP COLUMN "fecha_creacion",
DROP COLUMN "recibir_notificaciones",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "notification_email" TEXT,
ADD COLUMN     "receive_notifications" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "whatsapp_channels" DROP COLUMN "activo",
DROP COLUMN "evolution_instance",
DROP COLUMN "fecha_creacion",
DROP COLUMN "nombre",
DROP COLUMN "plantilla",
DROP COLUMN "proposito",
DROP COLUMN "telefono",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "instance_name" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "purpose" TEXT NOT NULL,
ADD COLUMN     "template" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "whatsapp_message_logs" DROP COLUMN "errorMessage",
DROP COLUMN "instanceName",
DROP COLUMN "orderId",
DROP COLUMN "recipientPhone",
DROP COLUMN "sentAt",
DROP COLUMN "templateUsed",
DROP COLUMN "ticketSaleId",
ADD COLUMN     "error_message" TEXT,
ADD COLUMN     "instance_name" TEXT NOT NULL,
ADD COLUMN     "order_id" TEXT,
ADD COLUMN     "recipient_phone" TEXT NOT NULL,
ADD COLUMN     "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "template_used" TEXT NOT NULL,
ADD COLUMN     "ticket_sale_id" INTEGER;

-- CreateTable
CREATE TABLE "whatsapp_templates" (
    "id" SERIAL NOT NULL,
    "channel_id" INTEGER,
    "type" "TemplateType" NOT NULL,
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_templates_channel_id_type_key" ON "whatsapp_templates"("channel_id", "type");

-- AddForeignKey
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_gallery" ADD CONSTRAINT "product_gallery_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "whatsapp_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
