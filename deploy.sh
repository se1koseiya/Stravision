#!/bin/bash

set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker 未安装，请先安装 Docker"
  exit 1
fi

if command -v docker-compose >/dev/null 2>&1; then
  DC_CMD=(docker-compose)
elif docker compose version >/dev/null 2>&1; then
  DC_CMD=(docker compose)
else
  echo "Docker Compose 未安装，请先安装 Docker Compose"
  exit 1
fi

if [ ! -f .env ]; then
  if [ -f .env.local ]; then
    cp .env.local .env
  else
    echo "缺少 .env 或 .env.local，请先准备环境变量文件"
    exit 1
  fi
fi

set -a
. ./.env
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -n "${POSTGRES_USER:-}" ] && [ -n "${POSTGRES_PASSWORD:-}" ] && [ -n "${POSTGRES_DB:-}" ]; then
    export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}"
  else
    echo "缺少 DATABASE_URL 或 POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB"
    exit 1
  fi
fi

required_vars=(
  JWT_SECRET
  DASHSCOPE_API_KEY
  MQTT_HOST
  MQTT_PORT
  MQTT_USERNAME
  MQTT_PASSWORD
  MQTT_SUBSCRIBE_TOPIC
  MQTT_PUBLISH_TOPIC
  WEATHER_API_KEY
  SYSTEM_OPENAI_API_KEY
  SYSTEM_OPENAI_BASE_URL
)

missing_vars=()
for var in "${required_vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    missing_vars+=("$var")
  fi
done

if [ "${#missing_vars[@]}" -gt 0 ]; then
  echo "缺少必要环境变量: ${missing_vars[*]}"
  exit 1
fi

if [ ! -f nginx/certs/stravision.cheesestrawberry.top_bundle.crt ] || [ ! -f nginx/certs/stravision.cheesestrawberry.top.key ]; then
  if command -v openssl >/dev/null 2>&1; then
    mkdir -p nginx/certs
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout nginx/certs/stravision.cheesestrawberry.top.key \
      -out nginx/certs/stravision.cheesestrawberry.top_bundle.crt \
      -subj "/C=CN/ST=Shanghai/L=Shanghai/O=Stravision/OU=IT/CN=stravision.cheesestrawberry.top"
  else
    echo "缺少 Nginx 证书且未安装 openssl"
    exit 1
  fi
fi

echo "🧹 清理 Docker 缓存..."

"${DC_CMD[@]}" down --remove-orphans 2>/dev/null || true

docker rmi stravision-iot-platform_web 2>/dev/null || true
docker rmi stravision-iot-platform-web 2>/dev/null || true

docker builder prune -f
docker system prune -f
docker image prune -f

echo "✅ 缓存清理完成"
echo ""
echo "🔨 开始构建..."

"${DC_CMD[@]}" build --no-cache

echo ""
echo "🚀 启动服务..."

"${DC_CMD[@]}" up -d

echo ""
echo "✅ 部署完成！"
echo ""
echo "📊 查看日志: ${DC_CMD[*]} logs -f"
