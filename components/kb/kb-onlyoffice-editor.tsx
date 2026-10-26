"use client";

/**
 * 知识库 OnlyOffice 编辑器
 *
 * 用于知识库中 Office 文档（docx/pptx/xlsx）的在线编辑/预览。
 * 与 Yjs textarea 编辑器并存：Markdown 文档用 Yjs，Office 文档用 OnlyOffice。
 *
 * 用法：
 *   <KbOnlyOfficeEditor itemId={123} fileUrl="/uploads/xxx.docx"
 *     fileName="报告.docx" canEdit={true} collectionId={12} />
 */

import { useEffect, useRef, useState } from "react";
import { Spin, Alert, Button, Space } from "antd";
import { DESKTOP_CAPABILITIES } from "@/lib/desktop-mode";
import { IconDownload, IconEdit, IconFileText, IconPreviewOpen } from "@/components/icon";

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (id: string, config: any) => {
        destroyEditor: () => void;
      };
    };
  }
}

interface KbOnlyOfficeEditorProps {
  itemId: number;
  fileUrl: string;
  fileName: string;
  canEdit?: boolean;
  collectionId?: number | null;
  height?: number | string;
}

function getDocumentType(fileName: string): "word" | "cell" | "slide" | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  if (["doc", "docx", "txt", "rtf", "html"].includes(ext)) return "word";
  if (["xls", "xlsx", "csv"].includes(ext)) return "cell";
  if (["ppt", "pptx"].includes(ext)) return "slide";
  return null;
}

export default function KbOnlyOfficeEditor({
  itemId,
  fileUrl,
  fileName,
  canEdit = false,
  height = "70vh",
}: KbOnlyOfficeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "view">(canEdit ? "edit" : "view");

  // 桌面端离线运行，没有 OnlyOffice Document Server。
  // 不尝试加载远端 api.js（会白等超时并抛"脚本加载失败"），直接走降级视图。
  const offlineOnly = !DESKTOP_CAPABILITIES.onlyOffice;

  useEffect(() => {
    if (offlineOnly) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const containerId = `kb-onlyoffice-${itemId}`;

    async function init() {
      setLoading(true);
      setError(null);

      try {
        const docType = getDocumentType(fileName);
        if (!docType) {
          throw new Error(`不支持的文件类型: ${fileName}`);
        }

        // 获取 OnlyOffice 配置
        const res = await fetch(
          `/api/knowledge/onlyoffice/config/${itemId}?mode=${mode}`
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "配置加载失败");
        }
        const { config, apiUrl } = await res.json();
        if (cancelled) return;

        // 加载 OnlyOffice API JS
        const loadScript = (): Promise<void> => {
          return new Promise((resolve, reject) => {
            if (window.DocsAPI?.DocEditor) {
              resolve();
              return;
            }
            const script = document.createElement("script");
            script.src = `${apiUrl}web-apps/apps/api/documents/api.js`;
            script.onload = () => resolve();
            script.onerror = () =>
              reject(new Error("OnlyOffice 脚本加载失败，服务可能未启动"));
            document.head.appendChild(script);
          });
        };

        await loadScript();
        if (cancelled) return;

        if (!window.DocsAPI?.DocEditor) {
          throw new Error("OnlyOffice API 不可用");
        }

        editorRef.current?.destroyEditor();

        if (containerRef.current) {
          containerRef.current.id = containerId;
        }

        editorRef.current = new window.DocsAPI.DocEditor(containerId, {
          ...config,
          height: "100%",
          width: "100%",
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
  }, [itemId, mode, fileName, offlineOnly]);

  // 降级视图：保留文件信息与下载，明确说明在线编辑在本地模式下不可用
  if (offlineOnly) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            background: "#fafafa",
            borderRadius: 6,
          }}
        >
          <div style={{ fontSize: 13, color: "#8F959E" }}>文档预览 · {fileName}</div>
          <Button size="small" icon={<IconDownload />} href={fileUrl} download={fileName}>
            下载
          </Button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height,
            minHeight: 320,
            border: "1px solid #EDEEEF",
            borderRadius: 6,
            background: "#fcfcfc",
          }}
        >
          <div style={{ textAlign: "center", padding: "0 24px", maxWidth: 420 }}>
            <IconFileText style={{ fontSize: 34, color: "#b4b2a9" }} />
            <div style={{ marginTop: 14, fontSize: 14, color: "#52525B" }}>{fileName}</div>
            <div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.7, color: "#8F959E" }}>
              在线编辑需要独立的文档服务，本地桌面模式不可用。
              请下载后使用本机 Office 打开，或把内容整理为 Markdown 文档以获得内置编辑能力。
            </div>
            <Button
              type="primary"
              size="small"
              icon={<IconDownload />}
              href={fileUrl}
              download={fileName}
              style={{ marginTop: 16 }}
            >
              下载文件
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* 工具栏 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          background: "#fafafa",
          borderRadius: 6,
        }}
      >
        <div style={{ fontSize: 13, color: "#8F959E" }}>
          OnlyOffice {mode === "edit" ? "编辑" : "预览"}模式 · {fileName}
        </div>
        <Space size={8}>
          {canEdit && (
            <Button
              size="small"
              type={mode === "edit" ? "primary" : "default"}
              icon={<IconEdit />}
              onClick={() => setMode("edit")}
            >
              编辑
            </Button>
          )}
          <Button
            size="small"
            type={mode === "view" ? "primary" : "default"}
            icon={<IconPreviewOpen />}
            onClick={() => setMode("view")}
          >
            预览
          </Button>
          <Button
            size="small"
            icon={<IconDownload />}
            href={fileUrl}
            download={fileName}
          >
            下载
          </Button>
        </Space>
      </div>

      {/* 编辑器区域 */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height,
          minHeight: 500,
          border: "1px solid #EDEEEF",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
              background: "#fff",
            }}
          >
            <Spin tip="正在加载 OnlyOffice..." />
          </div>
        )}
        {error && (
          <div
            style={{
              padding: "40px 20px",
            }}
          >
            <Alert
              title="OnlyOffice 不可用"
              description={`${error}。OnlyOffice Document Server 可能未启动，请使用下载功能查看文档。`}
              type="warning"
              showIcon
              action={
                <Button href={fileUrl} download={fileName} size="small">
                  下载文件
                </Button>
              }
            />
          </div>
        )}
        {!error && (
          <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        )}
      </div>
    </div>
  );
}
