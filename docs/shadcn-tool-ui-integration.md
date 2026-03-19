# Shadcn Tool UI 集成指南

## 概述

我们已经成功集成了 shadcn/ui 的 Tool 组件来替换原有的工具使用指示器，提供更现代、更一致的用户界面。

## 新组件结构

### 1. 核心组件

#### `components/ai/tool.tsx`
- 来自 shadcn/ui 的官方 Tool 组件
- 提供可折叠的工具执行界面
- 支持参数显示、结果展示和错误处理

#### `components/ai/mcp-tool-display.tsx`
- MCP 工具的适配器组件
- 将现有的工具数据格式转换为 shadcn Tool 格式
- 支持中文工具名称映射

#### `components/ui/code-block.tsx`
- 简单的代码块显示组件
- 用于显示 JSON 格式的参数和结果

#### `components/ui/collapsible.tsx`
- 修复后的 Radix UI Collapsible 组件
- 提供折叠/展开功能

### 2. 工具名称映射

```typescript
const displayNames: Record<string, string> = {
  'get_all_spectrum': '光谱数据获取',
  'get_channel': '单通道光谱',
  'mcp_caiyun_weather': '彩云天气',
  'mcp_gaode_weather': '高德天气',
  'mcp_hefeng_weather': '和风天气',
  'mcp_brave_search': 'Brave 搜索',
  'mcp_exa_search': 'Exa 搜索',
  'mcp_firecrawl_scrape': '网页抓取',
  'mcp_amap_route': '路线规划',
  'device_status_check': '设备状态检查'
}
```

### 3. 状态映射

```typescript
const mapResultToState = (result?: string): ToolUIPart["state"] => {
  switch (result) {
    case 'success': return 'output-available'
    case 'error': return 'output-error'
    case 'loading': return 'input-available'
    default: return 'output-available'
  }
}
```

## 使用方式

### 在 AI 助手页面中

```typescript
<MCPToolDisplay
  toolName={toolName}
  toolDescription={description}
  result={result as 'success' | 'error' | 'loading'}
  executionTime={executionTime ? parseInt(executionTime) : undefined}
  input={input ? JSON.parse(input) : undefined}
  output={output ? JSON.parse(output) : undefined}
  errorText={result === 'error' ? details : undefined}
/>
```

### 在工作室面板中

```typescript
<MCPToolDisplay
  key={idx}
  toolName={data.name}
  result={data.result?.error ? 'error' : 'success'}
  input={data.input}
  output={data.result?.error ? undefined : data.result}
  errorText={data.result?.error}
  className="mb-4"
/>
```

## 功能特性

### 1. 状态指示
- **Pending**: 输入流式传输中
- **Running**: 工具正在执行（带动画）
- **Completed**: 执行成功（绿色勾选）
- **Error**: 执行失败（红色叉号）
- **Denied**: 执行被拒绝（橙色叉号）

### 2. 可折叠界面
- 默认展开显示参数和结果
- 点击标题栏可折叠/展开
- 平滑的动画过渡效果

### 3. 参数和结果显示
- **Parameters**: JSON 格式显示输入参数
- **Result**: JSON 格式显示执行结果
- **Error**: 红色背景显示错误信息

### 4. 深浅色主题支持
- 自动适配系统主题
- 一致的颜色方案
- 良好的对比度

## 测试页面

访问 `/test-tool-ui` 查看各种状态的工具UI示例：
- 成功状态的天气查询
- 错误状态的搜索请求
- 加载状态的光谱数据获取
- 设备状态检查结果

## 迁移说明

### 替换的组件
- `ToolUsageIndicator` → `MCPToolDisplay`
- 自定义工具卡片 → 统一的 shadcn Tool 组件

### 数据格式变化
- 原来的 `details` 字段分离为 `input`、`output` 和 `errorText`
- 状态值映射到 shadcn 的标准状态

### 样式改进
- 更现代的卡片设计
- 一致的间距和圆角
- 更好的视觉层次
- 标准化的状态指示器

## 依赖包

新增依赖：
```json
{
  "@radix-ui/react-collapsible": "^1.0.3"
}
```

## 注意事项

1. **JSON 解析**: 确保传入的 `input` 和 `output` 是有效的 JSON 字符串
2. **错误处理**: `errorText` 只在 `result === 'error'` 时显示
3. **性能**: 大量工具调用时考虑虚拟化滚动
4. **可访问性**: 组件支持键盘导航和屏幕阅读器

## 未来扩展

1. **工具图标**: 为不同类型的工具添加特定图标
2. **执行时间**: 更详细的性能指标显示
3. **批量操作**: 支持多个工具的批量展开/折叠
4. **导出功能**: 支持导出工具执行结果
5. **搜索过滤**: 在工作室中添加工具搜索功能