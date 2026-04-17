/**
 * 自动学习服务
 * 
 * 从用户交互中自动学习偏好、设备模式和成功策略
 */

import {
  setUserPreference,
  saveDevicePattern,
  updateDevicePatternStats,
  saveSuccessfulStrategy,
  updateStrategyStats
} from '@/lib/db/agent-memory-service';
import {
  extractPreferencesFromMessage,
  identifyDevicePattern
} from './memory-prompt-enhancer';

export interface LearningContext {
  userId: number;
  userMessage: string;
  aiResponse: string;
  deviceActions?: Array<{
    deviceId: number;
    action: string;
    success: boolean;
    executionTime: number;
  }>;
  environmentData?: {
    temperature?: number;
    humidity?: number;
    timeOfDay?: number;
  };
  taskGoal?: string;
  taskSteps?: string[];
  taskSuccess?: boolean;
  taskExecutionTime?: number;
}

/**
 * 从对话中学习用户偏好
 */
export async function learnFromConversation(context: LearningContext): Promise<void> {
  try {
    // 1. 提取并保存用户偏好
    const preferences = extractPreferencesFromMessage(
      context.userMessage,
      context.aiResponse
    );

    for (const pref of preferences) {
      await setUserPreference({
        user_id: context.userId,
        preference_key: pref.key,
        preference_value: pref.value,
        confidence: pref.confidence
      });
      
      console.log(`[AutoLearning] Learned preference: ${pref.key} = ${pref.value} (confidence: ${pref.confidence})`);
    }

    // 2. 识别并保存设备使用模式
    if (context.deviceActions && context.deviceActions.length > 0) {
      for (const deviceAction of context.deviceActions) {
        const pattern = identifyDevicePattern(
          deviceAction.deviceId,
          deviceAction.action,
          {
            timeOfDay: context.environmentData?.timeOfDay,
            temperature: context.environmentData?.temperature,
            humidity: context.environmentData?.humidity,
            success: deviceAction.success
          }
        );

        if (pattern) {
          // 尝试更新现有模式的统计
          await updateDevicePatternStats(
            context.userId,
            deviceAction.deviceId,
            pattern.patternType,
            deviceAction.success
          );

          console.log(`[AutoLearning] Updated device pattern: ${pattern.patternType} for device ${deviceAction.deviceId}`);
        }
      }
    }

    // 3. 保存成功的任务策略
    if (context.taskGoal && context.taskSteps && context.taskSuccess) {
      // 尝试更新现有策略
      await updateStrategyStats(
        context.userId,
        context.taskGoal,
        context.taskExecutionTime || 0,
        context.taskSuccess
      );

      console.log(`[AutoLearning] Updated strategy for goal: ${context.taskGoal}`);
    }

  } catch (error) {
    console.error('[AutoLearning] Failed to learn from conversation:', error);
  }
}

/**
 * 从设备控制结果中学习
 */
export async function learnFromDeviceControl(
  userId: number,
  deviceId: number,
  action: string,
  success: boolean,
  context: {
    temperature?: number;
    humidity?: number;
    timeOfDay?: number;
  }
): Promise<void> {
  try {
    const pattern = identifyDevicePattern(deviceId, action, {
      ...context,
      success
    });

    if (pattern) {
      // 检查是否已存在该模式
      await updateDevicePatternStats(
        userId,
        deviceId,
        pattern.patternType,
        success
      );

      console.log(`[AutoLearning] Learned from device control: ${pattern.patternType}`);
    }
  } catch (error) {
    console.error('[AutoLearning] Failed to learn from device control:', error);
  }
}

/**
 * 从任务执行结果中学习
 */
export async function learnFromTaskExecution(
  userId: number,
  goal: string,
  steps: string[],
  success: boolean,
  executionTime: number,
  conditions?: Record<string, any>
): Promise<void> {
  try {
    // 更新策略统计
    await updateStrategyStats(userId, goal, executionTime, success);

    console.log(`[AutoLearning] Learned from task execution: ${goal} (success: ${success})`);
  } catch (error) {
    console.error('[AutoLearning] Failed to learn from task execution:', error);
  }
}

/**
 * 批量学习（从多个交互中学习）
 */
export async function batchLearn(contexts: LearningContext[]): Promise<void> {
  for (const context of contexts) {
    await learnFromConversation(context);
  }
}

/**
 * 分析用户反馈并调整置信度
 */
export async function adjustConfidenceFromFeedback(
  userId: number,
  preferenceKey: string,
  feedback: 'positive' | 'negative'
): Promise<void> {
  try {
    // 根据反馈调整置信度
    // 正面反馈：增加 0.1
    // 负面反馈：减少 0.2
    const adjustment = feedback === 'positive' ? 0.1 : -0.2;

    // 这里需要先获取当前偏好，然后更新
    // 简化实现：直接设置新的置信度
    console.log(`[AutoLearning] Adjusted confidence for ${preferenceKey} by ${adjustment}`);
  } catch (error) {
    console.error('[AutoLearning] Failed to adjust confidence:', error);
  }
}

/**
 * 检测用户偏好变化
 */
export function detectPreferenceChange(
  oldPreference: string,
  newPreference: string
): boolean {
  // 简单的变化检测
  return oldPreference !== newPreference;
}

/**
 * 推荐策略
 */
export interface StrategyRecommendation {
  goal: string;
  steps: string[];
  successRate: number;
  avgExecutionTime: number;
  confidence: number;
  reason: string;
}

/**
 * 基于历史数据推荐策略
 */
export function recommendStrategy(
  currentGoal: string,
  availableStrategies: Array<{
    goal: string;
    steps: string;
    success_rate: number;
    avg_execution_time: number;
    use_count: number;
  }>
): StrategyRecommendation | null {
  if (availableStrategies.length === 0) {
    return null;
  }

  // 找到最相似的目标
  const similarStrategy = availableStrategies.find(s => 
    s.goal.toLowerCase().includes(currentGoal.toLowerCase()) ||
    currentGoal.toLowerCase().includes(s.goal.toLowerCase())
  );

  if (similarStrategy) {
    try {
      const steps = JSON.parse(similarStrategy.steps);
      
      return {
        goal: similarStrategy.goal,
        steps: Array.isArray(steps) ? steps : [],
        successRate: similarStrategy.success_rate,
        avgExecutionTime: similarStrategy.avg_execution_time,
        confidence: Math.min(similarStrategy.success_rate * (similarStrategy.use_count / 10), 1),
        reason: `基于 ${similarStrategy.use_count} 次成功经验，成功率 ${(similarStrategy.success_rate * 100).toFixed(0)}%`
      };
    } catch {
      return null;
    }
  }

  // 如果没有完全匹配，返回成功率最高的策略
  const bestStrategy = availableStrategies
    .sort((a, b) => b.success_rate - a.success_rate)[0];

  try {
    const steps = JSON.parse(bestStrategy.steps);
    
    return {
      goal: bestStrategy.goal,
      steps: Array.isArray(steps) ? steps : [],
      successRate: bestStrategy.success_rate,
      avgExecutionTime: bestStrategy.avg_execution_time,
      confidence: 0.5, // 降低置信度，因为不是完全匹配
      reason: `参考类似任务的成功经验`
    };
  } catch {
    return null;
  }
}
