# STRAVISION 莓界 v4.0 — 项目转交与开发文档

> **文档版本**：v1.0
> **项目代号**：STRAVISION BerryRealm / 莓界
> **适用版本**：berry-realm-v4.0（package.json 版本 4.1.0）
> **最后更新**：2026-07-07
> **文档目的**：为接手本项目的开发者/团队提供从架构理解到日常开发的全套上手资料，避免踩坑和重复造轮子。

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈一览](#2-技术栈一览)
3. [项目目录结构](#3-项目目录结构)
4. [核心架构总览](#4-核心架构总览)
5. [数据库设计](#5-数据库设计)
6. [认证与安全架构](#6-认证与安全架构)
7. [AI 集成架构](#7-ai-集成架构)
8. [RAG 知识库系统](#8-rag-知识库系统)
9. [MCP 工具系统](#9-mcp-工具系统)
10. [Agent Orchestrator（多智能体编排）](#10-agent-orchestrator多智能体编排)
11. [Skill System（技能系统）](#11-skill-system技能系统)
12. [IoT 设备控制（MQTT）](#12-iot-设备控制mqtt)
13. [自动化引擎（ReactFlow）](#13-自动化引擎reactflow)
14. [调度器（Scheduler Runner）](#14-调度器scheduler-runner)
15. [实时通信（SSE / WebSocket）](#15-实时通信sse--websocket)
16. [语音助手（XiaoZhi）](#16-语音助手xiaozhi)
17. [API 层设计](#17-api-层设计)
18. [中间件（Middleware）](#18-中间件middleware)
19. [部署架构（Docker + Nginx）](#19-部署架构docker--nginx)
20. [环境变量参考](#20-环境变量参考)
21. [开发工作流与规范](#21-开发工作流与规范)
22. [常见开发任务](#22-常见开发任务)
23. [关键注意事项与陷阱](#23-关键注意事项与陷阱)
24. [测试](#24-测试)
25. [已知问题与改进方向](#25-已知问题与改进方向)
26. [转交清单](#26-转交清单)

---

## 1. 项目概述

### 1.1 项目定位

**STRAVISION 莓界（BerryRealm）** 是一套面向草莓种植场景的**智能温室管理平台**，融合了以下能力：

- 🌡️ **环境监测**：温湿度、光照、CO₂、土壤氮磷钾、EC、土壤温湿度等实时采集
- 📷 **视频巡检**：摄像头云台（PTZ）控制 + VLM 视觉分析（病虫害/生长状态识别）
- 🎮 **设备控制**：继电器（水泵/风扇/灯）、LED 调光、步进电机云台
- 🤖 **AI 助手**：多模型对话、RAG 知识库、Agent 编排、技能系统、MCP 工具
- 🔔 **自动化**：基于 ReactFlow 的可视化触发-逻辑-动作规则引擎
- ⏰ **调度**：cron 周期任务 + 一次性延时任务
- 👥 **社交**：好友、私聊、群聊、BerryBot 机器人
- 📚 **知识市场**：知识集合订阅、协作编辑（Yjs）
- 🎙️ **语音**：DashScope Realtime 实时语音对话

### 1.2 用户分层

| 层级 | 入口 | 角色 |
|---|---|---|
| **匿名访客** | `/`、`/login`、`/register`、`/landing` | 仅注册/登录 |
| **普通用户** | `/dashboard`、`/monitor`、`/device-control`、`/automation`、`/chat`、`/ai-assistant`、`/profile`、`/settings`、`/mcp-store`、`/kb-store`、`/model-store` 等 25+ 页面 | 完整业务能力 |
| **管理员** | `/admin`、`/super-secure-admin` | 用户管理、AI 提供商、MCP 市场、技能市场、安全、公告、系统设置 |

### 1.3 双端支持

- **PC 端**：`app/(protected)/...`
- **移动端**：通过 `middleware.ts` 的 UA 检测重写到 `/monitor-ios`、`/device-control-ios` 等专用页面
- **微信小程序 / 移动 H5**：`(mobile)/home/page.tsx` 提供独立首页

---

## 2. 技术栈一览

### 2.1 前端

| 类别 | 技术 | 版本 |
|---|---|---|
| 框架 | **Next.js**（App Router） | 16.1.6 |
| UI 库 | React | 19.2.2 |
| 语言 | TypeScript | 5.x |
| 组件库 | **Ant Design** | 6.3.5 |
| 基础组件 | shadcn/ui + Radix UI | — |
| 样式 | Tailwind CSS | 4.x |
| 动画 | Framer Motion | — |
| 图标 | lucide-react | — |
| 流程图 | **@xyflow/react**（ReactFlow） | 12.10.0 |
| 图表 | mermaid、vega-chart | — |
| 协同编辑 | Yjs（yjs、y-protocols、y-websocket） | — |

### 2.2 后端

| 类别 | 技术 | 版本 |
|---|---|---|
| 运行时 | Node.js | 22-alpine（Dockerfile 基础镜像） |
| 数据库 | **PostgreSQL** | 16-alpine |
| DB 客户端 | **`pg` 库**（Pool） | 8.18.0 |
| ORM | Prisma（仅安装，**schema.prisma 基本为空**，实际用 `lib/db/database.ts` 原生 SQL） | 7.3.0 |
| SQLite | better-sqlite3（部分本地缓存） | 12.6.2 |
| 认证 | **JWT（jose）**，HS256，httpOnly Cookie | — |
| 验证 | zod | — |
| 调度 | **node-cron** | — |
| MQTT | mqtt | 5.14.1 |
| AI SDK | OpenAI SDK + AI SDK | 6.25 / 5.0.106 |

### 2.3 AI / 知识库

- **多提供商**：OpenAI / 智谱 GLM / 阿里 DashScope / 自定义兼容 OpenAI 协议的服务
- **Embedding**：embedding-2 / embedding-3 / text-embedding-3-small/large / text-embedding-v3/v2
- **RAG**：关键词（ILIKE + tsvector）+ 语义（cosine）+ 混合（默认 0.4/0.6）+ GLM Rerank
- **OCR**：智谱 GLM-OCR（layout_parsing）
- **VLM**：摄像头帧分析（病虫害识别）

### 2.4 语音

- **唤醒词**：Picovoice Porcupine
- **实时对话**：DashScope Realtime（qwen3-omni-flash-realtime）
- **ASR**：Qwen ASR
- **TTS**：DashScope TTS、CosyVoice
- **Pipecat-ai**：实时语音管线

### 2.5 部署

| 组件 | 技术 |
|---|---|
| 容器 | Docker（multi-stage build） |
| 编排 | docker-compose.yml（db / web / yjs-ws / nginx） |
| 反向代理 | Nginx（含维护页 `maintenance.html`） |
| 包管理 | pnpm 10.30.1（corepack 启用） |
| 构建 | Turbopack 默认，4GB 服务器回退 Webpack |
| 镜像源 | 清华 TUNA + npmmirror（构建时切换） |

### 2.6 关键脚本

```jsonc
// package.json
"scripts": {
  "dev": "next dev",                    // 开发模式
  "build": "next build",                // 生产构建
  "start": "next start",                // 仅启动 Next.js
  "start:all": "next start & node server/ws-server.js",  // 启动 Next + 语音 WS
  "test": "vitest",                     // 单测
  "create:demo": "..."                  // 生成演示数据
}
```

---

## 3. 项目目录结构

```
berry-realm-v4.0/
├── app/                              # Next.js App Router
│   ├── (mobile)/home/                # 移动端首页（独立路由组）
│   ├── access-denied/                # 403 页
│   ├── activity/                     # 活动页
│   ├── admin/                        # 管理员后台
│   ├── ai-assistant/                 # AI 助手页（与 /chat 不同）
│   ├── api/                          # 50+ API 路由文件夹（详见第 17 节）
│   ├── apply/                        # 申请页
│   ├── automation/                   # 自动化（含 /editor ReactFlow 编辑器）
│   ├── chat/                         # AI 对话
│   ├── dashboard/                    # 仪表盘
│   ├── demo/                         # Demo 展示
│   ├── device-control/               # 设备控制
│   ├── docs/                         # 内置文档站
│   ├── forgot-password/              # 忘记密码
│   ├── help/                         # 帮助中心
│   ├── kb-store/                     # 知识市场
│   ├── landing/                      # 落地页
│   ├── login/ register/              # 登录注册
│   ├── maintenance/                  # 维护页
│   ├── mcp-store/                    # MCP 市场
│   ├── model-store/                  # 模型市场
│   ├── monitor/                      # 视频巡检（含 monitor-ugly.tsx 旧版）
│   ├── my-mcp/                       # 我的 MCP
│   ├── plans/                        # 套餐
│   ├── privacy/ terms/               # 政策条款
│   ├── profile/                      # 个人资料
│   ├── settings/                     # 用户设置
│   ├── super-secure-admin/           # 超级管理员后台
│   ├── test-*/                       # 各种测试页（elder-friendly / responsive-nav / sources-design）
│   ├── too-many-requests/            # 429 页
│   ├── globals.css                   # 全局样式
│   ├── layout.tsx                    # 根布局
│   └── page.tsx                      # 首页
│
├── components/                       # UI 组件
│   ├── admin/                        # 管理员专用（mcp-manager / user-dialog）
│   ├── ai/                           # AI 相关（citation-card / reasoning / schedule-card / skill-store / smart-prompts 等）
│   ├── auth/                         # 认证布局
│   ├── diagrams/                     # 图表组件
│   ├── kb/                           # 知识库组件
│   ├── landing/ landing-art/         # 落地页素材
│   ├── loading/                      # 加载组件
│   ├── ui/                           # shadcn/ui 基础组件（40+ 文件）
│   └── *.tsx                         # 顶层组件（chart-renderer / mermaid-chart / theme-provider / page-header / page-navigation / page-transition / scheduler-init / sw-register / user-avatar-menu / weather-card 等）
│
├── lib/                              # 核心业务逻辑
│   ├── a2ui/                         # A2UI 协议（莓小智 Berry Protocol）
│   ├── ai/                           # AI 服务（详见第 7-11 节）
│   │   ├── agent-orchestrator/       # 多智能体编排
│   │   ├── skill-system/             # 技能系统
│   │   ├── embedding-service.ts
│   │   ├── knowledge-search.ts
│   │   ├── provider-resolver.ts
│   │   ├── prompt-templates.ts
│   │   ├── response-cache.ts
│   │   ├── auto-learning-service.ts
│   │   ├── memory-prompt-enhancer.ts
│   │   ├── parallel-tool-executor.ts
│   │   ├── skill-router-cached.ts
│   │   ├── schedule-task-parser.ts
│   │   ├── ai-cron-service.ts
│   │   ├── ai-cron-executor.ts
│   │   ├── report-generator.ts
│   │   └── word-document-service.ts
│   ├── auth/                         # 会话存储
│   ├── automation/                   # 自动化引擎
│   │   └── engine.ts
│   ├── contexts/                     # React Context（DeviceContext）
│   ├── data/                         # 静态数据（mcp-servers）
│   ├── db/                           # 数据库服务层（15+ 文件）
│   │   ├── database.ts               # ⭐ 原生 SQL + 30+ 表 schema
│   │   ├── user-service.ts
│   │   ├── chat-service.ts
│   │   ├── device-service.ts
│   │   ├── knowledge-service.ts
│   │   ├── automation-service.ts
│   │   ├── scheduler-service.ts
│   │   ├── ai-quota-service.ts
│   │   ├── agent-memory-service.ts
│   │   ├── maintenance-service.ts
│   │   ├── mcp-server-service.ts
│   │   ├── security-service.ts
│   │   ├── settings-service.ts
│   │   ├── skill-store-service.ts
│   │   ├── ticket-service.ts
│   │   └── user-reports-service.ts
│   ├── hooks/                        # React Hooks
│   │   ├── use-device-control.ts     # ⭐ 设备控制 Hook
│   │   ├── use-device-data.ts        # ⭐ 设备数据 SSE
│   │   ├── use-weather.ts
│   │   ├── use-ai-features.ts
│   │   ├── use-ai-models.ts
│   │   ├── use-daily-greeting.ts
│   │   └── use-plant-growth.ts
│   ├── mcp/                          # MCP 工具
│   │   ├── mcp-tool-definitions.ts
│   │   ├── mcp-tool-executor.ts
│   │   └── spectrum-connection-pool.ts
│   ├── scheduler/                    # 调度器
│   │   └── runner.ts                 # ⭐ SchedulerRunner 单例
│   ├── security/                     # 安全（sanitize-html / ssrf-guard）
│   ├── server/                       # 服务端事件总线
│   │   ├── kb-activity-bus.ts
│   │   ├── sessionStore.ts
│   │   └── user-event-bus.ts
│   ├── services/                     # 数据采集
│   ├── types/                        # 类型定义
│   ├── ui/                           # UI 适配（berry-card-adapter / berry-theme）
│   ├── utils/                        # 工具（video-capture）
│   ├── validations/                  # zod 校验
│   ├── xiaozhi/                      # ⭐ 语音助手
│   │   ├── audioCapture.ts
│   │   ├── fastRTCClient.ts
│   │   ├── monitor-snapshot.ts
│   │   ├── realtimeClient.ts
│   │   ├── tts-preloader.ts
│   │   └── voice-commands.ts
│   ├── ai-system-prompt.ts           # ⭐ 系统提示词
│   ├── auth.ts                       # ⭐ 认证入口
│   ├── token.ts                      # ⭐ JWT 签发/校验
│   ├── constants.ts                  # ⭐ 常量（设备 ID / 丝杆参数 / 内部 API 密钥）
│   ├── dashboard-layouts.ts          # 仪表盘预设布局
│   ├── email-templates.tsx           # 邮件模板
│   ├── mqtt-config.ts                # ⭐ MQTT 配置
│   ├── mqtt-service.ts               # ⭐ MQTT 单例服务
│   ├── notification-service.ts       # 企微通知
│   ├── rate-limit.ts                 # 限流
│   ├── security.ts                   # 安全工具
│   ├── thresholds.ts                 # 阈值
│   └── utils.ts                      # 通用工具
│
├── prisma/
│   ├── schema.prisma                 # ⚠️ 基本为空，实际 schema 在 lib/db/database.ts
│   └── (生成目录 ../generated/prisma)
│
├── server/                           # 独立 WebSocket 服务
│   ├── ws-server.js                  # ⭐ 语音 WS 服务（端口 3002）
│   ├── ws-proxy.js                   # WS 代理
│   └── yjs-server.js                 # ⭐ Yjs 协同 WS（端口 1234）
│
├── nginx/                            # Nginx 配置
│   ├── nginx.conf
│   ├── html/maintenance.html         # 维护页
│   └── certs/                        # SSL 证书（部署时挂载）
│
├── public/                           # 静态资源
│   ├── 3d_model/                     # 3D 模型（hero.glb）
│   ├── AI-gif/                       # AI 动图
│   ├── changelogimage/               # 更新日志图
│   ├── draco/                        # 3D 解码器
│   ├── glassyicons/                  # 玻璃风图标
│   └── *.png / *.svg                 # 各种素材
│
├── .agents/skills/                   # ⭐ 技能定义（45+ 技能）
│   ├── agentic/ ant/ artistic/ bento/ bold/ cafe/ claude/ clean/ ...
│   └── 每个技能含 SKILL.md + 可选 DESIGN.md
│
├── data/                             # 运行时配置（git-ignored）
│   ├── ai-providers-config.json      # ⭐ AI 提供商配置（admin 后台写入）
│   ├── ai-features-config.json       # AI 功能开关
│   └── ...
│
├── middleware.ts                     # ⭐ Next.js 中间件（限流/维护/移动端重定向/路由保护）
├── next.config.ts                    # ⭐ Next 配置（CSP / transpile / external packages）
├── instrumentation.ts                # OpenTelemetry / 监控钩子
├── Dockerfile                        # ⭐ 生产镜像（multi-stage）
├── Dockerfile.prebuilt               # 使用预构建产物的镜像
├── docker-compose.yml                # ⭐ 生产编排（db/web/yjs-ws/nginx）
├── docker-compose.dev.yml            # 开发编排
├── docker-entrypoint.sh              # ⭐ 容器启动脚本
├── build-low-memory.ps1 / .sh        # 4GB 服务器低内存构建
├── deploy.ps1 / deploy.sh            # 部署脚本
├── docker-build.ps1 / .sh            # Docker 构建脚本
├── generate-certs.ps1                # SSL 证书生成
├── .npmrc                            # pnpm 配置
├── pnpm-workspace.yaml
├── prisma.config.ts
├── project.config.json               # 项目配置
└── project.private.config.json       # 私有配置
```

---

## 4. 核心架构总览

### 4.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         客户端（浏览器/移动端）                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Dashboard │  │ Monitor  │  │ Device   │  │   Chat   │   ...    │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘          │
│        │             │             │             │                │
│        └─────────────┴─────────────┴─────────────┘                │
│                      Next.js App Router                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP / SSE / WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Nginx 反向代理 (80/443)                         │
│   - 静态资源 / uploads                                              │
│   - 维护页路由                                                       │
│   - WebSocket 透传（语音 WS / Yjs WS）                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Next.js Server (port 3000, Node 22)                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ middleware.ts                                              │    │
│  │  - 限流 / IP 封禁 / 维护模式 / 移动端重定向 / 路由保护          │    │
│  └──────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ app/api/* (150+ API 路由)                                  │    │
│  │  - /api/chat           AI 对话（流式）                       │    │
│  │  - /api/mqtt/*         设备控制 & SSE 流                    │    │
│  │  - /api/knowledge/*    知识库 CRUD & 检索                   │    │
│  │  - /api/automation/*   自动化规则                            │    │
│  │  - /api/scheduler/*    调度任务                              │    │
│  │  - /api/admin/*        管理员接口                            │    │
│  │  - /api/auth/*         认证（含三方 OAuth）                   │    │
│  │  - /api/voice/*        语音配额                              │    │
│  └──────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ lib/ 业务层                                                │    │
│  │  - auth.ts / token.ts      JWT 认证                        │    │
│  │  - mqtt-service.ts         MQTT 单例（连接 HiveMQ Cloud）    │    │
│  │  - automation/engine.ts    规则引擎                          │    │
│  │  - scheduler/runner.ts     调度器单例                        │    │
│  │  - ai/*                    AI 全家桶                         │    │
│  │  - db/*                    PostgreSQL 数据访问               │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────┬───────────────────────┬──────────────────┬───────────┘
           │                       │                  │
           ▼                       ▼                  ▼
   ┌──────────────┐       ┌────────────────┐   ┌──────────────┐
   │ PostgreSQL   │       │ MQTT Broker    │   │ WS Servers   │
   │ (port 5432)  │       │ (HiveMQ Cloud  │   │ - 语音 :3002 │
   │              │       │  port 8883)    │   │ - Yjs  :1234 │
   │ 30+ 表       │       │                │   └──────────────┘
   └──────────────┘       └───────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │  硬件设备         │
                          │  - 继电器 5-8     │
                          │  - LED 1-3 (BRG) │
                          │  - 步进电机云台    │
                          │  - 11 通道光谱仪   │
                          │  - 环境传感器      │
                          └─────────────────┘
```

### 4.2 数据流概览

**环境数据上行**：
```
硬件传感器 → MQTT Broker → meimefarm/basic_env_data topic
  → MQTTService.handleMessage()
    → 1. 更新 latestData 缓存
    → 2. saveSensorReading() 写入 sensor_readings 表
    → 3. checkThresholds() 异常告警 → 企微通知
    → 4. AutomationEngine.evaluate() 规则匹配 → 触发动作
    → 5. notifyListeners() → SSE 推送给前端
```

**控制指令下行**：
```
前端 useDeviceControl Hook
  → POST /api/mqtt/control
    → MQTTService.sendControlCommand()
      → buildControlPayload() 构建 rw_prot 协议
      → client.publish(publishTopic, payload)
        → MQTT Broker → 硬件设备
      → 更新 stepper 缓存位置（如适用）
      → 通知 listeners 刷新 UI
```

**AI 对话流**：
```
前端 → POST /api/chat (streaming)
  → getCurrentUser() 鉴权
  → reserveAiUsage() 预扣配额
  → resolveProvider() 解析 AI 提供商
  → generateMemoryEnhancedPrompt() 注入记忆
  → getRelevantSkillsContentCached() 技能匹配
  → getMCPToolDefinitions() 注入 MCP 工具
  → createOrchestrator() 创建 Agent 编排器
  → executeToolCallsSmart() 并行工具执行
  → filterBareTaskListJson() 过滤裸 JSON
  → streamText() 流式返回
  → learnFromConversation() 自动学习
  → cacheResponse() 缓存响应
```

---

## 5. 数据库设计

### 5.1 重要说明

> ⚠️ **本项目不使用 Prisma Migrations！**
>
> - `prisma/schema.prisma` 基本为空，仅作为生成 Prisma Client 的占位
> - **真正的 schema 在 [lib/db/database.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/db/database.ts) 的 `initDB()` 函数中，使用原生 `CREATE TABLE IF NOT EXISTS` SQL**
> - 数据访问层全部使用 `pg.Pool` 的 `query()` / `queryOne()` / `execute()` 方法
> - 每次服务启动会调用 `initDB()` 自动建表（幂等）

### 5.2 数据库连接

```typescript
// lib/db/database.ts
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ...
})

export async function query<T>(sql: string, params?: any[]): Promise<T[]>
export async function queryOne<T>(sql: string, params?: any[]): Promise<T | null>
export async function execute(sql: string, params?: any[]): Promise<void>
export async function initDB(): Promise<void>
```

**Edge Runtime 保护**：
```typescript
if (process.env.NEXT_RUNTIME === 'edge') {
  throw new Error('Database module cannot be used in Edge runtime')
}
```

### 5.3 数据表清单（30+ 表）

| 表名 | 用途 |
|---|---|
| `users` | 用户主表（含 role: user/admin/super_admin） |
| `email_verifications` | 邮箱验证码 |
| `scheduled_tasks` | 调度任务（cron + 一次性） |
| `login_logs` | 登录日志 |
| `banned_ips` | 封禁 IP |
| `access_logs` | 访问日志 |
| `device_logs` | 设备操作日志 |
| `sensor_readings` | 传感器历史数据 |
| `login_tickets` | 三方登录票据 |
| `system_settings` | 系统设置（key-value） |
| `friend_requests` | 好友请求 |
| `friends` | 好友关系 |
| `messages` | 私聊消息 |
| `groups` | 群组 |
| `group_members` | 群成员 |
| `automation_rules` | 自动化规则（graph_data 为 JSON） |
| `user_preferences` | 用户偏好 |
| `device_patterns` | 设备使用模式（AI 学习） |
| `successful_strategies` | 成功策略（AI 学习） |
| `agent_execution_logs` | Agent 执行日志 |
| `ai_cron_jobs` | AI 定时任务 |
| `user_reports` | 用户报告 |
| `knowledge_collections` | 知识集合 |
| `knowledge_market_subscriptions` | 市场订阅 |
| `knowledge_tags` | 标签 |
| `knowledge_items` | 知识条目 |
| `knowledge_item_tags` | 条目-标签关联 |
| `knowledge_versions` | 条目版本 |
| `knowledge_chunks` | 分块（含 embedding 向量） |
| `knowledge_permissions` | 权限 |
| `knowledge_query_log` | 查询日志 |
| `knowledge_backups` | 备份 |
| `knowledge_recommendations` | 推荐 |
| `kb_collaborators` | 协作者 |
| `kb_invitations` | 邀请 |
| `kb_operation_logs` | 操作日志 |
| `kb_yjs_documents` | Yjs 协同文档 |

### 5.4 关键字段说明

#### users
- `id` SERIAL PK
- `email` UNIQUE
- `password_hash` (bcrypt)
- `role` ('user' | 'admin' | 'super_admin')
- `display_name`、`avatar_url`
- `ai_quota_daily`、`ai_quota_used`（AI 配额）
- `voice_quota_daily`、`voice_quota_used`（语音配额）

#### sensor_readings
- `temperature`（°C，已除 10）
- `humidity`（%，已除 10）
- `light`（lux）
- `co2`（ppm）
- `soil_moisture`（%）
- `earth_n` / `earth_p` / `earth_k`（mg/kg）
- `rainfall`
- `created_at`

> ⚠️ **注意**：MQTT 上行的原始数据温度/湿度是 ×10 的整数（如 253 表示 25.3°C），`saveSensorReading()` 会除以 10 再入库，但 `latestData` 缓存中保留原始 ×10 值，前端展示时再除 10。

#### automation_rules
- `id`、`name`、`description`
- `graph_data` TEXT（JSON 字符串，含 nodes + edges，ReactFlow 结构）
- `trigger_type` ('sensor' | 'schedule' | 'manual')
- `is_active` (0/1)
- `last_executed_at`
- `execution_count`

#### knowledge_chunks
- `id`、`item_id`
- `content` TEXT（分块文本）
- `embedding` TEXT（JSON 字符串数组，**未用 pgvector**）
- `chunk_index`、`token_count`、`hash`
- `created_at`

> ⚠️ **embedding 存储**：本项目使用 JSON 字符串存储向量（兼容无 pgvector 扩展的环境），检索时全量加载到内存计算余弦相似度。**对于大规模知识库（>10k chunks）会有性能问题**，未来可考虑迁移到 pgvector。

#### scheduled_tasks
- `id`、`title`、`description`
- `action_type` ('relay' | 'led' | 'agent' | 'reminder')
- `device_id`、`params`（JSON）
- `cron_expression`（cron 任务）
- `execute_at`（一次性任务的执行时间戳）
- `status` ('pending' | 'success' | 'failed')
- `result`（执行结果文本）

---

## 6. 认证与安全架构

### 6.1 JWT 认证流程

**核心文件**：
- [lib/auth.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/auth.ts) — 入口
- [lib/token.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/token.ts) — JWT 签发/校验

**实现**：
```typescript
// 使用 jose 库（Edge 兼容）
import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET)
// JWT_SECRET 必须 ≥ 32 字符

// 签发：HS256，7 天过期
async function signToken(payload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

// 校验
async function verifyToken(token): Promise<JWTUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
    return payload as JWTUser
  } catch {
    return null
  }
}
```

**Cookie 设置**：
```typescript
// lib/auth.ts
function setAuthCookie(res, token) {
  res.cookies.set('auth', token, {
    httpOnly: true,           // ⭐ 防 XSS
    sameSite: 'lax',          // 防 CSRF
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60, // 7 天
    path: '/'
  })
}
```

**getCurrentUser()**：
```typescript
async function getCurrentUser(): Promise<User | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('auth')?.value
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload) return null
  // 从 DB 加载最新用户信息
  return await getUserById(payload.userId)
}
```

### 6.2 三方登录

| 渠道 | 路由 | 流程 |
|---|---|---|
| 微信网页 | `/api/auth/wechat/login` → `/callback` | OAuth2 + 票据换 cookie |
| 微信开放平台 | 同上，使用 `WECHAT_OPEN_APP_ID` | 扫码登录 |
| 企业微信 | `/api/auth/wework/login` → `/callback` | 企微 OAuth |
| QQ | `/api/auth/qq/login` → `/callback` | QQ 互联 |
| 支付宝 | `/api/auth/alipay/login` → `/callback` | 支付宝授权 |

### 6.3 路由保护

[middleware.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/middleware.ts) 中定义：

**受保护的用户路由**（无 token 重定向到 `/login`）：
```
/dashboard, /monitor, /device-control, /ai-assistant,
/chat, /settings, /profile, /automation, /activity,
/mcp-store, /my-mcp, /kb-store, /model-store, /help
```

**管理员路由**（无 token 或非 admin 重定向到 `/`）：
```
/admin, /super-secure-admin
```

### 6.4 限流与封禁

**IP 限流**（middleware.ts）：
- 每个 IP 的请求计数通过 `/api/internal/security/check` 检查
- 超过阈值 → 自动加入 `banned_ips` 表
- 限流配置动态从 `/api/internal/security/config` 加载（admin 可调）

**维护模式**：
- middleware 调用 `/api/internal/maintenance/check`
- 若开启 → 所有请求重定向到 `/maintenance`
- admin 通过 `/api/admin/settings/maintenance` 控制

### 6.5 CSP 头

[next.config.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/next.config.ts) 中定义 CSP：
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https: blob:;
connect-src 'self' https: wss:;
frame-ancestors 'self';
```
允许的第三方域：alipay.com、qq.com、weixin、cloudflare（Turnstile）。

### 6.6 内部 API 密钥

[lib/constants.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/constants.ts)：
```typescript
function getInternalApiSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) throw new Error('INTERNAL_API_SECRET is required')
  return secret
}
```
用于内部服务间调用（如 WS Server 调 Next.js API）的鉴权。

### 6.7 安全工具

- `lib/security/sanitize-html.ts` — HTML 净化
- `lib/security/ssrf-guard.ts` — SSRF 防护（限制内网请求）
- `lib/rate-limit.ts` — 应用层限流

---

## 7. AI 集成架构

### 7.1 多提供商解析

**核心文件**：[lib/ai/provider-resolver.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/ai/provider-resolver.ts)

**配置文件**：`data/ai-providers-config.json`（admin 后台写入）

```typescript
interface ProvidersConfig {
  providers: AIProvider[]      // 提供商列表
  defaultModelId?: string      // 默认模型
  embeddingConfig?: EmbeddingConfig  // Embedding 配置
  knowledgeConfig?: KnowledgeConfig  // 知识库全局配置
}

interface AIProvider {
  id: string
  name: string
  type: 'openai' | 'glm' | 'dashscope' | 'custom'
  baseUrl: string
  apiKey: string
  enabled: boolean
  priority: number             // 优先级（数字越小越优先）
  models: ProviderModel[]
}

interface ResolvedProvider {
  providerId: string
  providerName: string
  type: AIProvider['type']
  baseUrl: string              // 已处理为完整 /v1/chat/completions URL
  apiKey: string
  model: string
  modelInfo: ProviderModel | undefined
}
```

**解析优先级**（`resolveProvider(modelId, userApiKey?, userApiUrl?)`）：
1. **用户自配** apiKey/apiUrl → 直接使用
2. **已配置提供商**中查找该 model → 使用对应 provider
3. **系统环境变量**回退：
   - 优先 `SYSTEM_GLM_API_KEY` + `SYSTEM_GLM_BASE_URL`
   - 其次 `SYSTEM_OPENAI_API_KEY` + `SYSTEM_OPENAI_BASE_URL`
4. 都没有 → 返回 null

**默认模型解析**（`resolveDefaultModelId()`）：
1. admin 配置的 `defaultModelId`（若该模型仍启用）
2. 默认 provider（priority 最小）的第一个 enabled 模型
3. 第一个 enabled 模型的 ID

### 7.2 主对话路由

**文件**：[app/api/chat/route.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/app/api/chat/route.ts)

```typescript
export const runtime = 'nodejs'  // ⭐ 不能用 edge（依赖 pg / fs）

export async function POST(req: Request) {
  // 1. 鉴权 + 预扣配额
  const user = await getCurrentUser()
  await reserveAiUsage(user.id)

  // 2. 解析请求
  const { messages, apiKey, apiUrl, model, systemPrompt,
          enableSearch, enableReasoning,
          deviceData, weatherData, mcpConfigs,
          mandatorySkillsEnabled, deviceOnline,
          lockedCollectionId } = await req.json()

  // 3. 解析提供商
  const resolved = await resolveProvider(model, apiKey, apiUrl)

  // 4. 增强 prompt
  const enhancedPrompt = await generateMemoryEnhancedPrompt(user.id, messages)

  // 5. 加载技能
  const skillsContent = await getRelevantSkillsContentCached(user.id, lastMessage)

  // 6. 加载 MCP 工具
  const mcpTools = await getMCPToolDefinitions(user.id, mcpConfigs)

  // 7. Agent 编排
  const orchestrator = createOrchestrator({ ... })

  // 8. 流式响应
  const stream = await streamText({
    model: openai(model, { baseURL, apiKey }),
    messages,
    system: generateCompactSystemPrompt({ ... }),
    tools: mcpTools,
    onStepFinish: ({ toolCalls }) => executeToolCallsSmart(toolCalls)
  })

  // 9. 过滤裸 JSON + 流式返回
  // 10. 学习 + 缓存
  learnFromConversation(user.id, messages, response)
  cacheResponse(user.id, query, response)

  // 11. 退还配额（如失败）
  refundAiUsage(user.id)
}
```

### 7.3 AI 功能配置

**文件**：`data/ai-features-config.json`（admin 后台 `/api/admin/ai-features` 写入）

通过 [lib/ai/prompt-templates.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/ai/prompt-templates.ts) 的 `filterDisabledFeatures()` 动态启用/禁用能力。

### 7.4 Prompt 模板

[lib/ai/prompt-templates.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/ai/prompt-templates.ts) 提供 `generateCompactSystemPrompt()`，注入：
- 用户身份、当前时间
- 设备状态（温度/湿度/CO₂ 等）
- 天气数据
- 已启用技能清单
- 知识库上下文（RAG 结果）
- 工具说明

### 7.5 响应缓存

[lib/ai/response-cache.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/ai/response-cache.ts) — 相同 query 短期缓存命中直接返回。

### 7.6 自动学习

[lib/ai/auto-learning-service.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/ai/auto-learning-service.ts) — `learnFromConversation()` 分析对话提取：
- 用户偏好
- 设备使用模式 → `device_patterns` 表
- 成功策略 → `successful_strategies` 表

### 7.7 设备指令提取

`/api/chat/route.ts` 中的 `extractDeviceActionsFromResponse()` 从 AI 回复中解析 `{"action":"toggle_relay","device":5,"value":1}` 这类指令（设备 ID 5-8），用于学习用户意图。

### 7.8 裸 JSON 过滤器

`filterBareTaskListJson()` — 拦截 AI 错误输出的裸 `TASK_LIST` JSON，但保留：
- `<TASK_LIST>` 标签包裹的内容
- `schedule_task` JSON 代码块
- 自动化策略 JSON（含 `triggerNode`/`logicNode`/`actionNode`）

### 7.9 AI 配额

- `lib/db/ai-quota-service.ts` — `getUserAiQuota()` / `reserveAiUsage()` / `refundAiUsage()`
- 每用户每日配额（admin 可配置）
- 预扣 + 失败退还机制

### 7.10 AI 定时任务

- `lib/ai/ai-cron-service.ts` — AI cron 任务管理
- `lib/ai/ai-cron-executor.ts` — 执行器
- `/api/ai/cron` / `/api/ai/cron/execute` — API
- `ai_cron_jobs` 表存储

---

## 8. RAG 知识库系统

### 8.1 架构

```
┌─────────────┐    上传    ┌──────────────┐   OCR   ┌──────────────┐
│ 用户上传文件 │ ─────────▶ │ /api/        │ ──────▶ │ GLM-OCR      │
│ (PDF/图片/  │            │ knowledge/   │         │ (layout_     │
│  DOCX/TXT)  │            │ upload       │         │  parsing)    │
└─────────────┘            └──────┬───────┘         └──────┬───────┘
                                  │                        │
                                  ▼                        ▼
                          ┌──────────────────────────────────┐
                          │ embedding-service.ts              │
                          │  1. chunkText() 滑动窗口分块       │
                          │     - 默认 500 字符/块             │
                          │     - 重叠 50 字符                 │
                          │     - 按段落→句子→字符切分         │
                          │  2. generateEmbedding() 生成向量   │
                          │     - OpenAI/GLM/DashScope         │
                          │  3. createChunk() 写入 DB          │
                          └──────────────────────────────────┘
                                          │
                                          ▼
                          ┌──────────────────────────────────┐
                          │ knowledge_chunks 表               │
                          │  - content TEXT                    │
                          │  - embedding TEXT (JSON 数组)      │
                          │  - chunk_index, token_count, hash  │
                          └──────────────────────────────────┘
                                          │
                          查询时 ▼
                          ┌──────────────────────────────────┐
                          │ knowledge-search.ts               │
                          │  三种模式：                        │
                          │  1. keywordSearch (ILIKE+tsvector)│
                          │  2. semanticSearch (cosine)        │
                          │  3. hybrid (默认 0.4/0.6)          │
                          │  + GLM Rerank (可选)               │
                          └──────────────────────────────────┘
```

### 8.2 三种检索模式

**文件**：[lib/ai/knowledge-search.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/ai/knowledge-search.ts)

#### 关键词搜索 `keywordSearch()`
- PostgreSQL `ILIKE` 在 title/content/summary/tags_cache 中匹配
- `tsvector` 全文搜索作为加分项
- 加权：`ts_rank × tsVectorWeight + ILIKE 命中`

#### 语义搜索 `semanticSearch()`
- `generateEmbedding(queryText)` 生成查询向量
- **全量加载**该用户所有 chunks 到内存
- 逐条计算 `cosineSimilarity(queryVec, chunkVec)`
- 按 item 聚合最高分

#### 混合搜索 `search()`（默认）
- 同时执行关键词 + 语义
- 关键词结果用 rank-based 归一化（`1 - idx/total`）
- 语义结果 cosine 本身即 0-1
- 加权合并：`score = kwScore × 0.4 + semScore × 0.6`
- 可选 GLM Rerank：对 top-N 重新打分

### 8.3 GLM Rerank

```typescript
if (hits.length > 1 && kc.glm.enableRerank) {
  const { callGLMRerank } = await import('./embedding-service')
  const docs = hits.slice(0, topN).map(h => h.matchedSnippet || ...)
  const rerankResults = await callGLMRerank({
    apiKey: rerankProvider.apiKey,
    query: queryText,
    documents: docs,
    topN
  })
  // 用 rerank 分数 × rerankBlend + 原分数 × (1 - rerankBlend) 重新排序
}
```

### 8.4 知识库全局配置

`DEFAULT_KNOWLEDGE_CONFIG` 包含 50+ 配置项，关键：
- `uploadLimits`：各类型文件大小上限
- `chunking`：分块参数（chunkSize/overlap/min/maxTokensByModel）
- `glm`：OCR/Rerank 开关与参数
- `search`：检索参数（hybridKeywordWeight/maxCandidate/highlight 等）
- `ui.contextMaxChunks`：AI 上下文注入 chunk 数

admin 后台可改，通过 `getKnowledgeConfig()` 深合并默认值。

### 8.5 知识市场

- `knowledge_collections.is_marketplace = 1` → 市场集合
- 用户通过 `knowledge_market_subscriptions` 订阅
- **虚拟订阅模型**：市场集合的 items 仍归原 owner，但已订阅用户可读
- 检索时 `includeMarket=true`（默认）会同时搜自己 + 已订阅的市场集合

### 8.6 协同编辑（Yjs）

- 独立 WS 服务 `server/yjs-server.js`（端口 1234）
- 表 `kb_yjs_documents` 持久化文档
- 环境变量 `YJS_AUTH_TOKEN` 控制访问
- `kb_collaborators` / `kb_invitations` / `kb_operation_logs` 支持协作

### 8.7 备份与版本

- `knowledge_versions` — 条目版本历史
- `knowledge_backups` — 集合备份
- `/api/knowledge/backup` 创建备份
- `/api/knowledge/items/[id]/restore` 恢复版本
- `/api/knowledge/items/[id]/versions` 版本列表

---

## 9. MCP 工具系统

### 9.1 架构

**文件**：
- [lib/mcp/mcp-tool-definitions.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/mcp/mcp-tool-definitions.ts) — 工具定义
- [lib/mcp/mcp-tool-executor.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/mcp/mcp-tool-executor.ts) — 工具执行器
- [lib/mcp/spectrum-connection-pool.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/mcp/spectrum-connection-pool.ts) — 光谱服务连接池

### 9.2 内置 MCP 工具

| 工具 | 端点 | 用途 |
|---|---|---|
| weather | `/api/mcp/weather` | 天气查询 |
| spectrum | `/api/mcp/spectrum` | 光谱数据查询 |
| config | `/api/mcp/config` | MCP 配置 |

### 9.3 MCP 市场

- `/mcp-store` — 用户浏览市场
- `/my-mcp` — 用户已安装的 MCP
- admin 后台 `/admin` → MCP 管理可上架
- 表 `mcp_servers`（通过 `lib/db/mcp-server-service.ts`）

### 9.4 工具调用流程

```
1. /api/chat 加载用户已启用的 MCP 工具定义
2. 注入到 streamText() 的 tools 参数
3. AI 决定调用工具 → onStepFinish 回调
4. executeToolCallsSmart() 并行执行
5. executeMCPToolCall() 调用对应 MCP server
6. 结果返回给 AI 继续推理
```

### 9.5 光谱服务

`spectrum-connection-pool.ts` 维护与光谱服务的连接池，URL 通过 `getSpectrumServiceUrl()` 从环境变量获取。

---

## 10. Agent Orchestrator（多智能体编排）

### 10.1 架构

**目录**：[lib/ai/agent-orchestrator/](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/ai/agent-orchestrator/)

| 文件 | 职责 |
|---|---|
| `orchestrator.ts` | 编排器主逻辑 |
| `global-manager.ts` | 全局编排器管理（`globalOrchestratorManager`） |
| `tool-manager.ts` | 工具管理 |
| `memory-manager.ts` | 记忆管理 |
| `alert-manager.ts` | 告警管理 |
| `monitor.ts` | 监控 |
| `types.ts` | 类型定义 |
| `index.ts` | 导出 `createOrchestrator` |

### 10.2 AgentContext

```typescript
interface AgentContext {
  userId: number
  sessionId: string
  messages: Message[]
  userPreferences?: UserPreferences
  deviceState?: DeviceData
  // ...
}
```

### 10.3 监控与告警

- `monitor.ts` — Agent 执行监控
- `alert-manager.ts` — 异常告警（写入 `agent_execution_logs` 表）
- `/api/admin/agent-alerts` — admin 查看告警
- `/api/admin/agent-metrics` — admin 查看指标

### 10.4 Agent 记忆

`memory-manager.ts` + `lib/db/agent-memory-service.ts` — 短期/长期记忆管理。

---

## 11. Skill System（技能系统）

### 11.1 架构

**目录**：[lib/ai/skill-system/](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/ai/skill-system/)

| 文件 | 职责 |
|---|---|
| `skill-manager.ts` | 技能管理器（带 5 分钟缓存） |
| `loaders.ts` | 技能加载器（builtin / disk / database） |
| `matchers.ts` | 技能匹配器 |
| `types.ts` | 类型定义 |
| `index.ts` | 导出 |

### 11.2 技能来源

| 来源 | 目录/表 | 说明 |
|---|---|---|
| **builtin** | 内置 | 核心技能 |
| **disk** | `.agents/skills/` | 系统技能（45+ 设计风格技能） |
| **database** | `skills` 表 | 用户自定义技能 |

### 11.3 技能结构

每个技能是一个目录，含：
- `SKILL.md` — 技能定义（含 triggers、prompt、metadata）
- `DESIGN.md`（可选）— 设计规范

### 11.4 匹配流程

```typescript
// lib/ai/skill-router-cached.ts
async function getRelevantSkillsContentCached(userId, message) {
  const manager = new SkillManager()
  const matches = await manager.matchSkills({
    userId,
    message,
    sessionId
  })
  return manager.generateSkillManifest(matches)
}
```

匹配器（`matchers.ts`）基于：
- 关键词触发
- 正则匹配
- 上下文感知

### 11.5 技能市场

- `/api/skills/store` — 市场列表
- `/api/skills/store/[id]` — 技能详情
- `/api/skills/user` — 用户已安装
- `lib/db/skill-store-service.ts` — 服务层

### 11.6 强制技能

`/api/chat` 接收 `mandatorySkillsEnabled` 参数，可强制启用某些技能。

---

## 12. IoT 设备控制（MQTT）

### 12.1 MQTT 服务

**核心文件**：[lib/mqtt-service.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/mqtt-service.ts)

**单例模式**：
```typescript
class MQTTService {
  private static instance: MQTTService
  
  static getInstance(): MQTTService {
    const globalForMqtt = globalThis as any
    if (!globalForMqtt.mqttService) {
      globalForMqtt.mqttService = new MQTTService()
    }
    return globalForMqtt.mqttService
  }
}
```

> ⚠️ 使用 `globalThis` 是为了在 Next.js 热重载时保持单例，避免多次连接。

### 12.2 配置

[lib/mqtt-config.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/mqtt-config.ts)：

```typescript
interface MQTTConfig {
  host: string           // MQTT_HOST
  port: number           // MQTT_PORT (默认 8883)
  username: string
  password: string
  subscribeTopic: string // 默认 meimefarm/basic_env_data
  publishTopic: string   // 默认 data/set
  useSSL: boolean        // 默认 true (mqtts://)
  keepalive: number      // 默认 60
  reconnectPeriod: number // 默认 5000
}
```

### 12.3 订阅的 Topics

```typescript
const topics = [
  config.subscribeTopic,              // meimefarm/basic_env_data
  'meimefarm/Spectrum',               // 批量光谱
  'meimefarm/sensor/node0701',        // channel1 (415nm Violet)
  'meimefarm/sensor/node0702',        // channel2 (445nm Blue)
  // ... node0703 - node0711
]
```

### 12.4 DeviceData 字段

```typescript
interface DeviceData {
  // 环境
  temperature: number      // °C × 10
  humidity: number         // % × 10
  light: number            // lux
  co2: number              // ppm
  earth_temp: number       // °C × 10
  earth_water: number      // %
  earth_ec: number         // μS/cm
  earth_n / earth_p / earth_k: number  // mg/kg

  // 继电器 (5-8)
  relay5/6/7/8: number     // 0/1

  // LED (1-4，实际硬件只有 3 路 BRG)
  led1/2/3/4: number       // 0-255

  // 11 通道光谱
  channel1-11: number
  // 1=415nm Violet, 2=445nm Blue, 3=480nm Cyan, 4=515nm Green
  // 5=555nm Yellow-Green, 6=590nm Yellow, 7=630nm Orange, 8=680nm Red
  // 9=NIR, 10=Clear, 11=Flicker

  // 步进电机
  stepper_direction: number  // 0=停, 1=正转/左, 2=反转/右
  stepper_position: number   // 当前脉冲位置
  // ...

  timestamp: number
}
```

### 12.5 设备 ID 映射

[lib/constants.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/constants.ts)：

```typescript
const DEVICE_IDS = {
  PUMP: 5,        // 水泵 → relay5 → node0601
  FAN: 6,         // 风扇 → relay6 → node0602
  RGB_LIGHT: 7,   // RGB灯 → relay7 → node0603
  WHITE_LIGHT: 8  // 白光灯 → relay8 → node0604
}
```

### 12.6 控制命令协议

```typescript
interface ControlCommand {
  type: 'relay' | 'led' | 'stepper' | 'stepper_reset' | 'stepper_preset'
  relayNum?: number       // 5-8
  newState?: number       // 0/1
  led1? led2? led3? led4?: number  // 0-255
  stepper_direction?: number       // 0/1/2
  stepper_pulses?: number
  stepper_run_time?: number        // 速度
  // ...
}
```

**继电器 payload**：
```json
{
  "rw_prot": {
    "Ver": "1.0.1",
    "dir": "down",
    "id": "随机ID",
    "w_data": [
      { "name": "node0601", "value": "1" }  // relay5 → node0601
    ]
  }
}
```

**LED payload**（⚠️ 硬件实际 BRG 顺序）：
```json
{
  "rw_prot": {
    "w_data": [
      { "name": "node0501", "value": "蓝" },
      { "name": "node0502", "value": "红" },
      { "name": "node0503", "value": "绿" }
    ]
  }
}
```

### 12.7 步进电机（云台）

**丝杆滑台参数**：
```typescript
STEPPER_MAX_RANGE_MM = 700           // 行程 700mm
STEPPER_PULSES_PER_10MM = 1600       // 每 10mm 1600 脉冲
STEPPER_MAX_PULSES = 112000          // 总脉冲 (700/10 × 1600)
STEPPER_DEFAULT_STEP = 1600          // 默认 10mm
```

**两步协议**（关键！）：
```
Step 1: 预设参数 (node0814=0)
  w_data: [
    { name: 'node0801', value: '8' },
    { name: 'node0814', value: '0' },          // 设置参数模式
    { name: 'node0817', value: String(pulses) }, // 脉冲数
    { name: 'node0803', value: speed }          // 速度
  ]

Step 2: 发送运动指令 (node0814=方向)
  w_data: [
    { name: 'node0801', value: '8' },
    { name: 'node0814', value: String(direction) }, // 1=左, 2=右
    { name: 'node0817', value: String(pulses) },
    { name: 'node0803', value: speed }
  ]
```

**软限位保护**：
```typescript
const SOFT_MAX_PULSES = STEPPER_MAX_PULSES - 400  // 保留 2.5mm 间隙
const SOFT_MIN_PULSES = 400

// 左移时检查
if (currentPos <= SOFT_MIN_PULSES) {
  throw new Error('已经到达左侧原点，严禁进一步左移')
}
// 自动 clamp 防止超限
```

**自动复位**：5 分钟无操作 → 自动复位到 0 位（左侧起点）。

**位置追踪**：
- 内存缓存 `cachedStepperPosition`（与 UI 同步的真值源）
- 异步写入 DB（`updateStepperPosition()`）
- 重启时从 DB 加载

### 12.8 阈值告警

`checkThresholds()` 检查：
- 温度 > 40°C 或 < 0°C
- 湿度 < 20%
- CO₂ > 3000 ppm
- 光照 < 1200 lux（日间 8-17 点）
- 土壤水分 < 10%
- 传感器 0 值异常

**冷却**：30 分钟全局冷却（`NOTIFICATION_COOLDOWN`），所有告警合并为一条企微通知。

### 12.9 数据流处理

**光谱数据去抖动**：
- 每个 `channelX` 记录最后更新时间
- 批量 `meimefarm/Spectrum` 消息只更新 **10 分钟内未单独更新**的 channel
- 防止单独节点消息被批量消息覆盖（避免 "10270 跳变"）

**环境数据净化**：
- `sanitizeEnvData()` 删除 payload 中所有 `channelX` 字段
- 防止光谱数据污染环境数据

**UI 通知去抖**：500ms 内不重复通知 listeners。

### 12.10 API 端点

| 端点 | 方法 | 用途 |
|---|---|---|
| `/api/mqtt/control` | POST | 发送控制命令 |
| `/api/mqtt/stream` | GET (SSE) | 实时数据流 |
| `/api/mqtt/simulate` | POST | 模拟数据（开发用） |
| `/api/device-history` | GET | 历史数据查询 |
| `/api/device-logs` | GET | 设备操作日志 |
| `/api/device-logs/test` | GET | 测试日志 |
| `/api/device-logs/debug` | GET | 调试日志 |
| `/api/ai/device-control` | POST | AI 触发的设备控制 |
| `/api/ai/device-status` | GET | 设备状态（给 AI 用） |
| `/api/monitor/snapshot` | GET | 监控快照 |

### 12.11 前端 Hook

[lib/hooks/use-device-control.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/hooks/use-device-control.ts)：
- `toggleRelay(deviceId, value)`
- `setLED(r, g, b, w)`
- `moveStepper(direction, pulses, speed)`
- `resetStepper()`
- 锁定机制（防止误操作）

[lib/hooks/use-device-data.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/hooks/use-device-data.ts)：
- SSE 连接 `/api/mqtt/stream`
- 自动重连
- 数据订阅

---

## 13. 自动化引擎（ReactFlow）

### 13.1 架构

**文件**：
- [lib/automation/engine.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/automation/engine.ts) — 引擎
- [app/automation/editor/page.tsx](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/app/automation/editor/page.tsx) — 可视化编辑器
- [lib/db/automation-service.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/db/automation-service.ts) — 数据层

### 13.2 三种节点类型

| 节点类型 | type | 作用 |
|---|---|---|
| 触发节点 | `triggerNode` | 规则入口（传感器触发 / 定时 / 手动） |
| 逻辑节点 | `logicNode` | 条件判断（compare / range / condition） |
| 动作节点 | `actionNode` | 执行动作（device / notification） |

### 13.3 graph_data 结构

```json
{
  "nodes": [
    {
      "id": "trigger-1",
      "type": "triggerNode",
      "data": {
        "type": "sensor",
        "label": "温度触发"
      }
    },
    {
      "id": "logic-1",
      "type": "logicNode",
      "data": {
        "type": "compare",
        "config": {
          "sensor": "temperature",
          "operator": "gt",
          "value": "35"
        }
      }
    },
    {
      "id": "action-1",
      "type": "actionNode",
      "data": {
        "type": "device",
        "device": "fan",
        "action": true,
        "label": "开启风扇"
      }
    }
  ],
  "edges": [
    { "source": "trigger-1", "target": "logic-1" },
    { "source": "logic-1", "target": "action-1" }
  ]
}
```

### 13.4 逻辑节点类型

#### compare（比较）
```typescript
{
  type: 'compare',
  config: {
    sensor: 'temperature',  // temp/hum/soil/co2/light/temperature/humidity/soil_moisture
    operator: 'gt',         // gt/lt/eq/gte/lte
    value: '35'
  }
}
```

**传感器别名映射**：
```typescript
const sensorKeyMap = {
  'temp': 'temperature',
  'hum': 'humidity',
  'soil': 'soil_moisture',
  'co2': 'co2',
  'light': 'light',
  // ... 完整名
}
```

#### range（范围）
```typescript
{
  type: 'range',
  config: {
    sensor: 'humidity',
    min: '40',
    max: '70'
  }
}
```

#### condition（条件）
当前 MVP 实现为 pass-through（直接通过），未来支持 AND/OR。

### 13.5 引擎执行

```typescript
class AutomationEngine {
  // 评估规则（检查触发条件）
  static evaluate(rule, context): AutomationAction[]
  
  // 强制执行（跳过触发条件检查）
  static forceExecute(graphData, context): AutomationAction[]
  
  // 遍历图（DFS）
  private static traverse(currentId, nodes, edges, context, actions)
  
  // 评估逻辑节点
  private static evaluateLogic(node, context): boolean
}
```

### 13.6 自动化上下文

```typescript
interface AutomationContext {
  sensorData?: {
    temperature: number
    humidity: number
    light: number
    co2: number
    soil_moisture: number
  }
  vlmResult?: {
    confidence: number
    label: string
    description: string
  }
  timestamp: number
}
```

### 13.7 动作执行

`MQTTService.executeAction(action)`：
- **device**：映射抽象设备到具体命令（fan→relay6, pump→relay5, light→relay7）
- **notification**：发送企微通知 + 通过 BerryBot 发送给 super_admin

### 13.8 触发方式

| 触发类型 | 触发时机 |
|---|---|
| **sensor** | MQTT 数据上行时（`handleMessage` 中检查） |
| **schedule** | 调度器（cron） |
| **manual** | 用户手动点击执行（`/api/automation/execute`） |

### 13.9 AI 生成自动化策略

- `/api/automation/generate` — AI 根据 natural language 生成 graph_data
- 前端编辑器支持 AI 辅助创建
- 生成的内容含 `triggerNode` / `logicNode` / `actionNode` 标记，被 `filterBareTaskListJson` 保护

### 13.10 API 端点

| 端点 | 方法 | 用途 |
|---|---|---|
| `/api/automation/rules` | GET/POST | 列表/创建 |
| `/api/automation/rules/[id]` | GET/PUT/DELETE | 详情/更新/删除 |
| `/api/automation/execute` | POST | 手动执行 |
| `/api/automation/generate` | POST | AI 生成 |

---

## 14. 调度器（Scheduler Runner）

### 14.1 架构

**文件**：[lib/scheduler/runner.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/scheduler/runner.ts)

**单例模式**：
```typescript
class SchedulerRunner {
  private static instance: SchedulerRunner
  
  static getInstance(): SchedulerRunner {
    if (!SchedulerRunner.instance) {
      SchedulerRunner.instance = new SchedulerRunner()
    }
    return SchedulerRunner.instance
  }
}
```

### 14.2 任务类型

| 类型 | 字段 | 说明 |
|---|---|---|
| **cron 任务** | `cron_expression` | 周期性，使用 `node-cron` |
| **一次性任务** | `execute_at` | 延时执行，使用 `setTimeout` |

### 14.3 action_type 支持

| action_type | 处理方式 |
|---|---|
| `relay` | 构造 relay 命令发送 MQTT |
| `led` | 构造 led 命令发送 MQTT |
| `agent` | 前端拉取执行（后端仅记录触发） |
| `reminder` | 前端拉取执行 |

### 14.4 setTimeout 32-bit 溢出处理

```typescript
const MAX_SETTIMEOUT_DELAY = 2 ** 31 - 1  // 约 24.8 天

if (delay <= MAX_SETTIMEOUT_DELAY) {
  // 直接 setTimeout
} else {
  // 递归分阶段调度
  scheduleLongDelayTask(task, delay)
}
```

### 14.5 过期任务处理

- 延迟 ≤ 0 且 > -60s：立即执行
- 延迟 ≤ -60s：直接删除（太久已无意义）
- 成功执行后删除一次性任务
- 失败保留记录以便排查

### 14.6 初始化流程

```typescript
async init() {
  if (this.isInitialized) return
  if (this.initPromise) return this.initPromise  // 防并发
  
  this.initPromise = this._doInit()
  try {
    await this.initPromise
  } finally {
    this.initPromise = null
  }
}

async _doInit() {
  await this.refreshTasks()
  this.isInitialized = true
}

async refreshTasks() {
  this.stopAll()                          // 停止所有现有任务
  const tasks = await getActiveTasks()    // 加载活跃任务
  const mqtt = MQTTService.getInstance()
  if (!mqtt.isConnected()) await mqtt.connect()  // 确保 MQTT 连接
  for (const task of tasks) this.scheduleTask(task)
}
```

### 14.7 API 端点

| 端点 | 方法 | 用途 |
|---|---|---|
| `/api/scheduler/init` | POST | 初始化调度器 |
| `/api/scheduler/tasks` | GET/POST/DELETE | 任务 CRUD |
| `/api/scheduler/tasks/[id]` | GET/PUT/DELETE | 单任务操作 |

### 14.8 前端初始化

`components/scheduler-init.tsx` 在应用启动时调用 `/api/scheduler/init`。

---

## 15. 实时通信（SSE / WebSocket）

### 15.1 SSE — 设备数据流

**端点**：`/api/mqtt/stream`（GET）

```typescript
// 简化逻辑
const stream = new ReadableStream({
  start(controller) {
    const unsubscribe = MQTTService.getInstance().subscribeToData((data) => {
      controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
    })
    req.signal.addEventListener('abort', () => {
      unsubscribe()
      controller.close()
    })
  }
})
return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  }
})
```

前端 `useDeviceData` Hook 通过 `EventSource` 订阅。

### 15.2 SSE — 用户事件流

`/api/user-events/stream` — 用户级事件（消息通知、系统通知等）。

### 15.3 WebSocket — 语音

`server/ws-server.js`（端口 3002）：
- 客户端 WS → ws-server
- ws-server → DashScope Realtime API（wss://dashscope.aliyuncs.com/api-ws/v1/realtime）
- 双向透传 + 配额检查 + 配额扣减

### 15.4 WebSocket — Yjs 协同

`server/yjs-server.js`（端口 1234）：
- 知识库文档协同编辑
- `YJS_AUTH_TOKEN` 控制访问

### 15.5 WebSocket — 摄像头流

`/api/stream-proxy` / `/api/stream-rtmp` — 摄像头视频流代理。

---

## 16. 语音助手（XiaoZhi）

### 16.1 架构

**目录**：[lib/xiaozhi/](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/xiaozhi/)

| 文件 | 职责 |
|---|---|
| `audioCapture.ts` | 麦克风音频采集 |
| `realtimeClient.ts` | DashScope Realtime 客户端 |
| `fastRTCClient.ts` | FastRTC 客户端 |
| `tts-preloader.ts` | TTS 预加载 |
| `voice-commands.ts` | 语音指令处理 |
| `monitor-snapshot.ts` | 监控快照（用于 VLM 分析） |

### 16.2 唤醒词

- **Picovoice Porcupine** — 离线唤醒词检测
- 自定义唤醒词（如 "莓小智"）

### 16.3 实时对话流程

```
1. 用户唤醒 → audioCapture 开始采集
2. realtimeClient 连接 ws://localhost:3002
3. ws-server 代理到 DashScope Realtime
4. 用户语音 → ASR 转写 → AI 推理 → TTS 播放
5. response.done 事件触发配额扣减（仅当用户说话 ≥2 字 + AI 回复 ≥5 字）
```

### 16.4 配额

- `/api/voice/deduct-quota` — 扣减语音配额
- `/api/user/settings` — 查询配额（`quota.can_use`）
- 每日配额，超额拒绝连接

### 16.5 TTS

- `/api/ai/tts` — 文本转语音
- DashScope TTS / CosyVoice
- `tts-preloader.ts` 预加载常用回复

### 16.6 ASR

- `/api/speech/recognize` — 语音识别
- Qwen ASR

### 16.7 VLM 视觉分析

- `/api/vlm/analyze-frame` — 摄像头帧分析
- `/api/ai/camera-capture` — 摄像头抓拍
- 用于病虫害识别、生长状态评估

### 16.8 环境变量

```bash
SKIP_VOICE_AUTH=true          # 跳过语音认证（开发用）
DASHSCOPE_API_KEY=sk-xxx      # DashScope API Key
```

---

## 17. API 层设计

### 17.1 路由组织

Next.js App Router，所有 API 在 `app/api/` 下，按业务模块分组：

```
app/api/
├── admin/             # 管理员接口
│   ├── users/         # 用户管理
│   ├── ai-providers/  # AI 提供商
│   ├── ai-models/     # AI 模型
│   ├── ai-features/   # AI 功能开关
│   ├── mcp/           # MCP 管理
│   ├── agent-alerts/  # Agent 告警
│   ├── agent-metrics/ # Agent 指标
│   ├── settings/      # 系统设置
│   ├── banned-ips/    # 封禁 IP
│   ├── access-logs/   # 访问日志
│   ├── announcement/  # 公告
│   ├── upload/        # 上传
│   ├── email-verification-stats/
│   ├── monitor-version/
│   ├── device-control-version/
│   └── dashboard-version/
├── ai/                # AI 服务
│   ├── cron/          # AI 定时任务
│   ├── monitor/       # AI 监控
│   ├── providers/     # AI 提供商
│   ├── tts/           # TTS
│   ├── device-control/
│   ├── device-status/
│   ├── daily-briefing/
│   ├── daily-insight/
│   ├── generate-schedule/
│   ├── memory-report/
│   ├── optimize-prompt/
│   ├── scheduled-analysis/
│   ├── suggest-followups/
│   └── camera-capture/
├── ai-features/       # AI 功能配置
├── auth/              # 认证
│   ├── login/ logout/ me/
│   ├── register/ verify-email/
│   ├── forgot-password/ reset-password/
│   ├── send-verification/
│   ├── ticket/check/
│   ├── wechat/ wework/ qq/ alipay/  # 三方 OAuth
├── automation/        # 自动化
│   ├── rules/
│   ├── execute/
│   └── generate/
├── chat/              # AI 对话
│   ├── typing/
│   └── upload/
├── citations/         # 引用
├── device-history/    # 设备历史
├── device-logs/       # 设备日志
├── direct-messages/   # 私聊
├── friends/           # 好友
├── groups/            # 群组
├── greenhouse/cameras/ # 温室摄像头
├── internal/          # 内部接口
│   ├── maintenance/
│   └── security/
├── knowledge/         # 知识库（详见第 8 节）
├── mcp/               # MCP 工具
├── mcp-store/         # MCP 市场
├── members/           # 会员
├── messages/          # 消息
├── mqtt/              # MQTT 设备控制（详见第 12 节）
├── plant-growth/      # 植物生长
├── reports/           # 报告
├── scheduler/         # 调度器（详见第 14 节）
├── sessions/          # 会话
├── settings/          # 设置
├── skills/            # 技能
├── speech/recognize/  # ASR
├── stream-proxy/      # 流代理
├── stream-rtmp/       # RTMP 流
├── user/              # 用户
├── user-events/       # 用户事件
├── users/block/       # 封禁用户
├── voice/deduct-quota/ # 语音配额
├── vlm/analyze-frame/ # VLM 分析
└── weather/           # 天气
```

### 17.2 路由约定

- 所有 API 路由使用 `export const runtime = 'nodejs'`（不用 edge，因依赖 pg/fs）
- 动态路由用 `[id]` 文件夹
- 流式响应用 `ReadableStream`
- 错误统一返回 `{ error: string }` + 合适的 HTTP status

### 17.3 鉴权模式

```typescript
// 大部分 API 的标准开头
const user = await getCurrentUser()
if (!user) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

// 管理员接口额外检查
if (user.role !== 'admin' && user.role !== 'super_admin') {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}
```

### 17.4 内部接口

`/api/internal/*` 路由仅供内部服务调用（如 middleware 调用），需要 `INTERNAL_API_SECRET` 鉴权。

---

## 18. 中间件（Middleware）

**文件**：[middleware.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/middleware.ts)（343 行）

### 18.1 执行顺序

```
请求进入
  ↓
1. 静态资源 / _next / api/internal → 直接放行
  ↓
2. 限流检查（/api/internal/security/check）
  ↓
3. 维护模式检查（/api/internal/maintenance/check）
  ↓
4. 移动端 UA 检测 → 重写到 /xxx-ios
  ↓
5. 路由保护：
   - /admin, /super-secure-admin → 非 admin 重定向 /
   - /dashboard, /monitor, ... → 无 token 重定向 /login
  ↓
6. 放行到 Next.js
```

### 18.2 移动端重定向

```typescript
const MOBILE_ROUTES = {
  '/monitor': '/monitor-ios',
  '/device-control': '/device-control-ios',
  '/dashboard': '/dashboard-ios',
  // ...
}
```

### 18.3 限流配置

- 动态从 `/api/internal/security/config` 加载（admin 可调）
- 超限 IP 加入 `banned_ips` 表
- 封禁 IP 直接返回 429

### 18.4 Edge Runtime

middleware 默认运行在 Edge runtime，因此**不能直接访问 PostgreSQL**，所有 DB 操作通过内部 API 调用。

---

## 19. 部署架构（Docker + Nginx）

### 19.1 docker-compose.yml 服务

| 服务 | 镜像 | 端口 | 作用 |
|---|---|---|---|
| `db` | postgres:16-alpine | 5432 | PostgreSQL 数据库 |
| `web` | 本地构建 Dockerfile | 3000, 3002 | Next.js + 语音 WS |
| `yjs-ws` | 本地构建 Dockerfile | 1234 | Yjs 协同 WS |
| `nginx` | nginx:alpine | 80, 443 | 反向代理 |

### 19.2 Dockerfile（multi-stage）

```dockerfile
# Stage 1: base - 安装 pnpm
FROM docker.m.daocloud.io/node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

# Stage 2: deps - 安装依赖
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++ git
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm config set registry https://registry.npmmirror.com && \
    pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile

# Stage 3: builder - 构建
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=3072"  # 3GB 内存限制
ENV GENERATE_SOURCEMAP=false
RUN pnpm build --webpack || pnpm build   # ⭐ 4GB 服务器优先 webpack

# Stage 4: runner - 运行
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN apk add --no-cache tzdata su-exec ffmpeg wget
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server ./server
COPY --from=builder /app/.agents ./.agents
COPY --from=builder /app/data ./data
EXPOSE 3000 3002
CMD ["/app/entrypoint.sh"]
```

### 19.3 docker-entrypoint.sh

容器启动脚本，负责：
1. 修复 data/uploads 目录权限
2. 启动 Next.js (`next start`)
3. 启动语音 WS (`node server/ws-server.js`)

### 19.4 Nginx 配置

`nginx/nginx.conf` 主要职责：
- HTTP → HTTPS 重定向
- 静态资源代理（`/uploads`）
- Next.js 反向代理（`/` → web:3000）
- WebSocket 透传（`/ws` → web:3002，`/yjs` → yjs-ws:1234）
- 维护页路由（admin 开启维护模式时显示 `maintenance.html`）
- SSL 证书（`nginx/certs/`）

### 19.5 低内存构建

针对 4GB 服务器：
- `build-low-memory.ps1` / `build-low-memory.sh` — 低内存构建脚本
- `NODE_OPTIONS=--max-old-space-size=3072` — 限制 Node 内存
- `GENERATE_SOURCEMAP=false` — 禁用 source map
- 优先 webpack 而非 turbopack（内存占用更低）

### 19.6 部署脚本

- `deploy.ps1` / `deploy.sh` — 一键部署
- `docker-build.ps1` / `docker-build.sh` — Docker 构建
- `generate-certs.ps1` — SSL 证书生成

### 19.7 持久化卷

| 卷 | 用途 |
|---|---|
| `pgdata` | PostgreSQL 数据 |
| `./data` → `/app/data` | 运行时配置（ai-providers-config.json 等） |
| `./public/uploads` → `/app/public/uploads` | 用户上传文件 |

---

## 20. 环境变量参考

### 20.1 基础配置

| 变量 | 必填 | 示例 | 说明 |
|---|---|---|---|
| `NODE_ENV` | ✅ | `production` | 环境 |
| `PORT` | ✅ | `3000` | Next.js 端口 |
| `JWT_SECRET` | ✅ | ≥32 字符 | JWT 签名密钥 |
| `INTERNAL_API_SECRET` | ✅ | 任意字符串 | 内部 API 鉴权密钥 |
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://yidiudiu1.top` | 前端公开 URL |
| `APP_URL` | ✅ | `https://stravision.site` | 后端 URL |
| `TZ` | ✅ | `Asia/Shanghai` | 时区 |

### 20.2 数据库

| 变量 | 必填 | 示例 | 说明 |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host:5432/db` | PostgreSQL 连接串 |
| `POSTGRES_DB` | ✅ | `stravision` | docker-compose 用 |
| `POSTGRES_USER` | ✅ | `postgres` | docker-compose 用 |
| `POSTGRES_PASSWORD` | ✅ | `xxx` | docker-compose 用 |

### 20.3 MQTT

| 变量 | 默认值 | 说明 |
|---|---|---|
| `MQTT_HOST` | — | MQTT broker 地址 |
| `MQTT_PORT` | `8883` | 端口 |
| `MQTT_USERNAME` | — | 用户名 |
| `MQTT_PASSWORD` | — | 密码 |
| `MQTT_SUBSCRIBE_TOPIC` | `meimefarm/basic_env_data` | 订阅主题 |
| `MQTT_PUBLISH_TOPIC` | `data/set` | 发布主题 |
| `MQTT_USE_SSL` | `true` | 启用 TLS |
| `MQTT_KEEPALIVE` | `60` | 心跳秒 |
| `MQTT_RECONNECT_PERIOD` | `5000` | 重连间隔 ms |

### 20.4 AI 提供商

| 变量 | 说明 |
|---|---|
| `SYSTEM_OPENAI_API_KEY` | 系统 OpenAI 兼容 API Key（兜底） |
| `SYSTEM_OPENAI_BASE_URL` | 系统默认 baseUrl |
| `SYSTEM_GLM_API_KEY` | 智谱 GLM API Key（优先级高于 OpenAI） |
| `SYSTEM_GLM_BASE_URL` | 默认 `https://open.bigmodel.cn/api/paas/v4` |
| `DASHSCOPE_API_KEY` | 阿里 DashScope API Key（语音 + AI） |

> 大部分 AI 提供商通过 `data/ai-providers-config.json` 配置（admin 后台），不依赖环境变量。

### 20.5 三方登录

| 变量 | 说明 |
|---|---|
| `WECHAT_APP_ID` / `WECHAT_APP_SECRET` | 微信网页 |
| `WECHAT_OPEN_APP_ID` / `WECHAT_OPEN_APP_SECRET` | 微信开放平台 |
| `WEWORK_CORP_ID` / `WEWORK_AGENT_ID` / `WEWORK_CORP_SECRET` | 企业微信 |
| `QQ_CLIENT_ID` / `QQ_CLIENT_SECRET` | QQ 互联 |
| `ALIPAY_APP_ID` / `ALIPAY_PRIVATE_KEY` / `ALIPAY_PUBLIC_KEY` | 支付宝 |

### 20.6 邮件

| 变量 | 说明 |
|---|---|
| `RESEND_API_KEY` | Resend 邮件服务 API Key |
| `RESEND_FROM_EMAIL` | 发件人地址 |

### 20.7 天气

| 变量 | 说明 |
|---|---|
| `WEATHER_API_KEY` | 和风天气（旧） |
| `TENCENT_MAP_KEY` / `TENCENT_MAP_SK` | 腾讯地图 |
| `TIANQI_APPID` / `TIANQI_APPSECRET` | tianqiapi.com |

### 20.8 验证码

| 变量 | 说明 |
|---|---|
| `NEXT_PUBLIC_ALIYUN_CAPTCHA_LOGIN_SCENE_ID` | 登录场景 ID |
| `NEXT_PUBLIC_ALIYUN_CAPTCHA_REGISTER_SCENE_ID` | 注册场景 ID |
| `NEXT_PUBLIC_ALIYUN_CAPTCHA_PREFIX` | 前缀 |
| `ALIYUN_ACCESS_KEY_ID` / `ALIYUN_ACCESS_KEY_SECRET` | 阿里云 AK |
| `ALIYUN_CAPTCHA_ENDPOINT` | 验证码端点 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile |

### 20.9 语音

| 变量 | 说明 |
|---|---|
| `WS_SERVER_PORT` | 语音 WS 端口（默认 3002） |
| `NEXT_SERVER_URL` | WS Server 调用 Next.js 的 URL |
| `SKIP_VOICE_AUTH` | 跳过语音认证（开发用） |

### 20.10 Yjs 协同

| 变量 | 默认值 | 说明 |
|---|---|---|
| `YJS_WS_PORT` | `1234` | Yjs WS 端口 |
| `YJS_WS_HOST` | `0.0.0.0` | 监听地址 |
| `NEXT_PUBLIC_YJS_WS_URL` | `ws://localhost:1234` | 前端连接 URL |
| `YJS_AUTH_TOKEN` | — | 鉴权 token |

### 20.11 企微通知

| 变量 | 说明 |
|---|---|
| `WEWORK_CORP_ID` | 企微企业 ID |
| `WEWORK_AGENT_ID` | 应用 ID |
| `WEWORK_CORP_SECRET` | 应用 Secret |

### 20.12 告警时区

| 变量 | 默认值 | 说明 |
|---|---|---|
| `ALERT_TIMEZONE` | `Asia/Shanghai` | 告警时间显示时区 |

---

## 21. 开发工作流与规范

### 21.1 本地开发

```bash
# 1. 安装依赖
pnpm install

# 2. 复制环境变量
cp .env.local.example .env.local  # 如有
# 编辑 .env.local 填入实际密钥

# 3. 启动 PostgreSQL（推荐 docker）
docker run -d --name pg -e POSTGRES_PASSWORD=xxx -e POSTGRES_DB=stravision -p 5432:5432 postgres:16-alpine

# 4. 开发模式
pnpm dev

# 5. 完整启动（含语音 WS）
pnpm start:all
```

### 21.2 代码规范

- **TypeScript**：`tsconfig.json` 严格模式
- **ESLint**：`eslint.config.mjs`
- **next.config.ts**：`typescript.ignoreBuildErrors: true`（⚠️ 构建不校验 TS 错误，开发时需自行保证类型正确）
- **不使用 tsc**（用户偏好）— 类型检查依赖 IDE
- **包管理**：pnpm（禁用 npm/yarn）

### 21.3 分支与提交

- 主分支：`main`
- 提交信息：建议遵循 Conventional Commits（feat / fix / docs / refactor / chore）

### 21.4 文件组织约定

| 类型 | 位置 |
|---|---|
| 页面 | `app/<route>/page.tsx` |
| API 路由 | `app/api/<route>/route.ts` |
| 业务逻辑 | `lib/<module>/<service>.ts` |
| DB 服务 | `lib/db/<service>-service.ts` |
| React Hook | `lib/hooks/use-<feature>.ts` |
| UI 组件 | `components/<category>/<component>.tsx` |
| 基础组件 | `components/ui/<component>.tsx`（shadcn/ui） |
| 类型定义 | `lib/types/<feature>-types.ts` |
| 常量 | `lib/constants.ts` |
| 配置 | `lib/<feature>-config.ts` |

### 21.5 命名约定

- 文件名：kebab-case（如 `mqtt-service.ts`）
- 组件文件名：PascalCase 或 kebab-case（混用，倾向 kebab-case）
- 类名：PascalCase
- 函数/变量：camelCase
- 常量：UPPER_SNAKE_CASE
- 类型/接口：PascalCase
- DB 表名：snake_case（如 `sensor_readings`）
- DB 字段：snake_case

### 21.6 UI 设计约定（来自用户偏好）

- **极简风格，大厂 UI 感**
- **Ant Design** 为主，shadcn/ui 为辅
- **A2UI 协议**（`lib/a2ui/berry-protocol.ts`）
- **主色**：Ant Design 蓝 `#1677ff`（❌ 不用橙色渐变）
- **侧边栏**：底层背景 + 顶部对话区圆角卡片（无阴影）
- **发送按钮**：normal 字重（400，非 500）
- **业务卡片**：统一 XCard，统一配色
- **模型选择器**：不显示 Sparkles 图标
- **顶部控制栏**：管理/创建/.../X 按钮右对齐
- **不喜欢大抽屉和过大图标**
- **表单输入**：UI 表单优于文本输入
- **AI 输出**：❌ 不喜欢 mock/虚假的 agent 思考链

### 21.7 数据库操作约定

```typescript
// ✅ 推荐：使用 query/queryOne/execute
import { query, queryOne, execute, initDB } from '@/lib/db/database'

await initDB()  // 首次调用前确保初始化

const users = await query<User>('SELECT * FROM users WHERE role = $1', ['admin'])
const user = await queryOne<User>('SELECT * FROM users WHERE id = $1', [id])
await execute('UPDATE users SET display_name = $1 WHERE id = $2', [name, id])

// ❌ 禁止：直接使用 prisma client（本项目未启用）
```

### 21.8 设备控制约定

- 所有控制命令通过 `MQTTService.getInstance().sendControlCommand(command)`
- **必须**进行软限位检查（步进电机）
- 设备离线时禁用 AI 控制能力（`deviceOnline !== false`）
- 设备 ID 严格限制 5-8（继电器）

---

## 22. 常见开发任务

### 22.1 添加新的 API 路由

```bash
# 1. 创建文件
app/api/<module>/<action>/route.ts

# 2. 模板
import { getCurrentUser } from '@/lib/auth'
import { initDB } from '@/lib/db/database'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  
  await initDB()
  // 业务逻辑
  return Response.json({ data: [] })
}
```

### 22.2 添加新的数据表

```typescript
// lib/db/database.ts → initDB() 函数中添加
await execute(`
  CREATE TABLE IF NOT EXISTS new_table (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
  )
`)
```

### 22.3 添加新的设备控制类型

1. `lib/mqtt-service.ts` → `ControlCommand` 接口添加新类型
2. `buildControlPayload()` 添加协议构建逻辑
3. `lib/hooks/use-device-control.ts` 添加前端方法
4. `/api/mqtt/control` 路由适配

### 22.4 添加新的 AI 提供商

1. admin 后台 `/admin` → AI 提供商 → 添加新 provider
2. 配置写入 `data/ai-providers-config.json`
3. 无需改代码（动态加载）

### 22.5 添加新的技能

```bash
# 1. 创建技能目录
.agents/skills/<skill-name>/
├── SKILL.md       # 必需
└── DESIGN.md       # 可选

# 2. SKILL.md 结构
---
id: <skill-name>
name: <显示名>
description: <描述>
triggers:
  - <关键词1>
  - <关键词2>
---

<技能 prompt 内容>
```

### 22.6 添加新的自动化触发类型

1. `lib/automation/engine.ts` → `checkTrigger()` 添加新触发判断
2. `AutomationContext` 接口添加新上下文字段
3. `lib/mqtt-service.ts` → `handleMessage()` 中触发时构造新 context

### 22.7 修改 UI 主题

- `lib/ui/berry-theme.ts` — 主题定义
- `components/theme-provider.tsx` — 主题 Provider
- `app/globals.css` — 全局样式
- Tailwind 配置在 `app/globals.css` 中（Tailwind 4 模式）

### 22.8 添加新的中间件逻辑

[middleware.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/middleware.ts) 中添加，注意：
- middleware 运行在 Edge runtime
- 不能直接访问 DB（通过内部 API）
- 不能使用 Node.js 模块

### 22.9 调试 MQTT

```bash
# 1. 启用模拟数据
POST /api/mqtt/simulate

# 2. 查看实时数据
GET /api/mqtt/stream  # SSE

# 3. 查看设备日志
GET /api/device-logs
GET /api/device-logs/debug
GET /api/device-logs/test
```

### 22.10 调试 AI

```bash
# 1. 查看 AI 提供商配置
cat data/ai-providers-config.json

# 2. 查看 AI 功能配置
cat data/ai-features-config.json

# 3. 测试 prompt
POST /api/prompt-demo/chat

# 4. AI 监控
GET /api/ai/monitor
```

---

## 23. 关键注意事项与陷阱

### 23.1 ⚠️ Prisma 陷阱

- `prisma/schema.prisma` **基本为空**，不要试图用 `prisma migrate`
- 实际 schema 在 `lib/db/database.ts` 的 `initDB()` 中
- 数据访问用 `pg.Pool` 的 `query/queryOne/execute`
- Prisma 已安装但未实际使用（保留作未来迁移用）

### 23.2 ⚠️ Edge Runtime 陷阱

- middleware 运行在 Edge runtime，**不能**访问 PostgreSQL / fs
- `lib/db/database.ts` 检测 Edge runtime 会抛错
- 需要在 middleware 中读 DB 时，通过 `/api/internal/*` 调用

### 23.3 ⚠️ next.config.ts 构建配置

- `typescript.ignoreBuildErrors: true` — 构建不检查 TS 错误
- 开发时**必须**靠 IDE 保证类型正确
- `serverExternalPackages`: lightningcss, better-sqlite3, pg, pg-connection-string, bcryptjs — 这些包不打包进 bundle

### 23.4 ⚠️ 步进电机安全

- **软限位**：SOFT_MIN=400 脉冲，SOFT_MAX=111600 脉冲
- **5 分钟无操作自动复位**
- **两步协议**必须严格执行（先 preset 再 move）
- 位置真值源是内存缓存 `cachedStepperPosition`，DB 只是持久化备份
- 报错时**不要**强制继续，可能卡坏机械结构

### 23.5 ⚠️ MQTT 数据精度

- 温度/湿度是 ×10 的整数（253 = 25.3°C）
- `saveSensorReading()` 入库时除 10
- `latestData` 缓存保留 ×10 原值
- 前端展示时除 10
- **不要**在中间环节混淆两种单位

### 23.6 ⚠️ 光谱数据污染

- 环境数据 payload 中的 `channelX` 字段会被 `sanitizeEnvData()` 删除
- 批量 `meimefarm/Spectrum` 消息只更新 10 分钟未单独更新的 channel
- 出现 "10270 跳变" 检查 `shouldUpdate()` 逻辑

### 23.7 ⚠️ AI 输出过滤

- `filterBareTaskListJson()` 会拦截裸 `TASK_LIST` JSON
- 但**保护** `<TASK_LIST>` 标签包裹的内容
- **保护** `schedule_task` JSON
- **保护** 自动化策略 JSON（含 triggerNode/logicNode/actionNode）
- 修改过滤器要小心，避免误删合法内容

### 23.8 ⚠️ 配额预扣与退还

- `/api/chat` 在 try 块外声明 `quotaReserved` 和 `userId`
- 失败时外层 catch 退还配额
- **不要**在 try 内部 return，否则无法退还

### 23.9 ⚠️ globalThis 单例

- `MQTTService` / `SchedulerRunner` 使用 `globalThis` 保持单例
- 防止 Next.js 热重载时多次实例化
- 新增单例服务时遵循同样模式

### 23.10 ⚠️ 数据库 initDB 幂等性

- 所有 `CREATE TABLE` 都是 `IF NOT EXISTS`
- 每次服务启动都会调用 `initDB()`
- 修改表结构时用 `ALTER TABLE IF NOT EXISTS` 或迁移脚本

### 23.11 ⚠️ Embedding 向量存储

- 使用 JSON 字符串存储（**未用 pgvector**）
- 检索时全量加载到内存
- 大规模知识库（>10k chunks）有性能问题
- 未来可迁移到 pgvector

### 23.12 ⚠️ 移动端路由

- middleware 检测 UA 重写到 `-ios` 后缀路由
- 新增用户页面时**记得**添加对应的移动端版本
- 否则移动端访问会 404

### 23.13 ⚠️ 维护模式

- admin 通过 `/api/admin/settings/maintenance` 开启
- middleware 每次请求都检查 `/api/internal/maintenance/check`
- 开启后所有请求重定向到 `/maintenance`
- **API 请求也会被拦截**，注意保留 admin 接口可访问

### 23.14 ⚠️ 环境变量

- `JWT_SECRET` 必须 ≥ 32 字符，否则 jose 抛错
- `INTERNAL_API_SECRET` 必填，否则启动报错
- `DATABASE_URL` 必填
- AI 提供商优先用 `data/ai-providers-config.json`，环境变量仅作兜底

### 23.15 ⚠️ 构建内存

- 4GB 服务器用 `pnpm build --webpack`（不要用 turbopack）
- `NODE_OPTIONS=--max-old-space-size=3072`
- `GENERATE_SOURCEMAP=false`
- 用 `build-low-memory.sh` 脚本

### 23.16 ⚠️ 文件上传路径

- 用户上传文件存 `public/uploads/`
- docker-compose 挂载 `./public/uploads:/app/public/uploads`
- 知识库文件通过 `/api/knowledge/upload` 处理
- 头像通过 `/api/user/upload-avatar` 处理

### 23.17 ⚠️ Yjs 协同

- 需要独立启动 `yjs-ws` 服务（docker-compose 已配置）
- 前端连接 `NEXT_PUBLIC_YJS_WS_URL`
- 文档持久化在 `kb_yjs_documents` 表
- `YJS_AUTH_TOKEN` 控制访问（生产环境必填）

---

## 24. 测试

### 24.1 测试框架

- **vitest** — 单元测试
- 配置在 `package.json` 的 `test` 脚本

### 24.2 现有测试

| 文件 | 测试内容 |
|---|---|
| `app/api/chat/route.test.ts` | Chat API |
| `app/ai-assistant/page.test.tsx` | AI 助手页面 |
| `lib/ai/skill-system/__tests__/matchers.test.ts` | 技能匹配 |
| `lib/ai/skill-system/__tests__/skill-manager.test.ts` | 技能管理 |
| `lib/ai/agent-orchestrator/__tests__/monitor.test.ts` | Agent 监控 |
| `lib/ai/agent-orchestrator/__tests__/alert-manager.test.ts` | Agent 告警 |

### 24.3 运行测试

```bash
pnpm test              # 运行所有
pnpm test -- --watch   # watch 模式
pnpm test -- <pattern> # 指定文件
```

### 24.4 测试页面

- `/test-elder-friendly` — 适老化测试
- `/test-responsive-nav` — 响应式导航测试
- `/test-sources-design` — 来源设计测试
- `/test-sources-simple` — 简单来源测试
- `/demo/agent-showcase` — Agent 展示

---

## 25. 已知问题与改进方向

### 25.1 已知问题

1. **Prisma 未实际使用**：schema.prisma 为空，所有 schema 在 database.ts，存在迁移风险
2. **Embedding 全量加载**：未用 pgvector，大规模知识库性能瓶颈
3. **TS 构建错误被忽略**：`ignoreBuildErrors: true` 可能放过类型错误
4. **自动化 condition 节点**：AND/OR 多输入逻辑未完整实现（DFS 难处理）
5. **市场知识库虚拟订阅**：items 仍归原 owner，权限管理复杂
6. **移动端路由重复**：每个用户页面都要维护 `-ios` 版本

### 25.2 改进方向

1. **迁移到 Prisma + pgvector**：统一 schema 管理 + 向量索引
2. **自动化引擎升级**：支持 AND/OR 多输入逻辑、子图、循环
3. **移动端响应式统一**：用 responsive design 替代独立 `-ios` 路由
4. **AI 流式工具调用**：优化 parallel-tool-executor 的并行度
5. **Yjs 协同权限**：细化到条目级权限控制
6. **监控告警**：完善 Agent 执行监控和告警
7. **测试覆盖**：提升核心模块测试覆盖率

### 25.3 技术债

- `app/monitor/monitor-ugly.tsx` — 旧版监控页，可删除
- `app/api/ai/suggest-followups` — 未完全集成
- `lib/ai/skill-router.ts` / `skill-router-v2.ts` — 旧版路由器，已被 `skill-router-cached.ts` 替代
- `pages/api/xiaozhi/realtime.ts` — Pages Router 残留

---

## 26. 转交清单

### 26.1 必须交接的资产

- [ ] 源代码仓库（含完整 git 历史）
- [ ] `.env.local` 文件（含所有密钥）
- [ ] `data/ai-providers-config.json`（AI 提供商配置）
- [ ] `data/ai-features-config.json`（AI 功能开关）
- [ ] PostgreSQL 数据库（含生产数据）
- [ ] MQTT Broker 账号（HiveMQ Cloud）
- [ ] 各第三方平台账号：
  - [ ] 微信开放平台 / 公众平台
  - [ ] 企业微信管理后台
  - [ ] QQ 互联
  - [ ] 支付宝开放平台
  - [ ] 阿里云（DashScope / 验证码 / OCR）
  - [ ] 智谱 GLM
  - [ ] Resend 邮件
  - [ ] Cloudflare Turnstile
  - [ ] 腾讯地图
  - [ ] tianqiapi.com
- [ ] 服务器 SSH 凭证
- [ ] SSL 证书（`nginx/certs/`）
- [ ] Docker Hub / 镜像仓库账号（如有）
- [ ] 域名管理（DNS 解析）

### 26.2 文档清单

- [x] 本文档（PROJECT_HANDOVER.md）
- [x] [ADMIN_UI_MANUAL.md](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/ADMIN_UI_MANUAL.md) — 管理员操作手册
- [x] [USER_MANUAL.md](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/USER_MANUAL.md) — 用户操作手册
- [x] [docs/SKILL_SYSTEM_GUIDE.md](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/docs/SKILL_SYSTEM_GUIDE.md) — 技能系统指南
- [x] [KNOWLEDGE-COLLAB-README.md](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/KNOWLEDGE-COLLAB-README.md) — 知识库协作
- [x] [lib/ai/skill-system/README.md](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/ai/skill-system/README.md) — 技能系统 README
- [x] [changelog.md](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/changelog.md) — 更新日志
- [x] [RELEASE_NOTES.md](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/RELEASE_NOTES.md) — 发布说明
- [x] [README.md](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/README.md) — 项目 README

### 26.3 关键联系人

| 角色 | 联系方式 | 职责 |
|---|---|---|
| 原开发者 | （填入） | 项目原作者，负责答疑 |
| 运维 | （填入） | 服务器、数据库、MQTT |
| 业务方 | （填入） | 需求与验收 |

### 26.4 上手建议

1. **先读本文档**第 4 节（架构总览）和第 23 节（陷阱）
2. **本地跑通**：按第 21.1 节步骤
3. **熟悉代码**：从 `app/api/chat/route.ts` 入手理解 AI 对话流
4. **理解设备**：读 `lib/mqtt-service.ts` 全文（1100 行）
5. **试操作**：登录 admin 后台，按 [ADMIN_UI_MANUAL.md](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/ADMIN_UI_MANUAL.md) 操作一遍
6. **试用户**：注册普通用户，按 [USER_MANUAL.md](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/USER_MANUAL.md) 体验所有页面
7. **改一个小 bug**：熟悉 git 流程和部署

### 26.5 紧急情况处理

| 情况 | 处理 |
|---|---|
| 数据库挂了 | `docker-compose restart db` |
| Web 服务挂了 | `docker-compose restart web` |
| MQTT 断连 | 检查 HiveMQ Cloud 状态，`MQTTService` 会自动重连 |
| AI 不可用 | 检查 `data/ai-providers-config.json`，确认 apiKey 有效 |
| 步进电机卡住 | 立即断电，检查物理限位，重置 `stepper_position` |
| 维护模式卡住 | admin 调用 `/api/admin/settings/maintenance` 关闭 |
| IP 被误封 | admin 后台 `/admin` → 安全 → 解封 |

---

## 附录 A：关键文件速查

| 模块 | 关键文件 |
|---|---|
| 入口 | [app/layout.tsx](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/app/layout.tsx)、[app/page.tsx](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/app/page.tsx) |
| 配置 | [next.config.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/next.config.ts)、[middleware.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/middleware.ts) |
| 认证 | [lib/auth.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/auth.ts)、[lib/token.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/token.ts) |
| 数据库 | [lib/db/database.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/db/database.ts) |
| MQTT | [lib/mqtt-service.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/mqtt-service.ts)、[lib/mqtt-config.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/mqtt-config.ts) |
| AI 对话 | [app/api/chat/route.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/app/api/chat/route.ts) |
| AI 提供商 | [lib/ai/provider-resolver.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/ai/provider-resolver.ts) |
| 知识库检索 | [lib/ai/knowledge-search.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/ai/knowledge-search.ts) |
| Embedding | [lib/ai/embedding-service.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/ai/embedding-service.ts) |
| 自动化引擎 | [lib/automation/engine.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/automation/engine.ts) |
| 调度器 | [lib/scheduler/runner.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/scheduler/runner.ts) |
| 常量 | [lib/constants.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/constants.ts) |
| 设备 Hook | [lib/hooks/use-device-control.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/hooks/use-device-control.ts)、[lib/hooks/use-device-data.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/hooks/use-device-data.ts) |
| 语音 WS | [server/ws-server.js](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/server/ws-server.js) |
| 部署 | [Dockerfile](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/Dockerfile)、[docker-compose.yml](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/docker-compose.yml) |

## 附录 B：API 路由速查（150+ 端点）

> 完整列表见第 17 节，此处按使用频率排序常用端点。

### 高频端点
- `POST /api/chat` — AI 对话（流式）
- `GET /api/mqtt/stream` — 设备数据 SSE
- `POST /api/mqtt/control` — 设备控制
- `GET /api/auth/me` — 当前用户
- `POST /api/auth/login` / `POST /api/auth/logout` — 登录/登出
- `GET /api/user/settings` — 用户设置（含配额）
- `GET /api/knowledge/search` — 知识库搜索
- `POST /api/knowledge/upload` — 知识库上传
- `GET/POST /api/automation/rules` — 自动化规则
- `GET/POST /api/scheduler/tasks` — 调度任务

### 管理员端点
- `GET/POST /api/admin/users` — 用户管理
- `GET/POST /api/admin/ai-providers` — AI 提供商
- `GET/POST /api/admin/mcp` — MCP 管理
- `POST /api/admin/settings/maintenance` — 维护模式
- `GET/POST /api/admin/settings/rate-limit` — 限流配置
- `GET /api/admin/banned-ips` — 封禁 IP
- `GET /api/admin/access-logs` — 访问日志

### 内部端点（不对外）
- `GET /api/internal/maintenance/check` — 维护模式检查
- `GET /api/internal/security/config` — 安全配置
- `GET /api/internal/security/check` — 限流检查
- `POST /api/internal/security/ban` — 封禁 IP

---

**文档结束**

如有疑问，请先查阅：
1. 本文档相应章节
2. [ADMIN_UI_MANUAL.md](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/ADMIN_UI_MANUAL.md)
3. [USER_MANUAL.md](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/USER_MANUAL.md)
4. 代码注释（关键模块都有详细中文注释）

**祝开发顺利！** 🍓
