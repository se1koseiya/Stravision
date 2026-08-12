"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (id: string, config: any) => {
        destroyEditor: () => void;
      };
    };
  }
}

/**
 * OnlyOffice 内嵌预览组件（view 模式）
 * 用于博客详情页中嵌入预览 Office 文档
 */
export function OnlyOfficeViewer({ slug }: { slug: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const containerId = `onlyoffice-viewer-${slug.replace(/[^a-zA-Z0-9]/g, "")}`;

    async function init() {
      try {
        // 1. 获取配置
        const res = await fetch(`/api/onlyoffice/config/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "配置加载失败");
        }
        const { config, apiUrl } = await res.json();
        if (cancelled) return;

        // 2. 加载 OnlyOffice API JS
        const loadScript = (): Promise<void> => {
          return new Promise((resolve, reject) => {
            if (window.DocsAPI?.DocEditor) {
              resolve();
              return;
            }
            const script = document.createElement("script");
            script.src = `${apiUrl}web-apps/apps/api/documents/api.js`;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("OnlyOffice 脚本加载失败"));
            document.head.appendChild(script);
            scriptRef.current = script;
          });
        };

        await loadScript();
        if (cancelled) return;

        // 3. 初始化编辑器
        if (!window.DocsAPI?.DocEditor) {
          throw new Error("OnlyOffice API 不可用");
        }

        // 销毁旧实例
        editorRef.current?.destroyEditor();

        // 创建容器
        if (containerRef.current) {
          containerRef.current.id = containerId;
        }

        editorRef.current = new window.DocsAPI.DocEditor(containerId, {
          ...config,
          height: "100%",
          width: "100%",
          events: {
            onError(e: any) {
              console.error("[OnlyOffice] error:", e);
            },
          },
        });

        if (!cancelled) setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || "OnlyOffice 加载失败");
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      editorRef.current?.destroyEditor();
      editorRef.current = null;
    };
  }, [slug]);

  if (error) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          color: "var(--text-muted, #8F959E)",
          fontSize: 14,
        }}
      >
        <div style={{ marginBottom: 12, fontSize: 16, color: "var(--text, #1A1A1A)" }}>
          在线预览不可用
        </div>
        <div style={{ marginBottom: 16 }}>{error}</div>
        <div style={{ fontSize: 13 }}>
          OnlyOffice 服务可能未启动，请使用下载功能查看文档。
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "70vh", minHeight: 500 }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted, #8F959E)",
            fontSize: 14,
          }}
        >
          正在加载 OnlyOffice 预览...
        </div>
      )}
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

export default OnlyOfficeViewer;
