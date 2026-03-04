# 部署指南

## 本地开发环境

### 前置要求

- Node.js 20+
- Python 3.10+
- Windows: 需要启用开发者模式（用于符号链接支持）

### Windows 开发者模式

Next.js 16 使用 Turbopack，需要符号链接支持。在 Windows 上：

1. 打开 **设置** → **更新和安全** → **开发者选项**
2. 启用 **开发人员模式**
3. 或者以管理员身份运行 PowerShell

### 安装依赖

```bash
# 安装 Node.js 依赖
npm install --legacy-peer-deps

# 安装 Python 依赖
cd python_service
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows
# source venv/bin/activate   # Linux/Mac
pip install -r requirements.txt
```

### 启动开发服务器

**方式 1: 使用启动脚本**

```powershell
# Windows PowerShell
.\start-dev.ps1
```

**方式 2: 手动启动**

终端 1 - Python Voice Service:
```bash
cd python_service
python main.py
# 运行在 http://localhost:8000
```

终端 2 - Next.js Dev Server:
```bash
npm run dev
# 运行在 http://localhost:3000
```

### 环境变量

复制 `.env.example` 到 `.env.local` 并填写必要的值：

```bash
cp .env.example .env.local
```

关键变量：
- `DASHSCOPE_API_KEY`: 阿里云 DashScope API Key（语音功能必需）
- `JWT_SECRET`: JWT 密钥
- `MQTT_*`: MQTT 连接配置

---

## Docker 部署

### 生产环境部署

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 服务架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Nginx     │────▶│   Next.js   │     │   Voice     │
│  (80/443)   │     │   (3000)    │     │   (8000)    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                    app-network
```

### 环境变量配置

创建 `.env` 文件（用于 docker-compose）：

```bash
# 从 .env.local 复制
cp .env.local .env
```

### SSL 证书

将 SSL 证书放置在 `nginx/certs/` 目录：

```
nginx/certs/
├── stravision.cheesestrawberry.top_bundle.crt
└── stravision.cheesestrawberry.top.key
```

### 数据持久化

以下目录会被挂载以持久化数据：
- `./data`: SQLite 数据库
- `./public/uploads`: 用户上传文件

---

## 开发模式 Docker

如果只想在 Docker 中运行 Voice Service：

```bash
docker-compose -f docker-compose.dev.yml up -d
```

然后本地运行 Next.js：

```bash
npm run dev
```

---

## 故障排除

### Windows 符号链接错误

如果遇到 `create symlink` 错误：

1. 启用开发者模式
2. 或以管理员身份运行终端
3. 或在 Docker 中构建

### Voice Service 连接失败

1. 检查 `DASHSCOPE_API_KEY` 是否正确
2. 检查 Voice Service 是否运行在 8000 端口
3. 检查浏览器控制台的 WebSocket 错误

### 麦克风权限

- 确保使用 HTTPS 或 localhost
- 浏览器需要授予麦克风权限

---

## API 端点

### Next.js API

- `GET /api/xiaozhi/realtime` - WebSocket 代理到 DashScope

### Voice Service

- `GET /health` - 健康检查
- `GET /` - 服务信息
- `WS /ws/realtime` - WebSocket 代理
- `POST /webrtc/offer` - WebRTC offer（如果启用 FastRTC）
