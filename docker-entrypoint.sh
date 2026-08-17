#!/bin/sh
set -e

mkdir -p /app/public/uploads
chown -R nextjs:nodejs /app/public/uploads
chown -R nextjs:nodejs /app/data
# 文档库：docs 目录（挂载或镜像内置）授权 nextjs 写入，manifest 文件同样可写
mkdir -p /app/docs
chown -R nextjs:nodejs /app/docs 2>/dev/null || true
chown nextjs:nodejs /app/lib/blog/docs-manifest.json 2>/dev/null || true

# Start WebSocket server in background with auto-restart
(
  while true; do
    echo "[Entrypoint] Starting WebSocket server..."
    su-exec nextjs node /app/server/ws-server.js 2>&1
    echo "[Entrypoint] WebSocket server exited, restarting in 3s..."
    sleep 3
  done
) &

# Wait for WS server to be ready
i=0
while [ $i -lt 10 ]; do
  if wget -q -O- http://localhost:3002/health >/dev/null 2>&1; then
    echo "[Entrypoint] WebSocket server is ready"
    break
  fi
  i=$((i + 1))
  echo "[Entrypoint] Waiting for WebSocket server... ($i/10)"
  sleep 1
done

# Start Next.js
exec su-exec nextjs pnpm start
