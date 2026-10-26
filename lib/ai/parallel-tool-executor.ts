/**
 * 并行工具执行器
 *
 * 预期性能提升：3 个独立工具从 12-15 秒降低到 4-6 秒。
 *
 * ── 2026-10-12 重写：依赖判定从「猜字符串」改为「显式资源元数据」 ──
 *
 * 旧实现的三个问题（详见 lib/ai/tool-capabilities.ts 文件头）：
 *   1. `argsStr.includes(prevTool.name)` —— 把参数 JSON 串起来做子串匹配，假依赖 / 漏依赖并存；
 *   2. `if (name.includes('analyze') || name.includes('diagnose')) → 依赖任意 search/scrape`
 *      —— 硬编码的工具命名约定，新增工具即失效；
 *   3. `canExecuteInParallel` 用名字白名单决定「强制并行」，完全忽略真实的资源冲突
 *      （例：两个 `control_camera` 会被判为可并行 → 电机行程互相打断）。
 *
 * 新实现：**谁读写什么资源**登记在 `tool-capabilities.ts`，这里只做确定性的冲突推导。
 * 串行条件只有两个 —— 资源冲突（写-写 / 写-读）与显式声明的 dependsOn。
 */

import { AgentOrchestrator } from './agent-orchestrator/orchestrator';
import { AgentContext, ToolCall } from './agent-orchestrator/types';
import { hasResourceConflict, unsatisfiedDependencies } from './tool-capabilities';

/** 分批结果（导出以便单测与排障） */
export interface BatchPlan {
  /** 批次有序执行，批内并行 */
  batches: ToolCall[][];
  /** 工具被推迟到后续批次的原因（便于日志排查） */
  notes: string[];
}

/**
 * 将工具调用分组为可并行执行的批次（确定性推导，不依赖字符串启发式）。
 *
 * 规则：
 *   1. 资源冲突（写-写 / 写-读）的工具不能进同一批；
 *   2. 显式声明的前置工具（dependsOn）必须先执行；
 *   3. 保持模型给出的原始顺序 —— 冲突时后出现的那个被推到下一批
 *      （模型通常按意图顺序输出 tool_calls，顺序本身就是弱语义）。
 *
 * 复杂度 O(n³) 上下界，但 n = 单次 tool_calls 数量（通常 ≤ 10），无关紧要。
 */
export function planToolBatches(toolCalls: ToolCall[]): BatchPlan {
  const batches: ToolCall[][] = [];
  const notes: string[] = [];
  const scheduled = new Set<string>(); // 已分配的 toolCall.id
  const scheduledNames = new Set<string>(); // 已分配的工具名
  const presentNames = new Set(toolCalls.map(tc => tc.name));

  let guard = 0;
  const maxGuard = toolCalls.length * toolCalls.length + 8;

  while (scheduled.size < toolCalls.length) {
    if (++guard > maxGuard) {
      // 理论上不可达（每轮至少入一个），留作兜底防止死循环
      const remaining = toolCalls.filter(tc => !scheduled.has(tc.id));
      if (remaining.length > 0) {
        batches.push(remaining);
        notes.push(`兜底：仍有 ${remaining.length} 个工具未分配，强制并入最后一批`);
        remaining.forEach(tc => {
          scheduled.add(tc.id);
          scheduledNames.add(tc.name);
        });
      }
      break;
    }

    const currentBatch: ToolCall[] = [];

    for (const tc of toolCalls) {
      if (scheduled.has(tc.id)) continue;

      // ① 显式依赖未满足 → 等下一轮
      const pending = unsatisfiedDependencies(tc.name, presentNames, scheduledNames);
      if (pending.length > 0) {
        if (batches.length === 0) {
          notes.push(`${tc.name} 等待前置工具：${pending.join(', ')}`);
        }
        continue;
      }

      // ② 与本批已选中工具资源冲突 → 等下一轮
      const conflict = currentBatch.find(prev => hasResourceConflict(prev.name, tc.name));
      if (conflict) {
        if (batches.length === 0) {
          notes.push(`${tc.name} 与 ${conflict.name} 存在资源冲突，串行`);
        }
        continue;
      }

      currentBatch.push(tc);
    }

    if (currentBatch.length === 0) {
      // 依赖环或不可能满足的依赖：取第一个未分配工具单独成批，保证一定推进
      const forced = toolCalls.find(tc => !scheduled.has(tc.id));
      if (!forced) break;
      currentBatch.push(forced);
      notes.push(`${forced.name} 的依赖不可能全部满足，强制推进以避免死循环`);
    }

    currentBatch.forEach(tc => {
      scheduled.add(tc.id);
      scheduledNames.add(tc.name);
    });
    batches.push(currentBatch);
  }

  return { batches, notes };
}

/**
 * 并行执行工具调用（按资源冲突自动分批）
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

  const { batches, notes } = planToolBatches(toolCalls);

  console.log(
    `[ParallelExecutor] ${toolCalls.length} tool calls → ${batches.length} batch(es): ` +
      batches.map((b, i) => `B${i + 1}[${b.map(tc => tc.name).join(',')}]`).join(' '),
  );
  if (notes.length > 0) {
    console.log(`[ParallelExecutor] serialization notes: ${notes.join(' | ')}`);
  }

  let completedCount = 0;
  const totalCount = toolCalls.length;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    const settled = await Promise.allSettled(
      batch.map(async (toolCall) => {
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
              executionTime: 0,
            },
          };
        } finally {
          completedCount++;
          onProgress?.(completedCount, totalCount, toolCall.name);
        }
      })
    );

    settled.forEach((settledResult) => {
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
 * 检查工具列表是否可以完全并行执行（无任何资源冲突与显式依赖）。
 *
 * 语义已修正：旧版是「工具名是否落在某个白名单里」，与真实安全性无关；
 * 现在等价于「planToolBatches 只分出一个批次」。
 */
export function canExecuteInParallel(toolCalls: ToolCall[]): boolean {
  if (toolCalls.length <= 1) return true;
  return planToolBatches(toolCalls).batches.length <= 1;
}

/**
 * 智能执行：自动选择串行或并行。
 *
 * 单工具直执行以省去分批开销；多工具一律走 planToolBatches ——
 * 无冲突时自然落到一个批次，不再需要「白名单强制并行」那条特殊路径。
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

  return executeToolCallsInParallel(toolCalls, orchestrator, context, onProgress);
}
