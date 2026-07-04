"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Button,
  Input,
  Table,
  Modal,
  Tag,
  Space,
  Typography,
  App,
  Select,
  Upload,
  Empty,
  Tabs,
  Spin,
  Tooltip,
  Switch
} from "antd"
import type { ColumnsType } from "antd/es/table"
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  BookOutlined,
  FireOutlined,
  ReloadOutlined,
  CloudUploadOutlined,
  LinkOutlined,
  EyeOutlined,
  FileTextOutlined,
  PictureOutlined,
  ThunderboltOutlined,
  CloseCircleOutlined,
  LoadingOutlined
} from "@ant-design/icons"

const { Text } = Typography
const { TextArea } = Input

interface MarketCollection {
  id: number
  user_id: number
  name: string
  description: string | null
  parent_id: number | null
  color: string
  icon: string
  category: string
  cover_image: string | null
  popularity: number
  official: 0 | 1
  publisher_id: number | null
  published_at: number | null
  item_count: number
  is_marketplace: 0 | 1
  is_archived: 0 | 1
  created_at: number
  updated_at: number
  subscriber_count: number
  item_count_real: number
  is_subscribed: 0 | 1
  publisher_name?: string | null
  tags?: string | null
  access_level?: string
}

interface MarketItem {
  id: number
  title: string
  summary: string | null
  content_type: string
  file_url: string | null
  mime_type: string | null
  file_size: number
  embedding_status: string
  view_count: number
  tags_cache: string
  created_at: number
  updated_at: number
  source_url?: string | null
}

interface FormState {
  id?: number
  name: string
  description: string
  category: string
  cover_image: string
  color: string
  icon: string
  official: boolean
  is_archived: 0 | 1
  popularity: number
}

const DEFAULT_FORM: FormState = {
  name: "",
  description: "",
  category: "agriculture",
  cover_image: "",
  color: "#1677ff",
  icon: "book",
  official: false,
  is_archived: 0,
  popularity: 0
}

const CATEGORY_OPTIONS = [
  { value: "agriculture", label: "农业" },
  { value: "general", label: "通用" },
  { value: "industry", label: "工业" },
  { value: "service", label: "服务业" },
  { value: "education", label: "教育" },
  { value: "medical", label: "医疗" },
  { value: "finance", label: "金融" },
  { value: "tech", label: "科技" }
]

const ICON_OPTIONS = [
  { value: "book", label: "📖 书本" },
  { value: "leaf", label: "🌿 叶子" },
  { value: "flask", label: "⚗️ 烧瓶" },
  { value: "bug", label: "🐛 害虫" },
  { value: "cloud", label: "☁️ 云朵" },
  { value: "bulb", label: "💡 灯泡" },
  { value: "star", label: "⭐ 星星" },
  { value: "globe", label: "🌐 地球" },
  { value: "compass", label: "🧭 指南针" },
  { value: "rocket", label: "🚀 火箭" }
]

const COLOR_PRESETS = [
  "#1677ff", "#52c41a", "#fa8c16", "#f5222d", "#722ed1",
  "#13c2c2", "#eb2f96", "#faad14", "#a0d911", "#2f54eb"
]

export function KnowledgeMarketManager() {
  const { message } = App.useApp()
  const [collections, setCollections] = useState<MarketCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [searchQuery, setSearchQuery] = useState("")
  const [saving, setSaving] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailCollection, setDetailCollection] = useState<MarketCollection | null>(null)

  // Items tab state
  const [activeTab, setActiveTab] = useState<"basic" | "items">("basic")
  const [items, setItems] = useState<MarketItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [linkForm, setLinkForm] = useState({ url: "", title: "", description: "" })
  const [linkSaving, setLinkSaving] = useState(false)
  const [textForm, setTextForm] = useState({ title: "", content: "", summary: "" })
  const [textSaving, setTextSaving] = useState(false)
  const [reembedId, setReembedId] = useState<number | null>(null)

  useEffect(() => {
    fetchCollections()
  }, [])

  const fetchCollections = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/knowledge/market?limit=200&sort=published_at")
      const data = await res.json()
      if (res.ok) {
        setCollections(Array.isArray(data.list) ? data.list : [])
      } else {
        message.error(data.error || "加载失败")
      }
    } catch (e) {
      console.error(e)
      message.error("加载市场知识库失败")
    } finally {
      setLoading(false)
    }
  }

  const fetchItems = useCallback(async (collectionId: number) => {
    setItemsLoading(true)
    try {
      const res = await fetch(`/api/knowledge/market/${collectionId}/items?limit=200`)
      const data = await res.json()
      if (res.ok) {
        setItems(Array.isArray(data.list) ? data.list : [])
      } else {
        message.error(data.error || "加载条目失败")
      }
    } catch (e) {
      message.error("加载条目失败")
    } finally {
      setItemsLoading(false)
    }
  }, [message])

  const handleSave = async () => {
    if (!form.name.trim()) {
      message.error("请填写知识库名称")
      return
    }
    setSaving(true)
    try {
      let res: Response
      const payload = {
        name: form.name,
        description: form.description,
        category: form.category,
        cover_image: form.cover_image,
        color: form.color,
        icon: form.icon,
        official: form.official,
        is_archived: form.is_archived,
        popularity: form.popularity
      }
      if (form.id) {
        res = await fetch(`/api/knowledge/market/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      } else {
        res = await fetch("/api/knowledge/market", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "保存失败")
      message.success(form.id ? "已更新" : "已创建")
      setModalOpen(false)
      setForm(DEFAULT_FORM)
      fetchCollections()
    } catch (e: any) {
      console.error("[knowledge/market SAVE]", e)
      if (typeof message?.error === "function") {
        message.error(e.message || "保存失败")
      } else {
        alert(`保存失败: ${e.message || "未知错误"}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id: number, name: string) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除市场知识库「${name}」？此操作不可恢复，会同时清除所有订阅记录与条目。`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          const res = await fetch(`/api/knowledge/market/${id}`, { method: "DELETE" })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
          message.success("已删除")
          fetchCollections()
        } catch (e: any) {
          console.error("[knowledge/market DELETE]", e)
          if (typeof message?.error === "function") {
            message.error(e.message || "删除失败")
          } else {
            alert(`删除失败: ${e.message || "未知错误"}`)
          }
        }
      }
    })
  }

  const handleEdit = (record: MarketCollection) => {
    setForm({
      id: record.id,
      name: record.name,
      description: record.description || "",
      category: record.category || "general",
      cover_image: record.cover_image || "",
      color: record.color || "#1677ff",
      icon: record.icon || "book",
      official: record.official === 1,
      is_archived: record.is_archived,
      popularity: record.popularity || 0
    })
    setActiveTab("basic")
    setModalOpen(true)
    // 切换 tab 到 items 时再加载，避免打开弹窗时一次性请求
  }

  const handleTabChange = (key: string) => {
    setActiveTab(key as "basic" | "items")
    if (key === "items" && form.id) {
      fetchItems(form.id)
    }
  }

  const handleView = async (id: number) => {
    try {
      const res = await fetch(`/api/knowledge/market/${id}`)
      const data = await res.json()
      if (res.ok) {
        setDetailCollection(data)
        setDetailModalOpen(true)
      } else {
        message.error(data.error || "加载详情失败")
      }
    } catch (e) {
      message.error("加载详情失败")
    }
  }

  // ============ 文件上传（走 /api/knowledge/upload，自动 embedding） ============
  const handleFileUpload = async (file: File) => {
    if (!form.id) {
      message.warning("请先保存知识库，再上传文件")
      return false
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("collection_id", String(form.id))
      const res = await fetch("/api/knowledge/upload", { method: "POST", body: fd })
      const data = await res.json().catch(() => ({} as any))
      if (res.ok) {
        let msg = `已上传「${file.name}」`
        if (data?.extractionMethod && data.extractionMethod !== "none") {
          msg += `（${data.extractionMethod} 解析，${data.extractedLength ?? 0} 字符）`
        }
        if (data?.embedding?.status === "ready") {
          msg += ` · ${data.embedding.chunkCount} 个分块已向量化`
        } else if (data?.embedding?.status === "failed") {
          msg += ` · 向量化失败，可手动重试`
        }
        message.success(msg)
        fetchItems(form.id)
        fetchCollections()
      } else {
        message.error(data.error || "上传失败")
      }
    } catch (e: any) {
      message.error(e.message || "上传失败")
    } finally {
      setUploading(false)
    }
    return false
  }

  // ============ 链接条目（content_type=link） ============
  const handleAddLink = async () => {
    if (!form.id) {
      message.warning("请先保存知识库，再添加链接")
      return
    }
    const url = linkForm.url.trim()
    if (!url) {
      message.error("请填写链接 URL")
      return
    }
    if (!/^https?:\/\//i.test(url)) {
      message.error("链接必须以 http:// 或 https:// 开头")
      return
    }
    const title = linkForm.title.trim() || url
    setLinkSaving(true)
    try {
      const res = await fetch("/api/knowledge/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection_id: form.id,
          title,
          summary: linkForm.description.trim() || null,
          content: linkForm.description.trim() || url,
          content_type: "link",
          source_url: url,
          access_level: "public"
        })
      })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(data.error || "添加失败")
      message.success(`已添加链接「${title}」`)
      setLinkForm({ url: "", title: "", description: "" })
      fetchItems(form.id)
    } catch (e: any) {
      message.error(e.message || "添加失败")
    } finally {
      setLinkSaving(false)
    }
  }

  // ============ 纯文本条目（content_type=note） ============
  const handleAddText = async () => {
    if (!form.id) {
      message.warning("请先保存知识库，再添加文本")
      return
    }
    const title = textForm.title.trim()
    if (!title) {
      message.error("请填写标题")
      return
    }
    if (!textForm.content.trim()) {
      message.error("请填写内容")
      return
    }
    setTextSaving(true)
    try {
      const res = await fetch("/api/knowledge/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection_id: form.id,
          title,
          content: textForm.content,
          summary: textForm.summary.trim() || textForm.content.slice(0, 200),
          content_type: "note",
          access_level: "public"
        })
      })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(data.error || "添加失败")
      message.success(`已添加「${title}」`)
      setTextForm({ title: "", content: "", summary: "" })
      fetchItems(form.id)
    } catch (e: any) {
      message.error(e.message || "添加失败")
    } finally {
      setTextSaving(false)
    }
  }

  // ============ 删除条目 ============
  const handleDeleteItem = (item: MarketItem) => {
    Modal.confirm({
      title: "确认删除条目",
      content: `确定要删除「${item.title}」？条目下的所有 chunk 和版本都会被清除。`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          const res = await fetch(`/api/knowledge/items/${item.id}`, { method: "DELETE" })
          const data = await res.json().catch(() => ({} as any))
          if (!res.ok) throw new Error(data.error || "删除失败")
          message.success("已删除")
          if (form.id) fetchItems(form.id)
        } catch (e: any) {
          message.error(e.message || "删除失败")
        }
      }
    })
  }

  // ============ 重新生成 embedding ============
  const handleReembed = async (item: MarketItem) => {
    setReembedId(item.id)
    try {
      const res = await fetch(`/api/knowledge/items/${item.id}/embed`, { method: "POST" })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(data.error || "重新向量化失败")
      message.success(`「${item.title}」已重新生成 ${data.chunkCount ?? 0} 个分块`)
      if (form.id) fetchItems(form.id)
    } catch (e: any) {
      message.error(e.message || "重新向量化失败")
    } finally {
      setReembedId(null)
    }
  }

  const filtered = collections.filter(c =>
    !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (ts: number | null | undefined) => {
    if (!ts) return "—"
    if (ts < 1e12) ts = ts * 1000
    const d = new Date(ts)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleString("zh-CN", { hour12: false })
  }

  const formatSize = (bytes: number) => {
    if (!bytes) return "—"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const getEmbedStatusTag = (status: string) => {
    switch (status) {
      case "ready":
        return <Tag color="green" icon={<CheckCircleOutlined />}>已向量化</Tag>
      case "processing":
        return <Tag color="blue" icon={<LoadingOutlined />}>向量化中</Tag>
      case "pending":
        return <Tag color="orange">待向量化</Tag>
      case "failed":
        return <Tag color="red" icon={<CloseCircleOutlined />}>失败</Tag>
      case "skipped":
        return <Tag>已跳过</Tag>
      default:
        return <Tag>{status}</Tag>
    }
  }

  const columns: ColumnsType<MarketCollection> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 70,
      render: (id: number) => <Text style={{ fontFamily: "monospace", fontSize: 12 }}>#{id}</Text>
    },
    {
      title: "封面",
      dataIndex: "cover_image",
      key: "cover_image",
      width: 80,
      render: (_, record) => {
        if (record.cover_image) {
          return (
            <div style={{ width: 48, height: 36, borderRadius: 6, overflow: "hidden", border: "1px solid #f0f0f0", background: "#fafafa" }}>
              <img src={record.cover_image} alt={record.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
            </div>
          )
        }
        return (
          <div style={{ width: 48, height: 36, borderRadius: 6, background: record.color || "#1677ff", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
            <BookOutlined />
          </div>
        )
      }
    },
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      render: (name: string, record) => (
        <Space direction="vertical" size={2}>
          <Space size={4}>
            <Text strong>{name}</Text>
            {record.official === 1 && <CheckCircleOutlined style={{ color: "#1677ff" }} />}
          </Space>
          {record.description && (
            <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
              {record.description.length > 60 ? record.description.slice(0, 60) + "…" : record.description}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: "分类",
      dataIndex: "category",
      key: "category",
      width: 90,
      render: (cat: string) => <Tag>{cat}</Tag>
    },
    {
      title: "条目",
      key: "items",
      width: 80,
      render: (_, record) => <Text style={{ fontFamily: "monospace" }}>{record.item_count_real || 0}</Text>
    },
    {
      title: "订阅",
      key: "subs",
      width: 80,
      render: (_, record) => (
        <Space size={2}>
          <FireOutlined style={{ color: "#fa8c16", fontSize: 12 }} />
          <Text style={{ fontFamily: "monospace" }}>{record.subscriber_count || 0}</Text>
        </Space>
      )
    },
    {
      title: "发布者",
      dataIndex: "publisher_name",
      key: "publisher_name",
      width: 110,
      render: (name: string | null) => name || <Text type="disabled">—</Text>
    },
    {
      title: "发布时间",
      dataIndex: "published_at",
      key: "published_at",
      width: 160,
      render: formatTime
    },
    {
      title: "状态",
      key: "status",
      width: 100,
      render: (_, record) =>
        record.is_archived === 1 ? <Tag color="default">已下架</Tag>
        : record.published_at ? <Tag color="green">已发布</Tag>
        : <Tag color="orange">草稿</Tag>
    },
    {
      title: "操作",
      key: "actions",
      width: 160,
      align: "right",
      fixed: "right",
      render: (_, record) => (
        <Space size={0}>
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleView(record.id)} title="查看详情" />
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} title="编辑" />
          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id, record.name)} title="删除" />
        </Space>
      )
    }
  ]

  // ============ Item list columns (within modal) ============
  const itemColumns: ColumnsType<MarketItem> = [
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      render: (title: string, record) => (
        <Space direction="vertical" size={2} style={{ maxWidth: 320 }}>
          <Space size={4}>
            {record.content_type === "link" ? <LinkOutlined style={{ color: "#1677ff" }} /> :
             record.content_type === "image" || record.content_type?.startsWith("image") ? <PictureOutlined style={{ color: "#722ed1" }} /> :
             <FileTextOutlined style={{ color: "#52c41a" }} />}
            <Text strong style={{ fontSize: 13 }}>{title}</Text>
          </Space>
          {record.source_url && (
            <a href={record.source_url} target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>
              <Text type="secondary" style={{ fontSize: 11 }} ellipsis>{record.source_url}</Text>
            </a>
          )}
          {record.summary && (
            <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
              {record.summary.length > 80 ? record.summary.slice(0, 80) + "…" : record.summary}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: "类型",
      dataIndex: "content_type",
      key: "content_type",
      width: 80,
      render: (t: string) => <Tag>{t}</Tag>
    },
    {
      title: "大小",
      dataIndex: "file_size",
      key: "file_size",
      width: 80,
      render: formatSize
    },
    {
      title: "向量化",
      dataIndex: "embedding_status",
      key: "embedding_status",
      width: 110,
      render: getEmbedStatusTag
    },
    {
      title: "更新",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 140,
      render: formatTime
    },
    {
      title: "操作",
      key: "actions",
      width: 140,
      align: "right",
      render: (_, record) => (
        <Space size={0}>
          <Tooltip title="重新生成 embedding">
            <Button
              type="text" size="small"
              icon={<ThunderboltOutlined />}
              loading={reembedId === record.id}
              onClick={() => handleReembed(record)}
            />
          </Tooltip>
          <Tooltip title="删除条目">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteItem(record)} />
          </Tooltip>
        </Space>
      )
    }
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 顶部操作栏 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <Space>
          <Input
            placeholder="搜索知识库名称 / 描述"
            prefix={<SearchOutlined style={{ color: "#1677ff" }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={fetchCollections}>刷新</Button>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setForm(DEFAULT_FORM); setActiveTab("basic"); setModalOpen(true) }}
        >
          新建市场知识库
        </Button>
      </div>

      {/* 统计卡片 */}
      <Space size={12} wrap>
        <div style={statBoxStyle}>
          <Text type="secondary" style={{ fontSize: 12 }}>市场知识库总数</Text>
          <div style={{ fontSize: 24, fontWeight: 600, color: "#1677ff" }}>{collections.length}</div>
        </div>
        <div style={statBoxStyle}>
          <Text type="secondary" style={{ fontSize: 12 }}>官方发布</Text>
          <div style={{ fontSize: 24, fontWeight: 600, color: "#52c41a" }}>
            {collections.filter(c => c.official === 1).length}
          </div>
        </div>
        <div style={statBoxStyle}>
          <Text type="secondary" style={{ fontSize: 12 }}>累计订阅</Text>
          <div style={{ fontSize: 24, fontWeight: 600, color: "#fa8c16" }}>
            {collections.reduce((sum, c) => sum + (c.subscriber_count || 0), 0)}
          </div>
        </div>
      </Space>

      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: 1200 }}
        size="middle"
        locale={{ emptyText: loading ? "加载中..." : "暂无市场知识库" }}
      />

      {/* 新建/编辑 弹窗 - Tabs 结构 */}
      <Modal
        open={modalOpen}
        onCancel={() => !saving && setModalOpen(false)}
        title={
          <Space>
            <BookOutlined style={{ color: "#1677ff" }} />
            <span>{form.id ? "编辑市场知识库" : "新建市场知识库"}</span>
          </Space>
        }
        footer={
          activeTab === "items" ? [
            <Button key="close" onClick={() => setModalOpen(false)}>关闭</Button>
          ] : [
            <Button key="cancel" onClick={() => setModalOpen(false)} disabled={saving}>取消</Button>,
            <Button key="save" type="primary" loading={saving} onClick={handleSave}>保存</Button>
          ]
        }
        width={920}
        destroyOnHidden
        styles={{ body: { maxHeight: "75vh", overflowY: "auto", paddingTop: 8 } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            {
              key: "basic",
              label: <span><FileTextOutlined /> 基本信息</span>,
              children: (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "8px 0" }}>
                  <Field label="知识库名称" required>
                    <Input
                      placeholder="例如：草莓种植最佳实践"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      maxLength={100}
                    />
                  </Field>

                  <Field label="描述">
                    <TextArea
                      placeholder="简单介绍这个知识库的用途、收录范围、目标用户…"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      autoSize={{ minRows: 3, maxRows: 8 }}
                      maxLength={1000}
                      showCount
                    />
                  </Field>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <Field label="分类">
                      <Select
                        value={form.category}
                        onChange={(v) => setForm({ ...form, category: v })}
                        options={CATEGORY_OPTIONS}
                        style={{ width: "100%" }}
                      />
                    </Field>
                    <Field label="排序权重">
                      <Input
                        type="number"
                        placeholder="数值越大排序越靠前"
                        value={form.popularity || 0}
                        onChange={(e) => setForm({ ...form, popularity: Number(e.target.value) || 0 })}
                      />
                    </Field>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
                    <Field label="主题色">
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <Input
                          type="color"
                          value={form.color}
                          onChange={(e) => setForm({ ...form, color: e.target.value })}
                          style={{ width: "100%", height: 32, padding: 2 }}
                        />
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {COLOR_PRESETS.map(c => (
                            <div
                              key={c}
                              onClick={() => setForm({ ...form, color: c })}
                              style={{
                                width: 20, height: 20, borderRadius: 4, background: c, cursor: "pointer",
                                border: form.color === c ? "2px solid #1677ff" : "1px solid #e5e7eb"
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </Field>
                    <Field label="图标">
                      <Select
                        value={form.icon}
                        onChange={(v) => setForm({ ...form, icon: v })}
                        options={ICON_OPTIONS}
                        style={{ width: "100%" }}
                      />
                    </Field>
                  </div>

                  <Field label="封面图 URL">
                    <Input
                      prefix={<LinkOutlined style={{ color: "#1677ff" }} />}
                      placeholder="https://… （留空则使用主题色块）"
                      value={form.cover_image}
                      onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                    />
                    {form.cover_image && (
                      <div style={{ marginTop: 8, width: "100%", height: 120, borderRadius: 8, border: "1px solid #f0f0f0", background: "#fafafa", overflow: "hidden" }}>
                        <img src={form.cover_image} alt="cover preview" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                      </div>
                    )}
                  </Field>

                  <Field label="选项">
                    <Space direction="vertical" size={6} style={{ width: "100%" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <Switch
                          size="small"
                          checked={form.official}
                          onChange={(v) => setForm({ ...form, official: v })}
                        />
                        <Space size={4}>
                          <CheckCircleOutlined style={{ color: "#1677ff" }} />
                          <Text>官方发布（展示认证标识）</Text>
                        </Space>
                      </label>
                      {form.id && (
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                          <Switch
                            size="small"
                            checked={form.is_archived === 1}
                            onChange={(v) => setForm({ ...form, is_archived: v ? 1 : 0 })}
                          />
                          <Text type="secondary">下架（用户端不再展示，已订阅用户仍可访问）</Text>
                        </label>
                      )}
                    </Space>
                  </Field>
                </div>
              )
            },
            ...(form.id ? [{
              key: "items",
              label: <span><BookOutlined /> 条目管理 ({items.length})</span>,
              children: (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "8px 0" }}>
                  {/* 1. 文件上传 */}
                  <div style={{ padding: 16, border: "1px dashed #d9d9d9", borderRadius: 8, background: "#fafbfc" }}>
                    <Text strong style={{ display: "block", marginBottom: 8 }}>
                      <CloudUploadOutlined style={{ color: "#1677ff", marginRight: 6 }} />
                      上传文件（自动 embedding）
                    </Text>
                    <Upload
                      accept=".txt,.md,.csv,.json,.xml,.html,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*,audio/*,video/*"
                      beforeUpload={handleFileUpload}
                      showUploadList={false}
                      multiple
                      disabled={uploading}
                    >
                      <Button icon={<CloudUploadOutlined />} loading={uploading}>
                        点击或拖拽上传文件
                      </Button>
                    </Upload>
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
                      支持 .txt / .md / .pdf / .docx / .xlsx / .pptx / 图片 / 音视频（PDF/图片会尝试 OCR 解析）
                    </Text>
                  </div>

                  {/* 2. 添加链接 */}
                  <div style={{ padding: 16, border: "1px dashed #d9d9d9", borderRadius: 8, background: "#fafbfc" }}>
                    <Text strong style={{ display: "block", marginBottom: 8 }}>
                      <LinkOutlined style={{ color: "#1677ff", marginRight: 6 }} />
                      添加链接（content_type=link）
                    </Text>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
                      <Input
                        placeholder="https://… 必填"
                        value={linkForm.url}
                        onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                        prefix={<LinkOutlined />}
                      />
                      <Input
                        placeholder="标题（默认用 URL）"
                        value={linkForm.title}
                        onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                      />
                    </div>
                    <TextArea
                      placeholder="链接说明 / 摘要（可空）"
                      value={linkForm.description}
                      onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
                      autoSize={{ minRows: 2, maxRows: 4 }}
                      style={{ marginBottom: 8 }}
                    />
                    <Button type="primary" loading={linkSaving} onClick={handleAddLink}>添加链接</Button>
                  </div>

                  {/* 3. 添加纯文本 */}
                  <div style={{ padding: 16, border: "1px dashed #d9d9d9", borderRadius: 8, background: "#fafbfc" }}>
                    <Text strong style={{ display: "block", marginBottom: 8 }}>
                      <FileTextOutlined style={{ color: "#52c41a", marginRight: 6 }} />
                      添加纯文本条目
                    </Text>
                    <Input
                      placeholder="标题（必填）"
                      value={textForm.title}
                      onChange={(e) => setTextForm({ ...textForm, title: e.target.value })}
                      style={{ marginBottom: 8 }}
                    />
                    <TextArea
                      placeholder="内容（必填，会被分块并 embedding）"
                      value={textForm.content}
                      onChange={(e) => setTextForm({ ...textForm, content: e.target.value })}
                      autoSize={{ minRows: 3, maxRows: 8 }}
                      style={{ marginBottom: 8 }}
                    />
                    <Input
                      placeholder="摘要（可选）"
                      value={textForm.summary}
                      onChange={(e) => setTextForm({ ...textForm, summary: e.target.value })}
                      style={{ marginBottom: 8 }}
                    />
                    <Button type="primary" loading={textSaving} onClick={handleAddText}>添加文本</Button>
                  </div>

                  {/* 4. 已有条目列表 */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <Text strong>已有条目（{items.length}）</Text>
                      <Button size="small" icon={<ReloadOutlined />} onClick={() => form.id && fetchItems(form.id)}>刷新</Button>
                    </div>
                    <Spin spinning={itemsLoading}>
                      {items.length === 0 ? (
                        <Empty description="暂无条目，使用上方表单添加" />
                      ) : (
                        <Table
                          columns={itemColumns}
                          dataSource={items}
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 8, showSizeChanger: false }}
                          scroll={{ x: 700 }}
                        />
                      )}
                    </Spin>
                  </div>
                </div>
              )
            }] : [])
          ]}
        />
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        title={<Space><BookOutlined style={{ color: "#1677ff" }} /><span>知识库详情</span></Space>}
        footer={[<Button key="close" onClick={() => setDetailModalOpen(false)}>关闭</Button>]}
        width={640}
      >
        {detailCollection && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 0" }}>
            {detailCollection.cover_image && (
              <div style={{ width: "100%", height: 180, borderRadius: 8, overflow: "hidden", background: "#fafafa", border: "1px solid #f0f0f0" }}>
                <img src={detailCollection.cover_image} alt={detailCollection.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
            <Space size={8} wrap>
              <Text strong style={{ fontSize: 18 }}>{detailCollection.name}</Text>
              {detailCollection.official === 1 && <Tag icon={<CheckCircleOutlined />} color="blue">官方</Tag>}
              <Tag>{detailCollection.category}</Tag>
            </Space>
            <Text type="secondary">{detailCollection.description || "暂无描述"}</Text>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <InfoRow label="条目数" value={String(detailCollection.item_count_real || 0)} />
              <InfoRow label="订阅数" value={String(detailCollection.subscriber_count || 0)} />
              <InfoRow label="发布者" value={detailCollection.publisher_name || "—"} />
              <InfoRow label="发布时间" value={formatTime(detailCollection.published_at)} />
            </div>
            <InfoRow label="状态" value={detailCollection.is_archived === 1 ? "已下架" : "已发布"} />
          </div>
        )}
      </Modal>
    </div>
  )
}

const statBoxStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #f0f0f0",
  borderRadius: 8,
  padding: "12px 16px",
  minWidth: 140
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Text style={{ fontSize: 13 }}>
        {label}
        {required && <span style={{ color: "#ff4d4f", marginLeft: 4 }}>*</span>}
      </Text>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
      <Text>{value}</Text>
    </div>
  )
}
