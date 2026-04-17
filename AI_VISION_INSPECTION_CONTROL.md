# AI 视觉巡检功能控制

## 📋 功能说明

AI 视觉巡检功能允许 AI 助手通过摄像头进行实时画面分析，包括：
- **move_camera_and_look**: 移动云台并拍摄分析
- **take_camera_snapshot**: 获取摄像头截图

## 🎯 新增功能

在 AI 功能管理中新增了 **enableVisionInspection** 配置项，允许管理员单独控制视觉巡检功能。

### 配置位置

1. **管理员后台**: `/admin` → "AI 功能设置" → "操作执行类" → "AI 视觉巡检"
2. **配置文件**: `data/ai-features-config.json` → `enableVisionInspection`

## 🔧 实现细节

### 1. 类型定义

在以下文件中添加了 `enableVisionInspection` 字段：

- `lib/ai/prompt-templates.ts` - AIFeatureConfig 接口
- `lib/hooks/use-ai-features.ts` - AIFeatureConfig 接口和默认配置
- `components/admin/ai-features-settings.tsx` - 管理界面配置

### 2. 系统提示词

当 `enableVisionInspection: false` 时，系统提示词会包含：

```
- 视觉巡检（move_camera_and_look, take_camera_snapshot）：不要使用摄像头进行视觉巡检或截图
```

### 3. 前端执行检查

在 `app/ai-assistant/page.tsx` 中添加了两处检查：

#### move_camera_and_look 命令检查
```typescript
if (aiFeatures.enableVisionInspection === false) {
  console.log('[Vision Inspection] Feature disabled by admin')
  showNotice("❌ 功能已禁用", "管理员已禁用视觉巡检功能", "error")
  handleSend('【系统反馈】视觉巡检功能已被管理员禁用，无法执行此操作。', [], true, true)
  continue // 跳过此命令
}
```

#### take_camera_snapshot 命令检查
```typescript
if (aiFeatures.enableVisionInspection === false) {
  console.log('[Camera Snapshot] Feature disabled by admin')
  showNotice("❌ 功能已禁用", "管理员已禁用摄像头截图功能", "error")
  handleSend('【系统反馈】摄像头截图功能已被管理员禁用，无法执行此操作。', [], true, true)
  continue // 跳过此命令
}
```

## 🛡️ 三层防护

| 层级 | 位置 | 作用 |
|------|------|------|
| 1️⃣ | 系统提示词 | 告诉 AI 不要使用视觉巡检 |
| 2️⃣ | 前端执行检查 | 阻止命令执行 |
| 3️⃣ | 用户反馈 | 告知用户功能已禁用 |

## 📊 配置示例

### 启用视觉巡检（默认）
```json
{
  "enableVisionInspection": true
}
```

### 禁用视觉巡检
```json
{
  "enableVisionInspection": false
}
```

## 🧪 测试步骤

### 测试 1: 禁用视觉巡检

1. **修改配置**
   ```json
   {
     "enableVisionInspection": false
   }
   ```

2. **重启服务**
   ```bash
   npm run dev
   ```

3. **测试命令**
   - 发送："帮我看一下大棚里的植物生长情况"
   - 或："拍一张摄像头的照片"

4. **预期结果**
   - ✅ AI 不会尝试使用视觉巡检
   - ✅ 如果 AI 尝试执行，会被前端拦截
   - ✅ 显示通知："管理员已禁用视觉巡检功能"
   - ✅ AI 收到反馈："视觉巡检功能已被管理员禁用"

### 测试 2: 启用视觉巡检

1. **修改配置**
   ```json
   {
     "enableVisionInspection": true
   }
   ```

2. **刷新页面**

3. **测试命令**
   - 发送："帮我看一下大棚里的植物生长情况"

4. **预期结果**
   - ✅ AI 可以正常使用视觉巡检
   - ✅ 摄像头画面正常显示
   - ✅ AI 可以分析画面内容

## 🔍 调试日志

### 功能被禁用时
```
[Vision Inspection] Feature disabled by admin
[Camera Snapshot] Feature disabled by admin
```

### 配置加载
```
[AI Features] Current config: {enableVisionInspection: false, ...}
```

## 💡 使用场景

### 何时禁用视觉巡检？

1. **隐私保护**: 不希望 AI 访问摄像头
2. **性能优化**: 减少视频流和图像处理的资源消耗
3. **功能限制**: 限制 AI 的能力范围
4. **测试环境**: 摄像头未配置或不可用

### 何时启用视觉巡检？

1. **智能监控**: 需要 AI 分析大棚画面
2. **病害检测**: 通过视觉识别植物病害
3. **生长监测**: 定期拍照记录植物生长
4. **远程巡检**: 用户不在现场时的远程查看

## 📝 与其他功能的关系

### enableDeviceControl vs enableVisionInspection

- **enableDeviceControl**: 控制所有设备控制 JSON 指令（继电器、云台等）
- **enableVisionInspection**: 仅控制视觉巡检功能（摄像头相关）

**关系**:
- 如果 `enableDeviceControl: false`，所有设备控制都被禁用（包括云台移动）
- 如果 `enableVisionInspection: false`，只禁用视觉巡检，其他设备控制仍可用
- 两者可以独立配置

### 推荐配置

**场景 1: 完全禁用设备控制**
```json
{
  "enableDeviceControl": false,
  "enableVisionInspection": false
}
```

**场景 2: 允许设备控制，但禁用视觉巡检**
```json
{
  "enableDeviceControl": true,
  "enableVisionInspection": false
}
```

**场景 3: 完全启用（默认）**
```json
{
  "enableDeviceControl": true,
  "enableVisionInspection": true
}
```

## 🎓 技术细节

### 命令拦截流程

```
用户请求
    ↓
AI 生成回复（包含 move_camera_and_look 命令）
    ↓
[Layer 1] 系统提示词警告（理想情况下 AI 不会生成）
    ↓
前端解析命令
    ↓
[Layer 2] 检查 aiFeatures.enableVisionInspection
    ↓
如果禁用 → 显示错误 + 发送反馈给 AI
如果启用 → 执行视觉巡检
```

### 错误处理

当功能被禁用时：
1. **控制台日志**: 记录拦截信息
2. **用户通知**: 显示友好的错误提示
3. **AI 反馈**: 告知 AI 功能不可用，让 AI 调整策略

## 📚 相关文档

- **AI_FEATURES_FIX_COMPLETE.md** - AI 功能控制总体说明
- **AI_FEATURES_FRONTEND_FILTER_FIX.md** - 前端过滤实现细节
- **AI_FEATURES_TEST_QUICK_GUIDE.md** - 测试指南

## ✅ 修改文件清单

1. ✅ `components/admin/ai-features-settings.tsx` - 添加管理界面选项
2. ✅ `lib/ai/prompt-templates.ts` - 添加类型定义和禁用指令
3. ✅ `lib/hooks/use-ai-features.ts` - 添加类型定义和默认值
4. ✅ `data/ai-features-config.json` - 添加配置项
5. ✅ `app/ai-assistant/page.tsx` - 添加执行检查（2 处）

## 🎉 总结

现在管理员可以通过后台界面或配置文件单独控制 AI 视觉巡检功能，提供了更细粒度的功能管理能力。

**核心优势**:
- 🎯 **精细控制**: 可以单独禁用视觉巡检，而不影响其他设备控制
- 🛡️ **多层防护**: 系统提示词 + 前端检查 + 用户反馈
- 🔍 **完整日志**: 便于调试和监控
- 👥 **用户友好**: 清晰的错误提示和反馈机制
