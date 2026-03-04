"use client";
import React, { useMemo, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

type SplitType = "chars" | "words" | "lines" | "words, chars";

export interface SplitTextProps {
  tag?: React.ElementType;
  text?: string;
  className?: string;
  delay?: number; // ms between letters
  duration?: number; // seconds
  ease?: string; // gsap ease name
  splitType?: SplitType;
  from?: gsap.TweenVars; // initial state
  to?: gsap.TweenVars; // target state
  textAlign?: React.CSSProperties["textAlign"];
}

// Simple GSAP-based SplitText implementation (client-side only)
export function SplitText({
  tag = "p",
  text = "",
  className = "",
  delay = 100,
  duration = 0.6,
  ease = "power3.out",
  splitType = "chars",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  textAlign = "center",
}: SplitTextProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const parts = useMemo(() => {
    if (splitType === "words" || splitType === "words, chars") {
      return text.split(/(\s+)/);
    }
    // default: chars
    return Array.from(text);
  }, [text, splitType]);

  useGSAP(() => {
    const el = containerRef.current;
    if (!el) return;
    const targets = el.querySelectorAll<HTMLElement>("[data-split]");
    gsap.set(targets, from);
    gsap.to(targets, {
      ...to,
      ease,
      duration,
      stagger: delay / 1000, // delay ms -> s
    });
  }, { scope: containerRef });

  const Tag = tag as any;

  return (
    <div ref={containerRef} style={{ textAlign }}>
      <Tag className={className}>
        {parts.map((p, i) => (
          <span
            key={i}
            data-split
            style={{ display: "inline-block", whiteSpace: p.match(/\s+/) ? "pre" : "normal" }}
          >
            {p}
          </span>
        ))}
      </Tag>
    </div>
  );
}

export default SplitText;