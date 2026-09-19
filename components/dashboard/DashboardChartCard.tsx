"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import dynamic from "next/dynamic"
import { IconLoading } from "@/components/icon";

const AreaChart = dynamic(() => import("@ant-design/plots").then(m => m.Area), { ssr: false })

import { getThresholdLevel } from "@/lib/thresholds"
import { cn } from "@/lib/utils"

interface DashboardChartCardProps {
    title: string
    value: string | number
    unit: string
    icon: React.ReactNode
    type: string // API type parameter
    color: string // Tailwind color class prefix (e.g., 'blue', 'orange')
    gradientColor: string // Hex color for chart gradient
    deviceData?: any // Pass realtime data if needed for current value
    initialHistoryData?: any[]
}

export function DashboardChartCard({
    title,
    value,
    unit,
    icon,
    type,
    color,
    gradientColor,
    initialHistoryData,
}: DashboardChartCardProps) {
    const [timeRange, setTimeRange] = useState("1h")
    const [historyData, setHistoryData] = useState<any[]>(initialHistoryData || [])
    const [isLoading, setIsLoading] = useState(false)
    
    // Track if we have used the initial data to avoid refetching on mount
    const isFirstRender = useRef(true)

    useEffect(() => {
        // Skip fetch on first render if we have initial data
        if (isFirstRender.current) {
            isFirstRender.current = false
            if (initialHistoryData) {
                return
            }
        }

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

    // Update historyData if initialHistoryData changes (e.g. parent refetches)
    useEffect(() => {
        if (initialHistoryData && timeRange === '1h') {
             setHistoryData(initialHistoryData)
        }
    }, [initialHistoryData])


    const numericValue = typeof value === 'number' ? value : parseFloat(value as string);
    const thresholdLevel = isNaN(numericValue) ? 'normal' : getThresholdLevel(type, numericValue);

    const getCardStyle = () => {
        switch (thresholdLevel) {
            case 'critical':
                return "border-red-500 bg-red-500/10 dark:bg-red-900/20 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse-slow"
            case 'warning':
                return "border-amber-500 bg-amber-500/10 dark:bg-amber-900/20 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
            default:
                return "border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] dark:bg-slate-900/45 dark:border-white/10 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
        }
    }

    const chartData = historyData.map(item => ({ time: item.timestamp, value: item.value }))

    return (
        <Card className={cn(
            "h-full transition-all duration-200",
            getCardStyle()
        )}>
            <CardContent className="p-6 h-full flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-2xl bg-${color}-100 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400`}>
                            {icon}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">{title}</p>
                            <div className="flex items-baseline gap-1">
                                <h3 className="text-2xl font-bold">{value}</h3>
                                <span className="text-sm text-muted-foreground">{unit}</span>
                            </div>
                        </div>
                    </div>
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[70px] h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1h">1h</SelectItem>
                            <SelectItem value="1d">24h</SelectItem>
                            <SelectItem value="7d">7d</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="flex-1 w-full min-h-0 relative">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                            <IconLoading className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    {chartData.length > 0 && (
                        <AreaChart
                            data={chartData}
                            xField="time"
                            yField="value"
                            autoFit
                            style={{
                                stroke: gradientColor,
                                lineWidth: 2,
                                fill: `l(90) 0:${gradientColor}00 1:${gradientColor}33`,
                                shape: 'smooth',
                            }}
                            axis={false}
                            tooltip={false}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
