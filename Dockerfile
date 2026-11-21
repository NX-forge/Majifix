# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat && corepack enable && corepack prepare pnpm@10.28.0 --activate
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
RUN pnpm install --no-frozen-lockfile

FROM base AS builder
# Build-only placeholders. Production credentials are supplied at runtime only.
ENV NODE_ENV=production \
    DATABASE_URL=postgresql://build:build@127.0.0.1:5432/majifix?schema=public \
    BETTER_AUTH_SECRET=build-only-placeholder-secret-with-more-than-32-characters \
    BETTER_AUTH_URL=https://majifix.example.invalid \
    NEXT_PUBLIC_APP_URL=https://majifix.example.invalid \
    RESEND_API_KEY=re_build_placeholder \
    RESEND_FROM_EMAIL="MajiFix <build@example.invalid>" \
    NOTIFICATION_WORKER_SECRET=build-only-worker-secret-with-more-than-32-characters
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm db:generate
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/scripts ./scripts
EXPOSE 3000
CMD ["pnpm", "start:production"]
