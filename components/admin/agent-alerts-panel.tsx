'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Bell, CheckCircle, Info, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/lib/ai/agent-orchestrator/alert-manager';

interface AlertStats {
  total: number;
  byLevel: {
    info: number;
    warning: number;
    error: number;
    critical: number;
  };
  acknowledged: number;
  unacknowledged: number;
}

export function AgentAlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000); // 每10秒更新
    return () => clearInterval(interval);
  }, []);

  async function fetchAlerts() {
    try {
      const response = await fetch('/api/admin/agent-alerts');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function acknowledgeAlert(alertId: string) {
    try {
      const response = await fetch('/api/admin/agent-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge', alertId }),
      });
      if (response.ok) {
        fetchAlerts();
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  }

  async function clearAllAlerts() {
    try {
      const response = await fetch('/api/admin/agent-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' }),
      });
      if (response.ok) {
        fetchAlerts();
      }
    } catch (error) {
      console.error('Failed to clear alerts:', error);
    }
  }

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'critical':
        return <Bell className="h-4 w-4 text-red-600 animate-pulse" />;
    }
  };

  const getSeverityBadge = (severity: Alert['severity']) => {
    const variants: Record<Alert['severity'], any> = {
      info: 'default',
      warning: 'secondary',
      error: 'destructive',
      critical: 'destructive',
    };
    return variants[severity];
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总告警</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              未确认 {stats.unacknowledged}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">严重</CardTitle>
            <Bell className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.byLevel.critical}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">错误</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.byLevel.error}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">警告</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.byLevel.warning}</div>
          </CardContent>
        </Card>
      </div>

      {/* 告警列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>告警列表</CardTitle>
              <CardDescription>最近的系统告警</CardDescription>
            </div>
            {alerts.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearAllAlerts}>
                清除所有
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mb-2" />
              <p>暂无告警</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start justify-between p-4 rounded-lg border ${
                    alert.acknowledged ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{alert.ruleName}</p>
                        <Badge variant={getSeverityBadge(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        {alert.acknowledged && (
                          <Badge variant="outline">已确认</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {alert.message}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString('zh-CN')}
                      </div>
                      {alert.metrics && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <span>总执行: {alert.metrics.totalActions}</span>
                          {' | '}
                          <span>失败: {alert.metrics.failedActions}</span>
                          {' | '}
                          <span>错误率: {((alert.metrics.errorRate || 0) * 100).toFixed(1)}%</span>
                          {' | '}
                          <span>响应时间: {alert.metrics.avgResponseTime?.toFixed(0)}ms</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {!alert.acknowledged && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      确认
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
