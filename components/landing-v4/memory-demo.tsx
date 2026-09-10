"use client";

/* ------------------------------------------------------------
   记忆功能（用户记忆档案）模拟对话
   ─────────────────────────────────────────────────────────────
   演一遍「用户随口提的信息 → AI 落成记忆档案 → 新对话照样认得你」。
   容器与播放逻辑在 ../demo-chat/shell。

   文案全部对齐真实实现：
     · 工具名   lib/mcp/mcp-tool-definitions.ts 的 builtin-user-memory
                （remember_user_info / list_user_memory / forget_user_info）
     · 返回值   lib/mcp/builtin-user-memory.ts 的
                `已记住：${label}「${value}」` 与 execListMemory 的
                `label：value` 拼接格式
     · 中文标签 lib/ai/user-memory-file-service.ts 的 MEMORY_KEY_TITLES
                （user_name→称呼、greenhouse_info→大棚/场地、
                  strawberry_variety→草莓品种、focus_area→关注重点）
     · 落地 UI  直接用产品里真实的 MemoryProfileBar（传 items 走预览分支，
                线上不传参时行为不变）
   ------------------------------------------------------------ */

import { NotebookPen } from "lucide-react";
import type { AgentStep } from "@/app/ai-assistant/_components/agent-thought-chain";
import { MemoryProfileBar } from "@/components/ai/memory-profile-bar";
import { DemoChat, DemoChip } from "./demo-chat/shell";

const QUESTION = "我叫小朱，1 号棚种的是红颜，帮我盯着点灰霉病";

const ANSWER = `记好了，以后就这么来：

- **称呼** —— 小朱
- **大棚** —— 1 号棚
- **品种** —— 红颜
- **关注重点** —— 灰霉病防控

以后再聊到「我那棚」，我就知道是 1 号棚的红颜了，不用你每次交代一遍。这几条存进了你的记忆档案，新开对话、换台设备叫我，我都认得出你。`;

/* 真实记忆档案条目（key 与中文标签都取自 MEMORY_KEY_TITLES） */
const MEMORY_ITEMS = [
  { key: "user_name", label: "称呼", value: "小朱", confidence: 0.95 },
  { key: "greenhouse_info", label: "大棚/场地", value: "1号棚", confidence: 0.95 },
  { key: "strawberry_variety", label: "草莓品种", value: "红颜", confidence: 0.95 },
  { key: "focus_area", label: "关注重点", value: "灰霉病防控", confidence: 0.85 },
];

const STEPS: AgentStep[] = [
  {
    id: "m1",
    kind: "task",
    status: "completed",
    toolName: "remember_user_info",
    title: "记住称呼、大棚与品种",
    subnote: "user_name · greenhouse_info · strawberry_variety",
    durationMs: 1600,
    children: [
      { id: "m1c1", type: "thinking", title: "判定为可长期复用", detail: "不是临时指令，值得落档", status: "completed" },
      { id: "m1c2", type: "tool", title: "已记住：称呼「小朱」", detail: "user_name", status: "completed" },
      { id: "m1c3", type: "tool", title: "已记住：大棚/场地「1号棚」", detail: "greenhouse_info", status: "completed" },
      { id: "m1c4", type: "tool", title: "已记住：草莓品种「红颜」", detail: "strawberry_variety", status: "completed" },
    ],
  },
  {
    id: "m2",
    kind: "task",
    status: "completed",
    toolName: "remember_user_info",
    title: "记住关注重点",
    subnote: "focus_area",
    durationMs: 900,
    children: [
      { id: "m2c1", type: "tool", title: "已记住：关注重点「灰霉病防控」", detail: "focus_area", status: "completed" },
    ],
  },
  {
    id: "m3",
    kind: "task",
    status: "completed",
    toolName: "list_user_memory",
    title: "回读确认",
    subnote: "4 条记忆已落档",
    durationMs: 700,
    children: [
      {
        id: "m3c1",
        type: "read",
        title: "称呼：小朱；大棚/场地：1号棚；草莓品种：红颜；关注重点：灰霉病防控",
        detail: "写入 data/user-memory 记忆档案",
        status: "completed",
      },
    ],
  },
];

export function MemoryDemo() {
  return (
    <DemoChat
      subtitle="记忆档案"
      question={QUESTION}
      steps={STEPS}
      answer={ANSWER}
      trailing={`已记入记忆 · ${MEMORY_ITEMS.length} 条 · 新对话也会带上`}
      footer={
        <>
          {/* 产品里真实的记忆感知条 */}
          <MemoryProfileBar items={MEMORY_ITEMS} defaultExpanded />
          <DemoChip icon={<NotebookPen className="size-3" />}>
            已写入记忆档案 · 跨设备同步
          </DemoChip>
        </>
      }
    />
  );
}

export default MemoryDemo;
