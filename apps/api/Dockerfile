# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar TODO el proyecto (excepto lo ignorado por .dockerignore)
COPY . .

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Generar el cliente de Prisma (Necesario para los tipos de la DB)
RUN pnpm --filter @nexus/db generate

# Construir el proyecto (específicamente el API)
RUN pnpm --filter @nexus/api build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Instalar pnpm para ejecutar migraciones si es necesario
RUN npm install -g pnpm

# Copiar solo lo necesario para ejecución
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages ./packages

# Instalar solo dependencias de producción para el workspace
RUN pnpm install --prod --frozen-lockfile

EXPOSE 8080

# Script de inicio que corre migraciones antes de arrancar
CMD ["sh", "-c", "pnpm --filter @nexus/db deploy && node apps/api/dist/server.js"]
