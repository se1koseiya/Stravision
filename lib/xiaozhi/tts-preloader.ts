/**
 * TTS 预加载和缓存系统
 * 
 * 提供音频预加载、缓存和流畅播放功能
 */

export interface TTSCacheEntry {
  text: string;
  audioUrl: string;
  audioBuffer?: AudioBuffer;
  timestamp: number;
  useCount: number;
}

export interface TTSPreloaderConfig {
  maxCacheSize: number; // 最大缓存数量
  maxCacheAge: number; // 最大缓存时间（毫秒）
  enablePreload: boolean; // 是否启用预加载
  preloadCommonPhrases: boolean; // 是否预加载常用短语
}

export const DEFAULT_TTS_CONFIG: TTSPreloaderConfig = {
  maxCacheSize: 50,
  maxCacheAge: 30 * 60 * 1000, // 30分钟
  enablePreload: true,
  preloadCommonPhrases: true
};

/**
 * 常用短语列表
 */
const COMMON_PHRASES = [
  '好的',
  '明白了',
  '正在处理',
  '请稍等',
  '已完成',
  '操作成功',
  '操作失败',
  '温度正常',
  '湿度正常',
  '设备已开启',
  '设备已关闭',
  '有什么可以帮您？',
  '还需要其他帮助吗？',
  '再见',
  '欢迎使用',
];

/**
 * TTS 预加载器
 */
export class TTSPreloader {
  private cache: Map<string, TTSCacheEntry>;
  private config: TTSPreloaderConfig;
  private audioContext?: AudioContext;
  private preloadQueue: string[];
  private isPreloading: boolean;
  
  constructor(config: Partial<TTSPreloaderConfig> = {}) {
    this.config = { ...DEFAULT_TTS_CONFIG, ...config };
    this.cache = new Map();
    this.preloadQueue = [];
    this.isPreloading = false;
    
    // 初始化 AudioContext
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new AudioContext();
    }
    
    // 预加载常用短语
    if (this.config.preloadCommonPhrases) {
      this.preloadCommonPhrases();
    }
  }
  
  /**
   * 预加载常用短语
   */
  private async preloadCommonPhrases(): Promise<void> {
    console.log('[TTSPreloader] Preloading common phrases...');
    
    for (const phrase of COMMON_PHRASES) {
      this.preloadQueue.push(phrase);
    }
    
    this.processPreloadQueue();
  }
  
  /**
   * 处理预加载队列
   */
  private async processPreloadQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return;
    }
    
    this.isPreloading = true;
    
    while (this.preloadQueue.length > 0) {
      const text = this.preloadQueue.shift();
      if (text && !this.cache.has(text)) {
        try {
          await this.preload(text);
          // 延迟一下，避免请求过快
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`[TTSPreloader] Failed to preload: ${text}`, error);
        }
      }
    }
    
    this.isPreloading = false;
  }
  
  /**
   * 预加载单个文本
   */
  async preload(text: string): Promise<void> {
    if (this.cache.has(text)) {
      console.log(`[TTSPreloader] Already cached: ${text}`);
      return;
    }
    
    try {
      // 这里需要调用实际的 TTS API
      // 暂时使用模拟数据
      const audioUrl = await this.fetchTTS(text);
      
      const entry: TTSCacheEntry = {
        text,
        audioUrl,
        timestamp: Date.now(),
        useCount: 0
      };
      
      // 如果启用了 AudioContext，预解码音频
      if (this.audioContext && this.config.enablePreload) {
        try {
          const response = await fetch(audioUrl);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
          entry.audioBuffer = audioBuffer;
        } catch (error) {
          console.warn('[TTSPreloader] Failed to decode audio:', error);
        }
      }
      
      this.cache.set(text, entry);
      console.log(`[TTSPreloader] Cached: ${text}`);
      
      // 清理过期缓存
      this.cleanupCache();
    } catch (error) {
      console.error(`[TTSPreloader] Failed to preload: ${text}`, error);
      throw error;
    }
  }
  
  /**
   * 获取缓存的音频
   */
  async get(text: string): Promise<TTSCacheEntry | null> {
    const entry = this.cache.get(text);
    
    if (entry) {
      // 更新使用计数和时间戳
      entry.useCount++;
      entry.timestamp = Date.now();
      
      console.log(`[TTSPreloader] Cache hit: ${text} (use count: ${entry.useCount})`);
      return entry;
    }
    
    console.log(`[TTSPreloader] Cache miss: ${text}`);
    return null;
  }
  
  /**
   * 播放音频（从缓存或实时获取）
   */
  async play(text: string): Promise<void> {
    let entry = await this.get(text);
    
    if (!entry) {
      // 缓存未命中，实时获取
      await this.preload(text);
      entry = await this.get(text);
    }
    
    if (!entry) {
      throw new Error('Failed to get TTS audio');
    }
    
    // 播放音频
    if (entry.audioBuffer && this.audioContext) {
      // 使用 AudioBuffer 播放（更流畅）
      const source = this.audioContext.createBufferSource();
      source.buffer = entry.audioBuffer;
      source.connect(this.audioContext.destination);
      source.start(0);
    } else {
      // 使用 URL 播放
      const audio = new Audio(entry.audioUrl);
      await audio.play();
    }
  }
  
  /**
   * 批量预加载
   */
  async preloadBatch(texts: string[]): Promise<void> {
    console.log(`[TTSPreloader] Preloading batch of ${texts.length} texts...`);
    
    for (const text of texts) {
      if (!this.cache.has(text)) {
        this.preloadQueue.push(text);
      }
    }
    
    this.processPreloadQueue();
  }
  
  /**
   * 清理过期缓存
   */
  private cleanupCache(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];
    
    // 1. 删除过期的条目
    for (const [text, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.maxCacheAge) {
        entriesToDelete.push(text);
      }
    }
    
    // 2. 如果缓存过大，删除最少使用的条目
    if (this.cache.size > this.config.maxCacheSize) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].useCount - b[1].useCount);
      
      const deleteCount = this.cache.size - this.config.maxCacheSize;
      for (let i = 0; i < deleteCount; i++) {
        entriesToDelete.push(entries[i][0]);
      }
    }
    
    // 执行删除
    for (const text of entriesToDelete) {
      this.cache.delete(text);
      console.log(`[TTSPreloader] Removed from cache: ${text}`);
    }
    
    if (entriesToDelete.length > 0) {
      console.log(`[TTSPreloader] Cleaned up ${entriesToDelete.length} entries`);
    }
  }
  
  /**
   * 获取缓存统计
   */
  getStats(): {
    cacheSize: number;
    totalUseCount: number;
    mostUsed: Array<{ text: string; useCount: number }>;
  } {
    const entries = Array.from(this.cache.values());
    const totalUseCount = entries.reduce((sum, entry) => sum + entry.useCount, 0);
    
    const mostUsed = Array.from(this.cache.entries())
      .sort((a, b) => b[1].useCount - a[1].useCount)
      .slice(0, 5)
      .map(([text, entry]) => ({ text, useCount: entry.useCount }));
    
    return {
      cacheSize: this.cache.size,
      totalUseCount,
      mostUsed
    };
  }
  
  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    console.log('[TTSPreloader] Cache cleared');
  }
  
  /**
   * 获取 TTS 音频（需要实现实际的 API 调用）
   */
  private async fetchTTS(text: string): Promise<string> {
    // TODO: 实现实际的 TTS API 调用
    // 这里返回模拟的 URL
    return `data:audio/wav;base64,${btoa(text)}`;
  }
}

/**
 * 创建 TTS 预加载器实例
 */
export function createTTSPreloader(config?: Partial<TTSPreloaderConfig>): TTSPreloader {
  return new TTSPreloader(config);
}

/**
 * 全局 TTS 预加载器实例
 */
let globalPreloader: TTSPreloader | null = null;

/**
 * 获取全局 TTS 预加载器
 */
export function getGlobalTTSPreloader(): TTSPreloader {
  if (!globalPreloader) {
    globalPreloader = createTTSPreloader();
  }
  return globalPreloader;
}
