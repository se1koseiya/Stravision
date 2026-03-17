"use client"

import { motion, useScroll, useTransform, useInView } from "framer-motion"
import { useRef, useEffect, useState } from "react"
import { Sparkles } from "@/components/animate-ui/icons/sparkles";
import { Send } from "@/components/animate-ui/icons/send";
import { Bot } from "@/components/animate-ui/icons/bot";
import { User } from "@/components/animate-ui/icons/user";
import { RefreshCw } from "@/components/animate-ui/icons/refresh-cw";
import Image from "next/image"
import { MonitorCardMock, TaskCardMock, DeviceControlCardMock, DiseaseCardMock, DataChartCardMock } from "./chat-cards"

type ScenarioType = "disease" | "planting" | "device" | "data"

const scenarios = {
  planting: [
    { role: "user", text: "现在的草莓生长情况怎么样？" },
    { role: "ai", text: "根据最新的传感器数据，目前温室温度 24°C，湿度 65%，非常适合草莓生长。图像分析显示果实已进入成熟期，建议适当增加光照时长。", component: <MonitorCardMock /> },
    { role: "user", text: "帮我开启补光灯，设定时长2小时" },
    { role: "ai", text: "好的，已为您开启补光灯，预计将在 16:30 自动关闭。还需要其他操作吗？", component: <TaskCardMock /> }
  ],
  disease: [
    { role: "user", text: "这片叶子看起来有点不对劲，帮我看看？" },
    { role: "ai", text: "正在分析图像... 检测到草莓白粉病的早期症状。这种病菌在高湿环境下容易滋生。", component: <DiseaseCardMock /> },
    { role: "user", text: "那我该怎么处理？" },
    { role: "ai", text: "建议您立即移除受感染的叶片，并开启排风扇降低湿度。我已经为您生成了具体的防治方案。" }
  ],
  device: [
    { role: "user", text: "把排风扇都打开，保持通风" },
    { role: "ai", text: "收到，正在开启排风扇...", component: <DeviceControlCardMock /> },
    { role: "ai", text: "排风扇已全部开启。当前风速等级：中等。您可以随时调整。" }
  ],
  data: [
    { role: "user", text: "我想看看最近一周的生长数据" },
    { role: "ai", text: "好的，这是近7天的环境数据分析报告。可以看到周三的温度波动较大，可能需要注意保温。", component: <DataChartCardMock /> },
    { role: "user", text: "导出这份报告" },
    { role: "ai", text: "报告已生成并发送到您的邮箱，请查收。" }
  ]
}

export function AiChatSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(chatRef, { margin: "-20% 0px -20% 0px" })
  const [activeMessageIndex, setActiveMessageIndex] = useState(-1)
  const [activeScenario, setActiveScenario] = useState<ScenarioType>("planting")
  const [isTyping, setIsTyping] = useState(false)

  // Reset chat when scenario changes or view changes
  useEffect(() => {
    if (isInView) {
      setActiveMessageIndex(-1)
      setIsTyping(false)
      
      let timeout: NodeJS.Timeout
      
      const playScenario = async () => {
        const messages = scenarios[activeScenario]
        
        for (let i = 0; i < messages.length; i++) {
          setIsTyping(true)
          // Typing delay
          await new Promise(r => setTimeout(r, 800))
          setIsTyping(false)
          setActiveMessageIndex(i)
          // Reading delay
          await new Promise(r => setTimeout(r, messages[i].text.length * 50 + 1000))
        }
      }

      playScenario()
      
      return () => {
        // Cleanup logic if needed, though async loop is hard to cancel cleanly without AbortController
        // simpler approach is to let it run but check mounted state if strictly needed
      }
    } else {
      setActiveMessageIndex(-1)
      setIsTyping(false)
    }
  }, [isInView, activeScenario])

  const handleScenarioChange = (scenario: ScenarioType) => {
    if (scenario === activeScenario) return
    setActiveScenario(scenario)
  }

  return (
    <section ref={containerRef} className="py-32 px-4 relative z-10 overflow-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* Text Content */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8 lg:pr-12"
        >

          
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            不懂种植技术？<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
              问问 AI 助手
            </span>
          </h2>
          
          <p className="text-gray-400 text-lg leading-relaxed">
            内置的大语言模型不仅能回答您的种植疑问，还能直接帮您控制设备。
            就像拥有一位随叫随到的资深农业专家，让管理变得像聊天一样简单。
          </p>

          <div className="flex items-center gap-4 h-12">
            {[
              { id: "disease", label: "病虫害识别" },
              { id: "planting", label: "种植建议" },
              { id: "device", label: "设备控制" },
              { id: "data", label: "数据查询" }
            ].map((tag) => {
              const isActive = activeScenario === tag.id
              return (
                <button
                  key={tag.id}
                  onClick={() => handleScenarioChange(tag.id as ScenarioType)}
                  className="group relative flex items-center justify-center outline-none"
                >
                  <motion.div
                    layout
                    initial={false}
                    animate={{
                      height: isActive ? 40 : 10,
                      width: isActive ? "auto" : 10,
                      backgroundColor: isActive ? "rgba(16, 185, 129, 0.1)" : "rgba(55, 65, 81, 1)",
                    }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    className={`rounded-full flex items-center justify-center overflow-hidden ${
                      isActive 
                        ? "border border-pink-500/30 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.2)]" 
                        : "group-hover:bg-gray-600"
                    }`}
                  >
                     {isActive && (
                         <motion.span 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-sm px-5 whitespace-nowrap font-medium"
                         >
                            {tag.label}
                         </motion.span>
                     )}
                  </motion.div>
                  {/* Invisible Overlay for easier clicking on small dots */}
                  {!isActive && <div className="absolute inset-[-10px] z-10 cursor-pointer" />}
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Chat Simulation */}
        <div ref={chatRef} className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-pink-500/5 to-purple-500/5 rounded-3xl blur-xl" />
          
          <div className="relative bg-[#0A0A0A] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl min-h-[500px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-[#0f0f0f]/80 backdrop-blur-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center relative overflow-hidden">
                <Image 
                  src="/logo.gif" 
                  alt="AI Assistant" 
                  fill 
                  className="object-contain p-1"
                  unoptimized
                />
              </div>
              <div>
                <h3 className="font-semibold text-white">莓界 AI 助手</h3>
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  在线
                </span>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-6 space-y-6 overflow-hidden flex flex-col justify-end">
              {scenarios[activeScenario].map((msg, i) => (
                <motion.div
                  key={`${activeScenario}-${i}`}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ 
                    opacity: i <= activeMessageIndex ? 1 : 0,
                    y: i <= activeMessageIndex ? 0 : 20,
                    scale: i <= activeMessageIndex ? 1 : 0.95
                  }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex-shrink-0 flex items-center justify-center mt-1 relative overflow-hidden">
                      <Image 
                        src="/logo.gif" 
                        alt="AI" 
                        fill 
                        className="object-contain p-1"
                        unoptimized
                      />
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-gray-800 text-gray-200 rounded-tl-none'
                  }`}>
                    <p className="mb-2">{msg.text}</p>
                    {msg.component && (
                      <div className="mt-3">
                        {msg.component}
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center mt-1">
                      <User className="w-4 h-4 text-gray-300" />
                    </div>
                  )}
                </motion.div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                 <motion.div 
                   initial={{ opacity: 0 }} 
                   animate={{ opacity: 1 }}
                   className="flex gap-2 ml-11"
                 >
                   <span className="w-2 h-2 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                   <span className="w-2 h-2 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                   <span className="w-2 h-2 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                 </motion.div>
              )}
            </div>

            {/* Input Area Mockup */}
            <div className="p-4 border-t border-gray-800 bg-[#0f0f0f]">
              <div className="relative">
                <div className="h-10 w-full bg-gray-900 rounded-full border border-gray-700 px-4 flex items-center text-gray-500 text-sm">
                  请输入您的问题...
                </div>
                <div className="absolute right-1 top-1 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <Send className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
