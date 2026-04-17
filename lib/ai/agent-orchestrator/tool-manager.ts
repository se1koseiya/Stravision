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
import { executeMCPToolCall } from '@/lib/mcp/mcp-tool-executor';

export interface ToolExecutionConfig {
  maxRetries: number;
  retryDelay: number; // 初始延迟（毫秒）
  timeout: number; // 超时时间（毫秒）
  enableLogging: boolean;
}

export const DEFAULT_TOOL_CONFIG: ToolExecutionConfig = {
  maxRetries: 2,
  retryDelay: 1000,
  timeout: 60000,
  enableLogging: true
};

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
    config: Partial<ToolExecutionConfig> = {}
  ): Promise<ToolResult> {
    const finalConfig = { ...DEFAULT_TOOL_CONFIG, ...config };
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        console.log(`[ToolManager] Executing ${toolCall.name}, attempt ${attempt + 1}/${finalConfig.maxRetries + 1}`);

        // 执行工具（带超时控制）
        const result = await this.executeWithTimeout(
          toolCall,
          mcpConfigs,
          appUrl,
          finalConfig.timeout
        );

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

      } catch (error) {
        lastError = error as Error;
        console.warn(`[ToolManager] Tool ${toolCall.name} failed on attempt ${attempt + 1}:`, error);

        // 判断是否应该重试
        if (!this.shouldRetry(error as Error, attempt, finalConfig.maxRetries)) {
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
    timeout: number
  ): Promise<ToolResult> {
    return Promise.race([
      this.executeToolInternal(toolCall, mcpConfigs, appUrl),
      this.createTimeoutPromise(timeout, toolCall.name)
    ]);
  }

  /**
   * 实际执行工具
   */
  private async executeToolInternal(
    toolCall: ToolCall,
    mcpConfigs: any[],
    appUrl: string
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const result = await executeMCPToolCall(
        toolCall.name,
        toolCall.arguments,
        mcpConfigs,
        appUrl
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
   * 创建超时 Promise
   */
  private createTimeoutPromise(timeout: number, toolName: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Tool ${toolName} execution timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: Error, attempt: number, maxRetries: number): boolean {
    // 已达到最大重试次数
    if (attempt >= maxRetries) {
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
    if (
      errorMessage.includes('invalid') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('400') ||
      errorMessage.includes('401') ||
      errorMessage.includes('403')
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
