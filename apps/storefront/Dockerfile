# Stage 1: Build
FROM node:20 AS builder

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar el proyecto
COPY . .

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Variables de entorno necesarias para el build de Next.js
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Construir el Storefront usando turbo
RUN pnpm turbo run build --filter=@nexus/storefront...

# Stage 2: Production
FROM node:20-slim AS runner

WORKDIR /app

# Copiar archivos necesarios para ejecutar Next.js
COPY --from=builder /app/apps/storefront/next.config.js ./
COPY --from=builder /app/apps/storefront/package.json ./
COPY --from=builder /app/apps/storefront/public ./apps/storefront/public
COPY --from=builder /app/apps/storefront/.next ./apps/storefront/.next
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

# Ejecutar desde la subcarpeta para que Next.js encuentre sus archivos
WORKDIR /app/apps/storefront
CMD ["npm", "start"]
