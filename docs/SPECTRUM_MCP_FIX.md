# 光谱 MCP 服务器 404 问题修复

## 问题诊断

从日志可以看到：
```
[MCP] SSE Handshake failed: 404
[MCP] POST to http://8.153.175.190:8000/messages failed (404)
```

这是因为之前的实现假设了标准的 MCP SSE 握手流程，但 FastMCP 使用的是更简单的 JSON-RPC 2.0 over HTTP 协议。

## 已修复的问题

### 1. 移除了错误的 SSE 握手逻辑

之前的代码尝试：
1. GET 请求到 `/sse` 获取会话端点
2. POST 到 `/messages?sessionId=xxx`

但 FastMCP 的 SSE 传输模式实际上是：
- 直接 POST JSON-RPC 请求到根路径 (`http://8.153.175.190:8000`)

### 2. 更新了 JSON-RPC 请求格式

**工具调用 (Tools):**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_channel",
    "arguments": { "name": "730" }
  },
  "id": 1
}
```

**资源读取 (Resources):**
```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {
    "uri": "spectrum://latest"
  },
  "id": 1
}
```

### 3. 改进了响应解析

FastMCP 返回的 JSON-RPC 2.0 响应格式：
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"410\": 1234, \"435\": 1456, ...}"
      }
    ]
  },
  "id": 1
}
```

代码现在会正确解析 `result.content[0].text` 并尝试将其转换为 JSON。

## 测试步骤

### 1. 运行测试脚本

```bash
node test-spectrum-mcp.js
```

这将测试：
- ✅ `get_all_spectrum` 工具调用
- ✅ `get_channel` 工具调用
- ✅ `spectrum://latest` 资源读取

### 2. 在 AI 助手中测试

重启开发服务器：
```bash
npm run dev
```

然后在 AI 助手中输入：
```
请获取当前光谱数据
```

或者：
```
获取 730nm 通道的光谱值
```

## 预期结果

### 成功的日志输出

```
[MCP] Executing tool: get_all_spectrum
[MCP] Spectrum Tool Endpoint: http://8.153.175.190:8000
[MCP] Request body: {
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_all_spectrum",
    "arguments": {}
  },
  "id": 1234567890
}
[MCP] Response status: 200
[MCP] Response body: {"jsonrpc":"2.0","result":{"content":[{"type":"text","text":"{...}"}]},"id":1234567890}
[MCP] Tool get_all_spectrum result: success
```

### AI 助手的回复

```
当前光谱数据如下：

- 410nm (紫光): 1234
- 435nm (蓝光): 1456
- 460nm (蓝光): 1678
- 485nm (青光): 1890
- 510nm (绿光): 2012
- 535nm (绿光): 2234
- 560nm (黄绿光): 2456
- 585nm (黄光): 2678
- 610nm (橙光): 2890
- 645nm (红光): 3012
- 680nm (深红光): 3234
- 705nm (近红外): 3456
- 730nm (近红外): 3678
- 760nm (近红外): 3890
- 810nm (近红外): 4012
- 860nm (近红外): 4234
- 900nm (近红外): 4456
- 940nm (近红外): 4678

根据光谱数据分析：
- NDVI = (760 - 680) / (760 + 680) = 0.09
- 植物健康状况：正常
```

## 故障排查

### 如果仍然出现 404

1. **检查服务器是否运行**
   ```bash
   ssh root@8.153.175.190
   systemctl status spectrum-mcp
   ```

2. **检查端口是否监听**
   ```bash
   netstat -tlnp | grep 8000
   ```

3. **手动测试 JSON-RPC 调用**
   ```bash
   curl -X POST http://8.153.175.190:8000 \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_all_spectrum","arguments":{}},"id":1}'
   ```

### 如果返回空数据

1. **检查 MQTT 连接**
   ```bash
   journalctl -u spectrum-mcp -n 50 | grep MQTT
   ```

   应该看到：
   ```
   [MQTT] Connected, subscribed to meimefarm/Spectrum
   [MQTT] Received spectrum: ['410', '435', ...]
   ```

2. **检查 ESP32 设备**
   - 确认设备在线
   - 确认设备正在发送数据到 MQTT 主题

3. **手动订阅 MQTT 主题验证**
   ```bash
   mosquitto_sub -h be18721454da4600b14a92424bb1181c.s1.eu.hivemq.cloud \
     -p 8883 \
     -t "meimefarm/Spectrum" \
     -u meimeifarm \
     -P Meimei83036666 \
     --capath /etc/ssl/certs/
   ```

## 相关文件

- ✅ `lib/mcp/mcp-tool-executor.ts` - 已更新执行器逻辑
- ✅ `test-spectrum-mcp.js` - 新增测试脚本
- 📖 `docs/spectrum-mcp-integration.md` - 集成文档
- 📖 `mcpserver_spectrum/deploy-guide.md` - 部署指南

## 下一步

1. 运行 `node test-spectrum-mcp.js` 验证修复
2. 重启开发服务器 `npm run dev`
3. 在 AI 助手中测试工具调用
4. 如果成功，可以开始使用光谱数据进行植物分析！

---

修复完成！现在光谱 MCP 服务器应该可以正常工作了。
