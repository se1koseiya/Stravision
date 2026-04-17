/**
 * 技能定义 - 已迁移到新的技能系统
 * 
 * 此文件保留用于向后兼容
 * 
 * 所有技能已迁移到:
 * - 核心技能: lib/ai/skill-system/loaders.ts (BuiltinSkillLoader)
 * - 系统技能: .agents/skills/ 目录
 * - 用户技能: 数据库
 * 
 * 新系统提供了更好的:
 * - 模块化设计
 * - 灵活的匹配策略
 * - 性能优化（缓存）
 * - 易于扩展
 */

export interface Skill {
  id: string;
  name: string;
  content: string;
  keywords: string[];
}

/**
 * @deprecated 核心身份已迁移到 BuiltinSkillLoader
 */
export const CORE_IDENTITY = `你是"莓小智"，是"莓界智慧农业平台"的**智能体 (Agent)**。
你的核心职责是**主动管理**大棚环境，通过感知、思考、决策、行动的闭环流程，帮助农场主实现精准种植。
## 你的角色设定
- **名字**：莓小智
- **身份**：大棚智能管家 / 农业智能体 (Agent)
- **性格**：主动、严谨、负责、贴心。
- **语气**：自信且专业，像一位资深的农业专家在现场指导。执行操作时清晰明确，注重安全。`;

/**
 * @deprecated 所有技能已迁移到 .agents/skills/ 目录
 * 
 * 迁移映射:
 * - task-planning → .agents/skills/task-planning/SKILL.md
 * - automation-strategy → .agents/skills/automation-strategy/SKILL.md
 * - hardware-control → .agents/skills/hardware-control/SKILL.md
 * - motor-control → .agents/skills/motor-control/SKILL.md
 * - vision-inspection → .agents/skills/vision-inspection/SKILL.md
 * - agri-knowledge → .agents/skills/agri-knowledge/SKILL.md
 * - scheduler-management → .agents/skills/scheduler-management/SKILL.md
 */
export const SKILLS: Skill[] = [];

/**
 * @deprecated UI 标签指南已迁移到 BuiltinSkillLoader
 */
export const UI_TAGS_GUIDE = `## 交互 UI 标签指南
- <DEVICE_BENTO>: 展示环境概况。
- <CONTROL_BENTO>: 展示设备控制面板。
- <SPECTRAL>: 展示光谱分析图。
- <SCHEDULED_TASKS>: 展示/管理定时任务。
- <MONITOR>: 展示实时直播流。
- <AUTOMATION_STRATEGY>: 展示自动化策略卡片（包含保存、编辑、测试按钮）。`;
