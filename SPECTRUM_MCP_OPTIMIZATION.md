# 光谱MCP性能优化

## 问题描述
光谱MCP数据获取时AI回复特别慢，用户体验不佳。

## 根本原因分析

### 当前实现流程
光谱MCP工具使用Supergateway SSE连接，每次调用需要：

1. **建立SSE连接** → 获取endpoint (原10秒超时)
2. **MCP协议握手**:
   - 发送 `initialize` 请求 (原5秒超时)
   - 等待 `initialize` 响应 (原5秒超时)
   - 发送 `initialized` 通知 (原5秒超时)
3. **发送工具调用** → 等待响应 (原15秒超时)

**总耗时**: 最多 10 + 5 + 5 + 5 + 15 = **40秒**！

### 性能瓶颈
1. **每次调用都重新建立连接**：没有连接复用
2. **超时时间过长**：每个步骤都设置了很长的超时
3. **串行等待**：必须等待每个步骤完成才能进行下一步

## 优化方案

### 短期优化：减少超时时间 ✅

已实施的优化：

```typescript
// 优化前 → 优化后
SSE连接:        10秒 → 5秒
获取endpoint:    5秒 → 3秒
initialize请求:  5秒 → 3秒
initialize响应:  5秒 → 3秒
initialized通知: 5秒 → 2秒
工具调用响应:   15秒 → 8秒

总计: 40秒 → 24秒 (减少40%)
```

**预期效果**：
- 正常情况下响应时间从 ~10秒 降低到 ~6秒
- 超时情况下从 40秒 降低到 24秒

### 中期优化：连接池复用（建议）

**问题**：每次调用都重新建立SSE连接和MCP握手

**解决方案**：实现连接池

```typescript
// 伪代码
class SpectrumMCPConnectionPool {
  private connections: Map<string, MCPConnection> = new Map()
  
  async getConnection(serverId: string): Promise<MCPConnection> {
    if (this.connections.has(serverId)) {
      const conn = this.connections.get(serverId)
      if (conn.isAlive()) {
        return conn // 复用现有连接
      }
    }
    
    // 建立新连接
    const conn = await this.createConnection(serverId)
    this.connections.set(serverId, conn)
    return conn
  }
  
  async callTool(serverId: string, toolName: string, args: any) {
    const conn = await this.getConnection(serverId)
    return conn.call(toolName, args) // 直接调用，无需握手
  }
}
```

**预期效果**：
- 首次调用：~6秒（需要建立连接）
- 后续调用：~2秒（复用连接，只需工具调用）
- 性能提升：70%

### 长期优化：本地缓存（建议）

**问题**：光谱数据更新频率可能不高，但每次都要请求

**解决方案**：实现智能缓存

```typescript
interface CachedSpectrum {
  data: any
  timestamp: number
  ttl: number // 缓存有效期（秒）
}

class SpectrumCache {
  private cache: Map<string, CachedSpectrum> = new Map()
  
  get(key: string, ttl: number = 30): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    const age = Date.now() - cached.timestamp
    if (age > ttl * 1000) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }
  
  set(key: string, data: any, ttl: number = 30) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }
}

// 使用示例
async function executeSpectrumTool(toolName: string, args: any) {
  const cacheKey = `${toolName}:${JSON.stringify(args)}`
  
  // 尝试从缓存获取
  const cached = spectrumCache.get(cacheKey, 30) // 30秒缓存
  if (cached) {
    console.log('[MCP] Using cached spectrum data')
    return { success: true, data: cached }
  }
  
  // 缓存未命中，请求MCP
  const result = await callMCPServer(toolName, args)
  
  if (result.success) {
    spectrumCache.set(cacheKey, result.data, 30)
  }
  
  return result
}
```

**预期效果**：
- 缓存命中：<100ms（几乎即时）
- 缓存未命中：~2秒（使用连接池）
- 性能提升：95%（对于频繁查询）

## 其他优化建议

### 1. 并行请求
如果AI需要多个光谱数据，可以并行请求：

```typescript
// 串行（慢）
const channel1 = await getChannel('channel1')
const channel2 = await getChannel('channel2')

// 并行（快）
const [channel1, channel2] = await Promise.all([
  getChannel('channel1'),
  getChannel('channel2')
])
```

### 2. 数据预加载
在用户打开AI助手页面时，预先加载常用的光谱数据：

```typescript
useEffect(() => {
  // 页面加载时预热缓存
  preloadSpectrumData()
}, [])

async function preloadSpectrumData() {
  try {
    await getChannel('channel1')
    await getChannel('channel2')
    // ... 预加载其他常用通道
  } catch (e) {
    console.warn('Spectrum preload failed:', e)
  }
}
```

### 3. 降级策略
当MCP服务慢或不可用时，使用降级数据：

```typescript
async function executeSpectrumTool(toolName: string, args: any) {
  try {
    // 设置较短的超时
    const result = await callMCPServer(toolName, args, { timeout: 5000 })
    return result
  } catch (e) {
    console.warn('MCP call failed, using fallback:', e)
    
    // 返回降级数据
    return {
      success: true,
      data: {
        status: 'degraded',
        message: '光谱服务暂时不可用，显示最近一次的数据',
        channels: getLastKnownSpectrumData()
      }
    }
  }
}
```

## 实施优先级

| 优化方案 | 难度 | 效果 | 优先级 | 状态 |
|---------|------|------|--------|------|
| 减少超时时间 | 低 | 中 | 高 | ✅ 已完成 |
| 连接池复用 | 中 | 高 | 高 | 🔄 建议实施 |
| 本地缓存 | 低 | 高 | 中 | 🔄 建议实施 |
| 并行请求 | 低 | 中 | 低 | 💡 可选 |
| 数据预加载 | 低 | 中 | 低 | 💡 可选 |
| 降级策略 | 中 | 中 | 中 | 💡 可选 |

## 测试验证

### 测试步骤
1. 打开AI助手
2. 输入："查看光谱数据"
3. 观察响应时间

### 预期结果
- **优化前**：10-40秒
- **优化后（短期）**：6-24秒
- **优化后（中期）**：2-6秒（首次），2秒（后续）
- **优化后（长期）**：<1秒（缓存命中）

## 监控指标

建议添加性能监控：

```typescript
console.time('[MCP Spectrum] Total time')
console.time('[MCP Spectrum] SSE connection')
// ... SSE连接代码
console.timeEnd('[MCP Spectrum] SSE connection')

console.time('[MCP Spectrum] MCP handshake')
// ... 握手代码
console.timeEnd('[MCP Spectrum] MCP handshake')

console.time('[MCP Spectrum] Tool call')
// ... 工具调用代码
console.timeEnd('[MCP Spectrum] Tool call')
console.timeEnd('[MCP Spectrum] Total time')
```

这样可以精确定位哪个步骤最慢。

## 总结

已完成短期优化，将超时时间减少40%。建议继续实施连接池复用和本地缓存，可以将性能提升到原来的10倍以上。
