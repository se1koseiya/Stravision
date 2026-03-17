// Plant Growth Analysis Types

export interface PlantGrowthStage {
  stage: number // 1-6
  name: string
  description: string
}

export type PlantHealthStatus = 'excellent' | 'good' | 'normal' | 'attention' | 'warning' | 'critical'

export interface PlantHealthInfo {
  score: number // 0-100
  status: PlantHealthStatus
  color: string
}

export interface PlantAnalysisResult {
  stage: number // 1-6 生长阶段
  healthScore: number // 0-100 整体健康度
  healthStatus: PlantHealthStatus // 健康状态
  issues: string[] // 发现的问题
  recommendations: string[] // 建议措施
  confidence: number // 0-1 分析置信度
  timestamp: number // 分析时间戳
  heatmap: number[] // 6个区域的健康度 0-100
}

export interface VLMAnalysisRequest {
  imageData: string // base64 encoded image
  model?: string // qwen3-vl-plus, qwen3-vl-max, etc.
  prompt?: string // custom prompt
}

export interface VLMAnalysTask {
  analyzing: boolean
  result: PlantAnalysisResult | null
  error: string | null
  tokenUsage?: {
    input: number
    output: number
    total: number
  }
}

// Growth stage constants
export const GROWTH_STAGES: PlantGrowthStage[] = [
  { stage: 1, name: '幼苗期', description: '种子萌发，初生叶片展开' },
  { stage: 2, name: '生长期', description: '植株快速生长，叶片增多' },
  { stage: 3, name: '花芽分化期', description: '开始形成花芽' },
  { stage: 4, name: '开花结果期', description: '开花授粉，果实形成' },
  { stage: 5, name: '果实成熟期', description: '果实膨大成熟' },
  { stage: 6, name: '采收后期', description: '果实采收，植株休整' }
]

// Health status color mapping
export const HEALTH_STATUS_COLORS: Record<PlantHealthStatus, string> = {
  'excellent': '#9EE09E',
  'good': '#A5F28F',
  'normal': '#C8FF8F',
  'attention': '#FFB3C1',
  'warning': '#FF8FA3', 
  'critical': '#FF6F91'
}

// Helper function to get health status from score
export function getHealthStatus(score: number): PlantHealthStatus {
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'good'
  if (score >= 60) return 'normal'
  if (score >= 45) return 'attention'
  if (score >= 30) return 'warning'
  return 'critical'
}

// Helper function to get health info from score
export function getHealthInfo(score: number): PlantHealthInfo {
  const status = getHealthStatus(score)
  return {
    score,
    status,
    color: HEALTH_STATUS_COLORS[status]
  }
}
