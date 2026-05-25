# Stage 1: Build
FROM node:20-bookworm AS builder

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar el proyecto
COPY . .

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Inyectar variables de entorno para el build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV IS_DOCKER=true

# Construir el Storefront usando turbo
RUN pnpm turbo run build --filter=@nexus/storefront...

# Stage 2: Production
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV IS_DOCKER=true

# Copiar el build standalone y archivos estáticos
# Nota: Next.js standalone copia las dependencias necesarias a .next/standalone
COPY --from=builder /app/apps/storefront/public ./apps/storefront/public
COPY --from=builder /app/apps/storefront/.next/standalone ./
COPY --from=builder /app/apps/storefront/.next/static ./apps/storefront/.next/static

EXPOSE 3000

# El servidor standalone se arranca con node directamente
# En monorepos, el entrypoint suele estar en apps/storefront/server.js dentro de standalone
CMD ["node", "apps/storefront/server.js"]
