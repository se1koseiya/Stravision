# AI 功能管理后台

## 功能概述

在管理员后台（`/admin` 页面）新增了 **AI 功能开关** 面板，允许管理员控制 AI 助手的所有标签输出功能。

## 访问路径

1. 登录管理员账号
2. 访问 `/admin` 页面
3. 切换到 **System Settings** 标签页
4. 在页面顶部找到 **AI 功能开关** 卡片

## 功能分类

### 1. UI 组件类

| 功能 | 标签 | 说明 |
|------|------|------|
| 任务规划器 | `<TASK_LIST>` | 显示 AI 的任务执行流程和进度 |
| 设备状态卡片 | `<DEVICE_BENTO>` | 显示环境数据和传感器读数 |
| 设备控制面板 | `<CONTROL_BENTO>` | 显示设备控制界面 |
| 监控画面 | `<MONITOR>` | 显示摄像头实时监控 |
| 定时任务列表 | `<SCHEDULED_TASKS>` | 显示系统定时任务管理界面 |
| 数据图表 | `<CHART>` | 显示 ECharts/Vega-Lite 可视化图表 |
| 光谱数据 | `<SPECTRAL>` | 显示光谱分析数据 |

### 2. 功能增强类

| 功能 | 标签 | 说明 |
|------|------|------|
| 思考过程 | `<REASONING>` | 显示 AI 的推理思维链 |
| 引用来源 | `<SOURCES>` | 显示回答的参考来源和引用 |
| 工具调用记录 | `<TOOL_USED>` | 显示 MCP 工具的调用过程 |

### 3. 操作执行类

| 功能 | 标签 | 说明 |
|------|------|------|
| 定时任务创建 | `<SCHEDULE_TASK>` | 允许 AI 创建定时任务 |
| 设备控制指令 | JSON Control | 允许 AI 输出设备控制 JSON 指令 |

### 4. 预览类

| 功能 | 标签 | 说明 |
|------|------|------|
| HTML 预览 | HTML Preview | 显示 HTML 代码的实时预览 |
| 网页预览 | `<WEB_PREVIEW>` | 显示网页内容预览 |

## 使用方法

### 管理员操作

1. **开启/关闭功能**
   - 点击对应功能右侧的开关按钮
   - 开关变为蓝色表示已启用
   - 开关变为灰色表示已禁用

2. **保存配置**
   - 调整完所有开关后，点击底部的 **保存配置** 按钮
   - 系统会显示保存成功的提示
   - 新配置将在下次 AI 回复时生效

3. **重置配置**
   - 点击 **重置** 按钮可恢复所有功能为默认启用状态
   - 重置后需要点击 **保存配置** 才会生效

### 前端集成

在需要检查功能开关的组件中使用 `useAIFeatures` hook：

```typescript
import { useAIFeatures } from "@/lib/hooks/use-ai-features"

function MyComponent() {
  const { config, loading } = useAIFeatures()
  
  if (loading) {
    return <div>Loading...</div>
  }
  
  // 根据配置决定是否渲染某个功能
  if (!config.enableTaskList) {
    return null // 不渲染任务列表
  }
  
  return <TaskList />
}
```

### AI 助手集成

在 AI 助手页面中，根据配置过滤标签输出：

```typescript
// 示例：过滤 TASK_LIST 标签
if (!config.enableTaskList) {
  content = content.replace(/<TASK_LIST>[\s\S]*?<\/TASK_LIST>/g, '')
}

// 示例：过滤 DEVICE_BENTO 标签
if (!config.enableDeviceBento) {
  content = content.replace(/<DEVICE_BENTO\s*\/?>/g, '')
}
```

## 技术实现

### 后端 API

#### 管理员 API（需要管理员权限）

- **GET** `/api/admin/ai-features` - 获取配置
- **POST** `/api/admin/ai-features` - 保存配置

#### 公共 API（所有用户可访问）

- **GET** `/api/ai-features` - 获取配置

### 配置存储

配置文件存储在 `data/ai-features-config.json`：

```json
{
  "enableTaskList": true,
  "enableDeviceBento": true,
  "enableControlBento": true,
  "enableMonitor": true,
  "enableScheduledTasks": true,
  "enableChart": true,
  "enableSpectral": true,
  "enableReasoning": true,
  "enableSources": true,
  "enableToolUsed": true,
  "enableScheduleTask": true,
  "enableDeviceControl": true,
  "enableHTMLPreview": true,
  "enableWebPreview": true
}
```

### 默认配置

所有功能默认启用（`true`）。如果配置文件不存在或读取失败，系统会使用默认配置。

## 使用场景

### 1. 调试模式

在开发或调试时，可以临时关闭某些功能来简化输出：

```
关闭 enableTaskList → AI 不会输出任务规划器
关闭 enableReasoning → AI 不会输出思考过程
```

### 2. 性能优化

对于性能敏感的场景，可以关闭不必要的功能：

```
关闭 enableChart → 减少图表渲染开销
关闭 enableMonitor → 减少视频流加载
```

### 3. 功能限制

根据用户权限或业务需求，限制某些功能的使用：

```
关闭 enableDeviceControl → 禁止 AI 控制设备
关闭 enableScheduleTask → 禁止 AI 创建定时任务
```

### 4. 用户体验优化

根据用户反馈，临时禁用某些可能引起困惑的功能：

```
关闭 enableToolUsed → 隐藏工具调用细节
关闭 enableReasoning → 只显示最终答案
```

## 注意事项

1. **配置生效时机**
   - 配置保存后立即生效
   - 已经渲染的内容不会改变
   - 新的 AI 回复会应用新配置

2. **权限要求**
   - 只有 `admin` 和 `super_admin` 角色可以修改配置
   - 所有用户都可以读取配置（用于前端渲染）

3. **配置持久化**
   - 配置保存在文件系统中
   - 服务器重启后配置不会丢失
   - 建议定期备份配置文件

4. **向后兼容**
   - 如果配置文件中缺少某个字段，会使用默认值（`true`）
   - 新增功能开关不会影响现有配置

## 相关文件

- `components/admin/ai-features-settings.tsx` - 管理界面组件
- `app/api/admin/ai-features/route.ts` - 管理员 API
- `app/api/ai-features/route.ts` - 公共 API
- `lib/hooks/use-ai-features.ts` - React Hook
- `app/admin/page.tsx` - 管理员页面
- `data/ai-features-config.json` - 配置文件（运行时生成）

## 未来扩展

可以考虑添加以下功能：

1. **用户级别配置** - 允许每个用户自定义功能开关
2. **配置历史** - 记录配置变更历史
3. **批量操作** - 一键启用/禁用所有功能
4. **配置模板** - 预设多种配置方案（调试模式、生产模式等）
5. **实时生效** - 通过 WebSocket 推送配置变更，无需刷新页面

## 更新日期

2026-04-16
