# 客户端调度器使用指南

## 概述

客户端调度器是一个纯前端的定时任务解决方案，无需服务器端 Cron Job，使用浏览器的 `setTimeout` 实现。

## 优势

✅ **无需服务器配置** - 不需要 Vercel Cron 或外部 Cron 服务  
✅ **即时响应** - 任务在用户浏览器中执行，无延迟  
✅ **简单易用** - 只需几行代码即可使用  
✅ **持久化** - 任务保存在 localStorage，刷新页面不丢失  
✅ **浏览器通知** - 支持原生浏览器通知  

## 限制

⚠️ **需要页面打开** - 用户必须保持页面打开才能执行任务  
⚠️ **单设备** - 任务只在创建它的设备上执行  
⚠️ **浏览器限制** - 关闭浏览器后任务会失效  

## 快速开始

### 1. 在 AI 助手中集成

```tsx
// app/ai-assistant/page.tsx
import { useClientScheduler } from '@/lib/ai/client-scheduler'

function AIAssistantPage() {
  const { scheduleTask, getPendingTasks } = useClientScheduler()
  
  // AI 创建定时任务
  const handleAISchedule = (description: string, delayMinutes: number) => {
    const taskId = scheduleTask(
      description,
      delayMinutes,
      'analysis',
      { /* 任务参数 */ },
      async (task) => {
        // 任务执行时的回调
        console.log('Task executed:', task)
        
        // 重新调用 AI 进行分析
        await fetch('/api/chat', {
          method: 'POST',
          body: JSON.stringify({
            messages: [{
              role: 'user',
              content: `定时任务触发：${task.description}`
            }]
          })
        })
      }
    )
    
    return taskId
  }
  
  return (
    // ... 你的 UI
  )
}
```

### 2. 显示任务列表

```tsx
import { ClientScheduledTasks } from '@/components/ai/client-scheduled-tasks'

// 在侧边栏或设置中添加
<ClientScheduledTasks />
```

### 3. AI 如何使用

在 AI 的 system prompt 中添加：

```markdown
## 定时任务功能

当用户要求"X分钟后做某事"时，你可以创建定时任务。

### 使用方法

1. 告诉用户你已经设置了定时任务
2. 在响应中包含特殊标记：

<SCHEDULE_TASK>
{
  "description": "5分钟后检查水泵状态",
  "delayMinutes": 5,
  "taskType": "analysis",
  "payload": {
    "action": "check_water_pump"
  }
}
</SCHEDULE_TASK>

### 示例对话

用户："5分钟后提醒我检查水泵"
AI："好的，我已经设置了一个定时任务，将在 5 分钟后提醒您检查水泵状态。"

<SCHEDULE_TASK>
{
  "description": "检查水泵运行状态",
  "delayMinutes": 5,
  "taskType": "reminder",
  "payload": {
    "device": "water_pump",
    "action": "check_status"
  }
}
</SCHEDULE_TASK>
```

### 4. 前端解析 AI 响应

```tsx
// 解析 AI 响应中的 SCHEDULE_TASK 标记
function parseScheduleTask(content: string) {
  const match = content.match(/<SCHEDULE_TASK>([\s\S]*?)<\/SCHEDULE_TASK>/)
  if (!match) return null
  
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

// 在收到 AI 响应后
const taskData = parseScheduleTask(aiResponse)
if (taskData) {
  scheduleTask(
    taskData.description,
    taskData.delayMinutes,
    taskData.taskType,
    taskData.payload,
    async (task) => {
      // 执行任务
      await handleTaskExecution(task)
    }
  )
}
```

## 完整示例

### 在 AI 助手页面中集成

```tsx
"use client"

import { useState, useEffect } from 'react'
import { useClientScheduler } from '@/lib/ai/client-scheduler'
import { ClientScheduledTasks } from '@/components/ai/client-scheduled-tasks'
import { toast } from 'sonner'

export default function AIAssistantPage() {
  const { scheduleTask } = useClientScheduler()
  const [messages, setMessages] = useState([])
  
  // 处理 AI 响应
  const handleAIResponse = async (response: string) => {
    // 检查是否包含定时任务
    const taskMatch = response.match(/<SCHEDULE_TASK>([\s\S]*?)<\/SCHEDULE_TASK>/)
    
    if (taskMatch) {
      try {
        const taskData = JSON.parse(taskMatch[1])
        
        // 创建定时任务
        const taskId = scheduleTask(
          taskData.description,
          taskData.delayMinutes,
          taskData.taskType,
          taskData.payload,
          async (task) => {
            // 任务执行时的回调
            toast.info(`定时任务执行：${task.description}`)
            
            // 根据任务类型执行不同操作
            switch (task.taskType) {
              case 'analysis':
                await performAnalysis(task.payload)
                break
              case 'reminder':
                showReminder(task.description)
                break
              case 'notification':
                showNotification(task.description)
                break
            }
          }
        )
        
        toast.success(`定时任务已创建：${taskData.description}`)
        
        // 从响应中移除 SCHEDULE_TASK 标记
        response = response.replace(/<SCHEDULE_TASK>[\s\S]*?<\/SCHEDULE_TASK>/g, '')
      } catch (error) {
        console.error('Failed to parse schedule task:', error)
      }
    }
    
    // 显示 AI 响应
    setMessages(prev => [...prev, { role: 'assistant', content: response }])
  }
  
  // 执行分析任务
  const performAnalysis = async (payload: any) => {
    // 调用分析 API
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    
    const result = await res.json()
    
    // 将结果添加到聊天中
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `定时分析完成：${JSON.stringify(result, null, 2)}`
    }])
  }
  
  // 显示提醒
  const showReminder = (message: string) => {
    toast.info(message, {
      duration: 10000,
      action: {
        label: '查看',
        onClick: () => {
          // 跳转到相关页面
        }
      }
    })
  }
  
  // 显示通知
  const showNotification = (message: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('定时提醒', {
        body: message,
        icon: '/favicon.ico'
      })
    }
  }
  
  return (
    <div className="flex h-screen">
      {/* 主聊天区域 */}
      <div className="flex-1">
        {/* ... 聊天界面 ... */}
      </div>
      
      {/* 侧边栏 - 显示定时任务 */}
      <div className="w-80 border-l border-zinc-200 dark:border-zinc-800 p-4 overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">定时任务</h2>
        <ClientScheduledTasks />
      </div>
    </div>
  )
}
```

## API 参考

### scheduleTask

创建定时任务

```typescript
scheduleTask(
  description: string,      // 任务描述
  delayMinutes: number,     // 延迟分钟数
  taskType: 'analysis' | 'notification' | 'reminder' | 'custom',
  payload: any,             // 任务参数
  callback: (task) => void  // 执行回调
): string                   // 返回任务 ID
```

### cancelTask

取消任务

```typescript
cancelTask(taskId: string): boolean
```

### getAllTasks

获取所有任务

```typescript
getAllTasks(): ClientScheduledTask[]
```

### getPendingTasks

获取待执行任务

```typescript
getPendingTasks(): ClientScheduledTask[]
```

## 最佳实践

### 1. 合理的延迟时间

```typescript
// ✅ 好的做法
scheduleTask('检查设备', 5, 'analysis', {}, callback)

// ❌ 避免过长的延迟（用户可能关闭页面）
scheduleTask('明天提醒', 1440, 'reminder', {}, callback)
```

### 2. 提供清晰的反馈

```typescript
// 创建任务时
toast.success(`已设置定时任务：${description}`)

// 任务执行时
toast.info(`定时任务执行：${description}`)
```

### 3. 处理页面关闭

```typescript
// 在页面关闭前提醒用户
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    const pendingTasks = getPendingTasks()
    if (pendingTasks.length > 0) {
      e.preventDefault()
      e.returnValue = '您有待执行的定时任务，确定要离开吗？'
    }
  }
  
  window.addEventListener('beforeunload', handleBeforeUnload)
  return () => window.removeEventListener('beforeunload', handleBeforeUnload)
}, [])
```

### 4. 请求通知权限

```typescript
// 在用户首次创建任务时请求权限
const { requestNotificationPermission } = useClientScheduler()

useEffect(() => {
  requestNotificationPermission()
}, [])
```

## 与服务器端方案对比

| 特性 | 客户端调度器 | 服务器端 Cron |
|------|------------|--------------|
| 配置复杂度 | ⭐ 简单 | ⭐⭐⭐ 复杂 |
| 需要页面打开 | ✅ 是 | ❌ 否 |
| 跨设备同步 | ❌ 否 | ✅ 是 |
| 执行可靠性 | ⭐⭐ 中等 | ⭐⭐⭐ 高 |
| 适用场景 | 短期任务 | 长期任务 |

## 总结

客户端调度器适合：
- ✅ 短期任务（几分钟到几小时）
- ✅ 用户在线时的提醒
- ✅ 快速原型开发
- ✅ 不需要跨设备同步的场景

如果需要长期、可靠的定时任务，建议使用服务器端 Cron 方案。
