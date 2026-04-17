/**
 * 技能系统类型定义
 */

export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  priority?: number; // 优先级，数字越大越优先
  dependencies?: string[]; // 依赖的其他技能 ID
  autoLoad?: boolean; // 是否自动加载（不需要关键词匹配）
}

export interface Skill extends SkillMetadata {
  content: string;
  source: 'disk' | 'database' | 'builtin'; // 技能来源
}

export interface SkillMatchContext {
  userMessage: string;
  userId?: number;
  sessionContext?: Record<string, any>; // 会话上下文
}

export interface SkillMatchResult {
  skill: Skill;
  matchScore: number; // 匹配分数 0-100
  matchReason: string; // 匹配原因
}

export interface SkillLoaderOptions {
  enableDiskSkills?: boolean;
  enableDatabaseSkills?: boolean;
  enableBuiltinSkills?: boolean;
  userId?: number;
}
