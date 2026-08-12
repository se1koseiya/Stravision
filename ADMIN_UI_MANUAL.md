# BerryRealm 管理后台操作手册

> 版本：v4.0 ｜ 适用对象：系统管理员 / 超级管理员 ｜ 更新日期：2026-07-07
>
> 访问入口：浏览器打开 `/admin` 路径，需使用管理员（admin）或超级管理员（super_admin）账号登录。

---

## 目录

1. [总览](#1-总览)
2. [界面布局](#2-界面布局)
3. [概览页（Dashboard）](#3-概览页dashboard)
4. [用户管理](#4-用户管理)
5. [AI 模型](#5-ai-模型)
6. [AI 提供商](#6-ai-提供商)
7. [模型市场](#7-模型市场)
8. [安全设置](#8-安全设置)
9. [公告管理](#9-公告管理)
10. [系统设置](#10-系统设置)
11. [MCP 市场](#11-mcp-市场)
12. [知识库市场](#12-知识库市场)
13. [Agent 技能](#13-agent-技能)
14. [常见问题与最佳实践](#14-常见问题与最佳实践)

---

## 1. 总览

BerryRealm 管理后台是一个基于 **Ant Design** 构建的统一管理控制台，采用浅色主题、左侧固定侧边栏 + 顶部固定头部 + 右侧内容区的经典三段式布局。主色调为 Ant Design 标准蓝 `#1677ff`，圆角 8px。

后台共包含 11 个功能模块，按侧边栏顺序为：

| # | 模块 | 图标 | 用途 |
|---|------|------|------|
| 1 | 概览 | DashboardOutlined | 查看系统统计与最近用户 |
| 2 | 用户管理 | UserOutlined | 增删改用户、配置权限与限额 |
| 3 | AI 模型 | RobotOutlined | 管理 AI 助手前端展示的模型清单 |
| 4 | AI 提供商 | CloudServerOutlined | 配置 AI 服务商接入、默认模型、Embedding、知识库参数 |
| 5 | 模型市场 | ShopOutlined | 只读浏览所有可用模型与统计 |
| 6 | 安全设置 | LockOutlined | IP 封禁、访问日志、速率限制 |
| 7 | 公告管理 | NotificationOutlined | 系统公告、更新日志、功能弹窗 |
| 8 | 系统设置 | SettingOutlined | AI 功能开关、速率限制、维护模式、摄像头 |
| 9 | MCP 市场 | ApiOutlined | 管理 MCP 插件市场 |
| 10 | 知识库市场 | BookOutlined | 管理面向用户订阅的市场知识库 |
| 11 | Agent 技能 | ToolOutlined | 管理 AI Agent 技能资产 |

---

## 2. 界面布局

### 2.1 侧边栏

- 固定在左侧，宽度 240px，折叠后 64px。
- 顶部 Logo 区显示 BerryRealm 标识。
- 折叠按钮位于顶部头部左侧，点击可展开/收起侧边栏。
- 菜单项为 inline 模式，点击切换对应功能模块。

### 2.2 顶部头部

- **左侧**：折叠/展开按钮 + 面包屑导航（显示当前模块路径）。
- **右侧**：
  - 通知铃铛图标（当前显示"暂无新通知"）。
  - 当前用户头像 + 用户名下拉菜单，包含：设置、返回首页、退出登录。

### 2.3 内容区

- 内容区背景色为浅灰 `#f5f5f5`，内边距 24px。
- 各模块内容以卡片（Card）形式呈现，卡片标题通常带蓝色主题图标。

---

## 3. 概览页（Dashboard）

进入后台默认显示概览页，提供系统级统计快照。

### 3.1 统计卡片

四个自适应宽度的统计卡片横向排列：

| 卡片 | 含义 | 图标颜色 |
|------|------|---------|
| 总用户 | 系统注册用户总数 | 蓝色 |
| 管理员 | admin + super_admin 角色用户数 | 橙色 |
| 会员 | member 角色用户数 | 绿色 |
| 系统状态 | 固定显示"正常" | 绿色对勾 |

### 3.2 最近用户表

显示最近注册的 5 个用户，包含以下列：

- **ID**：用户编号（等宽字体）
- **用户**：头像 + 用户名 + 邮箱
- **角色**：彩色标签
  - 超级管理员（红色）
  - 管理员（橙色）
  - 会员（蓝色）
  - 普通用户（灰色）
- **设备权限**：显示已授权设备数量，无权限显示"—"
- **操作**：编辑按钮（铅笔图标），点击跳转到用户编辑弹窗

---

## 4. 用户管理

管理系统中所有用户的账号信息、角色、会员等级、AI 限额与设备控制权限。

### 4.1 用户列表

卡片标题"用户管理"，右上角"新建用户"主按钮。

表格列（每页 20 条）：

| 列名 | 说明 |
|------|------|
| ID | 用户编号 |
| 用户 | 头像 + 用户名 + 邮箱 |
| 角色 | 超级管理员/管理员/会员/普通用户 标签 |
| 设备权限 | 授权设备数量标签 |
| 操作 | 编辑按钮 |

### 4.2 新建/编辑用户对话框

点击"新建用户"或某行的编辑按钮，弹出对话框（宽 520px）。

#### 基本信息字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 用户名 | Input | 是 | 用户登录名 |
| 邮箱 | Input | 新建必填 | 编辑时禁用，不可修改 |
| 密码 / 新密码 | Input.Password | 新建必填 | 编辑时留空表示不修改密码 |
| 头像 | Input + 上传 | 否 | 可手动输入 URL 或上传图片（限 2MB 以内图片） |
| 角色 | Select | 否 | 仅超级管理员可编辑，可选"普通用户/管理员" |
| 会员等级 | Select | 否 | free/pro/plus，切换时自动联动每日 AI 限额 |
| 每日 AI 限额 | Input(number) | 否 | min=0；会员等级联动：free=0、pro=70、plus=999999 |
| 额外余额 | Input(number) | 否 | min=0 |

#### 设备控制权限

分割线下方显示 9 个复选框（2 列布局），勾选即授予该用户对应设备的控制权限：

| 权限 ID | 设备 |
|---------|------|
| relay5 | 继电器 5（水泵） |
| relay6 | 继电器 6（风扇） |
| relay7 | 继电器 7（植物全光谱补光灯） |
| relay8 | 继电器 8（光照植物补光灯） |
| led1 | LED 1（红） |
| led2 | LED 2（绿） |
| led3 | LED 3（蓝） |
| led4 | LED 4（白/亮度） |
| stepper | 丝杆滑台（摄像头云台） |

#### 头像上传

- 接口：`POST /api/admin/upload`
- 限制：仅图片，小于 2MB
- 上传成功自动填入 avatar_url 字段

#### 权限说明

- **角色字段**：只有当前登录用户为 `super_admin` 时可编辑角色，否则字段禁用。
- 编辑用户时邮箱字段不可修改。

### 4.3 保存

点击"保存"按钮，前端校验通过后：
- 新建：`POST /api/admin/users`
- 编辑：`PUT /api/admin/users/{id}`

成功后关闭弹窗并刷新用户列表。

---

## 5. AI 模型

> 路径：侧边栏 → AI 模型
>
> 用途：管理 **AI 助手前端页面**展示给用户的模型清单（仅影响 UI 展示与排序，不涉及 API 连接）。

### 5.1 顶部操作按钮

| 按钮 | 行为 |
|------|------|
| 重新加载 | 重新拉取当前配置 |
| 添加模型 | 打开"添加模型"对话框 |
| 保存配置 | 提交所有修改到后端（**重要：所有增删改排序仅在本地状态，必须点击此按钮才生效**） |

### 5.2 模型列表

按分类（categories）分组渲染为多个卡片，每个分类卡片标题显示分类名 + "N 个模型"计数。

每个模型项为一行，包含：

- **上移/下移按钮**：调整模型顺序（首位上移禁用，末位下移禁用）
- **模型名称**（粗体）
- **模型 ID**（等宽字体代码块）
- **描述**（可选，灰色）
- **启用开关**：切换 enabled 字段（本地状态）
- **编辑按钮**：打开编辑对话框
- **删除按钮**：确认后从列表移除（本地状态）

> 移动操作会自动重新计算所有模型的 order 字段。

### 5.3 添加/编辑模型对话框

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 模型 ID | Input | 是 | 如 `qwen-max`；编辑时禁用 |
| 显示名称 | Input | 是 | 如 `Qwen Max` |
| 描述 | Input | 否 | 如"通义千问最强生产力工具" |
| 分类 | Select | 否 | 来自后端固定分类列表 |
| 图标 | Select | 否 | qwen/deepseek/moonshot/zhipu/minimax/sparkles |
| 启用此模型 | Switch | 否 | 默认开启 |

校验：模型 ID 和名称为空时阻止保存。

### 5.4 注意事项

- 本模块与"AI 提供商"是**两套独立的模型清单**：本模块管"前端展示给用户的模型选项"，AI 提供商管"后端可调用的 API 模型"。
- 不涉及 API Key、baseUrl、supportsVision 等技术参数（这些在 AI 提供商中配置）。

---

## 6. AI 提供商

> 路径：侧边栏 → AI 提供商
>
> 用途：后台最核心、最复杂的模块。管理 AI 服务商接入、默认模型、知识库 Embedding 模型、知识库全局参数。

副标题实时显示"共 N 个提供商 · M 个可用模型"。

### 6.1 自动选择模型卡（蓝色卡片）

控制用户未手动选择模型时系统自动使用的模型。

- **说明**：每次刷新 AI 助手页面时，未手动选择模型的用户将自动使用该模型。
- **下拉选择**：选项来自所有已启用提供商的已启用模型，按优先级升序排列，格式"图标 + 模型名 · 提供商名"。
- **保存按钮**：调 `PUT /api/admin/ai-providers/default-model`。
- **失效提示**：若配置的默认模型已失效，显示橙色提示"配置的默认模型已失效，将自动回退到当前生效项"。

### 6.2 知识库 Embedding 模型卡（橙色卡片）

配置知识库语义检索使用的向量生成模型。标签"影响 @知识库:xxx 检索"。

**配置流程**：
1. 在"提供商"下拉选择一个已启用且填了 API Key 的提供商；
2. 在"模型"下拉选择该提供商下已启用、且勾选了"作为 Embedding"或模型 ID 匹配 `embed` 的模型；
3. 可选填写"维度"（64-4096，步进 64）；
4. 切换"启用"开关；
5. 点击"保存"提交配置；
6. 可点击"测试 Embedding"验证连通性。

**测试结果区**：
- 成功：绿色背景，显示"✅ 成功生成 N 维向量"+ provider/model/dim 信息 + 前 8 维预览。
- 失败：红色背景，显示"❌ 错误信息"。

> **重要**：Embedding 配置仅影响**新上传**的文档，旧文档保留原向量。配置失败时系统会自动回退到 `local-hash-v1`（本地哈希，质量较低，仅作应急）。

### 6.3 知识库全局配置卡（蓝色卡片）

标签"所有魔数都可调"。说明：上传/分块/GLM-OCR/Rerank/检索/UI 行为全部可在此调整，改动立即对所有用户生效。

**顶部操作**：
- 展开/收起切换
- 恢复默认
- 保存（调 `POST /api/knowledge/config`）

**始终可见的三个核心开关**：

| 开关 | 说明 |
|------|------|
| GLM-OCR | PDF/图片自动调用智谱解析 |
| GLM Rerank | 检索后用智谱重排序提升精度 |
| 自动向量化 | 上传后自动调用 embedding |

**展开后的配置分组**（每组带 emoji 图标）：

| 分组 | 主要字段 |
|------|---------|
| 📁 上传大小上限（MB） | 文本/图片/文档/音频/视频/其他、提取最大字符 |
| ✂️ Embedding 分块 | 块大小、重叠字符、最小块、嵌入超时(秒) |
| 🧠 GLM 集成 | OCR 最大页数、OCR 截断、OCR 图片/文档上限、Rerank 候选上限、Rerank 混合权重(0-1) |
| 🔍 混合检索 | 关键词权重、默认 limit、子检索上限、tsvector 倍数、高亮参数、token 最小长度、相似推荐默认、摘要参数、推荐历史/最大/候选倍数、请求放大倍数、query 最大长度 |
| 📄 列表分页 | items 默认/最大 limit、备份默认 limit、推荐缓存默认 limit |
| 📏 字段长度上限 | 条目 title、集合 name、标签 name、单条最大 tag 数、摘要 maxLength |
| 🪟 UI 行为 | 列表分页、搜索防抖、标签云上限、推荐卡片上限、AI 上下文 chunks、每 chunk 长度、context 硬下限、列表/推荐预览字符 |
| 📝 编辑/创建行数 | 创建-最小/最大行、详情-最小/最大行 |
| 💾 备份 | 单次 batch、列表最大高度(px)、轮询刷新间隔(ms) |
| 🧪 Embedding 测试 | 测试文本最大字符、向量预览维度数、text 预览字符 |
| 📥 上传解析 | XLSX 每 sheet 行数上限 |

> **重要**：知识库全局配置改动**立即对所有用户生效**，无需重启。

### 6.4 提供商列表

- **空状态**：显示"尚未配置 AI 提供商"+ "添加提供商"按钮。
- **非空**：网格布局，每个提供商一张 ProviderCard。

#### ProviderCard 卡片

- 未启用的提供商整体透明度 0.6。
- **标题区**：
  - 左侧 40×40 圆角徽章（颜色按类型：openai 蓝/dashscope 绿/custom 紫/glm 青）+ 提供商名 + 默认金色 Tag + 类型 Tag + baseUrl（等宽字体灰色）。
  - 右侧操作：编辑、删除。
- **API Key 显示**：Key 图标 + 密钥文本或"(未设置)"。
- **模型列表**：每个模型一个 Tag，含图标 + 名称 + 能力图标（视觉蓝色 Camera/推理紫色 Brain/Embedding 琥珀色 BookOpen）+ 末尾"N 个模型"灰色 Tag。
- **底部操作栏**：
  - 左：启用/禁用 Switch。
  - 右：未默认时显示"设为默认"按钮，已默认时显示金色"当前默认"文字。

### 6.5 添加/编辑提供商对话框（宽 720px）

#### 快速模板（仅新建时显示）

4 个一键填充模板：

| 模板 | 类型 | 预填模型 |
|------|------|---------|
| 小米 MIMO | openai | mimo-v1 |
| OpenAI 官方 | openai | gpt-4o/gpt-4o-mini/o1/o3-mini |
| DeepSeek 官方 | openai | deepseek-chat/deepseek-reasoner |
| 智谱 GLM (BigModel) | glm | 9 个 GLM 模型（含 supportsVision/supportsReasoning/contextWindow） |

#### 表单字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ID | Input | 是 | 如 `xiaomi-mimo`；编辑时禁用 |
| 显示名称 | Input | 是 | 如"小米 MIMO" |
| API 类型 | Select | 否 | openai(OpenAI 兼容)/dashscope(阿里云百炼)/glm(智谱)/custom(自定义) |
| 优先级 | Input(number) | 否 | 1-100，数字越小越优先 |
| Base URL | Input | 是 | 根据 type 动态切换占位符 |
| API Key | Input.Password | 否 | 含显隐切换 |
| 启用 | Switch | 否 | — |
| 设为默认 | Switch | 否 | — |

#### 模型列表编辑器

- 标题"模型列表 (N)"+ "添加模型"按钮。
- 每行 4 列：模型 ID / 显示名 / 描述 / 复选框组 + 删除按钮。
- 复选框组：
  - 视觉（supportsVision）
  - 推理（supportsReasoning）
  - 可用于 Embedding（supportsEmbedding）

#### 保存校验

必填 ID/名称/Base URL；至少一个模型。

### 6.6 相关接口

| 操作 | 方法 | 端点 |
|------|------|------|
| 加载 | GET | `/api/admin/ai-providers` |
| 新增/更新 | POST/PUT | `/api/admin/ai-providers` |
| 删除 | DELETE | `/api/admin/ai-providers?id={id}` |
| 设为默认/启用切换 | PUT | `/api/admin/ai-providers` |
| 保存默认模型 | PUT | `/api/admin/ai-providers/default-model` |
| 保存 Embedding 配置 | PATCH | `/api/admin/ai-providers` |
| 测试 Embedding | POST | `/api/knowledge/embedding-config` |
| 保存知识库全局配置 | POST | `/api/knowledge/config` |

---

## 7. 模型市场

> 路径：侧边栏 → 模型市场
>
> 用途：**只读**浏览所有已配置提供商的可用模型，提供搜索、筛选、排序与统计可视化。无任何写操作。

### 7.1 统计卡片（5 列）

| 卡片 | 含义 |
|------|------|
| 总模型 | 所有提供商模型总数 |
| 已启用 | enabled 模型数 |
| 视觉模型 | enabled && supportsVision |
| 推理模型 | enabled && supportsReasoning |
| 提供商 | providers.length |

### 7.2 搜索与筛选

| 控件 | 说明 |
|------|------|
| 搜索框 | 匹配 name/id/providerName/description（不区分大小写） |
| 类型 | 全部/openai/dashscope/custom |
| 能力 | 全部/视觉/推理/视觉+推理 |
| 状态 | 已启用(默认)/已禁用/全部 |
| 排序 | 按提供商(默认)/按名称/按类型 |

> 默认筛选为"已启用"，需主动切换到"全部"才能看到禁用模型。

### 7.3 模型卡片网格

每个模型卡片显示：图标 + 名称 + 状态指示（绿色对勾=启用）+ 描述 + 能力 Tag（视觉蓝/推理紫）+ 提供商名 Tag。默认提供商显示金色"默认源"Tag。

### 7.4 按提供商分布

底部显示每个提供商的模型数量进度条。

---

## 8. 安全设置

> 路径：侧边栏 → 安全设置
>
> 用途：IP 封禁管理、访问日志查看、速率限制配置。

### 8.1 封禁 IP 管理（BannedIPsManager）

卡片标题"Banned IPs"，右上角红色"Ban IP"按钮。

#### 封禁列表表格

| 列名 | 说明 |
|------|------|
| IP Address | 封禁的 IP（等宽字体红色加粗） |
| Reason | 封禁原因，空值显示"-" |
| Banned By | 执行封禁的操作者 |
| Date | 封禁时间（yyyy-MM-dd HH:mm） |
| Action | "Unban"红色文字按钮，点击解封 |

#### 新增封禁对话框

| 字段 | 必填 | 说明 |
|------|------|------|
| IP Address | 是 | 占位"192.168.1.1" |
| Reason | 否 | 占位"Malicious activity" |

接口：封禁 `POST /api/admin/banned-ips`，解封 `DELETE /api/admin/banned-ips?ip={ip}`。

### 8.2 访问日志查看器（AccessLogsViewer）

卡片标题"Recent Access Logs"，右上角刷新按钮（loading 时图标旋转）。

固定加载最近 50 条访问记录（`limit=50`），无分页、无筛选。

| 列名 | 说明 |
|------|------|
| Time | 访问时间（MM-dd HH:mm:ss） |
| IP | 访问者 IP |
| Method | HTTP 方法（GET/POST 等） |
| Path | 请求路径（过长省略号截断，悬停显示完整） |
| Status | 状态码标签：< 400 绿色，≥ 400 红色 |

### 8.3 速率限制设置（RateLimitSettings）

> 注意：本组件同时出现在"安全设置"和"系统设置"两个模块中。

卡片标题带盾牌图标"Auto-Ban Thresholds"，右上角刷新按钮。

4 个数值字段（2×2 网格）：

| 字段 | 含义 | 示例 |
|------|------|------|
| Max Requests (per window) | 单时间窗口最大请求数 | 超出即触发速率限制 |
| Window Duration (ms) | 时间窗口（毫秒） | 60000 = 1 分钟 |
| Violation Limit | 违规次数上限 | 累计达到后 IP 自动封禁 |
| Ban Duration (ms) | 封禁时长（毫秒） | 86400000 = 24 小时 |

操作：
- 保存配置：`POST /api/admin/settings/rate-limit`
- 重新加载：`GET /api/admin/settings/rate-limit`

**联动关系**：速率限制的 violationLimit 和 banDuration 决定哪些 IP 会被自动封禁，自动封禁的 IP 会出现在封禁 IP 管理列表中，管理员可手动解封。

---

## 9. 公告管理

> 路径：侧边栏 → 公告管理
>
> 用途：向用户发送系统公告、版本更新日志、功能更新弹窗。

包含三个独立区块，自上而下排列。

### 9.1 系统公告发送（AnnouncementSender）

卡片标题"发布系统公告"（带客服图标）。

- **说明**：以"莓小智"身份向所有用户发送通知，消息直接出现在用户聊天列表中。
- **输入**：TextArea（8-12 行自适应），placeholder"输入公告内容... (支持换行)"。
- **发送**：`POST /api/admin/announcement`，body `{ content }`。
- **目标**：全员广播（无受众选择）。
- **格式**：纯文本（支持换行）。

### 9.2 更新日志发送（ChangelogSender）

卡片标题"发布更新日志"（带火箭图标），半透明白色背景。

#### 基础信息

| 字段 | 默认值 | 说明 |
|------|--------|------|
| 版本号 | v2.5.0 | 必填 |
| 发布日期 | 当天 | date 输入框 |
| 标题 | "系统更新公告：MCP 工具与智能托管优化" | — |
| 封面图片 | — | 点击虚线区域上传，限 5MB |

#### 三类更新列表

每个列表支持添加（+ 按钮）、编辑、删除条目：

| 列表 | 图标颜色 | placeholder |
|------|---------|-------------|
| 新功能（Features） | 蓝色火箭 | "新增了..." |
| 优化改进（Improvements） | 黄色编辑 | "优化了..." |
| 问题修复（Fixes） | 红色刷新 | "修复了..." |

> 校验：三类列表至少有一项非空。

#### 行动按钮（CTA）

| 字段 | 默认值 |
|------|--------|
| 按钮文字 | "前往体验新功能" |
| 跳转链接 | `/mcp-store` |

> 两者都非空时才生成 action。

#### 推送

接口：`POST /api/admin/announcement`，body `{ content: JSON.stringify(...), type: 'changelog' }`。

封面图上传接口：`POST /api/chat/upload`。

### 9.3 功能更新精准推送（FeatureAnnouncementAdmin）

> 本组件使用 Tailwind + lucide-react + framer-motion，风格与前两个略有差异。

卡片标题"功能更新精准推送 (Admin)"，右上角"保存所有更改"按钮。

#### 功能卡片列表

每个功能为一个可编辑卡片，左右两栏布局：

- **左侧媒体预览**（300px 宽）：显示图片或视频预览，无媒体时显示占位图标。
- **右侧编辑区**：
  - 标题（inline 编辑）
  - 描述（textarea）
  - 显示页面（逗号分隔路径，如 `/dashboard, /chat`）
  - 媒体类型切换（图片/视频）
  - 媒体链接输入 + 上传按钮

#### 数据结构

```
FeatureAnnouncement {
  id, title, description,
  mediaUrl, mediaType: "image"|"video",
  allowedPaths?: string[]
}
```

#### 操作

| 操作 | 说明 |
|------|------|
| 添加新功能卡片 | 底部虚线按钮，追加默认模板 |
| 删除功能卡片 | 卡片右上角垃圾桶图标 |
| 媒体上传 | `POST /api/admin/upload` |
| 保存所有更改 | `POST /api/announcements`，body `{ features }` |
| 加载列表 | `GET /api/announcements` |

> 弹窗只在符合 allowedPaths 的页面显示。

---

## 10. 系统设置

> 路径：侧边栏 → 系统设置
>
> 用途：AI 功能开关、速率限制、维护模式、摄像头配置。

包含两个卡片：AI 功能开关、基础设置。

### 10.1 AI 功能开关（AIFeaturesSettings）

卡片标题"AI 功能开关"（紫色火焰图标），右上角显示"N/M 已启用"计数。

控制 AI 回复中各类功能标签的渲染与执行权限。关闭某功能后 AI 不再输出对应标签、前端也不再渲染对应组件。

#### 分组开关

**组 1：UI 组件类**（蓝色点）

| 开关 | 标签代码 | 说明 |
|------|---------|------|
| 任务规划器 | `<TASK_LIST>` | 显示 AI 任务执行流程和进度 |
| 设备状态卡片 | `<DEVICE_BENTO>` | 显示环境数据和传感器读数 |
| 设备控制面板 | `<CONTROL_BENTO>` | 显示设备控制界面 |
| 监控画面 | `<MONITOR>` | 显示摄像头实时监控 |
| 定时任务列表 | `<SCHEDULED_TASKS>` | 显示系统定时任务管理界面 |
| 数据图表 | `<CHART>` | 显示 ECharts/Vega-Lite 可视化图表 |
| 光谱数据 | `<SPECTRAL>` | 显示光谱分析数据 |

**组 2：功能增强类**（紫色点）

| 开关 | 标签代码 | 说明 |
|------|---------|------|
| 思考过程 | `<REASONING>` | 显示 AI 推理思维链 |
| 引用来源 | `<SOURCES>` | 显示回答的参考来源 |
| 工具调用记录 | `<TOOL_USED>` | 显示 MCP 工具调用过程 |

**组 3：操作执行类**（橙色点）

| 开关 | 标签代码 | 说明 |
|------|---------|------|
| 定时任务创建 | `<SCHEDULE_TASK>` | 允许 AI 创建定时任务 |
| 设备控制指令 | JSON Control | 允许 AI 输出设备控制 JSON 指令 |
| AI 视觉巡检 | move_camera_and_look | 允许 AI 调用摄像头巡检 |

**组 4：预览类**（紫色点）

| 开关 | 标签代码 | 说明 |
|------|---------|------|
| HTML 预览 | HTML Preview | 显示 HTML 代码实时预览 |
| 网页预览 | `<WEB_PREVIEW>` | 显示网页内容预览 |

#### 底部操作

| 按钮 | 行为 |
|------|------|
| 保存配置 | `POST /api/admin/ai-features`；新配置在下次 AI 回复时生效 |
| 重置 | 恢复为默认配置（全部开启），需再次点击保存才生效 |

> **重要**：组 3 的三个开关控制 AI 的**实际执行权限**（不只是显示），关闭后 AI 无法创建定时任务/输出控制指令/调用摄像头巡检。

### 10.2 速率限制设置

与"安全设置"中的速率限制设置完全相同，参见 [8.3 节](#83-速率限制设置ratelimitsettings)。

### 10.3 维护模式设置（MaintenanceSettings）

卡片标题"系统维护模式"。

#### 配置字段

| 字段 | 类型 | 说明 |
|------|------|------|
| 维护模式开关 | Switch | 开启后除管理员外用户被重定向到维护页面 |
| 维护标题 | Input | 维护页面显示的标题 |
| 维护说明 | TextArea(4 行) | 维护页面显示的详细说明 |

#### 状态徽章

| 状态 | 颜色 |
|------|------|
| 开启中 | 橙色 |
| 运行中 | 绿色 |

#### 操作

- 加载：`GET /api/admin/settings/maintenance`
- 保存：`POST /api/admin/settings/maintenance`
  - 开启时按钮文字"保存并开启维护"（橙色）
  - 关闭时按钮文字"保存设置"（默认主色）

> **特殊行为**：维护模式关闭时，下方表单区域变暗且不可交互，必须先开启开关才能编辑标题和说明。本组件无定时计划功能，仅支持手动开关。

### 10.4 监控摄像头配置（CameraSettings）

卡片标题"监控摄像头配置"（蓝色摄像头图标）。

| 字段 | 说明 |
|------|------|
| 温室摄像头 A 流媒体地址 | 主摄像头 HLS/直播源 URL |
| 温室摄像头 B 流媒体地址 | 备用摄像头 URL，留空代表未接入 |

- 加载：`GET /api/greenhouse/cameras`
- 保存：`POST /api/greenhouse/cameras`
- 配置生效后将在监控页和 AI 视觉巡检中使用。

> 本组件配置的是**播放端流媒体 URL**（HLS 或直播源地址），不涉及 RTMP 推流参数。

---

## 11. MCP 市场

> 路径：侧边栏 → MCP 市场
>
> 用途：管理 MCP（Model Context Protocol）插件市场中的服务器条目。

### 11.1 顶部操作栏

- 搜索框：按 displayName 或 id 实时过滤。
- "Add MCP Server"主按钮：新建 MCP 服务器。

### 11.2 列表表格（每页 10 条）

| 列名 | 说明 |
|------|------|
| Priority | 紫色加粗"#优先级" |
| Icon | 48×40 圆角图标 |
| ID (Slug) | 等宽字体，可复制 |
| Display Name | 名称，official 显示蓝色对勾 |
| Category | Tag 展示 |
| Status | Published（绿色）/ Draft（灰色） |
| Actions | 编辑、删除（红色） |

### 11.3 新建/编辑对话框（宽 720px）

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| Server ID (Slug) | Input | — | 必填，如 `firecrawl` |
| Display Name | Input | — | 必填，如 `Firecrawl` |
| 图标 URL / Emoji | Input + 上传裁剪 | — | 支持上传并裁剪（1:1） |
| 封面大图 URL | Input + 上传 | — | 支持上传并裁剪（2.22:1） |
| Provider | Input | — | 如 `Stravision` |
| Category | Input | `web` | agriculture/web... |
| Description | TextArea | — | — |
| 推荐 Prompt | TextArea | — | 可选 |
| Command | Input | `npx` | npx / uvx |
| Args (JSON Array) | Input | `[]` | JSON 数组 |
| Default Env Vars (JSON) | TextArea | `{}` | 等宽字体 |
| Published | Checkbox | 勾选 | 是否发布到市场 |
| Official Badge | Checkbox | 不勾选 | 官方认证标识 |
| Requires API Key | Checkbox | 不勾选 | 是否需要 API Key |

### 11.4 操作

| 操作 | 接口 |
|------|------|
| 加载列表 | GET `/api/admin/mcp` |
| 新建 | POST `/api/admin/mcp` |
| 编辑 | PUT `/api/admin/mcp/{id}` |
| 删除 | DELETE `/api/admin/mcp/{id}`（浏览器 confirm 确认） |

---

## 12. 知识库市场

> 路径：侧边栏 → 知识库市场
>
> 用途：管理面向用户订阅的"市场知识库"及其内部条目，支持文件/链接/纯文本三类上传与自动 embedding。

### 12.1 顶部操作栏

- 搜索框：按知识库名称/描述搜索。
- 刷新按钮。
- "新建市场知识库"主按钮。

### 12.2 统计卡片（3 个）

| 卡片 | 含义 |
|------|------|
| 市场知识库总数 | 蓝色 |
| 官方发布 | 绿色 |
| 累计订阅 | 橙色 |

### 12.3 列表表格（每页 10 条）

| 列名 | 说明 |
|------|------|
| ID | `#id` |
| 封面 | 缩略图或主题色块 + 书本图标 |
| 名称 | 加粗，official 显示蓝色对勾；下方截断描述 |
| 分类 | Tag |
| 条目 | 实际条目数 |
| 订阅 | 火焰图标 + 订阅数 |
| 发布者 | 无则显示"—" |
| 发布时间 | 本地时间格式 |
| 状态 | 已下架（灰）/ 已发布（绿）/ 草稿（橙） |
| 操作 | 查看、编辑、删除 |

### 12.4 新建/编辑对话框（宽 920px）

使用 Tabs 实现两个标签页：基本信息、条目管理。

#### Tab 1：基本信息（9 个字段）

| # | 字段 | 类型 | 默认值 | 说明 |
|---|------|------|--------|------|
| 1 | 知识库名称 | Input(maxLength=100) | — | 必填 |
| 2 | 描述 | TextArea(maxLength=1000) | — | 可选 |
| 3 | 分类 | Select | agriculture | 8 选项：农业/通用/工业/服务业/教育/医疗/金融/科技 |
| 4 | 排序权重 | Input(number) | 0 | 数值越大排序越靠前 |
| 5 | 主题色 | color picker + 10 色预设 | `#1677ff` | 色板：#1677ff/#52c41a/#fa8c16/#f5222d/#722ed1/#13c2c2/#eb2f96/#faad14/#a0d911/#2f54eb |
| 6 | 图标 | Select | book | 10 选项：book/leaf/flask/bug/cloud/bulb/star/globe/compass/rocket |
| 7 | 封面图 URL | Input | — | 可选，留空使用主题色块 |
| 8 | 官方发布 | Switch | false | 勾选展示认证标识 |
| 9 | 下架 | Switch | 0 | 仅编辑模式显示；下架后用户端不再展示，已订阅用户仍可访问 |

#### Tab 2：条目管理（仅编辑模式显示）

切换到此 Tab 时懒加载条目列表。提供 3 种添加方式：

##### 方式一：文件上传（自动 embedding）

- 虚线边框卡片，支持多文件。
- 接受扩展名：`.txt .md .csv .json .xml .html .pdf .doc .docx .xls .xlsx .ppt .pptx` + 图片/音频/视频。
- 接口：`POST /api/knowledge/upload`（FormData：file + collection_id）。
- PDF/图片会尝试 OCR 解析（GLM-OCR）。
- 上传成功 toast 显示解析方式、字符数、向量化分块数。

##### 方式二：添加链接（content_type=link）

| 字段 | 必填 | 说明 |
|------|------|------|
| URL | 是 | 必须 http:// 或 https:// 开头 |
| 标题 | 否 | 默认用 URL |
| 链接说明/摘要 | 否 | TextArea |

接口：`POST /api/knowledge/items`。

##### 方式三：添加纯文本条目（content_type=note）

| 字段 | 必填 | 说明 |
|------|------|------|
| 标题 | 是 | — |
| 内容 | 是 | 会被分块并 embedding |
| 摘要 | 否 | 不填取内容前 200 字 |

接口：`POST /api/knowledge/items`。

#### 已有条目列表表格

| 列 | 说明 |
|------|------|
| 标题 | 类型图标 + 标题 + source_url + summary（>80 字截断） |
| 类型 | content_type Tag |
| 大小 | formatSize（B/KB/MB） |
| 向量化 | 状态徽标：ready 绿/processing 蓝/pending 橙/failed 红/skipped 灰 |
| 更新 | 格式化时间 |
| 操作 | 重新生成 embedding（闪电图标）、删除（红色） |

### 12.5 详情对话框（宽 640px）

通过列表"查看"按钮触发。显示封面、标题、官方/分类 Tag、描述、条目数、订阅数、发布者、发布时间、状态。

### 12.6 操作汇总

| 操作 | 接口 |
|------|------|
| 列表 | GET `/api/knowledge/market` |
| 新建 | POST `/api/knowledge/market` |
| 编辑 | PATCH `/api/knowledge/market/{id}` |
| 删除 | DELETE `/api/knowledge/market/{id}`（Modal.confirm，连带清除订阅与条目） |
| 查看详情 | GET `/api/knowledge/market/{id}` |
| 加载条目 | GET `/api/knowledge/market/{id}/items` |
| 上传文件 | POST `/api/knowledge/upload` |
| 添加链接/文本 | POST `/api/knowledge/items` |
| 删除条目 | DELETE `/api/knowledge/items/{id}` |
| 重新向量化 | POST `/api/knowledge/items/{id}/embed` |

### 12.7 注意事项

- **重要**：新建模式下无法看到"条目管理"Tab，需先保存知识库获得 id 后才能上传条目。
- 管理员可管理任何市场知识库条目（即使 item.user_id 是发布者）。
- 下架后用户端不再展示，但已订阅用户仍可访问。
- Embedding 配置仅影响新上传文档，旧文档保留原向量。

---

## 13. Agent 技能

> 路径：侧边栏 → Agent 技能
>
> 用途：管理 AI Agent 技能资产市场。

### 13.1 顶部操作栏

- 搜索框：按 name 或 skill_id 过滤。
- "Add Skill"主按钮：新建技能。

### 13.2 列表表格（每页 10 条）

| 列名 | 说明 |
|------|------|
| Priority | 紫色加粗"#优先级" |
| Icon | 48×48 圆角，emoji 直接显示/URL 显示图片/失败显示首字母 |
| Skill ID | 等宽字体，可复制 |
| Name | 普通文本 |
| Category | 大写加粗小号 Tag |
| Status | Published（绿+地球图标）/ Draft（灰+锁图标） |
| Actions | 编辑、删除（系统内置技能禁用删除） |

### 13.3 新建/编辑对话框（宽 800px）

| # | 字段 | 类型 | 默认值 | 说明 |
|---|------|------|--------|------|
| 1 | Skill ID | Input | — | 必填，如 `agriculture-expert`；编辑时禁用 |
| 2 | Name | Input(加粗) | — | 必填，如"农业专家" |
| 3 | 图标 URL / Emoji | Input + 上传裁剪 | `🧩` | 支持上传裁剪（1:1） |
| 4 | 封面大图 URL | Input + 上传 | — | 支持上传裁剪（2.22:1） |
| 5 | Category | Input | `工具` | 精选/农业/系统... |
| 6 | Priority (0-100) | Input(number) | 0 | 100 = Top |
| 7 | Description | TextArea | — | 简短描述 |
| 8 | Published | Checkbox | 0 | 是否发布 |
| 9 | System Built-in | Checkbox | 0 | 系统内置标记 |
| 10 | Interaction Examples | Input | — | 逗号分隔，如"你是谁？,当前环境如何？" |
| 11 | System Prompt | TextArea(高 350) | — | 技能核心指令，等宽字体圆角 |

> 其他字段（author、version、keywords、effects）使用默认值，UI 未直接编辑。

### 13.4 操作

| 操作 | 接口 |
|------|------|
| 加载列表 | GET `/api/skills/store?admin=1` |
| 新建 | POST `/api/skills/store` |
| 编辑 | PUT `/api/skills/store/{skill_id}` |
| 删除 | DELETE `/api/skills/store/{skill_id}`（confirm 确认） |

### 13.5 注意事项

- **Skill ID 一旦创建不可修改**（编辑模式禁用）。
- **系统内置技能（is_builtin=1）删除按钮禁用**，无法删除。
- System Prompt 是技能的核心指令，采用大块圆角等宽字体样式。

---

## 14. 常见问题与最佳实践

### 14.1 角色权限

| 角色 | 可执行操作 |
|------|-----------|
| super_admin（超级管理员） | 全部操作，包括编辑其他用户的角色 |
| admin（管理员） | 除角色编辑外的全部管理操作 |
| member（会员） | 无后台访问权限 |
| user（普通用户） | 无后台访问权限 |

### 14.2 保存机制提醒

多个模块采用"本地状态 + 显式保存"模式，修改后**必须点击保存按钮**才生效：

- AI 模型（添加/编辑/删除/排序后需点击"保存配置"）
- AI 功能开关（点击"保存配置"，下次 AI 回复生效）
- 知识库全局配置（点击"保存"，立即对所有用户生效）

### 14.3 Embedding 配置最佳实践

1. 先在"AI 提供商"添加一个提供商（如智谱 GLM），填入 baseUrl 和 apiKey；
2. 在该提供商下添加模型，勾选"可用于 Embedding"；
3. 在"知识库 Embedding 模型"卡片选择该提供商/模型/维度/启用，保存；
4. 点击"测试 Embedding"验证连通性；
5. 下次上传文档将使用该模型。

> 若配置失败或账户欠费，系统会自动回退到 `local-hash-v1`（本地哈希，质量较低）。

### 14.4 维护模式使用建议

- 维护前先填写清晰的"维护标题"和"维护说明"（含预计恢复时间）。
- 开启维护模式后，普通用户访问任意页面都会被重定向到维护页面，管理员不受影响。
- 维护完成后记得关闭开关。

### 14.5 知识库市场注意事项

- 新建知识库后**必须先保存**才能上传条目（需获得知识库 id）。
- 管理员上传的条目 user_id 自动设为发布者，确保订阅访问控制正常。
- 删除知识库会连带清除所有订阅记录与条目，操作不可恢复。
- 下架的知识库用户端不再展示，但已订阅用户仍可访问。

### 14.6 公告发送区分

| 组件 | 接口 | type | 格式 |
|------|------|------|------|
| 系统公告 | `/api/admin/announcement` | 无 | 纯文本 |
| 更新日志 | `/api/admin/announcement` | `changelog` | JSON 字符串 |
| 功能弹窗 | `/api/announcements` | — | features 数组 |

### 14.7 速率限制防护链路

"超额 → 违规计数 → 累计违规 → 自动封禁"四层防护：

1. 单时间窗口请求超过 `Max Requests` → 触发速率限制；
2. 累计违规次数达到 `Violation Limit` → IP 自动封禁；
3. 封禁时长 = `Ban Duration`；
4. 自动封禁的 IP 出现在"封禁 IP 管理"列表，管理员可手动解封。

---

## 附录：模块对照速查表

| 模块 | 主要接口前缀 | 写操作 | 提示库 |
|------|-------------|--------|--------|
| 用户管理 | `/api/admin/users` | 是 | sonner + antd message |
| AI 模型 | `/api/admin/ai-models` | 是（显式保存） | sonner |
| AI 提供商 | `/api/admin/ai-providers`、`/api/knowledge/*` | 是 | sonner |
| 模型市场 | `/api/admin/ai-providers`（只读） | 否 | — |
| 安全设置 | `/api/admin/banned-ips`、`/api/admin/access-logs`、`/api/admin/settings/rate-limit` | 是 | sonner |
| 公告管理 | `/api/admin/announcement`、`/api/announcements` | 是 | sonner |
| 系统设置 | `/api/admin/ai-features`、`/api/admin/settings/*`、`/api/greenhouse/cameras` | 是 | sonner |
| MCP 市场 | `/api/admin/mcp` | 是 | sonner（英文） |
| 知识库市场 | `/api/knowledge/market`、`/api/knowledge/items`、`/api/knowledge/upload` | 是 | antd App.useApp().message（中文） |
| Agent 技能 | `/api/skills/store` | 是 | sonner（英文） |

---

> 本手册基于 BerryRealm v4.0 源码编写，如遇功能更新请以实际界面为准。
