-- The original raffle migration predates the English database mappings now used
-- by Prisma. Keep the migration history immutable and reconcile either shape.
DO $$
DECLARE
    item RECORD;
BEGIN
    FOR item IN
        SELECT * FROM (VALUES
            ('raffles', 'titulo', 'title'),
            ('raffles', 'descripcion', 'description'),
            ('raffles', 'precio_boleto', 'ticket_price'),
            ('raffles', 'cantidad_boletos', 'ticket_quantity'),
            ('raffles', 'modo_reparto', 'distribution'),
            ('raffles', 'usa_cero', 'use_zero'),
            ('raffles', 'cifras', 'digits'),
            ('raffles', 'fecha_sorteo', 'draw_date'),
            ('raffles', 'imagen', 'image'),
            ('raffles', 'estado', 'status'),
            ('raffles', 'fecha_creacion', 'created_at'),
            ('raffle_gallery', 'rifa_id', 'raffle_id'),
            ('raffle_gallery', 'ruta_archivo', 'file_path'),
            ('raffle_gallery', 'tipo_archivo', 'file_type'),
            ('raffle_gallery', 'fecha_subida', 'created_at'),
            ('raffle_opportunities', 'rifa_id', 'raffle_id'),
            ('raffle_opportunities', 'numero_boleto', 'main_ticket_number'),
            ('raffle_opportunities', 'oportunidades_extra', 'extra_opportunities'),
            ('ticket_sales', 'rifa_id', 'raffle_id'),
            ('ticket_sales', 'numero_boleto', 'ticket_number'),
            ('ticket_sales', 'cliente_nombre', 'customer_name'),
            ('ticket_sales', 'cliente_telefono', 'customer_phone'),
            ('ticket_sales', 'cliente_estado', 'customer_state'),
            ('ticket_sales', 'estado_pago', 'payment_status'),
            ('ticket_sales', 'metodo_pago', 'payment_method'),
            ('ticket_sales', 'fecha', 'created_at')
        ) AS columns_to_rename(table_name, old_name, new_name)
    LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = item.table_name
              AND column_name = item.old_name
        ) AND NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = item.table_name
              AND column_name = item.new_name
        ) THEN
            EXECUTE format(
                'ALTER TABLE public.%I RENAME COLUMN %I TO %I',
                item.table_name,
                item.old_name,
                item.new_name
            );
        END IF;
    END LOOP;
END $$;

DO $$
DECLARE
    item RECORD;
BEGIN
    FOR item IN
        SELECT * FROM (VALUES
            ('RaffleDistribution', 'lineal', 'linear'),
            ('RaffleDistribution', 'aleatorio', 'random'),
            ('RaffleStatus', 'activa', 'active'),
            ('RaffleStatus', 'finalizada', 'finished'),
            ('RaffleStatus', 'cancelada', 'cancelled'),
            ('MediaType', 'foto', 'photo'),
            ('TicketStatus', 'pendiente', 'pending'),
            ('TicketStatus', 'pagado', 'paid'),
            ('TicketStatus', 'cancelado', 'cancelled')
        ) AS enum_values(type_name, old_value, new_value)
    LOOP
        IF EXISTS (
            SELECT 1
            FROM pg_enum
            JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
            JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
            WHERE pg_namespace.nspname = 'public'
              AND pg_type.typname = item.type_name
              AND pg_enum.enumlabel = item.old_value
        ) AND NOT EXISTS (
            SELECT 1
            FROM pg_enum
            JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
            JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
            WHERE pg_namespace.nspname = 'public'
              AND pg_type.typname = item.type_name
              AND pg_enum.enumlabel = item.new_value
        ) THEN
            EXECUTE format(
                'ALTER TYPE public.%I RENAME VALUE %L TO %L',
                item.type_name,
                item.old_value,
                item.new_value
            );
        END IF;
    END LOOP;
END $$;

DO $$
DECLARE
    item RECORD;
BEGIN
    FOR item IN
        SELECT * FROM (VALUES
            ('raffle_gallery', 'raffle_gallery_rifa_id_fkey', 'raffle_gallery_raffle_id_fkey'),
            ('raffle_opportunities', 'raffle_opportunities_rifa_id_fkey', 'raffle_opportunities_raffle_id_fkey'),
            ('ticket_sales', 'ticket_sales_rifa_id_fkey', 'ticket_sales_raffle_id_fkey')
        ) AS constraints_to_rename(table_name, old_name, new_name)
    LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE table_schema = 'public'
              AND table_name = item.table_name
              AND constraint_name = item.old_name
        ) AND NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE table_schema = 'public'
              AND table_name = item.table_name
              AND constraint_name = item.new_name
        ) THEN
            EXECUTE format(
                'ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I',
                item.table_name,
                item.old_name,
                item.new_name
            );
        END IF;
    END LOOP;
END $$;

ALTER TABLE public.settings
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
