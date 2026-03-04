"use client";
import React from "react";
import gsap from "gsap";

interface TextPressureProps {
  text: string;
  className?: string;
  flex?: boolean; // if true, characters spaced using flex
  scale?: boolean; // vertical scale
  alpha?: boolean; // opacity based on cursor distance
  stroke?: boolean; // outline stroke
  textColor?: string;
  strokeColor?: string;
  minFontSize?: number; // px
}

// A lightweight replication of React Bits "Text Pressure" using GSAP.
// It does not require variable font axes; instead it simulates width/weight via
// transform and letter-spacing based on pointer proximity.
const TextPressure: React.FC<TextPressureProps> = ({
  text,
  className = "",
  flex = true,
  scale = false,
  alpha = true,
  stroke = false,
  textColor = "#0C1421",
  strokeColor = "#FFFFFF",
  minFontSize = 24,
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const spansRef = React.useRef<HTMLSpanElement[]>([]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      spansRef.current.forEach((span) => {
        const sRect = span.getBoundingClientRect();
        const sx = sRect.left - rect.left + sRect.width / 2;
        const sy = sRect.top - rect.top + sRect.height / 2;
        const dx = x - sx;
        const dy = y - sy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const max = Math.max(rect.width, rect.height);
        const t = Math.max(0, 1 - dist / (max * 0.5)); // 0..1

        // Simulate width/weight via transform
        const scaleX = 1 + t * 0.35; // widen
        const scaleY = scale ? 1 + t * 0.15 : 1; // optional vertical scale
        const letterSpace = (1 - t) * 0.5; // px

        const opacity = alpha ? 0.6 + t * 0.4 : 1;

        gsap.to(span, {
          duration: 0.2,
          ease: "power3.out",
          opacity,
          letterSpacing: `${letterSpace}px`,
          transform: `scale(${scaleX}, ${scaleY})`,
        });
      });
    };

    const onLeave = () => {
      spansRef.current.forEach((span) => {
        gsap.to(span, {
          duration: 0.3,
          ease: "power3.out",
          opacity: 1,
          letterSpacing: "0px",
          transform: "scale(1,1)",
        });
      });
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [alpha, scale]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        display: flex ? "flex" : "inline-block",
        justifyContent: "center",
        gap: flex ? 4 : undefined,
        color: textColor,
        WebkitTextStroke: stroke ? `1px ${strokeColor}` : undefined,
        fontSize: minFontSize,
        lineHeight: 1,
      }}
    >
      {Array.from(text).map((ch, i) => (
        <span
          key={i}
          ref={(el) => { if (el) spansRef.current[i] = el; }}
          style={{ display: "inline-block" }}
        >
          {ch}
        </span>
      ))}
    </div>
  );
};

export default TextPressure;