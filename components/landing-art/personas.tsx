"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconDegreeHat, IconSeedling, IconSetting } from "@/components/icon";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ============================================================
   PERSONAS —— 瑞士栅格三栏编辑式人格展开
   · 同一个问题，三种结构迥异的回答
   · 三列等宽，直角垂直分隔线
   · 选中列高亮（左边缘竖线 + 巨字序号），其余列降饱和
   · 下方固定面板按列切换回答，clip-path 横向揭示
   · 数据源：lib/ai/persona-system.ts 真实 few-shot 示范
   ============================================================ */

type PersonaId = "expert" | "friendly" | "engineer";

interface Persona {
  id: PersonaId;
  no: string;
  name: string;
  tagline: string;
  icon: React.ElementType;
  structure: string[];
  response: React.ReactNode;
}

const QUESTION = "现在温度 32°C 怎么办？";

const PERSONAS: Persona[] = [
  {
    id: "expert",
    no: "01",
    name: "草莓种植专家",
    tagline: "农艺师视角 · 数据驱动 · 深度专业",
    icon: IconSeedling,
    structure: ["专业判断", "数据依据", "操作方案", "风险预判"],
    response: (
      <div className="space-y-5 text-[15px] leading-[1.75]">
        <div>
          <span className="text-[#1677ff] font-medium">【专业判断】</span>
          <span className="text-white/85">温度 32°C 已超出草莓适宜上限 25°C，处于热胁迫状态，需立即降温。</span>
        </div>
        <div>
          <span className="text-[#1677ff] font-medium">【数据依据】</span>
          <span className="text-white/85">草莓光合作用最适温 20-25°C，&gt;30°C 光合速率下降 40%，&gt;35°C 出现日烧。当前 32°C 持续将导致花粉活力下降、坐果率降低。</span>
        </div>
        <div>
          <span className="text-[#1677ff] font-medium">【操作方案】</span>
          <ul className="mt-2 space-y-1.5 text-white/75">
            <li>· 方案A（推荐）：开启风扇强制通风 + 外遮阳网 50% 遮光，预计 15 分钟降温 3-4°C</li>
            <li>· 方案B：仅开风扇通风，降温慢但能耗低</li>
            <li>· 方案C：喷雾降温，效果快但会增加灰霉病风险（当前湿度 75% 时不建议）</li>
          </ul>
        </div>
        <div>
          <span className="text-[#1677ff] font-medium">【风险预判】</span>
          <span className="text-white/85">若 1 小时内温度未降至 28°C 以下，今日开花坐果率预计下降 15-20%；持续 3 天 &gt;30°C 将触发休眠打破失败。</span>
        </div>
      </div>
    ),
  },
  {
    id: "friendly",
    no: "02",
    name: "新手友好向导",
    tagline: "通俗易懂 · 循序渐进 · 手把手教",
    icon: IconDegreeHat,
    structure: ["情况说明", "建议这样做", "怎么判断成功", "新手常见误区"],
    response: (
      <div className="space-y-5 text-[15px] leading-[1.8]">
        <p className="text-white/85">咱们先看看现在的情况——温度 32°C 有点偏高啦，草莓会觉得热，需要注意一下。</p>
        <div>
          <span className="text-[#1677ff] font-medium">建议这样做：</span>
          <ul className="mt-2 space-y-2 text-white/75">
            <li>· 第1步：打开风扇通风（因为草莓最舒服的温度是 20-25°C，现在太热了，风扇能帮它降温）</li>
            <li>· 第2步：如果有遮阳网，拉上一半（因为阳光直射会让温度更高，遮一半就像给草莓撑了把伞）</li>
            <li>· 第3步：等 15 分钟后再看看温度（因为降温需要一点时间，别着急）</li>
          </ul>
        </div>
        <div>
          <span className="text-[#1677ff] font-medium">怎么判断成功了：</span>
          <span className="text-white/75">看到温度降到 28°C 以下就 OK 啦，草莓会重新精神起来。</span>
        </div>
        <div>
          <span className="text-[#1677ff] font-medium">新手常见误区：</span>
          <span className="text-white/75">别急着喷雾降温哦——现在湿度已经不低了，喷雾会让灰霉病（一种让果子发霉的病）更容易发生。</span>
        </div>
      </div>
    ),
  },
  {
    id: "engineer",
    no: "03",
    name: "智慧农业工程师",
    tagline: "系统视角 · 设备联动 · 自动化优先",
    icon: IconSetting,
    structure: ["系统状态", "根因分析", "自动化方案", "执行链路"],
    response: (
      <div className="space-y-5 text-[15px] leading-[1.75]">
        <div>
          <span className="text-[#1677ff] font-medium">[系统状态]</span>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-[13px] text-white/75 border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="text-left py-2 pr-4 font-normal">指标</th>
                  <th className="text-left py-2 pr-4 font-normal">当前值</th>
                  <th className="text-left py-2 pr-4 font-normal">目标区间</th>
                  <th className="text-left py-2 font-normal">状态</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4">温度</td><td className="py-2 pr-4">32°C</td><td className="py-2 pr-4">20-25°C</td><td className="py-2 text-amber-400">⚠️ 越上限</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4">湿度</td><td className="py-2 pr-4">75%</td><td className="py-2 pr-4">60-80%</td><td className="py-2 text-emerald-400">✅</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">CO2</td><td className="py-2 pr-4">380ppm</td><td className="py-2 pr-4">350-1500ppm</td><td className="py-2 text-emerald-400">✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <span className="text-[#1677ff] font-medium">[根因分析]</span>
          <span className="text-white/85">温度越界（置信度 92%）：外遮阳网未展开 + 风扇继电器处于关闭状态。传感器数据可信。</span>
        </div>
        <div>
          <span className="text-[#1677ff] font-medium">[自动化方案]</span>
          <p className="text-white/75 mt-1">推荐设置自动化规则，避免人工干预：</p>
          <pre className="mt-2 p-3 bg-white/5 text-[12px] text-white/70 overflow-x-auto"><code>{`{
  "trigger": "temperature > 28",
  "condition": "humidity < 70",
  "actions": [
    { "device": 6, "action": "relay_on" },
    { "device": "遮阳网", "action": "extend_50%" }
  ]
}`}</code></pre>
        </div>
        <div>
          <span className="text-[#1677ff] font-medium">[执行链路]</span>
          <span className="text-white/85">传感器 → 规则引擎评估 → 风扇(ON) + 遮阳网 → 温度反馈闭环（每 60s 复查）</span>
        </div>
      </div>
    ),
  },
];

export function Personas() {
  const [active, setActive] = useState<PersonaId>("expert");
  const current = PERSONAS.find((p) => p.id === active)!;

  return (
    <section className="relative bg-[#08080A] overflow-hidden">
      {/* 顶部章节标记（克制版）*/}
      <div className="pt-32">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px] tracking-[0.25em] text-white/40 uppercase">
              03 / 三重人格
            </span>
            <span className="block w-12 h-px bg-white/10" />
            <span className="font-mono text-[11px] tracking-[0.25em] text-white/40 uppercase">
              Three Minds
            </span>
          </div>
          <span className="font-mono text-[11px] tracking-[0.2em] text-white/30 uppercase hidden sm:inline">
            same question · three structures
          </span>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-20 sm:py-28">
        {/* 标题区 —— 左对齐破坏网格 */}
        <div className="grid lg:grid-cols-12 gap-8 mb-16 sm:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.9, ease: EASE as any }}
            className="lg:col-span-8"
          >
            <span className="block font-mono text-[12px] tracking-[0.3em] text-[#1677ff] uppercase mb-6">
              一个助理，三种性格
            </span>
            <h2
              className="font-alimama font-medium text-white leading-[0.95]"
              style={{ fontSize: "clamp(36px, 6vw, 96px)", letterSpacing: "-0.045em" }}
            >
              同一个问题，
              <br />
              三种<span style={{ color: "#1677ff" }}>思考方式</span>。
            </h2>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-4 lg:col-start-9 self-end text-[15px] sm:text-[16px] text-white/50 leading-[1.7] max-w-[360px]"
          >
            莓小智会根据你切换的角色，给出结构完全不同的回答——不是语气的变化，而是思考方式的切换。
          </motion.p>
        </div>

        {/* ============ 对话预览：真实聊天界面 ============ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.8, ease: EASE as any }}
          className="grid lg:grid-cols-12 gap-px bg-white/10 border border-white/10"
        >
          {/* ---- 左：人格切换侧栏（垂直）---- */}
          <aside className="lg:col-span-4 bg-[#08080A] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <span className="font-mono text-[11px] tracking-[0.25em] text-white/40 uppercase">
                选择人格
              </span>
              <span className="font-mono text-[10px] tracking-[0.2em] text-white/25 uppercase">
                3 / 3
              </span>
            </div>
            <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible">
              {PERSONAS.map((p) => {
                const isActive = p.id === active;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActive(p.id)}
                    data-cursor="hover"
                    className={`group relative flex-shrink-0 lg:flex-shrink text-left w-56 lg:w-full p-5 border-b border-white/10 transition-colors duration-300 ${
                      isActive ? "bg-white/[0.04]" : "bg-transparent hover:bg-white/[0.02]"
                    }`}
                  >
                    {/* 选中态：左边缘竖线 */}
                    <span
                      className={`absolute left-0 top-0 bottom-0 w-[2px] bg-[#1677ff] transition-transform duration-300 origin-top ${
                        isActive ? "scale-y-100" : "scale-y-0"
                      }`}
                    />
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="font-alimama font-medium leading-none transition-colors duration-300"
                        style={{
                          fontSize: "32px",
                          letterSpacing: "-0.05em",
                          color: isActive ? "#1677ff" : "rgba(255,255,255,0.18)",
                        }}
                      >
                        {p.no}
                      </span>
                      <p.icon
                        className={`w-4 h-4 transition-colors duration-300 ${
                          isActive ? "text-[#1677ff]" : "text-white/30"
                        }`}
                        strokeWidth={1.5}
                      />
                    </div>
                    <div
                      className={`text-[15px] font-alimama font-medium transition-colors duration-300 ${
                        isActive ? "text-white" : "text-white/60"
                      }`}
                    >
                      {p.name}
                    </div>
                    <div className="text-[11px] text-white/35 leading-relaxed mt-0.5 hidden lg:block">
                      {p.tagline}
                    </div>
                  </button>
                );
              })}
            </div>
            {/* 侧栏落款 */}
            <div className="mt-auto px-5 py-4 border-t border-white/10 hidden lg:flex items-center gap-2">
              <span className="block w-1.5 h-1.5 bg-[#1677ff] animate-pulse" />
              <span className="font-mono text-[10px] tracking-[0.2em] text-white/30 uppercase">
                berry · ai · live
              </span>
            </div>
          </aside>

          {/* ---- 右：对话线程 ---- */}
          <div className="lg:col-span-8 bg-[#08080A] flex flex-col min-h-[560px]">
            {/* 对话头 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 border border-[#1677ff]/40 bg-[#1677ff]/10 flex items-center justify-center">
                  <current.icon className="w-4 h-4 text-[#1677ff]" strokeWidth={1.75} />
                </div>
                <div className="leading-tight">
                  <div className="text-[13px] text-white font-medium">莓小智</div>
                  <div className="font-mono text-[10px] tracking-[0.15em] text-white/35 uppercase">
                    {current.name}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-white/30 uppercase">
                <span className="block w-1.5 h-1.5 bg-emerald-400" />
                online
              </div>
            </div>

            {/* 消息流 */}
            <div className="flex-1 px-5 py-6 space-y-6 overflow-hidden">
              {/* 用户消息 —— 右对齐白底气泡，直角 */}
              <div className="flex justify-end">
                <div className="max-w-[78%]">
                  <div className="flex items-center justify-end gap-2 mb-1.5">
                    <span className="font-mono text-[10px] tracking-[0.15em] text-white/30 uppercase">
                      14:32
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.2em] text-white/45 uppercase">
                      你
                    </span>
                  </div>
                  <div className="bg-white text-black px-4 py-3 text-[15px] leading-[1.55]">
                    {QUESTION}
                  </div>
                </div>
              </div>

              {/* AI 消息 —— 左对齐边框气泡，直角 */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, clipPath: "inset(0 0 0 100%)" }}
                  animate={{ opacity: 1, clipPath: "inset(0 0 0 0%)" }}
                  exit={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
                  transition={{ duration: 0.55, ease: EASE as any }}
                  className="flex justify-start"
                >
                  <div className="max-w-[88%]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-[10px] tracking-[0.2em] text-[#1677ff] uppercase">
                        莓小智
                      </span>
                      <span className="font-mono text-[10px] tracking-[0.15em] text-white/30 uppercase">
                        14:32
                      </span>
                    </div>
                    {/* 结构标签链 —— 等宽 */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2.5">
                      {current.structure.map((s, i) => (
                        <span
                          key={s}
                          className="font-mono text-[10px] tracking-[0.15em] text-white/40 uppercase"
                        >
                          {String(i + 1).padStart(2, "0")} · {s}
                        </span>
                      ))}
                    </div>
                    <div className="border border-white/12 bg-white/[0.02] px-4 py-4 text-white/85">
                      {current.response}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* 输入条 —— 装饰性，直角 */}
            <div className="border-t border-white/10 px-5 py-3 flex items-center gap-3">
              <span className="font-mono text-[11px] text-white/25 flex-1 truncate">
                再问一个问题…
              </span>
              <span className="font-mono text-[10px] tracking-[0.15em] text-white/25 uppercase border border-white/10 px-2 py-1">
                ↵ send
              </span>
            </div>
          </div>
        </motion.div>

        {/* 切换提示 */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center font-mono text-[11px] tracking-[0.25em] text-white/30 uppercase mt-10"
        >
          ← 切换左侧人格，观察回答结构的根本差异
        </motion.p>
      </div>
    </section>
  );
}
