"use client";

/* ============================================================
   DOODLES —— 手绘线稿 SVG 组件库
   · 全部使用不规则贝塞尔曲线模拟手绘抖动
   · strokeLinecap: round，无完美几何
   ============================================================ */

const INK = "#2B3122";
const BERRY = "#A63A3D";

type DoodleProps = {
  className?: string;
  stroke?: string;
  strokeWidth?: number;
};

/** 手绘草莓植株线稿：茎、三片叶、一颗果、一朵花 */
export function StrawberrySprig({ className, stroke = INK }: DoodleProps) {
  return (
    <svg viewBox="0 0 120 160" fill="none" className={className} aria-hidden>
      <g stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* 主茎 */}
        <path d="M58 156 C 55 120, 50 96, 44 70 C 41 58, 42 48, 47 38" />
        {/* 左叶 */}
        <path d="M46 74 C 34 66, 20 64, 12 70 C 8 74, 10 80, 18 83 C 28 87, 40 84, 46 78" />
        <path d="M44 76 C 34 74, 24 74, 16 76" strokeWidth="1" opacity="0.6" />
        {/* 右叶 */}
        <path d="M47 62 C 58 52, 74 48, 84 54 C 90 58, 88 66, 79 70 C 68 75, 54 72, 47 66" />
        <path d="M49 64 C 60 60, 72 59, 82 61" strokeWidth="1" opacity="0.6" />
        {/* 顶叶 */}
        <path d="M47 40 C 42 28, 44 14, 52 8 C 58 4, 64 8, 64 16 C 64 26, 56 36, 48 42" />
        {/* 草莓 */}
        <path d="M62 96 C 74 90, 90 94, 93 106 C 96 120, 84 134, 72 138 C 62 141, 54 132, 55 120 C 56 108, 55 100, 62 96 Z" fill={BERRY} fillOpacity="0.12" />
        <path d="M62 96 C 66 92, 70 92, 74 94 M68 94 C 67 90, 68 86, 71 84" />
        <circle cx="68" cy="108" r="0.9" fill={stroke} stroke="none" />
        <circle cx="78" cy="112" r="0.9" fill={stroke} stroke="none" />
        <circle cx="66" cy="120" r="0.9" fill={stroke} stroke="none" />
        <circle cx="76" cy="124" r="0.9" fill={stroke} stroke="none" />
        <circle cx="84" cy="104" r="0.9" fill={stroke} stroke="none" />
        <circle cx="86" cy="118" r="0.9" fill={stroke} stroke="none" />
        <circle cx="70" cy="130" r="0.9" fill={stroke} stroke="none" />
        {/* 小花 */}
        <path d="M30 104 C 28 98, 30 92, 34 90 C 38 88, 42 92, 41 97 C 40 102, 34 106, 30 104 Z" />
        <path d="M24 98 C 21 94, 21 88, 25 86 M38 88 C 41 84, 46 84, 48 88" strokeWidth="1.2" />
        <circle cx="32" cy="96" r="1.4" fill={stroke} stroke="none" />
      </g>
    </svg>
  );
}

/** 手绘波浪下划线 */
export function ScribbleUnderline({ className, stroke = BERRY }: DoodleProps) {
  return (
    <svg viewBox="0 0 220 14" fill="none" preserveAspectRatio="none" className={className} aria-hidden>
      <path
        d="M4 9 C 30 4, 60 11, 92 7 C 124 3, 150 10, 178 6 C 194 4, 206 7, 216 5"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M18 12 C 60 9, 120 12, 190 10"
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
}

/** 手绘圈注（套在文字外的椭圆圈） */
export function CircleMark({ className, stroke = BERRY }: DoodleProps) {
  return (
    <svg viewBox="0 0 130 64" fill="none" preserveAspectRatio="none" className={className} aria-hidden>
      <path
        d="M64 7 C 94 5, 122 13, 123 31 C 124 49, 92 59, 62 58 C 32 57, 7 47, 8 30 C 9 13, 36 6, 70 8"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 手绘弯箭头（指向右下） */
export function ArrowDoodle({ className, stroke = INK }: DoodleProps) {
  return (
    <svg viewBox="0 0 64 44" fill="none" className={className} aria-hidden>
      <path
        d="M5 7 C 18 22, 36 30, 54 29"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M44 21 L 56 30 L 43 36"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 手绘小叶 */
export function LeafDoodle({ className, stroke = INK }: DoodleProps) {
  return (
    <svg viewBox="0 0 32 40" fill="none" className={className} aria-hidden>
      <path
        d="M14 3 C 24 9, 27 22, 17 34 C 7 27, 4 12, 14 3 Z"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M15 8 C 16 16, 16 24, 14 31" stroke={stroke} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

/** 手绘发丝横线（wobbly rule） */
export function WobblyRule({ className, stroke = INK }: DoodleProps) {
  return (
    <svg viewBox="0 0 1440 12" fill="none" preserveAspectRatio="none" className={className} aria-hidden>
      <path
        d="M2 7 C 180 3, 380 9, 620 6 C 860 3, 1080 9, 1280 5 C 1350 4, 1400 7, 1438 5"
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}

/** 撕纸边缘（区块分隔，fill 填入下一块背景色） */
export function TornEdge({ className, fill = "#F4EFE3", flip = false }: { className?: string; fill?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 1440 44"
      preserveAspectRatio="none"
      className={className}
      style={flip ? { transform: "scaleY(-1)" } : undefined}
      aria-hidden
    >
      <path
        d="M0 44 L0 24 L41 30 L86 15 L139 26 L197 11 L252 23 L308 16 L361 27 L419 12 L472 22 L533 15 L588 26 L647 13 L701 24 L759 17 L814 27 L872 12 L929 22 L988 15 L1043 25 L1101 13 L1157 23 L1213 16 L1268 26 L1327 12 L1381 21 L1440 16 L1440 44 Z"
        fill={fill}
      />
    </svg>
  );
}

/** 胶带条（贴在照片上的半透明纸条） */
export function TapeStrip({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute block h-7 w-24 ${className ?? ""}`}
      style={{
        background: "rgba(216, 203, 175, 0.75)",
        boxShadow: "0 1px 3px rgba(43,49,34,0.15)",
        borderLeft: "1px dashed rgba(43,49,34,0.12)",
        borderRight: "1px dashed rgba(43,49,34,0.12)",
        backdropFilter: "blur(1px)",
      }}
    />
  );
}
