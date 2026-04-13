"use client"

import React, { useState, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { Loader2, Send, Trash, RotateCcw, Sparkles, Copy, Code, Eye, EyeOff, SquarePen, Database, Wrench, Play, ChevronRight, ChevronLeft, Cpu, Camera, Radio, Upload, CheckCircle2, Circle, Clock } from "lucide-react"

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false })

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
    title: "阶段1：最小可用AI",
    prompt: `你是莓小智，一个农业助手。`,
    code: `// /api/chat/route.ts
const systemPrompt = \`
你是莓小智，一个农业助手
\`;

const response = await openai.chat.completions.create({
  model: "qwen-plus",
  messages: [
    { role: "system", content: systemPrompt },
    ...messages
  ]
});`
  },
  {
    title: "阶段2：数据注入",
    prompt: `你是莓小智，智慧农业平台的智能体。

## 当前设备数据（实时注入）
- 室内温度：{{temperature}}°C
- 室内湿度：{{humidity}}%
- 光照强度：{{light}} lux
- CO2浓度：{{co2}} ppm

请基于上述数据进行分析。`,
    code: `// 1. ESP32 → MQTT 上报数据
// topic: greenhouse/data
// { "temp": 32.5, "humidity": 55 }

// 2. 后端订阅
let deviceData = {}
mqtt.on("message", (topic, msg) => {
  deviceData = JSON.parse(msg.toString())
})

// 3. 注入Prompt
const systemPrompt = \`
当前环境：
温度：\${deviceData.temp}
湿度：\${deviceData.humidity}
\``
  },
  {
    title: "阶段3：任务系统",
    prompt: `你是莓小智，智慧农业平台的智能体。

## 当前设备数据
- 室内温度：{{temperature}}°C
- 室内湿度：{{humidity}}%
- 光照强度：{{light}} lux

## 任务规划能力
当发现环境问题时，请生成任务清单：
<TASK_LIST>
{
  "title": "环境优化计划",
  "tasks": [
    { "id": "1", "title": "开启风扇降温", "status": "pending" },
    { "id": "2", "title": "监测温度变化", "status": "pending" }
  ]
}
</TASK_LIST>

请基于数据诊断并输出任务列表。`,
    code: `// 用内存或数据库存任务
let currentTaskList = {}

// AI输出格式
{
  "tasks": [
    {"id": 1, "title": "开风扇", "status": "in_progress"}
  ]
}

// 解析并执行
function parseTaskList(aiResponse) {
  const match = aiResponse.match(/<TASK_LIST>([\\s\\S]*?)<\\/TASK_LIST>/)
  if (match) {
    currentTaskList = JSON.parse(match[1])
    // 更新UI显示任务进度
  }
}`
  },
  {
    title: "阶段4：工具调用",
    prompt: `你是莓小智，智慧农业平台的智能体。

## 当前设备数据
- 室内温度：{{temperature}}°C
- 室内湿度：{{humidity}}%
- 光照强度：{{light}} lux
- 丝杆位置：{{stepper_position}}mm

## 可用工具
1. toggle_relay: 控制继电器开关
   参数: { "action": "toggle_relay", "device": 5-8, "value": 0或1 }
   
2. move_stepper: 控制丝杆滑台移动摄像头
   参数: { "action": "move_stepper", "direction": "left或right", "distance": 移动距离mm }

## 丝杆滑台说明
丝杆滑台上安装了摄像头，可以通过移动滑台来调整摄像头的观察位置。
- 行程范围：0-700mm
- 左移：摄像头向左移动，观察左侧区域
- 右移：摄像头向右移动，观察右侧区域

## 控制指令格式
当需要执行操作时，请在回复末尾输出控制指令：
<CONTROL>
{ "action": "move_stepper", "direction": "left", "distance": 100 }
</CONTROL>

示例对话：
用户：太热了，帮我开风扇
助手：好的，当前温度{{temperature}}°C确实偏高，我来为您开启风扇降温。
<CONTROL>
{ "action": "toggle_relay", "device": 6, "value": 1 }
</CONTROL>

用户：帮我把摄像头往左移一点
助手：好的，我来控制丝杆滑台将摄像头向左移动。
<CONTROL>
{ "action": "move_stepper", "direction": "left", "distance": 100 }
</CONTROL>`,
    code: `// 定义工具
const tools = [
  {
    name: "toggle_fan",
    description: "控制风扇",
    parameters: {
      type: "object",
      properties: {
        on: { type: "boolean" }
      }
    }
  },
  {
    name: "move_stepper",
    description: "控制丝杆滑台移动摄像头",
    parameters: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["left", "right", "stop"] },
        distance: { type: "number" }
      }
    }
  }
];

// AI返回
{
  "tool_call": {
    "name": "move_stepper",
    "arguments": { "direction": "left", "distance": 100 }
  }
}

// 后端执行
if (tool_call.name === "move_stepper") {
  mqtt.publish("stepper/control", JSON.stringify({
    direction: tool_call.arguments.direction,
    pulses: tool_call.arguments.distance * 160
  }))
}`
  },
  {
    title: "阶段5：Agent化",
    prompt: `你是莓小智，智慧农业平台的智能体 (Agent)。

## 核心能力
1. 感知：实时监控传感器数据
2. 思考：基于数据和知识库推理
3. 决策：制定分步解决方案
4. 行动：生成控制指令并执行

## 当前设备数据
- 室内温度：{{temperature}}°C
- 室内湿度：{{humidity}}%
- 光照强度：{{light}} lux
- 丝杆位置：{{stepper_position}}mm

## 可用工具
1. toggle_relay: 控制继电器
   { "action": "toggle_relay", "device": 5-8, "value": 0或1 }
   
2. move_stepper: 移动丝杆滑台（摄像头云台）
   { "action": "move_stepper", "direction": "left或right", "distance": mm }

## 自动模式
你可以主动监测环境并自动执行优化操作。
当检测到异常时，自动生成任务并执行。

控制指令格式：
<CONTROL>
{ "action": "工具名", ...参数 }
</CONTROL>`,
    code: `// Agent 自动循环
setInterval(async () => {
  const result = await askAI({
    deviceData,
    lastTask
  })

  if (result.tool_call) {
    execute(result.tool_call)
  }

}, 10000)

// 效果：AI自动检测温度、判断异常、自动开风扇
// 无需用户干预，AI自主决策执行`
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
  const [currentStage, setCurrentStage] = useState(0)
  const [customPrompt, setCustomPrompt] = useState(STAGE_PROMPTS[0].prompt)
  const [customCode, setCustomCode] = useState(STAGE_PROMPTS[0].code)
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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

    try {
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

      const controlMatch = assistantMessage.content.match(/<CONTROL>\s*([\s\S]*?)\s*<\/CONTROL>/)
      if (controlMatch) {
        try {
          const controlData = JSON.parse(controlMatch[1])
          await executeControlCommand(controlData)
        } catch (e) {
          console.error("Failed to parse control command:", e)
        }
      }
    } catch (error: any) {
      toast.error(error.message || "发送消息失败")
      setMessages(prev => prev.slice(0, -1))
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800">
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-200/50 dark:border-zinc-700/50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <SquarePen className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white">AI调试界面</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{STAGE_PROMPTS[currentStage].title}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
            {STAGE_PROMPTS.map((stage, i) => (
              <Button
                key={i}
                variant={currentStage === i ? "default" : "ghost"}
                size="sm"
                onClick={() => handleStageChange(i)}
                className={cn(
                  "w-8 h-8 p-0 text-xs font-mono",
                  currentStage === i && "bg-emerald-500 hover:bg-emerald-600"
                )}
              >
                {i + 1}
              </Button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Sparkles className="size-4" />
          </Button>
        </div>
      </header>

      {showSettings && (
        <div className="bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200/50 dark:border-zinc-700/50 p-3">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="API URL (留空使用系统配置)"
                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <div className="flex-1">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API Key (留空使用系统配置)"
                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r border-zinc-200/50 dark:border-zinc-700/50 flex flex-col bg-white dark:bg-zinc-900">
          <div className="flex border-b border-zinc-200/50 dark:border-zinc-700/50">
            <button
              onClick={() => setActiveTab("prompt")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === "prompt"
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              )}
            >
              <Code className="size-4" />
              Prompt
            </button>
            <button
              onClick={() => setActiveTab("data")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === "data"
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              )}
            >
              <Database className="size-4" />
              数据注入
            </button>
            <button
              onClick={() => setActiveTab("stepper")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === "stepper"
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              )}
            >
              <Camera className="size-4" />
              丝杆滑台
            </button>
            <button
              onClick={() => setActiveTab("mqtt")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === "mqtt"
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              )}
            >
              <Radio className="size-4" />
              MQTT发布
            </button>
          </div>

          {activeTab === "prompt" && (
            <>
              <div className="flex-1 p-4">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full h-full p-4 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="在此输入你的 prompt..."
                />
              </div>

              <div className="border-t border-zinc-200/50 dark:border-zinc-700/50">
                <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-2">
                    <Code className="size-4 text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-500">代码参考</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCopyCode} className="h-7 text-xs gap-1">
                      <Copy className="size-3" />
                      复制
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowCode(!showCode)} className="h-7">
                      {showCode ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                    </Button>
                  </div>
                </div>
                
                {showCode && (
                  <div className="bg-zinc-900 p-4">
                    <textarea
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value)}
                      className="w-full h-64 p-3 text-xs text-zinc-300 font-mono bg-zinc-800 border border-zinc-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      placeholder="在此编辑代码..."
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
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-4">
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
                    丝杆滑台 + 摄像头云台
                  </h3>
                  <p className="text-xs text-cyan-600 dark:text-cyan-400 mb-4">
                    将摄像头安装在丝杆滑台上，赋予摄像头"可控移动视角"，实现线性云台功能。
                  </p>

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

                  <div className="text-xs text-cyan-600 dark:text-cyan-400">
                    <p className="font-medium mb-1">核心价值：</p>
                    <ul className="list-disc list-inside space-y-1 text-cyan-500">
                      <li>扩大监测范围（700mm行程）</li>
                      <li>精准对准目标区域</li>
                      <li>AI可自主决定观察位置</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                    AI控制丝杆滑台
                  </h3>
                  <div className="bg-zinc-900 rounded-lg p-3 mb-4">
                    <pre className="text-xs text-cyan-400 font-mono">
{`// AI可调用的工具
{
  name: "move_stepper",
  description: "移动丝杆滑台调整摄像头视角",
  parameters: {
    direction: "left" | "right" | "stop",
    distance: number  // 移动距离(mm)
  }
}

// 示例：AI决定移动摄像头
{
  "tool_call": {
    "name": "move_stepper",
    "arguments": { 
      "direction": "left", 
      "distance": 100 
    }
  }
}`}
                    </pre>
                  </div>
                  
                  <p className="text-xs text-zinc-500">
                    在阶段4/5中，AI可以根据任务需求自主控制丝杆滑台，实现"智能巡检"功能。
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

        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200/50 dark:border-zinc-700/50">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">AI 预览</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1 text-zinc-500">
              <Trash className="size-4" />
              清空
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="size-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
                  <Sparkles className="size-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  开始演示
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
                  当前阶段：<strong>{STAGE_PROMPTS[currentStage].title}</strong>
                  <br />
                  在左侧编辑 Prompt 或修改数据，然后发送消息测试效果。
                </p>
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
                        ? "bg-gradient-to-br from-emerald-500 to-cyan-500" 
                        : "bg-zinc-200 dark:bg-zinc-700"
                    )}>
                      {msg.role === "assistant" ? (
                        <Image src="/icon.png" alt="AI" width={32} height={32} className="object-cover" />
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
                        : "bg-emerald-500 text-white"
                    )}>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{msg.content.replace(/<TASK_LIST>[\s\S]*?<\/TASK_LIST>/g, '').replace(/<CONTROL>[\s\S]*?<\/CONTROL>/g, '')}</ReactMarkdown>
                      </div>
                      
                      {msg.role === "assistant" && msg.content.includes("<TASK_LIST>") && (
                        <TaskListRenderer content={msg.content} />
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="size-8 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-emerald-500 to-cyan-500">
                      <Image src="/icon.png" alt="AI" width={32} height={32} className="object-cover animate-pulse" />
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

          <div className="p-4 border-t border-zinc-200/50 dark:border-zinc-700/50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
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
                  placeholder="输入测试问题..."
                  className="w-full px-4 py-3 pr-12 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  rows={1}
                  style={{ minHeight: "48px", maxHeight: "120px" }}
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 bottom-2 size-8"
                >
                  <Send className="size-4 text-emerald-500" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}