# Docker 运行时错误修复指南

## 错误: ENOENT: no such file or directory, open '/app/data/ai-models-config.json'

### 问题描述
容器启动后报错，找不到 `data/ai-models-config.json` 或其他配置文件。

### 原因
Dockerfile 没有正确复制 `data` 目录到容器中。

---

## ✅ 已修复

所有 Dockerfile 已更新，现在会正确复制 `data` 目录：

- ✅ `Dockerfile` - 标准版本
- ✅ `Dockerfile.low-memory` - 低内存版本  
- ✅ `Dockerfile.prebuilt` - 预构建版本

### 修复内容

```dockerfile
# 在 runner 阶段添加
COPY --from=builder /app/data ./data
```

---

## 🔍 验证修复

### 方法1: 重新构建镜像

```bash
# 删除旧镜像
docker rmi berry-realm:latest

# 重新构建
docker build -t berry-realm:latest .

# 运行
docker run -p 3000:3000 -p 3002:3002 berry-realm:latest
```

### 方法2: 检查镜像内容

```bash
# 进入容器
docker run --rm -it berry-realm:latest sh

# 检查文件
ls -la /app/data/
cat /app/data/ai-models-config.json

# 退出
exit
```

### 方法3: 使用检查脚本

```bash
# 在容器中运行
docker run --rm berry-realm:latest sh -c "bash scripts/check-runtime-files.sh"
```

---

## 📋 必需的运行时文件

容器运行时需要以下文件：

### data 目录
- ✅ `data/ai-models-config.json` - AI 模型配置
- ✅ `data/ai-features-config.json` - AI 功能配置
- ✅ `data/announcements.json` - 公告配置
- ✅ `data/sessions.json` - 会话数据

### 其他必需文件
- ✅ `.next/` - Next.js 构建产物
- ✅ `server/ws-server.js` - WebSocket 服务器
- ✅ `.agents/` - AI 代理配置
- ✅ `public/` - 静态资源

---

## 🐳 Dockerfile 对比

### 修复前 (错误)

```dockerfile
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/server ./server
COPY --from=builder /app/.agents ./.agents
# ❌ 缺少 data 目录
```

### 修复后 (正确)

```dockerfile
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/server ./server
COPY --from=builder /app/.agents ./.agents
COPY --from=builder /app/data ./data  # ✅ 添加 data 目录
```

---

## 🔧 手动修复 (如果使用旧版 Dockerfile)

### 选项1: 使用 Volume 挂载

```bash
docker run \
  -p 3000:3000 \
  -p 3002:3002 \
  -v $(pwd)/data:/app/data \
  berry-realm:latest
```

### 选项2: 复制文件到运行中的容器

```bash
# 启动容器
docker run -d --name berry-realm -p 3000:3000 -p 3002:3002 berry-realm:latest

# 复制 data 目录
docker cp ./data berry-realm:/app/

# 重启容器
docker restart berry-realm
```

### 选项3: 更新 Dockerfile 并重新构建

```bash
# 1. 更新 Dockerfile (已在上面修复)
# 2. 重新构建
docker build -t berry-realm:latest .
```

---

## 🚀 推荐的构建流程

### 使用标准 Dockerfile

```bash
# 1. 确保 data 目录存在
ls -la data/

# 2. 构建镜像
docker build -t berry-realm:latest .

# 3. 验证
docker run --rm berry-realm:latest ls -la /app/data/

# 4. 运行
docker run -p 3000:3000 -p 3002:3002 berry-realm:latest
```

### 使用 Dockerfile.prebuilt

```bash
# 1. 本地构建
pnpm build

# 2. 确保 data 目录存在
ls -la data/

# 3. 构建镜像
docker build -t berry-realm:latest -f Dockerfile.prebuilt .

# 4. 运行
docker run -p 3000:3000 -p 3002:3002 berry-realm:latest
```

---

## 🔍 故障排除

### 问题: 文件仍然缺失

**检查 .dockerignore:**
```bash
cat .dockerignore | grep data
```

如果 `data` 被排除，从 .dockerignore 中删除它。

**检查文件是否存在:**
```bash
ls -la data/
```

如果文件不存在，从 git 恢复或创建默认配置。

### 问题: 权限错误

```bash
# 在 Dockerfile 中添加
RUN chown -R nextjs:nodejs /app/data
```

### 问题: 文件内容为空

```bash
# 检查文件内容
cat data/ai-models-config.json

# 如果为空，恢复默认配置
git checkout data/ai-models-config.json
```

---

## 📝 创建默认配置文件

如果配置文件丢失，可以创建默认版本：

### data/ai-models-config.json

```json
{
  "models": [
    {
      "id": "auto",
      "name": "智能模型 (Auto)",
      "description": "根据任务自动选择最佳模型",
      "category": "featured",
      "icon": "sparkles",
      "enabled": true,
      "order": 0
    }
  ],
  "categories": [
    {
      "id": "featured",
      "name": "精选国产模型",
      "order": 0
    }
  ]
}
```

### data/ai-features-config.json

```json
{
  "features": []
}
```

### data/announcements.json

```json
{
  "announcements": []
}
```

### data/sessions.json

```json
{
  "sessions": []
}
```

---

## ✅ 验证清单

构建前:
- [ ] `data` 目录存在
- [ ] 所有配置文件存在
- [ ] .dockerignore 不排除 data
- [ ] Dockerfile 包含 COPY data 指令

构建后:
- [ ] 镜像构建成功
- [ ] 容器可以启动
- [ ] 可以访问 http://localhost:3000
- [ ] 没有文件缺失错误

---

## 🆘 仍然有问题?

### 完全重新开始

```bash
# 1. 清理所有 Docker 资源
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
docker rmi berry-realm:latest

# 2. 确保文件存在
ls -la data/

# 3. 重新构建
docker build -t berry-realm:latest .

# 4. 运行
docker run -p 3000:3000 -p 3002:3002 berry-realm:latest
```

### 使用 Volume 作为临时方案

```bash
docker run \
  -p 3000:3000 \
  -p 3002:3002 \
  -v $(pwd)/data:/app/data:ro \
  berry-realm:latest
```

### 检查日志

```bash
# 查看容器日志
docker logs <container-id>

# 实时查看日志
docker logs -f <container-id>
```

---

## 📚 相关文档

- **Dockerfile 使用:** `DOCKERFILE-USAGE.md`
- **选择 Dockerfile:** `WHICH-DOCKERFILE.md`
- **4GB 服务器:** `4GB-SERVER-GUIDE.md`
- **错误参考:** `DOCKER_ERRORS_QUICK_FIX.md`
