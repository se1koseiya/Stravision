# 检查光谱服务器状态

## 问题

服务器返回 `Cannot POST /` 和 `Cannot GET /`，这是 Express.js 的默认错误页面，说明：
1. 8000 端口上运行的不是 FastMCP 服务器
2. 可能是其他 Node.js 服务占用了端口

## 排查步骤

### 1. SSH 登录服务器

```bash
ssh root@8.153.175.190
```

### 2. 检查 8000 端口被谁占用

```bash
# 查看监听 8000 端口的进程
netstat -tlnp | grep 8000

# 或使用 lsof
lsof -i :8000

# 或使用 ss
ss -tlnp | grep 8000
```

### 3. 检查 spectrum-mcp 服务状态

```bash
# 查看服务状态
systemctl status spectrum-mcp

# 查看服务日志
journalctl -u spectrum-mcp -n 100 --no-pager

# 查看实时日志
journalctl -u spectrum-mcp -f
```

### 4. 检查是否有其他服务占用端口

```bash
# 查看所有 Python 进程
ps aux | grep python

# 查看所有 Node.js 进程
ps aux | grep node
```

## 可能的情况

### 情况 1: spectrum-mcp 服务未启动

**解决方案：**
```bash
# 启动服务
systemctl start spectrum-mcp

# 设置开机自启
systemctl enable spectrum-mcp

# 查看状态
systemctl status spectrum-mcp
```

### 情况 2: 端口被其他服务占用

**解决方案 A: 停止占用端口的服务**
```bash
# 找到进程 PID
lsof -i :8000

# 停止进程
kill -9 <PID>

# 启动 spectrum-mcp
systemctl start spectrum-mcp
```

**解决方案 B: 修改 spectrum-mcp 端口**
```bash
# 编辑环境变量
nano /opt/mcpserver_spectrum/.env

# 修改端口
PORT=8001

# 重启服务
systemctl restart spectrum-mcp

# 更新前端配置中的端口
```

### 情况 3: spectrum-mcp 服务未正确安装

**解决方案：**
```bash
cd /opt/mcpserver_spectrum

# 检查文件是否存在
ls -la

# 重新安装依赖
uv pip install -e .

# 手动测试运行
uv run python src/mcp_server_spectrum/server.py
```

### 情况 4: 主应用的其他服务占用了 8000 端口

如果你的主应用（Next.js）也部署在同一台服务器上，可能有其他服务占用了 8000 端口。

**解决方案：**
```bash
# 查看所有监听的端口
netstat -tlnp

# 找到空闲端口，例如 8001
# 修改 spectrum-mcp 配置使用新端口
```

## 快速修复脚本

在服务器上运行：

```bash
#!/bin/bash

echo "=== 检查 8000 端口占用情况 ==="
lsof -i :8000

echo -e "\n=== 检查 spectrum-mcp 服务状态 ==="
systemctl status spectrum-mcp

echo -e "\n=== 查看最近的日志 ==="
journalctl -u spectrum-mcp -n 20 --no-pager

echo -e "\n=== 检查 Python 进程 ==="
ps aux | grep python | grep -v grep

echo -e "\n=== 检查配置文件 ==="
cat /opt/mcpserver_spectrum/.env 2>/dev/null || echo ".env 文件不存在"

echo -e "\n=== 测试手动启动 ==="
cd /opt/mcpserver_spectrum
timeout 5 uv run python src/mcp_server_spectrum/server.py 2>&1 | head -20
```

保存为 `check-spectrum.sh`，然后运行：
```bash
chmod +x check-spectrum.sh
./check-spectrum.sh
```

## 预期的正确输出

当服务正确运行时，应该看到：

```bash
$ netstat -tlnp | grep 8000
tcp        0      0 0.0.0.0:8000            0.0.0.0:*               LISTEN      12345/python

$ systemctl status spectrum-mcp
● spectrum-mcp.service - Spectrum MCP Server
   Loaded: loaded (/etc/systemd/system/spectrum-mcp.service; enabled)
   Active: active (running) since Mon 2024-01-01 12:00:00 UTC; 1h ago
 Main PID: 12345 (python)
   Status: "Running"
```

日志应该包含：
```
[INFO] Starting spectrum MCP server...
[INFO] [MQTT] Connected, subscribed to meimefarm/Spectrum
[INFO] Starting MCP with transport=sse
```

## 测试正确的端点

一旦服务正确运行，测试：

```bash
# 测试 JSON-RPC 调用
curl -X POST http://8.153.175.190:8000 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_all_spectrum","arguments":{}},"id":1}'
```

应该返回类似：
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"410\": 1234, ...}"
      }
    ]
  },
  "id": 1
}
```

## 联系我

完成排查后，请告诉我：
1. 8000 端口被哪个进程占用？
2. spectrum-mcp 服务的状态是什么？
3. 日志中有什么错误信息？

我会根据具体情况提供进一步的解决方案。
