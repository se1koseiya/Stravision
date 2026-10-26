"use client";

/* ------------------------------------------------------------
   文档详情页 /docs/[slug]
   ─────────────────────────────────────────────────────────────
   2026-10-21 迁移 + 改版：
     · 路由从 /blog/[slug] 迁到 /docs/[slug]（旧地址保留重定向）
     · 视觉换成落地页 v4 语言：悬浮胶囊导航 + LandingFooter + 大标题 +
       左侧发丝目录 + 正文用 --lg-* 令牌排版（见 app/docs/manual-prose.css）
     · 原有能力一个不丢：阅读进度、目录 ScrollSpy、锚点跳转、移动端目录抽屉、
       返回顶部、附件下载、HTML 内嵌、PDF / DOCX 的 OnlyOffice 预览

   性能约定：markdown 渲染结果 useMemo 缓存（手册正文可达 2000+ 行，
   滚动时不能重新解析）；滚动监听全部 rAF 节流。
   ------------------------------------------------------------ */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { LandingThemeProvider } from "@/components/landing-v4/theme-provider";
import { CONTAINER, L, L_MIX } from "@/components/landing-v4/shared";
import type {
  AttachmentMeta,
  ManualContent,
  ManualTocItem,
} from "@/lib/blog/manuals-shared";
import { CATEGORY_LABELS, slugify } from "@/lib/blog/manuals-shared";
import { OnlyOfficeViewer } from "@/components/blog/onlyoffice-viewer";
import "../manual-prose.css";
import {
  IconArrowLeft,
  IconArrowRightUp,
  IconBookOpen,
  IconClose,
  IconDownload,
  IconFileCode,
  IconFilePdf,
  IconFileText,
  IconFileWord,
  IconFileZip,
  IconHashtagKey,
  IconLayers,
  IconList,
  IconPaperclip,
  IconTime,
  IconUp,
} from "@/components/icon";

const LandingNav = dynamic(
  () => import("@/components/landing-v4/nav").then((m) => m.LandingNav),
  { ssr: false }
);

const LandingFooter = dynamic(
  () => import("@/components/landing-v4/download-cta").then((m) => m.LandingFooter),
  { ssr: false }
);

/* ---------------- 工具 ---------------- */

/** react-markdown 传进来的渲染 props：node 是 AST 节点（不透传给 DOM），其余按元素属性透传 */
type MdProps = {
  node?: unknown;
  children?: React.ReactNode;
  href?: string;
} & Record<string, unknown>;

function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children && typeof children === "object" && "props" in children) {
    const props = (children as { props?: { children?: React.ReactNode } }).props;
    return extractText(props?.children);
  }
  return "";
}

/** 生成带 anchor id 的标题渲染器（id 与 lib/blog 的 TOC 用同一个 slugify 规则） */
function makeHeading(Tag: "h1" | "h2" | "h3" | "h4") {
  return function Heading({ children, ...rest }: MdProps) {
    const attrs = { ...rest };
    delete attrs.node;
    return (
      <Tag id={slugify(extractText(children))} {...(attrs as React.HTMLAttributes<HTMLHeadingElement>)}>
        {children}
      </Tag>
    );
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const ATTACHMENT_META: Record<string, { label: string; tone: string }> = {
  pdf: { label: "PDF", tone: "#DC2626" },
  doc: { label: "DOC", tone: "#059669" },
  docx: { label: "DOC", tone: "#059669" },
  xls: { label: "XLS", tone: "#059669" },
  xlsx: { label: "XLS", tone: "#059669" },
  ppt: { label: "PPT", tone: "#52525B" },
  pptx: { label: "PPT", tone: "#52525B" },
  zip: { label: "ZIP", tone: "#059669" },
  csv: { label: "CSV", tone: "#059669" },
  png: { label: "IMG", tone: "#52525B" },
  jpg: { label: "IMG", tone: "#52525B" },
  jpeg: { label: "IMG", tone: "#52525B" },
  gif: { label: "IMG", tone: "#52525B" },
  webp: { label: "IMG", tone: "#52525B" },
  mp4: { label: "MP4", tone: "#52525B" },
  mp3: { label: "MP3", tone: "#9333EA" },
  md: { label: "MD", tone: "#8F959E" },
  txt: { label: "TXT", tone: "#8F959E" },
};

function attachmentIcon(ext: string) {
  if (ext === "pdf") return IconFilePdf;
  if (ext === "doc" || ext === "docx") return IconFileWord;
  if (ext === "zip") return IconFileZip;
  if (ext === "html") return IconFileCode;
  return IconFileText;
}

function AuthorAvatar({ name, avatar, size = 32 }: { name?: string; avatar?: string; size?: number }) {
  // 上传的头像文件不保证还在（public/uploads 不入库），只判有没有值会渲染出破图占位符。
  const [broken, setBroken] = useState(false);
  const initial = (name || "?").slice(0, 1).toUpperCase();
  if (avatar && !broken) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={avatar}
        alt={name || ""}
        onError={() => setBroken(true)}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        background: L.mint,
        color: L.greenInk,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {initial}
    </span>
  );
}

/* ---------------- 附件区 ---------------- */

function Attachments({ items }: { items: AttachmentMeta[] }) {
  if (!items?.length) return null;
  return (
    <section
      className="mt-14 rounded-[1.5rem] border p-6"
      style={{ borderColor: L.hairline, background: L_MIX.preview }}
    >
      <div className="flex items-center gap-2.5">
        <IconPaperclip className="size-4" style={{ color: L.greenInk }} />
        <span className="text-[14px] font-bold" style={{ color: L.ink }}>
          附件下载
        </span>
        <span
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
          style={{ background: L.mint, color: L.greenInk }}
        >
          {items.length}
        </span>
      </div>

      <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
        {items.map((att) => {
          const meta = ATTACHMENT_META[att.ext] || {
            label: att.ext.toUpperCase().slice(0, 4),
            tone: "#8F959E",
          };
          const Icon = attachmentIcon(att.ext);
          return (
            <li key={att.id} className="m-0">
              <a
                href={att.fileUrl}
                download={att.fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-[border-color,box-shadow] hover:shadow-[0_0.75rem_1.75rem_rgba(34,34,34,0.08)]"
                style={{ borderColor: L.hairline, background: L.card }}
              >
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `color-mix(in srgb, ${meta.tone} 12%, transparent)`, color: meta.tone }}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[13.5px] font-medium" style={{ color: L.ink }}>
                      {att.fileName}
                    </span>
                    <span className="text-[11.5px]" style={{ color: L.muted }}>
                      {meta.label} · {formatFileSize(att.fileSize)}
                    </span>
                  </span>
                </span>
                <IconDownload className="size-4 shrink-0" style={{ color: L.greenInk }} />
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------------- 主体 ---------------- */

function ManualReader({ manual }: { manual: ManualContent }) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [activeId, setActiveId] = useState("");
  const [tocOpen, setTocOpen] = useState(false);
  const ticking = useRef(false);

  /* markdown 只在正文变化时解析一次 */
  const mdComponents = useMemo(
    () => ({
      h1: makeHeading("h1"),
      h2: makeHeading("h2"),
      h3: makeHeading("h3"),
      h4: makeHeading("h4"),
      a: ({ href, children, ...rest }: MdProps) => {
        const attrs = { ...rest };
        delete attrs.node;
        const anchorProps = attrs as React.AnchorHTMLAttributes<HTMLAnchorElement>;
        if (href?.startsWith("#")) {
          return (
            <a
              href={href}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(href.slice(1));
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                  history.replaceState(null, "", href);
                }
              }}
              {...anchorProps}
            >
              {children}
            </a>
          );
        }
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" {...anchorProps}>
            {children}
          </a>
        );
      },
    }),
    []
  );

  const markdown = useMemo(
    () => (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents as Components}>
        {manual.rawMarkdown}
      </ReactMarkdown>
    ),
    [manual.rawMarkdown, mdComponents]
  );

  const h2Toc = useMemo(() => manual.toc.filter((t) => t.level === 2), [manual.toc]);

  /* 阅读进度 + 回到顶部 */
  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const doc = document.documentElement;
        const total = doc.scrollHeight - doc.clientHeight;
        setProgress(total > 0 ? Math.min(100, Math.max(0, (doc.scrollTop / total) * 100)) : 0);
        setShowTop(doc.scrollTop > 600);
        ticking.current = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* 目录高亮：只观察 H2，减少 IntersectionObserver 数量 */
  useEffect(() => {
    if (h2Toc.length === 0) return;
    const headings = h2Toc
      .map((t) => document.getElementById(t.id))
      .filter(Boolean) as HTMLElement[];
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-90px 0px -70% 0px", threshold: [0, 1] }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [h2Toc]);

  /* 初始 hash 定位 */
  useEffect(() => {
    if (!window.location.hash) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    const el = document.getElementById(id);
    if (!el) return;
    const t = setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    return () => clearTimeout(t);
  }, []);

  const goTo = (item: ManualTocItem) => {
    const el = document.getElementById(item.id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${item.id}`);
    setActiveId(item.id);
    setTocOpen(false);
  };

  const backToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    history.replaceState(null, "", window.location.pathname);
  };

  const isOffice = manual.fileType && ["pdf", "ppt", "pptx", "doc", "docx"].includes(manual.fileType);

  return (
    <div className="min-h-screen bg-white dark:bg-[#09090B]" style={{ color: L.ink }}>
      {/* 阅读进度 */}
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left transition-[width] duration-100"
        style={{
          width: `${progress}%`,
          backgroundImage: `linear-gradient(90deg, ${L.accentStrong}, ${L.emerald300})`,
        }}
      />

      <LandingNav />

      <div className={`${CONTAINER} pb-24 pt-28 lg:pt-32`}>
        {/* 面包屑 */}
        <div className="flex flex-wrap items-center gap-2 text-[13px]" style={{ color: L.muted }}>
          <button
            type="button"
            onClick={() => router.push("/docs")}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors hover:opacity-70"
            style={{ background: L_MIX.idle }}
          >
            <IconArrowLeft className="size-3.5" />
            文档中心
          </button>
          <span aria-hidden>/</span>
          <Link href="/docs" className="hover:opacity-70" style={{ color: L.muted }}>
            {CATEGORY_LABELS[manual.category]}
          </Link>
        </div>

        <div className="mt-8 flex flex-col gap-12 lg:flex-row lg:gap-16">
          {/* 左：目录 */}
          <aside className="hidden w-[15rem] shrink-0 lg:block">
            <nav className="sticky top-[7.5rem] max-h-[calc(100vh-10rem)] overflow-y-auto pr-2" aria-label="文档目录">
              <p
                className="m-0 mb-3 flex items-center gap-2 text-[11px] font-extrabold tracking-[0.16em]"
                style={{ color: L.greenInk }}
              >
                <IconList className="size-3.5" />
                目录
              </p>
              {manual.toc.length === 0 ? (
                <p className="m-0 text-[12.5px]" style={{ color: L.muted }}>
                  本文无二级标题
                </p>
              ) : (
                <ul className="m-0 list-none p-0">
                  {manual.toc.map((item, i) => {
                    const active = activeId === item.id;
                    return (
                      <li key={`${item.id}-${i}`}>
                        <a
                          href={`#${item.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            goTo(item);
                          }}
                          title={item.text}
                          className="block border-l-2 py-1.5 no-underline transition-colors"
                          style={{
                            borderColor: active ? L.accentStrong : "transparent",
                            paddingLeft: item.level === 3 ? "1.6rem" : "0.75rem",
                            color: active ? L.greenInk : L.muted,
                            fontSize: item.level === 3 ? "12.5px" : "13.5px",
                            fontWeight: active ? 700 : 400,
                            lineHeight: 1.5,
                          }}
                        >
                          {item.text}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </nav>
          </aside>

          {/* 右：正文 */}
          <main className="min-w-0 flex-1">
            {/* 文章头 */}
            <header className="pb-8" style={{ borderBottom: `1px solid ${L.hairline}` }}>
              <p
                className="m-0 flex items-center gap-3 text-[11px] font-extrabold tracking-[0.16em]"
                style={{ color: L.greenInk }}
              >
                <span aria-hidden className="inline-block h-px w-5" style={{ background: L.greenInk }} />
                {CATEGORY_LABELS[manual.category]}
                {manual.version ? ` · ${manual.version}` : ""}
              </p>

              <h1
                className="m-0 mt-4 font-bold"
                style={{ fontSize: "clamp(2rem, 3.4vw, 2.9rem)", lineHeight: 1.15, letterSpacing: "-0.035em" }}
              >
                {manual.title}
              </h1>

              {manual.description && (
                <p className="m-0 mt-4 max-w-[46rem] text-[1.02rem] leading-[1.8]" style={{ color: L.muted }}>
                  {manual.description}
                </p>
              )}

              {/* 作者 + 元信息 */}
              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
                <span className="flex items-center gap-2.5">
                  <AuthorAvatar name={manual.author} avatar={manual.authorAvatar} size={34} />
                  <span className="flex flex-col leading-tight">
                    <span className="text-[13.5px] font-bold" style={{ color: L.ink }}>
                      {manual.author || "莓界团队"}
                    </span>
                    <span className="text-[11.5px]" style={{ color: L.muted }}>
                      {manual.audience || "文档维护"}
                    </span>
                  </span>
                </span>

                <span aria-hidden className="hidden h-6 w-px sm:block" style={{ background: L.line }} />

                <span className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px]" style={{ color: L.muted }}>
                  {manual.chapterCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <IconLayers className="size-3.5" />
                      {manual.chapterCount} 章
                    </span>
                  )}
                  {manual.readingTimeMin > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <IconTime className="size-3.5" />
                      {manual.readingTimeMin} 分钟
                    </span>
                  )}
                  {manual.wordCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <IconHashtagKey className="size-3.5" />
                      {manual.wordCount.toLocaleString()} 字
                    </span>
                  )}
                  {manual.updatedAt && <span>更新于 {manual.updatedAt}</span>}
                </span>
              </div>

              {/* 移动端目录入口 */}
              {manual.toc.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTocOpen(true)}
                  className="mt-6 inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] font-semibold lg:hidden"
                  style={{ borderColor: L.line, background: L_MIX.idle, color: L.ink }}
                >
                  <IconList className="size-4" />
                  目录 · {manual.chapterCount || manual.toc.length} 章
                </button>
              )}
            </header>

            {/* 正文：md / html / office */}
            {manual.fileType === "html" ? (
              <article className="mt-8">
                <iframe
                  srcDoc={manual.rawMarkdown}
                  title={manual.title}
                  className="w-full rounded-2xl border"
                  style={{ minHeight: "70vh", borderColor: L.hairline }}
                  sandbox="allow-same-origin"
                />
              </article>
            ) : isOffice ? (
              <article className="mt-8">
                <div className="flex flex-wrap items-center justify-between gap-3 text-[12.5px]" style={{ color: L.muted }}>
                  <span>文件类型：{manual.fileType?.toUpperCase()}</span>
                  {manual.fileUrl && (
                    <a
                      href={manual.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold"
                      style={{ color: L.greenInk }}
                    >
                      <IconDownload className="size-3.5" />
                      下载原文件
                    </a>
                  )}
                </div>
                <div className="mt-4 overflow-hidden rounded-2xl border" style={{ borderColor: L.hairline }}>
                  <OnlyOfficeViewer slug={manual.slug} />
                </div>
              </article>
            ) : (
              <article className="manual-prose mt-10">{markdown}</article>
            )}

            <Attachments items={manual.attachments || []} />

            {/* 文末导航 */}
            <footer
              className="mt-14 flex flex-wrap items-center justify-between gap-3 pt-6"
              style={{ borderTop: `1px solid ${L.hairline}` }}
            >
              <span className="text-[12.5px]" style={{ color: L.muted }}>
                文档结束 · 内容由后台「文档管理」维护
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={backToTop}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-[12.5px] font-semibold transition-colors hover:opacity-70"
                  style={{ borderColor: L.line, color: L.ink }}
                >
                  <IconUp className="size-3.5" />
                  回到顶部
                </button>
                <Link
                  href="/docs"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-bold transition-opacity hover:opacity-85"
                  style={{ background: L.btnBg, color: L.btnFg }}
                >
                  <IconBookOpen className="size-3.5" />
                  返回文档中心
                  <IconArrowRightUp className="size-3.5" />
                </Link>
              </div>
            </footer>
          </main>
        </div>
      </div>

      {/* 移动端目录抽屉 */}
      {tocOpen && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-[2px] lg:hidden"
            onClick={() => setTocOpen(false)}
          />
          <div
            className="fixed inset-y-0 right-0 z-[71] flex w-[min(85vw,20rem)] flex-col lg:hidden"
            style={{ background: L.surface, color: L.ink }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: `1px solid ${L.hairline}` }}
            >
              <span className="text-[13px] font-bold">目录 · {manual.chapterCount || manual.toc.length} 章</span>
              <button
                type="button"
                onClick={() => setTocOpen(false)}
                aria-label="关闭目录"
                className="flex size-8 items-center justify-center rounded-full"
                style={{ background: L_MIX.idle, color: L.muted }}
              >
                <IconClose className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {manual.toc.map((item, i) => {
                const active = activeId === item.id;
                return (
                  <a
                    key={`${item.id}-${i}`}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      goTo(item);
                    }}
                    className="block rounded-xl px-3 py-2 text-[13px] no-underline"
                    style={{
                      paddingLeft: item.level === 3 ? "1.75rem" : "0.75rem",
                      color: active ? L.greenInk : L.muted,
                      background: active ? L.mint : "transparent",
                      fontWeight: active ? 700 : 400,
                    }}
                  >
                    {item.text}
                  </a>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* 回到顶部（桌面端浮动） */}
      <button
        type="button"
        onClick={backToTop}
        aria-label="回到顶部"
        className="fixed bottom-8 right-6 z-40 hidden size-11 items-center justify-center rounded-full border transition-opacity lg:flex"
        style={{
          borderColor: L.line,
          background: L.card,
          color: L.ink,
          opacity: showTop ? 1 : 0,
          pointerEvents: showTop ? "auto" : "none",
          boxShadow: "0 0.75rem 2rem rgba(34,34,34,0.14)",
        }}
      >
        <IconUp className="size-4" />
      </button>

      <LandingFooter />
    </div>
  );
}

export default function ManualReaderPage({ manual }: { manual: ManualContent }) {
  return (
    <LandingThemeProvider>
      <ManualReader manual={manual} />
    </LandingThemeProvider>
  );
}
