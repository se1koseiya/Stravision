"use client";

/**
 * 沉浸光感 · 材质厚度选择器
 * ─────────────────────────────────────────────────────────────
 * 三张「真的在演示材质」的预览卡：背后放内容 → 材质盖上去。
 *
 * 2026-09-29 从 components/ai-settings-dialog.tsx **逐字抽出**，供两处复用：
 *   ① 设置 ▸ 外观 ▸ 沉浸光感（原调用方，视觉与行为零变化）
 *   ② 产品更新页 /whats-new 的「沉浸光感」演示台
 * 抽出来是为了不在更新页里手搓第二版假预览 —— 预览必须和实物是同一个组件。
 *
 * 只做了一处兼容性加法：三个设置弹窗私有 CSS 变量加了全局兜底值
 * （--set-* → --lg-*），这样出了设置弹窗（没有 --set-* 作用域）也不掉样式。
 */

import React from "react";
import { IconCheck } from "@/components/icon";
import {
  MATERIAL_LEVEL_DESC,
  MATERIAL_LEVEL_LABEL,
  MATERIAL_LEVEL_ORDER,
  type MaterialLevel,
} from "@/components/device/material-css";

/**
 * 三档在预览窗里的模糊倍率 —— 与 material-css.ts 里 `html[data-mat-level]` 的
 * --dc-mat-scale（1 / .78 / .2）**必须一一对应**，改了那边就要改这边。
 *
 * ⚠️ 为什么必须内联写死：设置弹窗是 portal 到 body 的，也就是落在 <html> 之下，
 *    三张卡都会继承全局的 --dc-mat-scale —— 不显式覆盖的话它们会长得一模一样，
 *    「选厚度」这件事在 UI 上根本不成立（这正是"演示图与实物不符"的经典翻车点）。
 */
const MAT_PREVIEW_SCALE: Record<MaterialLevel, number> = {
  smooth: 0.2,
  gentle: 0.78,
  exquisite: 1,
  /* off 不在这排卡片里（它是面板里那个总开关），这里只为满足类型穷尽 —— 真渲染也只会得到 0 模糊 */
  off: 0,
};

/**
 * 预览窗背后那层「内容」（就是被材质模糊掉的东西）：
 * 粗色块 + 斜向硬边 + 细竖条。
 * 为什么不用纯渐变：渐变糊掉之后还是渐变，看不出"厚"；只有**色块边界**的锐利↔柔化
 * 才是可读的判据。细条纹负责反证 —— 流畅档还能数出条数，精美档整片拉平。
 */
const MAT_PREVIEW_BACKDROP =
  "repeating-linear-gradient(90deg, rgba(255,255,255,.55) 0 3px, rgba(255,255,255,0) 3px 11px)," +
  "radial-gradient(circle at 24% 26%, #FF9A62 0 30%, rgba(255,154,98,0) 31%)," +
  "radial-gradient(circle at 78% 74%, #34D399 0 32%, rgba(74,222,128,0) 33%)," +
  "linear-gradient(115deg, #6C8CFF 0 38%, #FFD166 38% 66%, #FF6FA5 66% 100%)";

export function MaterialLevelPicker({
  value,
  onChange,
}: {
  value: MaterialLevel;
  onChange: (v: MaterialLevel) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
      {MATERIAL_LEVEL_ORDER.map((lv) => {
        const active = value === lv;
        return (
          <button
            key={lv}
            type="button"
            onClick={() => onChange(lv)}
            aria-pressed={active}
            aria-label={`材质厚度 ${MATERIAL_LEVEL_LABEL[lv]}`}
            style={{
              padding: 0,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              textAlign: "left",
              font: "inherit",
              borderRadius: 12,
            }}
          >
            <div
              style={{
                position: "relative",
                height: 72,
                borderRadius: 10,
                overflow: "hidden",
                border: `1.5px solid ${active ? "#12B76A" : "var(--set-card-border, var(--lg-hairline))"}`,
                boxShadow: active ? "0 0 0 3px rgba(18,183,106,.16)" : "none",
                transition: "border-color .18s ease, box-shadow .18s ease",
              }}
            >
              {/* ① 背后的内容 —— 材质要模糊的就是它（必须与外层是兄弟节点，backdrop-filter 才吃得到） */}
              <div aria-hidden style={{ position: "absolute", inset: 0, background: MAT_PREVIEW_BACKDROP }} />
              {/* ② 材质本体：真实档位类 + 只覆盖模糊倍率 —— 三张卡的唯一差别就在这个变量上
                  data-mat-preview = 声明"我是测量仪器，不是被测对象"：
                  关闭档会清掉全站 .dc-mat 的模糊与底色，但**必须放过**这三张卡，
                  否则它们一起变纯色 → 三块空白，选择器失效（见 material-css.ts 的 off 段）。 */}
              <div
                aria-hidden
                data-mat-preview
                className="dc-mat dc-mat--regular"
                style={
                  {
                    position: "absolute",
                    inset: 0,
                    "--dc-mat-scale": MAT_PREVIEW_SCALE[lv],
                  } as React.CSSProperties
                }
              />
              {/* ③ 选中标记压在材质之上（不参与模糊）：用品牌绿，与全站唯一强调色一致 */}
              {active && (
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    background: "#12B76A",
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <IconCheck style={{ width: 12, height: 12 }} />
                </span>
              )}
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                lineHeight: "18px",
                color: active ? "#12B76A" : "var(--set-text, var(--lg-ink))",
                fontWeight: active ? 600 : 400,
              }}
            >
              {MATERIAL_LEVEL_LABEL[lv]}
            </div>
            <div style={{ fontSize: 12, lineHeight: "17px", color: "var(--set-text-secondary, var(--lg-muted))" }}>
              {MATERIAL_LEVEL_DESC[lv]}
            </div>
          </button>
        );
      })}
    </div>
  );
}
