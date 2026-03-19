"use client"

import { ElderFriendlyProvider, useElderFriendly } from "@/lib/contexts/elder-friendly-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Eye, EyeOff, Thermometer, Droplets } from "lucide-react"
import { cn } from "@/lib/utils"

function TestContent() {
  const { isElderFriendlyMode, toggleElderFriendlyMode } = useElderFriendly()

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={cn(
              "font-bold text-slate-900",
              isElderFriendlyMode ? "text-4xl" : "text-3xl"
            )}>长辈友好模式测试</h1>
            <p className={cn(
              "text-slate-600 mt-2",
              isElderFriendlyMode ? "text-xl" : "text-lg"
            )}>测试字体大小和可读性改进</p>
          </div>
          
          <div className="flex items-center gap-4">
            {isElderFriendlyMode && (
              <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">
                <Eye className="size-3 mr-1" />
                长辈友好模式已开启
              </Badge>
            )}
            
            <Button
              onClick={toggleElderFriendlyMode}
              variant={isElderFriendlyMode ? "default" : "outline"}
              className={cn(
                "transition-all",
                isElderFriendlyMode 
                  ? "bg-blue-500 hover:bg-blue-600 text-white" 
                  : "hover:bg-blue-50 hover:text-blue-900"
              )}
            >
              {isElderFriendlyMode ? <Eye className="size-4 mr-2" /> : <EyeOff className="size-4 mr-2" />}
              {isElderFriendlyMode ? "关闭长辈友好模式" : "开启长辈友好模式"}
            </Button>
          </div>
        </div>

        {/* Test Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Temperature Card */}
          <Card className={cn(
            "p-6 bg-white shadow-sm border-0 rounded-3xl",
            isElderFriendlyMode && "elder-friendly-text"
          )}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-50">
                <Thermometer className="w-4 h-4 text-red-500" />
              </div>
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">环境温度</span>
            </div>
            
            <div className="flex items-start mb-2">
              <span className="text-5xl font-bold tracking-tighter text-slate-900">25.6</span>
              <span className="text-2xl font-medium mt-1 text-slate-400">°C</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-500">
                适宜温度
              </span>
            </div>
            
            <p className="text-sm text-slate-600 mt-4">
              当前温度处于舒适范围内，适合长时间活动。建议保持室内通风良好。
            </p>
          </Card>

          {/* Humidity Card */}
          <Card className={cn(
            "p-6 bg-white shadow-sm border-0 rounded-3xl",
            isElderFriendlyMode && "elder-friendly-text"
          )}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-blue-50">
                <Droplets className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">环境湿度</span>
            </div>
            
            <div className="flex items-start mb-2">
              <span className="text-5xl font-bold tracking-tighter text-slate-900">62</span>
              <span className="text-2xl font-medium mt-1 text-slate-400">%</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-500">
                舒适湿度
              </span>
            </div>
            
            <p className="text-sm text-slate-600 mt-4">
              湿度水平良好，有助于呼吸道健康。建议定期开窗通风以保持空气流通。
            </p>
          </Card>
        </div>

        {/* Instructions */}
        <Card className={cn(
          "p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-0 rounded-3xl mt-8",
          isElderFriendlyMode && "elder-friendly-text"
        )}>
          <h3 className="text-xl font-bold text-slate-900 mb-4">使用说明</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold mt-0.5">1</div>
              <p className="text-base text-slate-700">点击右上角的眼睛图标可以切换长辈友好模式</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold mt-0.5">2</div>
              <p className="text-base text-slate-700">开启后，所有文字会变得更大更清晰，方便阅读</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold mt-0.5">3</div>
              <p className="text-base text-slate-700">设置会自动保存，下次访问时会记住您的选择</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function TestElderFriendlyPage() {
  return (
    <ElderFriendlyProvider>
      <TestContent />
    </ElderFriendlyProvider>
  )
}