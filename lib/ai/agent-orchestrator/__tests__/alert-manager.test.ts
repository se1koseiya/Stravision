import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AlertManager } from '../alert-manager';
import { AgentMetrics } from '../types';

describe('AlertManager', () => {
  let alertManager: AlertManager;
  let mockMetrics: AgentMetrics;

  beforeEach(() => {
    alertManager = new AlertManager();
    mockMetrics = {
      totalActions: 100,
      successfulActions: 70,
      failedActions: 30,
      avgResponseTime: 1000,
      // 阈值是 > 0.3 严格大于，取 0.35 以稳定命中 high-error-rate
      errorRate: 0.35,
      toolUsageStats: {},
      recentActions: [],
    };
  });

  describe('规则检查', () => {
    it('应该检测到高错误率', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      alertManager.checkMetrics(mockMetrics);
      
      const alerts = alertManager.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      // 不依赖告警顺序：多条规则可能同时命中（如失败次数与错误率）
      const hit = alerts.find(a => a.ruleId === 'high-error-rate');
      expect(hit).toBeDefined();
      expect(hit!.severity).toBe('error');
      
      consoleSpy.mockRestore();
    });

    it('应该检测到极高错误率', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      mockMetrics.errorRate = 0.6;
      alertManager.checkMetrics(mockMetrics);
      
      const alerts = alertManager.getAlerts({ severity: 'critical' });
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].ruleId).toBe('very-high-error-rate');
      
      consoleSpy.mockRestore();
    });

    it('应该检测到响应缓慢', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      mockMetrics.avgResponseTime = 6000;
      mockMetrics.errorRate = 0.1; // 降低错误率避免触发其他告警
      alertManager.checkMetrics(mockMetrics);
      
      const alerts = alertManager.getAlerts({ severity: 'warning' });
      expect(alerts.length).toBeGreaterThan(0);
      // 不依赖告警顺序：失败次数等规则可能先于 slow-response 命中
      expect(alerts.some(a => a.ruleId === 'slow-response')).toBe(true);
      
      consoleSpy.mockRestore();
    });

    it('应该检测到响应极慢', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      mockMetrics.avgResponseTime = 12000;
      mockMetrics.errorRate = 0.1;
      alertManager.checkMetrics(mockMetrics);
      
      const alerts = alertManager.getAlerts({ severity: 'error' });
      const slowResponseAlerts = alerts.filter(a => a.ruleId === 'very-slow-response');
      expect(slowResponseAlerts.length).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });
  });

  describe('冷却时间', () => {
    it('应该遵守冷却时间', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // 第一次触发
      alertManager.checkMetrics(mockMetrics);
      const firstAlerts = alertManager.getAlerts();
      const firstCount = firstAlerts.length;
      
      // 立即再次检查（应该被冷却时间阻止）
      alertManager.checkMetrics(mockMetrics);
      const secondAlerts = alertManager.getAlerts();
      
      // 告警数量应该相同（没有新增）
      expect(secondAlerts.length).toBe(firstCount);
      
      consoleSpy.mockRestore();
    });
  });

  describe('告警管理', () => {
    it('应该能够确认告警', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      alertManager.checkMetrics(mockMetrics);
      const alerts = alertManager.getAlerts();
      const alertId = alerts[0].id;
      
      alertManager.acknowledgeAlert(alertId);
      
      const acknowledgedAlerts = alertManager.getAlerts({ acknowledged: true });
      expect(acknowledgedAlerts.length).toBeGreaterThan(0);
      expect(acknowledgedAlerts[0].id).toBe(alertId);
      
      consoleSpy.mockRestore();
    });

    it('应该能够清除所有告警', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      alertManager.checkMetrics(mockMetrics);
      expect(alertManager.getAlerts().length).toBeGreaterThan(0);
      
      alertManager.clearAlerts();
      expect(alertManager.getAlerts().length).toBe(0);
      
      consoleSpy.mockRestore();
    });

    it('应该能够按严重程度过滤', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      mockMetrics.errorRate = 0.6; // 触发 critical
      mockMetrics.avgResponseTime = 6000; // 触发 warning
      alertManager.checkMetrics(mockMetrics);
      
      const criticalAlerts = alertManager.getAlerts({ severity: 'critical' });
      const warningAlerts = alertManager.getAlerts({ severity: 'warning' });
      
      expect(criticalAlerts.length).toBeGreaterThan(0);
      expect(warningAlerts.length).toBeGreaterThan(0);
      expect(criticalAlerts[0].severity).toBe('critical');
      expect(warningAlerts[0].severity).toBe('warning');
      
      consoleSpy.mockRestore();
    });
  });

  describe('统计信息', () => {
    it('应该返回正确的统计信息', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      mockMetrics.errorRate = 0.6; // critical
      mockMetrics.avgResponseTime = 6000; // warning
      alertManager.checkMetrics(mockMetrics);
      
      const stats = alertManager.getStats();
      
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byLevel.critical).toBeGreaterThan(0);
      expect(stats.byLevel.warning).toBeGreaterThan(0);
      expect(stats.unacknowledged).toBe(stats.total);
      
      consoleSpy.mockRestore();
    });
  });

  describe('自定义规则', () => {
    it('应该能够添加自定义规则', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      alertManager.addRule({
        id: 'custom-rule',
        name: '自定义规则',
        description: '测试规则',
        condition: (metrics) => metrics.totalActions > 50,
        severity: 'info',
        enabled: true,
        cooldown: 1000,
      });
      
      mockMetrics.totalActions = 100;
      mockMetrics.errorRate = 0.1; // 降低错误率
      alertManager.checkMetrics(mockMetrics);
      
      const alerts = alertManager.getAlerts();
      const customAlert = alerts.find(a => a.ruleId === 'custom-rule');
      expect(customAlert).toBeDefined();
      
      consoleSpy.mockRestore();
    });

    it('应该能够禁用规则', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      alertManager.updateRule('high-error-rate', { enabled: false });
      
      mockMetrics.errorRate = 0.5;
      alertManager.checkMetrics(mockMetrics);
      
      const alerts = alertManager.getAlerts();
      const highErrorAlert = alerts.find(a => a.ruleId === 'high-error-rate');
      expect(highErrorAlert).toBeUndefined();
      
      consoleSpy.mockRestore();
    });
  });
});
