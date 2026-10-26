"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ConfigProvider, Button, Menu, Avatar, Tag, Typography, theme } from "antd";
import { useTheme } from "next-themes";
import zhCN from "antd/locale/zh_CN";
import { Bubble, Conversations, Prompts, Sender, ThoughtChain } from "@ant-design/x";
import type { BubbleListProps } from "@ant-design/x";
import XMarkdown from "@ant-design/x-markdown";
import BerryOrb from "@/components/smoothui/berry-orb";
import { IconBrain, IconCalendar, IconCamera, IconChartLine, IconCheckOne, IconCompass, IconCpu, IconDatabaseNetwork, IconEdit, IconFileSearch, IconFolderOpen, IconLayoutTwo, IconListCheckbox, IconMagic, IconMicrophone, IconRouter, IconSearch, IconShare } from "@/components/icon";
import { ChatBubbleList, type ChatBubbleListProps } from "@/app/ai-assistant/_components/chat-bubble-list";
import { ChatSenderInput } from "@/app/ai-assistant/_components/chat-sender-input";
import type { AgentStep } from "@/app/ai-assistant/_components/agent-thought-chain";
import type { Message } from "@/app/ai-assistant/types";

/* ------------------------------------------------------------
   莙小智 · 原生 ai-assistant 对话复刻（落地页 Hero 用）
   - XMarkdown 流式输出 + 尾部光标（照抄原生 MarkdownPart）
   - 每条回复先走 antdx ThoughtChain 执行链路（感知→分析→决策→执行）
   - 业务卡片 = ai-assistant 同款真组件（@ant-design/x-card A2UI 渲染）：
     策略卡 = AutomationStrategyCard；摄像头卡 = MonitorCard（未登录无流，
     展示占位画面）；图表 = ChartRenderer（纯展示）
   ------------------------------------------------------------ */

const ChartRenderer = dynamic(() => import("@/components/chart-renderer"), {
  ssr: false,
  loading: () => <div className="h-56 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-white/[0.06]" />,
})

const CardSkeleton = () => <div className="my-3 h-44 animate-pulse rounded-lg bg-zinc-100 dark:bg-white/[0.06]" />

/* ---- ai-assistant 同款业务卡片（@ant-design/x-card A2UI 渲染） ---- */

const AutomationStrategyCard = dynamic(
  () => import("@/components/automation-strategy-card").then((m) => m.AutomationStrategyCard),
  { ssr: false, loading: () => <CardSkeleton /> }
)

const MonitorCard = dynamic(
  () => import("@/components/ai/monitor-card").then((m) => m.MonitorCard),
  { ssr: false, loading: () => <CardSkeleton /> }
)

/* ---- 流式光标（照抄原生 StreamingTail） ---- */

const StreamingTail: React.FC<{ content?: string }> = ({ content = "▋" }) => {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 500)
    return () => clearTimeout(timer)
  }, [])
  if (!visible) return null
  return (
    <span
      style={{
        display: "inline-block",
        animation: "blink 1s steps(2, start) infinite",
        color: "#059669",
        fontWeight: "bold",
      }}
    >
      {content}
    </span>
  )
}

/* ---- Markdown 片段：XMarkdown 流式渲染（照抄原生 MarkdownPart） ---- */

function MdPart({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  const streaming = useMemo(
    () => ({
      hasNextChunk: isStreaming,
      enableAnimation: true,
      animationConfig: { fadeDuration: 200, easing: "ease-in-out" as const },
      tail: isStreaming ? { component: StreamingTail } : false,
    }),
    [isStreaming]
  )
  return (
    <XMarkdown paragraphTag="div" streaming={streaming}>
      {content}
    </XMarkdown>
  )
}

/* ---- 业务标签解析（照抄原生 renderTaggedContent 标签集） ---- */

type Part =
  | { type: "md"; text: string }
  | { type: "monitor" }
  | { type: "chart"; text: string }
  | { type: "strategy"; text: string; attrs: string }

const TAG_RE = /<(MONITOR|CHART|AUTOMATION_STRATEGY)([^>]*)>([\s\S]*?)<\/\1>/g

function splitParts(content: string, isStreaming: boolean): Part[] {
  const parts: Part[] = []
  let last = 0
  TAG_RE.lastIndex = 0
  for (const m of content.matchAll(TAG_RE)) {
    const before = content.slice(last, m.index)
    if (before.trim()) parts.push({ type: "md", text: before })
    const name = m[1]
    if (name === "MONITOR") parts.push({ type: "monitor" })
    else if (name === "CHART") parts.push({ type: "chart", text: m[3] })
    else parts.push({ type: "strategy", text: m[3], attrs: m[2] })
    last = m.index + m[0].length
  }
  let tail = content.slice(last)
  if (isStreaming) {
    const cut = tail.search(/<(MONITOR|CHART|AUTOMATION_STRATEGY)/)
    if (cut !== -1) tail = tail.slice(0, cut)
  }
  if (tail.trim()) parts.push({ type: "md", text: tail })
  return parts
}

/* ---- 消息正文：ThoughtChain + 标签解析渲染 ---- */

type ChainStep = { icon: React.ReactNode; title: string; description: string }

type ChatMsg = {
  key: string;
  role: "ai" | "user";
  content: string;
  chain?: ChainStep[];
  chainVisible?: number; // 已完成的链路步数
  streaming?: boolean; // 正文流式中
  thinking?: boolean; // 链路推进中
};

function MessageBody({ m }: { m: ChatMsg }) {
  const parts = splitParts(m.content, !!m.streaming)

  const chainItems = useMemo(() => {
    if (!m.chain) return []
    return m.chain.map((s, i) => {
      const isLastShown = i === (m.chainVisible ?? 0) - 1
      return {
        key: `s${i}`,
        icon: s.icon,
        title: s.title,
        description: s.description,
        status: (m.thinking && isLastShown ? "loading" : "success") as "loading" | "success",
      }
    })
  }, [m.chain, m.chainVisible, m.thinking])

  return (
    <div className="space-y-2">
      {m.chain && chainItems.length > 0 && (
        <ThoughtChain
          items={chainItems}
          className="[&_.ant-thought-chain-item]:!text-[12px] [&_.ant-thought-chain-item-content]:!text-[12px] [&_.ant-thought-chain-item-title]:!font-semibold"
        />
      )}
      {parts.map((p, i) => {
        if (p.type === "md") return <MdPart key={i} content={p.text} isStreaming={!!m.streaming} />
        // MONITOR：ai-assistant 同款 MonitorCard
        if (p.type === "monitor")
          return (
            <div key={i} className="flex justify-center my-3">
              <MonitorCard />
            </div>
          )
        if (p.type === "chart")
          return (
            <div key={i} className="h-[230px] w-full overflow-hidden rounded-xl border border-zinc-100 bg-white dark:border-white/[0.08] dark:bg-[#1A1F1B]">
              <ChartRenderer options={JSON.parse(p.text)} style={{ height: "100%", width: "100%" }} />
            </div>
          )
        // AUTOMATION_STRATEGY：ai-assistant 同款 AutomationStrategyCard（@ant-design/x-card A2UI）
        const desc = p.attrs?.match(/description="([^"]*)"/)?.[1]
        type StrategyNode = { id: string; type: string; data: Record<string, unknown> }
        type StrategyEdge = { source: string; target: string }
        let nodes: StrategyNode[] = []
        let edges: StrategyEdge[] = []
        try {
          const parsed = JSON.parse(p.text)
          nodes = parsed?.nodes ?? []
          edges = Array.isArray(parsed?.edges) ? parsed.edges : []
        } catch {}
        return <AutomationStrategyCard key={i} strategy={{ nodes, edges }} description={desc} />
      })}
    </div>
  )
}

/* ---- 演示剧本 ---- */

const A1_CHAIN: ChainStep[] = [
  { icon: <IconDatabaseNetwork className="size-3.5" />, title: "查询实时传感器", description: "3 号棚湿度 78%，连续 40 分钟越限" },
  { icon: <IconChartLine className="size-3.5" />, title: "调取近 24h 湿度曲线", description: "夜间 3 次越限，白天均值 61%" },
  { icon: <IconBrain className="size-3.5" />, title: "评估灰霉病风险", description: "持续高湿 + 22°C 区间，中高风险" },
  { icon: <IconRouter className="size-3.5" />, title: "生成处置方案", description: "轴流风机 R6 · 通风 20 分钟" },
]

const A1_CONTENT =
  "刚帮你把情况查清楚了：**3 号棚湿度 78%**，已经连续 40 分钟超过 72% 的安全线，结合近 24 小时夜间 3 次越限的记录，灰霉病风险已经到中高区间，不建议再等。\n\n<MONITOR></MONITOR>\n\n建议现在通风 **20 分钟**，把湿度压回 70% 以下。要我直接开风机吗？也可以顺手设一条「高温高湿自动通风」规则，以后就不用问了。"

const AUTOMATION_CHAIN: ChainStep[] = [
  { icon: <IconFileSearch className="size-3.5" />, title: "解析规则意图", description: "触发条件 + 执行动作 + 收尾逻辑" },
  { icon: <IconCheckOne className="size-3.5" />, title: "检查设备冲突", description: "3 号棚无进行中的任务，R6 空闲" },
  { icon: <IconCpu className="size-3.5" />, title: "生成自动化策略", description: "3 节点链路 · 湿度联动收尾" },
]

const AUTOMATION_CONTENT = `好的，规则已经生成并即时生效，执行链路如下：

<AUTOMATION_STRATEGY description="3号棚高温高湿自动通风">{"nodes":[{"id":"n1","type":"triggerNode","data":{"label":"温度 > 28°C 或 湿度 > 75%","description":"3 号棚传感器，持续 5 分钟"}},{"id":"n2","type":"logicNode","data":{"label":"联动判断","description":"湿度回落至 70% 以下则进入收尾"}},{"id":"n3","type":"actionNode","data":{"label":"开启轴流风机 R6","description":"自动关闭后推送执行结果到你的手机"}}],"edges":[{"source":"n1","target":"n2"},{"source":"n2","target":"n3"}]}</AUTOMATION_STRATEGY>

以后每次触发都会自动留痕，你在「定时任务」里随时可以暂停或改参数。`

const GROWTH_CHAIN: ChainStep[] = [
  { icon: <IconDatabaseNetwork className="size-3.5" />, title: "调取本茬生长档案", description: "累计积温 412°C·d · 现蕾率 86%" },
  { icon: <IconChartLine className="size-3.5" />, title: "对比上一茬同期", description: "单果重领先，节奏提前 4 天" },
  { icon: <IconChartLine className="size-3.5" />, title: "生成趋势分析", description: "按当前节奏推算头茬采收窗口" },
]

const GROWTH_CONTENT = `把本茬和上一茬同期的单果重曲线放在一起看，结论很清晰：

<CHART type="line">{"tooltip":{"trigger":"axis"},"legend":{"data":["本茬","上一茬"],"bottom":0,"textStyle":{"fontSize":11}},"grid":{"top":20,"left":36,"right":12,"bottom":44},"xAxis":{"type":"category","boundaryGap":false,"data":["08-31","09-01","09-02","09-03","09-04","09-05","09-06"],"axisLabel":{"fontSize":10}},"yAxis":{"type":"value","name":"单果重 (g)","nameTextStyle":{"fontSize":10},"axisLabel":{"fontSize":10}},"series":[{"name":"本茬","type":"line","smooth":true,"symbolSize":4,"data":[6.2,8.1,10.4,12.9,15.6,18.2,21.0],"areaStyle":{"opacity":0.12},"itemStyle":{"color":"#059669"}},{"name":"上一茬","type":"line","smooth":true,"symbolSize":4,"lineStyle":{"type":"dashed"},"data":[5.8,7.4,9.2,11.5,13.8,16.0,18.4],"itemStyle":{"color":"#a1a1aa"}}]}</CHART>

- 本茬单果重 **领先约 2.6g**，节奏提前 4 天
- 均匀度比上一茬高 **9%**，和你上周调整的补光时段吻合
- 按当前积温速度推算，头茬采收窗口在 **10 月中旬**，比上一茬提前一周左右`

const REPORT_CHAIN: ChainStep[] = [
  { icon: <IconDatabaseNetwork className="size-3.5" />, title: "汇总传感器日数据", description: "3 座大棚 · 2,880 条读数" },
  { icon: <IconCamera className="size-3.5" />, title: "摄像头巡检 12 点位", description: "果面、叶面 AI 视觉比对完成" },
  { icon: <IconFileSearch className="size-3.5" />, title: "生成巡检日报", description: "异常项自动标注 + 处置建议" },
]

const REPORT_CONTENT = `今日巡检完成，3 座大棚整体平稳，重点关注 3 号棚：

| 棚区 | 温度 | 湿度 | 状态 |
| --- | --- | --- | --- |
| 1 号棚 | 22.4°C | 61% | ✅ 达标 |
| 2 号棚 | 23.1°C | 58% | ✅ 达标 |
| 3 号棚 | 24.8°C | **78%** | ⚠️ 越限 |

- 📷 视觉巡检 12 个点位完成，果面未见病斑
- ⚠️ 3 号棚夜间湿度越限 2 次（03:12 / 04:47），已给出通风方案
- 完整日报存入「我的空间」：\`巡检日报_09-06.md\``

const GENERIC_CONTENT =
  "收到。在正式平台里，莓小智会像刚才一样：先查你大棚的实时传感器和历史数据，再结合知识库推理，最后直接执行或给出方案——这里只是演示，进入控制台接入你的大棚后就能用。"

let msgSeq = 100;

// 自动交互演示的场景队列（按顺序循环播放）
const SCENARIOS: { user: string; chain?: ChainStep[]; content: string }[] = [
  { user: "3 号棚湿度有点高，需要通风吗？", chain: A1_CHAIN, content: A1_CONTENT },
  { user: "温度超 28°C 自动通风", chain: AUTOMATION_CHAIN, content: AUTOMATION_CONTENT },
  { user: "这一茬长势怎么样？", chain: GROWTH_CHAIN, content: GROWTH_CONTENT },
  { user: "生成今日巡检日报", chain: REPORT_CHAIN, content: REPORT_CONTENT },
];

const INITIAL_MSGS: ChatMsg[] = [
  { key: "u1", role: "user", content: SCENARIOS[0].user },
];

const PROMPTS = [
  { key: "report", icon: <IconCalendar className="size-3.5" />, label: "生成今日巡检日报" },
  { key: "automation", icon: <IconMagic className="size-3.5" />, label: "温度超 28°C 自动通风" },
  { key: "growth", icon: <IconChartLine className="size-3.5" />, label: "这一茬长势怎么样？" },
];

const PROMPT_REPLIES: Record<string, { chain: ChainStep[]; content: string }> = {
  report: { chain: REPORT_CHAIN, content: REPORT_CONTENT },
  automation: { chain: AUTOMATION_CHAIN, content: AUTOMATION_CONTENT },
  growth: { chain: GROWTH_CHAIN, content: GROWTH_CONTENT },
};

const CONVERSATION_ITEMS = [
  { key: "s1", label: "3号棚湿度偏高" },
  { key: "s2", label: "灰霉病预防方案" },
  { key: "s3", label: "本周环境周报" },
  { key: "s4", label: "补光时段优化" },
];

const MENU_ITEMS = [
  { key: "explore", icon: <IconCompass className="size-3.5" />, label: "探索" },
  { key: "kb", icon: <IconFolderOpen className="size-3.5" />, label: "知识库" },
  { key: "cron", icon: <IconListCheckbox className="size-3.5" />, label: "定时任务" },
];

// 模块级随机：每次页面加载从默认头像库取一张作为演示用户头像
const HERO_USER_AVATAR = `/images/user_default_avatar/avatar${1 + Math.floor(Math.random() * 8)}.png`;
// 消息时间（演示）
const DEMO_TIME = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });

export function HeroChat() {
  const [messages, setMessages] = useState<ChatMsg[]>(INITIAL_MSGS);
  const [busy, setBusy] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [activeKey, setActiveKey] = useState("s1");

  /* 跟随页面深浅色（next-themes），antd algorithm 显式指定，避免继承出岔 */
  const { resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  useEffect(() => setThemeMounted(true), []);
  const dark = themeMounted && resolvedTheme === "dark";
  const timersRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const startedRef = useRef(false);
  const autoRef = useRef(true); // 自动演示开关：用户主动输入后关闭

  // 用户头像：从默认头像库随机取一张（模块级求值，每次页面加载随机一次）
  const [userAvatar] = useState(HERO_USER_AVATAR);

  const clearTimers = () => {
    timersRef.current.forEach(clearInterval);
    timersRef.current = [];
  };

  useEffect(() => clearTimers, []);

  // 流式输出：先推进 ThoughtChain（感知→分析→决策），再逐块吐正文（模拟原生 SSE）
  const streamReply = (md: string, chain?: ChainStep[], onDone?: () => void) => {
    setBusy(true);
    const aiKey = `a${msgSeq++}`;
    setMessages((prev) => [
      ...prev,
      {
        key: aiKey,
        role: "ai",
        content: "",
        chain,
        chainVisible: chain ? 1 : 0,
        thinking: !!chain,
        streaming: false,
      },
    ]);

    const startText = () => {
      let pos = 0;
      const t = setInterval(() => {
        pos = Math.min(md.length, pos + 2 + Math.floor(Math.random() * 4));
        const done = pos >= md.length;
        setMessages((prev) =>
          prev.map((m) =>
            m.key === aiKey
              ? { ...m, content: md.slice(0, pos), streaming: !done, thinking: false }
              : m
          )
        );
        if (done) {
          clearTimers();
          setBusy(false);
          onDone?.();
        }
      }, 24);
      timersRef.current.push(t);
    };

    if (chain && chain.length) {
      let ci = 1;
      const t = setInterval(() => {
        ci += 1;
        setMessages((prev) =>
          prev.map((m) => (m.key === aiKey ? { ...m, chainVisible: Math.min(ci, chain.length) } : m))
        );
        if (ci >= chain.length) {
          clearInterval(t);
          setMessages((prev) =>
            prev.map((m) => (m.key === aiKey ? { ...m, thinking: false } : m))
          );
          startText();
        }
      }, 420);
      timersRef.current.push(t);
    } else {
      startText();
    }
  };

  const send = (message: string) => {
    const text = message.trim();
    if (!text || busy) return;
    // 用户主动输入 → 交还控制权，自动演示停止
    autoRef.current = false;
    clearTimers();
    const matched = PROMPTS.find((p) => p.label === text);
    const reply = matched ? PROMPT_REPLIES[matched.key] : { content: GENERIC_CONTENT };
    setMessages((prev) => [...prev, { key: `u${msgSeq++}`, role: "user", content: text }]);
    const t = setTimeout(
      () => streamReply(reply.content, (reply as { chain?: ChainStep[] }).chain),
      350
    );
    timersRef.current.push(t);
  };

  // ===== 自动交互演示 =====
  // 鼠标放到 chat 上即开始：自动发问题 → 思维链 → 流式回复 → 换下一个场景，
  // 一轮播完后重置对话循环；用户一动手（点击建议/输入）就永久交还控制权。
  const playScenario = (index: number) => {
    if (!autoRef.current) return;
    const s = SCENARIOS[index % SCENARIOS.length];
    setMessages((prev) => [...prev, { key: `u${msgSeq++}`, role: "user", content: s.user }]);
    const t = setTimeout(
      () =>
        streamReply(s.content, s.chain, () => {
          if (!autoRef.current) return;
          const next = index + 1;
          const gap = next % SCENARIOS.length === 0 ? 6000 : 2600;
          const t2 = setTimeout(() => {
            if (!autoRef.current) return;
            if (next % SCENARIOS.length === 0) setMessages(INITIAL_MSGS); // 一轮结束，重置对话
            playScenario(next);
          }, gap);
          timersRef.current.push(t2);
        }),
      450
    );
    timersRef.current.push(t);
  };

  const startAutoDemo = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    clearTimers();
    playScenario(0);
  };

  // 兜底：2.5s 内没有 hover 也自动开始（触屏设备无 hover）
  useEffect(() => {
    const t = setTimeout(() => startAutoDemo(), 2500);
    return () => {
      clearTimeout(t);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roles: BubbleListProps["role"] = {
    ai: {
      placement: "start",
      variant: "outlined",
      className: "!max-w-[94%] !shadow-none",
      rootClassName: "[&_.ant-bubble-header]:!mb-1",
      avatar: <BerryOrb size="36px" theme={dark ? "dark" : "light"} isActive={busy} />,
      // 发送者名称 + 时间 + 正文，通过字号/字重/颜色建立层级
      header: (
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold leading-none text-zinc-800 dark:text-[#D6DAD6]">莓小智</span>
          <span className="text-[11px] leading-none text-zinc-400 dark:text-[#79817B]">{DEMO_TIME}</span>
        </div>
      ),
    },
    user: {
      placement: "end",
      variant: "filled",
      shape: "round",
      className: "!max-w-[80%]",
      avatar: <Avatar size={36} src={userAvatar} alt="用户头像" />,
    },
  };

  return (
    /* key 让 cssinjs 在 dark/light 之间彻底重建 scope，避免 first-render 浅色 token 把后续 dark 覆盖粘住 */
    <ConfigProvider
      key={dark ? "dark" : "light"}
      locale={zhCN}
      theme={{
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: "#059669", borderRadius: 10 },
      }}
    >
      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes bubbleIn { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }
        @keyframes orbFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .landing-bubble-in .ant-bubble { animation: bubbleIn 0.38s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .landing-bubble-in .ant-bubble-avatar { animation: orbFloat 3.2s ease-in-out infinite; }
      `}</style>

      {/* 与 /ai-assistant 同款：侧栏 + 对话顶栏 + ChatBubbleList + ChatSenderInput。 */}
      <div onMouseEnter={startAutoDemo} className="overflow-hidden rounded-2xl bg-[#F7F7F8] shadow-[0_32px_80px_-20px_rgba(15,23,42,0.22)] dark:bg-[#121713]">
        <div className="flex h-[680px]">
          <aside className="hidden w-[240px] shrink-0 flex-col p-3 sm:flex">
            <div className="flex h-12 items-center px-2">
              <span className="text-[20px] font-bold tracking-tight">莓小智</span>
              <span className="ml-auto flex gap-1 text-zinc-400"><IconSearch className="size-4" /><IconLayoutTwo className="size-4" /></span>
            </div>
            <Button block icon={<IconEdit className="size-3.5" />} className="!mt-2 !h-10 !justify-start !bg-white !text-left dark:!bg-[#1E2220]">新建对话</Button>
            <Menu mode="inline" selectable={false} items={MENU_ITEMS} style={{ borderInlineEnd: "none", background: "transparent", fontSize: 12 }} className="landing-hero-menu !mt-3" />
            <Typography.Text type="secondary" style={{ fontSize: 11, padding: "12px 8px 6px" }}>最近对话</Typography.Text>
            <Conversations items={CONVERSATION_ITEMS} activeKey={activeKey} onActiveChange={setActiveKey} className="min-h-0 flex-1 [&_.ant-conversations-item]:!py-2 [&_.ant-conversations-item]:!text-[12px]" />
          </aside>
          <main className="m-3 ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-white dark:bg-[#111413]">
            <header className="flex h-16 shrink-0 items-center border-b border-zinc-100 px-5 dark:border-white/[0.07]">
              <div><div className="text-[14px] font-semibold">3 号棚湿度偏高怎么处理</div><div className="mt-1 text-[11px] text-zinc-400">莓小智 · 已连接大棚上下文</div></div>
              <span className="ml-auto flex gap-4 text-zinc-400"><IconSearch className="size-4" /><IconShare className="size-4" /></span>
            </header>
            <div className="min-h-0 flex-1 px-5 pt-4">
              <ChatBubbleList
                messages={messages.map((m): Message => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content }))}
                isLoading={busy}
                agentSteps={(messages.findLast((m) => m.role === "ai" && m.chain)?.chain ?? []).map((s, i): AgentStep => ({ id: `demo-${i}`, kind: "task", title: s.title, detail: s.description, status: i < (messages.findLast((m) => m.role === "ai")?.chainVisible ?? 0) ? "completed" : "pending" }))}
                agentStatus={busy ? "正在分析大棚环境" : ""}
                rendererProps={{ deviceData: null, autoExecuteCommands: false, assistantMode: "request", enableReasoning: false, onOpenStudio: () => {}, onExecuteCommand: async () => {}, onRetryCommand: () => {}, onSendMessage: send, onSetInput: setInputVal }}
                darkMode={dark}
              />
            </div>
            <div className="shrink-0 px-4 pb-3">
              <ChatSenderInput input={inputVal} setInput={setInputVal} onSend={(text) => { send(text); setInputVal(""); }} isLoading={busy} attachments={[]} onSelectFiles={() => {}} onRemoveAttachment={() => {}} onPaste={() => {}} enableReasoning={false} setEnableReasoning={() => {}} enablePlanning={false} setEnablePlanning={() => {}} enableSearch={false} setEnableSearch={() => {}} availableTools={[]} onCancel={() => {}} darkMode={dark} approvalMode="request" setApprovalMode={() => {}} toolbarMode="minimal" />
              <div className="pt-2 text-center text-[10px] text-zinc-400">内容由 AI 生成，请结合实际情况判断</div>
            </div>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
}
