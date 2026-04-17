/**
 * 带缓存的技能路由器
 * 
 * 通过缓存技能匹配结果，避免每次请求都重新计算
 * 预期性能提升：从300-500ms降低到10-50ms
 */

import { LRUCache } from 'lru-cache';
import { getRelevantSkillsContentV2 } from './skill-router-v2';

interface CachedSkillResult {
  content: string;
  matchedSkills: Array<{ id: string; name: string; matchReason?: string }>;
  timestamp: number;
}

// 创建LRU缓存
const skillRouteCache = new LRUCache<string, CachedSkillResult>({
  max: 200, // 最多缓存200个结果
  ttl: 1000 * 60 * 10, // 10分钟过期
  updateAgeOnGet: true, // 访问时更新过期时间
  updateAgeOnHas: false
});

/**
 * 生成语义哈希
 * 提取关键词并排序，用于缓存键生成
 */
function generateSemanticHash(text: string): string {
  // 提取中文词和英文词
  const keywords = text.toLowerCase()
    .match(/[\u4e00-\u9fa5]{2,}|[a-z]{3,}/g) || [];
  
  // 去重、排序、取前8个关键词
  const uniqueKeywords = [...new Set(keywords)]
    .sort()
    .slice(0, 8);
  
  return uniqueKeywords.join('-');
}

/**
 * 生成缓存键
 */
function generateCacheKey(
  userMessage: string,
  userId?: number,
  mandatorySkillsEnabled: boolean = true
): string {
  const semanticHash = generateSemanticHash(userMessage);
  return `${userId || 'anon'}:${mandatorySkillsEnabled ? '1' : '0'}:${semanticHash}`;
}

/**
 * 带缓存的技能路由
 */
export async function getRelevantSkillsContentCached(
  userMessage: string,
  userId?: number,
  mandatorySkillsEnabled: boolean = true
): Promise<{
  content: string;
  matchedSkills: Array<{ id: string; name: string; matchReason?: string }>;
  fromCache: boolean;
}> {
  const cacheKey = generateCacheKey(userMessage, userId, mandatorySkillsEnabled);
  
  // 尝试从缓存获取
  const cached = skillRouteCache.get(cacheKey);
  if (cached) {
    console.log('[SkillRouter] Cache hit:', cacheKey);
    return {
      ...cached,
      fromCache: true
    };
  }
  
  console.log('[SkillRouter] Cache miss, computing:', cacheKey);
  
  // 执行实际的技能匹配
  const startTime = Date.now();
  const result = await getRelevantSkillsContentV2(
    userMessage,
    userId,
    mandatorySkillsEnabled
  );
  const duration = Date.now() - startTime;
  
  console.log(`[SkillRouter] Computed in ${duration}ms`);
  
  // 存入缓存
  const cachedResult: CachedSkillResult = {
    ...result,
    timestamp: Date.now()
  };
  skillRouteCache.set(cacheKey, cachedResult);
  
  return {
    ...result,
    fromCache: false
  };
}

/**
 * 清空缓存（在技能更新时调用）
 */
export function clearSkillRouteCache(): void {
  skillRouteCache.clear();
  console.log('[SkillRouter] Cache cleared');
}

/**
 * 获取缓存统计
 */
export function getSkillRouteCacheStats() {
  return {
    size: skillRouteCache.size,
    max: skillRouteCache.max,
    calculatedSize: skillRouteCache.calculatedSize
  };
}

/**
 * 预热缓存（可选）
 * 在应用启动时预加载常见查询
 */
export async function warmupSkillRouteCache(
  commonQueries: string[],
  userId?: number
): Promise<void> {
  console.log('[SkillRouter] Warming up cache with', commonQueries.length, 'queries');
  
  await Promise.all(
    commonQueries.map(query =>
      getRelevantSkillsContentCached(query, userId, true)
        .catch(err => console.error('[SkillRouter] Warmup failed for:', query, err))
    )
  );
  
  console.log('[SkillRouter] Cache warmup completed');
}

// 常见查询列表（可根据实际使用情况调整）
export const COMMON_QUERIES = [
  '查看设备状态',
  '打开风扇',
  '关闭水泵',
  '查看光谱数据',
  '环境分析',
  '温度控制',
  '湿度调节',
  '光照管理',
  '病害诊断',
  '生长建议',
  '搜索种植技术',
  '天气查询',
  '定时任务',
  '自动化策略'
];
