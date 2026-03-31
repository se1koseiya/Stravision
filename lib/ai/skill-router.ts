import { loadSkillsFromDisk, getSkillManifest, Skill } from './skill-loader';
import { getUserInstalledSkills } from '../db/skill-store-service';

const CORE_IDENTITY = `你是“莓小智”，是“莓界智慧农业平台”的**智能体 (Agent)**。
你的核心职责是**主动管理**大棚环境，通过感知、思考、决策、行动的闭环流程，帮助农场主实现精准种植。
## 你的角色设定
- **名字**：莓小智
- **身份**：大棚智能管家 / 农业智能体 (Agent)
- **性格**：主动、严谨、负责、贴心。
- **语气**：自信且专业，像一位资深的农业专家在现场指导。执行操作时清晰明确，注重安全。`;

const UI_TAGS_GUIDE = `## 交互 UI 标签指南
- <DEVICE_BENTO>: 展示环境概况。
- <CONTROL_BENTO>: 展示设备控制面板。
- <SPECTRAL>: 展示光谱分析图。
- <SCHEDULED_TASKS>: 展示/管理定时任务。
- <MONITOR>: 展示实时直播流。`;

export function getRelevantSkillsContent(userMessage: string, extraSkills: Skill[] = [], mandatorySkillsEnabled: boolean = true): { content: string, matchedSkills: Skill[] } {
  const query = userMessage.toLowerCase().trim();
  
  // 1. 合并磁盘技能和额外技能 (例如数据库中的技能)
  const allSkills: Skill[] = [
    ...(mandatorySkillsEnabled ? loadSkillsFromDisk() : []),
    ...extraSkills
  ];
  
  // 2. 基础必备：核心身份、UI 标签指南、技能清单
  const identity = mandatorySkillsEnabled ? CORE_IDENTITY : "你是一个通用的 AI 编程与生活助手。";
  let content = identity + '\n\n' + UI_TAGS_GUIDE + '\n\n' + getSkillManifest(allSkills);

  // 3. 意图智能匹配（针对中文和英文进行优化）
  const matchedSkills: Skill[] = allSkills.filter(skill => {
    // 检查关键字：支持完整包含或作为独立词丛
    const hasKeyword = skill.keywords.some(k => {
      const kw = k.toLowerCase();
      // 对于短关键词（如"关"、"开"），需要更精确或包含在相关上下文中
      if (kw.length === 1) {
        return query.includes(kw) && (query.includes('设备') || query.includes('灯') || query.includes('泵') || query.includes('风扇'));
      }
      return query.includes(kw);
    });

    // 检查描述
    const hasDescMatch = query.length > 3 && skill.description.toLowerCase().includes(query);
    
    // 检查 ID
    const hasIdMatch = query.includes(skill.id.toLowerCase());
    
    return hasKeyword || hasDescMatch || hasIdMatch;
  });

  // 4. 特殊意图：任务规划 & 实施流程 (强制包含规则)
  const needsImplementation = /帮我|办|建议|优化|计划|控制|检查|怎么|如何|设置|调控/.test(query);
  if (needsImplementation && !matchedSkills.find(s => s.id === 'implementation-workflow')) {
     const planning = allSkills.find(s => s.id === 'implementation-workflow');
     if (planning) matchedSkills.push(planning);
  }

  // 5. 所有的控制/设备/序号相关词汇都应该强制触发 iot-control
  const isControlQuery = /控制|指令|操作|序号|编号|设备|水泵|风扇|灯|巡检|摄像头/.test(query);
  if (isControlQuery && !matchedSkills.find(s => s.id === 'iot-control')) {
     const iot = allSkills.find(s => s.id === 'iot-control');
     if (iot) matchedSkills.push(iot);
  }

  // 去重
  const uniqueMatchedSkills = Array.from(new Set(matchedSkills.map(s => s.id)))
    .map(id => matchedSkills.find(s => s.id === id))
    .filter((s): s is Skill => !!s);

  // 6. 将匹配到的技能正文注入提示词
  if (uniqueMatchedSkills.length > 0) {
    content += '\n\n## 当前已加载的详细技能模块内容 (Activated Skills Content)\n' + uniqueMatchedSkills.map(s => {
        return `### 技能: ${s.name} (${s.id})\n${s.content}`;
    }).join('\n\n---\n\n');
  }

  return { content, matchedSkills: uniqueMatchedSkills };
}

export async function getRelevantSkillsContentForUser(userMessage: string, userId?: number, mandatorySkillsEnabled: boolean = true): Promise<{ content: string, matchedSkills: Skill[] }> {
  let extraSkills: Skill[] = [];
  
  if (userId) {
    try {
      const dbSkills = await getUserInstalledSkills(userId);
      extraSkills = dbSkills.map(s => ({
        id: s.skill_id,
        name: s.name,
        description: s.description,
        content: s.content,
        keywords: s.keywords.split(',').map(k => k.trim())
      }));
    } catch (e) {
      console.error('[SkillRouter] Error loading user skills:', e);
    }
  }

  return getRelevantSkillsContent(userMessage, extraSkills, mandatorySkillsEnabled);
}
