"use client";

/* ------------------------------------------------------------
   画布舞台 —— 产品更新页里「实际场景」用的真画布
   ─────────────────────────────────────────────────────────────
   不是示意图、不是对话气泡：这里跑的就是自动化编辑器里那套东西 ——
     · ReactFlow 真画布（@xyflow/react，与 app/automation/editor/page.tsx 同一个库）
     · 真节点组件  components/automation/{trigger,logic,action}-node.tsx
     · 真连线组件  components/automation/deletable-edge.tsx（smoothstep + 箭头）
     · 真光效      components/ai/copilot/canvas-activity-glow.tsx

   动画演的是 tool description 里写的那件事：莓小智拿着
   automation_canvas_apply 往画布上 add_node / connect，
   节点一个一个长出来、连线跟着接上、镜头自动推到位，做完转绿。

   节点 data 结构与 editor 完全一致：{ label, type(subType), config, status }。
   ------------------------------------------------------------ */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MarkerType,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ConfigProvider, theme as antdTheme } from "antd";
import { useTheme } from "next-themes";
import TriggerNode from "@/components/automation/trigger-node";
import LogicNode from "@/components/automation/logic-node";
import ActionNode from "@/components/automation/action-node";
import { DeletableEdge } from "@/components/automation/deletable-edge";
import { CanvasActivityGlow } from "@/components/ai/copilot/canvas-activity-glow";

const nodeTypes = {
  triggerNode: TriggerNode,
  logicNode: LogicNode,
  actionNode: ActionNode,
};

const edgeTypes = { deletable: DeletableEdge };

const EDGE_BASE = {
  type: "deletable",
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
} as const;

/** 画布内容：列坐标沿用 editor 的自动排布（40 / 340 / 640 / 940） */
const NODES: Node[] = [
  {
    id: "t1",
    type: "triggerNode",
    position: { x: 20, y: 210 },
    data: {
      label: "土壤湿度 < 40%",
      type: "sensor",
      status: "completed",
      config: { sensor: "soil", frequency: "5m" },
    },
  },
  {
    id: "l1",
    type: "logicNode",
    position: { x: 348, y: 220 },
    data: {
      label: "当前处于夜间？",
      type: "compare",
      status: "completed",
      config: { operator: "gt", value: "18" },
    },
  },
  {
    id: "a1",
    type: "actionNode",
    position: { x: 660, y: 90 },
    data: {
      label: "开启滴灌 8 分钟",
      type: "device",
      status: "completed",
      config: { device: "pump", action: true },
    },
  },
  {
    id: "a2",
    type: "actionNode",
    position: { x: 660, y: 340 },
    data: {
      label: "推送通知到手机",
      type: "notification",
      status: "completed",
      config: {},
    },
  },
];

const EDGES: Edge[] = [
  { id: "e1", source: "t1", target: "l1", ...EDGE_BASE },
  {
    id: "e2",
    source: "l1",
    sourceHandle: "true",
    target: "a1",
    label: "是",
    ...EDGE_BASE,
    labelStyle: { fontSize: 11 },
    labelBgStyle: { fill: "transparent" },
  },
  {
    id: "e3",
    source: "l1",
    sourceHandle: "false",
    target: "a2",
    label: "否",
    ...EDGE_BASE,
    labelStyle: { fontSize: 11 },
    labelBgStyle: { fill: "transparent" },
  },
];

/** step = 画布上已「长出来」的元素进度：1 → 只有触发器；4 → 全部做完 */
const STEP_MS = 1150;

function Stage() {
  const { fitView } = useReactFlow();
  const [step, setStep] = useState(1);
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const alive = useRef(true);
  const started = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  const clearAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const play = () => {
    clearAll();
    if (!alive.current) return;
    setStep(1);
    setActive(true);
    setDone(false);

    [2, 3, 4].forEach((s, i) => {
      timers.current.push(
        setTimeout(() => {
          if (alive.current) setStep(s);
        }, STEP_MS * (i + 1))
      );
    });

    const finished = STEP_MS * 3 + 800;
    timers.current.push(setTimeout(() => alive.current && setDone(true), finished));
    timers.current.push(
      setTimeout(() => alive.current && setActive(false), finished + 1400)
    );
    timers.current.push(
      setTimeout(() => play(), finished + 1400 + 1600)
    );
  };

  useEffect(() => {
    alive.current = true;
    const el = rootRef.current;
    const start = () => {
      if (started.current) return;
      started.current = true;
      play();
    };
    let io: IntersectionObserver | null = null;
    if (el && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            start();
            io?.disconnect();
          }
        },
        { threshold: 0.25 }
      );
      io.observe(el);
    } else {
      start();
    }
    return () => {
      alive.current = false;
      clearAll();
      io?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 每次「落笔」后镜头自动跟过去 —— 这是真画布的 fitView，不是假的推镜 */
  useEffect(() => {
    fitView({ duration: 700, padding: 0.18 });
  }, [step, fitView]);

  const nodes = useMemo(() => NODES.slice(0, Math.min(step, NODES.length)), [step]);
  const edges = useMemo(
    () => EDGES.slice(0, Math.max(0, Math.min(step, NODES.length) - 1)),
    [step]
  );

  return (
    <div
      ref={rootRef}
      className="relative h-[430px] w-full overflow-hidden rounded-[14px] border border-black/[0.07] dark:border-white/[0.08]"
      /* 🚨 contain: paint —— CanvasActivityGlow 内部是 position:fixed（产品里它就该贴视口）。
         不给出包含块的话，光效会绕**整个浏览器窗口**跑，画布本身一点光都看不见。
         这里让舞台成为它的包含块，光才会沿着这块画布的四边流动。 */
      style={{ contain: "paint" }}
    >
      <style>{`
        .ws-canvas .react-flow__node { animation: wsNodeIn .55s cubic-bezier(.16,1,.3,1) both; }
        @keyframes wsNodeIn { from { opacity: 0; filter: blur(4px) } to { opacity: 1; filter: none } }
        .ws-canvas .react-flow__edge { animation: wsEdgeIn .5s ease both; }
        @keyframes wsEdgeIn { from { opacity: 0 } to { opacity: 1 } }
        .ws-canvas .react-flow__attribution { display: none; }
      `}</style>

      <ConfigProvider
        theme={{
          algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: { colorPrimary: "#059669", borderRadius: 8 },
        }}
      >
        <ReactFlow
          className="ws-canvas"
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.35}
          maxZoom={1.6}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={18}
            size={1.5}
            color={dark ? "#2A2F2D" : "#E2E4E6"}
          />
        </ReactFlow>
      </ConfigProvider>

      {/* AI 正在往画布上落笔时的边缘光效（真组件） */}
      <CanvasActivityGlow
        active={active}
        phase={done ? "done" : "running"}
        tone="think"
        dark={dark}
        label={done ? "画布已更新 · 可 Ctrl+Z 撤销" : "莓小智正在修改画布…"}
        minVisibleMs={1200}
      />
    </div>
  );
}

export function CanvasStage() {
  return (
    <ReactFlowProvider>
      <Stage />
    </ReactFlowProvider>
  );
}

export default CanvasStage;
