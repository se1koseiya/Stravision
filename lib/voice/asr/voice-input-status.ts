"use client"

/**
 * 语音输入的「全局活跃状态」—— 极小的外部 store（useSyncExternalStore）
 *
 * ── 为什么需要它 ──────────────────────────────────────────────
 * 麦克风按钮住在 sender 的最里层（footer 左簇），而"正在持续转写"的光晕要画在
 * 输入卡（`.ant-sender`）的外圈 —— 两者不是父子，中间隔着 antd 的 Sender 组件，
 * 塞不进 props。
 * 为这一个布尔值去改 ChatSenderInput / CopilotSender 的 props 链、或者拉一个
 * Context 包住整块，代价都太大；用一个 8 行的 store 最合适：
 *   写的一方：VoiceInputButton（useEffect 同步）
 *   读的一方：ChatSenderInput（useSyncExternalStore）
 *
 * 🚨 只表达"语音正在工作"（录音中 or 有句子在识别中）。
 *    别往里塞进度、文案之类会频繁变化的东西 —— 每次变化都会让 sender 重渲染。
 */

type Listener = () => void

let active = false
const listeners = new Set<Listener>()

export function setVoiceInputActive(next: boolean): void {
  if (active === next) return
  active = next
  listeners.forEach((notify) => notify())
}

export function getVoiceInputActive(): boolean {
  return active
}

export function subscribeVoiceInputActive(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
