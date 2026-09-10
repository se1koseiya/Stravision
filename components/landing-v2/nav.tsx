"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const SERIF = 'Georgia, "Songti SC", "STSong", "SimSun", serif';
const KAI = '"Kaiti SC", "STKaiti", "KaiTi", "楷体", serif';

const LINKS = [
  { href: "#notes", label: "栽培笔记" },
  { href: "#work", label: "它做的事" },
  { href: "#day", label: "大棚一日" },
  { href: "#numbers", label: "几个数字" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-[#2B3122]/10 bg-[#F4EFE3]/90 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 md:px-10">
        <Link href="/" className="flex items-baseline gap-2">
          <span
            className="text-xl tracking-tight text-[#2B3122]"
            style={{ fontFamily: SERIF }}
          >
            莓界
          </span>
          <span
            className="text-[12px] text-[#A63A3D]"
            style={{ fontFamily: KAI }}
          >
            一座会思考的大棚
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[14px] text-[#2B3122]/60 transition-colors duration-300 hover:text-[#A63A3D]"
              style={{ fontFamily: SERIF }}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <Link
          href="/login"
          className="rounded-full border border-[#2B3122]/30 px-5 py-2 text-[13px] text-[#2B3122] transition-all duration-300 hover:border-[#A63A3D] hover:bg-[#A63A3D] hover:text-[#F4EFE3] active:scale-[0.98]"
          style={{ fontFamily: SERIF }}
        >
          进入平台
        </Link>
      </div>
    </motion.header>
  );
}
