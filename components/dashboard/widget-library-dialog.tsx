"use client"

import { useState, useMemo, useEffect } from "react"
import { X, ArrowLeft, Search } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  TemperatureWidget,
  HumidityWidget,
  LightWidget,
  CO2Widget,
  SoilWidget,
  WeatherWidget,
  WeatherForecastWidget,
  AIInsightWidget,
  NutrientWidget,
} from "@/components/dashboard/ios-style"
import { MembershipCard } from "@/components/dashboard/membership-card"

interface WidgetInfo {
  id: string
  name: string
  description: string
  category: string
  supportedSizes: ('small' | 'medium' | 'large')[]
  component: React.ComponentType<any>
}

const AVAILABLE_WIDGETS: WidgetInfo[] = [
  {
    id: 'humidity',
    name: '湿度',
    description: '环境湿度监测',
    category: '环境',
    supportedSizes: ['small', 'medium', 'large'],
    component: HumidityWidget
  },
  {
    id: 'temperature',
    name: '温度',
    description: '环境温度监测',
    category: '环境',
    supportedSizes: ['small', 'medium', 'large'],
    component: TemperatureWidget
  },
  {
    id: 'light',
    name: '光照',
    description: '光照强度监测',
    category: '环境',
    supportedSizes: ['small', 'medium', 'large'],
    component: LightWidget
  },
  {
    id: 'co2',
    name: 'CO₂',
    description: '二氧化碳浓度',
    category: '环境',
    supportedSizes: ['small', 'medium', 'large'],
    component: CO2Widget
  },
  {
    id: 'weather',
    name: '天气',
    description: '当前天气状况',
    category: '环境',
    supportedSizes: ['small', 'medium', 'large'],
    component: WeatherWidget
  },
  {
    id: 'weather-forecast',
    name: '天气预报',
    description: '未来多日天气趋势',
    category: '环境',
    supportedSizes: ['medium', 'large'],
    component: WeatherForecastWidget
  },
  {
    id: 'soil',
    name: '土壤',
    description: '土壤湿度和肥力',
    category: '土壤',
    supportedSizes: ['small', 'medium', 'large'],
    component: SoilWidget
  },
  {
    id: 'nitrogen',
    name: '氮含量',
    description: '土壤氮元素',
    category: '土壤',
    supportedSizes: ['small', 'medium'],
    component: NutrientWidget
  },
  {
    id: 'phosphorus',
    name: '磷含量',
    description: '土壤磷元素',
    category: '土壤',
    supportedSizes: ['small', 'medium'],
    component: NutrientWidget
  },
  {
    id: 'potassium',
    name: '钾含量',
    description: '土壤钾元素',
    category: '土壤',
    supportedSizes: ['small', 'medium'],
    component: NutrientWidget
  },
  {
    id: 'ai-insight',
    name: 'AI 洞察',
    description: '智能分析和建议',
    category: 'AI',
    supportedSizes: ['small', 'medium', 'large'],
    component: AIInsightWidget
  },
  {
    id: 'membership',
    name: '会员',
    description: '会员等级信息',
    category: '其他',
    supportedSizes: ['medium', 'large'],
    component: MembershipCard
  }
]

interface WidgetLibraryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddWidget: (widgetId: string, size: 'small' | 'medium' | 'large') => void
  existingWidgets: string[]
}

const CATEGORIES = ['全部', '环境', '土壤', 'AI', '其他']

export function WidgetLibraryDialog({
  open,
  onOpenChange,
  onAddWidget,
  existingWidgets
}: WidgetLibraryDialogProps) {
  const [selectedWidget, setSelectedWidget] = useState<WidgetInfo | null>(null)
  const [selectedSize, setSelectedSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [activeCategory, setActiveCategory] = useState('全部')
  const [searchQuery, setSearchQuery] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)

  // Standardize thumbnail sizes: use 'small' if supported, else the smallest available
  const widgetLayout = useMemo(() => {
    return AVAILABLE_WIDGETS.map((widget) => {
      const thumbnailSize = widget.supportedSizes.includes('small')
        ? 'small'
        : widget.supportedSizes[0]
      return { widget, size: thumbnailSize }
    })
  }, [])

  const filteredWidgets = useMemo(() => {
    return widgetLayout.filter(w => {
      const matchCategory = activeCategory === '全部' || w.widget.category === activeCategory
      const matchSearch = w.widget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.widget.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCategory && matchSearch
    })
  }, [widgetLayout, activeCategory, searchQuery])

  useEffect(() => {
    if (open) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 800)
      return () => clearTimeout(timer)
    } else {
      setTimeout(() => {
        setSelectedWidget(null)
        setActiveCategory('全部')
        setSearchQuery('')
      }, 300)
    }
  }, [open])

  const handleWidgetSelect = (widget: WidgetInfo) => {
    setSelectedWidget(widget)
    setSelectedSize(widget.supportedSizes[0])
  }

  const handleAddWidget = () => {
    if (selectedWidget) {
      onAddWidget(selectedWidget.id, selectedSize)
      setSelectedWidget(null)
      onOpenChange(false)
    }
  }

  const getWidgetProps = (widgetId: string, size: 'small' | 'medium' | 'large') => {
    const baseProps = { size, className: 'h-full w-full pointer-events-none' }

    switch (widgetId) {
      case 'humidity': return { ...baseProps, value: 65 }
      case 'temperature': return { ...baseProps, value: 22, trend: 'stable' as const }
      case 'light': return { ...baseProps, value: 45000 }
      case 'co2': return { ...baseProps, value: 420 }
      case 'soil': return { ...baseProps, moisture: 55, fertility: 78 }
      case 'weather': return { ...baseProps, temperature: 22, condition: '晴朗', humidity: 65, windSpeed: 2.5 }
      case 'weather-forecast': return { ...baseProps, temperature: 22, condition: '多云', windSpeed: 2.5 }
      case 'nitrogen': return { ...baseProps, type: 'N', value: 120 }
      case 'phosphorus': return { ...baseProps, type: 'P', value: 85 }
      case 'potassium': return { ...baseProps, type: 'K', value: 200 }
      default: return baseProps
    }
  }

  if (!open) return null

  return (
    <AnimatePresence mode="wait">
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 bg-slate-900/40"
            style={{ backdropFilter: 'blur(20px)' }}
            onClick={() => !selectedWidget && onOpenChange(false)}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.96, y: 10, filter: "blur(5px)" }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="relative w-full max-w-[1040px] h-[720px] bg-white/50 backdrop-blur-[80px] rounded-[36px] border border-white/60 shadow-[0_45px_100px_-20px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,1)] flex overflow-hidden"
            style={{
              backdropFilter: 'blur(60px) saturate(200%)',
              WebkitBackdropFilter: 'blur(60px) saturate(200%)'
            }}
          >

            {!selectedWidget ? (
              <>
                {/* macOS Sidebar */}
                <div className="w-[260px] shrink-0 bg-white/40 border-r border-slate-200/50 flex flex-col pt-6 pb-6 shadow-[1px_0_10px_rgba(0,0,0,0.02)] z-10">
                  {/* Close & Header */}
                  <div className="px-6 mb-8 flex items-center gap-4">
                    <button
                      onClick={() => onOpenChange(false)}
                      className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-300/60 flex items-center justify-center text-slate-500 transition-colors shadow-sm"
                    >
                      <X className="w-4 h-4 text-slate-700" />
                    </button>
                    <h2 className="text-[20px] font-bold text-slate-800 tracking-tight">小组件库</h2>
                  </div>

                  {/* Search */}
                  <div className="px-5 mb-6">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="搜索"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/60 focus:bg-white border-white/80 border focus:border-blue-400/50 rounded-[10px] pl-9 pr-4 py-2 text-[14px] text-slate-700 outline-none transition-all placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
                      />
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="flex-1 overflow-y-auto px-4 space-y-1">
                    {CATEGORIES.map(category => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={cn(
                          "w-full text-left px-4 py-2.5 rounded-[10px] text-[14px] font-medium transition-all duration-200",
                          activeCategory === category
                            ? "bg-slate-800 text-white shadow-sm"
                            : "text-slate-700 hover:bg-white/60"
                        )}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* macOS Main Grid Area */}
                <div className="flex-1 flex flex-col bg-slate-50/20">
                  <div className="flex-1 overflow-y-auto px-10 pt-10 pb-10">
                    <AnimatePresence mode="popLayout">
                      <motion.div layout className="flex flex-wrap gap-x-8 gap-y-10 content-start">
                        {filteredWidgets.length > 0 ? filteredWidgets.map(({ widget, size }, idx) => {
                          const isAdded = existingWidgets.includes(widget.id)
                          // Strict Exact Apple Tile Sizes
                          const widthClass = size === 'small' ? 'w-[160px]' : (size === 'medium' ? 'w-[344px]' : 'w-[344px]')
                          const heightClass = size === 'small' ? 'h-[160px]' : (size === 'medium' ? 'h-[160px]' : 'h-[344px]')
                          const WidgetComponent = widget.component

                          return (
                            <motion.div
                              key={widget.id}
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.3, delay: Math.min(idx * 0.05, 0.3) }}
                              className="flex flex-col items-center"
                            >
                              <div className="relative">
                                <button
                                  onClick={() => !isAdded && handleWidgetSelect(widget)}
                                  disabled={isAdded}
                                  className={cn(
                                    "relative transition-all rounded-[32px] block text-left shrink-0",
                                    widthClass, heightClass,
                                    isAdded
                                      ? "opacity-50 cursor-not-allowed grayscale-[0.3]"
                                      : "hover:scale-[1.03] active:scale-[0.97] cursor-pointer hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] shadow-[0_8px_20px_rgba(0,0,0,0.06)]"
                                  )}
                                >
                                  {/* Wrapper to ensure internal border-radius consistency */}
                                  <div className="w-full h-full overflow-hidden rounded-[28px] bg-white border border-black/[0.04]">
                                    <div className="w-full h-full pointer-events-none">
                                      <WidgetComponent {...getWidgetProps(widget.id, size)} />
                                    </div>
                                  </div>

                                  {/* Hover Ring (macOS focus-like) */}
                                  {!isAdded && (
                                    <div className="absolute inset-0 rounded-[32px] border-2 border-transparent hover:border-blue-500/30 transition-colors pointer-events-none" />
                                  )}
                                </button>

                                {/* Added Overlay */}
                                {isAdded && (
                                  <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none z-10">
                                    <span className="px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[12px] font-medium shadow-xl">
                                      已添加
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Widget Label below */}
                              <div className="mt-4 text-center px-2 w-[160px]">
                                <h4 className="text-[14px] font-medium text-slate-800">{widget.name}</h4>
                                <p className="text-[12px] text-slate-500 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{widget.category}</p>
                              </div>
                            </motion.div>
                          )
                        }) : (
                          <div className="w-full max-w-[400px] h-[400px] flex flex-col items-center justify-center mx-auto">
                            <Search className="w-12 h-12 text-slate-300 mb-4" />
                            <p className="text-slate-500 font-medium text-[15px]">未找到对应小组件</p>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </>
            ) : (
              /* Preview Area */
              <div className="w-full h-full flex flex-col relative bg-transparent overflow-y-auto">
                {/* Preview Header */}
                <div className="absolute top-6 left-6 z-10">
                  <button
                    onClick={() => setSelectedWidget(null)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/70 backdrop-blur-md border border-white/60 shadow-sm text-slate-700 hover:bg-white hover:text-slate-900 hover:shadow-md transition-all active:scale-95"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="font-semibold text-[14px]">返回</span>
                  </button>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="flex-1 flex flex-col items-center justify-center pt-24 pb-12 min-h-max"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-[28px] font-bold text-slate-900 tracking-tight mb-1">
                      {selectedWidget.name}
                    </h3>
                    <p className="text-slate-500 text-[14px]">
                      {selectedWidget.description}
                    </p>
                  </div>

                  {/* Sizes Switcher */}
                  <div className="bg-slate-200/50 backdrop-blur-sm p-1 rounded-full flex gap-1 mb-8 shadow-inner border border-white/50">
                    {selectedWidget.supportedSizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={cn(
                          "px-6 py-2 rounded-full text-[13px] font-semibold transition-all duration-300",
                          selectedSize === size
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        {size === 'small' ? '小尺寸' : size === 'medium' ? '中尺寸' : '大尺寸'}
                      </button>
                    ))}
                  </div>

                  {/* Rendering Preview exact dimensions */}
                  <div className="relative mb-8 flex items-center justify-center w-full grow-0">
                    <motion.div
                      key={selectedSize}
                      initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, scale: 0.95, filter: "blur(5px)" }}
                      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                      className={cn(
                        "relative rounded-[32px] transition-all bg-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)]",
                        selectedSize === 'small' && "w-[160px] h-[160px]",
                        selectedSize === 'medium' && "w-[344px] h-[160px]",
                        selectedSize === 'large' && "w-[344px] h-[344px]"
                      )}
                    >
                      <div className="w-full h-full overflow-hidden rounded-[30px] pointer-events-none">
                        {(() => {
                          const WidgetComponent = selectedWidget.component
                          return <WidgetComponent {...getWidgetProps(selectedWidget.id, selectedSize)} />
                        })()}
                      </div>
                    </motion.div>
                  </div>

                  {/* Add Button */}
                  <div className="flex justify-center shrink-0">
                    <button
                      onClick={handleAddWidget}
                      className="px-14 py-3.5 rounded-full bg-slate-900 hover:bg-black text-white font-medium text-[15px] shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-all hover:scale-105 active:scale-95"
                    >
                      添加到仪表盘
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
