# Dockerfile 使用指南

## 📋 可用的 Dockerfile

| 文件 | 用途 | 内存需求 | 构建时间 | 使用场景 |
|------|------|----------|----------|----------|
| `Dockerfile` | 标准构建 | 10GB | 10-20分钟 | 8GB+服务器 |
| `Dockerfile.low-memory` | 低内存构建 | 4GB+Swap | 20-40分钟 | 4GB服务器 |
| `Dockerfile.prebuilt` | 预构建 | 2GB | 2-5分钟 | 本地已构建 |

---

## 🎯 选择正确的 Dockerfile

### 场景1: 8GB+ 内存服务器 (推荐)

使用 `Dockerfile` (标准版本)

```bash
docker build -t berry-realm:latest .
```

**特点:**
- ✅ 构建速度快
- ✅ 使用 Turbopack
- ✅ 内存限制 8GB

---

### 场景2: 4GB 内存服务器

使用 `Dockerfile.low-memory`

```bash
# 方法1: 使用脚本
./docker-build.sh berry-realm low-memory

# 方法2: 手动构建
docker build \
  --memory=3.5g \
  --memory-swap=7g \
  -t berry-realm:latest \
  -f Dockerfile.low-memory \
  .
```

**前提条件:**
- ⚠️ 必须配置 4GB Swap
- ⚠️ 构建时间较长 (20-40分钟)

**配置 Swap:**
```bash
sudo bash setup-swap.sh
```

---

### 场景3: 本地已构建 (最快)

使用 `Dockerfile.prebuilt`

**步骤:**

```bash
# 1. 本地构建
pnpm build

# 2. 验证构建产物存在
ls -la .next

# 3. 使用 prebuilt Dockerfile
docker build -t berry-realm:latest -f Dockerfile.prebuilt .
```

**特点:**
- ✅ 最快 (2-5分钟)
- ✅ 内存需求低
- ✅ 适合本地开发

**注意:**
- ❌ 必须先运行 `pnpm build`
- ❌ 如果没有 `.next` 目录会失败

---

## 🚀 快速开始

### 如果你有 8GB+ 内存

```bash
docker build -t berry-realm:latest .
docker run -p 3000:3000 -p 3002:3002 berry-realm:latest
```

### 如果你只有 4GB 内存

```bash
# 1. 配置 Swap (一次性)
sudo bash setup-swap.sh

# 2. 构建
./docker-build.sh berry-realm low-memory

# 3. 运行
docker run -p 3000:3000 -p 3002:3002 berry-realm:latest
```

### 如果你想本地构建

```bash
# 1. 本地构建
pnpm build

# 2. Docker 打包
docker build -t berry-realm:latest -f Dockerfile.prebuilt .

# 3. 运行
docker run -p 3000:3000 -p 3002:3002 berry-realm:latest
```

---

## 🔍 详细对比

### Dockerfile (标准)

**优点:**
- ✅ 构建速度快 (10-20分钟)
- ✅ 使用 Turbopack (最新技术)
- ✅ 完全自动化

**缺点:**
- ⚠️ 需要 10GB 内存
- ⚠️ 不适合小内存服务器

**配置:**
```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=3072"  # 3GB
RUN pnpm build --webpack || pnpm build
```

---

### Dockerfile.low-memory (低内存)

**优点:**
- ✅ 适合 4GB 服务器
- ✅ 使用 Webpack (更省内存)
- ✅ 完全自动化

**缺点:**
- ⚠️ 构建时间长 (20-40分钟)
- ⚠️ 必须配置 Swap
- ⚠️ 可能仍会失败

**配置:**
```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=3072"  # 3GB
RUN pnpm build --webpack
```

---

### Dockerfile.prebuilt (预构建)

**优点:**
- ✅ 最快 (2-5分钟)
- ✅ 内存需求低 (2GB)
- ✅ 100% 成功率

**缺点:**
- ⚠️ 需要本地先构建
- ⚠️ 两步流程

**使用场景:**
- 本地开发测试
- CI/CD 流水线
- 构建服务器分离

---

## 🛠️ 故障排除

### 错误: "/.next": not found

**原因:** 使用了 `Dockerfile.prebuilt` 但没有本地构建

**解决:**
```bash
# 方法1: 先本地构建
pnpm build
docker build -t berry-realm:latest -f Dockerfile.prebuilt .

# 方法2: 使用标准 Dockerfile
docker build -t berry-realm:latest .
```

---

### 错误: SIGKILL / 构建被杀死

**原因:** 内存不足

**解决:**
```bash
# 方法1: 使用低内存 Dockerfile
sudo bash setup-swap.sh  # 配置 Swap
./docker-build.sh berry-realm low-memory

# 方法2: 本地构建
pnpm build
docker build -t berry-realm:latest -f Dockerfile.prebuilt .

# 方法3: 增加 Docker 内存
# Docker Desktop → Settings → Resources → Memory: 12GB
```

---

### 错误: JavaScript heap out of memory

**原因:** Node.js 内存限制太低

**解决:**
```bash
# 临时增加内存
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm build

# 或使用低内存构建
./docker-build.sh berry-realm low-memory
```

---

## 📊 性能对比

### 构建时间

| Dockerfile | 首次构建 | 缓存构建 | 内存峰值 |
|------------|----------|----------|----------|
| 标准 | 10-20分钟 | 2-5分钟 | 6-8GB |
| 低内存 | 20-40分钟 | 5-10分钟 | 3-4GB |
| 预构建 | 2-5分钟 | 1-2分钟 | 1-2GB |

### 镜像大小

所有 Dockerfile 生成的镜像大小相同: **~1-2GB**

---

## 💡 最佳实践

### 开发环境

```bash
# 本地构建 + 预构建 Dockerfile
pnpm build
docker build -t berry-realm:dev -f Dockerfile.prebuilt .
```

### 生产环境 (8GB+ 服务器)

```bash
# 标准 Dockerfile
docker build -t berry-realm:prod .
```

### 生产环境 (4GB 服务器)

```bash
# 方案1: 低内存 Dockerfile
sudo bash setup-swap.sh
./docker-build.sh berry-realm low-memory

# 方案2: CI/CD 构建 + 推送镜像
# 在 GitHub Actions 等构建，推送到 Registry
# 服务器直接拉取镜像
```

---

## 🎯 推荐方案

### 如果你的服务器有 8GB+ 内存
```bash
docker build -t berry-realm:latest .
```

### 如果你的服务器只有 4GB 内存
```bash
# 本地构建 (推荐)
pnpm build
docker build -t berry-realm:latest -f Dockerfile.prebuilt .

# 或配置 Swap 后构建
sudo bash setup-swap.sh
./docker-build.sh berry-realm low-memory
```

### 如果你使用 CI/CD
```bash
# GitHub Actions 等构建
# 推送到 Docker Registry
# 服务器拉取运行
docker pull your-registry/berry-realm:latest
docker run -p 3000:3000 -p 3002:3002 your-registry/berry-realm:latest
```

---

## 📚 相关文档

- **4GB 服务器:** `4GB-SERVER-GUIDE.md`
- **快速修复:** `4GB-QUICK-FIX.md`
- **Docker 构建:** `DOCKER_BUILD_FIX.md`
- **快速开始:** `DOCKER_QUICK_START.md`

---

## ✅ 检查清单

构建前检查:

- [ ] 确定服务器内存大小
- [ ] 选择正确的 Dockerfile
- [ ] 如果使用 prebuilt，先运行 `pnpm build`
- [ ] 如果内存 < 8GB，配置 Swap
- [ ] 确保 Docker 有足够资源

构建后验证:

- [ ] 镜像构建成功
- [ ] 镜像大小合理 (~1-2GB)
- [ ] 容器能正常启动
- [ ] 应用可以访问

---

## 🆘 需要帮助?

1. 查看 `4GB-QUICK-FIX.md` 快速解决方案
2. 查看 `4GB-SERVER-GUIDE.md` 详细指南
3. 查看 `DOCKER_ERRORS_QUICK_FIX.md` 错误参考
