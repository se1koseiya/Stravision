/**
 * Agent 编排器
 * 
 * 统一管理 Agent 的执行流程：
 * - 工具调用（带重试和超时）
 * - 记忆管理（短期、工作、长期）
 * - 性能监控
 * - 执行日志
 */

import { ToolManager } from './tool-manager';
import { MemoryManager } from './memory-manager';
import { AgentMonitor } from './monitor';
import { AgentContext, ToolCall, ToolResult, Action, Observation } from './types';
import { logAgentExecution } from '@/lib/db/agent-memory-service';

export interface OrchestratorConfig {
  enableMemory: boolean;
  enableMonitoring: boolean;
  enableLogging: boolean;
  toolConfig?: {
    maxRetries: number;
    retryDelay: number;
    timeout: number;
  };
}

export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  enableMemory: true,
  enableMonitoring: true,
  enableLogging: true,
  toolConfig: {
    maxRetries: 2,
    retryDelay: 1000,
    timeout: 60000
  }
};

export class AgentOrchestrator {
  private toolManager: ToolManager;
  private memoryManager: MemoryManager;
  private monitor: AgentMonitor;
  private config: OrchestratorConfig;
  private sessionId: string;

  constructor(sessionId: string, config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config };
    this.sessionId = sessionId;
    
    this.toolManager = new ToolManager();
    this.memoryManager = new MemoryManager();
    this.monitor = new AgentMonitor({
      enableAnomalyDetection: this.config.enableMonitoring,
      onAlert: (alert) => {
        console.warn(`[Orchestrator] Alert: ${alert.type} - ${alert.message}`);
      }
    });

    console.log(`[Orchestrator] Initialized for session ${sessionId}`);
  }

  /**
   * 执行工具调用（核心方法）
   */
  async executeToolCall(
    toolCall: ToolCall,
    context: AgentContext
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const action: Action = {
      id: toolCall.id,
      type: 'tool_call',
      timestamp: startTime,
      params: { name: toolCall.name, arguments: toolCall.arguments },
      status: 'executing',
      retryCount: 0
    };

    // 添加到工作记忆
    if (this.config.enableMemory) {
      this.memoryManager.addPendingAction(action);
    }

    try {
      // 执行工具
      const result = await this.toolManager.executeTool(
        toolCall,
        context.mcpConfigs || [],
        context.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        this.config.toolConfig,
        { userId: context.userId, sessionId: context.sessionId }
      );

      // 更新动作状态
      action.status = result.success ? 'success' : 'failed';
      action.result = result;
      action.error = result.error;

      // 记录到短期记忆
      if (this.config.enableMemory) {
        this.memoryManager.addAction(action);
        this.memoryManager.removePendingAction(action.id);
        
        // 添加观察
        if (result.success) {
          this.memoryManager.addObservation({
            id: `obs-${Date.now()}`,
            type: 'system_event',
            timestamp: Date.now(),
            data: { tool: toolCall.name, result: result.data },
            importance: 0.6
          });
        }
      }

      // 记录监控指标
      if (this.config.enableMonitoring) {
        this.monitor.recordAction(action, result);
      }

      // 记录到数据库
      if (this.config.enableLogging && context.userId) {
        await logAgentExecution({
          user_id: context.userId,
          session_id: this.sessionId,
          action_type: toolCall.name,
          action_params: JSON.stringify(toolCall.arguments),
          result: result.success ? JSON.stringify(result.data) : undefined,
          status: result.success ? 'success' : 'failed',
          execution_time: result.executionTime,
          error_message: result.error
        }).catch(err => {
          console.error('[Orchestrator] Failed to log execution:', err);
        });
      }

      return result;

    } catch (error) {
      const errorMessage = (error as Error).message;
      
      action.status = 'failed';
      action.error = errorMessage;

      // 记录失败
      if (this.config.enableMemory) {
        this.memoryManager.addAction(action);
        this.memoryManager.removePendingAction(action.id);
      }

      const failedResult: ToolResult = {
        id: toolCall.id,
        success: false,
        error: errorMessage,
        executionTime: Date.now() - startTime
      };

      if (this.config.enableMonitoring) {
        this.monitor.recordAction(action, failedResult);
      }

      if (this.config.enableLogging && context.userId) {
        await logAgentExecution({
          user_id: context.userId,
          session_id: this.sessionId,
          action_type: toolCall.name,
          action_params: JSON.stringify(toolCall.arguments),
          status: 'failed',
          execution_time: Date.now() - startTime,
          error_message: errorMessage
        }).catch(err => {
          console.error('[Orchestrator] Failed to log execution:', err);
        });
      }

      throw error;
    }
  }

  /**
   * 设置当前目标
   */
  setGoal(goal: string): void {
    if (this.config.enableMemory) {
      this.memoryManager.setCurrentGoal(goal);
    }
  }

  /**
   * 添加子目标
   */
  addSubGoal(subGoal: string): void {
    if (this.config.enableMemory) {
      this.memoryManager.addSubGoal(subGoal);
    }
  }

  /**
   * 标记步骤完成
   */
  completeStep(step: string): void {
    if (this.config.enableMemory) {
      this.memoryManager.completeStep(step);
    }
  }

  /**
   * 添加观察
   */
  addObservation(observation: Observation): void {
    if (this.config.enableMemory) {
      this.memoryManager.addObservation(observation);
    }
  }

  /**
   * 获取记忆摘要（用于注入到 prompt）
   */
  getMemorySummary(): string {
    if (!this.config.enableMemory) {
      return '';
    }
    return this.memoryManager.generateMemorySummary();
  }

  /**
   * 获取性能指标
   */
  getMetrics() {
    if (!this.config.enableMonitoring) {
      return null;
    }
    return this.monitor.getDetailedStats();
  }

  /**
   * 获取工具统计
   */
  getToolStats() {
    return this.toolManager.getToolStats();
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    if (!this.config.enableMonitoring) {
      return 'Monitoring is disabled';
    }
    return this.monitor.generateReport();
  }

  /**
   * 清理会话（会话结束时调用）
   */
  cleanup(): void {
    if (this.config.enableMemory) {
      this.memoryManager.clearWorkingMemory();
    }
    console.log(`[Orchestrator] Cleaned up session ${this.sessionId}`);
  }

  /**
   * 重置所有状态
   */
  reset(): void {
    if (this.config.enableMemory) {
      this.memoryManager.reset();
    }
    if (this.config.enableMonitoring) {
      this.monitor.reset();
    }
    this.toolManager.clearLogs();
    console.log(`[Orchestrator] Reset all state for session ${this.sessionId}`);
  }

  /**
   * 获取记忆管理器（用于高级操作）
   */
  getMemoryManager(): MemoryManager {
    return this.memoryManager;
  }

  /**
   * 获取监控器（用于高级操作）
   */
  getMonitor(): AgentMonitor {
    return this.monitor;
  }
}

/**
 * 创建编排器实例
 */
export function createOrchestrator(sessionId: string, config?: Partial<OrchestratorConfig>): AgentOrchestrator {
  return new AgentOrchestrator(sessionId, config);
}
