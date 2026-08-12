"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  ChevronUp,
  List as ListIcon,
  X,
  Clock,
  Layers,
  Hash,
  Download,
  FileText,
  ExternalLink,
  Paperclip,
} from "lucide-react";
import type {
  ManualContent,
  ManualTocItem,
  AttachmentMeta,
} from "@/lib/blog/manuals-shared";
import { CATEGORY_LABELS, slugify } from "@/lib/blog/manuals-shared";
import "../blog.css";
import { OnlyOfficeViewer } from "@/components/blog/onlyoffice-viewer";

interface BlogReaderProps {
  manual: ManualContent;
}

function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children && typeof children === "object" && "props" in children) {
    return extractText((children as any).props?.children);
  }
  return "";
}

// ===== 作者头像（首字母 fallback） =====
function ReaderAuthorAvatar({
  name,
  avatar,
  size = 32,
}: {
  name: string;
  avatar?: string;
  size?: number;
}) {
  const initial = (name || "?").slice(0, 1).toUpperCase();
  if (avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={avatar}
        alt={name}
        className="berry-reader-avatar-img"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="berry-reader-avatar-initial"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
    >
      {initial}
    </span>
  );
}

// ===== 附件大小格式化 =====
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// ===== 附件类型 → 简短标签与配色 =====
const ATTACHMENT_EXT_META: Record<string, { label: string; color: string }> = {
  pdf: { label: "PDF", color: "#f5222d" },
  doc: { label: "DOC", color: "#1677ff" },
  docx: { label: "DOC", color: "#1677ff" },
  xls: { label: "XLS", color: "#52c41a" },
  xlsx: { label: "XLS", color: "#52c41a" },
  ppt: { label: "PPT", color: "#fa8c16" },
  pptx: { label: "PPT", color: "#fa8c16" },
  zip: { label: "ZIP", color: "#722ed1" },
  png: { label: "IMG", color: "#13c2c2" },
  jpg: { label: "IMG", color: "#13c2c2" },
  jpeg: { label: "IMG", color: "#13c2c2" },
  gif: { label: "IMG", color: "#13c2c2" },
  webp: { label: "IMG", color: "#13c2c2" },
  bmp: { label: "IMG", color: "#13c2c2" },
  mp4: { label: "MP4", color: "#fa8c16" },
  mp3: { label: "MP3", color: "#eb2f96" },
  txt: { label: "TXT", color: "#86909c" },
  md: { label: "MD", color: "#86909c" },
  csv: { label: "CSV", color: "#52c41a" },
};

// ===== 附件下载区 =====
function BlogAttachments({ items }: { items: AttachmentMeta[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section
      className="berry-attachments"
      style={{
        marginTop: 32,
        padding: "16px 20px",
        border: "1px solid var(--border-1)",
        borderRadius: 10,
        backgroundColor: "var(--bg-2)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Paperclip
          className="w-4 h-4"
          style={{ color: "var(--primary-6)", strokeWidth: 1.75 }}
        />
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-1)",
          }}
        >
          附件下载
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 20,
            height: 18,
            padding: "0 6px",
            borderRadius: 9,
            fontSize: 11,
            color: "var(--primary-6)",
            backgroundColor: "rgba(22, 119, 255, 0.1)",
          }}
        >
          {items.length}
        </span>
      </div>
      <ul style={{ display: "flex", flexDirection: "column", gap: 8, margin: 0, padding: 0, listStyle: "none" }}>
        {items.map((att) => {
          const meta = ATTACHMENT_EXT_META[att.ext] || {
            label: att.ext.toUpperCase().slice(0, 4),
            color: "#86909c",
          };
          return (
            <li key={att.id} style={{ margin: 0 }}>
              <a
                href={att.fileUrl}
                download={att.fileName}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 12px",
                  border: "1px solid var(--border-1)",
                  borderRadius: 8,
                  backgroundColor: "var(--bg-1)",
                  textDecoration: "none",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 38,
                      height: 22,
                      padding: "0 6px",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 500,
                      color: "#fff",
                      backgroundColor: meta.color,
                      flexShrink: 0,
                    }}
                  >
                    {meta.label}
                  </span>
                  <span
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--text-1)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {att.fileName}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                      {formatFileSize(att.fileSize)}
                    </span>
                  </span>
                </span>
                <Download
                  className="w-4 h-4"
                  style={{
                    color: "var(--primary-6)",
                    strokeWidth: 1.75,
                    flexShrink: 0,
                  }}
                />
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BlogReaderImpl({ manual }: BlogReaderProps) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [activeId, setActiveId] = useState<string>("");
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const tickingRef = useRef(false);

  // ---------- 关键性能优化：memo 化 markdown 渲染 ----------
  // 2000+ 行 markdown 仅解析一次，scroll 时不会重渲染
  const markdownComponents = useMemo(
    () => ({
      h1: ({ node, children, ...props }: any) => (
        <h1 id={slugify(extractText(children))} {...props}>
          {children}
        </h1>
      ),
      h2: ({ node, children, ...props }: any) => (
        <h2 id={slugify(extractText(children))} {...props}>
          {children}
        </h2>
      ),
      h3: ({ node, children, ...props }: any) => (
        <h3 id={slugify(extractText(children))} {...props}>
          {children}
        </h3>
      ),
      h4: ({ node, children, ...props }: any) => (
        <h4 id={slugify(extractText(children))} {...props}>
          {children}
        </h4>
      ),
      a: ({ node, href, children, ...props }: any) => {
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
              {...props}
            >
              {children}
            </a>
          );
        }
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
            {children}
          </a>
        );
      },
    }),
    []
  );

  const markdownElement = useMemo(
    () => (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {manual.rawMarkdown}
      </ReactMarkdown>
    ),
    [manual.rawMarkdown, markdownComponents]
  );

  // 仅观察 H2，减少 IntersectionObserver 元素数量
  const h2Toc = useMemo(
    () => manual.toc.filter((t) => t.level === 2),
    [manual.toc]
  );

  // ---------- scroll 节流（rAF）----------
  useEffect(() => {
    const handler = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(() => {
        const doc = document.documentElement;
        const total = doc.scrollHeight - doc.clientHeight;
        const pct = total > 0 ? (doc.scrollTop / total) * 100 : 0;
        setProgress(Math.min(100, Math.max(0, pct)));
        setShowBackToTop(doc.scrollTop > 600);
        tickingRef.current = false;
      });
    };
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // ---------- ScrollSpy：仅监控 H2 ----------
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
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: [0, 1] }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [h2Toc]);

  // ---------- 激活目录项自动滚动到 TOC 可见区中央 ----------
  useEffect(() => {
    if (!activeId) return;
    const activeEl = document.querySelector(
      `.berry-toc-item[data-active="true"]`
    ) as HTMLElement | null;
    const tocWrap = document.querySelector(".berry-toc-wrap") as HTMLElement | null;
    if (!activeEl || !tocWrap) return;
    const wrapRect = tocWrap.getBoundingClientRect();
    const itemRect = activeEl.getBoundingClientRect();
    const offset =
      itemRect.top - wrapRect.top - wrapRect.height / 2 + itemRect.height / 2;
    tocWrap.scrollTo({
      top: tocWrap.scrollTop + offset,
      behavior: "smooth",
    });
  }, [activeId]);

  // ---------- 初始 hash 跳转 ----------
  useEffect(() => {
    if (window.location.hash) {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 200);
      }
    }
  }, []);

  const handleTocClick = (
    e: React.MouseEvent,
    item: ManualTocItem
  ) => {
    e.preventDefault();
    const el = document.getElementById(item.id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${item.id}`);
      setActiveId(item.id);
      setMobileTocOpen(false);
    }
  };

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    history.replaceState(null, "", " ");
  };

  return (
    <div className="berry-doc-root berry-blog-root min-h-screen">
      {/* 进度条 */}
      <div className="berry-progress" style={{ width: `${progress}%` }} />

      {/* 顶部导航 */}
      <header className="berry-topbar">
        <div className="max-w-[1080px] mx-auto px-8 h-12 flex items-center justify-between">
          <button
            onClick={() => router.push("/blog")}
            className="text-[13px] text-[var(--text-3)] hover:text-[var(--primary-6)] transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            文档库
          </button>
          <button
            onClick={() => setMobileTocOpen(true)}
            className="berry-mobile-toc-btn w-8 h-8 rounded items-center justify-center text-[var(--text-3)] hover:bg-[var(--bg-2)]"
            aria-label="目录"
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 主体 */}
      <div className="berry-article-layout">
        {/* 左侧 TOC */}
        <aside className="berry-toc-wrap">
          <div className="berry-toc-label">目录</div>
          <nav>
            {manual.toc.map((item, i) => (
              <a
                key={`${item.id}-${i}`}
                href={`#${item.id}`}
                onClick={(e) => handleTocClick(e, item)}
                data-level={item.level}
                data-active={activeId === item.id}
                className="berry-toc-item"
                title={item.text}
              >
                {item.text}
              </a>
            ))}
          </nav>
        </aside>

        {/* 正文 */}
        <main className="berry-article-main min-w-0">
          {/* 封面图（如有） */}
          {manual.cover && (
            <div
              className="berry-article-cover"
              style={{ backgroundImage: `url(${manual.cover})` }}
              aria-hidden="true"
            />
          )}

          {/* 文章头 */}
          <header className="berry-article-header">
            <div className="berry-article-breadcrumb">
              <Link href="/blog">文档库</Link>
              <span>/</span>
              <span>{CATEGORY_LABELS[manual.category]}</span>
            </div>
            <h1 className="berry-article-title">{manual.title}</h1>
            {manual.description && (
              <p className="berry-article-desc">{manual.description}</p>
            )}

            {/* 作者信息卡片（飞书风格） */}
            <div className="berry-article-author">
              <ReaderAuthorAvatar
                name={manual.author || "未知作者"}
                avatar={manual.authorAvatar}
                size={36}
              />
              <div className="berry-article-author-meta">
                <span className="berry-article-author-name">
                  {manual.author || "未知作者"}
                </span>
                <span className="berry-article-author-role">作者</span>
              </div>
              <span className="berry-article-author-sep" />
              <div className="berry-article-author-stats">
                <span className="berry-article-meta-item">
                  <Layers />
                  {manual.chapterCount} 章
                </span>
                <span className="berry-article-meta-item">
                  <Clock />
                  {manual.readingTimeMin} 分钟
                </span>
                <span className="berry-article-meta-item">
                  <Hash />
                  {manual.wordCount.toLocaleString()} 字
                </span>
                {manual.updatedAt && (
                  <span className="berry-article-meta-item">
                    更新于 {manual.updatedAt}
                  </span>
                )}
              </div>
            </div>
          </header>

          {/* 正文区域 — 根据 fileType 渲染不同内容 */}
          {manual.fileType === "html" ? (
            <article className="berry-body">
              <iframe
                srcDoc={manual.rawMarkdown}
                title={manual.title}
                style={{ width: "100%", minHeight: "70vh", border: "1px solid var(--border-1)", borderRadius: 6 }}
                sandbox="allow-same-origin"
              />
            </article>
          ) : manual.fileType && ["pdf", "ppt", "pptx", "doc", "docx"].includes(manual.fileType) ? (
            <article className="berry-body">
              <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, color: "var(--text-3)" }}>
                  文件类型：{manual.fileType.toUpperCase()}
                  {manual.fileUrl && (
                    <a
                      href={manual.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ marginLeft: 12, color: "var(--primary-6)" }}
                    >
                      <Download style={{ width: 12, height: 12, display: "inline", marginRight: 4 }} />
                      下载原文件
                    </a>
                  )}
                </div>
              </div>
              <OnlyOfficeViewer slug={manual.slug} />
            </article>
          ) : (
            <article className="berry-body">{markdownElement}</article>
          )}

          {/* 附件下载区 */}
          {manual.attachments && manual.attachments.length > 0 && (
            <BlogAttachments items={manual.attachments} />
          )}

          {/* 文末 */}
          <footer className="mt-16 pt-6 border-t border-[var(--border-1)] flex items-center justify-between">
            <span className="text-xs text-[var(--text-3)]">文档结束</span>
            <div className="flex gap-2">
              <button
                onClick={handleBackToTop}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] text-[var(--text-3)] border border-[var(--border-1)] rounded hover:border-[var(--primary-6)] hover:text-[var(--primary-6)] transition-colors"
              >
                <ChevronUp className="w-3 h-3" />
                顶部
              </button>
              <Link
                href="/blog"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] text-[var(--text-3)] border border-[var(--border-1)] rounded hover:border-[var(--primary-6)] hover:text-[var(--primary-6)] transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                返回
              </Link>
            </div>
          </footer>
        </main>
      </div>

      {/* 移动端 TOC 抽屉 */}
      {mobileTocOpen && (
        <>
          <div
            className="berry-drawer-mask"
            onClick={() => setMobileTocOpen(false)}
          />
          <div className="berry-drawer">
            <div className="berry-drawer-header">
              <span>目录 · {manual.chapterCount} 章</span>
              <button
                onClick={() => setMobileTocOpen(false)}
                className="berry-drawer-close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="berry-drawer-body">
              {manual.toc.map((item, i) => (
                <a
                  key={`${item.id}-${i}`}
                  href={`#${item.id}`}
                  onClick={(e) => handleTocClick(e, item)}
                  data-level={item.level}
                  data-active={activeId === item.id}
                  className="berry-toc-item"
                >
                  {item.text}
                </a>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 回到顶部 */}
      <button
        onClick={handleBackToTop}
        className="berry-back-top"
        data-visible={showBackToTop}
        aria-label="回到顶部"
      >
        <ChevronUp />
      </button>
    </div>
  );
}

export default memo(BlogReaderImpl);
