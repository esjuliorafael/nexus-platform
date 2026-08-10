FROM node:20-bookworm AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@nexus/platform-admin

FROM nginx:alpine AS runner
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location /assets/ { try_files \$uri =404; add_header Cache-Control "public, max-age=31536000, immutable" always; }
  location / { try_files \$uri \$uri/ /index.html; add_header Cache-Control "no-cache" always; }
}
EOF
COPY --from=builder /app/apps/platform-admin/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
