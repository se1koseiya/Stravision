/**
 * 全局 Agent 编排器管理器
 * 
 * 用于跟踪和管理所有活跃的 Agent 会话，聚合性能指标
 */

import { AgentOrchestrator } from './orchestrator';
import type { AgentMetrics } from './types';

class GlobalOrchestratorManager {
  private orchestrators = new Map<string, AgentOrchestrator>();
  private metricsHistory: Array<AgentMetrics & { timestamp: number }> = [];
  private readonly MAX_HISTORY = 100; // 保留最近100条记录

  /**
   * 注册一个编排器实例
   */
  register(sessionId: string, orchestrator: AgentOrchestrator) {
    this.orchestrators.set(sessionId, orchestrator);
    console.log(`[GlobalManager] Registered orchestrator: ${sessionId}, total: ${this.orchestrators.size}`);
  }

  /**
   * 注销一个编排器实例
   */
  unregister(sessionId: string) {
    const orchestrator = this.orchestrators.get(sessionId);
    if (orchestrator) {
      // 在注销前保存最后的指标
      const metrics = orchestrator.getMetrics();
      this.saveMetricsSnapshot(metrics);
      
      this.orchestrators.delete(sessionId);
      console.log(`[GlobalManager] Unregistered orchestrator: ${sessionId}, remaining: ${this.orchestrators.size}`);
    }
  }

  /**
   * 获取指定会话的编排器
   */
  get(sessionId: string): AgentOrchestrator | undefined {
    return this.orchestrators.get(sessionId);
  }

  /**
   * 获取所有活跃的编排器
   */
  getAll(): AgentOrchestrator[] {
    return Array.from(this.orchestrators.values());
  }

  /**
   * 获取活跃会话数量
   */
  getActiveCount(): number {
    return this.orchestrators.size;
  }

  /**
   * 保存指标快照
   */
  private saveMetricsSnapshot(metrics: AgentMetrics) {
    this.metricsHistory.push({
      ...metrics,
      timestamp: Date.now()
    });

    // 限制历史记录数量
    if (this.metricsHistory.length > this.MAX_HISTORY) {
      this.metricsHistory = this.metricsHistory.slice(-this.MAX_HISTORY);
    }
  }

  /**
   * 获取聚合的指标数据
   */
  getAggregatedMetrics(): AgentMetrics {
    const activeOrchestrators = Array.from(this.orchestrators.values());
    
    // 如果有活跃的编排器，聚合它们的指标
    if (activeOrchestrators.length > 0) {
      return this.aggregateMetrics(
        activeOrchestrators.map(o => o.getMetrics())
      );
    }

    // 如果没有活跃的编排器，但有历史数据，返回最近的聚合数据
    if (this.metricsHistory.length > 0) {
      // 聚合最近10条历史记录
      const recentHistory = this.metricsHistory.slice(-10);
      return this.aggregateMetrics(recentHistory);
    }

    // 完全没有数据，返回空指标
    return this.getEmptyMetrics();
  }

  /**
   * 聚合多个指标
   */
  private aggregateMetrics(metricsList: AgentMetrics[]): AgentMetrics {
    if (metricsList.length === 0) {
      return this.getEmptyMetrics();
    }

    const aggregated: AgentMetrics = {
      totalActions: 0,
      successfulActions: 0,
      failedActions: 0,
      avgResponseTime: 0,
      errorRate: 0,
      toolUsageStats: {},
      recentActions: []
    };

    let totalResponseTime = 0;
    let responseTimeCount = 0;

    for (const metrics of metricsList) {
      aggregated.totalActions += metrics.totalActions || 0;
      aggregated.successfulActions += metrics.successfulActions || 0;
      aggregated.failedActions += metrics.failedActions || 0;

      // 聚合响应时间
      if (metrics.avgResponseTime && metrics.totalActions) {
        totalResponseTime += metrics.avgResponseTime * metrics.totalActions;
        responseTimeCount += metrics.totalActions;
      }

      // 聚合工具使用统计
      if (metrics.toolUsageStats) {
        for (const [tool, count] of Object.entries(metrics.toolUsageStats)) {
          aggregated.toolUsageStats[tool] = (aggregated.toolUsageStats[tool] || 0) + count;
        }
      }

      // 合并最近的操作
      if (metrics.recentActions) {
        aggregated.recentActions.push(...metrics.recentActions);
      }
    }

    // 计算平均响应时间
    aggregated.avgResponseTime = responseTimeCount > 0 
      ? totalResponseTime / responseTimeCount 
      : 0;

    // 计算错误率
    aggregated.errorRate = aggregated.totalActions > 0
      ? aggregated.failedActions / aggregated.totalActions
      : 0;

    // 只保留最近的50个操作
    aggregated.recentActions = aggregated.recentActions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);

    return aggregated;
  }

  /**
   * 获取空指标
   */
  private getEmptyMetrics(): AgentMetrics {
    return {
      totalActions: 0,
      successfulActions: 0,
      failedActions: 0,
      avgResponseTime: 0,
      errorRate: 0,
      toolUsageStats: {},
      recentActions: []
    };
  }

  /**
   * 获取指标历史
   */
  getMetricsHistory(limit: number = 20): Array<AgentMetrics & { timestamp: number }> {
    return this.metricsHistory.slice(-limit);
  }

  /**
   * 清理所有编排器
   */
  cleanup() {
    for (const [sessionId, orchestrator] of this.orchestrators.entries()) {
      try {
        orchestrator.cleanup();
      } catch (error) {
        console.error(`[GlobalManager] Error cleaning up orchestrator ${sessionId}:`, error);
      }
    }
    this.orchestrators.clear();
    console.log('[GlobalManager] All orchestrators cleaned up');
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      activeOrchestrators: this.orchestrators.size,
      historyRecords: this.metricsHistory.length,
      totalSessions: this.metricsHistory.length + this.orchestrators.size
    };
  }
}

// 导出单例实例
export const globalOrchestratorManager = new GlobalOrchestratorManager();

// 在进程退出时清理
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    globalOrchestratorManager.cleanup();
  });
}
