# AI助手JSON命令显示优化

## 问题描述

之前在AI助手界面中，当AI执行设备控制命令时，会显示原始的JSON格式，例如：

```json
{
  "action": "toggle_relay",
  "device": 5,
  "value": 1
}
```

这种显示方式对用户不友好，看起来很技术化。

## 解决方案

现在所有的IoT设备控制命令都不再显示原始JSON，而是显示为友好的工具使用卡片。

### 修改的文件

1. `app/ai-assistant/page.tsx`

### 具体修改

#### 1. 在 `renderTextContent` 函数中处理 ```json 代码块

当检测到 ```json 代码块包含IoT命令时，直接返回 `null` 不显示：

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
       if (commands.some(isIoTCommand)) {
          return (
              <div key={index} className="my-4 space-y-3">
                  {commands.map((cmd: any, i: number) => (
                      isIoTCommand(cmd) ? (
                          <DeviceControlCard 
                              key={i} 
                              command={cmd} 
                              status={autoExecuteCommands ? 'executed' : 'pending'}
                              onExecute={async (c) => {
                                  await executeCommands([c])
                              }}
                          />
                      ) : null
                  ))}
              </div>
          )
       }
    }
    // 如果不是IoT命令，不显示JSON，返回null
    return null
  } catch (e) {
      // Not valid JSON or not IoT command, don't show it
      return null
  }
}
```

#### 2. 在 ReactMarkdown 的 code 组件中过滤IoT命令

```typescript
// Try to parse JSON and check if it's an ECharts option, Schedule Task, or IoT Command
if (!inline && (!language || language === 'json')) {
  try {
    const content = String(children).replace(/\n$/, '')
    if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
      const data = JSON.parse(content)

      // Check for IoT Command - don't display JSON, it's already shown as DeviceControlCard
      if (data.action && (
        data.action === 'toggle_relay' || 
        data.action === 'set_led' || 
        data.action === 'control_camera' ||
        data.action === 'reset_camera' ||
        data.action === 'move_camera_and_look' ||
        data.action === 'take_camera_snapshot'
      )) {
        return null // Don't show JSON for IoT commands
      }

      // ... 其他处理逻辑
    }
  } catch (e) {
    // Not valid JSON or not a chart, continue to render as code
  }
}
```

#### 3. 删除重复的命令提取和执行按钮逻辑

之前代码会从文本中提取IoT命令并显示"立即执行指令"按钮，现在已经删除这部分逻辑，因为：
- IoT命令已经通过 `DeviceControlCard` 显示
- `DeviceControlCard` 已经包含执行功能
- 避免重复显示和混淆

删除的代码：
```typescript
// 删除了这部分
const commands: any[] = []
const matches = part.matchAll(/```json\s*([\s\S]*?)```/g)
for (const match of matches) {
  try {
    const json = JSON.parse(match[1])
    if (json.action === 'toggle_relay' || ...) {
      commands.push(json)
    }
  } catch { }
}

// 删除了执行按钮
{commands.length > 0 && !autoExecuteCommands && (
  <button onClick={() => executeCommands(commands)}>
    立即执行指令
  </button>
)}
```

## 效果

### 之前
显示原始JSON：
```json
{
  "action": "set_led",
  "r": 255,
  "g": 100,
  "b": 50
}
```

### 现在
显示友好的工具卡片：
```
┌─────────────────────────────────┐
│ 💡 RGB氛围灯                     │
│ 颜色已调整                       │
│                          🔴🟢🔵  │
└─────────────────────────────────┘
```

## 支持的命令类型

以下IoT命令都会显示为友好的卡片，而不是JSON：

1. `toggle_relay` - 继电器开关控制（水泵、风扇、补光灯）
2. `set_led` - RGB灯颜色控制
3. `control_camera` - 摄像头云台控制
4. `reset_camera` - 摄像头云台复位
5. `move_camera_and_look` - 移动摄像头并拍照
6. `take_camera_snapshot` - 拍摄监控截图

## 其他JSON的处理

- `schedule_task` - 仍然显示为 ScheduleCard
- ECharts图表配置 - 仍然渲染为图表
- 其他JSON - 正常显示为代码块

## 用户体验改进

1. 界面更简洁：不再显示技术性的JSON代码
2. 信息更直观：通过图标和文字清晰展示操作内容
3. 视觉更友好：使用卡片式设计，更符合现代UI风格
4. 状态更明确：显示设备状态（开启/关闭）和颜色预览
