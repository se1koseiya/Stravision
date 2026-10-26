"use client";

/* ------------------------------------------------------------
   工具调用链 · 内容渲染（参考实现里的 `CompactMarkdown`）
   ─────────────────────────────────────────────────────────────
   参考实现用 Markdown 渲染器展示工具的输入/输出；本项目**不引新依赖**，
   改为一个轻量渲染器：

     · ReactNode                → 原样返回（调用方自己控制）
     · string 且是 JSON 字面量   → 解析成对象后格式化展示
     · string                   → 保留换行的纯文本（不加 Markdown 语义）
     · object / array           → 格式化 JSON（等宽）
     · number / boolean / null  → 直接转文本

   之所以不做完整 Markdown：这里的内容是**工具参数与返回值**（JSON 为主），
   渲染成富文本反而会把 `{"a": 1}` 这种内容误解成结构。
   ------------------------------------------------------------ */

import { isValidElement } from "react";
function JsonBlock({ value }: { value: unknown }) {
  let text: string;
  try {
    text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  } catch {
    text = String(value);
  }
  return (
    <pre className="m-0 max-h-72 overflow-auto whitespace-pre font-mono text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-300">
      {text}
    </pre>
  );
}

function looksLikeJson(text: string): boolean {
  const t = text.trim();
  if (t.length < 2) return false;
  return (
    (t.startsWith("{") && t.endsWith("}")) ||
    (t.startsWith("[") && t.endsWith("]"))
  );
}

/**
 * 解析 JSON 字面量。**解析与渲染必须分开**：把 JSX 写在 try/catch 里
 * 会被 `react-hooks/error-boundaries` 拦下（渲染期抛错不会走 catch）。
 */
function tryParseJson(text: string): { value: unknown } | null {
  try {
    return { value: JSON.parse(text) };
  } catch {
    return null;
  }
}

export interface CompactContentProps {
  content: unknown;
  className?: string;
}

export function CompactContent({ content, className }: CompactContentProps) {
  if (content === null || content === undefined || content === "") return null;

  if (isValidElement(content)) return <>{content}</>;

  if (typeof content === "string") {
    if (looksLikeJson(content)) {
      const parsed = tryParseJson(content);
      if (parsed) return <JsonBlock value={parsed.value} />;
    }
    return (
      <p
        className={
          className ??
          "m-0 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-zinc-600 dark:text-zinc-400"
        }
      >
        {content}
      </p>
    );
  }

  if (typeof content === "number" || typeof content === "boolean") {
    return <span className="text-[12px] tabular-nums">{String(content)}</span>;
  }

  return <JsonBlock value={content} />;
}

export default CompactContent;
