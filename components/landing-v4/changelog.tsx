"use client";

import { useEffect, useMemo, useState } from "react";
import { L, L_MIX } from "./shared";

/* ------------------------------------------------------------
   产品更新日志页 —— 布局语言对齐 Loomy 的 ChangelogPage 实测值：
     · Hero 居中：eyebrow + 72px 大标题 + 19.2px 灰描述（容器 768px）
     · 内容区 1280px grid「256px 导航 | 952px 条目流」gap 72
     · 左侧版本导航 sticky，滚动高亮（active = 主题绿 + 左侧细线）
     · 右侧条目流带竖向发丝时间线 + 每版一枚绿点
     · 条目：36px 版本号 + 右对齐日期 / 绿色主题小标题 / 灰摘要 / 圆点列表
   ------------------------------------------------------------ */

export interface ChangelogItemView {
  tag: "new" | "improve" | "fix";
  text: string;
}

export interface ChangelogEntryView {
  id: number;
  version: string;
  title: string;
  summary: string;
  releasedAt: string;
  items: ChangelogItemView[];
  published: boolean;
}

const TAG_LABEL: Record<ChangelogItemView["tag"], string> = {
  new: "新增",
  improve: "改进",
  fix: "修复",
};

export function Changelog({ entries }: { entries: ChangelogEntryView[] }) {
  const [activeId, setActiveId] = useState<number>(entries[0]?.id ?? 0);

  /* 滚动高亮：取视口上缘 140px 以下最近的版本标题 */
  useEffect(() => {
    if (entries.length === 0) return;
    const headings = entries
      .map((e) => document.getElementById(`changelog-${e.id}`))
      .filter((el): el is HTMLElement => Boolean(el));
    if (headings.length === 0) return;

    const onScroll = () => {
      let current = headings[0];
      for (const h of headings) {
        if (h.getBoundingClientRect().top <= 180) current = h;
      }
      const id = Number(current.id.replace("changelog-", ""));
      setActiveId(id);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [entries]);

  const jump = (id: number) => {
    document.getElementById(`changelog-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const navItems = useMemo(
    () => entries.map((e) => ({ id: e.id, version: e.version, date: e.releasedAt })),
    [entries]
  );

  return (
    <section className="relative overflow-hidden bg-white dark:bg-[#09090B]" style={{ color: L.ink }}>
      {/* Hero 双色渐隐底：左黄右绿，向下洗进页面底色 */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[24rem] overflow-hidden">
        <div
          className="absolute inset-0 opacity-100 dark:opacity-30"
          style={{ background: "linear-gradient(97deg, rgba(255,248,94,0.30) 0%, rgba(255,248,94,0.16) 34%, rgba(117,255,159,0.30) 100%)" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--lg-surface) 42%, transparent) 0%, transparent 46%, var(--lg-surface) 96%)" }}
        />
      </div>

      {/* Hero —— 左对齐：短横线 eyebrow + 大标题 + 灰描述 */}
      <div className="relative mx-auto w-[min(100%-5rem,80rem)] pb-[3.5rem] pt-14 lg:pt-16">
        <p
          className="m-0 flex items-center gap-3"
          style={{ color: L.greenInk, fontSize: "0.8125rem", fontWeight: 800, letterSpacing: "0.16em" }}
        >
          <span aria-hidden className="inline-block h-px w-6" style={{ background: L.greenInk }} />
          BERRY REALM CHANGELOG
        </p>
        <h1
          className="m-0 mt-5 font-bold"
          style={{
            fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
          }}
        >
          产品更新日志
        </h1>
        <p className="m-0 mt-6 max-w-[40rem] text-[1.2rem] leading-[1.8]" style={{ color: L.muted }}>
          这里记录莓界的每一次版本变化——功能新增、体验优化与问题修复，都在这里集中呈现。
        </p>
      </div>

      {/* 内容区：左导航 | 右条目流 */}
      <div className="mx-auto flex w-[min(100%-2.5rem,80rem)] flex-col gap-10 pb-32 lg:flex-row lg:gap-[4.5rem]">
        {/* 左侧版本导航（桌面端） */}
        <aside className="hidden lg:block lg:w-64 lg:shrink-0">
          <nav className="sticky top-[120px]" aria-label="版本导航">
            <ul className="m-0 list-none p-0">
              {navItems.map((n) => {
                const active = n.id === activeId;
                return (
                  <li key={n.id}>
                    <a
                      href={`#changelog-${n.id}`}
                      onClick={(ev) => {
                        ev.preventDefault();
                        jump(n.id);
                      }}
                      className="block border-l-2 py-1.5 pl-3 no-underline transition-colors"
                      style={{
                        borderColor: active ? L.accentStrong : "transparent",
                        color: active ? L.accentStrong : L.muted,
                      }}
                    >
                      <span className="block text-[14px] font-medium leading-tight">{n.version}</span>
                      <span className="mt-0.5 block text-xs leading-tight">{n.date}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* 右侧条目流：竖向发丝时间线（画在每个条目自己的左边框上，保证连续） */}
        <div className="relative min-w-0 flex-1">
          {entries.length === 0 && (
            <p className="py-24 text-center text-[14px]" style={{ color: L.muted }}>
              暂无更新日志
            </p>
          )}

          {entries.map((entry) => (
            <article
              key={entry.id}
              className="relative pb-24 last:pb-0 lg:border-l lg:pl-10"
              style={{ borderColor: L.hairline }}
            >
              {/* 时间线节点：中心恰好压在左边框上 */}
              <span
                aria-hidden
                className="absolute left-0 top-[15px] z-10 hidden size-3 -translate-x-1/2 rounded-full border-2 bg-white lg:block dark:bg-[#09090B]"
                style={{ borderColor: L.accentStrong }}
              />

              {/* 版本号 + 日期 */}
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h2
                  id={`changelog-${entry.id}`}
                  className="m-0 scroll-mt-36"
                  style={{ fontSize: "clamp(1.75rem, 2.5vw, 2.25rem)", fontWeight: 400, lineHeight: 1.15 }}
                >
                  {entry.version}
                </h2>
                <span className="text-sm" style={{ color: L.muted }}>
                  {entry.releasedAt}
                </span>
              </div>

              {/* 本版主题（绿色小标题） */}
              {entry.title && (
                <p
                  className="m-0 mt-6 text-[0.875rem] font-medium leading-snug"
                  style={{ color: L.greenInk }}
                >
                  {entry.title}
                </p>
              )}

              {/* 摘要 */}
              {entry.summary && (
                <p className="m-0 mt-2 text-base leading-[1.8]" style={{ color: L.muted }}>
                  {entry.summary}
                </p>
              )}

              {/* 条目列表 */}
              {entry.items.length > 0 && (
                <ul
                  className="m-0 mt-5 list-disc pl-5 marker:text-[0.9em]"
                  style={{ ["--tw-marker-color" as string]: L.accentStrong }}
                >
                  {entry.items.map((item, i) => (
                    <li
                      key={i}
                      className="mt-2 text-base leading-[1.75] first:mt-0 marker:text-[#059669]"
                      style={{ color: L.ink }}
                    >
                      <strong className="font-semibold">{TAG_LABEL[item.tag] ?? "更新"}：</strong>
                      {item.text}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </div>

      {/* 底部浅绿渐隐，衔接页脚 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
        style={{ background: `linear-gradient(0deg, ${L_MIX.panel} 0%, rgba(255,255,255,0) 100%)` }}
      />
    </section>
  );
}
