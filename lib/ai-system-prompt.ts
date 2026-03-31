import { getRelevantSkillsContent, getRelevantSkillsContentForUser } from './ai/skill-router';

/**
 * AI 助手动态系统提示词构建器
 * 
 * 根据用户输入智能选择相关的技能模块，以减少每次请求的 Token 消耗
 */

export const getEnhancedSystemPrompt = async (userMessage: string, basePrompt?: string, userId?: number, mandatorySkillsEnabled: boolean = true) => {
  const now = new Date()
  const timeString = now.toLocaleString('zh-CN', { 
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false 
  })
  const timestamp = now.getTime()

  const dynamicContext = `## 系统状态与时间
- 当前系统时间: ${timeString} (Timestamp: ${timestamp})
- 提示: 基于上述时间计算未来任务逻辑。
`

  // 核心变更：不再直接返回 30k tokens 的静态超长字符串
  const { content: intelligentSkills, matchedSkills } = await getRelevantSkillsContentForUser(userMessage, userId, mandatorySkillsEnabled === true || mandatorySkillsEnabled === undefined);

  return {
    prompt: `${basePrompt || ''}\n\n${dynamicContext}\n\n${intelligentSkills}\n\n${mandatorySkillsEnabled ? "记住：你的目标是帮助用户种植出高品质的草莓，通过智能化管理提高产量和品质。" : ""}`,
    matchedSkills
  }
}
