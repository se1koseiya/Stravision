"use client";

/* ------------------------------------------------------------
   产品更新页 /whats-new
   ─────────────────────────────────────────────────────────────
   这一版我们更新了三件事：Copilot、沉浸光感、Copilot 操作画布。

   ⚠️ 本页**不自己写 UI**，全部是装配已有组件：
     · 首屏      ← components/landing-v4/hero.tsx（传 props 换文案，光斑/排版/动画全部复用）
     · 三个演示  ← components/landing-v4/scenario.tsx（同一套场景卡切换器 + 详情面板 + 预览台）
                   预览台里放的是**产品本体的真界面**，不是示意图：
                     CopilotSidebarDemo → components/ai/copilot/copilot-sidebar.tsx
                                          （业务页右侧那条真 AI 侧栏 + 草莓悬浮球开合编排）
                     MaterialDemo       → MaterialLevelPicker（设置里那张真选择器）
                                          + ImmersiveCard（设备页那张真材质卡）
                                          + CanvasActivityGlow（莓小智干活时那支真光效）
                     CanvasStage        → 真 ReactFlow 画布 + 真节点 / 真连线组件，
                                          莓小智逐个 add_node / connect 往画布上落笔（真动画）
     · 尾屏/页脚 ← components/landing-v4/download-cta.tsx

   🚨 2026-09-29 两处纠正（用户反馈，别再退回去）：
     ① Copilot 指的是**业务页侧栏**（copilot-sidebar.tsx），不是 /ai-assistant 那个
        独立助手页（matechat-home）。前者收起态是右下角的草莓悬浮球。
     ② 沉浸光感演示必须**真的糊**：.dc-mat 的 backdrop-filter 本体在
        components/device/material-css.ts，要 useMaterialCss() 注入才存在；
        另外 CanvasActivityGlow 是 position:fixed，舞台必须 contain:paint 才圈得住它。

   样例文案全部对齐真实实现（工具名取 lib/mcp/mcp-tool-definitions.ts，
   推荐问题取 components/ai/copilot/page-configs.ts），不编。
   ------------------------------------------------------------ */

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { LandingThemeProvider } from "./theme-provider";
import { DemoChatSkeleton, HeroSkeleton, ScenariosSkeleton } from "./skeletons";
import { L } from "./shared";
import { APP_VERSION_LABEL } from "@/lib/app-meta";
import type { Scene } from "./scenario";
import { IconBrain, IconLayers, IconLightning, IconMicrophone, IconSidebarPanel, IconShield, IconUndo, IconWand } from "@/components/icon";

/* 懒加载：首屏只加载 Nav + Hero（与落地页同一套策略）。
   注意 next/dynamic 的 options 必须是内联对象字面量。 */
const LandingNav = dynamic(
  () => import("@/components/landing-v4/nav").then((m) => m.LandingNav),
  { ssr: false }
);

const Hero = dynamic(
  () => import("@/components/landing-v4/hero").then((m) => m.Hero),
  { ssr: false, loading: () => <HeroSkeleton /> }
);

const Scenarios = dynamic(
  () => import("@/components/landing-v4/scenario").then((m) => m.Scenarios),
  { ssr: false, loading: () => <ScenariosSkeleton /> }
);

const CopilotSidebarDemo = dynamic(
  () => import("@/components/landing-v4/copilot-sidebar-demo").then((m) => m.CopilotSidebarDemo),
  { ssr: false, loading: () => <DemoChatSkeleton /> }
);

const MaterialDemo = dynamic(
  () => import("@/components/landing-v4/material-demo").then((m) => m.MaterialDemo),
  { ssr: false, loading: () => <DemoChatSkeleton /> }
);

const CanvasStage = dynamic(
  () => import("@/components/landing-v4/canvas-stage").then((m) => m.CanvasStage),
  { ssr: false, loading: () => <DemoChatSkeleton /> }
);

const DownloadCta = dynamic(
  () => import("@/components/landing-v4/download-cta").then((m) => m.DownloadCta),
  { ssr: false }
);

const LandingFooter = dynamic(
  () => import("@/components/landing-v4/download-cta").then((m) => m.LandingFooter),
  { ssr: false }
);

/** 本次更新的三个重点（喂给场景区那套现成的切换器 + 预览台） */
const UPDATE_SCENES: Scene[] = [
  {
    key: "copilot",
    tab: "Copilot 升级",
    desc: "开场白和推荐问题跟着你所在的页面走，复杂问题先给推理过程。",
    tags: ["#跟着页面换脑子", "#开口就能用"],
    img: "/web/guide.png",
    title: (
      <>
        每个页面，
        <br />
        都有个懂行的助手
      </>
    ),
    steps: [
      {
        icon: IconSidebarPanel,
        label: "跟着页面换脑子",
        note: "监控页聊风险、看板页读趋势、自动化页查冲突、设备页直接给方案",
      },
      {
        icon: IconBrain,
        label: "深度思考看得见",
        note: "复杂问题先摆出推理过程，再给结论，随时可以翻回去看它怎么想的",
      },
      {
        icon: IconMicrophone,
        label: "开口就能用",
        note: "实时语音对话，边说边执行 —— 手上有活的时候不用腾出手打字",
      },
    ],
    preview: <CopilotSidebarDemo />,
    /* 整条侧栏 + 它左下那片业务页：填满预览窗口（高度由 previewWindowClass 给足） */
    previewClass: "h-full",
    previewWindowClass: "h-[30rem] md:h-[40rem]",
  },
  {
    key: "material",
    tab: "沉浸光感",
    desc: "面板有了厚度与呼吸：三档材质随手调，AI 干活时屏幕边缘会发光。",
    tags: ["#三档厚度", "#干活的时候有光"],
    img: "/web/gongchengshi.png",
    title: (
      <>
        界面有了厚度，
        <br />
        也开始呼吸
      </>
    ),
    steps: [
      {
        icon: IconWand,
        label: "三档厚度",
        note: "流畅 / 轻柔 / 精美，只缩放模糊半径，信息层级一动不动",
      },
      {
        icon: IconLightning,
        label: "干活的时候有光",
        note: "莓小智改画布、控设备时，屏幕四边会有一束光安静地绕行",
      },
      {
        icon: IconShield,
        label: "关掉也依然好看",
        note: "关闭材质不是删掉模糊，而是换成等效实色底，结构关系照旧成立",
      },
    ],
    preview: <MaterialDemo />,
    previewClass: "w-full",
  },
  {
    key: "canvas",
    tab: "画布助手",
    desc: "说一句话，AI 直接在流程画布上加节点、连线条、改条件，可随时撤销。",
    tags: ["#直接改画面", "#不满意就撤"],
    img: "/web/zhongzhizhuanjia.png",
    title: (
      <>
        让 AI 直接
        <br />
        在画布上落笔
      </>
    ),
    steps: [
      { icon: IconMicrophone, label: "说需求", note: "「帮我把这条流程补完整」，用大白话就行" },
      { icon: IconLayers, label: "看它落笔", note: "节点、连线、判断条件、设备动作逐个落到画布上" },
      { icon: IconUndo, label: "不满意就撤", note: "每一步都进撤销栈，Ctrl+Z 直接回退，不用手动拆节点" },
    ],
    preview: <CanvasStage />,
    previewClass: "w-full",
  },
];

const HERO_TITLE: ReactNode = (
  <>
    这一版，
    <br />
    莓小智开始
    <span style={{ color: L.accentStrong }}>动手</span>
    了
  </>
);

export function WhatsNewPage() {
  return (
    <LandingThemeProvider>
      {/* landing-legacy-font：与落地页同一套冻结字体，更新页属于同一视觉体系 */}
      <main className="landing-legacy-font min-h-[100dvh] bg-white text-[#222222] antialiased selection:bg-[#6EE7B7]/40 dark:bg-[#09090B] dark:text-[#F2F4F1]">
        <style>{`html { scroll-behavior: smooth; }`}</style>

        <LandingNav />

        <Hero
          eyebrow={`PRODUCT UPDATE · ${APP_VERSION_LABEL}`}
          title={HERO_TITLE}
          subtitle="这一版我们做了三件事：让 Copilot 跟着你在的页面换脑子、让界面学会「呼吸」的厚度、让 AI 能直接在你的流程画布上落笔 —— 改完还能撤销。"
          primaryCta={{ href: "/dashboard", label: "打开控制台" }}
          secondaryCta={{ href: "/changelog", label: "查看完整更新日志" }}
          note="2026-09-29 发布 · 无需更新客户端，刷新即可"
          showAppWindow={false}
        />

        <Scenarios
          scenes={UPDATE_SCENES}
          heading={
            <>
              本次更新的
              <br />
              三个重点
            </>
          }
          hint="点卡片切换演示"
        />

        <DownloadCta />
        <LandingFooter />
      </main>
    </LandingThemeProvider>
  );
}

export default WhatsNewPage;
