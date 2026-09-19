"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * IconPark 空状态插画组件
 *
 * 资源来源：ByteDance IconPark 官方插画库（Apache-2.0）
 * 已落盘至 public/illustrations/iconpark/*.svg，清单见同目录 index.json
 *
 * @example
 * <Illustration name="empty-list" width={240} />
 * <Illustration name="server-error" className="opacity-90" />
 */

export type IllustrationName =
  | "success"
  | "empty"
  | "search"
  | "not-found"
  | "server-error"
  | "loading-failed"
  | "empty-list"
  | "no-accounts"
  | "no-emails"
  | "data-analysis"
  | "data-report"
  | "get-inspiration"
  | "bug-fix"
  | "save"
  | "loading"
  | "created-successfully"
  | "add-user"
  | "feature-upgrade"
  | "open-topic"
  | "bind-account"
  | "office-collaboration"
  | "unleash-creativity"
  | "search-online"
  | "obtain-information";

export interface IllustrationProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 插画语义名 */
  name: IllustrationName;
  /** 渲染宽度（px），默认 240；高度按 400:300 比例自动 */
  width?: number;
  /** 中文替代文本，默认取 index.json 中的 nameCn */
  alt?: string;
}

/** 插画中文名（用于 alt / 无障碍） */
const ILLUSTRATION_LABELS: Record<IllustrationName, string> = {
  success: "成功",
  empty: "空",
  search: "搜索",
  "not-found": "找不到页面",
  "server-error": "服务器错误",
  "loading-failed": "加载失败",
  "empty-list": "列表内容为空",
  "no-accounts": "未绑定账户",
  "no-emails": "暂无邮件",
  "data-analysis": "数据分析",
  "data-report": "数据报表",
  "get-inspiration": "发散创意",
  "bug-fix": "问题修复中",
  save: "保存成功",
  loading: "加载中",
  "created-successfully": "创建成功",
  "add-user": "绑定用户",
  "feature-upgrade": "功能升级",
  "open-topic": "发布话题",
  "bind-account": "绑定账号",
  "office-collaboration": "办公协作",
  "unleash-creativity": "创意发散",
  "search-online": "检索站点",
  "obtain-information": "获取信息",
};

export const ILLUSTRATION_NAMES = Object.keys(ILLUSTRATION_LABELS) as IllustrationName[];

export function illustrationSrc(name: IllustrationName): string {
  return `/illustrations/iconpark/${name}.svg`;
}

export function Illustration({ name, width = 240, alt, className, style, ...rest }: IllustrationProps) {
  const label = alt ?? ILLUSTRATION_LABELS[name] ?? name;
  return (
    <div
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      style={{ width, ...style }}
      {...rest}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={illustrationSrc(name)}
        alt={label}
        width={width}
        height={Math.round((width * 300) / 400)}
        loading="lazy"
        decoding="async"
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </div>
  );
}

/**
 * 插画 + 标题 + 描述 的整块空状态版式（常用组合）
 */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  illustration?: IllustrationName;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  illustrationWidth?: number;
}

export function EmptyState({
  illustration = "empty-list",
  title,
  description,
  action,
  illustrationWidth = 200,
  className,
  children,
  ...rest
}: EmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-1 py-10 text-center", className)}
      {...rest}
    >
      <Illustration name={illustration} width={illustrationWidth} />
      {title ? <div className="mt-2 text-[14px] font-medium text-zinc-900">{title}</div> : null}
      {description ? <div className="max-w-[360px] text-[13px] leading-relaxed text-zinc-500">{description}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
      {children}
    </div>
  );
}

export default Illustration;
