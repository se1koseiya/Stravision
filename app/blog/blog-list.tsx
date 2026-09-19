"use client";

import { memo, useMemo, useState } from "react";
import Link from "next/link";
import type { ManualCategory } from "@/lib/blog/manuals-shared";
import { CATEGORY_LABELS } from "@/lib/blog/manuals-shared";
import type { ManualMeta } from "@/lib/blog/manuals-shared";
import "./blog.css";
import { IconArrowRight, IconBookOpen, IconFileText, IconLayers, IconPlus, IconRight, IconSearch, IconTime } from "@/components/icon";

// ===== 左侧分类 =====
interface SidebarItem {
  id: ManualCategory | "all";
  label: string;
  desc: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "all", label: "全部文档", desc: "所有文档" },
  { id: "user", label: "用户手册", desc: "面向终端用户" },
  { id: "admin", label: "管理员手册", desc: "后台与权限" },
  { id: "developer", label: "开发文档", desc: "架构与接口" },
  { id: "release", label: "发布说明", desc: "版本与变更" },
];

// ===== 作者头像（首字母 fallback） =====
function AuthorAvatar({
  name,
  avatar,
  size = 22,
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
        className="berry-doc-avatar-img"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="berry-doc-avatar-initial"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
    >
      {initial}
    </span>
  );
}

interface BlogListProps {
  manuals: ManualMeta[];
}

function BlogListImpl({ manuals }: BlogListProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ManualCategory | "all">(
    "all"
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return manuals
      .filter((m) => {
        if (activeCategory !== "all" && m.category !== activeCategory)
          return false;
        if (!q) return true;
        return (
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.excerpt.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q)) ||
          (m.author || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return tb - ta;
      });
  }, [manuals, query, activeCategory]);

  // 各分类计数
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: manuals.length };
    for (const m of manuals) {
      counts[m.category] = (counts[m.category] || 0) + 1;
    }
    return counts;
  }, [manuals]);

  const totalChapters = manuals.reduce((s, m) => s + m.chapterCount, 0);
  const totalMinutes = manuals.reduce((s, m) => s + m.readingTimeMin, 0);

  return (
    <div className="berry-doc-root min-h-screen">
      {/* ===== 顶部导航（极简白底细线） ===== */}
      <header className="berry-doc-navbar">
        <div className="berry-doc-container berry-doc-navbar-inner">
          <Link href="/" className="berry-doc-brand">
            <span className="berry-doc-brand-text">STRAVISION</span>
            <span className="berry-doc-brand-divider" />
            <span className="berry-doc-brand-section">文档中心</span>
          </Link>

          <nav className="berry-doc-nav-links">
            <Link href="/blog" className="berry-doc-text-link" data-active>
              文档
            </Link>
            <Link href="/admin" className="berry-doc-text-link">
              管理中心
            </Link>
            <Link href="/" className="berry-doc-text-link">
              返回首页
            </Link>
          </nav>
        </div>
      </header>

      {/* ===== 主体 ===== */}
      <main className="berry-doc-main">
        <div className="berry-doc-container">
          {/* 页面标题区（极简、无 hero 背景） */}
          <div className="berry-doc-page-head">
            <div className="berry-doc-page-head-left">
              <h1 className="berry-doc-page-title">文档中心</h1>
              <p className="berry-doc-page-subtitle">
                浏览 STRAVISION 技术文档，涵盖用户指南、管理员手册、API
                参考与版本说明。
              </p>
            </div>
            <div className="berry-doc-page-stats">
              <div className="berry-doc-page-stat">
                <span className="berry-doc-page-stat-num">{manuals.length}</span>
                <span className="berry-doc-page-stat-label">文档</span>
              </div>
              <span className="berry-doc-page-stat-sep" />
              <div className="berry-doc-page-stat">
                <span className="berry-doc-page-stat-num">{totalChapters}</span>
                <span className="berry-doc-page-stat-label">章节</span>
              </div>
              <span className="berry-doc-page-stat-sep" />
              <div className="berry-doc-page-stat">
                <span className="berry-doc-page-stat-num">{totalMinutes}</span>
                <span className="berry-doc-page-stat-label">分钟阅读</span>
              </div>
            </div>
          </div>

          {/* 双栏布局 */}
          <div className="berry-doc-main-grid">
            {/* ===== 左侧栏（无卡片背景，纯文本列表） ===== */}
            <aside className="berry-doc-sidebar">
              <div className="berry-doc-sidebar-label">分类</div>
              <ul className="berry-doc-sidebar-list">
                {SIDEBAR_ITEMS.map((item, idx) => {
                  const isActive =
                    item.id === "all"
                      ? activeCategory === "all"
                      : activeCategory === item.id;
                  const count =
                    item.id === "all"
                      ? categoryCounts.all
                      : categoryCounts[item.id] || 0;
                  return (
                    <li key={`${item.id}-${idx}`}>
                      <button
                        className="berry-doc-sidebar-item"
                        data-active={isActive}
                        onClick={() => setActiveCategory(item.id)}
                      >
                        <span className="berry-doc-sidebar-item-text">
                          {item.label}
                        </span>
                        <span className="berry-doc-sidebar-item-count">
                          {count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            {/* ===== 右侧主内容 ===== */}
            <div className="berry-doc-content">
              {/* 当前分类标题 + 搜索 */}
              <div className="berry-doc-content-head">
                <div className="berry-doc-content-head-left">
                  <h2 className="berry-doc-content-title">
                    {activeCategory === "all"
                      ? "全部文档"
                      : CATEGORY_LABELS[activeCategory as ManualCategory]}
                  </h2>
                  <span className="berry-doc-content-subtitle">
                    {activeCategory === "all"
                      ? "共 " + filtered.length + " 份文档"
                      : SIDEBAR_ITEMS.find((i) => i.id === activeCategory)?.desc}
                  </span>
                </div>
                <div className="berry-doc-search">
                  <IconSearch
                    className="berry-doc-search-icon"
                    strokeWidth={1.75}
                  />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="搜索文档、作者、标签..."
                  />
                </div>
              </div>

              {/* 文档列表（极简：行式列表，无重卡片） */}
              <div className="berry-doc-list">
                {filtered.length === 0 ? (
                  <div className="berry-doc-empty">
                    <IconSearch
                      strokeWidth={1.5}
                      className="berry-doc-empty-icon"
                    />
                    <div className="berry-doc-empty-title">暂无匹配的文档</div>
                    <div className="berry-doc-empty-desc">
                      试试更换关键词或切换分类
                    </div>
                  </div>
                ) : (
                  filtered.map((m) => (
                    <Link
                      key={m.slug}
                      href={`/blog/${m.slug}`}
                      className="berry-doc-list-item"
                    >
                      <div className="berry-doc-list-item-main">
                        <div className="berry-doc-list-item-title-row">
                          <span className="berry-doc-list-item-title">
                            {m.title}
                          </span>
                          <span
                            className={`berry-doc-list-item-tag berry-doc-list-item-tag--${m.category}`}
                          >
                            {CATEGORY_LABELS[m.category]}
                          </span>
                        </div>
                        <div className="berry-doc-list-item-desc">
                          {m.description || m.excerpt || "暂无描述"}
                        </div>
                        <div className="berry-doc-list-item-meta">
                          <span className="berry-doc-list-item-author">
                            <AuthorAvatar
                              name={m.author || "未知作者"}
                              avatar={m.authorAvatar}
                              size={16}
                            />
                            {m.author || "未知作者"}
                          </span>
                          {m.updatedAt && (
                            <>
                              <span className="berry-doc-list-item-meta-sep" />
                              <span>
                                <IconTime strokeWidth={1.75} />
                                {m.updatedAt}
                              </span>
                            </>
                          )}
                          {m.chapterCount > 0 && (
                            <>
                              <span className="berry-doc-list-item-meta-sep" />
                              <span>
                                <IconLayers strokeWidth={1.75} />
                                {m.chapterCount} 章
                              </span>
                            </>
                          )}
                          {m.readingTimeMin > 0 && (
                            <>
                              <span className="berry-doc-list-item-meta-sep" />
                              <span>
                                <IconBookOpen strokeWidth={1.75} />
                                {m.readingTimeMin} 分钟
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <IconRight
                        strokeWidth={1.75}
                        className="berry-doc-list-item-arrow"
                      />
                    </Link>
                  ))
                )}
              </div>

              {/* 空状态时显示「去后台添加」入口 */}
              {manuals.length === 0 && (
                <div className="berry-doc-empty-state">
                  <IconFileText
                    strokeWidth={1.5}
                    className="berry-doc-empty-state-icon"
                  />
                  <div className="berry-doc-empty-state-title">
                    文档库还没有内容
                  </div>
                  <div className="berry-doc-empty-state-desc">
                    前往管理中心上传或创建第一份文档
                  </div>
                  <Link href="/admin" className="berry-doc-empty-state-btn">
                    <IconPlus strokeWidth={1.75} />
                    前往管理中心
                    <IconArrowRight strokeWidth={1.75} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ===== 页脚 ===== */}
      <footer className="berry-doc-footer">
        <div className="berry-doc-container berry-doc-footer-inner">
          <span>© {new Date().getFullYear()} STRAVISION 莓界</span>
          <span className="berry-doc-footer-copy">文档中心</span>
        </div>
      </footer>
    </div>
  );
}

export default memo(BlogListImpl);
