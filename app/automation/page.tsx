"use client"

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { UserPublic } from "@/lib/db/user-service";
import { AutomationRule } from "@/lib/db/automation-service";
import { PageHeader } from "@/components/page-header";
import { PageHeaderRight } from "@/components/page-header-right";
import { CopilotSidebar } from "@/components/ai/copilot/copilot-sidebar";
import { ImmersiveCard, useMaterialCss } from "@/components/device/immersive-card";
import { MATERIAL_CSS } from "@/components/device/material-css";
import { toast } from "@/lib/ui/feedback";
import {
  IconAiming,
  IconApplicationOne,
  IconArrowRight,
  IconCamera,
  IconDashboard,
  IconDelete,
  IconMore,
  IconPlayOne,
  IconPlus,
  IconRobot,
  IconSearch,
  IconThunderbolt,
  IconTime,
} from "@/components/icon";
import { Illustration } from "@/components/illustration";

// antd 组件
import { ConfigProvider, Button, Dropdown, Empty, Spin } from "antd";
import { useTheme } from "next-themes";
import { antdScopeTheme } from "@/lib/theme/antd-scope-theme";

/* ==========================================================================
   自动化策略页 —— HarmonyOS HDS 重设计（2026-09-27）

   规范来源（华为开发者联盟 · 通用设计基础）：
     · 设计理念  design-concepts-0000001795698445
     · 圆角参数  corner-radius-parameter-0000002556468705
     · 间隔参数  spacing-0000001110658456-V1
     · 布局基础  design-layout-basics-0000001795579413
     · 沉浸光感  ui-design-hds-component-material（本项目 material-css.ts 已落地）

   ── 本次要解决的两件事（用户原话）──
     ① 「不要出现圆角矩形套圆角矩形这种粗略设计」
     ② 「然后应用上沉浸光感」

   ── ① 怎么才算「不套圆角矩形」──
     反例（旧版的真实结构）：
       卡片(10px 圆角 + 白底) → 图标底(9px 圆角 + 灰底) → 按钮(8px 圆角 + 白底)
       一屏 3 层圆角盒子叠罗汉，每层都在喊「我是个盒子」。
     HDS 的答案是**圆角与层级正相关**（官方原文：「圆角半径与界面元素的视觉、功能层级呈正相关，
     层级越高，圆角半径越大」），加上「一层容器」原则：一个视觉区域内**只允许一层**有底色/边框的
     圆角容器，容器内部只用「留白 + hairline 分隔线 + 字号字重层级」分组。

     所以本次的结构决策：
       ✓ 卡片 = 唯一的一层容器（ImmersiveCard，16px 圆角 + 材质）
       ✓ 卡内**零圆角盒子**：图标裸放（不再铺灰底圆角块）、指标格靠 hairline 分隔、
         操作区不是一颗圆角按钮而是一行可点文字（hover 变品牌绿）
       ✓ 「新建策略」这类真·控件才允许有圆角（20px = 官方「按钮 / 菜单」档）
       ✓ 标签类小元素才用 4px（官方「标签、角标」档）

   ── ② 沉浸光感怎么接 ──
     不自己造玻璃。走全站唯一源 `components/device/material-css.ts`：
       · 页面根挂 `.dc-scope`（承接 --dc-* token + antd 控件皮肤）
       · 本页**不再**挂 `.dc-backdrop`：氛围光按「场景轴」收进白名单，只有设备控制页有
         （2026-10-22 用户判定整站彩色渐变「好丑」，见下方氛围层注释）
       · 卡片用 <ImmersiveCard>（= .dc-mat + .dc-mat--regular + .dc-imv，自带按压点光源）
         ⚠️ 本页无景，材质会被场景轴自动退成**实色表面**（不挂 backdrop-filter），这是预期
       · 控件（搜索框 / 分段器 / 按钮）走 .dc-ctrl--* 档
     🚨 挂材质的地方**不能写 inline 的 background / border / box-shadow** ——
        那三条会把材质同名的低 alpha 属性整块盖掉（材质静默失效，CSS 不报错）。

   ── 圆角令牌（官方 5 档，只允许用这 5 个，别再出现 9/10/18px 这种散装值）──
     4px  标签、角标          --dc-r-xs
     8px  图片、图标、小容器   --dc-r-inner
     16px 内容卡片、通知       --dc-r-shell
     20px 按钮、菜单、选项卡   --dc-r-btn
     32px 半模态、弹窗         --dc-r-modal

   ── 间距令牌（官方 8vp 网格）──
     4 / 8 / 12 / 16 / 24 / 32（--dc-sp-1 … --dc-sp-8），卡片间 12vp、页边距 16~24vp
   ========================================================================== */

/** 触发器/节点类型 → 图标（HarmonyOS Symbol，唯一源） */
const TYPE_ICON: Record<string, React.ReactNode> = {
  vlm: <IconCamera />,
  sensor: <IconAiming />,
  schedule: <IconTime />,
  logic: <IconApplicationOne />,
  ai: <IconRobot />,
  action: <IconDashboard />,
  default: <IconThunderbolt />,
};

/** 触发器类型 → 中文名（hint 用，取代旧版的彩色 Tag） */
const TRIGGER_LABEL: Record<string, string> = {
  vlm: "视觉识别",
  sensor: "传感器",
  schedule: "定时任务",
  logic: "逻辑判断",
  ai: "AI 判断",
  action: "设备动作",
};

/* ---------------------------------------------------------------------------
   页面作用域 CSS
   ⚠️ 全部手写类，不用新 Tailwind 工具类：dev 增量扫描会静默丢掉新增工具类
      （见 .workbuddy/memory/topic-ui.md「Tailwind v4 坑」）。
   ⚠️ 模板字符串里禁出现反引号 —— 会把模板串截断导致整页 500。
   --------------------------------------------------------------------------- */
const AUTO_SCOPE_CSS = `
/* ==========================================================================
   ★★ --dc-* 设计令牌（本页自带）—— 本次「选中全白 / 字色没变」的根因修复

   🚨 关键真相：--dc-label / --dc-brand-ink / --dc-surface-3 …… 这一整套变量
      **定义在 device-control-client.tsx 的 DC_SCOPE_CSS 里**（那个模板字符串只在
      设备控制页渲染时注入），不在 material-css.ts、也不在 globals.css。
      globals.css 里只有 @theme inline 里的 --color-dc-label: var(--dc-label) 这种**转发**，
      转发的是「如果上游有值的话」。

      于是在 /automation 上：所有 var(--dc-label-2) / var(--dc-brand-ink) 全部解析为空
      → color 声明失效 → 浏览器回退到**继承色**。
      实测（CDP getComputedStyle）：--dc-brand-ink === ""（空串）。
      这就是「分段器选中项跟未选中项字色一模一样」「点卡进画布看不出层级」的根因
      —— CSS 不报错、DevTools 里规则是"命中"的，只是值是空的。

   处方：本页自己声明这一套（与设备页同值同语义），不依赖别的页面先渲染过。
   ⚠️ 若要长期收敛，正解是把这段抽到 material-css.ts 或 globals.css 做成全局唯一源；
      在没抽之前，**新页面必须自带一份**，否则就是这次的静默失效。
   ========================================================================== */
.auto-scope, .dc-scope{
  --dc-canvas: var(--berry-canvas, #F7F7F8);
  --dc-surface: var(--berry-surface, #FFFFFF);
  --dc-surface-2: rgba(24,24,27,.045);
  --dc-surface-3: rgba(24,24,27,.08);
  --dc-surface-4: rgba(24,24,27,.13);
  --dc-glass-bg: rgba(255,255,255,.58);
  --dc-glass-inner: rgba(255,255,255,.50);
  --dc-glass-border: rgba(255,255,255,.66);
  --dc-ctrl-inner: rgba(255,255,255,.26);
  --dc-ctrl-track: rgba(120,120,128,.24);
  --dc-line: var(--br-line, rgba(24,24,27,.08));
  --dc-line-strong: var(--br-line-strong, rgba(24,24,27,.14));
  --dc-label: var(--berry-label, #18181B);
  --dc-label-2: var(--berry-label-secondary, #52525B);
  --dc-label-3: #71717A;
  --dc-brand: #059669;                   /* 晨雾松 emerald 强调 */
  --dc-brand-strong: #047857;
  --dc-brand-ink: #047857;               /* 亮底可读 */
  --dc-brand-soft: rgba(5,150,105,.10);
  --dc-brand-ring: rgba(5,150,105,.30);
  --dc-ok-ink: var(--dc-brand-ink);
  --dc-ok-soft: var(--dc-brand-soft);
  --dc-ok-fill: #059669;
  --dc-warn-ink: #B45309;
  --dc-warn-soft: rgba(217,119,6,.12);
  --dc-bad-ink: #B91C1C;
  --dc-bad-soft: rgba(220,38,38,.10);
  --dc-bad-fill: rgba(220,38,38,.92);
  --dc-video: #0B0B0D;
  --dc-fs-bg: #17171A;
  --dc-fs-panel: #1F1F23;
  --dc-shadow-card: 0 1px 2px rgba(0,0,0,.03), 0 10px 28px -14px rgba(0,0,0,.10);
  --dc-shadow-hover: 0 2px 6px rgba(0,0,0,.05), 0 18px 40px -18px rgba(0,0,0,.18);
  --dc-shadow-inner: 0 1px 2px rgba(0,0,0,.04);
  /* 圆角：鸿蒙层级正相关（4 / 8 / 12 / 16 / 20 / 32） */
  --dc-r-xs: 4px;
  --dc-r-inner: 8px;
  --dc-r-card: 12px;
  --dc-r-shell: 16px;
  --dc-r-btn: 20px;
  --dc-r-modal: 32px;
  /* 字号：鸿蒙五档 */
  --dc-fs-title: 24px;
  --dc-fs-body-l: 18px;
  --dc-fs-body: 16px;
  --dc-fs-body-s: 14px;
  --dc-fs-caption: 12px;
  /* 间距：8vp 网格 */
  --dc-sp-1: 4px;  --dc-sp-2: 8px;  --dc-sp-3: 12px;
  --dc-sp-4: 16px; --dc-sp-6: 24px; --dc-sp-8: 32px;
}
.dark .auto-scope, .dark .dc-scope{
  --dc-surface-2: rgba(255,255,255,.045);
  --dc-surface-3: rgba(255,255,255,.09);
  --dc-surface-4: rgba(255,255,255,.14);
  --dc-glass-bg: rgba(255,255,255,.09);
  --dc-glass-inner: rgba(255,255,255,.07);
  --dc-glass-border: rgba(255,255,255,.16);
  --dc-ctrl-inner: rgba(255,255,255,.07);
  --dc-ctrl-track: rgba(255,255,255,.13);
  --dc-line-strong: rgba(255,255,255,.17);
  --dc-label-3: rgba(235,235,245,.58);
  --dc-brand-strong: #6EE7B7;
  --dc-brand-ink: #6EE7B7;               /* 深底可读 */
  --dc-brand-soft: rgba(52,211,153,.16);
  --dc-brand-ring: rgba(110,231,183,.36);
  --dc-warn-ink: #FCD34D;
  --dc-warn-soft: rgba(251,191,36,.16);
  --dc-bad-ink: #FCA5A5;
  --dc-bad-soft: rgba(248,113,113,.16);
}

/* —— 画布：把 --dc-canvas 真正落到元素上 ——
   🚨 只声明变量不消费 = 还是白板。设备页用 bg-[var(--dc-canvas)] 这个工具类，
      但 Tailwind v4 不生成 bg-[var(--x)]（见 topic-ui），所以这里手写。 */
.dc-scope{
  background-color: var(--dc-canvas);
  color: var(--dc-label);
}
.auto-scope{
  /* 本页只用官方 5 档圆角，别再散装 */
  --auto-hairline: var(--dc-line);
}

/* ==========================================================================
   ★ 氛围柔光层 —— 2026-10-22 已按用户要求**整层删除**

   旧实现的推理是对的（玻璃只有「透出有形状的东西」时才看得见），
   但代价是一整页斜向色带 + 6 盏径向柔光，用户判定「好丑」。
   判据已上收到 components/device/material-css.ts 的「场景轴」：
     有景（氛围光 / 桌面壁纸 / 真实内容）→ 玻璃；
     无景（本页画布是纯色 --berry-canvas）→ 实色表面，且不挂 backdrop-filter。
   本页现在属于「无景」，所以 .dc-backdrop 类名也一并从页面根节点移除。
   ⚠️ 不要再加回来：要让本页恢复氛围光，先问用户（这是一次明确的产品决定）。
   ========================================================================== */


/* —— 画布留白：HDS 页面边距 24vp（桌面），窄屏 16vp —— */
.auto-canvas{ padding: 24px; }
@media (max-width: 768px){ .auto-canvas{ padding: 16px; } }

/* —— 页头：标题直接落在画布上（不套卡片）——
   HDS 层级正相关：页面标题层级最高，所以它本身不该被"装进"一个内容卡里。 */
.auto-title{
  font-size: 24px;          /* Title_M */
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -.01em;
  color: var(--dc-label);
}
.auto-sub{ font-size: 14px; line-height: 1.5; color: var(--dc-label-2); }

/* —— 工具条：搜索 + 分段器落在画布上，不额外套卡片 ——
   它是"页头的一部分"，套卡 = 又一层盒子。 */
.auto-toolbar{
  display: flex; flex-wrap: wrap; align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* —— 分段控件（HDS：滑槽=凹槽 / 选中块=凸起滑块）——
   滑槽走 .dc-ctrl--track.dc-seg（凹槽材质，与设备页同一套）：
   中性灰低 alpha + 内阴影凹槽 + saturate 吸环境色。**必须有这层凹槽**，
   否则白滑块浮在同色画布上 ⇒ 就是用户截图里那句「这里选中全白的」。
   ⚠️ 不用 antd Segmented：它的默认样式自带一层圆角底，会与滑槽形成两层圆角。 */
.auto-seg{
  display: inline-flex; align-items: center; gap: 2px;
  height: 40px; padding: 4px;
  border-radius: var(--dc-r-btn, 20px);
}
.auto-seg-item{
  position: relative;
  display: inline-flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 16px;
  border-radius: 16px;   /* 同层统一：滑块比滑槽小一档 → 同心圆角 */
  font-size: 14px; font-weight: 500;
  color: var(--dc-label-2);
  transition: color .2s ease;
  cursor: pointer; border: none; background: transparent;
  white-space: nowrap;
}
.auto-seg-item:hover{ color: var(--dc-label); }
/* 选中态：字色用品牌墨绿（强调色只落在字上，不靠底色 —— 见 material-css 那段弯路）
   再补一条极淡的品牌色内缘，让选中项读起来「被点亮」，而不是纯白一块 */
.auto-seg-item[aria-selected="true"]{ color: var(--dc-brand-ink); }
.auto-seg-item[aria-selected="true"]::after{
  content: ""; position: absolute; inset: 0; z-index: 2;
  border-radius: inherit; pointer-events: none;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dc-brand, #059669) 22%, transparent);
}
.auto-seg-thumb{
  position: absolute; inset: 0; z-index: 0;
  border-radius: inherit; pointer-events: none;
}
.auto-seg-count{
  font-size: 12px; font-variant-numeric: tabular-nums;
  opacity: .72;
}
.auto-seg-item > *{ position: relative; z-index: 1; }

/* —— 卡片网格：HDS 卡片间距 12vp（官方 space_elements_card）—— */
.auto-grid{
  display: grid; gap: 12px;
  grid-template-columns: repeat(1, minmax(0, 1fr));
}
@media (min-width: 768px){ .auto-grid{ grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1280px){ .auto-grid{ grid-template-columns: repeat(3, minmax(0, 1fr)); } }

/* —— 卡片本体（.auto-card 只做布局，材质交给 ImmersiveCard）——
   🚨 这里绝不写 background / border / box-shadow。 */
.auto-card{
  display: flex; flex-direction: column;
  padding: 16px;                    /* 卡片内边距 16vp */
  min-height: 176px;                /* 22 × 8vp，与设备卡同基准 */
  cursor: pointer;
}
.auto-card-head{
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 8px;
}
/* 图标**裸放**：不再给它铺一层灰底圆角块（那正是"套圆角矩形"的一层） */
.auto-card-icon{
  color: var(--dc-brand-ink);
  display: inline-flex; align-items: center; justify-content: center;
  flex: none;
  transition: transform .24s cubic-bezier(.22,.61,.36,1);
}
.auto-card:hover .auto-card-icon{ transform: translateY(-1px) scale(1.06); }

/* 状态点：唯一的状态色载体（绿=运行 / 灰=暂停），不再配彩色 Tag 底 */
.auto-status{
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 500;
  color: var(--dc-label-3);
}
.auto-status-dot{
  width: 6px; height: 6px; border-radius: 999px; flex: none;
  background: var(--dc-label-3);
}
.auto-status[data-on="true"]{ color: var(--dc-brand-ink); }
.auto-status[data-on="true"] .auto-status-dot{ background: var(--dc-brand); }
.auto-status[data-running="true"] .auto-status-dot{ animation: autoPulse 1.6s ease-in-out infinite; }
@keyframes autoPulse{
  0%,100%{ opacity: 1; transform: scale(1) }
  50%{ opacity: .4; transform: scale(.7) }
}

.auto-card-title{
  font-size: 16px;                  /* Body_M —— 卡片标题 */
  font-weight: 600; line-height: 1.4;
  color: var(--dc-label);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  transition: color .2s ease;
}
.auto-card:hover .auto-card-title{ color: var(--dc-brand-ink); }
.auto-card-desc{
  font-size: 14px; line-height: 1.55;   /* Body_S */
  color: var(--dc-label-2);
  margin-top: 4px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 43px;
}

/* —— 卡内分隔：只用 1px hairline（HDS 元素间间隔），不用灰底块 —— */
.auto-hairline{ height: 1px; background: var(--auto-hairline); margin: 16px 0 12px; }

/* —— 指标行：靠 hairline 竖向切分，**不给每格铺底**（旧版是 2x2 独立小盒）—— */
.auto-metrics{ display: grid; grid-template-columns: 1fr 1fr; }
.auto-metric{ display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.auto-metric + .auto-metric{
  border-left: 1px solid var(--auto-hairline);
  padding-left: 16px;
}
.auto-metric-label{ font-size: 12px; color: var(--dc-label-3); }   /* Caption_M */
.auto-metric-value{
  font-size: 14px; font-weight: 500; color: var(--dc-label);
  font-variant-numeric: tabular-nums;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* —— 卡内动作：**一行可点文字**，不是一颗圆角按钮 ——
   这是删掉"最内层圆角矩形"的关键一步。层级用字色 + 箭头前推表达。 */
.auto-action{
  margin-top: auto; padding-top: 12px;
  display: flex; align-items: center; justify-content: flex-end;
  gap: 4px;
  font-size: 14px; font-weight: 500;
  color: var(--dc-label-2);
  transition: color .2s ease;
}
.auto-card:hover .auto-action{ color: var(--dc-brand-ink); }
.auto-action svg{ transition: transform .2s cubic-bezier(.22,.61,.36,1); }
.auto-card:hover .auto-action svg{ transform: translateX(2px); }

/* —— 行内「更多」按钮：裸图标，hover 才出现底 —— */
.auto-more{
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; flex: none;
  border-radius: 8px;                /* 小控件 → 8px 档 */
  color: var(--dc-label-3);
  background: transparent; border: none; cursor: pointer;
  transition: background-color .16s ease, color .16s ease;
}
.auto-more:hover{ background: var(--dc-surface-3); color: var(--dc-label); }

/* —— ⋯ 下拉面板：接沉浸光感（.dc-ctrl--popup 档）+ 收进圆角阶梯 ——
   antd 默认给的是「纯白实底 + 10px 圆角」，两个问题：
     ① 10px 不在官方 5 档（4/8/16/20/32）里 → 散装圆角；
     ② 面板悬在画布上却没有材质 → 与整页的玻璃语言断裂，读起来像"贴了张白纸"。

   🚨 材质挂哪一层 —— 实测结构（antd v6）：
     .ant-dropdown（根，material 挂这）   ← 但它 **radius: 0**，材质的底色/描边是方的
       └ ul.ant-dropdown-menu            ← 这个才有圆角
     → 把材质挂根上会得到「方形半透底板 + 圆角内层」= 四角多出四块方角（实测就是这样）。
   ✅ 正确做法：**材质挂根（拿 backdrop-filter 与受光边）**，同时
      ① 给根也设 16px 圆角（让材质的 bg/border/shadow 跟着圆）；
      ② 内层 ul 底色压透明（否则盖住材质）。
     两者缺一不可 —— 只做 ② 会露出方角；只做 ① 内层白底会盖掉材质。

   ⚠️ 可读性：--popup 档是 alpha .60 + blur 42px。压在**卡片正文**上仍能透出字迹，
      对「悬停即读」的短菜单略透 → 这里把根上的 --mat-bg 提到 .78（仍是玻璃，
      但字不再跟背后的正文打架）。这是菜单这一层的局部调参，不动全局 --popup 档。

   🚨 **宽度必须显式收住**：.dc-ctrl 基类带 display:flex + 一堆控件盒模型，
      挂在 .ant-dropdown 根上后，根会被撑成**整行宽**（实测 1425px / 视口 1440px）。
      菜单只需要「内容宽 + 一点内距」→ 给 ul 设 width: max-content + 上下限。
      （这也是「材质挂在根上」的连带代价：拿到了材质，也继承了控件的布局倾向。） */
.auto-menu{
  border-radius: 16px !important;
  --mat-bg: rgba(255,255,255,.78);
  width: max-content !important;
  min-width: 0 !important;
}
.dark .auto-menu{
  --mat-bg: rgba(52,52,62,.80);
}
.auto-menu .ant-dropdown-menu,
.auto-menu .ant-dropdown-menu-submenu-popup .ant-dropdown-menu{
  background: transparent !important;
  box-shadow: none !important;
  border: 0 !important;
  border-radius: 16px !important;
  padding: 6px !important;
  width: max-content !important;
  min-width: 148px !important;
  max-width: 260px !important;
}
/* 菜单项圆角收进阶梯（内层比外层小一档 = 同心） */
.auto-menu .ant-dropdown-menu-item{
  border-radius: 10px !important;
}
.auto-menu .ant-dropdown-menu-item:hover{
  background-color: var(--dc-surface-3) !important;
}
/* 危险项（删除策略）：只染字色与 hover 软底，不给它铺实红 —— 强调色唯一 */
.auto-menu .ant-dropdown-menu-item-danger{
  color: var(--dc-bad-ink) !important;
}
.auto-menu .ant-dropdown-menu-item-danger:hover{
  background-color: var(--dc-bad-soft) !important;
}

/* —— 卡片入场：错峰上移落位（backwards 而非 both，否则 hover 位移会被锁死）—— */
@keyframes autoRiseIn{ from{ transform: translateY(8px); opacity: 0 } }
.auto-rise{ animation: autoRiseIn .34s cubic-bezier(.22,.61,.36,1) backwards; }

@media (prefers-reduced-motion: reduce){
  .auto-card-icon, .auto-action svg{ transition: none !important; }
  .auto-card:hover .auto-card-icon, .auto-card:hover .auto-action svg{ transform: none !important; }
  .auto-rise{ animation: none !important; }
  .auto-status[data-running="true"] .auto-status-dot{ animation: none !important; }
}

/* —— 空态：图标也裸放，不套灰底圆角块 —— */
.auto-empty{ display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 64px 0; }
`

export default function AutomationPage() {
  useMaterialCss()

  const router = useRouter()

  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all"); // all | active | paused
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/automation/rules');
      const data = await res.json();
      if (data.success) {
        setRules(Array.isArray(data.data) ? data.data : []);
      }
    } catch (e) {
      console.error(e);
      toast.error("加载规则失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) setCurrentUser(data.user);
    } catch (e) {
      console.error("Failed to fetch user:", e);
    }
  };

  useEffect(() => {
    fetchRules();
    fetchUser();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/automation/rules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("规则已删除");
        fetchRules();
      }
    } catch (e) {
      toast.error("删除失败");
    }
  };

  // —— 立即运行某条规则（调真实执行 API）——
  const handleRunRule = async (rule: AutomationRule) => {
    if (runningId) return;
    setRunningId(rule.id);
    const loadingToast = toast.loading(`正在运行「${rule.name}」...`);
    try {
      let graphData: any = {};
      try {
        graphData = JSON.parse(rule.graph_data || "{}");
      } catch {
        toast.error('执行失败', {
          description: '规则数据已损坏，请重新编辑',
          id: loadingToast,
        });
        return;
      }
      if (!Array.isArray(graphData.nodes) || graphData.nodes.length === 0) {
        toast.error('执行失败', {
          description: '规则为空，请先在编辑器添加节点',
          id: loadingToast,
        });
        return;
      }
      const res = await fetch('/api/automation/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graph_data: graphData,
          force: true,
          context: { sensorData: undefined, timestamp: Date.now() },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error('执行失败', {
          description: data.message || data.error || '未知错误',
          id: loadingToast,
        });
        return;
      }
      const actionsCount = Array.isArray(data.actions) ? data.actions.length : 0;
      if (actionsCount > 0) {
        toast.success(`成功执行 ${actionsCount} 个动作`, { id: loadingToast });
      } else {
        toast.info(data.message || '当前条件未触发任何动作', {
          id: loadingToast,
          duration: 4000,
        });
      }
      fetchRules();
    } catch (e) {
      toast.error('执行失败', {
        description: e instanceof Error ? e.message : String(e),
        id: loadingToast,
      });
    } finally {
      setRunningId(null);
    }
  };

  const filteredRules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (Array.isArray(rules) ? rules : []).filter((rule) => {
      const matchesSearch =
        !q ||
        rule.name.toLowerCase().includes(q) ||
        (rule.description || "").toLowerCase().includes(q);
      if (filter === "active") return rule.is_active && matchesSearch;
      if (filter === "paused") return !rule.is_active && matchesSearch;
      return matchesSearch;
    });
  }, [rules, searchQuery, filter]);

  const activeCount = rules.filter(r => r.is_active).length;
  const pausedCount = rules.filter(r => !r.is_active).length;

  /** 时间只显示 HH:mm（旧版 toLocaleTimeString 会带秒，右侧指标格被挤断） */
  const formatLastRun = (iso: string | null | undefined) => {
    if (!iso) return "--:--";
    try {
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch {
      return "--:--";
    }
  };

  if (loading) {
    return (
      <ConfigProvider theme={antdScopeTheme(isDark)}>
        <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <Spin size="large" />
        </div>      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={antdScopeTheme(isDark)}>
      <style>{MATERIAL_CSS + AUTO_SCOPE_CSS}</style>
      <div className="auto-scope dc-scope min-h-screen w-full h-screen overflow-hidden text-dc-label">
        <div className="relative z-10 grid grid-rows-[var(--header-h,72px)_1fr] h-full w-full">
          <PageHeader user={currentUser}>
            <PageHeaderRight />
          </PageHeader>

          {/* ⚠️ auto-canvas 必须自己承担滚动（页面根是 h-screen overflow-hidden），
              否则内容会在 1fr 行里溢出到视口外。 */}
          <div className="relative auto-canvas overflow-y-auto h-full scrollbar-hide" data-lenis-prevent>
            <div className="mx-auto max-w-[1400px] w-full">

              {/* ===== 页头：标题直接落在画布上，右侧唯一动作 ===== */}
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="auto-title">自动化策略</h1>
                  <p className="auto-sub mt-2">
                    用可视化画布编排视觉识别、传感器阈值与定时任务，条件成立时自动执行设备动作
                  </p>
                </div>
                <Link href="/automation/editor">
                  <Button
                    type="primary"
                    icon={<IconPlus />}
                    className="dc-ctrl--brand dc-ctrl--press !h-10 !px-5 !rounded-[20px]"
                  >
                    新建策略
                  </Button>
                </Link>
              </div>

              {/* ===== 工具条：分段器（凹槽 + 滑块）+ 搜索框，均落在画布上 ===== */}
              <div className="auto-toolbar mt-6">
                <div className="dc-ctrl dc-ctrl--track dc-seg auto-seg" role="tablist" aria-label="按状态筛选">
                  {([
                    { key: "all", label: "全部", count: rules.length },
                    { key: "active", label: "运行中", count: activeCount },
                    { key: "paused", label: "已暂停", count: pausedCount },
                  ] as const).map((opt) => (
                    <button
                      key={opt.key}
                      role="tab"
                      aria-selected={filter === opt.key}
                      onClick={() => setFilter(opt.key)}
                      className="auto-seg-item dc-ctrl--press"
                    >
                      {filter === opt.key && (
                        <motion.span
                          layoutId="auto-seg-thumb"
                          className="auto-seg-thumb dc-ctrl dc-ctrl--thumb"
                          transition={{ type: "spring", stiffness: 480, damping: 40 }}
                        />
                      )}
                      <span>{opt.label}</span>
                      <span className="auto-seg-count">{opt.count}</span>
                    </button>
                  ))}
                </div>

                <div className="dc-ctrl dc-ctrl--field dc-ctrl--press flex items-center gap-2 h-10 px-3 rounded-[20px] w-full sm:w-[280px]">
                  <IconSearch className="size-4 shrink-0 text-dc-label-3" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索策略名称或描述"
                    aria-label="搜索策略"
                    className="w-full min-w-0 bg-transparent border-0 outline-none text-sm text-dc-label placeholder:text-dc-label-3"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      aria-label="清空搜索"
                      onClick={() => setSearchQuery("")}
                      className="auto-more !w-6 !h-6"
                    >
                      <IconDelete className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* ===== 策略卡片网格 ===== */}
              {filteredRules.length > 0 ? (
                <div className="auto-grid mt-6 pb-16">
                  <AnimatePresence mode="popLayout">
                    {filteredRules.map((rule, idx) => {
                      const isRunning = runningId === rule.id;
                      return (
                        <motion.div
                          key={rule.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          transition={{ duration: 0.18, delay: Math.min(idx * 0.03, 0.24) }}
                        >
                          {/* 整卡可点 → 进编辑器。
                              🚨 这里**不能**用 <Link> 包整卡：Dropdown 的触发器与菜单都会
                                 portal 到 body，但触发器那一下 click 仍会冒泡回 <Link> 的
                                 <a>，于是「点 ⋯ 打开菜单」= 同时触发一次导航，直接跳进画布。
                                 react 的合成事件里 stopPropagation 挡不住 <a> 的原生默认跳转
                                 （而且 antd 菜单项本身的 onClick 拿到的是原生事件）。
                                 所以改成 div + 显式 router.push：
                                   · 卡体点击 → 进编辑器
                                   · 交互元素（⋯ 按钮 / 菜单项）点击 → 自己的 handler + stopPropagation
                                 Link 语义用 role/tabIndex + 键盘 Enter/Space 补齐（可访问性不掉）。 */}
                          <ImmersiveCard
                            className="auto-card auto-rise rounded-[16px] h-full"
                            style={{ animationDelay: `${Math.min(idx * 40, 240)}ms` }}
                            role="link"
                            tabIndex={0}
                            aria-label={`编辑策略 ${rule.name}`}
                            onClick={() => router.push(`/automation/editor?id=${rule.id}`)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                router.push(`/automation/editor?id=${rule.id}`);
                              }
                            }}
                          >
                            {/* 头部：裸图标 + 状态点 + 更多菜单 */}
                            <div className="auto-card-head">
                              <span className="auto-card-icon size-7">
                                {TYPE_ICON[rule.trigger_type] || TYPE_ICON.default}
                              </span>

                              {/* 🚨 这一簇必须整体「挡住」卡片的点击与键盘事件：
                                  它是卡上的独立操作区，不该继承「点卡进画布」的行为。 */}
                              <div
                                className="flex items-center gap-1 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                              >
                                <span
                                  className="auto-status"
                                  data-on={rule.is_active ? "true" : "false"}
                                  data-running={isRunning ? "true" : "false"}
                                >
                                  <span className="auto-status-dot" />
                                  {isRunning ? "执行中" : rule.is_active ? "运行中" : "已暂停"}
                                </span>

                                <Dropdown
                                  trigger={["click"]}
                                  placement="bottomRight"
                                  rootClassName="auto-menu dc-ctrl dc-ctrl--popup"
                                  menu={{
                                    items: [
                                      {
                                        key: "run",
                                        icon: <IconPlayOne />,
                                        label: "立即运行",
                                        disabled: runningId === rule.id,
                                      },
                                      { type: "divider" },
                                      { key: "delete", icon: <IconDelete />, label: "删除策略", danger: true },
                                    ],
                                    onClick: ({ key, domEvent }) => {
                                      domEvent.stopPropagation();
                                      if (key === "run") handleRunRule(rule);
                                      if (key === "delete") handleDelete(rule.id);
                                    },
                                  }}
                                >
                                  <button type="button" aria-label="更多操作" className="auto-more">
                                    <IconMore className="size-4" />
                                  </button>
                                </Dropdown>
                              </div>
                            </div>

                            {/* 标题 + 描述 */}
                            <div className="mt-3">
                              <h3 className="auto-card-title">{rule.name}</h3>
                              <p className="auto-card-desc">{rule.description || "暂无描述"}</p>
                            </div>

                            {/* hairline 分隔（卡内不用灰底块） */}
                            <div className="auto-hairline" />

                            {/* 指标行：hairline 竖切，不给每格铺底 */}
                            <div className="auto-metrics">
                              <div className="auto-metric">
                                <span className="auto-metric-label">触发次数</span>
                                <span className="auto-metric-value">{rule.execution_count}</span>
                              </div>
                              <div className="auto-metric">
                                <span className="auto-metric-label">
                                  {TRIGGER_LABEL[rule.trigger_type] || "触发源"}
                                </span>
                                <span className="auto-metric-value">{formatLastRun(rule.last_triggered_at)}</span>
                              </div>
                            </div>

                            {/* 动作：一行文字，不是一颗圆角按钮 */}
                            <div className="auto-action">
                              <span>编辑策略</span>
                              <IconArrowRight className="size-4" />
                            </div>
                          </ImmersiveCard>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="auto-empty"
                >
                  <Illustration name="get-inspiration" width={160} />
                  <p className="mt-4 text-sm text-dc-label-2 text-center">
                    {searchQuery ? "没有匹配的策略，换个关键词试试" : "还没有自动化策略，创建第一条开始使用"}
                  </p>
                  {!searchQuery && (
                    <Button
                      type="primary"
                      icon={<IconPlus />}
                      className="dc-ctrl--brand dc-ctrl--press !h-10 !px-5 !rounded-[20px] mt-1"
                      onClick={() => { window.location.href = "/automation/editor"; }}
                    >
                      创建新策略
                    </Button>
                  )}
                </motion.div>
              )}
            </div>

            {/* ===== AI 助手侧栏（欢迎词按页面区分）===== */}
            <CopilotSidebar
              pageKey="automation"
              context={() => {
                const lines: string[] = ["页面：自动化策略（/automation）"]
                lines.push(`策略总数：${rules.length}`)
                const active = rules.filter((r) => r.is_active).length
                lines.push(`运行中：${active} 条；已暂停：${rules.length - active} 条`)
                if (rules.length) {
                  lines.push(
                    "策略清单：\n" +
                      rules
                        .slice(0, 12)
                        .map(
                          (r) =>
                            `- ${r.name}｜触发源 ${r.trigger_type}｜${r.is_active ? "运行中" : "已暂停"}｜累计执行 ${r.execution_count} 次`
                        )
                        .join("\n")
                  )
                }
                if (searchQuery) lines.push(`用户正在搜索：${searchQuery}`)
                return lines.join("\n")
              }}
            />
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}
