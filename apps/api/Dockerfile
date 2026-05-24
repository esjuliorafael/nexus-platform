# Stage 1: Build
FROM node:20 AS builder

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar el proyecto
COPY . .

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Generar el cliente de Prisma
RUN pnpm --filter @nexus/db generate

# Construir el proyecto usando turbo para asegurar el orden de dependencias
RUN pnpm turbo run build --filter=@nexus/api...

# Stage 2: Production
FROM node:20-slim AS runner

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar solo lo necesario
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages ./packages

# Instalar solo dependencias de producción
RUN pnpm install --prod --frozen-lockfile

EXPOSE 8080

CMD ["sh", "-c", "pnpm --filter @nexus/db deploy && node apps/api/dist/server.js"]
