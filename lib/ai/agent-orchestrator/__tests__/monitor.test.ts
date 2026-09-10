import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AgentMonitor } from '../monitor';
import { Action, ToolResult } from '../types';

describe('AgentMonitor', () => {
  let monitor: AgentMonitor;
  let mockAction: Action;
  let mockResult: ToolResult;

  beforeEach(() => {
    monitor = new AgentMonitor({
      enableAnomalyDetection: true,
      errorRateThreshold: 0.3,
      responseTimeThreshold: 5000,
    });

    mockAction = {
      id: 'action-1',
      type: 'tool_call',
      timestamp: Date.now(),
      params: {},
      status: 'success',
      retryCount: 0,
    };

    mockResult = {
      id: 'result-1',
      success: true,
      data: {},
      executionTime: 1000,
    };
  });

  describe('指标记录', () => {
    it('应该记录成功的动作', () => {
      monitor.recordAction(mockAction, mockResult);
      
      const metrics = monitor.getMetrics();
      expect(metrics.totalActions).toBe(1);
      expect(metrics.successfulActions).toBe(1);
      expect(metrics.failedActions).toBe(0);
      expect(metrics.errorRate).toBe(0);
    });

    it('应该记录失败的动作', () => {
      mockResult.success = false;
      mockResult.error = 'Test error';
      
      monitor.recordAction(mockAction, mockResult);
      
      const metrics = monitor.getMetrics();
      expect(metrics.totalActions).toBe(1);
      expect(metrics.successfulActions).toBe(0);
      expect(metrics.failedActions).toBe(1);
      expect(metrics.errorRate).toBe(1);
    });

    it('应该更新平均响应时间', () => {
      mockResult.executionTime = 1000;
      monitor.recordAction(mockAction, mockResult);
      
      mockResult.executionTime = 2000;
      monitor.recordAction(mockAction, mockResult);
      
      const metrics = monitor.getMetrics();
      expect(metrics.avgResponseTime).toBe(1500);
    });

    it('应该更新工具使用统计', () => {
      mockAction.type = 'tool_call';
      monitor.recordAction(mockAction, mockResult);
      monitor.recordAction(mockAction, mockResult);
      
      mockAction.type = 'device_control';
      monitor.recordAction(mockAction, mockResult);
      
      const metrics = monitor.getMetrics();
      expect(metrics.toolUsageStats['tool_call']).toBe(2);
      expect(metrics.toolUsageStats['device_control']).toBe(1);
    });

    it('应该记录最近的动作', () => {
      monitor.recordAction(mockAction, mockResult);
      
      const metrics = monitor.getMetrics();
      expect(metrics.recentActions).toBeDefined();
      expect(metrics.recentActions!.length).toBe(1);
      expect(metrics.recentActions![0].type).toBe('tool_call');
      expect(metrics.recentActions![0].status).toBe('success');
    });

    it('应该限制最近动作的数量', () => {
      // 记录101个动作
      for (let i = 0; i < 101; i++) {
        monitor.recordAction(mockAction, mockResult);
      }
      
      const metrics = monitor.getMetrics();
      expect(metrics.recentActions!.length).toBe(100);
    });
  });

  describe('异常检测', () => {
    it('应该检测高错误率', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // 记录10个动作，其中4个失败（40%错误率）
      for (let i = 0; i < 6; i++) {
        monitor.recordAction(mockAction, mockResult);
      }
      
      mockResult.success = false;
      for (let i = 0; i < 4; i++) {
        monitor.recordAction(mockAction, mockResult);
      }
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('high_error_rate')
      );
      
      consoleSpy.mockRestore();
    });

    it('应该检测响应缓慢', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockResult.executionTime = 6000;
      monitor.recordAction(mockAction, mockResult);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('slow_response')
      );
      
      consoleSpy.mockRestore();
    });

    it('应该检测工具失败', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockAction.retryCount = 3;
      mockResult.success = false;
      mockResult.error = 'Tool failed';
      
      monitor.recordAction(mockAction, mockResult);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('tool_failure')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('详细统计', () => {
    it('应该返回详细统计信息', () => {
      mockAction.type = 'tool_call';
      monitor.recordAction(mockAction, mockResult);
      monitor.recordAction(mockAction, mockResult);
      
      mockAction.type = 'device_control';
      monitor.recordAction(mockAction, mockResult);
      
      const stats = monitor.getDetailedStats();
      
      expect(stats.metrics.totalActions).toBe(3);
      expect(stats.successRate).toBe(1);
      expect(stats.topTools.length).toBe(2);
      expect(stats.topTools[0].tool).toBe('tool_call');
      expect(stats.topTools[0].count).toBe(2);
    });
  });

  describe('性能报告', () => {
    it('应该生成性能报告', () => {
      monitor.recordAction(mockAction, mockResult);
      
      mockResult.success = false;
      monitor.recordAction(mockAction, mockResult);
      
      const report = monitor.generateReport();
      
      expect(report).toContain('Agent Performance Report');
      expect(report).toContain('Total Actions: 2');
      expect(report).toContain('Successful: 1');
      expect(report).toContain('Failed: 1');
      expect(report).toContain('Success Rate: 50.0%');
    });
  });

  describe('重置', () => {
    it('应该重置所有指标', () => {
      monitor.recordAction(mockAction, mockResult);
      
      let metrics = monitor.getMetrics();
      expect(metrics.totalActions).toBe(1);
      
      monitor.reset();
      
      metrics = monitor.getMetrics();
      expect(metrics.totalActions).toBe(0);
      expect(metrics.successfulActions).toBe(0);
      expect(metrics.failedActions).toBe(0);
      expect(metrics.avgResponseTime).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(Object.keys(metrics.toolUsageStats).length).toBe(0);
    });
  });
});
