/**
 * 并行工具执行器
 * 
 * 智能分析工具依赖关系，并行执行独立的工具调用
 * 预期性能提升：3个独立工具从12-15秒降低到4-6秒
 */

import { AgentOrchestrator } from './agent-orchestrator/orchestrator';
import { AgentContext, ToolCall } from './agent-orchestrator/types';

interface ToolDependency {
  toolName: string;
  dependsOn: string[]; // 依赖的工具名称列表
}

/**
 * 分析工具调用的依赖关系
 * 
 * 规则：
 * 1. 搜索工具通常是独立的
 * 2. 设备控制通常是独立的
 * 3. 如果工具B的参数引用了工具A的结果，则B依赖A
 */
function analyzeToolDependencies(toolCalls: ToolCall[]): Map<string, Set<string>> {
  const dependencies = new Map<string, Set<string>>();

  // 初始化依赖图
  toolCalls.forEach(tc => {
    dependencies.set(tc.id, new Set());
  });

  // 分析参数引用
  for (let i = 0; i < toolCalls.length; i++) {
    const currentTool = toolCalls[i];
    const argsStr = JSON.stringify(currentTool.arguments);

    // 检查是否引用了之前工具的结果
    for (let j = 0; j < i; j++) {
      const prevTool = toolCalls[j];
      
      // 简单的启发式规则：如果参数中包含前一个工具的名称或ID
      if (argsStr.includes(prevTool.name) || argsStr.includes(prevTool.id)) {
        dependencies.get(currentTool.id)?.add(prevTool.id);
      }
    }

    // 特殊规则：某些工具类型总是依赖搜索结果
    if (currentTool.name.includes('analyze') || currentTool.name.includes('diagnose')) {
      // 查找之前的搜索工具
      for (let j = 0; j < i; j++) {
        const prevTool = toolCalls[j];
        if (prevTool.name.includes('search') || prevTool.name.includes('scrape')) {
          dependencies.get(currentTool.id)?.add(prevTool.id);
        }
      }
    }
  }

  return dependencies;
}

/**
 * 将工具调用分组为可并行执行的批次
 * 
 * 返回：[[batch1], [batch2], ...]
 * 每个batch内的工具可以并行执行
 */
function groupToolCallsIntoBatches(
  toolCalls: ToolCall[],
  dependencies: Map<string, Set<string>>
): ToolCall[][] {
  const batches: ToolCall[][] = [];
  const processed = new Set<string>();
  const toolMap = new Map(toolCalls.map(tc => [tc.id, tc]));

  while (processed.size < toolCalls.length) {
    const currentBatch: ToolCall[] = [];

    // 找出所有依赖已满足的工具
    for (const toolCall of toolCalls) {
      if (processed.has(toolCall.id)) continue;

      const deps = dependencies.get(toolCall.id) || new Set();
      const allDepsProcessed = Array.from(deps).every(depId => processed.has(depId));

      if (allDepsProcessed) {
        currentBatch.push(toolCall);
      }
    }

    if (currentBatch.length === 0) {
      // 检测到循环依赖，强制处理剩余工具
      console.warn('[ParallelExecutor] Circular dependency detected, forcing execution');
      const remaining = toolCalls.filter(tc => !processed.has(tc.id));
      currentBatch.push(...remaining);
    }

    batches.push(currentBatch);
    currentBatch.forEach(tc => processed.add(tc.id));
  }

  return batches;
}

/**
 * 并行执行工具调用
 * 
 * @param toolCalls 要执行的工具调用列表
 * @param orchestrator Agent编排器实例
 * @param context Agent上下文
 * @param onProgress 进度回调（可选）
 * @returns 工具执行结果映射 Map<toolCallId, result>
 */
export async function executeToolCallsInParallel(
  toolCalls: ToolCall[],
  orchestrator: AgentOrchestrator,
  context: AgentContext,
  onProgress?: (completed: number, total: number, currentTool: string) => void
): Promise<Map<string, any>> {
  const results = new Map<string, any>();
  
  if (toolCalls.length === 0) {
    return results;
  }

  console.log(`[ParallelExecutor] Analyzing ${toolCalls.length} tool calls for dependencies`);

  // 1. 分析依赖关系
  const dependencies = analyzeToolDependencies(toolCalls);
  
  // 2. 分组为批次
  const batches = groupToolCallsIntoBatches(toolCalls, dependencies);
  
  console.log(`[ParallelExecutor] Grouped into ${batches.length} batches:`, 
    batches.map((b, i) => `Batch ${i + 1}: ${b.map(tc => tc.name).join(', ')}`));

  // 3. 按批次执行
  let completedCount = 0;
  const totalCount = toolCalls.length;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    console.log(`[ParallelExecutor] Executing batch ${batchIndex + 1}/${batches.length} with ${batch.length} tools`);

    // 并行执行当前批次的所有工具
    const batchResults = await Promise.allSettled(
      batch.map(async (toolCall) => {
        try {
          const result = await orchestrator.executeToolCall(toolCall, context);

          completedCount++;
          onProgress?.(completedCount, totalCount, toolCall.name);

          return { toolCall, result };
        } catch (error) {
          completedCount++;
          onProgress?.(completedCount, totalCount, toolCall.name);
          
          return {
            toolCall,
            result: {
              id: toolCall.id,
              success: false,
              error: (error as Error).message,
              executionTime: 0
            }
          };
        }
      })
    );

    // 收集结果
    batchResults.forEach((settledResult) => {
      if (settledResult.status === 'fulfilled') {
        const { toolCall, result } = settledResult.value;
        results.set(toolCall.id, result);
      } else {
        console.error('[ParallelExecutor] Tool execution failed:', settledResult.reason);
      }
    });
  }

  console.log(`[ParallelExecutor] Completed all ${totalCount} tool calls`);
  
  return results;
}

/**
 * 简化版：强制并行执行所有工具（忽略依赖）
 * 
 * 适用于确定所有工具都是独立的场景
 */
export async function executeToolCallsInParallelForced(
  toolCalls: ToolCall[],
  orchestrator: AgentOrchestrator,
  context: AgentContext
): Promise<Map<string, any>> {
  const results = new Map<string, any>();
  
  console.log(`[ParallelExecutor] Force parallel execution of ${toolCalls.length} tools`);

  const settledResults = await Promise.allSettled(
    toolCalls.map(async (toolCall) => {
      try {
        const result = await orchestrator.executeToolCall(toolCall, context);
        return { toolCall, result };
      } catch (error) {
        return {
          toolCall,
          result: {
            id: toolCall.id,
            success: false,
            error: (error as Error).message,
            executionTime: 0
          }
        };
      }
    })
  );

  settledResults.forEach((settledResult) => {
    if (settledResult.status === 'fulfilled') {
      const { toolCall, result } = settledResult.value;
      results.set(toolCall.id, result);
    }
  });

  return results;
}

/**
 * 检查工具列表是否可以安全地并行执行
 * 
 * 返回true表示所有工具都是独立的，可以强制并行
 */
export function canExecuteInParallel(toolCalls: ToolCall[]): boolean {
  // 独立工具类型列表
  const independentToolTypes = [
    'search',
    'weather',
    'toggle_relay',
    'control_camera',
    'get_channel',
    'get_all_spectrum'
  ];

  return toolCalls.every(tc => 
    independentToolTypes.some(type => tc.name.includes(type))
  );
}

/**
 * 智能执行：自动选择串行或并行
 */
export async function executeToolCallsSmart(
  toolCalls: ToolCall[],
  orchestrator: AgentOrchestrator,
  context: AgentContext,
  onProgress?: (completed: number, total: number, currentTool: string) => void
): Promise<Map<string, any>> {
  // 单个工具直接执行
  if (toolCalls.length === 1) {
    const result = await orchestrator.executeToolCall(toolCalls[0], context);
    return new Map([[toolCalls[0].id, result]]);
  }

  // 检查是否可以强制并行
  if (canExecuteInParallel(toolCalls)) {
    console.log('[ParallelExecutor] All tools are independent, using forced parallel execution');
    return executeToolCallsInParallelForced(toolCalls, orchestrator, context);
  }

  // 使用依赖分析的并行执行
  return executeToolCallsInParallel(toolCalls, orchestrator, context, onProgress);
}
