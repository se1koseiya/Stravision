"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Server, Shield, Zap, MessageSquare, Cloud, 
  Terminal, ChevronRight, Copy, Check, Lock, 
  Activity, Radio, Database, Globe, Clock
} from "lucide-react"

// --- Types ---

type ApiEndpoint = {
  method: "GET" | "POST" | "PUT" | "DELETE"
  path: string
  title: string
  description: string
  params?: { name: string; type: string; required: boolean; desc: string }[]
  body?: Record<string, any>
  response: Record<string, any>
}

type ApiGroup = {
  id: string
  name: string
  icon: React.ReactNode
  endpoints: ApiEndpoint[]
}

// --- Data ---

const apiData: ApiGroup[] = [
  {
    id: "admin",
    name: "Admin System",
    icon: <Lock className="w-4 h-4" />,
    endpoints: [
      {
        method: "GET",
        path: "/api/admin/users",
        title: "用户列表",
        description: "获取所有注册用户列表（仅管理员）。",
        params: [
          { name: "page", type: "number", required: false, desc: "页码" },
          { name: "limit", type: "number", required: false, desc: "每页数量" }
        ],
        response: {
          users: [
            { id: "1", username: "User1", role: "user" }
          ],
          total: 100
        }
      },
      {
        method: "POST",
        path: "/api/admin/announcement",
        title: "发布公告",
        description: "向所有用户发送系统通知。",
        body: {
          title: "System Maintenance",
          content: "We will be down for 1 hour.",
          type: "info"
        },
        response: { success: true }
      },
      {
        method: "GET",
        path: "/api/admin/access-logs",
        title: "访问日志",
        description: "查看系统的安全访问记录。",
        response: {
          logs: [
            { ip: "127.0.0.1", path: "/login", status: 200, time: "..." }
          ]
        }
      }
    ]
  },
  {
    id: "auth",
    name: "Authentication",
    icon: <Shield className="w-4 h-4" />,
    endpoints: [
      {
        method: "POST",
        path: "/api/auth/login",
        title: "用户登录",
        description: "使用邮箱和密码登录系统，获取 HTTP-Only Cookie。",
        body: {
          email: "user@example.com",
          password: "your_password"
        },
        response: {
          success: true,
          user: { id: "1", username: "User", role: "user" }
        }
      },
      {
        method: "POST",
        path: "/api/auth/register",
        title: "用户注册",
        description: "注册新用户账号。",
        body: {
          username: "NewUser",
          email: "new@example.com",
          password: "strong_password"
        },
        response: { success: true }
      },
      {
        method: "GET",
        path: "/api/auth/me",
        title: "获取当前用户",
        description: "获取当前登录用户的会话信息。",
        response: {
          id: "1",
          email: "user@example.com",
          username: "User",
          role: "admin",
          permissions: ["read", "write"]
        }
      }
    ]
  },
  {
    id: "ai",
    name: "AI & Control",
    icon: <Zap className="w-4 h-4" />,
    endpoints: [
      {
        method: "POST",
        path: "/api/ai/device-control",
        title: "AI 设备控制",
        description: "通过自然语言或结构化指令控制 IoT 设备。",
        body: {
          action: "turn_on",
          device: "fan_1",
          value: 100,
          reasoning: "Temperature is high"
        },
        response: { success: true, message: "Command executed" }
      },
      {
        method: "POST",
        path: "/api/ai/generate-schedule",
        title: "生成定时任务",
        description: "根据用户描述自动生成设备定时任务。",
        body: {
          prompt: "每天早上8点开启补光灯，持续4小时"
        },
        response: {
          schedule: {
            cron: "0 8 * * *",
            action: "light_on",
            duration: 240
          }
        }
      }
    ]
  },
  {
    id: "chat",
    name: "Chat System",
    icon: <MessageSquare className="w-4 h-4" />,
    endpoints: [
      {
        method: "POST",
        path: "/api/chat",
        title: "发送消息",
        description: "与 AI 助手进行对话交互。",
        body: {
          messages: [
            { role: "user", content: "当前大棚状态如何？" }
          ],
          model: "qwen-max"
        },
        response: {
          role: "assistant",
          content: "当前温度 24°C，湿度 65%，一切正常。"
        }
      }
    ]
  },
  {
    id: "iot",
    name: "IoT & Data",
    icon: <Radio className="w-4 h-4" />,
    endpoints: [
      {
        method: "GET",
        path: "/api/mqtt/stream",
        title: "实时数据流 (SSE)",
        description: "Server-Sent Events (SSE) 接口，用于接收实时设备数据推送。",
        response: {
          type: "data",
          timestamp: 1715000000000,
          data: {
            "environment/temp": 24.5,
            "device/fan_1/status": "on"
          }
        }
      },
      {
        method: "POST",
        path: "/api/mqtt/control",
        title: "控制继电器",
        description: "控制8路继电器开关 (如风扇、水泵、补光灯)。",
        body: {
          topic: "device/control/relay",
          payload: {
            type: "relay",
            relayNum: 1,
            newState: 1
          }
        },
        response: { success: true, message: "Published" }
      },
      {
        method: "POST",
        path: "/api/mqtt/control",
        title: "控制 RGB 灯光",
        description: "控制植物补光灯的颜色配比。",
        body: {
          topic: "device/control/led",
          payload: {
            type: "led",
            led1: 255,
            led2: 0,
            led3: 0,
            led4: 0
          }
        },
        response: { success: true, message: "Published" }
      },
      {
        method: "POST",
        path: "/api/mqtt/control",
        title: "获取光谱数据",
        description: "主动请求光谱传感器上报当前数据。",
        body: {
          topic: "device/control/spectrum",
          payload: {
            type: "spectrum",
            action: "read"
          }
        },
        response: { success: true, message: "Published" }
      },
      {
        method: "POST",
        path: "/api/mqtt/control",
        title: "控制步进电机",
        description: "控制滑轨步进电机的运动。",
        body: {
          topic: "device/control/motor",
          payload: {
            type: "step_motor",
            motor_id: 1,
            target_position: 1000,
            speed: 500
          }
        },
        response: { success: true, message: "Published" }
      },
      {
        method: "GET",
        path: "/api/device-history",
        title: "设备历史数据",
        description: "获取指定设备的历史传感器数据。",
        params: [
          { name: "device", type: "string", required: true, desc: "设备ID" },
          { name: "limit", type: "number", required: false, desc: "返回条数" }
        ],
        response: {
          data: [
            { time: "10:00", value: 24.5 },
            { time: "10:05", value: 24.6 }
          ]
        }
      },
      {
        method: "GET",
        path: "/api/device-logs",
        title: "设备操作日志",
        description: "获取设备的操作和控制日志。",
        params: [
          { name: "limit", type: "number", required: false, desc: "返回条数 (默认50)" }
        ],
        response: {
          success: true,
          logs: [
            { id: 1, device_name: "fan_1", action: "turn_on", operator: "admin", created_at: 1715000000000 }
          ]
        }
      }
    ]
  },
  {
    id: "agri",
    name: "Smart Agriculture",
    icon: <Cloud className="w-4 h-4" />,
    endpoints: [
      {
        method: "GET",
        path: "/api/plant-growth",
        title: "植物生长状态",
        description: "获取当前的植物生长分析数据（缓存）。",
        response: {
          success: true,
          data: {
            stage: "flowering",
            health: "good",
            metrics: { height: 15.5, leaf_count: 12 }
          },
          lastAnalyzed: 1715000000000
        }
      },
      {
        method: "POST",
        path: "/api/vlm/analyze-frame",
        title: "视觉诊断 (VLM)",
        description: "上传图片进行 AI 视觉分析，识别病虫害或生长阶段。",
        body: {
          imageData: "data:image/jpeg;base64,...",
          model: "qwen-vl-plus",
          apiKey: "sk-..."
        },
        response: {
          analysis: "Detected healthy strawberry leaves.",
          health_score: 95
        }
      }
    ]
  },
  {
    id: "scheduler",
    name: "Task Scheduler",
    icon: <Clock className="w-4 h-4" />,
    endpoints: [
      {
        method: "GET",
        path: "/api/scheduler/tasks",
        title: "获取任务列表",
        description: "获取所有定时任务（包含 Cron 任务和一次性任务）。",
        response: {
          success: true,
          tasks: [
            { id: 1, name: "Morning Light", cron_expression: "0 8 * * *", action: "light_on", next_run: 1715000000000 }
          ]
        }
      },
      {
        method: "POST",
        path: "/api/scheduler/tasks",
        title: "创建任务",
        description: "创建一个新的定时任务。",
        body: {
          name: "Watering",
          type: "cron",
          cron_expression: "0 18 * * *",
          target_device: "pump_1",
          action_payload: { status: "on", duration: 300 }
        },
        response: { success: true, task: { id: 2 } }
      }
    ]
  },
  {
    id: "system",
    name: "System & Utils",
    icon: <Server className="w-4 h-4" />,
    endpoints: [
      {
        method: "GET",
        path: "/api/weather",
        title: "天气查询",
        description: "获取大棚所在地的实时天气信息。",
        response: {
          temp: 22,
          humidity: 45,
          condition: "Cloudy"
        }
      },
      {
        method: "GET",
        path: "/api/citations",
        title: "知识库引用",
        description: "获取 AI 回答的引用来源。",
        response: {
          sources: [
            { title: "Strawberry Planting Guide", url: "..." }
          ]
        }
      }
    ]
  }
]

// --- Components ---

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    POST: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    PUT: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    DELETE: "bg-red-500/20 text-red-400 border-red-500/30"
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${colors[method] || "bg-gray-500/20"}`}>
      {method}
    </span>
  )
}

function CodeBlock({ code, label }: { code: string | object, label?: string }) {
  const [copied, setCopied] = useState(false)
  const content = typeof code === "string" ? code : JSON.stringify(code, null, 2)

  const copy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group mt-2">
      {label && <div className="text-[10px] text-gray-500 mb-1 font-mono uppercase tracking-wider">{label}</div>}
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-lg overflow-hidden">
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={copy} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors">
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
        <pre className="p-4 text-xs font-mono text-gray-300 overflow-x-auto custom-scrollbar">
          {content}
        </pre>
      </div>
    </div>
  )
}

export default function ApiDocsPage() {
  const [activeGroup, setActiveGroup] = useState("auth")
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(apiData[0].endpoints[0])

  // Initial select
  useEffect(() => {
    const group = apiData.find(g => g.id === activeGroup)
    if (group && group.endpoints.length > 0) {
      setSelectedEndpoint(group.endpoints[0])
    }
  }, [activeGroup])

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-emerald-500/30">
      {/* Background Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-transparent" />
      </div>

      <div className="relative z-10 flex h-screen overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-white/10 bg-[#020202]/50 backdrop-blur-xl flex flex-col">
          <div className="p-6 border-b border-white/10">
            <h1 className="text-xl font-bold font-jinbuti tracking-wide flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-500" />
              API DOCS
            </h1>
            <p className="text-[10px] text-gray-500 mt-1 font-mono">v4.0.2 // SYSTEM_ONLINE</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {apiData.map(group => (
              <div key={group.id}>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-3 px-2 uppercase tracking-wider">
                  {group.icon}
                  {group.name}
                </div>
                <div className="space-y-1">
                  {group.endpoints.map(endpoint => (
                    <button
                      key={endpoint.path + endpoint.method}
                      onClick={() => setSelectedEndpoint(endpoint)}
                      className={`w-full text-left px-3 py-2 rounded-md text-xs font-mono transition-all flex items-center justify-between group ${
                        selectedEndpoint === endpoint 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "text-gray-400 hover:bg-white/5 hover:text-white border border-transparent"
                      }`}
                    >
                      <span className="truncate mr-2">{endpoint.path}</span>
                      <span className={`text-[9px] px-1 rounded ${
                        endpoint.method === 'GET' ? 'text-blue-400 bg-blue-500/10' :
                        endpoint.method === 'POST' ? 'text-emerald-400 bg-emerald-500/10' :
                        'text-gray-400'
                      }`}>
                        {endpoint.method}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-[#050505] relative">
          {/* Header */}
          <div className="sticky top-0 z-20 bg-[#050505]/80 backdrop-blur-md border-b border-white/10 px-8 py-4 flex items-center justify-between">
             <div className="flex items-center gap-2 text-sm text-gray-400">
               <span>Docs</span>
               <ChevronRight className="w-4 h-4" />
               <span className="text-white">{selectedEndpoint.title}</span>
             </div>
             <div className="flex gap-2">
               <div className="px-3 py-1 bg-emerald-900/20 border border-emerald-500/20 rounded-full text-emerald-500 text-xs font-mono flex items-center gap-2">
                 <Activity className="w-3 h-3" />
                 Stable
               </div>
             </div>
          </div>

          <div className="p-8 max-w-4xl mx-auto pb-20">
            
            <motion.div
              key={selectedEndpoint.path + selectedEndpoint.method}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Endpoint Header */}
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <MethodBadge method={selectedEndpoint.method} />
                  <h2 className="text-3xl font-bold text-white tracking-tight">{selectedEndpoint.title}</h2>
                </div>
                <div className="flex items-center gap-2 font-mono text-sm bg-white/5 border border-white/10 rounded-lg p-3 w-full">
                  <Globe className="w-4 h-4 text-gray-500" />
                  <span className="text-emerald-500">{process.env.NEXT_PUBLIC_APP_URL || 'https://stravision.cheesestrawberry.top'}</span>
                  <span className="text-gray-300">{selectedEndpoint.path}</span>
                </div>
                <p className="mt-4 text-gray-400 leading-relaxed text-sm max-w-2xl">
                  {selectedEndpoint.description}
                </p>
              </div>

              {/* Request Params */}
              {selectedEndpoint.params && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-500" />
                    Query Parameters
                  </h3>
                  <div className="border border-white/10 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white/5 text-gray-400 font-mono text-xs uppercase">
                        <tr>
                          <th className="px-4 py-3 font-medium">Name</th>
                          <th className="px-4 py-3 font-medium">Type</th>
                          <th className="px-4 py-3 font-medium">Required</th>
                          <th className="px-4 py-3 font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {selectedEndpoint.params.map(param => (
                          <tr key={param.name} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-mono text-emerald-400">{param.name}</td>
                            <td className="px-4 py-3 text-purple-400 font-mono text-xs">{param.type}</td>
                            <td className="px-4 py-3">
                              {param.required ? (
                                <span className="text-red-400 text-xs bg-red-500/10 px-1.5 py-0.5 rounded">Required</span>
                              ) : (
                                <span className="text-gray-500 text-xs">Optional</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-400">{param.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Request Body */}
              {selectedEndpoint.body && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-500" />
                    Request Body
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div>
                       <p className="text-sm text-gray-400 mb-2">Content-Type: <span className="text-gray-300 font-mono">application/json</span></p>
                       <CodeBlock code={selectedEndpoint.body} label="JSON Payload" />
                     </div>
                     <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                       <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Schema Description</h4>
                       <ul className="space-y-2 text-sm text-gray-400">
                         {Object.keys(selectedEndpoint.body).map(key => (
                           <li key={key} className="flex items-start gap-2">
                             <span className="w-1 h-1 bg-blue-500 rounded-full mt-2" />
                             <span>
                               <code className="text-blue-300">{key}</code>: Description for {key}
                             </span>
                           </li>
                         ))}
                       </ul>
                     </div>
                  </div>
                </div>
              )}

              {/* Response */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-500" />
                  Response
                </h3>
                <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-lg p-4">
                   <div className="flex items-center gap-2 mb-2">
                     <span className="px-2 py-0.5 bg-green-500 text-black text-xs font-bold rounded">200 OK</span>
                     <span className="text-xs text-gray-500 font-mono">application/json</span>
                   </div>
                   <CodeBlock code={selectedEndpoint.response} label="Response Body" />
                </div>
              </div>

            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
