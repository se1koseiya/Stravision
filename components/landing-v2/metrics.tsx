"use client";

import { motion } from "framer-motion";
import { TornEdge, CircleMark, StrawberrySprig } from "./doodles";

/* ============================================================
   NUMBERS —— 几个数字 · 深苔绿章节
   · 页面节奏中的暗部：苔绿底 + 米色字
   · 衬线大数字 + 手绘圈注
   ============================================================ */

const EASE = [0.16, 1, 0.3, 1] as const;
const SERIF = 'Georgia, "Songti SC", "STSong", "SimSun", serif';
const KAI = '"Kaiti SC", "STKaiti", "KaiTi", "楷体", serif';

const METRICS = [
  { value: "<100ms", label: "协同编辑延迟", note: "五十人共编同一文档实测" },
  { value: "24/7", label: "环境守夜", note: "阈值告警，全年无休", circled: true },
  { value: "四级", label: "RBAC 权限角色", note: "owner · admin · editor · viewer" },
  { value: "18类", label: "操作审计", note: "日志含 IP 与元数据，逐条可追" },
];

export function Metrics() {
  return (
    <section id="numbers" className="relative bg-[#232D1F]">
      <TornEdge className="block h-8 w-full md:h-11" fill="#EDE6D2" flip />

      <StrawberrySprig
        className="pointer-events-none absolute bottom-10 right-[6%] w-24 opacity-[0.12]"
        stroke="#F4EFE3"
      />

      <div className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32">
        <p
          className="mb-14 flex items-baseline justify-center gap-3 text-[14px] text-[#F4EFE3]/50"
          style={{ fontFamily: KAI }}
        >
          <span className="text-[#D89A8A]">几个数字</span>
          <span>·</span>
          <span>不多，但都经得起查</span>
        </p>

        <div className="grid grid-cols-2 gap-y-14 lg:grid-cols-4">
          {METRICS.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.9, ease: EASE, delay: i * 0.08 }}
              className="relative text-center"
            >
              <p
                className="relative inline-block text-[clamp(2rem,4.2vw,3.2rem)] leading-none tracking-tight text-[#F4EFE3]"
                style={{ fontFamily: SERIF }}
              >
                <span className={m.circled ? "italic" : ""}>{m.value}</span>
                {m.circled && (
                  <CircleMark
                    className="absolute -inset-x-4 -inset-y-3 h-[calc(100%+1.5rem)] w-[calc(100%+2rem)]"
                    stroke="#D89A8A"
                  />
                )}
              </p>
              <p className="mt-4 text-[15px] text-[#F4EFE3]/80" style={{ fontFamily: SERIF }}>
                {m.label}
              </p>
              <p
                className="mt-1.5 text-[13px] text-[#F4EFE3]/40"
                style={{ fontFamily: KAI }}
              >
                {m.note}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <TornEdge className="block h-8 w-full md:h-11" fill="#F4EFE3" />
    </section>
  );
}
