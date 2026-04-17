/**
 * Agent 监控系统
 * 
 * 负责：
 * - 实时性能指标收集
 * - 异常检测和告警
 * - 执行统计分析
 */

import { AgentMetrics, Action, ToolResult } from './types';
import { getGlobalAlertManager } from './alert-manager';

export interface MonitorConfig {
  enableAnomalyDetection: boolean;
  errorRateThreshold: number; // 错误率阈值
  responseTimeThreshold: number; // 响应时间阈值（毫秒）
  onAlert?: (alert: Alert) => void;
}

export interface Alert {
  type: 'high_error_rate' | 'slow_response' | 'tool_failure' | 'memory_leak';
  severity: 'warning' | 'error' | 'critical';
  message: string;
  data: any;
  timestamp: number;
}

export const DEFAULT_MONITOR_CONFIG: MonitorConfig = {
  enableAnomalyDetection: true,
  errorRateThreshold: 0.3,
  responseTimeThreshold: 5000
};

export class AgentMonitor {
  private metrics: AgentMetrics;
  private config: MonitorConfig;
  private responseTimes: number[] = [];
  private readonly MAX_RESPONSE_TIMES = 100;

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = { ...DEFAULT_MONITOR_CONFIG, ...config };
    this.metrics = {
      totalActions: 0,
      successfulActions: 0,
      failedActions: 0,
      avgResponseTime: 0,
      toolUsageStats: {},
      errorRate: 0,
      recentActions: [],
    };
  }

  /**
   * 记录动作执行
   */
  recordAction(action: Action, result: ToolResult): void {
    this.metrics.totalActions++;

    // 更新成功/失败计数
    if (result.success) {
      this.metrics.successfulActions++;
    } else {
      this.metrics.failedActions++;
    }

    // 更新响应时间
    this.updateResponseTime(result.executionTime);

    // 更新工具使用统计
    this.updateToolStats(action.type);

    // 计算错误率
    this.metrics.errorRate = this.metrics.failedActions / this.metrics.totalActions;

    // 记录最近的动作
    if (!this.metrics.recentActions) {
      this.metrics.recentActions = [];
    }
    this.metrics.recentActions.push({
      timestamp: Date.now(),
      type: action.type,
      status: result.success ? 'success' : 'failed',
      executionTime: result.executionTime,
    });
    // 只保留最近100个动作
    if (this.metrics.recentActions.length > 100) {
      this.metrics.recentActions = this.metrics.recentActions.slice(-100);
    }

    // 异常检测
    if (this.config.enableAnomalyDetection) {
      this.checkAnomalies(action, result);
    }

    // 使用告警管理器检查指标
    const alertManager = getGlobalAlertManager();
    alertManager.checkMetrics(this.metrics);

    console.log(`[AgentMonitor] Recorded action: ${action.type}, success: ${result.success}, time: ${result.executionTime}ms`);
  }

  /**
   * 更新响应时间
   */
  private updateResponseTime(time: number): void {
    this.responseTimes.push(time);

    // 保持滑动窗口
    if (this.responseTimes.length > this.MAX_RESPONSE_TIMES) {
      this.responseTimes.shift();
    }

    // 计算平均响应时间
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    this.metrics.avgResponseTime = Math.round(sum / this.responseTimes.length);
  }

  /**
   * 更新工具使用统计
   */
  private updateToolStats(toolType: string): void {
    if (!this.metrics.toolUsageStats[toolType]) {
      this.metrics.toolUsageStats[toolType] = 0;
    }
    this.metrics.toolUsageStats[toolType]++;
  }

  /**
   * 异常检测
   */
  private checkAnomalies(action: Action, result: ToolResult): void {
    // 检查错误率
    if (this.metrics.errorRate > this.config.errorRateThreshold) {
      this.alert({
        type: 'high_error_rate',
        severity: 'error',
        message: `High error rate detected: ${(this.metrics.errorRate * 100).toFixed(1)}%`,
        data: {
          errorRate: this.metrics.errorRate,
          threshold: this.config.errorRateThreshold,
          totalActions: this.metrics.totalActions,
          failedActions: this.metrics.failedActions
        },
        timestamp: Date.now()
      });
    }

    // 检查响应时间
    if (this.metrics.avgResponseTime > this.config.responseTimeThreshold) {
      this.alert({
        type: 'slow_response',
        severity: 'warning',
        message: `Slow response time detected: ${this.metrics.avgResponseTime}ms`,
        data: {
          avgResponseTime: this.metrics.avgResponseTime,
          threshold: this.config.responseTimeThreshold
        },
        timestamp: Date.now()
      });
    }

    // 检查单个工具失败
    if (!result.success && action.retryCount >= 2) {
      this.alert({
        type: 'tool_failure',
        severity: 'error',
        message: `Tool ${action.type} failed after ${action.retryCount} retries`,
        data: {
          action,
          result,
          error: result.error
        },
        timestamp: Date.now()
      });
    }
  }

  /**
   * 发送告警
   */
  private alert(alert: Alert): void {
    console.warn(`[AgentMonitor] ALERT [${alert.severity}] ${alert.type}: ${alert.message}`);
    
    if (this.config.onAlert) {
      this.config.onAlert(alert);
    }
  }

  /**
   * 获取当前指标
   */
  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取详细统计
   */
  getDetailedStats(): {
    metrics: AgentMetrics;
    successRate: number;
    recentResponseTimes: number[];
    topTools: Array<{ tool: string; count: number }>;
  } {
    const successRate = this.metrics.totalActions > 0
      ? this.metrics.successfulActions / this.metrics.totalActions
      : 0;

    const topTools = Object.entries(this.metrics.toolUsageStats)
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      metrics: this.getMetrics(),
      successRate,
      recentResponseTimes: [...this.responseTimes],
      topTools
    };
  }

  /**
   * 重置指标
   */
  reset(): void {
    this.metrics = {
      totalActions: 0,
      successfulActions: 0,
      failedActions: 0,
      avgResponseTime: 0,
      toolUsageStats: {},
      errorRate: 0,
      recentActions: [],
    };
    this.responseTimes = [];
    console.log('[AgentMonitor] Reset metrics');
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const stats = this.getDetailedStats();
    const report: string[] = [];

    report.push('# Agent Performance Report');
    report.push(`\nGenerated at: ${new Date().toLocaleString()}`);
    report.push('\n## Overall Metrics');
    report.push(`- Total Actions: ${stats.metrics.totalActions}`);
    report.push(`- Successful: ${stats.metrics.successfulActions}`);
    report.push(`- Failed: ${stats.metrics.failedActions}`);
    report.push(`- Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
    report.push(`- Error Rate: ${(stats.metrics.errorRate * 100).toFixed(1)}%`);
    report.push(`- Avg Response Time: ${stats.metrics.avgResponseTime}ms`);

    if (stats.topTools.length > 0) {
      report.push('\n## Top Tools');
      stats.topTools.forEach((tool, i) => {
        report.push(`${i + 1}. ${tool.tool}: ${tool.count} times`);
      });
    }

    return report.join('\n');
  }
}

// 导出工厂函数
export function createAgentMonitor(config?: Partial<MonitorConfig>): AgentMonitor {
  return new AgentMonitor(config);
}
