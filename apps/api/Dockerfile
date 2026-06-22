# Stage 1: Build
FROM node:20-bookworm AS builder

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar todo el proyecto
COPY . .

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Generar Prisma y Construir todo el monorepo
RUN pnpm db:generate
RUN pnpm turbo run build --filter=@nexus/api

# Stage 2: Production
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Instalar pnpm y OpenSSL (Necesario para Prisma)
RUN apt-get update -y && apt-get install -y openssl && npm install -g pnpm

# Copiar solo lo necesario
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8080

# Comando para correr migraciones y arrancar
CMD ["sh", "-c", "pnpm --dir packages/db exec prisma migrate deploy --schema=prisma/store/schema.prisma && if [ \"$RAFFLE_ENABLED\" = \"true\" ]; then DATABASE_URL=\"$RAFFLE_DATABASE_URL\" pnpm --dir packages/db exec prisma migrate deploy --schema=prisma/raffle/schema.prisma; else echo 'Raffle module disabled, skipping migrations'; fi && node apps/api/dist/server.js"]
