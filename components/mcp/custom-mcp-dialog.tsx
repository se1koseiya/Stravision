"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { IconClose, IconHelp, IconPlus } from "@/components/icon";

interface CustomMCPDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (server: any) => void
}

export function CustomMCPDialog({ open, onOpenChange, onSave }: CustomMCPDialogProps) {
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    displayName: "",
    description: "",
    category: "development",
    icon: "",
    iconBg: "bg-blue-500",
    provider: "",
    command: "npx",
    args: "",
    features: [] as string[],
    envVars: {} as Record<string, string>
  })

  const [currentFeature, setCurrentFeature] = useState("")
  const [currentEnvKey, setCurrentEnvKey] = useState("")
  const [currentEnvValue, setCurrentEnvValue] = useState("")

  const handleAddFeature = () => {
    if (currentFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, currentFeature.trim()]
      })
      setCurrentFeature("")
    }
  }

  const handleRemoveFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    })
  }

  const handleAddEnvVar = () => {
    if (currentEnvKey.trim()) {
      setFormData({
        ...formData,
        envVars: {
          ...formData.envVars,
          [currentEnvKey.trim()]: currentEnvValue.trim()
        }
      })
      setCurrentEnvKey("")
      setCurrentEnvValue("")
    }
  }

  const handleRemoveEnvVar = (key: string) => {
    const newEnvVars = { ...formData.envVars }
    delete newEnvVars[key]
    setFormData({
      ...formData,
      envVars: newEnvVars
    })
  }

  const handleSave = () => {
    // 验证必填字段
    if (!formData.name || !formData.displayName || !formData.description) {
      toast.error("请填写所有必填字段")
      return
    }

    // 生成 ID（如果未填写）
    const id = formData.id || formData.name.toLowerCase().replace(/\s+/g, "-")

    // 解析 args
    const args = formData.args.split(" ").filter(arg => arg.trim())

    const server = {
      id,
      name: formData.name,
      displayName: formData.displayName,
      description: formData.description,
      category: formData.category,
      icon: formData.icon || "https://via.placeholder.com/48",
      iconBg: formData.iconBg,
      provider: formData.provider || "Custom",
      requiresApiKey: Object.keys(formData.envVars).length > 0,
      command: formData.command,
      args,
      envVars: formData.envVars,
      features: formData.features,
      popularity: 50,
      official: false
    }

    onSave(server)
    onOpenChange(false)
    
    // 重置表单
    setFormData({
      id: "",
      name: "",
      displayName: "",
      description: "",
      category: "development",
      icon: "",
      iconBg: "bg-blue-500",
      provider: "",
      command: "npx",
      args: "",
      features: [],
      envVars: {}
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0A0A0A] border-white/10 text-white font-jinbuti">
        <DialogHeader>
          <DialogTitle className="text-white">添加自定义 MCP 服务器</DialogTitle>
          <DialogDescription className="text-white/40">
            配置你自己的 MCP 服务器。支持任何符合 MCP 协议的服务器。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 基本信息 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-white/60">基本信息</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/60">
                  服务器名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="例如: my-custom-server"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-emerald-500/50 focus-visible:border-primary"
                />
                <p className="text-xs text-white/40">用于配置文件的标识符</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-white/60">
                  显示名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="displayName"
                  placeholder="例如: My Custom Server"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-emerald-500/50 focus-visible:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white/60">
                描述 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="简要描述这个 MCP 服务器的功能..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-emerald-500/50 focus-visible:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-white/60">分类</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-emerald-500/50 focus:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0A] border-white/10 text-white">
                    <SelectItem value="agriculture">农业</SelectItem>
                    <SelectItem value="web">网络工具</SelectItem>
                    <SelectItem value="development">开发工具</SelectItem>
                    <SelectItem value="database">数据库</SelectItem>
                    <SelectItem value="productivity">生产力</SelectItem>
                    <SelectItem value="communication">通讯</SelectItem>
                    <SelectItem value="testing">测试</SelectItem>
                    <SelectItem value="deployment">部署</SelectItem>
                    <SelectItem value="ai-enhancement">AI 增强</SelectItem>
                    <SelectItem value="monitoring">监控</SelectItem>
                    <SelectItem value="business">商业</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider" className="text-white/60">提供商</Label>
                <Input
                  id="provider"
                  placeholder="例如: My Company"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-emerald-500/50 focus-visible:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon" className="text-white/60">图标 URL</Label>
                <Input
                  id="icon"
                  placeholder="https://example.com/icon.png"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-emerald-500/50 focus-visible:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="iconBg" className="text-white/60">图标背景色</Label>
                <Select value={formData.iconBg} onValueChange={(value) => setFormData({ ...formData, iconBg: value })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-emerald-500/50 focus:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0A] border-white/10 text-white">
                    <SelectItem value="bg-blue-500">蓝色</SelectItem>
                    <SelectItem value="bg-green-500">绿色</SelectItem>
                    <SelectItem value="bg-primary">祖母绿</SelectItem>
                    <SelectItem value="bg-red-500">红色</SelectItem>
                    <SelectItem value="bg-yellow-500">黄色</SelectItem>
                    <SelectItem value="bg-purple-500">紫色</SelectItem>
                    <SelectItem value="bg-pink-500">粉色</SelectItem>
                    <SelectItem value="bg-indigo-500">靛蓝</SelectItem>
                    <SelectItem value="bg-gray-500">灰色</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 安装命令 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-white/60">
              安装命令
              <IconHelp className="size-4 text-white/40" />
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="command" className="text-white/60">命令</Label>
                <Select value={formData.command} onValueChange={(value) => setFormData({ ...formData, command: value })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-emerald-500/50 focus:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0A] border-white/10 text-white">
                    <SelectItem value="npx">npx</SelectItem>
                    <SelectItem value="node">node</SelectItem>
                    <SelectItem value="python">python</SelectItem>
                    <SelectItem value="uvx">uvx</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="args" className="text-white/60">参数</Label>
                <Input
                  id="args"
                  placeholder="例如: -y @my-org/my-mcp-server"
                  value={formData.args}
                  onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-emerald-500/50 focus-visible:border-primary"
                />
                <p className="text-xs text-white/40">用空格分隔多个参数</p>
              </div>
            </div>

            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <p className="text-xs text-white/40 mb-1">完整命令预览：</p>
              <code className="text-sm text-emerald-400 font-mono">
                {formData.command} {formData.args || "[参数]"}
              </code>
            </div>
          </div>

          {/* 功能特性 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-white/60">功能特性</h3>
            
            <div className="flex gap-2">
              <Input
                placeholder="添加功能特性..."
                value={currentFeature}
                onChange={(e) => setCurrentFeature(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddFeature()}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-emerald-500/50 focus-visible:border-primary"
              />
              <Button type="button" onClick={handleAddFeature} size="icon" className="bg-primary hover:bg-primary text-white">
                <IconPlus className="size-4" />
              </Button>
            </div>

            {formData.features.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.features.map((feature, index) => (
                  <Badge key={index} variant="secondary" className="gap-1 bg-white/10 text-white border-white/10">
                    {feature}
                    <button
                      onClick={() => handleRemoveFeature(index)}
                      className="ml-1 hover:text-red-400 text-white/60"
                    >
                      <IconClose className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* 环境变量 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-white/60">环境变量（可选）</h3>
            
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="变量名（如 API_KEY）"
                value={currentEnvKey}
                onChange={(e) => setCurrentEnvKey(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-emerald-500/50 focus-visible:border-primary"
              />
              <div className="flex gap-2">
                <Input
                  placeholder="默认值（可选）"
                  value={currentEnvValue}
                  onChange={(e) => setCurrentEnvValue(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-emerald-500/50 focus-visible:border-primary"
                />
                <Button type="button" onClick={handleAddEnvVar} size="icon" className="bg-primary hover:bg-primary text-white shrink-0">
                  <IconPlus className="size-4" />
                </Button>
              </div>
            </div>

            {Object.keys(formData.envVars).length > 0 && (
              <div className="space-y-2">
                {Object.entries(formData.envVars).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex-1">
                      <code className="text-sm font-mono text-white">{key}</code>
                      {value && <span className="text-xs text-white/40 ml-2">= {value}</span>}
                    </div>
                    <button
                      onClick={() => handleRemoveEnvVar(key)}
                      className="text-white/40 hover:text-red-400"
                    >
                      <IconClose className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-white/10 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10 bg-transparent text-white hover:bg-white/5">
            取消
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary text-white">
            保存并安装
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
