
"use client"

import { useState, useEffect } from "react"
import { Button, Input, Table, Modal, Tag, Typography, Spin } from "antd"
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, CheckOutlined, ShieldOutlined } from "@ant-design/icons"
import type { ColumnsType } from 'antd/es/table'
import { toast } from "sonner"

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
}

export function MCPManager() {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<Partial<MCPServer> | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

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

  const columns: ColumnsType<MCPServer> = [
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (val: number) => <Text strong style={{ color: '#1890ff' }}>#{val}</Text>
    },
    {
      title: 'Icon',
      dataIndex: 'icon',
      key: 'icon',
      width: 60,
      render: (icon: string, record: MCPServer) => (
        <div style={{ width: 32, height: 32, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
          {icon ? (
            icon.startsWith('http') ? (
              <img src={icon} style={{ width: 24, height: 24, objectFit: 'contain' }} />
            ) : icon
          ) : '🧩'}
        </div>
      )
    },
    {
      title: 'ID (Slug)',
      dataIndex: 'id',
      key: 'id',
      width: 150,
      render: (val: string) => <Text copyable style={{ fontFamily: 'monospace', fontSize: 12 }}>{val}</Text>
    },
    {
      title: 'Display Name',
      dataIndex: 'displayName',
      key: 'displayName',
      width: 150,
      render: (val: string, record: MCPServer) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Text>{val}</Text>
          {record.official && <ShieldOutlined style={{ color: '#1890ff', fontSize: 12 }} />}
        </div>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (val: string) => <Tag>{val}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'is_published',
      key: 'is_published',
      width: 100,
      render: (val: number) => val ? (
        <Tag color="blue">Published</Tag>
      ) : (
        <Tag>Draft</Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      align: 'right',
      render: (_: unknown, record: MCPServer) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button 
            type="text" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => {
              setEditingServer(record)
              setModalOpen(true)
            }}
          />
          <Button 
            type="text" 
            size="small" 
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          />
        </div>
      )
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <Input
          placeholder="Search MCP servers..."
          prefix={<SearchOutlined style={{ color: '#999' }} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 300 }}
        />
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingServer({ 
              command: "npx", 
              args: "[]", 
              envVars: "{}", 
              category: "web", 
              is_published: 1, 
              priority: 0,
              iconBg: "bg-white",
              official: false,
              requiresApiKey: false
            })
            setModalOpen(true)
          }}
        >
          Add MCP Server
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={filteredServers}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        style={{ 
          background: '#fff', 
          borderRadius: 8,
          overflow: 'hidden'
        }}
      />

      <Modal
        open={modalOpen}
        title={editingServer?.id && servers.some(s => s.id === editingServer.id) ? "Edit MCP Server" : "New MCP Server"}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>Cancel</Button>,
          <Button key="save" type="primary" onClick={handleSave} style={{ background: '#1890ff' }}>Save MCP Server</Button>
        ]}
        width={800}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Server ID (Slug)</Text>
              <Input 
                placeholder="e.g. firecrawl" 
                value={editingServer?.id || ""}
                onChange={(e) => setEditingServer({ ...editingServer, id: e.target.value })}
              />
            </div>
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Display Name</Text>
              <Input 
                placeholder="e.g. Firecrawl" 
                value={editingServer?.displayName || ""}
                onChange={(e) => setEditingServer({ ...editingServer, displayName: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Icon URL/Emoji</Text>
              <Input 
                placeholder="🧩 or URL" 
                value={editingServer?.icon || ""}
                onChange={(e) => setEditingServer({ ...editingServer, icon: e.target.value })}
              />
            </div>
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Icon Background Class</Text>
              <Input 
                placeholder="bg-white" 
                value={editingServer?.iconBg || "bg-white"}
                onChange={(e) => setEditingServer({ ...editingServer, iconBg: e.target.value })}
              />
            </div>
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Priority (0-100)</Text>
              <Input 
                type="number"
                placeholder="0" 
                value={editingServer?.priority || 0}
                onChange={(e) => setEditingServer({ ...editingServer, priority: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Provider</Text>
              <Input 
                placeholder="e.g. Stravision" 
                value={editingServer?.provider || ""}
                onChange={(e) => setEditingServer({ ...editingServer, provider: e.target.value })}
              />
            </div>
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Category</Text>
              <Input 
                placeholder="agriculture/web..." 
                value={editingServer?.category || "web"}
                onChange={(e) => setEditingServer({ ...editingServer, category: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Description</Text>
            <Input.TextArea 
              placeholder="What does this server do?" 
              value={editingServer?.description || ""}
              onChange={(e) => setEditingServer({ ...editingServer, description: e.target.value })}
              rows={3}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Command</Text>
              <Input 
                placeholder="npx / uvx" 
                value={editingServer?.command || "npx"}
                onChange={(e) => setEditingServer({ ...editingServer, command: e.target.value })}
              />
            </div>
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Args (JSON Array)</Text>
              <Input 
                placeholder='["-y", "@mendable/firecrawl-mcp"]' 
                value={editingServer?.args || "[]"}
                onChange={(e) => setEditingServer({ ...editingServer, args: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4, color: '#1890ff' }}>Default Env Vars (JSON Object)</Text>
            <Input.TextArea 
              placeholder='{"API_KEY": ""}' 
              value={editingServer?.envVars || "{}"}
              onChange={(e) => setEditingServer({ ...editingServer, envVars: e.target.value })}
              rows={2}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input 
                type="checkbox" 
                id="mcp-pub-check" 
                checked={editingServer?.is_published === 1} 
                onChange={e => setEditingServer({...editingServer, is_published: e.target.checked ? 1 : 0})} 
              />
              <label htmlFor="mcp-pub-check" style={{ fontSize: 14 }}>Published</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input 
                type="checkbox" 
                id="mcp-off-check" 
                checked={editingServer?.official || false} 
                onChange={e => setEditingServer({...editingServer, official: e.target.checked})} 
              />
              <label htmlFor="mcp-off-check" style={{ fontSize: 14 }}>Official Badge</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input 
                type="checkbox" 
                id="mcp-key-check" 
                checked={editingServer?.requiresApiKey || false} 
                onChange={e => setEditingServer({...editingServer, requiresApiKey: e.target.checked})} 
              />
              <label htmlFor="mcp-key-check" style={{ fontSize: 14 }}>Requires API Key</label>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
