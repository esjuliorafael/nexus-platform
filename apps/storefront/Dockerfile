# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar archivos de configuración de la raíz
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/storefront ./apps/storefront

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Variables de entorno necesarias para el build de Next.js
# Nota: Algunas pueden inyectarse aquí o en el runtime si se usa output: 'standalone'
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Construir el Storefront
RUN pnpm --filter @nexus/storefront build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Copiar archivos necesarios para ejecutar Next.js
COPY --from=builder /app/apps/storefront/next.config.js ./
COPY --from=builder /app/apps/storefront/public ./public
COPY --from=builder /app/apps/storefront/.next ./.next
COPY --from=builder /app/apps/storefront/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
