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

RUN npm install -g pnpm

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
CMD ["sh", "-c", "pnpm --filter @nexus/db prisma migrate deploy --schema=prisma/store/schema.prisma && node apps/api/dist/server.js"]
