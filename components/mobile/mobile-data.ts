/**
 * 移动端「地块」数据适配层（2026-10-05）
 * ---------------------------------------------------------------------------
 * 🚨 产品判断：**不新建 `farm_plots` 表**。
 *
 * 原型里的「地块管理 / 农事计划」目前是设计稿，平台侧还没有这两张表。
 * 此时建表 = 凭空造一批空数据，且与 `devices.category` 这套已有分类重复。
 * 所以这里走「派生」路线：
 *
 *   地块 ← devices.category 分组（category 就是现成的分区语义：灌溉/通风/照明/…）
 *   农事计划 ← scheduled_tasks（真实定时任务，标题/周期/启停都是真数据）
 *
 * 派生规则的唯一原则：**没有的字段就留空/不显示，绝不编造**。
 * 例如「耕地面积 2000 ㎡」在平台里无对应数据源 → 卡片上就不渲染这一行，
 * 而不是填一个假数字（假数字比没有危险得多 —— 用户会照着它去下指令）。
 *
 * 将来平台真要落地「地块」业务，把这个文件换成 `listPlots()` 即可，
 * 页面只依赖本文件导出的 `MobilePlot` / `MobileFarmPlan` 两个类型。
 */

import type { RegistryDevice } from "@/lib/contexts/device-context"

/** 地块 —— 由 devices.category 聚合而来 */
export interface MobilePlot {
  /** 稳定 key：直接用 category 文本，保证同一分组每次渲染 id 一致 */
  id: string
  name: string
  /** 设备计数（原型上那四枚：采集 / 控制 / 显示 / 报警） */
  counts: {
    sensor: number
    relay: number
    camera: number
    alarm: number
  }
  /** 该地块下的设备（详情页与设备页共用） */
  devices: RegistryDevice[]
}

/** 农事/自动化计划 —— 来自 scheduled_tasks */
export interface MobileFarmPlan {
  id: number
  title: string
  /** 周期描述：cron 表达式或单次执行时间，二者都没有则 undefined（不渲染） */
  cycle: string
  /** 执行方式：relay / led / agent / reminder → 中文 */
  actionLabel: string
  /** 状态：is_active + 是否过期 */
  status: "pending" | "expired" | "done"
  updatedAt: number
}

const ACTION_LABEL: Record<string, string> = {
  relay: "设备控制",
  led: "补光调节",
  agent: "AI 执行",
  reminder: "仅提醒",
}

/**
 * 设备类型 → 原型「采集设备 / 控制设备 / 显示设备」三类。
 * - sensor  → 采集设备
 * - relay   → 控制设备
 * - camera  → 显示设备（视频）
 * - stepper → 控制设备（云台等位控）
 */
export function plotCounts(devices: RegistryDevice[]) {
  return {
    sensor: devices.filter((d) => d.type === "sensor").length,
    relay: devices.filter((d) => d.type === "relay").length,
    camera: devices.filter((d) => d.type === "camera").length,
    alarm: devices.filter((d) => d.is_critical).length,
  }
}

/** 按 category 聚合出地块列表；`未分区` 收在末尾 */
export function listPlots(devices: RegistryDevice[]): MobilePlot[] {
  const map = new Map<string, RegistryDevice[]>()
  for (const d of devices) {
    const key = (d.category || "").trim() || "未分区"
    const arr = map.get(key)
    if (arr) arr.push(d)
    else map.set(key, [d])
  }
  const plots: MobilePlot[] = Array.from(map.entries()).map(([name, list]) => ({
    id: `plot-${name}`,
    name,
    counts: plotCounts(list),
    devices: list,
  }))
  plots.sort((a, b) => (a.name === "未分区" ? 1 : b.name === "未分区" ? -1 : a.name.localeCompare(b.name, "zh")))
  return plots
}

/** cron → 人话周期；解析不了就返回空串（调用方不渲染该行） */
export function describeCycle(task: {
  cron_expression?: string | null
  execute_at?: number | null
}): string {
  if (task.execute_at) {
    const d = new Date(task.execute_at)
    const p = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  }
  const cron = (task.cron_expression || "").trim()
  if (!cron) return ""
  const parts = cron.split(/\s+/)
  if (parts.length < 5) return cron
  const [min, hour, dom, mon, dow] = parts
  const everyMin = min === "*"
  const everyHour = hour === "*"
  if (everyMin && everyHour) return "每分钟"
  if (everyMin) return `每小时 ${Number(hour)} 分`
  if (dom === "*" && mon === "*" && dow === "*") return `每天 ${Number(hour)}:${String(Number(min)).padStart(2, "0")}`
  if (dom === "*" && mon === "*") {
    const names = ["日", "一", "二", "三", "四", "五", "六"]
    return `每周${names[Number(dow)] ?? dow} ${Number(hour)}:${String(Number(min)).padStart(2, "0")}`
  }
  return cron
}

/** scheduled_tasks → 移动端计划卡片 */
export function listFarmPlans(
  tasks: {
    id: number
    title: string
    action_type: string
    is_active: number
    execute_at?: number | null
    cron_expression?: string | null
    updated_at: number
    last_run_at?: number | null
  }[]
): MobileFarmPlan[] {
  const now = Date.now()
  return tasks.map((t) => {
    const expired = !t.is_active
    const ran = t.last_run_at ? now - t.last_run_at < 24 * 3600 * 1000 : false
    return {
      id: t.id,
      title: t.title,
      cycle: describeCycle(t),
      actionLabel: ACTION_LABEL[t.action_type] ?? t.action_type,
      status: expired ? "expired" : ran ? "done" : "pending",
      updatedAt: t.updated_at,
    }
  })
}
