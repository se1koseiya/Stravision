/**
 * 「页面动作」工具表 —— AI 调用这些**服务端**工具时，用户当前所在的页面
 * 也要亮起屏幕边缘流光（CanvasActivityGlow），让「莓小智正在动我的设备」看得见。
 *
 * 背景（2026-09-25 用户要求：「copilot 在控制设备的时候，对应用户所在的页面也需要流光」）：
 *  - 画布类**前端工具**（client tool）走 SSE `client_tool_call`，浏览器自己执行，
 *    执行周期天然可知 —— 光效由 use-copilot-chat 的 client_tool_call 分支直接驱动；
 *  - 设备控制类工具在**服务端**执行（`builtin-device-control` 分组），浏览器只收到
 *    `tool_call`（开始）/ `tool_result`（结束）两条 SSE。光效组件是挂在当前页的
 *    CopilotSidebar 上的，所以只要在收到这两条事件时点亮，**用户所在的页面**自然就亮了。
 *
 * 为什么用「工具名白名单」而不是「所有 tool_call 都亮」：
 *  查一下天气、搜一下资料这类只读工具也闪全屏，会让光效变成噪音；只有真正改变了
 *  物理世界的**写操作**才值得给一个全页反馈。
 *
 * 维护约定：`lib/mcp/mcp-tool-definitions.ts` 的 `builtin-device-control` 分组里
 * 新增**写操作**工具时，在这里补一行文案（只读工具如 list_devices 不要加）。
 * 漏加的唯一后果 = 该工具没有流光，不影响功能本身。
 *
 * 🚨 本模块必须在客户端可导入：只放纯常量，禁止引入 db / fs / 服务端单例。
 */

export interface PageActionLabels {
  /** 执行中文案（驱动光效胶囊） */
  running: string
  /** 成功文案 */
  done: string
  /** 失败文案 */
  fail: string
}

export const PAGE_ACTION_TOOLS: Record<string, PageActionLabels> = {
  toggle_relay: {
    running: '莓小智正在开关设备…',
    done: '设备开关已执行',
    fail: '设备开关执行失败',
  },
  set_led: {
    running: '莓小智正在调补光…',
    done: '补光已调整',
    fail: '补光调整失败',
  },
  control_camera: {
    running: '莓小智正在调整摄像头…',
    done: '摄像头已调整',
    fail: '摄像头调整失败',
  },
  move_camera_and_look: {
    running: '莓小智正在转动摄像头…',
    done: '摄像头已转向',
    fail: '摄像头转向失败',
  },
  reset_camera: {
    running: '莓小智正在复位摄像头…',
    done: '摄像头已复位',
    fail: '摄像头复位失败',
  },
  take_camera_snapshot: {
    running: '莓小智正在抓拍画面…',
    done: '已抓拍画面',
    fail: '抓拍失败',
  },
  delete_device: {
    running: '莓小智正在删除设备…',
    done: '设备已删除',
    fail: '设备删除失败',
  },
}

/** 取该工具的流光文案；非「页面动作」工具返回 null（= 不亮光效） */
export function getPageActionLabels(toolName?: string | null): PageActionLabels | null {
  if (!toolName) return null
  return PAGE_ACTION_TOOLS[toolName] ?? null
}

/** 是否为「值得给全页反馈」的页面动作工具 */
export function isPageActionTool(toolName?: string | null): boolean {
  return getPageActionLabels(toolName) !== null
}
