/**
 * 记忆增强的 Prompt 生成器
 * 
 * 将 Agent 的记忆摘要注入到系统提示词中，让 AI 具有上下文感知能力
 */

import { MemoryManager } from './agent-orchestrator/memory-manager';
import { 
  getUserPreference, 
  getAllUserPreferences,
  getDevicePatterns as getDevicePatternsFromDB,
  getSuccessfulStrategies as getSuccessfulStrategiesFromDB
} from '@/lib/db/agent-memory-service';

export interface MemoryEnhancedPromptOptions {
  userId: number;
  memoryManager?: MemoryManager;
  includePreferences?: boolean;
  includeDevicePatterns?: boolean;
  includeStrategies?: boolean;
  maxPreferences?: number;
  maxPatterns?: number;
  maxStrategies?: number;
}

/**
 * 生成记忆增强的系统提示词
 */
export async function generateMemoryEnhancedPrompt(
  basePrompt: string,
  options: MemoryEnhancedPromptOptions
): Promise<string> {
  const sections: string[] = [basePrompt];

  // 1. 添加工作记忆摘要（当前会话）
  if (options.memoryManager) {
    const memorySummary = options.memoryManager.generateMemorySummary();
    if (memorySummary) {
      sections.push('\n## 📋 当前会话记忆\n' + memorySummary);
    }
  }

  // 2. 添加用户偏好（长期记忆）
  if (options.includePreferences !== false) {
    const preferences = await getUserPreferences(
      options.userId,
      options.maxPreferences || 5
    );
    
    if (preferences.length > 0) {
      sections.push('\n## 👤 用户偏好记忆');
      sections.push('根据历史交互学习到的用户偏好：\n');
      
      preferences.forEach(pref => {
        const confidence = (pref.confidence * 100).toFixed(0);
        sections.push(`- ${pref.preference_key}: ${pref.preference_value} (置信度: ${confidence}%)`);
      });
      
      sections.push('\n💡 请在回答时考虑这些偏好，提供个性化的建议。');
    }
  }

  // 3. 添加设备使用模式（长期记忆）
  if (options.includeDevicePatterns !== false) {
    const patterns = await getDevicePatternsInternal(
      options.userId,
      undefined,
      options.maxPatterns || 3
    );
    
    if (patterns.length > 0) {
      sections.push('\n## 🔧 设备使用模式');
      sections.push('识别到的设备使用模式：\n');
      
      patterns.forEach(pattern => {
        const confidence = (pattern.confidence * 100).toFixed(0);
        const successRate = pattern.total_count > 0 
          ? ((pattern.success_count / pattern.total_count) * 100).toFixed(0)
          : '0';
        
        sections.push(`- 设备 ${pattern.device_id}: ${pattern.pattern_type} (成功率: ${successRate}%, 置信度: ${confidence}%)`);
      });
      
      sections.push('\n💡 在控制设备时，可以参考这些成功的使用模式。');
    }
  }

  // 4. 添加成功策略（长期记忆）
  if (options.includeStrategies !== false) {
    const strategies = await getSuccessfulStrategiesInternal(
      options.userId,
      undefined,
      options.maxStrategies || 3
    );
    
    if (strategies.length > 0) {
      sections.push('\n## 🎯 成功策略记忆');
      sections.push('历史上成功的操作策略：\n');
      
      strategies.forEach(strategy => {
        const successRate = (strategy.success_rate * 100).toFixed(0);
        const avgTime = (strategy.avg_execution_time / 1000).toFixed(1);
        
        sections.push(`- 目标: ${strategy.goal}`);
        sections.push(`  成功率: ${successRate}%, 平均耗时: ${avgTime}秒, 使用次数: ${strategy.use_count}`);
        
        try {
          const steps = JSON.parse(strategy.steps);
          if (Array.isArray(steps) && steps.length > 0) {
            sections.push(`  步骤: ${steps.join(' → ')}`);
          }
        } catch {}
      });
      
      sections.push('\n💡 遇到类似任务时，可以参考这些成功的策略。');
    }
  }

  return sections.join('\n');
}

/**
 * 获取高置信度的用户偏好
 */
async function getUserPreferences(
  userId: number,
  limit: number
): Promise<Array<{ preference_key: string; preference_value: string; confidence: number }>> {
  try {
    const allPrefs = await getAllUserPreferences(userId);
    
    // 过滤高置信度的偏好（> 0.6）
    return allPrefs
      .filter(p => p.confidence > 0.6)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  } catch (error) {
    console.error('[MemoryPromptEnhancer] Failed to get user preferences:', error);
    return [];
  }
}

/**
 * 获取高置信度的设备模式（内部函数）
 */
async function getDevicePatternsInternal(
  userId: number,
  deviceId: number | undefined,
  limit: number
): Promise<Array<{
  device_id: number;
  pattern_type: string;
  confidence: number;
  success_count: number;
  total_count: number;
}>> {
  try {
    const patterns = await getDevicePatternsFromDB(userId, deviceId);
    
    // 过滤高置信度的模式（> 0.6）
    return patterns
      .filter(p => p.confidence > 0.6 && p.total_count >= 3) // 至少使用过3次
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  } catch (error) {
    console.error('[MemoryPromptEnhancer] Failed to get device patterns:', error);
    return [];
  }
}

/**
 * 获取高成功率的策略（内部函数）
 */
async function getSuccessfulStrategiesInternal(
  userId: number,
  goal: string | undefined,
  limit: number
): Promise<Array<{
  goal: string;
  steps: string;
  success_rate: number;
  avg_execution_time: number;
  use_count: number;
}>> {
  try {
    const strategies = await getSuccessfulStrategiesFromDB(userId, goal);
    
    // 过滤高成功率的策略（> 0.7）
    return strategies
      .filter(s => s.success_rate > 0.7 && s.use_count >= 2) // 至少使用过2次
      .sort((a, b) => b.success_rate - a.success_rate)
      .slice(0, limit);
  } catch (error) {
    console.error('[MemoryPromptEnhancer] Failed to get successful strategies:', error);
    return [];
  }
}

/**
 * 从用户消息中提取可能的偏好
 */
export function extractPreferencesFromMessage(
  userMessage: string,
  aiResponse: string
): Array<{ key: string; value: string; confidence: number }> {
  const preferences: Array<{ key: string; value: string; confidence: number }> = [];

  // 检测温度偏好
  const tempMatch = userMessage.match(/喜欢|偏好|习惯.*?(\d+).*?度/);
  if (tempMatch) {
    preferences.push({
      key: 'preferred_temperature',
      value: tempMatch[1],
      confidence: 0.8
    });
  }

  // 检测通知偏好
  if (userMessage.includes('不要通知') || userMessage.includes('别提醒')) {
    preferences.push({
      key: 'notification_preference',
      value: 'minimal',
      confidence: 0.9
    });
  } else if (userMessage.includes('多通知') || userMessage.includes('及时提醒')) {
    preferences.push({
      key: 'notification_preference',
      value: 'frequent',
      confidence: 0.9
    });
  }

  // 检测详细程度偏好
  if (userMessage.includes('简单说') || userMessage.includes('简短')) {
    preferences.push({
      key: 'response_detail_level',
      value: 'brief',
      confidence: 0.8
    });
  } else if (userMessage.includes('详细') || userMessage.includes('具体')) {
    preferences.push({
      key: 'response_detail_level',
      value: 'detailed',
      confidence: 0.8
    });
  }

  // 检测自动化偏好
  if (userMessage.includes('自动') && (userMessage.includes('帮我') || userMessage.includes('直接'))) {
    preferences.push({
      key: 'automation_preference',
      value: 'high',
      confidence: 0.7
    });
  }

  return preferences;
}

/**
 * 从设备控制结果中识别使用模式
 */
export function identifyDevicePattern(
  deviceId: number,
  action: string,
  context: {
    timeOfDay?: number; // 小时 (0-23)
    temperature?: number;
    humidity?: number;
    success: boolean;
  }
): { patternType: string; patternData: any } | null {
  // 识别时间模式
  if (context.timeOfDay !== undefined) {
    const hour = context.timeOfDay;
    
    if (hour >= 6 && hour < 12) {
      return {
        patternType: 'morning_routine',
        patternData: { action, hour, success: context.success }
      };
    } else if (hour >= 12 && hour < 18) {
      return {
        patternType: 'afternoon_routine',
        patternData: { action, hour, success: context.success }
      };
    } else if (hour >= 18 && hour < 24) {
      return {
        patternType: 'evening_routine',
        patternData: { action, hour, success: context.success }
      };
    }
  }

  // 识别温度响应模式
  if (context.temperature !== undefined) {
    if (context.temperature > 30 && action.includes('风扇')) {
      return {
        patternType: 'high_temp_cooling',
        patternData: { action, temperature: context.temperature, success: context.success }
      };
    } else if (context.temperature < 15 && action.includes('加热')) {
      return {
        patternType: 'low_temp_heating',
        patternData: { action, temperature: context.temperature, success: context.success }
      };
    }
  }

  // 识别湿度响应模式
  if (context.humidity !== undefined) {
    if (context.humidity > 80 && action.includes('除湿')) {
      return {
        patternType: 'high_humidity_dehumidify',
        patternData: { action, humidity: context.humidity, success: context.success }
      };
    } else if (context.humidity < 40 && action.includes('加湿')) {
      return {
        patternType: 'low_humidity_humidify',
        patternData: { action, humidity: context.humidity, success: context.success }
      };
    }
  }

  return null;
}
