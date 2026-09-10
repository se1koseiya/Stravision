"use client";

/* ------------------------------------------------------------
   演示对话外壳 —— 场景区三个预览台共用
   ─────────────────────────────────────────────────────────────
   三个场景（深度研究 / 记忆功能 / 设备调控）演的是同一件事：
   用户问一句 → 链路跑起来 → 正文流式输出 → 落地成某个真组件。

   所以把「对话容器 + 自动播放 + 滚动跟随」抽到这里，各场景只提供
   自己的 question / steps / answer / footer，避免三份重复实现漂移。

   组件全部来自产品本体：
     · AgentThoughtChain —— ai-assistant 里那条真实的执行链路
     · Bubble / XMarkdown / BerryOrb —— 与线上对话同一套
   各场景的步骤文案、工具名、返回值都必须对齐真实实现
   （lib/mcp/*、lib/ai/*），不要自己编。
   ------------------------------------------------------------ */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Avatar, ConfigProvider, theme as antdTheme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useTheme } from "next-themes";
import { Bubble } from "@ant-design/x";
import type { BubbleListProps } from "@ant-design/x";
import XMarkdown from "@ant-design/x-markdown";
import { CheckCircle2 } from "lucide-react";
import BerryOrb from "@/components/smoothui/berry-orb";
import {
  AgentThoughtChain,
  type AgentStep,
} from "@/app/ai-assistant/_components/agent-thought-chain";

/* ---- 流式光标（与 ai-assistant 的 StreamingTail 一致） ---- */

const StreamingTail = ({ content = "▋" }: { content?: string }) => (
  <span style={{ display: "inline-block", color: "#4ED18F", fontWeight: "bold" }}>
    {content}
  </span>
);

export interface DemoChatProps {
  /** 用户那一句提问 */
  question: string
  /** 执行链路（字段与 AgentStep 一致） */
  steps: AgentStep[]
  /** 流式输出的正文（Markdown） */
  answer: string
  /** 答案流完后出现在正文下方的**真组件**区（Sources / DeviceControlCard / MemoryProfileBar…） */
  footer?: ReactNode
  /** 右下角一行小字（耗时、来源数等） */
  trailing?: string
  /** 头像旁的角色副标签，默认「深度研究」 */
  subtitle?: string
  /** 正文区额外样式 */
  answerClassName?: string
  /** 第 1 步出现前的延迟 */
  startDelayMs?: number
  /** 每步之间间隔 */
  stepMs?: number
  /** 流式打字间隔 */
  typeMs?: number
  /** 演完停留多久重来 */
  holdMs?: number
}

export function DemoChat({
  question,
  steps: STEP_LIST,
  answer: ANSWER,
  footer,
  trailing,
  subtitle = "深度研究",
  answerClassName,
  startDelayMs = 360,
  stepMs = 720,
  typeMs = 22,
  holdMs = 7000,
}: DemoChatProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervals = useRef<ReturnType<typeof setInterval>[]>([]);
  const alive = useRef(true);
  const started = useRef(false);

  const [visibleSteps, setVisibleSteps] = useState(0);
  const [thinking, setThinking] = useState(true);
  const [answer, setAnswer] = useState("");
  const [done, setDone] = useState(false);

  /* 跟随页面深浅色：预览窗口在深色模式下是深底，antd algorithm 显式跟随 */
  const { resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  useEffect(() => setThemeMounted(true), []);
  const dark = themeMounted && resolvedTheme === "dark";

  const clearAll = () => {
    timeouts.current.forEach(clearTimeout);
    intervals.current.forEach(clearInterval);
    timeouts.current = [];
    intervals.current = [];
  };

  // 预览台自身是滚动容器，链路/正文推进时把它滚到底
  const scrollToEnd = () => {
    const scroller = rootRef.current?.closest("[data-chat-scroll]") as HTMLElement | null;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  };

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [visibleSteps, answer, done]);

  const play = () => {
    clearAll();
    setVisibleSteps(0);
    setThinking(true);
    setAnswer("");
    setDone(false);

    STEP_LIST.forEach((_, i) => {
      timeouts.current.push(setTimeout(() => setVisibleSteps(i + 1), startDelayMs + i * stepMs));
    });

    const chainEnd = startDelayMs + STEP_LIST.length * stepMs;
    timeouts.current.push(setTimeout(() => setThinking(false), chainEnd));

    timeouts.current.push(
      setTimeout(() => {
        let pos = 0;
        const timer = setInterval(() => {
          if (!alive.current) return clearInterval(timer);
          pos = Math.min(ANSWER.length, pos + 3 + Math.floor(Math.random() * 4));
          setAnswer(ANSWER.slice(0, pos));
          if (pos >= ANSWER.length) {
            clearInterval(timer);
            setDone(true);
            timeouts.current.push(
              setTimeout(() => {
                if (alive.current) play();
              }, holdMs)
            );
          }
        }, typeMs);
        intervals.current.push(timer);
      }, chainEnd + 420)
    );
  };

  // 进入视口即开始演示（一个区块内只启动一次）
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const start = () => {
      if (started.current) return;
      started.current = true;
      play();
    };
    if (typeof IntersectionObserver === "undefined") {
      start();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          start();
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 最后一条 = 正在跑的那一步 */
  const steps = useMemo(
    () =>
      STEP_LIST.slice(0, visibleSteps).map((s, i) =>
        i === visibleSteps - 1 && thinking ? { ...s, status: "active" as const } : s
      ),
    [STEP_LIST, visibleSteps, thinking]
  );

  const streaming = useMemo(
    () => ({
      hasNextChunk: !done,
      enableAnimation: true,
      animationConfig: { fadeDuration: 180, easing: "ease-in-out" as const },
      tail: done ? false : { component: StreamingTail },
    }),
    [done]
  );

  const roles: BubbleListProps["role"] = {
    ai: {
      placement: "start",
      variant: "outlined",
      className: "!max-w-[96%] !shadow-none",
      rootClassName: "[&_.ant-bubble-header]:!mb-1",
      avatar: <BerryOrb size="30px" theme={dark ? "dark" : "light"} isActive={thinking} />,
      header: (
        <div className="flex items-baseline gap-2">
          <span className="text-[12px] font-semibold leading-none text-slate-800 dark:text-[#D6DAD6]">莓小智</span>
          <span className="text-[10px] leading-none text-slate-400 dark:text-[#79817B]">{subtitle}</span>
        </div>
      ),
    },
    user: {
      placement: "end",
      variant: "filled",
      shape: "round",
      className: "!max-w-[86%]",
      avatar: <Avatar size={30} src="/images/user_default_avatar/avatar3.png" alt="" />,
    },
  };

  const items = [
    { key: "u", role: "user" as const, content: question },
    {
      key: "a",
      role: "ai" as const,
      content: (
        <div className="space-y-2">
          <AgentThoughtChain steps={steps} isActive={thinking} className="!mt-0 !mb-1" />

          {answer ? (
            <div
              className={
                // ⚠️ XMarkdown 的真实 DOM 是 `<div class="x-markdown">` 里再放段落，
                // 且 paragraphTag="div" 让段落是 <div> 而不是 <p>：
                //   wrapper > .x-markdown > [段落 div, 段落 div, …]
                // 所以段间距要写 [&_.x-markdown>*+*]，写 [&>*+*]（打不到内层）
                // 或 [&_p]（没有 p 标签）都不生效。
                answerClassName ??
                "[&_.x-markdown]:!text-[12.5px] [&_.x-markdown]:!leading-[1.75] [&_.x-markdown>*+*]:!mt-3 [&_strong]:!font-semibold [&_ul]:!pl-[1.1rem] [&_ol]:!pl-[1.2rem] [&_li]:!text-[12.5px] [&_li]:!leading-[1.75] [&_li]:!my-0.5"
              }
            >
              <XMarkdown paragraphTag="div" streaming={streaming}>
                {answer}
              </XMarkdown>
            </div>
          ) : null}

          {done && footer ? <div className="pt-1">{footer}</div> : null}
        </div>
      ),
    },
  ];

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { colorPrimary: "#4ED18F", borderRadius: 10 },
      }}
    >
      <style>{`
        .dr-bubble-in .ant-bubble { animation: drBubbleIn .38s cubic-bezier(.16,1,.3,1) both; }
        @keyframes drBubbleIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
      `}</style>

      <div ref={rootRef} className="w-full">
        <Bubble.List
          items={items}
          role={roles}
          className="dr-bubble-in [&_.ant-bubble-content]:!text-[12.5px] [&_.ant-bubble-content-filled]:!bg-[#eef0f2] [&_.ant-bubble-content-filled]:dark:!bg-[#1C221E] [&_.ant-bubble-content-filled]:!text-slate-800 [&_.ant-bubble-content-filled]:dark:!text-[#D6DAD6] [&_.ant-bubble-content-outlined]:!border-transparent [&_.ant-bubble-content-outlined]:!bg-transparent [&_.ant-bubble-content-outlined]:!p-0 [&_.ant-bubble-content-outlined]:!text-slate-600 [&_.ant-bubble-content-outlined]:dark:!text-[#9BA39E] [&_.ant-bubble-content-outlined]:!shadow-none [&_.ant-bubble-avatar]:!me-2"
        />

        {done && trailing ? (
          <div className="mt-3 flex items-center justify-end gap-1.5 px-1 text-[10.5px] text-slate-400 dark:text-[#79817B]">
            <CheckCircle2 className="size-3 text-emerald-500" />
            {trailing}
          </div>
        ) : null}
      </div>
    </ConfigProvider>
  );
}

/** 三个场景共用的「已落地」小徽章（入库 / 记忆 / 回执） */
export function DemoChip({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
      {icon}
      {children}
    </div>
  );
}

export default DemoChat;
