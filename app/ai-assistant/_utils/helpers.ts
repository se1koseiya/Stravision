// AI Assistant — Pure helper functions (no React dependencies)
// Extracted from app/ai-assistant/page.tsx

import type { IoTCommand } from "@/app/ai-assistant/types"

/**
 * Check if a model string represents a Vision Language Model.
 */
export function isVLMModel(model: string | undefined): boolean {
  if (!model) return false
  const m = model.toLowerCase()
  return (
    m.includes("vision") ||
    m.includes("-vl-") ||
    /qwen\d*-vl/.test(m) ||
    m.includes("qwen-vl") ||
    m.includes("qwen3-vl") ||
    m.includes("qvq")
  )
}

/**
 * Format seconds into mm:ss string.
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")
  const s = (seconds % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

/**
 * Copy text to clipboard with toast notification.
 */
export function copyText(text: string) {
  navigator.clipboard.writeText(text)
  // toast is imported and called at the call site
}

/**
 * Get a canonical signature for a command to detect duplicate executions.
 */
export function getCanonicalSignature(cmd: IoTCommand): string {
  const { action, device, value, r, g, b, direction } = cmd
  const cleanObj: Record<string, unknown> = { action }
  if (device !== undefined) cleanObj.device = device
  if (value !== undefined) cleanObj.value = value
  if (r !== undefined) cleanObj.r = r
  if (g !== undefined) cleanObj.g = g
  if (b !== undefined) cleanObj.b = b
  if (direction !== undefined) cleanObj.direction = direction
  return JSON.stringify(cleanObj)
}

/**
 * Check if a parsed JSON object is an IoT command.
 */
export function isIoTCommand(obj: unknown): obj is IoTCommand {
  if (typeof obj !== "object" || obj === null) return false
  const o = obj as IoTCommand
  return (
    o.action === "toggle_relay" ||
    o.action === "set_led" ||
    o.action === "control_camera" ||
    o.action === "reset_camera" ||
    o.action === "move_camera_and_look" ||
    o.action === "take_camera_snapshot"
  )
}

/**
 * Filter out disabled feature tags from AI response content.
 */
export function filterDisabledFeatures(
  content: string,
  aiFeatures: Record<string, boolean | undefined>
): string {
  let result = content
  if (aiFeatures.enableDeviceMonitor !== true) {
    result = result.replace(/<MONITOR\s*\/?>/g, "")
  }
  if (aiFeatures.enableDeviceBento !== true) {
    result = result.replace(/<DEVICE_BENTO\s*\/?>/g, "")
  }
  if (aiFeatures.enableControlBento !== true) {
    result = result.replace(/<CONTROL_BENTO\s*\/?>/g, "")
  }
  if (aiFeatures.enableSpectral !== true) {
    result = result.replace(/<SPECTRAL\s*\/?>/g, "")
  }
  if (aiFeatures.enableTaskList !== true) {
    result = result.replace(/<TASK_LIST\s*\/?>/g, "")
  }
  if (aiFeatures.enableScheduledTasks !== true) {
    result = result.replace(/<SCHEDULED_TASKS\s*\/?>/g, "")
  }
  if (aiFeatures.enableCapabilities !== true) {
    result = result.replace(/<CAPABILITIES\s*\/?>/g, "")
  }
  return result
}

/** Device name mapping (relay number → name) */
export const DEVICE_NAMES: Record<string, string> = {
  "5": "水泵",
  "6": "风扇",
  "7": "补光灯",
  "8": "光照植物补光灯",
}

/** MCP server → tool mapping */
export const MCP_SERVER_TOOLS: Record<
  string,
  Array<{ name: string; displayName: string; description: string }>
> = {
  "caiyun-weather": [
    { name: "mcp_caiyun_weather", displayName: "彩云天气", description: "查询实时天气和预报" },
  ],
  "gaode-weather": [
    { name: "mcp_gaode_weather", displayName: "高德天气", description: "查询实时天气" },
  ],
  "hefeng-weather": [
    { name: "mcp_hefeng_weather", displayName: "和风天气", description: "查询全球天气" },
  ],
  "amap-route": [
    { name: "mcp_amap_route", displayName: "高德路径规划", description: "驾车/步行/骑行路线规划" },
  ],
  "brave-search": [
    { name: "mcp_brave_search", displayName: "Brave 搜索", description: "联网搜索最新信息" },
  ],
  "exa-search": [
    { name: "mcp_exa_search", displayName: "Exa 搜索", description: "深度语义搜索技术文章与论文" },
  ],
  firecrawl: [
    { name: "mcp_firecrawl_scrape", displayName: "网页抓取", description: "抓取网页内容" },
  ],
  "soil-sensor": [
    { name: "mcp_soil_sensor_query", displayName: "土壤传感器", description: "查询土壤墒情数据" },
  ],
  "crop-disease": [
    { name: "mcp_crop_disease_diagnose", displayName: "病害诊断", description: "作物病虫害识别与防治" },
  ],
  "irrigation-system": [
    { name: "mcp_irrigation_query", displayName: "灌溉系统", description: "智能灌溉控制与查询" },
  ],
  "farm-data": [
    { name: "mcp_farm_data_query", displayName: "农场数据", description: "农场运营数据分析" },
  ],
  "spectrum-stravision": [
    { name: "get_channel", displayName: "光谱通道", description: "获取指定波长光谱值" },
    { name: "get_all_spectrum", displayName: "全波段光谱", description: "获取所有18通道数据" },
  ],
}

/**
 * Get greeting string based on current time.
 */
export function getGreetingByHour(hour: number): string {
  if (hour >= 5 && hour < 12) return "早上好"
  if (hour >= 12 && hour < 18) return "下午好"
  return "晚上好"
}
