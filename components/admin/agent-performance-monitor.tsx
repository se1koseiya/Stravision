'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertTriangle, CheckCircle, Clock, TrendingUp, Zap } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface AgentMetrics {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  avgResponseTime: number;
  errorRate: number;
  toolUsageStats: Record<string, number>;
  recentActions: Array<{
    timestamp: number;
    type: string;
    status: 'success' | 'failed';
    executionTime: number;
  }>;
}

interface PerformanceData {
  timestamp: string;
  responseTime: number;
  errorRate: number;
  successRate: number;
}

export function AgentPerformanceMonitor() {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // 每5秒更新
    return () => clearInterval(interval);
  }, []);

  async function fetchMetrics() {
    try {
      const response = await fetch('/api/admin/agent-metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
        
        // 更新历史数据
        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        setPerformanceHistory(prev => {
          const newData = [
            ...prev,
            {
              timestamp: timeStr,
              responseTime: data.metrics.avgResponseTime,
              errorRate: data.metrics.errorRate * 100,
              successRate: (data.metrics.successfulActions / data.metrics.totalActions) * 100 || 0,
            }
          ];
          // 只保留最近20个数据点
          return newData.slice(-20);
        });
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const successRate = metrics.totalActions > 0 
    ? (metrics.successfulActions / metrics.totalActions) * 100 
    : 0;

  const toolUsageData = metrics.toolUsageStats 
    ? Object.entries(metrics.toolUsageStats)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    : [];

  // 检查是否有数据
  const hasData = metrics.totalActions > 0 || toolUsageData.length > 0;

  return (
    <div className="space-y-6">
      {/* 空状态提示 */}
      {!hasData && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无监控数据</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              当前没有 Agent 活动数据。请先使用 AI 助手创建一些会话，然后返回查看性能指标。
            </p>
            <Badge variant="outline" className="mt-4">
              数据每 5 秒自动刷新
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* 概览卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总执行次数</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalActions}</div>
            <p className="text-xs text-muted-foreground">
              成功 {metrics.successfulActions} / 失败 {metrics.failedActions}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成功率</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
            <Progress value={successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均响应时间</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgResponseTime.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">
              {metrics.avgResponseTime < 1000 ? '表现优秀' : metrics.avgResponseTime < 3000 ? '表现良好' : '需要优化'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">错误率</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.errorRate * 100).toFixed(1)}%</div>
            <Badge variant={metrics.errorRate < 0.1 ? 'default' : metrics.errorRate < 0.3 ? 'secondary' : 'destructive'}>
              {metrics.errorRate < 0.1 ? '正常' : metrics.errorRate < 0.3 ? '警告' : '异常'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* 性能趋势图 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>响应时间趋势</CardTitle>
            <CardDescription>最近20次采样的平均响应时间</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={performanceHistory}>
                <XAxis 
                  dataKey="timestamp" 
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}ms`}
                />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>成功率趋势</CardTitle>
            <CardDescription>最近20次采样的成功率</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={performanceHistory}>
                <XAxis 
                  dataKey="timestamp" 
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="successRate" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 工具使用统计 */}
      <Card>
        <CardHeader>
          <CardTitle>工具使用统计</CardTitle>
          <CardDescription>Top 10 最常用的工具</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={toolUsageData}>
              <XAxis 
                dataKey="name" 
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 最近执行记录 */}
      <Card>
        <CardHeader>
          <CardTitle>最近执行记录</CardTitle>
          <CardDescription>最近10次工具执行</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.recentActions.slice(-10).reverse().map((action, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  {action.status === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{action.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(action.timestamp).toLocaleTimeString('zh-CN')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={action.status === 'success' ? 'default' : 'destructive'}>
                    {action.status === 'success' ? '成功' : '失败'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {action.executionTime}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
