"use client";

/* ------------------------------------------------------------
   文档中心 /docs —— blog 文档库 + 原 docs 模块页 的合并版
   ─────────────────────────────────────────────────────────────
   2026-10-21 合并：原 /blog（文档库，手册列表）与原 /docs（System
   Modules）两个入口重复，统一收敛到 /docs 一个页面：
     · 数据源不变：lib/blog/manuals.ts（后台 DocsManager 同一份 manifest）
     · 详情页迁移到 /docs/[slug]，/blog 与 /blog/[slug] 保留 301 语义的重定向
     · 视觉语言 = 落地页 v4（components/landing-v4）：LandingNav 悬浮胶囊
       导航 + 黄绿双光斑渐变 Hero + 圆角 28px 卡片 + LandingFooter
     · 区块顺序：Hero(搜索/统计) → 按角色浏览 → 全部文档 → 能力速查
       → 开发者入口 → 页脚
   实现约定（沿用 changelog-page.tsx 的既有做法）：
     · next/dynamic 的 options 必须是内联对象字面量；LandingNav / Footer 是
       ssr:false 的客户端组件，统一在这个 "use client" 壳里装配
     · 令牌一律取 shared.ts 的 L / L_MIX / SHADOW，不硬编码颜色值，
       这样 dark 模式由 globals.css 的 --lg-* 整组切换自动接管
   ------------------------------------------------------------ */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LandingThemeProvider } from "@/components/landing-v4/theme-provider";
import { CONTAINER, L, L_MIX, fadeUp } from "@/components/landing-v4/shared";
import type { ManualCategory, ManualIcon, ManualMeta } from "@/lib/blog/manuals-shared";
import { CATEGORY_LABELS } from "@/lib/blog/manuals-shared";
import {
  IconApi,
  IconArrowRightUp,
  IconBookOpen,
  IconBrain,
  IconChartLine,
  IconClose,
  IconFileCode,
  IconFileText,
  IconLayers,
  IconLeaf,
  IconLightning,
  IconNetworkTree,
  IconRocket,
  IconSearch,
  IconSeedling,
  IconSettingTwo,
  IconShield,
  IconShieldCheck,
  IconThermometer,
  IconTime,
  IconVideoOne,
} from "@/components/icon";

const LandingNav = dynamic(
  () => import("@/components/landing-v4/nav").then((m) => m.LandingNav),
  { ssr: false }
);

const LandingFooter = dynamic(
  () => import("@/components/landing-v4/download-cta").then((m) => m.LandingFooter),
  { ssr: false }
);

/* ---------------- 静态索引数据 ---------------- */

/** 分类卡片：按受众划分（与原文档库左侧分类一致，数量由数据实时统计） */
const CATEGORY_CARDS: {
  id: ManualCategory;
  icon: typeof IconBookOpen;
  tone: string;
  desc: string;
  audience: string;
}[] = [
  {
    id: "user",
    icon: IconSeedling,
    tone: L.mint,
    desc: "账号与登录、AI 助手、监控与设备控制、自动化、个人中心的完整操作路径。",
    audience: "面向日常使用者",
  },
  {
    id: "admin",
    icon: IconShieldCheck,
    tone: L.cyan,
    desc: "后台组织与温室、成员与设备授权、文档与模型配置、审计与运营。",
    audience: "面向管理员 / 超级管理员",
  },
  {
    id: "developer",
    icon: IconFileCode,
    tone: L.blue,
    desc: "接口规范、数据模型、MQTT 报文、部署形态与二次开发指引。",
    audience: "面向集成与二次开发",
  },
  {
    id: "release",
    icon: IconRocket,
    tone: L.chip,
    desc: "版本变更、能力演进与升级注意事项，含历史版本对照。",
    audience: "面向运维与验收",
  },
];

/** 模块入口：原 /docs 的 System Modules 用真实能力域重写（数据取自技术手册 1.3） */
const CAPABILITIES: {
  id: string;
  icon: typeof IconThermometer;
  title: string;
  sub: string;
  desc: string;
  href?: string;
}[] = [
  {
    id: "CAP-01",
    icon: IconThermometer,
    title: "环境感知",
    sub: "空气 / 土壤 / 光谱",
    desc: "空气温湿度、光照、二氧化碳，土壤温湿度、电导率、酸碱度与氮磷钾，外加 11 通道光谱，秒级上报。",
    href: "/monitor",
  },
  {
    id: "CAP-02",
    icon: IconVideoOne,
    title: "视觉巡检",
    sub: "云台 + 大模型诊断",
    desc: "云台定位与定时抓帧，视觉大模型识别病虫害与长势，结论沉淀为病历，可复诊追踪同一植株。",
    href: "/monitor",
  },
  {
    id: "CAP-03",
    icon: IconLightning,
    title: "设备控制",
    sub: "4 路继电器 / 4 路 LED / 云台",
    desc: "水泵、风机、双路补光与四路调光，云台 0–700 毫米行程，指令下发后状态回读确认。",
    href: "/device-control",
  },
  {
    id: "CAP-04",
    icon: IconNetworkTree,
    title: "自动化编排",
    sub: "触发 / 条件 / 动作 / AI 决策",
    desc: "节点式可视化编排，规则以流程图入库；AI 决策节点先判断环境再决定是否执行。",
    href: "/automation",
  },
  {
    id: "CAP-05",
    icon: IconBrain,
    title: "智能助手",
    sub: "莓小智 · 工具调用",
    desc: "多轮对话、计划模式、三种人格、三层记忆与技能系统，可读取设备状态并直接下发控制指令。",
    href: "/ai-assistant",
  },
  {
    id: "CAP-06",
    icon: IconBookOpen,
    title: "知识协作",
    sub: "知识库 / 协同编辑",
    desc: "分块 + 向量检索 + 混合排序，版本留存；支持多人协同与 Office 文档在线编辑。",
    href: "/kb-store",
  },
  {
    id: "CAP-07",
    icon: IconChartLine,
    title: "数据分析",
    sub: "仪表盘 / 历史趋势",
    desc: "可拖拽仪表盘、历史趋势、热力图与光谱分析，图表统一取自平台三件套。",
    href: "/dashboard",
  },
  {
    id: "CAP-08",
    icon: IconSettingTwo,
    title: "组织与账号",
    sub: "三级角色 / 设备级授权",
    desc: "普通用户、管理员、超级管理员三级角色，组织与温室层级授权，人员变动即权限变动。",
  },
];

const DEV_ENTRIES: {
  href: string;
  icon: typeof IconApi;
  title: string;
  desc: string;
  tag: string;
}[] = [
  {
    href: "/docs/api",
    icon: IconApi,
    title: "接口参考",
    desc: "平台对外与内部的请求路径、鉴权方式、参数与返回结构，含设备控制与 AI 会话链路。",
    tag: "REST / SSE",
  },
  {
    href: "/docs/architecture",
    icon: IconNetworkTree,
    title: "系统架构",
    desc: "感知层、传输与网络层、平台层、应用层四层结构，附逻辑架构、数据库与用户流程图。",
    tag: "ARCHITECTURE",
  },
  {
    href: "/help",
    icon: IconShield,
    title: "帮助中心",
    desc: "按场景整理的常见问题、故障排查路径与支持渠道，比手册更快定位到具体做法。",
    tag: "FAQ",
  },
];

/* ---------------- 小工具 ---------------- */

const CATEGORY_ICON: Record<ManualIcon, typeof IconBookOpen> = {
  book: IconBookOpen,
  shield: IconShieldCheck,
  code: IconFileCode,
  rocket: IconRocket,
  leaf: IconSeedling,
  brain: IconBrain,
};

/** 头像：有图用图，无图退回首字母（与原文档库一致，避免空白方块） */
function AuthorDot({ name, avatar }: { name?: string; avatar?: string }) {
  // 上传的头像可能随重装 / 换机器丢失（public/uploads 不保证存在），
  // 只判 `avatar` 有没有值会渲染出浏览器的破图占位符，这里必须接住 onError。
  const [broken, setBroken] = useState(false);
  const initial = (name || "?").slice(0, 1).toUpperCase();
  if (avatar && !broken) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={avatar}
        alt={name || ""}
        onError={() => setBroken(true)}
        className="size-[18px] shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      className="flex size-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
      style={{ background: "color-mix(in srgb, var(--lg-green-ink) 15%, transparent)", color: L.ink }}
    >
      {initial}
    </span>
  );
}

/**
 * 卡片摘要：优先用后台填的 description；没填则退回服务端抽的 excerpt。
 * excerpt 是从正文首段粗抽的，zjp / zip 包里可能只剩 `***` 这类分隔符，
 * 这里做一次清洗兜底，避免卡片上出现纯符号。
 */
function summaryOf(m: ManualMeta): string {
  const desc = (m.description || "").trim();
  const fallback = (m.excerpt || "").trim();
  const raw = desc.length >= 6 ? desc : fallback;
  const clean = raw
    .replace(/[*_`~#>|=-]{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length >= 6 ? clean : "暂无摘要，点击查看正文";
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[12px] leading-none"
      style={{ color: L.muted }}
    >
      {children}
    </span>
  );
}

/* ---------------- 主体 ---------------- */

function DocsHub({ manuals }: { manuals: ManualMeta[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ManualCategory | "all">("all");
  const listRef = useRef<HTMLDivElement | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: manuals.length };
    for (const m of manuals) c[m.category] = (c[m.category] || 0) + 1;
    return c;
  }, [manuals]);

  const totalChapters = useMemo(
    () => manuals.reduce((s, m) => s + (m.chapterCount || 0), 0),
    [manuals]
  );
  const totalMinutes = useMemo(
    () => manuals.reduce((s, m) => s + (m.readingTimeMin || 0), 0),
    [manuals]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return manuals
      .filter((m) => {
        if (category !== "all" && m.category !== category) return false;
        if (!q) return true;
        const hay = [
          m.title,
          m.description,
          m.excerpt,
          m.author || "",
          ...(m.tags || []),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return tb - ta;
      });
  }, [manuals, query, category]);

  const jumpToList = (next: ManualCategory | "all") => {
    setCategory(next);
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (!el) return;
      // 手动减掉悬浮导航的高度：scrollIntoView + scroll-margin 在 Lenis / 固定导航下
      // 实测会压到标题（导航 96px 收成 72px），用偏移量滚动更确定。
      const y = el.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    });
  };

  return (
    <section className="relative overflow-hidden bg-white dark:bg-[#09090B]" style={{ color: L.ink }}>
      {/* ============ Hero：黄绿双光斑 + 向下洗白 ============ */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] overflow-hidden">
        <div
          className="absolute inset-0 opacity-100 dark:opacity-[0.14]"
          style={{
            background:
              "linear-gradient(97deg, rgba(255,248,94,0.30) 0%, rgba(255,248,94,0.14) 32%, rgba(117,255,159,0.30) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--lg-surface) 46%, transparent) 0%, transparent 44%, var(--lg-surface) 96%)",
          }}
        />
      </div>

      <div className={`relative ${CONTAINER} pb-8 pt-28 lg:pt-36`}>
        <motion.p
          {...fadeUp()}
          className="m-0 flex items-center gap-3"
          style={{ color: L.greenInk, fontSize: "0.8125rem", fontWeight: 800, letterSpacing: "0.16em" }}
        >
          <span aria-hidden className="inline-block h-px w-6" style={{ background: L.greenInk }} />
          BERRY REALM · DOCUMENTATION
        </motion.p>

        <motion.h1
          {...fadeUp(0.04)}
          className="m-0 mt-5 font-bold"
          style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", lineHeight: 1.02, letterSpacing: "-0.04em" }}
        >
          文档中心
        </motion.h1>

        <motion.p
          {...fadeUp(0.08)}
          className="m-0 mt-6 max-w-[44rem] text-[1.1rem] leading-[1.8]"
          style={{ color: L.muted }}
        >
          用户手册、管理员手册、开发文档与发布说明都收在这里。先按角色挑一条路径，
          也可以直接搜索标题、标签、作者或摘要，定位到具体章节。
        </motion.p>

        {/* 搜索 */}
        <motion.div {...fadeUp(0.12)} className="mt-9 max-w-[44rem]">
          <div
            className="flex h-14 items-center gap-3 rounded-full border px-5 transition-[border-color,box-shadow] focus-within:shadow-[0_0_0_4px_rgba(94,233,181,0.24)]"
            style={{ background: L.card, borderColor: L.line }}
          >
            <IconSearch className="size-[18px] shrink-0" style={{ color: L.muted }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索文档：例如「设备控制」「MQTT」「额度」"
              aria-label="搜索文档"
              className="h-full w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:opacity-60"
              style={{ color: L.ink }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="清空搜索"
                className="flex size-7 shrink-0 items-center justify-center rounded-full transition-colors hover:opacity-70"
                style={{ background: L_MIX.idle, color: L.muted }}
              >
                <IconClose className="size-3.5" />
              </button>
            )}
          </div>
        </motion.div>

        {/* 统计 + 快捷入口 */}
        <motion.div
          {...fadeUp(0.16)}
          className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4"
        >
          {[
            { n: manuals.length, label: "份文档" },
            { n: totalChapters, label: "个章节" },
            { n: totalMinutes, label: "分钟阅读" },
            { n: CATEGORY_CARDS.length, label: "个分类" },
          ].map((s) => (
            <div key={s.label} className="flex items-baseline gap-1.5">
              <span className="text-[1.6rem] font-bold leading-none tracking-tight" style={{ color: L.ink }}>
                {s.n}
              </span>
              <span className="text-[13px]" style={{ color: L.muted }}>
                {s.label}
              </span>
            </div>
          ))}

          <span aria-hidden className="hidden h-5 w-px sm:block" style={{ background: L.line }} />

          <div className="flex flex-wrap items-center gap-2">
            {[
              { href: "/help", label: "帮助中心" },
              { href: "/docs/api", label: "接口参考" },
              { href: "/docs/architecture", label: "系统架构" },
              { href: "/changelog", label: "更新日志" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex h-9 items-center rounded-full border px-4 text-[13px] font-medium transition-[background-color,color,border-color] hover:opacity-80"
                style={{ borderColor: L.line, color: L.ink, background: L_MIX.idle }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ============ 按角色浏览 ============ */}
      <div className={`relative ${CONTAINER} pb-4 pt-14`}>
        <motion.h2
          {...fadeUp()}
          className="m-0 font-bold"
          style={{ fontSize: "clamp(1.5rem, 2.2vw, 1.98rem)", letterSpacing: "-0.01em" }}
        >
          按角色找文档
        </motion.h2>
        <motion.p {...fadeUp(0.04)} className="m-0 mt-3 text-[15px] leading-[1.7]" style={{ color: L.muted }}>
          四类文档对应四种读法：使用者看流程，管理员看权限，开发者看接口，运维看变更。
        </motion.p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CATEGORY_CARDS.map((c, i) => {
            const Icon = c.icon;
            const n = counts[c.id] || 0;
            const active = category === c.id;
            return (
              <motion.button
                key={c.id}
                type="button"
                {...fadeUp(0.05 * i)}
                onClick={() => jumpToList(active ? "all" : c.id)}
                className="group flex h-full flex-col rounded-[1.75rem] border p-7 text-left transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:shadow-[0_1.5rem_3.5rem_rgba(34,34,34,0.12)]"
                style={{
                  background: c.tone,
                  borderColor: active ? L.accentStrong : "transparent",
                  boxShadow: active ? `inset 0 0 0 2px ${L.accentStrong}` : undefined,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="flex size-11 items-center justify-center rounded-2xl"
                    style={{ background: "color-mix(in srgb, var(--lg-green-ink) 15%, transparent)", color: L.ink }}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="text-[1.5rem] font-bold leading-none tracking-tight" style={{ color: L.ink }}>
                    {n}
                  </span>
                </div>

                <h3 className="m-0 mt-6 text-[1.15rem] font-bold" style={{ color: L.ink }}>
                  {CATEGORY_LABELS[c.id]}
                </h3>
                <p className="m-0 mt-1 text-[12px] font-extrabold tracking-[0.12em]" style={{ color: L.greenInk }}>
                  {c.audience}
                </p>
                <p className="m-0 mt-3 text-[13.5px] leading-[1.72]" style={{ color: L.desc }}>
                  {c.desc}
                </p>

                <span className="mt-auto pt-5 text-[13px] font-bold" style={{ color: L.greenInk }}>
                  {active ? "已筛选 · 再点取消" : "查看这组文档 →"}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ============ 全部文档 ============ */}
      <div ref={listRef} className={`relative ${CONTAINER} scroll-mt-28 pb-28 pt-16`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <motion.h2
              {...fadeUp()}
              className="m-0 font-bold"
              style={{ fontSize: "clamp(1.5rem, 2.2vw, 1.98rem)", letterSpacing: "-0.01em" }}
            >
              全部文档
            </motion.h2>
            <p className="m-0 mt-2 text-[13px]" style={{ color: L.muted }}>
              {query
                ? `“${query}” 命中 ${filtered.length} 份文档`
                : category === "all"
                  ? `共 ${manuals.length} 份文档，按更新时间倒序`
                  : `${CATEGORY_LABELS[category]} · ${filtered.length} 份`}
            </p>
          </div>

          {/* 分类筛选胶囊 */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(["all", "user", "admin", "developer", "release"] as const).map((id) => {
              const active = category === id;
              const label = id === "all" ? "全部" : CATEGORY_LABELS[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCategory(id)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-colors"
                  style={{
                    background: active ? L.btnBg : L_MIX.idle,
                    color: active ? L.btnFg : L.muted,
                  }}
                >
                  {label}
                  <span className="text-[11px] opacity-60">{counts[id] || 0}</span>
                </button>
              );
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div
            className="mt-10 flex flex-col items-center justify-center rounded-[1.75rem] border px-6 py-20 text-center"
            style={{ borderColor: L.hairline, background: L_MIX.idle }}
          >
            <IconSearch className="size-7" style={{ color: L.muted }} />
            <p className="m-0 mt-4 text-[15px] font-semibold" style={{ color: L.ink }}>
              没有匹配的文档
            </p>
            <p className="m-0 mt-2 text-[13.5px]" style={{ color: L.muted }}>
              换一个关键词，或者把分类切回「全部」。
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
              className="mt-6 inline-flex h-10 items-center rounded-full px-5 text-[13px] font-bold"
              style={{ background: L.btnBg, color: L.btnFg }}
            >
              重置筛选
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filtered.map((m, i) => {
              const Icon = CATEGORY_ICON[m.icon] || IconFileText;
              return (
                <motion.div key={m.slug} {...fadeUp(Math.min(0.04 * i, 0.3))}>
                  <Link
                    href={`/docs/${encodeURIComponent(m.slug)}`}
                    className="group flex h-full flex-col rounded-[1.75rem] border p-7 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:shadow-[0_1.5rem_3.5rem_rgba(34,34,34,0.12)]"
                    style={{ background: L.card, borderColor: L.hairline }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
                        style={{ background: "color-mix(in srgb, var(--lg-green-ink) 15%, transparent)", color: L.ink }}
                      >
                        <Icon className="size-5" />
                      </span>
                      <span
                        className="inline-flex h-7 items-center rounded-full px-3 text-[11px] font-extrabold tracking-[0.08em]"
                        style={{ background: L_MIX.idle, color: L.muted }}
                      >
                        {CATEGORY_LABELS[m.category]}
                      </span>
                    </div>

                    <h3
                      className="m-0 mt-5 text-[1.1rem] font-bold leading-[1.4] transition-colors group-hover:opacity-70"
                      style={{ color: L.ink }}
                    >
                      {m.title}
                    </h3>

                    <p
                      className="m-0 mt-2.5 line-clamp-2 text-[13.5px] leading-[1.72]"
                      style={{ color: L.muted }}
                    >
                      {summaryOf(m)}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                      {m.chapterCount > 0 && (
                        <MetaChip>
                          <IconLayers className="size-3.5" />
                          {m.chapterCount} 章
                        </MetaChip>
                      )}
                      {m.readingTimeMin > 0 && (
                        <MetaChip>
                          <IconTime className="size-3.5" />
                          {m.readingTimeMin} 分钟
                        </MetaChip>
                      )}
                      {m.updatedAt && <MetaChip>更新于 {m.updatedAt}</MetaChip>}
                      {m.tags?.length > 0 && (
                        <MetaChip>
                          <IconLeaf className="size-3.5" />
                          {m.tags.slice(0, 2).join(" / ")}
                        </MetaChip>
                      )}
                    </div>

                    <div
                      className="mt-auto flex items-center justify-between gap-3 pt-5"
                      style={{ borderTop: `1px solid ${L.hairline}` }}
                    >
                      <span className="flex min-w-0 items-center gap-2 text-[12px]" style={{ color: L.muted }}>
                        <AuthorDot name={m.author} avatar={m.authorAvatar} />
                        <span className="truncate">{m.author || "莓界团队"}</span>
                      </span>
                      <span
                        className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-bold"
                        style={{ color: L.greenInk }}
                      >
                        阅读
                        <IconArrowRightUp className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        {manuals.length === 0 && (
          <p className="m-0 mt-6 text-[13px]" style={{ color: L.muted }}>
            文档库还没有内容，管理员可前往「管理中心 · 文档管理」上传第一份手册。
          </p>
        )}
      </div>

      {/* ============ 能力速查（绿底四卡语言） ============ */}
      <section className="relative overflow-hidden bg-[#6EE7B7] pb-28 pt-24 dark:bg-[#53BD83]">
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-full border"
          style={{
            width: "25rem",
            aspectRatio: "1",
            bottom: "-14rem",
            left: "-8rem",
            borderColor: "color-mix(in srgb, #222222 10%, transparent)",
          }}
        />
        <div className={`relative ${CONTAINER}`}>
          <motion.h2
            {...fadeUp()}
            className="m-0 max-w-[38rem] font-bold"
            style={{
              color: "#222222",
              fontSize: "clamp(2.125rem, 3.125vw, 2.8125rem)",
              lineHeight: 1.25,
              letterSpacing: "-0.02em",
            }}
          >
            平台能力速查
            <br />
            每一块都对应一份文档
          </motion.h2>
          <motion.p
            {...fadeUp(0.05)}
            className="m-0 mt-5 max-w-[40rem] text-[15.5px] leading-[1.8]"
            style={{ color: "#2F4A3B" }}
          >
            先认清能力边界，再决定读哪一章。下面八项与手册章节一一对应，点进去就是对应的业务页面。
          </motion.p>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {CAPABILITIES.map((c, i) => {
              const Icon = c.icon;
              const inner = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="flex size-11 items-center justify-center rounded-2xl"
                      style={{ background: "rgba(255,255,255,0.72)", color: "#0F6B45" }}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="text-[10.5px] font-extrabold tracking-[0.16em]" style={{ color: "#4E6B5B" }}>
                      {c.id}
                    </span>
                  </div>
                  <h3 className="m-0 mt-5 text-[1.06rem] font-bold" style={{ color: "#222222" }}>
                    {c.title}
                  </h3>
                  <p className="m-0 mt-1 text-[12px] font-extrabold tracking-[0.1em]" style={{ color: "#0F6B45" }}>
                    {c.sub}
                  </p>
                  <p className="m-0 mt-3 text-[13px] leading-[1.72]" style={{ color: "#3D5A4A" }}>
                    {c.desc}
                  </p>
                  {c.href && (
                    <span
                      className="mt-auto inline-flex items-center gap-1 pt-5 text-[12.5px] font-bold"
                      style={{ color: "#0F6B45" }}
                    >
                      打开页面
                      <IconArrowRightUp className="size-3.5" />
                    </span>
                  )}
                </>
              );
              const cls =
                "flex h-full flex-col rounded-[1.75rem] p-6 transition-[transform,box-shadow] duration-200 hover:-translate-y-1.5 hover:shadow-[0_1.5rem_3.5rem_rgba(34,34,34,0.16)]";
              const style = { background: "#ECFDF5", color: "#222222" };
              return (
                <motion.div key={c.id} {...fadeUp(0.04 * i)} className="h-full">
                  {c.href ? (
                    <Link href={c.href} className={cls} style={style}>
                      {inner}
                    </Link>
                  ) : (
                    <div className={cls} style={style}>
                      {inner}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ 开发者入口 ============ */}
      <div className={`relative ${CONTAINER} py-24`}>
        <motion.h2
          {...fadeUp()}
          className="m-0 font-bold"
          style={{ fontSize: "clamp(1.5rem, 2.2vw, 1.98rem)", letterSpacing: "-0.01em" }}
        >
          还没找到要的那一份？
        </motion.h2>
        <motion.p {...fadeUp(0.04)} className="m-0 mt-3 max-w-[40rem] text-[15px] leading-[1.75]" style={{ color: L.muted }}>
          手册讲「怎么做」，接口与架构讲「为什么这么设计」。三处入口按使用场景分开维护，互不重复。
        </motion.p>

        <div className="mt-9 grid grid-cols-1 gap-4 md:grid-cols-3">
          {DEV_ENTRIES.map((e, i) => {
            const Icon = e.icon;
            return (
              <motion.div key={e.href} {...fadeUp(0.05 * i)} className="h-full">
                <Link
                  href={e.href}
                  className="group flex h-full flex-col rounded-[1.75rem] border p-7 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_1.5rem_3.5rem_rgba(34,34,34,0.12)]"
                  style={{ background: L.card, borderColor: L.hairline }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="flex size-11 items-center justify-center rounded-2xl"
                      style={{ background: "color-mix(in srgb, var(--lg-green-ink) 15%, transparent)", color: L.ink }}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="text-[10.5px] font-extrabold tracking-[0.16em]" style={{ color: L.muted }}>
                      {e.tag}
                    </span>
                  </div>
                  <h3 className="m-0 mt-5 text-[1.08rem] font-bold" style={{ color: L.ink }}>
                    {e.title}
                  </h3>
                  <p className="m-0 mt-2.5 text-[13.5px] leading-[1.72]" style={{ color: L.muted }}>
                    {e.desc}
                  </p>
                  <span
                    className="mt-auto inline-flex items-center gap-1 pt-6 text-[12.5px] font-bold"
                    style={{ color: L.greenInk }}
                  >
                    前往
                    <IconArrowRightUp className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** 页面壳：主题提供者 + 悬浮导航 + 内容 + 页脚（与 changelog-page 同构） */
export function DocsPageClient({ manuals }: { manuals: ManualMeta[] }) {
  return (
    <LandingThemeProvider>
      <div className="min-h-screen bg-white dark:bg-[#09090B]">
        <LandingNav />
        <main className="pt-20">
          <DocsHub manuals={manuals} />
        </main>
        <LandingFooter />
      </div>
    </LandingThemeProvider>
  );
}

export default DocsPageClient;
