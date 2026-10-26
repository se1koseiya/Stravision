<!-- README_SYNC: source=working-tree; updated=2026-10-27 -->

<p align="center">
  简体中文 · <a href="./README_EN.md">English</a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/readme/hero-dark.webp">
    <img src="assets/readme/hero-light.webp" width="100%" alt="莓界 Stravision：设施农业 AIoT 平台">
  </picture>
</p>

**面向设施农业的 AIoT 平台。传感器读数直接驱动设备动作，AI 是执行链上的一个环节，不是聊天窗口。**

<p align="center">
  如果这个项目对你有用，点一个 Star 收藏它，也让更多做设施农业的开发者看到。
</p>

<p align="center">
  <a href="https://github.com/AcutaCM/BerryRealm-NewGen-AIOT-Platform/stargazers"><img src="https://img.shields.io/github/stars/AcutaCM/BerryRealm-NewGen-AIOT-Platform?style=flat-square&color=059669" alt="GitHub stars"></a>
  <img src="https://img.shields.io/badge/version-5.2.7-059669?style=flat-square" alt="version 5.2.7">
  <img src="https://img.shields.io/badge/Node.js-22%2B-059669?style=flat-square" alt="Node.js 22+">
  <img src="https://img.shields.io/badge/Next.js-16.1.6-059669?style=flat-square" alt="Next.js 16.1.6">
  <img src="https://img.shields.io/badge/PostgreSQL-16%20%7C%2018-059669?style=flat-square" alt="PostgreSQL 16 or 18">
  <img src="https://img.shields.io/badge/License-Apache--2.0-059669?style=flat-square" alt="Apache-2.0">
  <a href="https://github.com/AcutaCM/BerryRealm-NewGen-AIOT-Platform/commits"><img src="https://img.shields.io/github/last-commit/AcutaCM/BerryRealm-NewGen-AIOT-Platform?style=flat-square&color=059669" alt="last commit"></a>
</p>

- **桌面端一体化交付。** PostgreSQL、MQTT broker、Next.js 应用、语音服务与协同服务打包进同一个安装包，端口只绑回环，出厂即单机可跑。
- **AI 直接执行物理动作。** 59 个内置工具覆盖设备、视觉、数据、病历与文档；继电器 10 秒、云台 90 秒、抓帧 20 秒各自独立超时，拿到的是设备确认后的状态。
- **无 ORM。** `pg` 手写 SQL，建表交给启动钩子执行 56 条幂等 `CREATE TABLE IF NOT EXISTS`，升级只加不减。
- **可完全离线。** 模型指向园区内网的 OpenAI 兼容服务时，视觉诊断与多轮对话整条链路不出公网。

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/readme/hd01-dark.webp">
    <img src="assets/readme/hd01-light.webp" width="100%" alt="数据到动作之间缺一段">
  </picture>
</p>

设施农业的数据链路通常断在三处：读数只用于展示，不参与判断；调控策略保存在个人经验里，人一走就失传；从发现异常到设备真正动作，中间靠打电话。

本项目针对的正是这三段。读数落库后同时进入规则引擎与模型上下文，同一份数据两处可用；策略沉淀成可视化规则节点，可改、可复用、可版本化；AI 通过工具下发指令，并读取设备确认后的状态，而不是发出即视为完成。

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/readme/hd02-dark.webp">
    <img src="assets/readme/hd02-light.webp" width="100%" alt="真实运行画面">
  </picture>
</p>

以下均为产品真实运行截图，未做视觉重绘，数字与报错原样保留。

**仪表盘。**一屏看完今天：温度、湿度、光照、CO₂、氮磷钾、土壤、光谱、时段热力图，天气和待办挂在最上面。偏冷、干燥、贫瘠直接标在卡片上，不用自己对着阈值心算；传感器不对劲，数字就原样在那儿摆着。

<p align="center">
  <img src="assets/readme/proof-dashboard.webp" width="100%" alt="仪表盘：环境指标卡片、天气、热力图与光谱">
</p>

**孪生监控。**大棚的三维场景本身就是监控面板：摄像头、传感器、风机、补光灯都是能点的热点，设备在线状态与电量挂在左边，操作日志实时滚在右边。

<p align="center">
  <img src="assets/readme/proof-monitor.webp" width="100%" alt="三维孪生监控：大棚场景、设备热点、操作日志">
</p>

**设备控制。**9 台设备的总览：在线 / 离线、告警条数、今日操作一目了然。继电器卡片远程开关，RGB 补光灯调色盘配四条滑杆，改完「更新 LED 亮度」即同步；右侧顺手挂着天气与温室环境参数。

<p align="center">
  <img src="assets/readme/proof-devices.webp" width="100%" alt="设备控制页：设备总览、继电器开关与 RGB 调色">
</p>

以上是平台本体。下面是重头戏——AI 怎么在这套东西上动手。

**设备启停。**输入「现在哪些设备开着呢？关闭它」，模型先取工具 schema，两轮调用 `toggle_relay`，最后停在「设备启停 · 关闭『7』继电器」等你点执行。指令发出不算完，设备回读确认才算关了。

<p align="center">
  <img src="assets/readme/proof-device.webp" width="100%" alt="工具执行链：load_tool_schema → 两次 toggle_relay，等待确认关闭 7 号继电器">
</p>

**病虫害诊断。**一张草莓照片，12.4 秒给出白粉病、重度约 88%、3 处病斑。结论之外是叶片表现、病斑特征、颜色边界三类依据，逐条对着图讲；摘果、通风、用药五步排在后面。

<p align="center">
  <img src="assets/readme/proof-diagnosis.webp" width="100%" alt="诊断卡：白粉病约 88%，附五步处置建议">
</p>

**病斑标在你自己的照片上。**点「查看标注」，轮廓直接画进原图：3 处病斑，85% / 88% / 80% 各带置信度，可切回原图、可下载。不是另画一张示意图交差。

<p align="center">
  <img src="assets/readme/proof-mask.webp" width="100%" alt="遮罩图：3 处病斑轮廓标注在用户照片上，含置信度">
</p>

**病历档案。**诊断一出结论就自动入档——病名、严重度、发病部位、缩略图和当时的完整诊断快照都留着，两个月后也能回放当时看到了什么。治完了在面板回填复诊：痊愈 / 好转 / 无变化 / 恶化四选一，补张照片写句备注，状态自己往前走，病程曲线跟着长出来。

<p align="center">
  <img src="assets/readme/proof-records.webp" width="100%" alt="病历面板：统计总览、病历详情与复诊回填">
</p>

**AI 翻的是真档案。**问「我这茬草莓得过几次病」，它调工具查真实病历再回答：#67 白粉病、重度 88%、首诊 10-24、复诊 0 次——然后直说「所以暂时还没有治愈率可算」，不给你编个数字。说「标记为已痊愈」，状态从待处置改成已解决，备注写上「用户确认已痊愈」，改了什么当场念给你听。

<p align="center">
  <img src="assets/readme/proof-record-chat.webp" width="100%" alt="AI 调用病历工具回答病史，并如实说明暂无治愈率">
</p>

**画布直改。**说一句「创建一个自定义策略」，AI 问清触发条件和执行动作，把触发器、判断分支、执行节点直接画进你打开的流程图——`automation_canvas_apply` 落图，底部那条「莓小智正在修改画布」就是它在动手。改完专门提醒：还没保存，满意点「保存」，不满意 Ctrl+Z。

<p align="center">
  <img src="assets/readme/proof-canvas.webp" width="100%" alt="画布直改：automation_canvas_apply 调用中，节点实时落到流程图">
</p>

**三种画法。**判断流程画成示意图，症状对比画成科普插画，病斑标注画回你的照片。Mermaid 出流程图（可下载），`<ILLU>` 出扁平插画，诊断定位出遮罩图——该用哪个用哪个，不拿一张新图糊弄「把我照片上的病斑圈出来」。

<p align="center">
  <img src="assets/readme/proof-draw-flow.webp" width="100%" alt="示意图卡片：白粉病早期判断流程">
  <img src="assets/readme/proof-draw-illu.webp" width="100%" alt="插画卡片：健康叶片与白粉病早期对比">
</p>

**文稿生成。**「把现有的数据做成 PPT 报告」→ 调 8 个工具，58.6 KB 的 pptx，右侧直接翻封面、图表页、要点页；顺手指出土壤湿度最新记录是 25 天前的 2.8%、氮磷钾全为 0，是传感器异常不是真值。Word 同理：13 KB、8 个章节，目录和表格排好，下载就能用。

<p align="center">
  <img src="assets/readme/proof-ppt.webp" width="100%" alt="PPT 生成：8 个工具调用，产物预览与数据问题提醒">
  <img src="assets/readme/proof-docx.webp" width="100%" alt="Word 生成：8 章节报告，含目录与表格">
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/readme/hd03-dark.webp">
    <img src="assets/readme/hd03-light.webp" width="100%" alt="感知、决策、执行">
  </picture>
</p>

**感知**　空气温湿度、光照、CO₂；土壤温湿度、EC、pH、氮磷钾；11 通道光谱；摄像头画面与云台步进（0–700 mm、定时抓帧）。

**决策**　可视化规则编排（触发 / 条件 / 动作 / AI 决策节点）、定时任务、AI 主动巡检；59 个内置工具、计划模式、三种人格、三层记忆、语音实时对话；规则图可由 AI 直接改，诊断结论自动进病历。

**执行**　4 路继电器（水泵、风机、补光）、4 路 LED、步进云台。每条指令都回读 `confirmed` 状态。

**留存**　可拖拽仪表盘、历史趋势、热力图、光谱分析、AI 简报；病历档案（诊断沉淀、复诊病程、治愈率）；知识库（向量检索、版本、权限）、多人实时协同、Office 在线编辑、文稿读写改。

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/readme/hd04-dark.webp">
    <img src="assets/readme/hd04-light.webp" width="100%" alt="三种部署形态">
  </picture>
</p>

主要交付形态是桌面应用而非服务器。单机安装后数据库、消息代理、应用、语音与协同全部运行在这台机器上，端口只绑回环。

- **本地一体化**（主形态）· Electron 外壳 + 内置 PostgreSQL 5433 + 内置 MQTT 11883 + 应用 3000 + 语音 3002 + 协同 1234。
- **云端集中**（可选）· 多园区统一管理、远程运维，7 个容器：nginx 443 / web / db 5432 / yjs-ws 1234 / onlyoffice 8080 / cap / valkey 6379。
- **开发模式** · PostgreSQL + Node 22 + pnpm，`pnpm dev` 起在 3000。

两种正式形态共用同一套业务代码与数据模型，差异只在进程编排、数据位置和授权方式。

断网时监控、历史、设备控制、自动化、告警照常可用；协同降级到局域网；视觉诊断与对话取决于模型来源——指向园区内网的 OpenAI 兼容服务即可整条链路离线，只有联网检索不可用。

桌面安装包需要授权码（Ed25519 离线验签，未激活停留在激活界面）。自行构建走开发模式，或按 [docs/DESKTOP.md](docs/DESKTOP.md) 打包。

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/readme/hd05-dark.webp">
    <img src="assets/readme/hd05-light.webp" width="100%" alt="对话与工具执行链">
  </picture>
</p>

对话请求走 `/api/chat` 的 SSE 流：装配系统提示、历史、记忆与工具定义（按预算裁剪）→ 模型流式输出（可能夹带工具调用）→ 无依赖的工具并行执行 → 结果压缩后回灌 → 进入下一轮。单轮上限 5 次迭代，超预算强制收口。

四条约束写在代码里，不是文档里的承诺：

- **物理动作必须回读。** 继电器 10 秒、云台 90 秒、抓帧 20 秒各自独立超时；返回的是设备确认后的状态，不是「已发送」。
- **该停就停。** 需要补充信息或确认危险操作时挂起等答复，同一会话同时只允许一个挂起点。
- **压缩必须可见。** 上下文被压缩时在对话中插入标记，失败也明确报出，不静默丢弃历史。
- **记忆分三层。** 短期（最近动作）、工作（当前目标）、长期（偏好、设备模式、成功策略），长期记忆可读可写。

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/readme/ai-arch-dark.svg">
    <img src="assets/readme/ai-arch.svg" width="100%" alt="AI 子系统架构：请求准入、上下文装配、模型推理、工具执行、结果与落库五阶段主链路，含回灌回环（≤5 轮），以及上下文来源、工具落地面与登记表约束">
  </picture>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/readme/hd06-dark.webp">
    <img src="assets/readme/hd06-light.webp" width="100%" alt="技术栈">
  </picture>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/readme/icons-dark.svg">
    <img src="assets/readme/icons.svg" width="100%" alt="Next.js、React、TypeScript、Ant Design、Tailwind CSS、React Flow、three.js、Framer Motion、PostgreSQL、Node.js、MQTT、Electron">
  </picture>
</p>

- **前端** Next.js 16.1.6（App Router）· React 19.2.2 · TypeScript 5 · Ant Design 6.3.5 与 Ant Design X 2.8 · Tailwind CSS 4 · React Flow 12.10 · Framer Motion 11 · three.js
- **后端** Node.js 22 · PostgreSQL 16/18（`pg` 手写 SQL，无 ORM）· MQTT 5 + `aedes` 内置 broker · Valkey（非强依赖）
- **AI** OpenAI 兼容协议 · `openai` 6 + Vercel AI SDK 5 · 视觉大模型 · 端到端语音 + Silero VAD · 本地 ASR（sherpa-onnx）
- **桌面** Electron 44 · electron-builder 26 · embedded-postgres 18 · Ed25519 授权 · electron-updater
- **质量** Vitest + Testing Library + fast-check（29 个测试文件）· Playwright 驱动真实浏览器的界面验收（145 个脚本）

不用 ORM 是刻意的：物联网场景每条上报都要写库，映射层带来额外开销，连接池行为也不易控制。`schema` 只声明数据源，不参与运行；建表由启动钩子执行 56 条幂等 `CREATE TABLE IF NOT EXISTS`，升级只加不减。

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/readme/hd07-dark.webp">
    <img src="assets/readme/hd07-light.webp" width="100%" alt="快速开始">
  </picture>
</p>

需要 Node 22+、pnpm 10+，以及一个可连通的 PostgreSQL。

```bash
git clone https://github.com/AcutaCM/BerryRealm-NewGen-AIOT-Platform.git
cd BerryRealm-NewGen-AIOT-Platform
pnpm install

cp .env.example .env      # 改 DATABASE_URL，JWT_SECRET 用 openssl rand -hex 48 生成
pnpm dev                  # → http://localhost:3000
pnpm dev:ws               # 另开终端：语音与协同长连接
```

不需要迁移命令。首次 `pnpm dev` 时启动钩子自动建表、写入默认 9 台设备、装载定时任务；表已存在则跳过。AI 变量可以留空，界面会提示模型不可用，其余功能照常。

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/readme/hd08-dark.webp">
    <img src="assets/readme/hd08-light.webp" width="100%" alt="边界与已知限制">
  </picture>
</p>

属于本系统的：传感器数据的接收、存储与分析；指令下发与状态确认；视觉识别与诊断建议；大模型编排、工具调度与上下文管理。

不属于本系统的：传感器固件与采集电路；继电器、电机驱动器的电气实现；农药处方与农事作业执行；模型的训练与微调。

已知限制：

- 诊断结果只是基于图像的初步判断，不能替代农技员，界面上也如此标注。
- 强传染性许可证的视觉框架未进入产品链路（AGPL 的 YOLO 系目标检测），视觉走通用 VLM 加协议适配。
- 未做微服务拆分：领域边界清楚，但当前团队与部署环境不支持那份运维复杂度，采用「单体 + 独立长连接进程」。
- 三个巨型文件待拆：AI 助手主界面 7,495 行、对话接口 4,025 行、设备控制台 3,828 行。

## 文档

- [TECHNICAL_MANUAL.md](TECHNICAL_MANUAL.md)：环境、架构、AI 链路、部署，20 章
- [docs/DESKTOP.md](docs/DESKTOP.md)：桌面端打包、签名与授权
- [docs/MQTT_DEVELOPMENT_MANUAL.md](docs/MQTT_DEVELOPMENT_MANUAL.md)：设备接入
- [docs/SKILL_SYSTEM_GUIDE.md](docs/SKILL_SYSTEM_GUIDE.md)：技能系统
- 其余见 [docs/](docs)

## 参与

欢迎 Issue 与 PR。提交前跑通 `pnpm lint` 与 `pnpm test`；UI 改动请使用既有设计令牌，不要引入新的强调色或第三方图标库；密钥类字段一律脱敏。

## 许可证

源码采用 [Apache License 2.0](LICENSE)。桌面端安装包与授权码体系独立于源码许可，商用前请阅读 [docs/DESKTOP_LICENSE.md](docs/DESKTOP_LICENSE.md)。

<p align="center">
  <sub><b>Stravision · 莓界</b>　Apache License 2.0　Copyright (c) 2026 Stravision Team</sub>
</p>
