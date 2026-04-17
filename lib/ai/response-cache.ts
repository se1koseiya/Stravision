/**
 * AI响应缓存系统
 * 
 * 缓存常见查询的AI响应，大幅提升重复查询的速度
 * 预期性能提升：重复查询从5-8秒降低到100-200ms
 */

import { LRUCache } from 'lru-cache';

interface CachedResponse {
  content: string;
  citations?: any[];
  reasoning?: any;
  tasks?: any[];
  model?: string;
  timestamp: number;
}

// 创建响应缓存
const responseCache = new LRUCache<string, CachedResponse>({
  max: 100, // 最多缓存100个响应
  ttl: 1000 * 60 * 30, // 30分钟过期
  updateAgeOnGet: true,
  updateAgeOnHas: false
});

/**
 * 生成缓存键
 * 基于用户消息、模型和设备状态生成唯一键
 */
function generateCacheKey(
  userMessage: string,
  model: string,
  deviceStatus?: any
): string {
  // 提取关键词
  const keywords = userMessage.toLowerCase()
    .match(/[\u4e00-\u9fa5]{2,}|[a-z]{3,}/g) || [];
  
  const keywordHash = keywords.slice(0, 8).sort().join('-');
  
  // 如果查询涉及设备状态，包含设备状态的哈希
  const needsDeviceState = /设备|状态|温度|湿度|环境|传感器/.test(userMessage);
  
  if (needsDeviceState && deviceStatus) {
    const deviceHash = `${deviceStatus.temperature || 0}-${deviceStatus.humidity || 0}`;
    return `${model}:${keywordHash}:${deviceHash}`;
  }
  
  return `${model}:${keywordHash}`;
}

/**
 * 检查是否应该缓存此查询
 * 
 * 可缓存的查询类型：
 * - 设备状态查询
 * - 环境数据查询
 * - 常见问题
 * - 知识查询
 * 
 * 不可缓存的查询类型：
 * - 包含时间敏感信息
 * - 需要实时数据
 * - 控制命令
 */
function shouldCacheQuery(userMessage: string): boolean {
  const lowerMsg = userMessage.toLowerCase();
  
  // 不缓存控制命令
  const controlKeywords = ['打开', '关闭', '开启', '启动', '停止', '调节', '设置'];
  if (controlKeywords.some(k => lowerMsg.includes(k))) {
    return false;
  }
  
  // 不缓存时间敏感查询
  const timeKeywords = ['现在', '当前', '最新', '实时', '刚才', '今天'];
  if (timeKeywords.some(k => lowerMsg.includes(k))) {
    return false;
  }
  
  // 可缓存的查询类型
  const cacheableKeywords = [
    '什么是', '如何', '怎么', '为什么', '介绍', '说明',
    '查看', '显示', '状态', '数据', '信息'
  ];
  
  return cacheableKeywords.some(k => lowerMsg.includes(k));
}

/**
 * 获取缓存的响应
 */
export function getCachedResponse(
  userMessage: string,
  model: string,
  deviceStatus?: any
): CachedResponse | null {
  if (!shouldCacheQuery(userMessage)) {
    return null;
  }
  
  const cacheKey = generateCacheKey(userMessage, model, deviceStatus);
  const cached = responseCache.get(cacheKey);
  
  if (cached) {
    console.log('[ResponseCache] ✅ Cache hit:', cacheKey);
    return cached;
  }
  
  console.log('[ResponseCache] Cache miss:', cacheKey);
  return null;
}

/**
 * 缓存响应
 */
export function cacheResponse(
  userMessage: string,
  model: string,
  response: Omit<CachedResponse, 'timestamp'>,
  deviceStatus?: any
): void {
  if (!shouldCacheQuery(userMessage)) {
    return;
  }
  
  const cacheKey = generateCacheKey(userMessage, model, deviceStatus);
  
  const cachedResponse: CachedResponse = {
    ...response,
    timestamp: Date.now()
  };
  
  responseCache.set(cacheKey, cachedResponse);
  console.log('[ResponseCache] Cached response:', cacheKey);
}

/**
 * 清空缓存
 */
export function clearResponseCache(): void {
  responseCache.clear();
  console.log('[ResponseCache] Cache cleared');
}

/**
 * 获取缓存统计
 */
export function getResponseCacheStats() {
  return {
    size: responseCache.size,
    max: responseCache.max,
    calculatedSize: responseCache.calculatedSize
  };
}

/**
 * 预热缓存（可选）
 * 在应用启动时预加载常见查询的响应
 */
export async function warmupResponseCache(
  commonQueries: Array<{
    message: string;
    model: string;
    response: Omit<CachedResponse, 'timestamp'>;
  }>
): Promise<void> {
  console.log('[ResponseCache] Warming up cache with', commonQueries.length, 'queries');
  
  for (const query of commonQueries) {
    cacheResponse(query.message, query.model, query.response);
  }
  
  console.log('[ResponseCache] Cache warmup completed');
}

// 常见查询列表（可根据实际使用情况调整）
export const COMMON_QUERIES = [
  '查看设备状态',
  '显示环境数据',
  '什么是NDVI',
  '如何种植草莓',
  '温室管理要点',
  '病害防治方法',
  '光谱数据说明',
  '设备控制说明'
];
