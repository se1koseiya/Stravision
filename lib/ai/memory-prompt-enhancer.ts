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
import { DEVICE_IDS, DEVICE_NAMES } from '@/lib/constants';

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
        const deviceName = DEVICE_NAMES[pattern.device_id] || `设备${pattern.device_id}`;

        sections.push(`- ${deviceName}: ${pattern.pattern_type} (成功率: ${successRate}%, 置信度: ${confidence}%)`);
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
 * 从用户消息中提取真实偏好（多维度）
 * 基于"显式声明 > 行为推断"原则，置信度区分强弱信号
 */
export function extractPreferencesFromMessage(
  userMessage: string,
  aiResponse: string
): Array<{ key: string; value: string; confidence: number }> {
  const preferences: Array<{ key: string; value: string; confidence: number }> = [];
  const msg = userMessage.toLowerCase();

  // ─── 1. 显式偏好声明（高置信度）───
  // "我喜欢/偏好/习惯/一般都..." 后接具体内容
  const explicitPrefPatterns: Array<{ regex: RegExp; key: string; conf: number }> = [
    { regex: /(?:喜欢|偏好|习惯|一般都|通常|总是).{0,6}?温度.{0,4}?(\d{1,3})\s*(?:度|℃|°)/i, key: 'preferred_temperature', conf: 0.85 },
    { regex: /(?:喜欢|偏好|习惯).{0,6}?湿度.{0,4}?(\d{1,3})\s*%?/i, key: 'preferred_humidity', conf: 0.8 },
    { regex: /(?:喜欢|偏好|习惯).{0,10}?光照.{0,4}?(\d{1,6})\s*(?:lux|勒克斯)?/i, key: 'preferred_light', conf: 0.75 },
    { regex: /(?:每天|通常|一般|习惯).{0,4}?(\d{1,2})\s*(?:点|:)\s*(?:浇水|灌溉|浇水)/i, key: 'preferred_watering_time', conf: 0.8 },
    { regex: /(?:每次|一般).{0,4}?浇水.{0,4}?(\d{1,3})\s*(?:分钟|min)/i, key: 'preferred_watering_duration', conf: 0.8 },
    { regex: /(?:种的是|种的|品种).{0,4}?(.{2,20}?)(?:草莓|品种)/i, key: 'preferred_strawberry_variety', conf: 0.9 },
  ];
  for (const { regex, key, conf } of explicitPrefPatterns) {
    const m = userMessage.match(regex);
    if (m && m[1]) {
      preferences.push({ key, value: m[1].trim(), confidence: conf });
    }
  }

  // ─── 2. 通知偏好（显式声明）───
  if (/不要(?:通知|提醒|打扰)|别提醒|少打扰|安静/i.test(userMessage)) {
    preferences.push({ key: 'notification_preference', value: 'minimal', confidence: 0.9 });
  } else if (/(?:多|及时|随时|立刻)(?:通知|提醒|告诉我)/i.test(userMessage)) {
    preferences.push({ key: 'notification_preference', value: 'frequent', confidence: 0.9 });
  }

  // ─── 3. 回复详细程度偏好（显式 + 行为推断）───
  if (/(?:简单说|简短|精简|别太长|少说)/i.test(userMessage)) {
    preferences.push({ key: 'response_detail_level', value: 'brief', confidence: 0.85 });
  } else if (/(?:详细|具体|深入|展开|多说)/i.test(userMessage)) {
    preferences.push({ key: 'response_detail_level', value: 'detailed', confidence: 0.85 });
  } else if (userMessage.length < 8) {
    // 行为推断：用户消息极短（如"温度多少"），倾向于简短回复
    preferences.push({ key: 'response_detail_level', value: 'brief', confidence: 0.5 });
  } else if (userMessage.length > 50) {
    // 行为推断：用户消息长且详细，倾向于详细回复
    preferences.push({ key: 'response_detail_level', value: 'detailed', confidence: 0.5 });
  }

  // ─── 4. 自动化偏好（显式 + 行为推断）───
  if (/(?:自动|直接|帮我|不用问|别问).{0,6}(?:执行|操作|调控|浇水|开关)/i.test(userMessage)) {
    preferences.push({ key: 'automation_preference', value: 'high', confidence: 0.8 });
  } else if (/(?:我先看看|让我确认|问问我就|等我说)/i.test(userMessage)) {
    preferences.push({ key: 'automation_preference', value: 'low', confidence: 0.8 });
  }

  // ─── 5. 语言风格偏好 ───
  if (/(?:说人话|别用术语|通俗|大白话)/i.test(userMessage)) {
    preferences.push({ key: 'language_style', value: 'casual', confidence: 0.85 });
  } else if (/(?:专业|术语|技术|学术)/i.test(userMessage)) {
    preferences.push({ key: 'language_style', value: 'professional', confidence: 0.8 });
  }

  // ─── 6. 关注重点偏好（从反复提及推断）───
  const focusKeywords: Array<{ words: string[]; key: string; value: string }> = [
    { words: ['产量', '结果', '开花', '坐果', '果实'], key: 'focus_area', value: 'yield' },
    { words: ['病害', '虫害', '白粉', '灰霉', '烂'], key: 'focus_area', value: 'pest_control' },
    { words: ['成本', '利润', '赚钱', '收益', '卖'], key: 'focus_area', value: 'economics' },
    { words: ['长势', '生长', '叶子', '根系', '植株'], key: 'focus_area', value: 'growth' },
  ];
  for (const { words, key, value } of focusKeywords) {
    const matchCount = words.filter(w => msg.includes(w.toLowerCase())).length;
    if (matchCount >= 2) {
      preferences.push({ key, value, confidence: 0.6 + matchCount * 0.1 });
    }
  }

  return preferences;
}

/**
 * 从设备控制结果中识别真实使用模式
 * 基于设备类型 + 动作值 + 环境条件组合判断，而非硬编码时段
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
  const deviceName = DEVICE_NAMES[deviceId] || `设备${deviceId}`;
  // 解析 action：可能是 JSON 字符串（如 '{"value":1}'）或纯文本
  let actionValue: number | null = null;
  try {
    const parsed = JSON.parse(action);
    if (typeof parsed === 'object' && parsed !== null) {
      actionValue = parsed.value ?? parsed.state ?? null;
    }
  } catch {
    // 非 JSON，尝试提取数字
    const numMatch = action.match(/(\d+)/);
    if (numMatch) actionValue = parseInt(numMatch[1]);
  }
  const isTurnOn = actionValue === 1;
  const isTurnOff = actionValue === 0;

  // ─── 环境响应模式（环境条件 + 设备动作组合）───
  // 只有环境数据异常 + 对应设备动作才识别为"响应模式"
  if (context.temperature !== undefined) {
    if (context.temperature > 30 && deviceId === DEVICE_IDS.FAN && isTurnOn) {
      return {
        patternType: 'high_temp_cooling',
        patternData: { device: deviceName, action: '开启', temperature: context.temperature, success: context.success }
      };
    }
    if (context.temperature < 10 && deviceId === DEVICE_IDS.RGB_LIGHT && isTurnOn) {
      // 低温补光（促进光合作用升温）
      return {
        patternType: 'low_temp_lighting',
        patternData: { device: deviceName, action: '开启', temperature: context.temperature, success: context.success }
      };
    }
  }

  if (context.humidity !== undefined) {
    if (context.humidity > 85 && deviceId === DEVICE_IDS.FAN && isTurnOn) {
      return {
        patternType: 'high_humidity_ventilation',
        patternData: { device: deviceName, action: '开启通风', humidity: context.humidity, success: context.success }
      };
    }
    if (context.humidity < 40 && deviceId === DEVICE_IDS.PUMP && isTurnOn) {
      return {
        patternType: 'low_humidity_irrigation',
        patternData: { device: deviceName, action: '开启灌溉', humidity: context.humidity, success: context.success }
      };
    }
  }

  // ─── 时段灌溉模式（仅水泵，区分晨浇/午浇/晚浇）───
  if (context.timeOfDay !== undefined && deviceId === DEVICE_IDS.PUMP && isTurnOn) {
    const hour = context.timeOfDay;
    if (hour >= 5 && hour < 10) {
      return {
        patternType: 'morning_irrigation',
        patternData: { device: deviceName, action: '晨浇', hour, success: context.success }
      };
    } else if (hour >= 10 && hour < 16) {
      return {
        patternType: 'midday_irrigation',
        patternData: { device: deviceName, action: '午浇', hour, success: context.success }
      };
    } else if (hour >= 16 && hour < 20) {
      return {
        patternType: 'evening_irrigation',
        patternData: { device: deviceName, action: '晚浇', hour, success: context.success }
      };
    }
  }

  // ─── 补光模式（仅灯光设备，区分时段）───
  if (context.timeOfDay !== undefined &&
      (deviceId === DEVICE_IDS.RGB_LIGHT || deviceId === DEVICE_IDS.WHITE_LIGHT) && isTurnOn) {
    const hour = context.timeOfDay;
    if (hour < 8 || hour >= 18) {
      return {
        patternType: 'low_light_supplement',
        patternData: { device: deviceName, action: '补光', hour, success: context.success }
      };
    }
  }

  return null;
}
