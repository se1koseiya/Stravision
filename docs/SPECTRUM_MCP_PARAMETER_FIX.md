# 光谱 MCP 参数格式修复

## 问题

收到错误：`Invalid request parameters`

## 原因

MCP 协议对于无参数的工具调用，不应该包含空的 `arguments: {}` 字段。

### 错误的格式

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_all_spectrum",
    "arguments": {}  // ❌ 不应该有这个字段
  },
  "id": 1234567890
}
```

### 正确的格式

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_all_spectrum"
    // ✅ 无参数时不包含 arguments 字段
  },
  "id": 1234567890
}
```

或者对于有参数的工具：

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_channel",
    "arguments": {
      "name": "730"
    }
  },
  "id": 1234567890
}
```

## 修复

更新了 `executeSpectrumTool` 函数：

```typescript
const requestBody: any = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
        name: toolName
    },
    id: Date.now()
}

// 只有当有参数时才添加 arguments 字段
if (args && Object.keys(args).length > 0) {
    requestBody.params.arguments = args
}
```

## 测试

重启开发服务器后，在 AI 助手中输入：

```
请获取当前光谱数据
```

应该能成功获取数据了！🎉
