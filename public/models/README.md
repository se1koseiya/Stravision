# 本地视觉模型目录

这个目录用于放置**浏览器端推理**的目标检测模型（YOLO 系列），
由 `lib/vision/yolo-detector.ts` 加载，供病虫害诊断的检测框叠层使用。

## 约定路径

| 文件 | 必需 | 说明 |
|---|---|---|
| `yolo-crop-detect.onnx` | 是 | YOLOv8 检测模型（导出为 ONNX，输入 `1×3×640×640` float32，输出 `[1, 4+nc, N]`） |
| `yolo-crop-labels.json` | 否 | 类别名数组，如 `["病斑","蚜虫","红蜘蛛","果实"]`；缺失时显示为 `目标 1`、`目标 2` |

## 没有模型会怎样

**不会报错，功能也不缺失。**

`lib/vision/yolo-detector.ts` 会先发一个 `HEAD` 请求探测模型是否存在：

- **存在** → 走本地检测，框来自 YOLO（毫秒级、可解释、可计数），`source: "yolo"`
- **不存在（404）** → 标记为 `unavailable` 并静默降级，`detect()` 返回空数组，
  前端自动回落到 VLM 产出的检测框（`source: "vlm"`）

也就是说：**YOLO 是增强，不是依赖。** 先上线诊断能力、后补模型，是完全可行的路径。

## 关于运行时

模型由项目**已有的** onnxruntime-web 运行时加载 —— 就是 `public/vad/` 里那套
（当初为 Silero VAD 引入）。本目录只需要放模型权重，**不要重复拷贝 wasm 文件**。

多线程 wasm 依赖 `SharedArrayBuffer`，而它由 `next.config.ts` 的
COOP / COEP 响应头保障（已配置）。若页面未能处于跨源隔离环境，
检测器会给出可读的降级原因，不影响诊断。

## 模型从哪来

👉 **完整选型（架构 / 数据集 / 许可证 / 导出命令）见 `docs/YOLO模型与数据集选型.md`。** 摘要：

1. **现在就可用** —— 不部署模型，框由 VLM 的 grounding 能力提供（已上线）；
2. **快速起步** —— 用 **Apache-2.0 架构**（D-FINE / YOLOX / RF-DETR）在公开草莓病害数据集上训 7 类，
   导出 ONNX 落到本目录；数据集首选 Roboflow `Strawberry_Disease_7Classes`（15,530 张 / Public Domain）；
3. **目标态** —— 用平台累积的病历图片自训草莓病虫害检测器，形成平台独有资产。

> 🚨 **许可证红线**：Ultralytics 的 YOLOv8 / YOLO11 / YOLO-World / YOLOE 都是 **AGPL-3.0**，
> 其「网络条款」对 SaaS 同样生效 —— 闭源商用它必须买 Enterprise License；
> 而且**微调不改变许可证**（拿 `yolov8n.pt` 训出来的权重仍是 AGPL）。
> 想零授权成本，就选上表里的 Apache-2.0 架构。详见上述选型文档 §1。

> ⚠️ **不要只依赖检测模型**：草莓病害是长尾类别，纯检测器会把不认识的病害
> 硬塞进最近的已知类，导致**错用药**。定位交给 YOLO，鉴别必须交给 VLM。

> 🚨 换架构时**必须同步改解码器** `lib/vision/yolo-detector.ts` 的 `decodeYolov8()`：
> 本文件当前约定输出 `[1, 4+nc, N]`（YOLOv8 布局）；D-FINE / RF-DETR 是 NMS-free 的
> `logits + boxes` 双输出，YOLOX 是 `[1, N, 5+nc]`。各架构的差异对照见选型文档 §4。
