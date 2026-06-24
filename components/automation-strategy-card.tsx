"use client"

import { useState } from "react"
import { Button, Card, Flex, Space, Statistic, Tag, Typography, theme } from "antd"
import { Bolt, Save, Edit, Play, Check, Loader2, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const { Text, Title } = Typography

interface AutomationStrategyCardProps {
  strategy: { nodes: any[]; edges: any[] }
  description?: string
  onSave?: (ruleId: string) => void
}

export function AutomationStrategyCard({ strategy, description, onSave }: AutomationStrategyCardProps) {
  const router = useRouter()
  const { token } = theme.useToken()
  const [isSaving, setIsSaving] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [ruleId, setRuleId] = useState<string | null>(null)

  const nodeCount = strategy.nodes?.length || 0
  const triggerNodes = strategy.nodes?.filter((n: any) => n.type === "triggerNode") || []
  const actionNodes = strategy.nodes?.filter((n: any) => n.type === "actionNode") || []

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/automation/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: description || "由 AI 助手生成的自动化策略",
          description: description || "",
          graph_data: strategy,
          trigger_type: strategy.nodes.find((n: any) => n.type === "triggerNode")?.data?.type || "manual",
          is_active: true,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "保存失败")
      setSaved(true)
      setRuleId(data.data.id)
      toast.success("自动化策略已保存")
      onSave?.(data.data.id)
    } catch (error) {
      toast.error("保存失败", { description: error instanceof Error ? error.message : "未知错误" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleExecute = async () => {
    setIsExecuting(true)
    try {
      const res = await fetch("/api/automation/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graph_data: strategy, force: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "执行失败")
      const count = data.actions?.length || 0
      toast.success(count > 0 ? `已执行 ${count} 个动作` : "执行完成")
    } catch (error) {
      toast.error("执行失败", { description: error instanceof Error ? error.message : "未知错误" })
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <Card style={{ borderColor: token.colorSuccessBorder, background: `linear-gradient(135deg, ${token.colorSuccessBg}, ${token.colorSuccessBgHover})` }}>
      <Flex vertical gap={16}>
        {/* Header */}
        <Flex align="flex-start" gap={12}>
          <Flex align="center" justify="center" style={{
            width: 36, height: 36, borderRadius: token.borderRadius, background: token.colorSuccessBgHover, color: token.colorSuccess,
          }}>
            <Bolt size={18} />
          </Flex>
          <Flex vertical flex={1}>
            <Space>
              <Title level={5} style={{ margin: 0, color: token.colorSuccessText }}>自动化策略</Title>
              {saved && <Tag color="success" style={{ margin: 0 }}><Check size={10} /> 已保存</Tag>}
            </Space>
            {description && <Text type="secondary" style={{ fontSize: 13 }}>{description}</Text>}
          </Flex>
        </Flex>

        {/* Stats */}
        <Flex gap={12}>
          <Statistic title="节点总数" value={nodeCount} valueStyle={{ color: token.colorSuccess, fontSize: 20 }} />
          <Statistic title="触发器" value={triggerNodes.length} valueStyle={{ color: token.colorSuccess, fontSize: 20 }} />
          <Statistic title="动作" value={actionNodes.length} valueStyle={{ color: token.colorSuccess, fontSize: 20 }} />
        </Flex>

        {/* Node preview */}
        <Flex vertical gap={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>策略流程</Text>
          <Flex gap={4} wrap>
            {strategy.nodes?.slice(0, 5).map((node: any, i: number) => (
              <Tag
                key={i}
                color={node.type === "triggerNode" ? "success" : node.type === "logicNode" ? "purple" : "orange"}
              >
                {node.data?.label || node.type}
              </Tag>
            ))}
            {nodeCount > 5 && <Tag>+{nodeCount - 5} 更多</Tag>}
          </Flex>
        </Flex>

        {/* Actions */}
        <Flex gap={8}>
          {!saved ? (
            <Button type="primary" icon={<Save size={14} />} loading={isSaving} onClick={handleSave} block>
              保存策略
            </Button>
          ) : (
            <Button icon={<ExternalLink size={14} />} onClick={() => ruleId ? router.push(`/automation/editor?id=${ruleId}`) : router.push("/automation/editor?from=ai-assistant")}>
              查看详情
            </Button>
          )}
          <Button icon={<Play size={14} />} loading={isExecuting} onClick={handleExecute}>
            测试运行
          </Button>
        </Flex>
      </Flex>
    </Card>
  )
}
