# Stage 1: Build
FROM node:20-bookworm AS builder

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar el proyecto
COPY . .

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Variables de entorno para el build de Vite (Frontend)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_RAFFLE_ENABLED
ENV VITE_RAFFLE_ENABLED=$VITE_RAFFLE_ENABLED

# Construir el Admin usando turbo
RUN pnpm turbo run build --filter=@nexus/admin

# Stage 2: Production (Servir con Nginx ligero)
FROM nginx:alpine AS runner

# Copiar la configuración personalizada de Nginx para SPAs
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Copiar los archivos construidos desde el builder
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
