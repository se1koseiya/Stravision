"use client";

/* ------------------------------------------------------------
   结构化骨架 —— 占位元素与真实布局一一对应
   ─────────────────────────────────────────────────────────────
   原则：不是"整块灰底"，而是按真实窗口的元素切分：
     用户气泡 = 右侧胶囊条 + 头像圆
     AI 回复  = 头像圆 + 头部文字条 + 执行链路行（圆 + 双行条）+ 正文条
     窗口    = 交通灯顶栏 / 侧栏条 / 输入框条
   chunk 加载完成后整体替换为真组件，占位期间观感与最终布局一致。
   颜色直接取自真实组件（#eef0f2 / #1C221E / BerryOrb 圆），双主题对齐。
   ------------------------------------------------------------ */

/* 骨架条 */
function Bar({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-full bg-zinc-200/90 dark:bg-white/[0.08] ${className}`}
      style={style}
    />
  );
}

/* 骨架圆（头像 / 链路图标位） */
function Disc({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`size-[30px] shrink-0 animate-pulse rounded-full bg-zinc-200/90 dark:bg-white/[0.08] ${className}`}
    />
  );
}

/* 用户气泡行（右侧胶囊 + 头像） */
function UserRow({ width = "46%" }: { width?: string }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div
        className="h-8 animate-pulse rounded-[18px] bg-[#eef0f2] dark:bg-[#1C221E]"
        style={{ width }}
      />
      <Disc className="size-8" />
    </div>
  );
}

/* AI 行：orb + 头部条 + 执行链路 3 行 + 正文条（宽度参差模拟文本） */
function AiRow({ chainRows = 3, lines = 3 }: { chainRows?: number; lines?: number }) {
  return (
    <div className="flex gap-2">
      <Disc />
      <div className="min-w-0 flex-1 space-y-2.5">
        {/* 头部：名字 + 副标签 */}
        <div className="flex items-baseline gap-2 pb-0.5">
          <Bar className="h-3 w-12" />
          <Bar className="h-2.5 w-14 opacity-70" />
        </div>
        {/* 执行链路：icon 圆 + 标题/描述双行 */}
        {Array.from({ length: chainRows }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-xl px-1 py-1.5">
            <Disc className="size-6" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Bar className="h-2.5 w-24" />
              <Bar className="h-2 w-[70%] opacity-60" />
            </div>
          </div>
        ))}
        {/* 正文行 */}
        {Array.from({ length: lines }).map((_, i) => (
          <Bar
            key={i}
            className="h-2.5"
            style={{ width: i === lines - 1 ? "62%" : `${94 - i * 6}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 场景区三个演示（DeepResearch / Memory / Device）的加载骨架。
 * 结构 = DemoChat 的真实输出布局。
 */
export function DemoChatSkeleton() {
  return (
    <div className="w-full space-y-4" aria-label="加载中">
      <UserRow width="52%" />
      <AiRow />
      <UserRow width="38%" />
      <AiRow chainRows={2} lines={2} />
    </div>
  );
}

/**
 * chat-demo HeroChat 窗口的加载骨架。
 * 结构 = 真实窗口：交通灯顶栏 / 侧栏 / 对话流 / 快捷 Prompt 胶囊 / 输入条。
 */
export function HeroChatSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_32px_80px_-20px_rgba(15,23,42,0.28)] dark:bg-[#121713]">
      {/* 顶栏：交通灯 + 侧栏开关 */}
      <div className="flex h-10 items-center gap-2 px-4">
        <span className="size-2.5 rounded-full bg-[#FF5F57]" />
        <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="size-2.5 rounded-full bg-[#28C840]" />
        <Bar className="ml-3 h-3 w-3.5 rounded-[4px] opacity-60" />
      </div>

      <div className="flex h-[34rem]">
        {/* 侧栏（与真窗口一致：sm 起显示） */}
        <div className="hidden w-44 shrink-0 flex-col gap-2.5 border-r border-zinc-100 bg-zinc-50/70 p-2.5 sm:flex dark:border-white/[0.05] dark:bg-[#161B17]">
          <div className="flex items-center justify-between px-1.5 pb-1 pt-1">
            <Bar className="h-4 w-14 rounded-lg" />
            <Bar className="size-6 rounded-lg" />
          </div>
          <Bar className="h-8 w-full rounded-[10px]" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Bar key={i} className="h-3 w-[80%] opacity-70" style={{ marginLeft: 6 }} />
          ))}
          <Bar className="mt-2 h-2.5 w-10 opacity-60" style={{ marginLeft: 6 }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <Bar key={i} className="h-7 w-full rounded-lg opacity-80" />
          ))}
        </div>

        {/* 对话区 */}
        <div className="flex min-w-0 flex-1 flex-col p-3.5">
          <div className="min-h-0 flex-1 space-y-4 overflow-hidden pt-2">
            <UserRow width="40%" />
            <AiRow chainRows={3} lines={2} />
            <UserRow width="34%" />
            <AiRow chainRows={2} lines={2} />
          </div>

          {/* 快捷 Prompt 胶囊行 */}
          <div className="flex flex-wrap gap-1.5 pb-2 pt-3">
            {["w-28", "w-24", "w-32", "w-20"].map((w, i) => (
              <div
                key={i}
                className={`h-6 ${w} animate-pulse rounded-full border border-zinc-200 bg-white dark:border-[#2A2F2B] dark:bg-transparent`}
              />
            ))}
          </div>

          {/* 输入条 */}
          <div className="rounded-[14px] border border-zinc-200 p-2.5 dark:border-[#2A2F2B]">
            <Bar className="h-3 w-[55%] opacity-60" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== 区块级结构化骨架（app/page.tsx 用） ===================== */

/* 标题组：eyebrow 条 + 两行大标题条 */
function HeadingSkeleton({ center = false }: { center?: boolean }) {
  return (
    <div className={`space-y-3 ${center ? "mx-auto text-center" : ""}`}>
      <Bar className={`h-3 w-24 ${center ? "mx-auto" : ""}`} />
      <Bar className={`h-8 w-[22rem] max-w-full rounded-lg ${center ? "mx-auto" : ""}`} />
      <Bar className={`h-8 w-[16rem] max-w-full rounded-lg ${center ? "mx-auto" : ""}`} />
    </div>
  );
}

/** Hero：左标题组 + 右 App 窗口 */
export function HeroSkeleton() {
  return (
    <div className="flex min-h-[46rem] flex-col justify-center px-6 pb-24 pt-40">
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <HeadingSkeleton />
          <Bar className="h-3 w-[85%] opacity-70" />
          <Bar className="h-3 w-[65%] opacity-70" />
          <div className="flex gap-3 pt-3">
            <Bar className="h-11 w-32 rounded-full" />
            <Bar className="h-11 w-32 rounded-full opacity-70" />
          </div>
        </div>
        <div className="h-[30rem] rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4 dark:border-white/[0.06] dark:bg-[#121713]">
          <div className="flex h-full flex-col gap-3">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-[#FF5F57]" />
              <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="size-2.5 rounded-full bg-[#28C840]" />
            </div>
            <div className="grid flex-1 grid-cols-[10rem_1fr] gap-3 overflow-hidden">
              <div className="space-y-2 rounded-xl bg-zinc-100/80 p-2.5 dark:bg-[#161B17]">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Bar key={i} className="h-6 w-full rounded-lg opacity-80" />
                ))}
              </div>
              <div className="space-y-3 rounded-xl border border-zinc-100 p-4 dark:border-white/[0.05]">
                <UserRow width="44%" />
                <AiRow chainRows={3} lines={2} />
                <UserRow width="36%" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Bento：2×2 卖点卡网格 */
export function BentoSkeleton() {
  return (
    <div className="px-6 py-24">
      <div className="mx-auto max-w-[1400px]">
        <HeadingSkeleton />
        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[16rem] rounded-2xl border border-zinc-100 p-6 dark:border-white/[0.06]"
            >
              <div className="flex h-full flex-col justify-between gap-4">
                <div className="space-y-2.5">
                  <Bar className="h-3 w-16" />
                  <Bar className="h-5 w-40 rounded-lg" />
                  <Bar className="h-3 w-[80%] opacity-70" />
                </div>
                <Bar className="h-20 w-full rounded-2xl opacity-70" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 场景区：标题 + 三张场景卡 + 左流程右窗口面板 */
export function ScenariosSkeleton() {
  return (
    <div className="px-6 pb-36 pt-24">
      <div className="mx-auto max-w-[1400px]">
        <HeadingSkeleton />
        <div className="mt-12 flex gap-4">
          <div className="h-44 flex-[2] rounded-2xl bg-[#6EE7B7]/70 p-5">
            <div className="flex items-start gap-4">
              <Bar className="size-24 rounded-2xl bg-white/70" />
              <div className="flex-1 space-y-2.5 pt-1">
                <Bar className="h-6 w-28 bg-white/80" />
                <Bar className="h-3 w-[85%] bg-white/70" />
                <Bar className="h-3 w-[60%] bg-white/70" />
              </div>
            </div>
          </div>
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex h-44 flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-100 dark:border-white/[0.06]"
            >
              <Bar className="size-16 rounded-2xl" />
              <Bar className="h-5 w-20 rounded-lg" />
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-12 rounded-[1.75rem] border border-zinc-100 bg-[#ECFDF2]/60 p-12 dark:border-white/[0.06] dark:bg-[#12241A]/60 lg:grid-cols-[442fr_692fr]">
          <div className="space-y-4">
            <Bar className="h-3 w-20" />
            <Bar className="h-6 w-56 rounded-lg" />
            <div className="space-y-4 pt-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Bar className="size-11 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Bar className="h-3 w-28" />
                    <Bar className="h-2.5 w-[75%] opacity-60" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="h-[24rem] rounded-t-3xl border border-zinc-100 bg-white/80 p-6 dark:border-white/[0.06] dark:bg-[#121713]">
            <DemoChatSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

/** 对话演示区：标题 + 预览台包 HeroChat 骨架 */
export function ChatDemoSkeleton() {
  return (
    <div className="px-6 py-28">
      <div className="mx-auto max-w-[1400px]">
        <div className="max-w-[40rem]">
          <HeadingSkeleton />
        </div>
        <div className="mt-10 rounded-[1.75rem] border border-zinc-100 bg-[#FAFFFB] p-8 dark:border-white/[0.06] dark:bg-[#121713]">
          <HeroChatSkeleton />
        </div>
      </div>
    </div>
  );
}

/** 平台区：绿底 + 四张白卡 */
export function PlatformsSkeleton() {
  return (
    <div className="bg-[#6EE7B7] px-6 py-24 dark:bg-[#53BD83]">
      <div className="mx-auto max-w-[1400px]">
        <div className="space-y-3">
          <Bar className="h-3 w-24 bg-white/70" />
          <Bar className="h-8 w-[26rem] max-w-full rounded-lg bg-white/80" />
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="min-h-[13rem] rounded-2xl bg-[#ECFDF5] p-6">
              <div className="flex h-full flex-col justify-between gap-4">
                <Bar className="size-10 rounded-xl bg-[#059669]/15" />
                <div className="space-y-2">
                  <Bar className="h-4 w-24 rounded-lg bg-[#12291D]/20" />
                  <Bar className="h-3 w-[85%] bg-[#12291D]/10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 口碑区：居中标题 + 白胶囊卡 */
export function VoicesSkeleton() {
  return (
    <div className="px-6 py-28">
      <div className="mx-auto max-w-[1400px]">
        <HeadingSkeleton center />
        <div className="mx-auto mt-14 flex max-w-[52rem] flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 self-center rounded-full border border-zinc-100 bg-white py-3 pe-4 ps-3 shadow-sm dark:border-white/[0.06] dark:bg-[#191E1A]"
              style={{ width: `${88 - i * 8}%` }}
            >
              <Bar className="size-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Bar className="h-3 w-[70%]" />
                <Bar className="h-2.5 w-[45%] opacity-60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 定价区：居中标题 + 三张价格卡 */
export function PricingSkeleton() {
  return (
    <div className="px-6 py-28">
      <div className="mx-auto max-w-[1400px]">
        <HeadingSkeleton center />
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[24rem] rounded-2xl border border-zinc-100 p-7 dark:border-white/[0.06] dark:bg-[#151916]"
            >
              <div className="flex h-full flex-col gap-4">
                <Bar className="h-4 w-20 rounded-lg" />
                <Bar className="h-9 w-32 rounded-lg" />
                <div className="flex-1 space-y-2.5 pt-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Bar key={j} className="h-3 w-[85%] opacity-70" />
                  ))}
                </div>
                <Bar className="h-11 w-full rounded-[10px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 尾屏 CTA：居中标题 + 双按钮 */
export function DownloadCtaSkeleton() {
  return (
    <div className="px-6 py-32">
      <div className="mx-auto flex max-w-[40rem] flex-col items-center gap-4">
        <Bar className="h-3 w-20" />
        <Bar className="h-9 w-[28rem] max-w-full rounded-lg" />
        <Bar className="h-3 w-[60%] opacity-70" />
        <div className="flex gap-3 pt-4">
          <Bar className="h-12 w-36 rounded-full" />
          <Bar className="h-12 w-36 rounded-full opacity-70" />
        </div>
      </div>
    </div>
  );
}

/** 页脚：品牌列 + 四组链接列 */
export function FooterSkeleton() {
  return (
    <div className="mx-auto max-w-[63rem] px-6 py-16">
      <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bar className="size-8 rounded-[10px]" />
            <Bar className="h-4 w-12 rounded-lg" />
          </div>
          <Bar className="h-2.5 w-[80%] opacity-60" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2.5">
            <Bar className="h-3 w-16" />
            {Array.from({ length: 4 }).map((_, j) => (
              <Bar key={j} className="h-2.5 w-[70%] opacity-60" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
