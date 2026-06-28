import { NextRequest, NextResponse } from 'next/server';
import { globalOrchestratorManager } from '@/lib/ai/agent-orchestrator';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // admin 授权校验：仅 admin / super_admin 可访问运营指标
  const currentUser = await getCurrentUser()
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
  }
  try {
    // 从全局管理器获取聚合的指标数据
    const metrics = globalOrchestratorManager.getAggregatedMetrics();
    const stats = globalOrchestratorManager.getStats();

    console.log('[Agent Metrics API] Stats:', stats);
    console.log('[Agent Metrics API] Metrics:', {
      totalActions: metrics.totalActions,
      toolCount: Object.keys(metrics.toolUsageStats || {}).length
    });

    return NextResponse.json({
      success: true,
      metrics,
      stats,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Failed to get agent metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get metrics' },
      { status: 500 }
    );
  }
}
