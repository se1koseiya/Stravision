# 域名访问问题修复指南

## 问题症状
- 通过 IP 访问稳定，通过域名访问不稳定
- HTTP 418 错误（I'm a teapot）
- 3D 模型加载失败
- 连接频繁断开

## 根本原因分析

### 1. HTTP 418 错误
这个错误通常由以下原因引起：
- **Cloudflare Bot 检测**：Cloudflare 的 bot 管理功能可能误判正常请求
- **CDN 缓存问题**：CDN 层缓存了错误响应
- **反向代理配置**：Nginx 缓冲区设置不当

### 2. 3D 模型加载失败
- **CSP 策略过严**：内容安全策略阻止了资源加载
- **CORS 配置缺失**：跨域资源共享配置不完整
- **超时设置过短**：大文件加载超时

### 3. 连接不稳定
- **缓冲区设置不当**：Nginx 缓冲区太小
- **超时配置过短**：连接过早断开
- **Keep-Alive 未优化**：连接复用不足

## 修复步骤

### 步骤 1: 更新 Nginx 配置

已优化的配置包括：
- ✅ 增加缓冲区大小（支持大文件传输）
- ✅ 延长超时时间（防止连接断开）
- ✅ 添加 CORS 头（支持跨域资源）
- ✅ 启用 HTTP/2（提升性能）
- ✅ 优化 SSL 配置（提升安全性）
- ✅ 添加 Cloudflare IP 信任列表

### 步骤 2: 更新 Next.js CSP 配置

已优化的配置包括：
- ✅ 允许 blob: 和 data: URI（支持 3D 模型）
- ✅ 添加域名到 connect-src（支持 WebSocket）
- ✅ 优化 media-src（支持视频流）

### 步骤 3: 重新部署

```bash
# 1. 停止当前服务
docker-compose down

# 2. 重新构建（如果修改了代码）
docker-compose build --no-cache

# 3. 启动服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f web nginx
```

### 步骤 4: 清除 CDN 缓存

如果使用 Cloudflare：

1. 登录 Cloudflare Dashboard
2. 选择你的域名 `stravision.cheesestrawberry.top`
3. 进入 "缓存" → "配置"
4. 点击 "清除所有内容"

### 步骤 5: 验证修复

```bash
# 测试域名访问
curl -I https://stravision.cheesestrawberry.top

# 测试 3D 模型加载
curl -I https://stravision.cheesestrawberry.top/3d_model/scene.gltf

# 测试 WebSocket 连接
wscat -c wss://stravision.cheesestrawberry.top/ws/voice
```

## Cloudflare 特殊配置

如果你使用 Cloudflare，需要额外配置：

### 1. 关闭 Bot Fight Mode（可能导致 418 错误）

**路径**: Security → Bots → Configure Super Bot Fight Mode

**设置**:
- Definitely automated: Allow
- Verified bots: Allow
- JavaScript Detections: Off（或 Allow）

### 2. 调整 WAF 规则

**路径**: Security → WAF → Managed rules

**操作**:
- 检查是否有规则阻止了正常请求
- 添加例外规则（Skip）针对你的域名

### 3. 优化缓存规则

**路径**: Caching → Configuration

**设置**:
```
# 3D 模型文件缓存规则
URL Pattern: *.gltf, *.glb, *.bin
Cache Level: Standard
Edge Cache TTL: 1 month
Browser Cache TTL: 1 month
```

### 4. 页面规则（Page Rules）

创建以下规则：

```
# 规则 1: 3D 模型资源
URL: *stravision.cheesestrawberry.top/3d_model/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 month

# 规则 2: API 路由
URL: *stravision.cheesestrawberry.top/api/*
Settings:
  - Cache Level: Bypass
  - Security Level: Medium
  - Browser Integrity Check: Off

# 规则 3: WebSocket
URL: *stravision.cheesestrawberry.top/ws/*
Settings:
  - Cache Level: Bypass
  - WebSockets: On
```

## 诊断命令

### 检查 DNS 解析
```bash
# 查看 DNS 记录
nslookup stravision.cheesestrawberry.top

# 查看 DNS 传播
dig stravision.cheesestrawberry.top +trace
```

### 检查 SSL 证书
```bash
# 查看证书信息
openssl s_client -connect stravision.cheesestrawberry.top:443 -servername stravision.cheesestrawberry.top
```

### 检查响应头
```bash
# 查看完整响应头
curl -v https://stravision.cheesestrawberry.top 2>&1 | grep -E "^< |^> "

# 检查 CORS 头
curl -H "Origin: https://stravision.cheesestrawberry.top" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://stravision.cheesestrawberry.top/3d_model/scene.gltf -v
```

### 检查 Nginx 配置
```bash
# 进入 Nginx 容器
docker-compose exec nginx sh

# 测试配置
nginx -t

# 重新加载配置
nginx -s reload
```

## 常见问题排查

### Q1: 仍然出现 418 错误
**解决方案**:
1. 检查 Cloudflare Bot Fight Mode 是否关闭
2. 清除 Cloudflare 缓存
3. 检查 WAF 规则是否误拦截
4. 临时关闭 Cloudflare 代理（DNS Only）测试

### Q2: 3D 模型加载缓慢
**解决方案**:
1. 检查模型文件大小（建议 < 10MB）
2. 启用 Cloudflare 的 Argo Smart Routing
3. 使用 CDN 加速静态资源
4. 考虑使用 Draco 压缩

### Q3: WebSocket 连接不稳定
**解决方案**:
1. 确认 Cloudflare WebSocket 已启用
2. 检查 Nginx 超时设置
3. 增加 `proxy_read_timeout` 和 `proxy_send_timeout`
4. 检查防火墙规则

### Q4: 间歇性 502/503 错误
**解决方案**:
1. 检查 Next.js 应用是否正常运行
2. 增加 Nginx upstream 超时
3. 检查服务器资源（CPU、内存）
4. 查看应用日志：`docker-compose logs web`

## 性能优化建议

### 1. 启用 Brotli 压缩
```nginx
# 在 nginx.conf 中添加
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css application/json application/javascript application/x-javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
```

### 2. 使用 CDN 加速
- 将 3D 模型上传到 OSS/S3
- 使用 CDN 域名加载资源
- 配置合适的缓存策略

### 3. 优化 3D 模型
```bash
# 使用 gltf-pipeline 压缩模型
npm install -g gltf-pipeline
gltf-pipeline -i scene.gltf -o scene-optimized.gltf -d
```

### 4. 启用 HTTP/3（QUIC）
如果 Cloudflare 支持，在设置中启用 HTTP/3

## 监控和日志

### 实时监控
```bash
# 监控 Nginx 访问日志
docker-compose exec nginx tail -f /var/log/nginx/access.log

# 监控 Nginx 错误日志
docker-compose exec nginx tail -f /var/log/nginx/error.log

# 监控应用日志
docker-compose logs -f --tail=100 web
```

### 性能分析
```bash
# 使用 curl 测试响应时间
curl -w "@curl-format.txt" -o /dev/null -s https://stravision.cheesestrawberry.top

# curl-format.txt 内容：
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_appconnect:  %{time_appconnect}\n
time_pretransfer:  %{time_pretransfer}\n
time_redirect:  %{time_redirect}\n
time_starttransfer:  %{time_starttransfer}\n
----------\n
time_total:  %{time_total}\n
```

## 紧急回滚

如果修复后出现问题，快速回滚：

```bash
# 1. 恢复旧配置
git checkout HEAD~1 nginx/nginx.conf next.config.ts

# 2. 重启服务
docker-compose restart nginx web

# 3. 清除缓存
# 在 Cloudflare Dashboard 清除缓存
```

## 联系支持

如果问题仍未解决：
1. 收集日志：`docker-compose logs > logs.txt`
2. 记录错误截图
3. 提供访问时间和 IP 地址
4. 联系 Cloudflare 支持（如果使用）

---

**最后更新**: 2024-12-XX
**维护者**: Stravision Team
