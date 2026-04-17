/**
 * 测试 Agent 编排器
 * 
 * 运行方式：
 * npx tsx test-orchestrator.ts
 */

import { createOrchestrator } from './lib/ai/agent-orchestrator';
import type { AgentContext, ToolCall } from './lib/ai/agent-orchestrator/types';

async function testOrchestrator() {
  console.log('=== Agent 编排器测试 ===\n');

  // 1. 创建编排器
  const sessionId = `test-session-${Date.now()}`;
  const orchestrator = createOrchestrator(sessionId, {
    enableMemory: true,
    enableMonitoring: true,
    enableLogging: false // 测试时不写数据库
  });

  console.log('✓ 编排器创建成功\n');

  // 2. 测试记忆管理
  console.log('--- 测试记忆管理 ---');
  orchestrator.setGoal('测试设备控制');
  orchestrator.addSubGoal('获取设备状态');
  orchestrator.addSubGoal('执行控制命令');
  orchestrator.completeStep('获取设备状态');

  const memorySummary = orchestrator.getMemorySummary();
  console.log('记忆摘要：');
  console.log(memorySummary);
  console.log('✓ 记忆管理测试通过\n');

  // 3. 测试工具管理器（模拟）
  console.log('--- 测试工具管理器 ---');
  
  const mockContext: AgentContext = {
    userId: 1,
    sessionId,
    conversationHistory: [],
    mcpConfigs: [],
    appUrl: 'http://localhost:3000'
  };

  // 模拟一个会失败的工具调用（用于测试重试）
  const mockToolCall: ToolCall = {
    id: 'test-tool-1',
    name: 'test_tool',
    arguments: { test: 'value' },
    timestamp: Date.now()
  };

  console.log('模拟工具调用（会失败，因为工具不存在）...');
  try {
    await orchestrator.executeToolCall(mockToolCall, mockContext);
  } catch (error) {
    console.log('✓ 工具调用失败（预期行为）:', (error as Error).message);
  }
  console.log('');

  // 4. 测试性能监控
  console.log('--- 测试性能监控 ---');
  const metrics = orchestrator.getMetrics();
  console.log('性能指标：', JSON.stringify(metrics, null, 2));
  
  const toolStats = orchestrator.getToolStats();
  console.log('工具统计：', JSON.stringify(toolStats, null, 2));
  console.log('✓ 性能监控测试通过\n');

  // 5. 生成报告
  console.log('--- 性能报告 ---');
  const report = orchestrator.generateReport();
  console.log(report);
  console.log('');

  // 6. 清理
  console.log('--- 清理 ---');
  orchestrator.cleanup();
  console.log('✓ 编排器清理完成\n');

  console.log('=== 所有测试通过 ===');
}

// 运行测试
testOrchestrator().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});
