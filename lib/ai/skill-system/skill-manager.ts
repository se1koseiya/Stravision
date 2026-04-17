/**
 * 技能管理器 - 统一的技能管理接口
 */

import { Skill, SkillMatchContext, SkillMatchResult, SkillLoaderOptions } from './types';
import { SkillLoader } from './loaders';
import { SkillMatcher } from './matchers';

export class SkillManager {
  private loader = new SkillLoader();
  private matcher = new SkillMatcher();
  private skillCache: Map<string, Skill[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 获取所有可用技能
   */
  async getAllSkills(options: SkillLoaderOptions = {}): Promise<Skill[]> {
    const cacheKey = this.getCacheKey(options);
    const now = Date.now();

    // 检查缓存
    if (this.skillCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey);
      if (expiry && expiry > now) {
        return this.skillCache.get(cacheKey)!;
      }
    }

    // 加载技能
    const skills = await this.loader.loadAll(options);
    
    // 更新缓存
    this.skillCache.set(cacheKey, skills);
    this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL);

    return skills;
  }

  /**
   * 根据用户消息匹配相关技能
   */
  async matchSkills(context: SkillMatchContext, options: SkillLoaderOptions = {}): Promise<SkillMatchResult[]> {
    const allSkills = await this.getAllSkills({
      ...options,
      userId: context.userId
    });

    return this.matcher.matchSkills(allSkills, context);
  }

  /**
   * 生成技能清单（用于提示词）
   */
  generateSkillManifest(skills: Skill[]): string {
    if (skills.length === 0) return '';

    const skillsBySource = this.groupBySource(skills);
    let manifest = '## 可用的技能模块 (Available Skills)\n\n';

    for (const [source, sourceSkills] of Object.entries(skillsBySource)) {
      if (sourceSkills.length === 0) continue;
      
      const sourceLabel = {
        builtin: '核心技能',
        disk: '系统技能',
        database: '用户技能'
      }[source] || source;

      manifest += `### ${sourceLabel}\n`;
      manifest += sourceSkills
        .map(s => `- **${s.id}**: ${s.name} - ${s.description}`)
        .join('\n');
      manifest += '\n\n';
    }

    return manifest;
  }

  /**
   * 生成完整的提示词内容
   */
  async generatePromptContent(context: SkillMatchContext, options: SkillLoaderOptions = {}): Promise<{
    content: string;
    matchedSkills: Skill[];
    allSkills: Skill[];
  }> {
    const allSkills = await this.getAllSkills({
      ...options,
      userId: context.userId
    });

    const matchResults = this.matcher.matchSkills(allSkills, context);
    const matchedSkills = matchResults.map(r => r.skill);

    // 构建提示词
    let content = '';

    // 1. 自动加载的技能（核心身份等）
    const autoLoadSkills = matchedSkills.filter(s => s.autoLoad);
    if (autoLoadSkills.length > 0) {
      content += autoLoadSkills.map(s => s.content).join('\n\n');
      content += '\n\n';
    }

    // 2. 技能清单
    content += this.generateSkillManifest(allSkills);

    // 3. 匹配到的技能详细内容
    const detailedSkills = matchedSkills.filter(s => !s.autoLoad);
    if (detailedSkills.length > 0) {
      content += '## 当前已加载的详细技能模块 (Activated Skills)\n\n';
      content += '根据你的问题，以下技能已被激活：\n\n';
      
      for (const result of matchResults.filter(r => !r.skill.autoLoad)) {
        content += `### 技能: ${result.skill.name} (${result.skill.id})\n`;
        content += `*匹配原因: ${result.matchReason} (分数: ${result.matchScore})*\n\n`;
        content += result.skill.content;
        content += '\n\n---\n\n';
      }
    }

    return {
      content,
      matchedSkills,
      allSkills
    };
  }

  /**
   * 清除缓存
   */
  clearCache(userId?: number): void {
    if (userId) {
      // 清除特定用户的缓存
      for (const key of this.skillCache.keys()) {
        if (key.includes(`userId:${userId}`)) {
          this.skillCache.delete(key);
          this.cacheExpiry.delete(key);
        }
      }
    } else {
      // 清除所有缓存
      this.skillCache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * 按来源分组技能
   */
  private groupBySource(skills: Skill[]): Record<string, Skill[]> {
    return skills.reduce((acc, skill) => {
      if (!acc[skill.source]) acc[skill.source] = [];
      acc[skill.source].push(skill);
      return acc;
    }, {} as Record<string, Skill[]>);
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(options: SkillLoaderOptions): string {
    const parts = [
      options.enableBuiltinSkills !== false ? 'builtin' : '',
      options.enableDiskSkills !== false ? 'disk' : '',
      options.enableDatabaseSkills !== false ? 'db' : '',
      options.userId ? `userId:${options.userId}` : ''
    ].filter(Boolean);
    
    return parts.join('_');
  }
}

// 导出单例
export const skillManager = new SkillManager();
