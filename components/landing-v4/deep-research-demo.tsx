"use client";

/* ------------------------------------------------------------
   深度研究（deep_research）模拟对话
   ─────────────────────────────────────────────────────────────
   在场景区的预览台里演一遍「一次提问 → 多轮检索 → 带着引用入库」。
   容器与播放逻辑在 ../demo-chat/shell，这里只提供本场景的料。

   链路的阶段名、child 类型、耗时、子查询数量都按
   lib/ai/deep-research-service.ts 的真实进度回调
   （plan → search → gap → search → synthesize）与
   lib/mcp/builtin-deep-research.ts 的入库提示来写。
   ------------------------------------------------------------ */

import { ArrowDownToLine } from "lucide-react";
import { Sources } from "@ant-design/x";
import type { AgentStep } from "@/app/ai-assistant/_components/agent-thought-chain";
import { DemoChat, DemoChip } from "./demo-chat/shell";

/* ---- 演示问题与答复 ---- */

const QUESTION =
  "帮我研究一下设施草莓灰霉病的绿色防控，整理成能直接用的资料";

const ANSWER = `已经研究完，也存进你的知识库了。三条主线：

**① 发生条件** —— 棚内相对湿度持续 > 90%（≥ 4 小时）叠加 18–22°C 是最佳诱发窗口，低温高湿期风险最高。[1][2]

**② 生物防治** —— 哈茨木霉、枯草芽孢杆菌在发病前预防性使用效果最好；与化学药剂交替使用可延缓抗性。[3][4]

**③ 环境调控** —— 上午揭膜排湿、控制单次灌溉量，把叶面结露压到 4 小时以内，发病率能明显压下来。[5]

**建议执行顺序：** 现蕾前生物菌剂打底 → 低温高湿期改用烟剂 / 粉尘剂 → 每次采后清园。已存入知识库「AI研究」标签，下次直接问就能被召回。`;

/* ---- 真实引用来源 ---- */

const SOURCES = [
  { title: "设施草莓灰霉病的发生规律与流行条件", url: "https://www.caas.cn", description: "中国农业科学院蔬菜花卉研究所" },
  { title: "低温高湿期草莓灰霉病风险预警要点", url: "https://www.natesc.org.cn", description: "全国农业技术推广服务中心" },
  { title: "哈茨木霉菌防治草莓灰霉病田间药效试验", url: "https://www.zgswfz.com.cn", description: "中国生物防治学报" },
  { title: "枯草芽孢杆菌在设施草莓上的登记情况", url: "https://www.chinapesticide.org.cn", description: "中国农药信息网" },
  { title: "棚室环境调控对灰霉病发病率的影响", url: "https://www.ssyy.org.cn", description: "设施园艺" },
  { title: "草莓灰霉病施药窗口与安全间隔期", url: "https://www.ipp.gov.cn", description: "农药登记公告" },
  { title: "烟剂与粉尘剂在低温高湿期的使用", url: "https://www.zbjsyy.com", description: "植保技术与推广" },
  { title: "采后清园对翌年灰霉病基数的抑制", url: "https://www.bfyy.org.cn", description: "北方园艺" },
];

/* ---- 执行链路（字段与 AgentStep 完全一致） ---- */

const STEPS: AgentStep[] = [
  {
    id: "s1",
    kind: "task",
    status: "completed",
    toolName: "deep_research",
    title: "拆解研究子查询",
    subnote: "发生条件 · 生物防治菌剂 · 棚内环境调控",
    durationMs: 3800,
    children: [
      { id: "s1c1", type: "thinking", title: "识别研究维度", detail: "病害发生 · 防治手段 · 环境管理", status: "completed" },
    ],
  },
  {
    id: "s2",
    kind: "task",
    status: "completed",
    toolName: "web_search",
    title: "并行检索 3 个子查询",
    subnote: "命中 6 条来源 · 已去重",
    durationMs: 15200,
    children: [
      { id: "s2c1", type: "search", title: "灰霉病发生条件与流行规律", detail: "3 条", status: "completed" },
      { id: "s2c2", type: "search", title: "哈茨木霉 / 枯草芽孢杆菌 登记剂型", detail: "2 条", status: "completed" },
      { id: "s2c3", type: "search", title: "棚内温湿度调控与通风", detail: "1 条", status: "completed" },
    ],
  },
  {
    id: "s3",
    kind: "task",
    status: "completed",
    toolName: "deep_research",
    title: "第 1 轮缺口分析",
    subnote: "已有 6 条来源，发现 2 处缺口",
    durationMs: 6100,
    children: [
      { id: "s3c1", type: "thinking", title: "缺口识别", detail: "缺施药窗口 / 缺低温高湿期方案", status: "completed" },
    ],
  },
  {
    id: "s4",
    kind: "task",
    status: "completed",
    toolName: "web_search",
    title: "补搜：施药窗口与低温高湿期方案",
    subnote: "新增 2 条来源",
    durationMs: 9400,
    children: [
      { id: "s4c1", type: "search", title: "灰霉病施药窗口与安全间隔期", detail: "1 条", status: "completed" },
      { id: "s4c2", type: "search", title: "烟剂 / 粉尘剂在低温高湿期的用法", detail: "1 条", status: "completed" },
    ],
  },
  {
    id: "s5",
    kind: "task",
    status: "completed",
    toolName: "deep_research",
    title: "融合 8 条来源",
    subnote: "交叉验证 + 逐条标注引用",
    durationMs: 12300,
    children: [
      { id: "s5c1", type: "thinking", title: "观点对齐", detail: "8 处引用 · 1 处口径差异已标注", status: "completed" },
    ],
  },
  {
    id: "s6",
    kind: "task",
    status: "completed",
    toolName: "knowledge_save",
    title: "写入知识库",
    subnote: "《设施草莓灰霉病绿色防控》· 12 个分块",
    durationMs: 5200,
  },
];

export function DeepResearchDemo() {
  return (
    <DemoChat
      subtitle="深度研究"
      question={QUESTION}
      steps={STEPS}
      answer={ANSWER}
      trailing={`研究完成 · 耗时 47s · ${SOURCES.length} 条来源`}
      footer={
        <>
          {/* 与产品里 chat-message-renderer.tsx 的 SourcesFooter 保持同一外观：
              虚线上边框 + 0.78 透明度 */}
          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: "1px dashed rgba(0,0,0,0.06)",
              opacity: 0.78,
            }}
          >
            <Sources
              title={`引用 ${SOURCES.length} 个来源`}
              items={SOURCES}
              expandIconPosition="end"
            />
          </div>
          <DemoChip icon={<ArrowDownToLine className="size-3" />}>
            已存入知识库「AI研究」· 12 个分块
          </DemoChip>
        </>
      }
    />
  );
}

export default DeepResearchDemo;
