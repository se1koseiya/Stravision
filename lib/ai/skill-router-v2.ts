/**
 * 技能路由器 V2 - 使用新的技能系统
 * 
 * 这是新版本的技能路由器，使用模块化的技能系统架构。
 * 保留此文件以便逐步迁移，完成后可替换旧的 skill-router.ts
 */

import { skillManager } from './skill-system/skill-manager';
import { SkillMatchContext } from './skill-system/types';

/**
 * 为用户消息获取相关技能内容（新版本）
 */
export async function getRelevantSkillsContentV2(
  userMessage: string,
  userId?: number,
  mandatorySkillsEnabled: boolean = true
): Promise<{
  content: string;
  matchedSkills: Array<{ id: string; name: string; matchReason?: string }>;
}> {
  const context: SkillMatchContext = {
    userMessage,
    userId
  };

  const result = await skillManager.generatePromptContent(context, {
    enableBuiltinSkills: mandatorySkillsEnabled,
    enableDiskSkills: mandatorySkillsEnabled,
    enableDatabaseSkills: !!userId,
    userId
  });

  return {
    content: result.content,
    matchedSkills: result.matchedSkills.map(s => ({
      id: s.id,
      name: s.name,
      matchReason: result.matchedSkills.find(ms => ms.id === s.id)?.description
    }))
  };
}

/**
 * 兼容旧接口的包装函数
 */
export async function getRelevantSkillsContentForUser(
  userMessage: string,
  userId?: number,
  mandatorySkillsEnabled: boolean = true
): Promise<{
  content: string;
  matchedSkills: Array<{ id: string; name: string }>;
}> {
  return getRelevantSkillsContentV2(userMessage, userId, mandatorySkillsEnabled);
}
