# 🔍 Supergateway 调试指南

## 问题

所有请求都返回 "Invalid request parameters"，包括：
- `tools/call` with `get_all_spectrum`
- `resources/read` with `spectrum://channels`
- `resources/list`

## 可能的原因

### 1. FastMCP 服务器未正确启动

检查 1Panel 中的服务状态：
1. 打开 1Panel 控制面板
2. 找到 "MCP" 或 "Supergateway" 部分
3. 查看 `spectrum-stravision` 服务的状态
4. 查看日志

### 2. 传输模式配置错误

FastMCP 服务器需要使用 `sse` 传输模式，但可能配置成了 `stdio`。

**检查方法：**

在 1Panel 中查看服务的环境变量或启动命令：
```bash
# 应该是
MCP_TRANSPORT=sse

# 或启动命令中
python server.py  # 默认使用环境变量中的 MCP_TRANSPORT
```

### 3. Supergateway 配置问题

Supergateway 可能没有正确配置 FastMCP 服务器的连接方式。

**需要检查的配置：**
- `stdio`: 应该是 `uvx mcp-server-spectrum-stravision`
- `transport`: 应该是 `sse`
- `url`: 应该指向 FastMCP 服务器（如果是 HTTP 模式）

## 解决步骤

### 步骤 1: 检查 FastMCP 服务器是否运行

在 1Panel 的终端或 SSH 中：

```bash
# 检查进程
ps aux | grep python | grep spectrum

# 检查端口
netstat -tlnp | grep 8000

# 查看日志
# 在 1Panel 中查看服务日志
```

### 步骤 2: 手动测试 FastMCP 服务器

如果服务器在运行，尝试直接连接（不通过 Supergateway）：

```bash
# 如果是 stdio 模式
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}' | uvx mcp-server-spectrum-stravision

# 如果是 HTTP 模式
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'
```

### 步骤 3: 检查 Supergateway 配置

在 1Panel 的 MCP 配置中，应该类似：

```json
{
  "mcpServers": {
    "spectrum-stravision": {
      "command": "uvx",
      "args": ["mcp-server-spectrum-stravision"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "MQTT_BROKER": "be18721454da4600b14a92424bb1181c.s1.eu.hivemq.cloud",
        "MQTT_PORT": "8883",
        "MQTT_TOPIC": "meimefarm/Spectrum",
        "MQTT_USER": "meimeifarm",
        "MQTT_PASSWORD": "Meimei83036666"
      }
    }
  }
}
```

**关键点：**
- `command` 和 `args` 应该能启动 FastMCP 服务器
- `MCP_TRANSPORT` 应该是 `stdio`（Supergateway 通过 stdio 与服务器通信）
- 环境变量应该包含 MQTT 配置

### 步骤 4: 重启服务

在 1Panel 中：
1. 停止 `spectrum-stravision` 服务
2. 等待几秒
3. 启动服务
4. 查看启动日志

应该看到类似：
```
[INFO] Starting spectrum MCP server...
[INFO] [MQTT] Connected, subscribed to meimefarm/Spectrum
[INFO] Starting MCP with transport=stdio
```

### 步骤 5: 测试连接

重启后，再次测试：

```bash
node test-sse-response.js
```

应该看到成功的响应而不是错误。

## 常见问题

### Q: 日志显示 "ModuleNotFoundError: No module named 'mcp'"

A: FastMCP 依赖未安装
```bash
# 在服务器上
pip install mcp[cli]
pip install paho-mqtt
```

### Q: 日志显示 "MQTT Connect error"

A: MQTT 配置错误或网络问题
- 检查 MQTT 凭据
- 检查网络连接
- 检查防火墙

### Q: Supergateway 显示 "Child process exited"

A: FastMCP 服务器启动失败
- 查看详细错误日志
- 检查 Python 环境
- 检查依赖是否安装

## 临时解决方案

如果 Supergateway 配置复杂，可以：

### 方案 A: 直接使用 stdio 模式

在本地运行 FastMCP 服务器，通过 stdio 与 AI 助手通信（需要修改架构）。

### 方案 B: 使用 HTTP 模式

修改 FastMCP 服务器使用 HTTP 传输：

```python
# 在 server.py 中
mcp.run(transport='streamable-http')
```

然后直接 POST 到 `http://8.153.175.190:8000`。

### 方案 C: 使用模拟数据

临时返回模拟的光谱数据，等配置好后再连接真实服务器。

## 需要的信息

请提供以下信息以便进一步诊断：

1. 1Panel 中 `spectrum-stravision` 服务的状态（运行中/停止）
2. 服务的启动日志（最近 50 行）
3. Supergateway 的配置（JSON）
4. 服务器上是否能看到 Python 进程

---

根据这些信息，我可以提供更具体的解决方案。
