"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import type { CSSProperties } from "react"
import dynamic from "next/dynamic"
import { Switch, Slider, Button, Badge, Row, Col, Space, Tag, Typography, InputNumber, Input, Select, Divider, Tooltip, Modal, Alert, Spin, Empty, Descriptions, Segmented, Progress, Popconfirm, ConfigProvider, theme as antdTheme } from "antd"

import { toast } from "@/lib/ui/feedback"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import { useWeather } from "@/lib/hooks/use-weather"
import { CopilotSidebar } from "@/components/ai/copilot/copilot-sidebar"
import type { CopilotClientTools } from "@/components/ai/copilot/use-copilot-chat"
// Copilot 辅助硬件接入：草稿解析 + 投递（前端工具 device_access_apply_draft 用）
import { parseAccessDraft, pushAccessDraft } from "@/lib/devices/access-draft"
import {
  describeActiveForm,
  patchActiveForm,
  readActiveForm,
  type FormKind,
} from "@/lib/devices/form-state"
// 设备管理弹窗（版式与 AI 助手「设置」弹窗同源；写操作后全局广播，AI 助手同步生效）
import { DeviceManagerDialog, resolveDeviceIcon, resolveDeviceColor } from "@/components/device/device-manager-dialog"
// 沉浸光感材质（HDS 组件材质）：唯一来源，档位 + 自适应等级 + 材质本体都在这里
// 规范：developer.huawei.com/consumer/cn/doc/harmonyos-guides/ui-design-hds-component-material
import { MATERIAL_CSS } from "@/components/device/material-css"
import { useAdaptiveMaterialLevel } from "@/components/device/use-material-level"
import { useScrollEdge } from "@/components/device/use-scroll-fade"
// 沉浸光感材质卡（HDS REGULAR 档）：整页卡片的统一材质与按压手感都在这里
import { ImmersiveCard } from "@/components/device/immersive-card"
import { SensorSparkline } from "@/components/charts/sparkline"
import { useRouter } from "next/navigation"
import type { UserPublic } from "@/lib/db/user-service"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { PageHeaderRight } from "@/components/page-header-right"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import { IconArrowDown, IconArrowRight, IconArrowUp, IconAttention, IconCamera, IconCaution, IconCheckOne, IconClose, IconCompass, IconCpu, IconDelete, IconDown, IconFan, IconFullScreen, IconGridFour, IconHelp, IconHistory, IconInfo, IconLayers, IconLeft, IconLight, IconListCheckbox, IconListTwo, IconLocalPin, IconMicrophone, IconMore, IconNavigation, IconOffScreen, IconPlay, IconPlus, IconRefresh, IconRight, IconSearch, IconSetting, IconSettingTwo, IconSignal, IconStar, IconSun, IconSunny, IconTarget, IconThermometer, IconTime, IconTrendingDown, IconTrendingUp, IconUndo, IconUp, IconVideo, IconWater, IconWifi, IconWind, IconLightRain } from "@/components/icon";
// 天气视觉（条件 → 图标 / 渐变板）：与 dashboard 天气 widget 同源，
// 避免「同一个天气在 dashboard 和这里各画一套色板」的分叉。
import { getWeatherConfig } from "@/components/dashboard/ios-style/weather-visualizations"

const { Text } = Typography

// ====================================================================================
//  设备控制页设计 token（本页唯一配色来源）—— 按 HarmonyOS 设计规范落地
//  规范依据：developer.huawei.com/consumer/cn/doc/design-guides-V1
//    · 色彩：背景 #F1F3F5 / 卡片 #FFFFFF / 弹窗 #363636；文字三级 = 90% / 60% / 40% 不透明
//    · 圆角（层级正相关）：4 标签角标 / 8 图标小容器 / 12 列表项 / 16 卡片内容容器
//                          20 按钮菜单选项卡 / 32 半模态弹窗
//    · 间距：8vp 网格为基数（4/8/12/16/24/32），图标可对齐 4vp
//    · 栅格：基础栅格 margin 24vp + gutter 24vp；卡片栅格 margin 12vp + gutter 12vp
//    · 字体：Title_M 24 / Body_L 18 / Body_M 16 / Body_S 14 / Caption_M 12（fp 随用户缩放）
//    · 形态：扁平实底 + hairline 描边建立层级，不用多层柔光/毛玻璃堆叠
//  —— 所有类名一律引用 var(--dc-*)，禁止再写 slate/zinc/散装十六进制。
//  —— 亮暗双态由 CSS 变量自动切换，组件里不再需要 dark: 颜色变体。
// ====================================================================================

/** antd token 需要真实颜色值（无法喂 var()，色彩算法解析不了），故单独导出常量 */
const DC_BRAND = "#059669"
const DC_WARN = "#52525B"
const DC_BAD = "#DC2626"
const DC_SURFACE_LIGHT = "#FFFFFF"
const DC_SURFACE_DARK = "#27272A"

const DC_SCOPE_CSS = `
.dc-scope{
  /* 🚨 overflow:hidden 是必需的，不是可选优化：
     本页氛围层用负 inset 铺出画布外沿（历史上一版 .dc-aurora 用 inset:-10% -6%
     + scale(1.09)，已被删除，见下方「光放在哪一层」说明）。绝对定位元素一旦超出
     scope，就会**撑大文档滚动高度**（实测 scope 1099px，溢出层 bottom 1220px → 多出 121px）。
     那 121px 里 scope 已经结束，露出的是 body 底色（近白）—— 就是用户看到的「底部白条」。
     所以：只要这页还有任何负 inset / scale 的氛围层，这个 hidden 就必须留着。
     安全性：sticky 不在这里 —— 右侧看板的 xl:sticky 的滚动容器是内层 .overflow-y-auto，
     中间已有 overflow 非 visible 的祖先，所以 scope 加 hidden 不影响它。
     另外 antd 的 Modal / Select / Popover 都 portal 到 body，也不会被裁。 */
  overflow: hidden;
  /* ========== 色彩：画布 / 卡面（玻璃拟态，浮在氛围光之上） ==========
     ⛔ 全站铁律：中性面一律「零彩度」——原来是 iOS 的 rgba(60,60,67,…)（带蓝韵），
        已换成纯中性的 rgba(24,24,27,…)；同理 line / line-strong 走 br 中性token。 */
  --dc-canvas: var(--berry-canvas);        /* 页面背景（氛围柔光铺在其上） */
  --dc-surface: var(--berry-surface);      /* 实底卡片（弹窗内的白卡） */
  --dc-surface-2: rgba(24,24,27,.045);     /* 卡内嵌底 */
  --dc-surface-3: rgba(24,24,27,.08);      /* 控件底 / 次级 hover */
  --dc-surface-4: rgba(24,24,27,.13);      /* 控件 hover */
  /* —— 沉浸光感材质 = 四件套（HDS 官方组合）——
     半透明底 + 强模糊 + 1px 细边 + 柔和阴影，就这四样。
     刻意不做「厚度 / 颗粒 / 折射 / 边缘光」那套拟物细节：那是模拟实体玻璃的外观，
     而沉浸光感要的是「通透的拟态感」—— 材质只负责把下方内容柔化透出，不表演玻璃。
     规范：developer.huawei.com/consumer/cn/doc/harmonyos-guides/ui-design-hds-component-material
     官方示例：backgroundColor(rgba(255,255,255,0.1)) + BlurStyle.ULTRA_THICK
              + border(1px, rgba(255,255,255,0.2)) + shadow(radius 20, rgba(0,0,0,0.15)) */
  --dc-glass-bg: rgba(255,255,255,.58);
  --dc-glass-inner: rgba(255,255,255,.50);
  --dc-glass-border: rgba(255,255,255,.66);
  /* ⛔ 已退役：--dc-glass-bg-strong = rgba(255,255,255,.88)。
     它曾经是 Input / Select / 次级按钮的底色 —— 88% 的白把背后的光冲掉 88%，
     控件于是成了「贴在卡片上的一块死白片」，用户截图里的「没有光感的白控件」就是它。
     现在控件走 --mat-*（.dc-ctrl--field 档，见 material-css.ts），不要再捡回来。 */
  /* —— 控件材质补充 token（.dc-ctrl 覆盖不到的两处细部）—— */
  --dc-ctrl-inner: rgba(255,255,255,.26);   /* 控件内的内嵌块（前后缀单位区） */
  --dc-ctrl-track: rgba(120,120,128,.24);   /* 滑杆轨（开关轨道走 .dc-ctrl--track 档） */
  /* —— 描边（一条 hairline + 一条明确边界）—— 走 br 中性 token，自动跟随明暗 */
  --dc-line: var(--br-line);
  --dc-line-strong: var(--br-line-strong);
  /* —— 文字（3 档；三级比原生压深一档以过 4.5:1）—— */
  --dc-label: var(--berry-label);
  --dc-label-2: var(--berry-label-secondary);
  --dc-label-3: #71717A;
  /* —— 品牌青绿（WorkBuddy c-teal）：填充 / 可读文字 双轨 —— */
  --dc-brand: ${DC_BRAND};
  --dc-brand-strong: #047857;
  --dc-brand-ink: #047857;               /* 白底可读 */
  --dc-brand-soft: rgba(5,150,105,.10);
  --dc-brand-ring: rgba(5,150,105,.30);
  /* —— 状态语义 ——
     品牌/强调 = emerald（晨雾松），warn = c-amber，bad = c-red。
     dc-ok 指向品牌强调（「在线/活跃」就是该被强调的状态）。 */
  --dc-ok-ink: var(--dc-brand-ink);
  --dc-ok-soft: var(--dc-brand-soft);
  --dc-ok-fill: #059669;
  --dc-warn-ink: #B45309;
  --dc-warn-soft: rgba(217,119,6,.12);
  --dc-bad-ink: #B91C1C;
  --dc-bad-soft: rgba(220,38,38,.10);
  --dc-bad-fill: rgba(220,38,38,.92);
  /* —— ⛔ 已退役：度量身份色（温/湿/CO₂/光照 四色）——
     曾用「同一物理量同色」的理念给温度橙、湿度蓝、CO₂ 青、光照黄，
     结果是同一屏里出现 4 个互不相干的彩色图标，正是用户说的「配色不统一」。
     现统一为：**品牌绿是唯一的强调色**，物理量靠「图标形状 + 文字标签」区分；
     颜色只保留三档语义 —— 品牌绿（强调/可点）、中性灰（信息）、红/琥珀（在线离线告警）。
     不要再把这四色捡回来。 */
  /* —— 视频视口（比纯黑柔一档，与暗色画布同族）—— */
  --dc-video: #0B0B0D;      /* 视频视口 —— 暖黑，与 WorkBuddy 画布同族 */
  /* —— 全屏沉浸面板（视频之上的暗色 chrome，两态都保持暗）—— */
  --dc-fs-bg: #17171A;
  --dc-fs-panel: #1F1F23;
  /* —— 阴影（3 档，多层叠加给玻璃卡做浮起）—— */
  --dc-shadow-card: 0 1px 2px rgba(0,0,0,.03), 0 10px 28px -14px rgba(0,0,0,.10);
  --dc-shadow-hover: 0 2px 6px rgba(0,0,0,.05), 0 18px 40px -18px rgba(0,0,0,.18);
  --dc-shadow-inner: 0 1px 2px rgba(0,0,0,.04);
  /* ========== 圆角：鸿蒙层级正相关（4 / 8 / 12 / 16 / 20 / 32） ========== */
  --dc-r-xs: 4px;      /* 标签、角标 */
  --dc-r-inner: 8px;   /* 图标底、小容器、输入框 */
  --dc-r-card: 12px;   /* 列表项、卡内嵌块 */
  --dc-r-shell: 16px;  /* 卡片、内容容器 */
  --dc-r-btn: 20px;    /* 按钮、菜单、选项卡 */
  --dc-r-modal: 32px;  /* 半模态、弹窗 */
  /* ========== 字号：鸿蒙五档（对应 text-xs / text-sm / text-base / text-2xl） ========== */
  --dc-fs-title: 24px;   /* Title_M  页面标题、关键数值 */
  --dc-fs-body-l: 18px;  /* Body_L   */
  --dc-fs-body: 16px;    /* Body_M   正文、卡片标题 */
  --dc-fs-body-s: 14px;  /* Body_S   次要文字、按钮 */
  --dc-fs-caption: 12px; /* Caption_M 标签、说明 */
  /* ========== 间距：8vp 网格基数 ========== */
  --dc-sp-1: 4px;
  --dc-sp-2: 8px;
  --dc-sp-3: 12px;
  --dc-sp-4: 16px;
  --dc-sp-6: 24px;
  --dc-sp-8: 32px;
}
.dark .dc-scope{
  --dc-surface-2: rgba(255,255,255,.045);
  --dc-surface-3: rgba(255,255,255,.09);
  --dc-surface-4: rgba(255,255,255,.14);
  /* 混白而不是混灰：深色画布上，半透明白底才能同时做到「亮一档」和「透」。
     无顶边高光 / 无底边压暗 —— 那两条 inset 线会在卡片四周拉出清晰的白边和黑边，
     看起来像「描了边的实心板」= 生硬。沉浸光感只靠底色差 + 1px 细边 + 柔和阴影。 */
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
  --dc-ok-ink: var(--dc-brand-ink);
  --dc-ok-soft: var(--dc-brand-soft);
  --dc-warn-ink: #FCD34D;
  --dc-warn-soft: rgba(251,191,36,.16);
  --dc-bad-ink: #FCA5A5;
  --dc-bad-soft: rgba(248,113,113,.16);
  --dc-video: #0A0A0C;
  /* 柔和阴影（HDS 示例：radius 20 / rgba(0,0,0,.15) / offsetY 8）—— 贴地、不黑洞 */
  --dc-shadow-card: 0 1px 2px rgba(0,0,0,.22), 0 8px 20px rgba(0,0,0,.34);
  --dc-shadow-hover: 0 2px 8px rgba(0,0,0,.34), 0 20px 44px -20px rgba(0,0,0,.62);
  --dc-shadow-inner: 0 1px 2px rgba(0,0,0,.24);
}
/* 统一焦点环：键盘可达性（此前页面无任何 focus 样式） */
.dc-scope :is(button,a,[role="button"],input,textarea,[tabindex]):focus-visible{
  outline: 2px solid var(--dc-brand);
  outline-offset: 2px;
  border-radius: var(--dc-r-inner);
}
/* —— 磨砂玻璃卡面（浮在 dc-backdrop 氛围柔光之上）——
   ⚠️ 材质的四件套**不在这里声明**，已收口到 components/device/material-css.ts：
     .dc-mat / .dc-glass / .dc-imv 三个类读同一组 --mat-* 变量，
     档位（THIN / REGULAR / THICK / ULTRA_THICK）与自适应等级（--dc-mat-scale）都在那里，
     本页只需给元素挂档位类（不带档位类 = REGULAR 默认值，行为与改动前完全一致）。
     规范：developer.huawei.com/consumer/cn/doc/harmonyos-guides/ui-design-hds-component-material */
.dc-glass-2{
  background: var(--dc-glass-inner);
}
/* —— 弹层材质（HDS ULTRA_THICK 档：弹出层组件「菜单、对话框」）——
   antd 的 Modal 会 portal 到 body，拿不到 .dc-scope 作用域里的 --dc-* 变量。
   做法：rootClassName 上只挂 'dc-mat--ultra'（它只声明 --mat-* 变量，不画任何东西 ——
   绝不能挂 .dc-mat，那会把整屏的 modal-root 也刷成一块半透明板），
   材质属性落在 antd v6 的视觉层 .ant-modal-container 上。

   ⚠️ 铁律：这里只做「皮肤」，绝不改 antd 的版式盒模型。两条血债（2026-09-25 修）：
     ① 别把 container 的 padding 清 0 —— antd v6 的**全部内边距都在 container 的
        contentPadding 上**（header/body/footer 的 padding token 默认全是 0），
        清掉 → 标题贴左边、输入框左右出血、页脚按钮糊在右下角还被 overflow 裁掉；
     ② 抬层只点 header/body/footer 三个具名子元素，**绝不写 '.ant-modal-container > \*'**
        —— .ant-modal-close 也是直接子元素，把它的 position:absolute 改成 relative 后，
        它会掉进文档流变成左上角第一个块：那个 ✕ 直接压在标题上，还把 header 往下顶 32px。 */
.dc-modal-ultra .ant-modal-container{
  position: relative;
  border-radius: var(--dc-r-modal, 32px) !important;
  background: transparent !important;
  box-shadow: none !important;   /* 阴影交给材质层 ::before，避免双层投影 */
  overflow: hidden;
}
.dc-modal-ultra .ant-modal-container::before{
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  border-radius: inherit;
  background-color: var(--mat-bg, rgba(255,255,255,.88));
  -webkit-backdrop-filter: blur(calc(var(--mat-blur, 64px) * var(--dc-mat-scale, 1))) saturate(var(--mat-sat, 2));
  backdrop-filter: blur(calc(var(--mat-blur, 64px) * var(--dc-mat-scale, 1))) saturate(var(--mat-sat, 2));
  border: 1px solid var(--mat-border, rgba(255,255,255,.86));
  box-shadow: var(--mat-shadow, 0 2px 6px rgba(0,0,0,.05), 0 18px 40px -18px rgba(0,0,0,.18));
}
/* 弹层内容压在材质层之上。
   ⚠️ 只抬具名子元素 —— 关闭按钮 .ant-modal-close 必须保持 antd 给的
   position:absolute（它自带 z-index 1010，天然在 header 之上），别去动它。 */
.dc-modal-ultra .ant-modal-header,
.dc-modal-ultra .ant-modal-body,
.dc-modal-ultra .ant-modal-footer{
  position: relative;
  z-index: 1;
}
/* —— 浮层材质：下拉面板 / 气泡确认 / 文字提示（HDS 弹层，归 .dc-ctrl--popup 档）——
   ⚠️ 这些组件同 Modal 一样 **portal 到 body**，拿不到 .dc-scope 作用域里的 --dc-* 变量。
   做法与 Modal 一致：把档位类挂在**弹出层自己的根节点**上（由 JSX 传
   classNames={{ popup: { root } }} / {{ root }}），档位类只声明 --mat-* 变量，
   材质属性在本段消费 —— 变量随元素走，不依赖 .dc-scope。
   --dc-mat-scale 在 <html> 上，portal 出去的节点照样继承 ✓。
   ⚠️ 别在这里写 .dc-scope 前缀：portal 出去的节点在 .dc-scope **之外**。 */
.dc-ctrl-popup{
  /* ⚠️ portal 到 body = **拿不到 .dc-scope 作用域里的 --dc-* token**。
     所以浮层用到的「页面语义色」必须在这里自带一份（实测：漏掉时 var() 无 fallback
     → 声明在 computed-value 阶段失效 → 选中项底色静默变透明，探针才查得出来）。
     变量随元素走，不依赖 .dc-scope ✓；--dc-mat-scale 在 <html> 上，照样继承 ✓。 */
  --dc-ctrl-sel-bg: rgba(0,148,86,.10);
  --dc-ctrl-sel-ink: #059669;
  --dc-ctrl-popup-hover: rgba(120,120,128,.12);
  background-color: var(--mat-bg, rgba(255,255,255,.60)) !important;
  -webkit-backdrop-filter: blur(calc(var(--mat-blur, 42px) * var(--dc-mat-scale, 1))) saturate(var(--mat-sat, 2.15)) brightness(var(--mat-bright, 1.04)) contrast(var(--mat-cont, 1.02)) !important;
  backdrop-filter: blur(calc(var(--mat-blur, 42px) * var(--dc-mat-scale, 1))) saturate(var(--mat-sat, 2.15)) brightness(var(--mat-bright, 1.04)) contrast(var(--mat-cont, 1.02)) !important;
  border: 1px solid var(--mat-border, rgba(255,255,255,.64)) !important;
  box-shadow: var(--mat-shadow, 0 2px 6px rgba(0,0,0,.05), 0 18px 40px -18px rgba(0,0,0,.20)),
              var(--mat-edge, inset 0 0 1px rgba(255,255,255,.72), inset 0 1px 0 rgba(255,255,255,.64)) !important;
}
.dark .dc-ctrl-popup{
  --dc-ctrl-sel-bg: rgba(52,211,153,.16);
  --dc-ctrl-sel-ink: #6EE7B7;
  --dc-ctrl-popup-hover: rgba(255,255,255,.09);
}
/* 浮层内的项列表保持透明，让面板本身的材质透上来 */
.dc-ctrl-popup .ant-select-item,
.dc-ctrl-popup .ant-popover-inner,
.dc-ctrl-popup .ant-popover-inner-content,
.dc-ctrl-popup .ant-tooltip-inner{
  background: transparent !important;
  box-shadow: none !important;
  border: 0 !important;
}
/* 选中项：品牌绿软底（比 antd 默认灰更贴页面的强调色） */
.dc-ctrl-popup .ant-select-item-option-selected:not(.ant-select-item-option-disabled){
  background-color: var(--dc-ctrl-sel-bg) !important;
  color: var(--dc-ctrl-sel-ink) !important;
  font-weight: 600;
}
.dc-ctrl-popup .ant-select-item-option-active:not(.ant-select-item-option-selected){
  background-color: var(--dc-ctrl-popup-hover) !important;
}
/* 页面氛围柔光：给磨砂玻璃提供「可被糊掉」的底。
   没有这层，半透明卡面就会糊成一片脏灰 —— 玻璃和柔光是绑定的。 */
.dc-backdrop::before{
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  /* ⚠️ 关键：**半透明只有「透出有形状的东西」时才看得见**。
     光斑铺得再满，若整页仍然是一块均匀底色，玻璃压上去也等于没有。
     所以这里必须有一条贯穿画面的斜向色带 —— 卡内那一段被模糊/折射，
     与卡外一对比，「这卡是透的」才成立。（纯 CSS 玻璃的全部秘密就在这条带子上）
  —— 2026-10 视觉整理：色带与光斑**整体降一档**（绿 .20→.12 / 蓝 .21→.13，径向各降约 35%）——
     原值让整页变成一层饱和的薄荷绿，卡片压上去以后仍然透出同样的绿，
     于是「卡面 / 画布」读成同一个平面 → 用户说的「视觉混乱」首先是**没有前景**。
     HDS 色彩规范：界面背景靠**灰阶**分层，色彩只作点缀（brand 只用于核心信息）；
     参考同类产品的做法，氛围光峰值应控制在 .15 以下、且不铺满整屏。
     降档后仍保留「贯穿画面的斜带」（玻璃可透的依据没丢），
     但画布退成**中性偏冷的灰**，卡片才有资格浮起来。 */
  background:
    linear-gradient(116deg, transparent 24%, rgba(0,148,86,.12) 39%, rgba(56,176,238,.13) 57%, transparent 74%),
    /* 顶部两盏光：圆心推出画布外（避免在可见区内烧成一大片青绿），
       但强度只比原来略降 —— 全压淡会让整页层次一起塌掉。 */
    radial-gradient(520px 380px at 92% -6%, rgba(33,150,216,.10), transparent 64%),
    radial-gradient(640px 440px at 72% -9%, rgba(0,148,86,.08), transparent 62%),
    radial-gradient(520px 420px at 100% 34%, rgba(0,148,86,.07), transparent 60%),
    radial-gradient(760px 560px at 6% 96%, rgba(56,176,238,.11), transparent 66%),
    radial-gradient(900px 700px at 24% 62%, rgba(0,148,86,.06), transparent 72%),
    radial-gradient(1100px 820px at 62% 88%, rgba(33,150,216,.07), transparent 74%);
}
.dark .dc-backdrop::before{
  background:
    linear-gradient(116deg, transparent 24%, rgba(52,199,123,.13) 39%, rgba(56,176,238,.14) 57%, transparent 74%),
    radial-gradient(520px 380px at 92% -6%, rgba(56,176,238,.11), transparent 64%),
    radial-gradient(640px 440px at 72% -9%, rgba(52,199,123,.08), transparent 62%),
    radial-gradient(520px 420px at 100% 34%, rgba(52,199,123,.07), transparent 60%),
    radial-gradient(760px 560px at 6% 96%, rgba(56,176,238,.11), transparent 66%),
    radial-gradient(900px 700px at 24% 62%, rgba(52,199,123,.06), transparent 72%),
    radial-gradient(1100px 820px at 62% 88%, rgba(56,176,238,.07), transparent 74%);
}
/* —— 右上角「晕染」背景美术 ——
   取天气插图（public/weather）里植被最密的一块，放大铺在右上角，
   重模糊 + 径向遮罩向左下淡出，与柔光层一起构成品牌底纹。 */
.dc-backdrop::after{
  content: "";
  position: absolute;
  top: -40px;
  right: -40px;
  width: 1000px;
  max-width: 78vw;
  height: 500px;
  max-height: 56vh;
  z-index: 0;
  pointer-events: none;
  background-image: var(--dc-weather-art, none);
  background-repeat: no-repeat;
  background-size: 320% auto;
  background-position: 0% 50%;
  filter: blur(20px) saturate(1.06);
  opacity: .62;
  -webkit-mask-image: radial-gradient(104% 106% at 100% 0%, #000 0%, rgba(0,0,0,.90) 36%, rgba(0,0,0,.42) 66%, rgba(0,0,0,0) 100%);
  mask-image: radial-gradient(104% 106% at 100% 0%, #000 0%, rgba(0,0,0,.90) 36%, rgba(0,0,0,.42) 66%, rgba(0,0,0,0) 100%);
}
.dark .dc-backdrop::after{
  opacity: .30;
  filter: blur(26px) saturate(.92) brightness(.86);
}
/* —— 沉浸光感 · 「光」放在哪一层 ——
   官方 materialFilter：「光穿过介质时折射与漫反射」「环境光沿边缘柔和流转」。
   要在材质里看见光，光源就必须在材质**背后**（卡外），而不是给每张卡各挂一条动画 ——
   这样「光在材质里流过」是**同一束光**，不是几十张卡各演一遍。
   本页由上面的 .dc-backdrop::before（斜向色带 + 6 盏径向柔光）承担：
   材质的 backdrop-filter 会把它们吸上来。
   ⚠️ 别再叠第二层「气氛光」，更别让它动。2026-09-25 试过叠一个 .dc-aurora
   （负 inset + scale 动画、24s 缓慢洄游），两个问题：
     ① 与 ::before 功能重复，视觉上并没有多出「光感」；
     ② 它是**会动的**光，用户刚因为「滑过去的光」抱怨过 → 不要再往这个页面加运动光效。
     ③ 附带坑：负 inset 会撑大文档高度，多出的部分露 body 白底 = 「底部白条」。
   实测（去掉 aurora 后）材质的沉浸光感指标依旧成立：
     边缘光 亮态 +13.4 / 暗态 +46.0；光感抬升 亮态 +13.7 / 暗态 +25.0（详见记忆 2026-09-25）。
   想加「光」请去改 .dc-backdrop::before 的静态渐变。 */
/* 内容层永远压在 ::before / ::after 氛围层之上 */
.dc-backdrop > *{
  position: relative;
  z-index: 1;
}
/* ---- 本页卡面档位：REGULAR(.34) → THICK(.46) ----
   为什么必须抬：材质默认档（.dc-mat 无档位）= rgba(255,255,255,.34)。
   本页画布本身带一层绿雾，34% 的白压上去以后**透出的仍是同一片绿**，
   于是卡片边界只剩 1px 描边，眼睛无法把「卡内 / 卡外」分组 —— 这是混乱的主因。
   HDS 材质规范里 THICK 就是「内容区卡片」档；.46 白 + 46px 模糊既保住通透感，
   又把卡面亮度抬到画布之上，前景关系才成立。
   ⚠️ 只在本页 scope 内抬高，不动 material-css 的全局默认值（其它页面已按其档位调过）。
   ⚠️ 特异性 (0,2,0) 会压过 .dc-mat--thin 的 (0,1,0)，所以 THIN 单独回填一条。 */
.dc-scope .dc-mat,
.dc-scope .dc-glass,
.dc-scope .dc-imv{
  --mat-bg: rgba(255,255,255,.46);
}
.dc-scope .dc-mat--thin{ --mat-bg: rgba(255,255,255,.42); }
.dc-scope .dc-mat--thick{ --mat-bg: rgba(255,255,255,.46); }
.dark .dc-scope .dc-mat,
.dark .dc-scope .dc-glass,
.dark .dc-scope .dc-imv{
  --mat-bg: rgba(255,255,255,.09);
}
.dark .dc-scope .dc-mat--thin{ --mat-bg: rgba(255,255,255,.10); }
/* ==================== 沉浸光感 · 控件皮肤（antd 组件 → 控件材质） ====================
   HDS 规范把「卡片内部的小控件」归到 THIN 档；这里给控件单独一档（.dc-ctrl--field 等，
   见 components/device/material-css.ts）。核心差别：**控件压在卡片上，卡片已经柔化过一次**，
   所以控件不能用卡片那套 alpha —— 旧值 --dc-glass-bg-strong = rgba(255,255,255,.88)
   给控件铺了 88% 白，背后的光被冲掉 88%，控件就变成「贴在卡片上的一块死白片」，
   也就是截图里那排「没有光感的白控件」。

   分工（单一来源）：
     material-css.ts → 材质**值**（--mat-* 变量 + .dc-ctrl 材质本体 + 按压光效）
     本段            → 只做「把变量接到 antd 的视觉层上」+ 压掉 antd 的默认灰底/默认蓝边
   ⚠️ 全部 !important：antd 样式是**未分层**注入的，与 Tailwind utilities 层互相纠缠
      （见铁律 15），控件皮肤必须稳定压过 antd 默认值。
   ⚠️ 绝不改尺寸：height / padding / border-radius 一律留给 antd，
      本段只碰 background / backdrop-filter / border-color / box-shadow。 */
/* —— ① 输入类控件（Input / InputNumber / Select）——
   ⚠️ antd v6.3 的 Select **已经删掉了 .ant-select-selector**：背景/描边/圆角现在直接画在
      .ant-select 根节点上（2026-09-25 实测 dump：根节点 bg=rgb(255,255,255)、
      border=1px rgba(0,0,0,.14)、radius=8px，子元素全是透明的）。
      这就是「按旧选择器写、Select 却还是死白」的根因 —— 必须点 .ant-select 本身。
      字号/内边距不动。 */
.dc-scope .ant-input,
.dc-scope .ant-input-affix-wrapper,
.dc-scope .ant-input-number,
.dc-scope .ant-select{
  background-color: var(--mat-bg, rgba(255,255,255,.52)) !important;
  -webkit-backdrop-filter: blur(calc(var(--mat-blur, 24px) * var(--dc-mat-scale, 1))) saturate(var(--mat-sat, 2.1)) brightness(var(--mat-bright, 1.04)) contrast(var(--mat-cont, 1.02)) !important;
  backdrop-filter: blur(calc(var(--mat-blur, 24px) * var(--dc-mat-scale, 1))) saturate(var(--mat-sat, 2.1)) brightness(var(--mat-bright, 1.04)) contrast(var(--mat-cont, 1.02)) !important;
  border-color: var(--mat-border, rgba(255,255,255,.62)) !important;
  box-shadow: var(--mat-shadow, 0 1px 2px rgba(0,0,0,.03), 0 6px 16px -12px rgba(0,0,0,.14)),
              var(--mat-edge, inset 0 0 1px rgba(255,255,255,.72), inset 0 1px 0 rgba(255,255,255,.64)) !important;
}
/* 包裹层内的**内层 input** 必须全透明：材质已经铺在包裹层上了，
   再铺一层就是两层 alpha 叠加 → 又变回死白（这正是「控件没光感」的复现路径之一）。 */
.dc-scope .ant-input-affix-wrapper .ant-input,
.dc-scope .ant-input-number .ant-input-number-input,
.dc-scope .ant-select .ant-select-content,
.dc-scope .ant-select .ant-select-input{
  background-color: transparent !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
  border: 0 !important;
  box-shadow: none !important;
}
/* 前后缀内嵌块（单位 / 图标区）：比控件本体再淡一档，作为「卡内嵌底」 */
.dc-scope .ant-input-number-group-addon,
.dc-scope .ant-input-group-addon{
  background-color: var(--dc-ctrl-inner) !important;
  border-color: var(--mat-border, var(--dc-line-strong)) !important;
  color: var(--dc-label-2) !important;
}
/* —— ② 次级按钮 ——
   只点「非 solid」变体：本页的主按钮全是品牌绿 CTA（.ant-btn-variant-solid），
   把 CTA 玻璃化会让「哪里能点」失去视觉权重 —— 品牌色是唯一的强调色。
   ⚠️ v6 的默认按钮实测类名 = ant-btn-default + ant-btn-color-default + ant-btn-variant-outlined，
      这里把 -default 也列上做兜底（变体命名再改也不会漏皮）。 */
.dc-scope .ant-btn.ant-btn-default,
.dc-scope .ant-btn.ant-btn-variant-outlined,
.dc-scope .ant-btn.ant-btn-variant-dashed,
.dc-scope .ant-btn.ant-btn-variant-text{
  background-color: var(--mat-bg, rgba(255,255,255,.52)) !important;
  -webkit-backdrop-filter: blur(calc(var(--mat-blur, 24px) * var(--dc-mat-scale, 1))) saturate(var(--mat-sat, 2.1)) brightness(var(--mat-bright, 1.04)) !important;
  backdrop-filter: blur(calc(var(--mat-blur, 24px) * var(--dc-mat-scale, 1))) saturate(var(--mat-sat, 2.1)) brightness(var(--mat-bright, 1.04)) !important;
  border-color: var(--mat-border, rgba(255,255,255,.62)) !important;
  box-shadow: var(--mat-shadow, 0 1px 2px rgba(0,0,0,.03), 0 6px 16px -12px rgba(0,0,0,.14)),
              var(--mat-edge, inset 0 0 1px rgba(255,255,255,.72), inset 0 1px 0 rgba(255,255,255,.64)) !important;
}
.dc-scope .ant-btn.ant-btn-variant-text{ border-color: transparent !important; }
/* —— ②b 品牌 CTA（solid）也走材质 ——
   HDS 对「有品牌色的控件」的处理不是把它玻璃化 —— 那会让"哪里能点"失去视觉权重
   （品牌色是本页唯一的强调色）。正确的做法是：填充保持≈实底，把光放到**边缘与外投影**上
   （档位定义见 material-css.ts 的 .dc-ctrl--brand：上缘 1px 受光 + 品牌色外投影 = 自己发光）。
   solid 变体自带实底、hover/active 状态与一长串排版规则，所以这条只做一件事：
   把 --mat-* 的**结果**提权到 !important。数值一律来自 material-css，不在这里重复写死
   （档位写两处必漂移）。 */
.dc-scope .ant-btn.dc-ctrl--brand,
.dc-scope .ant-btn.dc-ctrl--brand:hover,
.dc-scope .ant-btn.dc-ctrl--brand:active{
  background-color: var(--mat-bg) !important;
  -webkit-backdrop-filter: blur(calc(var(--mat-blur, 16px) * var(--dc-mat-scale, 1))) saturate(var(--mat-sat, 1.45)) brightness(var(--mat-bright, 1.06)) !important;
  backdrop-filter: blur(calc(var(--mat-blur, 16px) * var(--dc-mat-scale, 1))) saturate(var(--mat-sat, 1.45)) brightness(var(--mat-bright, 1.06)) !important;
  border-color: var(--mat-border) !important;
  box-shadow: var(--mat-shadow), var(--mat-edge) !important;
}
/* 按钮文字/图标压在按压点光源之上（::after 是 z-index:0 的定位子元素，
   非定位的行内内容会被它盖住；plus-lighter 只加光不遮字，但抬一层更稳） */
.dc-scope .ant-btn.dc-ctrl--press > *{
  position: relative;
  z-index: 1;
}
/* —— ③ 开关：轨道 = 「一小块介质」——
   关态用 --dc-ctrl--track 档（中性灰 + 低 alpha），开态保持品牌绿**实底**：
   开关的状态语义比材质重要，开/关必须一眼可辨。
   开态仍有光 —— 只是光不在填充里，而在**边缘与外投影**上（与 .dc-ctrl--brand 同源）：
   上缘 1px 白受光 + 内部极淡白漫反射 + 一圈品牌色外投影 = 「自己发着光」，
   这样「开」既一眼可辨、又不是一块贴上去的实色绿片。 */
/* ⚠️ 关态轨道必须**自己声明** --mat-bg（2026-10 修）：
   .ant-switch 的底色写的是 var(--mat-bg, …)，而 --mat-bg 是**可继承**的自定义属性 ——
   卡片根（.dc-mat）上定义的 --mat-bg 会顺着继承链落到卡内每一颗开关上，
   于是轨道拿到的是「卡片的白」而不是「轨道的灰」→ 暗色下 8 颗开关变成 8 个白胶囊。
   这里在开关自身声明变量，切断继承，轨道无论如何都比卡片暗一档（旋钮是纯白，必须压得住）。 */
.dc-scope .ant-switch{
  --mat-bg: rgba(24,24,27,.22);
  background-color: var(--mat-bg, rgba(120,120,128,.26)) !important;
  -webkit-backdrop-filter: blur(calc(var(--mat-blur, 12px) * var(--dc-mat-scale, 1))) saturate(var(--mat-sat, 1.6)) brightness(var(--mat-bright, 1.02)) !important;
  backdrop-filter: blur(calc(var(--mat-blur, 12px) * var(--dc-mat-scale, 1))) saturate(var(--mat-sat, 1.6)) brightness(var(--mat-bright, 1.02)) !important;
  border: 1px solid var(--mat-border, rgba(255,255,255,.44)) !important;
  box-shadow: var(--mat-edge, inset 0 0 1px rgba(255,255,255,.72), inset 0 1px 0 rgba(255,255,255,.64)) !important;
}
/* 暗色关态：轨道走中性灰（不许继承卡片的白），开态才换成品牌绿 */
.dark .dc-scope .ant-switch{
  --mat-bg: rgba(120,120,128,.42);
  --mat-border: rgba(255,255,255,.12);
}
.dc-scope .ant-switch.ant-switch-checked{
  background-color: rgba(0,140,80,.94) !important;
  border-color: rgba(255,255,255,.28) !important;
  -webkit-backdrop-filter: blur(calc(8px * var(--dc-mat-scale, 1))) saturate(1.4) brightness(1.06) !important;
  backdrop-filter: blur(calc(8px * var(--dc-mat-scale, 1))) saturate(1.4) brightness(1.06) !important;
  box-shadow:
    0 3px 10px -4px rgba(0,148,86,.55),
    0 1px 2px rgba(0,0,0,.08),
    inset 0 1px 0 rgba(255,255,255,.42),
    inset 0 0 12px -5px rgba(255,255,255,.38) !important;
}
.dark .dc-scope .ant-switch.ant-switch-checked{
  background-color: rgba(52,199,123,.90) !important;
  border-color: rgba(255,255,255,.30) !important;
  -webkit-backdrop-filter: blur(calc(8px * var(--dc-mat-scale, 1))) saturate(1.4) brightness(1.14) !important;
  backdrop-filter: blur(calc(8px * var(--dc-mat-scale, 1))) saturate(1.4) brightness(1.14) !important;
  box-shadow:
    0 3px 12px -4px rgba(52,199,123,.55),
    0 1px 2px rgba(0,0,0,.30),
    inset 0 1px 0 rgba(255,255,255,.50),
    inset 0 0 14px -5px rgba(255,255,255,.42) !important;
}
/* 旋钮（handle）保持纯白不透明 —— 它是「指针」不是介质，只补一点受光边。
   z-index 抬到点光源之上（.ant-switch-handle 本身已是 absolute，只能改 z-index，
   绝不能在它身上写 position:relative —— 那会让旋钮掉出绝对定位、开关直接坏掉）。 */
.dc-scope .ant-switch .ant-switch-handle{
  z-index: 2;
}
.dc-scope .ant-switch .ant-switch-handle::before{
  box-shadow: 0 1px 2px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.95) !important;
}
/* —— ④ 滑杆轨 ——
   只给底色 + 受光上缘，**不做 backdrop-filter**：6px 高的轨道模糊肉眼看不见，
   却要付一个独立合成层的代价 —— 不值得（小控件材质的分界线就在「看不看得出来」）。 */
.dc-scope .ant-slider .ant-slider-rail{
  background-color: var(--dc-ctrl-track) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.44) !important;
}
.dark .dc-scope .ant-slider .ant-slider-rail{
  box-shadow: inset 0 1px 0 rgba(255,255,255,.16) !important;
}
/* —— ⑤ 控件受光：聚焦 = 控件被「点亮」（官方「环境光沿边缘柔和流转」的交互态）——
   焦点环之外补一圈内缘光，让聚焦看起来是「材质亮了」而不是「描了条绿边」。
   ⚠️ v6 的聚焦类在根节点上（ant-select-focused），不再挂在 .ant-select-selector 上。 */
.dc-scope .ant-input:focus,
.dc-scope .ant-input-affix-wrapper-focused,
.dc-scope .ant-input-number-focused,
.dc-scope .ant-select-focused{
  box-shadow: 0 0 0 3px var(--dc-brand-ring),
              var(--mat-edge, inset 0 0 1px rgba(255,255,255,.72), inset 0 1px 0 rgba(255,255,255,.64)) !important;
}
/* —— 参数输入框（直驱参数预设）：数字右对齐 + 等宽数字（参数面板惯例） —— */
.dc-scope .dc-num-field .ant-input-number{
  width: 100%;
  height: 40px;
  border-radius: var(--dc-r-inner) !important;
  border-color: var(--dc-line) !important;
  transition: border-color .18s ease, box-shadow .18s ease;
}
.dc-scope .dc-num-field .ant-input-number:hover{ border-color: var(--dc-line-strong) !important; }
.dc-scope .dc-num-field .ant-input-number-focused{
  border-color: var(--dc-brand) !important;
  box-shadow: 0 0 0 3px var(--dc-brand-ring) !important;
}
.dc-scope .dc-num-field .ant-input-number-input{
  height: 38px !important;
  padding-inline: 12px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
/* —— 发送预设参数：禁用态 = 「同一块品牌材质被抽掉了光」——
   以前直接换成中性灰片（--dc-surface-3），结果禁用件和旁边的字段控件撞成同一种灰，
   材质语言断了。现在的做法保留材质身份、只抽掉光：低 alpha 中性底 + 无内缘光 + 无外投影
   （光感来自 brightness/saturate，禁用件不该看起来"被照亮"，所以连 backdrop-filter 一起撤）。
   ⚠️ 必须 !important：antd 的 .ant-btn-primary:disabled（0,2,0）比 .dc-ctrl（0,1,0）高。 */
.dc-scope .dc-preset-send:disabled,
.dc-scope .dc-preset-send:disabled:hover{
  background-color: var(--dc-ctrl-inner) !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
  color: var(--dc-label-3) !important;
  border-color: var(--dc-line) !important;
  box-shadow: none !important;
  transform: none !important;
  cursor: not-allowed !important;
}
/* ==================== 天气卡 · 卡内排版 token ====================
   材质已抽到公共组件 components/device/immersive-card.tsx（ImmersiveCard）：
   天气色以 tint 传入、由组件做极淡的环境染色；按压弹性与点光源也在组件里。
   这里只留排版需要的 token（次要文字色 / hairline / 温度条轨道）。 */
.dc-weather-card{
  --dc-wx-dim: #5A5A5F;                     /* 卡内次要文字（比全局三级深，保证玻璃上 ≥4.5:1） */
  --dc-wx-line: rgba(60,60,67,.10);         /* hairline 分隔线（替代内嵌容器） */
  --dc-wx-track: rgba(60,60,67,.10);        /* 温度区间轨道 */
}
.dark .dc-weather-card{
  --dc-wx-dim: rgba(235,235,245,.72);
  --dc-wx-line: rgba(255,255,255,.10);
  --dc-wx-track: rgba(255,255,255,.14);
}
/* 层级靠「留白 + hairline 分隔线」建立，不再用圆角矩形套圆角矩形的内嵌容器 */
.dc-wx-line{ height: 1px; background: var(--dc-wx-line); }
/* 卡内次要文字：比全局三级文字深一档，保证落在半透明玻璃上仍能过 4.5:1 */
.dc-wx-dim{ color: var(--dc-wx-dim); }
/* 温度区间条：低 → 高 的轨道 + 当前温度指示点。
   填充用「冷 → 暖」温标渐变（不取天气色：晴/雪等浅色天气会让条不可见）。 */
.dc-wx-range{ position: relative; height: 5px; border-radius: 999px; background: var(--dc-wx-track); }
.dc-wx-range-fill{
  position: absolute; top: 0; bottom: 0; left: 0; border-radius: 999px;
  /* 低饱和冷暖双色：保留「低→高」的语义但不与灰玻璃抢眼（三色渐变太花） */
  background-image: linear-gradient(90deg, #D4D4D8 0%, #A1A1AA 100%);
  opacity: .95;
}
.dc-wx-range-dot{
  position: absolute; top: 50%; width: 11px; height: 11px; margin: -5.5px 0 0 -5.5px;
  border-radius: 50%; background: rgba(255,255,255,.97); border: 1px solid rgba(0,0,0,.14);
  box-shadow: 0 1px 4px rgba(0,0,0,.34);
}
/* ==================== 「一层容器」原则（本页布局铁律） ====================
   HDS 设计理念 = One · Harmonious · Universe —— 万物归一、回归本源。
   落到界面上就是一句话：**一个视觉区域内，只允许存在一层「有底色 / 有边框的圆角容器」。**

   ✅ 容器内部一律用「留白 + hairline 分隔线 + 字号字重层级 + 彩色图标」组织信息。
   ✅ 两个例外不算容器（它们是「元素」不是「盒子」）：
        · 图标基座 —— icon 的圆角 / 圆形底（HarmonyOS 设置行、智能家居卡的通用做法，40 圆角 10）；
        · 交互控件 —— 按钮 / 输入框 / Switch / 分段控件（默认态透明，只有 hover 或选中才上底色）。
   ❌ 禁止：卡里放灰底块、灰底块里再放图标底；禁止给「在线 / 离线」这类文字状态加填充色块
      （点 + 文字已经足够，色块只会让每张卡多一块小圆角矩形，页面越读越碎）。
   反面教材（已修）：大棚环境参数曾是 卡(16) → 灰底格(12) → 图标底(8) 三层嵌套。
   正面样板：右侧天气卡（.dc-weather-card）—— 卡内零容器，全靠 hairline 立层级。 */
/* 无容器信息网格：卡内 2×2 指标格，用 hairline 十字分隔代替「格子套格子」。
   用法：<div class="dc-plain-grid grid grid-cols-2"> 4 个子项 </div>
   注意：列分隔线按 nth-child(even) 实现，只对 2 列栅格成立。 */
.dc-plain-grid > *{
  min-width: 0;
  padding-top: var(--dc-sp-3);
  padding-bottom: var(--dc-sp-3);
}
.dc-plain-grid > *:nth-child(even){
  padding-left: var(--dc-sp-3);
  border-left: 1px solid var(--dc-line);
}
.dc-plain-grid > *:nth-child(n+3){
  border-top: 1px solid var(--dc-line);
}
/* —— 分段控件滑槽（视图切换 / CAM 切换）——
   .dc-seg 是页面既有类；凹槽内阴影 + 材质内缘光 **都在 material-css.ts 的
   .dc-ctrl--track.dc-seg 里**（同一条 box-shadow，避免两条规则互相覆盖）。
   选中块（.dc-ctrl--thumb）同源，两块共用一套 --mat-* 变量。
   ⚠️ 别在这里再写 .dc-seg{ box-shadow } —— 那会按特异性/顺序把材质内缘光顶掉。 */
/* 预设位条：4 个预设位是同一组数据 → 一条 hairline 分隔的横排列表，不是 4 个灰底小卡。
   ⚠️ 分隔线必须手写 CSS：Tailwind 的 divide-x / divide-dc-line 在 dev 增量扫描里会被丢掉
   （新增工具类静默不生成，改动等于没做）。 */
.dc-preset-strip{
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-left: calc(-1 * var(--dc-sp-4));
  margin-right: calc(-1 * var(--dc-sp-4));
}
.dc-preset-cell{
  min-width: 0;
  padding-inline: var(--dc-sp-4);
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: background-color .18s ease;
}
.dc-preset-cell + .dc-preset-cell{ border-left: 1px solid var(--dc-line); }
.dc-preset-cell:hover{ background-color: var(--dc-surface-2); }
@media (max-width: 767.98px){
  .dc-preset-strip{
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: var(--dc-sp-4);
  }
  .dc-preset-cell:nth-child(odd){
    padding-left: 0;
    border-left: 0;
  }
  .dc-preset-cell:nth-child(even){ border-left: 1px solid var(--dc-line); }
  .dc-preset-cell:nth-child(n+3){
    padding-top: var(--dc-sp-4);
    border-top: 1px solid var(--dc-line);
  }
}
/* ==================== 连接状态提示条（设备离线 / 已恢复） ====================
   2026-09-27 三次修订，演进过程与每版被否的原因都留在这里，别走回头路：
     v1  antd <Alert type="warning" banner>
         → 底色被本页 colorWarning='#52525B' 染成**一整条中灰石板**；
           banner 通栏把圆角吃成直角、边缘顶死栅格；图标/关闭钮与全站图标库不同源。
     v2  自绘「中性膜 + 左侧 3px 琥珀竖脊」
         → 用户否：「左侧不要出现颜色条」。竖脊与 16px 圆角本就是互斥的语言
           （3px 直条贴圆角，四角处要么被裁成斜角、要么顶出卡外，读作"贴了张封条"）；
           HDS 官方六特性里也没有"色条"这一项。
     v3  **语义材质**（当前版）：警示色做进材质本体，见 material-css.ts 的 SEMANTIC_TINT_CSS。
         → 用户要的就是这个：「警示颜色可以以材质来做」。
   ── 本段只负责**关闭钮**的样式，卡片本体/材质**全在 material-css.ts** ──
     为什么不再有 .dc-notice 容器规则：容器现在直接挂材质类
     （dc-mat dc-mat--thin dc-mat--tint-warn dc-imv），
     再写一层 .dc-notice{background/border/box-shadow} 只会把材质同名属性盖掉
     ——那正是 v2 里"材质没生效"的成因（规则 21b）。
   ⚠️ 已删除 .dc-notice-badge（图标基座）：用户否决「圆角矩形套圆角矩形」。
     图标改为**裸放**在标题行内，色由 text-dc-warn-ink 承担，不再需要任何圆角底色块
      —— 这条同时回归了本页「一层容器」原则（禁止卡里放块、块里再放图标底）。 */
/* 关闭钮：幽灵控件（默认透明，hover 才上底）—— 与全站次要动作同一套语言。
   ⚠️ 它是圆形而非圆角矩形：整条已是一个圆角矩形，内部再出现第二个方形轮廓
      就会读成"套娃"；圆形是唯一不与外框构成同形嵌套的形状。
      （同理也可用裸图标无底，但关闭钮需要可点击的命中区与 hover 反馈，故保留圆形底。） */
.dc-notice-x{
  flex: none;
  width: 28px; height: 28px;
  border-radius: 999px;
  display: flex; align-items: center; justify-content: center;
  color: var(--dc-label-3);
  transition: background-color .18s ease, color .18s ease;
}
.dc-notice-x:hover{ background-color: var(--dc-surface-3); color: var(--dc-label); }
/* 统计条：同一张卡里的四个指标格（不是四张卡）—— 靠 hairline 切分。
   ≥1280（xl，四列）：只在列之间画竖线；
   <1280（两列）：偶数列补竖线，第二行补全宽行横线。 */
.dc-stat-cell{ min-width: 0; }
@media (min-width: 1280px){
  .dc-stat-cell + .dc-stat-cell{ border-left: 1px solid var(--dc-line); }
}
@media (max-width: 1279.98px){
  .dc-stat-cell:nth-child(even){ border-left: 1px solid var(--dc-line); }
  .dc-stat-cell:nth-child(n+3){
    margin-top: var(--dc-sp-4);
    padding-top: var(--dc-sp-4);
    border-top: 1px solid var(--dc-line);
  }
}
@media (prefers-reduced-motion: reduce){
  .dc-weather-card:active{ transform: none; }
}
/* —— 固定栅格区：内部纵向滚动（设备列表等）—— */
.dc-grid-scroll{
  /* 单张设备卡高度 = 176px（22 × 8vp，鸿蒙 8vp 网格整数倍） */
  --dc-card-h: 176px;
  /* 固定高度 = 恰好 2 行设备卡 + 1 个行间距 + 上下各 4px 内边距，
     卡片高度改了这里自动跟随，不会漂移 */
  --dc-grid-maxh: calc(var(--dc-card-h) * 2 + 16px + 8px);
  max-height: var(--dc-grid-maxh);
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  /* 未溢出时不占宽（不影响卡片基准栅格）；溢出时出现滚动条。
     尺寸/颜色交回全站统一段（原 8px + --dc-line-strong 私有定义已删，2026-10-11）
     ⚠️ 这里刻意**不写 scrollbar-width / scrollbar-color**：Chromium 121+ 也认这两个属性，
        一旦命中，同元素的 ::-webkit-scrollbar 定制（统一段的圆角/内缩）会被整体忽略。 */
  /* 上下各留 4px 内边距给卡片 hover 阴影，再用等量负外边距抵消，
     保证栅格首行位置不变、区块总高度不变 */
  padding-block: 4px;
  margin-block: -4px;
}
/* —— 滚动边缘渐隐 ——
   HDS 的 scrollEffectOpts / ScrollEffectType.GRADIENT_BLUR：内容滚到材质边缘时渐变淡出，
   而不是硬切一条直线。Web 端等价物 = mask 渐隐；只有「真的还有内容藏在后面」的那一侧才渐隐，
   滚到顶/底时自动消失。data-scroll-edge 由 components/device/use-scroll-fade.ts 写入。 */
.dc-grid-scroll[data-scroll-edge="start"]{
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 14px);
  mask-image: linear-gradient(to bottom, transparent 0, #000 14px);
}
.dc-grid-scroll[data-scroll-edge="end"]{
  -webkit-mask-image: linear-gradient(to top, transparent 0, #000 14px);
  mask-image: linear-gradient(to top, transparent 0, #000 14px);
}
.dc-grid-scroll[data-scroll-edge="both"]{
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%);
}
/* 设备卡：高度锁定，固定栅格「2 行」才恒等成立 */
.dc-dev-card{ min-height: var(--dc-card-h, 176px); }

/* ============================================================
   细节动效层（统一节奏：按 160ms / hover 240ms，ease-out）
   —— 只做「有因果」的动效：浮起=可点、按压=已响应、滑动=选中态迁移
   ============================================================ */
/* 卡片浮起：hover 微抬 + 阴影加深，按下回落（表示可点） */
.dc-lift{
  transition: transform .24s cubic-bezier(.22,.61,.36,1), box-shadow .24s ease,
              border-color .24s ease, background-color .18s ease;
}
.dc-lift:hover{ transform: translateY(-2px); box-shadow: var(--dc-shadow-hover); }
.dc-lift:active{ transform: translateY(-1px) scale(.996); }
/* 轻按反馈：小按钮 / 值选择 */
.dc-press{ transition: transform .16s cubic-bezier(.22,.61,.36,1); }
.dc-press:active{ transform: scale(.96); }
/* 容器 hover 时内部图标微动（呼吸感） */
.dc-iic{ transition: transform .24s cubic-bezier(.22,.61,.36,1); }
.dc-hoverable:hover .dc-iic{ transform: translateY(-1px) scale(1.06); }
/* 「查看详情」箭头前推 */
.dc-nudge{ transition: transform .2s cubic-bezier(.22,.61,.36,1); }
.dc-hoverable:hover .dc-nudge{ transform: translateX(2px); }
/* 分段控件：选中块由 framer-motion layoutId 平滑迁移，内容需压在块之上 */
.dc-seg > *{ position: relative; z-index: 1; }
/* 数值刷新：数字轻微放大回弹，提示「值变了」 */
@keyframes dcValuePop{
  0%{ opacity: .35; transform: translateY(2px) }
  100%{ opacity: 1; transform: none }
}
.dc-value-pop{ animation: dcValuePop .28s cubic-bezier(.22,.61,.36,1); }
/* 状态点脉冲（在线 / 已连接） */
@keyframes dcPulse{
  0%,100%{ opacity: 1; transform: scale(1) }
  50%{ opacity: .45; transform: scale(.82) }
}
.dc-pulse{ animation: dcPulse 2.2s ease-in-out infinite; }
/* 卡片入场：错峰上移落位。
   ⚠️ 用 backwards 而不是 both：both 会把末帧 transform 锁死，
   导致 .dc-lift:hover 的位移永远不生效（动画优先级高于普通声明）。 */
@keyframes dcRiseIn{
  from{ transform: translateY(10px) }
}
.dc-rise{ animation: dcRiseIn .38s cubic-bezier(.22,.61,.36,1) backwards; }
@media (prefers-reduced-motion: reduce){
  .dc-lift, .dc-press, .dc-iic, .dc-nudge{ transition: none !important; }
  .dc-lift:hover, .dc-lift:active, .dc-press:active{ transform: none !important; }
  .dc-hoverable:hover .dc-iic, .dc-hoverable:hover .dc-nudge{ transform: none !important; }
  .dc-value-pop, .dc-pulse, .dc-rise{ animation: none !important; }
}
`

// 滑台预设位置类型
type SlidePreset = {
  id: number
  name: string
  desc: string
  mm: number
}

// 滑台预设位持久化键（v2 起；v1 键仅用于一次性迁移）
const PRESET_STORAGE_KEY = "slide_presets_v2"
const LEGACY_PRESET_STORAGE_KEY = "slide_presets"

// 默认滑台预设位置
const DEFAULT_SLIDE_PRESETS: SlidePreset[] = [
  { id: 1, name: "预设位 1", desc: "左侧 (350mm)", mm: 350.0 },
  { id: 2, name: "预设位 2", desc: "中间 (700mm)", mm: 700.0 },
  { id: 3, name: "预设位 3", desc: "右侧 (1050mm)", mm: 1050.0 },
  { id: 4, name: "作业位", desc: "作业区域", mm: 125.0 },
]

// 动态载入监控视频组件
const LiveStreamPlayer = dynamic(
  () => import("@/components/live-stream-player").then((mod) => mod.LiveStreamPlayer),
  { ssr: false }
)

// ==================== 流媒体 URL 处理函数 ====================
const getStreamUrlFromInput = (rawUrl: string) => {
  const url = rawUrl.trim()
  if (!url) return ""

  if (/player\.xstrive\.com\/video\/live/i.test(url)) {
    const safeDecode = (value: string) => {
      try {
        return decodeURIComponent(value)
      } catch {
        return value
      }
    }

    const extractVideoUrlLoosely = (playerUrl: string) => {
      const qIndex = playerUrl.indexOf("?")
      if (qIndex < 0) return ""
      const query = playerUrl.slice(qIndex + 1)
      const lower = query.toLowerCase()
      let start = lower.indexOf("videourl=")
      while (start !== -1 && start > 0 && query[start - 1] !== "&") {
        start = lower.indexOf("videourl=", start + 1)
      }
      if (start === -1) return ""
      const valueStart = start + "videourl=".length
      const after = query.slice(valueStart)
      const parts = after.split("&")
      const stopKeys = new Set(["islive", "ismute", "aspect", "lang", "autoplay", "from", "player", "t", "ts"])
      const videoParts: string[] = []
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]
        const eq = p.indexOf("=")
        const key = eq >= 0 ? p.slice(0, eq).toLowerCase() : ""
        if (i > 0 && key && stopKeys.has(key)) break
        videoParts.push(p)
      }
      return videoParts.join("&")
    }

    try {
      const u = new URL(url)
      const videoUrl = u.searchParams.get("videoUrl") ?? ""
      const loose = extractVideoUrlLoosely(url)
      const picked = loose.length > videoUrl.length ? loose : videoUrl
      if (!picked) return ""
      return safeDecode(picked)
    } catch {
      const loose = extractVideoUrlLoosely(url)
      if (!loose) return ""
      return safeDecode(loose)
    }
  }

  return url
}

const getPlayableUrl = (rawUrl: string) => {
  const url = getStreamUrlFromInput(rawUrl)
  if (!url) return ""

  if (url.startsWith("rtmp://") || url.startsWith("rtmps://")) {
    return `/api/stream-rtmp?url=${encodeURIComponent(url)}`
  }

  if (typeof window !== "undefined") {
    try {
      const u = new URL(url)
      if (u.protocol === "http:" || u.protocol === "https:") {
        return `/api/stream-proxy?url=${encodeURIComponent(url)}`
      }
    } catch {}
  }

  return url
}

// ==================== HSL/RGB 转换函数 (用于调色盘) ====================
const hslToRgb = (h: number, s: number, l: number) => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4))
  ];
};

// ==================== HSL Canvas 调色盘微组件 ====================
interface ColorPickerProps {
  r: number
  g: number
  b: number
  onChange: (r: number, g: number, b: number) => void
}

function ColorPickerCanvas({ r, g, b, onChange }: ColorPickerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [cursorPos, setCursorPos] = useState({ x: 120, y: 80 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // 绘制横向彩虹色相渐变
    const rainbowGrad = ctx.createLinearGradient(0, 0, width, 0)
    rainbowGrad.addColorStop(0, '#ff0000')
    rainbowGrad.addColorStop(0.17, '#ffff00')
    rainbowGrad.addColorStop(0.33, '#00ff00')
    rainbowGrad.addColorStop(0.5, '#00ffff')
    rainbowGrad.addColorStop(0.67, '#0000ff')
    rainbowGrad.addColorStop(0.83, '#ff00ff')
    rainbowGrad.addColorStop(1, '#ff0000')
    ctx.fillStyle = rainbowGrad
    ctx.fillRect(0, 0, width, height)

    // 叠加垂直饱和度与明度混合
    const vtGrad = ctx.createLinearGradient(0, 0, 0, height)
    vtGrad.addColorStop(0, 'rgba(255,255,255,1)')
    vtGrad.addColorStop(0.5, 'rgba(255,255,255,0)')
    vtGrad.addColorStop(0.5, 'rgba(0,0,0,0)')
    vtGrad.addColorStop(1, 'rgba(0,0,0,1)')
    ctx.fillStyle = vtGrad
    ctx.fillRect(0, 0, width, height)
  }, [])

  const handlePickColor = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
    
    const canvasX = (x / rect.width) * canvas.width
    const canvasY = (y / rect.height) * canvas.height
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    try {
      const imgData = ctx.getImageData(canvasX, canvasY, 1, 1).data
      onChange(imgData[0], imgData[1], imgData[2])
      setCursorPos({ x, y })
    } catch (err) {
      console.error(err)
    }
  }

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsMouseDown(true)
    handlePickColor(e)
  }

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isMouseDown) {
      handlePickColor(e)
    }
  }

  useEffect(() => {
    const handleMouseUp = () => setIsMouseDown(false)
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [isMouseDown])

  return (
    <div className="relative w-full h-[180px] rounded-dc-card overflow-hidden shadow-dc-inner border border-dc-line">
      <canvas
        ref={canvasRef}
        width={400}
        height={220}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        className="w-full h-full cursor-crosshair"
      />
      {/* 游标选择器 */}
      <div
        className="absolute size-4 rounded-full border-2 border-white bg-transparent pointer-events-none shadow-[0_0_8px_rgba(0,0,0,0.5)] -translate-x-2 -translate-y-2"
        style={{ left: cursorPos.x, top: cursorPos.y }}
      />
    </div>
  )
}

// ==================== 天气文案 → 背景插图 ====================
// 天气文案 → 背景插图（public/weather 下的美术资源，按天气四态切换）
function weatherBgFromText(text: string) {
  if (/雪|snow/i.test(text)) return "/weather/XIAXUE.png"
  if (/雨|drizzle|shower|雷|thunder/i.test(text)) return "/weather/XIAYU.png"
  if (/晴|clear|sun/i.test(text)) return "/weather/QINGTIAN.png"
  // 云 / 阴 / 雾 / 霾 / 未知 → 阴天
  return "/weather/YINTIAN.png"
}

// 设备卡片描述文案（注册表无 description 字段，按 type 给稳定语义说明）
const DEVICE_DESC_BY_TYPE: Record<string, string> = {
  relay: "继电器控制 · 远程开关",
  camera: "视频监控 · 实时画面",
  stepper: "步进滑台 · 精确定位",
  sensor: "环境感知 · 实时读数",
}

export default function DeviceControlClient() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const { token } = antdTheme.useToken()

  // 侧边子导航激活项: 'overview' (设备总览) | 'control' (设备控制)
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'control'>('overview')

  // Sidebar 收起/展开状态
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // 历史记录展开状态
  const [showHistory, setShowHistory] = useState(false)

  // 设备分组展开状态
  const [showDeviceGroups, setShowDeviceGroups] = useState(false)

  // 告警记录展开状态
  const [showAlerts, setShowAlerts] = useState(false)

  // 通知设置展开状态
  const [showNotifications, setShowNotifications] = useState(false)

  // 视图切换状态: 'card' | 'list'
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')

  // 沉浸光感材质等级（HDS MaterialLevel）：按设备算力自适应，写到 <html data-mat-level>
  useAdaptiveMaterialLevel()

  // 设备列表滚动容器：给「还有内容藏着」的那一侧加渐隐
  // （HDS scrollEffectType = ScrollType.GRADIENT_BLUR 的 Web 等价）
  const gridScrollRef = useRef<HTMLDivElement | null>(null)
  useScrollEdge(gridScrollRef, viewMode)

  // 设备管理弹窗（设备注册表增删改；改动经 DeviceProvider 全局同步，含 AI 助手）
  const [deviceManagerOpen, setDeviceManagerOpen] = useState(false)

  // RGB LED 状态
  const [r, setR] = useState(0)
  const [g, setG] = useState(0)
  const [b, setB] = useState(0)
  const [w, setW] = useState(80)

  // 步进电机参数
  const [stepPulses, setStepPulses] = useState(1600)
  const [presetPulses, setPresetPulses] = useState(112000)
  const [presetSpeed, setPresetSpeed] = useState(10000)

  // 滑台预设位置（支持动态增删，localStorage 持久化）
  // v2：参考稿预设值更新为 350/700/1050/125，旧键走一次性迁移（旧「默认稿」视为未自定义）
  const [presets, setPresets] = useState<SlidePreset[]>(() => {
    try {
      const saved = localStorage.getItem(PRESET_STORAGE_KEY)
      if (saved) return JSON.parse(saved) as SlidePreset[]
      const legacy = localStorage.getItem(LEGACY_PRESET_STORAGE_KEY)
      if (legacy) {
        const parsed = JSON.parse(legacy) as SlidePreset[]
        const isLegacyDefault =
          Array.isArray(parsed) && parsed.length === 4 &&
          parsed[0]?.mm === 2.5 && parsed[1]?.mm === 350 && parsed[2]?.mm === 700
        if (!isLegacyDefault) {
          localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(parsed))
          return parsed
        }
      }
      return DEFAULT_SLIDE_PRESETS
    } catch {
      return DEFAULT_SLIDE_PRESETS
    }
  })
  const [presetModalOpen, setPresetModalOpen] = useState(false)
  const [newPresetName, setNewPresetName] = useState("")
  const [newPresetMm, setNewPresetMm] = useState(0)

  useEffect(() => {
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets))
    } catch {
      // 忽略存储失败
    }
  }, [presets])

  // 日志状态
  const [logs, setLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // 摄像头加载状态
  const [loadingCameras, setLoadingCameras] = useState(false)

  // 全屏模式状态
  const [isFullscreen, setIsFullscreen] = useState(false)
  const videoContainerRef = useRef<HTMLDivElement>(null)

  // 用户认证状态
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  // LED 发送防抖与状态指示
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced')
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 老年友好模式
  const { isElderFriendlyMode } = useElderFriendly()

  // 摄像头列表与选择
  const [cameras, setCameras] = useState([
    { id: 1, name: "温室监控摄像头 A", on: true, url: "" },
    { id: 2, name: "温室监控摄像头 B", on: true, url: "" },
  ])
  const [selectedCameraId, setSelectedCameraId] = useState<number>(1)

  // ==================== 总览页重构新增状态 ====================
  // 设备列表：搜索 + 分组过滤
  const [searchQuery, setSearchQuery] = useState("")
  const [groupFilter, setGroupFilter] = useState<string>("all")
  // 补光灯颜色控制面板折叠
  const [ledPanelOpen, setLedPanelOpen] = useState(true)
  // 云台控制卡：精确控制开关（开 = 显示单次运动距离滑杆）
  const [preciseMode, setPreciseMode] = useState(true)
  // 预设色板（补光灯快捷色）
  const PRESET_LED_COLORS: Array<{ name: string; r: number; g: number; b: number }> = [
    { name: "红", r: 255, g: 40, b: 40 },
    { name: "青", r: 0, g: 201, b: 167 },
    { name: "蓝", r: 33, g: 90, b: 216 },
    { name: "黄", r: 250, g: 204, b: 21 },
    { name: "粉", r: 236, g: 72, b: 153 },
    { name: "亮青", r: 34, g: 211, b: 238 },
  ]
  const presetColorInputRef = useRef<HTMLInputElement>(null)

  // 实时天气（/api/weather；定位失败回退示例值，卡片版式不变）
  const { weatherData } = useWeather()

  // 连接实时数据 + 设备注册表
  const { deviceData, connectionStatus, devices } = useDeviceData()

  /* 逻辑断连提示条的「已关闭」记忆。
     ── 为什么是逻辑断连而不是物理断连 ──
       物理断连 = 真的掉线，提示必须留着；只有**用户主动关掉**才该收起来。
       所以这个 state 记的是「本次断连事件已被关闭」，一旦重连（connected === true）就复位 ——
       下次再掉线时提示会重新出现，不会被上一次的关闭动作永久吞掉。
       （原 antd <Alert closable> 的内部开关就是这个语义，换成自绘后必须自己接上，
        否则「关掉了、又掉线、却再也不提示」——这是自绘替换原生组件最容易漏的一处。） */
  const [connectionNoticeDismissed, setConnectionNoticeDismissed] = useState(false)
  useEffect(() => {
    if (connectionStatus.connected) setConnectionNoticeDismissed(false)
  }, [connectionStatus.connected])

  // 设备控制 hook
  const { status: controlStatus, toggleRelay, toggleRelayByDeviceId, setLEDs, controlStepper, resetStepperPosition, sendStepperPreset } = useDeviceControl()

  // 从设备注册表动态获取继电器设备（type=relay）
  const relayDevices = useMemo(() => devices.filter(d => d.type === 'relay'), [devices])

  const selectedCamera = useMemo(() => {
    return cameras.find(c => c.id === selectedCameraId) || cameras[0]
  }, [cameras, selectedCameraId])

  const cameraPlayerSources = useMemo(() => {
    if (!selectedCamera?.url) return []
    const src = getPlayableUrl(selectedCamera.url)
    if (!src) return []
    return [{ src }]
  }, [selectedCamera?.url])

  // ==================== 数据获取与登录校验 ====================

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me")
        const data = await response.json()

        if (data.authenticated && data.user) {
          setCurrentUser(data.user)
        } else {
          router.push("/login")
        }
      } catch (error) {
        console.error("获取用户信息失败:", error)
        router.push("/login")
      } finally {
        setIsLoadingUser(false)
      }
    }

    fetchCurrentUser()
  }, [router])

  // 获取监控视频流 URL
  const fetchCameras = useCallback(async () => {
    setLoadingCameras(true)
    try {
      const res = await fetch('/api/greenhouse/cameras')
      if (res.ok) {
        const data = await res.json()
        setCameras(prev => prev.map(cam => {
          if (cam.id === 1) return { ...cam, url: data.cameraAUrl || "" }
          if (cam.id === 2) return { ...cam, url: data.cameraBUrl || "" }
          return cam
        }))
      } else {
        toast.error('获取摄像头配置失败')
      }
    } catch (error) {
      console.error("获取监控视频流失败:", error)
      toast.error('获取摄像头配置失败')
    } finally {
      setLoadingCameras(false)
    }
  }, [])

  useEffect(() => {
    fetchCameras()

    // 定时刷新摄像头配置（每30秒）
    const interval = setInterval(fetchCameras, 30000)
    return () => clearInterval(interval)
  }, [fetchCameras])

  // 获取操作日志
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true)
    try {
      const res = await fetch("/api/device-logs?limit=50")
      const data = await res.json()
      if (data.success) {
        setLogs(data.logs)
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error)
      toast.error('获取操作日志失败')
    } finally {
      setLoadingLogs(false)
    }
  }, [])

  // 创建操作日志
  const createLog = useCallback(async (deviceName: string, action: string, details?: string) => {
    if (!currentUser) return
    try {
      await fetch("/api/device-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_name: deviceName,
          action,
          operator: currentUser.username || currentUser.email,
          details
        })
      })
      fetchLogs()
    } catch (error) {
      console.error("Failed to create log:", error)
    }
  }, [currentUser, fetchLogs])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // 初始化 LED 值
  useEffect(() => {
    if (deviceData && r === 0 && g === 0 && b === 0) {
      setB(deviceData.led1 || 0)
      setR(deviceData.led2 || 0)
      setG(deviceData.led3 || 0)
      setW(deviceData.led4 || 0)
    }
  }, [deviceData, r, g, b])

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // ==================== LED 防抖自动发送逻辑 ====================

  const triggerLEDUpdate = useCallback((newB: number, newR: number, newG: number, newW: number) => {
    // 检查连接状态
    if (!connectionStatus.connected) {
      setSyncStatus('error')
      return
    }

    setSyncStatus('syncing')
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const success = await setLEDs(newB, newR, newG, newW)
        if (success) {
          setSyncStatus('synced')
          createLog("RGB 补光灯", "调色更新", `R:${newR} G:${newG} B:${newB} W:${newW}`)
        } else {
          setSyncStatus('error')
          toast.error('LED 参数更新失败')
        }
      } catch (err) {
        setSyncStatus('error')
        console.error('LED 更新失败:', err)
        toast.error(`LED 控制异常: ${err instanceof Error ? err.message : '未知错误'}`)
      }
    }, 350)
  }, [setLEDs, createLog, connectionStatus.connected])

  const handleRChange = (val: number) => {
    setR(val)
    triggerLEDUpdate(b, val, g, w)
  }

  const handleGChange = (val: number) => {
    setG(val)
    triggerLEDUpdate(b, r, val, w)
  }

  const handleBChange = (val: number) => {
    setB(val)
    triggerLEDUpdate(val, r, g, w)
  }

  const handleWChange = (val: number) => {
    setW(val)
    triggerLEDUpdate(b, r, g, val)
  }

  const handleCanvasColorChange = (newR: number, newG: number, newB: number) => {
    setR(newR)
    setG(newG)
    setB(newB)
    triggerLEDUpdate(newB, newR, newG, w)
  }

  // ==================== 操作逻辑处理 ====================

  const handleRelayToggle = async (relayNum: number) => {
    if (!deviceData) {
      toast.warning('等待设备数据连接...')
      return
    }

    // 检查连接状态
    if (!connectionStatus.connected) {
      toast.error('设备未连接，无法执行操作')
      return
    }

    const currentState = deviceData[`relay${relayNum}` as keyof typeof deviceData] as number || 0
    const newState = currentState === 1 ? 0 : 1
    const deviceConfig = DEVICES_CONFIG_LOCAL.find(d => d.key === relayNum)!
    const deviceName = deviceConfig.title

    const executeToggle = async () => {
      try {
        const success = await toggleRelay(relayNum, currentState)
        if (success) {
          createLog(deviceName, newState === 1 ? "开启" : "关闭")
          toast.success(`${deviceName} 已${newState === 1 ? '开启' : '关闭'}`)
        } else {
          toast.error(`${deviceName} 操作失败，请重试`)
        }
      } catch (error) {
        console.error('继电器操作失败:', error)
        toast.error(`${deviceName} 操作异常: ${error instanceof Error ? error.message : '未知错误'}`)
      }
    }

    if (deviceConfig.isCritical) {
      Modal.confirm({
        title: newState === 1 ? '安全提示：确认开启水泵？' : '安全提示：确认关闭水泵？',
        content: (
          <div className="space-y-2 mt-2">
            <p className="text-sm">您确定要操作关键设备 <strong>{deviceName}</strong> 吗？</p>
            <Alert
              type={newState === 1 ? "success" : "warning"}
              showIcon
              title={newState === 1 ? "自动灌溉设备启动将开闸注水，请核查管路接口。" : "停机将立即终止大棚注水。"}
              className="text-xs"
            />
          </div>
        ),
        okText: newState === 1 ? '确认启动' : '确认停机',
        okType: newState === 1 ? 'primary' : 'danger',
        cancelText: '取消',
        centered: true,
        onOk: executeToggle,
      })
    } else {
      await executeToggle()
    }
  }

  // 通过设备注册表 ID 控制继电器（动态设备）
  const handleRelayToggleByDevice = async (deviceId: number) => {
    if (!deviceData) {
      toast.warning('等待设备数据连接...')
      return
    }
    if (!connectionStatus.connected) {
      toast.error('设备未连接，无法执行操作')
      return
    }

    const dev = relayDevices.find(d => d.id === deviceId)
    if (!dev) return

    // 优先用 config.relay_num 关联旧版 relayN 状态字段；没有则按 device_id 维度记录
    const relayNum = dev.config?.relay_num
    const currentState = relayNum
      ? ((deviceData[`relay${relayNum}` as keyof typeof deviceData] as number) || 0)
      : 0
    const newState = currentState === 1 ? 0 : 1
    const deviceName = dev.name

    const executeToggle = async () => {
      try {
        const success = await toggleRelayByDeviceId(deviceId, currentState)
        if (success) {
          createLog(deviceName, newState === 1 ? "开启" : "关闭")
          toast.success(`${deviceName} 已${newState === 1 ? '开启' : '关闭'}`)
        } else {
          toast.error(`${deviceName} 操作失败，请重试`)
        }
      } catch (error) {
        console.error('继电器操作失败:', error)
        toast.error(`${deviceName} 操作异常: ${error instanceof Error ? error.message : '未知错误'}`)
      }
    }

    if (dev.is_critical) {
      Modal.confirm({
        title: newState === 1 ? `安全提示：确认开启 ${deviceName}？` : `安全提示：确认关闭 ${deviceName}？`,
        content: (
          <div className="space-y-2 mt-2">
            <p className="text-sm">您确定要操作关键设备 <strong>{deviceName}</strong> 吗？</p>
            <Alert
              type={newState === 1 ? "success" : "warning"}
              showIcon
              title={newState === 1 ? `${deviceName} 即将启动，请确认现场安全。` : `${deviceName} 即将停止运行。`}
              className="text-xs"
            />
          </div>
        ),
        okText: newState === 1 ? '确认启动' : '确认停机',
        okType: newState === 1 ? 'primary' : 'danger',
        cancelText: '取消',
        centered: true,
        onOk: executeToggle,
      })
    } else {
      await executeToggle()
    }
  }

  const handleStepperControl = async (orientation: number) => {
    // 检查连接状态
    if (!connectionStatus.connected) {
      toast.error('设备未连接，无法控制云台')
      return
    }

    const pulses = orientation === 0 ? undefined : stepPulses
    const orientationNames = ['停止', '左移', '右移']

    try {
      if (orientation === 0) {
        const success = await controlStepper(orientation, pulses)
        if (success) {
          createLog("摄像头云台", "停止", "步进电机紧急停止")
          toast.info('步进滑台已紧急刹车停止')
        } else {
          toast.error('停止命令发送失败')
        }
        return
      }

      const distance = (pulses! / 160).toFixed(1)
      const success = await controlStepper(orientation, pulses)
      if (success) {
        createLog("摄像头云台", orientationNames[orientation], `滑台移动 ${distance}mm`)
        toast.success(`滑台指令已发送: ${orientationNames[orientation]} ${distance}mm`)
      } else {
        toast.error('云台控制命令发送失败')
      }
    } catch (error) {
      console.error('步进电机控制失败:', error)
      toast.error(`云台控制异常: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const handleResetStepper = async () => {
    // 检查连接状态
    if (!connectionStatus.connected) {
      toast.error('设备未连接，无法执行复位操作')
      return
    }

    const currentPosition = ((deviceData?.stepper_position || 0) / 160).toFixed(1)

    Modal.confirm({
      title: '滑台归零校准',
      content: (
        <div className="space-y-2 mt-2">
          <p className="text-sm">这会将监控摄像头滑轨移回起始传感器零位，校准累积误差：</p>
          <Alert
            type="info"
            showIcon
            title={`当前软位置: ${currentPosition}mm → 硬件物理零点`}
            className="text-xs"
          />
        </div>
      ),
      okText: '确认校准',
      okType: 'danger',
      onOk: async () => {
        try {
          const success = await resetStepperPosition()
          if (success) {
            createLog("摄像头云台", "复位归零", `从 ${currentPosition}mm 归零`)
            toast.success('复位校准序列已发送')
          } else {
            toast.error('复位命令发送失败')
          }
        } catch (error) {
          console.error('步进电机复位失败:', error)
          toast.error(`复位操作异常: ${error instanceof Error ? error.message : '未知错误'}`)
        }
      },
    })
  }

  const handleStepperPreset = async () => {
    if (!connectionStatus.connected) {
      toast.error('未连接到设备服务器')
      return
    }

    try {
      const distance = (presetPulses / 160).toFixed(1)
      const success = await sendStepperPreset(presetPulses, presetSpeed)
      if (success) {
        toast.success(`参数下发成功，行程: ${distance}mm`)
        await createLog("摄像头云台", "高级预设", `脉冲: ${presetPulses}, 速度: ${presetSpeed}`)
      } else {
        toast.error('预设参数发送失败')
      }
    } catch (error) {
      console.error('步进电机预设失败:', error)
      toast.error(`预设参数异常: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 预设位卡片一击即达
  const handlePresetTrigger = async (presetName: string, targetMm: number) => {
    // 检查连接状态
    if (!connectionStatus.connected) {
      toast.error('设备未连接，无法执行定位操作')
      return
    }

    const pulses = Math.round(targetMm * 160)
    Modal.confirm({
      title: `云台定位：前往预设点 ${presetName}？`,
      content: <p className="text-sm">系统将发送驱动包移动至行程 <strong>{targetMm} mm</strong> 处。</p>,
      okText: '确认前往',
      onOk: async () => {
        try {
          const success = await sendStepperPreset(pulses, 10000)
          if (success) {
            toast.success(`正在前往预设位: ${presetName} (${targetMm}mm)`)
            createLog("摄像头云台", "预设定位", `前往 ${presetName} (${targetMm}mm)`)
          } else {
            toast.error('预设定位命令发送失败')
          }
        } catch (error) {
          console.error('预设定位失败:', error)
          toast.error(`定位操作异常: ${error instanceof Error ? error.message : '未知错误'}`)
        }
      }
    })
  }

  // 添加滑台预设位置
  const handleAddPreset = () => {
    const name = newPresetName.trim()
    if (!name) {
      toast.warning('请输入预设位名称')
      return
    }
    if (!(newPresetMm > 0)) {
      toast.warning('请输入有效的行程位置 (mm)')
      return
    }
    setPresets((prev) => [
      ...prev,
      { id: Date.now(), name, desc: `自定义 (${newPresetMm}mm)`, mm: newPresetMm },
    ])
    setNewPresetName("")
    setNewPresetMm(0)
    setPresetModalOpen(false)
    toast.success(`已添加预设位：${name} (${newPresetMm}mm)`)
  }

  // 删除滑台预设位置
  const handleDeletePreset = (id: number) => {
    setPresets((prev) => prev.filter((p) => p.id !== id))
    toast.success('已删除预设位')
  }

  // ==================== 全屏控制功能 ====================

  const toggleFullscreen = useCallback(async () => {
    if (!selectedCamera?.url) {
      toast.warning('摄像头未连接')
      return
    }

    try {
      if (!isFullscreen && videoContainerRef.current) {
        // 进入全屏
        await videoContainerRef.current.requestFullscreen()
        setIsFullscreen(true)
        toast.success('已进入全屏模式 (按 ESC 退出)')
      } else if (document.fullscreenElement) {
        // 退出全屏
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error('全屏操作失败:', error)
      toast.error('全屏功能不可用')
    }
  }, [isFullscreen, selectedCamera?.url])

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // ==================== 数据绑定与计算 ====================

  const systemStats = useMemo(() => {
    // 优先用设备注册表统计活动继电器数量；注册表为空时回退到旧版
    const activeList = relayDevices.length > 0
      ? relayDevices.filter(d => {
          const rn = d.config?.relay_num
          return rn ? ((deviceData?.[`relay${rn}` as keyof typeof deviceData] as number) || 0) === 1 : false
        })
      : DEVICES_CONFIG_LOCAL.filter(d =>
          (deviceData?.[`relay${d.key}` as keyof typeof deviceData] as number || 0) === 1
        )
    return {
      activeDevices: activeList.length,
      stepperPosition: ((deviceData?.stepper_position || 0) / 160).toFixed(1),
      ledBrightness: Math.round((w / 255) * 100),
      stepperStatus: deviceData?.stepper_direction === 1 ? '向左平移' :
                      deviceData?.stepper_direction === 2 ? '向右平移' : '滑台停驻',
    }
  }, [deviceData, w, relayDevices])

  // 大棚环境实时数据绑定
  const greenhouseMetrics = useMemo(() => {
    return {
      temp: deviceData?.temperature !== undefined ? deviceData.temperature.toFixed(1) : "0.0",
      humidity: deviceData?.humidity !== undefined ? deviceData.humidity.toFixed(1) : "0.0",
      co2: deviceData?.co2 !== undefined ? deviceData.co2 : 0,
      light: deviceData?.light !== undefined ? deviceData.light : 0,
    }
  }, [deviceData])

  // ==================== 总览页：设备列表 / 统计 / 天气 ====================

  // 设备列表数据源：注册表全量设备（relay/sensor/camera/stepper），注册表为空回退出厂继电器
  const deviceItems = useMemo(() => {
    if (devices.length > 0) {
      return devices.map((d) => {
        const relayNum = d.config?.relay_num as number | undefined
        const isOn = d.type === "relay" && relayNum
          ? ((deviceData?.[`relay${relayNum}` as keyof typeof deviceData] as number) || 0) === 1
          : false
        const camId = d.config?.camera_id ? String(d.config.camera_id).toUpperCase() : ""
        return {
          key: `dev-${d.id}`,
          id: d.id,
          name: d.name,
          type: d.type as string,
          category: d.category || "未分组",
          IconCmp: resolveDeviceIcon(d.icon),
          hex: resolveDeviceColor(d.color),
          relayNum,
          isOn,
          online: connectionStatus.connected && d.is_enabled,
          desc: DEVICE_DESC_BY_TYPE[d.type] || "智能设备",
          channel:
            d.type === "relay" ? `Relay ${relayNum ?? "-"}`
            : d.type === "camera" ? (camId ? `CAM-${camId}` : "CAM")
            : d.type === "stepper" ? "STEP"
            : "SENSOR",
        }
      })
    }
    // legacy 兜底（注册表为空）：出厂继电器通道
    return DEVICES_CONFIG_LOCAL.map((d) => ({
      key: `legacy-${d.key}`,
      id: d.key as number,
      name: d.title,
      type: "relay",
      category: "默认分组",
      IconCmp: IconCpu,
      hex: DC_BRAND,
      relayNum: d.key as number,
      isOn: ((deviceData?.[`relay${d.key}` as keyof typeof deviceData] as number) || 0) === 1,
      online: connectionStatus.connected,
      desc: DEVICE_DESC_BY_TYPE.relay,
      channel: `Relay ${d.key}`,
    }))
  }, [devices, deviceData, connectionStatus.connected])

  const groupOptions = useMemo(() => {
    const cats = Array.from(new Set(deviceItems.map((d) => d.category).filter(Boolean)))
    return [{ value: "all", label: "全部分组" }, ...cats.map((c) => ({ value: c, label: c }))]
  }, [deviceItems])

  const visibleDevices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return deviceItems.filter(
      (d) =>
        (groupFilter === "all" || d.category === groupFilter) &&
        (!q || d.name.toLowerCase().includes(q))
    )
  }, [deviceItems, groupFilter, searchQuery])

  // 统计卡：在线/离线/告警/今日操作（今日操作 = 今日控制日志数，对比昨日）
  const overviewStats = useMemo(() => {
    const total = deviceItems.length
    const online = deviceItems.filter((d) => d.online).length
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    const yesterStart = dayStart.getTime() - 86400000
    let todayCount = 0
    let yesterCount = 0
    for (const log of logs) {
      const t = log.created_at ? new Date(log.created_at).getTime() : 0
      if (t >= dayStart.getTime()) todayCount++
      else if (t >= yesterStart) yesterCount++
    }
    return {
      total,
      online,
      offline: total - online,
      alertCount: connectionStatus.connected ? 0 : 1,
      alertText: connectionStatus.connected ? "当前无告警" : "设备离线",
      todayCount,
      delta: todayCount - yesterCount,
    }
  }, [deviceItems, logs, connectionStatus.connected])

  // 天气卡数据（真实接口优先，回退示例值）
  const weather = useMemo(() => {
    const cur = weatherData?.current
    const today = weatherData?.forecast?.forecastday?.[0]?.day
    const now = new Date()
    return {
      location: weatherData?.location?.name || "当前地区",
      temp: cur ? Math.round(cur.temp_c) : 21,
      condText: cur?.condition?.text || "晴",
      hi: today ? Math.round(today.maxtemp_c) : 26,
      lo: today ? Math.round(today.mintemp_c) : 18,
      humidity: cur ? `${Math.round(cur.humidity)}%` : "82%",
      wind: cur ? `${Math.round(cur.wind_kph)} km/h` : "10 km/h",
      pressure: cur ? `${Math.round(cur.pressure_mb)} hPa` : "101 hPa",
      windDir: cur?.wind_dir || "南风",
      dateStr: now.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" }),
      timeStr: now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    }
  }, [weatherData])

  // 天气视觉：条件 → 图标 + 渐变板（与 dashboard 天气 widget 同源）
  const weatherVisual = useMemo(() => {
    const hour = new Date().getHours()
    const isNight = hour >= 19 || hour < 6
    const cfg = getWeatherConfig(weather.condText, isNight)
    const g = cfg.gradient && cfg.gradient.length >= 2 ? cfg.gradient : ["#71717a", "#a1a1aa"]
    // grad：沉浸光感卡片的「环境光源」取色（--wx-1/--wx-2）
    // accent：天气图标的唯一明确色彩点（材质本体保持中性，色彩只点亮图标）
    return { Icon: cfg.icon, grad: g, accent: cfg.color, gradient: g.join(", ") }
  }, [weather.condText])
  const WeatherIcon = weatherVisual.Icon

  // 温度区间条上「当前温度」的位置（最低 → 最高 的百分比）
  const tempRangePos = useMemo(() => {
    const span = weather.hi - weather.lo
    if (!Number.isFinite(span) || span <= 0) return 50
    return Math.min(100, Math.max(0, ((weather.temp - weather.lo) / span) * 100))
  }, [weather.hi, weather.lo, weather.temp])

  /* ==================== Copilot 辅助硬件接入 ====================
   * 硬件接入对普通用户是门槛最高的一步（协议、地址、字段路径、换算系数）。
   * 这里给侧栏提供四个**前端工具**：
   *   · device_access_catalog      —— 让模型先看清「支持哪些协议、每个协议要填什么、已经有哪些连接」
   *   · device_access_apply_draft  —— 从零给一份完整方案：灌进「接入向导」并打开（只预填，不落库）
   *   · device_form_read           —— 读「用户此刻正在填哪张表、第几步、填了什么、还缺什么」
   *   · device_form_patch          —— **增量**补字段（只改传进来的键，不覆盖用户已改的值）
   * 后两个是「不再乱填」的关键：老通道是整包覆盖，用户填一半会被重置；
   * 有了读取 + 增量，模型才知道该补哪几格。
   * 真正的创建仍然要用户在向导里点「完成接入」，AI 无法绕过。
   */
  const deviceAccessClientTools = useMemo<CopilotClientTools>(
    () => ({
      capabilities: ['device-access'],
      handlers: {
        device_access_catalog: async (args: { protocol?: string } | undefined) => {
          const only = args?.protocol ? String(args.protocol) : ''
          const [pRes, cRes, dRes] = await Promise.all([
            fetch('/api/device-platform/protocols', { cache: 'no-store' }),
            fetch('/api/device-platform/connections', { cache: 'no-store' }),
            fetch('/api/device-platform/devices', { cache: 'no-store' }),
          ])
          const [pData, cData, dData] = await Promise.all([
            pRes.json().catch(() => ({})),
            cRes.json().catch(() => ({})),
            dRes.json().catch(() => ({})),
          ])
          if (!pRes.ok) return { ok: false, error: '读取协议清单失败，请确认已登录且有权限' }

          const protocols = (pData.protocols || [])
            .filter((p: { id: string }) => !only || p.id === only)
            .map((p: {
              id: string
              name: string
              summary: string
              inbound: boolean
              outbound: boolean
              fields: Array<{
                key: string
                label: string
                type: string
                required?: boolean
                secret?: boolean
                advanced?: boolean
                default?: unknown
                placeholder?: string
                help?: string
                options?: Array<{ value: string; label: string }>
                showWhen?: { key: string; in: string[] }
              }>
            }) => ({
              id: p.id,
              name: p.name,
              summary: p.summary,
              canReport: p.inbound,
              canControl: p.outbound,
              fields: (p.fields || []).map((f) => ({
                key: f.key,
                label: f.label,
                type: f.type,
                required: !!f.required,
                secret: !!f.secret,
                advanced: !!f.advanced,
                default: f.default,
                placeholder: f.placeholder,
                help: f.help,
                options: f.options,
                showWhen: f.showWhen,
              })),
            }))

          const connections = (cData.connections || []).map((c: {
            id: number
            name: string
            protocol: string
            is_enabled: boolean
            last_ok_at: number | null
            deviceCount?: number
          }) => ({
            id: c.id,
            name: c.name,
            protocol: c.protocol,
            enabled: c.is_enabled,
            lastOkAt: c.last_ok_at,
            deviceCount: c.deviceCount ?? 0,
          }))

          const devices = (dData.devices || []).slice(0, 30).map((d: {
            id: number
            name: string
            protocol: string | null
            external_id: string | null
            thing_model?: { properties?: Array<{ key: string; name: string; unit?: string; access: string }> }
            last_seen_at?: string | null
          }) => ({
            id: d.id,
            name: d.name,
            protocol: d.protocol,
            externalId: d.external_id,
            lastSeenAt: d.last_seen_at ?? null,
            properties: (d.thing_model?.properties || []).map((p) => ({
              key: p.key,
              name: p.name,
              unit: p.unit,
              access: p.access,
            })),
          }))

          return { ok: true, protocols, connections, devices, deviceTotal: (dData.devices || []).length }
        },

        device_access_apply_draft: async (args: unknown) => {
          const { draft, issues } = parseAccessDraft(args)
          if (!draft) {
            // 把问题回给模型，让它自己修（而不是弹一个残缺的向导让用户收拾）
            return { ok: false, issues, hint: '请补齐这些项后重新调用本工具' }
          }
          /**
           * ⏱ 先留一个「光带扫过」的节拍再弹窗 —— 与 `automation_canvas_apply`
           * 的 460ms 完全同源：动效刚亮起就弹出表单，用户只会看到「突然出现一个窗口」，
           * 看不到「莓小智正在填」这个过程。460ms 对 Agent Loop 可忽略。
           */
          await new Promise((r) => setTimeout(r, 460))
          pushAccessDraft(draft)
          return {
            ok: true,
            deviceName: draft.device.name,
            propertyCount: draft.device.thing_model.properties.length,
            actionCount: draft.device.thing_model.actions.length,
            missing: draft.missing || [],
            note: '接入向导已打开并预填，等用户核对后点「完成接入」',
          }
        },

        device_form_read: async (args: { kind?: string } | undefined) => {
          const snapshot = readActiveForm(normalizeFormKind(args?.kind))
          if (!snapshot) {
            // 🚨 如实告诉模型「没有表单」，不要让它拿旧对话记忆编一份假快照
            return {
              ok: false,
              open: false,
              message: '用户当前没有打开任何设备表单。',
              hint:
                '第三方硬件 → 让他打开「设备管理 → 接入向导」；专属硬件 → 「设备管理 → 新增设备」。' +
                '表打开后再调用本工具就能看到他填到哪一步。',
            }
          }
          return { ok: true, open: true, ...snapshot }
        },

        device_form_patch: async (args: { kind?: string; fields?: unknown; note?: string } | undefined) => {
          const fields =
            args?.fields && typeof args.fields === 'object' && !Array.isArray(args.fields)
              ? (args.fields as Record<string, unknown>)
              : {}
          if (Object.keys(fields).length === 0) {
            return {
              ok: false,
              applied: [],
              ignored: [],
              issues: ['fields 是空的：请先 device_form_read 看清缺什么，再把要补的键传进来'],
              summary: '没有要填的字段，表单未改动',
            }
          }
          /** 与 apply_draft 的 460ms 同源：让「莓小智正在填」这个过程被看见 */
          await new Promise((r) => setTimeout(r, 320))
          const outcome = patchActiveForm(normalizeFormKind(args?.kind), fields)
          const after = readActiveForm(normalizeFormKind(args?.kind))
          return {
            ok: outcome.ok,
            applied: outcome.applied,
            ignored: outcome.ignored,
            issues: outcome.issues,
            summary: outcome.summary,
            // 填完立刻把最新状态回给模型，省掉它再调一次 read
            stillMissing: after?.missing ?? [],
            note: typeof args?.note === 'string' ? args.note.slice(0, 120) : undefined,
          }
        },
      },
      labels: {
        device_access_catalog: '莓小智正在查看可接入的协议与已有设备…',
        device_access_apply_draft: '莓小智正在填写接入向导…',
        device_form_read: '莓小智正在看你在填哪一步…',
        device_form_patch: '莓小智正在帮你填表…',
      },
      doneLabels: {
        device_access_catalog: (result: unknown) => {
          const r = result as { ok?: boolean; protocols?: unknown[] } | null
          if (r?.ok === false) return '读取接入能力失败'
          return `已读取接入能力 · ${r?.protocols?.length ?? 0} 种协议`
        },
        device_access_apply_draft: (result: unknown) => {
          const r = result as { ok?: boolean; deviceName?: string; issues?: string[] } | null
          if (r?.ok === false) return '接入草稿不完整，需要补充'
          return `接入向导已预填 · ${r?.deviceName ?? '新设备'}`
        },
        device_form_read: (result: unknown) => {
          const r = result as { ok?: boolean; step?: number | null; summary?: string; title?: string } | null
          if (r?.ok === false) return '你还没有打开设备表单'
          if (typeof r?.step === 'number') return `已看到你在第 ${r.step + 1} 步`
          return `已看到「${r?.title ?? '设备表单'}」`
        },
        device_form_patch: (result: unknown) => {
          const r = result as { ok?: boolean; applied?: string[]; note?: string } | null
          if (r?.ok === false) return '没能填进去，需要修正'
          if (r?.note) return r.note
          return `已补填 ${r?.applied?.length ?? 0} 项`
        },
      },
    }),
    []
  )

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,        token: {
          // 品牌绿：填充用 #059669，文字用 --dc-brand-ink（保证白底 4.5:1 达标）
          colorPrimary: DC_BRAND,
          colorSuccess: DC_BRAND,
          colorWarning: DC_WARN,
          colorError: DC_BAD,
          colorInfo: DC_BRAND,
          // 圆角：与页面 token 同源（鸿蒙 8 小容器 / 16 卡片 / 32 弹窗）
          borderRadius: 8,
          borderRadiusLG: 16,
          borderRadiusSM: 4,
          // 表面 / 描边 / 文字：与 .dc-scope 的 --dc-* 一一对应（实底，不用半透明），
          // 否则 antd 默认灰 #d4d4d8 会从 Input / Button 边框漏出来。
          colorBgContainer: isDark ? DC_SURFACE_DARK : DC_SURFACE_LIGHT,
          colorBgElevated: isDark ? DC_SURFACE_DARK : DC_SURFACE_LIGHT,
          colorBorder: isDark ? 'rgba(255,255,255,0.17)' : 'rgba(0,0,0,0.14)',
          colorBorderSecondary: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)',
          colorText: isDark ? 'rgba(255,255,255,0.90)' : 'rgba(0,0,0,0.90)',
          colorTextSecondary: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(0,0,0,0.60)',
          colorTextTertiary: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
          colorTextPlaceholder: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
        },
        components: {
          Button: {
            borderRadius: 20,          // 鸿蒙：按钮 20vp
            colorPrimary: DC_BRAND,
            primaryShadow: 'none',
          },
          Switch: {
            colorPrimary: DC_BRAND,
          },
          Slider: {
            colorPrimary: DC_BRAND,
            colorFillSecondary: isDark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)',
            railSize: 6,
          },
          Modal: {
            borderRadiusLG: 32,        // 鸿蒙：半模态 / 弹窗 32vp
          },
          InputNumber: {
            borderRadius: 8,
          },
          Segmented: {
            borderRadius: 12,
          },
        }
      }}
    >
      <style>{MATERIAL_CSS + DC_SCOPE_CSS}</style>
      <div
        className={cn(
          "dc-scope dc-backdrop min-h-screen w-full flex flex-col relative transition-colors duration-500",
          "bg-dc-canvas text-dc-label font-sans",
          isElderFriendlyMode && "elder-friendly-text"
        )}
        style={{ ["--dc-weather-art" as string]: `url(${weatherBgFromText(weather.condText)})` }}
      >
        {/* ====== 顶栏 (Topbar) ====== */}
        <PageHeader user={currentUser}>
          <PageHeaderRight
            connectionStatus={connectionStatus}
          />
        </PageHeader>

        {/* ====== 下半部双分栏布局 ====== */}
        <div className="flex flex-1 w-full min-h-[calc(100vh-var(--header-h,72px))] overflow-hidden">

          {/* ======================================================== */}
          {/*                 左侧二级导航栏 (一比一复刻)               */}
          {/* ======================================================== */}
          <div className={cn(
            "relative shrink-0 dc-mat dc-mat--thin dc-glass flex flex-col justify-between select-none m-4 rounded-dc-shell transition-all duration-300",
            sidebarCollapsed ? "w-16 p-2" : "w-60 p-3"
          )}>
            {/* 收起/展开手柄：贴在侧栏右边缘垂直居中（不再悬在卡片外顶部） */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "展开导航" : "收起导航"}
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 size-6 rounded-full dc-mat dc-mat--thin dc-glass border border-dc-line-strong flex items-center justify-center text-dc-label-2 hover:text-dc-label hover:bg-dc-surface-3 transition-colors"
            >
              {sidebarCollapsed ? <IconRight className="size-3.5" /> : <IconLeft className="size-3.5" />}
            </button>

            <div className="relative space-y-4">

              {/* ===== 分组 1：设备 ===== */}
              <nav className="space-y-0.5">
                {!sidebarCollapsed && (
                  <span className="block px-3 pb-2 pt-1 text-xs font-normal text-dc-label-3">设备</span>
                )}

                <button
                  onClick={() => setActiveSubTab('overview')}
                  className={cn(
                    "relative w-full flex items-center gap-2.5 h-10 px-3 rounded-dc-inner text-sm font-medium transition-all duration-200",
                    activeSubTab === 'overview'
                      ? "bg-dc-brand-soft text-dc-brand-ink font-semibold"
                      : "text-dc-label-2 hover:bg-dc-surface-3 hover:text-dc-label",
                    sidebarCollapsed && "justify-center px-2"
                  )}
                >
                  <IconSettingTwo className="size-5 shrink-0" />
                  <span className={cn(sidebarCollapsed && "hidden")}>设备总览</span>
                </button>

                <button
                  onClick={() => setActiveSubTab('control')}
                  className={cn(
                    "relative w-full flex items-center gap-2.5 h-10 px-3 rounded-dc-inner text-sm font-medium transition-all duration-200",
                    activeSubTab === 'control'
                      ? "bg-dc-brand-soft text-dc-brand-ink font-semibold"
                      : "text-dc-label-2 hover:bg-dc-surface-3 hover:text-dc-label",
                    sidebarCollapsed && "justify-center px-2"
                  )}
                >
                  <IconCamera className="size-5 shrink-0" />
                  <span className={cn(sidebarCollapsed && "hidden")}>摄像头云台</span>
                </button>

                {/* 设备管理（设备注册表增删改，桌面端常用入口） */}
                <button
                  onClick={() => setDeviceManagerOpen(true)}
                  className={cn(
                    "w-full flex items-center gap-2.5 h-10 px-3 rounded-dc-inner text-sm font-medium transition-all duration-200",
                    "text-dc-label-2 hover:bg-dc-surface-3 hover:text-dc-label",
                    sidebarCollapsed && "justify-center px-2"
                  )}
                >
                  <IconSetting className="size-5 shrink-0" />
                  <span className={cn(sidebarCollapsed && "hidden")}>设备管理</span>
                </button>

                {/* 设备分组按钮 - 可展开 */}
                {!sidebarCollapsed && (
                  <div>
                    <button
                      onClick={() => setShowDeviceGroups(!showDeviceGroups)}
                      className={cn(
                        "w-full flex items-center justify-between gap-2.5 h-10 px-3 rounded-dc-inner text-sm font-medium transition-all",
                        showDeviceGroups
                          ? "bg-dc-brand-soft text-dc-brand-ink"
: "text-dc-label-2 hover:bg-dc-surface-3 hover:text-dc-label"
                        )}
                    >
                      <div className="flex items-center gap-3">
                        <IconLayers className="size-5 shrink-0" />
                        <span>设备分组</span>
                      </div>
                      <IconDown className={cn("size-4 transition-transform", showDeviceGroups && "rotate-180")} />
                    </button>

                    {/* 设备分组展开内容 */}
                    <AnimatePresence>
                      {showDeviceGroups && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 ml-3 pl-3 space-y-2 border-l border-dc-line">
                            {(relayDevices.length > 0 ? relayDevices.map(d => ({
                              key: `dev-${d.id}`,
                              title: d.name,
                              relayNum: d.config?.relay_num as number | undefined,
                            })) : DEVICES_CONFIG_LOCAL.map(d => ({
                              key: `legacy-${d.key}`,
                              title: d.title,
                              relayNum: d.key as number | undefined,
                            }))).map((device) => {
                              const isOn = device.relayNum
                                ? ((deviceData?.[`relay${device.relayNum}` as keyof typeof deviceData] as number) || 0) === 1
                                : false
                              return (
                                <div
                                  key={device.key}
                                  className="flex items-center justify-between p-2 dc-mat dc-mat--thin dc-glass rounded-dc-inner"
                                >
                                  <span className="text-xs font-medium text-dc-label truncate flex-1 mr-1">{device.title}</span>
                                  <Badge
                                    status={isOn ? 'success' : 'default'}
                                    text={<span className="text-xs">{isOn ? '运行' : '停止'}</span>}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </nav>

              {/* ===== 分组 2：监控 ===== */}
              <nav className="space-y-0.5">
                {!sidebarCollapsed && (
                  <span className="block px-3 pb-2 pt-1 text-xs font-normal text-dc-label-3">监控</span>
                )}

                {/* 历史记录按钮 - 可展开 */}
                {!sidebarCollapsed && (
                  <div>
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className={cn(
                        "w-full flex items-center justify-between gap-2.5 h-10 px-3 rounded-dc-inner text-sm font-medium transition-all",
                        showHistory
                          ? "bg-dc-brand-soft text-dc-brand-ink"
: "text-dc-label-2 hover:bg-dc-surface-3 hover:text-dc-label"
                        )}
                    >
                      <div className="flex items-center gap-3">
                        <IconHistory className="size-5 shrink-0" />
                        <span>历史记录</span>
                      </div>
                      <IconDown className={cn("size-4 transition-transform", showHistory && "rotate-180")} />
                    </button>

                    {/* 历史记录展开内容 */}
                    <AnimatePresence>
                      {showHistory && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 ml-3 pl-3 space-y-3 border-l border-dc-line">
                            {/* 视图切换 */}
                            <div className="flex items-center gap-1 dc-mat dc-mat--thin dc-glass p-1 rounded-dc-inner">
                              <button
                                onClick={() => setViewMode('card')}
                                className={cn(
                                  "flex-1 px-2 py-1 rounded-dc-inner text-xs font-medium transition-all",
                                  viewMode === 'card'
                                    ? "bg-dc-brand text-white"
                                    : "text-dc-label-2 hover:text-dc-label"
                                )}
                              >
                                卡片
                              </button>
                              <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                  "flex-1 px-2 py-1 rounded-dc-inner text-xs font-medium transition-all",
                                  viewMode === 'list'
                                    ? "bg-dc-brand text-white"
                                    : "text-dc-label-2 hover:text-dc-label"
                                )}
                              >
                                列表
                              </button>
                            </div>

                            {/* 刷新按钮 */}
                            <button
                              onClick={fetchLogs}
                              disabled={loadingLogs}
                              className="w-full text-xs font-medium text-dc-brand-ink hover:underline flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                              <IconRefresh className={cn("size-3", loadingLogs && "animate-spin")} />
                              <span>刷新记录</span>
                            </button>

                            {/* 操作记录列表 */}
                            <ScrollArea className="h-[200px]">
                              {loadingLogs ? (
                                <div className="flex items-center justify-center h-full">
                                  <Spin size="small" />
                                </div>
                              ) : logs.length === 0 ? (
                                <Empty
                                  description="暂无记录"
                                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                                  className="py-2"
                                />
                              ) : (
                                <div className="space-y-1.5">
                                  {logs.slice(0, 10).map((log: any, index: number) => (
                                    <div
                                      key={log.id || index}
                                      className="p-2 dc-mat dc-mat--thin dc-glass rounded-dc-inner"
                                    >
                                      {viewMode === 'card' ? (
                                        <div className="space-y-1">
                                          <div className="flex justify-between items-start">
                                            <span className="text-xs font-medium text-dc-label truncate flex-1">{log.device_name}</span>
                                            <span className="text-xs text-dc-label-3 font-mono ml-1">
                                              {log.created_at ? new Date(log.created_at).toLocaleTimeString('zh-CN', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              }) : '--:--'}
                                            </span>
                                          </div>
                                          <Badge
                                            status={log.action?.includes('开启') || log.action?.includes('打开') ? 'success' : log.action?.includes('关闭') ? 'default' : 'processing'}
                                            text={<span className="text-xs font-medium">{log.action}</span>}
                                          />
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="text-xs font-medium text-dc-label truncate flex-1">{log.device_name}</span>
                                          <Badge
                                            status={log.action?.includes('开启') || log.action?.includes('打开') ? 'success' : log.action?.includes('关闭') ? 'default' : 'processing'}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </ScrollArea>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* 告警记录按钮 - 可展开 */}
                {!sidebarCollapsed && (
                  <div>
                    <button
                      onClick={() => setShowAlerts(!showAlerts)}
                      className={cn(
                        "w-full flex items-center justify-between gap-2.5 h-10 px-3 rounded-dc-inner text-sm font-medium transition-all",
                        showAlerts
                          ? "bg-dc-brand-soft text-dc-brand-ink"
: "text-dc-label-2 hover:bg-dc-surface-3 hover:text-dc-label"
                        )}
                    >
                      <div className="flex items-center gap-3">
                        <IconCaution className="size-5 shrink-0" />
                        <span>告警记录</span>
                      </div>
                      <IconDown className={cn("size-4 transition-transform", showAlerts && "rotate-180")} />
                    </button>

                    {/* 告警记录展开内容 */}
                    <AnimatePresence>
                      {showAlerts && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 ml-3 pl-3 border-l border-dc-line">
                            <div className="space-y-2">
                              <div className="p-2 dc-glass rounded-dc-inner">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-dc-label">系统运行正常</span>
                                  <Badge status="success" text={<span className="text-xs">正常</span>} />
                                </div>
                                <span className="text-xs text-dc-label-3 mt-1 block">无告警事件</span>
                              </div>
                              <div className="p-2 dc-glass rounded-dc-inner">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-dc-label">设备连接状态</span>
                                  <Badge status={connectionStatus.connected ? 'success' : 'warning'} text={<span className="text-xs">{connectionStatus.connected ? '已连接' : '离线'}</span>} />
                                </div>
                                <span className="text-xs text-dc-label-3 mt-1 block">{connectionStatus.connected ? '所有设备在线' : '请检查网络连接'}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* 通知设置按钮 - 可展开 */}
                {!sidebarCollapsed && (
                  <div>
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      className={cn(
                        "w-full flex items-center justify-between gap-2.5 h-10 px-3 rounded-dc-inner text-sm font-medium transition-all",
                        showNotifications
                          ? "bg-dc-brand-soft text-dc-brand-ink"
: "text-dc-label-2 hover:bg-dc-surface-3 hover:text-dc-label"
                        )}
                    >
                      <div className="flex items-center gap-3">
                        <IconInfo className="size-5 shrink-0" />
                        <span>通知设置</span>
                      </div>
                      <IconDown className={cn("size-4 transition-transform", showNotifications && "rotate-180")} />
                    </button>

                    {/* 通知设置展开内容 */}
                    <AnimatePresence>
                      {showNotifications && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 ml-3 pl-3 space-y-2 border-l border-dc-line">
                            <div className="flex items-center justify-between p-2 dc-mat dc-mat--thin dc-glass rounded-dc-inner">
                              <span className="text-xs font-medium text-dc-label">邮件通知</span>
                              <Switch size="small" defaultChecked className="dc-ctrl--track dc-ctrl--press" />
                            </div>
                            <div className="flex items-center justify-between p-2 dc-mat dc-mat--thin dc-glass rounded-dc-inner">
                              <span className="text-xs font-medium text-dc-label">短信通知</span>
                              <Switch size="small" className="dc-ctrl--track dc-ctrl--press" />
                            </div>
                            <div className="flex items-center justify-between p-2 dc-mat dc-mat--thin dc-glass rounded-dc-inner">
                              <span className="text-xs font-medium text-dc-label">推送通知</span>
                              <Switch size="small" defaultChecked className="dc-ctrl--track dc-ctrl--press" />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </nav>

            </div>

            {/* Bottom 推广区 + 帮助中心 */}
            {!sidebarCollapsed && (
              <div className="space-y-3 pt-4">
                <button className="w-full flex items-center gap-2.5 h-10 px-3 rounded-dc-inner border border-dc-line text-sm font-medium text-dc-label-2 hover:bg-dc-surface-3 hover:text-dc-label transition-colors">
                  <IconHelp className="size-5 shrink-0" />
                  <span>帮助中心</span>
                </button>

                {/* 品牌推广区：不再往侧栏卡里再塞一个圆角矩形（粉底卡 + 白圆按钮 = 卡里套卡套按钮）。
                    现在直接落在侧栏卡面上，靠一条 hairline 与上方分隔；莓果 IP 作为插图内联排布。 */}
                <div className="flex items-center gap-2 pt-3 mt-1 border-t border-dc-line">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-dc-label leading-snug">科技让</p>
                    <p className="text-base font-bold text-dc-label leading-snug">每一颗草莓更好</p>
                  </div>
                  <img
                    src="/copilot.png"
                    alt=""
                    aria-hidden
                    className="w-14 shrink-0 opacity-95 pointer-events-none select-none"
                  />
                  <button
                    className="size-7 shrink-0 rounded-full flex items-center justify-center text-dc-brand-ink hover:bg-dc-brand-soft transition-colors"
                    title="了解更多"
                  >
                    <IconRight className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/*                   右侧主工作面板 + 右看板                 */}
          {/* ======================================================== */}
          <div className="flex-1 overflow-y-auto">
            {/* 内容容器：鸿蒙基础栅格 —— 四边边距 24vp，主列与右栏间距 24vp，限宽 1400 居中 */}
            <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-6 py-6 xl:flex-row">
              
              {/* 中间主控制面板 */}
              <div className="flex-1 min-w-0">
                {/* 设备连接状态提示条（2026-09-27 重做，替换原 antd Alert）
                    ── 为什么不用 <Alert type="warning" banner> ──
                      本页 ConfigProvider 的 colorWarning = '#52525B'（中性警示档，不走琥珀），
                      banner 模式于是渲染成**一整条中灰石板** —— 与本页「玻璃 + 氛围柔光」的语言
                      完全脱节，且 banner 是通栏（圆角被吃成直角），边缘顶死栅格。
                    ── 现在这条是什么 ──
                      **语义材质条**：警示色做进材质本体（.dc-mat--thin + .dc-mat--tint-warn，
                      见 components/device/material-css.ts 的 SEMANTIC_TINT_CSS）。
                      不是"材质上叠一块琥珀"，而是**底色 / 受光边 / 外投影三件一起带色** ——
                      读起来是一块被警示光染透的介质，外投影泛暖光（像自己发着光）。
                    ── 🚨 为什么不用 <ImmersiveCard> ──
                      它的 children 会被包进 .dc-imv-content 这一层 wrapper，
                      于是写在本组件上的 "flex items-center" 落在**卡片根**上 ——
                      而卡片根的直接子元素只有「光晕 div」和「那层 wrapper」两个，
                      我的 图标/文字/关闭钮 全在 wrapper 里 → 行版式失效、整条竖排（实测 133px 高）。
                      本条的版式需要**卡片根自己就是那排 flex**，所以走 .dc-mat + .dc-imv 裸挂：
                      这两个类与 ImmersiveCard 内部用的是**同一套材质源**，材质零差别。
                      （可点性/按压点光源在这里也不需要 —— 整条不可点，只有右侧 ✕ 可点。）
                    ── 左侧为什么没有色条 ──
                      原设计有一条 3px 琥珀竖脊，实测与 16px 圆角互斥（四角处被裁成斜角 / 顶出卡外，
                      读起来像"贴了张封条"）；HDS 官方六特性里也没有"色条"这一项。
                      现在整条的语义色由**材质本体**承担（底色 + 边光 + 外投影），
                      不再需要一根独立色条 —— 这正是用户要的"用材质做警示色"。
                    ── 🚨 为什么没有图标基座（圆角小方块）──
                      用户否决：「不要给我圆角矩形套圆角矩形。」
                      整条已是 rounded-dc-shell(16px) 的圆角矩形，再给图标垫一个 10px 圆角小方块
                      = 卡里套卡 —— 这是本页「一层容器」原则明令禁止的那一类（见 DC_SCOPE_CSS 里
                      「❌ 禁止：卡里放灰底块、灰底块里再放图标底」）。
                      现在图标**裸放**（与统计条、天气卡、设备卡里的图标同一处理：裸图标 + 语义色），
                      直接落在材质上、与标题左对齐 —— 色由图标本身承担，不再需要任何底色块。
                    ── 版式 ──
                      左侧一列：图标与标题同排、说明缩进对齐标题；关闭钮贴右。整条高度约 63px。
                      🚨 挂材质处**不写 inline background / border / box-shadow**：
                         那三条会把材质同名的低 alpha 底整块盖掉（材质静默失效，CSS 不报错）。 */}
                {!connectionStatus.connected && !connectionNoticeDismissed && (
                  <div className="dc-mat dc-mat--thin dc-mat--tint-warn dc-imv dc-rise flex items-center gap-3 pl-5 pr-3 py-3.5 mb-6 rounded-dc-shell">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-semibold text-dc-label leading-snug">
                        <IconCaution className="size-4 shrink-0 text-dc-warn-ink" strokeWidth={2} />
                        <span>设备离线</span>
                      </p>
                      <p className="text-xs text-dc-label-3 mt-1 leading-relaxed">
                        当前未连接到设备服务器，部分控制功能可能不可用。请检查网络连接或设备状态。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConnectionNoticeDismissed(true)}
                      aria-label="关闭提示"
                      title="关闭提示"
                      className="dc-notice-x dc-ctrl--press"
                    >
                      <IconClose className="size-3.5" />
                    </button>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  
                  {/* ======================================================== */}
                  {/*               Tab 1: 设备总览视图                        */}
                  {/* ======================================================== */}
                  {activeSubTab === 'overview' && (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
                      className="space-y-6"
                    >
                      {/* ===== 页头（无卡片：标题直接落在画布上）===== */}
                      <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                          <h1 className="text-2xl leading-tight font-semibold text-dc-label">设备总览</h1>
                          <p className="text-sm text-dc-label-2 mt-2">实时监控和控制温室设备运行状态，保障作物生长环境稳定</p>
                        </div>
                        {/* 右侧只留视图切换 —— 2026-09-25 移除「设备管理」按钮：
                            左侧导航栏已有同名入口（同一个 setDeviceManagerOpen），
                            页头再放一颗 = 一个动作两个入口，且它把视图切换挤到最右、
                            让整排控件变成「两颗胶囊并排」的竞争关系（用户判定为冗余设计）。
                            HDS「一层容器」同源原则：一屏里能少一个容器就少一个。
                            设备注册表的其它入口仍保留（侧栏 / 设备卡 hover 的 ⋯ / 控制页页头）。 */}
                        {/* 视图切换：同心圆角分段控件（选中块用共享布局滑动过去）
                            滑槽 = --track 档（**中性凹槽**：光从上方来 → 上沿在阴影里、下沿受光）
                            选中块 = --thumb 档（**白玻璃凸起块**：必须比滑槽亮，否则读作"凹槽里挖坑"）
                            2026-09-25：滑槽去彩（原为品牌绿染槽）—— 品牌绿同时当"容器底色"
                            与"选中态颜色"会让强调色失效，且 4px 绿槽在白滑块外围描出一圈绿环。
                            现在整排是「中性玻璃（滑槽 / 滑块）」这一种语言，
                            品牌绿只落在**选中项的字与图标**上（text-dc-brand-ink，白底 4.83:1）。
                            曾试过把选中块改成品牌绿色光膜 → 实测底色比滑槽还暗、字色只有 3.03:1，
                            已回滚，详见 components/device/material-css.ts 里 .dc-ctrl--thumb 的注释。
                            ⚠️ 原先这里左边还有一颗「设备管理」玻璃胶囊，已移除（见上）；因此不再需要
                               外层 flex 包装 —— 整个页头右侧就是这一个控件，包装层是纯冗余结构。 */}
                        <div className="dc-seg dc-ctrl--track flex items-center gap-1 h-10 p-1 rounded-dc-btn" role="tablist">
                          <button
                            role="tab"
                            aria-selected={viewMode === 'card'}
                            onClick={() => setViewMode('card')}
                            className={cn(
                              "dc-ctrl--press relative h-8 px-4 rounded-dc-shell text-sm font-medium flex items-center gap-2",
                              viewMode === 'card'
                                ? "text-dc-brand-ink"
                                : "text-dc-label-2 hover:text-dc-label hover:bg-dc-surface-3"
                            )}
                          >
                            {viewMode === 'card' && (
                              <motion.span
                                layoutId="dc-view-seg"
                                className="dc-ctrl dc-ctrl--thumb absolute inset-0 rounded-dc-shell"
                                transition={{ type: "spring", stiffness: 480, damping: 40 }}
                              />
                            )}
                            <IconGridFour className="size-4 relative z-10" />
                            <span className="relative z-10">卡片视图</span>
                          </button>
                          <button
                            role="tab"
                            aria-selected={viewMode === 'list'}
                            onClick={() => setViewMode('list')}
                            className={cn(
                              "dc-ctrl--press relative h-8 px-4 rounded-dc-shell text-sm font-medium flex items-center gap-2",
                              viewMode === 'list'
                                ? "text-dc-brand-ink"
                                : "text-dc-label-2 hover:text-dc-label hover:bg-dc-surface-3"
                            )}
                          >
                            {viewMode === 'list' && (
                              <motion.span
                                layoutId="dc-view-seg"
                                className="dc-ctrl dc-ctrl--thumb absolute inset-0 rounded-dc-shell"
                                transition={{ type: "spring", stiffness: 480, damping: 40 }}
                              />
                            )}
                            <IconListTwo className="size-4 relative z-10" />
                            <span className="relative z-10">列表视图</span>
                          </button>
                        </div>
                      </div>

                      {/* ===== 统计条：在线 / 离线 / 告警 / 今日操作 =====
                          HDS「一层容器」：四个指标属于同一组数据，就该待在**同一张卡**里，
                          靠 hairline 竖向分隔切分；四张独立圆角卡并排 = 一屏四个盒子，最碎。
                          -mx-4 + 单元格 px-4：让首尾单元格的 padding 溢出到卡外被裁掉，
                          于是第一格文字与下方标题左对齐，分隔线也不会贴着卡边。 */}
                      <ImmersiveCard className="dc-rise p-4 rounded-dc-shell">
                        <div className="grid grid-cols-2 xl:grid-cols-4 -mx-4">
                          {[
                            { key: "online", label: "在线设备", icon: IconSignal, value: overviewStats.online, unit: `/ ${overviewStats.total} 台` },
                            { key: "offline", label: "离线设备", icon: IconWifi, value: overviewStats.offline, unit: `/ ${overviewStats.total} 台` },
                            { key: "alert", label: "告警数量", icon: IconCaution, value: overviewStats.alertCount, unit: overviewStats.alertText },
                            { key: "today", label: "今日操作", icon: IconListCheckbox, value: overviewStats.todayCount, unit: overviewStats.delta > 0 ? `条 · 较昨日 +${overviewStats.delta}` : "条控制记录" },
                          ].map((stat) => (
                            <div key={stat.key} className="dc-stat-cell px-4 flex flex-col gap-2 min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                {/* 图标中性（2026-10 视觉整理）：这四格是**指标标签**，不是操作。
                                    品牌绿在本页只承担三种语义 —— 在线状态 / 开着的东西 / 主操作，
                                    其余位置一律走中性灰（HDS：Brand 只用于突出核心组件信息，
                                    文本图标分四级灰阶）。此前四个绿图标并排，是「一屏十几处绿」的一部分。 */}
                                <stat.icon className="size-4 shrink-0 dc-iic text-dc-label-3" />
                                <span className="text-sm text-dc-label-2 truncate">{stat.label}</span>
                              </div>
                              <div className="flex items-baseline gap-1.5 min-w-0">
                                {/* key 变化 → 数值刷新时重放一次轻微弹入（提示「值变了」） */}
                                <span key={stat.value} className="dc-value-pop text-2xl font-semibold leading-none text-dc-label tabular-nums">{stat.value}</span>
                                <span className="text-xs text-dc-label-3 truncate">{stat.unit}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ImmersiveCard>

                      {/* ===== 设备列表 ===== */}
                      <div className="space-y-4">
                        <div className="flex flex-wrap justify-between items-center gap-3">
                          <h2 className="text-lg font-semibold text-dc-label">设备列表</h2>
                          <div className="flex items-center gap-2">
                            <Select
                              value={groupFilter}
                              onChange={(v) => setGroupFilter(v)}
                              options={groupOptions}
                              /* 沉浸光感：控件本体走 --field 档（压在卡片上），
                                 下拉面板 portal 到 body → 档位类必须挂在面板自己的根节点上 */
                              className="dc-ctrl--field"
                              classNames={{ popup: { root: "dc-ctrl-popup dc-ctrl--popup" } }}
                              /* 控件高度统一到 40（8vp 网格）：页头按钮 / 主 CTA 都是 h-10，
                                 原先这里的 36 与它们差 4px —— 同一屏里的控件高度一旦不成倍数，
                                 视觉上就会读成「两套系统」。宽度取 8 的倍数。 */
                              style={{ width: 128, height: 40 }}
                            />
                            <Input
                              allowClear
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="搜索设备名称..."
                              prefix={<IconSearch className="size-4 text-dc-label-3" />}
                              className="dc-ctrl--field"
                              style={{ width: 240, height: 40 }}
                            />
                          </div>
                        </div>

                        {viewMode === 'card' ? (
                          /* 固定栅格：最多可见 2 行（约 391px），超出内部纵向滚动 */
                          <div ref={gridScrollRef} className="dc-grid-scroll grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            {visibleDevices.map((dev) => {
                              const DevIcon = dev.IconCmp
                              const isRelay = dev.type === 'relay'
                              const isCameraLike = dev.type === 'camera' || dev.type === 'stepper'
                              return (
                                <ImmersiveCard
                                  key={dev.key}
                                  className={cn(
                                    "group dc-hoverable dc-dev-card p-4 rounded-dc-shell flex flex-col",
                                    "transition-[box-shadow,border-color] duration-200 ease-out",
                                    "hover:border-dc-line-strong hover:shadow-dc-card-hover"
                                  )}
                                >
                                  <div className="flex justify-between items-start gap-2">
                                    {/* 图标中性（2026-10）：设备卡的主体重心应该是**设备名**，
                                        不是图标。此前 8 张卡各顶一个 28px 的品牌绿图标，
                                        加上右侧的绿状态点 → 一屏十几个绿点，绿就不再是强调色。
                                        现在图标退成中性灰、尺寸收到 24px，绿只留在状态与开关上。 */}
                                    <DevIcon className="size-6 shrink-0 dc-iic text-dc-label-3" strokeWidth={1.7} />
                                    <div className="flex items-center gap-1">
                                      {/* 在线态：绿点 + 中性文字（2026-10）。8 张卡同时在线时，
                                          「绿点 + 绿字」= 16 处绿 —— 状态色被自己稀释掉。
                                          现在绿只落在 6px 的圆点上（点缀级），文字退回二级灰；
                                          离线才把文字也染红 —— 异常本来就该跳出来。 */}
                                      <span
                                        className={cn(
                                          "text-xs font-medium inline-flex items-center gap-1.5",
                                          dev.online ? "text-dc-label-2" : "text-dc-bad-ink"
                                        )}
                                      >
                                        <span className={cn("size-1.5 rounded-full", dev.online ? "bg-dc-ok-ink" : "bg-dc-bad-ink")} />
                                        {dev.online ? "在线" : "离线"}
                                      </span>
                                      <button
                                        onClick={() => setDeviceManagerOpen(true)}
                                        className="size-7 rounded-dc-inner flex items-center justify-center text-dc-label-3 opacity-0 group-hover:opacity-100 hover:bg-dc-surface-3 hover:text-dc-label transition-all"
                                        title="管理设备"
                                      >
                                        <IconMore className="size-4" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="mt-4 min-w-0">
                                    <h3 className="font-semibold text-base text-dc-label truncate">{dev.name}</h3>
                                    <span className="text-sm text-dc-label-3 block mt-1 truncate">{dev.desc}</span>
                                  </div>

                                  <div className="flex justify-between items-center mt-auto pt-2 border-t border-dc-line">
                                    {/* 通道号只留文字：图标已在标题行出现过，重复画一遍 = 噪点 */}
                                    <span className="text-xs text-dc-label-3 font-mono tracking-wide">{dev.channel}</span>
                                    {/* 控件行统一 28px 高（鸿蒙小控件规格），
                                        让继电器卡与传感器卡天然同高 */}
                                    <span className="h-7 flex items-center shrink-0">
                                      {isRelay ? (
                                        <Switch
                                          checked={dev.isOn}
                                          onChange={() => dev.key.startsWith('legacy-') ? handleRelayToggle(dev.relayNum!) : handleRelayToggleByDevice(dev.id)}
                                          disabled={!connectionStatus.connected || controlStatus.loading}
                                          loading={controlStatus.loading}
                                          className="dc-ctrl--track dc-ctrl--press"
                                        />
                                      ) : (
                                        <button
                                          onClick={() => {
                                            if (isCameraLike) {
                                              setActiveSubTab('control')
                                            } else {
                                              toast.info('传感器详情请在数据看板查看')
                                            }
                                          }}
                                          className="h-7 px-2 -mr-2 rounded-dc-inner text-sm font-medium text-dc-brand-ink hover:bg-dc-brand-soft flex items-center gap-1 transition-colors"
                                        >
                                          <span>{isCameraLike ? '进入控制' : '查看数据'}</span>
                                          <IconRight className="size-4" />
                                        </button>
                                      )}
                                    </span>
                                  </div>
                                </ImmersiveCard>
                              )
                            })}
                          </div>
                        ) : (
                          /* 列表视图：紧凑行（同样的固定高度 + 内部滚动） */
                          <div ref={gridScrollRef} className="dc-grid-scroll dc-glass dc-mat--thick rounded-dc-shell divide-y divide-dc-line">
                            {visibleDevices.map((dev) => {
                              const DevIcon = dev.IconCmp
                              const isRelay = dev.type === 'relay'
                              const isCameraLike = dev.type === 'camera' || dev.type === 'stepper'
                              return (
                                <div key={dev.key} className="flex items-center gap-3 h-14 px-4 hover:bg-dc-surface-2 transition-colors">
                                  <DevIcon className="size-5 shrink-0 dc-iic text-dc-label-3" strokeWidth={1.7} />
                                  <div className="min-w-0 flex-1">
                                    <span className="text-sm font-semibold text-dc-label block truncate">{dev.name}</span>
                                    <span className="text-xs text-dc-label-3 block truncate">{dev.desc}</span>
                                  </div>
                                  <span className="text-xs text-dc-label-3 font-mono hidden sm:block">{dev.channel}</span>
                                  <span
                                    className={cn(
                                      "text-xs font-medium inline-flex items-center gap-1 shrink-0",
                                      dev.online ? "text-dc-label-2" : "text-dc-bad-ink"
                                    )}
                                  >
                                    <span className={cn("size-1.5 rounded-full", dev.online ? "bg-dc-ok-ink" : "bg-dc-bad-ink")} />
                                    {dev.online ? "在线" : "离线"}
                                  </span>
                                  {isRelay ? (
                                    <Switch
                                      checked={dev.isOn}
                                      onChange={() => dev.key.startsWith('legacy-') ? handleRelayToggle(dev.relayNum!) : handleRelayToggleByDevice(dev.id)}
                                      disabled={!connectionStatus.connected || controlStatus.loading}
                                      className="dc-ctrl--track dc-ctrl--press"
                                    />
                                  ) : (
                                    <button
                                      onClick={() => isCameraLike ? setActiveSubTab('control') : toast.info('传感器详情请在数据看板查看')}
                                      className="h-7 px-2 -mr-2 rounded-dc-inner text-sm font-medium text-dc-brand-ink hover:bg-dc-brand-soft flex items-center gap-1 shrink-0 transition-colors"
                                    >
                                      <span>{isCameraLike ? '进入控制' : '查看数据'}</span>
                                      <IconRight className="size-4" />
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                            {visibleDevices.length === 0 && (
                              <div className="px-5 py-8 text-center text-xs text-dc-label-3">没有匹配的设备</div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ===== 补光灯颜色控制 ===== */}
                      <div className="dc-glass p-4 rounded-dc-shell space-y-4">
                        <div className="flex justify-between items-center gap-3">
                          <h2 className="text-base font-semibold text-dc-label flex items-center gap-3 min-w-0">
                            <span className="text-dc-label-2 flex items-center justify-center shrink-0">
                              <IconLight className="size-5" />
                            </span>
                            <span className="truncate">补光灯颜色控制</span>
                            <span className="text-xs text-dc-label-3 font-normal shrink-0">RGB 控制 (LED 1-3)</span>
                          </h2>
                          <div className="flex items-center gap-2 shrink-0">
                            {/* LED 同步状态指示 */}
                            <div className={cn(
                              "flex items-center gap-1.5 text-xs font-medium",
                              syncStatus === 'synced' && "text-dc-ok-ink",
                              syncStatus === 'syncing' && "text-dc-warn-ink",
                              syncStatus === 'error' && "text-dc-bad-ink"
                            )}>
                              {syncStatus === 'synced' && <IconCheckOne className="size-3.5" />}
                              {syncStatus === 'syncing' && <IconRefresh className="size-3.5 animate-spin" />}
                              {syncStatus === 'error' && <IconAttention className="size-3.5" />}
                              <span>
                                {syncStatus === 'synced' && '已同步'}
                                {syncStatus === 'syncing' && '同步中...'}
                                {syncStatus === 'error' && '同步失败'}
                              </span>
                            </div>
                            {/* 折叠 */}
                            <button
                              onClick={() => setLedPanelOpen(!ledPanelOpen)}
                              className="size-7 rounded-dc-inner flex items-center justify-center text-dc-label-3 hover:bg-dc-surface-3 hover:text-dc-label transition-colors"
                              title={ledPanelOpen ? "收起面板" : "展开面板"}
                            >
                              <IconUp className={cn("size-3.5 transition-transform", !ledPanelOpen && "rotate-180")} />
                            </button>
                          </div>
                        </div>

                        {ledPanelOpen && (
                          <>
                            <Row gutter={[24, 8]} align="middle">
                              {/* 左：画布调色 */}
                              <Col xs={24} md={10}>
                                <ColorPickerCanvas r={r} g={g} b={b} onChange={handleCanvasColorChange} />
                              </Col>

                              {/* 右：通道参数调节 */}
                              <Col xs={24} md={14} className="space-y-4 pt-3 md:pt-0">
                                {[
                                  /* RGB 三通道是「物理语义色」，必须真的是红/绿/蓝 ——
                                     不能被品牌绿覆盖（此前 B 通道被误写成 #059669 = 绿，滑条颜色与含义不符）。 */
                                  { label: "红色 (R)", val: r, onChange: handleRChange, color: "#DC2626" },
                                  { label: "绿色 (G)", val: g, onChange: handleGChange, color: "#059669" },
                                  { label: "蓝色 (B)", val: b, onChange: handleBChange, color: "#0A84FF" },
                                ].map((item) => (
                                  <div key={item.label} className="grid grid-cols-12 gap-3 items-center">
                                    <span className="col-span-3 text-sm font-medium text-dc-label-2 flex items-center gap-1.5">
                                      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                      {item.label}
                                    </span>
                                    <Slider
                                      min={0}
                                      max={255}
                                      value={item.val}
                                      onChange={item.onChange}
                                      className="col-span-6 my-0 shrink-0"
                                      styles={{
                                        track: { background: item.color },
                                        handle: { borderColor: item.color, backgroundColor: item.color }
                                      }}
                                    />
                                    <span className="col-span-3 flex justify-end pr-1">
                                      {/* 数值回显直接裸放（数字用通道色）：不再套一个白底圆角小方框
                                          —— 同一行已有滑条这一处图形，再补一个盒子只增加矩形数量 */}
                                      <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: item.color }}>
                                        {item.val}
                                      </span>
                                    </span>
                                  </div>
                                ))}

                                <div className="grid grid-cols-12 gap-3 items-center">
                                  <span className="col-span-3 text-sm font-medium text-dc-label-2 flex items-center gap-1.5">
                                    <span className="size-2 rounded-full shrink-0 bg-dc-label-3" />
                                    亮度
                                  </span>
                                  <Slider
                                    min={0}
                                    max={255}
                                    value={w}
                                    onChange={handleWChange}
                                    className="col-span-6 my-0"
                                  />
                                  <span className="col-span-3 flex justify-end pr-1">
                                    <span className="font-mono text-sm font-semibold text-dc-label tabular-nums">
                                      {Math.round((w / 255) * 100)}%
                                    </span>
                                  </span>
                                </div>
                              </Col>
                            </Row>

                            {/* 底排：预设色 + 更新按钮 */}
                            <div className="flex flex-wrap justify-between items-center gap-3 pt-2 border-t border-dc-line">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-dc-label-3 font-medium mr-1">预设颜色</span>
                                {PRESET_LED_COLORS.map((pc) => (
                                  <button
                                    key={pc.name}
                                    onClick={() => {
                                      setR(pc.r)
                                      setG(pc.g)
                                      setB(pc.b)
                                      triggerLEDUpdate(pc.b, pc.r, pc.g, w)
                                    }}
                                    className="size-6 rounded-full border border-dc-line-strong transition-transform hover:scale-110 active:scale-95"
                                    style={{ backgroundColor: `rgb(${pc.r},${pc.g},${pc.b})` }}
                                    title={pc.name}
                                  />
                                ))}
                                <button
                                  onClick={() => presetColorInputRef.current?.click()}
                                  className="size-6 rounded-full border border-dashed border-dc-line-strong flex items-center justify-center text-dc-label-3 hover:text-dc-brand-ink hover:border-dc-brand transition-colors"
                                  title="自定义颜色"
                                >
                                  <IconPlus className="size-3" />
                                </button>
                                <input
                                  ref={presetColorInputRef}
                                  type="color"
                                  className="sr-only"
                                  value={`#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`}
                                  onChange={(e) => {
                                    const hex = e.target.value
                                    const nr = parseInt(hex.slice(1, 3), 16)
                                    const ng = parseInt(hex.slice(3, 5), 16)
                                    const nb = parseInt(hex.slice(5, 7), 16)
                                    handleCanvasColorChange(nr, ng, nb)
                                  }}
                                />
                              </div>
                              <Button
                                type="primary"
                                icon={<IconSunny className="size-3.5" />}
                                className="dc-ctrl--brand dc-ctrl--press text-white rounded-dc-inner px-6"
                                onClick={() => triggerLEDUpdate(b, r, g, w)}
                              >
                                更新 LED 亮度
                              </Button>
                            </div>
                          </>
                        )}
                      </div>

                    </motion.div>
                  )}

                  {/* ======================================================== */}
                  {/*               Tab 2: 设备控制视图 (一比一复刻)             */}
                  {/* ======================================================== */}
                  {activeSubTab === 'control' && (
                    <motion.div
                      key="control"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
                      className="space-y-6"
                    >
                      {/* ===== 页头（无卡片：标题直接落在画布上）===== */}
                      <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                          <h1 className="text-2xl leading-tight font-semibold text-dc-label flex items-center gap-3">
                            <span>摄像头云台</span>
                            <span className={cn(
                              "text-xs font-medium",
                              connectionStatus.connected
                                ? "text-dc-ok-ink"
                                : "text-dc-bad-ink"
                            )}>{connectionStatus.connected ? '在线' : '离线'}</span>
                          </h1>
                          <p className="text-sm text-dc-label-2 mt-2">步进电机控制（700mm 焦距）</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* 2026-09-25 移除本页头的「设备管理」按钮：左侧导航栏已有同名入口
                              （同一个 setDeviceManagerOpen）→ 一屏两个入口是冗余设计。
                              注意「设备设置」是另一件事，不属于设备注册表，故保留。 */}
                          <button
                            onClick={() => toast.info('设备设置面板开发中...')}
                            className="dc-ctrl--field dc-ctrl--press h-10 px-4 rounded-dc-btn text-sm font-medium text-dc-label-2 hover:text-dc-label flex items-center gap-2"
                          >
                            <IconSettingTwo className="size-4 relative z-10" />
                            <span className="relative z-10">设备设置</span>
                          </button>
                          <button
                            onClick={() => toast.info('云台自动巡航开发中...')}
                            className="dc-press h-10 px-4 rounded-dc-btn bg-dc-brand hover:bg-dc-brand-strong text-white text-sm font-medium flex items-center gap-2 shadow-dc-inner transition-colors"
                          >
                            <IconPlay className="size-4" />
                            <span>云台巡航</span>
                          </button>
                        </div>
                      </div>

                      {/* ===== 行1：实时预览 + 云台控制（参考稿 6:6） ===== */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">

                        {/* 实时预览卡 */}
                        <div className="dc-glass dc-rise p-4 rounded-dc-shell flex flex-col">
                          <div className="flex justify-between items-center gap-3 mb-4">
                            <h2 className="text-base font-semibold text-dc-label flex items-center gap-3">
                              <span className="text-dc-label-2 flex items-center justify-center shrink-0">
                                <IconVideo className="size-5" />
                              </span>
                              <span>实时预览</span>
                            </h2>
                            {/* CAM 切换：与视图切换同一套分段材质（滑槽 --track 中性凹槽 / 选中块 --thumb 白玻璃凸起） */}
                            <div className="dc-seg dc-ctrl--track flex items-center gap-1 h-9 p-1 rounded-dc-btn shrink-0" role="tablist">
                              {cameras.map((cam) => (
                                <button
                                  key={cam.id}
                                  role="tab"
                                  aria-selected={selectedCameraId === cam.id}
                                  onClick={() => setSelectedCameraId(cam.id)}
                                  disabled={loadingCameras}
                                  className={cn(
                                    "dc-ctrl--press relative h-7 px-4 rounded-dc-shell text-sm font-medium flex items-center",
                                    selectedCameraId === cam.id
                                      ? "text-dc-brand-ink"
                                      : "text-dc-label-2 hover:text-dc-label hover:bg-dc-surface-3",
                                    loadingCameras && "opacity-50 cursor-not-allowed"
                                  )}
                                >
                                  {selectedCameraId === cam.id && (
                                    <motion.span
                                      layoutId="dc-cam-seg"
                                      className="dc-ctrl dc-ctrl--thumb absolute inset-0 rounded-dc-shell"
                                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                                    />
                                  )}
                                  <span className="relative z-10">{cam.name.includes('A') ? 'CAM-A' : 'CAM-B'}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex-1 flex">
                            <div
                                ref={videoContainerRef}
                                className={cn(
                                  "relative aspect-video w-full lg:max-h-[244px] rounded-dc-card overflow-hidden bg-dc-video border border-dc-line",
                                  isFullscreen && "rounded-none border-0"
                                )}
                              >
                                {selectedCamera?.url ? (
                                  <>
                                    <LiveStreamPlayer
                                      sources={cameraPlayerSources}
                                      className="w-full h-full object-cover"
                                      autoplay
                                      muted
                                      controls={false}
                                    />
                                    {/* 视频加载指示器 */}
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                                      <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-dc-inner">
                                        <span className="text-xs text-white font-medium">实时监控中</span>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-dc-video text-white/70">
                                    <IconSignal className="size-5 animate-pulse mb-2" />
                                    <span className="text-xs font-medium">CCTV 未连接或离线</span>
                                    <span className="text-xs text-white/40 mt-1">请先在系统设置中配置摄像头 URL</span>
                                  </div>
                                )}

                                <div className={cn(
                                  "absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs text-white font-medium select-none transition-colors",
                                  selectedCamera?.url ? "bg-dc-ok-fill" : "bg-dc-bad-fill"
                                )}>
                                  {selectedCamera?.url ? '● 在线' : '● 离线'}
                                </div>

                                {/* 底部 overlay 按钮（28px 点击区，替代原先 20px 小方块） */}
                                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => {
                                        if (!selectedCamera?.url) {
                                          toast.warning('摄像头未连接')
                                          return
                                        }
                                        toast.info('截图功能开发中...')
                                      }}
                                      className="size-7 rounded-dc-inner bg-black/45 backdrop-blur-sm text-white/85 hover:text-white hover:bg-black/65 flex items-center justify-center transition-all"
                                      title="截图"
                                    >
                                      <IconCamera className="size-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (!selectedCamera?.url) {
                                          toast.warning('摄像头未连接')
                                          return
                                        }
                                        toast.info('录像功能开发中...')
                                      }}
                                      className="size-7 rounded-dc-inner bg-black/45 backdrop-blur-sm text-white/85 hover:text-white hover:bg-black/65 flex items-center justify-center transition-all"
                                      title="录像"
                                    >
                                      <IconVideo className="size-3.5" />
                                    </button>
                                  </div>
                                  <button
                                    onClick={toggleFullscreen}
                                    className="size-7 rounded-dc-inner bg-black/45 backdrop-blur-sm text-white/85 hover:text-white hover:bg-black/65 flex items-center justify-center transition-all"
                                    title={isFullscreen ? "退出全屏" : "全屏"}
                                  >
                                    {isFullscreen ? <IconOffScreen className="size-3.5" /> : <IconFullScreen className="size-3.5" />}
                                  </button>
                                </div>

                                {/* 全屏模式 - 极简飞书风控制界面 */}
                                {isFullscreen && (
                                  <div className="absolute inset-0 z-50 flex bg-dc-fs-bg text-white/85">
                                    {/* 左侧：全屏视频区域 */}
                                    <div className="flex-1 relative bg-dc-video overflow-hidden">
                                      {/* 视频内容 */}
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        {selectedCamera?.url ? (
                                          <LiveStreamPlayer
                                            sources={cameraPlayerSources}
                                            className="w-full h-full object-cover"
                                            autoplay
                                            muted
                                            controls={false}
                                          />
                                        ) : (
                                          <div className="flex flex-col items-center justify-center text-white/45 select-none">
                                            <IconSignal className="size-8 mb-2 opacity-70" />
                                            <span className="text-[12px] font-medium">摄像头未连接</span>
                                            <span className="text-xs text-white/30 mt-1">请在系统设置中配置摄像头 URL</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* 左上角：LIVE 状态 + 摄像头切换（飞书风：薄边、小字、紧凑） */}
                                      <div className="absolute top-5 left-5 flex items-center gap-2">
                                        <div
                                          className="flex items-center gap-1.5 h-7 px-2.5 rounded-dc-inner border border-white/10 bg-white/[0.04]"
                                          title={selectedCamera?.url ? '在线' : '离线'}
                                        >
                                          <span
                                            className={cn(
                                              "inline-block size-1.5 rounded-full",
                                              selectedCamera?.url ? "bg-dc-ok-fill animate-pulse" : "bg-dc-bad-fill"
                                            )}
                                          />
                                          <span className="text-xs font-medium tracking-wide">
                                            {selectedCamera?.url ? 'LIVE' : 'OFFLINE'}
                                          </span>
                                        </div>
                                        <div className="flex h-7 p-0.5 rounded-dc-inner border border-white/10 bg-white/[0.04]">
                                          {cameras.map((cam) => (
                                            <button
                                              key={cam.id}
                                              onClick={() => setSelectedCameraId(cam.id)}
                                              className={cn(
                                                "px-2.5 text-xs font-medium rounded-[5px] transition-colors",
                                                selectedCameraId === cam.id
                                                  ? "bg-white/10 text-white"
                                                  : "text-white/45 hover:text-white/80"
                                              )}
                                            >
                                              {cam.name.includes('A') ? 'A' : 'B'}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* 右上角：性能条（飞书：低调单行） */}
                                      <div className="absolute top-5 right-5 flex items-center gap-3 h-7 px-3 rounded-dc-inner border border-white/10 bg-white/[0.04] text-xs font-mono">
                                        <span className="flex items-center gap-1.5">
                                          <span className="text-white/40">FPS</span>
                                          <span className="text-white/70">--</span>
                                        </span>
                                        <span className="text-white/15">|</span>
                                        <span className="flex items-center gap-1.5">
                                          <span className="text-white/40">GPU</span>
                                          <span className="text-white/70">--</span>
                                        </span>
                                        <span className="text-white/15">|</span>
                                        <span className="flex items-center gap-1.5">
                                          <span className="text-white/40">CPU</span>
                                          <span className="text-white/70">--</span>
                                        </span>
                                        <span className="text-white/15">|</span>
                                        <span className="flex items-center gap-1.5">
                                          <span className="text-white/40">显存</span>
                                          <span className="text-white/70">--</span>
                                        </span>
                                      </div>

                                      {/* 左下角提示 */}
                                      <div className="absolute bottom-5 left-5 text-xs text-white/35 select-none">
                                        按 ESC 退出全屏
                                      </div>
                                    </div>

                                    {/* 右侧：飞书风侧栏控制面板 */}
                                    <div className="w-[320px] shrink-0 bg-dc-fs-panel border-l border-white/[0.06] flex flex-col">
                                      {/* 面板头部 */}
                                      <div className="h-12 px-4 flex items-center justify-between border-b border-white/[0.06]">
                                        <div className="flex items-baseline gap-2">
                                          <span className="text-[12px] font-semibold text-white/90">云台控制</span>
                                          <span className="text-xs text-white/40">700mm 行程</span>
                                        </div>
                                        <button
                                          onClick={toggleFullscreen}
                                          className="size-7 rounded-dc-inner flex items-center justify-center text-white/45 hover:text-white hover:bg-white/[0.06] transition-colors"
                                          title="退出全屏"
                                        >
                                          <IconOffScreen className="size-3.5" />
                                        </button>
                                      </div>

                                      {/* 位置信息卡片 */}
                                      <div className="px-4 pt-4">
                                        <div className="rounded-dc-inner border border-white/[0.06] bg-white/[0.02] p-4">
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <div className="text-xs text-white/40">当前位置</div>
                                              <div className="mt-1 flex items-baseline gap-1">
                                                <span className="text-[20px] font-semibold text-white tabular-nums leading-none">
                                                  {systemStats.stepperPosition}
                                                </span>
                                                <span className="text-[12px] text-white/40">mm</span>
                                              </div>
                                            </div>
                                            <IconCompass className="size-4 text-white/35" />
                                          </div>
                                          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2 text-xs">
                                            <span className="text-white/40">脉冲</span>
                                            <span className="text-white/70 font-mono">{deviceData?.stepper_position || 0} p</span>
                                            <span className="text-white/15 mx-0.5">|</span>
                                            <span className="text-white/40">方向</span>
                                            <span
                                              className={cn(
                                                "font-medium",
                                                deviceData?.stepper_direction === 0 ? "text-white/55" : "text-dc-brand-ink"
                                              )}
                                            >
                                              {deviceData?.stepper_direction === 0 ? '停止' : deviceData?.stepper_direction === 1 ? '左移' : '右移'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* 飞书风罗盘控制器 */}
                                      <div className="px-4 pt-5 flex-1 flex flex-col items-center">
                                        <div className="relative size-36 rounded-full border border-white/[0.08] bg-white/[0.02] flex items-center justify-center">
                                          {/* 左按钮 */}
                                          <button
                                            onClick={() => handleStepperControl(1)}
                                            disabled={!connectionStatus.connected || deviceData?.stepper_direction !== 0}
                                            className={cn(
                                              "absolute left-1.5 size-11 rounded-full flex items-center justify-center transition-colors",
                                              "border border-white/[0.08] bg-white/[0.04] text-white/65 hover:text-white hover:bg-white/[0.08]",
                                              "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/[0.04] disabled:hover:text-white/65"
                                            )}
                                            title="向左"
                                          >
                                            <IconLeft className="size-5" />
                                          </button>

                                          {/* 右按钮 */}
                                          <button
                                            onClick={() => handleStepperControl(2)}
                                            disabled={!connectionStatus.connected || deviceData?.stepper_direction !== 0}
                                            className={cn(
                                              "absolute right-1.5 size-11 rounded-full flex items-center justify-center transition-colors",
                                              "border border-white/[0.08] bg-white/[0.04] text-white/65 hover:text-white hover:bg-white/[0.08]",
                                              "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/[0.04] disabled:hover:text-white/65"
                                            )}
                                            title="向右"
                                          >
                                            <IconRight className="size-5" />
                                          </button>

                                          {/* 中央停止按钮 */}
                                          <button
                                            onClick={() => handleStepperControl(0)}
                                            disabled={!connectionStatus.connected || deviceData?.stepper_direction === 0}
                                            className={cn(
                                              "size-12 rounded-full flex items-center justify-center transition-colors border",
                                              "disabled:opacity-30 disabled:cursor-not-allowed"
                                            )}
                                            style={{
                                              backgroundColor: 'var(--dc-bad-fill)',
                                              borderColor: 'rgba(255,255,255,0.15)',
                                            }}
                                            title="停止"
                                          >
                                            <span className="block size-2.5 rounded-[2px] bg-white" />
                                          </button>
                                        </div>

                                        {/* 移动距离选择（飞书 chip 风格） */}
                                        <div className="mt-5 flex gap-1.5">
                                          {[10, 50, 100].map((mmVal) => {
                                            const isSelected = stepPulses === mmVal * 160
                                            return (
                                              <button
                                                key={mmVal}
                                                onClick={() => setStepPulses(mmVal * 160)}
                                                className={cn(
                                                  "h-7 px-3 rounded-dc-inner text-[12px] font-medium transition-colors border",
                                                  isSelected
                                                    ? "bg-dc-brand border-transparent text-white"
                                                    : "border-white/[0.08] bg-white/[0.02] text-white/60 hover:text-white hover:bg-white/[0.06]"
                                                )}
                                              >
                                                {mmVal}mm
                                              </button>
                                            )
                                          })}
                                        </div>
                                      </div>

                                      {/* 操作按钮区 */}
                                      <div className="px-4 py-4 border-t border-white/[0.06] space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                          <button
                                            onClick={() => {
                                              toggleFullscreen()
                                              setTimeout(() => handleResetStepper(), 300)
                                            }}
                                            disabled={!connectionStatus.connected}
                                            className={cn(
                                              "h-9 rounded-dc-inner text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors",
                                              "bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/80 hover:text-white",
                                              "disabled:opacity-30 disabled:cursor-not-allowed"
                                            )}
                                          >
                                            <IconUndo className="size-3.5" />
                                            复位
                                          </button>
                                          <button
                                            onClick={() => toast.info('预设定位功能')}
                                            disabled={!connectionStatus.connected}
                                            className={cn(
                                              "h-9 rounded-dc-inner text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors",
                                              "bg-dc-brand hover:bg-dc-brand-strong text-white border border-transparent",
                                              "disabled:opacity-30 disabled:cursor-not-allowed"
                                            )}
                                          >
                                            <IconTarget className="size-3.5" />
                                            预设
                                          </button>
                                        </div>

                                        {/* 工具按钮 */}
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => toast.info('截图功能')}
                                            className="flex-1 h-8 rounded-dc-inner text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] text-white/55 hover:text-white/85"
                                          >
                                            <IconCamera className="size-3.5" />
                                            截图
                                          </button>
                                          <button
                                            onClick={() => toast.info('录像功能')}
                                            className="flex-1 h-8 rounded-dc-inner text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] text-white/55 hover:text-white/85"
                                          >
                                            <IconVideo className="size-3.5" />
                                            录像
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                        </div>

                        {/* 云台控制卡 */}
                        <div className="dc-glass dc-rise p-4 rounded-dc-shell flex flex-col" style={{ animationDelay: "70ms" }}>
                          <div className="flex justify-between items-center gap-3 mb-4">
                            <h2 className="text-base font-semibold text-dc-label flex items-center gap-3">
                              <span className="text-dc-label-2 flex items-center justify-center shrink-0">
                                <IconCompass className="size-5" />
                              </span>
                              <span>云台控制</span>
                            </h2>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm text-dc-label-3">精细控制</span>
                              <Switch checked={preciseMode} onChange={(v) => setPreciseMode(v)} className="dc-ctrl--track dc-ctrl--press" />
                            </div>
                          </div>

                          <div className="flex-1 flex flex-col sm:flex-row items-center gap-5 py-2">
                            {/* 方向罗盘 */}
                            <div className="relative size-42 rounded-full border border-dc-line-strong dc-glass-2 flex items-center justify-center shadow-dc-inner shrink-0">
                              <button disabled title="未启用垂直控制" className="absolute top-3 size-9 rounded-full flex items-center justify-center text-dc-label-3 disabled:opacity-40"><IconUp className="size-5" /></button>
                              <button disabled title="未启用垂直控制" className="absolute bottom-3 size-9 rounded-full flex items-center justify-center text-dc-label-3 disabled:opacity-40"><IconDown className="size-5" /></button>
                              <button onClick={() => handleStepperControl(1)} title="向左" className="dc-press absolute left-3 size-9 rounded-full flex items-center justify-center text-dc-label-2 hover:text-dc-brand-ink hover:bg-dc-surface-3 active:bg-dc-brand-soft transition-colors"><IconLeft className="size-5" /></button>
                              <button onClick={() => handleStepperControl(2)} title="向右" className="dc-press absolute right-3 size-9 rounded-full flex items-center justify-center text-dc-label-2 hover:text-dc-brand-ink hover:bg-dc-surface-3 active:bg-dc-brand-soft transition-colors"><IconRight className="size-5" /></button>
                              <button
                                onClick={() => (deviceData?.stepper_direction || 0) !== 0 ? handleStepperControl(0) : toast.info('截图功能开发中...')}
                                title={(deviceData?.stepper_direction || 0) !== 0 ? "紧急停止" : "截图"}
                                className={cn(
                                  /* 静止时中性、移动时红（2026-10）：
                                     原来静止态是品牌绿实底 —— 一进页面看到的就是「云台中心一颗绿按钮」，
                                     而此刻真正该看的是**左右两个方向键**。绿在静止态没有任何语义，
                                     只把注意力从「能操作的东西」引开了。现在静止 = 中性灰片，
                                     只有「正在移动 → 这颗红键可紧急停止」时它才成为唯一的焦点。 */
                                  "dc-press size-14 rounded-full flex items-center justify-center border-2 border-dc-surface transition-colors",
                                  (deviceData?.stepper_direction || 0) !== 0
                                    ? "bg-dc-bad-fill text-white dc-pulse"
                                    : "dc-ctrl--field text-dc-label-2"
                                )}
                              >
                                {(deviceData?.stepper_direction || 0) !== 0
                                  ? <span className="block size-3 bg-white rounded-[2px]" />
                                  : <IconCamera className="size-5" />}
                              </button>
                            </div>

                            {/* 参数与状态 */}
                            <div className="flex-1 min-w-0 space-y-4 text-sm w-full">
                              <div>
                                <span className="text-dc-label-3 block text-sm">当前位置</span>
                                <div className="flex items-baseline gap-1.5 mt-1">
                                  {/* 位置读数走一级文本色（2026-10）：它是「数据」不是「操作」。
                                      此前用品牌绿 —— 一屏里绿色既表示「能点」又表示「读数」，语义就糊了。 */}
                                  <span key={systemStats.stepperPosition} className="dc-value-pop text-xl font-bold text-dc-label font-mono tabular-nums">{systemStats.stepperPosition}</span>
                                  <span className="text-sm text-dc-label-3">mm</span>
                                  <span className="text-dc-label-3 text-sm font-mono">({deviceData?.stepper_position || 0} p)</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <span className="text-dc-label-3 block text-sm">复位位置</span>
                                  <span className="font-semibold text-sm block mt-1">最左侧 (0mm)</span>
                                </div>
                                {/* 次级按钮 = 沉浸光感控件材质（不再铺死白底）：
                                    底色交给 .dc-ctrl--field，按压弹性与点光源交给 .dc-ctrl--press */}
                                <Button className="dc-ctrl--field dc-ctrl--press rounded-dc-inner text-sm px-4 h-8 border-dc-line-strong" onClick={handleResetStepper}>复位</Button>
                              </div>

                              <div className="space-y-1">
                                {/* 标签行右侧补「当前步进」读数（2026-10）：
                                    此前这个值只体现在三个胶囊哪个高亮上 —— 一旦用精细滑条拖到
                                    10/50/100 之外，三个胶囊全灭，屏幕上就**没有任何地方**能读到
                                    当前步进量。现在读数常驻标签行右端，滑条与胶囊共用同一个数据源。 */}
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="text-dc-label-3 block text-sm">单次移动距离</span>
                                  <span className="text-sm font-semibold text-dc-label tabular-nums shrink-0">
                                    {stepPulses / 160} mm
                                  </span>
                                </div>
                                {/* 精细控制开关：滑杆以高度折叠动画展开 / 收起 */}
                                <AnimatePresence initial={false}>
                                  {preciseMode && (
                                    <motion.div
                                      key="dc-precise-slider"
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
                                      className="overflow-hidden"
                                    >
                                      <Slider
                                        min={160}
                                        max={16000}
                                        step={160}
                                        value={stepPulses}
                                        onChange={setStepPulses}
                                        className="my-2"
                                      />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                                <div className="flex gap-2 mt-2.5">
                                  {[10, 50, 100].map((mmVal) => {
                                    const isSel = stepPulses === mmVal * 160
                                    return (
                                      <button
                                        key={mmVal}
                                        onClick={() => setStepPulses(mmVal * 160)}
                                        className={cn(
                                          /* 选中 = 品牌 CTA 材质，未选 = --field 档；两者都是"一块介质"，
                                             所以切换时不会出现「材质消失」的观感断层。 */
                                          "dc-ctrl--press flex-1 py-2 rounded-full text-sm font-medium",
                                          isSel ? "dc-ctrl--brand text-white" : "dc-ctrl--field text-dc-label-2"
                                        )}
                                      >
                                        <span className="relative z-10">{mmVal}mm</span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* ===== 行2：预设位置 + 直驱参数预设（参考稿 7:3） ===== */}
                      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 items-stretch">

                        {/* 预设位置卡 */}
                        <div className="lg:col-span-7 dc-glass dc-rise p-4 rounded-dc-shell space-y-4" style={{ animationDelay: "140ms" }}>
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex items-start gap-3">
                              <span className="text-dc-label-2 flex items-center justify-center shrink-0">
                                <IconStar className="size-5" />
                              </span>
                              <div>
                                <h2 className="text-base font-semibold text-dc-label">预设位置</h2>
                                <p className="text-sm text-dc-label-3 mt-0.5">快速定位到常用监控位置，适用于不同作业场景</p>
                              </div>
                            </div>
                            {/* 「＋ 添加预设位」= 幽灵按钮材质（层级低于字段控件与主按钮，
                                但仍是一块有边缘光的介质） */}
                            <button
                              onClick={() => setPresetModalOpen(true)}
                              className="dc-ctrl--ghost dc-ctrl--press dc-hoverable text-sm font-semibold text-dc-brand-ink flex items-center gap-1.5 shrink-0 h-8 px-3 rounded-dc-btn"
                            >
                              <IconPlus className="size-3.5 dc-iic relative z-10" />
                              <span className="relative z-10">添加预设位</span>
                            </button>
                          </div>

                            {/* 预设位列表：4 项同组数据放进一条带 hairline 分隔的横排列表，
                                不再各自是一个「灰底 + 边框 + 圆角」的小盒子（卡里套卡）。
                                分隔线用负外边距贯穿到卡边，视觉上是一条整线而非小短线。 */}
                            <div className="dc-preset-strip">
                              {presets.map((preset) => (
                                <div
                                  key={preset.id}
                                  onClick={() => handlePresetTrigger(preset.name, preset.mm)}
                                  className="dc-press group dc-preset-cell"
                                >
                                  <div className="flex justify-between items-center gap-1">
                                    <span className="text-sm font-semibold text-dc-label truncate">{preset.name}</span>
                                    <Popconfirm
                                      title="删除该预设位？"
                                      description={`将删除「${preset.name}」`}
                                      okText="删除"
                                      cancelText="取消"
                                      okButtonProps={{ danger: true }}
                                      /* 浮层 portal 到 body → 材质档位类必须挂在浮层自己的根节点上 */
                                      classNames={{ root: "dc-ctrl-popup dc-ctrl--popup" }}
                                      onConfirm={(e) => { e?.stopPropagation(); handleDeletePreset(preset.id) }}
                                      onCancel={(e) => e?.stopPropagation()}
                                    >
                                      <span
                                        onClick={(e) => e.stopPropagation()}
                                        className="relative shrink-0 size-6 -mr-1 flex items-center justify-center text-dc-label-3 transition-colors hover:text-dc-bad-ink"
                                        title="删除预设位"
                                      >
                                        <IconStar className="size-4 transition-opacity group-hover:opacity-0" />
                                        <IconDelete className="absolute size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                                      </span>
                                    </Popconfirm>
                                  </div>
                                  {/* 三行三个层级（2026-10 整理）：名称 14 粗 / 场景说明 12 灰 / 行程 14 绿。
                                      此前是 14 粗 + 14 灰 + 16 粗绿 —— 名称与说明同号同重，
                                      读起来两行糊成一坨；数值又比标题更大，重心落在最不重要的那行。 */}
                                  <span className="text-sm text-dc-label-2 block mt-1 truncate">{preset.desc}</span>
                                  <span className="text-sm text-dc-brand-ink font-semibold mt-2.5 flex items-center gap-1 tabular-nums whitespace-nowrap">
                                    <IconLocalPin className="size-4 shrink-0" /> {preset.mm} mm
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 直驱参数预设卡 */}
                          <div className="lg:col-span-3 dc-glass dc-rise p-4 rounded-dc-shell flex flex-col justify-between gap-4" style={{ animationDelay: "210ms" }}>
                            <div className="flex items-start gap-3">
                              <span className="text-dc-label-2 flex items-center justify-center shrink-0">
                                <IconSettingTwo className="size-5" />
                              </span>
                              <div className="min-w-0">
                                <h2 className="text-base font-semibold text-dc-label">直驱参数预设</h2>
                                <p className="text-sm text-dc-label-3 mt-0.5">常用脉冲与速度一键下发</p>
                              </div>
                            </div>

                            {/* 两个字段：标签行固定单行（节点号右对齐同基线），
                                输入框顶部严格对齐 —— 标签换行不会再把输入框顶歪 */}
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { label: "目标脉冲", node: "node0817", value: presetPulses, min: 160, max: 112000, onChange: (v: number | null) => setPresetPulses(v || 160) },
                                { label: "速度", node: "node0803", value: presetSpeed, min: 1000, max: 50000, onChange: (v: number | null) => setPresetSpeed(v || 10000) },
                              ].map((field) => (
                                <div key={field.node} className="min-w-0">
                                  {/* 三行同构：主标签 / 节点号 / 输入框 —— 窄卡也不截断、两列严格对齐 */}
                                  <span className="text-xs font-medium text-dc-label-2 block whitespace-nowrap">{field.label}</span>
                                  <span className="text-xs font-mono text-dc-label-3 block leading-5 mb-1 truncate">{field.node}</span>
                                  <InputNumber
                                    min={field.min}
                                    max={field.max}
                                    value={field.value}
                                    onChange={field.onChange}
                                    className="dc-num-field dc-ctrl--field w-full h-10 rounded-dc-inner"
                                  />
                                </div>
                              ))}
                            </div>

                            <Button
                              type="primary"
                              block
                              icon={<IconPlay className="size-4" />}
                              className="dc-press dc-preset-send bg-dc-brand hover:bg-dc-brand-strong text-white rounded-dc-btn text-sm h-10"
                              onClick={handleStepperPreset}
                              disabled={!connectionStatus.connected}
                            >
                              发送预设参数
                            </Button>
                          </div>

                        </div>

                      {/* 添加预设位置弹窗 —— 材质走 HDS ULTRA_THICK 档（弹出层）
                          rootClassName 上只挂变量类，材质落在 .ant-modal-container 上 */}
                      <Modal
                        open={presetModalOpen}
                        onCancel={() => setPresetModalOpen(false)}
                        title="添加预设位"
                        okText="添加"
                        cancelText="取消"
                        onOk={handleAddPreset}
                        centered
                        rootClassName="dc-modal-ultra dc-mat--ultra"
                      >
                        <div className="space-y-4">
                          <div>
                            <span className="text-xs font-semibold text-dc-label-2 block mb-1.5">预设位名称</span>
                            <Input
                              placeholder="例如：左侧采摘位"
                              value={newPresetName}
                              onChange={(e) => setNewPresetName(e.target.value)}
                              maxLength={20}
                              className="dc-ctrl--field"
                            />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-dc-label-2 block mb-1.5">行程位置 (mm)</span>
                            {/* ⚠️ width 必须走 inline style：Tailwind 的 w-full 在 @layer utilities 里，
                               打不过 antd 未分层注入的 .ant-input-number{width:90px}（层叠层规则），
                               加 className 是无效的。addonAfter 在 antd v6 已废弃（会打 warning，
                               还多套一层灰底盒子）；单位改用 suffix —— 单个盒子，且 label 里已有 (mm)。 */}
                            <InputNumber
                              min={0}
                              max={800}
                              value={newPresetMm}
                              onChange={(v) => setNewPresetMm(v || 0)}
                              style={{ width: "100%" }}
                              placeholder="0 ~ 800"
                              suffix="mm"
                              className="dc-ctrl--field"
                            />
                          </div>
                        </div>
                      </Modal>

                      {/* 底部的两个温湿度/CO2 传感器 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* 温湿传感器卡片 */}
                        <ImmersiveCard className="dc-rise dc-hoverable p-4 rounded-dc-shell flex flex-col justify-between transition-[box-shadow,border-color,transform] duration-200 ease-out hover:brightness-[1.02] hover:-translate-y-0.5">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex items-center gap-3">
                              <IconThermometer className="size-6 shrink-0 dc-iic text-dc-brand-ink" strokeWidth={1.8} />
                              <div>
                                <h3 className="font-semibold text-base text-dc-label leading-tight">温湿度传感器</h3>
                                <span className="text-sm text-dc-label-3 block mt-1 leading-tight">实时读数大棚环境温湿度数据</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={cn(
                                  "text-sm font-medium inline-flex items-center gap-1.5",
                                  connectionStatus.connected ? "text-dc-ok-ink" : "text-dc-bad-ink"
                                )}
                              >
                                <span className="size-1.5 rounded-full bg-current" />
                                {connectionStatus.connected ? "在线" : "离线"}
                              </span>
                              <Switch defaultChecked className="dc-ctrl--track dc-ctrl--press" />
                            </div>
                          </div>

                          <div className="flex gap-8 mt-3">
                            <div>
                              <span className="text-sm text-dc-label-3 block font-medium">温度</span>
                              <span className="text-xl leading-tight font-semibold text-dc-label font-mono tabular-nums">
                                {greenhouseMetrics.temp} <span className="text-sm font-normal text-dc-label-3">°C</span>
                              </span>
                            </div>
                            <div>
                              <span className="text-sm text-dc-label-3 block font-medium">湿度</span>
                              <span className="text-xl leading-tight font-semibold text-dc-label font-mono tabular-nums">
                                {greenhouseMetrics.humidity} <span className="text-sm font-normal text-dc-label-3">%</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-end pt-2 border-t border-dc-line mt-2">
                            <button onClick={() => toast.info('数据详情加载中...')} className="dc-hoverable text-sm text-dc-brand-ink hover:underline font-medium flex items-center gap-1">
                              <span>查看详情</span>
                              <IconArrowRight className="size-4 dc-nudge" />
                            </button>
                          </div>
                        </ImmersiveCard>

                        {/* CO2 传感器卡片 */}
                        <ImmersiveCard className="dc-rise dc-hoverable p-4 rounded-dc-shell flex flex-col justify-between transition-[box-shadow,border-color,transform] duration-200 ease-out hover:brightness-[1.02] hover:-translate-y-0.5">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex items-center gap-3">
                              <IconCpu className="size-6 shrink-0 dc-iic text-dc-brand-ink" strokeWidth={1.8} />
                              <div>
                                <h3 className="font-semibold text-base text-dc-label leading-tight">CO₂ 传感器</h3>
                                <span className="text-sm text-dc-label-3 block mt-1 leading-tight">实时读数大棚内 CO₂ 浓度数据</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={cn(
                                  "text-sm font-medium inline-flex items-center gap-1.5",
                                  connectionStatus.connected ? "text-dc-ok-ink" : "text-dc-bad-ink"
                                )}
                              >
                                <span className="size-1.5 rounded-full bg-current" />
                                {connectionStatus.connected ? "在线" : "离线"}
                              </span>
                              <Switch defaultChecked className="dc-ctrl--track dc-ctrl--press" />
                            </div>
                          </div>

                          <div className="mt-3">
                            <span className="text-sm text-dc-label-3 block font-medium">CO₂ 浓度</span>
                            <span className="text-xl leading-tight font-semibold text-dc-label font-mono tabular-nums">
                              {greenhouseMetrics.co2} <span className="text-sm font-normal text-dc-label-3">ppm</span>
                            </span>
                          </div>

                          <div className="flex justify-end pt-2 border-t border-dc-line mt-2">
                            <button onClick={() => toast.info('数据详情加载中...')} className="dc-hoverable text-sm text-dc-brand-ink hover:underline font-medium flex items-center gap-1">
                              <span>查看详情</span>
                              <IconArrowRight className="size-4 dc-nudge" />
                            </button>
                          </div>
                        </ImmersiveCard>

                      </div>

                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* ======================================================== */}
              {/*                    右侧侧边栏综合看板                      */}
              {/* ======================================================== */}
              <div className="w-full xl:w-80 shrink-0 space-y-4 xl:self-start xl:sticky xl:top-6">
                
                {/* 1. 当前地区天气（真实 /api/weather）
                    沉浸光感材质（HDS 内容区 REGULAR 档）：
                      · 材质本体保持中性，天气色只作「局部光源」从玻璃下透出，不整块刷色；
                      · .dc-wx-frost 用 backdrop-blur 采集下方光影，.dc-wx-aura 提供天气光源；
                      · 磨砂由表面的 .dc-wx-grain 颗粒表达（透过去是糊的，表面是颗粒的）；
                      · 文字走 --dc-* token（亮态深字 / 暗态浅字）= HDS 智能反色。
                    版式：层级靠留白 + hairline 分隔线，不套任何内嵌容器。
                    ⚠️ 不要在卡片外铺「氛围光」层：溢出卡片的部分没被模糊，会直接暴露成一块
                       突兀的圆角色斑（曾这么做过，实测极丑）。 */}
                {/* 不传 tint：HDS 材质本体保持中性，天气色只由图标承载（官方示例同样如此）。
                    之前给卡片刷环境色 + 打光斑，正是「拟物化」的一部分。 */}
                <ImmersiveCard
                  className="dc-weather-card dc-rise select-none rounded-dc-shell"
                  data-dc-weather-card
                >

                  {/* 内容层：层级靠「留白 + hairline 分隔线」，不套任何内嵌容器 */}
                  <div className="p-5 flex flex-col gap-4">
                    {/* 头部：天气图标（唯一明确色彩点，取条件色）+ 条件 / 日期 · 定位 */}
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <WeatherIcon size={19} strokeWidth={1.8} color={weatherVisual.accent} />
                          <span className="text-[15px] font-medium text-dc-label truncate leading-tight">
                            {weather.condText}
                          </span>
                        </div>
                        <span className="text-xs dc-wx-dim block mt-1.5 tabular-nums truncate">
                          {weather.dateStr}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 pt-0.5 max-w-[45%]">
                        <IconLocalPin size={12} strokeWidth={2} className="dc-wx-dim shrink-0" />
                        <span className="text-xs text-dc-label-2 truncate">{weather.location}</span>
                      </div>
                    </div>

                    {/* 主温度 + 更新时间 */}
                    <div className="flex items-end justify-between gap-3">
                      <div className="flex items-start">
                        <span
                          className="text-[46px] font-light leading-none tabular-nums text-dc-label"
                          style={{ letterSpacing: "-0.035em" }}
                        >
                          {weather.temp}
                        </span>
                        <span className="text-base font-light leading-none mt-1.5 text-dc-label-2">°C</span>
                      </div>
                      <span className="text-xs dc-wx-dim pb-1 shrink-0 tabular-nums">
                        更新 {weather.timeStr}
                      </span>
                    </div>

                    {/* 温度区间条：最低 → 最高 + 当前温度指示点 */}
                    <div>
                      <div className="dc-wx-range">
                        <div className="dc-wx-range-fill" style={{ width: `${tempRangePos}%` }} />
                        <span className="dc-wx-range-dot" style={{ left: `${tempRangePos}%` }} data-dc-weather-dot />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs dc-wx-dim tabular-nums">最低 {weather.lo}°</span>
                        <span className="text-xs dc-wx-dim tabular-nums">最高 {weather.hi}°</span>
                      </div>
                    </div>

                    <div className="dc-wx-line" />

                    {/* 指标区：2×2 无容器网格（图标 + 文字直接落在玻璃上） */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {[
                        { label: "空气湿度", val: weather.humidity, icon: IconWater },
                        { label: "风速", val: weather.wind, icon: IconWind },
                        { label: "大气压强", val: weather.pressure, icon: IconCompass },
                        { label: "风向", val: weather.windDir, icon: IconNavigation },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2 min-w-0" data-dc-weather-chip>
                          <span className="shrink-0 dc-wx-dim flex items-center">
                            <item.icon size={15} strokeWidth={1.7} />
                          </span>
                          <div className="min-w-0">
                            {/* 字号下限 12（HDS Caption_M）：此前 11px 落在规范之外，
                                且与同屏 12/14 的文字不成档位 → 右栏读起来「字很多、都很小」。 */}
                            <div className="text-xs dc-wx-dim leading-tight truncate">{item.label}</div>
                            <div className="text-sm font-medium text-dc-label leading-tight mt-0.5 truncate tabular-nums">
                              {item.val}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ImmersiveCard>

                {/* 2. 大棚环境参数网格 */}
                {/* 一层容器：只留外层卡。卡内是「无容器 2×2 网格」——
                    图标直接用度量身份色（与传感器卡同色），hairline 画十字分隔，
                    没有灰底格、也就不存在「圆角矩形套圆角矩形」。 */}
                <ImmersiveCard className="dc-rise dc-hoverable p-4 rounded-dc-shell" style={{ animationDelay: "120ms" }}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-dc-label">大棚环境参数</h3>
                    <Link href="/monitor" className="dc-hoverable text-sm font-medium text-dc-brand-ink hover:text-dc-brand-strong flex items-center gap-1 shrink-0 transition-colors">
                      <span>查看详情</span>
                      <IconArrowRight className="size-4 dc-nudge" />
                    </Link>
                  </div>

                  <div className="dc-plain-grid mt-2 grid grid-cols-2">
                    {[
                      { name: "室内温度", val: `${greenhouseMetrics.temp} °C`, icon: IconThermometer, type: "temperature" },
                      { name: "室内湿度", val: `${greenhouseMetrics.humidity} %`, icon: IconWater, type: "humidity" },
                      { name: "CO₂ 浓度", val: `${greenhouseMetrics.co2} ppm`, icon: IconCpu, type: "co2" },
                      { name: "光照强度", val: `${greenhouseMetrics.light} lux`, icon: IconSun, type: "light" },
                    ].map((metric, i) => (
                      <div key={metric.name} style={{ animationDelay: `${i * 45}ms` }} className="dc-rise flex items-center gap-2.5">
                        {/* 图标统一中性灰（2026-10）：物理量本来就靠「图标形状 + 文字标签」区分，
                            不靠颜色。此前这里四个图标是品牌绿 —— 与设备卡的绿图标、状态绿点、
                            开关绿叠在同一屏，强调色彻底失效。绿只留给「可操作 / 在线 / 开着」。 */}
                        <metric.icon className="size-4 shrink-0 dc-iic text-dc-label-3" strokeWidth={1.9} />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs text-dc-label-3 block truncate">{metric.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm font-semibold text-dc-label shrink-0 tabular-nums">{metric.val}</span>
                            {/* 数字只回答「现在是多少」，走势才回答「在往哪走」——
                                这条 sparkline 是原先只锁在 AI 助手/仪表盘里的可视化能力下沉到业务页。 */}
                            <SensorSparkline
                              type={metric.type}
                              range="7h"
                              className="h-3.5 flex-1 min-w-[30px] text-dc-brand-ink"
                              ariaLabel={`${metric.name}近 7 小时走势`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ImmersiveCard>

              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ===== AI 助手侧栏（复用 ai-assistant 的对话组件，欢迎词按页面区分）===== */}
      <CopilotSidebar
        pageKey="device-control"
        dark={isDark}
        clientTools={deviceAccessClientTools}
        deviceData={(deviceData ?? null) as unknown as Record<string, unknown> | null}
        context={() => {
          const lines: string[] = ["页面：设备控制（/device-control）"]
          lines.push(`当前子页签：${activeSubTab === 'control' ? '设备控制' : '设备总览'}`)
          lines.push(`已接入设备：${devices.length} 台`)

          // 🚨 设备清单必须与「设备管理」弹窗 / /api/devices 注册表同源。
          // 此处曾有 relay5-8 的硬编码设备名映射，导致注册表改名/增删后
          // AI 助手仍按旧名字回答（用户 2026-09-21 反馈要「全局同步包括 ai 助手」）。
          const relays = devices.filter(d => d.type === 'relay')
          if (relays.length > 0) {
            lines.push("【设备清单（来源：设备注册表）】")
            const raw = (deviceData ?? {}) as unknown as Record<string, number>
            for (const d of relays) {
              const rn = d.config?.relay_num
              const state = typeof rn === 'number'
                ? ((raw[`relay${rn}`] || 0) === 1 ? "开启" : "关闭")
                : "状态未知"
              lines.push(`- ${d.name}${typeof rn === 'number' ? `（relay${rn}）` : ''}：${state}${d.is_critical ? '（关键设备）' : ''}`)
            }
          } else if (deviceData) {
            lines.push("【设备清单】注册表为空，暂用出厂默认通道 relay5-8")
          }

          const others = devices.filter(d => d.type !== 'relay')
          if (others.length > 0) {
            lines.push("【其他设备】" + others.map(d => `${d.name}(${d.type})`).join('、'))
          }

          if (deviceData) {
            const t = Number(deviceData.temperature)
            const h = Number(deviceData.humidity)
            if (Number.isFinite(t)) lines.push(`当前温度：${t.toFixed(1)}℃`)
            if (Number.isFinite(h)) lines.push(`当前湿度：${h.toFixed(1)}%`)
          } else {
            lines.push("【环境数据】暂未上报")
          }

          lines.push(`【RGB 补光】R${r} G${g} B${b} W${w}`)
          if (connectionStatus) lines.push(`连接状态：${typeof connectionStatus === 'string' ? connectionStatus : JSON.stringify(connectionStatus)}`)

          /**
           * 🚨 让 Copilot 看见「用户此刻正在填哪张表、第几步、填了什么」。
           * 它看不见表单就只能凭对话记忆猜 —— 猜错的表现就是把他已经改好的值又覆盖回去（乱填）。
           * 这里只给一行现状，细节让模型用 device_form_read 自己拉。
           */
          const formLine = describeActiveForm()
          if (formLine) lines.push(formLine)

          // 🚨 第三方硬件接入：模型光看工具清单不一定知道「什么时候该动手」，
          // 这里明确触发条件与边界（只预填、不落库），否则它会退化成写一段教程让用户自己配。
          lines.push(
            "【第三方硬件接入】用户说「想接入 / 新增 / 接一个第三方设备」（传感器、开关、PLC、电表、网关…）时：" +
              "① 先用 device_access_catalog 看清平台支持哪些协议、每个协议要填什么、已有哪些连接；" +
              "② 只问真正缺的信息（协议类型、地址、上报字段、密码由用户自己在表单里填），别一次抛十个问题；" +
              "③ 用户还没打开表单 → 调 device_access_apply_draft 把完整方案灌进「接入向导」并弹出；" +
              "用户已经打开表单（见上方「用户正在填的表单」）→ 改用下面这条增量通道。"
          )
          lines.push(
            "【帮用户填表】用户说「帮我填 / 这个怎么填 / 还差什么 / 你看我填的对不对」时：" +
              "① 先 device_form_read 看清他在第几步、已填了什么、还缺什么必填项；" +
              "② 再 device_form_patch **只补他缺的那几格**（它是增量的，不会覆盖用户已改的值）—— " +
              "⛔ 不要用 device_access_apply_draft 去改一张用户已经填了一半的表，那会整包重置；" +
              "③ 填完用一两句话说明你填了什么、还缺什么（缺的写明白，不要替用户编密码/序列号）。" +
              "没打开任何表单时，先引导他去「设备管理 → 接入向导 / 新增设备」把表打开。"
          )
          return lines.join("\n")
        }}
      />

      {/* 设备管理弹窗：设备注册表的唯一管理入口（写操作全局广播 → AI 助手同步） */}
      <DeviceManagerDialog open={deviceManagerOpen} onOpenChange={setDeviceManagerOpen} />
    </ConfigProvider>
  )
}

/**
 * 模型给的 `kind` 可能是拼错的、空的、或带空格 —— 只认三个合法值，其余一律当「不指定」
 * （不指定 = 由注册表按优先级选用户此刻正在填的那张表），绝不抛错。
 */
function normalizeFormKind(v: unknown): FormKind | undefined {
  const s = typeof v === 'string' ? v.trim() : ''
  return s === 'access-wizard' || s === 'access-connection' || s === 'device-registry' ? s : undefined
}

// ==================== 静态依赖配置 ====================
/**
 * 出厂默认继电器通道（relay5-8）。
 * 🚨 仅作 legacy 兜底：设备注册表（/api/devices）非空时，页面一律以注册表为准
 * （卡片、设备分组、统计、AI 助手上下文全部走注册表）。
 * 新设备请到「设备管理」弹窗里新增，不要再往这里加。
 */
const DEVICES_CONFIG_LOCAL = [
  { key: 5, title: "水泵系统", isCritical: true },
  { key: 6, title: "通风风扇", isCritical: false },
  { key: 7, title: "全光谱补光灯", isCritical: false },
  { key: 8, title: "辅助补光灯", isCritical: false },
]