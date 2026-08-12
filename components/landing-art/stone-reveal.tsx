"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useMotionTemplate,
} from "framer-motion";

type Side = "left" | "right";

// 石头基底（干）与苔藓覆盖态——苔藓层通过跟随光标的径向遮罩柔和浮现。
// 隐喻：触碰土地，生机便在指尖蔓延开来。
const STONE_IMAGES: Record<Side, { base: string; grass: string }> = {
  left: {
    base: "https://qclay.design/lovable/synex/stone-left.png",
    grass: "https://qclay.design/lovable/synex/stone-g-left.png",
  },
  right: {
    base: "https://qclay.design/lovable/synex/stone-right.png",
    grass: "https://qclay.design/lovable/synex/stone-g-right.png",
  },
};

export function StoneReveal({ side }: { side: Side }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  // 光标相对包裹层的位置
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // 显隐半径：进入时撑开，离开时收拢，弹簧平滑过渡
  const radiusRaw = useMotionValue(0);
  const radius = useSpring(radiusRaw, { stiffness: 200, damping: 25 });

  const isLeft = side === "left";
  const zBase = isLeft ? 1 : 4; // 左石在仪表盘之后，右石在仪表盘之前
  const zGrass = isLeft ? 2 : 5;
  const xOffset = isLeft ? -40 : 40;
  const anchor = isLeft ? "left bottom" : "right bottom";

  const mask = useMotionTemplate`radial-gradient(circle ${radius}px at ${x}px ${y}px, black 0%, black 40%, transparent 100%)`;

  const handleMove = (e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
  };

  return (
    <div
      ref={wrapRef}
      className="absolute bottom-0 w-fit cursor-crosshair h-[280px] sm:h-[380px] md:h-[500px] lg:h-[600px] xl:h-[680px]"
      style={{ [side]: 0, zIndex: zBase } as React.CSSProperties}
      onMouseMove={handleMove}
      onMouseEnter={() => radiusRaw.set(120)}
      onMouseLeave={() => radiusRaw.set(0)}
    >
      {/* 基底石头 —— 淡入 + 横向位移（透明 PNG，配合 motion/遮罩） */}
      <motion.img
        src={STONE_IMAGES[side].base}
        alt=""
        draggable={false}
        className="h-full w-auto select-none"
        style={{ objectFit: "contain", objectPosition: anchor }}
        initial={{ opacity: 0, x: xOffset }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, delay: 0.5, ease: "easeOut" }}
      />
      {/* 苔藓覆盖层 —— 跟随光标的径向遮罩柔和显现 */}
      <motion.img
        src={STONE_IMAGES[side].grass}
        alt=""
        draggable={false}
        aria-hidden
        className="absolute inset-0 h-full w-full pointer-events-none select-none"
        style={{
          objectFit: "contain",
          objectPosition: anchor,
          zIndex: zGrass,
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      />
    </div>
  );
}
