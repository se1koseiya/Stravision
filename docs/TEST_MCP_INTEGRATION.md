# MCP 集成测试指南

## 已完成的工作

### 1. 后端集成 (app/api/chat/route.ts)
- ✅ 添加 `mcpConfigs` 参数接收
- ✅ 实现天气关键词检测逻辑
- ✅ 自动调用 MCP 天气 API
- ✅ 将 MCP 数据注入系统提示词
- ✅ 添加 MCP 工具说明到 AI 上下文

### 2. 天气 API 路由 (app/api/mcp/weather/route.ts)
- ✅ 支持彩云天气、高德天气、和风天气
- ✅ 添加城市名到经纬度映射
- ✅ 简化参数处理（统一使用 city 参数）

### 3. 前端集成 (app/ai-assistant/page.tsx)
- ✅ 从 localStorage 读取 MCP 配置
- ✅ 发送 MCP 配置到聊天 API

## 测试步骤

### 步骤 1: 配置 MCP 服务器

1. 访问 AI 助手页面
2. 点击 "MCP 商店" 按钮
3. 找到以下任一天气服务：
   - 彩云天气
   - 高德天气
   - 和风天气
4. 点击服务卡片，在弹出的对话框中：
   - 输入 API Key（需要先去对应平台注册获取）
   - 点击"安装"按钮
5. 确认服务已启用（绿色勾选图标）

### 步骤 2: 测试天气查询

在 AI 助手中输入以下测试问题：

```
北京今天天气怎么样？
```

```
上海明天会下雨吗？
```

```
深圳这周的天气预报
```

### 步骤 3: 验证结果

AI 应该：
1. 自动检测到天气相关关键词
2. 调用已启用的 MCP 天气服务
3. 返回真实的天气数据
4. 在回复中包含：
   - 当前温度
   - 湿度
   - 天气状况
   - 预报信息

### 步骤 4: 检查 MCP 状态指示器

在输入框左侧应该看到：
- 绿色徽章显示已启用的 MCP 服务数量
- 点击可查看已启用的服务列表

## 调试技巧

### 查看 MCP 配置
在浏览器控制台执行：
```javascript
JSON.parse(localStorage.getItem('mcp-servers'))
```

### 查看网络请求
1. 打开浏览器开发者工具 (F12)
2. 切换到 Network 标签
3. 发送天气查询
4. 查找 `/api/mcp/weather` 请求
5. 检查请求参数和响应数据

### 常见问题

**问题 1: AI 没有调用 MCP 服务**
- 检查 MCP 服务是否已启用
- 检查 API Key 是否正确配置
- 确认消息中包含天气关键词

**问题 2: API 返回错误**
- 检查 API Key 是否有效
- 检查 API 配额是否用完
- 查看浏览器控制台的错误信息

**问题 3: 城市识别错误**
- 当前支持的城市列表在 `app/api/mcp/weather/route.ts` 中
- 可以添加更多城市到 `CITY_COORDS` 映射

## 扩展功能

### 添加更多 MCP 服务

要添加其他类型的 MCP 服务（如地图、传感器等），需要：

1. 在 `app/api/chat/route.ts` 中添加关键词检测
2. 创建对应的 API 路由（如 `/api/mcp/maps`）
3. 实现服务调用逻辑
4. 将数据注入到系统提示词

### 示例：添加地图服务

```typescript
// 在 chat/route.ts 中
const mapKeywords = ['路线', '导航', '地图', '怎么去', '距离']
const isMapQuery = mapKeywords.some(keyword => userText.includes(keyword))

if (isMapQuery && mcpConfigs) {
  const mapService = mcpConfigs.find(c => c.enabled && c.id === 'gaode-map')
  if (mapService) {
    // 调用地图 API
    const mapData = await fetch('/api/mcp/maps', { ... })
    // 注入数据
  }
}
```

## 性能优化建议

1. **缓存天气数据**: 同一城市的天气数据可以缓存 10-30 分钟
2. **并行调用**: 如果启用多个服务，可以并行调用提高速度
3. **降级策略**: MCP 调用失败时，使用传统天气 API 作为备选

## 下一步计划

- [ ] 添加更多农业相关 MCP 服务（土壤传感器、病害识别等）
- [ ] 实现 MCP 服务的健康检查
- [ ] 添加 MCP 调用日志和统计
- [ ] 支持自定义 MCP 服务器
- [ ] 实现 MCP 服务的自动重试机制
