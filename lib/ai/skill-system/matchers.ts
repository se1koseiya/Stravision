/**
 * 技能匹配器 - 负责根据用户输入匹配相关技能
 */

import { Skill, SkillMatchContext, SkillMatchResult } from './types';

/**
 * 关键词匹配器
 */
export class KeywordMatcher {
  match(skill: Skill, context: SkillMatchContext): SkillMatchResult | null {
    const query = context.userMessage.toLowerCase().trim();
    let maxScore = 0;
    let matchReason = '';

    // 1. 精确关键词匹配
    for (const keyword of skill.keywords) {
      const kw = keyword.toLowerCase();
      
      // 短关键词（1-2字）需要更严格的上下文匹配
      if (kw.length <= 2) {
        const contextPatterns = this.getContextPatterns(kw);
        if (contextPatterns.some(pattern => pattern.test(query))) {
          maxScore = Math.max(maxScore, 90);
          matchReason = `精确匹配关键词: ${keyword}（含上下文）`;
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

    return maxScore > 0 ? { skill, matchScore: maxScore, matchReason } : null;
  }

  /**
   * 为短关键词生成上下文匹配模式
   */
  private getContextPatterns(keyword: string): RegExp[] {
    const patterns: RegExp[] = [];
    
    if (keyword === '开' || keyword === '关') {
      // 必须同时包含动作词和设备词
      patterns.push(
        /[开关启停][启闭动].*[设灯泵扇备]/,
        /[设灯泵扇备].*[开关启停]/
      );
    }
    
    return patterns;
  }
}

/**
 * 意图匹配器 - 基于语义意图匹配
 */
export class IntentMatcher {
  private intentRules: Map<string, { pattern: RegExp; skillIds: string[]; score: number }[]>;

  constructor() {
    this.intentRules = new Map([
      ['control', [
        { pattern: /控制|指令|操作|设备|水泵|风扇|灯|开启|关闭|打开/, skillIds: ['iot-control'], score: 85 }
      ]],
      ['planning', [
        { pattern: /帮我|办|建议|优化|计划|怎么|如何|设置|调控/, skillIds: ['implementation-workflow'], score: 80 }
      ]],
      ['inspection', [
        { pattern: /看|监控|截图|拍摄|巡检|画面|观察|分析植株/, skillIds: ['iot-control'], score: 85 }
      ]],
      ['automation', [
        { pattern: /自动化|策略|规则|联动|自动控制|条件触发|工作流/, skillIds: ['implementation-workflow'], score: 90 }
      ]]
    ]);
  }

  match(skill: Skill, context: SkillMatchContext): SkillMatchResult | null {
    const query = context.userMessage.toLowerCase();
    
    for (const [intent, rules] of this.intentRules) {
      for (const rule of rules) {
        if (rule.pattern.test(query) && rule.skillIds.includes(skill.id)) {
          return {
            skill,
            matchScore: rule.score,
            matchReason: `匹配意图: ${intent}`
          };
        }
      }
    }

    return null;
  }
}

/**
 * 依赖匹配器 - 处理技能依赖关系
 */
export class DependencyMatcher {
  match(skill: Skill, matchedSkills: Skill[]): boolean {
    if (!skill.dependencies || skill.dependencies.length === 0) {
      return false;
    }

    // 检查是否有依赖的技能已被匹配
    return skill.dependencies.some(depId => 
      matchedSkills.some(s => s.id === depId)
    );
  }
}

/**
 * 组合匹配器 - 整合所有匹配策略
 */
export class SkillMatcher {
  private keywordMatcher = new KeywordMatcher();
  private intentMatcher = new IntentMatcher();
  private dependencyMatcher = new DependencyMatcher();

  matchSkills(skills: Skill[], context: SkillMatchContext): SkillMatchResult[] {
    const results: SkillMatchResult[] = [];
    const matchedSkills: Skill[] = [];

    // 第一轮：关键词和意图匹配
    for (const skill of skills) {
      // 自动加载的技能直接添加
      if (skill.autoLoad) {
        results.push({
          skill,
          matchScore: 100,
          matchReason: '自动加载技能'
        });
        matchedSkills.push(skill);
        continue;
      }

      // 关键词匹配
      const keywordMatch = this.keywordMatcher.match(skill, context);
      if (keywordMatch) {
        results.push(keywordMatch);
        matchedSkills.push(skill);
        continue;
      }

      // 意图匹配
      const intentMatch = this.intentMatcher.match(skill, context);
      if (intentMatch) {
        results.push(intentMatch);
        matchedSkills.push(skill);
      }
    }

    // 第二轮：依赖匹配
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

    // 按优先级和匹配分数排序
    return results.sort((a, b) => {
      const priorityDiff = (b.skill.priority || 0) - (a.skill.priority || 0);
      return priorityDiff !== 0 ? priorityDiff : b.matchScore - a.matchScore;
    });
  }
}
