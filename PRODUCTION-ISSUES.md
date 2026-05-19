# 生产环境问题排查指南

## 问题: AI Models 页面显示"加载数据失败"

### 症状
- 管理后台的 AI Models 标签页显示"加载数据失败"
- 控制台错误: `ENOENT: no such file or directory, open '/app/data/ai-models-config.json'`

### 原因
1. Docker 容器中 `data` 目录未正确复制
2. 文件权限不正确
3. 文件路径错误

---

## ✅ 已修复

### 1. API 路由增强
**文件:** `app/api/admin/ai-models/route.ts`

**改进:**
- ✅ 添加默认配置fallback
- ✅ 自动创建缺失的配置文件
- ✅ 更好的错误处理
- ✅ 权限错误友好提示

```typescript
// 如果文件不存在，自动创建默认配置
// 如果无法写入，返回只读的默认配置
```

### 2. Dockerfile 权限修复
**文件:** `Dockerfile`, `Dockerfile.low-memory`, `Dockerfile.prebuilt`

**改进:**
```dockerfile
# 复制 data 目录
COPY --from=builder /app/data ./data

# 设置正确的权限
RUN mkdir -p data && chown -R nextjs:nodejs data && chmod -R 755 data
```

---

## 🔍 验证修复

### 方法1: 检查容器中的文件

```bash
# 进入运行中的容器
docker exec -it <container-id> sh

# 检查文件是否存在
ls -la /app/data/

# 检查文件内容
cat /app/data/ai-models-config.json

# 检查权限
ls -la /app/data/ai-models-config.json

# 退出
exit
```

**预期输出:**
```
-rw-r--r-- 1 nextjs nodejs 2048 May 20 10:00 ai-models-config.json
```

### 方法2: 检查 API 响应

```bash
# 从容器内部测试
docker exec <container-id> wget -O- http://localhost:3000/api/admin/ai-models

# 或从外部测试
curl http://your-server:3000/api/admin/ai-models
```

**预期:** 返回 JSON 配置数据

### 方法3: 检查日志

```bash
# 查看容器日志
docker logs <container-id> | grep "AI Models"

# 实时查看
docker logs -f <container-id>
```

**预期:** 无错误，或看到 "Created default config file"

---

## 🚀 重新部署

### 步骤1: 重新构建镜像

```bash
# 删除旧镜像
docker rmi berry-realm:latest

# 重新构建
docker build -t berry-realm:latest .
```

### 步骤2: 停止并删除旧容器

```bash
# 停止容器
docker stop <container-id>

# 删除容器
docker rm <container-id>
```

### 步骤3: 启动新容器

```bash
docker run -d \
  --name berry-realm \
  -p 3000:3000 \
  -p 3002:3002 \
  berry-realm:latest
```

### 步骤4: 验证

```bash
# 检查容器状态
docker ps | grep berry-realm

# 检查日志
docker logs berry-realm

# 测试 API
curl http://localhost:3000/api/admin/ai-models
```

---

## 💡 使用 Volume 挂载 (推荐)

如果需要持久化配置或在生产环境中修改配置，使用 Volume 挂载：

### 方法1: 挂载整个 data 目录

```bash
docker run -d \
  --name berry-realm \
  -p 3000:3000 \
  -p 3002:3002 \
  -v /path/on/host/data:/app/data \
  berry-realm:latest
```

### 方法2: 只挂载配置文件

```bash
docker run -d \
  --name berry-realm \
  -p 3000:3000 \
  -p 3002:3002 \
  -v /path/on/host/ai-models-config.json:/app/data/ai-models-config.json \
  berry-realm:latest
```

### 方法3: 使用 Docker Compose

```yaml
version: '3.8'
services:
  web:
    image: berry-realm:latest
    ports:
      - "3000:3000"
      - "3002:3002"
    volumes:
      - ./data:/app/data
      - ./uploads:/app/public/uploads
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

**优点:**
- ✅ 配置持久化
- ✅ 可以在宿主机上直接编辑
- ✅ 容器重启不丢失数据

---

## 🔧 手动修复 (临时方案)

如果无法重新构建，可以手动修复运行中的容器：

### 步骤1: 复制配置文件到容器

```bash
# 从宿主机复制
docker cp ./data/ai-models-config.json <container-id>:/app/data/

# 设置权限
docker exec <container-id> chown nextjs:nodejs /app/data/ai-models-config.json
docker exec <container-id> chmod 644 /app/data/ai-models-config.json
```

### 步骤2: 重启容器

```bash
docker restart <container-id>
```

### 步骤3: 验证

```bash
docker logs <container-id>
curl http://localhost:3000/api/admin/ai-models
```

---

## 📊 故障排除流程图

```
加载数据失败
    │
    ├─ 检查文件是否存在
    │   ├─ 不存在 → 重新构建镜像
    │   └─ 存在 → 检查权限
    │
    ├─ 检查权限
    │   ├─ 权限错误 → 修复权限 (chmod 755)
    │   └─ 权限正确 → 检查文件内容
    │
    ├─ 检查文件内容
    │   ├─ 文件损坏 → 恢复默认配置
    │   └─ 文件正常 → 检查 API 路由
    │
    └─ 检查 API 路由
        ├─ API 错误 → 查看日志
        └─ API 正常 → 检查前端代码
```

---

## 🆘 常见错误

### 错误1: ENOENT (文件不存在)

**症状:**
```
Error: ENOENT: no such file or directory, open '/app/data/ai-models-config.json'
```

**解决:**
```bash
# 重新构建镜像
docker build -t berry-realm:latest .

# 或使用 Volume 挂载
docker run -v ./data:/app/data berry-realm:latest
```

---

### 错误2: EACCES (权限拒绝)

**症状:**
```
Error: EACCES: permission denied, open '/app/data/ai-models-config.json'
```

**解决:**
```bash
# 修复容器内权限
docker exec <container-id> chown -R nextjs:nodejs /app/data
docker exec <container-id> chmod -R 755 /app/data

# 或在 Dockerfile 中添加
RUN chmod -R 755 /app/data
```

---

### 错误3: 只读文件系统

**症状:**
```
Error: EROFS: read-only file system
```

**解决:**
```bash
# 使用 Volume 挂载可写目录
docker run -v /writable/path:/app/data berry-realm:latest

# 或在 docker-compose.yml 中
volumes:
  - ./data:/app/data
```

---

## 📝 最佳实践

### 开发环境
```bash
# 使用本地文件，方便调试
docker run -v $(pwd)/data:/app/data berry-realm:dev
```

### 生产环境
```bash
# 使用持久化 Volume
docker run -v /var/lib/berry-realm/data:/app/data berry-realm:prod

# 或使用 Docker Volume
docker volume create berry-realm-data
docker run -v berry-realm-data:/app/data berry-realm:prod
```

### 备份配置
```bash
# 定期备份配置文件
docker cp <container-id>:/app/data/ai-models-config.json ./backup/

# 或从 Volume 备份
cp /var/lib/berry-realm/data/ai-models-config.json ./backup/
```

---

## ✅ 检查清单

部署前:
- [ ] 确认 `data` 目录存在
- [ ] 确认配置文件存在
- [ ] 确认 Dockerfile 包含 COPY data 指令
- [ ] 确认权限设置正确

部署后:
- [ ] 容器启动成功
- [ ] API 返回正确数据
- [ ] 管理页面正常显示
- [ ] 可以保存配置 (如果需要)

---

## 📚 相关文档

- **运行时错误:** `DOCKER-RUNTIME-ERRORS.md`
- **Dockerfile 使用:** `DOCKERFILE-USAGE.md`
- **所有修复:** `ALL-FIXES-SUMMARY.md`

---

## 🎯 快速修复命令

```bash
# 一键修复脚本
docker exec <container-id> sh -c "
  mkdir -p /app/data && \
  chown -R nextjs:nodejs /app/data && \
  chmod -R 755 /app/data
"

# 验证
docker exec <container-id> ls -la /app/data/
curl http://localhost:3000/api/admin/ai-models
```

---

**现在 AI Models 页面应该可以正常加载了！** 🎉
