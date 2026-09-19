"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { IconArrowRight, IconCaution, IconChartLine, IconCheckOne, IconGithub, IconLayers, IconRemind, IconShield, IconTime } from "@/components/icon";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ============================================================
   CAPABILITIES —— 不对称编辑栅格 · 真实能力深描
   · 纸色基底，黑字 + 单蓝点缀
   · 三块能力：技能自路由 / 视觉巡检 / 安全不越权
   · 直角边框、索引式列表、鼠标跟随视差
   ============================================================ */

const SKILLS = [
  { name: "草莓种植专家", cat: "农学" },
  { name: "病虫害识别", cat: "诊断" },
  { name: "视觉巡检", cat: "感知" },
  { name: "电机控制", cat: "硬件" },
  { name: "自动化策略", cat: "编排" },
  { name: "定时任务", cat: "调度" },
  { name: "任务规划", cat: "执行" },
  { name: "草莓销售", cat: "经营" },
];

const CHECKPOINTS = [
  { icon: IconGithub, title: "关键决策点", desc: "多个可行方案且无明确优先级时" },
  { icon: IconCaution, title: "不可逆操作", desc: "持续灌溉 &gt;5min、滑台 &gt;100mm、阈值变更" },
  { icon: IconLayers, title: "复杂度阈值", desc: "子任务 ≥3 且跨系统、多设备联动" },
  { icon: IconCheckOne, title: "信息不足", desc: "缺少时长 / 目标值 / 设备等参数" },
];

const PERMISSIONS = [
  { mode: "请求批准", desc: "每次设备控制都需你确认", detail: "最稳妥" },
  { mode: "替我审批", desc: "仅高风险操作需确认", detail: "平衡" },
  { mode: "完全访问", desc: "莓小智自主执行全部工具", detail: "最自由" },
];

// 主动守护：实时监控指标流（pct = 当前占满量程比例，threshold = 阈值线位置）
const MONITOR_ROWS = [
  { label: "空气温度", value: "24.5°C", pct: 55, threshold: 70, alert: false },
  { label: "空气湿度", value: "62%", pct: 62, threshold: 80, alert: false },
  { label: "土壤湿度", value: "0.34", pct: 34, threshold: 40, alert: true },
  { label: "CO₂ 浓度", value: "420ppm", pct: 48, threshold: 60, alert: false },
  { label: "光照强度", value: "28.4klx", pct: 71, threshold: 85, alert: false },
];

export function Capabilities() {
  return (
    <section className="relative bg-[#F7F5F0]">
      {/* ============ 顶部章节标记（克制版）============ */}
      <div className="pt-32">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px] tracking-[0.25em] text-[#0A0A0B]/40 uppercase">
              04 / 系统
            </span>
            <span className="block w-12 h-px bg-[#0A0A0B]/10" />
            <span className="font-mono text-[11px] tracking-[0.25em] text-[#0A0A0B]/40 uppercase">
              The System
            </span>
          </div>
          <span className="font-mono text-[11px] tracking-[0.2em] text-[#0A0A0B]/30 uppercase hidden sm:inline">
            routing · guardian · trust
          </span>
        </div>
      </div>

      {/* ============ 区块 1：技能自路由（不对称栅格）============ */}
      <SkillRouting />

      {/* ============ 区块 2：主动守护 ============ */}
      <ProactiveGuardian />

      {/* ============ 区块 3：智能但不越权 ============ */}
      <Safety />
    </section>
  );
}

/* ---------- 区块 1：技能自路由 ---------- */
function SkillRouting() {
  return (
    <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-24 sm:py-36">
      <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* 左：标题 + 文案（占 5 列） */}
        <div className="lg:col-span-5">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="block font-mono text-[12px] tracking-[0.3em] text-[#1677ff] uppercase mb-6"
          >
            01 · 技能自路由
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.9, ease: EASE as any }}
            className="font-alimama font-medium text-[#0A0A0B] leading-[0.98]"
            style={{ fontSize: "clamp(36px, 5.4vw, 80px)", letterSpacing: "-0.045em" }}
          >
            AI 自己决定，
            <br />
            调用哪种<span style={{ color: "#1677ff" }}>能力</span>。
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-8 text-[16px] sm:text-[17px] text-[#0A0A0B]/55 leading-[1.7] max-w-[440px]"
          >
            莓小智内置 14 项专项技能——从病虫害诊断到电机控制、从销售策略到自动化编排。它根据你的问题自主判断该加载哪些，而不是把所有知识一次性塞进对话。
          </motion.p>
        </div>

        {/* 右：索引式技能列表（占 7 列）—— 直角行 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.8, ease: EASE as any }}
          className="lg:col-span-6 lg:col-start-7"
        >
          <div className="border-t border-[#0A0A0B]/15">
            {SKILLS.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group flex items-center justify-between border-b border-[#0A0A0B]/15 py-4 hover:bg-[#0A0A0B]/[0.02] transition-colors cursor-default"
                data-cursor="hover"
              >
                <div className="flex items-baseline gap-6">
                  <span className="font-mono text-[12px] text-[#0A0A0B]/35 w-6">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[17px] text-[#0A0A0B] font-alimama font-medium">{s.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[11px] tracking-[0.15em] text-[#0A0A0B]/35 uppercase">
                    {s.cat}
                  </span>
                  <IconArrowRight
                    className="w-4 h-4 text-[#0A0A0B]/20 -translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-hover:text-[#1677ff]"
                    strokeWidth={1.75}
                  />
                </div>
              </motion.div>
            ))}
            {/* 尾注行 */}
            <div className="flex items-center justify-between border-b border-[#0A0A0B]/15 py-4">
              <span className="font-mono text-[12px] text-[#0A0A0B]/40">
                + 6 项 · 按需加载，不占上下文
              </span>
              <span className="font-mono text-[11px] tracking-[0.15em] text-[#1677ff] uppercase">
                14 total
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ---------- 区块 2：主动守护 ---------- */
function ProactiveGuardian() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // 监控面板视差：略微上浮
  const panelY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <div ref={ref} className="bg-[#08080A] text-white">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-24 sm:py-36">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* 左：监控面板（直角边框 + 视差） */}
          <motion.div
            style={{ y: panelY }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.8, ease: EASE as any }}
            className="lg:col-span-7 order-2 lg:order-1"
          >
            <div className="relative border border-white/15">
              {/* 取景器四角 */}
              <ViewfinderCorners />
              {/* 监控面板头 */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="block w-1.5 h-1.5 bg-[#1677ff] animate-pulse" />
                  <span className="font-mono text-[11px] tracking-[0.2em] text-white/60 uppercase">
                    Live Monitor · 1 号温室
                  </span>
                </div>
                <span className="font-mono text-[11px] tracking-[0.2em] text-white/30 uppercase">
                  7×24
                </span>
              </div>

              {/* 实时指标流 —— 直角行 */}
              <div className="divide-y divide-white/5">
                {MONITOR_ROWS.map((r, i) => (
                  <motion.div
                    key={r.label}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    className="flex items-center gap-4 px-5 py-3.5"
                  >
                    <IconChartLine className="w-3.5 h-3.5 text-white/30 shrink-0" strokeWidth={1.75} />
                    <span className="font-mono text-[12px] text-white/55 w-24 shrink-0">{r.label}</span>
                    {/* 数值条 */}
                    <div className="flex-1 relative h-1.5 bg-white/5">
                      <motion.div
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: r.pct / 100 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: 0.2 + i * 0.08, ease: EASE as any }}
                        style={{ background: r.alert ? "#f59e0b" : "#1677ff", transformOrigin: "left" }}
                        className="absolute inset-y-0 left-0"
                      />
                      {/* 阈值线 */}
                      <span className="absolute inset-y-0 w-px bg-white/40" style={{ left: `${r.threshold}%` }} />
                    </div>
                    <span
                      className={`font-mono text-[12px] w-16 text-right shrink-0 ${
                        r.alert ? "text-amber-400" : "text-white/80"
                      }`}
                    >
                      {r.value}
                    </span>
                    {r.alert ? (
                      <span className="font-mono text-[9px] tracking-[0.15em] text-amber-400 uppercase w-10 shrink-0">
                        ALERT
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] tracking-[0.15em] text-white/25 uppercase w-10 shrink-0">
                        OK
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* AI 主动告警卡 —— 直角，蓝边 */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="m-5 border border-[#1677ff]/40 bg-[#1677ff]/[0.06] p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <IconRemind className="w-4 h-4 text-[#1677ff]" strokeWidth={1.75} />
                    <span className="font-mono text-[11px] tracking-[0.2em] text-[#1677ff] uppercase">
                      AI 主动告警
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 font-mono text-[10px] text-white/40">
                    <IconTime className="w-3 h-3" strokeWidth={1.75} />
                    03:42
                  </span>
                </div>
                <p className="text-[14px] text-white/85 leading-[1.6] mb-3">
                  土壤湿度已连续 2 小时低于阈值 0.40，预计 4 小时后进入水分胁迫。建议立即启动 1 号灌溉区，运行 6 分钟。
                </p>
                <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                  <span className="font-mono text-[10px] tracking-[0.15em] text-white/40 uppercase">
                    已为你草拟方案
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#1677ff]">
                    等待确认
                    <IconArrowRight className="w-3 h-3" strokeWidth={1.75} />
                  </span>
                </div>
              </motion.div>
            </div>
            {/* 落款 */}
            <div className="mt-3 flex items-center justify-between font-mono text-[10px] tracking-[0.2em] text-white/30 uppercase">
              <span>fig.05 · proactive guard</span>
              <span>watch &amp; alert</span>
            </div>
          </motion.div>

          {/* 右：文案 */}
          <div className="lg:col-span-4 lg:col-start-9 order-1 lg:order-2">
            <motion.span
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="block font-mono text-[12px] tracking-[0.3em] text-[#1677ff] uppercase mb-6"
            >
              02 · 主动守护
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 0.9, ease: EASE as any }}
              className="font-alimama font-medium text-white leading-[0.98]"
              style={{ fontSize: "clamp(36px, 5.4vw, 80px)", letterSpacing: "-0.045em" }}
            >
              让 AI
              <br />
              替你<span style={{ color: "#1677ff" }}>盯着</span>。
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-8 text-[16px] sm:text-[17px] text-white/55 leading-[1.7] max-w-[400px]"
            >
              你不需要时刻盯着屏幕——莓小智 7×24 监测每一项环境指标，在问题发生前主动告警，并附上已草拟的处置方案等你确认。
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-8 inline-flex items-center gap-2 border border-white/15 px-4 py-2 font-mono text-[12px] text-white/60"
            >
              <IconRemind className="w-4 h-4" strokeWidth={1.75} />
              watch &amp; alert
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 区块 3：智能但不越权 ---------- */
function Safety() {
  return (
    <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-24 sm:py-36">
      <div className="grid lg:grid-cols-12 gap-12 mb-16">
        <div className="lg:col-span-8">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 font-mono text-[12px] tracking-[0.3em] text-[#1677ff] uppercase mb-6"
          >
            <IconShield className="w-4 h-4" strokeWidth={1.75} />
            03 · 安全与信任
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.9, ease: EASE as any }}
            className="font-alimama font-medium text-[#0A0A0B] leading-[0.98]"
            style={{ fontSize: "clamp(36px, 5.4vw, 80px)", letterSpacing: "-0.045em" }}
          >
            智能，但
            <br />
            不<span style={{ color: "#1677ff" }}>越权</span>。
          </motion.h2>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="lg:col-span-4 lg:col-start-9 self-end text-[16px] sm:text-[17px] text-[#0A0A0B]/55 leading-[1.7] max-w-[380px]"
        >
          面对复杂或不可逆的操作，莓小智不会贸然执行——它会先拆解计划等你审批，或在关键节点暂停向你确认。
        </motion.p>
      </div>

      {/* 检查点触发条件 —— 4 列直角栅格 */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-[#0A0A0B]/15 mb-16">
        {CHECKPOINTS.map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.6, delay: i * 0.08 }}
            className="group border-r border-b border-[#0A0A0B]/15 p-6 hover:bg-[#0A0A0B]/[0.02] transition-colors"
            data-cursor="hover"
          >
            <div className="flex items-center justify-between mb-4">
              <c.icon className="w-5 h-5 text-[#1677ff]" strokeWidth={1.75} />
              <span className="font-mono text-[11px] text-[#0A0A0B]/30">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="text-[16px] text-[#0A0A0B] font-alimama font-medium mb-2">{c.title}</div>
            <div
              className="text-[13px] text-[#0A0A0B]/50 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: c.desc }}
            />
          </motion.div>
        ))}
      </div>

      {/* 三档权限 —— 横向直角栅格 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.7 }}
        className="border border-[#0A0A0B]/15"
      >
        <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-b border-[#0A0A0B]/15">
          <span className="font-mono text-[12px] tracking-[0.2em] text-[#0A0A0B]/50 uppercase">
            Permission Levels
          </span>
          <span className="font-mono text-[11px] tracking-[0.2em] text-[#1677ff] uppercase">
            由你决定它有多自由
          </span>
        </div>
        <div className="grid sm:grid-cols-3 sm:divide-x sm:divide-[#0A0A0B]/15">
          {PERMISSIONS.map((p, i) => (
            <div key={p.mode} className="p-6 sm:p-8">
              <div className="flex items-baseline justify-between mb-3">
                <span className="font-mono text-[11px] text-[#0A0A0B]/35">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-[11px] tracking-[0.15em] text-[#1677ff] uppercase">
                  {p.detail}
                </span>
              </div>
              <div className="text-[20px] text-[#0A0A0B] font-alimama font-medium mb-3">{p.mode}</div>
              <p className="text-[13px] text-[#0A0A0B]/50 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ---- 取景器四角 ---- */
function ViewfinderCorners() {
  const c = "absolute w-4 h-4 border-white/60 z-10";
  return (
    <>
      <span className={`${c} -top-px -left-px border-t border-l`} />
      <span className={`${c} -top-px -right-px border-t border-r`} />
      <span className={`${c} -bottom-px -left-px border-b border-l`} />
      <span className={`${c} -bottom-px -right-px border-b border-r`} />
    </>
  );
}
