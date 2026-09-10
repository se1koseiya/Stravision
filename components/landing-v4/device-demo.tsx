"use client";

/* ------------------------------------------------------------
   设备调控（IoT 指令下发）模拟对话
   ─────────────────────────────────────────────────────────────
   演一遍「一句话 → 看清现场 → 找准设备 → 下发指令 → 拿到回执」。
   容器与播放逻辑在 ../demo-chat/shell。

   文案全部对齐真实实现：
     · 工具名  lib/mcp/mcp-tool-definitions.ts 的
               list_devices / toggle_relay（builtin-device-control）
               get_current_conditions / get_device_activity（builtin-farm-data）
     · 回执文案 lib/mcp/builtin-device-control.ts 的
               `${deviceName}已${开启|关闭}（设备状态已确认）`
     · 落地 UI 直接用产品里真实的 DeviceControlCard
               （components/ai/device-control-card.tsx，
                 与 chat-message-renderer 解析到 IoT 指令时渲染的是同一个）
   ------------------------------------------------------------ */

import { Radio } from "lucide-react";
import type { AgentStep } from "@/app/ai-assistant/_components/agent-thought-chain";
import { DeviceControlCard } from "@/components/ai/device-control-card";
import { DEVICE_IDS } from "@/lib/constants";
import { DemoChat, DemoChip } from "./demo-chat/shell";

const QUESTION = "3 号棚有点闷，帮我把环境风扇打开";

const ANSWER = `风扇开起来了。

刚读到 31.2°C、湿度 82%，湿度已经贴着灰霉的风险线，这一步通风是对的。**环境风扇（relay6）已在 09:41 开启**，设备回执确认状态是 on，不是「指令发出去了」那种口头答应。

要不要顺手设成自动：湿度回落到 70% 以下自动关，并推一条通知给你？`;

/* 与 chat-message-renderer 解析到的 IoT 指令同结构 */
const FAN_COMMAND = {
  action: "toggle_relay",
  device: DEVICE_IDS.FAN,
  deviceName: "环境风扇",
  value: 1,
};

const STEPS: AgentStep[] = [
  {
    id: "d1",
    kind: "task",
    status: "completed",
    toolName: "get_current_conditions",
    title: "读取 3 号棚当前状态",
    subnote: "31.2°C · 湿度 82% · CO₂ 640ppm",
    durationMs: 1400,
    children: [
      { id: "d1c1", type: "read", title: "温度 31.2°C", detail: "近 1h +1.8°C", status: "completed" },
      { id: "d1c2", type: "read", title: "湿度 82%", detail: "偏高", status: "completed" },
      { id: "d1c3", type: "thinking", title: "湿度贴着灰霉风险线，建议先通风", detail: "低温高湿是灰霉高发窗口", status: "completed" },
    ],
  },
  {
    id: "d2",
    kind: "task",
    status: "completed",
    toolName: "list_devices",
    title: "定位可控设备",
    subnote: "4 个继电器通道 · 权限校验通过",
    durationMs: 900,
    children: [
      { id: "d2c1", type: "search", title: "环境风扇 · relay6", detail: "命中", status: "completed" },
      { id: "d2c2", type: "search", title: "灌溉水泵 · relay5 / 补光灯 · relay7-8", detail: "本次不动作", status: "completed" },
    ],
  },
  {
    id: "d3",
    kind: "task",
    status: "completed",
    toolName: "toggle_relay",
    title: "下发开启指令",
    subnote: "已通过 MQTT 下发 · 等待设备回执",
    durationMs: 2400,
    children: [
      { id: "d3c1", type: "command", title: "环境风扇 relay6 → on", detail: "node_id 已确认", status: "completed" },
      { id: "d3c2", type: "tool", title: "设备状态已确认：relay6 = on", detail: "回执耗时 1.8s", status: "completed" },
    ],
  },
  {
    id: "d4",
    kind: "task",
    status: "completed",
    toolName: "get_device_activity",
    title: "回读动作记录",
    subnote: "3 号棚 · 环境风扇 · 09:41 开启",
    durationMs: 800,
  },
];

export function DeviceDemo() {
  return (
    <DemoChat
      subtitle="设备调控"
      question={QUESTION}
      steps={STEPS}
      answer={ANSWER}
      trailing="指令已确认 · 回执 1.8s · 动作已留痕"
      footer={
        <>
          {/* 产品里真实的设备控制卡 */}
          <DeviceControlCard command={FAN_COMMAND} status="executed" />
          <DemoChip icon={<Radio className="size-3" />}>
            已开 09:41 · 留痕可回滚
          </DemoChip>
        </>
      }
    />
  );
}

export default DeviceDemo;
