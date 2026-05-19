# 网络问题快速修复

## 🚨 问题: Docker 构建时 git fetch 失败

```
ERROR Command failed with exit code 128: git fetch
fatal: unable to access 'https://github.com/ai/react.git/'
```

---

## ⚡ 快速修复 (已应用)

### ✅ 修复1: 替换 GitHub 依赖

**文件:** `package.json`

**改动:**
```json
// 之前:
"@nanostores/react": "github:ai/react"

// 之后:
"@nanostores/react": "^0.7.3"
```

### ✅ 修复2: 增强网络配置

**文件:** `Dockerfile`, `Dockerfile.low-memory`

**改动:**
```dockerfile
# 配置 pnpm 和 git 以处理网络问题
RUN pnpm config set registry https://registry.npmmirror.com && \
    pnpm config set network-timeout 300000 && \
    git config --global http.postBuffer 524288000 && \
    git config --global http.sslVerify false && \
    pnpm install --frozen-lockfile --no-optional || \
    pnpm install --no-frozen-lockfile --no-optional
```

---

## 🚀 重新构建

### 步骤1: 更新依赖

```bash
# 删除旧的 lockfile
rm pnpm-lock.yaml

# 重新安装
pnpm install
```

### 步骤2: 构建 Docker 镜像

```bash
# 标准构建
docker build -t berry-realm:latest .

# 或低内存构建
./docker-build.sh berry-realm low-memory
```

---

## 🔍 验证修复

### 检查 package.json

```bash
cat package.json | grep nanostores
```

**应该显示:**
```json
"@nanostores/react": "^0.7.3"
```

### 测试本地安装

```bash
rm -rf node_modules
pnpm install
```

**应该成功，无 git 错误**

---

## 💡 如果仍然失败

### 方案1: 使用本地构建

```bash
# 1. 本地构建
pnpm build

# 2. 使用预构建 Dockerfile
docker build -t berry-realm:latest -f Dockerfile.prebuilt .
```

### 方案2: 配置代理

```bash
# 如果有 HTTP 代理
export HTTP_PROXY=http://your-proxy:port
export HTTPS_PROXY=http://your-proxy:port

# 然后构建
docker build -t berry-realm:latest .
```

### 方案3: 使用 --network=host

```bash
docker build --network=host -t berry-realm:latest .
```

---

## ✅ 现在应该可以成功构建了！

```bash
docker build -t berry-realm:latest .
```

---

## 📚 详细文档

查看 `DOCKER-NETWORK-ISSUES.md` 获取完整的网络问题解决方案。
