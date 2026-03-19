"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false })

interface WidgetTrendChartProps {
    type: string // API type parameter, e.g. 'temperature', 'humidity'
    color: string // Hex color for chart gradient, e.g. '#10b981' for emerald-500
    unit?: string
    className?: string
}

export function WidgetTrendChart({ type, color, unit = "", className }: WidgetTrendChartProps) {
    const [timeRange, setTimeRange] = useState("7h") // default to 7h as user requested 1day, 7h, 10min
    const [historyData, setHistoryData] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true)
            try {
                const res = await fetch(`/api/device-history?type=${type}&range=${timeRange}`)
                const data = await res.json()
                if (data.success) {
                    setHistoryData(data.data)
                }
            } catch (error) {
                console.error("Failed to fetch history:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchHistory()
    }, [type, timeRange])

    const getOption = () => {
        return {
            grid: {
                top: 5,
                right: 0,
                bottom: 0,
                left: 0,
                containLabel: false
            },
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderColor: '#f1f5f9',
                textStyle: {
                    color: '#0f172a'
                },
                formatter: (params: any) => {
                    const date = new Date(params[0].value[0])
                    const timeStr = timeRange === '1d'
                        ? `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
                        : `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
                    return `<div class="text-xs text-slate-500 mb-1">${timeStr}</div><div class="font-bold">${params[0].value[1]} ${unit}</div>`
                }
            },
            xAxis: {
                type: 'time',
                show: false,
                boundaryGap: false
            },
            yAxis: {
                type: 'value',
                show: false,
                min: 'dataMin',
                max: 'dataMax',
            },
            series: [
                {
                    data: historyData.map(item => [item.timestamp, item.value]),
                    type: 'line',
                    smooth: 0.4,
                    showSymbol: false,
                    lineStyle: {
                        color: color,
                        width: 3,
                        shadowColor: `${color}33`,
                        shadowBlur: 10,
                        shadowOffsetY: 5
                    },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [{
                                offset: 0, color: `${color}44` // 20% opacity
                            }, {
                                offset: 1, color: `${color}00` // 0% opacity
                            }],
                        }
                    }
                }
            ]
        }
    }

    return (
        <div className={`relative flex flex-col w-full h-full ${className}`}>
            {/* Custom Range Toggle */}
            <div className="absolute top-0 right-0 z-10 flex bg-slate-100/80 backdrop-blur-sm rounded-full p-0.5">
                {[
                    { label: '10分钟', value: '10m' },
                    { label: '7小时', value: '7h' },
                    { label: '1天', value: '1d' }
                ].map((range) => (
                    <button
                        key={range.value}
                        onClick={() => setTimeRange(range.value)}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-full transition-colors ${
                            timeRange === range.value 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {range.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 w-full min-h-0 relative mt-8">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                    </div>
                )}
                <ReactECharts 
                    option={getOption()} 
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'svg' }}
                />
            </div>
        </div>
    )
}
