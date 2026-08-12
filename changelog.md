# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Feature: AI 助手工具包化 + 澄清提问 + 计划模式 + 文档库

**概览** 本次更新对 AI 助手进行了系统能力增强：将原本以裸 JSON 输出的若干能力统一封装为「Agent 工具包」，新增结构化澄清提问能力 `ask_user_question`，重写计划模式（Plan Mode）的流式与审批体验，并上线 Blog 文档库作为平台手册的统一入口。

---

### 一、Agent 工具包：从裸 JSON 到结构化工具调用

**背景** 此前 AI 在执行任务创建、定时任务、计划提交等动作时，需要直接输出 JSON 代码块（如 `{ "status": "in_progress", "tasks": [...] }`），存在格式不稳定、易被前端误过滤、无法走标准 Function Calling 链路等问题。本次将这些能力统一封装进 `builtin-agent-tools` 工具包，AI 通过标准 `tool_call` 调用即可，输出更可控、可观测。

#### 封装的工具一览

| 工具名 | 用途 | 取代的旧方式 |
| --- | --- | --- |
| `task_create` | 创建子任务并加入任务清单 | 原 `<TASK_LIST>` JSON 输出 |
| `task_list` | 查询任务清单及状态 | 原 JSON 状态查询 |
| `task_update` | 更新任务状态 / 内容 | 原 JSON 状态更新 |
| `cron_create` | 创建定时 / 延时任务 | 原 `schedule_task` JSON 代码块 |
| `cron_list` | 查询用户定时任务 | — |
| `cron_delete` | 删除待执行的定时任务 | — |
| `enter_plan_mode` | 进入计划模式（仅调研） | 原提示词约定 |
| `exit_plan_mode` | 提交计划等待审批 | 原 `<PLAN>` 标签约定 |
| `ask_user_question` | 结构化表单提问澄清 | 原纯文本提问 |

#### 关键改动

- [`lib/mcp/mcp-tool-definitions.ts`](./lib/mcp/mcp-tool-definitions.ts)
  - 新增 `builtin-agent-tools` server，注册 9 个工具的定义（参数 schema、描述、required 字段）
  - 每个工具均声明了严格的 JSON Schema，AI 必须按 schema 调用，杜绝格式漂移

- [`lib/mcp/mcp-tool-executor.ts`](./lib/mcp/mcp-tool-executor.ts)
  - 新增 `executeAgentTool()` 分发器，路由到各工具的执行逻辑
  - `exit_plan_mode` 返回 `_agent_action: 'exit_plan_mode'` 特殊标记，由 Agent Loop 转为计划审批卡片
  - 与 `AgentToolContext`（userId / sessionId）打通，工具内可获取会话上下文

- [`app/api/chat/route.ts`](./app/api/chat/route.ts)
  - 保留 `filterBareTaskListJson()` 作为防御层：拦截仍可能漏出的裸 `TASK_LIST` JSON，但保护 `schedule_task` 与自动化策略 JSON 不被误删
  - 工具调用结果通过标准 `tool` 角色消息回灌给模型，闭环 Agent Loop

#### 收益

- AI 输出从「自由文本 + JSON 混排」收敛为「文本 + 标准 tool_call」，稳定性显著提升
- 前端无需再解析多种 JSON 变体，统一通过工具调用结果渲染 UI
- 配合 `AIFeatureConfig` 可在 admin 后台逐个工具开关（如禁用 `ask_user_question`、`cron_*`）

---

### 二、新增 `ask_user_question`：表单驱动的澄清提问

**痛点** 用户描述模糊时（如「帮我看看温室」），AI 只能靠猜测补全参数，结果经常偏离用户真实意图，多轮返工。

**方案** 新增 `ask_user_question` 工具，AI 主动输出结构化表单，让用户通过 UI 填写或点选补充关键参数，而非手动打字描述。

#### 支持的表单字段类型

| 类型 | 用途 | 典型场景 |
| --- | --- | --- |
| `number` | 数值输入（含 min/max/step/unit） | 当前温度、面积、株数 |
| `text` | 文本输入 | 病害描述、自定义备注 |
| `select` | 下拉选择 | 选择温室编号、作物品种 |
| `switch` | 开关布尔 | 是否启用自动调控 |

#### 两种交互形态

1. **`fields` 表单模式**：适合需要多个参数输入的复杂场景，渲染为完整表单卡片
2. **`options` 快速选项模式**：适合二选一 / 多选一的简单场景，用户点击即答

#### 体验细节

- 表单以卡片形式插入对话流，用户填写后提交即视为新一轮 user 消息
- `title` / `context` 字段帮助用户理解「为什么问这个」
- 每个字段可配置 `required` / `placeholder` / `help` / `default`，降低填写成本
- admin 可在 AI 功能配置中一键关闭「澄清提问」能力

---

### 三、计划模式（Plan Mode）重写

**目标** 让 AI 在面对复杂请求时「先调研、再规划、待审批、后执行」，避免一次性产出偏离用户预期的长任务。

#### 工作流

```
用户复杂请求
   │
   ▼
enter_plan_mode(reason)        ← 进入计划模式，仅允许调研类工具
   │  （查询传感器 / 天气 / 搜索 / 知识库）
   ▼
exit_plan_mode(title, summary, steps[])   ← 提交计划，渲染审批卡片
   │
   ▼
用户审批
   │  批准 / 拒绝
   ▼
AI 按计划 steps 逐步执行（task_create 跟踪进度）
```

#### 本次更新要点

- **流式渲染计划内容**：此前 `exit_plan_mode` 触发后，计划正文一次性推送给前端，用户需等待较长时间才看到内容。现改为按 ~40 字符分块流式推送，前端可渐进式呈现打字机效果（[`app/api/chat/route.ts`](./app/api/chat/route.ts)）
- **结构化计划数据**：`exit_plan_mode` 强制要求 `title` / `summary` / `steps[]`，每步必须包含「做什么 + 为什么 + 关键参数」，拒绝「检查温度」这类过于简略的描述
- **审批卡片 UI**：计划以独立审批卡片展示，用户可批准或拒绝；批准后 AI 按步骤逐步执行，并通过 `task_create` 同步任务清单
- **计划模式约束**：进入计划模式后，AI 只能调用调研类工具（传感器查询、天气、搜索等），禁止设备控制、任务创建、发通知等有副作用的操作
- **页面级任务状态同步**：新增 `latestTaskListContent` 页面级状态，跨多轮反馈消息保持任务规划器状态一致（[`app/ai-assistant/page.tsx`](./app/ai-assistant/page.tsx)）

---

### 四、Blog 文档库：平台手册统一入口

**定位** Blog 页面（[`app/blog`](./app/blog)）作为平台各类手册的集中存放地，按受众分类组织，支持全文检索与章节导航。

#### 文档分类

| 分类 | 适用对象 | 典型内容 |
| --- | --- | --- |
| `user` | 终端用户 | 使用手册、功能介绍、FAQ |
| `admin` | 管理员 | 后台配置、权限管理、运维指南 |
| `developer` | 开发者 | API 文档、二次开发、部署手册 |
| `release` | 所有人 | 版本说明、更新日志、变更公告 |

#### 能力

- 基于 `docs-manifest.json` 统一数据源，与后台 DocsManager 同源
- 支持 Markdown / HTML / 上传类文档（PDF / PPT / DOC）多种格式
- 自动生成目录（TOC）、估算阅读时间、字数统计
- 章节锚点导航、封面图、作者信息
- 全文检索 + 分类筛选

#### 相关文件

- [`app/blog/page.tsx`](./app/blog/page.tsx) · [`app/blog/blog-list.tsx`](./app/blog/blog-list.tsx) · [`app/blog/[slug]/page.tsx`](./app/blog/[slug]/page.tsx)
- [`lib/blog/manuals.ts`](./lib/blog/manuals.ts) · [`lib/blog/manuals-shared.ts`](./lib/blog/manuals-shared.ts)

---

### Files

| File | Type |
| --- | --- |
| `lib/mcp/mcp-tool-definitions.ts` | modified（新增 builtin-agent-tools 工具包定义） |
| `lib/mcp/mcp-tool-executor.ts` | modified（新增 executeAgentTool 分发器） |
| `app/api/chat/route.ts` | modified（计划流式推送、工具调用闭环） |
| `app/ai-assistant/page.tsx` | modified（页面级任务状态同步） |
| `app/ai-assistant/_components/agent-thought-chain.tsx` | modified（ThoughtChain 样式与折叠） |
| `app/ai-assistant/_components/chat-message-renderer.tsx` | modified（计划审批 / 提问表单渲染） |
| `components/ai/plan-approval-card.tsx` | modified（计划审批卡片） |
| `app/blog/page.tsx` | modified（文档库入口） |

---

### Feature: AI 助手自动选择模型 admin 可配置

**需求** AI 助手中每次刷新后自动选择的模型应该是动态选择器列表里的模型，且 admin 后台可设置自动选择的模型。

---

### Changed / Added

#### 1. 后端 - 模型/提供商配置

- [`lib/ai/provider-resolver.ts`](./lib/ai/provider-resolver.ts)
  - 新增 `ProvidersConfig` 接口（包含 `defaultModelId` 字段）
  - `readProvidersConfig()` 返回类型升级为 `ProvidersConfig`
  - 新增 `resolveDefaultModelId(config)` 工具函数
    - 规则：admin 配置 > 默认 provider 的第一个 enabled 模型 > 第一个 enabled 模型
  - `getPublicProviders()` 返回值新增 `defaultModelId` 字段（自动回退到第一个 enabled 模型）

- [`app/api/ai/providers/route.ts`](./app/api/ai/providers/route.ts)
  - 公开接口透传 `defaultModelId` 给前端

- [`app/api/admin/ai-providers/route.ts`](./app/api/admin/ai-providers/route.ts)
  - `ProvidersConfig` 类型新增 `defaultModelId?: string`
  - 默认配置预置 `defaultModelId: 'qwen3.6-plus'`
  - `GET` 响应同时返回 `defaultModelId`

- [`app/api/admin/ai-providers/default-model/route.ts`](./app/api/admin/ai-providers/default-model/route.ts) **(新文件)**
  - `GET`：返回 `{ configuredDefaultModelId, effectiveDefaultModelId }`
  - `PUT`：接受 `{ modelId: string | null }`，校验必须是已启用的 provider/model 下的 enabled 模型；保存后返回生效的 defaultModelId
  - 鉴权：仅 admin / super_admin

#### 2. 前端 hook

- [`lib/hooks/use-ai-models.ts`](./lib/hooks/use-ai-models.ts)
  - `ModelsConfig` 接口新增 `defaultModelId?: string | null`
  - `fetchModels()` 从 `/api/ai/providers` 响应中读取 `defaultModelId` 写入 config
  - 新增 `getDefaultModelId()` 工具函数（前端侧 fallback 逻辑，规则与后端一致）

#### 3. AI 助手页面 (PC + iOS)

- [`app/ai-assistant/page.tsx`](./app/ai-assistant/page.tsx)
  - 从 `useAIModels()` 解构出 `getDefaultModelId`
  - 新增 `useEffect` 自动回退：
    - 等待 `aiConfig` 加载完成
    - 计算当前 `selectedModel || aiSettings?.model || ""`
    - 若当前值为空或不在 enabled 模型列表中 → 使用 `getDefaultModelId()` 兜底
    - 同步回写 `ai-settings` localStorage，避免被其它 effect 重置

- [`app/(mobile)/ai-assistant-ios/page.tsx`](./app/(mobile)/ai-assistant-ios/page.tsx)
  - 引入 `useAIModels` hook
  - 新增与 PC 端完全一致的自动回退 `useEffect`
  - PC/iOS 体验对齐

#### 4. Admin 后台 UI

- [`components/admin/ai-providers-manager.tsx`](./components/admin/ai-providers-manager.tsx)
  - 新增状态：`defaultModelId`、`defaultModelDraft`、`savingDefault`
  - `fetchProviders()` 解析接口返回的 `defaultModelId`
  - 新增 `handleSaveDefaultModel()` 调用 `PUT /api/admin/ai-providers/default-model`
  - 在"AI 提供商管理"页头部下方新增"自动选择模型"卡片：
    - 蓝色 Sparkles 图标 + 标题 + "刷新后生效" 角标
    - 描述文字：当前生效模型（provider · model）
    - 模型下拉框（来源：所有 enabled provider 的 enabled model，按 provider priority 排序）
    - 保存按钮（未变更时禁用，含 loading 态）
    - 配置的 defaultModelId 失效时显示 amber 提示

---

### Behavior

1. **首次打开 / 刷新 AI 助手页面**
   - 若 localStorage 中 `ai-settings.model` 为空 → 使用 admin 配置的 defaultModelId
   - 若 `ai-settings.model` 不在已启用模型列表中（admin 已禁用/删除）→ 自动回退到 defaultModelId
   - 同步回写 localStorage（一次性）

2. **用户手动选择模型**
   - 不再被回退逻辑覆盖（effect 依赖仅为 `[aiConfig, aiConfigLoading]`，模型列表变更才重新评估）

3. **Admin 修改 defaultModelId**
   - 通过 "AI 提供商管理" → "自动选择模型" 卡片的下拉框 → 保存
   - 下次刷新 AI 助手即生效

4. **API 校验**
   - 写入 defaultModelId 时必须存在某个 enabled provider 下的 enabled model
   - 写入空字符串 / `null` 等价于"清除配置"，回退到第一个 enabled 模型

---

### Compatibility

- `data/ai-providers-config.json` 老配置无 `defaultModelId` 字段：自动回退到第一个 enabled provider 的第一个 enabled 模型
- `/api/ai/providers` 老调用方只读 `providers` 字段的行为不变；`defaultModelId` 是新增字段
- `useAIModels` 老调用方只读 `config.models/categories/providers` 行为不变；`defaultModelId` 与 `getDefaultModelId()` 是新增

---

### Files

| File | Type | Lines |
| --- | --- | --- |
| `lib/ai/provider-resolver.ts` | modified | +30 |
| `app/api/ai/providers/route.ts` | modified | +5 / -3 |
| `app/api/admin/ai-providers/route.ts` | modified | +10 |
| `app/api/admin/ai-providers/default-model/route.ts` | new | +93 |
| `lib/hooks/use-ai-models.ts` | modified | +20 |
| `app/ai-assistant/page.tsx` | modified | +35 |
| `app/(mobile)/ai-assistant-ios/page.tsx` | modified | +45 |
| `components/admin/ai-providers-manager.tsx` | modified | +120 |

---

### Future

- 提供"用户级别"覆盖：admin 配置全局默认，用户可在自己的 settings 中选择并持久化
- 提供 defaultModelId 变更广播事件（页面收到 event 后立即重选模型）
