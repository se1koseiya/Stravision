# Stravision · 莓界 —— 技术手册

> 面向：接手开发、二次开发、运维部署、代码评审的同学
> 覆盖：总体架构 / 数据层 / 鉴权 / 业务模块 / AI 子系统 / 前端设计系统 / API / 部署 / 桌面端 / 测试 / 排障规范
> 基线：`package.json` version **5.0.2**，代码基线 2026-10-18（仓库 `berry-realm-v4.0`，线上 `stravision.site`）

---

## 0. 阅读指南

### 0.1 本文与其它文档的分工

| 文档 | 面向 | 内容 |
| --- | --- | --- |
| `README.md` | 访客 / 新同学 | 项目定位、能力清单、快速上手提示词 |
| **`TECHNICAL_MANUAL.md`（本文）** | 开发者 / 运维 | **实现事实**：真实代码结构、数据模型、协议、常量、内部链路、排障 |
| `USER_MANUAL.md` | 终端用户 | 页面怎么点 |
| `ADMIN_UI_MANUAL.md` | 管理员 | 后台怎么用 |
| `PROJECT_HANDOVER.md` | 交接 | 历史演进与大段背景 |
| `.workbuddy/memory/topic-hardrules.md` | 本机协作 AI | 踩坑铁律（改代码前必读） |

**README 与实现存在偏差**（历史遗留，以本文与代码为准）：

| README 描述 | 实际实现 |
| --- | --- |
| Prisma 7 ORM + `prisma migrate dev` | **不用 Prisma**：`prisma/schema.prisma` 只有 datasource、无 model；全部走 `pg` + `initDB()` 幂等 DDL |
| 图标用 `lucide-react`、`strokeWidth=1.75` | 图标唯一源 `components/icon.tsx`，248 个图标映射 **HarmonyOS Symbol**，`strokeWidth` 无效 |
| 主色 `#1677ff`、纯白底 | 晨雾松 emerald×zinc：亮 `#059669` / 暗 `#34D399`，画布 `#FAFAFA` |
| 可视化 ECharts / Recharts | 图表三件套 `components/charts/`（纯 SVG / CSS Grid）+ `@ant-design/plots` |
| 中间件 `middleware.ts` | Next 16 已改名 **`proxy.ts`** |

### 0.2 约定

- 所有路径相对仓库根。
- 「唯一源」= 全站只允许从这里取值，别处重复实现视为缺陷。
- 标记 = 违反会造成线上故障或已验证的返工。
- 代码片段为摘录，省略号不代表可删代码。

### 0.3 术语表

| 术语 | 含义 |
| --- | --- |
| 莓小智 / Berry | 平台 AI 助手人格（前端化身 `BerryOrb`） |
| Agent Loop | `/api/chat` 里的「LLM → 工具 → 回灌 → LLM」迭代循环 |
| HITL | Human-In-The-Loop，挂起等用户输入 / 等确认 |
| 快照卡 | 摄像头抓帧后在对话里渲染的图片卡片 |
| 交付物 | AI 产出的报告 / 代码块，判定见 `lib/ai/deliverable-classifier.ts` |
| 探针（probe） | 根目录 `_probe_*.mjs`，用 Playwright 驱动真实浏览器做验收 |
| DC | Device Control，设备控制台（`app/device-control/`） |
| KB | Knowledge Base，知识库（`/kb-store`） |

---

## 1. 系统概览

### 1.1 一句话架构

**Next.js 16（App Router）单体全栈应用** + **独立 Node WebSocket 进程** + **PostgreSQL** + **MQTT Broker**，通过 Docker Compose 编排 7 个容器；同一套代码可打包为 **Electron 桌面端**（内置 embedded PostgreSQL + 内置 MQTT Broker，离线可用）。

### 1.2 代码规模（实测）

| 指标 | 数值 |
| --- | --- |
| `app/` + `lib/` + `components/` 的 ts/tsx 总行数 | **253,703** |
| API 路由（`app/api/**/route.ts`） | **198** |
| 页面（`app/**/page.tsx`） | **77** |
| `lib/` TypeScript 文件 | **221** |
| `components/` tsx 文件 | **410** |
| 单元 / 契约测试文件 | **29**（断言 ~389 处） |
| 根目录验收探针 `_probe_*` | **145** |
| `initDB()` 建表 | **48** 张（另有 7 张由服务自建，共 **55**） |
| 最大单文件 | `app/ai-assistant/page.tsx` **7,495 行** |

### 1.3 能力地图

```mermaid
flowchart LR
subgraph 感知
S1[传感器 MQTT 上报]
S2[摄像头 RTSP/RTMP 抓帧]
S3[光谱 11 通道]
S4[天气 / 地图 API]
end
subgraph 决策
A1[阈值告警]
A2[自动化规则引擎]
A3[AI Agent 工具链]
A4[Guardian 主动巡检]
end
subgraph 控制
C1[继电器 4 路]
C2[LED 4 路]
C3[步进云台 0-700mm]
C4[定时任务 cron]
end
subgraph 协同
K1[知识库 + 向量检索]
K2[Yjs 实时协同]
K3[OnlyOffice 在线编辑]
M1[IM 私聊 / 群聊]
end
S1 --> A1 --> C1
S1 --> A3 --> C2
S2 --> A3 --> C3
A2 --> C1
A4 --> M1
K1 --> A3
```

### 1.4 三类运行形态

| 形态 | 入口 | 特点 |
| --- | --- | --- |
| 开发（本机） | `pnpm dev`（3000） + `pnpm dev:ws`（3002） | Turbopack HMR；`app/dev-*` 22 个视觉验收台可用 |
| 生产（Docker） | `nginx` → `web`（3000/3002）+ `yjs-ws`（1234）+ `db` + `onlyoffice` + `cap` + `valkey` | `output: standalone` 仅桌面构建启用，容器用常规 `.next` |
| 桌面（Electron） | `desktop/main.js` | 内置 PG(5433)、内置 MQTT aedes(11883)、离线授权、自动更新 |

---

## 2. 总体架构

### 2.1 分层

```mermaid
flowchart TB
subgraph L1[接入层]
N[Nginx · TLS · SSE/WS 反代]
end
subgraph L2[应用层 Next.js 16]
P[页面 RSC / Client Components]
R[198 个 Route Handler]
PR[proxy.ts 守卫 · 限流 · 封禁]
end
subgraph L3[领域层 lib]
AI[lib/ai · Agent 编排 · 上下文 · HITL]
MCP[lib/mcp · 59 个工具定义 + 执行器]
DOM[lib/db · 25 个 service]
IOT[lib/mqtt-service · lib/scheduler]
SEC[lib/auth · security · rate-limit]
end
subgraph L4[基础设施]
PG[(PostgreSQL 16/18)]
MQ[(MQTT Broker)]
RD[(Redis/Valkey 可选)]
FS[(data/ uploads/ docs/)]
end
N --> PR --> P
N --> PR --> R
R --> AI --> MCP
R --> DOM --> PG
R --> IOT --> MQ
AI --> RD
R --> FS
```

**关键设计取舍**

1. **不引入 ORM**：`pg` 直连 + 手写 SQL。好处是 IoT 高频写入可控、无 N+1；代价是类型安全靠人工，`BIGINT/NUMERIC` 一律返回字符串，必须先 `Number()` 再参与比较（这条坑踩过多次）。
2. **单体 + 独立 WS**：页面、API、SSE 都在 Next 进程；只有语音（3002）和 Yjs（1234）拆进程，因为需要长连接和独立生命周期。
3. **AI 不做成独立服务**：Agent 编排直接跑在 Route Handler 里，共享 `lib/db`、`lib/mqtt-service` 单例；换来的代价是 `app/api/chat/route.ts` 长到 4,025 行。
4. **一切幂等启动**：`instrumentation.ts` → `initDB()`（`CREATE TABLE IF NOT EXISTS` + `ADD COLUMN IF NOT EXISTS`）→ 种子设备 → 调度器；**没有迁移框架**，靠幂等 DDL 演进。

### 2.2 启动时序（生产容器）

```mermaid
sequenceDiagram
participant E as docker-entrypoint.sh
participant N as Next.js (3000)
participant I as instrumentation.ts
participant D as PostgreSQL
participant W as ws-server.js (3002)
E->>E: chown uploads/data/docs（root → nextjs）
E->>W: 后台拉起 node server/ws-server.js
E->>N: su-exec nextjs pnpm start
N->>I: register()（NEXT_RUNTIME=nodejs）
I->>D: initDB() 48 表幂等 DDL
I->>D: seedDefaultDevices()
I->>I: SchedulerRunner.init() 装载 scheduled_tasks
I->>I: cron 0 0 * * *（清理旧传感器数据）
I->>I: cron GUARDIAN_CHECK_CRON（默认 */10 * * * *）
alt DB 初始化失败
I-->>N: 打日志 "Scheduler instrumentation skipped due to DB init failure" 并 return
Note over N: 页面仍可打开，但定时任务 / 守护巡检全失效
end
```

**排障要点**：dev 下出现 `Error creating table: `（message 为空）+ `Scheduler instrumentation skipped...`，99% 是**本机 PostgreSQL 没起**，不是代码问题。先跑 `_probe_db.cjs` 判定。

### 2.3 一次页面请求的生命周期

1. `nginx` 终结 TLS，按 location 分流（SSE / WS / 静态 / API）。
2. `proxy.ts`（Next 16 的 middleware 等价物）：
- 公开路径直接放行；
- 受限路径无 `auth` cookie → 302 `/login?from=…`；`/admin`、`/super-secure-admin` 无 token → **伪装成 404 回 `/`**（不暴露后台存在）；
- 限流：默认 300 req/60s，`/api/auth/*`（除 `/me`）1 req/6s；桌面端全量豁免；
- 维护模式：只放行 `/api/auth`、`/api/license`、`/login`、`/maintenance` 与静态资源。
3. `app/layout.tsx` 服务端做两件事：IP 封禁检查（`banned_ips`）、`PAGE_VIEW` 访问日志落库。
4. 页面组件（多数是 `"use client"` 大组件）拉 `/api/*`；需要实时的走 SSE（`/api/mqtt/stream`、`/api/knowledge/activity`、`/api/chat`）。

### 2.4 实时通道

| 通道 | 端点 | 协议 | 用途 |
| --- | --- | --- | --- |
| SSE | `/api/chat` | `data: {json}` + `[DONE]` + `: keep-alive` | AI 逐 token、工具事件、上下文用量 |
| SSE | `/api/mqtt/stream` | 同上 | 传感器实时读数 |
| SSE | `/api/knowledge/activity` | 同上 | 知识库协作动态 |
| WS | `/ws/voice` → `web:3002` | 二进制 PCM 16k + JSON 控制帧 | 纯 Omni 语音对话 |
| WS | `/ws/yjs` → `yjs-ws:1234` | y-protocols | 文档协同编辑 |

Nginx 对 SSE 必须 `proxy_buffering off` + `chunked_transfer_encoding off` + `proxy_read_timeout 86400s`；漏了会表现为「AI 回答中途卡住、一次性刷出」。这一点在 `nginx/nginx.conf` 已按 location 配好。

---

## 3. 技术栈与版本矩阵

### 3.1 运行时依赖（节选，以 `package.json` 为准）

| 层 | 依赖 | 版本 | 用途 / 备注 |
| --- | --- | --- | --- |
| 框架 | `next` | **16.1.6** | App Router；Turbopack 构建（webpack 模式有 bug 已弃用） |
| | `react` / `react-dom` | 19.2.2 | RSC + Client Components |
| | `typescript` | ^5 | `strict: true` |
| UI | `antd` | **^6.3.5** | 主组件库；字体唯一源 `--ant-font-family` |
| | `@ant-design/x` | 2.8.0 | `Bubble.List` / `Conversations` / `CodeHighlighter` |
| | `@ant-design/x-markdown` | 2.8.0 | **有 pnpm patch**（`patches/@ant-design__x-markdown@2.8.0.patch`） |
| | `@ant-design/x-card` | 2.8.0 | 结构化卡片 |
| | `radix-ui` / `@radix-ui/*` | 1.x | 无样式原子组件（51 个 `components/ui`） |
| | `tailwindcss` | ^4 | **CSS-first，无 tailwind.config** |
| | `@ant-design/plots` | 2.6.8 | 复杂图表 |
| 可视化 | `@xyflow/react` | 12.10 | 自动化流程图编辑器 |
| | `three` + `@react-three/*` + `ogl` | — | 大棚 3D / 落地页 |
| | `mermaid` | 11.2.3 | Markdown 里 ```mermaid 渲染 |
| 动效 | `framer-motion` | 11.18 | ~170 文件直接 import |
| | `gsap` | 3.13 | 落地页时间轴 |
| | `@studio-freight/react-lenis` | 0.0.47 | 全站平滑滚动 |
| 数据 | `pg` | ^8.18 | 唯一 DB 驱动（连接池 max 20） |
| | `ioredis` | ^6 | HITL 跨实例传输（可选） |
| | `better-sqlite3` | ^12.6 | 桌面端局部缓存 |
| | `embedded-postgres` | 18.4.0-beta.17 | 桌面端内置 PG（Windows 包另有 `@embedded-postgres/windows-x64`） |
| IoT | `mqtt` | ^5.14 | 客户端 |
| | `aedes` | ^1.1.2 | 桌面端内置 Broker |
| AI | `openai` | ^6.25 | OpenAI 兼容协议 SDK |
| | `ai` | ^5.0.106 | Vercel AI SDK |
| | `@ricky0123/vad-web` + `onnxruntime-web` | — | Silero VAD（浏览器端） |
| 实时 | `ws` | ^8.19 | 语音 WS |
| | `yjs` + `y-protocols` + `y-websocket` | — | 协同编辑 |
| 文档 | `docx` / `mammoth` / `pdf-data-parser` / `jspdf` / `xlsx` / `jszip` | — | 报告导出、文档解析 |
| 认证 | `jose` | ^6.1.3 | JWT HS256 签发/验签 |
| | `bcryptjs` | ^3 | 密码哈希 cost 10 |
| 支付 | `alipay-sdk` | ^4.14 | 支付宝登录/支付 |
| 邮件 | `resend` | ^6.7 | 验证码、告警邮件 |
| 调度 | `node-cron` / `cron-parser` | ^4 / ^5 | 进程内定时 |
| 校验 | `zod` | ^4.3.6 | 请求体校验 |

### 3.2 开发依赖

`vitest` 4 + `@testing-library/*` + `jsdom` + `fast-check`（属性测试）、`electron` 44 + `electron-builder` 26、`javascript-obfuscator`（桌面端混淆）、`tsx`（脚本直跑）、`eslint` 9 flat config。

### 3.3 明确不用 / 已弃用

| 项 | 状态 |
| --- | --- |
| Prisma Client | **不用**（schema 无 model，代码不 import） |
| Zustand | README 提到，实际以 Context 为主 |
| `middleware.ts` | Next 16 改为 `proxy.ts` |
| Ultralytics YOLO 全系 | **AGPL，禁止引入** |
| Anthropic / Gemini 协议 | 未实现；上游只有 OpenAI 兼容族（含 DashScope、GLM、Moonshot） |
| ECharts / Recharts | 未安装 |

---

## 4. 代码结构与模块地图

### 4.1 顶层目录

```text
berry-realm-v4.0/
├── app/ # Next.js App Router（页面 + API + 全局样式）
│ ├── api/ # 198 个 route.ts（见 §10）
│ ├── ai-assistant/ # AI 助手主界面（page.tsx 7495 行 + 14 子组件）
│ ├── dashboard/ # 可拖拽仪表盘（react-grid-layout）
│ ├── device-control/ # 设备控制台（3828 行 client）
│ ├── monitor/ # 实时监控（1712 行）
│ ├── automation/ # 规则列表 + editor/（ReactFlow 1393 行）
│ ├── kb-store/ # 知识库（协作 / OnlyOffice / Yjs）
│ ├── admin/ # 管理后台（antd 840 行）
│ ├── (mobile)/ # 移动端 PWA 路由组（14 页）
│ ├── dev-*/ # 22 个视觉验收台（无登录门槛，可删）
│ ├── layout.tsx # Provider 链 + 材质注入
│ └── globals.css # 1848 行，Tailwind v4 CSS-first 唯一入口
├── components/ # 410 个 tsx
│ ├── ui/ # 51 个 shadcn(new-york) 原子组件
│ ├── ai/ ai-assistant 相关子组件
│ ├── chat/ # IM 消息 / 窗口 / 侧栏
│ ├── charts/ # 三件套：heatmap-grid / sparkline / spectral-chart
│ ├── device/ # 材质、设备卡、静态引导页
│ ├── landing-v4/ # 当前落地页
│ ├── admin/ kb/ mcp/ model-store/ settings/ scheduler ...
│ └── icon.tsx # 248 图标唯一源（HarmonyOS Symbol）
├── lib/ # 221 个 ts，领域层
│ ├── ai/ # Agent、上下文、工具、记忆、HITL、视觉、技能
│ ├── mcp/ # 59 工具定义 + 执行器 + builtin 实现
│ ├── db/ # 25 个 *-service.ts + database.ts（DDL/连接池）
│ ├── auth.ts token.ts security.ts rate-limit.ts cap.ts
│ ├── mqtt-service.ts mqtt-config.ts scheduler/ automation/
│ ├── voice/ xiaozhi/ vision/ vlm-prompts.ts
│ └── utils/ hooks/ contexts/ types/
├── server/ # ws-server.js（语音 3002）+ ws-proxy.js
├── ws-server/ # yjs-server.js（协同 1234）
├── desktop/ # Electron 主进程 + lib/ + electron-builder.yml
├── scripts/ # 构建 / 桌面打包 / 邮件测试 / 演示账号
├── nginx/ # nginx.conf + 维护页 + certs
├── prisma/schema.prisma # 仅 datasource，无 model（历史残留）
├── data/ # 运行期数据：user-memory/、announcements.json 等
├── public/ # 静态资源（VAD wasm、3D 模型、视频、图标）
├── Dockerfile # 4 stage
├── docker-compose.yml # 7 服务
├── proxy.ts # Next 16 全局守卫 / 限流
├── instrumentation.ts # 启动钩子：DB / 种子 / 调度 / cron
└── next.config.ts # standalone、headers(CSP)、rewrites、外部包
```

### 4.2 关键文件速查

| 关注点 | 文件 | 说明 |
| --- | --- | --- |
| 全局守卫 | `proxy.ts` | 路由保护、限流、维护模式、伪装 404 |
| 启动编排 | `instrumentation.ts` | DB 初始化 → 种子 → cron |
| DDL / 连接池 | `lib/db/database.ts` | 1280 行，48 表 + 索引 + 迁移 |
| AI 主循环 | `app/api/chat/route.ts` | 4025 行，`while (iteration < MAX)` |
| Agent 编排 | `lib/ai/agent-orchestrator/orchestrator.ts` | 工具执行 + 记忆 + 监控 |
| 预算唯一源 | `lib/ai/agent-budget.ts` | 迭代/超时/风险登记表 |
| 并行判定 | `lib/ai/tool-capabilities.ts` | 资源槽冲突 |
| 上下文 | `lib/ai/context/*` | 预算、估算、压缩、四档工具结果 |
| 工具定义 | `lib/mcp/mcp-tool-definitions.ts` | `MCP_TOOL_REGISTRY` 59 项 |
| HITL | `lib/ai/hitl/*` | 进程内 / Redis 双传输 |
| 设备协议 | `lib/mqtt-service.ts` | 主题订阅、报文、控制指令 |
| 调度 | `lib/scheduler/runner.ts` | cron + 一次性任务 |
| 设计 token | `app/globals.css` | `--br-*` / `--color-*` / `--dc-*` |
| 图标 | `components/icon.tsx` | 248 个具名图标 |
| 桌面主进程 | `desktop/main.js` | 1410 行，9 步 bootstrap |

### 4.3 `lib/ai/` 结构（最复杂的一层）

```text
lib/ai/
├── agent-orchestrator/ # orchestrator / tool-manager / memory-manager / monitor / alert-manager
├── agent-loop/ # 仅 response-filters.ts（裸 JSON 过滤、旧版设备指令清理）
├── agent-budget.ts # 全部超时/迭代/风险登记的唯一源
├── tool-capabilities.ts # 工具读写资源槽 → 并行判定
├── context/ # budget / context-builder / context-prefs / history-compressor
│ # / token-estimator / tool-result-compactor / telemetry
├── hitl/ # types / index / redis-transport / in-process-transport / instance
├── skill-system/ # loaders / matchers / skill-manager / types
├── vision/ # vision-gateway / prompts / similar-cases
├── sub-agents/ # 空目录（预留）
├── provider-resolver.ts # 模型 → baseUrl/apiKey/provider
├── provider-body-adapter.ts # toUpstreamMessage 白名单、assistant 图片降级
├── effective-model.ts # auto 选模、候选链（最多 6）
├── parallel-tool-executor.ts
├── camera-snapshot.ts # 快照 → 独立 assistant 消息
├── deliverable-classifier.ts# 报告 vs 代码块判定
├── pending-user-input.ts / pending-client-tool.ts / tool-confirmation.ts
├── guardian-service.ts # AI 主动守护（离线/阈值巡检）
├── ai-cron-service.ts / ai-cron-executor.ts
├── deep-research-service.ts / web-search-service.ts / knowledge-search.ts
├── memory-extraction-service.ts / memory-prompt-enhancer.ts / user-memory-file-service.ts
├── persona-system.ts / prompt-templates.ts / ai-system-prompt.ts
└── *.test.ts # 契约测试（budget / snapshot / parallel / confirmation）
```

---

## 5. 数据层

### 5.1 连接与初始化

```ts
// lib/db/database.ts（摘）
new Pool({
connectionString: process.env.DATABASE_URL,
max: 20, // SSE 长连接 + 每条 MQTT 写库 + 聊天多查询，默认 10 会耗尽
idleTimeoutMillis: 30_000,
connectionTimeoutMillis: 5_000,
maxUses: 1_000, // 防长连接状态积累
})
pool.on("error", …) // 兜底：idle 连接被服务端断开不让进程崩
```

- `NEXT_RUNTIME === "edge"` 时模块直接抛错 —— 数据层不可在 Edge 跑。
- `initDB()` 用模块级 `initPromise` 做单例；重复调用不会再执行 DDL。
- 建表失败吞掉 PG `42P07`（already exists），其余错误打印 `Error creating table: <msg>`（msg 可能是空串）。

### 5.2 表清单（55）

**A. 账号与安全（8）**

| 表 | 用途 | 关键字段 |
| --- | --- | --- |
| `users` | 账号主表 | `id BIGSERIAL` / `uid` / `email` / `password_hash` / `role` / `permissions`(JSON TEXT) / 5 种 OAuth openid / `daily_ai_limit` `daily_ai_usage` `last_ai_usage_date` / `ai_balance` / `membership` / `monthly_credit_*` / `credit_cycle_date` / `email_verified` / `created_at BIGINT` |
| `email_verifications` | 邮箱验证码 | `code` 6 位 / `expires_at` 10 分钟 / `used` |
| `login_logs` | 登录审计 | `ip` `country` `region` `city` `user_agent` `device_type` |
| `banned_ips` | IP 封禁 | `ip UNIQUE` / `reason` / `expires_at` |
| `access_logs` | 页面/接口访问日志 | `ip` `method` `path` `status` `duration` |
| `ip_locations` | IP 归属地缓存 | — |
| `login_tickets` | 一次性登录票据（跨端换 token） | — |
| `system_settings` | 键值配置 | — |

**B. 设备与 IoT（6）**

| 表 | 用途 |
| --- | --- |
| `devices` | 设备注册表：`type CHECK IN ('relay','sensor','camera','stepper')`、`subscribe_topic`、`is_enabled`、`sort_order` |
| `device_sensor_data` | 自定义传感器 JSON（动态字段） |
| `sensor_readings` | 标准 11 项环境读数（温湿度×10 存储） |
| `device_logs` | 设备操作审计 |
| `scheduled_tasks` | 定时任务：`cron_expression` / `execute_at` / `action_type` / `run_status` / `last_error` |
| `ai_cron_jobs` | AI 延迟任务：`status` `scheduled_time`，类型 `analysis\|device_control\|notification\|custom` |

**C. 社交 / IM（5）**：`messages`（`sender_id` `receiver_id` `group_id` `type` `file_url` `read_at`）、`groups`、`group_members`、`friends`、`friend_requests`。另有 `typing_status`（由 `app/api/chat/typing/route.ts` 自建）。

**D. AI 与自动化（7）**

| 表 | 用途 |
| --- | --- |
| `automation_rules` | ReactFlow 图 JSON + 启用状态 + 执行计数 |
| `user_preferences` | 长期记忆：用户偏好（`setUserPreference`） |
| `device_patterns` | 设备使用模式（昼夜/天气响应/手动覆盖） |
| `successful_strategies` | 成功策略沉淀 |
| `agent_execution_logs` | 每次工具执行（`user_id` `session_id` 索引） |
| `agent_tasks` | Agent 任务清单（`mcp-tool-executor.ts` 自建） |
| `ai_credit_logs` | 积分流水：`credits` `model_rate` `global_multiplier` `estimated` `refunded` |

**E. 知识库（16）**：`knowledge_collections`、`knowledge_items`、`knowledge_tags`、`knowledge_item_tags`、`knowledge_versions`、`knowledge_chunks`、`knowledge_permissions`、`knowledge_query_log`、`knowledge_backups`、`knowledge_recommendations`、`knowledge_market_subscriptions`、`kb_collaborators`、`kb_invitations`、`kb_operation_logs`、`kb_yjs_documents`。
其中 `knowledge_chunks` 支持向量检索，`knowledge_items` 有 GIN 全文索引：

```sql
CREATE INDEX idx_kb_items_fts ON knowledge_items
USING gin(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,'')));
```

**F. 商业化与内容（4）**：`changelog_entries`、`desktop_licenses`、`desktop_license_activations`、`user_reports`（AI 简报 / 我的空间）。

**G. 组织与病历（4）**：`organizations`、`organization_members`、`diagnosis_records`、`diagnosis_followups`。

**H. 库外自建（7）**：`ai_guardian_alerts`（guardian）、`skill_forge_reports`（技能工坊）、`mcp_servers`、`store_skills`、`user_skill_installs`、`agent_tasks`、`typing_status`。

### 5.3 字段约定（跨表通用）

| 约定 | 说明 |
| --- | --- |
| 时间戳 | **`BIGINT` 毫秒**，不是 `TIMESTAMP`。`pg` 返回**字符串** → 比较/运算前必须 `Number()` |
| 主键 | `BIGSERIAL`（`desktop_licenses` 等用 TEXT code） |
| 结构化字段 | 一律 `TEXT` 存 JSON 字符串（`permissions` `params` `graph` `metadata`）→ 读出后 `JSON.parse` |
| 布尔 | `INTEGER` 0/1（`is_active` `is_enabled` `is_favorite`） |
| 数值 | `NUMERIC` 也返回字符串，金额/积分一律 `Number()` |
| 温湿度 | MQTT 上报 ×10 整数，展示时 `/10` |

**写入必须验证**：任何 `INSERT`（尤其积分结算 `settleCredits`）必须在**事务内实跑一次**再上线，历史上出现过「只读测试通过、写入静默失败」。

### 5.4 迁移策略

**没有迁移框架**，靠三种幂等语句演进：

```sql
CREATE TABLE IF NOT EXISTS …; -- 新表
CREATE INDEX IF NOT EXISTS …; -- 新索引
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership TEXT; -- 新列
```

- `initDB()` 尾部再调 `ensureKbCollaborationTables()` / `ensureOrganizationTables()` / `ensureMedicalRecordTables()`（各有进程内 `ensured` 标记）。
- 一次性数据迁移：`migrateFromJSON()` 把 `data/users.json` 导入后改名 `.migrated`，并回填 `users.uid`、插入 `bot@stravision.ai`（admin）。
- 部署顺序：**先起 DB → 再起 web**（`depends_on: db`），DDL 由 web 启动自动完成，无需手动 migrate。

### 5.5 备份与容量

```bash
# 每日备份（建议 cron 02:30）
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
| gzip > /backup/stravision-$(date +%F).sql.gz
```

- `sensor_readings` / `access_logs` / `agent_execution_logs` 增长最快；`cleanupOldSensorData()` 每日 `0 0 * * *` 清理。
- 连接池 20 × 容器数 是关键约束：扩容 web 副本前先算 `副本数 × 20 < PG max_connections`。

---

## 6. 鉴权、权限与安全

### 6.1 认证令牌

```ts
// lib/token.ts（摘）
new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(secret)
```

| 项 | 值 |
| --- | --- |
| 算法 | **HS256**（`jose`） |
| 有效期 | **7 天**（与 cookie `maxAge` 同步） |
| 载体 | Cookie **`auth`** |
| Cookie 属性 | `httpOnly` / `sameSite=lax` / 生产 `secure` / `path=/` |
| 密钥 | `JWT_SECRET`，**缺失或 < 32 字符直接抛错拒绝启动** |
| 取用户 | `getCurrentUser()`：验签 → 查 `users` 表（每次请求都查，保证封禁/改角色即时生效） |

### 6.2 角色与权限

```ts
type UserRole = "user" | "admin" | "super_admin" // lib/db/user-service.ts
interface UserPermissions { allowedControls?: string[]; deviceControl?: boolean }
```

- `permissions` 是 JSON 字符串，存 `allowedControls`（可控设备白名单）与 `deviceControl`（总开关）。
- 组织/温室层级通过 `organizations` + `organization_members` 授权：邀请进组织 → 自动建好友 + 授予 `deviceControl`；移除 → 自动回收。
- 本机开发：`STRAVISION_LOCAL_MODE=1` 时首个注册用户自动 `super_admin`（排除 bot 账号）。

### 6.3 路由守卫矩阵（`proxy.ts`）

`matcher` 覆盖：`/dashboard` `/monitor` `/home` `/device-control` `/profile` `/ai-assistant` `/admin` `/super-secure-admin` `/api/:path*` `/login` `/register`。

| 路径 | 无 token 时 | 说明 |
| --- | --- | --- |
| 公开页（`/`、`/docs`、`/blog`、`/login`…） | 放行 | — |
| 业务页（`/dashboard` 等） | 302 `/login?from=<原路径>` | — |
| `/admin` | **回 `/`（伪装 404）** | 不暴露后台存在；角色校验在 API 层做 |
| `/super-secure-admin` | 回 `/` | 同上 |
| `/api/internal/*` | 放行 | 靠 `x-internal-secret` 自校验 |
| 支付宝登录/回调、`/api/auth/ticket/check`、`/api/stream-proxy` | 放行 | 第三方回调无 cookie |
| 维护模式 | 只放行 `/api/auth`、`/api/license`、`/login`、`/maintenance`、静态资源 | 其余转维护页 |

`/chat` 虽在 `protectedRoutes` 常量里，但**未进 matcher**，实际没有页面守卫——若要收紧需同时改两处。

### 6.4 限流与封禁

| 层 | 规则 |
| --- | --- |
| 全局（proxy） | 默认 **300 req / 60s / IP** |
| 认证接口 | `/api/auth/*`（除 `/me`）**1 req / 6s** |
| 登录接口 | 5 次 / 分钟（route 内二次限制） |
| 注册接口 | 3 次 / 分钟 |
| 超限响应 | API → `429 {"error":"Too many requests"}`；页面 → `/too-many-requests` |
| 桌面端 | `isDesktopApp()` → **全量豁免**（本地无公网风险） |
| 封禁 | `banned_ips`（`checkSecurity()` 在业务 API 前拦截，生产生效）；入口：后台 `POST /api/admin/banned-ips`、内部 `POST /api/internal/security/ban` |

### 6.5 人机验证

| 方案 | 状态 |
| --- | --- |
| **Cap**（自托管 PoW） | 实际启用。`CAP_VERIFY_URL` / `CAP_SECRET_KEY`；生产默认开；**登录**与**发送验证码**校验 |
| 阿里云滑块 | 环境变量还在，代码无引用 |
| Cloudflare Turnstile | 同上（仅 CSP 放行域名） |

**注册接口未校验人机验证** —— 已知缺口，若被刷需在此补 `verifyCapToken`。

### 6.6 加密与密钥

| 场景 | 方案 |
| --- | --- |
| 用户密码 | `bcryptjs` cost **10** |
| 语音 Omni API Key | **AES-256-GCM**，密钥由 `VOICE_KEY_ENCRYPTION_SECRET` 经 scrypt 派生（缺省有硬编码 fallback，生产必须设置） |
| 桌面授权码 | **Ed25519** 签名（`DESKTOP_LICENSE_PRIVATE_KEY` / `_PUBLIC_KEY`），客户端内置公钥验签 |
| 内部 API | `INTERNAL_API_SECRET` 走 `x-internal-secret`；**缺失时 `getInternalApiSecret()` 直接抛错**，不允许回退默认值 |

### 6.7 响应头（`next.config.ts`）

全站 CSP（放行 Turnstile、支付宝/QQ/微信域；dev 额外放行 `localhost:8080` OnlyOffice）、`Strict-Transport-Security max-age=63072000`、`X-Frame-Options SAMEORIGIN`、`X-Content-Type-Options nosniff`、`Referrer-Policy strict-origin-when-cross-origin`、`Permissions-Policy camera=()`（页面不可直接开摄像头，抓帧走后端 ffmpeg）、`Cross-Origin-Opener-Policy same-origin` + `Cross-Origin-Embedder-Policy credentialless`（后者是 Silero VAD 的 SharedArrayBuffer 要求）。

### 6.8 OAuth 登录矩阵

| 渠道 | 端点 | 备注 |
| --- | --- | --- |
| 微信开放平台 | `/api/auth/wechat/login|callback` | `wechat_openid` / `wechat_unionid` |
| 微信公众号 | 同上 | `WECHAT_APP_ID` |
| 企业微信 | `/api/auth/wework/*` | `wework_userid` |
| QQ 互联 | `/api/auth/qq/*` | `qq_openid` |
| 支付宝 | `/api/auth/alipay/*` | `alipay_user_id`；回调在白名单 |
| 邮箱 | `/api/auth/{register,login,send-verification,verify-email,forgot-password,reset-password}` | Resend 发码，6 位 / 10 分钟 |

跨端登录用 **login ticket**：`POST /api/auth/ticket/*` 生成一次性票据，另一侧 `POST /api/auth/ticket/check` 换正式 token（`login_tickets` 表）。

---

## 7. 业务模块详解

### 7.1 设备与 IoT（MQTT）

#### 7.1.1 连接与订阅

`lib/mqtt-service.ts` 是挂在 `globalThis` 上的单例（dev 热更新不重复建连）。

| 项 | 值 |
| --- | --- |
| Broker | `mqtts://${MQTT_HOST}:${MQTT_PORT}`（默认 **8883 + TLS**） |
| QoS | **1** |
| clientId | 随机（避免多实例互踢） |
| keepalive / 重连 | 60s / 5000ms |
| 基础订阅 | `meimefarm/basic_env_data`、`meimefarm/Spectrum`、`meimefarm/sensor/node0701…0711` |
| 动态订阅 | `devices.subscribe_topic` 里除 `meimefarm/*` 的自定义主题；建 `topic → device_id` 映射 |
| 发布 | `data/set` |

#### 7.1.2 报文格式

上行（设备 → 平台），JSON，温湿度以 **×10 整数**传输：

```json
{
"temperature": 236, "humidity": 658, "light": 12000, "co2": 820,
"earth_temp": 198, "earth_water": 342, "earth_ec": 1250,
"earth_n": 45, "earth_p": 32, "earth_k": 180,
"relay5": 1, "relay6": 0, "relay7": 0, "relay8": 0,
"led1": 0, "led2": 0, "led3": 0, "led4": 0,
"channel1": 120, "channel11": 88, "stepper_pos": 3200
}
```

下行（平台 → 设备），`rw_prot` 包裹：

```json
{ "rw_prot": { "Ver": "1.0.1", "dir": "down", "id": "<uuid>",
"w_data": [{ "name": "node0601", "value": 1 }] } }
```

| 类型 | 节点名 | 说明 |
| --- | --- | --- |
| `relay` | `node0601` ~ `node0604` | 4 路继电器（水泵 / 风扇 / RGB 灯 / 白光灯） |
| `led` | `node0605` ~ `node0608` | 4 路补光 |
| `stepper` | `node0801` / `0803` / `0814` / `0815` / `0817` | 云台步进；**两步协议**：先预设再给方向 |
| `stepper_reset` | 同上 | 回原点 |

#### 7.1.3 设备常量（唯一源）

```ts
// lib/constants.ts
DEVICE_IDS = { PUMP: 5, FAN: 6, RGB_LIGHT: 7, WHITE_LIGHT: 8 }
RELAY_DEVICE_RANGE = { MIN: 5, MAX: 8 } // 服务端校验继电器 ID
STEPPER = { PULSES_PER_MM: 160, MAX_TRAVEL_MM: 700, MAX_PULSES: 112000 }
```

设备类型枚举：`relay | sensor | camera | stepper`（`lib/db/device-registry-service.ts`，DB 层有 CHECK 约束）。默认种子 9 台：4 继电器 + 2 传感器 + 2 摄像头 + 1 云台。

#### 7.1.4 在线判定

`guardian-service.ts#getDeviceStatus()`：
1. 优先用 MQTT 内存里的 `lastDataReceivedAt`；
2. 回退查 `sensor_readings` 最新 `created_at`；
3. 阈值 `GUARDIAN_OFFLINE_THRESHOLD_MS`（默认 **5 分钟**）；
4. 返回 `online | offline | no_data`。

#### 7.1.5 调试

| 手段 | 说明 |
| --- | --- |
| `POST /api/mqtt/simulate` | 伪造一条上行数据，验证链路与仪表盘 |
| `GET /api/mqtt/stream` | SSE 实时读数（前端订阅） |
| `GET /api/health` | `checks.mqtt.status` 直接反映连接态（down → 整体 `degraded`，HTTP 仍 200） |
| `pnpm desktop:verify:mqtt` | 桌面端内置 Broker 自检 |

### 7.2 监控与仪表盘

| 页面 | 实现 | 要点 |
| --- | --- | --- |
| `/monitor` | `monitor/monitor-beautiful.tsx`（1712 行，`force-dynamic`） | 指标卡 + 光谱弹窗 + 大棚 3D + 活动/成员面板 |
| `/dashboard` | `dashboard-client.tsx`（1196 行） | `react-grid-layout` 可拖拽；布局存 `localStorage.dashboard-layout` / `-preset`；部件：温/湿/光/CO₂/土壤/天气/会员/AI 洞察 + 光谱 + 热力图 |
| `/activity` | 活动时间线 | 读 `device_logs` / `agent_execution_logs` |

图表**只允许**从 `components/charts/` 取：

| 组件 | 实现 | 用途 |
| --- | --- | --- |
| `heatmap-grid.tsx` | 纯 CSS Grid + 色标插值（`DEFAULT_HEATMAP_STOPS`） | 42 格温湿度热力图 |
| `sparkline.tsx` | 纯 SVG + `/api/device-history` + 内存缓存 | 迷你趋势线 |
| `spectral-chart.tsx` | 11 通道（415nm…Flicker）唯一实现 | 光谱 |

业务页面里就地手写 SVG 图表属违规——主题色/暗色适配会不一致。

### 7.3 自动化规则引擎

| 组成 | 位置 |
| --- | --- |
| 规则列表页 | `app/automation/page.tsx`（945 行，HDS 重设计） |
| 可视化编辑器 | `app/automation/editor/page.tsx`（1393 行，`@xyflow/react` 12） |
| 节点 | `trigger-node`（触发）/ `action-node`（动作）/ `logic-node`（与或非）/ `ai-node`（AI 决策）/ `deletable-edge` |
| 执行器 | `lib/automation/engine.ts` |
| 持久化 | `automation_rules`（graph JSON） |
| AI 侧工具 | `automation_strategy_*`（5 个）+ 前端工具 `automation_canvas_apply`（需 `clientCapabilities:['automation-canvas']`，由前端画布落地） |

执行链路：MQTT 上行 → 阈值/条件匹配 → 动作节点转 `ControlCommand` → `mqtt-service.publish` → 设备；结果写 `device_logs` 并累加 `automation_rules.exec_count`。

### 7.4 定时任务与调度

`lib/scheduler/runner.ts`（单例 + `Map<jobId, Task>`）：

| 触发方式 | 实现 |
| --- | --- |
| `cron_expression` | `node-cron`，非法表达式拒绝装载 |
| `execute_at`（一次性） | `setTimeout`；超过 `2^31-1 ms` 时**分片递归**（避免 24.8 天溢出） |

`action_type`：`relay | led | agent | reminder`。前两者转 MQTT 直接控制；后两者由前端展示执行（Agent 任务/提醒）。执行结果写 `run_status` / `last_run_at` / `last_error`。

| 全局 cron | 位置 | 作用 |
| --- | --- | --- |
| `0 0 * * *` | `instrumentation.ts` | `cleanupOldSensorData()` |
| `GUARDIAN_CHECK_CRON`（默认 `*/10 * * * *`） | `instrumentation.ts` | `runScheduledGuardianCheck()`：离线 / 阈值告警 |
| 每 60s 轮询 | `ai-cron-executor.ts` | 处理 `ai_cron_jobs` |

`startAICronExecutor()` **未被 instrumentation 调用**，目前只由 `POST /api/ai/cron/execute`（可选 `CRON_SECRET_TOKEN` Bearer）触发。若依赖 AI 定时任务，需要外部 cron 打这个接口，或在 instrumentation 里补启动。

### 7.5 知识库与协同

| 能力 | 实现 |
| --- | --- |
| 目录/条目/标签 | `knowledge_collections` / `knowledge_items` / `knowledge_tags`，`lib/db/knowledge-service.ts`（44 个函数） |
| 版本 | `knowledge_versions`（`version_number` 递增） |
| 分块 | `lib/ai/markdown-chunker.ts` → `knowledge_chunks`（`content_hash` 去重） |
| 向量 | `lib/ai/embedding-service.ts`，`embedding_status` 标记进度 |
| 检索 | `lib/ai/knowledge-search.ts`（向量 + FTS 混合），查询写 `knowledge_query_log` |
| 权限 | `knowledge_permissions`（grantee + permission），`kb_collaborators` |
| 协作 | `ws-server/yjs-server.js`（1234）；`kb_yjs_documents` 持久化；断连 5s flush / 30s snapshot |
| 在线编辑 | OnlyOffice Document Server 8.2，`/onlyoffice/` 反代；`lib/onlyoffice` |
| 市场 | `knowledge_collections.is_marketplace` + `knowledge_market_subscriptions`；部分索引 `WHERE is_marketplace = 1` |

### 7.6 IM 与会话

`lib/db/chat-service.ts` 的 `ChatService` 类：好友申请 → 通过后建 `friends` 双向行；私聊写 `messages(sender_id, receiver_id)`，群聊写 `messages(group_id)`；已读用 `read_at`；正在输入写 `typing_status`。

**两套「聊天」不要混**：`/api/chat` 是 **AI Agent 入口**（SSE 流）；IM 走 `/api/messages`、`/api/direct-messages`、`/api/groups` 的普通请求，是另一套链路。

### 7.7 诊断病历

| 表 | 用途 |
| --- | --- |
| `diagnosis_records` | 一次诊断：图片、结论、置信度、bbox、模型 |
| `diagnosis_followups` | 复诊记录（关联 record） |

入口是 **AI 助手内嵌面板**（`components/ai/medical-*`），不是独立页面。面板 `z-[150]`，会盖住卡片弹层——调层级时注意。

### 7.8 计费、额度与会员

| 机制 | 位置 | 规则 |
| --- | --- | --- |
| 日额度 | `ai-quota-service.ts` | `users.daily_ai_limit`（默认 10）；`free` 拒绝超额，`plus` 上限 999999；`reserveAiUsage` 发送前**原子预扣**，异常 `refundAiUsage` 回退 |
| 积分 | `credit-service.ts` | `outputWeight=3`、`tokensPerCredit=1000`、`plusMonthlyQuota=2000`、`proMonthlyQuota=300`；`credits = (in + out×3) / 1000 × modelRate`；单轮上限 **30 万 in / 6 万 out** token |
| 流水 | `ai_credit_logs` | `credits` `model_rate` `global_multiplier` `estimated` `refunded` |
| 月度 | `users.monthly_credit_quota/used/credit_cycle_date/credit_balance` | 跨月重置 |

### 7.9 通知

| 通道 | 实现 | 备注 |
| --- | --- | --- |
| 邮件 | Resend（`RESEND_API_KEY`），模板 `lib/email-templates.tsx` | 验证码、告警 |
| 企业微信 | `lib/notification-service.ts#sendWeComNotification()` | **Webhook URL/key 硬编码在源码**，属已知安全问题 |
| 桌面通知 | `lib/desktop-notify.ts` → preload 桥 | 仅后台且开关开启；同 `tag` 替换、1200ms 去重 |
| 站内公告 | `app/api/announcements` | 存 `data/announcements.json`，**不入库** |

环境异常汇总有 30 分钟全局冷却（`mqtt-service` 内）。

---

## 8. AI 子系统（核心）

> 这是全平台最复杂、改动风险最高的部分。**改之前先读本节 + `.workbuddy/memory/topic-hardrules.md`。**

### 8.1 分层

```mermaid
flowchart TB
U[前端 app/ai-assistant/page.tsx] -->|POST /api/chat| R[route.ts Agent Loop]
R --> C[上下文装配 lib/ai/context]
R --> PR[provider-resolver + body-adapter]
PR --> LLM[(上游 LLM)]
LLM -->|tool_calls| PE[parallel-tool-executor]
PE --> TM[tool-manager 超时/重试]
TM --> EX[mcp-tool-executor]
EX --> B1[builtin-device-control]
EX --> B2[builtin-agent-tasks]
EX --> B3[builtin-farm-data]
EX --> B4[builtin-vision-diagnosis]
EX --> B5[builtin-medical-records]
EX --> B6[builtin-automation-strategy]
EX --> B7[builtin-deep-research / skill-forge / device-forge]
EX --> B8[外部 MCP 服务]
R --> H[HITL 挂起]
R --> M[记忆 3 层 + 自动学习]
R -->|SSE| U
```

### 8.2 Agent Loop

主循环在 `app/api/chat/route.ts`（`while (iteration < MAX_AGENT_ITERATIONS)`，约 L2062）。

```mermaid
sequenceDiagram
participant F as 前端
participant R as /api/chat
participant L as LLM
participant T as 工具
F->>R: messages + sessionId + 模型/人格
R->>R: 鉴权 / 配额预扣 / 上下文装配
loop 最多 5 轮
R->>L: system + history + tools（流式）
L-->>R: 文本增量 / tool_calls
R-->>F: SSE 文本帧（逐 token）
alt 有 tool_calls
R->>R: 风险过滤（plan mode / 重试 / 确认）
R->>T: 并行执行（资源槽无冲突）
T-->>R: 结果（JSON / 图片 / 错误）
R-->>F: SSE tool_result / tool_progress
R->>R: compactToolResult 压缩后回灌
else 无 tool_calls
R->>R: break（正常收尾）
end
end
R->>R: 结算积分 / 记忆抽取 / 落库
R-->>F: [DONE]
```

**预算常量（唯一源 `lib/ai/agent-budget.ts`， 禁止就地写字面量）**

| 常量 | 值 | 含义 |
| --- | --- | --- |
| `AGENT_MAX_ITERATIONS` | **5** | 单次请求最多 LLM↔工具往返轮数 |
| `AGENT_LLM_TIMEOUT_MS` | 90s | 单轮 LLM 请求超时 |
| `AGENT_STREAM_IDLE_TIMEOUT_MS` | 90s | 流式空闲超时（超时即判流断） |
| `AGENT_FORCE_FINAL_TIMEOUT_MS` | 60s | 最后一轮强制「不带工具收尾」的超时 |
| `AGENT_KEEPALIVE_INTERVAL_MS` | 5s | SSE `: keep-alive` 间隔（防 Nginx/代理切流） |
| `AGENT_GRAND_SUMMARY_THRESHOLD_CHARS` | 12,000 | 超长输出触发总摘要的字符阈值 |
| `TOOL_DEFAULT_TIMEOUT_MS` | 60s | 工具默认超时 |
| `TOOL_MAX_RETRIES` | 2 | 可重试工具的最大重试次数 |
| `TOOL_RETRY_DELAY_MS` | 1,000 | 指数退避基数 |
| `HITL_USER_INPUT_TIMEOUT_MS` | 5min | 等用户输入的超时 |
| `HITL_CLIENT_TOOL_TIMEOUT_MS` | 2min | 等前端工具结果的超时 |
| `AUX_LLM_TIMEOUT_MS` | 180s | 辅助链路（技能工坊/设备解析） |
| `SKILL_FORGE_PIPELINE_BUDGET_MS` | 300s | 技能工坊内层预算 |
| `DEVICE_FORGE_PIPELINE_BUDGET_MS` | 240s | 设备接入工坊内层预算 |
| `VISION_DIAGNOSE_DEFAULT_TIMEOUT_MS` | 60s | 视觉诊断默认 |
| `VISION_CANDIDATE_MIN_TIMEOUT_MS` | 20s | 候选模型链最小份额 |

**工具级超时覆盖（`TOOL_TIMEOUT_OVERRIDES`）**

| 工具 | 超时 | 理由 |
| --- | --- | --- |
| `toggle_relay` | 10s | 继电器动作 + 状态确认 |
| `set_led` | 8s | 设置 + 短暂等待 |
| `control_camera` / `reset_camera` | 90s | 电机满程 700mm 约 30-40s + 稳定轮询 |
| `take_camera_snapshot` | 20s | ffmpeg 抓帧 |
| `move_camera_and_look` | 120s | 移动 + 截图组合 |
| `update_task` | 5s | 纯内存操作 |
| `web_search` | 30s | 卡住即失败 |
| `deep_research` | 480s | 多轮搜索 + 抓正文 |
| `diagnose_plant_image` | 120s | VLM 读图 + 结构化 |
| `create_skill_from_doc` / `refine_skill` / `connect_device_from_doc` | 480s | 多轮管线（内层 300s/240s，外层必须更大） |

**终止条件**

| 情形 | 行为 |
| --- | --- |
| 无 `tool_calls` | 正常 `break` |
| `exit_plan_mode` 提交计划 | 注入 `<PLAN>` 后 `break` |
| `CHECKPOINT` / `CLARIFY` | 挂起 → 用户提交后 `continue` |
| LLM 超时/网络/非 2xx/无 body | 置 `loopExitedAbnormally`，末轮若仍有工具则走**强制无工具收尾** |
| 达 5 轮上限 | 同上，强制收尾 |

**先看这一条**：`page.tsx` 判「收尾答案」必须兼容 `id.startsWith("answer-")`。历史 bug：`type` 字段从未写入，老写法 `findIndex(m => m.type === "answer")` 恒返回 -1，导致执行链末行永远 active、本轮结束**永不折叠**。

### 8.3 SSE 事件字典

格式：`data: {json}\n\n`，以 `data: [DONE]` 结束，空闲每 5s 发 `: keep-alive`。

| 键 / type | 载荷要点 | 前端消费 |
| --- | --- | --- |
| `choices[].delta.content` | 文本增量 | 气泡流式渲染 |
| `tool_calls` + `agent_iteration` | 本轮工具调用清单 | 执行链建条目 |
| `tool_call` | 单个工具开始 | 链上出现「调用中」 |
| `tool_progress` | 阶段/进度文案 | 链行副标题 |
| `tool_result` | 工具结果摘要（图片转 `snapshot`） | 链行结果 + 快照卡 |
| `client_tool_call` | 需**前端执行**的工具 | 前端执行后回 `/api/chat/client-tool-result` |
| `tool_confirmation_required` | 需人工确认的工具 | `ChatSenderInput` 的 `overlay` 插槽弹确认 |
| `tool_confirmation_resolved` | 确认结果 | 收起确认层 |
| `user_input_required` | CHECKPOINT/CLARIFY | 渲染表单 |
| `user_input_received` | 用户已提交 | 继续 |
| `user_input_timeout` | 5 分钟超时 | 提示重试 |
| `agent_status` | `{phase:"selecting_tool"\|"tool_stage"}` | 顶部状态灯 |
| `research_progress` | 深度研究阶段 | 研究进度条 |
| `skill_selection` | 命中的技能 | 链上「使用技能」 |
| `context_usage` / `context_update` | 本次上下文 token 用量 | 上下文计量条 |
| `context_compress_failed` | 压缩失败原因 | **必须显性提示用户**（否则以为 AI 失忆） |
| `llm_error` | 上游错误码/信息 | 错误 toast |
| `memory_saved` | 已沉淀记忆 | 记忆摘要卡 |
| `credit_usage` | 本次扣费 | 余额提示 |
| `error` | 通用错误 | 失败态 |

前端抓 SSE 必须用 `res.body.getReader()`；**禁止 `response.text()`**（会等整条流结束）。且 `data:` 行内的 content 可能是**二次转义**的 JSON 字符串，要逐行 `JSON.parse` 解一层。

### 8.4 上游协议适配

| 项 | 事实 |
| --- | --- |
| 支持协议族 | 仅 **OpenAI 兼容**；`provider.type ∈ {openai, dashscope, custom, glm, moonshot}` |
| 三分支 | DashScope 应用原生 / DashScope 原生 / OpenAI 兼容（route 内 1532 / 1608 / 1536 附近） |
| 解析 | `provider-resolver.ts`：`resolveProvider` / `normalizeBaseUrl` / `heuristicModelRate` |
| 字段白名单 | `provider-body-adapter.ts#toUpstreamMessage()`：`role` `content` `name` `tool_calls` `tool_call_id` + `reasoning_content` / `reasoning` |
| 参数清洗 | `adaptChatRequestBody()` 仅对 **Moonshot** 清采样参数、K3 改 `max_completion_tokens` |
| 图片降级 | `downgradeAssistantImages()`：**assistant 角色里的图片降级为文本**，在 `route.ts` 组完 `userMessages` 后、`hasImageContent` 判定前调用 |

**两条致命规则**

1. thinking 模式下 assistant 消息的 `reasoning_content` **必须原样回传**，丢了就报「400 第 N 轮」。
2. 非 user 图片必须在进上游前降级——**但只降 assistant**。`tool` 的图（视觉巡检的眼睛）和 `user` 的图（用户输入）必须原样上行。不降 → 上游 400 `Image in assistant message is not supported` → **用户发第二句话就报错**。契约锁 `provider-body-adapter` 相关 8 项测试。

**选模**（`lib/ai/effective-model.ts`）：

- `pickAutoModel()`：reasoning 优先 → vision → 默认；兜底 `deepseek-v3.2` / `qwen3.6-plus`。
- `resolveRequestedModel()`：平台不可路由时降级 auto；**BYOK 的模型不替换**（用户自带 key 必须尊重）。
- `buildModelCandidates()`：默认最多 **6** 个候选，按 provider priority。

### 8.5 工具系统

#### 8.5.1 定义与执行

| 层 | 文件 | 说明 |
| --- | --- | --- |
| 定义注册表 | `lib/mcp/mcp-tool-definitions.ts` | `MCP_TOOL_REGISTRY`，14 组内置 server，共 **59** 个定义 |
| 执行器 | `lib/mcp/mcp-tool-executor.ts` | 内置分发 + 外部 MCP 转发 |
| 超时/重试 | `lib/ai/agent-orchestrator/tool-manager.ts` | `Promise.race` + 指数退避 |
| 并行 | `lib/ai/parallel-tool-executor.ts` | 按资源槽判冲突 |
| 权限/风险 | `lib/ai/agent-budget.ts#TOOL_RISK_REGISTRY` | 22 项登记，派生三个集合 |

#### 8.5.2 工具族一览

| 族 | 代表工具 | 说明 |
| --- | --- | --- |
| 设备控制 | `list_devices` `get_sensor_history` `toggle_relay` `set_led` `control_camera` `reset_camera` `take_camera_snapshot` `move_camera_and_look` `get_channel` `get_all_spectrum` `delete_device` | 物理动作，**阻塞等真实状态**返回 `confirmed` / `stable` |
| 交互与任务 | `ask_user_question` `enter_plan_mode` `exit_plan_mode` `task_create/update/list` `cron_*` `load_tool_schema` `load_skill` | HITL 与元工具 |
| 自动化 | `automation_strategy_*`（5 个）+ 前端工具 `automation_canvas_apply` | 后者需 `clientCapabilities:['automation-canvas']` |
| 研究 | `web_search` `deep_research` `knowledge_save` | 联网 + 沉淀知识库 |
| 农场分析 | `get_current_conditions` `analyze_soil` `generate_inspection_report` `get_device_activity` | 读 `farm-service` |
| 记忆 | 3 个（偏好/模式/策略读写） | 写 `user_preferences` 等 |
| 视觉 | `diagnose_plant_image` | 最多 3 图，单 dataURL ≤ 7M 字符，返回 `_agent_action:'diagnosis'` |
| 病历 | 4 个（查/写/复诊/统计） | `diagnosis_records` |
| 工坊 | 技能工坊 3 + 设备接入 1 | 多轮 LLM 管线，预算 300s/240s |
| 外部 MCP | 天气 3、路线、brave/exa/anysearch ×4、firecrawl、sequential_thinking | 走 `mcp_servers` 配置 |

#### 8.5.3 风险登记表（`TOOL_RISK_REGISTRY`）

```ts
type ToolRisk = {
category: "physical" | "write" | "expensive"
noRetryReason?: string
blockedInPlanMode?: boolean
requiresConfirmation?: boolean
}
```

| 派生集合 | 数量 | 用途 |
| --- | --- | --- |
| `NO_RETRY_TOOLS` | 17 | 物理动作不可重试（重复开泵会出事） |
| `PLAN_MODE_BLOCKED_TOOLS` | 13 | 计划模式下只读不写 |
| `CONFIRMATION_REQUIRED_TOOLS` | 13 | 执行前必须人工点确认 |

三个集合**必须由注册表派生**， 不许手写第二份。新增工具漏登记会被 `getAgentBudgetViolations()` 断言失败。

#### 8.5.4 并行判定（`tool-capabilities.ts`）

每个工具声明读写的**资源槽**：

```ts
TOOL_CAPABILITIES = {
toggle_relay: { reads: [], writes: ["device:relay"] },
set_led: { reads: [], writes: ["device:led"] },
take_camera_snapshot: { reads: ["device:camera"], writes: [] },
…
}
// 资源槽：device:relay|led|camera|registry、tasks、automation:*、cron、
// medical、knowledge、user:memory、skills
```

- 同一 turn 内 `writes` 有交集 → **串行**；无交集 → 并行。
- `UNKNOWN_TOOL_POLICY = 'self'`：未登记的工具保守地独占执行。
- 禁止用 `argsStr.includes(工具名)` 这类启发式判依赖——同 turn 的 tool_call 天然无法互引结果，**只有资源冲突，没有数据依赖**。

实测 3 个独立工具并行后延迟从 12~15s 降到 4~6s。

### 8.6 上下文工程（唯一源 `lib/ai/context/`）

#### 8.6.1 预算

```
输出预留 = min(8192, max(1024, 窗口 × 25%))
安全边际 = max(256, 窗口 × 2%)
输入预算 = 窗口 − 输出预留 − 安全边际
```

**四档配额**（`ContextTier`）：

| 档 | 默认份额 | 内容 | 可截断 |
| --- | --- | --- | --- |
| `identity` | 0.30 | 身份、安全边界、能力声明 | **永不截断** |
| `pinned` | 0.25 | 用户画像、全局约束、当前设备快照 | 谨慎 |
| `working` | 0.20 | 本轮任务、工具 schema、技能清单 | 可 |
| `history` | 0.25 | 历史消息 | 可压缩 |

#### 8.6.2 Token 估算（`estimateContextTokens`）

| 字符类 | 权重 |
| --- | --- |
| CJK | 1.0 |
| 全角标点 | 0.8 |
| 拉丁/数字 | **0.28** |
| emoji | 1.5 |

- 必须先 `stripBinaryPayload()` 剥离 dataURL / base64，否则一张图能吃掉整个预算。
- 裸 base64 正则**必须同时要求含大小写**——否则 `'A'.repeat(50000)` 被算成 4 token（真实踩过）。
- 必须计入 `reasoning_content` / `reasoning`：它会回传上游，并按输入计费。
- 别用 `String.length` 当阈值。

#### 8.6.3 工具结果压缩（`compactToolResult`）

| 原始大小（字符） | 策略 | 行为 |
| --- | --- | --- |
| ≤ 1,500 | `none` | 原样 |
| ≤ 6,000 | `structure` | 保留结构，砍冗余 |
| ≤ 20,000 | `summary` | 摘要 + `KEY_FIELDS` 白名单保字段 |
| > 20,000 | `pointer` | 摘要 + `_pointer`（提示模型可用工具重新取） |

#### 8.6.4 历史压缩（`history-compressor.ts`）

| 参数 | 值 |
| --- | --- |
| 触发 | 估算 tokens > 输入预算 × **0.6** |
| 保留 | 最近 **6** 条原文 |
| 目标 | 压到 × **0.35** |
| 摘要 provider | 由 `getSummarizationConfig()` 取，**禁止硬编码**（硬编码会 401 静默失败） |
| 可见性 | 插入 `<CONTEXT_COMPRESSED>` 标记；失败必须下发 SSE `context_compress_failed` |

容量与压缩点由 `context-prefs.ts` + `/api/user/context-prefs` 管理（该接口必须 `force-dynamic` + `no-store`）。`windowTokens: null` 语义是「跟随模型」，改造时必须逐字保持等价。

### 8.7 HITL（挂起等人类）

#### 8.7.1 两种挂起

| 类型 | 常量 | 触发 | 回传接口 |
| --- | --- | --- | --- |
| `user-input` | 5 分钟 | LLM 输出 `<CHECKPOINT>` / `<CLARIFY>`，或调 `ask_user_question` | `POST /api/chat/respond` |
| `client-tool` | 2 分钟 | 工具需前端执行（如 `automation_canvas_apply`） | `POST /api/chat/client-tool-result` |

#### 8.7.2 传输层（`lib/ai/hitl/`）

```mermaid
flowchart LR
A[挂起请求] --> B{REDIS_URL / VALKEY_URL / REDIS_URI?}
B -->|有| C[RedisTransport]
B -->|无/连不上| D[InProcessTransport]
C --> E["Hash: berry:hitl:index:user-input<br/>berry:hitl:index:client-tool"]
C --> F["PubSub: berry:hitl:deliver"]
C --> G["心跳: berry:hitl:alive:{instanceId} TTL 20s / 刷新 6s"]
```

- 认领用 `HDEL` 的**返回值**做原子判定（谁删到谁处理）。
- 判活用 `MGET` 逐 key 判（ 不能用 `EXISTS`，批量语义不同）。
- 心跳过期 → 该实例的挂起条目视为死条目，清理。
- 绝不把 `Promise` resolver 放进跨实例结构（多实例下拿不到）。

#### 8.7.3 `/api/chat/respond` 匹配顺序

1. `userId + checkpointId`
2. `userId`
3. `checkpointId`
4. 都未命中 → **必须降级或返回 404**

**禁止假成功**。返回 `{ok:true}` 但没真正唤醒，前端会静默挂到 5 分钟超时，表现为「AI 卡死」。

#### 8.7.4 工具执行前确认

- 判据是**请求体里的 `toolConfirmation: true`**， 不是 `approvalMode`（按 `approvalMode` 判会让 Copilot 侧栏挂死 5 分钟）。
- 前端工具（`clientToolCalls`）同样要确认。
- 渲染位置：`ChatSenderInput` 的 `overlay` 插槽。

### 8.8 记忆体系

| 层 | 存储 | 内容 | 生命周期 |
| --- | --- | --- | --- |
| STM 短期 | 进程内 `ShortTermMemory`（`maxSize=10`，观察 20） | 最近动作/观察 | 单会话 |
| WM 工作 | 进程内（goal / subGoals / completedSteps / pendingActions） | 当前任务状态 | 单请求 |
| LTM 长期 | PG：`user_preferences` / `device_patterns` / `successful_strategies`；文件：`data/user-memory/{userId}.md` | 偏好、设备使用模式、成功策略 | 跨会话 |

- 抽取：`memory-extraction-service.ts` 用 LLM 抽取，**`confidence >= 0.6` 才写库**。
- 注入：`memory-prompt-enhancer.ts` 生成记忆摘要进 system prompt（`route.ts` 945-975 注入「用户记忆档案」）；`user-memory-file-service.ts` 维护 Markdown 档案，`MEMORY_KEY_TITLES` 18 个 key。
- 学习：`auto-learning-service.ts` 从对话与设备动作识别昼夜周期、天气响应、手动覆盖。

### 8.9 技能系统、Persona、Plan Mode

**技能（`lib/ai/skill-system/`）**

| 来源 | 位置 |
| --- | --- |
| 磁盘 | `.agents/skills/*/SKILL.md` |
| 数据库 | `store_skills` + `user_skill_installs` |
| 内置 | `core-identity` / `ui-tags` |

- `matchers.ts`：Keyword / Dependency 两类匹配。
- `skill-manager.ts#generatePromptContent()`：system prompt **只注入技能清单 + `load_skill` 指令**，正文按需加载（省 token）。
- `skill-router-v2.ts` 对外包装，`skill-router-cached.ts` 提供缓存。

**Persona**（`persona-system.ts`）：`expert`（种植专家）/ `friendly`（新手向导）/ `engineer`（技术工程师），各自有 system prompt 增量 + 决策偏好 + few-shot。

**Plan Mode**

1. `enter_plan_mode` → `planMode = true`；
2. 按 `PLAN_MODE_BLOCKED_TOOLS` 过滤可用工具（只读）；
3. 产出计划 → `exit_plan_mode` 提交；
4. 注入 `<PLAN>` 标记 → `break`，等用户审批；
5. 审批通过后按计划执行。

### 8.10 视觉诊断与摄像头快照

#### 8.10.1 诊断链路

```mermaid
flowchart LR
A[用户上传图片 / 抓帧] --> B[diagnose_plant_image]
B --> C[vision-gateway.diagnose]
C --> D[pickVisionModelIds<br/>enabled + supportsVision + priority]
D --> E[候选链：均分 max 20s, 60s/n]
E --> F[extractJsonObject / repairTruncatedJson]
F --> G[结论 + bbox + 相似病例]
G --> H[写 diagnosis_records]
```

- 单次最多 **3 张图**；单 dataURL ≤ **7M 字符**。
- 相似病例：`similar-cases.ts` 检索历史 `diagnosis_records`。
- 结果带 `_agent_action:'diagnosis'`，前端据此渲染诊断卡。

#### 8.10.2 抓帧（ffmpeg）参数必须按协议择一

`lib/mcp/builtin-device-control.ts#buildCameraInputArgs()`：

| 协议 | 参数 |
| --- | --- |
| RTSP | `-rtsp_transport tcp` |
| RTMP / HTTP | `-rw_timeout <ms>` |

无条件写死 `-rtsp_transport` 会让 ffmpeg 直接 `Option not found` 秒退 → AI 回「画面调不出来」，而**监控页完全正常**（监控页走的是另一个播放器链路）。契约锁 `camera-frame-args.test.ts`（7 项）。

#### 8.10.3 快照必须先到前端才算「发给用户」

历史事故：工具结果回灌给模型说「已转发」，但前端**零渲染**，用户什么都没看到。修复后是**五处同源**：

| # | 位置 | 职责 |
| --- | --- | --- |
| 1 | `lib/ai/camera-snapshot.ts` | `toCameraSnapshotMessage()`：快照 → 独立 assistant 消息（`image_url` + `snapshot.camera`），去重键 + query 截 40 字 |
| 2 | `app/ai-assistant/page.tsx` | `pendingCameraSnapshotsRef` + `__flushCameraSnapshots` |
| 3 | `app/ai-assistant/_components/camera-snapshot-card.tsx` | 卡片渲染 |
| 4 | `ai-assistant/_components/chat-message-renderer.tsx` | 按 `msg.snapshot` 分支 |
| 5 | `types.ts#Message.snapshot` | 类型契约 |

**卡片形态（2026-10-18 定版）**：裸画面（`rounded-2xl` + 淡 ring）+ **图下一行图注**；图注右侧只留「下载」一枚裸图标（`data-snapshot-action="download"` 不可改名）。 不要再加白色头部条（压在夜视画面上很难看）， 不要加「看大图」（画面本身可点开）。

**落库**：字段白名单唯一源是 `app/api/sessions/[id]/route.ts` 的 PUT。 客户端**禁止** `messages.map(m => ({role, content}))` 重建消息——会把 `snapshot` 等自定义字段静默削掉，刷新后图片消失。

验收：`_probe_camera_snapshot.mjs`（**36 项**，含「画面满宽贴合卡片 / 图注在画面下方 / 无白色头部条 / 画面本身可点开 / 无冗余『看大图』按钮」）、`_probe_camera_turn2.mjs`（第 2 轮 400 回归 + 落库保留）、`app/dev-chat-bubbles` 第 4 节（fixture 必须是**横图**）。

### 8.11 语音（纯 Omni）

| 项 | 值 |
| --- | --- |
| WS 端口 | **3002**（`server/ws-server.js`）；生产经 nginx `/ws/voice` |
| 上游 | `wss://dashscope.aliyuncs.com/api-ws/v1/realtime`，模型 `qwen3-omni-flash-realtime` |
| 音频 | PCM **16kHz** 单声道，二进制帧上下行 |
| VAD | Silero（`@ricky0123/vad-web` + onnxruntime-web），静音 **150ms** 断句 |
| 模式 | `/asr` 走 ASR 代理；其余走 Omni 实时 |
| 配置来源 | `/api/internal/voice/omni-config` |
| 额度 | 查 `/api/user/settings`，扣 `/api/voice/deduct-quota` |
| 打断 | 支持（前端 `use-voice-omni.ts` 控制） |

前端入口：`components/voice-powered-orb.tsx` / `realtime-voice-orb.tsx` / `components/ai/VoiceChatModal`（dynamic 载入）。桌面端 `sandbox:false` + COEP `credentialless` 就是为了 SharedArrayBuffer 跑 VAD。

### 8.12 交付物：报告 vs 代码块

| 场景 | 判定 | 渲染 |
| --- | --- | --- |
| 用户要「报告/简报/分析文档」 | `deliverable-classifier.ts` 判 `report`，模型输出 `[REPORT:]` | 报告卡（可导出 docx/pdf） |
| 用户要「代码/页面/组件」 | 判 `code` | **antd X `CodeHighlighter` 代码块本身**（默认头 + 下载 `Actions.Item`） |

硬规则：

1. **禁止**把 ```html 代码块整体替换成报告卡——等于删掉用户要的源码。
2. 别再引入 iframe 预览卡（老 `html-preview-card.tsx` 已删除）。
3. `chat-message-renderer.tsx#getNodeText` 必须同时读 `node.props.text`——`AnimationText` 没有 children，只读 children 会渲染出空白代码框。
4. `CodeHighlighter` 一旦传 `header` 就**完全接管**默认头 → 自定义头必须用同批 token 原样复刻（否则下载按钮/语言标签会丢）。
5. `x-markdown` 只把 `lang` 传给 `code` 组件，挂在 `pre` 上的 `EnhancedCodeBlock` 的 `props.lang` 恒 `undefined` → 用 `langFromChildren()` 兜底。
6. antd X `CodeHighlighter`（2.8.0 实测）**不做 token 级高亮**——待决策，勿擅自改。
7. `EnhancedCodeBlock` 里所有 hook 必须排在 Mermaid early return **之前**（否则 hook 顺序错乱，tsc 抓不到）。

### 8.13 AI 执行链的可视化约定

- 视觉唯一源：`components/ui/tool-calls-section.tsx`；`agent-thought-chain.tsx` 只做 `AgentStep[] → ToolCallEntry[]` 适配（该契约被 `page.tsx`、copilot、`landing-v4` **三处**消费，改字段前先全库搜）。
- 分类关键词表**顺序敏感**（`research`/`history` 必须排在 `search` 之前；不收 `query` 这类泛词）。
- 展开态必须**纯推导**， `useEffect + setState`（eslint error 级）。
- 本轮结束自动折叠：`autoCollapseWhen` + **1200ms** 延迟；折叠判定靠内容快照 key 匹配；用户手动点过就不再自动折叠；落地页演示台显式 `autoCollapse={false}`。
- 图标一律**裸字形**， 不画 `rounded-lg border bg-*` 卡片；叠压用 `-space-x-1`。验收 `app/dev-tool-chain` + `_probe_tool_chain.cjs`。

---

## 9. 前端架构与设计系统

### 9.1 根布局与 Provider 链

```text
ThemeProvider(next-themes: attribute=class, defaultTheme=system, disableTransitionOnChange)
└── ElderFriendlyProvider（长辈模式）
└── WeatherProvider
└── DeviceProvider
└── LazyProviders（dynamic ssr:false：Lenis、Toaster 等）
└── PageTransition（对 /、/docs、/apply、-ios、/profile 直通）
└── DesktopWindowChromeProvider（桌面端自绘标题栏）
```

`app/layout.tsx`（188 行）额外做：
- 服务端 IP 封禁校验 + `PAGE_VIEW` 访问日志落库；
- body 前注入 `MATERIAL_PREF_BOOT` + `MATERIAL_CSS`（材质系统，源 `components/device/material-css.ts`）；
- `NextTopLoader`（路由进度条）、`DesktopNotificationBridge`。

### 9.2 路由表（77 个 page）

| 域 | 路由 |
| --- | --- |
| 入口 | `/`（landing-v4）、`/landing`（旧版）、`/login`、`/register`、`/forgot-password` |
| 核心 | `/dashboard`、`/device-control`、`/monitor`、`/ai-assistant`、`/automation`、`/automation/editor`、`/activity`、`/chat` |
| 知识与内容 | `/kb-store`、`/docs`、`/docs/api`、`/docs/architecture`、`/blog`、`/blog/[slug]`、`/changelog`、`/whats-new`、`/help`、`/announcements/*` |
| 商业 | `/plans`、`/subscription`、`/apply`、`/model-store`、`/mcp-store`、`/my-mcp` |
| 账号 | `/profile`、`/access-denied`、`/too-many-requests` |
| 管理 | `/admin`、`/super-secure-admin`、`/super-secure-admin-entry` |
| 其它 | `/maintenance`、`/desktop-setup`、`/portfolio`、`/promo-video`、`/orb-test`、`/privacy`、`/terms` |
| 移动端 `(mobile)` | `/home`、`/dashboard-ios`、`/ai-assistant-ios`、`/device-control-ios`、`/monitor-ios`、`/profile-ios`、`/plots`、`/plots/[id]`、`/farm-plans`、`/farm-plans/[id]`、`/devices`、`/devices/[id]`、`/scan` |
| 调试台 `dev-*` | 22 个：`dev-chat-bubbles`、`dev-code-artifact`、`dev-tool-chain`、`dev-control-confirm`、`dev-copilot`、`dev-settings-dark`、`dev-provider-logo`、`dev-vlm-probe`、`dev-window-chrome` … |

**`app/dev-*` 的正确用法**：这些是「视觉验收台」——直接挂真实组件 + 暴露 `window.__*Probe` 给 Playwright 量测，无登录门槛。改 UI 后先在这里验，再进真实页面。生产环境建议由 nginx 屏蔽 `/dev-` 前缀。

`(mobile)` 分组布局：`MobileBottomNav` 4 个 tab（首页 / AI / 扫一扫 / 我的），`-ios` 后缀页隐藏 tab。

### 9.3 设计 token（唯一源 `app/globals.css`）

1848 行，Tailwind v4 **CSS-first**（没有 `tailwind.config`）：

```css
@import "tailwindcss";
@import "tw-animate-css";
@custom-variant dark (&:is(.dark *));
@theme inline { /* 把 --color-* / --radius-* 映射成 Tailwind 键 */ }
```

**BR 统一 token（全站真相源）**

| 组 | 取值 |
| --- | --- |
| 灰阶 `--br-50…950` | `#FAFAFA` → `#09090B` |
| 画布 `--br-canvas` | 亮 `#FAFAFA` / 暗 `#08080A` |
| 表面 `--br-surface…4` | 卡片/浮层分层 |
| 文本 `--br-text-1/2/3` | 主/次/弱 |
| 品牌 `--br-brand` | 亮 `#059669` / 暗 `#34D399` |
| 语义 | success / warning / danger / info 各 3 档 |
| 圆角 | `--br-r-control` 8 / `--br-r-card` 12 / `--br-r-shell` 16 |
| 阴影 | `--br-shadow-sm/md/lg/inner` |
| 容器 | `--br-container` 1400px / `--br-narrow` 800px |

**圆角与间距体系（设计规范）**：圆角 4 / 8 / **16** / 20 / 32；间距基数 **8vp**；字阶 **11 / 12 / 14 / 16 / 18 / 20**。

**DC 局部 token**（`.dc-scope`，仅设备控制台）：`--dc-r-xs/inner/card/shell/btn/modal` = 4/8/12/16/20/32；`--dc-fs-title/body-l/body/body-s/caption` = 24/18/16/14/12；`--dc-sp-1…8` = 4/8/12/16/24/32。

**字体**：`--font-ui` / `--font-ui-strong` = HarmonyOS Sans（400–900 可变）；legacy 落地页 `--font-legacy` 回退思源 + 阿里妈妈。antd v6 的字体唯一源是 `--ant-font-family`（配 `:root [class*="css-var-"]` 兜底，特异性必须 (0,2,0)）—— 组件里别再硬编码 `monospace`。

**语义色一对一**：`warn` = 琥珀、`danger` = 红、`ok` = 翠绿。 两个语义共用一档色（曾出现 warn/danger 都取橙，用户完全分不清）。天气色相唯一源 `components/dashboard/ios-style/weather-sky.ts`。

### 9.4 图标

```tsx
import { Icon } from "@/components/icon"
<Icon name="temperature" size={16} />
```

- 248 个具名图标，全部映射 **HarmonyOS Symbol**（数据在 `harmonyos-symbol-data.ts`）。
- **没有 lucide 兜底**：名字写错就渲染占位框——改图标名务必全局搜。
- wrapper 强制 `verticalAlign:'middle'` 修基线对齐；`strokeWidth` 属性**无效**（Symbol 是填充字形）。
- 不用 emoji 当图标。

### 9.5 组件分层

| 层 | 位置 | 约束 |
| --- | --- | --- |
| 原子 | `components/ui/`（51 个） | shadcn `new-york` / neutral；`button.tsx` 用 cva，6 variant × 8 size |
| 业务通用 | `components/{ai,chat,device,charts,admin,kb,mcp,…}` | 一个文件只服务一个域 |
| 页面级 | `app/*/…client.tsx` | 大组件，必须 `"use client"` |
| 图表 | `components/charts/` 三件套 | 禁止就地手写 |

### 9.6 主题、滚动、动效

**主题**：`next-themes`，`attribute="class"`，`defaultTheme="system"`，`enableSystem`，`disableTransitionOnChange`。切换按钮 `components/mode-toggle.tsx`。

**平滑滚动**：`components/smooth-scroll.tsx`（`@studio-freight/react-lenis`，`lerp 0.15 / duration 1.2 / smoothWheel`），在 `LazyProviders` 里 `dynamic(ssr:false)` 全局包裹。

**滚轮仲裁**：`components/wheel-scroll-guard.tsx` —— window **捕获阶段**判断指针下最近可滚祖先，能滚就 `stopPropagation()` 交还原生滚动。放行 `input`、antd 数值框、`ctrlKey`（缩放）。新增 `overflow-y-auto` 不再必须标 `data-lenis-prevent`。

**滚动条**：全站唯一源是 `globals.css` 的 Unified Scrollbar 段，**只在滚动时出现**。 别再写 `::-webkit-scrollbar`， 别做「悬停常驻」。

**framer-motion 三条约束**

1. `animate` 里的 `opacity` 是**内联 style**，会静默盖掉 `opacity-60` 这类类名 → 要弱化必须写在 `animate` 里。
2. `animate={{ width: "auto" }}` 在子元素也做宽度动画时会测到 **0** → 宽度交给 `inline-flex` 内容驱动。
3. 无统一 `LazyMotion` 封装（~170 文件直接 import），靠 `optimizePackageImports` 减包体；`useReducedMotion` 只在少数组件用。

### 9.7 布局约定

- **对话区宽度三处同源 = 1120**：`chat-bubble-list` 消息列 / `chat-sender-input` 展开态卡 / `matechat-home` 空态上区（1000）。改一处必须同步另两处，验收 `_probe_chat_width.mjs`。
- **AI 文本区宽度唯一瓶颈**是 antd X `Bubble.List` 内置 15% 内衬 → 已用 `!important` 清零**仅 AI 侧（start）**。用户侧（end）留白是设计语言， 别一起清。百分比基准是包含块 **content-box（1072）**。
- **顶栏零余量**：1440 视口下三段是 294 / 771 / 294。加东西前先算 `(视口 − 80 − 771) / 2`；菜单显隐用**容器查询**，不用媒体查询。
- **不用 PageHeader 的自绘布局页**（AI 助手等）必须自己调 `useDesktopHeaderHost()`，否则桌面端标题栏拖拽区会错位。
- 卡片类浮层**内容驱动高度**；「小圆点 + 文字」同一行**禁止 `truncate`**（圆点会被压扁）。验无溢出要扫三层：卡片 / 后代 / 文本节点。
- antd Modal 的 `styles.body` 加不了属性 → `padding:0` + 自建滚动层；**操作按钮绝不放进滚动内容**（滚动后按钮跑掉）。
- 全局 antd 弹窗宿主必须自带 `<App>` + 同款 `ConfigProvider`，否则 `modal.confirm is not a function`。

---

## 10. API 参考

### 10.1 通用约定

| 项 | 约定 |
| --- | --- |
| 前缀 | `/api/*` |
| 认证 | Cookie `auth`（JWT HS256）；内部接口用 `x-internal-secret` |
| 返回 | JSON；错误统一 `{ error: string }`（部分带 `code`） |
| 限流 | 见 §6.4；超限 `429` |
| 强动态 | 与用户态/DB 相关的接口应声明 `export const dynamic = "force-dynamic"`（当前 17 个） |
| 运行时 | 数据层接口应声明 `export const runtime = "nodejs"`（当前 69/198，未声明的走默认） |
| 长任务 | `maxDuration` 仅 6 处（30/45/120/300s） |
| 流 | SSE 见 §8.3 |

**新接口规范**：凡读写 DB 的 Route Handler，**必须** `runtime = "nodejs"`；凡依赖 cookie/session 的，**必须** `dynamic = "force-dynamic"`，否则 Next 可能静态化导致「线上 401 但本地正常」。

### 10.2 分域端点（198 个，摘主要）

**认证 `app/api/auth/`（18）**

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/auth/register` | 注册（3/min） |
| POST | `/api/auth/login` | 登录（5/min，Cap PoW 校验） |
| POST | `/api/auth/logout` | 清 cookie |
| GET | `/api/auth/me` | 当前用户（免 1/6s 限制） |
| POST | `/api/auth/send-verification` | 发邮箱验证码 |
| POST | `/api/auth/verify-email` | 校验验证码 |
| POST | `/api/auth/forgot-password` / `reset-password` | 找回 |
| GET | `/api/auth/{wechat,qq,alipay,wework}/login` + `callback` | OAuth |
| POST | `/api/auth/ticket/check` | 一次性票据换 token |

**AI `app/api/ai/`（22）+ `app/api/chat/`（5）**

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/chat` | Agent 主入口（SSE） |
| POST | `/api/chat/respond` | HITL 用户输入回传 |
| POST | `/api/chat/client-tool-result` | 前端工具结果回传（幂等，未命中返回 `not_pending`） |
| POST | `/api/chat/upload` | 附件上传 |
| POST | `/api/chat/typing` | 输入中状态 |
| GET/POST | `/api/ai/cron`、`POST /api/ai/cron/execute` | AI 定时任务 |
| POST | `/api/ai/device-control` | 非对话式设备指令 |
| GET | `/api/ai/daily-briefing` | 每日简报 |
| POST | `/api/vision/diagnose` | 视觉诊断（也走 `/api/vlm/*`） |
| GET/PUT | `/api/user/context-prefs` | 上下文容量/压缩点 |
| GET/PUT | `/api/user/memory` | 用户记忆档案 |

**设备与 IoT**

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET/POST | `/api/devices` | 注册表 CRUD |
| GET | `/api/device-history` | 历史读数（sparkline 用） |
| GET | `/api/device-logs` | 操作日志 |
| POST | `/api/mqtt/control` | 设备控制（继电器/LED/步进） |
| GET | `/api/mqtt/stream` | SSE 实时读数 |
| POST | `/api/mqtt/simulate` | 模拟上报 |
| POST | `/api/monitor/snapshot` | 监控抓帧 |

**知识与协作 `app/api/knowledge/`（33）**：`items` / `collections` / `tags` / `search` / `versions` / `permissions` / `market` / `activity`(SSE) / `onlyoffice` / `upload` / `stats`。协作者走 `collaborators`、`invitations`。

**管理 `app/api/admin/`（34）**：`users`、`banned-ips`、`access-logs`、`login-logs`、`ai-providers`、`ai-models`、`desktop-licenses`、`changelog`、`docs`、`settings/*`（限流/图标/摄像头/语音 Key）、`stats`。

**其它**：`organizations`(6)、`internal`(6：`security/check|ban|config`、`maintenance/check`、`voice/omni-config`)、`automation`(4)、`scheduler`(`/init`、`/tasks`)、`sessions`（消息落库）、`skills`(3)、`mcp`(3)、`friends`(3)、`groups`(4)、`reports`、`weather`、`branding`、`license`、`health`。

### 10.3 常见状态码

| 码 | 场景 | 客户端应对 |
| --- | --- | --- |
| 200 | 成功（`/api/health` 的 `degraded` 也是 200） | — |
| 302 | 未登录访问受限页 | 跳 `/login?from=` |
| 400 | 请求体非法 / 上游拒绝（如 assistant 图片未降级） | 按 `error` 文案提示，勿盲目重试 |
| 401 | 未登录 / token 失效 | 清理本地态 → 登录 |
| 403 | 角色不足 / 非组织成员 | 提示无权限 |
| 404 | 资源不存在；`/admin` 伪装；`respond` 未命中挂起点 | 别当 500 处理 |
| 409 | 并发冲突（重复提交） | 幂等重放 |
| 429 | 限流 | 退避；页面跳 `/too-many-requests` |
| 500 | 服务端异常（DB 断连最常见） | 看 `docker compose logs web` |
| 503 | `/api/health` 判定 `down`（DB 不可用） | 摘流量 / 重启 |

---

## 11. 构建、部署与运维

### 11.1 本机开发

```bash
# 0) 前置：Node 20+ / pnpm 10.30.1 / PostgreSQL 14+
pnpm install

# 1) 环境变量
cp .env.example .env.local # 至少填 JWT_SECRET / DATABASE_URL / DASHSCOPE_API_KEY

# 2) 起库（二选一）
net start postgresql-x64-18 # 本机服务（管理员 CMD，推荐）
docker compose up -d db # 或用容器

# 3) 起应用
pnpm dev # Next 3000（Turbopack）
pnpm dev:ws # 另开一个终端：语音 WS 3002

# 4) 验证
curl --noproxy '*' http://127.0.0.1:3000/api/health
```

**本机开发的三条环境事实**（踩过多次，先看这里再怀疑代码）：

| 现象 | 真因 | 处理 |
| --- | --- | --- |
| dev 日志刷 `Error creating table: `（message 为空） + `Scheduler instrumentation skipped due to DB init failure` | PostgreSQL 服务没起 | 起服务；用 `_probe_db.cjs` 判定 |
| DB 恢复后 `/api/changelog` 仍 500，但直连跑同一函数正常 | dev 的 pg `Pool` 已被毒化（坏连接留在池里） | **重启 dev server**，重启后 instrumentation 才会重新挂 cron |
| 改了类名但样式不生效 | 本机火绒拖慢 IO → Tailwind 增量 watcher 漏文件 | 改一行 `app/globals.css` 触发全量重扫（不用重启） |

另外两条硬约束：
- `127.0.0.1:3000` 常被用户的常驻进程占着 `.next/dev/lock` → **绝不杀进程**，先 `netstat` 认身份；需要并行时用 `NEXT_DIST_DIR=.next/probe`（distDir 必须在 `/.next/` 之下）。
- 临时调试路由只能建在 `app/dev-xxx`， 不要往 `app/api` 塞临时文件。

### 11.2 生产构建（Dockerfile 4 stage）

| stage | 基础镜像 | 关键动作 |
| --- | --- | --- |
| `base` | `node:22-alpine` | corepack 启用 **pnpm 10.30.1** |
| `deps` | base + python3/make/g++/git | `COPY patches`（x-markdown 补丁必需）→ `pnpm install`（阿里镜像 + 5min 超时 + 关 sslVerify） |
| `builder` | deps + 全量源码 | `NODE_OPTIONS=--max-old-space-size=3072`、`GENERATE_SOURCEMAP=false`、`pnpm build`（Turbopack） |
| `runner` | base + tzdata/su-exec/ffmpeg/wget | 非 root 用户 `nextjs`(1001)；拷 `.next`/`node_modules`/`server`/`ws-server`/`.agents`/`data`/`docs`；`EXPOSE 3000 3002`；`HEALTHCHECK` 探 `/api/health`；`CMD entrypoint.sh` |

**为什么必须 4GB 内存**：`--max-old-space-size=3072` 之外还有 Turbopack 自身开销，2GB 机器 100% OOM。

### 11.3 Compose 拓扑（7 服务）

| 服务 | 镜像 | 端口 | 职责 | 备注 |
| --- | --- | --- | --- | --- |
| `nginx` | nginx:alpine | 80 / 443 | TLS、反代、静态缓存、维护页 | 依赖 web |
| `web` | 本地构建 | expose 3000 / 3002 | Next + 语音 WS | 依赖 db、valkey |
| `db` | postgres:16-alpine | 内网 5432 | 主库 | volume `pgdata` |
| `yjs-ws` | 本地构建，`node ws-server/yjs-server.js` | 内网 1234 | 文档协同 | 独立进程 |
| `onlyoffice` | onlyoffice/documentserver:8.2 | 8080→80 | 在线 Office | JWT + WOPI，挂 `public/uploads/docs:ro` |
| `cap` | tiago2/cap:latest | **127.0.0.1:3000** | PoW 人机验证 | 只绑本机，SSH 隧道管后台 |
| `valkey` | valkey/valkey:9-alpine | 内网 6379 | Cap 存储 + HITL（db 1） | `noeviction` |

**关键设计**：`web` 对 `valkey` **刻意不写 `condition: service_healthy`** —— 缓存没就绪不该阻塞站点启动，`lib/ai/hitl` 连不上会自动退化为进程内实现。

### 11.4 Nginx 要点（`nginx/nginx.conf` 458 行）

| location | 配置要点 |
| --- | --- |
| `upstream` | `web:3000` / `web:3002`，配 `resolver 127.0.0.11` 动态解析（容器 IP 会变） |
| `/api/` | `proxy_read_timeout 600s`、`proxy_request_buffering off`（大文件上传） |
| `/api/mqtt/stream`、`/api/knowledge/activity` | `proxy_buffering off` + `proxy_cache off` + `chunked_transfer_encoding off` + 86400s |
| `/ws/voice`、`/ws/yjs` | Upgrade 头 + 86400s |
| `/onlyoffice/` | `client_max_body_size 100m`、120s |
| `/cap/` | 30s |
| 静态 | 1 年 `immutable` |
| 真实 IP | Cloudflare `real_ip` 段 |

### 11.5 首次上线 / 更新流程

```bash
# 首次
cp .env.example .env && vi .env # JWT_SECRET / INTERNAL_API_SECRET 必填
# 证书：nginx.conf 只认这两个文件名（见 §11.4 的坑）
# nginx/certs/stravision.site_bundle.crt
# nginx/certs/stravision.site.key
./deploy.sh # 校验必填变量 → 清缓存 → build → up -d
curl -s --noproxy '*' http://localhost/api/health

# 日常更新
git pull
docker compose build web && docker compose up -d web
docker compose logs -f --tail=200 web
```

`deploy.sh` 会校验必填变量（`JWT_SECRET`、`DASHSCOPE_API_KEY`、`MQTT_*`、`WEATHER_API_KEY` 等），缺一个就退出。

**证书文件名不一致的坑**：`deploy.sh`（L67-L73）在缺证书时会用 openssl 自签，但生成的文件名是 `stravision.cheesestrawberry.top_bundle.crt` / `.key`，而 `nginx/nginx.conf`（L226-L227）引用的是 `stravision.site_bundle.crt` / `stravision.site.key`。直接跑脚本 → nginx 起不来（找不到证书）。**要么改 nginx.conf 的文件名，要么把自签产物重命名**，二者必须对齐。

### 11.6 健康检查与探活

`GET /api/health`：

```json
{ "status": "ok|degraded|down",
"checks": {
"database": { "status": "ok", "latencyMs": 3 },
"mqtt": { "status": "down" }
},
"timestamp": 1760000000000 }
```

| 判定 | HTTP | 含义 |
| --- | --- | --- |
| `ok` | 200 | DB + MQTT 都正常 |
| `degraded` | **200** | DB 正常但 MQTT 断了（仍接流量，页面会显示设备离线） |
| `down` | **503** | DB 不可用 → 负载均衡应摘除 |

### 11.7 备份 / 回滚

```bash
# 备份
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > backup-$(date +%F).sql.gz

# 回滚镜像（保留上一个 tag 是纪律）
docker compose down web && docker tag stravision-web:prev stravision-web:latest
docker compose up -d web
```

回滚注意：**新版本可能已加列**（`ADD COLUMN IF NOT EXISTS` 只增不减），旧版本代码读到多余列不会报错，所以「代码回滚不回滚 DB」是安全的。

---

## 12. 桌面端（Electron）

### 12.1 形态

| 项 | 值 |
| --- | --- |
| Electron | 44.3.0；builder 26 |
| 主窗口 | 1440×940，min **1280×700**，`frame:false`（自绘标题栏） |
| 安全 | `contextIsolation:true`、`nodeIntegration:false`、`sandbox:false`（Silero VAD 需 SharedArrayBuffer） |
| 外链 | 一律 `shell.openExternal` |
| 权限 | 放行 media / clipboard / notifications / fullscreen |

### 12.2 启动 9 步（`desktop/main.js`，1410 行）

```mermaid
flowchart TB
A[1. require spawn-asar-fix.apply] --> B[2. 校验 standalone 产物]
B --> C[3. links.apply 可写映射]
C --> D[4. settings.read + secrets.load]
D --> E[5. license.ensureLicensed<br/>失败直接 quit]
E --> F[6. embedded-postgres 5433 + pg-guard]
F --> G[7. 内置 MQTT aedes 11883<br/>可切 remote]
G --> H[8. servers.startAll<br/>Next 3000 / voice 3002 / Yjs]
H --> I[9. 健康检查 /api/health 180s]
I --> J[首启：/desktop-setup 向导 940×660]
```

### 12.3 授权（Ed25519 租约）

| 项 | 说明 |
| --- | --- |
| 绑定 | 设备指纹 + 授权码 |
| 签名 | Ed25519，**客户端内置公钥验签**（`desktop/lib/license-public-key.ts`） |
| 租约 | 7 天离线宽限；每 **6h** 复检吊销（`publish-revocation.mjs` 发布） |
| 存储 | `<userData>/server-data/desktop-license.json`，权限 `0600` |
| 生成 | `pnpm desktop:license:keys` → `license:batch` / `license:remote`；控制台 `pnpm license:ui` |

### 12.4 打包链路

```bash
pnpm desktop:build # build-next.mjs → prepare-standalone.mjs(929行，白名单重建+凭据扫描) → fetch-ffmpeg.mjs
pnpm desktop:pack:win # + pack.mjs(480行, --projectDir desktop, electron-builder.yml 167行)
```

三个易错点：

1. `appDir` 必须是 **`desktop/`**，不是仓库根。
2. `pg` 等 `serverExternalPackages` 会被 Turbopack 外部化到 `.next/node_modules/<name>-<hash>/`，**整层拷进 standalone 会变空**——必须按白名单重建。
3. `spawn/execFile` 必须显式 `stdio:['ignore'|'inherit','pipe','pipe']`，默认 `stdin:pipe` 在 Windows 会 EBUSY。

### 12.5 自动更新

`electron-updater`，generic 源 `https://stravision.site/downloads/desktop/`；`autoDownload`；启动后 20s 首查 + 每 6h 轮询。发布用 `pnpm desktop:upload`。

---

## 13. 测试与质量

### 13.1 单元 / 契约测试（vitest）

```bash
pnpm test # vitest --run
pnpm test:watch
```

`vitest.config.ts`：`jsdom` + `globals` + `@` alias + `vitest.setup.ts`（jest-dom）。

**29 个测试文件**，重点契约（改动相关代码必跑）：

| 文件 | 锁住什么 |
| --- | --- |
| `lib/ai/agent-budget.test.ts` | 预算常量 / 风险登记派生 / 管线「必须大于」契约（24 项） |
| `lib/ai/context/__tests__/context.test.ts` | token 估算、预算分配、四档截断、压缩触发（370 行，含属性测试） |
| `app/api/chat/route.test.ts` | 裸 JSON 过滤、事件帧（`fast-check` 属性测试） |
| `lib/ai/hitl/hitl.test.ts` | 挂起/认领/超时/跨实例 |
| `lib/ai/tool-confirmation.test.ts` | 确认判据（`toolConfirmation` 而非 `approvalMode`） |
| `lib/ai/parallel-tool-executor.test.ts` | 资源槽冲突 → 串并行 |
| `lib/mcp/__tests__/camera-frame-args.test.ts` | ffmpeg 参数按协议择一（7 项） |
| `lib/ai/provider-body-adapter*` | 图片降级只降 assistant（8 项） |

### 13.2 类型检查

```bash
npx tsc --noEmit
```

**基线是 199 个错误**（含生成物；dev 在跑时总数会漂）。 不要拿「总数」当基线，只认「**我改的文件是否 0 错误**」。`next.config.ts` 里 `typescript.ignoreBuildErrors: true`，构建不会因类型错中断——所以类型问题必须靠这一步发现。

### 13.3 探针（真实浏览器验收）

根目录 **145 个 `_probe_*`**（`.mjs` / `.cjs`），用 `playwright-core@1.63` 驱动本机 Chrome。

**标准姿势**：

```js
// 1) 拿登录态
// node _dc_prep_auth.cjs → 产出 _verify_token.txt
const token = fs.readFileSync("_verify_token.txt", "utf8").trim()
ctx = await browser.newContext()
await ctx.addCookies([{ name: "auth", value: token, domain: "127.0.0.1", path: "/" }])
```

| 规则 | 原因 |
| --- | --- |
| 自拉 Chrome 必须 `--proxy-server=direct://` | 本机 Clash 会劫持 `127.0.0.1` |
| `curl` 探本地端口必须 `--noproxy '*'` | 同上 |
| 等待条件写「目标元素出现 **或** 空态文案出现」 | 等 loading 消失会假死 |
| 颜色断言不能用 rgb 正则 | Tailwind v4 的 `getComputedStyle` 返回 `lab()/oklab()` |
| 端到端断言前**先新建对话** | 历史里的旧失败消息会让整页 `innerText` 断言假阳性 |
| 组件改动**至少真实渲染一次**才算验过 | early return 后的 hook 错位，tsc 和直跑都抓不到 |

代表性探针：`_probe_icon_align.mjs`（图标视觉中心 − 文字光学中心 delta）、`_probe_hydration.mjs`（抓 hydration 报错）、`_probe_camera_delivery.mjs`（SSE 三级诊断 queued→delivered→DOM）、`_probe_dashboard.mjs`（布局迁移 + 热力图槽位）。

### 13.4 Lint

```bash
pnpm lint # eslint 9 flat config: next/core-web-vitals + typescript
```

忽略 `.next/**`、`scripts/**`、`stravision-app/**`、`public/draco/**`。

---

## 14. 运维排障手册

### 14.1 故障速查表

| 症状 | 最可能原因 | 处置 |
| --- | --- | --- |
| 页面能开，但设备数据不更新 | MQTT 断连（health `degraded`） | 查 `checks.mqtt`；核对 `MQTT_HOST/PORT/TLS`；看 Broker 侧 ACL |
| 整站 500 / `/api/health` 503 | DB 不可用 / 连接池耗尽 | `docker compose logs db`；算连接数（20×副本）；重启 web 清池 |
| 定时任务全不执行 | instrumentation 在 DB 失败时直接 return | 先修 DB，再**重启 web** |
| AI 回答卡住不动，最后一次性刷出 | Nginx 对 SSE 开了 buffering | 检查 location 的 `proxy_buffering off` |
| AI 发第二句话就 400 | assistant 里的图片没降级 | 确认 `downgradeAssistantImages` 在 `hasImageContent` 之前调用 |
| AI 说「画面调不出来」，但监控页正常 | ffmpeg 参数写死 `-rtsp_transport`（RTMP/HTTP 源） | 用 `buildCameraInputArgs` 按协议择一 |
| 抓帧成功但用户看不到图 | 前端没渲染快照（只回灌给模型） | 查 §8.10.3 五处同源；确认消息带 `snapshot` 标记 |
| 刷新后快照消失 | 落库时被 `.map(m => ({role, content}))` 削字段 | 用 `sessions/[id]` PUT 的字段白名单 |
| 工具确认弹窗不出来，5 分钟后超时 | 判据写成了 `approvalMode` | 改回请求体 `toolConfirmation` |
| 用户提交表单后 AI 没反应 | `/api/chat/respond` 假成功 | 未命中挂起点必须降级或 404 |
| 上下文压缩后 AI「失忆」且无提示 | 摘要 provider 硬编码 → 401 静默 | 用 `getSummarizationConfig()`；失败下发 `context_compress_failed` |
| 暗色下某些色块刺眼/看不清 | 用了固定 hex 而非 `--br-*` token | 换 token；验 `lab()` 值 |
| 新增组件类名全不生效 | Tailwind 增量 watcher 漏文件 | 改一行 `globals.css` 重扫 |
| 桌面端打不开 `spawn EBUSY` | `stdio` 默认 `stdin:pipe` | 显式 `stdio:['ignore','pipe','pipe']` |
| 桌面端打包后页面空白 | external 包目录被 Turbopack hash 化后整层拷贝为空 | 按 `prepare-standalone.mjs` 白名单重建 |

### 14.2 常用命令

```bash
docker compose ps
docker compose logs -f --tail=200 web
docker compose exec web node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>r.text()).then(console.log)"
docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select count(*) from sensor_readings"
docker compose restart web
```

### 14.3 日志位置

| 日志 | 位置 |
| --- | --- |
| 容器 stdout | `docker compose logs`（json-file，10MB × 3 轮转） |
| 访问日志 | `access_logs` 表 |
| 登录审计 | `login_logs` 表 |
| Agent 执行 | `agent_execution_logs` 表 |
| 设备操作 | `device_logs` 表 |
| 桌面端 | `<userData>/logs/` |

---

## 15. 开发规范（改代码前必读）

### 15.1 「唯一源」清单

改这些概念时，**只能改这里**，别处重复实现一律视为缺陷：

| 概念 | 唯一源 |
| --- | --- |
| 图标 | `components/icon.tsx` |
| 主题 | `next-themes`（+ `globals.css` token） |
| 图表 | `components/charts/` |
| 滚轮仲裁 | `components/wheel-scroll-guard.tsx` |
| 滚动条 | `app/globals.css` Unified Scrollbar 段 |
| Agent 预算/阈值 | `lib/ai/agent-budget.ts` |
| 工具风险 | `TOOL_RISK_REGISTRY`（派生三集合） |
| 工具并行 | `lib/ai/tool-capabilities.ts` |
| 上游字段白名单 | `provider-body-adapter.ts#toUpstreamMessage` |
| Token 估算 | `lib/ai/context/token-estimator.ts` |
| 上下文容量 | `context-prefs.ts` + `/api/user/context-prefs` |
| HITL 传输 | `lib/ai/hitl/` |
| 交付物判定 | `lib/ai/deliverable-classifier.ts` |
| 工具链视觉 | `components/ui/tool-calls-section.tsx` |
| 设计 token | `app/globals.css`（`--br-*`） |
| 天气色相 | `components/dashboard/ios-style/weather-sky.ts` |
| 设备硬件 ID | `lib/constants.ts` |
| 快照渲染判据 | `Message.snapshot` |
| 落库字段白名单 | `app/api/sessions/[id]/route.ts` PUT |
| MCP 工具定义 | `lib/mcp/mcp-tool-definitions.ts` |

### 15.2 新增一个 AI 工具的清单（同步 5 处）

1. `lib/mcp/mcp-tool-definitions.ts` — 加 schema 定义；
2. `lib/mcp/builtin-*.ts` — 实现（或外部 MCP 服务）；
3. `lib/mcp/mcp-tool-executor.ts` — 分发分支；
4. `lib/ai/agent-budget.ts#TOOL_RISK_REGISTRY` — 登记风险（派生三集合自动生效）；
5. `lib/ai/tool-capabilities.ts#TOOL_CAPABILITIES` — 声明读写资源槽。

漏第 4 或第 5 步：前者被 `getAgentBudgetViolations()` 断言失败，后者会让并行调度保守独占（性能退化）。

### 15.3 禁止事项（硬性）

| | 原因 |
| --- | --- |
| 就地写 timeout / iteration 字面量 | 破坏预算契约，AI 行为不可预测 |
| 手写 `NO_RETRY_TOOLS` 等三集合 | 与注册表脱钩，后续必然漂移 |
| 用 `argsStr.includes(工具名)` 判依赖 | 假依赖导致串行化 |
| 把 Promise resolver 放进跨实例结构 | 多实例下拿不到 |
| `response.text()` 读 SSE | 挂死到流结束 |
| 把 ```html 代码块替换成报告卡 | 删掉用户要的源码 |
| 在 `role.ai` 加 avatar/header 槽 | 用户已明确否决（2026-10-16 加过头像并完整回退） |
| 回退 SVG 化身 | 用户原话「svg 很丑」 |
| VideoGen prompt 提「嘴」 | 必出黑嘴洞（实测 3 版全崩） |
| 引入 Ultralytics YOLO | AGPL 传染 |
| 写 `::-webkit-scrollbar` | 与统一滚动条冲突 |
| 往 `/settings` 加页面 | 该页已删除，账号资料走 `openSettings("profile")` |
| 用 Python `open(p,'w')` 覆写含 emoji 的源码 | 编码损坏 |
| 杀 `127.0.0.1:3000` 上的进程 | 可能是用户的常驻 dev server |

### 15.4 Git / 发布

- 分支：功能分支 → 合并 `main`；提交信息用祈使句 + 范围前缀（`fix(chat):` / `feat(kb):` / `docs(manual):`）。
- 桌面端发布后 `git ls-remote` 核对 HEAD 与远端一致。
- `changelog` 页读 `changelog_entries` 表；发版同时写入条目。

---

## 16. 已知技术债与风险（供排期参考）

| # | 项 | 影响 | 建议 |
| --- | --- | --- | --- |
| 1 | `app/api/chat/route.ts` 4,025 行、`ai-assistant/page.tsx` 7,495 行 | 改动风险高、review 困难 | 按「上下文装配 / 工具调度 / SSE 编码」拆模块，但**必须先补契约测试** |
| 2 | 企业微信 Webhook 硬编码在 `notification-service.ts` | 泄露即可被滥用 | 移到 `system_settings` 加密存储 |
| 3 | 注册接口未校验 Cap | 可被脚本刷号 | 复用登录的 `verifyCapToken` |
| 4 | `startAICronExecutor()` 未被 instrumentation 启动 | AI 定时任务实际不自动跑 | 在 `register()` 内启动，或外部 cron 打 `/api/ai/cron/execute` |
| 5 | Prisma 残留（依赖 + schema 无 model） | 新人误以为用 ORM，README 也这么写 | 要么补全 Prisma 模型，要么彻底移除依赖并改 README |
| 6 | README 与实现多处不一致（图标/主色/ORM） | 误导 | 以本文为准，README 加一行指引 |
| 7 | `/chat` 在 `protectedRoutes` 但未进 matcher | 页面无守卫 | 补 matcher 或删常量 |
| 8 | `lib/ai/sub-agents/` 空目录 | 结构误导 | 补实现或删除 |
| 9 | 无 CI（无 `.github` / `.gitee`） | 回归靠人肉跑 `pnpm test` | 加最小流水线：`tsc --noEmit`（只查增量）+ `vitest --run` + `next build` |
| 10 | 无迁移框架 | 列变更靠人工 `ADD COLUMN IF NOT EXISTS`，回滚无脚本 | 引入轻量迁移表（`schema_migrations`）记录版本 |
| 11 | 145 个 `_probe_*` 堆在根目录 | 仓库噪音 | 移到 `probes/` 并加 README |
| 12 | `tsc` 基线 199 错误 | 掩盖新错误 | 逐步清零，先把 `ignoreBuildErrors` 关掉 |

---

## 附录 A：环境变量全表

### A.1 必填（缺则功能不可用）

| 变量 | 说明 |
| --- | --- |
| `JWT_SECRET` | HS256 密钥，**≥32 字符**，`openssl rand -hex 48` |
| `INTERNAL_API_SECRET` | 内部接口密钥；缺失时相关函数直接抛错 |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | 容器初始化；密码须与 URL 一致 |
| `MQTT_HOST` / `MQTT_PORT` / `MQTT_USERNAME` / `MQTT_PASSWORD` / `MQTT_SUBSCRIBE_TOPIC` / `MQTT_PUBLISH_TOPIC` | IoT 主链路 |
| `WEATHER_API_KEY` | 天气 |
| `DASHSCOPE_API_KEY` | 视觉 / 语音 / 部分模型 |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | 服务端内部地址 / 客户端公网地址 |

### A.2 功能可选

| 组 | 变量 |
| --- | --- |
| MQTT 细节 | `MQTT_USE_SSL`(默认 true) `MQTT_KEEPALIVE`(60) `MQTT_RECONNECT_PERIOD`(5000) |
| AI | `SYSTEM_OPENAI_BASE_URL` `SYSTEM_OPENAI_API_KEY` `SUMMARIZATION_API_URL` `SUMMARIZATION_MODEL` `SUMMARIZATION_API_KEY` |
| HITL | `REDIS_URL` / `VALKEY_URL` / `REDIS_URI`（任一） |
| 人机验证 | `NEXT_PUBLIC_CAP_API_ENDPOINT` `CAP_VERIFY_URL` `CAP_SECRET_KEY` `CAP_ADMIN_KEY` |
| 邮件 | `RESEND_API_KEY` `RESEND_FROM_EMAIL` |
| OAuth | `WECHAT_OPEN_APP_ID/SECRET` `WECHAT_APP_ID/SECRET` `WEWORK_CORP_ID/AGENT_ID/CORP_SECRET` `QQ_CLIENT_ID/SECRET` `ALIPAY_APP_ID/PRIVATE_KEY/PUBLIC_KEY` |
| 天气/地图 | `TIANQI_APPID` `TIANQI_APPSECRET` `TENCENT_MAP_KEY` `TENCENT_MAP_SK` |
| 文档 | `ONLYOFFICE_JWT_SECRET` `ONLYOFFICE_URL` `NEXT_PUBLIC_ONLYOFFICE_API_URL` |
| 协同 | `YJS_WS_PORT`(1234) `YJS_WS_HOST` `YJS_AUTH_TOKEN` `NEXT_PUBLIC_YJS_WS_URL` |
| 语音 | `WS_SERVER_PORT`(3002) `VOICE_KEY_ENCRYPTION_SECRET` `SKIP_VOICE_AUTH`(仅开发) |
| 调度 | `GUARDIAN_CHECK_CRON`(默认 `*/10 * * * *`) `CRON_SECRET_TOKEN` |
| 设备 | `SPECTRUM_SERVICE_URL` |
| 桌面 | `DESKTOP_LICENSE_PRIVATE_KEY` `DESKTOP_LICENSE_PUBLIC_KEY` |
| 模式 | `STRAVISION_LOCAL_MODE`（本机首用户自动 super_admin）、`DESKTOP_BUILD=1`（standalone） |
| 构建 | `NEXT_DIST_DIR`（并行 dev，必须在 `/.next/` 下） |

---

## 附录 B：目录速查卡

```
改 AI 行为 → lib/ai/（预算 agent-budget.ts / 上下文 context/ / 工具 mcp/）
改设备协议 → lib/mqtt-service.ts + lib/constants.ts + lib/mcp/builtin-device-control.ts
改数据表 → lib/db/database.ts（DDL）+ 对应 *-service.ts
改鉴权 → lib/auth.ts + lib/token.ts + proxy.ts
改页面样式 → app/globals.css（token）+ components/ui/
改主题色 → app/globals.css 的 --br-* / --color-*
加验收探针 → 根目录 _probe_*.mjs（读 _verify_token.txt）
加视觉验收页 → app/dev-xxx/page.tsx
改部署 → Dockerfile / docker-compose.yml / nginx/nginx.conf / deploy.sh
改桌面 → desktop/ + scripts/desktop/
```

## 附录 C：验收口径速记

| 改动类型 | 最低验收 |
| --- | --- |
| 纯文案 / 样式 | `app/dev-*` 目视 + 暗色对照 |
| 组件逻辑 | 真实渲染一次（防 hook 错位）+ `pnpm test` |
| AI 链路 | 契约测试全绿 + 新建对话跑一轮真实 SSE + 看 `tool_result` 帧 |
| 数据写入 | 事务内实跑一次 INSERT/UPDATE，再查库确认 |
| API | `curl --noproxy '*'` 带 cookie 跑通 + 401/429 分支 |
| 部署 | `/api/health` = ok + 首页 + 登录 + AI 一句话 + 设备控制一次 |
| 桌面 | `desktop:verify:setup` / `:mqtt` / `:e2e` / `:packaged` |

---

*本手册基于 2026-10-18 的代码基线整理。若与代码冲突，**以代码为准**，并回头修正本文。*
