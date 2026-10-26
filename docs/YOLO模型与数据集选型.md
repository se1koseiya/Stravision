# YOLO 模型与数据集选型（含许可证红线）

> 承接 `docs/视觉能力升级-YOLO与业务页视觉概念.md` §二「模型从哪来」。
> 那篇给的是三段式路线，这篇是**把每一段填成可执行的具体对象**：哪个架构、哪个数据集、哪个许可证、导出成什么、落盘到哪。
>
> 调研时间：2026-10-04 · 结论对「浏览器端 ONNX 推理 + 闭源商业 SaaS」这一前提成立。

---

## 0. 一句话结论

1. **先别训**：A 路线（VLM grounding 出框）已经上线，能直接跑，不需要任何模型文件。
2. **要本地实时框，选 Apache-2.0 架构**：`D-FINE` / `YOLOX` / `RF-DETR`。
   ⛔ **不要用 Ultralytics 的 YOLOv8 / YOLO11 / YOLO-World / YOLOE** —— AGPL-3.0，商业 SaaS 会触发开源义务。
3. **数据集首选**：Roboflow 的 `Strawberry_Disease_7Classes`（15,530 张 / 7 类 / Public Domain / 免费可商用）。

---

## 1. ⚠️ 许可证红线（这一节比模型精度重要）

| 架构 | 代码许可证 | 权重许可证 | 闭源商用 |
|---|---|---|---|
| Ultralytics YOLOv5 / YOLOv8 / YOLO11 / YOLO26 | AGPL-3.0 | AGPL-3.0 | ❌ 需买 Enterprise License |
| YOLO-World / YOLOE（构建于 ultralytics 之上） | AGPL-3.0 | AGPL-3.0 | ❌ |
| **D-FINE**（`*_coco.pth` 系列） | Apache-2.0 | Apache-2.0 | ✅ |
| **RF-DETR**（Nano / Small / Medium / Large） | Apache-2.0 | Apache-2.0 | ✅（XL / 2XL 走 Roboflow PML 1.0，需平台套餐） |
| **YOLOX** | Apache-2.0 | Apache-2.0 | ✅ |
| **Grounding DINO / OWLv2**（开放词汇） | Apache-2.0 | Apache-2.0 | ✅ |
| onnxruntime-web（本项目推理运行时） | MIT | — | ✅ |

### 两条必须知道的事实

**① AGPL 的「网络条款」正好打在 SaaS 上。**
普通 GPL 只在「分发二进制」时触发；AGPL 额外覆盖「用户通过网络与之交互」。也就是说：
`stravision.site` 用 YOLOv8 做服务端/桌面端推理，即使用户从没下载过任何二进制，**也触发开源整个衍生作品的义务**（含训练脚本、配置、以及引用它的那部分平台代码）。
> 出处：Ultralytics 官方 license 页明确把「SaaS platforms, APIs, or cloud systems that use YOLO behind the scenes」列为必须购买 Enterprise License 的情形。

**② 微调不改变许可证。**
「我自己标注数据、自己训的模型」并不因此洗白：**从 `yolov8n.pt` 这类 AGPL 预训练权重出发训出来的权重，仍然是 AGPL**。官方 license 页与维护者回复都点明了这一点（"Fine-tuned weights and a private deployment do not escape the obligation"）。

### 所以只有三条合规出路

| 出路 | 代价 | 适用 |
|---|---|---|
| 买 Ultralytics Enterprise License | 年费 | 想省事、且预算允许 |
| 把整个平台按 AGPL-3.0 开源 | 商业模式被改变 | 若 berry-realm 本来就打算开源 |
| **换 Apache-2.0 架构**（推荐） | 解码器改一次 | 想零授权成本、代码保持闭源 |

> 本项目的检测解码在 `lib/vision/yolo-detector.ts`，换架构要改的是 `decodeYolov8()` 这一个函数（见 §4），代价可控。

---

## 2. 数据集（都是真实可下载的）

| # | 数据集 | 规模 | 类别 | 许可证 | 链接 |
|---|---|---|---|---|---|
| **1 ⭐** | `Strawberry_Disease_7Classes`（Roboflow · hello-peter） | **15,530 张**（13978 / 777 / 776） | 7 类草莓病害 | **Public Domain** | https://universe.roboflow.com/hello-peter/strawberry_disease_7classes |
| 2 | `strawberry disease`（Roboflow · -gdego） | 2,552 张 640×640 | 草莓病害 | CC BY 4.0（需署名） | https://universe.roboflow.com/-gdego/strawberry-disease-956xg-iae6c |
| 3 | 韩国温室草莓病害（Kaggle 原始集） | 2,500 张 419×419，**带分割掩码** | 7 类（叶 / 果 / 花） | 学术公开集 | 复现仓库 https://github.com/BrunoKreiner/strawberry_diseases · Roboflow 镜像 https://universe.roboflow.com/dlbs-zcxsj/strawberry-hxgaj |
| 4 | PlantVillage / PlantDoc（通用热身） | 数万张 | 多作物 | CC / 学术 | 不建议作主训练集 |

**为什么 #1 是首选**：规模最大、7 类体系与学术界一致、Public Domain 无商用限制、Roboflow 一键导出 YOLO 格式标注。
**为什么 #3 值得留**：类别与 #1 一致、且**有分割掩码** —— 未来若要做「病斑面积占比」这类指标，只有它带 mask。
**为什么 #4 要打折**：PlantVillage 是「标准照」（干净背景、单片叶、居中），与棚内实拍（叠叶、逆光、手机抖动、远近混杂）分布差异极大；拿它训出来的模型进棚就掉点。它能用来做预训练热身，不能当验收集。

> 📌 Roboflow 导出的标注是 Ultralytics YOLO 文本格式（`class cx cy w h`，归一化）。**这是数据格式，不携带 AGPL**，用 YOLOX / D-FINE 训练照样能读，只需改一下 `data.yaml` 的路径与 `names`。
> #2 是 CC BY 4.0：商用可以，但**必须保留署名**（产品关于页 / 文档里注明数据来源）。

---

## 3. 七类标注体系（可直接当作 `yolo-crop-labels.json`）

来源：MDPI 2025《CAFM-Enhanced YOLOv8: A Two-Stage Optimization for Precise Strawberry Disease Detection in Complex Field Conditions》，其 7 类与 §2 的 #1 / #3 数据集一致：

```json
[
  "Strawberry_Angular_LeafSpot",
  "Strawberry_Anthracnose_Fruit_Rot",
  "Strawberry_Blossom_Blight",
  "Strawberry_Gray_Mold",
  "Strawberry_Leaf_Spot",
  "Strawberry_Powdery_Mildew_Fruit",
  "Strawberry_Powdery_Mildew_Leaf"
]
```

中文对照（前端 label 用）：角斑病 / 炭疽果腐 / 花腐病 / 灰霉病 / 叶斑病 / 白粉病（果）/ 白粉病（叶）。

> 🚨 **顺序即身份**：`labels.json` 的下标必须与训练时 `data.yaml` 的 `names` 顺序**逐位一致**。错一位 = 系统性误诊（把灰霉判成叶斑），且模型置信度照样很高 —— 这是最难从结果里发现的一类事故。

---

## 4. 与本项目解码器的匹配（换架构时必须看）

`lib/vision/yolo-detector.ts` 当前的 `decodeYolov8()` 假设输出张量是 **`[1, 4+nc, N]`**（YOLOv8 / YOLO11 布局）+ 需要 NMS。

| 架构 | 输出布局 | 需要 NMS | 本项目要改什么 |
|---|---|---|---|
| YOLOv8 / YOLO11（AGPL ⛔） | `[1, 4+nc, N]` | 是 | 现成 ✅ |
| YOLOX（Apache ✅） | `[1, N, 5+nc]`（cx,cy,w,h,**obj**,cls…） | 是 | 改解码：转置 + 乘上 obj 置信度 |
| **D-FINE（Apache ✅）** | NMS-free：`logits [1,N,nc]` + `boxes [1,N,4]`（cxcywh 归一化） | 否 | 改解码，且可**直接删掉 NMS**（更快更简单） |
| RF-DETR（Apache ✅） | NMS-free，同 DETR 家族 | 否 | 同上 |
| YOLO-World / YOLOE（AGPL ⛔） | `[1, 4+nc, N]`，但 nc 随文本提示变 | 是 | 还需在浏览器端跑 CLIP 文本编码器 → 不划算 |
| OWLv2 / Grounding DINO（Apache ✅） | 随 prompt 变 | 通常不需要 | 需要浏览器端文本编码器，包体大，不建议首版 |

**结论**：若走 Apache-2.0 路线，**D-FINE 是改动最小、收益最大的一档** —— 连 NMS 都能省掉，前端推理更快。

---

## 5. 导出 → 落盘（可照抄）

```bash
# 1) 训练（以 D-FINE 为例，Apache-2.0）
#    数据：§2 #1 导出的 YOLO 格式；类别：§3 的 7 类
# 2) 导出 ONNX（静态输入 640，与项目 letterbox 预处理对齐）
pip install onnx onnxslim onnxruntime
#    D-FINE 官方仓库自带导出脚本；若用 ultralytics（需已购 Enterprise）则是：
#    yolo export model=best.pt format=onnx opset=12 simplify=True imgsz=640
```

**落盘约定**（`public/models/README.md` 已写路径，这里补规格）：

```
public/models/yolo-crop-detect.onnx    # 静态输入 [1,3,640,640] float32, RGB
public/models/yolo-crop-labels.json    # §3 的 7 类，顺序 === 训练 names 顺序
```

三条工程断言：

1. **类序一致** —— 见 §3 的警告。
2. **输入规格一致** —— `imgsz=640` 静态输入；项目侧 letterbox 已实现，不要导出 dynamic axes（会与固定预处理打架）。
3. **解码器与架构一致** —— 见 §4。`4+nc` 是从 `labels.json.length` 推出来的，换架构必须同步改 `decodeYolov8()`。

> 没有模型文件时的行为已经设计好了：`ensureDetector()` 先发 HEAD 探测，404 即标记 `unavailable` 并给出可读原因，`detect()` 返回空数组 —— **诊断链路照常工作**，框由 VLM grounding 提供。所以模型可以后补，不影响功能上线。

---

## 6. 建议的推进组合

| 阶段 | 做什么 | 投入 | 产出 |
|---|---|---|---|
| **A（已上线）** | VLM grounding 出框 | 0 | 可用的框 + 完整诊断 |
| **B（1~2 天）** | 下载 §2 #1 → 用 **D-FINE-S/M 或 YOLOX-S**（Apache-2.0）训 7 类 → 导出 ONNX → 落盘 §5 | 一张消费级显卡半天 | 本地毫秒级定位，零授权成本 |
| **C（持续）** | 用 A 阶段累积的**真实棚内照片 + 已确认结论**自训（每类 ≥300~500 个标注实例） | 数据攒够了再训 | 平台独有资产，精度反超公开集 |

**合规推荐组合（零授权成本）**：
> **D-FINE-S/M 或 YOLOX-S（Apache-2.0 代码 + 权重）** + **Roboflow Strawberry_Disease_7Classes（Public Domain）** + **ONNX opset 12 静态 640**。
> 若未来确实想用 YOLOv8 的生态与工具链，那笔钱该花 —— 但先把许可证这件事记在账上，别等上线后才发现。

---

## 附：事实来源

- Ultralytics 官方 license 页（AGPL 触发条件 / Enterprise 适用场景）：https://www.ultralytics.com/license
- Ultralytics 仓库维护者关于「微调权重仍受 AGPL 约束」的答复：https://github.com/ultralytics/ultralytics/issues/7634
- D-FINE（Apache-2.0，COCO 权重可商用、Objects365 变体未获商用授权）：https://github.com/Peterande/D-FINE
- 第三方模型/依赖许可证分级策略（对 RF-DETR、YOLOX、Grounding DINO、OWLv2 的许可证归类）：https://github.com/nrl-ai/anylearning-oss/blob/main/docs/model_license_policy.md
- 草莓 7 类体系与草莓病害检测 SOTA 做法：https://www.mdpi.com/2076-3417/15/18/10025
- YOLOv8 草莓病害分割复现（韩国温室数据，mAP50 ≈ 92~93%）：https://github.com/BrunoKreiner/strawberry_diseases
- YOLO-World（开放词汇，注意 AGPL）：https://github.com/AILab-CVC/YOLO-World · YOLOE（ICCV 2025）：https://arxiv.org/abs/2503.07465

---

*文档版本：v1 · 2026-10-04 · 许可证判断基于上述官方来源，非法律意见；正式商用前请复核原始许可证文本。*
