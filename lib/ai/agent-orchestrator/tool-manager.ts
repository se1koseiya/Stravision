/**
 * 工具管理器
 * 
 * 负责：
 * - 统一的工具调用接口
 * - 自动重试机制（指数退避）
 * - 超时控制
 * - 错误处理和恢复
 * - 执行日志记录
 */

import { ToolCall, ToolResult, Action } from './types';
import { executeMCPToolCall, type AgentToolContext } from '@/lib/mcp/mcp-tool-executor';
// 超时 / 重试 / 禁重试集合的唯一来源（lib/ai/agent-budget.ts）
import {
  TOOL_DEFAULT_TIMEOUT_MS,
  TOOL_MAX_RETRIES,
  TOOL_RETRY_DELAY_MS,
  TOOL_TIMEOUT_OVERRIDES,
  NO_RETRY_TOOLS,
} from '../agent-budget';

export interface ToolExecutionConfig {
  maxRetries: number;
  retryDelay: number; // 初始延迟（毫秒）
  timeout: number; // 超时时间（毫秒）
  enableLogging: boolean;
}

export const DEFAULT_TOOL_CONFIG: ToolExecutionConfig = {
  maxRetries: TOOL_MAX_RETRIES,
  retryDelay: TOOL_RETRY_DELAY_MS,
  timeout: TOOL_DEFAULT_TIMEOUT_MS,
  enableLogging: true
};

/**
 * 获取工具的超时时间（优先使用 override，否则用传入 config，最后用默认值）
 */
function getToolTimeout(toolName: string, configTimeout: number): number {
  return TOOL_TIMEOUT_OVERRIDES[toolName] ?? configTimeout;
}

interface ExecutionLog {
  toolCall: ToolCall;
  result?: ToolResult;
  error?: Error;
  attempt: number;
  executionTime: number;
  status: 'success' | 'failed' | 'timeout';
  timestamp: number;
}

export class ToolManager {
  private executionLogs: ExecutionLog[] = [];
  private readonly MAX_LOGS = 100;

  /**
   * 执行工具调用（带重试和超时控制）
   */
  async executeTool(
    toolCall: ToolCall,
    mcpConfigs: any[],
    appUrl: string,
    config: Partial<ToolExecutionConfig> = {},
    agentContext?: AgentToolContext
  ): Promise<ToolResult> {
    const finalConfig = { ...DEFAULT_TOOL_CONFIG, ...config };
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        console.log(`[ToolManager] Executing ${toolCall.name}, attempt ${attempt + 1}/${finalConfig.maxRetries + 1}`);

        // 执行工具（带超时控制，设备控制类工具有自定义超时覆盖）
        const result = await this.executeWithTimeout(
          toolCall,
          mcpConfigs,
          appUrl,
          getToolTimeout(toolCall.name, finalConfig.timeout),
          agentContext
        );

        if (result.success) {
          // 记录成功
          if (finalConfig.enableLogging) {
            this.logExecution({
              toolCall,
              result,
              attempt,
              executionTime: Date.now() - startTime,
              status: 'success',
              timestamp: Date.now()
            });
          }

          console.log(`[ToolManager] Tool ${toolCall.name} executed successfully`);
          return result;
        }

        // 工具级失败：executeToolInternal 已把异常收敛成 success:false，
        // 若不在此再判一次，重试机制就只对超时生效，对工具内部错误完全失效。
        const toolError = new Error(result.error || 'Unknown tool error');

        if (!this.shouldRetry(toolError, attempt, finalConfig.maxRetries, toolCall.name)) {
          console.log(`[ToolManager] Not retrying ${toolCall.name}`);
          if (finalConfig.enableLogging) {
            this.logExecution({
              toolCall,
              result,
              error: toolError,
              attempt,
              executionTime: Date.now() - startTime,
              status: 'failed',
              timestamp: Date.now()
            });
          }
          return result;
        }

        lastError = toolError;

        // 指数退避
        if (attempt < finalConfig.maxRetries) {
          const delay = finalConfig.retryDelay * Math.pow(2, attempt);
          console.log(`[ToolManager] Retrying ${toolCall.name} after ${delay}ms`);
          await this.sleep(delay);
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`[ToolManager] Tool ${toolCall.name} failed on attempt ${attempt + 1}:`, error);

        // 判断是否应该重试
        if (!this.shouldRetry(error as Error, attempt, finalConfig.maxRetries, toolCall.name)) {
          console.log(`[ToolManager] Not retrying ${toolCall.name}`);
          break;
        }

        // 指数退避
        if (attempt < finalConfig.maxRetries) {
          const delay = finalConfig.retryDelay * Math.pow(2, attempt);
          console.log(`[ToolManager] Retrying ${toolCall.name} after ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    // 所有重试都失败
    const executionTime = Date.now() - startTime;
    
    if (finalConfig.enableLogging) {
      this.logExecution({
        toolCall,
        error: lastError!,
        attempt: finalConfig.maxRetries,
        executionTime,
        status: 'failed',
        timestamp: Date.now()
      });
    }

    console.error(`[ToolManager] Tool ${toolCall.name} failed after ${finalConfig.maxRetries + 1} attempts`);
    
    throw new Error(`Tool execution failed: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * 带超时的工具执行
   */
  private async executeWithTimeout(
    toolCall: ToolCall,
    mcpConfigs: any[],
    appUrl: string,
    timeout: number,
    agentContext?: AgentToolContext
  ): Promise<ToolResult> {
    const timer = this.createTimeoutController(timeout, toolCall.name);
    try {
      return await Promise.race([
        this.executeToolInternal(toolCall, mcpConfigs, appUrl, agentContext),
        timer.promise
      ]);
    } finally {
      // 竞态结束后必须清理定时器：否则倒计时到点仍会 reject，
      // 而此时已无人监听该 promise，产生 unhandled rejection（可直接打挂 Node 进程）
      timer.cancel();
    }
  }

  /**
   * 实际执行工具
   */
  private async executeToolInternal(
    toolCall: ToolCall,
    mcpConfigs: any[],
    appUrl: string,
    agentContext?: AgentToolContext
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const result = await executeMCPToolCall(
        toolCall.name,
        toolCall.arguments,
        mcpConfigs,
        appUrl,
        agentContext
      );

      return {
        id: toolCall.id,
        success: result.success,
        data: result.data,
        error: result.error,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        id: toolCall.id,
        success: false,
        error: (error as Error).message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 创建可取消的超时 Promise
   *
   * 返回 promise + cancel 句柄：调用方必须在竞态结束后 cancel，
   * 否则定时器会持续持有闭包并可能在无人监听时 reject。
   */
  private createTimeoutController(timeout: number, toolName: string): { promise: Promise<never>; cancel: () => void } {
    let handle: ReturnType<typeof setTimeout>;
    const promise = new Promise<never>((_, reject) => {
      handle = setTimeout(() => {
        reject(new Error(`Tool ${toolName} execution timeout after ${timeout}ms`));
      }, timeout);
    });
    // 预先挂载空 catch：竞态胜出后本 promise 的 rejection 不会变成 unhandled rejection
    promise.catch(() => {});
    return {
      promise,
      cancel: () => { if (handle) clearTimeout(handle); }
    };
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: Error, attempt: number, maxRetries: number, toolName?: string): boolean {
    // 已达到最大重试次数
    if (attempt >= maxRetries) {
      return false;
    }

    // 设备控制类工具禁止重试（避免重复发送 MQTT 指令）
    if (toolName && NO_RETRY_TOOLS.has(toolName)) {
      return false;
    }

    const errorMessage = error.message.toLowerCase();

    // 网络错误、超时错误可以重试
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('enotfound') ||
      errorMessage.includes('fetch failed')
    ) {
      return true;
    }

    // 服务器错误（5xx）可以重试
    if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
      return true;
    }

    // 参数错误、权限错误不重试
    // 注意必须同时匹配中文：工具返回的错误消息以中文为主，
    // 若只判英文关键词，中文参数错误会全部落到「默认重试一次」，白白多打一次调用。
    if (
      errorMessage.includes('invalid') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('400') ||
      errorMessage.includes('401') ||
      errorMessage.includes('403') ||
      /参数|无效|缺少|必须|不支持|未安装|未启用|未配置|未知|权限|未授权|格式错误/.test(errorMessage)
    ) {
      return false;
    }

    // 其他错误默认重试一次
    return attempt < 1;
  }

  /**
   * 记录执行日志
   */
  private logExecution(log: ExecutionLog): void {
    this.executionLogs.push(log);

    // 限制日志数量
    if (this.executionLogs.length > this.MAX_LOGS) {
      this.executionLogs.shift();
    }
  }

  /**
   * 获取执行日志
   */
  getExecutionLogs(limit?: number): ExecutionLog[] {
    if (limit) {
      return this.executionLogs.slice(-limit);
    }
    return [...this.executionLogs];
  }

  /**
   * 获取工具统计信息
   */
  getToolStats(): Record<string, { total: number; success: number; failed: number; avgTime: number }> {
    const stats: Record<string, { total: number; success: number; failed: number; totalTime: number }> = {};

    for (const log of this.executionLogs) {
      const toolName = log.toolCall.name;
      
      if (!stats[toolName]) {
        stats[toolName] = { total: 0, success: 0, failed: 0, totalTime: 0 };
      }

      stats[toolName].total++;
      stats[toolName].totalTime += log.executionTime;

      if (log.status === 'success') {
        stats[toolName].success++;
      } else {
        stats[toolName].failed++;
      }
    }

    // 计算平均时间
    const result: Record<string, { total: number; success: number; failed: number; avgTime: number }> = {};
    for (const [toolName, stat] of Object.entries(stats)) {
      result[toolName] = {
        total: stat.total,
        success: stat.success,
        failed: stat.failed,
        avgTime: Math.round(stat.totalTime / stat.total)
      };
    }

    return result;
  }

  /**
   * 清除日志
   */
  clearLogs(): void {
    this.executionLogs = [];
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出单例
export const toolManager = new ToolManager();
