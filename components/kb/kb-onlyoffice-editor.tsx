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
import { Download, EditOutlined, EyeOutlined } from "@ant-design/icons";

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

  useEffect(() => {
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
  }, [itemId, mode, fileName]);

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
              icon={<EditOutlined />}
              onClick={() => setMode("edit")}
            >
              编辑
            </Button>
          )}
          <Button
            size="small"
            type={mode === "view" ? "primary" : "default"}
            icon={<EyeOutlined />}
            onClick={() => setMode("view")}
          >
            预览
          </Button>
          <Button
            size="small"
            icon={<Download />}
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
              message="OnlyOffice 不可用"
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
