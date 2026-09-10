/**
 * 聊天响应过滤器
 *
 * 从 app/api/chat/route.ts 抽出的纯函数模块（原样搬运，行为不变）。
 * 这些函数是历史上 Bug 修复注释最密集的区域，抽出后终于可以被单测覆盖。
 *
 * 职责：处理 AI 输出文本中的遗留格式 —— 拦截裸露 JSON、提取/清洗旧版设备控制指令。
 */

/**
 * 🔥 智能过滤器：拦截裸露的 TASK_LIST JSON
 * 防止 AI 错误输出导致 JSON 暴露在用户界面
 *
 * 重要：只过滤裸露的 JSON，保留正确包裹在 <TASK_LIST> 标签内的 JSON
 *
 * @param chunkContent 当前流式 chunk 的内容
 * @param accumulatedContent 累积的全部内容（用于判断是否已处于 <TASK_LIST> 块内）
 */
export function filterBareTaskListJson(chunkContent: string, accumulatedContent: string = ''): string {
  if (!chunkContent) return chunkContent

  // 使用累积内容判断是否已经处于 <TASK_LIST> 块内
  // 如果累积内容中已有 <TASK_LIST> 开标签但还没有 </TASK_LIST> 闭标签，
  // 说明当前 chunk 是 TASK_LIST 块内部内容，不应过滤
  const accHasOpenTag = accumulatedContent.includes('<TASK_LIST>')
  const accHasCloseTag = accumulatedContent.includes('</TASK_LIST>')
  const chunkHasOpenTag = chunkContent.includes('<TASK_LIST>')
  const chunkHasCloseTag = chunkContent.includes('</TASK_LIST>')

  // 如果累积内容或当前 chunk 包含 TASK_LIST 标签，说明是正确的格式，不要过滤
  if (accHasOpenTag || accHasCloseTag || chunkHasOpenTag || chunkHasCloseTag) {
    return chunkContent
  }

  // 🔥 关键修复：先识别并保留 schedule_task JSON 代码块
  // schedule_task JSON 绝不能被 TASK_LIST 过滤器误删
  // 用占位符替换，过滤完再恢复
  const scheduleTaskBlocks: string[] = []
  let stashed = chunkContent
  stashed = stashed.replace(/```json\s*[\s\S]*?"action"\s*:\s*"schedule_task"[\s\S]*?(?:```|$)/g, (match) => {
    scheduleTaskBlocks.push(match)
    return `\x00ST_BLOCK_${scheduleTaskBlocks.length - 1}\x00`
  })

  // 🔥 关键修复：同时识别并保留自动化策略 JSON
  // 自动化策略是含 nodes/edges 的图结构，含 triggerNode/logicNode/actionNode
  // 使用非贪婪匹配直到遇到 ``` 或字符串结尾；不要求 JSON 已闭合（流式支持）
  const automationBlocks: string[] = []
  stashed = stashed.replace(/```json\s*[\s\S]*?(?:```|$)/g, (match) => {
    const jsonText = match.replace(/^```json\s*/, "").replace(/```$/, "").trim()
    // 任何含策略标记的代码块都保护
    if (jsonText.includes('"triggerNode"') || jsonText.includes('"logicNode"') || jsonText.includes('"actionNode"')) {
      automationBlocks.push(match)
      return `\x00AUTO_BLOCK_${automationBlocks.length - 1}\x00`
    }
    return match
  })

  // 🔥 关键修复：保护无 fence 的裸策略 JSON（如 { "nodes": [...], "edges": [...] }）
  // 避免被下方的 TASK_LIST 模式误识别（虽然一般不会匹配，但作为保险）
  stashed = stashed.replace(/\{\s*"(?:nodes|edges)"[\s\S]*?"nodes"\s*:\s*\[[\s\S]*?\}\s*(?=\n|$)/g, (match) => {
    if (match.includes('"triggerNode"') || match.includes('"logicNode"') || match.includes('"actionNode"')) {
      automationBlocks.push('```json\n' + match + '\n```')
      return `\x00AUTO_BLOCK_${automationBlocks.length - 1}\x00`
    }
    return match
  })

  // 只有在没有标签包裹的情况下，才过滤裸露的 JSON

  // 1. 拦截完整的裸露 TASK_LIST JSON 对象
  // 匹配模式：{ "status": "in_progress", "tasks": [...] }
  const taskListJsonPattern = /\{\s*"status"\s*:\s*"(?:in_progress|completed|pending)"\s*,\s*"tasks"\s*:\s*\[[\s\S]*?\]\s*\}/g
  const hasTaskListJson = taskListJsonPattern.test(stashed)

  if (hasTaskListJson) {
    stashed = stashed.replace(taskListJsonPattern, (match) => {
      // 二次防御：不能是 schedule_task JSON
      if (match.includes('"action": "schedule_task"')) return match
      console.warn('[TASK_LIST Filter] Intercepted BARE TASK_LIST JSON (no tags):', match.slice(0, 100))
      return '' // 完全移除裸露的 JSON
    })
  }

  // 2. 拦截不完整的裸露 TASK_LIST JSON 片段（流式输出时）
  // 匹配模式：{ "status": "in_progress", "tasks": [{ "id": "task-1"...
  const incompleteTaskPattern = /\{\s*"status"\s*:\s*"(?:in_progress|completed|pending)"[\s\S]*?(?:"tasks"\s*:\s*\[[\s\S]*)?$/
  const incompleteMatch = incompleteTaskPattern.exec(stashed)
  if (incompleteMatch) {
    // 🔥 用匹配起点定位 JSON 起始：原实现用 lastIndexOf('{')，
    // 当流式片段已深入 tasks 数组内部时会命中内层对象的 '{'，导致截断失效。
    const start = incompleteMatch.index
    const potentialJson = stashed.slice(start)
    // 二次防御：必须包含 tasks 或 status，且不能是 schedule_task
    if (
      (potentialJson.includes('"tasks"') || (potentialJson.includes('"status"') && potentialJson.includes('"in_progress"'))) &&
      !potentialJson.includes('"action": "schedule_task"')
    ) {
      console.warn('[TASK_LIST Filter] Intercepted incomplete BARE TASK_LIST JSON (no tags)')
      stashed = stashed.slice(0, start).trim()
    }
  }

  // 还原 schedule_task 代码块
  const result = stashed.replace(/\x00ST_BLOCK_(\d+)\x00/g, (_, idx) => {
    return scheduleTaskBlocks[Number(idx)] || ''
  })
  // 还原自动化策略代码块
  return result.replace(/\x00AUTO_BLOCK_(\d+)\x00/g, (_, idx) => {
    return automationBlocks[Number(idx)] || ''
  })
}

/**
 * 从 AI 回复文本中提取设备动作（用于自动学习服务记录「意图达成」）。
 *
 * 仅提取 toggle_relay（设备 5-8）这类有明确 device+value 的动作；
 * set_led / control_camera 等不映射到清晰的开关量，跳过。
 */
export function extractDeviceActionsFromResponse(aiResponse: string): Array<{
  deviceId: number;
  action: string;
  success: boolean;
  executionTime: number;
}> {
  const actions: Array<{ deviceId: number; action: string; success: boolean; executionTime: number }> = [];

  // 匹配 ```json ... ``` 代码块内的 toggle_relay JSON，以及裸露的 toggle_relay JSON
  const toggleRelayPattern = /\{\s*"action"\s*:\s*"toggle_relay"\s*,\s*"device"\s*:\s*(\d+)\s*,\s*"value"\s*:\s*(\d+)\s*\}/g;
  let match: RegExpExecArray | null;
  while ((match = toggleRelayPattern.exec(aiResponse)) !== null) {
    const deviceId = parseInt(match[1]);
    const value = parseInt(match[2]);
    // 仅保留继电器设备 ID 范围内的动作（5-8）
    if (deviceId >= 5 && deviceId <= 8) {
      actions.push({
        deviceId,
        action: JSON.stringify({ value }),
        success: true, // 乐观标记：指令已生成，执行结果未知，按"意图达成"学习
        executionTime: 0
      });
    }
  }

  return actions;
}

/** 旧版 JSON 设备控制指令的 action 集合（新架构已改为原生 tool_call） */
export const LEGACY_DEVICE_ACTIONS = ['toggle_relay', 'set_led', 'control_camera', 'reset_camera'] as const;

/**
 * 🔥 从 AI 回复文本中提取旧版 JSON 设备控制指令（```json {"action":"toggle_relay",...}``` 或裸露内联 JSON）。
 *
 * 用途：当模型未走原生 tool_call、而是模仿旧格式输出文本 JSON 时，
 * 服务端据此合成真实工具调用并执行，避免"只说不做"。
 * 返回的动作已按 name+参数去重。
 */
export function extractLegacyDeviceControlCalls(text: string): Array<{ name: string; arguments: Record<string, any> }> {
  const calls: Array<{ name: string; arguments: Record<string, any> }> = [];
  if (!text || !text.includes('"action"')) return calls;

  const seen = new Set<string>();
  const tryAdd = (raw: string) => {
    let data: any;
    try { data = JSON.parse(raw) } catch { return }
    if (!data || typeof data !== 'object') return;
    const action = data.action;
    if (typeof action !== 'string' || !(LEGACY_DEVICE_ACTIONS as readonly string[]).includes(action)) return;

    let args: Record<string, any> | null = null;
    if (action === 'toggle_relay') {
      const value = Number(data.value);
      if (value !== 0 && value !== 1) return;
      args = { value };
      if (typeof data.device_id === 'number') args.device_id = data.device_id;
      else if (typeof data.device === 'number' && data.device >= 5 && data.device <= 8) args.device = data.device;
      else return; // 无有效设备标识，跳过
    } else if (action === 'set_led') {
      const { r, g, b } = data;
      if ([r, g, b].some(v => typeof v !== 'number' || v < 0 || v > 255)) return;
      args = { r, g, b };
    } else if (action === 'control_camera') {
      const direction = Number(data.direction);
      if (![0, 1, 2].includes(direction)) return;
      args = { direction };
      if (typeof data.distance_mm === 'number' && data.distance_mm >= 0 && data.distance_mm <= 700) {
        args.distance_mm = data.distance_mm;
      }
    } else if (action === 'reset_camera') {
      args = {};
    }
    if (!args) return;

    const key = `${action}:${JSON.stringify(args)}`;
    if (seen.has(key)) return;
    seen.add(key);
    calls.push({ name: action, arguments: args });
  };

  // 1) ```json 代码块内的动作 JSON
  const codeBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = codeBlockRegex.exec(text)) !== null) {
    const block = m[1].trim();
    if (block.startsWith('{')) tryAdd(block);
  }

  // 2) 裸露的内联动作 JSON（无代码块包裹）
  const inlineRegex = /\{\s*"action"\s*:\s*"(?:toggle_relay|set_led|control_camera|reset_camera)"[^{}]*\}/g;
  while ((m = inlineRegex.exec(text)) !== null) {
    tryAdd(m[0]);
  }

  return calls;
}

/**
 * 🔥 清洗历史 assistant 消息中的旧版 JSON 设备控制指令。
 *
 * 旧架构让 AI 输出 ```json {"action":"toggle_relay",...}``` 代码块由前端解析执行，
 * 该链路已移除；若这些样例原样回喂，模型会 few-shot 模仿旧格式继续输出文本 JSON
 * 而不走原生 tool_call（表现为"只说不做"）。这里替换为中性描述以消除污染。
 */
export function sanitizeLegacyDeviceControlMessages(messages: any[]): any[] {
  const actionAlt = [...LEGACY_DEVICE_ACTIONS, 'move_camera_and_look', 'take_camera_snapshot'].join('|');
  const codeBlockRegex = new RegExp(
    '```(?:json)?\\s*\\n?(\\{[\\s\\S]*?"action"\\s*:\\s*"(?:' + actionAlt + ')"[\\s\\S]*?\\})\\s*\\n?```',
    'g'
  );
  const inlineRegex = new RegExp('\\{\\s*"action"\\s*:\\s*"(?:' + actionAlt + ')"[^{}]*\\}', 'g');

  return messages.map((m: any) => {
    if (m?.role !== 'assistant' || typeof m.content !== 'string' || !m.content.includes('"action"')) return m;
    const content = m.content
      .replace(codeBlockRegex, '[设备控制指令（历史记录，已通过工具调用执行）]')
      .replace(inlineRegex, '[设备控制指令（历史记录）]');
    return content === m.content ? m : { ...m, content };
  });
}
