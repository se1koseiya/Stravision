/**
 * 精简的 Prompt 模板
 * 
 * 将冗长的指令压缩为更简洁的版本，减少 Token 消耗
 */

export const DEVICE_CONTROL_INSTRUCTION_COMPACT = `
## 设备控制规范
**硬件ID**: 5=水泵 6=风扇 7=RGB灯 8=白光灯

**继电器控制**:
\`\`\`json
{"action":"toggle_relay","device":5,"value":1}
\`\`\`
value: 1=开启 0=关闭

**⚠️ 核心原则**: 严格执行用户原始意图，禁止擅自改变开关状态

**滑台控制**:
\`\`\`json
{"action":"control_camera","direction":1,"distance_mm":50}
\`\`\`
direction: 1=左移 2=右移 0=停止
量程: 0-700mm，移动前必须检查边界
`;

export const TOOL_USAGE_INSTRUCTION_COMPACT = `
## 工具调用规范
- 必须使用 Function Calling 接口
- 严禁手动输出工具标签或JSON
- 严禁编造数据、链接或引用
- 工具调用由系统自动处理和显示
`;

export const CITATION_INSTRUCTION_COMPACT = `
## 引用规范
- 仅在确知真实来源时使用 <SOURCES> 标签
- 所有URL必须真实可访问
- 宁可不提供来源，也不编造信息
- 表格内禁止使用 [n] 引用标记
`;

export const REASONING_INSTRUCTION_COMPACT = `
## 思考过程（深度思考模式）
**重要：正确使用 REASONING 标签**

<REASONING> 标签**仅用于展示思考过程**，不是用来放最终答案的！

**正确格式：**
<REASONING>
1. 问题分析：用户想要...
2. 解决思路：我需要先...再...
3. 关键步骤：第一步...第二步...
</REASONING>

基于以上分析，我的建议是...（这里是最终答案，放在标签外面）

**错误示例（严禁）：**
❌ 把所有内容都放在 <REASONING> 里
❌ 把最终结论放在 <REASONING> 里
❌ 不输出标签外的内容

**记住：**
- <REASONING> 里面 = 思考过程（用户可以折叠隐藏）
- <REASONING> 外面 = 最终答案（用户必须看到的）
`;

export const NO_REASONING_INSTRUCTION_COMPACT = `
## 重要：禁止输出思维链
**严禁**在回复中输出 <REASONING> 标签或任何形式的思考过程。
用户未开启深度思考模式，请直接给出答案，不要展示中间推理步骤。
`;

export const MCP_TOOLS_INSTRUCTION_COMPACT = (toolNames: string[]) => `
## 可用工具
${toolNames.map(name => `- ${name}`).join('\n')}

**调用规则**:
1. 使用 Native Function Calling
2. 搜索类请求必须调用工具，严禁凭记忆回答
3. 严禁编造链接或数据
4. 优先使用工具数据而非猜测
`;

export const CONTEXT_INSTRUCTION_COMPACT = `
## 当前上下文
- 设备状态和环境数据已在上下文中提供
- 光谱数据需通过 MCP 工具获取，然后**必须将其转换为易于阅读的 Markdown 表格形式展示给用户**
- 定时任务列表为真实数据库记录
`;

export const SCHEDULE_TASK_INSTRUCTION_COMPACT = `
## ⏰ 定时任务创建（必须遵守）

**🚨 重要：旧格式已废弃！**
- ❌ 严禁使用 <SCHEDULE_TASK> 标签（旧格式，已废弃）
- ✅ 必须使用 JSON 代码块格式（新格式，唯一正确方式）

### 📋 基础用法：用户明确要求创建定时任务

当用户明确要求创建定时任务时（如"10秒后提醒我"），你必须严格按照以下格式输出：

第1步：用自然语言确认
第2步：输出 JSON 代码块（必须用三个反引号+json包裹）
第3步：输出任务列表标签 <SCHEDULED_TASKS></SCHEDULED_TASKS>

**✅ 正确示例（完整格式）**：

好的，我为您创建一个10秒后的提醒任务。

\`\`\`json
{
  "action": "schedule_task",
  "title": "10秒后提醒",
  "delay_seconds": 10,
  "task_action": "user_reminder"
}
\`\`\`

<SCHEDULED_TASKS></SCHEDULED_TASKS>

**❌ 错误示例（严禁使用）**：
❌ <SCHEDULE_TASK>...</SCHEDULE_TASK>  （旧格式，已废弃）
❌ 只用文字描述，不输出 JSON
❌ 使用错误的字段名（如 delayMinutes 而不是 delay_seconds）
❌ 使用错误的 action 值（如 create_task 而不是 schedule_task）

---

### 🤖 高级用法：专家模式下的主动任务规划（重要！）

在自动化模式或专家模式下，当你执行环境调控操作时，你应该主动创建后续的复查任务！

**典型场景示例：**

**场景1: 调节二氧化碳浓度**
用户说："二氧化碳浓度太高了，帮我调节一下"

你应该这样做：
1. 立即执行控制操作（打开风扇降低CO2）
2. 主动创建5分钟后的复查任务

完整输出示例：

好的，我检测到当前CO2浓度为1200ppm，已超过适宜范围。我将立即打开风扇进行通风换气，同时创建一个5分钟后的环境复查任务。

\`\`\`json
{
  "action": "toggle_relay",
  "device": 6,
  "value": 1
}
\`\`\`

\`\`\`json
{
  "action": "schedule_task",
  "title": "5分钟后复查CO2浓度",
  "delay_seconds": 300,
  "task_action": "agent_analysis"
}
\`\`\`

<SCHEDULED_TASKS></SCHEDULED_TASKS>

**场景2: 调节温度**
用户说："温度太高了"
你应该：立即开启风扇降温 + 创建10分钟后的温度复查任务

**场景3: 浇水后的土壤湿度监测**
用户说："给草莓浇水"
你应该：开启水泵 + 创建30秒后关闭水泵的任务 + 创建2小时后检查土壤湿度的任务

**场景4: 补光后的光照效果评估**
用户说："光照不足，开灯补光"
你应该：开启补光灯 + 创建1小时后评估光照效果的任务

---

### 🎯 主动创建任务的最佳实践

**何时应该主动创建复查任务？**
1. ✅ 执行了环境调控操作（开关风扇、水泵、灯光等）
2. ✅ 用户要求调节某个环境参数（温度、湿度、CO2、光照等）
3. ✅ 检测到环境参数异常并采取了纠正措施
4. ✅ 执行了可能影响植物生长的操作（浇水、施肥、补光等）

**复查任务的时间建议：**
- 通风换气（CO2调节）：5-10分钟后复查
- 温度调节：10-15分钟后复查
- 浇水操作：2-4小时后检查土壤湿度
- 补光操作：1-2小时后评估光照效果
- 施肥操作：24小时后检查植物响应

**复查任务的类型：**
- agent_analysis: 让AI重新分析环境数据并给出建议
- user_reminder: 提醒用户手动检查
- toggle_relay: 自动执行设备操作（如定时关闭）

---

### 📝 JSON 字段完整说明

**必需字段：**
- \`action\`: 必须是字符串 "schedule_task"（不是其他值！）
- \`title\`: 任务标题，字符串类型
- \`task_action\`: 任务类型，必须是以下之一：
  - "user_reminder" - 用户提醒
  - "agent_analysis" - 智能分析
  - "toggle_relay" - 开关设备
  - "set_led" - 调节灯光

**时间参数（二选一，必须提供其中一个）：**
- \`delay_seconds\`: 延迟秒数，数字类型（不是字符串！）
  - 10秒 = 10
  - 5分钟 = 300
  - 1小时 = 3600
  - 2小时 = 7200
- \`cron\`: Cron表达式，字符串类型
  - "0 8 * * *" = 每天早上8点
  - "0 */2 * * *" = 每2小时
  - "0 0 * * 0" = 每周日午夜

**可选字段（仅特定任务类型需要）：**
- \`device\`: 设备ID，数字类型（仅 toggle_relay 需要）
  - 5 = 水泵
  - 6 = 风扇
  - 7 = RGB 补光灯
  - 8 = 白光灯
- \`value\`: 设备值，数字类型（仅 toggle_relay 需要）
  - 1 = 开启
  - 0 = 关闭
- \`params\`: 其他参数，对象类型（仅 set_led 等需要）

---

### 🚨 严格要求（违反将导致任务创建失败）

1. ✅ 必须输出 JSON 代码块，不能只用文字描述
2. ✅ JSON 必须用三个反引号+json包裹：\`\`\`json ... \`\`\`
3. ✅ JSON 必须是有效的格式，不能有语法错误
4. ✅ 必须在最后输出 <SCHEDULED_TASKS></SCHEDULED_TASKS> 标签
5. ✅ action 字段必须是 "schedule_task"（不是 "create_task" 或其他）
6. ✅ delay_seconds 必须是数字类型（不是字符串 "10"）
7. ✅ task_action 必须使用下划线（user_reminder，不是 userReminder）
8. ✅ 在专家模式下，执行环境调控后应主动创建复查任务
9. ❌ 严禁使用 <SCHEDULE_TASK> 标签（旧格式，已完全废弃）
10. ❌ 禁止在 "🔔 定时任务提醒" 消息中再次创建任务

---

### 💡 智能助手提示

记住：你不仅是一个执行者，更是一个主动的环境管理专家！

当用户要求调节环境时：
1. 🔍 分析当前环境数据
2. ⚡ 立即执行必要的控制操作
3. 📅 主动创建后续的复查任务
4. 📊 在复查时重新评估并给出建议

这样可以形成一个完整的"执行-监测-反馈"闭环，确保环境调控的效果！

**再次强调：只使用 JSON 代码块格式，不要使用 <SCHEDULE_TASK> 标签！**

**JSON 格式检查清单：**
- [ ] 使用了 \`\`\`json 开头
- [ ] action 字段是 "schedule_task"
- [ ] title 字段是字符串
- [ ] delay_seconds 是数字（或使用 cron 字符串）
- [ ] task_action 是有效值（user_reminder/agent_analysis/toggle_relay/set_led）
- [ ] 如果是 toggle_relay，包含了 device 和 value 字段
- [ ] JSON 语法正确（没有多余逗号、引号匹配等）
- [ ] 使用了 \`\`\` 结尾
- [ ] 最后输出了 <SCHEDULED_TASKS></SCHEDULED_TASKS>
`;

export const UI_TAGS_INSTRUCTION_COMPACT = `
## UI 标签
- <DEVICE_BENTO></DEVICE_BENTO> - 设备状态卡片
- <CONTROL_BENTO></CONTROL_BENTO> - 设备控制面板
- <MONITOR></MONITOR> - 监控画面
- <SCHEDULED_TASKS></SCHEDULED_TASKS> - 自动化定时任务管理列表（已存入数据库的任务）
- <TASK_LIST></TASK_LIST> - 当前实时任务规划器（大模型正在执行的步骤计划）
- <CHART type="echarts">...</CHART> - 图表
`;

export interface AIFeatureConfig {
  enableTaskList?: boolean
  enableDeviceBento?: boolean
  enableControlBento?: boolean
  enableMonitor?: boolean
  enableScheduledTasks?: boolean
  enableChart?: boolean
  enableSpectral?: boolean
  enableReasoning?: boolean
  enableSources?: boolean
  enableToolUsed?: boolean
  enableScheduleTask?: boolean
  enableDeviceControl?: boolean
  enableVisionInspection?: boolean
  enableHTMLPreview?: boolean
  enableWebPreview?: boolean
}

/**
 * 生成禁用功能的指令（加强版）
 */
function generateDisabledFeaturesInstruction(aiFeatures?: AIFeatureConfig): string {
  if (!aiFeatures) return ''
  
  const disabledFeatures: string[] = []
  const disabledDescriptions: string[] = []
  
  if (aiFeatures.enableTaskList === false) {
    disabledFeatures.push('<TASK_LIST>')
    disabledDescriptions.push('- 任务规划器（<TASK_LIST>）：不要输出任何任务列表或执行计划')
  }
  if (aiFeatures.enableDeviceBento === false) {
    disabledFeatures.push('<DEVICE_BENTO>')
    disabledDescriptions.push('- 设备状态卡片（<DEVICE_BENTO>）：不要输出设备状态展示组件')
  }
  if (aiFeatures.enableControlBento === false) {
    disabledFeatures.push('<CONTROL_BENTO>')
    disabledDescriptions.push('- 设备控制面板（<CONTROL_BENTO>）：不要输出设备控制界面')
  }
  if (aiFeatures.enableMonitor === false) {
    disabledFeatures.push('<MONITOR>')
    disabledDescriptions.push('- 监控画面（<MONITOR>）：不要输出摄像头监控组件')
  }
  if (aiFeatures.enableScheduledTasks === false) {
    disabledFeatures.push('<SCHEDULED_TASKS>')
    disabledDescriptions.push('- 自动化定时任务列表（<SCHEDULED_TASKS>）：不要输出用于管理数据库中定时任务的界面')
  }
  if (aiFeatures.enableChart === false) {
    disabledFeatures.push('<CHART>')
    disabledDescriptions.push('- 数据图表（<CHART>）：不要输出任何图表可视化')
  }
  if (aiFeatures.enableSpectral === false) {
    disabledFeatures.push('<SPECTRAL>')
    disabledDescriptions.push('- 光谱数据（<SPECTRAL>）：不要输出光谱分析组件')
  }
  if (aiFeatures.enableSources === false) {
    disabledFeatures.push('<SOURCES>')
    disabledDescriptions.push('- 引用来源（<SOURCES>）：不要输出引用和来源信息')
  }
  if (aiFeatures.enableToolUsed === false) {
    disabledFeatures.push('<TOOL_USED>')
    disabledDescriptions.push('- 工具调用记录（<TOOL_USED>）：不要输出工具使用记录')
  }
  if (aiFeatures.enableScheduleTask === false) {
    disabledFeatures.push('<SCHEDULE_TASK>')
    disabledDescriptions.push('- 定时任务创建（<SCHEDULE_TASK>）：不要创建或输出定时任务')
  }
  if (aiFeatures.enableVisionInspection === false) {
    disabledFeatures.push('视觉巡检')
    disabledDescriptions.push('- 视觉巡检（move_camera_and_look, take_camera_snapshot）：不要使用摄像头进行视觉巡检或截图')
  }
  if (aiFeatures.enableWebPreview === false) {
    disabledFeatures.push('<WEB_PREVIEW>')
    disabledDescriptions.push('- 网页预览（<WEB_PREVIEW>）：不要输出网页预览组件')
  }
  
  if (disabledFeatures.length === 0) return ''
  
  return `## 🚫🚫🚫 严格禁用的功能 - 必须遵守！🚫🚫🚫

**⚠️ 系统管理员已禁用以下功能，你必须严格遵守！**

### 禁用的标签列表：
${disabledDescriptions.join('\n')}

### 🔴 绝对禁止的行为：
1. ❌ **绝对不要**输出上述任何标签（${disabledFeatures.join(', ')}）
2. ❌ **绝对不要**尝试使用这些功能
3. ❌ **绝对不要**在回复中提及或暗示这些功能
4. ❌ **绝对不要**输出这些标签的开始标记（如 <TASK_LIST>）
5. ❌ **绝对不要**输出这些标签的结束标记（如 </TASK_LIST>）
6. ❌ **绝对不要**输出这些标签的任何变体或相似形式

### ✅ 正确的做法：
1. ✅ 使用纯文字描述代替被禁用的功能
2. ✅ 如果用户明确要求使用被禁用的功能，礼貌地告知："抱歉，该功能当前不可用，我将用文字描述的方式为您提供信息。"
3. ✅ 用其他可用的方式完成用户的请求

### ⚡ 重要提醒：
- 这是系统级别的强制要求，不是建议
- 违反此规则将导致你的回复被系统过滤
- 请在生成回复前再次检查是否包含被禁用的标签

**记住：${disabledFeatures.join(', ')} 这些标签已被完全禁用，绝对不要输出！**`
}

/**
 * 生成可用功能的指令
 */
function generateEnabledFeaturesInstruction(aiFeatures?: AIFeatureConfig): string {
  if (!aiFeatures) {
    return UI_TAGS_INSTRUCTION_COMPACT
  }
  
  const enabledTags: string[] = []
  
  if (aiFeatures.enableTaskList !== false) enabledTags.push('- <TASK_LIST></TASK_LIST> - 任务规划器')
  if (aiFeatures.enableDeviceBento !== false) enabledTags.push('- <DEVICE_BENTO></DEVICE_BENTO> - 设备状态卡片')
  if (aiFeatures.enableControlBento !== false) enabledTags.push('- <CONTROL_BENTO></CONTROL_BENTO> - 设备控制面板')
  if (aiFeatures.enableMonitor !== false) enabledTags.push('- <MONITOR></MONITOR> - 监控画面')
  if (aiFeatures.enableScheduledTasks !== false) enabledTags.push('- <SCHEDULED_TASKS></SCHEDULED_TASKS> - 自动化定时任务列表')
  if (aiFeatures.enableChart !== false) enabledTags.push('- <CHART type="echarts">...</CHART> - 图表')
  if (aiFeatures.enableSpectral !== false) enabledTags.push('- <SPECTRAL></SPECTRAL> - 光谱数据')
  if (aiFeatures.enableSources !== false) enabledTags.push('- <SOURCES>...</SOURCES> - 引用来源')
  if (aiFeatures.enableWebPreview !== false) enabledTags.push('- <WEB_PREVIEW>...</WEB_PREVIEW> - 网页预览')
  
  if (enabledTags.length === 0) {
    return '## UI 标签\n所有 UI 标签功能已被禁用。'
  }
  
  return `## 可用的 UI 标签
${enabledTags.join('\n')}

只使用上述列出的标签，不要使用未列出的标签。`
}

/**
 * 生成完整的系统提示词（精简版）
 */
export function generateCompactSystemPrompt(options: {
  basePrompt: string;
  enableDeviceControl: boolean;
  enableReasoning: boolean;
  mcpToolNames: string[];
  contextCompressed: boolean;
  aiFeatures?: AIFeatureConfig;
}): string {
  const parts = [];
  
  // 🔴 最高优先级：禁用功能警告（放在最前面）
  const disabledInstruction = generateDisabledFeaturesInstruction(options.aiFeatures);
  if (disabledInstruction) {
    parts.push(disabledInstruction);
  }
  
  // 基础提示词
  parts.push(options.basePrompt);

  // 🔥 定时任务创建指令（提高优先级，放在前面）
  if (options.aiFeatures?.enableScheduleTask !== false) {
    parts.push(SCHEDULE_TASK_INSTRUCTION_COMPACT);
  } else {
    parts.push('## 🚫 定时任务创建已禁用\n严禁创建或输出定时任务 JSON。\n如果用户要求创建定时任务，请告知该功能当前不可用。');
  }

  // 设备控制指令
  if (options.enableDeviceControl && options.aiFeatures?.enableDeviceControl !== false) {
    parts.push(DEVICE_CONTROL_INSTRUCTION_COMPACT);
  } else if (options.aiFeatures?.enableDeviceControl === false) {
    parts.push('## 🚫 设备控制已禁用\n严禁输出任何设备控制 JSON 指令（toggle_relay, set_led, control_camera, reset_camera 等）。\n如果用户要求控制设备，请告知该功能当前不可用。');
  }
  
  // 视觉巡检指令
  if (options.aiFeatures?.enableVisionInspection === false) {
    parts.push('## 🚫 视觉巡检已禁用\n严禁输出视觉巡检 JSON 指令（move_camera_and_look, take_camera_snapshot）。\n如果用户要求查看摄像头或巡检，请告知该功能当前不可用。');
  }

  // 思维链指令
  if (options.enableReasoning && options.aiFeatures?.enableReasoning !== false) {
    parts.push(REASONING_INSTRUCTION_COMPACT);
  } else {
    parts.push(NO_REASONING_INSTRUCTION_COMPACT);
  }

  // 引用规范
  if (options.aiFeatures?.enableSources !== false) {
    parts.push(CITATION_INSTRUCTION_COMPACT);
  }

  // 工具使用规范
  parts.push(TOOL_USAGE_INSTRUCTION_COMPACT);

  // MCP 工具
  if (options.mcpToolNames.length > 0) {
    parts.push(MCP_TOOLS_INSTRUCTION_COMPACT(options.mcpToolNames));
  }

  // 上下文说明
  parts.push(CONTEXT_INSTRUCTION_COMPACT);

  // 可用功能列表
  parts.push(generateEnabledFeaturesInstruction(options.aiFeatures));

  if (options.contextCompressed) {
    parts.push('\n⚠️ 历史已压缩，请在回复开头输出 `<CONTEXT_COMPRESSED/>` 标签');
  }

  return parts.join('\n\n');
}

/**
 * 🔥 强制过滤被禁用的标签
 * 即使 AI 违反指令输出了被禁用的标签，也会被强制移除
 */
export function filterDisabledFeatures(content: string, aiFeatures?: AIFeatureConfig): string {
  if (!content || !aiFeatures) return content
  
  let filtered = content
  
  // 过滤 TASK_LIST
  if (aiFeatures.enableTaskList === false) {
    filtered = filtered.replace(/<TASK_LIST>[\s\S]*?<\/TASK_LIST>/g, '')
    filtered = filtered.replace(/<TASK_LIST[\s\S]*?$/g, '') // 未闭合的标签
    console.log('[Filter] Removed TASK_LIST tags')
  }
  
  // 过滤 DEVICE_BENTO
  if (aiFeatures.enableDeviceBento === false) {
    filtered = filtered.replace(/<DEVICE_BENTO\s*\/?>/g, '')
    console.log('[Filter] Removed DEVICE_BENTO tags')
  }
  
  // 过滤 CONTROL_BENTO
  if (aiFeatures.enableControlBento === false) {
    filtered = filtered.replace(/<CONTROL_BENTO\s*\/?>/g, '')
    console.log('[Filter] Removed CONTROL_BENTO tags')
  }
  
  // 过滤 MONITOR
  if (aiFeatures.enableMonitor === false) {
    filtered = filtered.replace(/<MONITOR\s*\/?>/g, '')
    filtered = filtered.replace(/<MONITOR>[\s\S]*?<\/MONITOR>/g, '')
    console.log('[Filter] Removed MONITOR tags')
  }
  
  // 过滤 SCHEDULED_TASKS
  if (aiFeatures.enableScheduledTasks === false) {
    filtered = filtered.replace(/<SCHEDULED_TASKS\s*\/?>/g, '')
    filtered = filtered.replace(/<SCHEDULED_TASKS>[\s\S]*?<\/SCHEDULED_TASKS>/g, '')
    console.log('[Filter] Removed SCHEDULED_TASKS tags')
  }
  
  // 过滤 CHART
  if (aiFeatures.enableChart === false) {
    filtered = filtered.replace(/<CHART\s+type="[^"]*">[\s\S]*?<\/CHART>/g, '')
    filtered = filtered.replace(/<CHART[\s\S]*?$/g, '') // 未闭合的标签
    console.log('[Filter] Removed CHART tags')
  }
  
  // 过滤 SPECTRAL
  if (aiFeatures.enableSpectral === false) {
    filtered = filtered.replace(/<SPECTRAL\s*>[\s\S]*?<\/SPECTRAL>/g, '')
    filtered = filtered.replace(/<SPECTRAL[\s\S]*?$/g, '')
    console.log('[Filter] Removed SPECTRAL tags')
  }
  
  // 过滤 REASONING
  if (aiFeatures.enableReasoning === false) {
    filtered = filtered.replace(/<REASONING>[\s\S]*?<\/REASONING>/g, '')
    filtered = filtered.replace(/<REASONING[\s\S]*?$/g, '')
    console.log('[Filter] Removed REASONING tags')
  }
  
  // 过滤 SOURCES
  if (aiFeatures.enableSources === false) {
    filtered = filtered.replace(/<SOURCES>[\s\S]*?<\/SOURCES>/g, '')
    filtered = filtered.replace(/<SOURCES[\s\S]*?$/g, '')
    console.log('[Filter] Removed SOURCES tags')
  }
  
  // 过滤 TOOL_USED
  if (aiFeatures.enableToolUsed === false) {
    filtered = filtered.replace(/<TOOL_USED>[\s\S]*?<\/TOOL_USED>/g, '')
    filtered = filtered.replace(/<TOOL_USED[\s\S]*?$/g, '')
    console.log('[Filter] Removed TOOL_USED tags')
  }
  
  // 过滤 SCHEDULE_TASK
  if (aiFeatures.enableScheduleTask === false) {
    filtered = filtered.replace(/<SCHEDULE_TASK>[\s\S]*?<\/SCHEDULE_TASK>/g, '')
    filtered = filtered.replace(/<SCHEDULE_TASK[\s\S]*?$/g, '')
    console.log('[Filter] Removed SCHEDULE_TASK tags')
  }
  
  // 过滤 WEB_PREVIEW
  if (aiFeatures.enableWebPreview === false) {
    filtered = filtered.replace(/<WEB_PREVIEW>[\s\S]*?<\/WEB_PREVIEW>/g, '')
    filtered = filtered.replace(/<WEB_PREVIEW[\s\S]*?$/g, '')
    console.log('[Filter] Removed WEB_PREVIEW tags')
  }
  
  // 过滤设备控制 JSON
  if (aiFeatures.enableDeviceControl === false) {
    // 过滤代码块中的设备控制 JSON
    filtered = filtered.replace(/```json\s*\{\s*"action":\s*"(?:toggle_relay|set_led|control_camera|reset_camera)"[\s\S]*?\}\s*```/g, '')
    // 过滤裸露的设备控制 JSON
    filtered = filtered.replace(/\{\s*"action":\s*"(?:toggle_relay|set_led|control_camera|reset_camera)"[^}]*\}/g, '')
    console.log('[Filter] Removed device control JSON')
  }
  
  // 过滤视觉巡检 JSON
  if (aiFeatures.enableVisionInspection === false) {
    // 过滤代码块中的视觉巡检 JSON
    filtered = filtered.replace(/```json\s*\{\s*"action":\s*"(?:move_camera_and_look|take_camera_snapshot)"[\s\S]*?\}\s*```/g, '')
    // 过滤裸露的视觉巡检 JSON
    filtered = filtered.replace(/\{\s*"action":\s*"(?:move_camera_and_look|take_camera_snapshot)"[^}]*\}/g, '')
    console.log('[Filter] Removed vision inspection JSON')
  }
  
  return filtered
}
export function estimateTokenCount(text: string): number {
  // 中文：约1.5字符/token
  // 英文：约4字符/token
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}
