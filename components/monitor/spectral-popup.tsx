"use client"

import React, { useState } from 'react'
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/illustration"
import { IconClose } from "@/components/icon"
import { useMaterialCss } from "@/components/device/immersive-card"
import {
  SPECTRAL_CHANNELS,
  SpectralChart,
  spectralValuesFrom,
  hasSpectralData,
} from "@/components/charts/spectral-chart"

interface SpectralPopupProps {
  data: {
    channel1?: number
    channel2?: number
    channel3?: number
    channel4?: number
    channel5?: number
    channel6?: number
    channel7?: number
    channel8?: number
    channel9?: number
    channel10?: number
    channel11?: number
  } | null
  onClose?: () => void
}

export function SpectralPopup({ data, onClose }: SpectralPopupProps) {
  /* 材质样式是插入到 document.head 的全局 style，本组件自己可能被单独复用（如 dev 探针页），
     所以不能依赖父级 greenhouse-model 已经调过 —— 自己保证一次（内部有同 id 去重，重复调用无副作用）。 */
  useMaterialCss()

  const [timeRange, setTimeRange] = useState("1h")

  const values = spectralValuesFrom(data as unknown as Record<string, unknown>)
  const colors = SPECTRAL_CHANNELS.map(c => c.color)
  const maxValue = Math.max(...values, 0)
  const hasData = hasSpectralData(values)

  return (
    /* 🚨 原来这里是 `w-full h-full` + 父级写死 `h-[280px]`，而内容实际需要 ~404px
       → 172px 溢出：空态描述被卡片下沿切一半、11 通道图例整块掉到卡片外面。
       现在改成**内容驱动高度**（父级也不能再写死 h），并给容器加 overflow-hidden 兜底。
       沉浸光感：与同文件其他设备气泡卡统一走 dc-mat 材质（弹层档 ULTRA_THICK），
       替换掉手写的 bg-white + shadow-lg —— 后者是不透明实底，把背后 3D 场景压成一块死白牌。 */
    <div className="dc-mat dc-mat--ultra relative w-full rounded-2xl p-4 overflow-hidden">
      <div className="flex flex-col">
        {/* Header —— pr-9 给右上角的关闭按钮留位，否则它会压在品牌圆牌上 */}
        <div className="flex items-start justify-between gap-3 mb-3 pr-9">
          <div className="min-w-0">
            <div className="text-[28px] leading-9 font-bold text-zinc-900 dark:text-white tabular-nums">
              {hasData ? maxValue : "--"}
              <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400 ml-1">µmol</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge className="bg-pink-500/20 text-pink-600 dark:text-pink-300 border-pink-500/30 rounded-full px-2.5">
                光谱分析 (Spectral)
              </Badge>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="h-6 w-[76px] text-xs bg-transparent border-none focus:ring-0 p-0 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                  <SelectValue placeholder="范围" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 小时</SelectItem>
                  <SelectItem value="1d">1 天</SelectItem>
                  <SelectItem value="7d">7 天</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* 品牌圆牌：光谱仪的语义锚点（品红 = 与 Badge 同色系），保留「一层容器感」的锚点但不再用重阴影 */}
          <div className="w-9 h-9 shrink-0 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold text-base">
            S
          </div>
        </div>

        {/* Chart or No Data Message —— 定高而非 flex-1：flex-1 在「父级不再写死高度」后
            会退化成内容高，图例被推着往下漂；给固定高度让两态切换时卡片不跳。 */}
        <div className="w-full h-[188px] flex items-center justify-center">
          {hasData ? (
            <SpectralChart
              values={values}
              colors={colors}
              maxValue={maxValue}
              height={188}
              gradientId="spec-area-popup"
            />
          ) : (
            <EmptyState
              illustration="data-report"
              illustrationWidth={104}
              className="py-0"
              title="暂无光谱数据"
              description="等待设备连接后，这里会显示 11 通道光谱曲线。"
            />
          )}
        </div>

        {/* Channel Info —— 用 flex-wrap 而不是固定 grid-cols-6。
            固定 6 列在窄容器（如 320px）下每格只剩 29px，「415nm」被 truncate 截成「415n…」
            —— 波长数字被截断等于数据不可读。flex-wrap 让格子按内容自适应、换行而非截断。 */}
        <div className="mt-3 flex flex-wrap justify-center gap-x-1 gap-y-1.5 text-xs">
          {SPECTRAL_CHANNELS.map((channel) => {
            const value = data ? (data[channel.id as keyof typeof data] as number) || 0 : 0
            return (
              <div key={channel.id} className="w-[52px] text-center shrink-0">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <div
                    className="w-2 h-2 shrink-0 rounded-full"
                    style={{ backgroundColor: channel.color }}
                  />
                  {/* 415/445… 是波长，带 nm；NIR / Clr / Fli 是通道名，不带 */}
                  <div className="text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    {channel.label === "NIR" || channel.label === "Clear" || channel.label === "Flicker"
                      ? channel.name
                      : `${channel.name}nm`}
                  </div>
                </div>
                <div className="font-mono text-zinc-900 dark:text-white tabular-nums">
                  {hasData ? value : "--"}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 关闭按钮移进卡片流内（原来挂在父级 absolute top-4 right-4，压在品牌圆牌上） */}
      {onClose ? (
        <button
          onClick={onClose}
          aria-label="关闭光谱分析"
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center
            text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white
            hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <IconClose className="w-4 h-4" />
        </button>
      ) : null}
    </div>
  )
}
