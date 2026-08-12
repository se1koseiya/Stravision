"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Button,
  Table,
  Modal,
  Input,
  Select,
  Tag,
  Space,
  Upload,
  Progress,
  App,
  Segmented,
  Popconfirm,
  Tooltip,
  Empty,
  Spin,
  Typography,
  Alert,
  Avatar,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SearchOutlined,
  CloudUploadOutlined,
  EyeOutlined,
  ReloadOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileWordOutlined,
  FileMarkdownOutlined,
  FileZipOutlined,
  Html5Outlined,
  FileTextOutlined,
  PaperClipOutlined,
  DownloadOutlined,
} from "@ant-design/icons"
import { OnlyOfficeEditor } from "@/components/admin/onlyoffice-editor"

const { Text } = Typography
const { TextArea } = Input

// ============== 类型定义 ==============
interface AttachmentMeta {
  id: string
  fileName: string
  filePath: string
  fileUrl: string
  fileSize: number
  mimeType: string
  ext: string
  uploadedAt: string
}

interface DocManifestEntry {
  slug: string
  title: string
  description: string
  category: "user" | "admin" | "developer" | "release"
  tags: string[]
  icon: "book" | "shield" | "code" | "rocket" | "leaf" | "brain"
  fileType: "md" | "html" | "pdf" | "ppt" | "pptx" | "doc" | "docx" | "zip"
  filePath: string
  originalFileName?: string
  author?: string
  authorAvatar?: string
  cover?: string
  summary?: string
  createdAt: string
  updatedAt: string
  attachments?: AttachmentMeta[]
}

type CategoryKey = "all" | DocManifestEntry["category"]

// ============== 常量映射 ==============
const CATEGORY_LIST: Array<{
  key: DocManifestEntry["category"]
  label: string
}> = [
  { key: "user", label: "用户手册" },
  { key: "admin", label: "管理员手册" },
  { key: "developer", label: "开发文档" },
  { key: "release", label: "发布说明" },
]

const FILE_TYPE_MAP: Record<
  DocManifestEntry["fileType"],
  { label: string; icon: React.ReactNode }
> = {
  md: { label: "Markdown", icon: <FileMarkdownOutlined /> },
  html: { label: "HTML", icon: <Html5Outlined /> },
  pdf: { label: "PDF", icon: <FilePdfOutlined /> },
  ppt: { label: "PPT", icon: <FilePptOutlined /> },
  pptx: { label: "PPT", icon: <FilePptOutlined /> },
  doc: { label: "Word", icon: <FileWordOutlined /> },
  docx: { label: "Word", icon: <FileWordOutlined /> },
  zip: { label: "ZIP 包", icon: <FileZipOutlined /> },
}

const ICON_OPTIONS: Array<{
  value: DocManifestEntry["icon"]
  label: string
}> = [
  { value: "book", label: "Book（手册）" },
  { value: "shield", label: "Shield（安全）" },
  { value: "code", label: "Code（代码）" },
  { value: "rocket", label: "Rocket（发布）" },
  { value: "leaf", label: "Leaf（产品）" },
  { value: "brain", label: "Brain（知识）" },
]

const CATEGORY_OPTIONS: Array<{
  value: DocManifestEntry["category"]
  label: string
}> = CATEGORY_LIST.map((c) => ({ value: c.key, label: c.label }))

const EDITABLE_FILE_TYPES: Array<{
  value: "md" | "html"
  label: string
}> = [
  { value: "md", label: "Markdown (.md)" },
  { value: "html", label: "HTML (.html)" },
]

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_ZIP_SIZE = 100 * 1024 * 1024 // 100MB
const ACCEPTED_EXTENSIONS = [
  ".md",
  ".html",
  ".pdf",
  ".ppt",
  ".pptx",
  ".doc",
  ".docx",
  ".zip",
]

// 附件相关常量
const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024 // 50MB
const ATTACHMENT_ACCEPTED_EXTENSIONS = [
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp",
  ".pdf", ".zip",
  ".txt", ".md", ".csv",
  ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".mp4", ".mp3",
]

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

// 附件类型 → 图标 / 标签
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
}

// ============== 默认表单 ==============
const DEFAULT_CREATE_FORM = {
  title: "",
  description: "",
  category: "user" as DocManifestEntry["category"],
  tags: "",
  icon: "book" as DocManifestEntry["icon"],
  fileType: "md" as "md" | "html",
  content: "",
  author: "",
  authorAvatar: "",
  cover: "",
  summary: "",
}

const DEFAULT_UPLOAD_FORM = {
  title: "",
  description: "",
  category: "user" as DocManifestEntry["category"],
  tags: "",
  icon: "book" as DocManifestEntry["icon"],
  author: "",
  authorAvatar: "",
  cover: "",
  summary: "",
}

// ============== 工具函数 ==============
function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return iso
  }
}

function parseTags(tagsStr: string): string[] {
  return tagsStr
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
}

// ============== 主组件 ==============
export function DocsManager() {
  const { message } = App.useApp()

  const [docs, setDocs] = useState<DocManifestEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all")

  // 新建 Modal
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM)
  const [creating, setCreating] = useState(false)

  // 上传 Modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadForm, setUploadForm] = useState(DEFAULT_UPLOAD_FORM)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)

  // 编辑 Modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<DocManifestEntry | null>(null)
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category: "user" as DocManifestEntry["category"],
    tags: "",
    content: "",
    author: "",
    authorAvatar: "",
    cover: "",
    summary: "",
  })
  const [editContentLoading, setEditContentLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // OnlyOffice 编辑器
  const [onlyofficeOpen, setOnlyofficeOpen] = useState(false)
  const [onlyofficeSlug, setOnlyofficeSlug] = useState("")
  const [onlyofficeTitle, setOnlyofficeTitle] = useState("")

  // 附件管理（编辑 Modal 内）
  const [attachmentUploading, setAttachmentUploading] = useState(false)
  const [attachmentProgress, setAttachmentProgress] = useState(0)
  const [attachmentDeletingId, setAttachmentDeletingId] = useState<string | null>(
    null
  )

  useEffect(() => {
    fetchDocs()
  }, [])

  // ============ 数据加载 ============
  const fetchDocs = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/docs")
      if (!res.ok) throw new Error("加载失败")
      const data = await res.json()
      setDocs(Array.isArray(data.docs) ? data.docs : [])
    } catch (e) {
      console.error("[docs-manager] fetch error:", e)
      message.error("加载文档列表失败")
    } finally {
      setLoading(false)
    }
  }

  // ============ 前端过滤 ============
  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return docs.filter((d) => {
      if (activeCategory !== "all" && d.category !== activeCategory) return false
      if (!q) return true
      return (
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.slug.toLowerCase().includes(q) ||
        (d.tags || []).some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [docs, searchQuery, activeCategory])

  // ============ 新建文档 ============
  const handleOpenCreate = () => {
    setCreateForm(DEFAULT_CREATE_FORM)
    setCreateModalOpen(true)
  }

  const handleCreate = async () => {
    if (!createForm.title.trim()) {
      message.warning("请输入文档标题")
      return
    }
    if (!createForm.author.trim()) {
      message.warning("请输入作者")
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/admin/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createForm.title.trim(),
          description: createForm.description,
          category: createForm.category,
          tags: parseTags(createForm.tags),
          icon: createForm.icon,
          fileType: createForm.fileType,
          content: createForm.content,
          author: createForm.author.trim(),
          authorAvatar: createForm.authorAvatar || undefined,
          cover: createForm.cover || undefined,
          summary: createForm.summary || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "创建失败")
      message.success("文档已创建")
      setCreateModalOpen(false)
      fetchDocs()
    } catch (e: any) {
      console.error("[docs-manager] create error:", e)
      message.error(e.message || "创建失败")
    } finally {
      setCreating(false)
    }
  }

  // ============ 上传文档 ============
  const handleOpenUpload = () => {
    setUploadForm(DEFAULT_UPLOAD_FORM)
    setUploadFile(null)
    setUploadProgress(0)
    setUploadModalOpen(true)
  }

  const handleUploadSubmit = async () => {
    if (!uploadFile) {
      message.warning("请选择要上传的文件")
      return
    }
    if (uploadFile.size > MAX_UPLOAD_SIZE) {
      message.error("文件大小超过 50MB 限制")
      return
    }
    if (!uploadForm.author.trim()) {
      message.warning("请输入作者")
      return
    }
    setUploading(true)
    setUploadProgress(0)
    try {
      const fd = new FormData()
      fd.append("file", uploadFile)
      fd.append("title", uploadForm.title || uploadFile.name.replace(/\.[^.]+$/, ""))
      fd.append("description", uploadForm.description)
      fd.append("category", uploadForm.category)
      fd.append("tags", uploadForm.tags)
      fd.append("icon", uploadForm.icon)
      fd.append("author", uploadForm.author.trim())
      fd.append("authorAvatar", uploadForm.authorAvatar)
      fd.append("cover", uploadForm.cover)
      fd.append("summary", uploadForm.summary)

      const xhr = new XMLHttpRequest()
      xhr.open("POST", "/api/admin/docs", true)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100)
          setUploadProgress(pct)
        }
      }

      const result = await new Promise<{ ok: boolean; data: any }>(
        (resolve, reject) => {
          xhr.onload = () => {
            try {
              const data = JSON.parse(xhr.responseText)
              resolve({ ok: xhr.status >= 200 && xhr.status < 300, data })
            } catch (err) {
              reject(new Error("解析响应失败"))
            }
          }
          xhr.onerror = () => reject(new Error("网络错误"))
          xhr.send(fd)
        }
      )

      if (!result.ok) throw new Error(result.data?.error || "上传失败")
      message.success("文档已上传")
      setUploadModalOpen(false)
      fetchDocs()
    } catch (e: any) {
      console.error("[docs-manager] upload error:", e)
      message.error(e.message || "上传失败")
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // ============ 编辑文档 ============
  const handleOpenEdit = async (doc: DocManifestEntry) => {
    // 所有类型都打开编辑 Modal（可改元信息 + 作者）
    // Office 文档（pdf/ppt/doc）正文用 OnlyOffice 编辑，此处仅改元信息
    const isOfficeDoc = ["pdf", "ppt", "pptx", "doc", "docx"].includes(
      doc.fileType
    )

    setEditingDoc(doc)
    setEditForm({
      title: doc.title,
      description: doc.description || "",
      category: doc.category,
      tags: (doc.tags || []).join(", "),
      content: "",
      author: doc.author || "",
      authorAvatar: doc.authorAvatar || "",
      cover: doc.cover || "",
      summary: doc.summary || "",
    })
    setEditModalOpen(true)

    // 仅对可编辑文档（md/html/zip）加载正文
    if (isOfficeDoc) {
      return
    }

    // 加载文档内容
    setEditContentLoading(true)
    try {
      const res = await fetch(`/api/admin/docs/${encodeURIComponent(doc.slug)}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "加载内容失败")
      setEditForm((prev) => ({
        ...prev,
        content: typeof data.content === "string" ? data.content : "",
      }))
      if (data.editable === false) {
        message.warning("该文档类型不可在线编辑内容（仅可修改元信息）")
      }
    } catch (e: any) {
      console.error("[docs-manager] load edit content error:", e)
      message.error(e.message || "加载内容失败")
    } finally {
      setEditContentLoading(false)
    }
  }

  // ============ 用 OnlyOffice 编辑正文（仅 Office 文档） ============
  const handleOpenOnlyOffice = (doc: DocManifestEntry) => {
    setOnlyofficeSlug(doc.slug)
    setOnlyofficeTitle(doc.title)
    setOnlyofficeOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingDoc) return
    if (!editForm.title.trim()) {
      message.warning("请输入文档标题")
      return
    }
    if (!editForm.author.trim()) {
      message.warning("请输入作者")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(
        `/api/admin/docs/${encodeURIComponent(editingDoc.slug)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editForm.title.trim(),
            description: editForm.description,
            category: editForm.category,
            tags: parseTags(editForm.tags),
            content: editForm.content,
            author: editForm.author.trim(),
            authorAvatar: editForm.authorAvatar || undefined,
            cover: editForm.cover || undefined,
            summary: editForm.summary || undefined,
          }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "保存失败")
      message.success("文档已保存")
      setEditModalOpen(false)
      setEditingDoc(null)
      fetchDocs()
    } catch (e: any) {
      console.error("[docs-manager] save error:", e)
      message.error(e.message || "保存失败")
    } finally {
      setSaving(false)
    }
  }

  // ============ 删除文档 ============
  const handleDelete = async (doc: DocManifestEntry) => {
    try {
      const res = await fetch(
        `/api/admin/docs/${encodeURIComponent(doc.slug)}`,
        { method: "DELETE" }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "删除失败")
      message.success("文档已删除")
      fetchDocs()
    } catch (e: any) {
      console.error("[docs-manager] delete error:", e)
      message.error(e.message || "删除失败")
    }
  }

  // ============ 预览文档 ============
  const handlePreview = (doc: DocManifestEntry) => {
    window.open(`/blog/${encodeURIComponent(doc.slug)}`, "_blank")
  }

  // ============ 文件选择校验 ============
  const beforeUpload = (file: File): boolean => {
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase()
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      message.error(
        `不支持的文件类型: ${ext}，仅支持 ${ACCEPTED_EXTENSIONS.join(" ")}`
      )
      return false
    }
    // zip 包允许更大尺寸
    const maxSize = ext === ".zip" ? MAX_ZIP_SIZE : MAX_UPLOAD_SIZE
    if (file.size > maxSize) {
      message.error(
        `文件大小超过 ${ext === ".zip" ? "100MB" : "50MB"} 限制`
      )
      return false
    }
    setUploadFile(file)
    setUploadProgress(0)
    // 自动填充标题（若为空）
    if (!uploadForm.title) {
      setUploadForm((prev) => ({
        ...prev,
        title: file.name.replace(/\.[^.]+$/, ""),
      }))
    }
    return false // 阻止 antd 自动上传
  }

  // ============ 附件上传（编辑 Modal 内） ============
  const handleAttachmentUpload = (file: File): boolean => {
    if (!editingDoc) return false
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase()
    if (!ATTACHMENT_ACCEPTED_EXTENSIONS.includes(ext)) {
      message.error(
        `不支持的附件类型: ${ext}，仅支持 ${ATTACHMENT_ACCEPTED_EXTENSIONS.join(" ")}`
      )
      return false
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      message.error("附件大小超过 50MB 限制")
      return false
    }

    // 用 XHR 上传以展示进度
    setAttachmentUploading(true)
    setAttachmentProgress(0)

    const fd = new FormData()
    fd.append("file", file)

    const xhr = new XMLHttpRequest()
    xhr.open(
      "POST",
      `/api/admin/docs/${encodeURIComponent(editingDoc.slug)}/attachments`,
      true
    )
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setAttachmentProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          message.success("附件已上传")
          // 同步更新 editingDoc 与 docs 列表
          const updatedDoc = data.doc as DocManifestEntry
          setEditingDoc(updatedDoc)
          setDocs((prev) =>
            prev.map((d) => (d.slug === updatedDoc.slug ? updatedDoc : d))
          )
        } else {
          message.error(data?.error || "附件上传失败")
        }
      } catch {
        message.error("解析上传响应失败")
      } finally {
        setAttachmentUploading(false)
        setAttachmentProgress(0)
      }
    }
    xhr.onerror = () => {
      message.error("网络错误，附件上传失败")
      setAttachmentUploading(false)
      setAttachmentProgress(0)
    }
    xhr.send(fd)

    return false // 阻止 antd 自动上传
  }

  // ============ 附件删除 ============
  const handleDeleteAttachment = async (attachment: AttachmentMeta) => {
    if (!editingDoc) return
    setAttachmentDeletingId(attachment.id)
    try {
      const res = await fetch(
        `/api/admin/docs/${encodeURIComponent(editingDoc.slug)}/attachments/${encodeURIComponent(attachment.id)}`,
        { method: "DELETE" }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "删除附件失败")
      message.success("附件已删除")
      const updatedDoc = data.doc as DocManifestEntry
      setEditingDoc(updatedDoc)
      setDocs((prev) =>
        prev.map((d) => (d.slug === updatedDoc.slug ? updatedDoc : d))
      )
    } catch (e: any) {
      console.error("[docs-manager] delete attachment error:", e)
      message.error(e.message || "删除附件失败")
    } finally {
      setAttachmentDeletingId(null)
    }
  }

  // ============ 表格列 ============
  const columns: ColumnsType<DocManifestEntry> = [
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      render: (title: string, record) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Text
            style={{
              color: "#1677ff",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
            onClick={() => handlePreview(record)}
          >
            {title}
          </Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
              {record.description}
            </Text>
          )}
          {record.tags && record.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
              {record.tags.slice(0, 4).map((t, i) => (
                <Tag key={i} style={{ fontSize: 11, margin: 0 }}>
                  {t}
                </Tag>
              ))}
              {record.tags.length > 4 && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  +{record.tags.length - 4}
                </Text>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "分类",
      dataIndex: "category",
      key: "category",
      width: 110,
      render: (category: DocManifestEntry["category"]) => {
        const meta = CATEGORY_LIST.find((c) => c.key === category)
        return (
          <Tag
            style={{
              color: "#1677ff",
              background: "#E8F1FF",
              border: "none",
              fontSize: 12,
            }}
          >
            {meta?.label || category}
          </Tag>
        )
      },
    },
    {
      title: "作者",
      dataIndex: "author",
      key: "author",
      width: 150,
      render: (author: string, record) => {
        const name = author || "未知作者"
        const initial = name.slice(0, 1)
        return (
          <Space size={8}>
            {record.authorAvatar ? (
              <Avatar
                size={22}
                src={record.authorAvatar}
                style={{ flexShrink: 0 }}
              />
            ) : (
              <Avatar
                size={22}
                style={{
                  backgroundColor: "#1677ff",
                  fontSize: 11,
                  flexShrink: 0,
                }}
              >
                {initial}
              </Avatar>
            )}
            <Text style={{ fontSize: 13 }}>{name}</Text>
          </Space>
        )
      },
    },
    {
      title: "类型",
      dataIndex: "fileType",
      key: "fileType",
      width: 110,
      render: (fileType: DocManifestEntry["fileType"]) => {
        const meta = FILE_TYPE_MAP[fileType]
        return (
          <Space size={6}>
            <span style={{ color: "#86909c" }}>{meta.icon}</span>
            <Text style={{ fontSize: 13 }}>{meta.label}</Text>
          </Space>
        )
      },
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 150,
      render: (updatedAt: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatTime(updatedAt)}
        </Text>
      ),
    },
    {
      title: "操作",
      key: "actions",
      width: 130,
      align: "right",
      fixed: "right",
      render: (_, record) => (
        <Space size={2}>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(record)}
            />
          </Tooltip>
          <Tooltip title="在文档库预览">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(record)}
            />
          </Tooltip>
          <Popconfirm
            title="删除文档"
            description={`确定要删除「${record.title}」吗？`}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record)}
          >
            <Tooltip title="删除">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // ============ Segmented 选项 ============
  const segmentedOptions = useMemo(
    () => [
      {
        label: `全部 ${docs.length}`,
        value: "all",
      },
      ...CATEGORY_LIST.map((c) => ({
        label: `${c.label} ${docs.filter((d) => d.category === c.key).length}`,
        value: c.key as CategoryKey,
      })),
    ],
    [docs]
  )

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* ===== 顶部操作栏（极简扁平，无 Card 包裹） ===== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          paddingBottom: 12,
          borderBottom: "1px solid #EDEEEF",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flex: 1,
            minWidth: 240,
          }}
        >
          <Input
            placeholder="搜索标题 / 描述 / 标签 / slug..."
            prefix={<SearchOutlined style={{ color: "#86909c" }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: 320, height: 32, borderRadius: 6 }}
            allowClear
          />
        </div>
        <Space size={8}>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchDocs}
            size="middle"
          >
            刷新
          </Button>
          <Button
            icon={<CloudUploadOutlined />}
            onClick={handleOpenUpload}
            size="middle"
          >
            上传文档
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreate}
            size="middle"
          >
            新建文档
          </Button>
        </Space>
      </div>

      {/* ===== 分类切换（Segmented 极简分段控件） ===== */}
      <div>
        <Segmented
          value={activeCategory}
          onChange={(v) => setActiveCategory(v as CategoryKey)}
          options={segmentedOptions}
          size="middle"
        />
      </div>

      {/* ===== 文档表格（直接展示，无 Card 包裹） ===== */}
      <Table
        columns={columns}
        dataSource={filteredDocs}
        rowKey="slug"
        loading={loading}
        locale={{
          emptyText: loading ? (
            <div style={{ padding: 24 }}>
              <Spin />
            </div>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                searchQuery || activeCategory !== "all"
                  ? "没有匹配的文档"
                  : "暂无文档，点击「新建文档」或「上传文档」开始"
              }
            />
          ),
        }}
        pagination={{
          pageSize: 10,
          showSizeChanger: false,
          size: "small",
        }}
        scroll={{ x: 800 }}
        size="middle"
      />

      {/* 新建文档 Modal */}
      <Modal
        open={createModalOpen}
        title="新建文档（在线编辑）"
        onCancel={() => setCreateModalOpen(false)}
        destroyOnHidden
        width={860}
        footer={[
          <Button key="cancel" onClick={() => setCreateModalOpen(false)}>
            取消
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={creating}
            onClick={handleCreate}
          >
            创建文档
          </Button>,
        ]}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            paddingTop: 8,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                标题 *
              </Text>
              <Input
                placeholder="文档标题"
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm({ ...createForm, title: e.target.value })
                }
                style={{ height: 40, borderRadius: 10 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                作者 *
              </Text>
              <Input
                placeholder="作者名称"
                value={createForm.author}
                onChange={(e) =>
                  setCreateForm({ ...createForm, author: e.target.value })
                }
                style={{ height: 40, borderRadius: 10 }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Text strong style={{ opacity: 0.6 }}>
              描述
            </Text>
            <Input
              placeholder="简短描述（可选）"
              value={createForm.description}
              onChange={(e) =>
                setCreateForm({ ...createForm, description: e.target.value })
              }
              style={{ height: 40, borderRadius: 10 }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Text strong style={{ opacity: 0.6 }}>
              摘要（用于卡片展示，可留空）
            </Text>
            <TextArea
              placeholder="一段较长的摘要，用于文档卡片展示..."
              value={createForm.summary}
              onChange={(e) =>
                setCreateForm({ ...createForm, summary: e.target.value })
              }
              autoSize={{ minRows: 2, maxRows: 4 }}
              style={{ borderRadius: 8 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                分类
              </Text>
              <Select
                value={createForm.category}
                onChange={(v) =>
                  setCreateForm({ ...createForm, category: v })
                }
                options={CATEGORY_OPTIONS}
                style={{ height: 40 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                图标
              </Text>
              <Select
                value={createForm.icon}
                onChange={(v) =>
                  setCreateForm({ ...createForm, icon: v })
                }
                options={ICON_OPTIONS}
                style={{ height: 40 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                文件类型
              </Text>
              <Select
                value={createForm.fileType}
                onChange={(v) =>
                  setCreateForm({ ...createForm, fileType: v })
                }
                options={EDITABLE_FILE_TYPES.map((t) => ({
                  value: t.value,
                  label: t.label,
                }))}
                style={{ height: 40 }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                封面图 URL（可选）
              </Text>
              <Input
                placeholder="https://..."
                value={createForm.cover}
                onChange={(e) =>
                  setCreateForm({ ...createForm, cover: e.target.value })
                }
                style={{ height: 40, borderRadius: 10 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                作者头像 URL（可选）
              </Text>
              <Input
                placeholder="https://..."
                value={createForm.authorAvatar}
                onChange={(e) =>
                  setCreateForm({ ...createForm, authorAvatar: e.target.value })
                }
                style={{ height: 40, borderRadius: 10 }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Text strong style={{ opacity: 0.6 }}>
              标签（逗号分隔）
            </Text>
            <Input
              placeholder="入门, 指南"
              value={createForm.tags}
              onChange={(e) =>
                setCreateForm({ ...createForm, tags: e.target.value })
              }
              style={{ height: 40, borderRadius: 10 }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Text strong style={{ opacity: 0.6 }}>
              内容
            </Text>
            <TextArea
              placeholder={
                createForm.fileType === "md"
                  ? "# Markdown 内容..."
                  : "<!-- HTML 内容 -->"
              }
              value={createForm.content}
              onChange={(e) =>
                setCreateForm({ ...createForm, content: e.target.value })
              }
              style={{
                minHeight: 400,
                fontFamily: "monospace",
                fontSize: 13,
                borderRadius: 8,
              }}
            />
          </div>
        </div>
      </Modal>

      {/* 上传文档 Modal */}
      <Modal
        open={uploadModalOpen}
        title="上传文档文件"
        onCancel={() => !uploading && setUploadModalOpen(false)}
        destroyOnHidden
        width={640}
        mask={{ closable: !uploading }}
        footer={[
          <Button
            key="cancel"
            onClick={() => setUploadModalOpen(false)}
            disabled={uploading}
          >
            取消
          </Button>,
          <Button
            key="upload"
            type="primary"
            loading={uploading}
            icon={<CloudUploadOutlined />}
            onClick={handleUploadSubmit}
          >
            上传
          </Button>,
        ]}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            paddingTop: 8,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Text strong style={{ opacity: 0.6 }}>
              文件 *
            </Text>
            <Alert
              type="info"
              showIcon
              style={{ fontSize: 12, padding: "6px 12px" }}
              title="ZIP 包说明"
              description={
                <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                  上传 .zip 时，约定包内含一个 .md 文件（推荐 index.md）+ attachment/ 等资源目录。
                  系统会解压到 public/uploads/docs/{`{slug}`}/，并自动把 md 中的相对图片路径改写为可访问的 URL。
                </div>
              }
            />
            <Upload
              beforeUpload={beforeUpload}
              accept={ACCEPTED_EXTENSIONS.join(",")}
              maxCount={1}
              fileList={[]}
              showUploadList={false}
            >
              <Button icon={<CloudUploadOutlined />} disabled={uploading}>
                选择文件
              </Button>
            </Upload>
            {uploadFile && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "8px 12px",
                  border: "1px solid #EDEEEF",
                  borderRadius: 8,
                  backgroundColor: "#F7F8FA",
                }}
              >
                <Space size={8}>
                  <FileTextOutlined style={{ color: "#1677ff" }} />
                  <Text strong style={{ fontSize: 13 }}>
                    {uploadFile.name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                  </Text>
                </Space>
                {!uploading && (
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      setUploadFile(null)
                      setUploadProgress(0)
                    }}
                  />
                )}
              </div>
            )}
            <Text type="secondary" style={{ fontSize: 12 }}>
              支持 {ACCEPTED_EXTENSIONS.join(" / ")}，单文件最大 50MB，ZIP 包最大 100MB
            </Text>
          </div>

          {uploading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Progress percent={uploadProgress} status="active" />
              <Text type="secondary" style={{ fontSize: 12 }}>
                正在上传... {uploadProgress}%
              </Text>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                标题
              </Text>
              <Input
                placeholder="文档标题（不填则使用文件名）"
                value={uploadForm.title}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, title: e.target.value })
                }
                style={{ height: 40, borderRadius: 10 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                作者 *
              </Text>
              <Input
                placeholder="作者名称"
                value={uploadForm.author}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, author: e.target.value })
                }
                style={{ height: 40, borderRadius: 10 }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Text strong style={{ opacity: 0.6 }}>
              描述
            </Text>
            <Input
              placeholder="简短描述（可选）"
              value={uploadForm.description}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, description: e.target.value })
              }
              style={{ height: 40, borderRadius: 10 }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Text strong style={{ opacity: 0.6 }}>
              摘要（用于卡片展示，可留空）
            </Text>
            <TextArea
              placeholder="一段较长的摘要，用于文档卡片展示..."
              value={uploadForm.summary}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, summary: e.target.value })
              }
              autoSize={{ minRows: 2, maxRows: 4 }}
              style={{ borderRadius: 8 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                分类
              </Text>
              <Select
                value={uploadForm.category}
                onChange={(v) =>
                  setUploadForm({ ...uploadForm, category: v })
                }
                options={CATEGORY_OPTIONS}
                style={{ height: 40 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                图标
              </Text>
              <Select
                value={uploadForm.icon}
                onChange={(v) => setUploadForm({ ...uploadForm, icon: v })}
                options={ICON_OPTIONS}
                style={{ height: 40 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                标签（逗号分隔）
              </Text>
              <Input
                placeholder="入门, 指南"
                value={uploadForm.tags}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, tags: e.target.value })
                }
                style={{ height: 40, borderRadius: 10 }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                封面图 URL（可选）
              </Text>
              <Input
                placeholder="https://..."
                value={uploadForm.cover}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, cover: e.target.value })
                }
                style={{ height: 40, borderRadius: 10 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                作者头像 URL（可选）
              </Text>
              <Input
                placeholder="https://..."
                value={uploadForm.authorAvatar}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, authorAvatar: e.target.value })
                }
                style={{ height: 40, borderRadius: 10 }}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* 编辑文档 Modal */}
      <Modal
        open={editModalOpen}
        title={
          editingDoc
            ? `编辑文档：${editingDoc.title}`
            : "编辑文档"
        }
        onCancel={() => !saving && setEditModalOpen(false)}
        destroyOnHidden
        width={860}
        mask={{ closable: !saving }}
        footer={[
          <Button
            key="cancel"
            onClick={() => setEditModalOpen(false)}
            disabled={saving}
          >
            取消
          </Button>,
          editingDoc &&
            ["pdf", "ppt", "pptx", "doc", "docx"].includes(
              editingDoc.fileType
            ) && (
            <Button
              key="onlyoffice"
              icon={<EditOutlined />}
              onClick={() => handleOpenOnlyOffice(editingDoc)}
            >
              用 OnlyOffice 编辑正文
            </Button>
          ),
          <Button
            key="save"
            type="primary"
            loading={saving}
            onClick={handleSaveEdit}
          >
            保存
          </Button>,
        ].filter(Boolean)}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            paddingTop: 8,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                标题 *
              </Text>
              <Input
                placeholder="文档标题"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
                style={{ height: 40, borderRadius: 10 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                作者 *
              </Text>
              <Input
                placeholder="作者名称"
                value={editForm.author}
                onChange={(e) =>
                  setEditForm({ ...editForm, author: e.target.value })
                }
                style={{ height: 40, borderRadius: 10 }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Text strong style={{ opacity: 0.6 }}>
              描述
            </Text>
            <Input
              placeholder="简短描述（可选）"
              value={editForm.description}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
              style={{ height: 40, borderRadius: 10 }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Text strong style={{ opacity: 0.6 }}>
              摘要（用于卡片展示，可留空）
            </Text>
            <TextArea
              placeholder="一段较长的摘要，用于文档卡片展示..."
              value={editForm.summary}
              onChange={(e) =>
                setEditForm({ ...editForm, summary: e.target.value })
              }
              autoSize={{ minRows: 2, maxRows: 4 }}
              style={{ borderRadius: 8 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                分类
              </Text>
              <Select
                value={editForm.category}
                onChange={(v) => setEditForm({ ...editForm, category: v })}
                options={CATEGORY_OPTIONS}
                style={{ height: 40 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                文件类型
              </Text>
              <Input
                value={
                  editingDoc
                    ? FILE_TYPE_MAP[editingDoc.fileType].label
                    : ""
                }
                disabled
                style={{ height: 40, borderRadius: 10 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                标签（逗号分隔）
              </Text>
              <Input
                placeholder="入门, 指南"
                value={editForm.tags}
                onChange={(e) =>
                  setEditForm({ ...editForm, tags: e.target.value })
                }
                style={{ height: 40, borderRadius: 10 }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                封面图 URL（可选）
              </Text>
              <Input
                placeholder="https://..."
                value={editForm.cover}
                onChange={(e) =>
                  setEditForm({ ...editForm, cover: e.target.value })
                }
                style={{ height: 40, borderRadius: 10 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                作者头像 URL（可选）
              </Text>
              <Input
                placeholder="https://..."
                value={editForm.authorAvatar}
                onChange={(e) =>
                  setEditForm({ ...editForm, authorAvatar: e.target.value })
                }
                style={{ height: 40, borderRadius: 10 }}
              />
            </div>
          </div>

          {/* 内容区：仅可编辑文档显示 textarea；上传类文档提示用 OnlyOffice */}
          {editingDoc &&
          ["pdf", "ppt", "pptx", "doc", "docx"].includes(
            editingDoc.fileType
          ) ? (
            <Alert
              type="info"
              showIcon
              style={{ borderRadius: 8 }}
              message="该文档为上传类文件，正文不支持在线文本编辑"
              description="如需修改正文内容，请点击底部「用 OnlyOffice 编辑正文」按钮。此处仅可修改元信息（标题、作者、描述等）。"
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text strong style={{ opacity: 0.6 }}>
                内容
              </Text>
              {editContentLoading ? (
                <div
                  style={{
                    minHeight: 400,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #EDEEEF",
                    borderRadius: 8,
                  }}
                >
                  <Spin tip="加载内容中..." />
                </div>
              ) : (
                <TextArea
                  placeholder="文档内容..."
                  value={editForm.content}
                  onChange={(e) =>
                    setEditForm({ ...editForm, content: e.target.value })
                  }
                  style={{
                    minHeight: 400,
                    fontFamily: "monospace",
                    fontSize: 13,
                    borderRadius: 8,
                  }}
                />
              )}
            </div>
          )}

          {/* 附件管理区 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: 12,
              border: "1px solid #EDEEEF",
              borderRadius: 10,
              backgroundColor: "#F7F8FA",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <Space size={6}>
                <PaperClipOutlined style={{ color: "#1677ff" }} />
                <Text strong style={{ fontSize: 13 }}>
                  附件
                </Text>
                {editingDoc?.attachments &&
                  editingDoc.attachments.length > 0 && (
                    <Tag
                      style={{
                        margin: 0,
                        fontSize: 11,
                        color: "#1677ff",
                        background: "#E8F1FF",
                        border: "none",
                      }}
                    >
                      {editingDoc.attachments.length}
                    </Tag>
                  )}
              </Space>
              <Upload
                beforeUpload={handleAttachmentUpload}
                accept={ATTACHMENT_ACCEPTED_EXTENSIONS.join(",")}
                maxCount={1}
                fileList={[]}
                showUploadList={false}
                disabled={attachmentUploading}
              >
                <Button
                  size="small"
                  icon={<CloudUploadOutlined />}
                  disabled={attachmentUploading}
                >
                  上传附件
                </Button>
              </Upload>
            </div>

            {attachmentUploading && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 4 }}
              >
                <Progress percent={attachmentProgress} status="active" size="small" />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  正在上传附件... {attachmentProgress}%
                </Text>
              </div>
            )}

            {editingDoc?.attachments && editingDoc.attachments.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {editingDoc.attachments.map((att) => {
                  const extMeta = ATTACHMENT_EXT_META[att.ext] || {
                    label: att.ext.toUpperCase().slice(0, 4),
                    color: "#86909c",
                  }
                  return (
                    <div
                      key={att.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "8px 10px",
                        border: "1px solid #EDEEEF",
                        borderRadius: 8,
                        backgroundColor: "#fff",
                      }}
                    >
                      <Space size={10} style={{ minWidth: 0, flex: 1 }}>
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
                            backgroundColor: extMeta.color,
                            flexShrink: 0,
                          }}
                        >
                          {extMeta.label}
                        </span>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            minWidth: 0,
                          }}
                        >
                          <Text
                            style={{ fontSize: 13 }}
                            ellipsis
                            title={att.fileName}
                          >
                            {att.fileName}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {formatFileSize(att.fileSize)}
                          </Text>
                        </div>
                      </Space>
                      <Space size={2} style={{ flexShrink: 0 }}>
                        <Tooltip title="在新标签预览 / 下载">
                          <Button
                            type="text"
                            size="small"
                            icon={<DownloadOutlined />}
                            href={att.fileUrl}
                            target="_blank"
                          />
                        </Tooltip>
                        <Popconfirm
                          title="删除附件"
                          description={`确定删除「${att.fileName}」？`}
                          okText="删除"
                          cancelText="取消"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => handleDeleteAttachment(att)}
                        >
                          <Tooltip title="删除附件">
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              loading={attachmentDeletingId === att.id}
                            />
                          </Tooltip>
                        </Popconfirm>
                      </Space>
                    </div>
                  )
                })}
              </div>
            ) : (
              !attachmentUploading && (
                <Text
                  type="secondary"
                  style={{ fontSize: 12, padding: "4px 0" }}
                >
                  暂无附件，点击「上传附件」为本文档添加可下载的附件文件（单文件最大 50MB）。
                </Text>
              )
            )}
          </div>
        </div>
      </Modal>

      {/* OnlyOffice 编辑器 Modal */}
      {onlyofficeOpen && (
        <OnlyOfficeEditor
          slug={onlyofficeSlug}
          mode="edit"
          title={onlyofficeTitle}
          onClose={() => {
            setOnlyofficeOpen(false)
            fetchDocs() // 编辑关闭后刷新列表
          }}
        />
      )}
    </div>
  )
}

export default DocsManager
