/**
 * 技能路由器 - 已迁移到新的技能系统
 * 
 * 此文件保留用于向后兼容，实际功能已由新的技能系统提供
 * 新系统位于: lib/ai/skill-system/
 */

import { skillManager } from './skill-system/skill-manager';
import { Skill as NewSkill } from './skill-system/types';

// 保留旧的接口定义以保持兼容性
export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
  keywords: string[];
}

/**
 * @deprecated 使用 skillManager.generatePromptContent 替代
 */
export function getRelevantSkillsContent(
  userMessage: string,
  extraSkills: Skill[] = [],
  mandatorySkillsEnabled: boolean = true
): { content: string; matchedSkills: Skill[] } {
  console.warn('[skill-router] getRelevantSkillsContent is deprecated. Use skillManager instead.');
  
  // 同步调用不再支持，返回空结果
  return {
    content: '',
    matchedSkills: []
  };
}

/**
 * 为用户消息获取相关技能内容（新版本）
 */
export async function getRelevantSkillsContentForUser(
  userMessage: string,
  userId?: number,
  mandatorySkillsEnabled: boolean = true
): Promise<{
  content: string;
  matchedSkills: Skill[];
}> {
  const result = await skillManager.generatePromptContent(
    {
      userMessage,
      userId
    },
    {
      enableBuiltinSkills: mandatorySkillsEnabled,
      enableDiskSkills: mandatorySkillsEnabled,
      enableDatabaseSkills: !!userId,
      userId
    }
  );

  // 转换为旧的接口格式
  return {
    content: result.content,
    matchedSkills: result.matchedSkills.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      content: s.content,
      keywords: s.keywords
    }))
  };
}

// 导出新的技能管理器供直接使用
export { skillManager };
