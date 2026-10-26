"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import { IconLoading } from "@/components/icon";

const AreaChart = dynamic(() => import("@ant-design/plots").then(m => m.Area), { ssr: false })
const A = BERRY_THEME.apple

interface WidgetTrendChartProps {
    type: string
    color: string
    unit?: string
    className?: string
    /** Hide the range toggle for a cleaner look in compact layouts */
    showToggle?: boolean
}

export function WidgetTrendChart({ type, color, unit = "", className, showToggle = true }: WidgetTrendChartProps) {
    const [timeRange, setTimeRange] = useState("1h")
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

    const chartData = historyData.map(item => ({ time: item.timestamp, value: item.value }))

    const ranges = [
        { label: '10m', value: '10m' },
        { label: '1h', value: '1h' },
        { label: '1d', value: '1d' }
    ]

    return (
        <div className={`relative flex flex-col w-full h-full ${className}`} style={{ fontFamily: A.fontFamily }}>
            {showToggle && (
                <div className="absolute top-0 right-0 z-10 flex items-center gap-1">
                    {ranges.map((range) => {
                        const isActive = timeRange === range.value
                        return (
                            <button
                                key={range.value}
                                onClick={() => setTimeRange(range.value)}
                                style={{
                                    fontSize: 9,
                                    fontWeight: 600,
                                    letterSpacing: '0.06em',
                                    padding: isActive ? '2px 7px' : '2px 4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: isActive ? A.trackStrong : 'transparent',
                                    borderRadius: isActive ? A.radius.pill : 0,
                                    color: isActive ? A.label : A.labelQuaternary,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {range.label}
                            </button>
                        )
                    })}
                </div>
            )}

            <div className="flex-1 w-full min-h-0 relative" style={{ marginTop: showToggle ? 18 : 0 }}>
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <IconLoading className="h-4 w-4 animate-spin" style={{ color: A.labelQuaternary }} strokeWidth={2} />
                    </div>
                )}
                {chartData.length > 0 && (
                    <AreaChart
                        data={chartData}
                        xField="time"
                        yField="value"
                        autoFit
                        style={{
                            stroke: color,
                            lineWidth: 1.5,
                            fill: `l(90) 0:${color}22 1:${color}04`,
                            shape: 'smooth',
                        }}
                        axis={false}
                        tooltip={false}
                    />
                )}
            </div>
        </div>
    )
}
