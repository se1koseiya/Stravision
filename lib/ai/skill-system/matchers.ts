/**
 * 技能匹配器
 *
 * 架构变更（AI 自路由）：
 * - 已移除 IntentMatcher 和 12 条写死的 INTENT_RULES 正则规则（mock 路由）
 * - 已移除 SkillMatcher 中的意图匹配与关键词预筛分支
 * - 技能选择现在由 AI 自主决策：AI 读取技能清单 → 调用 load_skill 工具加载详情
 * - 本文件保留 KeywordMatcher / DependencyMatcher 仅供其他场景（如测试、显式调用）使用
 *   SkillManager.generatePromptContent 不再依赖 SkillMatcher
 */

import { Skill, SkillMatchContext, SkillMatchResult } from './types';

// ─── 通用工具 ────────────────────────────────────────────

/** 最低匹配阈值：低于此分数的匹配结果将被丢弃，避免噪音 */
const MIN_MATCH_SCORE = 60;

// ─── KeywordMatcher ──────────────────────────────────────

/**
 * 关键词匹配器（保留供显式调用，新架构默认不走此路径）
 *
 * 说明：AI 自路由后，技能匹配由 LLM 基于清单决策，
 * 此匹配器仅用于：
 * 1. 兼容旧测试
 * 2. 后续若需"廉价的快速预筛"场景可复用
 */
export class KeywordMatcher {
  match(skill: Skill, context: SkillMatchContext): SkillMatchResult | null {
    const query = context.userMessage.toLowerCase().trim();
    let maxScore = 0;
    let matchReason = '';

    // 1. 精确关键词匹配
    for (const keyword of skill.keywords) {
      const kw = keyword.toLowerCase();

      // 短关键词（1-2字）需要更严格的上下文匹配，避免子串误匹配
      // 例："开" 不应匹配 "开心"、"开会"
      if (kw.length <= 2) {
        const contextPatterns = this.getContextPatterns(kw);
        if (contextPatterns.length > 0) {
          // 有上下文模式：用模式匹配
          if (contextPatterns.some(pattern => pattern.test(query))) {
            maxScore = Math.max(maxScore, 90);
            matchReason = `精确匹配关键词: ${keyword}（含上下文）`;
          }
        } else if (kw.length === 1) {
          // 单字关键词且有匹配，直接跳过（无上下文模式 = 无法可靠匹配）
          continue;
        }
        // 2字关键词：直接 includes 匹配（如 "开关"、"水泵"）
        else if (query.includes(kw)) {
          maxScore = Math.max(maxScore, 85);
          matchReason = `匹配关键词: ${keyword}`;
        }
      } else {
        // 长关键词直接匹配
        if (query.includes(kw)) {
          maxScore = Math.max(maxScore, 85);
          matchReason = `匹配关键词: ${keyword}`;
        }
      }
    }

    // 2. 模糊匹配（描述）
    if (query.length > 3 && skill.description.toLowerCase().includes(query)) {
      maxScore = Math.max(maxScore, 70);
      matchReason = matchReason || `匹配技能描述`;
    }

    // 3. ID 匹配
    if (query.includes(skill.id.toLowerCase())) {
      maxScore = Math.max(maxScore, 95);
      matchReason = `匹配技能 ID: ${skill.id}`;
    }

    return maxScore >= MIN_MATCH_SCORE ? { skill, matchScore: maxScore, matchReason } : null;
  }

  /**
   * 为短关键词生成上下文匹配模式
   * 确保短词只在有明确动作/设备上下文时才匹配
   */
  private getContextPatterns(keyword: string): RegExp[] {
    const patterns: RegExp[] = [];

    // 动作词 + 设备词的组合模式
    if (keyword === '开' || keyword === '关') {
      patterns.push(
        /[开关][启闭停动]/,            // 开启、关闭、开关
        /[开关启停].*[设灯泵扇备机水]/,  // 开...水泵
        /[设灯泵扇备机水].*[开关启停]/   // 水泵...开
      );
    }

    return patterns;
  }
}

// ─── DependencyMatcher ───────────────────────────────────

/**
 * 依赖匹配器 - 处理技能依赖关系
 * 双向依赖加载：
 *   1. 如果 skill A 依赖 skill B，且 A 已匹配 → 加载 B（被依赖项）
 *   2. 如果 skill A 依赖 skill B，且 B 已匹配 → 加载 A（依赖方）
 *
 * 说明：新架构下依赖关系已在清单中标注，AI 调用 load_skill 时会一并加载。
 * 此匹配器仅供 matchSkills 显式调用时使用。
 */
export class DependencyMatcher {
  match(skill: Skill, matchedSkills: Skill[]): boolean {
    // 情况 1：当前 skill 的 dependencies 中有已被匹配的技能 → 加载当前 skill
    if (skill.dependencies && skill.dependencies.length > 0) {
      if (skill.dependencies.some(depId => matchedSkills.some(s => s.id === depId))) {
        return true;
      }
    }

    // 情况 2：已匹配的技能的 dependencies 中包含当前 skill → 加载当前 skill（被依赖项）
    if (matchedSkills.some(matched =>
      matched.dependencies && matched.dependencies.includes(skill.id)
    )) {
      return true;
    }

    return false;
  }
}

// ─── SkillMatcher ────────────────────────────────────────

/**
 * 组合匹配器
 *
 * 新架构（AI 自路由）下，SkillManager.generatePromptContent 不再调用 matchSkills，
 * 技能选择完全交给 AI + load_skill 工具。
 *
 * 本类保留供 matchSkills 接口的显式调用方使用（如测试、调试工具）。
 * 行为：仅自动加载 autoLoad 技能，不再做意图/关键词匹配。
 */
export class SkillMatcher {
  private keywordMatcher = new KeywordMatcher();
  private dependencyMatcher = new DependencyMatcher();

  matchSkills(skills: Skill[], context: SkillMatchContext): SkillMatchResult[] {
    const results: SkillMatchResult[] = [];
    const matchedSkills: Skill[] = [];

    // 第一轮：仅 autoLoad 直接通过（不再做意图匹配）
    for (const skill of skills) {
      if (skill.autoLoad) {
        results.push({
          skill,
          matchScore: 100,
          matchReason: '自动加载技能'
        });
        matchedSkills.push(skill);
      }
    }

    // 第二轮：依赖匹配（autoLoad 技能的依赖也被加载）
    for (const skill of skills) {
      if (matchedSkills.includes(skill)) continue;

      if (this.dependencyMatcher.match(skill, matchedSkills)) {
        results.push({
          skill,
          matchScore: 75,
          matchReason: '依赖技能自动加载'
        });
        matchedSkills.push(skill);
      }
    }

    // 按优先级排序
    return results.sort((a, b) => {
      const priorityDiff = (b.skill.priority || 0) - (a.skill.priority || 0);
      return priorityDiff !== 0 ? priorityDiff : b.matchScore - a.matchScore;
    });
  }

  /**
   * 兼容旧接口：基于关键词匹配（供显式调用，新架构默认不走）
   */
  matchByKeyword(skills: Skill[], context: SkillMatchContext): SkillMatchResult[] {
    const results: SkillMatchResult[] = [];
    for (const skill of skills) {
      if (skill.autoLoad) {
        results.push({ skill, matchScore: 100, matchReason: '自动加载技能' });
        continue;
      }
      const m = this.keywordMatcher.match(skill, context);
      if (m) results.push(m);
    }
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }
}
