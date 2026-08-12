
"use client"

import { useState, useRef } from "react"
import { Card, Input, Button, Typography } from "antd"
import { UploadOutlined, RocketOutlined, PlusOutlined, DeleteOutlined, LoadingOutlined, EditOutlined, SaveOutlined, ReloadOutlined } from "@ant-design/icons"
import { toast } from "sonner"
import Image from "next/image"

const { Text } = Typography

export function ChangelogSender() {
  const [version, setVersion] = useState("v2.5.0")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [title, setTitle] = useState("系统更新公告：MCP 工具与智能托管优化")
  const [imageUrl, setImageUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [features, setFeatures] = useState<string[]>([
    "新增光谱 MCP (Spectrum MCP) 工具，支持获取指定通道光谱值和全波段数据",
    "管理后台新增更新日志 (Changelog) 推送功能，支持结构化展示",
    "聊天界面新增更新日志卡片渲染，优化信息展示体验",
    "集成 SSE (Server-Sent Events) 协议支持，提升 MCP 工具连接稳定性"
  ])
  const [improvements, setImprovements] = useState<string[]>([
    "优化了 AI 智能托管逻辑，加入了严格的强制静默协议，防止设备被意外开启",
    "改进了自动播报功能，进入监控页面时 AI 会自动进行语音问候",
    "优化了 MCP 工具执行器的错误处理和重试机制",
    "调整了系统提示词 (System Prompt)，增强了对用户关闭指令的服从性"
  ])
  const [fixes, setFixes] = useState<string[]>([
    "修复了 IP 封禁管理中时间戳解析导致的 RangeError 报错",
    "修复了自动托管模式下设备反复开关的循环逻辑问题",
    "修复了 Next.js 版本不匹配导致的 Turbopack 启动错误"
  ])
  
  const [actionLabel, setActionLabel] = useState("前往体验新功能")
  const [actionUrl, setActionUrl] = useState("/mcp-store")
  
  const [loading, setLoading] = useState(false)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error("图片大小不能超过 5MB")
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) throw new Error("上传失败")

      const data = await res.json()
      if (data.success) {
        setImageUrl(data.url)
        toast.success("图片上传成功")
      } else {
        toast.error(data.error || "上传失败")
      }
    } catch (error) {
      console.error(error)
      toast.error("图片上传出错")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const addItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, list: string[]) => {
    setter([...list, ""])
  }

  const updateItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, list: string[], index: number, value: string) => {
    const newList = [...list]
    newList[index] = value
    setter(newList)
  }

  const removeItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, list: string[], index: number) => {
    const newList = [...list]
    newList.splice(index, 1)
    setter(newList)
  }

  const handleSend = async () => {
    if (!version.trim()) {
      toast.error("请输入版本号")
      return
    }

    const content = {
      version,
      date,
      title,
      imageUrl: imageUrl.trim() || undefined,
      features: features.filter(i => i.trim()),
      improvements: improvements.filter(i => i.trim()),
      fixes: fixes.filter(i => i.trim()),
      action: actionLabel.trim() && actionUrl.trim() ? {
          label: actionLabel.trim(),
          url: actionUrl.trim()
      } : undefined
    }

    if (content.features.length === 0 && content.improvements.length === 0 && content.fixes.length === 0) {
        toast.error("请至少输入一项更新内容")
        return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/admin/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            content: JSON.stringify(content),
            type: 'changelog'
        })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("更新日志推送成功")
        setVersion("")
        setImageUrl("")
        setFeatures([])
        setImprovements([])
        setFixes([])
        setActionLabel("前往体验新功能")
        setActionUrl("/mcp-store")
      } else {
        toast.error(data.error || "发送失败")
      }
    } catch (error) {
      console.error(error)
      toast.error("发送失败，请检查网络")
    } finally {
      setLoading(false)
    }
  }

  const renderList = (
    listTitle: string, 
    icon: React.ReactNode, 
    list: string[], 
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    placeholder: string
  ) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon}
          {listTitle}
        </Text>
        <Button 
          type="text" 
          size="small" 
          icon={<PlusOutlined />} 
          onClick={() => addItem(setter, list)}
          style={{ width: 24, height: 24 }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map((item, index) => (
          <div key={index} style={{ display: 'flex', gap: 8 }}>
            <Input 
              value={item} 
              onChange={(e) => updateItem(setter, list, index, e.target.value)}
              placeholder={placeholder}
              size="small"
            />
            <Button 
              type="text" 
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => removeItem(setter, list, index)}
              danger
            />
          </div>
        ))}
        {list.length === 0 && (
            <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic', paddingLeft: 8 }}>
              暂无条目，点击 + 添加
            </Text>
        )}
      </div>
    </div>
  )

  return (
    <Card 
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RocketOutlined style={{ color: '#1677ff' }} />
          发布更新日志
        </span>
      }
      style={{ border: "1px solid #EDEEEF" }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
                <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>版本号 (Version)</Text>
                <Input placeholder="v1.0.0" value={version} onChange={(e) => setVersion(e.target.value)} />
            </div>
            <div>
                <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>发布日期 (Date)</Text>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
        </div>
        
        <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>标题 (Title)</Text>
            <Input placeholder="系统更新公告" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>封面图片 (Cover Image)</Text>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {imageUrl ? (
                <div style={{ position: 'relative', width: '100%', height: 160, borderRadius: 8, overflow: 'hidden', border: '1px solid #EDEEEF' }}>
                  <Image src={imageUrl} alt="Cover" fill style={{ objectFit: 'cover' }} />
                  <Button 
                    type="text"
                    size="small"
                    onClick={() => setImageUrl("")}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: 'white' }}
                  >
                    ×
                  </Button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    width: '100%', 
                    height: 96, 
                    border: '2px dashed #EDEEEF',
                    borderRadius: 8, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  {uploading ? (
                    <LoadingOutlined style={{ fontSize: 24, color: '#8F959E' }} />
                  ) : (
                    <>
                      <UploadOutlined style={{ fontSize: 24, color: '#8F959E', marginBottom: 8 }} />
                      <span style={{ fontSize: 12, color: '#8F959E' }}>点击上传封面图片 (Max 5MB)</span>
                    </>
                  )}
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*" 
                onChange={handleImageUpload} 
              />
            </div>
        </div>

        <div style={{ paddingTop: 8 }}>
            {renderList("新功能 (Features)", <RocketOutlined style={{ color: '#1677ff' }} />, features, setFeatures, "新增了...")}
            {renderList("优化改进 (Improvements)", <EditOutlined style={{ color: '#FA8C16' }} />, improvements, setImprovements, "优化了...")}
            {renderList("问题修复 (Fixes)", <ReloadOutlined style={{ color: '#F5222D' }} />, fixes, setFixes, "修复了...")}
        </div>

        <div style={{ paddingTop: 16, borderTop: '1px dashed #EDEEEF' }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>行动按钮 (Call to Action)</Text>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>按钮文字</Text>
                    <Input placeholder="前往体验" value={actionLabel} onChange={(e) => setActionLabel(e.target.value)} />
                </div>
                <div>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>跳转链接</Text>
                    <Input placeholder="/monitor" value={actionUrl} onChange={(e) => setActionUrl(e.target.value)} />
                </div>
            </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16 }}>
          <Button 
            type="primary"
            onClick={handleSend} 
            loading={loading}
          >
            {loading ? '发送中...' : '推送更新'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
