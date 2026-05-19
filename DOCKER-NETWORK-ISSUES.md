# Docker 构建网络问题解决方案

## 问题: pnpm install 失败 - git fetch 错误

### 症状
```
ERROR Command failed with exit code 128: git fetch --depth 1 origin
fatal: unable to access 'https://github.com/ai/react.git/': OpenSSL SSL_read: OpenSSL/3.5.6: error:1A000126:SSL routines::unexpected eof while reading
```

### 原因
1. GitHub 依赖 `@nanostores/react: "github:ai/react"` 无法访问
2. 网络不稳定或被防火墙阻止
3. SSL 证书问题

---

## 解决方案

### 方案1: 使用 npm 镜像版本 (推荐)

替换 GitHub 依赖为 npm 版本：

```json
{
  "dependencies": {
    "@nanostores/react": "^0.7.3"
  }
}
```

**步骤:**

```bash
# 1. 删除 GitHub 依赖
pnpm remove @nanostores/react

# 2. 安装 npm 版本
pnpm add @nanostores/react@^0.7.3

# 3. 重新构建
docker build -t berry-realm:latest .
```

---

### 方案2: 配置 Git 使用 HTTP 代理

如果必须使用 GitHub 依赖：

**在 Dockerfile 中添加:**

```dockerfile
# 在 deps 阶段添加
FROM base AS deps
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
    apk add --no-cache libc6-compat python3 make g++ git

# 配置 git 使用更宽松的 SSL
RUN git config --global http.sslVerify false && \
    git config --global http.postBuffer 524288000

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm config set registry https://registry.npmmirror.com && \
    pnpm install --frozen-lockfile --no-optional || \
    pnpm install --no-frozen-lockfile --no-optional
```

---

### 方案3: 使用 Gitee 镜像

如果在中国大陆，使用 Gitee 镜像：

```json
{
  "dependencies": {
    "@nanostores/react": "git+https://gitee.com/mirrors/nanostores-react.git"
  }
}
```

---

### 方案4: 本地缓存依赖

**步骤1: 本地安装依赖**

```bash
# 在本地机器上
pnpm install
```

**步骤2: 使用 Dockerfile.prebuilt**

```bash
# 本地构建
pnpm build

# 使用预构建 Dockerfile
docker build -t berry-realm:latest -f Dockerfile.prebuilt .
```

---

### 方案5: 增加重试和超时

**更新 Dockerfile:**

```dockerfile
COPY package.json pnpm-lock.yaml .npmrc ./

# 配置 pnpm 和 git
RUN pnpm config set registry https://registry.npmmirror.com && \
    pnpm config set network-timeout 300000 && \
    git config --global http.postBuffer 524288000 && \
    git config --global http.lowSpeedLimit 0 && \
    git config --global http.lowSpeedTime 999999

# 安装依赖，带重试
RUN pnpm install --frozen-lockfile --no-optional || \
    pnpm install --frozen-lockfile --no-optional || \
    pnpm install --no-frozen-lockfile --no-optional
```

---

## 快速修复 (推荐)

### 步骤1: 替换 GitHub 依赖

编辑 `package.json`:

```json
{
  "dependencies": {
    "@nanostores/react": "^0.7.3"
  }
}
```

### 步骤2: 更新 lockfile

```bash
pnpm install
```

### 步骤3: 重新构建

```bash
docker build -t berry-realm:latest .
```

---

## 验证修复

### 检查依赖来源

```bash
# 查看 package.json
cat package.json | grep nanostores

# 应该显示:
# "@nanostores/react": "^0.7.3"
# 而不是:
# "@nanostores/react": "github:ai/react"
```

### 测试本地安装

```bash
# 删除 node_modules
rm -rf node_modules

# 重新安装
pnpm install

# 应该成功，无 git fetch 错误
```

### 测试 Docker 构建

```bash
docker build -t berry-realm:test .
```

---

## 其他网络问题

### 问题: npm 镜像慢

**解决:**

```bash
# 使用淘宝镜像
pnpm config set registry https://registry.npmmirror.com

# 或在 .npmrc 中设置
echo "registry=https://registry.npmmirror.com/" > .npmrc
```

### 问题: Docker 拉取镜像慢

**解决:**

```bash
# 使用国内镜像源
# 编辑 /etc/docker/daemon.json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://mirror.ccs.tencentyun.com"
  ]
}

# 重启 Docker
sudo systemctl restart docker
```

### 问题: 构建超时

**解决:**

```dockerfile
# 增加超时时间
RUN pnpm config set network-timeout 600000 && \
    pnpm install --frozen-lockfile
```

---

## 完整的优化 Dockerfile

```dockerfile
FROM docker.m.daocloud.io/node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

FROM base AS deps
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
    apk add --no-cache libc6-compat python3 make g++ git
WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./

# 配置 pnpm 和 git
RUN pnpm config set registry https://registry.npmmirror.com && \
    pnpm config set network-timeout 300000 && \
    git config --global http.postBuffer 524288000 && \
    git config --global http.sslVerify false

# 安装依赖，带重试和 fallback
RUN pnpm install --frozen-lockfile --no-optional || \
    pnpm install --frozen-lockfile --no-optional || \
    pnpm install --no-frozen-lockfile --no-optional

# ... 其余部分保持不变
```

---

## 故障排除流程

```
git fetch 失败
    │
    ├─ 检查是否有 GitHub 依赖
    │   ├─ 有 → 替换为 npm 版本
    │   └─ 无 → 检查网络
    │
    ├─ 检查网络连接
    │   ├─ 无法访问 GitHub → 使用镜像或本地构建
    │   └─ 网络正常 → 检查 SSL 配置
    │
    ├─ 配置 Git SSL
    │   └─ git config --global http.sslVerify false
    │
    └─ 增加重试和超时
        └─ pnpm config set network-timeout 300000
```

---

## 最佳实践

### 生产环境
1. ✅ 避免使用 GitHub 依赖
2. ✅ 使用 npm registry 版本
3. ✅ 配置国内镜像源
4. ✅ 增加网络超时时间
5. ✅ 添加重试机制

### 开发环境
1. ✅ 本地先安装依赖
2. ✅ 使用 Dockerfile.prebuilt
3. ✅ 配置 Git 代理（如需要）

---

## 相关文档

- **Docker 构建:** `DOCKER_BUILD_FIX.md`
- **4GB 服务器:** `4GB-SERVER-GUIDE.md`
- **所有修复:** `ALL-FIXES-SUMMARY.md`
