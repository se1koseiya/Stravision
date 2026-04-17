/**
 * Agent 告警管理器
 * 
 * 功能:
 * - 监控 Agent 性能指标
 * - 检测异常情况
 * - 发送告警通知
 * - 告警规则配置
 */

import { AgentMetrics } from './types';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: (metrics: AgentMetrics) => boolean;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  cooldown: number; // 冷却时间（毫秒）
  lastTriggered?: number;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  metrics: Partial<AgentMetrics>;
  timestamp: number;
  acknowledged: boolean;
}

export interface AlertNotification {
  type: 'email' | 'webhook' | 'console';
  config: any;
  enabled: boolean;
}

export class AlertManager {
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Alert[] = [];
  private notifications: AlertNotification[] = [];
  private maxAlerts = 100;

  constructor() {
    this.initializeDefaultRules();
    this.initializeDefaultNotifications();
  }

  /**
   * 初始化默认告警规则
   */
  private initializeDefaultRules() {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-error-rate',
        name: '高错误率',
        description: '错误率超过30%',
        condition: (metrics) => metrics.errorRate > 0.3,
        severity: 'error',
        enabled: true,
        cooldown: 5 * 60 * 1000, // 5分钟
      },
      {
        id: 'very-high-error-rate',
        name: '极高错误率',
        description: '错误率超过50%',
        condition: (metrics) => metrics.errorRate > 0.5,
        severity: 'critical',
        enabled: true,
        cooldown: 5 * 60 * 1000,
      },
      {
        id: 'slow-response',
        name: '响应缓慢',
        description: '平均响应时间超过5秒',
        condition: (metrics) => metrics.avgResponseTime > 5000,
        severity: 'warning',
        enabled: true,
        cooldown: 10 * 60 * 1000, // 10分钟
      },
      {
        id: 'very-slow-response',
        name: '响应极慢',
        description: '平均响应时间超过10秒',
        condition: (metrics) => metrics.avgResponseTime > 10000,
        severity: 'error',
        enabled: true,
        cooldown: 5 * 60 * 1000,
      },
      {
        id: 'high-failure-count',
        name: '失败次数过多',
        description: '最近失败次数超过10次',
        condition: (metrics) => metrics.failedActions > 10,
        severity: 'warning',
        enabled: true,
        cooldown: 15 * 60 * 1000, // 15分钟
      },
      {
        id: 'no-activity',
        name: '无活动',
        description: '长时间无任何活动',
        condition: (metrics) => {
          // 如果有最近的动作，检查最后一次动作的时间
          if (metrics.recentActions && metrics.recentActions.length > 0) {
            const lastAction = metrics.recentActions[metrics.recentActions.length - 1];
            const timeSinceLastAction = Date.now() - lastAction.timestamp;
            return timeSinceLastAction > 30 * 60 * 1000; // 30分钟
          }
          return false;
        },
        severity: 'info',
        enabled: true,
        cooldown: 60 * 60 * 1000, // 1小时
      },
    ];

    defaultRules.forEach(rule => this.rules.set(rule.id, rule));
  }

  /**
   * 初始化默认通知方式
   */
  private initializeDefaultNotifications() {
    this.notifications = [
      {
        type: 'console',
        config: {},
        enabled: true,
      },
      // 可以添加更多通知方式
      // {
      //   type: 'email',
      //   config: {
      //     to: 'admin@example.com',
      //     from: 'alerts@example.com',
      //   },
      //   enabled: false,
      // },
      // {
      //   type: 'webhook',
      //   config: {
      //     url: 'https://hooks.slack.com/services/...',
      //   },
      //   enabled: false,
      // },
    ];
  }

  /**
   * 检查指标并触发告警
   */
  checkMetrics(metrics: AgentMetrics) {
    const now = Date.now();

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // 检查冷却时间
      if (rule.lastTriggered && now - rule.lastTriggered < rule.cooldown) {
        continue;
      }

      // 检查条件
      try {
        if (rule.condition(metrics)) {
          this.triggerAlert(rule, metrics);
          rule.lastTriggered = now;
        }
      } catch (error) {
        console.error(`Error checking rule ${rule.id}:`, error);
      }
    }
  }

  /**
   * 触发告警
   */
  private triggerAlert(rule: AlertRule, metrics: AgentMetrics) {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: this.generateAlertMessage(rule, metrics),
      metrics: {
        totalActions: metrics.totalActions,
        successfulActions: metrics.successfulActions,
        failedActions: metrics.failedActions,
        avgResponseTime: metrics.avgResponseTime,
        errorRate: metrics.errorRate,
      },
      timestamp: Date.now(),
      acknowledged: false,
    };

    // 添加到告警列表
    this.alerts.unshift(alert);
    
    // 限制告警数量
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.maxAlerts);
    }

    // 发送通知
    this.sendNotifications(alert);
  }

  /**
   * 生成告警消息
   */
  private generateAlertMessage(rule: AlertRule, metrics: AgentMetrics): string {
    const messages: Record<string, string> = {
      'high-error-rate': `错误率达到 ${(metrics.errorRate * 100).toFixed(1)}%，超过30%阈值`,
      'very-high-error-rate': `错误率达到 ${(metrics.errorRate * 100).toFixed(1)}%，超过50%阈值`,
      'slow-response': `平均响应时间 ${metrics.avgResponseTime.toFixed(0)}ms，超过5秒阈值`,
      'very-slow-response': `平均响应时间 ${metrics.avgResponseTime.toFixed(0)}ms，超过10秒阈值`,
      'high-failure-count': `失败次数 ${metrics.failedActions}，超过10次阈值`,
      'no-activity': `超过30分钟无任何活动`,
    };

    return messages[rule.id] || rule.description;
  }

  /**
   * 发送通知
   */
  private async sendNotifications(alert: Alert) {
    for (const notification of this.notifications) {
      if (!notification.enabled) continue;

      try {
        switch (notification.type) {
          case 'console':
            this.sendConsoleNotification(alert);
            break;
          case 'email':
            await this.sendEmailNotification(alert, notification.config);
            break;
          case 'webhook':
            await this.sendWebhookNotification(alert, notification.config);
            break;
        }
      } catch (error) {
        console.error(`Failed to send ${notification.type} notification:`, error);
      }
    }
  }

  /**
   * 控制台通知
   */
  private sendConsoleNotification(alert: Alert) {
    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨',
    };

    console.log(`\n${emoji[alert.severity]} Agent Alert [${alert.severity.toUpperCase()}]`);
    console.log(`Rule: ${alert.ruleName}`);
    console.log(`Message: ${alert.message}`);
    console.log(`Time: ${new Date(alert.timestamp).toLocaleString('zh-CN')}`);
    console.log(`Metrics:`, alert.metrics);
    console.log('');
  }

  /**
   * 邮件通知（待实现）
   */
  private async sendEmailNotification(alert: Alert, config: any) {
    // TODO: 实现邮件发送
    console.log('Email notification not implemented yet');
  }

  /**
   * Webhook 通知（待实现）
   */
  private async sendWebhookNotification(alert: Alert, config: any) {
    // TODO: 实现 Webhook 调用
    console.log('Webhook notification not implemented yet');
  }

  /**
   * 获取所有告警
   */
  getAlerts(options?: {
    severity?: Alert['severity'];
    acknowledged?: boolean;
    limit?: number;
  }): Alert[] {
    let filtered = [...this.alerts];

    if (options?.severity) {
      filtered = filtered.filter(a => a.severity === options.severity);
    }

    if (options?.acknowledged !== undefined) {
      filtered = filtered.filter(a => a.acknowledged === options.acknowledged);
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  /**
   * 清除所有告警
   */
  clearAlerts() {
    this.alerts = [];
  }

  /**
   * 添加自定义规则
   */
  addRule(rule: AlertRule) {
    this.rules.set(rule.id, rule);
  }

  /**
   * 移除规则
   */
  removeRule(ruleId: string) {
    this.rules.delete(ruleId);
  }

  /**
   * 更新规则
   */
  updateRule(ruleId: string, updates: Partial<AlertRule>) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
    }
  }

  /**
   * 获取所有规则
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 添加通知方式
   */
  addNotification(notification: AlertNotification) {
    this.notifications.push(notification);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const total = this.alerts.length;
    const byLevel = {
      info: this.alerts.filter(a => a.severity === 'info').length,
      warning: this.alerts.filter(a => a.severity === 'warning').length,
      error: this.alerts.filter(a => a.severity === 'error').length,
      critical: this.alerts.filter(a => a.severity === 'critical').length,
    };
    const acknowledged = this.alerts.filter(a => a.acknowledged).length;
    const unacknowledged = total - acknowledged;

    return {
      total,
      byLevel,
      acknowledged,
      unacknowledged,
    };
  }
}

// 全局单例
let globalAlertManager: AlertManager | null = null;

export function getGlobalAlertManager(): AlertManager {
  if (!globalAlertManager) {
    globalAlertManager = new AlertManager();
  }
  return globalAlertManager;
}
