-- CreateEnum
CREATE TYPE "RaffleDistribution" AS ENUM ('lineal', 'aleatorio');

-- CreateEnum
CREATE TYPE "RaffleStatus" AS ENUM ('activa', 'finalizada', 'cancelada');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('foto', 'video');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('pendiente', 'pagado', 'cancelado');

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "description" TEXT,
    "group" TEXT NOT NULL DEFAULT 'general',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raffles" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio_boleto" DECIMAL(65,30) NOT NULL,
    "cantidad_boletos" INTEGER NOT NULL,
    "opportunities" INTEGER NOT NULL DEFAULT 1,
    "modo_reparto" "RaffleDistribution" NOT NULL DEFAULT 'lineal',
    "usa_cero" BOOLEAN NOT NULL DEFAULT false,
    "cifras" INTEGER NOT NULL DEFAULT 3,
    "fecha_sorteo" TIMESTAMP(3),
    "imagen" TEXT,
    "estado" "RaffleStatus" NOT NULL DEFAULT 'activa',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raffles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raffle_gallery" (
    "id" SERIAL NOT NULL,
    "rifa_id" INTEGER NOT NULL,
    "ruta_archivo" TEXT NOT NULL,
    "tipo_archivo" "MediaType" NOT NULL DEFAULT 'foto',
    "fecha_subida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raffle_gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raffle_opportunities" (
    "id" SERIAL NOT NULL,
    "rifa_id" INTEGER NOT NULL,
    "numero_boleto" TEXT NOT NULL,
    "oportunidades_extra" JSONB NOT NULL,

    CONSTRAINT "raffle_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_sales" (
    "id" SERIAL NOT NULL,
    "rifa_id" INTEGER NOT NULL,
    "numero_boleto" TEXT NOT NULL,
    "cliente_nombre" TEXT NOT NULL,
    "cliente_telefono" TEXT NOT NULL,
    "cliente_estado" TEXT,
    "estado_pago" "TicketStatus" NOT NULL DEFAULT 'pendiente',
    "metodo_pago" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_sales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- AddForeignKey
ALTER TABLE "raffle_gallery" ADD CONSTRAINT "raffle_gallery_rifa_id_fkey" FOREIGN KEY ("rifa_id") REFERENCES "raffles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raffle_opportunities" ADD CONSTRAINT "raffle_opportunities_rifa_id_fkey" FOREIGN KEY ("rifa_id") REFERENCES "raffles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_sales" ADD CONSTRAINT "ticket_sales_rifa_id_fkey" FOREIGN KEY ("rifa_id") REFERENCES "raffles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
