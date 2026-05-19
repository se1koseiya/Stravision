FROM docker.m.daocloud.io/node:22-alpine AS base

# Install pnpm - specify version to match package.json
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
    apk add --no-cache libc6-compat python3 make g++ git
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm config set registry https://registry.npmmirror.com && \
    pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

# Increase memory limit for build - critical for large Next.js apps
# For 4GB servers, use 3GB to leave room for system
ENV NODE_OPTIONS="--max-old-space-size=3072"

# Disable source maps in production to reduce memory usage
ENV GENERATE_SOURCEMAP=false

# Use webpack instead of turbopack for lower memory usage on 4GB servers
RUN pnpm build --webpack || pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during the runtime.
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
    apk add --no-cache tzdata su-exec ffmpeg

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy built assets (standard mode)
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy WebSocket server
COPY --from=builder /app/server ./server

# Copy AI agents and skills required at runtime
COPY --from=builder /app/.agents ./.agents

# Copy data directory with config files
COPY --from=builder /app/data ./data

# Ensure data directory exists and has correct permissions
RUN mkdir -p data && chown -R nextjs:nodejs data && chmod -R 755 data

# Switch back to root to fix permissions at runtime via entrypoint
USER root

EXPOSE 3000
EXPOSE 3002

ENV PORT 3000
ENV WS_SERVER_PORT 3002
ENV HOSTNAME "0.0.0.0"
ENV TZ Asia/Shanghai

# Use a shell script to fix permissions and start both services
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'mkdir -p /app/public/uploads' >> /app/entrypoint.sh && \
    echo 'chown -R nextjs:nodejs /app/public/uploads' >> /app/entrypoint.sh && \
    echo 'chown -R nextjs:nodejs /app/data' >> /app/entrypoint.sh && \
    echo '# Start WebSocket server in background' >> /app/entrypoint.sh && \
    echo 'su-exec nextjs node /app/server/ws-server.js &' >> /app/entrypoint.sh && \
    echo '# Start Next.js' >> /app/entrypoint.sh && \
    echo 'exec su-exec nextjs pnpm start' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]
