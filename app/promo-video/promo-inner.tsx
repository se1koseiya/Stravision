"use client"

/**
 * 莓小智产品宣传片 · 分镜播放器（1920x1080）
 *
 * /promo-video?t=MS  定格到某毫秒；不带 t 则循环播放。
 * 逐帧出片由 scripts/promo/render.mjs 通过 window.__seek(ms) 驱动。
 *
 * ── 确定性约定 ──
 * 本页所有运动一律写作 t 的纯函数（见 ./ui 的 clamp/lerp/ease），
 * 不写 CSS @keyframes、不依赖 rAF 的实时推进。
 * 原因是逐帧截图必须可复现：同一个 t 必须得到同一张像素图，
 * 否则成片会抖。为此还需接管外部组件（BerryOrb / framer-motion）的时钟，
 * 见文件末尾的「虚拟时钟」——把 performance.now() 冻结到 t。
 */

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { flushSync } from "react-dom"
import { useTheme } from "next-themes"
import { ConfigProvider, theme as antdTheme } from "antd"
import BerryOrb, { EMERALD_ORB_PALETTE } from "@/components/smoothui/berry-orb"
import {
  FONT, DISPLAY_FONT, clamp, lerp, easeOut, easeInOut, easeOutBack,
  hash, seg, at, Caption, Tag, EdgeLight, GridBg, Shot, pulse,
} from "./ui"

// ─────────────────────────────────────────────────────────────────────────────
// 时间轴
// ─────────────────────────────────────────────────────────────────────────────

type Scene = { start: number; end: number }
const S = {
  open:     { start: 0,     end: 5200  },  // 一颗莓在黑暗里醒来
  sense:    { start: 5200,  end: 11800 },  // 会看：五路传感器
  diagnose: { start: 11800, end: 19600 },  // 会想：看图看病
  act:      { start: 19600, end: 25600 },  // 会动手：真的去开设备
  inspect:  { start: 25600, end: 30800 },  // 六步巡检链路
  canvas:   { start: 30800, end: 36200 },  // 会编排：直接改画布
  memory:   { start: 36200, end: 41600 },  // 会沉淀：病历与病程
  outro:    { start: 41600, end: 48000 },  // 片尾
} satisfies Record<string, Scene>
export const PROMO_DURATION = 48000

const BG = "#09090B"
const PANEL = "rgba(24,24,27,.92)"
const LINE = "#27272A"
const INK = "#FAFAFA"
const MUTED = "#A1A1AA"
const GREEN = "#34D399"
const GREEN_DEEP = "#059669"

// ─────────────────────────────────────────────────────────────────────────────
// 基础块
// ─────────────────────────────────────────────────────────────────────────────

function Panel({ children, style, glow }: { children?: ReactNode; style?: React.CSSProperties; glow?: string }) {
  return (
    <div style={{
      background: PANEL, border: `1px solid ${LINE}`, borderRadius: 20,
      backdropFilter: "blur(14px)", boxShadow: glow ? `0 0 60px ${glow}, 0 30px 90px rgba(0,0,0,.6)` : "0 30px 90px rgba(0,0,0,.6)",
      ...style,
    }}>{children}</div>
  )
}

/** 单色线性图标，避免依赖图标库 */
function Ico({ d, size = 22, color = GREEN }: { d: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}
const ICONS = {
  temp: "M14 14.76V5a2 2 0 1 0-4 0v9.76a4 4 0 1 0 4 0Z",
  humid: "M12 2.7 6.5 9.2a7 7 0 1 0 11 0Z",
  light: "M12 3v2m0 14v2M5.6 5.6l1.4 1.4m10 10 1.4 1.4M3 12h2m14 0h2M5.6 18.4l1.4-1.4m10-10 1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  co2: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8 12h8",
  soil: "M12 21v-7m0 0c0-3.3-2.7-6-6-6 0 3.3 2.7 6 6 6Zm0 0c0-3.3 2.7-6 6-6 0 3.3-2.7 6-6 6Z",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  bolt: "M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z",
  cpu: "M9 3h6v2h3a1 1 0 0 1 1 1v3h2v6h-2v3a1 1 0 0 1-1 1h-3v2H9v-2H6a1 1 0 0 1-1-1v-3H3V9h2V6a1 1 0 0 1 1-1h3V3Zm0 6v6h6V9H9Z",
  branch: "M6 3v12a3 3 0 0 0 3 3h9M6 3a2 2 0 1 0 0 .01M18 21a2 2 0 1 0 0-.01M18 6a2 2 0 1 0 0-.01",
  heart: "M12 20s-7-4.5-7-9.5A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.5C19 15.5 12 20 12 20Z",
  book: "M4 4h7v16H4zM13 4h7v16h-7",
  shield: "M12 3 5 6v6c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6l-7-3Z",
} as const

// ─────────────────────────────────────────────────────────────────────────────
// S1 · 开场：一颗莓在黑暗里醒来
// ─────────────────────────────────────────────────────────────────────────────

function SceneOpen({ t }: { t: number }) {
  const s = seg(t, S.open, 700, 600)
  if (!s.on) return null
  const orbIn = easeOutBack(at(t, 250, 1500))
  const halo = clamp(at(t, 300, 2200))
  const titleIn = at(t, 1100, 1900)
  const subIn = at(t, 2100, 3000)
  // Orb 表情按 t 切换；这个组件内部跑在自己的 rAF 上（虚拟时钟已接管），
  // 表情切换本身属于组件的变形动画，只能整体钉住，故这里只做粗粒度切换。
  const orbExpr = t < 1600 ? "idle" : t < 3000 ? "listening" : "idle"

  return (
    <div style={{ position: "absolute", inset: 0, opacity: s.op, background: BG }}>
      {/* 呼吸光晕 */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at 50% 46%, rgba(5,150,105,${0.30 * halo}) 0%, rgba(16,185,129,${0.10 * halo}) 32%, transparent 62%)`,
      }} />
      <GridBg opacity={0.10 * halo} size={72} />

      <div style={{ position: "absolute", left: 0, right: 0, top: 96, display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
        <div style={{ transform: `scale(${lerp(0.72, 1, orbIn)})`, opacity: clamp(at(t, 250, 1100)) }}>
          <BerryOrb size="300px" theme="dark" expression={orbExpr} palette={EMERALD_ORB_PALETTE} trails />
        </div>

        <div style={{ textAlign: "center", opacity: titleIn, transform: `translateY(${lerp(22, 0, easeOut(titleIn))}px)` }}>
          <div style={{
            fontFamily: DISPLAY_FONT, fontSize: 84, fontWeight: 700, color: INK,
            letterSpacing: 3, lineHeight: 1.22,
          }}>
            莓园今天怎么样？
          </div>
          <div style={{
            fontFamily: DISPLAY_FONT, fontSize: 84, fontWeight: 700, letterSpacing: 3, lineHeight: 1.22,
            background: `linear-gradient(100deg, ${GREEN_DEEP} 0%, ${GREEN} 46%, #6EE7B7 100%)`,
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
            opacity: subIn, transform: `translateY(${lerp(20, 0, easeOut(subIn))}px)`,
            paddingBottom: 12,
          }}>
            我来帮你打理。
          </div>
        </div>

        <div style={{
          marginTop: 8, opacity: clamp(at(t, 3100, 4100)),
          display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", maxWidth: 1320,
        }}>
          {["大棚湿度 90% 要不要放风？", "白粉病早期怎么判断？", "什么时候该开补光灯？"].map((q, i) => {
            const k = easeOutBack(clamp(at(t, 3200 + i * 260, 3900 + i * 260)))
            return (
              <span key={q} style={{
                fontSize: 21, color: "#D4D4D8", padding: "12px 26px", borderRadius: 999,
                background: "rgba(24,24,27,.9)", border: `1px solid ${LINE}`,
                opacity: clamp(k), transform: `translateY(${lerp(18, 0, k)}px)`,
              }}>{q}</span>
            )
          })}
        </div>
      </div>

      {/* 左下角品牌 */}
      <div style={{ position: "absolute", left: 80, bottom: 70, display: "flex", alignItems: "center", gap: 14, opacity: clamp(at(t, 1800, 2800)) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" style={{ width: 40, height: 40, borderRadius: 12 }} />
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: INK, letterSpacing: 1 }}>莓界 Berry Realm</div>
          <div style={{ fontSize: 13, letterSpacing: "0.2em", color: GREEN, textTransform: "uppercase" }}>Agri Hub v4.0</div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// S2 · 会看：五路传感器
// ─────────────────────────────────────────────────────────────────────────────

/** 真实字段与单位取自 dashboard：温度/湿度/光照/CO₂/土壤含水率 */
const SENSORS = [
  { key: "温度", unit: "℃", to: 24.5, icon: ICONS.temp, color: "#F97316", delay: 0 },
  { key: "湿度", unit: "%", to: 62.1, icon: ICONS.humid, color: "#0EA5E9", delay: 220 },
  { key: "光照", unit: "lux", to: 18600, icon: ICONS.light, color: "#F59E0B", delay: 440, decimals: 0 },
  { key: "CO₂", unit: "ppm", to: 812, icon: ICONS.co2, color: "#10B981", delay: 660, decimals: 0 },
  { key: "土壤含水率", unit: "%", to: 41.3, icon: ICONS.soil, color: "#16A34A", delay: 880 },
]

/** 确定性伪随机折线（每个通道形状固定） */
function spark(seed: number, n = 44) {
  const pts: number[] = []
  for (let i = 0; i < n; i++) {
    const base = 0.5 + 0.22 * Math.sin((i / n) * Math.PI * 2.4 + seed)
    pts.push(clamp(base + (hash(seed * 97 + i) - 0.5) * 0.34, 0.06, 0.94))
  }
  return pts
}

function Spark({ seed, color, w = 200, h = 44, p }: { seed: number; color: string; w?: number; h?: number; p: number }) {
  const pts = useMemo(() => spark(seed), [seed])
  const n = pts.length
  const d = pts.map((v, i) => `${i === 0 ? "M" : "L"}${(i / (n - 1)) * w},${h - v * h}`).join(" ")
  const total = w * 1.35
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={total} strokeDashoffset={total * (1 - clamp(p))} opacity={0.95} />
    </svg>
  )
}

function SceneSense({ t }: { t: number }) {
  const s = seg(t, S.sense, 500, 500)
  if (!s.on) return null
  const head = clamp(at(t, 5220, 6100))
  const foot = clamp(at(t, 9300, 10800))

  return (
    <div style={{ position: "absolute", inset: 0, opacity: s.op, background: BG }}>
      <GridBg opacity={0.10} size={64} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(5,150,105,.14), transparent 58%)" }} />
      <EdgeLight tone="green" op={s.op * 0.75} p={s.p} />
      <Tag text="Perceive · 会看" op={head} />

      <div style={{ position: "absolute", left: 120, top: 150, right: 120, opacity: head, transform: `translateY(${lerp(24, 0, easeOut(head))}px)` }}>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 62, fontWeight: 700, color: INK, letterSpacing: 1 }}>
          温度、湿度、光照、CO₂、土壤——<span style={{ color: GREEN }}>五路我都在看</span>
        </div>
      </div>

      {/* 传感器瓷砖 */}
      <div style={{ position: "absolute", left: 120, top: 292, right: 120, display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 22 }}>
        {SENSORS.map((sd, i) => {
          const k = clamp(at(t, S.sense.start + sd.delay, S.sense.start + sd.delay + 1250))
          const e = easeOut(k)
          const val = lerp(sd.to * 0.55, sd.to, e)
          const dec = sd.decimals ?? 1
          return (
            <Panel key={sd.key} glow={`${sd.color}22`} style={{
              padding: "26px 24px 22px", opacity: e, transform: `translateY(${lerp(34, 0, e)}px)`,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Ico d={sd.icon} color={sd.color} />
                  <span style={{ fontSize: 21, fontWeight: 600, color: MUTED }}>{sd.key}</span>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: 99, background: sd.color, boxShadow: `0 0 12px ${sd.color}`, opacity: 0.5 + 0.5 * pulse((t / 1400 + i * 0.2) % 1) }} />
              </div>
              <div style={{ marginTop: 18, display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 52, fontWeight: 700, color: INK, fontVariantNumeric: "tabular-nums", letterSpacing: -1 }}>
                  {val.toFixed(dec)}
                </span>
                <span style={{ fontSize: 20, color: MUTED }}>{sd.unit}</span>
              </div>
              <div style={{ marginTop: 14 }}>
                <Spark seed={i + 3} color={sd.color} w={196} h={40} p={clamp(at(t, S.sense.start + sd.delay + 300, S.sense.start + sd.delay + 1500))} />
              </div>
            </Panel>
          )
        })}
      </div>

      {/* 结论条：真实阈值判断 */}
      <Panel style={{
        position: "absolute", left: 120, right: 120, top: 690, padding: "30px 34px",
        opacity: clamp(at(t, 8600, 9800)),
        transform: `translateY(${lerp(30, 0, easeOut(at(t, 8600, 9800)))}px)`,
        display: "flex", alignItems: "center", gap: 20, borderColor: "rgba(245,158,11,.35)",
      }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: "rgba(245,158,11,.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Ico d={ICONS.shield} color="#F59E0B" size={26} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 27, fontWeight: 600, color: INK }}>湿度 62.1% · 接近开花期上限</div>
          <div style={{ fontSize: 20, color: MUTED, marginTop: 6 }}>超出阈值我会先告警，并附上已拟好的处置方案等你确认</div>
        </div>
        <div style={{ fontSize: 17, padding: "9px 18px", borderRadius: 999, background: "rgba(245,158,11,.14)", color: "#FBBF24", fontWeight: 600, letterSpacing: ".05em" }}>
          待确认
        </div>
      </Panel>

      <Caption text="7×24 盯着每一项环境指标" sub="不让问题发生在你没看见的时候" op={foot} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// S3 · 会想：看图看病
// ─────────────────────────────────────────────────────────────────────────────

const DIAG_STAGES = [
  { img: "/dev-promo/diag-a.png", name: "灰霉病", level: "重度 · 约 60%", conf: "置信度 0.86",
    note: "果实：大面积发生，须立即处置并隔离" },
  { img: "/dev-promo/diag-b.png", name: "病斑定位", level: "2 处病斑", conf: "定位耗时 13.9s",
    note: "霉层呈绒状/丝状而非细粉状，符合灰霉菌丝形态" },
  { img: "/dev-promo/diag-c.png", name: "鉴别诊断", level: "从严交付", conf: "每条结论都有图中依据",
    note: "严禁编造病名 —— 看不清就说看不清" },
]

function SceneDiagnose({ t }: { t: number }) {
  const s = seg(t, S.diagnose, 500, 500)
  if (!s.on) return null
  const l = t - S.diagnose.start
  const stage = l < 2600 ? 0 : l < 5200 ? 1 : 2
  const item = DIAG_STAGES[stage]
  const stageIn = clamp(at(t, S.diagnose.start + (stage === 0 ? 0 : stage === 1 ? 2600 : 5200), S.diagnose.start + (stage === 0 ? 900 : stage === 1 ? 3400 : 6100)))
  const scanP = at(t, S.diagnose.start + 500, S.diagnose.start + 2500) % 1
  const scanning = l < 2500

  return (
    <div style={{ position: "absolute", inset: 0, opacity: s.op, background: BG }}>
      {/* 全幅画面 */}
      <Shot src={item.img} op={stageIn} p={clamp(l / 8000)} inset={56} radius={24}
        from={[1.03, 50, 30]} to={[1.12, stage === 1 ? 32 : 62, 42]} />

      {/* 视觉扫描：横扫线 + 四角框（不谎称病斑坐标，只表达"正在看"） */}
      {scanning && (
        <div style={{ position: "absolute", inset: 56, borderRadius: 24, overflow: "hidden", pointerEvents: "none" }}>
          <div style={{
            position: "absolute", left: 0, right: 0, height: 160,
            top: `${lerp(-12, 104, scanP)}%`,
            background: `linear-gradient(180deg, transparent, rgba(52,211,153,.20) 62%, rgba(110,231,183,.75) 100%)`,
            boxShadow: "0 0 60px rgba(52,211,153,.45)",
          }} />
          {[["left","top"],["right","top"],["left","bottom"],["right","bottom"]].map(([h, v], i) => (
            <div key={i} style={{
              position: "absolute", [h]: 22, [v]: 22, width: 62, height: 62,
              borderLeft: h === "left" ? "3px solid rgba(52,211,153,.9)" : undefined,
              borderRight: h === "right" ? "3px solid rgba(52,211,153,.9)" : undefined,
              borderTop: v === "top" ? "3px solid rgba(52,211,153,.9)" : undefined,
              borderBottom: v === "bottom" ? "3px solid rgba(52,211,153,.9)" : undefined,
              opacity: 0.65 + 0.35 * pulse((t / 900) % 1),
            } as React.CSSProperties} />
          ))}
          <div style={{ position: "absolute", left: "50%", top: 34, transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 12, padding: "12px 26px", borderRadius: 999, background: "rgba(9,9,11,.82)", border: "1px solid rgba(52,211,153,.4)" }}>
            <div style={{ width: 10, height: 10, borderRadius: 99, background: GREEN, boxShadow: `0 0 14px ${GREEN}`, opacity: 0.4 + 0.6 * pulse((t / 700) % 1) }} />
            <span style={{ fontSize: 22, fontWeight: 600, color: INK }}>AI 视觉分析中 · 多模态</span>
          </div>
        </div>
      )}

      {/* 诊断卡片 */}
      <div style={{
        position: "absolute", right: 92, top: 210, width: 620, opacity: stageIn,
        transform: `translateX(${lerp(70, 0, easeOut(stageIn))}px)`,
      }}>
        <Panel glow="rgba(5,150,105,.28)" style={{ padding: "34px 36px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
            <Ico d={ICONS.eye} size={24} />
            <span style={{ fontSize: 19, fontWeight: 600, letterSpacing: ".22em", color: GREEN, textTransform: "uppercase" }}>Plant Diagnosis</span>
          </div>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 72, fontWeight: 700, color: INK, lineHeight: 1.1 }}>{item.name}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <span style={{ fontSize: 21, padding: "9px 20px", borderRadius: 999, background: "rgba(239,68,68,.15)", color: "#FCA5A5", border: "1px solid rgba(239,68,68,.3)", fontWeight: 600 }}>{item.level}</span>
            <span style={{ fontSize: 21, padding: "9px 20px", borderRadius: 999, background: "rgba(52,211,153,.13)", color: "#6EE7B7", border: "1px solid rgba(52,211,153,.3)", fontWeight: 600 }}>{item.conf}</span>
          </div>
          <div style={{ marginTop: 24, paddingTop: 22, borderTop: `1px solid ${LINE}`, fontSize: 23, lineHeight: 1.62, color: "#D4D4D8" }}>
            {item.note}
          </div>
        </Panel>
      </div>

      <Caption
        text={[
          "甩一张病叶照，我来诊断",
          "病斑定位 · 每一条结论都有图中依据",
          "严禁编造病名 —— 看不清就说看不清",
        ][stage]}
        sub={["草莓病虫害诊断", "诊断自动归档，可回填疗效复诊", "生理性病害误报为真菌病害，会导致你错误施药"][stage]}
        op={clamp(at(t, S.diagnose.start, S.diagnose.start + 600))}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// S4 · 会动手：真的去开设备
// ─────────────────────────────────────────────────────────────────────────────

const DEVICES = [
  { name: "水泵", i: "relay5", on: true, delay: 400 },
  { name: "风扇", i: "relay6", on: false, delay: 750 },
  { name: "补光灯", i: "relay7", on: true, delay: 1100 },
  { name: "云台摄像头", i: "camera", on: true, delay: 1450 },
]

function SceneAct({ t }: { t: number }) {
  const s = seg(t, S.act, 500, 500)
  if (!s.on) return null
  const l = t - S.act.start
  const done = l > 3200
  const pillIn = clamp(at(t, S.act.start + 700, S.act.start + 1400))

  return (
    <div style={{ position: "absolute", inset: 0, opacity: s.op, background: BG }}>
      <Shot src="/dev-promo/ai-clean-dark.png" op={1} p={clamp(l / 6000)} inset={56} radius={24}
        from={[1.02, 46, 40]} to={[1.09, 54, 46]} />

      {/* 电光青蓝流光（与设备控制 tone 一致，刻意避开品牌绿） */}
      <div style={{ position: "absolute", inset: 56, borderRadius: 24, overflow: "hidden", pointerEvents: "none" }}>
        <EdgeLight tone="cyan" op={l > 600 ? 1 : 0} p={clamp(l / 5000)} />
      </div>

      {/* 状态胶囊 */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: 150, display: "flex", justifyContent: "center",
        opacity: pillIn, transform: `translateY(${lerp(-18, 0, easeOut(pillIn))}px)`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 16, padding: "18px 34px", borderRadius: 999,
          background: "rgba(9,9,11,.86)", border: "1px solid rgba(8,145,178,.5)",
          boxShadow: "0 0 44px rgba(8,145,178,.35)",
        }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{
                width: 9, height: 9, borderRadius: 99,
                background: done ? "#67E8F9" : `rgba(103,232,249,${0.25 + 0.75 * pulse((t / 620 + i * 0.22) % 1)})`,
                boxShadow: "0 0 12px rgba(103,232,249,.8)",
              }} />
            ))}
          </div>
          <span style={{ fontSize: 27, fontWeight: 600, color: done ? "#A5F3FC" : INK }}>
            {done ? "设备开关已执行" : "莓小智正在开关设备…"}
          </span>
        </div>
      </div>

      {/* 设备清单 */}
      <div style={{ position: "absolute", left: 108, bottom: 172, display: "flex", gap: 16 }}>
        {DEVICES.map((d) => {
          const k = clamp(at(t, S.act.start + d.delay, S.act.start + d.delay + 800))
          const e = easeOut(k)
          const lit = e > 0.55
          return (
            <Panel key={d.name} style={{
              padding: "18px 24px", opacity: e, transform: `translateY(${lerp(26, 0, e)}px)`,
              borderColor: lit ? "rgba(8,145,178,.45)" : LINE,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: 99,
                  background: lit ? "#22D3EE" : "#52525B",
                  boxShadow: lit ? "0 0 14px #22D3EE" : "none",
                }} />
                <span style={{ fontSize: 23, fontWeight: 600, color: lit ? INK : MUTED }}>{d.name}</span>
              </div>
            </Panel>
          )
        })}
      </div>

      <Caption text="不是给建议，是真的动手" sub="水泵 · 风扇 · 补光灯 · 云台摄像头 · 位控电机" op={clamp(at(t, S.act.start + 300, S.act.start + 1100))} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// S5 · 六步巡检链路
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  { t: "初始化巡检", d: "准备巡检任务" },
  { t: "云台定位", d: "移动摄像头到目标位置" },
  { t: "建立连接", d: "连接摄像头视频流" },
  { t: "画面捕捉", d: "截取实时画面帧" },
  { t: "视觉分析", d: "多模态分析中" },
  { t: "巡检完成", d: "分析结果已生成" },
]

function SceneInspect({ t }: { t: number }) {
  const s = seg(t, S.inspect, 400, 400)
  if (!s.on) return null
  const l = t - S.inspect.start
  const active = clamp(Math.floor(l / 720), 0, 5)

  return (
    <div style={{ position: "absolute", inset: 0, opacity: s.op, background: BG }}>
      <GridBg opacity={0.11} size={58} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 110%, rgba(5,150,105,.20), transparent 62%)" }} />
      <Tag text="Inspect · 视觉巡检" op={clamp(at(t, S.inspect.start, S.inspect.start + 600))} />

      <div style={{ position: "absolute", left: 0, right: 0, top: 128, textAlign: "center", opacity: clamp(at(t, S.inspect.start, S.inspect.start + 700)) }}>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 56, fontWeight: 700, color: INK, letterSpacing: 1 }}>
          一条指令，走完<span style={{ color: GREEN }}>六个环节</span>
        </div>
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, top: 278, display: "flex", justifyContent: "center", gap: 0 }}>
        {STEPS.map((st, i) => {
          const on = i <= active
          const now = i === active
          const k = easeOutBack(clamp(at(t, S.inspect.start + i * 720, S.inspect.start + i * 720 + 700)))
          const bar = clamp(at(t, S.inspect.start + i * 720, S.inspect.start + (i + 1) * 720))
          return (
            <div key={st.t} style={{ display: "flex", alignItems: "flex-start" }}>
              <div style={{ width: 240, textAlign: "center", opacity: k, transform: `translateY(${lerp(26, 0, k)}px)` }}>
                <div style={{
                  width: 74, height: 74, margin: "0 auto 20px", borderRadius: 22,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: on ? (now ? "rgba(52,211,153,.22)" : "rgba(52,211,153,.13)") : "rgba(39,39,42,.6)",
                  border: `1.5px solid ${now ? GREEN : on ? "rgba(52,211,153,.45)" : LINE}`,
                  boxShadow: now ? `0 0 34px rgba(52,211,153,.5)` : "none",
                }}>
                  {on ? <Ico d={ICONS.bolt} size={32} color={now ? GREEN : "#6EE7B7"} /> : <span style={{ fontSize: 26, fontWeight: 700, color: "#52525B" }}>{i + 1}</span>}
                </div>
                <div style={{ fontSize: 25, fontWeight: 700, color: on ? INK : "#52525B" }}>{st.t}</div>
                <div style={{ fontSize: 18, color: on ? MUTED : "#3F3F46", marginTop: 8, lineHeight: 1.45, padding: "0 16px" }}>{st.d}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: 62, height: 3, marginTop: 36, borderRadius: 2, background: "#27272A", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${bar * 100}%`, background: `linear-gradient(90deg, ${GREEN_DEEP}, ${GREEN})`, boxShadow: `0 0 12px ${GREEN}` }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Caption text="初始化巡检 → 云台定位 → 建立连接 → 画面捕捉 → 视觉分析 → 巡检完成"
        sub="你不必守着屏幕 —— 它自己会把该看的都看完" op={clamp(at(t, S.inspect.start + 200, S.inspect.start + 800))} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// S6 · 会编排：直接改画布
// ─────────────────────────────────────────────────────────────────────────────

function SceneCanvas({ t }: { t: number }) {
  const s = seg(t, S.canvas, 500, 500)
  if (!s.on) return null
  const l = t - S.canvas.start
  const done = l > 3000

  return (
    <div style={{ position: "absolute", inset: 0, opacity: s.op, background: BG }}>
      <Shot src="/dev-promo/canvas-edit-copilot.png" op={1} p={clamp(l / 5400)} inset={56} radius={24}
        from={[1.02, 50, 50]} to={[1.08, 44, 52]} />

      <div style={{ position: "absolute", inset: 56, borderRadius: 24, overflow: "hidden", pointerEvents: "none" }}>
        <EdgeLight tone="violet" op={l > 400 ? 1 : 0} p={clamp(l / 5000)} />
      </div>

      <div style={{
        position: "absolute", left: 0, right: 0, top: 150, display: "flex", justifyContent: "center",
        opacity: clamp(at(t, S.canvas.start + 500, S.canvas.start + 1200)),
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 16, padding: "18px 34px", borderRadius: 999,
          background: "rgba(9,9,11,.86)", border: "1px solid rgba(139,92,246,.5)",
          boxShadow: "0 0 44px rgba(139,92,246,.38)",
        }}>
          <Ico d={ICONS.branch} size={26} color={done ? "#C4B5FD" : "#A78BFA"} />
          <span style={{ fontSize: 27, fontWeight: 600, color: done ? "#DDD6FE" : INK }}>
            {done ? "画布已更新 · 12 处改动" : "莓小智正在修改画布…"}
          </span>
        </div>
      </div>

      <Caption text="这张流程图我能直接改" sub="加节点、连线、改判断条件和设备动作都会实时落到画布上，你可以随时撤销" op={clamp(at(t, S.canvas.start + 200, S.canvas.start + 900))} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// S7 · 病历与病程
// ─────────────────────────────────────────────────────────────────────────────

function SceneMemory({ t }: { t: number }) {
  const s = seg(t, S.memory, 500, 500)
  if (!s.on) return null
  const l = t - S.memory.start
  const curve = clamp(at(t, S.memory.start + 900, S.memory.start + 3200))
  const cardsIn = clamp(at(t, S.memory.start, S.memory.start + 900))

  // 病程曲线：先急后缓，复诊后回落
  const W = 560, H = 200
  const pts: [number, number][] = [[0, 0.18], [0.16, 0.52], [0.32, 0.86], [0.5, 0.74], [0.68, 0.46], [0.84, 0.24], [1, 0.12]]
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x * W},${H - y * H}`).join(" ")
  const LEN = W * 1.6

  const RECORDS = [
    { name: "灰霉病", level: "重度", st: "首诊", color: "#EF4444", d: 0 },
    { name: "白粉病", level: "轻度", st: "复诊", color: "#F59E0B", d: 220 },
    { name: "缺钙 · 生理性", level: "轻度", st: "已解决", color: "#34D399", d: 440 },
  ]

  return (
    <div style={{ position: "absolute", inset: 0, opacity: s.op, background: BG }}>
      <GridBg opacity={0.09} size={66} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 20% 50%, rgba(5,150,105,.16), transparent 55%)" }} />
      <Tag text="Archive · 病历闭环" op={cardsIn} />

      <div style={{ position: "absolute", left: 110, top: 168, opacity: cardsIn, transform: `translateY(${lerp(24, 0, easeOut(cardsIn))}px)` }}>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 60, fontWeight: 700, color: INK, lineHeight: 1.18 }}>
          每一次诊断都归档<br />
          <span style={{ color: GREEN }}>病程看得见</span>
        </div>
      </div>

      {/* 病历卡 */}
      <div style={{ position: "absolute", left: 110, top: 428, width: 620, display: "flex", flexDirection: "column", gap: 16 }}>
        {RECORDS.map((r, i) => {
          const k = clamp(at(t, S.memory.start + r.d, S.memory.start + r.d + 750))
          const e = easeOut(k)
          return (
            <Panel key={r.name} style={{ padding: "22px 26px", opacity: e, transform: `translateX(${lerp(-40, 0, e)}px)`, borderColor: `${r.color}44` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 10, height: 10, borderRadius: 99, background: r.color, boxShadow: `0 0 12px ${r.color}` }} />
                <span style={{ fontSize: 27, fontWeight: 700, color: INK, flex: 1 }}>{r.name}</span>
                <span style={{ fontSize: 19, color: MUTED }}>{r.level}</span>
                <span style={{ fontSize: 18, padding: "6px 16px", borderRadius: 999, background: `${r.color}1F`, color: r.color, fontWeight: 600, border: `1px solid ${r.color}40` }}>{r.st}</span>
              </div>
            </Panel>
          )
        })}
      </div>

      {/* 病程曲线 */}
      <Panel style={{
        position: "absolute", right: 110, top: 300, width: 680, padding: "34px 40px 28px",
        opacity: clamp(at(t, S.memory.start + 600, S.memory.start + 1400)),
      }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 27, fontWeight: 700, color: INK }}>病程走势</span>
          <span style={{ fontSize: 19, color: MUTED }}>越高越重</span>
        </div>

        <svg width={W + 40} height={H + 60} viewBox={`0 0 ${W + 40} ${H + 60}`} style={{ overflow: "visible", marginTop: 12 }}>
          <defs>
            <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GREEN} stopOpacity="0.28" />
              <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* 网格 */}
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={0} y1={(i / 3) * H} x2={W} y2={(i / 3) * H} stroke="#27272A" strokeWidth={1} strokeDasharray="4 8" />
          ))}
          <g transform="translate(20,10)">
            <path d={`${d} L${W},${H} L0,${H} Z`} fill="url(#curveFill)"
              opacity={clamp((curve - 0.35) / 0.65)} />
            <path d={d} fill="none" stroke={GREEN} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={LEN} strokeDashoffset={LEN * (1 - curve)}
              style={{ filter: "drop-shadow(0 0 12px rgba(52,211,153,.6))" }} />
            {pts.map(([x, y], i) => {
              const at_ = i / (pts.length - 1)
              const vis = curve >= at_
              return (
                <g key={i} opacity={vis ? 1 : 0}>
                  <circle cx={x * W} cy={H - y * H} r={i === pts.length - 1 ? 9 : 6}
                    fill={i === pts.length - 1 ? "#6EE7B7" : BG} stroke={GREEN} strokeWidth={3} />
                </g>
              )
            })}
            {curve > 0.92 && (
              <g opacity={clamp((curve - 0.92) / 0.08)}>
                <text x={W - 6} y={H - pts[6][1] * H - 22} fill="#6EE7B7" fontSize={19} textAnchor="end" fontWeight={600}>已控制</text>
              </g>
            )}
          </g>
          <g transform="translate(20,10)">
            {["首诊", "用药后 3 天", "复诊"].map((lab, i) => {
              const x = [0, 0.5, 1][i] * W
              return <text key={lab} x={i === 0 ? 0 : i === 2 ? W : x} y={H + 40} fill={MUTED} fontSize={18}
                textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}>{lab}</text>
            })}
          </g>
        </svg>

        <div style={{ fontSize: 20, color: MUTED, lineHeight: 1.6, marginTop: 10, paddingTop: 18, borderTop: `1px solid ${LINE}` }}>
          执行防治措施后回填一次疗效，这里就会画出病程曲线。
        </div>
      </Panel>

      <Caption text="诊断自动归档 · 复诊回填疗效 · 看得见的病程" op={clamp(at(t, S.memory.start + 2200, S.memory.start + 3000))} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// S8 · 片尾
// ─────────────────────────────────────────────────────────────────────────────

function SceneOutro({ t }: { t: number }) {
  const s = seg(t, S.outro, 600, 900)
  if (!s.on) return null
  const l = t - S.outro.start
  const orbIn = easeOutBack(clamp(at(t, S.outro.start + 200, S.outro.start + 1400)))
  const nameIn = clamp(at(t, S.outro.start + 900, S.outro.start + 1800))
  const sloganIn = clamp(at(t, S.outro.start + 1700, S.outro.start + 2700))
  const brandIn = clamp(at(t, S.outro.start + 2900, S.outro.start + 4000))
  const halo = clamp(at(t, S.outro.start, S.outro.start + 2200))

  return (
    <div style={{ position: "absolute", inset: 0, opacity: s.op, background: BG }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at 50% 42%, rgba(5,150,105,${0.32 * halo}) 0%, rgba(16,185,129,${0.10 * halo}) 34%, transparent 64%)`,
      }} />
      <GridBg opacity={0.10} size={70} />
      <EdgeLight tone="green" op={clamp(at(t, S.outro.start + 600, S.outro.start + 1600)) * 0.6} p={clamp(l / 6400)} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `scale(${lerp(0.6, 1, orbIn)})`, opacity: clamp(at(t, S.outro.start + 200, S.outro.start + 1000)), marginBottom: 34 }}>
          <BerryOrb size="210px" theme="dark" expression="speaking" palette={EMERALD_ORB_PALETTE} />
        </div>

        <div style={{
          fontFamily: DISPLAY_FONT, fontSize: 118, fontWeight: 700, letterSpacing: 6,
          color: INK, opacity: nameIn, transform: `translateY(${lerp(24, 0, easeOut(nameIn))}px)`,
          textShadow: "0 0 70px rgba(52,211,153,.4)",
        }}>
          莓小智
        </div>

        <div style={{
          fontFamily: DISPLAY_FONT, fontSize: 46, fontWeight: 400, color: "#D4D4D8", letterSpacing: 3,
          marginTop: 26, opacity: sloganIn, transform: `translateY(${lerp(18, 0, easeOut(sloganIn))}px)`,
        }}>
          会看、会想、会动手的农业智能体
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 78, opacity: brandIn, transform: `translateY(${lerp(16, 0, easeOut(brandIn))}px)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" style={{ width: 46, height: 46, borderRadius: 14 }} />
          <div style={{ width: 1, height: 40, background: LINE }} />
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: INK, letterSpacing: 1 }}>莓界 Berry Realm</div>
            <div style={{ fontSize: 15, letterSpacing: "0.22em", color: GREEN, textTransform: "uppercase", marginTop: 3 }}>Agri Hub v4.0</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 页面
// ─────────────────────────────────────────────────────────────────────────────

export default function PromoVideoPage() {
  const { setTheme } = useTheme()
  const [t, setT] = useState(0)

  useEffect(() => {
    setTheme("dark")
    document.documentElement.classList.add("dark")

    // ── 虚拟时钟 ──
    // 逐帧出片要求「同一个 t → 同一张像素图」。外部组件的动画跑在
    // performance.now() 上，这里把它冻结到 t，于是任何一帧渲染都是 t 的纯函数。
    // 冻结前用真实时间起步，保证与组件挂载时捕获的基准时间连续，不会瞬移。
    const w = window as unknown as Record<string, unknown> & {
      __seek: (ms: number) => void
      __duration: number
      __ready: boolean
      __pin: (ms: number) => number
    }
    const realNow = performance.now.bind(performance)
    let frozen = false
    let base = 0
    let cur = 0
    performance.now = () => (frozen ? base + cur : realNow())

    /** 把声明式动画（CSS / WAAPI）也钉到 t —— 组件里若用了 @keyframes，这是唯一抓手 */
    const pin = (ms: number) => {
      let n = 0
      try {
        for (const a of document.getAnimations()) {
          const anim = a as Animation & { currentTime: number | null }
          try { anim.pause(); anim.currentTime = ms } catch { /* 有些动画不接受 */ }
          n++
        }
      } catch { /* 浏览器不支持就跳过 */ }
      return n
    }

    /**
     * 清扫「不是本片的浮层」。
     *
     * 全局浮层有两类会糊在画面上：
     *   ① Next 开发浮层（错误徽标 / 构建提示）—— production 下不存在；
     *   ② 应用自身的全局浮层（设备预警 toast、PWA 安装横幅）—— production 下照样在，
     *      是真正会污染成片的那一类。
     * 不逐个追类名（改版就失效），而是按「悬浮在 body 顶层且不是本片子树」来判定，
     * 每次 seek 后立刻清扫，新建的浮层也躲不过。
     */
    const cleanOverlays = () => {
      const root = document.querySelector("[data-promo-root]")
      if (!root) return
      for (const el of Array.from(document.body.children)) {
        if (el === root || el.contains(root)) continue
        const cs = getComputedStyle(el)
        if (cs.display === "none") continue
        const floating = cs.position === "fixed" || cs.position === "absolute"
        const highZ = (parseInt(cs.zIndex || "0", 10) || 0) >= 40
        const r = el.getBoundingClientRect()
        // 只挡「浮在视口上方的小块」，避免误伤撑满页面的正常内容
        if ((floating || highZ) && r.width > 0 && r.width < window.innerWidth * 0.98) {
          ;(el as HTMLElement).style.setProperty("display", "none", "important")
        }
      }
      // 兜底：portal 到更深层的已知浮层容器
      document
        .querySelectorAll('nextjs-portal, [data-sonner-toaster], [data-rht-toaster]')
        .forEach((el) => (el as HTMLElement).style.setProperty("display", "none", "important"))
    }

    w.__seek = (ms: number) => {
      if (!frozen) { frozen = true; base = realNow() }
      // 关键：一旦外部开始驱动时间轴，必须掐掉预览用的 rAF 循环。
      // 否则它每帧都在 setT(真实时间)，把这里刚设的 ms 覆盖掉 ——
      // 表现就是「seek 到 8000ms，画面却停在 1.5s」。
      if (raf) { cancelAnimationFrame(raf); raf = 0 }
      cur = ms
      // flushSync：截图前必须让 React 把这一帧真正提交到 DOM。
      // 普通 setState 是异步的，CDP 会在提交前就抓到画布 —— 那样每帧都会慢一拍。
      flushSync(() => setT(ms))
      cleanOverlays()
      pin(ms)
    }
    w.__pin = pin
    w.__duration = PROMO_DURATION

    const q = new URLSearchParams(location.search).get("t")
    if (q !== null) {
      w.__seek(Number(q))
      w.__ready = true
      return
    }

    // 预览：实时播放（出片不走这条路径）
    let raf = 0
    const t0 = realNow()
    const tick = () => { setT((realNow() - t0) % PROMO_DURATION); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)

    const markReady = () => {
      const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
      const done = fonts?.ready ?? Promise.resolve()
      void done.then(() => setTimeout(() => { w.__ready = true }, 240))
    }
    markReady()

    return () => cancelAnimationFrame(raf)
  }, [setTheme])

  return (
    <ConfigProvider theme={{ algorithm: antdTheme.darkAlgorithm, token: { colorPrimary: GREEN, borderRadius: 10 } }}>
      <div className="dark" data-promo-t={t} data-promo-root style={{
        position: "fixed", inset: 0, width: 1920, height: 1080, overflow: "hidden",
        background: BG, color: INK, fontFamily: FONT,
      }}>
        {/* 出片环境清理：开发浮层 + 应用自身的浮层（toast 预警、PWA 安装提示）
            会烧进截图，一律隐藏。成片走 production 构建时本就不存在这些节点。 */}
        <style>{`
          nextjs-portal, [data-nextjs-toast], [data-nextjs-dialog-overlay],
          [data-next-badge-root], [data-next-badge], [data-issues-badge],
          #next-logo, [data-nextjs-dev-tools-button], [data-nextjs-dev-tools-panel],
          [data-sonner-toaster], [data-rht-toaster], .sonner-toast,
          [class*="install-prompt"], [class*="InstallPrompt"], [id*="pwa-install"],
          [data-pwa-install], [class*="beforeinstallprompt"]
            { display: none !important; }
        `}</style>

        <SceneOpen t={t} />
        <SceneSense t={t} />
        <SceneDiagnose t={t} />
        <SceneAct t={t} />
        <SceneInspect t={t} />
        <SceneCanvas t={t} />
        <SceneMemory t={t} />
        <SceneOutro t={t} />

        {/* 安全帧：整体暗角，让画面更沉 */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 500,
          background: "radial-gradient(ellipse at 50% 50%, transparent 56%, rgba(0,0,0,.42) 100%)",
        }} />
      </div>
    </ConfigProvider>
  )
}
