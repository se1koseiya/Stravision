"use client"

import { useState, useEffect } from "react"
import { Button, Input, Table, Modal, Tag, Space, Typography, Card } from "antd"
import type { ColumnsType } from "antd/es/table"
import { toast } from "sonner"
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SearchOutlined,
  GlobalOutlined,
  LockOutlined,
  CheckCircleOutlined,
  LayoutOutlined,
  FireOutlined,
  PictureOutlined,
  ReloadOutlined,
} from "@ant-design/icons"
import { ImageCropper } from "./image-cropper"

const { Text } = Typography

interface MCPServer {
  id: string
  name: string
  displayName: string
  description: string
  category: string
  icon: string
  iconBg: string
  provider: string
  requiresApiKey: boolean
  apiKeyUrl?: string
  command: string
  args: string
  envVars: string
  features: string
  popularity: number
  official: boolean
  priority: number
  is_published: number
  cover_image?: string
}

export function MCPMarketManager() {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<Partial<MCPServer> | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false)
  const [cropperTarget, setCropperTarget] = useState<"icon" | "cover">("icon")

  useEffect(() => {
    fetchServers()
  }, [])

  const fetchServers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/mcp")
      const data = await res.json()
      setServers(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error("Failed to fetch MCP servers")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!editingServer?.id || !editingServer?.displayName) {
      toast.error("ID and Display Name are required")
      return
    }

    const isEditing = servers.some(s => s.id === editingServer.id)
    const method = isEditing ? "PUT" : "POST"
    const url = isEditing ? `/api/admin/mcp/${editingServer.id}` : "/api/admin/mcp"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingServer),
      })

      if (res.ok) {
        toast.success(isEditing ? "Server updated" : "Server created")
        setModalOpen(false)
        fetchServers()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to save server")
      }
    } catch (e) {
      toast.error("Error saving server")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this server?")) return
    try {
      const res = await fetch(`/api/admin/mcp/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Server deleted")
        fetchServers()
      }
    } catch (e) {
      toast.error("Failed to delete server")
    }
  }

  const filteredServers = servers.filter(s =>
    s.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const AppIcon = ({ icon, name }: { icon: string; name: string }) => {
    const [error, setError] = useState(false)
    const baseStyle: React.CSSProperties = {
      width: 36,
      height: 36,
      borderRadius: 6,
      border: "1px solid #EDEEEF",
      overflow: "hidden",
      flexShrink: 0,
    }
    if (error || !icon) {
      const firstLetter = name.charAt(0).toUpperCase()
      const color = "#1677ff"
      return (
        <div
          style={{
            ...baseStyle,
            backgroundColor: color,
            color: "white",
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {firstLetter}
        </div>
      )
    }
    return (
      <img
        src={icon}
        alt={name}
        style={{ ...baseStyle, objectFit: "cover" }}
        onError={() => setError(true)}
      />
    )
  }

  const columns: ColumnsType<MCPServer> = [
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      render: (priority: number) => <Text strong style={{ color: "#1677ff" }}>#{priority}</Text>,
    },
    {
      title: "Icon",
      dataIndex: "icon",
      key: "icon",
      render: (_, record) => (
        <AppIcon icon={record.icon} name={record.displayName} />
      ),
    },
    {
      title: "ID (Slug)",
      dataIndex: "id",
      key: "id",
      render: (id: string) => <Text copyable style={{ fontFamily: "monospace", fontSize: 12 }}>{id}</Text>,
    },
    {
      title: "Display Name",
      dataIndex: "displayName",
      key: "displayName",
      render: (displayName: string, record) => (
        <Space>
          <Text>{displayName}</Text>
          {record.official && <CheckCircleOutlined style={{ color: "#1677ff" }} />}
        </Space>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: (category: string) => <Tag>{category}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "is_published",
      key: "is_published",
      render: (is_published: number) =>
        is_published ? (
          <Tag color="green">Published</Tag>
        ) : (
          <Tag color="default">Draft</Tag>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "right",
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingServer(record)
              setModalOpen(true)
            }}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Card style={{ border: "1px solid #EDEEEF", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <Input
          placeholder="Search MCP servers..."
          prefix={<SearchOutlined style={{ color: "#8F959E" }} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingServer({
              id: "",
              name: "",
              displayName: "",
              description: "",
              command: "npx",
              args: "[]",
              envVars: "{}",
              category: "web",
              is_published: 1,
              priority: 0,
              iconBg: "bg-white",
              official: false,
              requiresApiKey: false,
              provider: "Stravision",
              features: "",
              popularity: 95,
            })
            setModalOpen(true)
          }}
        >
          Add MCP Server
        </Button>
      </div>
      </Card>

      <Card style={{ border: "1px solid #EDEEEF" }} styles={{ body: { padding: 0 } }}>
      <Table
        columns={columns}
        dataSource={filteredServers}
        rowKey="id"
        loading={loading}
        locale={{
          emptyText: loading ? "Loading..." : "No MCP servers found.",
        }}
        pagination={{ pageSize: 10 }}
      />
      </Card>

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={editingServer?.id && servers.some(s => s.id === editingServer.id) ? "Edit MCP Server" : "New MCP Server"}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>,
          <Button key="save" type="primary" onClick={handleSave}>
            Save MCP Server
          </Button>,
        ]}
        width={720}
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "16px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Text>Server ID (Slug)</Text>
              <Input
                placeholder="e.g. firecrawl"
                value={editingServer?.id || ""}
                onChange={(e) => setEditingServer({ ...editingServer, id: e.target.value })}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Text>Display Name</Text>
              <Input
                placeholder="e.g. Firecrawl"
                value={editingServer?.displayName || ""}
                onChange={(e) => setEditingServer({ ...editingServer, displayName: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Text strong style={{ opacity: 0.6, display: "flex", alignItems: "center", gap: 8 }}>
                <LayoutOutlined /> 图标 URL / Emoji
              </Text>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #EDEEEF",
                  backgroundColor: "white",
                  overflow: "hidden",
                  flexShrink: 0,
                }}>
                  {editingServer?.icon && (
                    editingServer.icon.startsWith("http") || editingServer.icon.startsWith("/") ? (
                      <img src={editingServer.icon} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 24 }}>{editingServer.icon}</span>
                    )
                  )}
                  {!editingServer?.icon && <PlusOutlined style={{ color: "#8F959E" }} />}
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <Input
                    placeholder="🧩 或 图片链接"
                    value={editingServer?.icon || ""}
                    onChange={(e) => setEditingServer({ ...editingServer, icon: e.target.value })}
                    style={{ height: 48, borderRadius: 12 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    icon={<PictureOutlined />}
                    onClick={() => { setCropperTarget("icon"); setCropperOpen(true); }}
                  >
                    上传并裁剪图标
                  </Button>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Text strong style={{ opacity: 0.6, display: "flex", alignItems: "center", gap: 8 }}>
                <FireOutlined /> 封面大图 URL (详情页/精选卡片)
              </Text>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Input
                  placeholder="https://images.unsplash.com/..."
                  value={editingServer?.cover_image || ""}
                  onChange={(e) => setEditingServer({ ...editingServer, cover_image: e.target.value })}
                  style={{ height: 48, borderRadius: 12 }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    flex: 1,
                    height: 32,
                    borderRadius: 6,
                    backgroundColor: "#F2F3F5",
                    border: "1px solid #EDEEEF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}>
                    {editingServer?.cover_image ? (
                      <img src={editingServer.cover_image} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }} />
                    ) : (
                      <span style={{ fontSize: 10, color: "#8F959E", fontWeight: 700 }}>无预览图片</span>
                    )}
                  </div>
                  <Button
                    variant="outlined"
                    size="small"
                    icon={<PictureOutlined />}
                    onClick={() => { setCropperTarget("cover"); setCropperOpen(true); }}
                  >
                    上传封面
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Text>Provider</Text>
              <Input
                placeholder="e.g. Stravision"
                value={editingServer?.provider || ""}
                onChange={(e) => setEditingServer({ ...editingServer, provider: e.target.value })}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Text>Category</Text>
              <Input
                placeholder="agriculture/web..."
                value={editingServer?.category || "web"}
                onChange={(e) => setEditingServer({ ...editingServer, category: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Text>Description</Text>
            <Input.TextArea
              placeholder="What does this server do?"
              value={editingServer?.description || ""}
              onChange={(e) => setEditingServer({ ...editingServer, description: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Text strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FireOutlined style={{ color: "#1677ff" }} />
              推荐 Prompt
              <span style={{ fontSize: 10, color: "#8F959E", fontWeight: 400 }}>（插件详情页打开时自动加载）</span>
            </Text>
            <Input.TextArea
              placeholder="为这个插件推荐一个具体的使用 Prompt，例如：读取 1 号棚的近红外光谱值并判断氮素含量。"
              value={editingServer?.recommended_prompt || ""}
              onChange={(e) => setEditingServer({ ...editingServer, recommended_prompt: e.target.value })}
              style={{ height: 80 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Text>Command</Text>
              <Input
                placeholder="npx / uvx"
                value={editingServer?.command || "npx"}
                onChange={(e) => setEditingServer({ ...editingServer, command: e.target.value })}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Text>Args (JSON Array)</Text>
              <Input
                placeholder='["-y", "@mendable/firecrawl-mcp"]'
                value={editingServer?.args || "[]"}
                onChange={(e) => setEditingServer({ ...editingServer, args: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Text style={{ color: "#1677ff" }}>Default Env Vars (JSON Object)</Text>
            <Input.TextArea
              placeholder='{"API_KEY": ""}'
              style={{ fontFamily: "monospace", fontSize: 12, height: 96 }}
              value={editingServer?.envVars || "{}"}
              onChange={(e) => setEditingServer({ ...editingServer, envVars: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "12px 16px", borderRadius: 6, border: "1px solid #EDEEEF", backgroundColor: "#F7F8FA" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                id="mcp-pub-check"
                checked={editingServer?.is_published === 1}
                onChange={e => setEditingServer({ ...editingServer, is_published: e.target.checked ? 1 : 0 })}
              />
              <label htmlFor="mcp-pub-check">Published</label>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                id="mcp-off-check"
                checked={editingServer?.official}
                onChange={e => setEditingServer({ ...editingServer, official: e.target.checked })}
              />
              <label htmlFor="mcp-off-check">Official Badge</label>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                id="mcp-key-check"
                checked={editingServer?.requiresApiKey}
                onChange={e => setEditingServer({ ...editingServer, requiresApiKey: e.target.checked })}
              />
              <label htmlFor="mcp-key-check">Requires API Key</label>
            </div>
          </div>
        </div>
      </Modal>

      {/* Image Cropper Modal */}
      <ImageCropper
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        title={cropperTarget === "icon" ? "裁剪工具图标" : "裁剪封面大图"}
        aspect={cropperTarget === "icon" ? 1 : 2.22}
        onCropComplete={(url) => {
          if (cropperTarget === "icon") {
            setEditingServer(prev => ({ ...prev, icon: url }))
          } else {
            setEditingServer(prev => ({ ...prev, cover_image: url }))
          }
        }}
      />
    </div>
  )
}
