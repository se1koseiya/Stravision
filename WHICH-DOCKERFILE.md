# 选择正确的 Dockerfile - 决策树

## 🤔 我应该用哪个 Dockerfile?

```
开始
  │
  ├─ 你的服务器有多少内存?
  │
  ├─ 8GB 或更多
  │  └─> 使用 Dockerfile (标准版)
  │      命令: docker build -t berry-realm:latest .
  │      时间: 10-20分钟
  │      ✅ 推荐
  │
  ├─ 4GB 内存
  │  │
  │  ├─ 你能配置 Swap 吗?
  │  │
  │  ├─ 能
  │  │  └─> 使用 Dockerfile.low-memory
  │  │      命令: sudo bash setup-swap.sh
  │  │            ./docker-build.sh berry-realm low-memory
  │  │      时间: 20-40分钟
  │  │      ⚠️ 需要耐心
  │  │
  │  └─ 不能
  │     └─> 使用 Dockerfile.prebuilt (本地构建)
  │         命令: pnpm build
  │               docker build -t berry-realm:latest -f Dockerfile.prebuilt .
  │         时间: 5-10分钟 (本地) + 2-5分钟 (Docker)
  │         ✅ 最推荐
  │
  └─ 我已经在本地构建好了
     └─> 使用 Dockerfile.prebuilt
         命令: docker build -t berry-realm:latest -f Dockerfile.prebuilt .
         时间: 2-5分钟
         ✅ 最快
```

---

## 📋 快速参考

### Dockerfile (标准)

**什么时候用:**
- ✅ 服务器有 8GB+ 内存
- ✅ 想要完全自动化构建
- ✅ 不想本地构建

**命令:**
```bash
docker build -t berry-realm:latest .
```

**时间:** 10-20分钟

---

### Dockerfile.low-memory (低内存)

**什么时候用:**
- ✅ 服务器只有 4GB 内存
- ✅ 可以配置 Swap
- ✅ 可以等待较长时间

**命令:**
```bash
# 1. 配置 Swap (一次性)
sudo bash setup-swap.sh

# 2. 构建
./docker-build.sh berry-realm low-memory
```

**时间:** 20-40分钟

---

### Dockerfile.prebuilt (预构建)

**什么时候用:**
- ✅ 服务器内存不足
- ✅ 想要最快的构建
- ✅ 可以在本地构建

**命令:**
```bash
# 1. 本地构建
pnpm build

# 2. Docker 打包
docker build -t berry-realm:latest -f Dockerfile.prebuilt .
```

**时间:** 本地构建 5-10分钟 + Docker 2-5分钟

---

## ⚠️ 常见错误

### 错误 1: "/.next": not found

**你做了什么:**
```bash
docker build -t berry-realm:latest -f Dockerfile.prebuilt .
```

**问题:** 没有先运行 `pnpm build`

**解决:**
```bash
# 先构建
pnpm build

# 再 Docker
docker build -t berry-realm:latest -f Dockerfile.prebuilt .
```

---

### 错误 2: SIGKILL / 构建被杀死

**你做了什么:**
```bash
docker build -t berry-realm:latest .
```

**问题:** 服务器内存不足 (可能只有 4GB)

**解决:**
```bash
# 方案1: 使用低内存 Dockerfile
sudo bash setup-swap.sh
./docker-build.sh berry-realm low-memory

# 方案2: 本地构建
pnpm build
docker build -t berry-realm:latest -f Dockerfile.prebuilt .
```

---

### 错误 3: JavaScript heap out of memory

**你做了什么:**
```bash
pnpm build
```

**问题:** 本地内存不足

**解决:**
```bash
# 增加 Node.js 内存
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm build

# 或使用 webpack
export NODE_OPTIONS="--max-old-space-size=3072"
pnpm build --webpack
```

---

## 🎯 推荐方案

### 场景 1: 生产服务器 (8GB+)
```bash
docker build -t berry-realm:latest .
```

### 场景 2: 小型服务器 (4GB)
```bash
# 本地构建 (最推荐)
pnpm build
docker build -t berry-realm:latest -f Dockerfile.prebuilt .
```

### 场景 3: 开发测试
```bash
# 本地构建
pnpm build
docker build -t berry-realm:dev -f Dockerfile.prebuilt .
```

### 场景 4: CI/CD
```bash
# GitHub Actions 等自动构建
# 推送到 Registry
# 服务器拉取运行
```

---

## 💡 小贴士

1. **不确定用哪个?** 
   - 先试标准 Dockerfile
   - 如果失败，用 prebuilt

2. **构建很慢?**
   - 使用 prebuilt 方式
   - 或升级服务器内存

3. **经常构建?**
   - 配置 CI/CD
   - 自动构建推送

4. **内存不够?**
   - 配置 Swap
   - 或本地构建

---

## 📚 详细文档

- **Dockerfile 详解:** `DOCKERFILE-USAGE.md`
- **4GB 服务器:** `4GB-SERVER-GUIDE.md`
- **快速修复:** `4GB-QUICK-FIX.md`
- **错误参考:** `DOCKER_ERRORS_QUICK_FIX.md`

---

## ✅ 快速检查

**我应该用哪个?**

- [ ] 服务器 8GB+ → `Dockerfile`
- [ ] 服务器 4GB + 有 Swap → `Dockerfile.low-memory`
- [ ] 服务器 4GB + 无 Swap → `Dockerfile.prebuilt` (本地构建)
- [ ] 本地已构建 → `Dockerfile.prebuilt`
- [ ] 使用 CI/CD → 标准流程

**构建前检查:**

- [ ] 确认服务器内存
- [ ] 如果用 prebuilt，先 `pnpm build`
- [ ] 如果内存 < 8GB，配置 Swap
- [ ] Docker 有足够资源

**就这么简单!** 🚀
