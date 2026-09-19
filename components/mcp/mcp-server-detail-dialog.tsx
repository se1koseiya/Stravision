"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tag, Typography, Descriptions, Tooltip } from "antd"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import { IconBox, IconChartLine, IconCheck, IconClose, IconCopy, IconCpu, IconDownload, IconGlobe, IconInfo, IconLayoutTwo, IconLeaf, IconLightning, IconLinkOut, IconSeedling, IconShield, IconStar, IconTerminal } from "@/components/icon";

const { Title, Paragraph, Text } = Typography

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
  apiKeyInstructions?: string
  command: string
  args: string[]
  envVars?: Record<string, string>
  features: string[]
  popularity: number
  official: boolean
  cover_image?: string
}

interface MCPServerDetailDialogProps {
  server: MCPServer | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onInstall: (server: MCPServer, config: Record<string, string>) => void
}

export function MCPServerDetailDialog({ server, open, onOpenChange, onInstall }: MCPServerDetailDialogProps) {
  const [envConfig, setEnvConfig] = useState<Record<string, string>>({})
  const [isInstalling, setIsInstalling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [iconError, setIconError] = useState(false)
  const [coverError, setCoverError] = useState(false)
  const [internalOpen, setInternalOpen] = useState(true)

  useEffect(() => {
    if (open) {
      setIconError(false)
      setCoverError(false)
      setEnvConfig({})
      setInternalOpen(true)
    }
  }, [open, server?.id])

  if (!server) return null

  const visible = open && internalOpen
  const handleClose = () => {
    if (!internalOpen) return
    setInternalOpen(false)
    onOpenChange(false)
  }

  const handleCopyCommand = () => {
    const command = `${server.command} ${server.args.join(' ')}`
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("命令已复制到剪贴板")
  }

  const handleInstall = async () => {
    if (server.requiresApiKey && server.envVars) {
      const missingKeys = Object.keys(server.envVars).filter(key => !envConfig[key])
      if (missingKeys.length > 0) {
        toast.error(`请填写 ${missingKeys.join(', ')}`, { description: "这些项是必需的" })
        return
      }
    }

    setIsInstalling(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    onInstall(server, envConfig)
    setIsInstalling(false)
    onOpenChange(false)
    setEnvConfig({})
  }

  const AppIcon = ({ icon, name, className, size = 48 }: { icon: string, name: string, className?: string, size?: number }) => {
    if (iconError || !icon) {
      const firstLetter = name.charAt(0).toUpperCase()
      return (
        <div
          className={cn(className, "text-white font-semibold flex items-center justify-center shrink-0")}
          style={{
            borderRadius: BERRY_THEME.radius.md,
            background: `linear-gradient(135deg, ${BERRY_THEME.primary}, ${BERRY_THEME.primaryActive})`,
            width: size,
            height: size,
            fontSize: size * 0.4
          }}
        >
          {firstLetter}
        </div>
      )
    }
    return (
      <div
        className={cn(className, "bg-white border border-gray-200 overflow-hidden flex items-center justify-center shrink-0")}
        style={{ borderRadius: BERRY_THEME.radius.md, width: size, height: size }}
      >
        <img
          src={icon}
          alt={name}
          className="size-[60%] object-contain"
          onError={() => setIconError(true)}
        />
      </div>
    )
  }

  const isAgri = server.category === "agriculture"
  const hasCover = server.cover_image && !coverError

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: visible ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onAnimationComplete={() => { if (!internalOpen) onOpenChange(false) }}
          className={cn(
            "fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4",
            !visible && "pointer-events-none"
          )}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: visible ? 1 : 0 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-hidden
          />

          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 8, scale: visible ? 1 : 0.98 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-3xl h-full md:h-[80vh] bg-white flex flex-col shadow-2xl border border-gray-200/80 font-sans overflow-hidden"
            style={{ borderRadius: BERRY_THEME.radius.lg }}
          >
            {/* 关闭按钮 */}
            <button
              onClick={handleClose}
              className="absolute top-3.5 right-3.5 z-50 size-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors backdrop-blur-md"
              style={{ borderRadius: 6 }}
            >
              <IconClose size={16} />
            </button>

            <ScrollArea className="flex-1">
              <div className="flex flex-col">
                {/* Hero 头部：封面图或品牌渐变背景 */}
                <div
                  className="relative shrink-0 overflow-hidden"
                  style={{
                    height: 168,
                    background: hasCover
                      ? undefined
                      : `linear-gradient(135deg, ${BERRY_THEME.primary} 0%, ${BERRY_THEME.primaryActive} 100%)`
                  }}
                >
                  {hasCover && (
                    <>
                      <img
                        src={server.cover_image}
                        alt={server.displayName}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={() => setCoverError(true)}
                      />
                      {/* 渐变蒙版：保证底部文字可读 */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)`
                        }}
                      />
                    </>
                  )}
                  {/* 装饰模糊球 */}
                  <div className="absolute top-6 right-24 size-32 rounded-full bg-white/15 -rotate-12 blur-2xl pointer-events-none" />
                  <div className="absolute bottom-2 left-20 size-20 rounded-full bg-white/10 rotate-6 blur-xl pointer-events-none" />
                </div>

                {/* 标题区：浮在 hero 下方，紧贴 header */}
                <div className="px-6 pt-0 pb-4 bg-white -mt-10 relative">
                  <div className="flex items-start gap-3.5">
                    <AppIcon
                      icon={server.icon}
                      name={server.displayName}
                      className="ring-4 ring-white shadow-md"
                      size={56}
                    />
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <Tag color="blue" className="!m-0">
                          {server.category}
                        </Tag>
                        {server.official && (
                          <Tag icon={<IconShield size={11} />} color="processing" className="!m-0">
                            官方认证
                          </Tag>
                        )}
                        {isAgri && (
                          <Tag icon={<IconSeedling size={11} />} color="cyan" className="!m-0">
                            种植场景
                          </Tag>
                        )}
                      </div>
                      <h2 className="text-[20px] font-semibold leading-tight text-gray-900 mb-1.5 tracking-tight">
                        {server.displayName}
                      </h2>
                      <div className="flex items-center gap-3 text-[12px] text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <IconBox size={12} />
                          {server.provider}
                        </span>
                        <span className="w-px h-3 bg-gray-200" />
                        <span className="flex items-center gap-1">
                          <IconChartLine size={12} />
                          {server.popularity.toLocaleString()} 安装
                        </span>
                        <span className="w-px h-3 bg-gray-200" />
                        <span className="flex items-center gap-1">
                          <IconCpu size={12} />
                          模型原生支持
                        </span>
                        <span className="w-px h-3 bg-gray-200" />
                        <span className="flex items-center gap-1">
                          <IconStar size={12} className="text-amber-500 fill-amber-500" />
                          4.8
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 描述 */}
                <div className="px-6 py-4 border-t border-b border-gray-200">
                  <Paragraph className="!mb-0 !text-[13px] !leading-relaxed text-gray-700">
                    {server.description}
                  </Paragraph>
                </div>

                {/* 主体两栏布局 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                  {/* 左：核心功能 + 配置 + 命令 */}
                  <div className="lg:col-span-2 lg:border-r border-gray-200">
                    {/* 核心功能 */}
                    <div className="px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center gap-1.5 mb-3">
                        <IconLayoutTwo size={13} className="text-gray-500" />
                        <Text className="!text-[13px] !font-semibold text-gray-900">核心功能</Text>
                        <Tag className="!m-0" color="default">
                          {server.features.length}
                        </Tag>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {server.features.map((feature, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2.5 px-3 py-2 border border-gray-200 hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
                            style={{ borderRadius: 6 }}
                          >
                            <div className="size-6 flex items-center justify-center shrink-0 bg-blue-50" style={{ borderRadius: 4 }}>
                              <IconCheck size={12} className="text-blue-600" strokeWidth={3} />
                            </div>
                            <span className="text-[12px] font-medium text-gray-700">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 配置 */}
                    {server.requiresApiKey && server.envVars && (
                      <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5">
                            <IconShield size={13} className="text-gray-500" />
                            <Text className="!text-[13px] !font-semibold text-gray-900">开发配置</Text>
                            <Tag color="warning" className="!m-0">必需</Tag>
                          </div>
                          {server.apiKeyUrl && (
                            <a
                              href={server.apiKeyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[12px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                              获取密钥 <IconLinkOut size={11} />
                            </a>
                          )}
                        </div>
                        <div className="space-y-2.5">
                          {Object.entries(server.envVars).map(([key, defaultValue]) => (
                            <div key={key} className="space-y-1.5">
                              <Label htmlFor={key} className="text-[12px] font-medium text-gray-700">
                                {key}
                              </Label>
                              <Input
                                id={key}
                                type={key.toLowerCase().includes('key') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('password') ? 'password' : 'text'}
                                placeholder={defaultValue || `请输入 ${key}`}
                                value={envConfig[key] || ''}
                                onChange={(e) => setEnvConfig(prev => ({ ...prev, [key]: e.target.value }))}
                                className="h-8 px-2.5 bg-white border-gray-200 font-mono text-[12px] focus:ring-1 focus:border-blue-400 focus:ring-blue-100"
                                style={{ borderRadius: 4 }}
                              />
                            </div>
                          ))}
                        </div>
                        {server.apiKeyInstructions && (
                          <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 text-[12px] text-amber-800 leading-relaxed" style={{ borderRadius: 4 }}>
                            <IconInfo size={11} className="inline mr-1 -mt-0.5" />
                            {server.apiKeyInstructions}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 本地运行命令 */}
                    <div className="px-6 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <IconTerminal size={13} className="text-gray-500" />
                          <Text className="!text-[13px] !font-semibold text-gray-900">本地运行</Text>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCopyCommand}
                          className="h-7 px-2 text-[11px] text-gray-500 hover:text-blue-600"
                        >
                          {copied ? <IconCheck size={12} className="mr-1" /> : <IconCopy size={12} className="mr-1" />}
                          {copied ? "已复制" : "复制"}
                        </Button>
                      </div>
                      <pre
                        className="text-[12px] font-mono text-gray-300 bg-gray-900 p-3 overflow-x-auto leading-relaxed"
                        style={{ borderRadius: 6 }}
                      >
                        <span className="text-gray-500 select-none">$ </span>
                        {server.command} {server.args.join(' ')}
                      </pre>
                    </div>
                  </div>

                  {/* 右：元信息 + 提示卡片 */}
                  <div className="flex flex-col">
                    <div className="px-5 py-4 border-b border-gray-200">
                      <Text className="!text-[13px] !font-semibold text-gray-900 mb-3 block">工具信息</Text>
                      <Descriptions
                        column={1}
                        size="small"
                        colon={false}
                        labelStyle={{ color: '#6b7280', fontSize: 12, padding: '4px 0' }}
                        contentStyle={{ fontSize: 12, fontWeight: 500, color: '#111827', padding: '4px 0' }}
                      >
                        <Descriptions.Item label="开发者">{server.provider}</Descriptions.Item>
                        <Descriptions.Item label="分类">{server.category}</Descriptions.Item>
                        <Descriptions.Item label="版本">1.0.0</Descriptions.Item>
                        <Descriptions.Item label="安装量">{server.popularity.toLocaleString()}</Descriptions.Item>
                        <Descriptions.Item label="协议">MCP</Descriptions.Item>
                      </Descriptions>
                    </div>

                    <div className="px-5 py-4 flex-1 flex flex-col gap-3">
                      <div className="p-3 bg-blue-50/60 border border-blue-100" style={{ borderRadius: 6 }}>
                        <div className="flex items-center gap-1.5 text-blue-700 mb-1.5">
                          <IconShield size={12} />
                          <span className="text-[12px] font-semibold">安全说明</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-gray-600 m-0">
                          此工具在沙箱环境中运行，仅在您授权时访问特定 API 或本地服务。
                        </p>
                      </div>

                      <div className="p-3 bg-gray-50 border border-gray-200" style={{ borderRadius: 6 }}>
                        <div className="flex items-center gap-1.5 text-gray-700 mb-1.5">
                          <IconLightning size={12} />
                          <span className="text-[12px] font-semibold">使用提示</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-gray-600 m-0">
                          安装后可在对话中直接调用，如"查询今日草莓大棚环境数据"。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* 底部操作栏：固定 + 圆角匹配 */}
            <div
              className="px-6 py-3 border-t border-gray-200 bg-white flex items-center justify-between gap-3"
              style={{ borderBottomLeftRadius: BERRY_THEME.radius.lg, borderBottomRightRadius: BERRY_THEME.radius.lg }}
            >
              <Text className="!text-[11px] !text-gray-400 flex items-center gap-1">
                <IconGlobe size={11} />
                Stravision MCP 协议保护
              </Text>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="h-9 px-4 text-[13px] text-gray-600 hover:text-gray-900"
                >
                  取消
                </Button>
                <Button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="h-9 px-5 text-[13px] font-medium !bg-blue-600 hover:!bg-blue-500 !text-white !border-blue-600 disabled:!bg-blue-300"
                  style={{ borderRadius: 6 }}
                >
                  {isInstalling ? (
                    <span className="flex items-center gap-1.5">
                      <span className="size-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      正在集成...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <IconDownload size={14} />
                      立即获取工具
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
