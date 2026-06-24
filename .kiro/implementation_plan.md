# 用权限控制（ApprovalMode）替代专家/对话模式切换

## 背景

当前系统存在**两套并行的模式控制**，概念重叠且令人困惑：

1. **`assistantMode`**（对话/专家模式切换 — 顶栏 tab）：控制 AI 回复风格 + 是否自动执行设备指令
2. **`approvalMode`**（权限控制 — 输入框底部下拉）：UI 已完成但未实际生效

**核心问题**：`assistantMode` 实际上同时承担了两个职责：
- AI 回复深度/风格（对话 vs 专家）→ 这个差异不大，可以统一
- 是否自动执行设备指令（`autoExecuteCommands`）→ 这正是 `approvalMode` 应该做的事

## 方案

**移除顶栏的 对话/专家 切换 tab**，用 `approvalMode` 完全替代其核心功能：

| ApprovalMode | 原来对应的行为 | 自动执行? | 系统提示词风格 |
|---|---|---|---|
| `request`（请求批准） | 类似原对话模式 | ❌ 所有操作需手动确认 | 友好交流，解释后输出 JSON，等用户点击执行 |
| `auto`（替我审批） | 新增中间态 | ⚠️ 低风险自动，高风险确认 | 专业分析，低风险操作自动执行，高风险操作需确认 |
| `full`（完全访问权限） | 类似原专家模式 | ✅ 全自动 | 深度分析，自主执行所有操作，不等待确认 |

## 涉及修改

---

### 页面主文件

#### [MODIFY] [page.tsx](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/app/ai-assistant/page.tsx)

**1. 移除 `assistantMode` 状态及相关代码**
- 删除 L438-447: `assistantMode` state 声明
- 删除 L451-457: localStorage 持久化 effect
- **保留** `approvalMode` 状态（L170），并增加 localStorage 持久化

**2. 重写 `autoExecuteCommands` 派生逻辑**（L464）
```diff
- const autoExecuteCommands = assistantMode === 'automation' || assistantMode === 'expert'
+ // 基于权限模式决定自动执行行为：
+ // - request: 不自动执行任何操作
+ // - auto: 自动执行低风险操作（如开灯、读传感器），高风险操作需确认
+ // - full: 自动执行所有操作
+ const autoExecuteCommands = approvalMode === 'auto' || approvalMode === 'full'
```

**3. 重写系统提示词注入**（L2331-2371）
- 根据 `approvalMode` 替代 `assistantMode` 构建不同的系统提示词
- `request` → 友好对话风格，需用户确认
- `auto` → 专业分析，低风险自动执行  
- `full` → 深度分析 + 全自动执行

**4. 移除顶栏模式切换 UI**（L4271-4292）
- 删除整个 `对话/专家模式切换` 的 `<div>` 块

**5. 更新 loading 提示文案**（L2488-2489）
```diff
- title: assistantMode === "expert" ? "🧠 专家模式 · 深度分析中" : "💬 智能识别意图中",
+ title: approvalMode === "full" ? "🧠 深度分析中" : "💬 智能识别意图中",
```

**6. 更新 `ChatBubbleList` 的 `rendererProps`**（L4315-4316）
```diff
- autoExecuteCommands,
- assistantMode,
+ autoExecuteCommands,
+ assistantMode: approvalMode,
```

---

### 消息渲染组件

#### [MODIFY] [chat-message-renderer.tsx](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/app/ai-assistant/_components/chat-message-renderer.tsx)

- `assistantMode` prop 继续保留（类型改为 string，已经是 string）
- `autoExecuteCommands` 行为不变

> 这个组件不需要实质性修改，因为它只用 `autoExecuteCommands` 布尔值来决定卡片显示状态。

---

### 加载骨架

#### [MODIFY] [ai-assistant-skeleton.tsx](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/components/loading/ai-assistant-skeleton.tsx)

- 移除模式切换的骨架占位（L114-118）

---

### 现代首页视图

#### [MODIFY] [modern-home-view.tsx](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/components/ai/modern-home-view.tsx)

- 将 "专家模式：深度分析" 卡片文案更新为更通用的表述

---

### 提示词模板

#### [MODIFY] [prompt-templates.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/ai/prompt-templates.ts)

- 将 "专家模式" 的引用更新为新的 approvalMode 术语

---

## 不涉及修改的文件

- `matechat-home.tsx` — 已有完整的 approvalMode 下拉 UI ✅
- `chat-sender-input.tsx` — 已有完整的 approvalMode 下拉 UI ✅

## 验证计划

### 手动验证
1. 打开 AI 助手页面，确认顶栏的 对话/专家 切换 tab 已消失
2. 在空对话首页（MateChatHome），点击底部 approvalMode 下拉，三个选项可正常切换
3. 输入消息后，在 ChatSenderInput 中也能切换 approvalMode
4. 验证 `request` 模式下：AI 输出 IoT JSON 后显示 "pending" 状态卡片，需手动点击执行
5. 验证 `full` 模式下：AI 输出 IoT JSON 后自动执行，显示 "executed" 状态
6. 刷新页面后 approvalMode 仍保持上次选择

> [!IMPORTANT]
> `auto`（替我审批）模式的"低风险/高风险"区分逻辑目前采用简单策略：所有操作都自动执行（与 `full` 相同），但系统提示词会要求 AI 在高风险操作前主动征求用户确认。后续可以在 `executeCommands` 中加入真正的风险等级判断。
