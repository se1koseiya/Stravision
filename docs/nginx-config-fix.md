# 🔧 Nginx 配置错误修复指南

## 🚨 错误症状

```
[emerg] "proxy_temp_file_write_size" must be equal to or greater than the maximum of the value of "proxy_buffer_size" and one of the "proxy_buffers"
[warn] the "listen ... http2" directive is deprecated, use the "http2" directive instead
```

## 🔍 问题分析

### 1. 缓冲区配置错误
**问题**: `proxy_temp_file_write_size` 必须 ≥ max(`proxy_buffer_size`, `proxy_buffers` 中单个缓冲区大小)

**原配置**:
```nginx
proxy_buffer_size 128k;
proxy_buffers 4 256k;           # 4个缓冲区，每个256k
proxy_temp_file_write_size 256k; # ❌ 等于最大值，但需要更大
```

**修复后**:
```nginx
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_temp_file_write_size 512k; # ✅ 大于最大值 (256k)
```

### 2. HTTP/2 语法过时
**问题**: `listen 443 ssl http2;` 语法已弃用

**原配置**:
```nginx
listen 443 ssl http2;  # ❌ 过时语法
```

**修复后**:
```nginx
listen 443 ssl;        # ✅ 新语法
http2 on;              # ✅ 独立指令
```

## 🚀 快速修复

### 方法 1: 使用修复脚本

#### Windows (PowerShell)
```powershell
.\scripts\fix-nginx-config.ps1
```

#### Linux/Mac
```bash
bash scripts/fix-nginx-config.sh
```

### 方法 2: 手动修复

1. **停止服务**:
```bash
docker-compose down
```

2. **验证配置**:
```bash
docker run --rm -v "$(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t
```

3. **重新启动**:
```bash
docker-compose up -d
```

## ✅ 已修复的配置

### 缓冲区设置
```nginx
# Buffer and Timeout Settings (Critical for stability)
client_body_buffer_size 128k;
client_max_body_size 50m;
client_header_buffer_size 1k;
large_client_header_buffers 4 16k;

proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;
proxy_temp_file_write_size 512k;  # ✅ 修复：大于最大缓冲区大小

proxy_connect_timeout 600s;
proxy_send_timeout 600s;
proxy_read_timeout 600s;
send_timeout 600s;
```

### HTTP/2 配置
```nginx
server {
    listen 443 ssl;        # ✅ 修复：移除 http2
    http2 on;              # ✅ 修复：使用新语法
    server_name stravision.cheesestrawberry.top localhost;
    
    # SSL 配置...
}
```

## 🔍 验证修复

### 1. 检查 Nginx 启动
```bash
docker-compose logs nginx
```

**期望输出**:
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
nginx: [notice] start worker processes
```

### 2. 检查服务状态
```bash
docker-compose ps
```

**期望输出**:
```
NAME                    STATUS
berry-realm-v40-nginx-1   Up
berry-realm-v40-web-1     Up  
berry-realm-v40-db-1      Up
```

### 3. 测试网站访问
```bash
curl -I https://stravision.cheesestrawberry.top
```

**期望输出**:
```
HTTP/2 200
server: nginx/1.x.x
```

## 📊 配置优化说明

### 缓冲区大小计算
```
proxy_buffer_size = 128k          # 响应头缓冲区
proxy_buffers = 4 × 256k = 1024k  # 响应体缓冲区总大小
proxy_temp_file_write_size = 512k # 临时文件写入大小

规则: proxy_temp_file_write_size ≥ max(128k, 256k) = 256k
建议: 设置为 512k (2倍安全边距)
```

### 性能影响
- ✅ **更大的缓冲区** → 更好的大文件传输性能
- ✅ **HTTP/2** → 更快的页面加载速度
- ✅ **长超时** → 更稳定的连接

## 🛠️ 故障排查

### 如果仍有错误

1. **检查配置语法**:
```bash
docker run --rm -v "$(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t
```

2. **查看详细日志**:
```bash
docker-compose logs nginx -f
```

3. **重置配置**:
```bash
git checkout HEAD -- nginx/nginx.conf
# 然后重新应用修复
```

### 常见问题

#### Q: 仍然出现缓冲区错误
**A**: 检查是否有其他 `proxy_temp_file_write_size` 配置，确保所有值都 ≥ 512k

#### Q: HTTP/2 不工作
**A**: 确保 SSL 证书有效，HTTP/2 需要 HTTPS

#### Q: 性能下降
**A**: 缓冲区设置可能过大，可以适当调小：
```nginx
proxy_buffers 2 128k;
proxy_temp_file_write_size 256k;
```

## 📈 性能监控

### 监控命令
```bash
# 检查 Nginx 进程
docker-compose exec nginx ps aux

# 检查内存使用
docker stats nginx-1

# 检查连接数
docker-compose exec nginx ss -tuln
```

### 性能指标
- **内存使用**: < 100MB
- **CPU 使用**: < 5%
- **响应时间**: < 200ms
- **并发连接**: > 1000

## 🔮 进一步优化

### 1. 启用 Brotli 压缩
```nginx
load_module modules/ngx_http_brotli_filter_module.so;
load_module modules/ngx_http_brotli_static_module.so;

http {
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css application/json application/javascript;
}
```

### 2. 优化 SSL 配置
```nginx
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_stapling on;
ssl_stapling_verify on;
```

### 3. 添加缓存
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🎉 总结

修复完成后，你的 Nginx 将：
- ✅ **正常启动** - 无配置错误
- ✅ **支持 HTTP/2** - 更快的加载速度
- ✅ **稳定传输** - 大文件不会断开
- ✅ **高性能** - 优化的缓冲区配置

现在可以正常访问你的网站了！🚀