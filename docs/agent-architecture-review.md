# berry-realm Agent 框架架构评审

> 评审日期：2026-10-12 ｜ 范围：`app/api/chat/route.ts` + `lib/ai/**`（78 个 TS 文件 / 21,695 行）+ `lib/db/**` 中 AI 相关部分 + `lib/mcp/**` 工具层
> 方法：全仓静态测绘 + 关键路径人工阅读（上下文装配、Agent 主循环、工具编排、供应商解析）

---

## 一、总体结论

**定位：一个"上下文工程扎实、工具治理精细、但入口层严重欠拆分"的生产级单体 Agent 框架。**

它已经不是"调个 API 拼个 prompt"的玩具——有预算、有段位、有压缩、有幂等分类、有 HITL 挂起。核心方法论层面（上下文 + 工具）达到了成熟框架的水准；问题集中在**工程组织**：入口文件 3783 行、协议分支未抽象、状态全在单进程内存、无 migrations。

| 维度 | 评价 | 一句话 |
|---|---|---|
| 上下文工程 | ★★★★★ | 段位 + 预算 + 分级压缩 + 唯一 token 源，教科书级 |
| 工具治理 | ★★★★☆ | 幂等分类 / 按工具超时 / 并行分批，意识超前 |
| 可扩展性 | ★★☆☆☆ | `globalThis` 状态 + 内存会话 → 无法水平扩展 |
| 可维护性 | ★★☆☆☆ | 3783 行入口 + 4 条协议分支 + 1358 行提示词 |
| 可观测性 | ★★☆☆☆ | 113 处 `console.*`，无 trace/span |
| 测试覆盖 | ★★★☆☆ | 15 个测试文件（约 19%），集中在 context/orchestrator |

---

## 二、亮点（值得保留与推广的 8 个设计）

### 1. 上下文工程层是"真·上下文工程"，不是提示词拼接 ⭐ 最高分项
`lib/ai/context/`（8 文件）把原本散落在 `route.ts` **三处协议分支**里重复的 prompt 拼接收敛为单一装配器：

- `context-builder.ts#buildContext()` —— 段位化（identity / pinned / working / history），调用方只提供内容，**排布顺序、稳定性分层、预算裁剪、埋点全在装配器内**。文件头注释直接写明"本文件要消除的问题"，工程自觉性很高。
- `budget.ts` —— 显式预算：`输入预算 = 窗口 − 输出预留 − 2% 安全余量`；段位份额 `identity 30% / pinned 25% / working 20% / history 25%`，份额依据写的是"按「缺了它助手就不成立」排序"。`MODEL_WINDOWS` 覆盖 10 类模型 + `FALLBACK_WINDOW=32000` 保守兜底。
- **两级降级**：段内超预算先试 `fallback`（精简版），不行再 `truncateToBudget()`（二分按行截断，保住结构）；`identity` 段永不截断——"宁可超预算也不让助手行为漂移"。
- 顺序设计有意图：stable 段全部前置以**命中 prompt cache**，volatile 段置尾**吃 Recency**。

### 2. token 估算有唯一真相源，且剥离二进制载荷
`estimateContextTokens`（CJK 1 / 全角 0.8 / latin 0.28 / emoji 1.5）统一口径，并在 `stripBinaryPayload` 里剥掉 dataURL / 裸 base64——正则还刻意要求**同时含大小写**，防止 `'A'.repeat(50000)` 被当成 4 token。这是踩过坑才会有的细节。旧 `MAX_CHAR_COUNT = 60000` 已明确废弃。

### 3. 工具结果的四级压缩，刀口对准 ReAct 最大杀手
`tool-result-compactor.ts`：tiny(<1.5k) / small(<6k) / large(<20k) / huge 四档 + `KEY_FIELDS` 关键字段白名单。工具结果撑爆上下文是 ReAct 框架第一死因，这里是**有档位、有白名单**的正规处理，而非"截断到 N 字符"。

### 4. 压缩对用户可见 —— 罕见的诚实设计
多数框架压缩历史是静默的，用户只感觉"AI 突然失忆"。这里：插 `<CONTEXT_COMPRESSED>{统计}` 标签 + 前端 `context-compression-notice.tsx` 卡片；摘要 provider **禁止硬编码**（无显式 key 时跟随本轮 provider，否则 401 静默失败）；失败要下发 SSE `context_compress_failed`——**明确禁止静默吞**。

### 5. 用户可配置上下文窗口，且设计克制
`context-prefs.ts`（纯函数层，客户端可引用）+ `context-prefs-service.ts` + `/api/user/context-prefs`，预设 auto/32K/64K/128K/200K，越界静默钳制。关键是语义正确：**窗口是上限**（实际取 `min(用户值, 模型窗口)`），`windowTokens: null` = 跟随模型且"必须逐字等同改造前"。另注意路由的 `force-dynamic` + `no-store` 已内置。

### 6. 工具的幂等性分类 —— 这个意识超过多数框架
`tool-manager.ts`：
- `TOOL_TIMEOUT_OVERRIDES` 按工具语义给超时（`toggle_relay` 10s / `control_camera` 90s / `deep_research` 480s），注释解释了物理依据（"电机满程 700mm 约 30-40s"）。
- 更有价值的是注释里的**跨层契约**："必须大于管线预算，否则预算还没兜住就被这里判超时"——虽然暴露了耦合，但说明作者理解超时分层。
- `NO_RETRY_TOOLS` 把工具分为"可重试"与"**副作用型禁重试**"（物理动作 / 写库 / 慢推理），理由是"MQTT 命令可能已发出并执行"。这是分布式系统里 correct-by-design 的考虑。
- 重试用**指数退避** `retryDelay * 2^attempt`，且 `shouldRetry` 做中英文关键词判定而非无脑重试。

### 7. 技能自路由（AI self-routing）—— 用模型替代关键词匹配器
`skill-manager.ts#generatePromptContent`：只注入 `autoLoad` 技能全文 + **全量技能精简清单（仅元信息）**，然后给 AI 一段路由指令，让它通过 `load_skill` 工具按需拉全文。相比旧的 `KeywordMatcher`（`MIN_MATCH_SCORE=60`）更省 token、更准。而且**旧匹配器退居备用没有删除**，保留了渐进迁移路径——这是成熟的改造方式。

### 8. 供应商层三段式分层 + 候选链降级
`provider-resolver`（配置读取，含 mtime 缓存）→ `effective-model`（决策：`pickAutoModel` reasoning>vision>默认、`resolveRequestedModel` BYOK 判定、`buildModelCandidates` 最多 6 个候选）→ `provider-body-adapter`（上游适配，如 Kimi/Moonshot 固定参数、K3 换 `max_completion_tokens`）。职责边界干净，且"AI 辅助接口必须共用 `effective-model`"被写成了铁律。

### 附加亮点
- **HITL 三档降级匹配**：`respond/route.ts` 精确 → byUser → byCheckpoint，且明确"**禁止假成功**"（未命中必须 404 或继续降级），避免前端静默挂 5 分钟。
- **上下文用量对用户可见**：`emitContextUsage` **每轮 agent 迭代重发** `context_usage`，前端能看见"越聊越满"的真实趋势，而非首轮静态快照。
- **视觉网关的多候选均分超时** `callVisionModel` + `buildVisionCandidates`（用户所选模型永远排第一）+ `repairTruncatedJson` 截断 JSON 修复。

---

## 三、不足（按严重度排序）

### P0 —— 结构性阻塞

**1. `app/api/chat/route.ts` = 3783 行上帝文件**
Agent 主循环、SSE 流构造、四条协议分支的流式转换、工具回灌、挂起恢复、积分结算、响应缓存、定时任务校验、keep-alive——全在一个文件、一个 `POST()` 里。113 处 `console.*`。任何一处改动都要在 3000+ 行里定位，回归只能靠人肉。`lib/ai/agent-loop/` 目录名存在但**里面只有一个 `response-filters.ts`**，名不副实。

> 建议：把主循环抽成 `agent-loop/run-loop.ts`（依赖注入 LLM 客户端 + 工具执行器 + SSE emitter），协议差异化抽成 `protocol-adapters/{dashscope-compat,dashscope-native,dashscope-app,openai-compat}.ts`，各自实现同一 `streamAdapter` 接口。route.ts 只保留解析 + 鉴权 + 装配 + 委派，目标 < 400 行。

**2. `globalThis` 挂载的挂起注册表 → 水平扩展硬阻塞**
`pending-user-input.ts` / `pending-client-tool.ts` 把状态挂在 `globalThis.__berryPendingUserInput` / `__berryPendingClientTools` 以规避 Next.js 分路由打包多实例。单机单进程能跑，但**多容器 / PM2 cluster 下 HITL 直接失效**（后续请求可能落到没有该挂起的实例 → 用户点了"确认"，AI 永远等不到）。同样地，`AgentOrchestrator` 会话、三层记忆（STM/WM/LTM）全在进程内存，重启即丢。

> 建议：挂起状态落 Redis（或至少 pg 表 + 轮询/`LISTEN-NOTIFY`），把 `checkpointId → promise resolver` 换成可跨实例的"投递 + 等待"语义。

**3. `lib/ai/sub-agents/` 是空目录**
架构叙事里有"子代理"，实现是空的。说明多 Agent 协作是规划过但未落地的缺口——要么补齐，要么从文档里删掉，避免误导。

### P1 —— 正确性隐患

**4. 工具"超时"不取消后台执行（资源泄漏）**
`tool-manager.ts` 的 `executeWithTimeout` 用 `Promise.race`，注释自己承认"超时不取消后台执行"。于是：`deep_research` 超时后研究仍继续并入库 → 重试会重复入库。当前的应对是"把这些工具全塞进 `NO_RETRY_TOOLS`"——**这是补丁，不是修复**。正解是 `AbortSignal` 从编排层贯穿到工具内部（HTTP fetch、子进程、LLM 调用都支持）。

**5. 并行工具依赖分析是启发式字符串匹配**
`parallel-tool-executor.ts#analyzeToolDependencies` 用 `argsStr.includes(prevTool.name) || argsStr.includes(prevTool.id)` 判断依赖——参数文本里出现另一个工具名就建依赖，**误判率高**（反过来，真实依赖若无名称重合则漏判 → 并行时序错）。`canExecuteInParallel` 用 `name.includes(type)` 白名单，`get_channel` 会命中任何含该子串的工具。建议：改为显式的工具元数据声明（`dependsOn` / `reads` / `writes`），或直接让模型在一次 tool_calls 里表达顺序。

**6. Agent Loop 硬编码 5 轮 + 字符串标签终止**
`MAX_AGENT_ITERATIONS = 5` 写死在 route.ts；终止/挂起靠扫 `<TASK_LIST>` / `<CHECKPOINT>` / `<CLARIFY>` 字符串标签；达上限后靠 `needForceFinal` 再发一次"不带 tools 的强制总结"补救。5 轮对"搜索 → 抓正文 → 诊断 → 写病历"这类链条偏紧，容易半途被强制收束。

> 建议：迭代上限改为按模型窗口 / 任务复杂度动态计算；标签协议升级为结构化 tool_call（如 `request_user_input` 工具）而非正文文本匹配。

**7. 挂起超时是"硬编码竞态"**
`waitForUserInput` 默认 5 分钟、`waitForClientToolResult` 2 分钟。用户在 5 分 01 秒点确认 → 服务端已超时清理 → 前端提示成功但 AI 无响应。这类边界需要有"提交后校验挂起是否仍存活"的反馈闭环。

### P2 —— 工程质量

**8. 阈值魔数分散且彼此隐式耦合**
`MAX_AGENT_ITERATIONS=5`（route.ts）、`GRAND_SUMMARY_THRESHOLD=12000`（route.ts）、`DEFAULT_TOOL_CONFIG.timeout=60000`（tool-manager）、`TOOL_TIMEOUT_OVERRIDES`（tool-manager）、`DEFAULT_COMPRESSION`（history-compressor）各自为政。注释里反复出现"必须大于管线内层预算"这种**跨文件隐式契约**——缺一个统一的 `agent-budget.ts` 配置源。

**9. 可观测性停留在"打印日志"级**
113 处 `console.*`，无 traceId/spanId 串联"一次用户请求 → N 轮 LLM → M 次工具调用"。虽然 `agent-orchestrator/monitor.ts` + `alert-manager.ts`（464 行）有实现，但是否真正接入调用链未见证据。

**10. 巨型文件与硬编码提示词**
`prompt-templates.ts` 1358 行（提示词硬编码在 TS 里，不可版本化 / 不可 A/B）、`vision-gateway.ts` 945、`skill-forge-service.ts` 938、`provider-resolver.ts` 748。建议提示词外置为 `.md`/资源文件（你的 `.agents/skills/*/SKILL.md` 已是这个模式，应该推广到主提示词）。

**11. `lib/ai` 顶层 45 个文件无分层**
`knowledge-search` / `embedding-service` / `memory-*` / `report-*` / `*-cron` 混在同一层，没有 domain / infra / adapters 的边界。

**12. 数据库无 migrations 目录**
全靠 `CREATE TABLE IF NOT EXISTS` + 手工 `ALTER`，且**建表逻辑散落在各 service 里**（`guardian-service` 建 `ai_guardian_alerts`、`skill-forge-service` 建 `skill_forge_reports`）。schema 演进不可追溯、无法回滚。这是你自己那条铁律"给老表加列必须显式 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`"的根因。

**13. 手搓 SSE 流解析，协议边界脆弱**
OpenAI / DashScope 的流式 chunk 增量拼接（index、参数跨 chunk、`type:'function'` 强制）是手写的。这类代码的正确性靠边界情况，建议至少加单测覆盖：参数跨 3 个 chunk、缺 index、并发 tool_calls 交错。

---

## 四、优先修复建议（按投入产出比）

| 优先级 | 动作 | 收益 | 状态 |
|---|---|---|---|
| 1 | 抽 `agent-budget.ts` 统一阈值/超时/迭代上限，消灭跨文件隐式契约 | 低投入，立刻降低"改 A 崩 B"概率 | ✅ **已落地**（2026-10-12） |
| 2 | 给挂起注册表加 `AbortSignal` + 落 Redis | 解除水平扩展阻塞（P0） | 待办 |
| 3 | `route.ts` 拆分为 loop + protocol-adapters | 解锁后续所有重构（P0） | 待办 |
| 4 | `AbortSignal` 贯穿工具执行，取消后台任务 | 消除重复入库/额度双扣（P1） | 待办 |
| 5 | 工具依赖改为显式元数据声明（`parallel-tool-executor` 的字符串匹配） | 并行正确性（P1） | ✅ **已落地**（2026-10-12） |
| 6 | 提示词外置 + 引入 migrations 目录 | 工程规范（P2） | 待办 |
| 7 | 加 traceId 串联链路，替换 `console.*` | 排障效率（P2） | 待办 |

---

## 六、已落地改造 · 2026-10-12（优先级 1）

### 新增文件

| 文件 | 职责 |
|---|---|
| `lib/ai/agent-budget.ts` | **Agent 运行预算 / 阈值的唯一配置源**。含 Agent Loop 上限与各段超时、工具超时/重试/风险登记表、内层管线预算、「外层 > 内层」契约表、HITL 超时、上下文阈值再导出、契约校验函数 |
| `lib/ai/agent-budget.test.ts` | 20 项契约测试（把散在注释里的约定变成可回归断言） |

### 收敛的散落魔数（均改为引用）

| 原位置 | 原写法 | 现引用 |
|---|---|---|
| `route.ts` L1758 | `MAX_AGENT_ITERATIONS = 5` | `AGENT_MAX_ITERATIONS` |
| `route.ts` L1206 | `GRAND_SUMMARY_THRESHOLD = 12000` | `AGENT_GRAND_SUMMARY_THRESHOLD_CHARS` |
| `route.ts` 内联 Set | `PLAN_MODE_BLOCKED_TOOLS`（13 项字面量） | `TOOL_RISK_REGISTRY` 派生 |
| `route.ts` L2058 / L2149 | `90000` / `90000` | `AGENT_LLM_TIMEOUT_MS` / `AGENT_STREAM_IDLE_TIMEOUT_MS` |
| `route.ts` L1771 / L3254 | `5000` / `60000` | `AGENT_KEEPALIVE_INTERVAL_MS` / `AGENT_FORCE_FINAL_TIMEOUT_MS` |
| `tool-manager.ts` | 默认超时 `60000` / `TOOL_TIMEOUT_OVERRIDES` / `NO_RETRY_TOOLS` | `agent-budget` 同名常量与派生集合 |
| `pending-user-input.ts` | `5 * 60 * 1000` | `HITL_USER_INPUT_TIMEOUT_MS` |
| `pending-client-tool.ts` | `2 * 60 * 1000` | `HITL_CLIENT_TOOL_TIMEOUT_MS` |
| `skill-forge-service.ts` | `180_000` / `300_000` | `SKILL_FORGE_LLM_TIMEOUT_MS` / `SKILL_FORGE_PIPELINE_BUDGET_MS` |
| `device-integration-service.ts` | `180_000` / `240_000` | `AUX_LLM_TIMEOUT_MS` / `DEVICE_FORGE_PIPELINE_BUDGET_MS` |
| `vision-gateway.ts` | `60_000` × 2 / `20_000` | `VISION_DIAGNOSE_DEFAULT_TIMEOUT_MS` / `VISION_CANDIDATE_MIN_TIMEOUT_MS` |

核心收益：**内层管线预算与工具级超时现在引用同一个变量**。原先两处各写一个字面量、靠注释说"外层必须大于内层"；现在改一处即可，且有测试守着"外层必须严格大于内层"。

### 🐛 顺手修掉的活 bug

`connect_device_from_doc`（设备接入工坊，工具名见 `lib/mcp/builtin-device-forge.ts`）：
- **问题**：内层管线预算 **240s**（`device-integration-service.ts` 的 `PIPELINE_BUDGET_MS`），
  但该工具**没有超时覆盖** → 落到默认 **`TOOL_DEFAULT_TIMEOUT_MS` = 60s**。
  等于外层必然先判超时，内层还没收敛就被放弃 —— 用户几乎拿不到结果。
- **修复**：`TOOL_TIMEOUT_OVERRIDES.connect_device_from_doc = 480_000`（对齐技能工坊的量级），
  并登记为 `expensive` 类禁重试（超时不取消后台管线，重试会整条重跑）。
- **护栏**：加入 `PIPELINE_BUDGET_CONTRACTS`，由测试断言 `480s > 240s`。

### ⚠️ 登记但未改行为的已知缺口（`getAgentBudgetWarnings()` 输出）

刻意**不做静默变更**，先由 `getAgentBudgetWarnings()` 持续暴露，等你拍板：

| 工具 | 缺口 |
|---|---|
| `task_create` / `task_update` / `cron_create` / `automation_canvas_apply` | 有副作用（写库/建定时任务）但当前允许自动重试 —— **若上游非幂等，重试会产生重复任务/重复定时任务** |
| `take_camera_snapshot` / `move_camera_and_look` | 物理动作类，但计划模式未屏蔽（`reset_camera` 屏蔽了，`move_camera_and_look` 没有） |
| `delete_device` | 写操作：既允许重试、计划模式也未屏蔽 |

### 兼容性与验收

- 除上述 `connect_device_from_doc` 一处有意修复外，**所有数值与集合成员与改造前逐字一致**，抽成了"回归锁"断言。
- `agent-budget.test.ts` **20/20 通过**。
- 既有回归：`tool-manager` 8、`pending-user-input` 10、`context` 39+5、`skill-forge-service` 21 —— 共 **83/83 通过**。
- `tsc --noEmit` 回到基线 **199**。

---

## 七、已落地改造 · 优先级 5：工具依赖改显式资源元数据

### 认知前提（这也是旧方案失效的根因）

**OpenAI 式 function calling 里，同一个 assistant turn 的多个 `tool_call` 之间没有任何机制可以互相引用对方的结果。**
既然引用不了，"数据依赖"在这一层**不可能存在**。旧实现却在试图从参数字符串里把它猜出来：

```ts
// 旧：把 arguments JSON 串起来做子串匹配
const argsStr = JSON.stringify(currentTool.arguments)
if (argsStr.includes(prevTool.name) || argsStr.includes(prevTool.id)) { /* 认为有依赖 */ }
// 还有一条硬编码命名约定
if (name.includes('analyze') || name.includes('diagnose')) { /* 依赖任意 search/scrape */ }
```

两个方向都会错：**假依赖**（参数里写了别的工具名就凭空串行）、**漏依赖**（真约束没有名字重合 → 并行顺序错）。

真正存在、且必须串行的其实只有一件事 —— **资源冲突**：
- 写-写：两个工具改同一资源（如两个 `control_camera`）
- 写-读：一个改、另一个读同一资源（如 `move_camera_and_look` vs `take_camera_snapshot`）

### 新增 / 改写

| 文件 | 变更 |
|---|---|
| `lib/ai/tool-capabilities.ts` | **新增**。资源槽定义 + `TOOL_CAPABILITIES` 显式表（36 个工具登记读写槽）+ `hasResourceConflict()` / `unsatisfiedDependencies()` |
| `lib/ai/parallel-tool-executor.ts` | **重写**。移除三处字符串启发式；新增 `planToolBatches()`（纯函数、可单测）；`canExecuteInParallel` 语义修正为"是否只分一批"；删除危险的 `executeToolCallsInParallelForced` |
| `lib/ai/parallel-tool-executor.test.ts` | **新增**。25 项：冲突矩阵、该并行/该串行的边界、不变量（不重不漏）、真实执行时序（并发峰值断言） |

### 🐛 修掉的并发正确性问题

| 场景 | 旧行为 | 新行为 |
|---|---|---|
| `[move_camera_and_look, take_camera_snapshot]` | 无 `move` 的命名匹配 → 可能同批，**电机还在移动就抓帧** | 拆两批，严格先后 |
| `[control_camera, control_camera]` | 名字落在白名单 → **强制并行**，两次位移打断彼此行程 | 拆两批，串行下发 |
| `[update_task, task_list]` | 无依赖 → 并行，可能读到中间态 | 写 task / 读 task → 串行 |
| `[toggle_relay, toggle_relay]` | 并行 → 同一继电器被重复动作 | 同名工具一律串行 |

同时对「纯查询组合」保持甚至提升并行度（若干原本被误判为有依赖的组合现在恢复并行）。

### 设计取舍

- **未登记工具**（第三方 MCP）默认写「只有自己名的资源槽」：同名多次调用串行、不同名仍并行。
  刻意不全量串行 —— 否则装了 MCP 的用户请求会整体退化成串行。策略常量 `UNKNOWN_TOOL_POLICY` 显式记录。
- **保留 `analyze_soil` / `diagnose_plant_image` → 检索工具的 `dependsOn`**，等价于旧的 analyze/diagnose 启发式，
  目的是迁移期行为不变；确认无副作用后可清空这张表的 `dependsOn` 字段。

### 验收

- `lib/ai` 全量：**17 个测试文件 / 245 项全通过**（本轮新增 25 项）。
- `tsc --noEmit` 回到基线 **199**。
- 真实执行时序用例断言了「冲突工具并发峰值 = 1、无冲突 = 2」，不只是看批次划分。

---

## 五、一句话总结

**你的"AI 能力层"已经是成熟框架的水准（上下文工程尤其出色），欠的是"软件工程层"——把 3783 行的入口拆开、把进程内状态搬出去、把隐式契约显式化。这三件事做完，这套框架的可扩展性和可维护性会直接上一个台阶。**
