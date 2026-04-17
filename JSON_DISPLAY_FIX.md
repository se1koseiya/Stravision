# JSON 显示修复 - 隐藏工具调用 JSON

## 📅 修复日期
2026-04-16

## 🐛 问题描述

AI 助手在回复时，有时会直接输出裸露的 JSON 代码块，特别是工具调用相关的 JSON，这些应该被隐藏但却显示给了用户。

### 问题示例

**不应该显示的 JSON**:
```json
{
  "action": "mcp_exa_search",
  "arguments": {
    "query": "草莓种植技术"
  }
}
```

**应该显示的 JSON**:
```json
{
  "action": "toggle_relay",
  "device": 5,
  "value": 1
}
```

## ✅ 解决方案

### 策略
1. **在内容清理阶段**: 移除工具调用相关的 JSON 代码块
2. **在渲染阶段**: 只渲染 IoT 设备控制命令，隐藏其他所有 JSON

## 🔧 修改内容

### 1. 增强内容清理逻辑

**文件**: `app/ai-assistant/page.tsx`

**位置**: `renderMessageContent` 函数中的内容清理部分

**修改内容**:
```typescript
// 1. 移除 MCP 工具调用的 JSON 块（以 mcp_ 开头的）
content = content.replace(/```json\s*\{\s*"(?:action|function|name)":\s*"mcp_[^"]*"[\s\S]*?\}\s*```/g, "");

// 2. 移除常见工具调用的 JSON 块
content = content.replace(/```json\s*\{\s*"(?:action|function)":\s*"(?:scrape|search|find|fetch|get|query|analyze)"[\s\S]*?\}\s*```/g, "");

// 3. 移除包含 tool_calls 或 function_call 的 JSON 块
content = content.replace(/```json\s*\{[\s\S]*?"tool_calls"[\s\S]*?\}\s*```/g, "");
content = content.replace(/```json\s*\{[\s\S]*?"function_call"[\s\S]*?\}\s*```/g, "");

// 4. 移除孤立的工具调用 JSON 文本（不在代码块中的）
content = content.replace(/^\s*\{\s*"(?:action|function|name)":\s*"mcp_[^"]*"[\s\S]*?\}\s*$/gm, "");

// 5. 移除包含 arguments 字段的工具调用 JSON
content = content.replace(/```json\s*\{[\s\S]*?"arguments":\s*\{[\s\S]*?\}[\s\S]*?\}\s*```/g, "");
```

### 2. 增强 JSON 渲染逻辑

**文件**: `app/ai-assistant/page.tsx`

**位置**: `renderTextContent` 函数中的 JSON 处理部分

**修改内容**:
```typescript
if (part.startsWith('```json')) {
  try {
    const jsonContent = part.replace(/^```json\s*/, '').replace(/```$/, '').trim()
    
    if (jsonContent.startsWith('{') || jsonContent.startsWith('[')) {
      const parsed = JSON.parse(jsonContent)
      const isIoTCommand = (obj: any) => obj.action && (
        obj.action === 'toggle_relay' || 
        obj.action === 'set_led' || 
        obj.action === 'control_camera' ||
        obj.action === 'reset_camera' ||
        obj.action === 'move_camera_and_look' ||
        obj.action === 'take_camera_snapshot'
      )
      
      const commands = Array.isArray(parsed) ? parsed : [parsed]
      
      // 只渲染 IoT 命令，其他 JSON 都隐藏
      if (commands.some(isIoTCommand)) {
        return <DeviceControlCard ... />
      } else {
        // 不是 IoT 命令的 JSON，完全隐藏
        console.log('[JSON Filter] Hiding non-IoT JSON block')
        return null
      }
    }
    return null
  } catch (e) {
    // 解析失败的 JSON，隐藏
    return null
  }
}
```

## 📊 过滤规则

### 会被隐藏的 JSON

1. **MCP 工具调用**
   ```json
   {
     "action": "mcp_exa_search",
     "arguments": { "query": "..." }
   }
   ```

2. **通用工具调用**
   ```json
   {
     "function": "search",
     "arguments": { ... }
   }
   ```

3. **OpenAI Function Calling 格式**
   ```json
   {
     "tool_calls": [...],
     "function_call": { ... }
   }
   ```

4. **包含 arguments 字段的 JSON**
   ```json
   {
     "name": "get_weather",
     "arguments": { "location": "..." }
   }
   ```

### 会被显示的 JSON

**只有 IoT 设备控制命令**:
```json
{
  "action": "toggle_relay",
  "device": 5,
  "value": 1
}
```

```json
{
  "action": "control_camera",
  "direction": 1,
  "distance_mm": 50
}
```

```json
{
  "action": "move_camera_and_look",
  "position": "left",
  "capture": true
}
```

## 🎯 工作流程

### 内容处理流程

```
AI 生成回复
  ↓
1. 内容清理阶段
   - 移除 <tool_call> 标签
   - 移除 MCP 工具 JSON
   - 移除通用工具 JSON
   - 移除 function_call JSON
   ↓
2. 内容分割
   - 按特殊标签分割
   - 按 JSON 代码块分割
   ↓
3. 渲染阶段
   - 检查 JSON 类型
   - 只渲染 IoT 命令
   - 隐藏其他 JSON
   ↓
4. 显示给用户
   - 纯文本内容
   - IoT 控制卡片
   - 其他 UI 组件
```

## 📝 日志输出

### 过滤日志
```
[JSON Filter] Hiding non-IoT JSON block: {"action":"mcp_exa_search"...
[JSON Filter] Hiding invalid JSON block
```

### 设备控制日志
```
[Device Control Debug] {
  assistantMode: 'auto',
  autoExecuteCommands: true,
  commandsCount: 1,
  expectedStatus: 'executed'
}
```

## 🧪 测试场景

### 场景 1: 搜索工具调用
**用户**: "搜索草莓种植技术"

**AI 回复**（原始）:
```
好的，我来搜索相关信息。

```json
{
  "action": "mcp_exa_search",
  "arguments": {
    "query": "草莓种植技术"
  }
}
```

根据搜索结果...
```

**显示给用户**（修复后）:
```
好的，我来搜索相关信息。

根据搜索结果...
```

### 场景 2: 设备控制
**用户**: "打开风扇"

**AI 回复**（原始）:
```
好的，我来打开风扇。

```json
{
  "action": "toggle_relay",
  "device": 6,
  "value": 1
}
```
```

**显示给用户**（修复后）:
```
好的，我来打开风扇。

[设备控制卡片]
┌─────────────────────────┐
│ 🎛️ 设备控制            │
│ 设备: 风扇 (ID: 6)      │
│ 操作: 开启              │
│ [执行] [取消]           │
└─────────────────────────┘
```

### 场景 3: 混合场景
**用户**: "搜索草莓病害防治，然后打开补光灯"

**AI 回复**（原始）:
```
我先搜索病害防治信息。

```json
{
  "action": "mcp_exa_search",
  "arguments": { "query": "草莓病害防治" }
}
```

根据搜索结果，建议打开补光灯。

```json
{
  "action": "toggle_relay",
  "device": 7,
  "value": 1
}
```
```

**显示给用户**（修复后）:
```
我先搜索病害防治信息。

根据搜索结果，建议打开补光灯。

[设备控制卡片]
┌─────────────────────────┐
│ 🎛️ 设备控制            │
│ 设备: RGB灯 (ID: 7)     │
│ 操作: 开启              │
│ [执行] [取消]           │
└─────────────────────────┘
```

## 🎨 用户体验改进

### 修复前
- ❌ 用户看到大量技术性的 JSON 代码
- ❌ 界面混乱，难以阅读
- ❌ 工具调用细节暴露给用户
- ❌ 专业性降低

### 修复后
- ✅ 界面简洁，只显示必要信息
- ✅ 工具调用在后台进行
- ✅ 设备控制以卡片形式展示
- ✅ 用户体验更专业

## ⚠️ 注意事项

### 保留的 JSON
只有 IoT 设备控制命令的 JSON 会被保留并渲染为控制卡片：
- `toggle_relay` - 继电器控制
- `set_led` - LED 控制
- `control_camera` - 摄像头移动
- `reset_camera` - 摄像头复位
- `move_camera_and_look` - 移动并拍照
- `take_camera_snapshot` - 拍照

### 调试
如果需要查看被过滤的 JSON，可以查看浏览器控制台：
```javascript
// 打开控制台，查看过滤日志
[JSON Filter] Hiding non-IoT JSON block: ...
```

## 🚀 未来优化

### 短期
- [ ] 添加更多工具调用模式的识别
- [ ] 支持自定义过滤规则
- [ ] 添加调试模式开关

### 长期
- [ ] 使用 AST 解析 JSON，更准确地识别类型
- [ ] 支持白名单/黑名单配置
- [ ] 提供管理界面配置过滤规则

## ✅ 验证清单

- [x] 移除 MCP 工具调用 JSON
- [x] 移除通用工具调用 JSON
- [x] 移除 function_call JSON
- [x] 保留 IoT 设备控制 JSON
- [x] 添加日志输出
- [x] 测试各种场景

## 🎉 总结

成功修复了 JSON 裸露显示的问题：

1. ✅ **内容清理**: 在渲染前移除工具调用 JSON
2. ✅ **智能过滤**: 只显示 IoT 设备控制命令
3. ✅ **用户体验**: 界面更简洁专业
4. ✅ **调试支持**: 控制台日志便于排查

现在用户不会再看到技术性的工具调用 JSON 了！

---

**修复日期**: 2026-04-16  
**状态**: ✅ 已完成  
**影响范围**: AI 助手消息渲染
