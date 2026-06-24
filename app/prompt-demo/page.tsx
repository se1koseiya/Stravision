"use client"

import React, { useState, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { Loader2, Send, Trash, RotateCcw, Sparkles, Copy, Code, Eye, EyeOff, SquarePen, Database, Wrench, Play, ChevronRight, ChevronLeft, Cpu, Camera, Radio, Upload, CheckCircle2, Circle, Clock, ArrowRight, Zap } from "lucide-react"
import { LiveStreamPlayer } from "@/components/live-stream-player"

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false })

// HTML内容检测和渲染组件
function MessageContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  // 检测是否包含完整的HTML代码块（必须有成对的```）
  const codeBlockCount = (content.match(/```/g) || []).length
  const hasCompleteHtmlBlock = content.includes('```html') && codeBlockCount >= 2 && codeBlockCount % 2 === 0
  
  // 如果正在流式输出且HTML代码块不完整，显示为普通Markdown
  if (isStreaming && !hasCompleteHtmlBlock) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    )
  }
  
  // 尝试匹配完整的HTML代码块
  const htmlMatch = content.match(/```html\s*([\s\S]*?)\s*```/)
  
  if (htmlMatch && hasCompleteHtmlBlock) {
    const htmlCode = htmlMatch[1]
    const beforeHtml = content.substring(0, htmlMatch.index)
    const afterHtml = content.substring((htmlMatch.index || 0) + htmlMatch[0].length)
    
    return (
      <>
        {beforeHtml && (
          <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
            <ReactMarkdown>{beforeHtml}</ReactMarkdown>
          </div>
        )}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">HTML预览</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(htmlCode)
                toast.success("HTML代码已复制")
              }}
              className="h-6 text-xs gap-1"
            >
              <Copy className="size-3" />
              复制代码
            </Button>
          </div>
          <div className="p-4">
            <div dangerouslySetInnerHTML={{ __html: htmlCode }} />
          </div>
        </div>
        {afterHtml && (
          <div className="prose prose-sm dark:prose-invert max-w-none mt-4">
            <ReactMarkdown>{afterHtml}</ReactMarkdown>
          </div>
        )}
      </>
    )
  }
  
  // 普通Markdown渲染
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}

interface Task {
  id: string
  title: string
  status: "pending" | "in_progress" | "completed"
}

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp?: Date
  tasks?: Task[]
}

function TaskListRenderer({ content }: { content: string }) {
  const match = content.match(/<TASK_LIST>\s*([\s\S]*?)\s*<\/TASK_LIST>/)
  if (!match) return null

  try {
    const taskData = JSON.parse(match[1])
    const tasks: Task[] = taskData.tasks || []

    return (
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
        <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
          <Wrench className="size-4" />
          {taskData.title || "任务清单"}
        </h4>
        <div className="space-y-2">
          {tasks.map((task, i) => (
            <div key={task.id || i} className="flex items-center gap-3 p-2 bg-white dark:bg-zinc-800 rounded-lg">
              {task.status === "completed" ? (
                <CheckCircle2 className="size-5 text-green-500 shrink-0" />
              ) : task.status === "in_progress" ? (
                <Clock className="size-5 text-yellow-500 shrink-0 animate-pulse" />
              ) : (
                <Circle className="size-5 text-zinc-400 shrink-0" />
              )}
              <span className={cn(
                "text-sm flex-1",
                task.status === "completed" && "line-through text-zinc-400",
                task.status === "in_progress" && "font-medium text-blue-600 dark:text-blue-400"
              )}>
                {task.title}
              </span>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                task.status === "completed" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                task.status === "in_progress" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                task.status === "pending" && "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
              )}>
                {task.status === "completed" ? "已完成" : task.status === "in_progress" ? "进行中" : "待执行"}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  } catch (e) {
    return null
  }
}

const STAGE_PROMPTS = [
  {
    title: "阶段1：Agent 系统提示词",
    prompt: `你是莓小智，智能农业助手 Agent。

## 核心能力
- 实时环境监测与分析
- 设备控制与自动化
- 作物健康评估
- 预测性维护建议

## 回复准则
- 提供简洁、可执行的见解
- 使用专业农业术语
- 优先考虑安全性和效率
- 解释你的推理过程`,
    code: `// 基础 Agent 配置
const agent = {
  name: "莓小智",
  role: "农业助手",
  model: "qwen-plus",
  temperature: 0.7,
  systemPrompt: "你是莓小智..."
};

// 初始化 Agent
const response = await llm.chat({
  model: agent.model,
  messages: [
    { role: "system", content: agent.systemPrompt },
    { role: "user", content: userInput }
  ]
});`
  },
  {
    title: "阶段2：上下文注入",
    prompt: `你是莓小智，智能农业助手 Agent。

## 实时环境数据
- 温度：{{temperature}}°C
- 湿度：{{humidity}}%
- 光照强度：{{light}} lux
- CO₂ 浓度：{{co2}} ppm

## 分析准则
- 将当前值与最佳范围比较
- 识别潜在问题或异常
- 在需要时建议纠正措施
- 考虑季节和作物特定要求`,
    code: `// 动态上下文注入
async function buildContext() {
  const sensorData = await getSensorData();
  
  return {
    temperature: sensorData.temp,
    humidity: sensorData.humidity,
    light: sensorData.light,
    co2: sensorData.co2
  };
}

// 注入到系统提示词
const context = await buildContext();
const enhancedPrompt = systemPrompt
  .replace('{{temperature}}', context.temperature)
  .replace('{{humidity}}', context.humidity)
  .replace('{{light}}', context.light)
  .replace('{{co2}}', context.co2);

const response = await llm.chat({
  messages: [
    { role: "system", content: enhancedPrompt },
    { role: "user", content: userInput }
  ]
});`
  },
  {
    title: "阶段3：记忆与规划",
    prompt: `你是莓小智，智能农业助手 Agent。

## 环境数据
- 温度：{{temperature}}°C
- 湿度：{{humidity}}%
- 光照：{{light}} lux

## 任务规划能力
当识别到环境问题时，创建行动计划：

**计划格式：**
1. 问题识别
2. 根本原因分析
3. 推荐行动
4. 预期结果
5. 监测要点

示例：
"当前温度（{{temperature}}°C）超出最佳范围。
计划：
1. 启动通风系统
2. 监测温度下降
3. 10分钟内根据需要调整"`,
    code: `// 带记忆与规划的 Agent
class AgentWithMemory {
  constructor() {
    this.conversationHistory = [];
    this.taskQueue = [];
  }

  async plan(userInput, context) {
    // 添加到对话历史
    this.conversationHistory.push({
      role: "user",
      content: userInput,
      timestamp: Date.now()
    });

    // 生成计划
    const response = await llm.chat({
      messages: [
        { role: "system", content: this.buildPrompt(context) },
        ...this.conversationHistory
      ]
    });

    // 从响应中提取任务
    const tasks = this.parseTaskList(response);
    this.taskQueue.push(...tasks);

    return response;
  }

  parseTaskList(response) {
    // 从 AI 响应中解析结构化任务列表
    const taskRegex = /\\d+\\. (.+)/g;
    return [...response.matchAll(taskRegex)]
      .map(m => ({ title: m[1], status: 'pending' }));
  }
}`
  },
  {
    title: "阶段4：Agent + Tools",
    prompt: `你是莓小智，企业级智慧农业 Agent，具备工具调用能力。

## 当前环境数据
- 室内温度：{{temperature}}°C
- 室内湿度：{{humidity}}%
- 光照强度：{{light}} lux

## 可用工具
你可以通过输出 JSON 格式的控制指令来调用以下工具：

### 1. toggle_relay - 继电器控制
控制灌溉、通风、照明系统的继电器开关
- 参数：device (5-8), value (0=关闭, 1=开启)
- 设备映射：5=水泵, 6=风扇, 7=植物全光谱补光灯, 8=光照植物补光灯
- 应用场景：温湿度调节、灌溉调度

## 工具选择策略
1. 分析用户请求和环境上下文
2. 确定需要哪些工具
3. 计算最优参数
4. 通过 JSON 格式执行
5. 验证执行结果并反馈

## 控制指令格式
当需要执行操作时，在回复末尾输出控制指令：
<CONTROL>
{ "action": "toggle_relay", "device": 6, "value": 1 }
</CONTROL>

## 应用场景示例

**场景1：温度控制**
用户："太热了，开风扇"
分析：温度 {{temperature}}°C 超过阈值
工具：toggle_relay(device=6, value=1)
回复："好的，当前温度偏高，正在开启通风系统降温。"
<CONTROL>
{ "action": "toggle_relay", "device": 6, "value": 1 }
</CONTROL>

## 重要提示
- 每次只输出一个 <CONTROL> 标签
- JSON 格式必须正确，action 字段必填
- 回复要简洁专业，说明正在执行的操作
- 考虑设备安全和操作合理性`,
    code: `// 企业级 Agent 工具调用实现

// 1. 定义工具（OpenAI Function Calling 标准）
const tools = [
  {
    type: "function",
    function: {
      name: "toggle_relay",
      description: "控制继电器开关（灌溉/通风/照明）。设备ID：5=水泵, 6=风扇, 7=植物全光谱补光灯, 8=光照植物补光灯",
      parameters: {
        type: "object",
        properties: {
          device: {
            type: "integer",
            enum: [5, 6, 7, 8],
            description: "设备标识符"
          },
          value: {
            type: "integer",
            enum: [0, 1],
            description: "0=关闭, 1=开启"
          }
        },
        required: ["device", "value"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "move_stepper",
      description: "控制丝杆滑台进行摄像头定位。精度：±0.1mm，范围：0-700mm，速度：0-100mm/s",
      parameters: {
        type: "object",
        properties: {
          direction: {
            type: "string",
            enum: ["left", "right"],
            description: "移动方向"
          },
          distance: {
            type: "integer",
            minimum: 1,
            maximum: 700,
            description: "移动距离（毫米）"
          }
        },
        required: ["direction", "distance"]
      }
    }
  }
];

// 2. Agent 执行循环
class EnterpriseAgent {
  async execute(userInput, context) {
    // 构建增强提示词
    const systemPrompt = this.buildSystemPrompt(context);
    
    // 调用 LLM（支持工具调用）
    const response = await openai.chat.completions.create({
      model: "qwen-plus",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput }
      ],
      tools: tools,
      tool_choice: "auto"
    });

    // 处理函数调用
    if (response.choices[0].message.tool_calls) {
      const results = [];
      
      for (const toolCall of response.choices[0].message.tool_calls) {
        const result = await this.executeFunction(
          toolCall.function.name,
          JSON.parse(toolCall.function.arguments)
        );
        results.push(result);
      }
      
      return {
        message: response.choices[0].message.content,
        toolCalls: results
      };
    }
    
    return { message: response.choices[0].message.content };
  }

  async executeFunction(name, args) {
    switch (name) {
      case "toggle_relay":
        return await this.controlRelay(args.device, args.value);
      
      case "move_stepper":
        return await this.controlStepper(args.direction, args.distance);
      
      default:
        throw new Error(\`未知工具: \${name}\`);
    }
  }

  async controlStepper(direction, distance) {
    // 转换为硬件协议
    const pulses = distance * 160; // 1mm = 160脉冲
    const dir = direction === "left" ? 1 : 2;
    
    // 发送 MQTT 控制指令
    await mqtt.publish("meimefarm/control/stepper", {
      stepper_direction: dir,
      stepper_pulses: pulses,
      stepper_mode: 6
    });
    
    // 等待完成并验证
    await this.waitForCompletion(distance);
    const newPosition = await this.getStepperPosition();
    
    return {
      success: true,
      function: "move_stepper",
      parameters: { direction, distance },
      result: \`摄像头已定位到 \${newPosition}mm\`
    };
  }
}

// 3. 使用示例
const agent = new EnterpriseAgent();
const result = await agent.execute(
  "检查所有草莓植株",
  { temperature: 25, humidity: 60, light: 15000 }
);

console.log(result);
// 输出:
// {
//   message: "开始全面巡检...",
//   toolCalls: [
//     { function: "move_stepper", result: "..." },
//     { function: "move_stepper", result: "..." }
//   ]
// }`
  },
  {
    title: "阶段5：生产级 Agent 系统",
    prompt: `你是莓小智，生产级农业 Agent，具备高级能力。

## 系统架构
- **感知层**：实时传感器融合、计算机视觉
- **认知层**：LLM 推理、知识库、记忆系统
- **决策层**：多步骤规划、工具编排
- **执行层**：函数调用、API 集成、反馈循环

## 环境上下文
- 温度：{{temperature}}°C
- 湿度：{{humidity}}%
- 光照：{{light}} lux
- 丝杆：{{stepper_position}}mm

## 高级能力

### 1. 自主监测
- 定期环境扫描
- 异常检测和告警
- 预测性维护

### 2. 多步骤任务执行
- 将复杂任务分解为子任务
- 顺序工具调用与验证
- 错误处理和重试逻辑

### 3. 学习与适应
- 用户偏好学习
- 历史模式分析
- 优化建议

## 可用工具
- toggle_relay：设备控制
- move_stepper：摄像头定位
- query_sensor：数据检索
- schedule_task：自动化设置
- analyze_image：视觉 AI 集成

## 执行策略
1. **理解**：解析用户意图和上下文
2. **规划**：生成多步骤执行计划
3. **执行**：按最优顺序调用工具
4. **验证**：检查结果并处理错误
5. **报告**：提供全面反馈

## 控制指令格式
<CONTROL>
{ "action": "工具名", ...参数 }
</CONTROL>`,
    code: `// 生产级 Agent 系统（ReAct 模式）

class ProductionAgent {
  constructor(config) {
    this.llm = config.llm;
    this.tools = config.tools;
    this.memory = new MemorySystem();
    this.maxIterations = 10;
  }

  async run(userInput, context) {
    let iteration = 0;
    const executionLog = [];

    while (iteration < this.maxIterations) {
      // 1. 推理：思考下一步行动
      const thought = await this.reason(userInput, context, executionLog);
      
      if (thought.isComplete) {
        return this.generateFinalResponse(executionLog);
      }

      // 2. 行动：执行工具调用
      if (thought.toolCalls) {
        for (const call of thought.toolCalls) {
          const result = await this.executeTool(call);
          executionLog.push({
            iteration,
            tool: call.name,
            args: call.args,
            result: result
          });
        }
      }

      // 3. 观察：分析结果
      const observation = await this.observe(executionLog);
      context.lastObservation = observation;

      iteration++;
    }

    throw new Error("达到最大迭代次数");
  }

  async reason(input, context, log) {
    const prompt = this.buildReasoningPrompt(input, context, log);
    
    const response = await this.llm.chat({
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: input }
      ],
      tools: this.tools,
      tool_choice: "auto"
    });

    return {
      thought: response.choices[0].message.content,
      toolCalls: response.choices[0].message.tool_calls,
      isComplete: this.checkCompletion(response, log)
    };
  }

  buildReasoningPrompt(input, context, log) {
    return \`你是一个农业 Agent。当前状态：

环境：温度 \${context.temperature}°C，湿度 \${context.humidity}%

执行日志：
\${log.map(l => \`- \${l.tool}(\${JSON.stringify(l.args)}): \${l.result}\`).join('\\n')}

任务：\${input}

逐步思考：
1. 到目前为止完成了什么？
2. 接下来需要做什么？
3. 应该调用哪个工具？
4. 任务是否完成？\`;
  }

  async executeTool(call) {
    const handler = this.tools[call.name];
    if (!handler) throw new Error(\`未知工具: \${call.name}\`);
    
    try {
      const result = await handler.execute(call.args);
      await this.memory.store({
        tool: call.name,
        args: call.args,
        result: result,
        timestamp: Date.now()
      });
      return result;
    } catch (error) {
      return { error: error.message };
    }
  }

  async observe(log) {
    const lastResult = log[log.length - 1];
    
    // 验证执行
    if (lastResult.tool === 'move_stepper') {
      const currentPos = await this.getStepperPosition();
      return {
        success: !lastResult.result.error,
        verification: \`位置: \${currentPos}mm\`,
        nextAction: this.suggestNextAction(log)
      };
    }
    
    return { success: true };
  }
}

// 初始化生产级 Agent
const agent = new ProductionAgent({
  llm: openai,
  tools: {
    toggle_relay: new RelayTool(),
    move_stepper: new StepperTool(),
    query_sensor: new SensorTool(),
    schedule_task: new SchedulerTool()
  }
});

// 执行复杂任务
const result = await agent.run(
  "执行全面温室巡检并优化环境",
  { temperature: 28, humidity: 55, light: 12000 }
);

// Agent 将自主完成：
// 1. 分析当前条件
// 2. 规划巡检路线
// 3. 移动摄像头到各区域
// 4. 捕获并分析图像
// 5. 调整环境控制
// 6. 生成综合报告`
  }
]

const DEFAULT_DEVICE_DATA = {
  temperature: 32.5,
  humidity: 55,
  light: 12000,
  co2: 380,
  stepper_position: 350,
  stepper_direction: 0
}

export default function PromptDemoPage() {
  const [currentStage, setCurrentStage] = useState(3) // Default to Stage 4: Agent + Tools
  const [customPrompt, setCustomPrompt] = useState(STAGE_PROMPTS[3].prompt)
  const [customCode, setCustomCode] = useState(STAGE_PROMPTS[3].code)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showCode, setShowCode] = useState(true)
  const [deviceData, setDeviceData] = useState(DEFAULT_DEVICE_DATA)
  const [apiUrl, setApiUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState<"prompt" | "data" | "stepper" | "mqtt">("prompt")
  const [isPublishing, setIsPublishing] = useState(false)
  const [isStepperMoving, setIsStepperMoving] = useState(false)
  const [cameraUrl, setCameraUrl] = useState("")
  const [showWorkflow, setShowWorkflow] = useState(false)
  const [workflowSteps, setWorkflowSteps] = useState<Array<{
    id: number
    title: string
    description: string
    status: 'pending' | 'active' | 'completed'
    timestamp?: number
    details?: string
  }>>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isTypingPrompt, setIsTypingPrompt] = useState(false)
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 提示词片段 - 用于演示打字
  const PROMPT_SECTIONS = {
    base: `你是莓小智，企业级智慧农业 Agent，具备工具调用能力。

## 当前环境数据
- 室内温度：{{temperature}}°C
- 室内湿度：{{humidity}}%
- 光照强度：{{light}} lux`,
    
    tools: `

## 可用工具
你可以通过输出 JSON 格式的控制指令来调用以下工具：

### 1. toggle_relay - 继电器控制
控制灌溉、通风、照明系统的继电器开关
- 参数：device (5-8), value (0=关闭, 1=开启)
- 设备映射：5=水泵, 6=风扇, 7=植物全光谱补光灯, 8=光照植物补光灯
- 应用场景：温湿度调节、灌溉调度`,
    
    stepper: `

### 2. move_stepper - 丝杆滑台控制
控制线性执行器进行摄像头定位（精准农业监测）
- 参数：direction ("left"/"right"), distance (1-700mm)
- 技术规格：±0.1mm 精度, 160脉冲/mm, 滚珠丝杆传动
- 应用场景：多区域作物巡检、病害检测、生长监测`,
    
    strategy: `

## 工具选择策略
1. 分析用户请求和环境上下文
2. 确定需要哪些工具
3. 计算最优参数
4. 通过 JSON 格式执行
5. 验证执行结果并反馈`,
    
    format: `

## 控制指令格式
当需要执行操作时，在回复末尾输出控制指令：
<CONTROL>
{ "action": "move_stepper", "direction": "left", "distance": 150 }
</CONTROL>`,
    
    examples: `

## 应用场景示例

**场景1：温度控制**
用户："太热了，开风扇"
分析：温度 {{temperature}}°C 超过阈值
工具：toggle_relay(device=6, value=1)
回复："好的，当前温度偏高，正在开启通风系统降温。"
<CONTROL>
{ "action": "toggle_relay", "device": 6, "value": 1 }
</CONTROL>

**场景2：作物巡检**
用户："看看左边的草莓"
分析：需要将摄像头移动到左侧巡检区
工具：move_stepper(direction="left", distance=150)
回复："好的，正在将摄像头移动到左侧巡检区（150mm）。"
<CONTROL>
{ "action": "move_stepper", "direction": "left", "distance": 150 }
</CONTROL>`,
    
    stepperExamples: `

## 丝杆滑台应用场景

**场景：作物巡检**
用户："看看左边的草莓"
分析：需要将摄像头移动到左侧巡检区
工具：move_stepper(direction="left", distance=150)
回复："好的，正在将摄像头移动到左侧巡检区（150mm）。"
<CONTROL>
{ "action": "move_stepper", "direction": "left", "distance": 150 }
</CONTROL>

**场景：精准定位**
用户："把摄像头移到右边200mm"
分析：用户指定了精确的移动距离
工具：move_stepper(direction="right", distance=200)
回复："好的，正在将摄像头向右移动200mm。"
<CONTROL>
{ "action": "move_stepper", "direction": "right", "distance": 200 }
</CONTROL>

**场景：全区域巡检**
用户："巡检所有种植区"
分析：需要顺序移动摄像头到各个区域
工具：多次调用 move_stepper
回复："开始全区域巡检，正在移动到第一个区域..."
<CONTROL>
{ "action": "move_stepper", "direction": "left", "distance": 250 }
</CONTROL>`,
    
    notes: `

## 重要提示
- 每次只输出一个 <CONTROL> 标签
- JSON 格式必须正确，action 字段必填
- 回复要简洁专业，说明正在执行的操作
- 考虑设备安全和操作合理性`
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // 全局快捷键监听 - Alt+1~5 演示打字不同部分
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return
      if (activeTab !== 'prompt' || isTypingPrompt) return
      
      const keyMap: { [key: string]: keyof typeof PROMPT_SECTIONS } = {
        '1': 'tools',
        '2': 'strategy',
        '3': 'stepper',
        '4': 'format',
        '5': 'stepperExamples'
      }
      
      const section = keyMap[e.key]
      if (section) {
        e.preventDefault()
        handleAutoTypeSection(section)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, isTypingPrompt, customPrompt])

  // 自动打字指定部分
  const handleAutoTypeSection = async (section: keyof typeof PROMPT_SECTIONS) => {
    if (isTypingPrompt) return
    
    setIsTypingPrompt(true)
    
    const sectionText = PROMPT_SECTIONS[section]
    const currentText = customPrompt
    
    // 逐字打出内容（快速打字）
    const chars = sectionText.split("")
    for (let i = 0; i < chars.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20)) // 10-30ms per char
      setCustomPrompt(currentText + sectionText.substring(0, i + 1))
      
      // 自动滚动
      if (promptTextareaRef.current) {
        promptTextareaRef.current.scrollTop = promptTextareaRef.current.scrollHeight
      }
    }
    
    setIsTypingPrompt(false)
  }

  // 加载摄像头URL
  useEffect(() => {
    const loadCameraUrl = async () => {
      try {
        // 先尝试从localStorage加载
        const savedUrl = localStorage.getItem("prompt-demo-camera-url")
        if (savedUrl) {
          setCameraUrl(savedUrl)
          return
        }
        
        // 如果没有保存的URL，从API加载
        const res = await fetch('/api/greenhouse/cameras')
        if (res.ok) {
          const data = await res.json()
          const url = data.cameraAUrl || ""
          setCameraUrl(url)
          if (url) {
            localStorage.setItem("prompt-demo-camera-url", url)
          }
        }
      } catch (error) {
        console.error("Failed to load camera URL:", error)
      }
    }
    loadCameraUrl()
  }, [])

  const handleStageChange = (stage: number) => {
    setCurrentStage(stage)
    setCustomPrompt(STAGE_PROMPTS[stage].prompt)
    setCustomCode(STAGE_PROMPTS[stage].code)
    setMessages([])
    toast.success(`已切换到${STAGE_PROMPTS[stage].title}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: "user", content: input, timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    
    // 初始化工作流程
    setShowWorkflow(true)
    setWorkflowSteps([
      { 
        id: 1, 
        title: "接收用户输入", 
        description: `input="${input.substring(0, 50)}${input.length > 50 ? '...' : ''}"`, 
        status: 'completed', 
        timestamp: Date.now(),
        details: `User query received | length=${input.length} chars`
      },
      { 
        id: 2, 
        title: "注入上下文数据", 
        description: `context={ temp: ${deviceData.temperature}°C, humidity: ${deviceData.humidity}%, light: ${deviceData.light}lux }`, 
        status: 'active',
        details: `Injecting real-time sensor data into system prompt`
      },
      { 
        id: 3, 
        title: "LLM 推理分析", 
        description: `model="qwen-plus" | temperature=0.7`, 
        status: 'pending',
        details: `Sending request to LLM API endpoint`
      },
      { 
        id: 4, 
        title: "工具调用决策", 
        description: `Parsing <CONTROL> tags for function calls`, 
        status: 'pending',
        details: `Available tools: [toggle_relay, move_stepper]`
      },
      { 
        id: 5, 
        title: "执行控制指令", 
        description: `await mqtt.publish("meimefarm/control/...")`, 
        status: 'pending',
        details: `MQTT broker connection established`
      },
      { 
        id: 6, 
        title: "返回执行结果", 
        description: `response.status = 200 | streaming=true`, 
        status: 'pending',
        details: `Streaming response back to client`
      }
    ])

    try {
      // 步骤2：注入上下文
      setTimeout(() => {
        setWorkflowSteps(prev => prev.map(step => 
          step.id === 2 ? { ...step, status: 'completed', timestamp: Date.now(), details: `Context injected | variables replaced: 5` } :
          step.id === 3 ? { ...step, status: 'active', details: `POST /api/prompt-demo/chat | payload=${JSON.stringify({model: "qwen-plus"}).length}B` } : step
        ))
      }, 300)

      const enhancedPrompt = customPrompt
        .replace(/\{\{temperature\}\}/g, deviceData.temperature?.toString() || "暂无数据")
        .replace(/\{\{humidity\}\}/g, deviceData.humidity?.toString() || "暂无数据")
        .replace(/\{\{light\}\}/g, deviceData.light?.toString() || "暂无数据")
        .replace(/\{\{co2\}\}/g, deviceData.co2?.toString() || "暂无数据")
        .replace(/\{\{stepper_position\}\}/g, deviceData.stepper_position?.toString() || "0")

      const res = await fetch("/api/prompt-demo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: enhancedPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: input }
          ],
          model: "qwen-plus",
          apiUrl: apiUrl || undefined,
          apiKey: apiKey || undefined
        })
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || `请求失败: ${res.status}`)
      }

      // 步骤3：LLM 推理完成
      setTimeout(() => {
        setWorkflowSteps(prev => prev.map(step => 
          step.id === 3 ? { ...step, status: 'completed', timestamp: Date.now(), details: `Response received | tokens=${Math.floor(Math.random() * 200 + 100)}` } :
          step.id === 4 ? { ...step, status: 'active', details: `Scanning response for <CONTROL> tags...` } : step
        ))
      }, 800)

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response body")

      const assistantMessage: Message = { role: "assistant", content: "", timestamp: new Date() }
      setMessages(prev => [...prev, assistantMessage])

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue
          if (trimmedLine === "data: [DONE]") continue
          if (trimmedLine.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmedLine.slice(6))
              if (data.error) {
                assistantMessage.content = `Error: ${data.error}`
              } else if (data.choices?.[0]?.delta?.content !== undefined) {
                assistantMessage.content += data.choices[0].delta.content
                setMessages(prev => {
                  const newMsgs = [...prev]
                  newMsgs[newMsgs.length - 1] = { ...assistantMessage }
                  return newMsgs
                })
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // 步骤4：检查工具调用
      const controlMatch = assistantMessage.content.match(/<CONTROL>\s*([\s\S]*?)\s*<\/CONTROL>/)
      if (controlMatch) {
        setWorkflowSteps(prev => prev.map(step => 
          step.id === 4 ? { ...step, status: 'completed', description: `Found: ${controlMatch[1].substring(0, 40)}...`, timestamp: Date.now(), details: `Tool call detected | parsing JSON...` } :
          step.id === 5 ? { ...step, status: 'active', details: `Executing tool function...` } : step
        ))
        
        try {
          const controlData = JSON.parse(controlMatch[1])
          await executeControlCommand(controlData)
          
          // 步骤5：执行完成
          setTimeout(() => {
            setWorkflowSteps(prev => prev.map(step => 
              step.id === 5 ? { ...step, status: 'completed', description: `${controlData.action}(${JSON.stringify(controlData).substring(0, 30)}...)`, timestamp: Date.now(), details: `MQTT publish success | topic=meimefarm/control/*` } :
              step.id === 6 ? { ...step, status: 'active', details: `Finalizing response stream...` } : step
            ))
          }, 500)
        } catch (e) {
          console.error("Failed to parse control command:", e)
          setWorkflowSteps(prev => prev.map(step => 
            step.id === 5 ? { ...step, status: 'completed', description: `Error: ${e}`, timestamp: Date.now(), details: `Tool execution failed` } : step
          ))
        }
      } else {
        // 无工具调用
        setWorkflowSteps(prev => prev.map(step => 
          step.id === 4 ? { ...step, status: 'completed', description: 'No tool calls required', timestamp: Date.now(), details: `Direct response mode` } :
          step.id === 5 ? { ...step, status: 'completed', description: 'Skipped', timestamp: Date.now(), details: `No MQTT commands to execute` } :
          step.id === 6 ? { ...step, status: 'active', details: `Streaming text response...` } : step
        ))
      }
      
      // 步骤6：完成
      setTimeout(() => {
        setWorkflowSteps(prev => prev.map(step => 
          step.id === 6 ? { ...step, status: 'completed', timestamp: Date.now(), details: `Stream closed | total_time=${Date.now() - (prev[0].timestamp || 0)}ms` } : step
        ))
      }, 1000)
      
    } catch (error: any) {
      toast.error(error.message || "发送消息失败")
      setMessages(prev => prev.slice(0, -1))
      setWorkflowSteps([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setMessages([])
    toast.success("对话已清空")
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(customCode)
    toast.success("代码已复制")
  }

  // 自动打字效果
  const handleAutoType = async (text: string) => {
    if (isTyping) return
    
    setIsTyping(true)
    setInput("")
    
    const chars = text.split("")
    for (let i = 0; i < chars.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50)) // 30-80ms per char
      setInput(prev => prev + chars[i])
    }
    
    setIsTyping(false)
  }

  // 预设的演示文本
  const demoTexts = [
    "帮我看看左边的草莓",
    "把摄像头移到右边200mm",
    "巡检所有种植区域",
    "开启通风系统降温"
  ]

  const handlePublishMqtt = async () => {
    setIsPublishing(true)
    try {
      const res = await fetch("/api/mqtt/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temperature: deviceData.temperature * 10,
          humidity: deviceData.humidity * 10,
          light: deviceData.light,
          co2: deviceData.co2,
          stepper_position: deviceData.stepper_position,
          stepper_direction: deviceData.stepper_direction
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success("MQTT数据已发布")
      } else {
        toast.error(data.message || "发布失败")
      }
    } catch (error: any) {
      toast.error(error.message || "发布失败")
    } finally {
      setIsPublishing(false)
    }
  }

  const handleStepperControl = async (direction: "left" | "right" | "center") => {
    setIsStepperMoving(true)
    try {
      let stepper_direction = 0
      let stepper_pulses = 0
      let newPosition = deviceData.stepper_position

      if (direction === "left") {
        stepper_direction = 1
        stepper_pulses = 8000
        newPosition = Math.max(0, deviceData.stepper_position - 50)
      } else if (direction === "right") {
        stepper_direction = 2
        stepper_pulses = 8000
        newPosition = Math.min(700, deviceData.stepper_position + 50)
      } else {
        const currentPulses = deviceData.stepper_position * 160
        const middlePulses = 56000
        stepper_direction = currentPulses < middlePulses ? 1 : 2
        stepper_pulses = Math.abs(middlePulses - currentPulses)
        newPosition = 350
      }

      const res = await fetch("/api/mqtt/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "stepper",
          stepper_direction,
          stepper_pulses,
          stepper_mode: 6
        })
      })

      const data = await res.json()
      if (data.success) {
        setDeviceData({ ...deviceData, stepper_position: newPosition })
        toast.success(direction === "center" ? "丝杆滑台已归中" : `丝杆滑台${direction === "left" ? "左移" : "右移"}成功`)
      } else {
        toast.error(data.message || "控制失败")
      }
    } catch (error: any) {
      toast.error(error.message || "控制失败")
    } finally {
      setIsStepperMoving(false)
    }
  }

  const executeControlCommand = async (controlData: any) => {
    try {
      if (controlData.action === "move_stepper") {
        const direction = controlData.direction
        const distance = controlData.distance || 50

        let stepper_direction = 0
        let stepper_pulses = distance * 160
        let newPosition = deviceData.stepper_position

        if (direction === "left") {
          stepper_direction = 1
          newPosition = Math.max(0, deviceData.stepper_position - distance)
        } else if (direction === "right") {
          stepper_direction = 2
          newPosition = Math.min(700, deviceData.stepper_position + distance)
        } else if (direction === "stop") {
          stepper_direction = 0
          stepper_pulses = 0
        }

        const res = await fetch("/api/mqtt/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "stepper",
            stepper_direction,
            stepper_pulses,
            stepper_mode: 6
          })
        })

        const data = await res.json()
        if (data.success) {
          setDeviceData({ ...deviceData, stepper_position: newPosition })
          toast.success(`AI控制：丝杆滑台${direction === "left" ? "左移" : direction === "right" ? "右移" : "停止"} ${distance}mm`)
        } else {
          toast.error(`AI控制失败: ${data.message}`)
        }
      } else if (controlData.action === "toggle_relay") {
        const res = await fetch("/api/mqtt/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "relay",
            relayNum: controlData.device,
            newState: controlData.value
          })
        })

        const data = await res.json()
        if (data.success) {
          toast.success(`AI控制：继电器 ${controlData.device} 已${controlData.value ? "开启" : "关闭"}`)
        } else {
          toast.error(`AI控制失败: ${data.message}`)
        }
      }
    } catch (error: any) {
      toast.error(`执行控制命令失败: ${error.message}`)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="flex items-center justify-between px-8 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Enterprise Agent Builder</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              <span className="font-medium">Current Stage:</span> <span className="font-mono text-primary dark:text-emerald-400">{STAGE_PROMPTS[currentStage].title}</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex gap-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1 border border-zinc-200 dark:border-zinc-800">
            {STAGE_PROMPTS.map((stage, i) => (
              <Button
                key={i}
                variant={currentStage === i ? "default" : "ghost"}
                size="sm"
                onClick={() => handleStageChange(i)}
                className={cn(
                  "min-w-[80px] h-9 px-4 text-xs font-semibold",
                  currentStage === i 
                    ? "bg-primary hover:bg-emerald-700 text-white shadow-sm" 
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                Stage {i + 1}
              </Button>
            ))}
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowSettings(!showSettings)}
            className="gap-2 h-9 border-zinc-200 dark:border-zinc-800"
          >
            <Sparkles className="size-4" />
            <span className="text-xs font-medium">API Settings</span>
          </Button>
        </div>
      </header>

      {showSettings && (
        <div className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-8 py-5">
          <div className="max-w-5xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">API Configuration</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">API Endpoint URL</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.example.com/v1/chat/completions"
                  className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">Leave empty to use system default configuration</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">Your API key will be used for this session only</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-950">
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            <button
              onClick={() => setActiveTab("prompt")}
              className={cn(
                "flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all relative",
                activeTab === "prompt"
                  ? "border-emerald-600 text-primary dark:text-emerald-400 bg-white dark:bg-zinc-950"
                  : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"
              )}
            >
              <Code className="size-4" />
              System Prompt
            </button>
            <button
              onClick={() => setActiveTab("data")}
              className={cn(
                "flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all relative",
                activeTab === "data"
                  ? "border-emerald-600 text-primary dark:text-emerald-400 bg-white dark:bg-zinc-950"
                  : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"
              )}
            >
              <Database className="size-4" />
              Data Injection
            </button>
            <button
              onClick={() => setActiveTab("stepper")}
              className={cn(
                "flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all relative",
                activeTab === "stepper"
                  ? "border-emerald-600 text-primary dark:text-emerald-400 bg-white dark:bg-zinc-950"
                  : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"
              )}
            >
              <Camera className="size-4" />
              Stepper Control
            </button>
            <button
              onClick={() => setActiveTab("mqtt")}
              className={cn(
                "flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all relative",
                activeTab === "mqtt"
                  ? "border-emerald-600 text-primary dark:text-emerald-400 bg-white dark:bg-zinc-950"
                  : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"
              )}
            >
              <Radio className="size-4" />
              MQTT Publish
            </button>
          </div>

          {activeTab === "prompt" && (
            <>
              <div className="flex-1 p-6 relative">
                <textarea
                  ref={promptTextareaRef}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full h-full p-4 text-sm font-mono leading-relaxed bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="Enter your system prompt here..."
                  disabled={isTypingPrompt}
                />
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between px-6 py-3 bg-zinc-50 dark:bg-zinc-900">
                  <div className="flex items-center gap-2">
                    <Code className="size-4 text-zinc-500" />
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Implementation Reference</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCopyCode} className="h-8 text-xs gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      <Copy className="size-3.5" />
                      Copy Code
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowCode(!showCode)} className="h-8 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      {showCode ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                    </Button>
                  </div>
                </div>
                
                {showCode && (
                  <div className="bg-zinc-900 dark:bg-black p-6 border-t border-zinc-800">
                    <textarea
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value)}
                      className="w-full h-64 p-4 text-xs font-mono bg-zinc-800 dark:bg-zinc-900 border border-zinc-700 dark:border-zinc-800 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent leading-relaxed text-zinc-300"
                      placeholder="Implementation code reference..."
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "data" && (
            <div className="flex-1 p-4 overflow-auto">
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                  <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-3">
                    模拟设备数据（可编辑）
                  </h3>
                  <p className="text-xs text-primary dark:text-emerald-400 mb-4">
                    修改这些数据后，AI会基于新数据进行分析。用于演示不同场景。
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">室内温度 (°C)</label>
                      <input
                        type="number"
                        value={deviceData.temperature}
                        onChange={(e) => setDeviceData({ ...deviceData, temperature: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">室内湿度 (%)</label>
                      <input
                        type="number"
                        value={deviceData.humidity}
                        onChange={(e) => setDeviceData({ ...deviceData, humidity: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">光照强度 (lux)</label>
                      <input
                        type="number"
                        value={deviceData.light}
                        onChange={(e) => setDeviceData({ ...deviceData, light: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">CO2浓度 (ppm)</label>
                      <input
                        type="number"
                        value={deviceData.co2}
                        onChange={(e) => setDeviceData({ ...deviceData, co2: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeviceData({ temperature: 35, humidity: 45, light: 8000, co2: 320, stepper_position: 350, stepper_direction: 0 })}
                    >
                      高温低湿
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeviceData({ temperature: 22, humidity: 70, light: 20000, co2: 600, stepper_position: 350, stepper_direction: 0 })}
                    >
                      正常环境
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeviceData(DEFAULT_DEVICE_DATA)}
                    >
                      重置
                    </Button>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                    数据注入原理
                  </h3>
                  <div className="text-xs text-zinc-500 space-y-2">
                    <p>1. ESP32 通过 MQTT 上报传感器数据</p>
                    <p>2. 后端订阅 MQTT 消息，存储到 deviceData 变量</p>
                    <p>3. 用户发送消息时，将 deviceData 注入到 system prompt</p>
                    <p>4. AI 基于注入的实时数据进行分析和决策</p>
                  </div>
                  <div className="mt-4 bg-zinc-900 rounded-lg p-3">
                    <pre className="text-xs text-emerald-400 font-mono">
{`// 注入示例
const prompt = \`
当前温度：\${deviceData.temperature}°C
当前湿度：\${deviceData.humidity}%
\``}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "stepper" && (
            <div className="flex-1 p-4 overflow-auto">
              <div className="space-y-4">
                <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-4 border border-cyan-200 dark:border-cyan-800">
                  <h3 className="text-sm font-semibold text-cyan-700 dark:text-cyan-300 mb-3 flex items-center gap-2">
                    <Camera className="size-4" />
                    丝杆滑台 + 摄像头云台系统
                  </h3>
                  <p className="text-xs text-cyan-600 dark:text-cyan-400 mb-4">
                    基于步进电机驱动的精密线性运动平台，将摄像头安装在滑台上，实现单轴线性云台功能，为AI视觉系统提供可控移动视角。
                  </p>

                  {/* 技术参数卡片 */}
                  <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 mb-4">
                    <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1">
                      <Cpu className="size-3" />
                      技术参数
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-zinc-50 dark:bg-zinc-900 rounded p-2">
                        <span className="text-zinc-500">有效行程</span>
                        <p className="font-mono font-semibold text-cyan-600">700mm</p>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-900 rounded p-2">
                        <span className="text-zinc-500">定位精度</span>
                        <p className="font-mono font-semibold text-cyan-600">±0.1mm</p>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-900 rounded p-2">
                        <span className="text-zinc-500">丝杆导程</span>
                        <p className="font-mono font-semibold text-cyan-600">5mm/转</p>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-900 rounded p-2">
                        <span className="text-zinc-500">步进角度</span>
                        <p className="font-mono font-semibold text-cyan-600">1.8°/步</p>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-900 rounded p-2">
                        <span className="text-zinc-500">细分设置</span>
                        <p className="font-mono font-semibold text-cyan-600">32细分</p>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-900 rounded p-2">
                        <span className="text-zinc-500">移动速度</span>
                        <p className="font-mono font-semibold text-cyan-600">0-100mm/s</p>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-cyan-50 dark:bg-cyan-900/30 rounded text-[10px] text-cyan-600 dark:text-cyan-400">
                      <p className="font-medium mb-1">计算公式：</p>
                      <p className="font-mono">移动距离(mm) = 脉冲数 ÷ (200步/转 × 32细分 ÷ 5mm导程)</p>
                      <p className="font-mono">即：1mm = 160脉冲</p>
                    </div>
                  </div>

                  {/* 摄像头URL配置 */}
                  <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 mb-4">
                    <label className="block text-xs text-zinc-500 mb-2">摄像头流地址</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={cameraUrl}
                        onChange={(e) => setCameraUrl(e.target.value)}
                        placeholder="输入摄像头流URL (支持HLS/FLV/WebRTC)"
                        className="flex-1 px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          localStorage.setItem("prompt-demo-camera-url", cameraUrl)
                          toast.success("摄像头URL已保存")
                        }}
                        className="shrink-0"
                      >
                        保存
                      </Button>
                    </div>
                  </div>

                  {/* 摄像头预览区域 */}
                  <div className="bg-zinc-900 rounded-lg p-3 mb-4 relative overflow-hidden">
                    <div className="aspect-video bg-zinc-800 rounded-lg overflow-hidden relative">
                      {cameraUrl ? (
                        <LiveStreamPlayer
                          sources={[{ src: cameraUrl }]}
                          autoplay={true}
                          muted={true}
                          controls={true}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <Camera className="size-12 text-zinc-600 mb-2" />
                          <span className="text-xs text-zinc-500">请在上方配置摄像头URL</span>
                        </div>
                      )}
                      {/* 位置指示器 */}
                      {cameraUrl && (
                        <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-2">
                          <div className="size-2 rounded-full bg-cyan-500 animate-pulse" />
                          <span className="text-xs text-white font-mono">{deviceData.stepper_position}mm</span>
                        </div>
                      )}
                      {/* 移动方向指示 */}
                      {isStepperMoving && cameraUrl && (
                        <div className="absolute inset-0 bg-cyan-500/10 flex items-center justify-center pointer-events-none">
                          <div className="bg-cyan-500/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                            <Loader2 className="size-4 text-white animate-spin" />
                            <span className="text-sm text-white font-medium">移动中...</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                      <span>左侧区域 (0mm)</span>
                      <span>中心区域 (350mm)</span>
                      <span>右侧区域 (700mm)</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-zinc-500">当前位置</span>
                      <span className="text-lg font-bold text-cyan-600">{deviceData.stepper_position} mm</span>
                    </div>
                    
                    <div className="relative h-8 bg-zinc-200 dark:bg-zinc-700 rounded-full mb-4">
                      <div 
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-cyan-500 rounded-full shadow-lg",
                          isStepperMoving ? "animate-pulse" : "transition-all duration-500"
                        )}
                        style={{ left: `${(deviceData.stepper_position / 700) * 100}%` }}
                      />
                      <div className="absolute inset-0 flex justify-between items-center px-2">
                        <span className="text-[10px] text-zinc-400">0mm</span>
                        <span className="text-[10px] text-zinc-400">700mm</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStepperControl("left")}
                        disabled={isStepperMoving || deviceData.stepper_position <= 0}
                        className="gap-1"
                      >
                        {isStepperMoving ? <Loader2 className="size-4 animate-spin" /> : <ChevronLeft className="size-4" />}
                        左移
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStepperControl("center")}
                        disabled={isStepperMoving}
                      >
                        归中
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStepperControl("right")}
                        disabled={isStepperMoving || deviceData.stepper_position >= 700}
                        className="gap-1"
                      >
                        右移
                        {isStepperMoving ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* 工作原理说明 */}
                  <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 mb-4">
                    <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">工作原理</h4>
                    <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <div className="flex gap-2">
                        <span className="shrink-0 font-mono text-cyan-600">1.</span>
                        <p><strong>步进电机驱动：</strong>采用42步进电机（1.8°步距角），通过驱动器实现32细分控制，单步精度达0.0056mm</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="shrink-0 font-mono text-cyan-600">2.</span>
                        <p><strong>滚珠丝杆传动：</strong>5mm导程滚珠丝杆，将电机旋转运动转换为直线运动，传动效率≥90%</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="shrink-0 font-mono text-cyan-600">3.</span>
                        <p><strong>直线导轨支撑：</strong>双轨平行导轨设计，确保运动平稳性和承载能力（最大负载5kg）</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="shrink-0 font-mono text-cyan-600">4.</span>
                        <p><strong>位置反馈：</strong>通过脉冲计数实现位置闭环控制，实时上报当前位置到MQTT</p>
                      </div>
                    </div>
                  </div>

                  {/* 应用场景 */}
                  <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg p-3 mb-4 border border-cyan-200 dark:border-cyan-800">
                    <h4 className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 mb-2">智慧农业应用场景</h4>
                    <div className="space-y-2 text-xs">
                      <div className="bg-white/80 dark:bg-zinc-800/80 rounded p-2">
                        <p className="font-medium text-cyan-600 mb-1">🌱 作物生长监测</p>
                        <p className="text-zinc-600 dark:text-zinc-400">AI控制摄像头移动至不同种植区域，自动拍摄记录作物生长状态，建立时序数据库</p>
                      </div>
                      <div className="bg-white/80 dark:bg-zinc-800/80 rounded p-2">
                        <p className="font-medium text-cyan-600 mb-1">🔍 病虫害巡检</p>
                        <p className="text-zinc-600 dark:text-zinc-400">定时巡航扫描，AI视觉识别叶片异常，发现病害后自动停止并放大拍摄细节</p>
                      </div>
                      <div className="bg-white/80 dark:bg-zinc-800/80 rounded p-2">
                        <p className="font-medium text-cyan-600 mb-1">📊 果实成熟度评估</p>
                        <p className="text-zinc-600 dark:text-zinc-400">移动至果实密集区域，通过颜色识别判断成熟度，辅助采摘决策</p>
                      </div>
                      <div className="bg-white/80 dark:bg-zinc-800/80 rounded p-2">
                        <p className="font-medium text-cyan-600 mb-1">🎯 精准对焦目标</p>
                        <p className="text-zinc-600 dark:text-zinc-400">用户语音指令"看一下左边的草莓"，AI自动计算位置并移动摄像头对准</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-cyan-600 dark:text-cyan-400">
                    <p className="font-medium mb-2">核心优势：</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white dark:bg-zinc-800 rounded p-2">
                        <p className="font-semibold text-cyan-600">✓ 扩大监测范围</p>
                        <p className="text-zinc-500 text-[10px]">700mm行程覆盖多个种植区</p>
                      </div>
                      <div className="bg-white dark:bg-zinc-800 rounded p-2">
                        <p className="font-semibold text-cyan-600">✓ 精准定位</p>
                        <p className="text-zinc-500 text-[10px]">±0.1mm重复定位精度</p>
                      </div>
                      <div className="bg-white dark:bg-zinc-800 rounded p-2">
                        <p className="font-semibold text-cyan-600">✓ AI自主决策</p>
                        <p className="text-zinc-500 text-[10px]">根据任务自动选择观察位置</p>
                      </div>
                      <div className="bg-white dark:bg-zinc-800 rounded p-2">
                        <p className="font-semibold text-cyan-600">✓ 低成本方案</p>
                        <p className="text-zinc-500 text-[10px]">相比云台成本降低60%</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                    AI控制丝杆滑台 - 技术实现
                  </h3>
                  
                  {/* 控制协议 */}
                  <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 mb-3">
                    <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">MQTT控制协议</h4>
                    <div className="bg-zinc-900 rounded-lg p-3">
                      <pre className="text-xs text-emerald-400 font-mono">
{`// Topic: meimefarm/control/stepper
{
  "stepper_direction": 1,  // 0=停止 1=正转(左移) 2=反转(右移)
  "stepper_pulses": 16000, // 脉冲数 (100mm × 160)
  "stepper_mode": 6        // 运行模式
}

// 位置反馈 Topic: meimefarm/sensor/node0701
{
  "stepper_position": 350, // 当前位置(mm)
  "stepper_direction": 0   // 当前状态
}`}
                      </pre>
                    </div>
                  </div>

                  {/* AI工具定义 */}
                  <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 mb-3">
                    <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">AI工具函数定义</h4>
                    <div className="bg-zinc-900 rounded-lg p-3">
                      <pre className="text-xs text-cyan-400 font-mono">
{`// AI可调用的工具
{
  name: "move_stepper",
  description: "控制丝杆滑台移动摄像头到指定位置，用于调整视角、巡检作物或对准目标区域",
  parameters: {
    type: "object",
    properties: {
      direction: {
        type: "string",
        enum: ["left", "right", "stop"],
        description: "移动方向：left=左移(观察左侧区域)，right=右移(观察右侧区域)，stop=停止"
      },
      distance: {
        type: "number",
        description: "移动距离(mm)，范围1-700，建议单次移动≤200mm",
        minimum: 1,
        maximum: 700
      }
    },
    required: ["direction", "distance"]
  }
}

// AI决策示例
用户："帮我看看左边的草莓长得怎么样"
AI思考：需要移动摄像头到左侧区域
AI输出：
{
  "tool_call": {
    "name": "move_stepper",
    "arguments": { 
      "direction": "left", 
      "distance": 150 
    }
  }
}
// 系统执行：发送MQTT控制指令，移动滑台150mm`}
                      </pre>
                    </div>
                  </div>

                  {/* 安全机制 */}
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 mb-3 border border-amber-200 dark:border-amber-800">
                    <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">安全保护机制</h4>
                    <div className="space-y-1 text-xs text-amber-600 dark:text-amber-400">
                      <p>• <strong>软件限位：</strong>位置范围限制在0-700mm，超出范围自动拒绝</p>
                      <p>• <strong>硬件限位：</strong>两端安装限位开关，触发后立即停止并上报</p>
                      <p>• <strong>速度限制：</strong>最大速度100mm/s，防止冲击损坏设备</p>
                      <p>• <strong>失步检测：</strong>定期归零校准，消除累积误差</p>
                      <p>• <strong>断电保护：</strong>位置信息持久化存储，重启后恢复</p>
                    </div>
                  </div>
                  
                  <p className="text-xs text-zinc-500">
                    在阶段4/5中，AI可以根据任务需求自主控制丝杆滑台，实现"智能巡检"、"目标追踪"、"定点监测"等高级功能。
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "mqtt" && (
            <div className="flex-1 p-4 overflow-auto">
              <div className="space-y-4">
                <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4 border border-violet-200 dark:border-violet-800">
                  <h3 className="text-sm font-semibold text-violet-700 dark:text-violet-300 mb-3 flex items-center gap-2">
                    <Radio className="size-4" />
                    MQTT 模拟数据发布
                  </h3>
                  <p className="text-xs text-violet-600 dark:text-violet-400 mb-4">
                    修改数据后点击发布，模拟ESP32上报数据到MQTT服务器。用于演示数据注入流程。
                  </p>

                  <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">室内温度 (°C)</label>
                        <input
                          type="number"
                          value={deviceData.temperature}
                          onChange={(e) => setDeviceData({ ...deviceData, temperature: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">室内湿度 (%)</label>
                        <input
                          type="number"
                          value={deviceData.humidity}
                          onChange={(e) => setDeviceData({ ...deviceData, humidity: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">光照强度 (lux)</label>
                        <input
                          type="number"
                          value={deviceData.light}
                          onChange={(e) => setDeviceData({ ...deviceData, light: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">CO2浓度 (ppm)</label>
                        <input
                          type="number"
                          value={deviceData.co2}
                          onChange={(e) => setDeviceData({ ...deviceData, co2: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">丝杆位置 (mm)</label>
                        <input
                          type="number"
                          value={deviceData.stepper_position}
                          onChange={(e) => setDeviceData({ ...deviceData, stepper_position: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">丝杆方向</label>
                        <select
                          value={deviceData.stepper_direction}
                          onChange={(e) => setDeviceData({ ...deviceData, stepper_direction: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                        >
                          <option value={0}>停止</option>
                          <option value={1}>正转/左移</option>
                          <option value={2}>反转/右移</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeviceData({ temperature: 35, humidity: 45, light: 8000, co2: 320, stepper_position: 350, stepper_direction: 0 })}
                      >
                        高温低湿
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeviceData({ temperature: 22, humidity: 70, light: 20000, co2: 600, stepper_position: 350, stepper_direction: 0 })}
                      >
                        正常环境
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeviceData(DEFAULT_DEVICE_DATA)}
                      >
                        重置
                      </Button>
                    </div>

                    <Button
                      className="w-full gap-2"
                      onClick={handlePublishMqtt}
                      disabled={isPublishing}
                    >
                      {isPublishing ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                      发布到 MQTT
                    </Button>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                    MQTT 发布格式
                  </h3>
                  <div className="bg-zinc-900 rounded-lg p-3 mb-3">
                    <pre className="text-xs text-emerald-400 font-mono overflow-auto">
{`// Topic: meimefarm/sensor/node0701
{
  "temperature": ${deviceData.temperature * 10},
  "humidity": ${deviceData.humidity * 10},
  "light": ${deviceData.light},
  "co2": ${deviceData.co2},
  "stepper_position": ${deviceData.stepper_position},
  "stepper_direction": ${deviceData.stepper_direction},
  "timestamp": ${Date.now()}
}`}
                    </pre>
                  </div>
                  <p className="text-xs text-zinc-500">
                    温度和湿度需要乘以10发送（协议要求）。后端订阅后会自动处理并注入到AI提示词中。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950">
          {/* Console 风格工作流程 */}
          {showWorkflow && workflowSteps.length > 0 && (
            <div className="border-b border-zinc-800 bg-black text-green-400 font-mono text-[11px]">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-zinc-900">
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500 text-[10px]">$ agent-executor --verbose --trace</span>
                  <span className="text-zinc-700 text-[9px]">pid:{Math.floor(Math.random() * 90000 + 10000)}</span>
                </div>
                <button
                  onClick={() => setShowWorkflow(false)}
                  className="text-zinc-600 hover:text-zinc-400 text-[10px] px-1.5 hover:bg-zinc-800 rounded"
                >
                  [x]
                </button>
              </div>
              
              <div className="px-3 py-2 space-y-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                {workflowSteps.map((step) => (
                  <div key={step.id} className="space-y-0.5">
                    <div className="flex items-start gap-2 leading-relaxed">
                      <span className="text-zinc-700 shrink-0 text-[10px] font-mono">[{step.timestamp ? new Date(step.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }).replace(',', '.') : '--:--:--.---'}]</span>
                      <span className={cn(
                        "shrink-0 text-[11px]",
                        step.status === 'completed' && "text-green-500",
                        step.status === 'active' && "text-yellow-500",
                        step.status === 'pending' && "text-zinc-700"
                      )}>
                        {step.status === 'completed' ? '✓' : step.status === 'active' ? '⟳' : '○'}
                      </span>
                      <div className="flex-1 flex items-start gap-2">
                        <span className={cn(
                          "text-[11px] font-medium shrink-0",
                          step.status === 'completed' && "text-green-400",
                          step.status === 'active' && "text-yellow-400",
                          step.status === 'pending' && "text-zinc-600"
                        )}>
                          {step.title}
                        </span>
                        <span className="text-zinc-700 text-[10px] shrink-0">→</span>
                        <span className="text-zinc-500 text-[10px] flex-1 font-mono">{step.description}</span>
                      </div>
                    </div>
                    {step.details && (
                      <div className="flex items-start gap-2 pl-[140px]">
                        <span className="text-zinc-700 text-[9px]">└─</span>
                        <span className="text-zinc-600 text-[9px] italic">{step.details}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="size-2 rounded-full bg-primary animate-pulse shadow-lg shadow-emerald-500/50" />
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">AI Response Preview</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{messages.length} messages</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClear} 
              className="gap-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <Trash className="size-4" />
              <span className="text-xs font-medium">Clear History</span>
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                    msg.role === "user" && "flex-row-reverse"
                  )}>
                    <div className={cn(
                      "size-8 rounded-lg overflow-hidden shrink-0",
                      msg.role === "assistant" 
                        ? "bg-gradient-to-br from-primary to-cyan-500" 
                        : "bg-zinc-200 dark:bg-zinc-700"
                    )}>
                      {msg.role === "assistant" ? (
                        <Image src="/logo.png" alt="AI" width={32} height={32} className="object-cover" />
                      ) : (
                        <div className="size-full flex items-center justify-center">
                          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">U</span>
                        </div>
                      )}
                    </div>
                    
                    <div className={cn(
                      "flex-1 max-w-[85%] rounded-2xl px-4 py-3",
                      msg.role === "assistant" 
                        ? "bg-zinc-100 dark:bg-zinc-800" 
                        : "bg-primary text-white"
                    )}>
                      <MessageContent 
                        content={msg.content.replace(/<TASK_LIST>[\s\S]*?<\/TASK_LIST>/g, '').replace(/<CONTROL>[\s\S]*?<\/CONTROL>/g, '')} 
                        isStreaming={isLoading && i === messages.length - 1}
                      />
                      
                      {msg.role === "assistant" && msg.content.includes("<TASK_LIST>") && (
                        <TaskListRenderer content={msg.content} />
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="size-8 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-primary to-cyan-500">
                      <Image src="/logo.png" alt="AI" width={32} height={32} className="object-cover animate-pulse" />
                    </div>
                    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2 text-zinc-500">
                        <Loader2 className="size-4 animate-spin" />
                        <span className="text-sm">思考中...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            {/* 演示快捷按钮 */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
              <span className="text-xs text-zinc-500 shrink-0">演示:</span>
              {demoTexts.map((text, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAutoType(text)}
                  disabled={isTyping || isLoading}
                  className="text-xs shrink-0 h-7 px-3 border-zinc-300 dark:border-zinc-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:border-primary transition-all"
                >
                  <Play className="size-3 mr-1" />
                  {text}
                </Button>
              ))}
            </div>
            
            <form onSubmit={handleSubmit} className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                  placeholder="Type your test message here... (Shift+Enter for new line)"
                  className="w-full px-4 py-3 pr-14 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                  rows={1}
                  style={{ minHeight: "52px", maxHeight: "120px" }}
                  disabled={isTyping}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading || isTyping}
                  className="absolute right-2 bottom-2 size-9 bg-primary hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}