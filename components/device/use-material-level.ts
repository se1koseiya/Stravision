"use client"

import { useEffect, useState } from "react"
import {
  FRAME_BUDGET_P90_MS,
  MATERIAL_PREF_EVENT,
  MATERIAL_PREF_KEY,
  MAX_DEMOTIONS,
  detectMaterialLevel,
  degradeOnFrameStall,
  probeFrameBudget,
  readForcedLevel,
  readUserLevel,
  type MaterialLevel,
} from "./material-css"

/**
 * 自适应材质等级（HDS MaterialLevel 的 Web 等价实现）
 *
 * 规范原文：推荐使用系统自适应的沉浸光感效果，系统会根据当前设备的算力动态调整组件的
 * 材质效果；若设备不支持 IMMERSIVE 材质类型，建议使用 SMOOTH 效果，以降低卡顿和发热风险。
 *
 * Web 端没有「系统材质」，所以自己做两件事：
 *  1. 静态探测设备能力 → 初始等级（内存 / 核数 / 是否支持 backdrop-filter / 用户是否要求减弱透明度）
 *  2. 首屏帧预算看门狗 → 连续 N 个窗口都跑不动才降一档（单次抖动不降，避免误伤）
 *
 * 等级写在 document.documentElement 的 data-mat-level 上，而不是页面容器上 ——
 * antd 的 Modal / Select / Tooltip 会 portal 到 body，只有 html 上的继承能被它们拿到。
 *
 * ── 三方优先级（2026-09-26 加用户可选厚度后）──
 *   ① ?mat=  / localStorage['dc-mat-level']  排障与验收的强制覆盖（checkWith 用）
 *   ② localStorage['stravision.material.level']  用户在设置里选的厚度 → **固定，不降档**
 *   ③ 自动探测（设备能力 + 帧预算看门狗）—— 仅当用户没选过
 *   ② 命中时**不开看门狗**：用户显式选了「精美」却被自动降档，等于选项形同虚设。
 *   挂载后用户在任何页面改档 → saveUserLevel() 广播 MATERIAL_PREF_EVENT，
 *   本章所有实例（同页多份）与跨标签页（storage）都会立刻跟随。
 *
 * 排障：?mat=exquisite|gentle|smooth 或 localStorage.dc-mat-level 可强制指定；
 *      自动判定的输入与结论会写到 <html data-mat-why>，在 DevTools 里直接看得到。
 *
 * ── 同页多实例（2026-09-26 修）──
 *   AI 助手侧栏常驻 dashboard / monitor / device-control，这些页面自己也挂了本 hook
 *   → 同一页会**同时存在两个实例**。若各自跑帧预算看门狗，各自按 MAX_DEMOTIONS(2) 降档，
 *   就会叠加到最低档 smooth：中端机器被判成最低端，"自适应"反而成了"过度降档"。
 *   约定：**第一个实例**负责探测并写 <html data-mat-level>，其余实例跟随已有值
 *   （CSS 变量本来就挂在 html 上，跟随者照样生效）。
 */
const LEVELS: readonly string[] = ["off", "exquisite", "gentle", "smooth"]

function readExistingLevel(): MaterialLevel | undefined {
  if (typeof document === "undefined") return undefined
  const v = document.documentElement.dataset.matLevel
  return v && LEVELS.includes(v) ? (v as MaterialLevel) : undefined
}

export function useAdaptiveMaterialLevel(): MaterialLevel {
  const [level, setLevel] = useState<MaterialLevel>("exquisite")

  useEffect(() => {
    const root = document.documentElement
    const apply = (lv: MaterialLevel, why: string) => {
      setLevel(lv)
      root.dataset.matLevel = lv
      root.dataset.matWhy = why
    }

    let alive = true
    let timer = 0
    /** 用户已在设置里选过厚度 → 锁住看门狗（切换后立刻锁，不必等下一次探测） */
    let userLocked = false

    const forced = readForcedLevel()
    const user = readUserLevel()
    const inherited = readExistingLevel()

    if (forced) {
      // 显式指定（?mat= / 排障 localStorage）优先于一切，保证验收结果可复现
      apply(forced, `forced:${forced}`)
    } else if (user) {
      // 用户在设置里选的厚度：直接采用，不跑看门狗（显式选择必须被尊重）
      userLocked = true
      apply(user, `user:${user}`)
    } else if (inherited) {
      /* 已有实例（或上一次挂载）负责自适应 → 跟随即可，别再开一次看门狗。
         降级只认 <html data-mat-level>：CSS 变量本来就挂在 html 上，跟随者照样生效。 */
      setLevel(inherited)
    } else {
      const initial = detectMaterialLevel()
      let current: MaterialLevel = initial
      let done = 0
      apply(initial, `auto → 初始 ${initial}`)

      const runProbe = () => {
        if (!alive || userLocked || done >= MAX_DEMOTIONS || current === "smooth") return
        done += 1
        probeFrameBudget().then((p90) => {
          if (!alive || userLocked) return
          const next = degradeOnFrameStall(p90, current)
          const tail = `p90=${p90.toFixed(1)}ms(budget ${FRAME_BUDGET_P90_MS}ms)`
          if (next !== current) {
            current = next
            // 排障用：想知道为什么变糊了，看这一行
            console.info(`[material] 帧预算超标（${tail}）→ 材质等级降档为 ${next}`)
          }
          apply(current, `auto → 初始 ${initial}; ${tail}; 最终 ${current}`)
          runProbe()
        })
      }

      // 等首屏编译 / 水合 / 入场动画都过去再量帧，否则量到的是「加载慢」不是「材质贵」
      timer = window.setTimeout(() => runProbe(), 400)
    }

    /* 设置弹窗改了厚度 → 当场换档（用户动作优先，并锁住看门狗）。
       同页可能有好几份实例，一起收这条广播；跨标签页走 storage。 */
    const onPrefChange = () => {
      const v = readUserLevel()
      if (!v) return
      userLocked = true
      apply(v, `user:${v}`)
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === MATERIAL_PREF_KEY) onPrefChange()
    }

    window.addEventListener(MATERIAL_PREF_EVENT, onPrefChange)
    window.addEventListener("storage", onStorage)

    return () => {
      alive = false
      window.clearTimeout(timer)
      window.removeEventListener(MATERIAL_PREF_EVENT, onPrefChange)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  return level
}

export { MAX_DEMOTIONS }
