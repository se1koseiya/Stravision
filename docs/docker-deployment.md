# Docker 部署指南

## 环境变量配置

在部署到 Docker 之前，您需要在项目根目录创建一个 `.env` 文件来配置环境变量。

### 步骤 1: 创建 `.env` 文件

在项目根目录创建 `.env` 文件（与 `docker-compose.yml` 同级），并添加以下内容：

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# DashScope AI Configuration
DASHSCOPE_API_KEY=your-dashscope-api-key

# MQTT Configuration
MQTT_HOST=your-mqtt-broker-host
MQTT_PORT=8883
MQTT_USERNAME=your-mqtt-username
MQTT_PASSWORD=your-mqtt-password
MQTT_SUBSCRIBE_TOPIC=stravision/sensors/#
MQTT_PUBLISH_TOPIC=stravision/control
MQTT_USE_SSL=true
MQTT_KEEPALIVE=60
MQTT_RECONNECT_PERIOD=1000

# Weather API Configuration
WEATHER_API_KEY=your-weather-api-key

# WeChat Configuration (Optional)
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret

# Database Configuration
DATABASE_URL=postgresql://postgres:password@db:5432/stravision

# Node Environment
NODE_ENV=production
```

### 步骤 2: 替换配置值

将上面的占位符替换为您的实际配置值：

- **JWT_SECRET**: 生成一个强密码，例如使用 `openssl rand -base64 32`
- **DASHSCOPE_API_KEY**: 您的阿里云 DashScope API 密钥
- **MQTT_HOST**: MQTT 服务器地址（例如：`mqtt.example.com` 或 HiveMQ Cloud 地址）
- **MQTT_USERNAME**: MQTT 用户名
- **MQTT_PASSWORD**: MQTT 密码
- **WEATHER_API_KEY**: 天气 API 密钥

### 步骤 3: 从 `.env.local` 复制配置

如果您已经有 `.env.local` 文件，可以将其内容复制到 `.env` 文件中：

```bash
# 在项目根目录执行
cp .env.local .env
```

### 步骤 4: 部署到 Docker

```bash
# 构建并启动容器
docker-compose up -d --build

# 查看日志
docker-compose logs -f web

# 停止容器
docker-compose down
```

## 安全提示

⚠️ **重要**: `.env` 文件包含敏感信息，请确保：

1. **不要提交到 Git**: `.env` 文件已经在 `.gitignore` 中
2. **服务器安全**: 确保服务器文件权限正确设置
3. **定期更换密钥**: 定期更新 JWT_SECRET 和其他敏感密钥

## 常见问题

### Q: 为什么开发环境用 `.env.local` 而生产环境用 `.env`？

A: Next.js 会按以下优先级加载环境变量：
1. `.env.local` (本地开发，被 gitignore)
2. `.env.production` (生产环境特定)
3. `.env.development` (开发环境特定)
4. `.env` (通用环境变量)

Docker Compose 默认只读取 `.env` 文件，所以部署时需要创建 `.env` 文件。

### Q: 如何在云服务器上安全管理环境变量？

您有以下几种选择：

**方案 1: 使用 `.env` 文件 (推荐用于简单部署)**
```bash
# 在服务器上创建 .env 文件
nano .env
# 粘贴配置后保存
# 设置文件权限
chmod 600 .env
```

**方案 2: 使用 Docker secrets (推荐用于生产环境)**
```yaml
# docker-compose.yml
services:
  web:
    secrets:
      - mqtt_password
secrets:
  mqtt_password:
    file: ./secrets/mqtt_password.txt
```

**方案 3: 直接在 docker-compose.yml 中设置 (不推荐)**
```yaml
services:
  web:
    environment:
      - MQTT_HOST=actual-host.com
      - MQTT_USERNAME=actual-username
      # ... 其他配置
```

### Q: 如何验证配置是否正确？

```bash
# 查看容器日志
docker-compose logs -f web

# 检查环境变量是否加载
docker-compose exec web printenv | grep MQTT
```

## 参考文档

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Docker Compose Environment Variables](https://docs.docker.com/compose/environment-variables/)
