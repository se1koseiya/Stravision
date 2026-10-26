# 视觉能力升级方案 —— YOLO 检测 × 业务页视觉概念

> 承接 `docs/病虫害视觉诊断方案.md`。本篇回答三件事：
> ① YOLO 到底该不该加、加在哪；② 优雅前端反馈怎么做；③ 业务页面缺的视觉概念有哪些。
>
> 结论：**YOLO 要加，但它不是 VLM 的替代品，而是补 VLM 最弱的那一环 —— 空间定位。**

---

## 一、YOLO 的定位：不是"更好的模型"，是"不同的器官"

这是最容易踩的坑：把 YOLO 当成"比 qwen-vl 更准的病虫害识别方案"。它不是。

| | YOLO（检测） | VLM（理解） |
|---|---|---|
| 回答什么 | **哪里有异常、有几个、多大** | **这是什么病、依据是什么、怎么治** |
| 输出 | bbox + 类别 + 置信度 | 自然语言 + 结构化诊断 |
| 速度 | 毫秒级（本地） | 秒级（需上行调用） |
| 成本 | 零（本地算力） | 按 token 计费 |
| 可解释性 | 框可视化，直观 | 依赖自述依据 |
| 硬伤 | 类别固定，**不认识的病就是不认识**；需要标注数据 | 空间定位弱、慢、贵、有幻觉 |

**所以正解是分工，不是二选一**：

```
图片 ──▶ YOLO 定位（本地，毫秒）
           │  产出：疑似病斑/虫体/果实的 bbox
           ▼
        ROI 裁剪放大 ──▶ VLM 细粒度鉴别（只送放大后的局部）
           │  产出：病名 / 置信度 / 依据 / 鉴别 / 四级防治
           ▼
        诊断卡片 + 检测框叠层
```

三个额外收益：
1. **准确率**：VLM 看的是放大后的病部特写，而不是整张远景 —— 直接补掉了"拍得远就看不清"的短板；
2. **成本**：不再把整张原图喂给 VLM；
3. **可解释**：框是给用户看的，不是给模型看的，用户一眼就懂"它在看哪"。

> ⚠️ 反过来不成立：**只上 YOLO 一定不可行**。草莓病害类别是长尾的（白粉/灰霉/炭疽/叶斑/疫霉果腐/病毒病/缺素/日灼…），
> 一个只有 5 类的检测器会把所有未知病害硬塞进最近的类，这在农业场景是**有害的**（会导致错用药）。
> YOLO 只能回答"这里有问题"，不能回答"这是什么问题"。

---

## 二、落地架构：浏览器端推理（复用项目已有的地基）

这是本次方案最关键的发现 —— **项目早就把基础设施铺好了，不用新建任何东西**：

| 现成资产 | 位置 | 说明 |
|---|---|---|
| onnxruntime-web wasm 运行时 | `public/vad/` | 为 Silero VAD 引入，含 `ort-wasm-simd-threaded.mjs/.wasm` |
| SharedArrayBuffer 可用 | `next.config.ts:174-183` | 已开 COOP/COEP，多线程 wasm 的前提 |
| Worker 白名单 | `next.config.ts:155` | `worker-src 'self' blob:` |
| 依赖包 | pnpm store | `onnxruntime-web@1.27.0`（vad-web 的传递依赖，已在本地） |

**因此浏览器端 YOLO 几乎是零边际成本的。**

为什么选浏览器端而不是服务端：

| | 浏览器端（选定） | 服务端 |
|---|---|---|
| 反馈延迟 | **本地毫秒级，可做真动效** | 必带一次网络往返 |
| 服务端成本 | 零 | 每张图占算力 |
| 隐私 | 检测阶段图片不出设备 | 图片必须上行 |
| 部署 | 复用现成 wasm，无新增 | 需处理 native binding 跨平台 + 桌面端打包 |
| 适合场景 | 交互式单图/少图 | 批量巡检、定时任务 |

> P2 的"摄像头定时自动巡检"属于批量场景，届时再考虑服务端推理复用同一套解码/NMS 代码。

### 已有实现（本次交付）

| 文件 | 职责 |
|---|---|
| `lib/vision/yolo-detector.ts` | 浏览器端检测器：懒加载 ort → letterbox 预处理 → YOLOv8 输出解码 → NMS → 归一化 bbox |
| `components/ai/detection-overlay.tsx` | 优雅叠层：扫描光带 + 取景四角 + 逐框错峰淡入 + 悬停/选中态 |
| `lib/types/vision-diagnosis.ts` | `Detection` 的归一化 bbox 协议（**YOLO 与 VLM 共用**，渲染层无需区分来源） |

### 模型放置

```
public/models/yolo-crop-detect.onnx     # YOLOv8 检测模型
public/models/yolo-crop-labels.json     # ["病斑","蚜虫","红蜘蛛","果实",...]
```

**没有模型时会怎样？**
`ensureDetector()` 会先发一个 HEAD 请求探测，404 即标记 `unavailable` 并给出可读原因，
`detect()` 返回空数组 —— **诊断链路照常工作**，只是框由 VLM 的 grounding 能力提供。
这保证了"功能可以先上线，模型后续补"。

### 模型从哪来（三段式）

| 阶段 | 方案 | 需要什么 | 适用 |
|---|---|---|---|
| **A. 现在就可用** | VLM grounding 出框（qwen-vl 支持 bbox） | 无 | 立即可上线，前端叠层已经能渲染 |
| **B. 快速起步** | 开放词汇检测（YOLO-World / YOLOE） | Python 环境导出 ONNX，写文本提示词如 `diseased leaf spot` | 不想标注，但想要本地实时框 |
| **C. 目标态** | 自训草莓病虫害检测器 | 500~1000 张平台自有照片 + 标注（可用平台累积的病历图） | 精度与速度双优，且是**平台独有资产** |

> 🚩 **v1.1 更正（2026-10-04）**：上表的 B 方案有许可证问题 —— **YOLO-World / YOLOE 构建于
> Ultralytics 之上，是 AGPL-3.0**，其网络条款对 SaaS 生效，闭源商用需买 Enterprise License。
> B 段已改为 **Apache-2.0 架构（D-FINE / YOLOX / RF-DETR）+ 公开草莓数据集微调**。
> 完整选型（含数据集清单、许可证对照表、导出命令、解码器差异）见
> **`docs/YOLO模型与数据集选型.md`**。

> 建议路径：**A 上线 → 用 A 收集带框数据 → C 自训**。
> A 阶段用户每次诊断产生的图片与结论，天然就是 C 阶段的训练集雏形。

---

## 三、优雅前端反馈：做了什么

`components/ai/detection-overlay.tsx` 是这一层的载体，四段反馈构成一条"系统在认真看图"的叙事：

1. **扫描光带**（分析中）—— emerald 光带自上而下循环扫过，暗示"正在逐区域看"；
2. **取景四角** —— 常驻的四角括号，建立"这是一次成像分析"的仪式感；
3. **逐框错峰淡入** —— 框按索引 0.08s 依次出现，形成"逐个发现"的节奏，而不是"啪"一下全亮；
4. **悬停/选中态** —— 其余框降到 35% 透明度、当前框加亮并带光晕，弱化视觉噪音。

工程细节（都踩过坑，写在代码注释里）：
- 框用**归一化百分比**定位 → 图片任意缩放自动贴合，**不需要监听 resize**；
- 动效走 framer-motion，**不写自定义 keyframes** —— 项目里 `<style>{`…`}</style>` 模板串的反引号是已知事故源；
- 完整尊重 `prefers-reduced-motion`（关掉扫描与错峰，直接呈现）；
- 图上元素一律**深底亮字**，不依赖页面主题变量 → 明暗主题下都可读；
- 标签胶囊 `translateY(-100%)` 悬于框上方，框太小也不遮挡病部。

---

## 四、业务页面缺失的视觉概念（盘点结果）

调研了 10 个核心业务页，问题不是"没有图"，而是**视觉能力被锁死在 AI 助手里**。

### 4.1 三个系统性缺失（按投入产出比排序）

**① 空态清一色「图标 + 文字」，项目自带的插画库零使用 ★最高性价比**

`components/illustration.tsx` + `public/illustrations/iconpark/` 的 **25 张 SVG** + `public/ip/` 草莓 IP 都已落盘，
但 activity / automation / kb-store / chat / my-mcp / profile / maintenance **全部只用 antd `Empty` 或 lucide 图标**。

> 改一处、只需一行 import，就能让 7 个页面的空态从"干巴巴"变成有品牌感。**这是全项目最便宜的一次视觉升级。**

**② 6 个视觉卡全锁在 AI 助手里，业务页各自重复造轮子**

| 现成资产 | 只在 | 业务页的重复实现 |
|---|---|---|
| `device-bento-grid` / `control-bento-grid` | ai-assistant | `device-control-client.tsx:3532` 又写了一遍数字卡 |
| `monitor-card`（摄像头卡） | ai-assistant | dashboard / monitor 各自实现 |
| `spectral-card` | ai-assistant | `components/dashboard/spectral-card.tsx`、`components/monitor/spectral-popup.tsx` **三份重复实现** |

> 光谱卡三份重复是最典型的技术债 —— 顺着这次改动可以合并。

**③ 设备与传感器普遍缺"实物感"**

`device-control-client.tsx:2563` 设备卡、`profile/page.tsx:412` 设备卡、`device-bento-grid` 八指标 —— 全是 `size-7` 线性图标 + 数字 + 小圆点。
而项目其实**已经备好了** 3D 大棚（`components/monitor/greenhouse-model.tsx`）、摄像头流、IP 3D 图标。

### 4.2 具体建议（逐页，含落点）

| 页面 | 现状 | 建议 | 落点 |
|---|---|---|---|
| **dashboard** | iOS widget 化，有自绘 SVG 图表；无设备实景 | ① 加大棚实景缩略图 widget（复用 `monitor-card`）<br>② 把**已定义但从未被引用**的 `components/dashboard/ai-insight-card.tsx` 接线进来（白捡的 IP 图 + 风险色卡） | `dashboard-client.tsx:928` / 仪表盘注册表 |
| **monitor** | 主视觉已是 3D 大棚（全项目视觉最强页） | ① 传感器卡加 sparkline（复用 `widget-visualizations`）<br>② 摄像头从弹模态改为常驻画中画<br>③ 光谱从弹层改为常驻侧栏 | `monitor-beautiful.tsx:885` / `:1014` |
| **device-control** | 设备卡只有线性 icon + 状态点 | ① 设备卡加实景/大号图形 + 状态光晕<br>② 环境参数 2×2 从纯数字改环形/刻度条<br>③ 补光色温加光谱预览带 | `:2553` / `:3736` / `:959` |
| **automation** | 策略卡只有纯数字指标 | ① 卡上加「触发源 → 动作」迷你流程图（复用 editor 的节点样式）<br>② 加近 7 天触发 sparkline<br>③ 空态换插画 | `automation/page.tsx:866` / `:892` |
| **activity** | StatCard 纯数字 + 时间线 | ① StatCard 改环形进度<br>② 动态条目附缩略图<br>③ Hero 加插画 | `activity-client.tsx:160` / `:80` |
| **profile** | `loading` 直接 `return null`（无加载态） | ① 补骨架屏<br>② 设备卡加缩略图 + 光晕<br>③ 活动列表加类型图标 | `page.tsx:144` / `:412` / `:381` |
| **chat** | 空态是灰底图标 + 两行字 | 空态换插画；媒体消息缩略图网格 | `components/chat/chat-empty-state.tsx:11` |
| **my-mcp** | 有 IP 图 + 服务图标；无加载态 | ① 连接状态改脉冲光环<br>② 空态换插画 | `page.tsx:360` / `:320` |

### 4.3 一个结构性缺口：没有热力图

全库搜不到 `heatmap` 组件 —— 而**热力图是物联网监控最典型的可视化**。
3D 大棚模型与二维仪表盘都没有把温湿度/CO₂ 的**空间分布**呈现出来，用户只能看单点数字。

> 建议新增 `components/dashboard/heatmap-grid.tsx`（纯 SVG 矩形色块 + 插值），
> 落点：monitor 3D 模型旁、dashboard 图表区。这是"视觉概念"缺失里最有业务价值的一项。

---

## 五、落地节奏建议

| 批次 | 内容 | 理由 |
|---|---|---|
| **已完成** | 诊断链路（网关/协议/卡片/端点）+ YOLO 检测器 + 检测叠层 + 胶囊接入 | 能力闭环，可验收 |
| **下一批（便宜）** | 空态插画统一（7 页）+ 接线 `AiInsightCard` + 合并三份光谱卡 | 一行 import 级改动，观感提升最明显 |
| **再下一批（有业务价值）** | 热力图组件 + 设备卡实物化 + 传感器 sparkline | 直接提升监控可读性 |
| **收尾** | 自训 YOLO 模型（用诊断过程累积的数据） | 形成平台独有资产 |

---

*文档版本：v1 · 2026-10-04 · 基于 berry-realm v4.0 代码实测*
