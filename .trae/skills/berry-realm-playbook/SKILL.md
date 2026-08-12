---
name: "berry-realm-playbook"
description: "Berry Realm 项目开发规范合集：UI/UX 设计约定、AI 流式渲染规则、硬件控制安全策略、代码陷阱与修复模式。当在本项目开发功能、修复 bug 或重构代码时调用。"
---

# Berry Realm 开发规范 (Playbook)

> 本 skill 适用于为 Berry Realm（莓小智智慧农业平台 v4.0）进行二次开发或协作开发的工程师。内容熔炼自项目所有者积累的开发偏好、项目硬约束、踩坑记录与架构模式。**开发前先查阅对应章节，遇到陷阱先用 Grep 搜本 skill 关键词。**

---

## 1. UI/UX 设计规范

### 1.1 总体风格
- **简约优先**（minimalist），追求"大厂 UI"质感
- **必须遵循 Ant Design 设计语言**
- 颜色主基调：Ant Design 主色蓝 `#1677ff`
- **严禁橙色渐变**（用户明确反感）
- 浅色模式背景 `#f7f8fa`，暗色模式 `#0a0a0c`
- 对话卡片：12px 圆角，浮于侧边栏之上，**无阴影**
- 字重优先 400（normal），不要 500（semi-bold）
- 来源/sources 区块颜色应浅于主文本

### 1.2 图标规范（强制）
- **禁止使用 emoji 作为图标**（必须替换为 lucide-react）
- 统一使用 `lucide-react` 线性图标，`strokeWidth={1.75}`（Trae Work 风格）
- 小图标尺寸 10-14px，标准图标 16px
- 动态模型选择器**不带 Sparkles 星标**

### 1.3 布局规则
- 侧边栏条目 icon 起点对齐，保持视觉整齐
- 侧边栏背景透明，让页面背景透出
- "管理 / 创建 / ... / X" 等控制按钮靠右对齐到顶部控制栏最右侧
- 定时任务页 / 我的空间页统一用 `fixed` 定位：`top-3 right-3 bottom-3 left-[272px]`（侧边栏 260 + 间隙 12），不要全屏覆盖
- 对话区域是顶层卡片，浮于侧边栏背景之上
- 页面容器背景 `#f7f8fa`（light）/ `#0a0a0c`（dark）填满整页

### 1.4 业务卡片（XCard / A2UI）
- 所有业务卡片统一使用 `XCard` + A2UI 协议
- 统一颜色方案，catalog 命名：`berry-*-catalog-v1`（如 `berry-task-planner-catalog-v1`、`berry-automation-strategy-catalog-v1`）
- 500ms x-card 挂载超时回退到 `DirectRenderFallback`
- 卡片**禁用渐变、禁用阴影**，8-12px 圆角，单色边框
- 节点配色：trigger=`#1677ff`（蓝）/ logic=`#722ed1`（紫）/ action=`#52c41a`（绿）/ aiNode=`#fa8c16`（橙）
- Activity feed Tabs 结构：[13px lucide 图标] [13px 文字（active 500 + 主色，inactive 400 + 灰）] [18px 圆角胶囊计数]

### 1.5 Ant Design 使用规范
- TextArea 来自 `Input` 命名空间（`const { TextArea } = Input`），**不是 Typography**
- Modal 用 `destroyOnHidden`（v5.20+），不要 `destroyOnClose`
- 表单切换用 `Switch size="small"` 替代原生 checkbox
- Select 的 "无选中" 状态用 `undefined` 而非 `null`，onChange 用 `setX(v ?? null)` 保留状态类型
- 静态 API 警告：`message.*` / `notification.*` / `Modal.confirm` 须改用 `App.useApp()` 拿 context 绑定实例
- admin 页面必须用 `<App>` 包裹在 `<ConfigProvider>` 内，否则 `App.useApp()` 返回的方法是 no-op
- 防御性错误日志：`console.error("[module OPERATION]", e)` 在 `message.error()` 之前
- Dialog 必须包含 DialogTitle（无障碍）；隐藏用 VisuallyHidden 包裹

### 1.6 TypeScript 对象字面量陷阱
- 含连字符的 key **必须**加引号：`"mcp-market": {...}`，不能 `mcp-market: {...}`
- admin/page.tsx 中 `sectionMeta: Record<AdminSection, ...>` 的所有连字符 key 都要引号（`"ai-models"`、`"mcp-market"`、`"kb-market"` 等）
- 否则 SWC 解析失败，整个模块编译崩溃

### 1.7 角色卡片统一
- 三个 persona（expert/friendly/engineer）color 字段统一 `#1677ff`
- 仅图标区分（Sprout / GraduationCap / Cog），颜色完全一致
- 选中态：边框 + 背景 + 图标底色 + 文字 + Check 全部主色蓝
- 未选中态：`#f0efec` 底色、`#888` 图标、`#555` 文字
- **不同角色响应风格必须有明显差异**（首句、结构、few-shot 都不同）

---

## 2. 配置与魔数规则

### 2.1 配置优先（硬约束）
- **可配置优于硬编码**
- UI 表单输入参数优于纯文本输入
- 知识库所有魔数（阈值/上限/倍数）必须通过 admin `knowledgeConfig` 暴露
- 业务代码禁止出现 `* 2`、`+ 20`、`slice(0, 2000)`、`length < 2` 等硬编码

### 2.2 配置段说明
- **search**: minTokenLength / highlightTailLength / snippetWindowMultiplier / maxHighlights / recommendCandidateMultiplier / requestOvershootMultiplier / similarDefaultLimit
- **ui**: contextMaxChunks / contextMaxChunkLength / listPreviewChars / recommendationPreviewChars / createItemTextarea{Min,Max}Rows / detailEditorTextarea{Min,Max}Rows / backupListMaxHeight / backupPollingIntervals
- **upload**: xlsxMaxRows（默认 2000）
- **list**: defaultLimit / maxLimit / backupDefaultLimit / recommendationDefaultLimit
- **limits**: itemTitleMax / collectionNameMax / tagNameMax / maxTagsPerItem / summaryMax
- **embeddingTest**: maxTestTextChars / vectorPreviewCount / previewTextChars

### 2.3 子组件配置陷阱
- `knowledge-sidebar-panel.tsx` 的子组件（ItemListRow / RecommendationCard / ItemDetailPanel / CreateItemModal / KnowledgeSettingsModal / CreateCollectionModal）都是**顶层 function component**，不能访问父组件局部变量
- 每个子组件自己调 `useKnowledgeConfig()` hook 读取 admin 配置，未加载时用兜底默认值
- maxLength 必须直接接 number（不能 string/boolean），兜底数字（500/200/100）防 `kc` 未加载报错

---

## 3. 流式响应与渲染规则

### 3.1 SSE 格式
- 统一 `data: {json}\n\n` + `[DONE]` 终止符
- 响应头加 `X-Accel-Buffering: no` 避免 Nginx 缓冲
- reader.read() 加 90s 超时保护
- 错误格式：`AI API Error: <code> - <details>`（SSE 与非流式统一），前端直接显示后端消息，不要冗余前缀

### 3.2 新增 UI 标签规则（CRITICAL）
新增任何 AI 输出标签时**必须**：
1. 同时加到 `generateEnabledFeaturesInstruction` 的**两个分支**（no-features fallback + dynamic aiFeatures）
2. 加 `enableXxx` 字段到 `AIFeatureConfig` 接口
3. 加对应过滤块到 `filterDisabledFeatures`

否则 AI 不知道该标签存在，会写纯文本描述，卡片永远不渲染。

### 3.3 流式过滤器规则（CRITICAL）
- **不要剥离孤立的开标签** `<X>`：负向先行断言 `(?!\s*?<\/X>)` 在开闭标签间隙会误判
- **只剥离孤立的闭标签** `</X>`（无匹配开标签的）
- 开标签在流式过程中必须保留，渲染器应展示骨架态

### 3.4 JSON 修复
- 所有 `JSON.parse` 必须用 `tryParseJsonWithRepair<T>()` 包装
- 修复 6 种常见畸形（尾逗止单引号缺引号等）
- 流式中 JSON 未平衡时显示骨架卡，**不要 return null**
- 共享函数从 `checkpoint-confirm.tsx` 抽取，供 CLARIFY/DECISION/CHECKPOINT 共用

### 3.5 自动化策略保护
- `{nodes, edges}` JSON 受 TASK_LIST 过滤器保护（占位符 `00AUTO_BLOCK_N00`）
- early-wrap：检测到完整 ````json` 块含 `triggerNode/logicNode/actionNode/aiNode` 立即包装为 `<AUTOMATION_STRATEGY description="...">`
- final-check：流结束后扫描裸 JSON（无 fence）用大括号平衡匹配
- pre-stash regex 必须用 `/```json\s*[\s\S]*?(?:\`\`\`|$)/g`（单非贪婪 + alternation），不要双非贪婪
- 描述提取优先级：`### 标题：xxx` / `**策略名称**：xxx` > `(?:是|为|的|了|，|：|:)\s*([^\n。\s，：:]{2,40}?)\s*(?:策略|方案)` > 兜底 "AI 生成的自动化策略"

### 3.6 Schedule 任务保护
- `action: "schedule_task"` JSON 必须用 pre-stash 占位符 + `!match.includes('"action": "schedule_task"')` 守卫
- **route.ts 和 page.tsx 两处流式过滤器都要应用保护**
- schedule-task-parser 必须同时支持 `<SCHEDULE_TASK>` XML 和 ````json` markdown 格式
- 新格式字段（action/title/delay_seconds/task_action）归一化到 legacy（description/delayMinutes/taskType）

### 3.7 计划模式流式分块
- `<PLAN>` 和 `<CLARIFY>` 内容按 40 字符分块，每块间隔 8ms
- 实现渐进式打字机渲染，避免大计划一次性推送卡顿
- 计划内容在最新消息位置显示，跨反馈轮次保持连续性

### 3.8 chat-message-renderer.tsx
- TAG_REGEX 必须匹配**带属性**的标签：`<[^>]*AUTOMATION_STRATEGY[^>]*>[\s\S]*?<\/AUTOMATION_STRATEGY>`
- `extractBareTaskArray` 必须跳过含 `triggerNode/logicNode/actionNode/aiNode` 的内容
- 流式未完成时渲染骨架卡（`Loader2` + "正在生成..."），**不要 null**
- `isAutomationStrategy` 谓词只要求 `Array.isArray(obj.nodes) && nodes.some(n => ...)`，**不要要求 edges**
- 必须有 `parseStrategyFromText(text)` 文本兜底（AI 偶尔只输出 markdown 章节而非 JSON）

### 3.9 React Hooks 顺序（CRITICAL）
- 所有 hooks（useState/useRef/useMemo/useEffect/useCallback）必须**在任何 early return 之前**
- `useMemo` 依赖用结构指纹（`steps.map(s => ${s.id}:${s.status}:${s.duration}).join("|")`），**不要用数组引用**
- `onExpand` 用 `useCallback` 包装
- 否则触发 "Rendered more hooks than during the previous render" 或 "Cannot update a component while rendering a different component"

### 3.10 XMarkdown
- `streaming` prop 必须用 `enableAnimation: false`
- 否则内部动画循环每帧 setState，触发 "Maximum update depth exceeded"

### 3.11 DeepThinking 与 ThoughtChain 分离
- THOUGHTCHAIN 与任务时长**完全分离**为两个独立组件：
  - Task 执行链（agent-thought-chain.tsx）：工具调用 + 任务状态，标题 "任务执行中 · N 步" → 完成后 "任务执行 · 用时: 3.2s"
  - Deep thinking（chat-message-renderer.tsx DeepThinking）：模型推理 `msg.reasoning`，标题 "深度思考 · Xs"
- 使用官方 `Think` 组件（@ant-design/x），`title` 显示状态，`loading` 显示 spinner，`blink` 动画
- **禁止把 reasoning 推入 agentSteps**
- 深度思考底部加 12px 留白 + 淡灰虚线分隔，与正文区分

---

## 4. 数据库与 API 规范

### 4.1 Next.js 15 params（CRITICAL）
- 动态路由 `params` 是 Promise，必须 `const { id } = await params`
- 直接 `params.id` 访问会运行时报错 "params is a Promise and must be unwrapped with await or React.use()"
- 影响所有 `app/api/**/[id]/**` 路由

### 4.2 PostgreSQL 参数化陷阱（CRITICAL）
- 同一参数索引不能同时绑定 INTEGER 和 BIGINT 列（错误 42P08 "对于参数$N,推断出不一致的类型"）
- `INSERT INTO t (col_int, col_bigint) VALUES ($1, $1)` **会失败**
- 必须拆成 `($1, $2)` 带 `[$1Val, $2Val]`
- 例：`createMarketCollection` 的 `$9 = official`（INTEGER）不能同时绑 `published_at`/`created_at`/`updated_at`（BIGINT）

### 4.3 params 数组同步（CRITICAL）
- `params` 数组长度必须与 `$N` 占位符数量**严格同步**
- 空数组场景：`WHERE col = $1` 时 params 必须是 `[userId]` 不是 `[userId, []]`
- 否则触发 "绑定消息提供了 N 个参数,但已准备好语句要求 M 个参数"，让列表显示为空

### 4.4 事务删除模式
- 删除有外键关联的记录必须用 `withTransaction`
- 顺序：收集 id → 删子表 → 删关联表 → 删主表
- 例 `deleteMarketCollection` 必须清理：knowledge_item_tags / knowledge_chunks / knowledge_versions / knowledge_permissions / knowledge_query_log / knowledge_recommendations / knowledge_market_subscriptions / knowledge_items / knowledge_collections
- 最后加 `WHERE id = $1 AND is_marketplace = 1` 守卫

### 4.5 API 路由错误处理（CRITICAL）
- **GET 也必须 try/catch**，返回 JSON 错误体
- 否则未捕获异常产生空 body 的 500，前端误显示"空列表"，无任何线索

### 4.6 认证模式（CRITICAL）
- admin 权限用 `user.role === "admin" || user.role === "super_admin"`
- **不要用 `(user as any).is_admin`**（UserPublic 无此字段，UserPublic 有 `role: UserRole`）
- `resolveRole()` 自动查系统角色（users 表），无需外部 `isSystemAdmin` 参数
- Market API admin 校验适用于 `/api/knowledge/market` POST 和 `/api/knowledge/market/[id]` PATCH/DELETE

### 4.7 let 作用域陷阱
- `if/else if/else` 块内 `let` 声明是块作用域
- 变量需要在条件块外使用时，必须把 `let X = null` 提升到外层
- 例：`embeddingResult`/`embeddingError` 必须在 if 之前声明

### 4.8 数据库初始化
- 协作表（collaborators/invitations/operation_logs/yjs_documents）必须用 `CREATE TABLE IF NOT EXISTS`
- 用 `ensureKbCollaborationTables()` 在进程启动后兜底创建
- 每表独立错误处理，避免单表失败影响整体

---

## 5. AI 助手开发规范

### 5.1 Agent Loop（CRITICAL）
- 最大迭代 5 次，到顶时**强制最终 LLM 调用**（不带工具）生成用户回答
- 系统提示追加："你已经完成了所有工具调用。请基于已获取的工具结果，为用户生成完整、友好的最终回答。"
- 检测空内容响应（无 tool_calls 无 text），重试或触发最终调用
- 工具提示必须含："工具调用后必须输出最终回答：获取到工具结果后，必须基于结果生成完整的文字回复给用户，禁止只调用工具不回答"

### 5.2 子智能体（CRITICAL）
- 子智能体**必须使用用户在动态模型选择器中选择的模型**，不要系统默认
- 通过 `resolveProvider` 传递 `userApiKey/userApiUrl`
- 工具白名单（plant_protection / water_fertilizer agent 只读）
- 最大迭代 3 次，超时 35-60s
- **thinking 模式按模型类型选择性传参**（不要同时传）：
  - Qwen3/QwQ：`enable_thinking: false` + `chat_template_kwargs: { enable_thinking: false }`
  - DeepSeek/R1/Reasoner：`reasoning_effort: 'low'`
  - GLM/o1/o3：`thinking: { type: 'disabled' }`
  - 其他模型：不传相关参数
- **禁止同时传** `reasoning_effort` + `enable_thinking` + `thinking`（400 InvalidParameter）
- 进度实时推送：4 层透传 `onSubAgentProgress` 回调（types.ts AgentContext → orchestrator.ts → mcp-tool-executor.ts → route.ts SSE `sub_agent_progress` 事件 → page.tsx 添加子步骤）
- 失败时也渲染嵌套执行链 + 返回 fallback reply
- 失败兜底：主 Agent 用自身知识回答，不要显示无意义错误

### 5.3 CHECKPOINT 机制（CRITICAL）
- 5 要素：触发条件 / 询问时机 / 执行前信息收集 / 后果评估 / 决策确认
- 通过 `prompt-templates.ts` 的 `CHECKPOINT_INSTRUCTION_COMPACT` 注入
- `AIFeatureConfig.enableCheckpoint` 开关控制，`filterDisabledFeatures` 支持强制过滤
- API 层通过 `route.ts` 的 `contextInfo` 注入约束
- 渲染层：`chat-message-renderer.tsx` + `mobile-message-content.tsx` 双端一致
- localStorage 审计日志：`checkpoint_decisions_log`（保留最近 100 条）
- 4 种回复模板：CANCEL（取消）/ PROVIDE_INFO（提供信息）/ USE_DEFAULT（用默认值）/ 其他选项
- **凡是有明确参数需要用户提供的 checkpoint，必须输出 `param_fields` 让用户通过 UI 填写，禁止让用户打字描述参数**
- 4 种字段类型：number（含 min/max/step/unit）/ select / switch / text（仅当其他类型不适用）
- 表单用 antd Form + InputNumber/Select/Switch/Input，size="small" 紧凑布局，label 字重 400，必填自动校验，已决状态 disabled
- 提交构造：`【检查点确认】已填写参数：xxx\n- 灌溉时长: 5 分钟\n- 目标温度: 25 °C\n请按这些参数继续执行。`
- 审计日志新增 `form_data` 字段

### 5.4 计划模式（Plan Mode，CRITICAL）
- 完整工作流：复杂需求 → `enter_plan_mode` → 调研（屏蔽有副作用工具）→ `exit_plan_mode` 提交 → `<PLAN>` 标签注入 + 暂停 → 前端 `PlanApprovalCard` → 用户批准/拒绝 → AI 执行/停止
- 屏蔽 7 个有副作用工具：`toggle_relay/set_led/control_camera/reset_camera/cron_create/task_create/task_update`
- 与 `ask_user_question` 互斥：意图不明先澄清，明确后若仍复杂再进计划模式
- 步骤最少 3 步，每步含：① 做什么 ② 为什么 ③ 关键参数/阈值，30-100 字
- 错误示例：`step1: 检查温度`（太简单）
- 正确示例：包含工具、参数、阈值、理由
- 批准 → `onSendMessage("【计划批准】...")`，拒绝 → `onSendMessage("【计划拒绝】...")`
- PlanApprovalCard 支持完整预览 + 编辑（标题/摘要/步骤列表修改）
- 解析失败自动打回重试（最多 2 次），通过 `detectFailedTag` PLAN 检测
- 批准消息用 `PlanApprovalReceiptCard` 渲染（解析 `【计划批准】` 文本），不要裸 markdown

### 5.5 Agent ThoughtChain（CRITICAL）
- **禁止 mock/不真实的模板内容**
- 用真实信息提取 + 动态内容生成，不要固定占位文本
- 简化为单行可折叠条 + 纯文本内容，统一主色 `#1677ff` + 旋转 `Loader2` 图标
- 移除动画、复杂渲染、多行描述

### 5.6 知识库市场 4 层架构（CRITICAL）
1. **DB**: `knowledge_collections` 扩展（is_marketplace/category/cover_image/popularity/official/publisher_id/published_at）+ `knowledge_market_subscriptions(user_id, collection_id, created_at, UNIQUE)` 虚拟订阅
2. **Service**: `lib/db/knowledge-service.ts` 加 listMarketCollections/getMarketCollection/subscribeMarketCollection/unsubscribeMarketCollection/listMySubscriptions/listAvailableCollectionsForAI/createMarketCollection/updateMarketCollection/deleteMarketCollection/listMarketCategories
3. **API**: `/api/knowledge/market`（GET list, POST create admin-only）、`/api/knowledge/market/[id]`（GET/PATCH/DELETE）、`/api/knowledge/market/[id]/subscribe`（POST/DELETE）、`/api/knowledge/market/[id]/items`、`/api/knowledge/market/my-subscriptions`、`/api/knowledge/market/ai-collections`
4. **UI**: admin `/admin` → "知识库市场" → `KnowledgeMarketManager`；user `/kb-store` → `KBStoreContent`（MCP-store 风格）；user `/kb-store/[id]` → `KBDetailContent`

### 5.7 知识库市场关键规则（CRITICAL）
- 项的 `user_id` **必须设为 `collection.user_id`（发布者）**，不是上传者 `user.id`
- admin 管理他人 KB 用 `resolveItemOwnerId` 查实际 owner，admin/super_admin 调用时用 publisher 的 user_id
- `listAvailableCollectionsForAI` **只返回用户可访问的 KB**（个人 + 已订阅市场），不要用 `listMarketCollections`（返回全部）
- 个人 KB 视图**必须 `is_marketplace = 0` 过滤**（listCollections/listItems/getStats/search 全部）
- AI 聊天 `lockedCollectionId` 在 POST body **顶层**（不在 metadata 内）
- `/<知识库名>` slash command 用模糊匹配：精确 → 前缀 → 包含
- KB market **必须是"探索"面板的 TAB**（与 插件/技能 并列），不是侧边栏独立项
- KB 详情 modal 扩展 DetailTab：'collaborators'（canManage 限 admin）/ 'activity'（scope='collection'）
- 用户头像菜单加 '活动动态' 项（位于 '个人中心' 与 '个人设置' 之间）
- KBStoreContent 接受 `darkMode?: boolean` prop（同 MCPStoreContent 模式）
- admin KB market modal 用 Tabs："基本信息" + "条目管理"（创建时隐藏，点击时才 lazy fetch）
- admin KB items 支持 3 种添加：文件上传（/api/knowledge/upload + GLM-OCR）/ 链接（content_type=link）/ 纯文本笔记（content_type=note）

### 5.8 模型能力判断（CRITICAL）
- 视觉能力 / 深度推理能力用 **admin 后台配置**，**不要硬编码**
- Embedding 模型必须**完全兼容 GLM embedding 模型**

### 5.9 AI 功能权限
- AI 功能**仅限 Pro/Plus 会员**使用，普通用户即使有余额也不可用

### 5.10 Slash 命令
- 4 个默认命令（`/report` `/diagnose` `/reason` `/search`）**优先**在列表前面
- KB items 在它们之后，limit 20 避免淹没菜单
- KB item label：`[个人|官方|市场] <name>`，value：`/<name>`
- icon：BookOpen emerald（个人）/ ShieldCheck blue（官方）/ Library purple（市场）
- 失败静默降级到 4 个默认项

### 5.11 Embedding 配置工作流
1. Admin → /admin → AI 提供商 → "知识库 Embedding 模型"
2. 添加 provider（type='custom' 自托管，或内置 dashscope/openai/zhipu-glm）
3. 添加模型，勾选 `supportsEmbedding: true`
4. 在"知识库 Embedding 模型"卡片选择 provider/model/dimension/enabled，保存
5. 测试 embedding 验证连接
6. 下次上传自动使用
- 兜底链：远程配置 → local-hash-v1（确定性但低质量，仅应急）

### 5.12 DashScope 错误处理
- 400 "Arrearage" 错误：账户欠费
- 系统自动降级到 local-hash-v1
- `embeddingResult`/`embeddingError` 变量作用域必须提升到外层（不要在 if 块内声明）
- 否则成功本地 embed 后还会 ReferenceError 崩溃

### 5.13 OnlyOffice 集成
- Docker 部署 + JWT 认证
- Nginx 反代 `/onlyoffice/`
- 环境变量：`ONLYOFFICE_JWT_SECRET` / `ONLYOFFICE_URL` / `NEXT_PUBLIC_ONLYOFFICE_API_URL`
- 文档存储：Markdown/HTML 在 `docs/`（可编辑），PDF/PPT/DOC 在 `public/uploads/docs/`（静态），manifest 在 `docs-manifest.json`
- 编辑器配置分离：admin 编辑（admin role check）/ 公开预览（view 模式）/ 知识库集成（复用 resolveRole）

---

## 6. 硬件控制安全

### 6.1 dry_run 开关
- Bash 执行硬件控制时必须加**模拟/实际开关**
- 默认 `EnterPlanMode` 只生成脚本预览，不执行
- 实际执行前必须先 dry_run

### 6.2 极端天气应急
- WebSearch 发现极端天气时**中断 Plan**
- 调用 `send_message` 给应急 Agent，赋予**最高优先级打断权**

### 6.3 子智能体安全
- 工具白名单限制（plant_protection / water_fertilizer 只读）
- 迭代次数限制（max 3）
- 超时保护（35-60s）

### 6.4 五层架构（农业自动化）
1. **感知层**：Cron + ScheduleWakeup 定时采集，Bash 调用传感器 API，Read 解析 CSV/JSON，Grep 过滤异常极值
2. **记忆层**：维护"农事日志" Markdown，Glob 检索历史同期数据，写入天气和墒情到长期记忆
3. **决策层**：启用 EnterPlanMode，WebSearch 15 天天气预报 + WebFetch 农技论文生成"三日作战方案"，含植保专家 Agent + 水肥专家 Agent
4. **执行层**：TaskCreate 异步长时任务，Bash 执行硬件控制指令
5. **交互层**：关键农事调用 AskUserQuestion 强制确认

### 6.5 三大闭环优化
- **应急响应闭环**（分钟级）：Cron 监测温湿度骤变 → TaskStop 中断计划 → ExitPlanMode → Bash 应急指令 → AskUserQuestion 告警
- **长周期复盘闭环**（周/月级）：Workflow 编排"整月生长周期"，TaskOutput 汇总数据，Edit 更新知识库
- **版本回滚闭环**：修改策略前 EnterWorktree 新建隔离环境，测试通过后 ExitWorktree 合并

### 6.6 工具优化策略
- Skill 封装不同作物生长模型，动态加载节省 Token
- Cron 结合 ScheduleWakeup "按需唤醒"降低 API 成本
- Glob 按 `/地块/年份/月份/传感器类型` 结构化存储提升检索速度
- TaskCreate 后台运行长时任务，不阻塞主线程

---

## 7. 数据规范

### 7.1 时间戳兼容
- `toMs(ts)` 检测 `ts < 1e12`（秒级）自动 ×1000 转毫秒
- `formatTime`/`formatFullTime` 加 `isNaN(d.getTime())` 校验返回空字符串
- 避免显示 "NaN-NaN NaN:NaN"

### 7.2 上传成功判断（CRITICAL）
- 用 `if (res.ok)` **单判断**，不要 `if (res.ok && data.success)` 双判断
- 服务端 catch 在 `createItem` 之后可能返回 5xx 但记录已入库
- `data` 解析降级 `res.json().catch(() => ({}))` 防 JSON 报错误判
- Embedding 失败不算上传失败，用 `message.warning` 提示用户稍后重试

### 7.3 禁用模拟数据（CRITICAL）
- **禁止用 `Math.random()` 生成模拟传感器数据**
- `get_sensor_history` 只查真实数据库
- `initSensorDataIfNeeded()` 已从 `instrumentation.ts` 移除，不要恢复

---

## 8. 开发协作模式

### 8.1 结对编程
- 用户明确要求**不跑 tsc**
- 改动靠**人工 review + 端到端验证**
- 使用 eslint 检查，目标 0 errors/warnings（项目遗留 `no-explicit-any` 警告可忽略）

### 8.2 反馈优先（CRITICAL）
- **避免长时间等待无反馈**
- 流式响应必须实时推送进度（参考子智能体 4 层透传）
- 加载状态用骨架卡，不要空白
- 子智能体执行 70s 期间主 Agent SSE 流只 10s 心跳会感知卡顿，必须打通进度链路

### 8.3 AI 输出质量（CRITICAL）
- **禁止 mock/不真实的 agent thoughtchain 内容**
- 不同角色（expert/friendly/engineer）风格必须有明显差异
- 思考过程用真实信息提取，不要固定占位文本
- 子智能体失败兜底要友好，不要显示无意义错误

### 8.4 文档编辑
- 文档库 + 知识库必须集成 OnlyOffice 在线编辑与协作
- 教程文档：admin 管理 + 用户使用，注册到 `MANUALS_CONFIG` 自动出现在 `/blog` 列表
- ZIP-MD 上传自动解压 + 图片路径重写

---

## 9. 关键文件路径参考

| 用途 | 路径 |
|------|------|
| AI prompt 模板 | `lib/ai/prompt-templates.ts` |
| AI 聊天路由 | `app/api/chat/route.ts` |
| 主页面 | `app/ai-assistant/page.tsx` |
| 消息渲染器 | `components/ai/chat-message-renderer.tsx` |
| 工具定义 | `lib/mcp/mcp-tool-definitions.ts` |
| 工具执行 | `lib/mcp/mcp-tool-executor.ts` |
| 知识库服务 | `lib/db/knowledge-service.ts` |
| 数据库 | `lib/db/database.ts` |
| 子智能体 | `lib/ai/sub-agents/**`（types.ts / registry.ts / sub-agent-runner.ts） |
| admin 页面 | `app/admin/page.tsx` |
| 知识库市场管理 | `components/admin/knowledge-market-manager.tsx` |
| KB Store | `components/kb/KBStoreContent.tsx` / `KBDetailContent.tsx` |
| Persona 系统 | `lib/ai/persona-system.ts` |
| 计划审批卡 | `components/ai/plan-approval-card.tsx` |
| Checkpoint 表单 | `components/ai/checkpoint-confirm.tsx` |
| Agent 思考链 | `app/ai-assistant/_components/agent-thought-chain.tsx` |
| Schedule 解析 | `lib/ai/schedule-task-parser.ts` |

---

## 10. 调用建议

1. **每次开始任务前**：先查阅本 skill 对应章节
2. **遇到陷阱**：用 Grep 搜本 skill 关键词（如 "42P08"、"Rendered more hooks"、"params is a Promise"）
3. **新增 UI 标签**：必读 §3.2
4. **修改数据库**：必读 §4
5. **AI 相关**：必读 §5
6. **流式相关**：必读 §3
7. **硬件控制**：必读 §6（含 dry_run 强制）
8. **任何 UI 改动**：必读 §1（图标禁 emoji、颜色禁橙渐变、Ant Design 强制）
9. **新增魔数**：必读 §2（必须可配置）
10. **提交前自查**：eslint 0 errors、不跑 tsc、人工 review 端到端验证
