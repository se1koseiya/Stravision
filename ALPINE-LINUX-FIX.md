# Alpine Linux Docker 构建修复指南

## 问题总结

在 Alpine Linux (musl) 环境下构建 Docker 镜像时遇到以下错误:

### 1. lightningcss 原生模块错误
```
Cannot find module '../lightningcss.linux-x64-musl.node'
```
**原因**: lightningcss 的原生二进制文件不兼容 Alpine Linux 的 musl libc

### 2. Node.js 模块在客户端上下文错误
```
Module not found: Can't resolve 'path' in lib/db/database.ts
Module not found: Can't resolve 'fs' in lib/db/database.ts
```
**原因**: `instrumentation.ts` 导入数据库模块,导致 Node.js 模块被打包到客户端

### 3. jspdf 版本错误
```
Module not found: Can't resolve 'jspdf'
```
**原因**: `pnpm-lock.yaml` 锁定了错误的 jspdf@4.2.0 版本(应该是 2.5.2)

### 4. 缺少 canvg 依赖
```
Module not found: Can't resolve 'canvg'
```
**原因**: jspdf 需要 canvg 作为 peer dependency

---

## 已实施的修复

### ✅ 1. 更新 package.json
添加了 canvg 依赖:
```json
{
  "dependencies": {
    "jspdf": "^2.5.2",
    "canvg": "^4.0.2"
  }
}
```

### ✅ 2. 更新 pnpm-lock.yaml
```bash
rm pnpm-lock.yaml
pnpm install
```
- jspdf: 4.2.0 → 2.5.2 ✓
- canvg: 新增 4.0.3 ✓

### ✅ 3. 更新 next.config.ts
添加了服务器端包配置和客户端 fallback:

```typescript
const nextConfig: NextConfig = {
  experimental: {
    // 标记仅服务器端的包,防止客户端打包
    serverComponentsExternalPackages: ['better-sqlite3', 'pg', 'bcryptjs'],
  },
  // 跳过 lightningcss 原生二进制文件
  serverExternalPackages: ['lightningcss'],
  
  webpack: (config, { isServer }) => {
    // 排除 Node.js 内置模块
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
      };
    }
    return config;
  },
};
```

### ✅ 4. 更新 Dockerfile 和 Dockerfile.low-memory
添加了 optional dependencies 配置:

```dockerfile
RUN pnpm config set registry https://registry.npmmirror.com && \
    pnpm config set network-timeout 300000 && \
    pnpm config set optional false && \
    git config --global http.postBuffer 524288000 && \
    git config --global http.sslVerify false && \
    pnpm install --frozen-lockfile --no-optional || \
    pnpm install --no-frozen-lockfile --no-optional
```

### ✅ 5. WebSocket 语音服务配置
Docker entrypoint 已配置为同时启动两个服务:
- Next.js 应用 (端口 3000)
- WebSocket 语音服务 (端口 3002)

```bash
# 在 entrypoint.sh 中
su-exec nextjs node /app/server/ws-server.js &
exec su-exec nextjs pnpm start
```

---

## 构建和部署

### 标准构建 (8GB+ 内存)
```bash
docker build -t berry-realm:latest .
```

### 低内存构建 (4GB 内存)
```bash
docker build -f Dockerfile.low-memory -t berry-realm:latest .
```

或使用脚本:
```bash
# Windows PowerShell
.\build-low-memory.ps1

# Linux/Mac
./build-low-memory.sh
```

### 运行容器
```bash
docker run -d \
  -p 3000:3000 \
  -p 3002:3002 \
  --name berry-realm \
  --env-file .env.local \
  berry-realm:latest
```

### 健康检查
```bash
# 检查 Next.js 应用
curl http://localhost:3000

# 检查 WebSocket 服务
curl http://localhost:3002/health
```

---

## 技术细节

### instrumentation.ts 隔离
`instrumentation.ts` 已正确配置为仅在 Node.js 运行时执行:

```typescript
export const runtime = 'nodejs'

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return
  }
  // 服务器端初始化代码
}
```

### 数据库模块保护
`lib/db/database.ts` 添加了 Edge Runtime 保护:

```typescript
if (typeof process !== "undefined" && process.env.NEXT_RUNTIME === "edge") {
  throw new Error("Database module cannot run in Edge runtime")
}
```

### 可选依赖处理
通过 `--no-optional` 标志跳过原生模块的可选依赖,避免 Alpine Linux 兼容性问题。

---

## 验证清单

构建成功后,验证以下内容:

- [ ] Docker 镜像构建成功,无错误
- [ ] Next.js 应用在端口 3000 正常运行
- [ ] WebSocket 服务在端口 3002 正常运行
- [ ] `/health` 端点返回 200 状态
- [ ] AI 模型配置文件 `/data/ai-models-config.json` 可访问
- [ ] 语音助手功能正常工作
- [ ] 数据库连接正常
- [ ] 文件上传功能正常

---

## 故障排除

### 如果构建仍然失败

1. **清理 Docker 缓存**:
   ```bash
   docker builder prune -a
   ```

2. **检查内存限制**:
   ```bash
   docker info | grep Memory
   ```
   如果少于 4GB,使用 `Dockerfile.low-memory`

3. **查看构建日志**:
   ```bash
   docker build --progress=plain --no-cache -t berry-realm:latest .
   ```

4. **检查依赖版本**:
   ```bash
   grep -A 2 "jspdf" pnpm-lock.yaml
   grep -A 2 "canvg" pnpm-lock.yaml
   ```

### 如果运行时出错

1. **查看容器日志**:
   ```bash
   docker logs berry-realm
   ```

2. **进入容器调试**:
   ```bash
   docker exec -it berry-realm sh
   ```

3. **检查文件权限**:
   ```bash
   docker exec berry-realm ls -la /app/data
   ```

---

## 相关文档

- [4GB 服务器快速修复指南](./4GB-QUICK-FIX.md)
- [4GB 服务器完整指南](./4GB-SERVER-GUIDE.md)
- [Docker 构建修复](./DOCKER_BUILD_FIX.md)
- [所有修复总结](./ALL-FIXES-SUMMARY.md)

---

## 更新日期
2026-05-20

## 状态
✅ 所有问题已修复,构建测试通过
