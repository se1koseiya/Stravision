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
   *
   * 新架构（AI 自路由）下，清单是 AI 决策"加载哪些技能"的唯一依据。
   * 因此每条清单条目必须包含：id、名称、描述、关键词、依赖。
   * 不包含完整 content（content 由 load_skill 工具按需返回）。
   */
  generateSkillManifest(skills: Skill[]): string {
    if (skills.length === 0) return '';

    const skillsBySource = this.groupBySource(skills);
    let manifest = '## 可用的技能模块 (Available Skills)\n\n';
    manifest += '> 以下为技能清单（仅元信息）。若回答需要某技能的完整规范，请调用 `load_skill` 工具按需加载，不要凭清单猜测内容。\n\n';

    for (const [source, sourceSkills] of Object.entries(skillsBySource)) {
      if (sourceSkills.length === 0) continue;

      const sourceLabel = {
        builtin: '核心技能',
        disk: '系统技能',
        database: '用户技能'
      }[source] || source;

      manifest += `### ${sourceLabel}\n`;
      manifest += sourceSkills
        .map(s => {
          // 跳过 autoLoad 技能（已自动注入全文，无需 AI 再加载）
          if (s.autoLoad) {
            return `- **${s.id}** | ${s.name} - ${s.description} | *已自动加载*`;
          }
          const kw = s.keywords && s.keywords.length > 0 ? ` | 关键词: ${s.keywords.join(', ')}` : '';
          const deps = s.dependencies && s.dependencies.length > 0 ? ` | 依赖: ${s.dependencies.join(', ')}` : '';
          return `- **${s.id}** | ${s.name} - ${s.description}${kw}${deps}`;
        })
        .join('\n');
      manifest += '\n\n';
    }

    return manifest;
  }

  /**
   * 生成完整的提示词内容
   *
   * 新架构（AI 自路由 + 工具懒加载）：
   * 1. 仅注入 autoLoad 技能的完整内容（核心身份/UI 标签等）
   * 2. 注入所有技能的精简清单（id/名称/描述/关键词/依赖）
   * 3. 注入路由指令：告知 AI 通过 `load_skill` 工具按需加载技能全文
   *
   * 不再注入匹配到的技能详细内容（旧的"已加载的详细技能模块"段落已移除），
   * 因为技能匹配现在由 AI 自主决策完成。
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

    // autoLoad 技能：始终注入完整内容（核心身份等）
    const autoLoadSkills = allSkills.filter(s => s.autoLoad);

    // 构建提示词
    let content = '';

    // 1. 自动加载的技能（核心身份等）
    if (autoLoadSkills.length > 0) {
      content += autoLoadSkills.map(s => s.content).join('\n\n');
      content += '\n\n';
    }

    // 2. 技能清单（精简元信息，供 AI 决策加载哪些技能）
    content += this.generateSkillManifest(allSkills);

    // 3. AI 自路由指令
    content += '## 技能加载机制 (Skill Loading)\n\n';
    content += '你已获得上述技能清单（仅含元信息）。**不要根据清单条目猜测技能的完整规范**。\n';
    content += '当回答用户问题需要某个技能的详细内容时，请调用 `load_skill` 工具，传入需要的技能 ID 列表，系统会返回对应技能的完整内容。\n';
    content += '调用建议：\n';
    content += '- 一次可请求多个技能 ID（并行加载，减少往返）\n';
    content += '- 若技能有 `依赖`，请一并加载依赖技能\n';
    content += '- 若清单中某技能的描述已足以回答，则无需加载（节省时间）\n';
    content += '- 已自动加载（*已自动加载* 标记）的技能无需再调用 load_skill\n\n';

    // 返回的 matchedSkills 仅包含 autoLoad 技能（用于日志/可观测性）
    return {
      content,
      matchedSkills: autoLoadSkills,
      allSkills
    };
  }

  /**
   * 按 ID 批量获取技能完整内容（供 load_skill 工具调用）
   *
   * @param skillIds 要加载的技能 ID 列表
   * @param userId 当前用户 ID（用于加载用户级数据库技能）
   * @returns 找到的技能列表（未找到的 ID 在 missingIds 中返回）
   */
  async getSkillsByIds(skillIds: string[], userId?: number): Promise<{
    found: Skill[];
    missingIds: string[];
  }> {
    if (!skillIds || skillIds.length === 0) {
      return { found: [], missingIds: [] };
    }

    const allSkills = await this.getAllSkills({
      enableBuiltinSkills: true,
      enableDiskSkills: true,
      enableDatabaseSkills: !!userId,
      userId
    });

    const found: Skill[] = [];
    const missingIds: string[] = [];
    const seenIds = new Set<string>();

    for (const id of skillIds) {
      if (seenIds.has(id)) continue; // 去重
      seenIds.add(id);

      const skill = allSkills.find(s => s.id === id);
      if (skill) {
        found.push(skill);
      } else {
        missingIds.push(id);
      }
    }

    return { found, missingIds };
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
