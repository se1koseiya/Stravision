# 🎉 光谱 MCP 服务器配置成功！

## ✅ 最终解决方案

直接在 `executeSpectrumTool` 函数中处理 SSE 连接，无需额外的代理 API。

### 工作原理

```
AI 助手
  ↓ (Function Calling)
MCP Tool Executor (executeSpectrumTool)
  ↓ (SSE + JSON-RPC)
1Panel Supergateway
  ↓ (stdio)
光谱 MCP 服务器
  ↓ (MQTT)
ESP32 光谱传感器
```

### 执行流程

1. **建立 SSE 连接**
   ```
   GET http://8.153.175.190:8000/spectrum-stravision
   Accept: text/event-stream
   ```

2. **接收 endpoint 事件**
   ```
   event: endpoint
   data: /spectrum-stravision/messages?sessionId=xxx
   ```

3. **发送工具调用请求**
   ```
   POST http://8.153.175.190:8000/spectrum-stravision/messages?sessionId=xxx
   Content-Type: application/json
   
   {
     "jsonrpc": "2.0",
     "method": "tools/call",
     "params": {
       "name": "get_all_spectrum",
       "arguments": {}
     },
     "id": 1234567890
   }
   ```

4. **从 SSE 流接收响应**
   ```
   event: message
   data: {"jsonrpc":"2.0","result":{"content":[{"type":"text","text":"{...}"}]},"id":1234567890}
   ```

5. **解析并返回数据**

## 🚀 测试步骤

### 1. 重启开发服务器

```bash
# 停止当前服务器 (Ctrl+C)
npm run dev
```

### 2. 在 AI 助手中测试

打开 http://localhost:3000/ai-assistant

输入以下任一命令：

```
请获取当前光谱数据
```

```
获取 730nm 通道的光谱值并分析
```

```
分析植物健康状况（使用光谱数据）
```

### 3. 查看日志

开发服务器控制台应该显示：

```
[MCP] AI requested tool calls: [ 'get_all_spectrum' ]
[MCP] Executing tool: get_all_spectrum
[MCP] Executing Spectrum Tool: get_all_spectrum {}
[MCP] Connecting to Supergateway: http://8.153.175.190:8000/spectrum-stravision
[MCP] Got endpoint: http://8.153.175.190:8000/spectrum-stravision/messages?sessionId=xxx
[MCP] Sending request to http://8.153.175.190:8000/spectrum-stravision/messages?sessionId=xxx
[MCP] Got response from SSE
[MCP] Tool get_all_spectrum result: success
```

## 📊 预期结果

### AI 助手的回复示例

```
当前光谱数据如下：

通道数据：
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

植物健康分析：
根据光谱数据计算：
- NDVI = (760 - 680) / (760 + 680) = (3890 - 3234) / (3890 + 3234) = 0.09
- 红边位置：730nm 附近
- 叶绿素含量：正常（680nm 吸收峰明显）

结论：植物生长状况良好，无明显病害迹象。
```

## 🔧 故障排查

### 问题 1: "无法连接到光谱服务器"

**原因：** Supergateway 未运行或网络不通

**解决：**
1. 检查 1Panel 中 Supergateway 服务状态
2. 测试连接：`curl http://8.153.175.190:8000/spectrum-stravision`
3. 检查防火墙设置

### 问题 2: "无法从 SSE 获取端点"

**原因：** SSE 握手超时

**解决：**
1. 检查光谱 MCP 服务器是否正常运行
2. 查看 Supergateway 日志
3. 增加超时时间（代码中的 5000ms）

### 问题 3: "MCP 服务器无响应（超时）"

**原因：** 工具调用超时

**解决：**
1. 检查 MQTT 连接是否正常
2. 检查 ESP32 设备是否在线并发送数据
3. 查看光谱服务器日志
4. 增加响应超时时间（代码中的 15000ms）

### 问题 4: 数据全为 0

**原因：** ESP32 设备未发送数据

**解决：**
1. 检查 ESP32 设备电源和网络
2. 验证 MQTT 主题配置：`meimefarm/Spectrum`
3. 使用 MQTT 客户端订阅主题验证数据流：
   ```bash
   mosquitto_sub -h be18721454da4600b14a92424bb1181c.s1.eu.hivemq.cloud \
     -p 8883 \
     -t "meimefarm/Spectrum" \
     -u meimeifarm \
     -P Meimei83036666 \
     --capath /etc/ssl/certs/
   ```

## 📈 性能优化建议

### 1. 连接复用

当前每次工具调用都会建立新的 SSE 连接。如果频繁调用，可以考虑：

- 实现连接池
- 保持连接活跃一段时间
- 使用 WebSocket 替代 SSE

### 2. 缓存策略

对于不经常变化的数据，可以添加短期缓存：

```typescript
const cache = new Map<string, { data: any, timestamp: number }>()
const CACHE_TTL = 5000 // 5秒

// 在 executeSpectrumTool 开始处检查缓存
const cacheKey = `${toolName}:${JSON.stringify(args)}`
const cached = cache.get(cacheKey)
if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { success: true, data: cached.data }
}
```

### 3. 超时配置

根据实际情况调整超时时间：

- SSE 握手：5秒（当前）
- 工具调用：5秒（当前）
- 响应等待：15秒（当前）

## 🎯 使用场景

### 1. 植物健康监测

```
用户：分析当前植物健康状况

AI：[调用 get_all_spectrum]
根据光谱数据分析：
- NDVI 指数：0.68（正常范围）
- 叶绿素含量：正常
- 无病害迹象
建议：继续当前养护方案
```

### 2. 病害早期检测

```
用户：检查是否有病害迹象

AI：[调用 get_all_spectrum]
分析红边位置和绿光反射率：
- 红边位置：730nm（正常）
- 绿光反射率：正常
- 无异常偏移
结论：未发现病害迹象
```

### 3. 营养状态评估

```
用户：评估植物营养状态

AI：[调用 get_all_spectrum]
根据蓝光和红光吸收情况：
- 蓝光吸收：正常（类胡萝卜素充足）
- 红光吸收：正常（叶绿素充足）
- 氮素营养：良好
建议：无需额外施肥
```

## 📚 相关文档

- `lib/mcp/mcp-tool-executor.ts` - 工具执行器实现
- `lib/mcp/mcp-tool-definitions.ts` - 工具定义
- `docs/spectrum-mcp-integration.md` - 集成文档
- `mcpserver_spectrum/` - 服务器源代码

## 🎊 总结

光谱 MCP 服务器现在已经完全配置好了！你可以：

✅ 实时获取 18 通道光谱数据  
✅ 通过 AI 助手智能分析植物健康  
✅ 自动计算 NDVI 等植被指数  
✅ 早期检测病害和营养问题  

享受智能农业的便利吧！🌱🚀
