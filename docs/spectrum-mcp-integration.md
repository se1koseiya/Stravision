# 光谱传感器 MCP 集成文档

## 概述

光谱传感器 MCP 服务器提供了 18 通道光谱数据的实时访问能力，通过 MQTT 订阅设备数据，并通过 MCP 协议暴露给 AI 助手。

## 架构

```
ESP32 光谱传感器
    ↓ (MQTT)
HiveMQ Cloud Broker
    ↓ (MQTT Subscribe)
光谱 MCP 服务器 (Python FastMCP)
    ↓ (SSE/HTTP)
Next.js 后端 (MCP Tool Executor)
    ↓ (Function Calling)
AI 模型 (Qwen/GPT)
```

## 可用工具

### 1. get_channel

获取指定通道的光谱值。

**参数：**
- `name` (string, required): 通道名称，可选值：
  - "410", "435", "460", "485", "510", "535", "560", "585"
  - "610", "645", "680", "705", "730", "760", "810", "860"
  - "900", "940"

**示例：**
```json
{
  "name": "get_channel",
  "arguments": {
    "name": "680"
  }
}
```

**返回：**
```json
{
  "success": true,
  "data": 1234
}
```

### 2. get_all_spectrum

获取所有 18 个通道的光谱数据。

**参数：** 无

**示例：**
```json
{
  "name": "get_all_spectrum",
  "arguments": {}
}
```

**返回：**
```json
{
  "success": true,
  "data": {
    "410": 1234,
    "435": 1456,
    "460": 1678,
    ...
    "940": 2345
  }
}
```

## 使用场景

### 1. 植物生长监测

通过分析不同波长的光谱反射率，可以评估植物的健康状况：

- **680nm (红光)**：叶绿素吸收峰，反映光合作用强度
- **760nm (近红外)**：植物组织反射峰，反映生物量
- **NDVI 计算**：(NIR - Red) / (NIR + Red) = (760 - 680) / (760 + 680)

**AI 提示词示例：**
```
请获取当前光谱数据，计算 NDVI 指数，并评估植物健康状况。
```

### 2. 病害早期检测

某些病害会改变叶片的光谱特征：

- **510-560nm (绿光)**：叶绿素含量变化
- **645nm (红光)**：叶绿素降解
- **730nm (红边)**：植物胁迫响应

**AI 提示词示例：**
```
分析光谱数据中的红边位置和绿光反射率，判断是否存在病害迹象。
```

### 3. 营养状态评估

- **410-485nm (蓝紫光)**：类胡萝卜素含量
- **560nm (绿光)**：氮素营养状态
- **680nm (红光)**：叶绿素含量

**AI 提示词示例：**
```
根据蓝光和红光的吸收情况，评估植物的氮素营养状态。
```

## 配置说明

### 前端配置（MCP 商店）

在 MCP 商店中启用"光谱传感器"服务：

1. 打开 AI 助手页面
2. 点击右上角 MCP 图标
3. 找到"光谱传感器 (Spectrum Stravision)"
4. 点击"启用"

### 后端配置

工具定义已在 `lib/mcp/mcp-tool-definitions.ts` 中注册：

```typescript
'spectrum-stravision': [
  {
    type: 'function',
    function: {
      name: 'get_channel',
      description: '获取光谱传感器的特定通道值。',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: '要查询的通道名称',
            enum: ["410", "435", "460", ...]
          }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_all_spectrum',
      description: '获取光谱传感器的所有通道数据',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  }
]
```

工具执行器在 `lib/mcp/mcp-tool-executor.ts` 中实现：

```typescript
case 'get_channel':
case 'get_all_spectrum':
    return await executeSpectrumTool(functionName, args, config)
```

### 服务器端点配置

默认端点：`http://8.153.175.190:8000`

如果需要修改，可以在 MCP 配置中设置环境变量：
- `SPECTRUM_API_URL`: 自定义服务器地址

## 部署

请参考 `mcpserver_spectrum/deploy-guide.md` 了解如何将光谱 MCP 服务器部署到云端。

## 故障排查

### 1. 工具调用失败

**症状：** AI 提示"光谱服务连接错误"

**排查步骤：**
1. 检查服务器是否运行：`systemctl status spectrum-mcp`
2. 检查端口是否开放：`netstat -tlnp | grep 8000`
3. 测试 SSE 连接：`curl -N http://8.153.175.190:8000/sse`
4. 查看服务器日志：`journalctl -u spectrum-mcp -f`

### 2. 数据为空或为 0

**症状：** 所有通道返回 0 或空值

**排查步骤：**
1. 检查 MQTT 连接：查看服务器日志中的 `[MQTT] Connected` 消息
2. 检查 ESP32 设备是否在线并发送数据
3. 验证 MQTT 主题是否正确：`meimefarm/Spectrum`
4. 使用 MQTT 客户端订阅主题验证数据流

### 3. SSE 握手失败

**症状：** 日志显示 "SSE Handshake failed"

**排查步骤：**
1. 确认服务器使用 SSE 传输模式：`MCP_TRANSPORT=sse`
2. 检查防火墙是否阻止长连接
3. 尝试使用 HTTP 传输模式：`MCP_TRANSPORT=http`

## 最佳实践

### 1. 数据采集频率

建议每 5-10 秒采集一次光谱数据，避免过于频繁的请求。

### 2. 批量查询

优先使用 `get_all_spectrum` 获取完整数据，而不是多次调用 `get_channel`。

### 3. 数据缓存

在 AI 对话中，如果短时间内多次需要光谱数据，可以复用之前的结果。

### 4. 异常处理

当光谱数据异常（如全为 0）时，AI 应提示用户检查设备连接。

## 扩展功能

### 未来计划

1. **历史数据查询**：支持查询过去 24 小时的光谱数据
2. **数据可视化**：返回光谱曲线图表
3. **智能分析**：内置 NDVI、PRI 等植被指数计算
4. **多设备支持**：支持同时监控多个光谱传感器

## 相关文档

- [MCP 快速使用指南](../MCP_快速使用指南.md)
- [MCP 集成完整文档](../MCP_INTEGRATION_COMPLETE.md)
- [部署指南](../mcpserver_spectrum/deploy-guide.md)
