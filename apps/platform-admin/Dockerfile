FROM node:20-bookworm AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm db:generate
RUN pnpm turbo run build --filter=@nexus/platform-admin

FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client zstd ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/apps/platform-admin ./apps/platform-admin
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
RUN mkdir -p /data && chmod 700 /data
EXPOSE 80
VOLUME ["/data"]
CMD ["node", "apps/platform-admin/dist-server/server.js"]
