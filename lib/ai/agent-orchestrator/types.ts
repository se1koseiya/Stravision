/**
 * Agent 编排系统类型定义
 * 
 * 这是一个先进的 Agent 编排层，提供：
 * - 统一的工具调用接口
 * - 自动重试和错误处理
 * - 执行监控和日志
 * - Agent 协作机制
 * - 记忆管理
 */

export interface AgentContext {
  userId: number;
  sessionId: string;
  conversationHistory: Message[];
  deviceData?: any;
  weatherData?: any;
  memory?: AgentMemory;
  mcpConfigs?: any[];
  appUrl?: string;
  /** 长耗时工具（deep_research）的阶段进度回调，chat 路由转发为 SSE 推给前端思维链 */
  onProgress?: (stage: string, detail?: string) => void;
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | any[];
  name?: string; // tool name
  tool_call_id?: string;
}

export interface AgentMemory {
  shortTerm: ShortTermMemory;
  longTerm: LongTermMemory;
  working: WorkingMemory;
}

export interface ShortTermMemory {
  recentActions: Action[];
  recentObservations: Observation[];
  maxSize: number;
}

export interface LongTermMemory {
  userPreferences: Record<string, any>;
  devicePatterns: DevicePattern[];
  successfulStrategies: Strategy[];
}

export interface WorkingMemory {
  currentGoal?: string;
  subGoals: string[];
  completedSteps: string[];
  pendingActions: Action[];
}

export interface Action {
  id: string;
  type: 'tool_call' | 'device_control' | 'navigation';
  timestamp: number;
  params: any;
  result?: any;
  status: 'pending' | 'executing' | 'success' | 'failed';
  retryCount: number;
  error?: string;
}

export interface Observation {
  id: string;
  type: 'sensor_data' | 'user_feedback' | 'system_event';
  timestamp: number;
  data: any;
  importance: number; // 0-1
}

export interface DevicePattern {
  deviceId: number;
  pattern: 'daily_cycle' | 'weather_responsive' | 'manual_override';
  confidence: number;
  lastUpdated: number;
}

export interface Strategy {
  id: string;
  goal: string;
  steps: string[];
  successRate: number;
  avgExecutionTime: number;
  conditions: Record<string, any>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  timestamp: number;
}

export interface ToolResult {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
}

export interface AgentPlan {
  goal: string;
  steps: PlanStep[];
  estimatedTime: number;
  dependencies: string[];
}

export interface PlanStep {
  id: string;
  description: string;
  action: Action;
  expectedOutcome: string;
  fallbackActions?: Action[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
}

export interface AgentMetrics {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  avgResponseTime: number;
  toolUsageStats: Record<string, number>;
  errorRate: number;
  recentActions?: Array<{
    timestamp: number;
    type: string;
    status: 'success' | 'failed';
    executionTime: number;
  }>;
}

export interface AgentConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  enableMemory: boolean;
  enableMonitoring: boolean;
  enableAutoRecovery: boolean;
}
