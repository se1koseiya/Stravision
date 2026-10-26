/**
 * 沉浸光感材质 —— HDS（HarmonyOS Design System · 组件材质）的 Web 落地
 * 规范：developer.huawei.com/consumer/cn/doc/harmonyos-guides/ui-design-hds-component-material
 *
 * 官方只有两条轴，这里一一对应，不做发明：
 *
 * ── 轴 1：materialType（材质类型）──
 *    NONE / ADAPTIVE / IMMERSIVE。规范推荐 ADAPTIVE（交给系统按设备能力决定）。
 *    Web 端没有「系统材质」，等价物就是「有 backdrop-filter 支持 → 用材质；
 *    不支持 → 退回实色底」。本文件的 SMOOTH 档即承担这个降级。
 *
 * ── 轴 2：materialLevel（材质等级）+ ImmersiveStyle（档位）──
 *    MaterialLevel = EXQUISITE / GENTLE / SMOOTH / ADAPTIVE（性能档，见下方自适应）
 *    档位按「这个表面压在多少内容之上」选，越厚越实（越不透明、模糊越强）：
 *      THIN        顶部 / 侧边悬浮导航；以及卡片内部的小控件
 *      REGULAR     内容区卡片、面板（默认档）
 *      THICK       聚合面板 / 工具条（承载多行内容，需要更实的底保证可读）
 *      ULTRA_THICK 弹层、菜单、对话框（几乎不透明，保证可读性）
 *
 * ── 材质本体 = 四件套 + 光感 ──
 *    半透明底 + 背景模糊 + 1px 细边 + 柔和阴影；再叠两样「光」：
 *      · backdrop-filter 里的 saturate()/brightness() —— 把背后的色光吸上来（官方 materialFilter）
 *      · --mat-edge 内缘光 —— 环境光沿边缘柔和流转，勾勒层次
 *    仍**不做**的两样：「厚度渐变 / 表面颗粒」（模拟实体玻璃的拟物细节，界面会发假）
 *    和「位移折射」（Web 上只能做出灰膜，试过已回滚，见 immersive-card.tsx 顶部注释）。
 *
 * ── 自适应 与 用户自选（两条路，见下方 MATERIAL_LEVEL_* 常量）──
 *    规范依据：「不支持 IMMERSIVE 时降级 SMOOTH，降低卡顿与发热风险」。
 *    exquisite → 满配（×1）
 *    gentle    → 模糊半径 ×.78（中端设备）
 *    smooth    → 模糊半径 ×.2（≈6px）（低端设备 / 无 backdrop-filter / 用户开启「减弱透明度」）
 *    ⚠️ 三档**只缩模糊半径**（真正的性能开销就在这），saturate / brightness 是「光感」本体，
 *       任何档位都保留 —— 官方对 SMOOTH 的定义也正是「在延续沉浸光感基调的同时，适度收敛光彩」。
 *       （本文件早期注释曾写「smooth 取消饱和度增益」，实现里从来没有过，属文档漂移，2026-09-26 更正。）
 *    等级来源两条：
 *      ① 设备能力探测 + 首屏帧预算看门狗（跑不动就自动降一档）—— 用户没选过时走这条；
 *      ② 用户在「设置 → 外观 → 沉浸光感 · 材质厚度」里显式选的档位 —— 选了就固定，看门狗不再插手。
 *    排障：URL 上加 ?mat=exquisite|gentle|smooth 或 localStorage 写 dc-mat-level 可强制指定，
 *          优先级高于用户偏好，用于验收取证。
 */

export type MaterialGrade = "thin" | "regular" | "thick" | "ultra"

export type MaterialLevel = "off" | "exquisite" | "gentle" | "smooth"

/* ── 用户偏好：沉浸光感的「开关」与「厚度」（2026-09-26 用户要求）──
   三档厚度就是官方 MaterialLevel 的三档，中文名按「厚度」的直觉命名（由薄到厚）：
     smooth    流畅   模糊半径 ×.2     最薄，几乎不耗性能
     gentle    轻柔   模糊半径 ×.78    中档
     exquisite 精美   满配（×1）       最厚
   外加一个**不属于厚度序列**的 off（关闭）：退出材质体系，全站不再有任何 backdrop-filter，
   HDS 材质系底色换实色。UI 上它是设置面板里的独立开关，不是第四张厚度卡（见下方 CSS 里的 off 段）。

   ⚠️ 与「自动自适应」的分工（这条是本次设计的核心，别改错）：
     · 用户**没选过** → 走自动探测（设备能力 + 帧预算看门狗），与以前完全一致；
     · 用户**选过**   → 该档位固定，看门狗不再降档。
       显式选择必须被尊重 —— 否则用户选了「精美」、转身看见它自己跳回「流畅」，
       等于"给了选项却不能用"，比不给还糟。
   ⚠️ 为什么不复用 dc-mat-level：那个 key 是排障/验收用的强制覆盖（与 ?mat= 同级，
      见 readForcedLevel），和用户偏好混进同一个命名空间会让"这档到底是谁定的"说不清。
      两者优先级：?mat= / 排障键 > 用户偏好 > 自动探测。 */
export const MATERIAL_PREF_KEY = "stravision.material.level"
/** 用户换档时广播：设置弹窗 → 页面上的 hook 实例（同页多实例一起同步） */
export const MATERIAL_PREF_EVENT = "berry:material-level"
/**
 * 三档「厚度」的呈现顺序（由薄到厚）—— 设置弹窗里的材质厚度卡片按它渲染。
 * ⚠️ 不含 off：「关闭」不是一个"更薄的厚度"，而是**退出材质体系**，
 *    在 UI 上是设置面板里那个独立的开关（GreenSwitch），不在这一排卡片里。
 */
export const MATERIAL_LEVEL_ORDER: readonly MaterialLevel[] = ["smooth", "gentle", "exquisite"]
export const MATERIAL_LEVEL_LABEL: Record<MaterialLevel, string> = {
  off: "关闭",
  smooth: "流畅",
  gentle: "轻柔",
  exquisite: "精美",
}
export const MATERIAL_LEVEL_DESC: Record<MaterialLevel, string> = {
  off: "不用毛玻璃，表面回到纯色",
  smooth: "模糊最轻、开销最低",
  gentle: "通透与流畅兼顾",
  exquisite: "完整模糊与光感",
}

/** 各档位语义（放进 className 用：`dc-mat--regular`） */
export const GRADE_CLASS: Record<MaterialGrade, string> = {
  thin: "dc-mat--thin",
  regular: "dc-mat--regular",
  thick: "dc-mat--thick",
  ultra: "dc-mat--ultra",
}

/* ==========================================================================
   语义材质（TINTED MATERIAL）—— 2026-09-27 新增
   ── 由来 ──
     用户要求「警示颜色以材质来做」（离线提示条）。也就是说：不要再往材质上叠一层
     不透明的彩色覆盖层（那是"贴色块"，不是材质），而是**把语义色做进材质本体** ——
     底色、边缘光、外投影全部带色，让它读起来是"一块被警示光染透的介质"。

   ── 关键：语义色不能只染 --mat-bg ──
     只染底色会得到一块"脏色玻璃"：受光边仍是白色（白边压在琥珀底上 = 一圈违和的亮线），
     外投影仍是中性黑（少一层"自己发着光"的感觉）。
     所以语义材质是**三件一起换**（这才是 HDS 材质的完整四件套语义）：
       底色 --mat-bg      → 语义色低 alpha
       受光边 --mat-edge  → 语义色高 alpha（"环境光沿边缘流转"里那束光本身带色）
       外投影 --mat-shadow→ 语义色中 alpha（材质**自己发光**，不是被黑布托着）

   ── 为什么 alpha 必须压得很低（.06 ~ .10）──
     本条压在**近白画布**上（--berry-canvas #F7F7F8）。
     在"底已经很浅"时叠色，方向必须成立：低 alpha 语义色叠上去只把底**略微推深、推色**，
     而 12% 以上的琥珀会直接烧成一块脏米黄（用户此前否掉的那类颜色）。
     判据：合成后应当仍是一块"能透出画布氛围柔光"的介质，而不是一块实心色板。
     ⚠️ 这也是为什么不能靠"降不透明度"来换通透 —— 语义材质的通透来自**底 alpha 低**，
        不来自"元素整体 opacity 低"（后者会把文字一起减淡）。

   ── 深色态 ──
     暗底永远叠白/叠亮色（同 .dc-mat 体系），且 alpha 要比亮态**更低**
     —— 暗色画布本身深，同样的 alpha 合成后色浓得多。
   ========================================================================== */
/** 语义色调：只给「色相 + 明度」这两件事，alpha 由每个档位自己定 */
type SemanticTint = { r: number; g: number; b: number }
const TINT_AMBER: SemanticTint = { r: 217, g: 119, b: 6 }   /* 离线 / 警示 */
const TINT_RED: SemanticTint = { r: 220, g: 38, b: 38 }     /* 危险 / 故障 */
const TINT_EMERALD: SemanticTint = { r: 5, g: 150, b: 105 } /* 已恢复 / 正常 */

const rgba = (c: SemanticTint, a: number) => `rgba(${c.r},${c.g},${c.b},${a})`

/**
 * 语义材质档位类 —— 用法：`<ImmersiveCard className="dc-mat--tint-warn">`
 * ⚠️ 必须与某个厚度档位类**同时**使用（thin/regular/thick）：
 *    本类只覆盖 --mat-bg / --mat-edge / --mat-shadow 三个变量，
 *    模糊半径（--mat-blur）等仍由厚度档位提供 —— 这是"语义色"与"厚度"两条轴的分工。
 *    单独挂 = 拿不到 blur/sat/bright（会退回基类默认值，不是透明，但厚度不受控）。
 */
export const SEMANTIC_TINT_CSS = `
.dc-mat--tint-warn{
  --mat-bg: ${rgba(TINT_AMBER, .10)};
  --mat-border: ${rgba(TINT_AMBER, .26)};
  --mat-edge:
    inset 0 0 1px ${rgba(TINT_AMBER, .30)},
    inset 0 1px 0 ${rgba(TINT_AMBER, .26)},
    inset 0 0 22px -10px ${rgba(TINT_AMBER, .22)};
  --mat-shadow:
    0 4px 16px -8px ${rgba(TINT_AMBER, .38)},
    0 1px 2px rgba(0,0,0,.04);
}
.dc-mat--tint-danger{
  --mat-bg: ${rgba(TINT_RED, .10)};
  --mat-border: ${rgba(TINT_RED, .26)};
  --mat-edge:
    inset 0 0 1px ${rgba(TINT_RED, .28)},
    inset 0 1px 0 ${rgba(TINT_RED, .24)},
    inset 0 0 22px -10px ${rgba(TINT_RED, .20)};
  --mat-shadow:
    0 4px 16px -8px ${rgba(TINT_RED, .36)},
    0 1px 2px rgba(0,0,0,.04);
}
.dc-mat--tint-ok{
  --mat-bg: ${rgba(TINT_EMERALD, .09)};
  --mat-border: ${rgba(TINT_EMERALD, .24)};
  --mat-edge:
    inset 0 0 1px ${rgba(TINT_EMERALD, .28)},
    inset 0 1px 0 ${rgba(TINT_EMERALD, .24)},
    inset 0 0 22px -10px ${rgba(TINT_EMERALD, .20)};
  --mat-shadow:
    0 4px 16px -8px ${rgba(TINT_EMERALD, .34)},
    0 1px 2px rgba(0,0,0,.04);
}
/* —— 深色态：alpha 全面压到亮态的 ~55%，并靠 brightness 抬亮（暗底的光感来自这里）—— */
.dark .dc-mat--tint-warn{
  --mat-bg: ${rgba(TINT_AMBER, .10)};
  --mat-border: ${rgba(TINT_AMBER, .22)};
  --mat-bright: 1.12;
  --mat-edge:
    inset 0 0 1px ${rgba(TINT_AMBER, .26)},
    inset 0 1px 0 ${rgba(TINT_AMBER, .20)},
    inset 0 0 22px -10px ${rgba(TINT_AMBER, .20)};
  --mat-shadow:
    0 4px 18px -8px ${rgba(TINT_AMBER, .34)},
    0 1px 2px rgba(0,0,0,.30);
}
.dark .dc-mat--tint-danger{
  --mat-bg: ${rgba(TINT_RED, .12)};
  --mat-border: ${rgba(TINT_RED, .24)};
  --mat-bright: 1.10;
  --mat-edge:
    inset 0 0 1px ${rgba(TINT_RED, .26)},
    inset 0 1px 0 ${rgba(TINT_RED, .20)},
    inset 0 0 22px -10px ${rgba(TINT_RED, .20)};
  --mat-shadow:
    0 4px 18px -8px ${rgba(TINT_RED, .34)},
    0 1px 2px rgba(0,0,0,.30);
}
.dark .dc-mat--tint-ok{
  --mat-bg: ${rgba(TINT_EMERALD, .11)};
  --mat-border: ${rgba(TINT_EMERALD, .22)};
  --mat-bright: 1.14;
  --mat-edge:
    inset 0 0 1px ${rgba(TINT_EMERALD, .26)},
    inset 0 1px 0 ${rgba(TINT_EMERALD, .20)},
    inset 0 0 22px -10px ${rgba(TINT_EMERALD, .20)};
  --mat-shadow:
    0 4px 18px -8px ${rgba(TINT_EMERALD, .32)},
    0 1px 2px rgba(0,0,0,.30);
}
`

export const MATERIAL_CSS = `
/* ==========================================================================
   HDS 沉浸光感材质（唯一来源）—— HarmonyOS Immersive Light 的 Web 复刻
   规范：developer.huawei.com/consumer/cn/doc/harmonyos-guides/ui-design-hds-component-material
        + 官方最佳实践《HarmonyOS 沉浸光感最佳实践：双轨适配打造空间化沉浸式界面》

   ── 官方六特性 → 本文件的对应实现 ──
     ① 通透材质     背景毛玻璃、内容隐约可见   → --mat-bg 低 alpha + --mat-blur
     ② 渐变模糊     随滑动从透明到模糊         → 页面 .dc-grid-scroll[data-scroll-edge]（scrollEffectOpts 等价）
     ③ 按压弹性反馈 按压弹性缩放               → ImmersiveCard 的 framer-motion spring
     ④ 按压点光源   触点光晕扩散               → ImmersiveCard 的 .dc-imv-glow
     ⑤ 材质流光     表面细微流光               → ❌ 试过已删（hover 扫光太抢眼，用户要求去掉）
     ⑥ 智能反色     前景色自动适配可读性       → 页面 --dc-* 双态 token

   ── 「光感」的技术核心 = materialFilter ──
     官方原文：「光线在介质表面发生折射与漫反射」「光感穿越层级，在层级间柔和漫溢」
     「环境光沿边缘柔和流转，自然勾勒层次」。
     也就是说：材质必须**把背后的光吸上来**，而不是盖一层灰白板。
     Web 等价物 = backdrop-filter 里的 saturate()（放大背后色光）+ brightness()（抬升亮度）
              + 内缘光（box-shadow inset）。
     ⚠️ 最关键的一条：底色 alpha 必须低。alpha 一高（曾用 .58 白），背后色光在数学上被冲淡，
        实测色度透传倍率只有 0.53 —— 卡片比画布还寡淡，这就是「不像沉浸光感」的根因。
     实测目标：色度透传倍率 > 1（亮）/ > 1.4（暗），材质亮度高于相邻背景（光感抬升 > 0），
              边缘 1px 亮度 > 内部（有边缘光）。

   ── 档位分级（官方：按组件压在多少内容之上决定厚度）──
     THIN 顶部/侧边悬浮导航 · REGULAR 内容区卡片 · THICK 聚合面板/滚动容器 · ULTRA 弹层
     越厚 → 模糊越强、底色越实（可读性优先）。
     **控件另立一档**（.dc-ctrl--field/--popup/--track，见文件下半部的「控件材质」）：
     控件压在**卡片**之上（而不是画布），要能让卡片的色光继续透上来，所以 alpha 更低。

   ── 等级写在 <html data-mat-level> 上 ──
     antd 的 Modal / Select / Tooltip 是 portal 到 body 的，只认 html 上的继承。
   ========================================================================== */
/* 材质本体：.dc-mat 显式类 / .dc-glass 页面既有 40+ 处 / .dc-imv 沉浸卡组件，
   三者读同一组 --mat-* 变量 —— 挂档位类、改等级对三者同时生效。
   不带档位类时 fallback = REGULAR 默认值。

   ⚠️ 2026-09-26：档位类**也进这一组**（与 .dc-ctrl 系一致）。
      踩过的坑：只写 .dc-mat--regular 而不挂 .dc-mat 时，元素**一个材质属性都拿不到**
      —— bg 全透明、没有 backdrop-filter，看起来像"材质没生效"，而 CSS 不报错、
      DevTools 里也只是一条不匹配的规则。做「材质厚度预览卡」时正是这么翻的车
      （三张预览卡全透明 → 三档看起来一模一样）。
      现在两种写法都成立：「.dc-mat--regular 单独用」=「.dc-mat .dc-mat--regular」。
      档位类只声明变量、体属性仍由本规则统一消费，所以并列进来不会造成值冲突。 */
.dc-mat, .dc-mat--ultra-thin, .dc-mat--thin, .dc-mat--regular, .dc-mat--thick, .dc-mat--ultra, .dc-glass, .dc-imv{
  /* 低 alpha：让背后的光透上来（这是「通透材质」的本体，不是可选项） */
  background-color: var(--mat-bg, rgba(255,255,255,.34));
  -webkit-backdrop-filter: blur(calc(var(--mat-blur, 30px) * var(--dc-mat-scale, 1))) saturate(var(--mat-sat, 1.60)) brightness(var(--mat-bright, 1.03)) contrast(var(--mat-cont, 1.02));
  backdrop-filter: blur(calc(var(--mat-blur, 30px) * var(--dc-mat-scale, 1))) saturate(var(--mat-sat, 1.60)) brightness(var(--mat-bright, 1.03)) contrast(var(--mat-cont, 1.02));
  border: 1px solid var(--mat-border, rgba(255,255,255,.52));
  /* 「环境光沿边缘柔和流转」：外阴影负责浮起，内缘光负责受光。
     上缘最亮（受光面）+ 四周一层极软内辉（光在介质里漫反射）——不是硬描边。 */
  --mat-edge: inset 0 0 1px rgba(255,255,255,.62), inset 0 1px 0 rgba(255,255,255,.58), inset 0 0 24px -10px rgba(255,255,255,.40);
  box-shadow: var(--mat-shadow, 0 1px 2px rgba(0,0,0,.03), 0 10px 28px -14px rgba(0,0,0,.10)), var(--mat-edge);
}
/* —— 档位：只声明变量，材质属性由上面那条基类规则统一消费 —— */
/* —— Ultra_Thin（HDS 五档之①）：顶部悬浮区专用 ——
   规范原文：「组件在顶部悬浮时推荐 ULTRA_THIN，并结合渐变蒙层延展顶部内容展示空间」。
   它的职责不是「承载内容」，而是**让内容从顶部自然地消失**：极低 alpha + 极轻模糊 +
   向下的渐变蒙版（见 app/globals.css 的 .top-scrim）。所以这里刻意**不给投影、不给受光边**
   —— 一旦有边缘，它就从「雾」变成「一条带子」。 */
.dc-mat--ultra-thin{
  --mat-blur: 12px; --mat-sat: 1.55;
  --mat-bg: rgba(255,255,255,.14);
  --mat-bright: 1.0; --mat-cont: 1.0;
  --mat-border: transparent;
  --mat-shadow: none;
  --mat-edge: none;
}
.dark .dc-mat--ultra-thin{
  --mat-bg: rgba(255,255,255,.04);
  --mat-border: transparent;
  --mat-bright: 1.30;
}
.dc-mat--thin{
  --mat-blur: 16px; --mat-sat: 1.55;
  --mat-bg: rgba(255,255,255,.24);
  --mat-bright: 1.02; --mat-cont: 1.01;
  --mat-border: rgba(255,255,255,.40);
  --mat-shadow: 0 1px 2px rgba(0,0,0,.03);
}
.dc-mat--regular{
  --mat-blur: 30px; --mat-sat: 1.60;
  --mat-bg: rgba(255,255,255,.34);
  --mat-bright: 1.03; --mat-cont: 1.02;
  --mat-border: rgba(255,255,255,.52);
  --mat-shadow: var(--dc-shadow-card, 0 1px 2px rgba(0,0,0,.03), 0 10px 28px -14px rgba(0,0,0,.10));
}
.dc-mat--thick{
  --mat-blur: 46px; --mat-sat: 1.65;
  --mat-bg: rgba(255,255,255,.46);
  --mat-bright: 1.04; --mat-cont: 1.02;
  --mat-border: rgba(255,255,255,.58);
  --mat-shadow: var(--dc-shadow-card, 0 1px 2px rgba(0,0,0,.03), 0 10px 28px -14px rgba(0,0,0,.10));
}
.dc-mat--ultra{
  --mat-blur: 64px; --mat-sat: 1.70;
  --mat-bg: rgba(255,255,255,.62);
  --mat-bright: 1.05; --mat-cont: 1.03;
  --mat-border: rgba(255,255,255,.66);
  --mat-shadow: var(--dc-shadow-hover, 0 2px 6px rgba(0,0,0,.05), 0 18px 40px -18px rgba(0,0,0,.18));
}
/* 深色态：越厚的档越「叠白」（不是混灰）—— 深色画布上只有叠白才能同时做到「亮一档」且「透」。
   brightness 抬升是暗态「光感」的主要来源：画布越暗，材质越要有「被光照亮」的感觉。 */
.dark .dc-mat--thin{
  --mat-bg: rgba(255,255,255,.05);
  --mat-border: rgba(255,255,255,.10);
  --mat-bright: 1.30;
}
.dark .dc-mat--regular{
  --mat-bg: rgba(255,255,255,.10);
  --mat-border: rgba(255,255,255,.15);
  --mat-bright: 1.35;
}
.dark .dc-mat--thick{
  --mat-bg: rgba(255,255,255,.13);
  --mat-border: rgba(255,255,255,.19);
  --mat-bright: 1.32;
}
.dark .dc-mat--ultra{
  --mat-bg: rgba(66,66,76,.78);
  --mat-border: rgba(255,255,255,.21);
  --mat-bright: 1.16; --mat-sat: 1.70;
}
/* 暗态内缘光：同样「上缘受光 + 四周内辉」，强度按暗底对比调低（否则会像描了白边）。
   ⚠️ 选择器必须与上面那条基类规则**保持同一组**（含四个档位类），
      否则「只挂档位类」的元素在暗态下会留着浅色的内缘光 —— 暗底上一圈惨白描边。 */
.dark .dc-mat, .dark .dc-mat--ultra-thin, .dark .dc-mat--thin, .dark .dc-mat--regular, .dark .dc-mat--thick, .dark .dc-mat--ultra, .dark .dc-glass, .dark .dc-imv{
  --mat-edge: inset 0 0 1px rgba(255,255,255,.26), inset 0 1px 0 rgba(255,255,255,.22), inset 0 0 24px -10px rgba(255,255,255,.13);
}
/* —— 档位扩展：**纯白画布上**的卡片（.dc-mat--neutral）——
   2026-09-26 加。起因：AI 助手页的对话主卡本身是 #fff。
   材质默认策略是「叠白」（HDS 官方：暗底尤其要叠白而不是混灰），这在浅绿/浅灰画布
   （设备页、监控页、看板）上成立 —— 材质比画布亮一档，卡片浮起来。
   但当**画布本身已经是纯白**时，叠白 = 与底同色 → 卡片轮廓消失、只剩一条看不见的白边，
   读起来就是「一片白、什么层次都没有」（用户原话：完全乱套了）。
   这一档给的就是这种场景：改用极淡的**中性灰膜**，保持"比底深一档"的关系，
   backdrop-filter / 受光边 / 投影全部照旧 —— 也就是说，材质感在，轮廓也在。
   深色下自动回到叠白（暗底永远叠白，这条不变）。
   ⚠️ 必须写在 .dc-mat--regular / --thick 之后：同权重下后写的赢，否则被档位默认值盖掉。 */
.dc-mat--neutral{
  --mat-bg: rgba(120,120,128,.07);
  --mat-border: rgba(255,255,255,.62);
}
.dark .dc-mat--neutral{
  --mat-bg: rgba(255,255,255,.10);
  --mat-border: rgba(255,255,255,.15);
  --mat-bright: 1.35;
}

/* ==========================================================================
   沉浸光感 · 场景规范（2026-10-23 定稿 · 全站唯一判据）
   ── 官方原则（HDS 场景规范原文）──
     「在页面中使用沉浸光感，提升页面的精致度和空间感。原则上，当某些界面操作元素
      在交互过程中可能存在与内容区产生重叠情况时，使用沉浸光感效果能够大幅度提高
      页面的视觉体验，强化页面 Z 轴空间感，从纵向空间分离开内容与交互组件，
      使内容更沉浸，交互操作更易读、易用、易感知。」
   ── 一句话落地 ──
     玻璃 = **会与内容重叠的交互层**；内容本身不用玻璃。
     Z 轴三层，从上到下：
       ① 交互层（悬浮/固定/会盖住内容）   → 玻璃（ultra-thin / thin / thick / ultra）
       ② 内容层（卡片、列表、表单、图表） → **实色表面**（.dc-mat--content）
       ③ 画布层                            → 半透明（透出桌面 acrylic / 3D / 视频）
     空间感来自「③ 透 × ② 实 × ① 玻璃」的落差，不是把 ② 也做成玻璃。
   ── 决策表（新组件照着选，不要凭手感）──
     | 元素                                  | 档位              |
     | 顶部悬浮栏 / 顶部渐变蒙层               | ultra-thin + mask |
     | 底部悬浮栏（sender、操作条）            | thin              |
     | 任意位置弹层（Dropdown / Popover / 菜单）| thick             |
     | 半模态 / 弹框 / 侧栏抽屉（内容多）       | ultra（近不透明）  |
     | 悬浮球 / 浮动工具条                     | thick             |
     | 内容卡 / 列表 / 表单 / 图表              | content（实色）    |
   ── 页面审计（2026-10-23）──
     · /device-control 卡 + 右侧面板：背靠 3D 温室，属于「与内容重叠的浮动面板」→ 保留玻璃
     · /monitor        左/右栏：与摄像头画面并排，滚动时重叠 → 保留玻璃
     · /dashboard      小组件网格：纯内容、不浮动 → 应走 content（实色），空间感由画布透出
     · /ai-assistant   对话卡（容器）+ sender（底部悬浮 thin）+ 弹层（ultra）
   ── 禁止 ──
     ⛔ 给纯色画布 + 自绘彩色渐变配玻璃（2026-10-22 已全线撤掉，那不是景）。
     ⛔ 按单个组件调 saturate（曾经 2.05~2.3 各写一套 → 同页卡片与面板偏成两种色）。
   ========================================================================== */

/* 内容层表面（实色）。与 .dc-mat 互斥：挂了这个就不要再挂档位类。
   浅色 = 纯白 + 极淡描边；暗色 = 比画布亮一档的实色（暗底靠抬升出层次，不靠透明度）。 */
.dc-mat--content{
  background-color: var(--surface-card, #FFFFFF);
  border: 1px solid var(--surface-card-line, rgba(15, 23, 42, .06));
  box-shadow: var(--surface-card-shadow, 0 1px 2px rgba(15, 23, 42, .04), 0 12px 28px -22px rgba(15, 23, 42, .35));
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
.dark .dc-mat--content{
  background-color: var(--surface-card, #1A1A1E);
  border-color: var(--surface-card-line, rgba(255, 255, 255, .06));
  box-shadow: var(--surface-card-shadow, 0 1px 2px rgba(0, 0, 0, .35), 0 16px 32px -24px rgba(0, 0, 0, .85));
}

/* ==========================================================================
   场景轴（SCENE）—— 「什么时候该用沉浸光感」的唯一判据（2026-10-22）
   ── 判据只有一句话 ──
     「光感」的技术本体是 backdrop-filter 把**背后的光**吸上来（saturate/brightness）。
     所以只有当卡**背后真的有一片景**时，这套材质才成立：
       · 氛围光      —— 斜向色带 + 径向柔光（设备控制页的 .dc-backdrop）
       · 桌面壁纸    —— 桌面端窗口透传（desktop/main.js 的 acrylic / vibrancy）
       · 真实内容    —— 弹层 / 侧栏压在滚动内容上（走 ULTRA 档与 .dc-glass，**不在此轴上**）
     反面：一屏纯色画布。这时 backdrop-filter 吸不到任何东西 —— 低 alpha 底色叠上去
     只是「比画布略亮的一块板」，卡内色度实测 Δ 常常只有 1~2 级，
     用户读到的就是「灰扑扑一片、什么层次都没有」，同时还白付一次每帧重采样。
   ── 用户判定（2026-10-22 原话）──
     「全站除了设备控制页面不要再用这种渐变背景了……你考量一下什么时候应该用
      沉浸光感套件什么时候不该用」
     → 氛围层收成**白名单**：只有声明了 data-imv-scene="on" 的页面才有；
       其余页面回到 --berry-canvas 中性画布，卡片同时退成**实色表面**（不再是玻璃）。
       两条必须一起改：只删渐变、留着玻璃，卡片会变成一块「没光的淡白板」，比原来更糟。
   ── 为什么写在 html 上 ──
     antd / Radix 的浮层 portal 到 body，只认 html 上的继承（与 data-mat-level 同理）。
     声明入口唯一：components/device/imv-scene.tsx（按路由白名单写 dataset）。
   ── 不在此轴上自觉退出的两类 ──
     · .dc-mat--ultra：弹层悬在任意内容之上，背后永远有内容可透，玻璃成立；
     · .dc-mat--tint-*：语义材质，颜色是信息不是装饰 —— 与 off 档同一条原则，
       绝不能被「实色化」刷掉（用户此前报过「提醒色都没了」）。
   ========================================================================== */
html:not([data-imv-scene="on"]) :is(.dc-mat, .dc-mat--thin, .dc-mat--regular, .dc-mat--thick, .dc-imv):not(.dc-mat--ultra):not(.dc-mat--neutral):not(.dc-mat--tint-warn):not(.dc-mat--tint-danger):not(.dc-mat--tint-ok):not([data-mat-preview]){
  /* 没有景 → 不做介质，做「一张实卡」：实色底 + 1px 细边 + 柔和投影。
     ⚠️ 同时撤掉 backdrop-filter：不只是观感，这一条省掉的是每帧背景重采样。 */
  background-color: var(--dc-solid-card, #fff) !important;
  border-color: var(--dc-solid-line, #e7e7ea) !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
  --mat-edge: inset 0 0 0 0 rgba(0,0,0,0);
}
/* 暗态：卡必须比画布亮一档（暗底上「同色卡」等于没有卡）。
   画布 #09090B~#18181B，卡给 #1F1F24 —— 抬升是暗色层次唯一的来源。 */
html.dark:not([data-imv-scene="on"]) :is(.dc-mat, .dc-mat--thin, .dc-mat--regular, .dc-mat--thick, .dc-imv):not(.dc-mat--ultra):not(.dc-mat--neutral):not(.dc-mat--tint-warn):not(.dc-mat--tint-danger):not(.dc-mat--tint-ok):not([data-mat-preview]){
  background-color: #1F1F24 !important;
  border-color: rgba(255,255,255,.09) !important;
}
/* 纯白画布上的卡（--neutral）：没有景时用浅灰，否则与画布同色、轮廓整片消失。
   写法与 off 档的 ②/②d 保持一致（同权重下后写的赢，所以必须在上面两条之后）。 */
html:not([data-imv-scene="on"]) .dc-mat--neutral:not([data-mat-preview]){
  background-color: var(--dc-solid-muted, #f4f4f5) !important;
  border-color: var(--dc-solid-line, #e7e7ea) !important;
}
html.dark:not([data-imv-scene="on"]) .dc-mat--neutral:not([data-mat-preview]){
  background-color: #26262b !important;
  border-color: rgba(255,255,255,.09) !important;
}

/* —— 材质等级（官方 MaterialLevel）——
   只缩放**模糊半径**（真正的性能开销）；saturate / brightness 是「光感」本体，任何档位都保留 ——
   官方对 SMOOTH 的定义就是「在延续沉浸光感基调的同时，适度收敛光彩」。 */
html[data-mat-level="exquisite"]{ --dc-mat-scale: 1 }
html[data-mat-level="gentle"]{ --dc-mat-scale: .78 }
html[data-mat-level="smooth"]{ --dc-mat-scale: .2 }
html[data-mat-level="off"]{ --dc-mat-scale: 0 }

/* ==========================================================================
   关闭档（2026-09-26 用户要求「还要有一个关闭沉浸光感的按钮」）
   ── 「关闭」不是「厚度调到 0」──
     只把 --dc-mat-scale 归零，材质底色还留着 .24~.62 的半透明 —— 背后内容清清楚楚地
     透上来、文字压在花纹上，比开着的时候更难看。所以关闭档做两件事：
       ① 全站不再有任何 backdrop-filter（模糊 + saturate/brightness 光感一起撤）；
       ② **HDS 材质系**的底色换成实色 —— 它的 token（--mat-bg 等）在本文件里，
          我们知道该换成什么色，而且它就是「沉浸光感」的本体。
   ── 有意不做的：自造玻璃的底色 ──
     Tailwind backdrop-blur-* 那批（bg-white/30 之类）只撤模糊、不动底色：
     它们的底色是各页面自己写的，CSS 层无法通用地推出"正确的实色"，
     硬换必然在某些页面上撞出怪色。所以关闭后：
       · 材质系 → 纯色卡片（本文件接管）
       · 自造玻璃 → 无模糊的淡色蒙版（页面自己的底色照旧）
   ── 性能 ──
     这才是「关闭」最硬的收益：backdrop-filter 是整站最贵的属性（每帧重采样背景）。
     关掉之后所有玻璃元素都不再合成 backdrop 层。
   ========================================================================== */

/* ① 撤掉全部 backdrop-filter：材质类 / 任意值入口 / Tailwind 具名与任意值档位
   ⚠️ [data-mat-preview] 例外 —— 设置弹窗里「材质厚度」那三张预览卡本身就带 .dc-mat--regular，
      它们要**永远**演示「这一档长什么样」（内联 --dc-mat-scale 已写死各档倍率）。
      不排除的话，关闭档会把三张卡一起冲成实色 → 三块空白，选择器直接失效。
      这是"测量仪器不算被测对象"的同一条原则。
   ⚠️ 2026-09-27：名单里补上 .dc-ctrl--thumb / .dc-ctrl--brand / .dc-ctrl--brand-soft /
      .dc-ctrl--ghost —— 它们都自带 backdrop-filter（见 .dc-ctrl 基类组），
      原先漏掉后关闭档仍给它们留着 backdrop-filter（实测 blur(0px) saturate(1.85) brightness(...)
      —— 模糊为 0 但 saturate/brightness 照旧生效，无意义地多一个合成层，
      还可能把背后的淡色放大出彩边）。关闭档的语义是「全站不再有任何 backdrop-filter」，
      所以这份名单必须与 .dc-ctrl 基类选择器组**保持一致**（漏一个就是静默残留）。 */
html[data-mat-level="off"] :is(.dc-mat, .dc-mat--thin, .dc-mat--regular, .dc-mat--thick, .dc-mat--ultra, .dc-mat--neutral, .dc-glass, .dc-imv, .dc-ctrl--field, .dc-ctrl--popup, .dc-ctrl--track, .dc-ctrl--thumb, .dc-ctrl--brand, .dc-ctrl--brand-soft, .dc-ctrl--ghost, .dc-gblur):not([data-mat-preview]),
html[data-mat-level="off"] .backdrop-blur,
html[data-mat-level="off"] [class*="backdrop-blur-"]{
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}

/* ② HDS 材质系换成实色（含控件材质 —— 它们同样压在内容之上，不换色就会糊字）
   ⚠️⚠️ 2026-09-27 修：**分段控件（凹槽 + 滑块）不能吃这条默认值**。
      这条规则原先对整个 .dc-ctrl--track 族无差别刷 --dc-solid-card(#fff)，
      而分段控件的滑槽与选中块是**一对有明暗差**的结构：
        滑槽 原 rgba(60,60,67,.055) 比画布暗一档（凹槽）
        滑块 原 rgba(255,255,255,.62) 白玻璃 + 投影（凸起）
      被同刷成 #fff 之后，滑块叠在滑槽上 → **两块白同色，选中项完全读不出来**
      （用户报的「重要 UI 的 bug 严重得很」就是这个）。所以下面把 .dc-ctrl--thumb
      排除出去，并给它单独一条 off 规则（见 ②b）：凹槽给浅灰、滑块给纯白，
      把「凸起 / 凹陷」这层明暗关系在无模糊的世界里重新建立起来。
      同理 .dc-ctrl--track 里的**非 .dc-seg** 那批（antd Switch 关态轨道）也不能变白
      —— 它的旋钮是纯白，轨道一旦白，旋钮直接消失。见 ②a。
   🚨🚨 **语义材质（--tint-*）必须整类排除**（用户报的第二个 bug：提醒色都没了）：
      离线/危险/正常提示条挂的是 .dc-mat--thin .dc-mat--tint-warn 这两个类，
      语义色写在 --mat-bg / --mat-border / --mat-edge / --mat-shadow 四个变量里。
      本条规则用 background-color: var(--dc-solid-card) !important 把底色刷成纯白，
      **直接把琥珀色盖掉** → 提示条退化成一张普通白卡，警示语义完全消失。
      「关闭沉浸光感」的意图是撤掉**模糊与光感**，不是撤掉**语义**：
        颜色是信号，不是装饰 —— 关掉毛玻璃之后，警示色必须还在。
      所以：排除 :is(.dc-mat--tint-warn,.dc-mat--tint-danger,.dc-mat--tint-ok)，
      由 ②c 给它们一套「无模糊版的语义实色」（半透明语义底换成等效的浅色实底）。 */
html[data-mat-level="off"] :is(.dc-mat, .dc-mat--thin, .dc-mat--regular, .dc-mat--thick, .dc-mat--ultra, .dc-glass, .dc-imv, .dc-ctrl--field, .dc-ctrl--popup):not([data-mat-preview]):not(.dc-mat--tint-warn):not(.dc-mat--tint-danger):not(.dc-mat--tint-ok):not(.dc-mat--neutral){
  background-color: var(--dc-solid-card, #fff) !important;
  border-color: var(--dc-solid-line, #e7e7ea) !important;
  /* 内缘受光同样要撤（纯色卡不需要"光在介质里漫反射"）。
     ⚠️ 只能给一个**合法的空值**，不能写 none —— box-shadow 的逗号列表里出现 none，
        整条声明会在计算值阶段失效，连页面自己的投影一起丢。 */
  --mat-edge: inset 0 0 0 0 rgba(0,0,0,0);
}
/* ⚠️⚠️ 上面这条的 :not(.dc-mat--neutral) 是**必须的**，不是可选优化：
    .dc-mat--neutral 是本文件里为「纯白画布上的卡」定义的浅灰档（--mat-bg rgba(120,120,128,.07)）。
    证据：:is(...):not(...)×3 的特异性是 (0,6,1)，而 html[...] .dc-mat--neutral:not([...])
    只有 (0,3,1) —— 后者**永远赢不了**，于是「下面那条 --neutral 专用 off 规则」形同虚设，
    纯白画布上的卡在关闭档下被刷成 #fff，与画布完全同色、轮廓消失。
    这是本项目第二次踩「同权重/低权重规则被高权重默认值静默盖掉」的坑（第一次是档位类不吃基类）。
    排查手法：把两条选择器写成 (a,b,c) 三段比大小，别靠"我在后面写的"来推断。 */
/* ②a 滑槽（.dc-ctrl--track，含 .dc-seg）：off 后回到**中性浅灰**（凹槽），而不是纯白。
   ⚠️ 一次性把 groove 内阴影也写进来：原凹槽内阴影靠 --dc-seg-groove 承载，
      而上面的 --mat-edge 清空只处理内缘光，不碰 groove；但滑槽一旦变纯白，
      groove 那两条 inset 在 #fff 上几乎看不见（.06 的黑叠白 ≈ 1 级亮度差），
      等于凹槽也一并消失。所以这里把 groove 加深到「无模糊也能读出来」的强度。 */
html[data-mat-level="off"] .dc-ctrl--track:not([data-mat-preview]){
  background-color: var(--dc-solid-muted, #f4f4f5) !important;
  border-color: var(--dc-solid-line, #e7e7ea) !important;
  --mat-edge: inset 0 0 0 0 rgba(0,0,0,0);
  --dc-seg-groove: inset 0 1px 2px rgba(0,0,0,.08), inset 0 -1px 0 rgba(255,255,255,.70);
  box-shadow: var(--dc-seg-groove);
}
/* ②b 选中滑块（.dc-ctrl--thumb）：off 后是**纯白 + 阴影**（凸起），必须亮于浅灰滑槽。
   ⚠️ 它原先压根不在 ② 的选择器名单里（只列了 field/popup/track），
      所以关闭后仍留着 rgba(255,255,255,.62) 的半透明白 —— 那点 alpha 在浅灰滑槽上
      合成出的仍是近白，与滑槽只差 3~4 级亮度，滑块边界彻底糊掉。
      现在改成实色白 + 一层独立投影（无模糊时，凸起只能靠投影与描边说明）。 */
html[data-mat-level="off"] .dc-ctrl--thumb:not([data-mat-preview]){
  background-color: var(--dc-solid-card, #fff) !important;
  border-color: var(--dc-solid-line, #e7e7ea) !important;
  --mat-edge: inset 0 0 0 0 rgba(0,0,0,0);
  box-shadow:
    0 1px 2px rgba(0,0,0,.06),
    0 6px 16px -10px rgba(0,0,0,.20) !important;
}
/* ②c 语义材质（警示 / 危险 / 正常）：off 后**保留语义色**，只把「半透明 + 模糊」
      换成等效的**实色** —— 颜色仍然是信号，只是不再需要背景透上来。
   ── 数值怎么定的（不许手调，必须预乘算出来）──
     语义材质原本是「低 alpha 语义色叠在画布上」。关掉模糊后画布就是最终底色，
     所以这里直接把原 alpha 与画布预乘，得到**等效实色**：
       亮态底 #F7F7F8（--berry-canvas）· 暗态底 #18181b（--dc-solid-card 暗）
       warn  rgba(217,119,6,.10) → 亮 #F4EAE0 / 暗 #2B2219
       danger rgba(220,38,38,.10) → 亮 #F4E2E3 / 暗 #2C191C
       ok    rgba(5,150,105,.09) → 亮 #DFEDEA / 暗 #162523
     这样「开着」与「关着」的提示条**看起来是同一个颜色**，只是后者不再模糊 ——
     关闭沉浸光感不该改变信息的语义强度。
     原先手调的 #FDF4E3 之流比预乘值更艳，会让关闭前后色差肉眼可见（等于换了个提示色）。
   ⚠️ 边界（border）与投影（shadow）也一并给：警示条的「可读性」靠的就是那圈带色的边。
      投影取语义色低 alpha（保留「材质自己发光」的读感，只是不再有 blur）。 */
html[data-mat-level="off"] .dc-mat--tint-warn:not([data-mat-preview]){
  background-color: #F4EAE0 !important;
  border-color: rgba(217,119,6,.34) !important;
  --mat-edge: inset 0 0 0 0 rgba(0,0,0,0);
  box-shadow: 0 1px 2px rgba(217,119,6,.10), 0 8px 22px -14px rgba(217,119,6,.34) !important;
}
html[data-mat-level="off"] .dc-mat--tint-danger:not([data-mat-preview]){
  background-color: #F4E2E3 !important;
  border-color: rgba(220,38,38,.32) !important;
  --mat-edge: inset 0 0 0 0 rgba(0,0,0,0);
  box-shadow: 0 1px 2px rgba(220,38,38,.10), 0 8px 22px -14px rgba(220,38,38,.32) !important;
}
html[data-mat-level="off"] .dc-mat--tint-ok:not([data-mat-preview]){
  background-color: #DFEDEA !important;
  border-color: rgba(5,150,105,.30) !important;
  --mat-edge: inset 0 0 0 0 rgba(0,0,0,0);
  box-shadow: 0 1px 2px rgba(5,150,105,.10), 0 8px 22px -14px rgba(5,150,105,.30) !important;
}
/* ②d 幽灵按钮（.dc-ctrl--ghost）：off 后仍是「比卡片淡一档的中性膜」，但不是半透明白
   —— 半透明白叠在纯白卡上 = 白，读起来与卡片融为一体、看不出有按钮。
   ⚠️ 它同样不在 ② 的名单里（② 只列 field/popup），所以关闭后保留 rgba(255,255,255,.30)
      的半透明白。改成实色中性浅灰，保留「层级低于字段控件」的语义。 */
html[data-mat-level="off"] .dc-ctrl--ghost:not([data-mat-preview]){
  background-color: var(--dc-solid-muted, #f4f4f5) !important;
  border-color: var(--dc-solid-line, #e7e7ea) !important;
  --mat-edge: inset 0 0 0 0 rgba(0,0,0,0);
}
html[data-mat-level="off"] .dc-ctrl--ghost:hover{
  background-color: #eaeaec !important;
}
/* ②e 品牌 CTA（.dc-ctrl--brand）：off 后**必须仍是品牌实色**。
   🚨 这是「默认值刷白」的第三种形态 —— **不是被 ② 盖掉，而是 ② 根本管不到它**：
      品牌 CTA 的底色来自它自己的 --mat-bg（rgba(0,140,80,.94)），而这 4% 的透明
      原先只为了让 backdrop-filter 的 saturate/brightness 透一点光。关闭档撤了模糊，
      这 4% 就纯粹是「让背后的卡片色渗进按钮」—— 深色页面上尤其明显（按钮发灰）。
      品牌绿是本项目唯一强调色（rule 43），**关闭光感绝不等于关闭品牌色**。
   ── 为什么不能靠 ② 顺手管掉 ──
      :is(...) 名单里加 .dc-ctrl--brand 之后，② 的 (0,5,1) > .dc-ctrl--brand 的 (0,1,0)，
      确实能赢 —— 但那会把按钮刷成 #fff（默认卡片色），品牌绿直接消失。
      所以这里既不进 ② 名单，也不让 ② 赢，而是给它自己一条 off 专属实色规则：
      把 .94/.90 的 alpha 直接补足成 1（等同「在品牌绿上再叠一层同色」，视觉零变化），
      再补一条 --mat-edge 空值撤掉内缘光。 */
html[data-mat-level="off"] .dc-ctrl--brand:not([data-mat-preview]){
  background-color: #008C50 !important;
  border-color: rgba(255,255,255,.28) !important;
  --mat-edge: inset 0 0 0 0 rgba(0,0,0,0);
}
html[data-mat-level="off"] .dc-ctrl--brand:not([data-mat-preview]):hover{
  background-color: #009858 !important;
}
html.dark[data-mat-level="off"] .dc-ctrl--brand:not([data-mat-preview]){
  background-color: #34C77B !important;
  border-color: rgba(255,255,255,.30) !important;
}
html.dark[data-mat-level="off"] .dc-ctrl--brand:not([data-mat-preview]):hover{
  background-color: #3ED385 !important;
}
/* ②f 品牌玻璃胶囊（.dc-ctrl--brand-soft，导航选中态）：off 后按预乘换成**等效实色**。
   ⚠️ 这一条与 ②e 相反 —— 它的 alpha 是**有意为之**的「透」（.13 是设计值，不是模糊的副产物），
      所以不能简单补足成 1：亮态底是导航条（近白玻璃），.13 绿叠上去 ≈ 极淡的绿膜；
      关闭档没有导航条可透，就把「导航条」当作白底预乘：
        rgba(0,148,86,.13) 叠 #fff  →  #DDEBDF
        rgba(0,148,86,.13) 叠 #f7f7f8 → #DCEAE0（差 1 级，忽略）
      暗态底 ≈ #18181b：rgba(52,199,123,.18) → #1E2E27
      这样「开着 / 关着」看到的都是同一层淡绿膜，位置指示照样成立。 */
html[data-mat-level="off"] .dc-ctrl--brand-soft:not([data-mat-preview]){
  background-color: #DDEBDF !important;
  border-color: rgba(0,148,86,.24) !important;
  --mat-edge: inset 0 0 0 0 rgba(0,0,0,0);
}
html.dark[data-mat-level="off"] .dc-ctrl--brand-soft:not([data-mat-preview]){
  background-color: #1E2E27 !important;
  border-color: rgba(110,231,183,.28) !important;
}
/* 纯白画布上的卡（--neutral）：关掉后要用浅灰，否则与画布同色、轮廓整片消失
   （必须排在 ② 之后；且 ② 已 :not(.dc-mat--neutral) 让位 —— 见上面的特异性注记） */
html[data-mat-level="off"] .dc-mat--neutral:not([data-mat-preview]){
  background-color: var(--dc-solid-muted, #f4f4f5) !important;
  border-color: var(--dc-solid-line, #e7e7ea) !important;
}
html.dark[data-mat-level="off"] .dc-ctrl--ghost:not([data-mat-preview]){
  background-color: rgba(255,255,255,.07) !important;
  border-color: rgba(255,255,255,.11) !important;
}
html.dark[data-mat-level="off"] .dc-ctrl--ghost:hover{
  background-color: rgba(255,255,255,.12) !important;
}
html.dark[data-mat-level="off"]{
  --dc-solid-card: #18181b;
  --dc-solid-muted: #27272a;
  --dc-solid-line: rgba(255,255,255,.10);
}
/* 暗态下的分段控件：滑槽比卡更深、滑块比滑槽亮一档（同亮态的明暗方向，只是整体翻转）。
   ⚠️ 暗底上「叠白」才是提亮（HDS 一贯做法），所以滑槽用极低 alpha 白、滑块用高一档白。 */
html.dark[data-mat-level="off"] .dc-ctrl--track:not([data-mat-preview]){
  background-color: rgba(255,255,255,.06) !important;
  border-color: rgba(255,255,255,.10) !important;
  --dc-seg-groove: inset 0 1px 2px rgba(0,0,0,.40), inset 0 -1px 0 rgba(255,255,255,.06);
}
html.dark[data-mat-level="off"] .dc-ctrl--thumb:not([data-mat-preview]){
  background-color: rgba(255,255,255,.14) !important;
  border-color: rgba(255,255,255,.16) !important;
  box-shadow:
    0 1px 2px rgba(0,0,0,.30),
    0 6px 16px -10px rgba(0,0,0,.50) !important;
}
/* 暗态语义材质：以 #18181b 为底预乘（与 ②c 同一算法），方向保持「暗底叠色 + 提亮」 */
html.dark[data-mat-level="off"] .dc-mat--tint-warn:not([data-mat-preview]){
  background-color: #2B2219 !important;
  border-color: rgba(251,191,36,.28) !important;
  box-shadow: 0 1px 2px rgba(0,0,0,.30), 0 8px 22px -14px rgba(217,119,6,.40) !important;
}
html.dark[data-mat-level="off"] .dc-mat--tint-danger:not([data-mat-preview]){
  background-color: #2C191C !important;
  border-color: rgba(248,113,113,.26) !important;
  box-shadow: 0 1px 2px rgba(0,0,0,.30), 0 8px 22px -14px rgba(220,38,38,.40) !important;
}
html.dark[data-mat-level="off"] .dc-mat--tint-ok:not([data-mat-preview]){
  background-color: #162523 !important;
  border-color: rgba(110,231,183,.24) !important;
  box-shadow: 0 1px 2px rgba(0,0,0,.30), 0 8px 22px -14px rgba(5,150,105,.38) !important;
}

/* ③ 关闭档不再有任何「光」：按压点光 / 沉浸卡光晕 / iOS 卡光晕。
      具体规则跟在各自光效的定义处（.dc-imv-glow、.dc-ctrl--press::after、
      components/dashboard/ios-style/widget-material.ts 的 .ios-widget-glow），
      与 smooth 档合并写在同一条选择器里，避免"关光"这件事散在两个地方。 */

/* ==========================================================================
   沉浸光感 · 按压点光源（官方六特性 ④）
   静止态**无光**：只在「按下的那一刻」出现。
     这是与拟物化的分界线 —— 拟物会把高光常驻在卡面上（镜面环、指针跟随），
     界面因此发假；沉浸光感的光是**事件驱动的、瞬时的**，所以看起来是"光感"不是"贴图"。
   ⚠️ 官方六特性里的「⑤ 材质流光」（.dc-sheen 斜向扫光）**试过并已删除**（2026-09-25）：
      卡片 hover 时扫过一道斜光带，用户明确反馈「去掉这个滑过去的光」。
      静止态无光不足以救它 —— 那道带子在扫过时又宽又亮，观感是"贴了层玻璃反光"。
      想再复刻 ⑤ 必须先问用户，别自作主张。
   ========================================================================== */
/* —— ④ 按压点光源（press point-light）——
   触点处一圈光晕向外扩散。位置由 --imv-gx / --imv-gy（百分比）给出，
   半径 --imv-gr 用 @property 注册成 <length> 才能被动画插值（不支持时退化为静态半径，
   只有透明度在动，观感依旧成立）。
   ⚠️ 触发用 :active 而**不是** JS 加类：先试过在 onPointerDown 里 classList.add('dc-imv--press')，
      实测按下后该类立刻消失（framer-motion 因 whileTap 触发重渲染，React 重新写回 className
      把命令式类冲掉）→ 光晕根本不出现。':active' 是浏览器原生状态，不参与 React 调和，
      按下/松开天然精确，也不需要等水合。
      坐标仍走 inline CSS 变量（--imv-gx/gy）—— 自定义属性不在 style prop 里，
      React 重渲染不会碰它们（已验证）。 */
@property --imv-gr{ syntax: "<length>"; inherits: false; initial-value: 34px; }
.dc-imv-glow{
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  border-radius: inherit;
  opacity: 0;
  /* plus-lighter：把光"加"到材质上，而不是盖一层白膜 —— 暗底才真的会发亮 */
  mix-blend-mode: plus-lighter;
  background-image: radial-gradient(circle var(--imv-gr, 34px) at var(--imv-gx, 50%) var(--imv-gy, 50%),
      var(--imv-glow-a, rgba(255,255,255,.70)) 0%,
      var(--imv-glow-b, rgba(255,255,255,.30)) 40%,
      rgba(255,255,255,0) 74%);
  transition: opacity .36s ease;
}
.dc-imv:active .dc-imv-glow{
  opacity: 1;
  animation: dc-imv-bloom .62s cubic-bezier(.2,.72,.3,1) both;
}
/* 涟漪式：扩散的同时淡掉。终帧 opacity 归 0 —— 按住不放也不会在卡上留一片常驻白光，
   光只在按下那一瞬间"亮一下"。这是与拟物高光的关键区别。 */
@keyframes dc-imv-bloom{
  0%{ --imv-gr: 14px; opacity: .92 }
  55%{ --imv-gr: 132px; opacity: .46 }
  100%{ --imv-gr: 216px; opacity: 0 }
}
/* 暗底：材质本身已经很亮，光晕要收一点，否则按一下像开了手电 */
.dark .dc-imv-glow{ --imv-glow-a: rgba(255,255,255,.50); --imv-glow-b: rgba(255,255,255,.20); }

/* 低配 / 省电 / 用户要求减弱动效：光感只保留静态部分（底色透光 + 边缘光），动效全关 */
html[data-mat-level="smooth"] .dc-imv-glow,
html[data-mat-level="off"] .dc-imv-glow{ display: none; }
@media (prefers-reduced-motion: reduce){
  .dc-imv:active .dc-imv-glow{ animation: none }
}

/* ==========================================================================
   控件材质（CONTROL）—— 按钮 / 选择器 / 输入框 / 开关 / 滑杆轨 …… 所有交互控件
   ── 为什么控件不能直接复用卡片材质 ──
     卡片面对的是**画布**（一整片背景），控件面对的是**已经柔化过一次的卡片**。
     旧做法给控件铺 --dc-glass-bg-strong = rgba(255,255,255,.88)：88% 的白在数学上
     把背后的光冲掉 88%，控件于是变成「贴在卡片上的一块死白片」——
     这正是截图里那排「没有光感的白控件」的成因。
     「透明度是沉浸光感的本体」这条规律对控件同样成立，而且更致命：
     控件面积小，一旦发白就完全失去材质感，只剩一个白色圆角块。
   ── 档位 ──
     .dc-ctrl--field      输入框 / 选择器 / 次级按钮（压在卡片上的内联控件）
     .dc-ctrl--popup      下拉面板 / 浮层（悬在任意内容之上 → 可读性优先，比 field 实一档）
     .dc-ctrl--track      滑槽 / 开关关态轨道（凹槽：比周围暗一档的中性介质）
     .dc-ctrl--thumb      分段控件选中块 / 凸起滑块（比滑槽亮一档）
     .dc-ctrl--brand      品牌色 CTA（实底 + 品牌色边缘光 = 自己发光）
     .dc-ctrl--brand-soft 品牌色玻璃膜（导航选中胶囊等"位置指示"）
     .dc-ctrl--ghost      幽灵按钮（比 field 更淡的文字动作）
   ── 修饰符 ──
     .dc-ctrl--sm     小控件（开关 / 滑杆轨）：模糊半径减半。
                      28px 以下的模糊肉眼几乎看不出来，却要付一个独立合成层的代价 —— 不值得。
     .dc-ctrl--press  按压反馈（③ 弹性 + ④ 点光源），幅度按控件尺寸等比缩小。
   ⚠️ 档位类**自带材质本体**（下面这条规则的选择器里已并列列出 --field/--popup/--track/
      --brand/--brand-soft/--thumb/--ghost）。曾经的设计是「档位只声明变量、
      必须同时挂 .dc-ctrl 基类」，实测不可靠：漏挂基类时元素**一个材质属性都拿不到**
      （静默变裸控件，正是 chips / 幽灵按钮那两次「改了等于没改」的成因），而 CSS 不会报错。
      现在两类写法都成立：「.dc-ctrl--field 单独用」=「.dc-ctrl .dc-ctrl--field」。
      .dc-ctrl--sm / --press 是纯修饰符（不加材质属性），可以叠加在任意档位上。
   ⚠️⚠️ 新增一个档位类，必须同时改**三处**，漏一处就是"静默不存在"：
      ① 下面这条基类选择器组（拿到 background/backdrop-filter/border/box-shadow 本体）
         —— 漏了 → 元素 bg 透明 + 无 backdrop-filter，看着像"没生效"，CSS 不报错；
      ② :not(:where(.absolute,…)) 定位组（默认 position: relative）；
      ③ 暗态边光排除名单 .dark .dc-ctrl:not(…)（品牌档要排除，中性档不用）。
      （实测：新加 --brand-soft 时漏了 ①，导航胶囊就是"铺满了但一片透明"。）
   ========================================================================== */
.dc-ctrl,
.dc-ctrl--field,
.dc-ctrl--popup,
.dc-ctrl--track,
.dc-ctrl--brand,
.dc-ctrl--brand-soft,
.dc-ctrl--thumb,
.dc-ctrl--ghost{
  background-color: var(--mat-bg, rgba(255,255,255,.52));
  -webkit-backdrop-filter: blur(calc(var(--mat-blur, 24px) * var(--dc-mat-scale, 1))) saturate(var(--mat-sat, 1.65)) brightness(var(--mat-bright, 1.04)) contrast(var(--mat-cont, 1.02));
  backdrop-filter: blur(calc(var(--mat-blur, 24px) * var(--dc-mat-scale, 1))) saturate(var(--mat-sat, 1.65)) brightness(var(--mat-bright, 1.04)) contrast(var(--mat-cont, 1.02));
  border: 1px solid var(--mat-border, rgba(255,255,255,.62));
  /* 控件的内缘光比卡片**更强**：面积小，全靠这一圈光说明「这是一块受光的介质」。
     不做「厚度渐变」——那会变成拟物高光，界面立刻发假。 */
  --mat-edge: inset 0 0 1px rgba(255,255,255,.72), inset 0 1px 0 rgba(255,255,255,.64);
  box-shadow: var(--mat-shadow, 0 1px 2px rgba(0,0,0,.03), 0 6px 16px -12px rgba(0,0,0,.14)), var(--mat-edge);
}
/* —— 定位上下文：控件默认 position: relative（自己的 ::after 光晕、内层浮标挂在这上面）——
   ⚠️⚠️ 必须**让位给显式定位**，否则会静默吃掉 Tailwind 的 .absolute：
      material-css 是**未分层**样式，未分层 > @layer utilities —— 裸写 position: relative
      会盖掉同元素上的 .absolute，元素塌成 2×2 直接消失（无任何报错）。
      实测踩过的两处：
        · 导航选中胶囊  .dc-ctrl--brand absolute inset-0   → 胶囊不见了（用户报的"底下要有个胶囊"）
        · 看板 CAM 分段块 .dc-ctrl--thumb absolute inset-0 → 选中块不见了
      写法：:not(:where(.absolute,.fixed,.sticky,.static)) —— :where() 特异性为 0，
      所以这条规则的特异性仍是 (0,1,0)（与 .dc-ctrl 相同），既修好塌陷又不抬特异性。
      让位**不会**削弱按压点光源：absolute/fixed/sticky 元素自己就是"已定位元素"
      （即 ::after 的包含块），所以 ::after 依旧铺满元素本身。
      真正需要 position: relative 的只有 static 元素 —— 那时 ::after 会锚到更远的
      定位祖先上，表现为"按一下整页泛白光"（这才是最初的 bug）。 */
.dc-ctrl:not(:where(.absolute, .fixed, .sticky, .static)),
.dc-ctrl--field:not(:where(.absolute, .fixed, .sticky, .static)),
.dc-ctrl--popup:not(:where(.absolute, .fixed, .sticky, .static)),
.dc-ctrl--track:not(:where(.absolute, .fixed, .sticky, .static)),
.dc-ctrl--brand:not(:where(.absolute, .fixed, .sticky, .static)),
.dc-ctrl--brand-soft:not(:where(.absolute, .fixed, .sticky, .static)),
.dc-ctrl--thumb:not(:where(.absolute, .fixed, .sticky, .static)),
.dc-ctrl--ghost:not(:where(.absolute, .fixed, .sticky, .static)){
  position: relative;
}
/* —— 档位：只声明变量，材质属性由 .dc-ctrl 统一消费（与卡片档位同一套机制） —— */
/* ⚠️ 2026-09-25 调参（用户：「这几个按钮极其不和谐」）：**受光边必须比填充与画布都亮**。
   旧值 --mat-bg .52 / --mat-border .62 在浅绿画布（≈rgb(215,235,226)）上合成出的
   填充 ≈rgb(236,245,241)、描边 ≈rgb(240,247,244) —— 两者只差 4 级亮度，
   于是「边缘光」在数学上根本不存在：控件读起来不是一块受光的介质，
   而是一摊与画布几乎同色的**苍白斑块**（截图里「设备管理」按钮的观感）。
   新值把填充压到 .44（更贴近画布、更透，背后画布的环境色光透得上来），
   描边提到 .72（亮于填充与画布）→ 边缘光 Δ≈13 级，形状由「受光边」定义，
   而不是由描边色定义 —— 这正是 HDS「环境光沿边缘柔和流转，自然勾勒层次」的字面意思。 */
.dc-ctrl--field{
  --mat-blur: 24px; --mat-sat: 2.1;
  --mat-bg: rgba(255,255,255,.44);
  --mat-bright: 1.04; --mat-cont: 1.02;
  --mat-border: rgba(255,255,255,.72);
  --mat-shadow: 0 1px 2px rgba(0,0,0,.03), 0 6px 16px -12px rgba(0,0,0,.14);
}
.dark .dc-ctrl--field{
  --mat-bg: rgba(255,255,255,.10);
  --mat-border: rgba(255,255,255,.15);
  --mat-bright: 1.34;
}
.dc-ctrl--popup{
  --mat-blur: 42px; --mat-sat: 2.15;
  --mat-bg: rgba(255,255,255,.60);
  --mat-bright: 1.04; --mat-cont: 1.02;
  --mat-border: rgba(255,255,255,.64);
  --mat-shadow: 0 2px 6px rgba(0,0,0,.05), 0 18px 40px -18px rgba(0,0,0,.20);
}
/* 暗态浮层：不能像卡片那样只叠白 —— 下拉面板悬在任意内容上，必须自己「立起来」，
   所以用「叠白 + 一层中性深底」的混合（与 ULTRA_THICK 暗态同族，但更透）。 */
.dark .dc-ctrl--popup{
  --mat-bg: rgba(58,58,68,.68);
  --mat-sat: 1.9; --mat-bright: 1.18;
  --mat-border: rgba(255,255,255,.18);
}
/* 轨道档（开关轨道 / 滑杆轨）：控件里唯一需要「比卡片更暗」的表面 ——
   因为它的旋钮/滑块是纯白的，轨道一旦也发白，旋钮就直接消失了。
   做法：中性灰 + 低 alpha（让卡片的色光继续透上来）+ 内缘光，而不是实心灰。 */
.dc-ctrl--track{
  --mat-blur: 12px; --mat-sat: 1.6;
  --mat-bg: rgba(120,120,128,.26);
  --mat-bright: 1.02; --mat-cont: 1.0;
  --mat-border: rgba(255,255,255,.44);
  --mat-shadow: 0 1px 2px rgba(0,0,0,.04);
}
.dark .dc-ctrl--track{
  --mat-bg: rgba(255,255,255,.11);
  --mat-border: rgba(255,255,255,.13);
  --mat-bright: 1.06;
}
/* 小控件：模糊减半（放在档位之后 —— 同优先级下后写的赢） */
.dc-ctrl--sm{ --mat-blur: 12px; }

/* —— 品牌色 CTA（主按钮 / 选中态 chip）——
   「有品牌色的控件也要有光感」，但**不能靠降不透明度换光感** ——
   品牌绿上的白字本来就紧（纯 #059669 只有 3.92:1），再降 alpha 会掉到 3.4:1。
   所以这里的做法是：把光放在**边缘与外部**，填充保持接近实底。
     · --mat-bg 用比 #059669 略深一档的绿：白字对比度反而升到 ≈4.0:1（净收益）
     · 上缘 1px 白受光 + 内部极淡白漫反射（「光从上方打在介质上」）
     · 外投影带品牌色（rgba(0,148,86,.55)）→ 看起来像**自己发着光**，而不是贴了个绿块
     · 底色仍留 5~6% 透（配合 backdrop-filter 的 saturate/brightness），
       画布的氛围光会在按钮上留下极淡的色调起伏 —— 这就是「通透」的读感来源
   实测判据：与 .dc-ctrl--field 同一套指标（透传倍率 / 边缘光），这里主要看**边缘光 > 0**。 */
.dc-ctrl--brand{
  --mat-blur: 16px; --mat-sat: 1.45;
  --mat-bg: rgba(0,140,80,.94);
  --mat-bright: 1.06; --mat-cont: 1.02;
  --mat-border: rgba(255,255,255,.28);
  --mat-edge:
    inset 0 1px 0 rgba(255,255,255,.42),
    inset 0 0 16px -6px rgba(255,255,255,.36);
  --mat-shadow:
    0 4px 14px -6px rgba(0,148,86,.55),
    0 1px 2px rgba(0,0,0,.08);
}
/* hover：比静止态亮一点（受光增强），而不是换一个实色 */
.dc-ctrl--brand:hover{
  --mat-bg: rgba(0,152,88,.95);
  --mat-bright: 1.10;
  --mat-shadow:
    0 6px 18px -6px rgba(0,148,86,.62),
    0 1px 2px rgba(0,0,0,.08);
}
.dark .dc-ctrl--brand{
  --mat-bg: rgba(52,199,123,.90);
  --mat-bright: 1.14;
  --mat-border: rgba(255,255,255,.30);
  --mat-edge:
    inset 0 1px 0 rgba(255,255,255,.50),
    inset 0 0 18px -6px rgba(255,255,255,.40);
  --mat-shadow:
    0 4px 16px -6px rgba(52,199,123,.55),
    0 1px 2px rgba(0,0,0,.30);
}
.dark .dc-ctrl--brand:hover{ --mat-bg: rgba(62,211,133,.94); --mat-bright: 1.18; }

/* —— 品牌色「玻璃」变体（导航选中胶囊 / 轻量选中态）——
   与 .dc-ctrl--brand（CTA 主按钮）的区别只有一条：**要透**。
   CTA 是"动作"，必须实；导航胶囊是"位置指示"，它压在一条半透明导航条上，
   做实了就像贴了块绿牌 —— 用户要的就是"一层浮在导航条上的品牌色光膜"。
   ── 但透明度不是随便降的 ──
   白字对品牌绿本来就只有 ≈3.9:1，降 alpha 会把合成底色**抬高**（背后是亮导航条）
   → 白字直接不可读。所以两条策略分开：
     · 暗态：导航条本身是深色玻璃（≈rgb(45,52,52)）→ 大幅降 alpha（.22）换"透"，
       合成底色仍是深绿（≈rgb(46,78,65)），白字对比度反而升到 ≈7:1（净赚）。
       同时 brightness 抬到 1.26 —— 暗底上"被光照亮"的观感全来自这里。
     · 亮态：导航条是近白玻璃 → **白字在这里永远不可能达标**（算过：要 4.5:1 得几乎实底）。
       所以亮态改走"淡绿膜 + 品牌墨绿字"（text-br-brand-ink）：
       alpha .13 的绿膜叠在近白上 ≈ rgb(220,239,231)，配 #059669 是 4.6:1 ✅。
       —— 这也正是 HDS 亮色下「着色胶囊 + 同色深字」的做法，不是妥协。 */
.dc-ctrl--brand-soft{
  --mat-blur: 20px; --mat-sat: 1.8;
  --mat-bg: rgba(0,148,86,.13);
  --mat-bright: 1.04; --mat-cont: 1.02;
  --mat-border: rgba(0,148,86,.24);
  --mat-edge:
    inset 0 1px 0 rgba(255,255,255,.50),
    inset 0 0 18px -7px rgba(0,148,86,.30);
  --mat-shadow: 0 3px 12px -8px rgba(0,148,86,.45);
}
.dark .dc-ctrl--brand-soft{
  /* alpha .18 + brightness 1.16：实测合成后 ≈ rgb(44,95,71)，
     与用户参考截图里那条胶囊（≈ rgb(45,78,60)）同一量级。
     一开始写 .22/1.26 会亮到 rgb(44,107,77)，"膜"读起来偏实。 */
  --mat-bg: rgba(52,199,123,.18);
  --mat-bright: 1.16;
  --mat-border: rgba(110,231,183,.28);
  --mat-edge:
    inset 0 1px 0 rgba(255,255,255,.30),
    inset 0 0 20px -8px rgba(110,231,183,.42);
  --mat-shadow: 0 4px 18px -10px rgba(52,199,123,.50);
}

/* —— 分段控件（Segmented / 视图切换 / CAM 切换）——
   .dc-ctrl--track.dc-seg  = 外层滑槽（**凹槽**：比画布暗一档的中性介质）
   .dc-ctrl--thumb         = 选中那一块（**凸起**：比滑槽亮一档的白玻璃滑块）
   两块共用一套 --mat-* 变量机制，所以选中块滑动过去时材质是连续的（不会突然换一种白）。 */
/* 选中滑块：必须**比滑槽亮**（凸起浮在凹槽里），这是「空间化沉浸」的物理判据。
   ── 2026-09-25 走过的弯路，别再走 ──
   本次一度把选中块改成「品牌绿色光膜」（.dc-ctrl--seg-thumb，alpha .15 绿），
   想要「唯一强调色只落在选中项上」。实测（浅绿画布 rgb(202,221,223)）：
     · 合成底色 rgb(144,205,200)，亮度 186 —— **比滑槽（201）还暗**，
       读起来是「凹槽里又挖了个更深的坑」，物理方向反了；
     · 品牌墨绿字 #059669 落在它上面 WCAG 只有 **3.03:1**（要 4.5）❌
       —— 滑槽会把背后偏蓝的青绿放大（saturate 1.9），底色越吸越偏青，绿字对比度直线下降。
   结论：**浅色模式的浅底上，半透明品牌色膜同时满足「比滑槽亮」+「字色达标」是不可能的**。
   正确做法就是官方那套：**白玻璃滑块（几乎不透明）+ 品牌墨绿字**（实测 4.83:1 ✅、亮度 238 > 滑槽 201）。
   品牌绿仍然只出现在「选中项的字与图标」上 —— 强调色收敛的目的照样达到，
   只是靠**字色**而不是靠**底色**。 */
.dc-ctrl--thumb{
  --mat-blur: 20px; --mat-sat: 1.85;
  --mat-bg: rgba(255,255,255,.62);
  --mat-bright: 1.05; --mat-cont: 1.02;
  --mat-border: rgba(255,255,255,.68);
  --mat-edge:
    inset 0 0 1px rgba(255,255,255,.80),
    inset 0 1px 0 rgba(255,255,255,.72);
  --mat-shadow:
    0 1px 2px rgba(0,0,0,.04),
    0 6px 16px -10px rgba(0,0,0,.16);
}
.dark .dc-ctrl--thumb{
  --mat-bg: rgba(255,255,255,.13);
  --mat-border: rgba(255,255,255,.18);
  --mat-bright: 1.32;
}

/* —— 滑槽本体（.dc-seg 是页面既有类，只补材质不新建结构）——
   ⚠️ 凹槽（内阴影）+ 材质内缘光必须**写在同一条 box-shadow 里**：
      两条规则各写一次 box-shadow 会互相覆盖（后者赢），凹槽或边缘光必丢一个。
      凹槽用变量承载，暗态单独调（暗底上 .05 的黑完全看不见）。

   —— 2026-09-25 改版：滑槽**去彩**，回到中性介质（本次「不和谐」的根因）——
   曾经因为「中性灰滑槽在满屏绿环境光里合成出彩度只有 5 的死灰」
   而把滑槽**染成品牌绿**（--mat-bg rgba(0,148,86,.08)）。那个诊断是对的，但处方错了：
   死灰的根因是 **alpha 太高（.26）把背后的环境色相稀释掉**，正确解法是
   「降 alpha + 提高 saturate，让它自己把环境光吸上来」，而不是手动涂一层绿。
   ── 涂绿带来三个后果（就是用户截图里那排控件的病）──
     ① 品牌绿同时充当**容器底色**与**选中态颜色** → 强调色失效（整块一片绿糊）；
     ② 4px 的绿槽正好在白滑块外围描出一圈绿环 → 又变成「圆角矩形套圆角矩形」；
     ③ 白滑块叠在绿槽上，底色被拉暗到 204（比画布 216 还暗）→ 滑块不再是凸起。
   现在：alpha .055 + saturate 2.05 → 滑槽随画布走色（浅绿画布上吸出淡青绿 rgb(167,218,203)，
   彩度 51 vs 画布 26，透传倍率 ≈1.96 ✅ 不再死灰），且亮度 201 < 画布 208 → 凹槽成立。
   ✅ 物理正确性：光从上方来 → **凹槽上沿在阴影里（暗）、下沿受光（亮）**，
      所以凹槽是 inset 0 1px 2px 黑 + inset 0 -1px 0 白 两条，
      而不是像凸起面那样把高光放在上沿。
   ⚠️ 凹槽**不能有白色描边**：--mat-border 在基类里被写成 1px solid，若给它白色
      （旧值 rgba(255,255,255,.50)），会在滑槽外周画出一圈亮度 231 的亮环
      （比画布 208 亮 23 级）—— 凹陷的东西不该发光。所以这里用极淡的深色描边
      表达「凹槽壁」，视觉上几乎看不见，只负责把边缘从画布上「切」出来。 */
.dc-ctrl--track.dc-seg{
  --mat-blur: 18px; --mat-sat: 2.05; --mat-bright: 1.03;
  --mat-bg: rgba(60,60,67,.055);
  --mat-border: rgba(60,60,67,.07);
  -webkit-backdrop-filter: blur(calc(var(--mat-blur, 18px) * var(--dc-mat-scale, 1))) saturate(var(--mat-sat, 1.60)) brightness(var(--mat-bright, 1.03));
  backdrop-filter: blur(calc(var(--mat-blur, 18px) * var(--dc-mat-scale, 1))) saturate(var(--mat-sat, 1.60)) brightness(var(--mat-bright, 1.03));
  border: 1px solid var(--mat-border, rgba(60,60,67,.07));
  /* 凹槽：上沿阴影（光被挡住）+ 下沿受光（光贴着下唇掠过）。白线用 .34 而非 .46：
     浅色画布上 .46 会亮到 225，读起来像「描了条白边」而不是「下唇受光」。 */
  --dc-seg-groove: inset 0 1px 2px rgba(0,0,0,.06), inset 0 -1px 0 rgba(255,255,255,.34);
  box-shadow: var(--dc-seg-groove), var(--mat-edge, inset 0 0 1px rgba(255,255,255,.62), inset 0 1px 0 rgba(255,255,255,.56));
}
.dark .dc-ctrl--track.dc-seg{
  /* 只改变量：border 在基规则里已写成 var(--mat-border,…)，这里覆盖变量即可 */
  --mat-bg: rgba(255,255,255,.075);
  --mat-border: rgba(255,255,255,.09);
  --mat-bright: 1.14;
  --dc-seg-groove: inset 0 1px 2px rgba(0,0,0,.34), inset 0 -1px 0 rgba(255,255,255,.10);
}

/* —— 幽灵按钮（次要文字动作，如「＋ 添加预设位」）——
   比 --field 更淡（alpha .30）：它的层级低于字段控件与主按钮，
   但**仍然是一块有边缘光的介质**，不是裸文字 —— 这样整组控件的材质语言才是统一的。 */
.dc-ctrl--ghost{
  --mat-blur: 14px; --mat-sat: 1.7;
  --mat-bg: rgba(255,255,255,.30);
  --mat-bright: 1.04; --mat-cont: 1.01;
  --mat-border: rgba(255,255,255,.46);
  --mat-shadow: 0 1px 2px rgba(0,0,0,.02);
}
.dc-ctrl--ghost:hover{
  --mat-bg: rgba(255,255,255,.52);
  --mat-border: rgba(255,255,255,.60);
}
.dark .dc-ctrl--ghost{
  --mat-bg: rgba(255,255,255,.07);
  --mat-border: rgba(255,255,255,.11);
  --mat-bright: 1.24;
}
.dark .dc-ctrl--ghost:hover{
  --mat-bg: rgba(255,255,255,.12);
  --mat-border: rgba(255,255,255,.16);
}
/* 暗态内缘光：同样按暗底对比调低，否则像描了白边。
   ⚠️ 必须排除品牌两个档：它们的内缘光是"品牌色自发光"，不是中性白边，
      而且这条规则写在它们**后面**（同特异性 → 后写的赢），不排除就会把品牌辉光吃掉。 */
.dark .dc-ctrl:not(.dc-ctrl--brand, .dc-ctrl--brand-soft){
  --mat-edge: inset 0 0 1px rgba(255,255,255,.24), inset 0 1px 0 rgba(255,255,255,.20);
}

/* —— ③ 按压弹性：控件幅度比卡片小（控件尺寸小，缩太多会「跳」）——
   曲线带一点回弹（overshoot），是 HDS「按压弹性反馈」的手感来源。
   ⚠️ position: relative 必须是修饰符**自带**的：--press 常被单独挂在没有材质类的元素上
      （导航胶囊、菜单行、看板菜单项…）。少了它，::after 会相对更远的定位祖先铺开
      —— 结果是「按一下整页泛白光」，而不是控件亮一下。

   ⚠️⚠️⚠️ 【缩放必须走 CSS 独立「scale」属性，绝不能写 transform: scale()】（2026-09-25 实测踩坑）
     症状：:active 明明命中（el.matches(":active")===true），computed transform 却恒为
           matrix(1,0,0,1,0,0) —— 按下**一点缩放都没有**，用户反馈「没有按压效果」。
     根因：页面上有**仍在 running 的匿名 WAAPI 动画**（el.getAnimations() 可见
           fill=backwards / running，而 computed animation-name 是 none → 不是 CSS 动画，
           是 JS 侧 Web Animations，framer-motion 一类库的入场 / spring 动画）占着 transform 通道。
           WAAPI 与 CSS 动画同属 cascade 的 "Animation declarations" 层，
           **优先级高于任何普通作者声明** —— 所以 :active 里写的 transform 被整条吃掉，
           且 CSS 不报错、DevTools 里也看不出「被覆盖」，只能靠 getAnimations() 抓。
     ✅ 正解：scale 是 CSS Transforms L2 的**独立属性**，与 transform 正交合成
           （顺序 translate → rotate → scale → transform），动画动 transform 也抢不走它；
           而且它**不会**覆盖元素既有的 transform: translate(-50%,-50%) 这类居中写法
           （若改用 transform: scale() !important 会把居中一起抹掉 → 元素跳位）。
     代价：transition 必须把 scale 单独列出来（否则缩放是瞬跳、没有弹性曲线）。
     附带：filter: brightness() 也一并给（小控件比如 32×32，3.5% 缩放只有 ~1.1px，
           肉眼读不到 —— 「按进去」的压暗才是小面积上真正看得见的反馈）。
     ⚠️ 本文件是 TS 模板字符串：注释里**不能出现反引号**（会把模板串截断 → 整站 500）。 */
.dc-ctrl--press{
  /* transition 必须是**超集**：这条规则是未分层的，会整条盖掉组件自己的
     Tailwind 'transition-colors' / 'transition-all'（分层样式让位给未分层样式）。
     所以 background-color / color 也写进来 —— 否则导航胶囊、菜单行的变色过渡会一起消失。 */
  transition:
    scale .16s cubic-bezier(.34,1.56,.64,1),
    transform .16s cubic-bezier(.34,1.56,.64,1),
    filter .16s ease,
    box-shadow .22s ease,
    border-color .22s ease,
    background-color .22s ease,
    color .2s ease;
}
/* 定位同上：显式定位优先（.absolute 自己就是"已定位"元素，::after 依旧锚在自己身上） */
.dc-ctrl--press:not(:where(.absolute, .fixed, .sticky, .static)){
  position: relative;
}
.dc-ctrl--press:active{
  scale: .96;
  filter: brightness(.95) saturate(1.06);
}
/* 卡片级按压（整卡可点时叠加：dc-ctrl--press dc-press--card）。
   ⚠️ 幅度必须比控件小得多：312px 宽的设备卡缩 .96 = 12px，
      读起来是「整块跳一下」，很廉价；卡片用 .985 ≈ 4.7px 才是「按下去」。
   同理也不铺 ::after 点光 —— 卡片面积大，132px 的白色涟漪会糊满整卡。 */
.dc-ctrl--press.dc-press--card:active{
  scale: .985;
  filter: brightness(.97);
}
.dc-ctrl--press.dc-press--card::after{ display: none; }
/* —— ④ 按压点光源：控件太小，指针跟随没有意义 → 固定在中心向外扩散 —— */
.dc-ctrl--press::after{
  content: "";
  position: absolute; inset: 0; z-index: 0;
  pointer-events: none;
  border-radius: inherit;
  opacity: 0;
  /* plus-lighter：把光「加」上去而不是盖一层白膜 —— 暗底才真的会发亮 */
  mix-blend-mode: plus-lighter;
  background-image: radial-gradient(circle var(--imv-gr, 18px) at 50% 50%,
      rgba(255,255,255,.72) 0%, rgba(255,255,255,.28) 42%, rgba(255,255,255,0) 74%);
}
.dc-ctrl--press:active::after{
  opacity: 1;
  animation: dc-ctrl-bloom .5s cubic-bezier(.2,.72,.3,1) both;
}
/* 涟漪式：扩散的同时淡掉，终帧 opacity 归 0 —— 按住不放也不会留一片常驻白光 */
@keyframes dc-ctrl-bloom{
  0%{ --imv-gr: 8px; opacity: .88 }
  55%{ --imv-gr: 84px; opacity: .40 }
  100%{ --imv-gr: 132px; opacity: 0 }
}
/* 低配 / 省电：控件光效整条关掉（静态材质仍保留）。
   ⚠️ 只关「涟漪点光」—— scale / filter 的按压反馈保留：
      它是纯合成层变换，几乎不耗帧，而且是低配机上唯一的按压感知来源。 */
html[data-mat-level="smooth"] .dc-ctrl--press::after,
html[data-mat-level="off"] .dc-ctrl--press::after{ display: none; }
@media (prefers-reduced-motion: reduce){
  .dc-ctrl--press{ transition: none }
  .dc-ctrl--press:active{ scale: none; filter: none }
  .dc-ctrl--press:active::after{ animation: none }
}

/* ==========================================================================
   全站毛玻璃接入「材质厚度」（2026-09-26 用户要求：厚度必须**全站**生效，不是某几页）
   ── 问题 ──
     站上除 HDS 材质类（.dc-mat / .dc-glass / .dc-imv / .dc-ctrl--*）之外，还有 90+ 个文件
     用 Tailwind 的 backdrop-blur-* **自造玻璃**。它们的模糊是写死的字面量，不读 --dc-mat-scale
     —— 于是厚度调成「流畅」时，设备页薄了，而落地页 / 后台 / 文档 / 博客纹丝不动。
   ── 做法：只覆盖注入点，不碰那 90 个文件 ──
     Tailwind v4 的产出形式是：--tw-backdrop-blur: blur(24px)  →  backdrop-filter: var(--tw-backdrop-blur, ) …
     所以 **改 --tw-backdrop-blur 就等于改模糊半径**，不必给元素挂任何类、不必改一行业务代码。
     基准值必须与 Tailwind 官方一致（2xs 2 / xs 4 / sm 8 / 默认 8 / md 12 / lg 16 / xl 24 / 2xl 40 / 3xl 64），
     乘 --dc-mat-scale 之后：exquisite ×1 = **原值（零回归）**，gentle ×.78，smooth ×.2。
   ── 为什么盖得住 Tailwind ──
     本节是**未分层**样式 —— cascade layers 规则下 unlayered 恒胜 @layer 内的 Tailwind utilities；
     且注入位置在 body、晚于 head 里的 Tailwind 样式表。两层保险都指向本节胜出。
   ⚠️ 本节盖不到、需要**逐个接**的两类（2026-09-26 已全部接完，另有 grep 清单可复查）：
     · backdrop-blur-[任意值]：字面量直接编进 --tw-backdrop-blur，类名层面无从缩放
       → 统一改用「.dc-gblur」+ 行内 --gblur（见下）；
     · 组件内 style 标签里硬编码的 backdrop-filter 与 JSX inline backdropFilter：优先级高于本节
       → 逐个写成 blur(calc(Npx * var(--dc-mat-scale, 1)))；framer-motion 的动画值（0px↔20px）
       保持原样，因为插值必须是像素字面量。
   ⚠️ 有意**不**接档位的（不是漏，是设计）：
     · backdrop-filter: none !important（补间期摘掉玻璃、禁用态抽掉玻璃）；
     · app/my-mcp 收起态的 blur(0px)（本来就是"无模糊"）；
     · glass-surface 的 SVG 滤镜路径 var(--filter-id, url(#glass-filter))（模糊在 SVG 里，
       不在 backdrop-filter 的 blur() 上，缩放它要靠改 SVG，收益不抵风险）；
     · smoothui/siri-orb 的 --blur-amount（那是球体自身的参数，不是"玻璃厚度"）。
   ========================================================================== */
.backdrop-blur-2xs { --tw-backdrop-blur: blur(calc(2px  * var(--dc-mat-scale, 1))); }
.backdrop-blur-xs  { --tw-backdrop-blur: blur(calc(4px  * var(--dc-mat-scale, 1))); }
.backdrop-blur-sm  { --tw-backdrop-blur: blur(calc(8px  * var(--dc-mat-scale, 1))); }
.backdrop-blur     { --tw-backdrop-blur: blur(calc(8px  * var(--dc-mat-scale, 1))); }
.backdrop-blur-md  { --tw-backdrop-blur: blur(calc(12px * var(--dc-mat-scale, 1))); }
.backdrop-blur-lg  { --tw-backdrop-blur: blur(calc(16px * var(--dc-mat-scale, 1))); }
.backdrop-blur-xl  { --tw-backdrop-blur: blur(calc(24px * var(--dc-mat-scale, 1))); }
.backdrop-blur-2xl { --tw-backdrop-blur: blur(calc(40px * var(--dc-mat-scale, 1))); }
.backdrop-blur-3xl { --tw-backdrop-blur: blur(calc(64px * var(--dc-mat-scale, 1))); }

/* ── backdrop-blur-[任意值] 的接档入口 ──
   任意值类（如 backdrop-blur-[80px]）把字面量直接编译进 --tw-backdrop-blur，类名层面无从缩放，
   上面那节盖不到。所以给一个「.dc-gblur」：把「值」参数化到 --gblur，由使用方在自己那行传。
     用法： <div className="… dc-gblur … backdrop-saturate-150" style={{ "--gblur": "80px" }} />
   🚨 必须连 backdrop-filter 本体一起写 —— 只写 --tw-backdrop-blur 是**没用的**：
      Tailwind 只在元素挂了某个 backdrop-* 工具类时才会产出那条组合式 backdrop-filter；
      而原来的 backdrop-blur-[Npx] 一旦被换成 .dc-gblur，那个唯一来源就没了 → 元素上
      根本不会有 backdrop-filter，模糊是"消失"而不是"变小"（实测 getComputedStyle 返回 none）。
      所以下面把 Tailwind 那条组合式**原样复刻**：元素上其余的 backdrop-*（backdrop-saturate-*、
      backdrop-brightness-* …）照旧通过各自的 --tw-backdrop-* 参与拼装，不丢东西。
   仍写在**未分层**里：unlayered 胜 @layer utilities，能盖住 Tailwind 对同名变量的声明。 */
.dc-gblur {
  --tw-backdrop-blur: blur(calc(var(--gblur, 12px) * var(--dc-mat-scale, 1)));
  -webkit-backdrop-filter: var(--tw-backdrop-blur, ) var(--tw-backdrop-brightness, ) var(--tw-backdrop-contrast, ) var(--tw-backdrop-grayscale, ) var(--tw-backdrop-hue-rotate, ) var(--tw-backdrop-invert, ) var(--tw-backdrop-opacity, ) var(--tw-backdrop-saturate, ) var(--tw-backdrop-sepia, );
  backdrop-filter: var(--tw-backdrop-blur, ) var(--tw-backdrop-brightness, ) var(--tw-backdrop-contrast, ) var(--tw-backdrop-grayscale, ) var(--tw-backdrop-hue-rotate, ) var(--tw-backdrop-invert, ) var(--tw-backdrop-opacity, ) var(--tw-backdrop-saturate, ) var(--tw-backdrop-sepia, );
}
/* ── 语义材质（把警示色做进材质本体）：见文件上方 SEMANTIC_TINT_CSS 的完整说明 ──
   ⚠️ 必须写在**最后**：语义档位要盖过厚度档位的 --mat-bg/--mat-border/--mat-edge/--mat-shadow
      （同特异性 → 后写的赢）。放在上面任何位置都会被 .dc-mat--thin 等档位默认值反盖。 */
${SEMANTIC_TINT_CSS}
`


/** 帧预算看门狗：p90 帧间隔超过这个毫秒数才算「跑不动」（33ms ≈ 30fps 底线） */
const FRAME_BUDGET_P90_MS = 33
/** 探测窗口：跳过头屏编译/水合/入场动画的头几帧，避免误判为「卡」 */
const PROBE_SKIP_MS = 2400
const PROBE_WINDOW_MS = 1500
/** 一次会话最多降几档（exquisite→gentle→smooth 是两级） */
const MAX_DEMOTIONS = 2

const DEMOTE: Record<MaterialLevel, MaterialLevel> = {
  exquisite: "gentle",
  gentle: "smooth",
  smooth: "smooth",
  /* 关闭档不参与自动降级 —— 它本来就是"最低开销"，已经是终点了 */
  off: "off",
}

/** 档位字面量的唯一校验入口（URL / 排障键 / 用户偏好 / 读 <html> 都走它） */
export function isMaterialLevel(v: unknown): v is MaterialLevel {
  return v === "off" || v === "exquisite" || v === "gentle" || v === "smooth"
}

function readForcedLevel(): MaterialLevel | null {
  if (typeof window === "undefined") return null
  try {
    const q = new URLSearchParams(window.location.search).get("mat")
    if (isMaterialLevel(q)) return q
    const ls = window.localStorage.getItem("dc-mat-level")
    if (isMaterialLevel(ls)) return ls
  } catch {
    /* 隐私模式下 localStorage 会抛异常，忽略即可 */
  }
  return null
}

/* ------------------------------------------------------------------ */
/* 用户偏好（沉浸光感厚度）：读 / 写 / 立即生效                          */
/* ------------------------------------------------------------------ */

/** 读用户选的厚度；没选过（或值非法）返回 null → 交给自动探测 */
export function readUserLevel(): MaterialLevel | null {
  if (typeof window === "undefined") return null
  try {
    const v = window.localStorage.getItem(MATERIAL_PREF_KEY)
    return isMaterialLevel(v) ? v : null
  } catch {
    return null
  }
}

/**
 * 写用户偏好，并**立即**作用到 <html data-mat-level>（不等下一次挂载）。
 * 然后在 window 上广播事件 —— 页面上每个 useAdaptiveMaterialLevel 实例都会收到。
 * ⚠️ 只改 localStorage 不改 DOM 是不够的：同页切档必须当场生效，
 *    否则用户要刷新才看得见自己刚选的东西。
 */
export function saveUserLevel(level: MaterialLevel | null) {
  if (typeof window === "undefined") return
  try {
    if (level) window.localStorage.setItem(MATERIAL_PREF_KEY, level)
    else window.localStorage.removeItem(MATERIAL_PREF_KEY)
  } catch {
    /* 隐私模式忽略 */
  }
  const root = typeof document !== "undefined" ? document.documentElement : null
  if (root) {
    if (level) {
      root.dataset.matLevel = level
      root.dataset.matWhy = `user:${level}`
    } else {
      delete root.dataset.matLevel
      delete root.dataset.matWhy
    }
  }
  window.dispatchEvent(new CustomEvent(MATERIAL_PREF_EVENT, { detail: level }))
}

/** UI（设置弹窗）用：当前实际生效的档位 —— 用户偏好 > <html> 上的真值 > 满配 */
export function readActiveLevel(): MaterialLevel {
  const user = readUserLevel()
  if (user) return user
  if (typeof document !== "undefined") {
    const live = document.documentElement.dataset.matLevel
    if (isMaterialLevel(live)) return live
  }
  return "exquisite"
}

/**
 * 首屏内联脚本（与 next-themes 同一手法）：在水合**之前**把用户选的厚度写到 <html> 上。
 * 为什么必须内联：hook 要等 React 水合后才跑，而 React 一挂载就有一帧是自动档 ——
 * 「精美」用户的页面会先糊出来再跳一次档，肉眼看得很清楚。
 * 脚本还顺带覆盖了**没挂 hook 的页面**（如 landing / blog / 文档页）：档位变量挂在 html 上，
 * 只要 dataset 在，那些页面的材质也跟着用户的选择走 —— 这是「全站生效」的最后一道保险。
 * 没设置过 → 什么都不写，交给 hook 自适应探测。
 *
 * ⚠️ 2026-09-26 实测补丁：**React 会把脚本写在 <html> 上的属性抹掉**。
 *    实测时序（puppeteer 记录 <html data-mat-level> 的变更史）：
 *      196ms  boot 脚本写入 "smooth"  ✅
 *      579ms  MutationObserver 报 mut:<html> → 值变回 null ❌（同一帧 body 子树被大规模重建）
 *    触发条件是 React 水合失败（"this tree will be regenerated on the client"）：一旦重建树，
 *    <html> 上「不属于 React 元素声明」的属性就会被清掉 —— 页面于是退回自动档，
 *    用户会看到"我明明选了流畅，刷新一下又变回去了"。
 *    所以这里不止写一次：**守一个 observer，被抹掉就补回来**（apply 幂等，不会死循环）。
 *    这同时也让设置对"任何原因导致的树重建"免疫，不只针对这一次。
 */
export const MATERIAL_PREF_BOOT = `(function(){try{
var K=${JSON.stringify(MATERIAL_PREF_KEY)};
function apply(){
  try{
    var v=localStorage.getItem(K);
    if(v!=="off"&&v!=="smooth"&&v!=="gentle"&&v!=="exquisite") return;
    var d=document.documentElement;
    if(!d||d.dataset.matLevel===v) return;
    d.dataset.matLevel=v; d.dataset.matWhy="user:"+v;
  }catch(e){}
}
apply();
function arm(){
  try{
    new MutationObserver(apply).observe(document.documentElement,{attributes:true,attributeFilter:["data-mat-level"]});
  }catch(e){}
  document.addEventListener("DOMContentLoaded",apply,{once:true});
  window.addEventListener("load",apply,{once:true});
  setTimeout(apply,500); setTimeout(apply,1500); setTimeout(apply,3000);
}
if(document.documentElement) arm();
else document.addEventListener("readystatechange",arm,{once:true});
}catch(e){}})();`

/** Web 等价 getSystemMaterialTypes()：拿设备能力决定初始材质等级 */
export function detectMaterialLevel(): MaterialLevel {
  if (typeof window === "undefined") return "exquisite"

  // 连模糊都不支持 → 直接最低档（材质退化为半透明实底，不糊）
  const supportsBlur =
    typeof CSS !== "undefined" && typeof CSS.supports === "function"
      ? CSS.supports("backdrop-filter", "blur(1px)") ||
        CSS.supports("-webkit-backdrop-filter", "blur(1px)")
      : true
  if (!supportsBlur) return "smooth"

  // 用户主动要求减少透明度 → 别跟他对着干
  try {
    if (window.matchMedia("(prefers-reduced-transparency: reduce)").matches) return "smooth"
  } catch {
    /* 老浏览器没有这个媒体查询 */
  }

  const nav = navigator as Navigator & { deviceMemory?: number }
  // ⚠️ navigator.deviceMemory 的取值只有 0.25/0.5/1/2/4/8 且**上限就是 8**
  //    → 8 的含义是「≥8GB，具体多少不知道」，绝不能当成「只有 8GB 的低端机」。
  //    没实现该接口时同样按「不弱」处理（拿不到证据就别降档）。
  const memory = typeof nav.deviceMemory === "number" ? nav.deviceMemory : 8
  const cores = typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : 8

  // 真正弱：内存 ≤4GB 且只有 ≤4 核
  if (memory <= 4 && cores <= 4) return "smooth"
  // 偏弱：内存 ≤4GB，或 ≤4 核，或 ≤6 核（低功耗笔记本）
  if (memory <= 4 || cores <= 4 || cores <= 6) return "gentle"
  return "exquisite"
}

/**
 * 首屏帧预算探测 —— 用真实手感（而不是 UA 猜）决定要不要降档。
 * 返回 p90 帧间隔（ms）；0 表示拿不到有效样本（页面被切到后台等），此时不降档。
 */
function probeFrameBudget(): Promise<number> {
  return new Promise((resolve) => {
    const deltas: number[] = []
    let last = 0
    let t0 = 0
    const tick = (t: number) => {
      if (!t0) {
        t0 = t
        last = t
        requestAnimationFrame(tick)
        return
      }
      const d = t - last
      last = t
      // 超过 200ms 的间隔多半是切标签页/系统抢占，不算进预算
      if (t - t0 > PROBE_SKIP_MS && d > 0 && d < 200) deltas.push(d)
      const elapsed = t - t0
      if (elapsed < PROBE_SKIP_MS + PROBE_WINDOW_MS && deltas.length < 900) {
        requestAnimationFrame(tick)
        return
      }
      if (deltas.length < 8) {
        resolve(0)
        return
      }
      deltas.sort((a, b) => a - b)
      resolve(deltas[Math.min(deltas.length - 1, Math.floor(deltas.length * 0.9))])
    }
    requestAnimationFrame(tick)
  })
}

/** 跑不动就降一档（对应规范：材质等级 ADAPTIVE，由系统按设备算力调整） */
export function degradeOnFrameStall(p90ms: number, current: MaterialLevel): MaterialLevel {
  if (!p90ms) return current
  return p90ms > FRAME_BUDGET_P90_MS ? DEMOTE[current] : current
}

export {
  FRAME_BUDGET_P90_MS,
  PROBE_SKIP_MS,
  PROBE_WINDOW_MS,
  MAX_DEMOTIONS,
  DEMOTE,
  readForcedLevel,
  probeFrameBudget,
}
