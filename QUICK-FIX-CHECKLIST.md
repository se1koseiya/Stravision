# 🚀 域名访问问题快速修复清单

## ⚡ 立即执行（5分钟）

### 1. 重新部署服务
```bash
# 停止服务
docker-compose down

# 重新启动（应用新配置）
docker-compose up -d

# 查看日志
docker-compose logs -f web nginx
```

### 2. 清除 Cloudflare 缓存
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 选择域名 `stravision.cheesestrawberry.top`
3. 缓存 → 配置 → **清除所有内容**

### 3. 关闭 Bot Fight Mode
1. Cloudflare Dashboard → Security → Bots
2. Configure Super Bot Fight Mode
3. 设置为 **Allow** 或 **关闭**

## 🔍 诊断工具

### Windows (PowerShell)
```powershell
.\scripts\diagnose-domain.ps1
```

### Linux/Mac
```bash
bash scripts/diagnose-domain.sh
```

## ✅ 已修复的问题

- ✅ Nginx 缓冲区配置（支持大文件）
- ✅ 超时设置（防止连接断开）
- ✅ CORS 配置（支持跨域资源）
- ✅ CSP 策略（允许 3D 模型加载）
- ✅ HTTP/2 支持（提升性能）
- ✅ SSL 优化（提升安全性）

## 🎯 Cloudflare 关键设置

### Bot Fight Mode
- **路径**: Security → Bots → Configure Super Bot Fight Mode
- **设置**: Definitely automated → **Allow**

### 缓存规则
- **路径**: Caching → Configuration
- **操作**: 清除所有内容

### WAF 规则
- **路径**: Security → WAF → Managed rules
- **检查**: 是否有规则阻止正常请求

### 页面规则（推荐）
创建以下规则：

#### 规则 1: 3D 模型资源
```
URL: *stravision.cheesestrawberry.top/3d_model/*
设置:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
```

#### 规则 2: API 路由
```
URL: *stravision.cheesestrawberry.top/api/*
设置:
  - Cache Level: Bypass
  - Security Level: Medium
```

#### 规则 3: WebSocket
```
URL: *stravision.cheesestrawberry.top/ws/*
设置:
  - Cache Level: Bypass
  - WebSockets: On
```

## 🧪 验证修复

### 1. 测试域名访问
```bash
curl -I https://stravision.cheesestrawberry.top
```
**期望结果**: HTTP 200 或 301/302

### 2. 测试 3D 模型
```bash
curl -I https://stravision.cheesestrawberry.top/3d_model/scene.gltf
```
**期望结果**: HTTP 200

### 3. 测试 WebSocket
在浏览器控制台：
```javascript
const ws = new WebSocket('wss://stravision.cheesestrawberry.top/ws/voice');
ws.onopen = () => console.log('✓ WebSocket 连接成功');
ws.onerror = (e) => console.error('✗ WebSocket 连接失败', e);
```

### 4. 测试页面加载
1. 打开 https://stravision.cheesestrawberry.top
2. 打开浏览器开发者工具（F12）
3. 查看 Network 标签
4. 检查是否有 418 或其他错误

## 🐛 常见问题

### Q: 仍然出现 418 错误
**解决方案**:
1. ✅ 确认 Cloudflare Bot Fight Mode 已关闭
2. ✅ 清除 Cloudflare 缓存（等待 5 分钟）
3. ✅ 检查 WAF 规则
4. 🔧 临时关闭 Cloudflare 代理（DNS Only）测试

### Q: 3D 模型加载失败
**解决方案**:
1. ✅ 检查浏览器控制台错误
2. ✅ 确认文件存在：`docker-compose exec web ls -lh public/3d_model/`
3. ✅ 检查 CORS 头：`curl -I -H "Origin: https://stravision.cheesestrawberry.top" https://stravision.cheesestrawberry.top/3d_model/scene.gltf`

### Q: 连接不稳定
**解决方案**:
1. ✅ 检查服务器资源：`docker stats`
2. ✅ 查看 Nginx 错误日志：`docker-compose logs nginx | grep error`
3. ✅ 增加 Nginx 超时（已在配置中）

## 📊 监控命令

### 实时日志
```bash
# Nginx 访问日志
docker-compose exec nginx tail -f /var/log/nginx/access.log

# Nginx 错误日志
docker-compose exec nginx tail -f /var/log/nginx/error.log

# 应用日志
docker-compose logs -f --tail=100 web
```

### 性能监控
```bash
# 容器资源使用
docker stats

# 磁盘空间
df -h

# 内存使用
free -h
```

## 🔄 回滚方案

如果修复后出现新问题：

```bash
# 1. 恢复旧配置
git checkout HEAD~1 nginx/nginx.conf next.config.ts

# 2. 重启服务
docker-compose restart nginx web

# 3. 清除 Cloudflare 缓存
```

## 📞 获取帮助

如果问题仍未解决：

1. **收集信息**:
   ```bash
   # 导出日志
   docker-compose logs > logs.txt
   
   # 运行诊断
   .\scripts\diagnose-domain.ps1 > diagnosis.txt
   ```

2. **检查清单**:
   - [ ] Cloudflare Bot Fight Mode 已关闭
   - [ ] Cloudflare 缓存已清除
   - [ ] Docker 服务正常运行
   - [ ] Nginx 配置已更新
   - [ ] SSL 证书有效

3. **查看详细文档**: `docs/domain-access-fix.md`

## 🎉 成功标志

修复成功后，你应该看到：
- ✅ 域名访问稳定，无 418 错误
- ✅ 3D 模型正常加载
- ✅ WebSocket 连接稳定
- ✅ 页面响应速度快（< 2秒）

---

**最后更新**: 2024-12-XX
**预计修复时间**: 5-15 分钟
