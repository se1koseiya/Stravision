"use client";

/**
 * 吉祥物动态片（透明动画 WebP）播放层
 *
 * 为什么不是 <video>：
 *  本机 ffmpeg / PyAV 均无法输出 VP9/VP8 alpha（-pix_fmt yuva420p 被丢弃），
 *  而 <video> 播无 alpha 的 MP4 在浅色/深色页面上都会露底色。
 *  故改用带 alpha 的动画 WebP（浏览器原生支持、体积小），形态上等价于「短视频」。
 *
 * 工程要点：
 *  - 全站十几处复用 → **进入视口才挂载动画层**，离屏/页面隐藏/paused 时只留静态首帧，
 *    否则同屏多张动画 WebP 会一起解码。
 *  - 底层常驻静态 poster，动画层加载完成后淡入，避免首帧闪烁。
 */

import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";

export interface BerryVideoOrbProps {
  /** 动画 WebP（透明、循环） */
  src: string;
  /** 静态首帧（未加载 / 冻结 / 离屏时显示） */
  poster?: string;
  paused?: boolean;
  className?: string;
}

const BerryVideoOrb: React.FC<BerryVideoOrbProps> = ({ src, poster, paused, className }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "200px" }
    );
    io.observe(host);
    return () => io.disconnect();
  }, []);

  const animate = !paused && inView;

  return (
    <div ref={hostRef} className={cn("relative w-full h-full", className)}>
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain select-none"
          draggable={false}
        />
      )}
      {animate && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden="true"
          draggable={false}
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 w-full h-full object-contain select-none transition-opacity duration-300"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      )}
    </div>
  );
};

export default BerryVideoOrb;
