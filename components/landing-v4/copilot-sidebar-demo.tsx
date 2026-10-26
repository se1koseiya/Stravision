"use client";

/* ------------------------------------------------------------
   Copilot · 页面侧栏（产品更新页 /whats-new 场景 1）
   ─────────────────────────────────────────────────────────────
   🚨 2026-09-29 用户纠正：「copilot 是页面侧栏，不是 AI 助手那个页面」。
      也就是说要演的是**业务页右侧那条随时可唤起的 AI 侧栏** ——
        components/ai/copilot/copilot-sidebar.tsx
      与 dashboard / monitor / automation / device-control 四页挂的是同一个实例，
      而不是 /ai-assistant 那个独立助手页（matechat-home）。

   做法：把**真侧栏**整条搬进来，一秒不改：
     · 侧栏本体       ← CopilotSidebar（真组件，含顶栏 / 空态欢迎页 / 输入胶囊）
     · 收态           ← 右下角那颗草莓悬浮球（CopilotBerryFab，真组件）
     · 开合编排       ← 产品里那套「球 → 面板长出来」（clip-path 从球位揭示）
     · 材质           ← 侧栏自带 .dc-mat--ultra（HDS 沉浸光感弹层档）
   演示只做一件事：先给一拍让它以「悬浮球」形态出现，再展开成侧栏，
   于是「球 ↔ 栏」这套真交互能被看见，而不是静态截一张图。

   🚨 关键技巧 —— contain: paint
     CopilotSidebar 内部是 position: fixed（产品里它就钉在视口右下角）。
     直接把组件放进舞台，它会**相对视口**定位：铺满整页、把舞台当空气。
     给舞台加 contain: paint 后，舞台成为固定定位子元素的「包含块」，
     侧栏因此被约束在舞台内、并被舞台裁切 —— 演示里看到的位置关系
     与真实业务页完全一致（页面在左、侧栏贴右边）。

   背景只给「业务页的底」：中性画布 + 一层品牌氛围光 + 一行页名标记。
   不在这里手搓任何业务 UI —— 业务页面本体不参与这次演示。
   ------------------------------------------------------------ */

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { CopilotSidebar } from "@/components/ai/copilot/copilot-sidebar";
import { useMaterialCss } from "@/components/device/immersive-card";

export function CopilotSidebarDemo() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  /* 材质 CSS 幂等注入：侧栏的 .dc-mat--ultra 面板、欢迎页玻璃条都读它。
     本页其它场景（沉浸光感）也共用这一份，因此这里注入是顺手的兜底。 */
  useMaterialCss();

  /* 先合上（露出右下角那颗草莓）→ 一拍之后再展开，让开合编排被看见 */
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      data-copilot-stage
      className="relative h-full w-full overflow-hidden rounded-[14px] border border-black/[0.07] bg-[#F7F7F8] dark:border-white/[0.08] dark:bg-[#0F1211]"
      style={{
        /* 🚨 见文件头：不给包含块，侧栏会相对视口定位、直接铺满整页 */
        contain: "paint",
      }}
    >
      {/* 业务页的底：中性画布 + 一层品牌氛围光 + 点阵纹理
          （点阵 18px / 1.5px 与画布页 .react-flow 的 Background 同一套参数，
            让「页面」读起来是一块真实画布，而不是一块空白。） */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 10%, rgba(5,150,105,0.10), transparent 46%)," +
            "radial-gradient(circle at 76% 92%, rgba(52,211,153,0.09), transparent 52%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: dark
            ? "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)"
            : "radial-gradient(rgba(24,24,27,0.07) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      {/* 页名标记：只给读者一个「这是哪一页」的坐标 */}
      <div className="absolute left-4 top-4 flex items-center gap-2 text-[12px] font-semibold text-zinc-400 dark:text-[#79817B]">
        <span className="size-1.5 rounded-full bg-[#12B76A]" />
        业务页 · 实时监控
      </div>

      {/* ✅ 产品本体：业务页右侧那条 AI 侧栏（收起态就是右下角的草莓悬浮球） */}
      <CopilotSidebar pageKey="monitor" dark={dark} open={open} onOpenChange={setOpen} />
    </div>
  );
}

export default CopilotSidebarDemo;
