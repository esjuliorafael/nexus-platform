# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar TODO el proyecto
COPY . .

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Variables de entorno necesarias para el build de Next.js
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Construir el Storefront
RUN pnpm --filter @nexus/storefront build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Copiar archivos necesarios para ejecutar Next.js
# Nota: Si usas output: 'standalone' en next.config.js es más eficiente,
# por ahora copiaremos lo básico.
COPY --from=builder /app/apps/storefront/next.config.js ./
COPY --from=builder /app/apps/storefront/public ./public
COPY --from=builder /app/apps/storefront/.next ./.next
COPY --from=builder /app/apps/storefront/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
