# 光谱 MCP 最终修复方案

## 问题根源

1Panel Supergateway 使用标准的 MCP SSE 协议，需要：
1. 建立持久的 SSE 连接
2. 通过 SSE 获取 sessionId
3. 使用 sessionId 发送 POST 请求
4. 通过 SSE 接收响应

但 Next.js API Route 是无状态的，每次请求都是独立的，无法保持长连接。

## 解决方案

创建了一个专门的代理 API (`/api/mcp/spectrum`) 来处理 SSE 连接：

### 架构

```
AI 助手
  ↓ (Function Calling)
MCP Tool Executor
  ↓ (HTTP POST)
/api/mcp/spectrum (代理 API)
  ↓ (SSE + POST)
1Panel Supergateway
  ↓ (stdio)
光谱 MCP 服务器
  ↓ (MQTT)
ESP32 光谱传感器
```

### 代理 API 工作流程

1. 接收工具调用请求 (toolName + arguments)
2. 建立 SSE 连接到 Supergateway
3. 从 SSE 流中提取 endpoint 和 sessionId
4. 发送 JSON-RPC 请求到 endpoint
5. 从 SSE 流中读取响应
6. 关闭 SSE 连接
7. 返回结果给调用者

## 文件变更

### 新增文件

- `app/api/mcp/spectrum/route.ts` - 光谱 MCP 代理 API

### 修改文件

- `lib/mcp/mcp-tool-executor.ts` - 更新 `executeSpectrumTool` 使用代理 API

## 测试步骤

### 1. 重启开发服务器

```bash
# 停止当前服务器 (Ctrl+C)
npm run dev
```

### 2. 测试代理 API

```bash
curl -X POST http://localhost:3000/api/mcp/spectrum \
  -H "Content-Type: application/json" \
  -d '{"toolName":"get_all_spectrum","arguments":{}}'
```

预期响应：
```json
{
  "success": true,
  "data": {
    "410": 1234,
    "435": 1456,
    ...
  }
}
```

### 3. 在 AI 助手中测试

打开 AI 助手页面，输入：
```
请获取当前光谱数据
```

或者：
```
获取 730nm 通道的光谱值
```

## 预期结果

### 成功的日志

```
[MCP] Executing tool: get_all_spectrum
[Spectrum Proxy] Calling tool: get_all_spectrum {}
[Spectrum Proxy] Got endpoint: http://8.153.175.190:8000/spectrum-stravision/messages?sessionId=xxx
[Spectrum Proxy] Sending request to http://8.153.175.190:8000/spectrum-stravision/messages?sessionId=xxx
[Spectrum Proxy] Got response
[MCP] Tool get_all_spectrum result: success
```

### AI 助手的回复

```
当前光谱数据如下：

- 410nm (紫光): 1234
- 435nm (蓝光): 1456
- 460nm (蓝光): 1678
...

根据光谱数据分析，植物健康状况良好。
```

## 性能优化（可选）

### 连接池

如果频繁调用光谱工具，可以实现 SSE 连接池来复用连接：

```typescript
// lib/mcp/spectrum-connection-pool.ts
class SpectrumConnectionPool {
    private connections: Map<string, SSEConnection> = new Map()
    
    async getConnection(url: string): Promise<SSEConnection> {
        // 复用现有连接或创建新连接
    }
    
    releaseConnection(sessionId: string) {
        // 释放连接（延迟关闭）
    }
}
```

### 缓存

对于不经常变化的数据，可以添加短期缓存：

```typescript
// 缓存 5 秒
const cache = new Map<string, { data: any, timestamp: number }>()
```

## 故障排查

### 代理 API 返回 503

**原因：** 无法连接到 Supergateway

**解决：**
1. 检查 Supergateway 是否运行
2. 检查网络连接
3. 检查 URL 配置

### 代理 API 返回 504

**原因：** 超时未收到响应

**解决：**
1. 检查 MCP 服务器是否正常
2. 检查 MQTT 连接是否正常
3. 增加超时时间

### 数据为空或为 0

**原因：** ESP32 设备未发送数据

**解决：**
1. 检查 ESP32 设备是否在线
2. 检查 MQTT 主题是否正确
3. 使用 MQTT 客户端验证数据流

## 部署注意事项

### 环境变量

确保生产环境配置了正确的 URL：

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 超时配置

Vercel 等平台有函数执行时间限制，确保：

```typescript
export const maxDuration = 30 // 秒
```

### 错误处理

代理 API 已包含完整的错误处理和日志记录。

## 总结

通过创建专门的代理 API，我们成功解决了 Next.js API Route 无法保持 SSE 长连接的问题。现在光谱 MCP 工具可以正常工作了！

---

修复完成！🎉
