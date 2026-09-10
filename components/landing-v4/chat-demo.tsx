"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { CONTAINER, EYEBROW, L, L_MIX, SECTION_TITLE, SHADOW, fadeUp } from "./shared";
import { HeroChatSkeleton } from "./skeletons";

/* ------------------------------------------------------------
   对话演示区 —— 用 Loomy 的「预览台」语言包裹真实对话窗口
     eyebrow          13px/800/+0.16em #4AAF7A
     标题             45px/700/1.3333/+0.0167em（同区块标题）
     预览台           #FAFFFB + 径向光斑 + rgba(246,246,246,.77) 细边框，圆角 28px
     窗口             圆角 18.4px + #DAF5E4 绿色光环（Loomy previewWindow）
   窗口本体直接用 ai-assistant 的真实对话组件（HeroChat），不是手搓 mock。
   ------------------------------------------------------------ */

const HeroChat = dynamic(
  () => import("@/components/landing-v3/hero-chat").then((m) => m.HeroChat),
  {
    ssr: false,
    loading: () => <HeroChatSkeleton />,
  }
);

export function ChatDemo() {
  return (
    <section className="bg-white py-28 dark:bg-[#0C110E]">
      <div className={CONTAINER}>
        <motion.div {...fadeUp()} className="max-w-[40rem]">
          <p style={EYEBROW}>适用于&nbsp;&nbsp;智能对话</p>
          <h2 className="mb-0 mt-5" style={SECTION_TITLE}>
            把问题丢给它，
            <br />
            剩下的事它来做
          </h2>
          <p className="mt-5 text-[1.215rem] font-medium leading-[1.7]" style={{ color: L.muted }}>
            下面就是控制台里真实运行的对话窗口：它会先查传感器、再推理判断，最后直接执行或给你方案。
            鼠标移上去，它会自己演示一遍。
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.85, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="mt-14 rounded-[1.75rem] border p-5 md:p-10"
          style={{
            background: L_MIX.preview,
            backgroundImage: "radial-gradient(circle at 78% 8%, rgba(125,233,172,0.18), transparent 42%)",
            borderColor: "var(--lg-window-border)",
          }}
        >
          <div
            className="overflow-hidden rounded-[1.15rem] bg-white dark:bg-[#121713]"
            style={{ boxShadow: SHADOW.halo }}
          >
            <HeroChat />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
