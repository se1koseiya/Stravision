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
  LinkOutlined,
  PictureOutlined,
  LayoutOutlined,
  FireOutlined,
  CodeOutlined,
} from "@ant-design/icons"
import { ImageCropper } from "./image-cropper"

const { Text } = Typography

interface Skill {
  id: number
  skill_id: string
  name: string
  description: string
  icon: string
  category: string
  author: string
  version: string
  keywords: string
  examples: string
  effects: string
  content: string
  cover_image?: string
  priority: number
  is_published: number
  is_builtin: number
  install_count: number
}

export function SkillManager() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Partial<Skill> | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false)
  const [cropperTarget, setCropperTarget] = useState<"icon" | "cover">("icon")

  useEffect(() => {
    fetchSkills()
  }, [])

  const fetchSkills = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/skills/store?admin=1")
      const data = await res.json()
      setSkills(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error("Failed to fetch skills")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!editingSkill?.skill_id || !editingSkill?.name) {
      toast.error("Skill ID and Name are required")
      return
    }

    const method = editingSkill.id ? "PUT" : "POST"
    const url = editingSkill.id
      ? `/api/skills/store/${editingSkill.skill_id}`
      : "/api/skills/store"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSkill),
      })

      if (res.ok) {
        toast.success(editingSkill.id ? "Skill updated" : "Skill created")
        setModalOpen(false)
        fetchSkills()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to save skill")
      }
    } catch (e) {
      toast.error("Error saving skill")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this skill?")) return
    try {
      const res = await fetch(`/api/skills/store/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Skill deleted")
        fetchSkills()
      }
    } catch (e) {
      toast.error("Failed to delete skill")
    }
  }

  const filteredSkills = skills.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.skill_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const SkillIcon = ({ icon, name, className }: { icon: string, name: string, className?: string }) => {
    const isEmoji = /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(icon) || icon.length <= 2
    if (isEmoji) return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 32,
        ...(className?.split(" ").reduce((acc, cls) => ({ ...acc, [cls]: true }), {}) || {}),
      }}>
        {icon}
      </div>
    )

    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        backgroundColor: "#F2F3F5",
        border: "1px solid #EDEEEF",
        ...(className?.split(" ").reduce((acc, cls) => ({ ...acc, [cls]: true }), {}) || {}),
      }}>
        <img
          src={icon}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            e.currentTarget.style.display = "none"
            e.currentTarget.parentElement!.innerHTML = `<span style="font-size:12px;font-weight:900">${name.charAt(0).toUpperCase()}</span>`
          }}
        />
      </div>
    )
  }

  const columns: ColumnsType<Skill> = [
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
        <SkillIcon icon={record.icon} name={record.name} className="size-10 rounded-lg" />
      ),
    },
    {
      title: "Skill ID",
      dataIndex: "skill_id",
      key: "skill_id",
      render: (skill_id: string) => <Text copyable style={{ fontFamily: "monospace", fontSize: 12 }}>{skill_id}</Text>,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name: string) => <Text>{name}</Text>,
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: (category: string) => (
        <Tag style={{ textTransform: "uppercase", fontWeight: 700, fontSize: 10 }}>{category}</Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_published",
      key: "is_published",
      render: (is_published: number, record) =>
        is_published ? (
          <Tag color="green">
            <GlobalOutlined style={{ marginRight: 4 }} /> Published
          </Tag>
        ) : (
          <Tag color="default">
            <LockOutlined style={{ marginRight: 4 }} /> Draft
          </Tag>
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
              setEditingSkill(record)
              setModalOpen(true)
            }}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.skill_id)}
            disabled={record.is_builtin === 1}
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
          placeholder="Search skills..."
          prefix={<SearchOutlined style={{ color: "#8F959E" }} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingSkill({
              skill_id: "",
              name: "",
              description: "",
              icon: "🧩",
              category: "工具",
              author: "StravisionAI",
              version: "1.0.0",
              keywords: "",
              examples: "",
              effects: "",
              content: "",
              is_published: 0,
              is_builtin: 0,
              priority: 0,
            })
            setModalOpen(true)
          }}
        >
          Add Skill
        </Button>
      </div>
      </Card>

      <Card style={{ border: "1px solid #EDEEEF" }} styles={{ body: { padding: 0 } }}>
      <Table
        columns={columns}
        dataSource={filteredSkills}
        rowKey="id"
        loading={loading}
        locale={{
          emptyText: loading ? "Loading..." : "No skills found.",
        }}
        pagination={{ pageSize: 10 }}
      />
      </Card>

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={editingSkill?.id ? "Edit Skill" : "New Skill"}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>,
          <Button key="save" type="primary" onClick={handleSave}>
            Save Skill Asset
          </Button>,
        ]}
        width={800}
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "16px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Text strong style={{ opacity: 0.6 }}>Skill ID (Unique Slug)</Text>
              <Input
                placeholder="e.g. agriculture-expert"
                value={editingSkill?.skill_id || ""}
                onChange={(e) => setEditingSkill({ ...editingSkill, skill_id: e.target.value })}
                disabled={!!editingSkill?.id}
                style={{ height: 48, borderRadius: 12 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Text strong style={{ opacity: 0.6 }}>Name</Text>
              <Input
                placeholder="e.g. 农业专家"
                value={editingSkill?.name || ""}
                onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                style={{ height: 48, borderRadius: 12, fontWeight: 700 }}
              />
            </div>
          </div>

          {/* Image Fields Integrated with Cropper */}
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
                  {editingSkill?.icon && (
                    (editingSkill.icon.startsWith("http") || editingSkill.icon.startsWith("/")) ? (
                      <img src={editingSkill.icon} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 24 }}>{editingSkill.icon}</span>
                    )
                  )}
                  {!editingSkill?.icon && <PlusOutlined style={{ color: "#8F959E" }} />}
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <Input
                    placeholder="🧩 或 图片链接"
                    value={editingSkill?.icon || ""}
                    onChange={(e) => setEditingSkill({ ...editingSkill, icon: e.target.value })}
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
                <FireOutlined /> 封面大图 URL (精选/详情页)
              </Text>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Input
                  placeholder="https://images.unsplash.com/..."
                  value={editingSkill?.cover_image || ""}
                  onChange={(e) => setEditingSkill({ ...editingSkill, cover_image: e.target.value })}
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
                    {editingSkill?.cover_image ? (
                      <img src={editingSkill.cover_image} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }} />
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Text strong style={{ opacity: 0.6 }}>Category</Text>
              <Input
                placeholder="精选/农业/系统..."
                value={editingSkill?.category || "工具"}
                onChange={(e) => setEditingSkill({ ...editingSkill, category: e.target.value })}
                style={{ height: 48, borderRadius: 12 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Text strong style={{ opacity: 0.6 }}>Priority (0-100)</Text>
              <Input
                type="number"
                placeholder="100 = Top"
                value={editingSkill?.priority || 0}
                onChange={(e) => setEditingSkill({ ...editingSkill, priority: parseInt(e.target.value) || 0 })}
                style={{ height: 48, borderRadius: 12 }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Text strong style={{ opacity: 0.6 }}>Description (Brief)</Text>
            <Input.TextArea
              placeholder="Brief description..."
              value={editingSkill?.description || ""}
              onChange={(e) => setEditingSkill({ ...editingSkill, description: e.target.value })}
              style={{ borderRadius: 12, height: 80 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Text strong style={{ opacity: 0.6 }}>Status & Built-in</Text>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                padding: "12px 16px",
                borderRadius: 6,
                backgroundColor: "#F7F8FA",
                border: "1px solid #EDEEEF",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    id="skill-pub-check"
                    checked={editingSkill?.is_published === 1}
                    onChange={(e) => setEditingSkill({ ...editingSkill, is_published: e.target.checked ? 1 : 0 })}
                  />
                  <label htmlFor="skill-pub-check" style={{ fontWeight: 700, fontSize: 12 }}>Published</label>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    id="skill-builtin-check"
                    checked={editingSkill?.is_builtin === 1}
                    onChange={(e) => setEditingSkill({ ...editingSkill, is_builtin: e.target.checked ? 1 : 0 })}
                  />
                  <label htmlFor="skill-builtin-check" style={{ fontWeight: 700, fontSize: 12 }}>System Built-in</label>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Text strong style={{ color: "#1F2329" }}>Interaction Examples (Comma Separated)</Text>
              <Input
                placeholder="e.g. 你是谁？,当前环境如何？"
                value={editingSkill?.examples || ""}
                onChange={(e) => setEditingSkill({ ...editingSkill, examples: e.target.value })}
                style={{ height: 48, borderRadius: 12 }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Text strong style={{ color: "#1F2329", display: "flex", alignItems: "center", gap: 8 }}>
              <CodeOutlined /> System Prompt (Core Instructions)
            </Text>
            <Input.TextArea
              placeholder="# Skill Instruction..."
              value={editingSkill?.content || ""}
              onChange={(e) => setEditingSkill({ ...editingSkill, content: e.target.value })}
              style={{
                height: 280,
                fontFamily: "monospace",
                fontSize: 12,
                backgroundColor: "#FFFFFF",
                padding: 16,
                borderRadius: 6,
                border: "1px solid #EDEEEF",
              }}
            />
          </div>
        </div>
      </Modal>

      {/* Image Cropper Modal Integration */}
      <ImageCropper
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        title={cropperTarget === "icon" ? "裁剪技能图标" : "裁剪技能封面图"}
        aspect={cropperTarget === "icon" ? 1 : 2.22}
        onCropComplete={(url) => {
          if (cropperTarget === "icon") {
            setEditingSkill(prev => ({ ...prev, icon: url }))
          } else {
            setEditingSkill(prev => ({ ...prev, cover_image: url }))
          }
        }}
      />
    </div>
  )
}
