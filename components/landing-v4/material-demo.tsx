"use client";

/* ------------------------------------------------------------
   沉浸光感 · 演示台（产品更新页 /whats-new 场景 2）
   ─────────────────────────────────────────────────────────────
   两段都是产品本体在跑的东西，没有一版「像产品的」假界面：

     ① 材质厚度三档 —— 设置 ▸ 外观 里那张真选择器
        components/settings/material-level-picker.tsx
        （2026-09-29 从 ai-settings-dialog.tsx 抽出，两处共用同一份实现）
     ② 一张真材质卡（ImmersiveCard）压在彩色内容上 + AI 干活时的边缘光效 ——
        卡来自 components/device/immersive-card.tsx（设备页/看板在用的同一张）
        光效来自 components/ai/copilot/canvas-activity-glow.tsx（Copilot 改画布时那支）

   🚨 2026-09-29 修「沉浸光感一点效果都没有」（用户反馈），两处病因：
     ① 材质 CSS 没进本文档。
        .dc-mat 的 backdrop-filter 本体写在 components/device/material-css.ts，
        由 useMaterialCss() 单例注入（app/layout 之外还有弹层类组件自己兜底）。
        /whats-new 原先**没有任何一处**调它 → 三张预览卡只剩半透明底、模糊为 0，
        三档看起来一模一样 = 选择器在视觉上不成立。
        现在显式注入（与设置弹窗、Copilot 侧栏同一个 hook，幂等）。
     ② CanvasActivityGlow 内部是 position: fixed（设计上就该贴视口）。
        直接塞进一个小舞台 → 它铺满的是整个浏览器窗口，而不是这个舞台，
        演示里根本看不出「绕这条边流动」。舞台加 contain: paint 后，
        舞台成为它的包含块，光才老老实实绕舞台四边跑。

   档位切换只作用在**这个舞台的局部变量**上（--dc-mat-scale），
   不去写 <html data-mat-level>、也不落 localStorage ——
   演示页不该替用户改掉他自己的「沉浸光感」设置。
   ------------------------------------------------------------ */

import { useEffect, useState, type CSSProperties } from "react";
import { useTheme } from "next-themes";
import { MaterialLevelPicker } from "@/components/settings/material-level-picker";
import { CanvasActivityGlow } from "@/components/ai/copilot/canvas-activity-glow";
import { ImmersiveCard, useMaterialCss } from "@/components/device/immersive-card";
import { MATERIAL_LEVEL_LABEL, type MaterialLevel } from "@/components/device/material-css";

/**
 * 三档在预览窗里的模糊倍率 —— 与 material-css.ts 里 `html[data-mat-level]` 的
 * --dc-mat-scale（1 / .78 / .2）**必须一一对应**（同 material-level-picker.tsx 的口径）。
 */
const SCALE: Record<MaterialLevel, number> = {
  smooth: 0.2,
  gentle: 0.78,
  exquisite: 1,
  off: 0,
};

/**
 * 舞台背后的「内容」（就是被材质模糊掉的东西）：
 * 细竖条 + 两块锐利色斑 + 斜向硬边渐变。
 * 为什么不用纯渐变：渐变糊掉之后还是渐变，看不出「厚」；只有**色块边界**的
 * 锐利↔柔化才是可读的判据。细条纹负责反证 —— 流畅档还数得出条数，精美档整片拉平。
 */
const STAGE_BACKDROP =
  "repeating-linear-gradient(90deg, rgba(255,255,255,.55) 0 4px, rgba(255,255,255,0) 4px 14px)," +
  "radial-gradient(circle at 18% 34%, #FF9A62 0 24%, rgba(255,154,98,0) 25%)," +
  "radial-gradient(circle at 82% 68%, #34D399 0 26%, rgba(74,222,128,0) 27%)," +
  "linear-gradient(115deg, #6C8CFF 0 40%, #FFD166 40% 68%, #FF6FA5 68% 100%)";

export function MaterialDemo() {
  /** 只驱动预览卡自己的选中态；真的落盘在设置面板里（同一颗 onChange 语义） */
  const [level, setLevel] = useState<MaterialLevel>("gentle");

  /* 🚨 病因①的解药：把材质 CSS（.dc-mat 的 backdrop-filter 本体）注入本文档。
     少了这一行，下面所有 .dc-mat 元素都只剩半透明底、没有任何模糊。 */
  useMaterialCss();

  /* 光效自动循环：正在做 → 做完了（转绿 + 打勾）→ 收起 → 重来 */
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<"running" | "done">("running");

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  useEffect(() => {
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let interval: ReturnType<typeof setInterval> | null = null;

    const cycle = () => {
      if (!alive) return;
      setPhase("running");
      setActive(true);
      timers.push(setTimeout(() => alive && setPhase("done"), 1700));
      timers.push(setTimeout(() => alive && setActive(false), 2750));
    };

    timers.push(setTimeout(cycle, 400));
    interval = setInterval(cycle, 5400);

    return () => {
      alive = false;
      if (interval) clearInterval(interval);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="flex w-full flex-col gap-4">
      {/* ① 真组件：材质厚度三档（设置里那张选择器） */}
      <div>
        <p className="mb-2.5 text-[12.5px] font-semibold text-zinc-500 dark:text-[#9BA39E]">
          材质厚度 · 三档只缩放模糊半径
        </p>
        <MaterialLevelPicker value={level} onChange={setLevel} />
      </div>

      {/* ② 真材质卡 + 真边缘光效（舞台同时是这两者的定位父级） */}
      <div>
        <p className="mb-2.5 text-[12.5px] font-semibold text-zinc-500 dark:text-[#9BA39E]">
          真卡片 · 当前「{MATERIAL_LEVEL_LABEL[level]}」档，莓小智正在改画布
        </p>
        <div
          data-mat-stage
          className="relative h-[200px] w-full overflow-hidden rounded-[14px] border border-black/[0.07] dark:border-white/[0.08]"
          style={
            {
              /* 病因②的解药：给舞台一个包含块，内部 position:fixed 的光效才绕着**这个舞台**跑 */
              contain: "paint",
              /* 局部档位：只影响这张卡与这支光，不动 <html> 上的全局设置 */
              ["--dc-mat-scale" as string]: SCALE[level],
            } as CSSProperties
          }
        >
          {/* 被材质模糊掉的内容 */}
          <div aria-hidden className="absolute inset-0" style={{ backgroundImage: STAGE_BACKDROP }} />

          {/* 真材质卡：ImmersiveCard（设备页/看板在用的同一张，REGULAR 档）。
              靠上摆放 —— 下方留给光效的状态胶囊，两者不叠在一起。 */}
          <div className="absolute inset-0 flex items-start justify-center p-5">
            <ImmersiveCard grade="regular" className="w-full max-w-[320px]">
              <div className="p-4">
                <p className="text-[13.5px] font-semibold text-zinc-900 dark:text-[#E4EEE9]">
                  沉浸光感材质
                </p>
                <p className="mt-1 text-[12px] leading-[1.7] text-zinc-600 dark:text-[#B6BDB8]">
                  背后的彩色内容被柔化透上来 —— 切成「流畅」，它当场变清晰。
                </p>
              </div>
            </ImmersiveCard>
          </div>

          {/* 真光效：一束光沿四边绕行，做完转绿 —— 不遮挡内容 */}
          <CanvasActivityGlow
            active={active}
            phase={phase}
            tone="think"
            dark={dark}
            label={phase === "done" ? "画布已更新 · 可 Ctrl+Z 撤销" : "莓小智正在修改画布…"}
            minVisibleMs={1500}
          />
        </div>
      </div>
    </div>
  );
}

export default MaterialDemo;
