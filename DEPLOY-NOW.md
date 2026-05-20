# 🚀 立即部署指南

本指南帮助你在 5 分钟内完成 Berry Realm v4.0 的 Docker 部署。

---

## ⚡ 快速开始

### 前置条件
- Docker 已安装
- 4GB+ 内存
- `.env.local` 文件已配置

### 一键部署

#### Windows PowerShell
```powershell
# 4GB 内存服务器
.\build-low-memory.ps1

# 8GB+ 内存服务器
docker build -t berry-realm:latest .
```

#### Linux/Mac
```bash
# 4GB 内存服务器
chmod +x build-low-memory.sh
./build-low-memory.sh

# 8GB+ 内存服务器
docker build -t berry-realm:latest .
```

### 运行容器
```bash
docker run -d \
  -p 3000:3000 \
  -p 3002:3002 \
  --name berry-realm \
  --env-file .env.local \
  --restart unless-stopped \
  berry-realm:latest
```

### 验证部署
```bash
# 检查容器状态
docker ps | grep berry-realm

# 检查日志
docker logs berry-realm

# 测试 Next.js 应用
curl http://localhost:3000

# 测试 WebSocket 服务
curl http://localhost:3002/health
```

---

## 🔧 环境变量配置

确保 `.env.local` 包含以下必需变量:

```env
# 数据库
DATABASE_URL=postgresql://user:password@host:5432/database

# AI 服务
DASHSCOPE_API_KEY=your_dashscope_key
SYSTEM_OPENAI_API_KEY=your_openai_key

# WebSocket 服务
WS_SERVER_PORT=3002
NEXT_SERVER_URL=http://localhost:3000

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=production
```

---

## 📦 Docker Compose (推荐)

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile.low-memory  # 或 Dockerfile
    ports:
      - "3000:3000"
      - "3002:3002"
    env_file:
      - .env.local
    restart: unless-stopped
    volumes:
      - ./data:/app/data
      - ./public/uploads:/app/public/uploads
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # 可选: PostgreSQL 数据库
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: berry_realm
      POSTGRES_USER: berry
      POSTGRES_PASSWORD: your_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

启动:
```bash
docker-compose up -d
```

---

## 🔍 故障排除

### 构建失败

#### 内存不足
```bash
# 检查可用内存
free -h  # Linux
docker info | grep Memory  # Docker

# 解决方案: 使用低内存构建
docker build -f Dockerfile.low-memory -t berry-realm:latest .
```

#### 依赖安装失败
```bash
# 清理缓存重试
docker builder prune -a
docker build --no-cache -t berry-realm:latest .
```

#### 网络超时
```bash
# 检查镜像源配置
cat .npmrc
# 应该包含: registry=https://registry.npmmirror.com
```

### 运行时错误

#### 端口被占用
```bash
# 检查端口占用
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Linux/Mac

# 解决方案: 更改端口
docker run -d -p 8000:3000 -p 8002:3002 ...
```

#### 数据库连接失败
```bash
# 检查数据库连接
docker exec berry-realm sh -c 'echo $DATABASE_URL'

# 测试连接
docker exec berry-realm sh -c 'psql $DATABASE_URL -c "SELECT 1"'
```

#### WebSocket 服务未启动
```bash
# 查看日志
docker logs berry-realm | grep "WebSocket Server"

# 应该看到:
# ========================================
#   WebSocket Server for Voice Service
# ========================================
#   URL: ws://localhost:3002
```

---

## 🎯 性能优化

### 内存优化
```bash
# 限制容器内存
docker run -d \
  --memory="3g" \
  --memory-swap="4g" \
  -p 3000:3000 \
  -p 3002:3002 \
  berry-realm:latest
```

### 日志管理
```bash
# 限制日志大小
docker run -d \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  berry-realm:latest
```

### 自动重启
```bash
# 容器崩溃自动重启
docker update --restart unless-stopped berry-realm
```

---

## 📊 监控和维护

### 查看资源使用
```bash
# 实时监控
docker stats berry-realm

# 查看详细信息
docker inspect berry-realm
```

### 备份数据
```bash
# 备份数据目录
docker cp berry-realm:/app/data ./backup/data-$(date +%Y%m%d)

# 备份上传文件
docker cp berry-realm:/app/public/uploads ./backup/uploads-$(date +%Y%m%d)
```

### 更新部署
```bash
# 1. 停止旧容器
docker stop berry-realm

# 2. 备份数据
docker cp berry-realm:/app/data ./backup/data-backup

# 3. 删除旧容器
docker rm berry-realm

# 4. 重新构建
docker build -t berry-realm:latest .

# 5. 启动新容器
docker run -d \
  -p 3000:3000 \
  -p 3002:3002 \
  --name berry-realm \
  --env-file .env.local \
  -v $(pwd)/backup/data-backup:/app/data \
  berry-realm:latest
```

---

## 🌐 生产环境部署

### 使用 Nginx 反向代理

创建 `nginx.conf`:
```nginx
upstream berry_realm {
    server localhost:3000;
}

upstream berry_ws {
    server localhost:3002;
}

server {
    listen 80;
    server_name your-domain.com;

    # Next.js 应用
    location / {
        proxy_pass http://berry_realm;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket 服务
    location /ws {
        proxy_pass http://berry_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

### 使用 HTTPS (Let's Encrypt)
```bash
# 安装 certbot
apt-get install certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d your-domain.com

# 自动续期
certbot renew --dry-run
```

---

## 📱 访问应用

部署成功后,访问:

- **主应用**: http://localhost:3000
- **AI 助手**: http://localhost:3000/ai-assistant
- **设备控制**: http://localhost:3000/device-control
- **数据监控**: http://localhost:3000/monitor
- **管理后台**: http://localhost:3000/admin

---

## 🆘 获取帮助

### 查看日志
```bash
# 实时日志
docker logs -f berry-realm

# 最近 100 行
docker logs --tail 100 berry-realm

# 保存日志到文件
docker logs berry-realm > berry-realm.log 2>&1
```

### 进入容器调试
```bash
# 进入容器
docker exec -it berry-realm sh

# 检查文件
ls -la /app/data
ls -la /app/.next

# 检查进程
ps aux | grep node
```

### 相关文档
- [Alpine Linux 修复指南](./ALPINE-LINUX-FIX.md)
- [4GB 服务器指南](./4GB-SERVER-GUIDE.md)
- [所有修复总结](./ALL-FIXES-SUMMARY.md)

---

## ✅ 部署检查清单

部署完成后,确认以下项目:

- [ ] Docker 容器运行中 (`docker ps`)
- [ ] Next.js 应用可访问 (http://localhost:3000)
- [ ] WebSocket 服务健康 (http://localhost:3002/health)
- [ ] 用户可以登录
- [ ] AI 对话功能正常
- [ ] 语音助手可用
- [ ] 设备控制响应
- [ ] 数据监控显示
- [ ] 文件上传成功
- [ ] 数据库连接正常

---

**祝部署顺利! 🎉**
