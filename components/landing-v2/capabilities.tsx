"use client";

import { motion } from "framer-motion";
import { WobblyRule } from "./doodles";

/* ============================================================
   WORK —— 它每天做的事 · 编辑式清单
   · 无卡片：手绘分隔线 + 编号 + 衬线标题
   · 右侧手写批注
   ============================================================ */

const EASE = [0.16, 1, 0.3, 1] as const;
const SERIF = 'Georgia, "Songti SC", "STSong", "SimSun", serif';
const KAI = '"Kaiti SC", "STKaiti", "KaiTi", "楷体", serif';

const ITEMS = [
  {
    no: "壹",
    title: "对话式农事伙伴",
    desc: "基于 DeepSeek 大模型的助手，理解大棚上下文。你问「现在要不要通风」，它用温度、湿度和明天的天气一起回答你。",
    note: "真的会讲道理",
  },
  {
    no: "贰",
    title: "环境实时监测",
    desc: "MQTT 传感器网络秒级上云：温湿度、光照、土壤墒情。曲线一有异常，告警先到你手机。",
    note: "比人醒得早",
  },
  {
    no: "叁",
    title: "摄像头巡棚",
    desc: "ffmpeg / HLS 低延迟推流，AI 定期沿垄巡检。病斑与缺素，在肉眼察觉之前就被标记出来。",
    note: "眼神很好",
  },
  {
    no: "肆",
    title: "设备远程控制",
    desc: "水泵、风机、补光灯，一触即达。自动化规则按阈值自己执行，每一次动作都写进日志。",
    note: "手脚也勤快",
  },
  {
    no: "伍",
    title: "多人知识协作",
    desc: "Yjs CRDT 实时共编农事档案，冲突自动合并，版本随时回溯。一家人的经验，写进同一本账。",
    note: "不抢笔",
  },
  {
    no: "陆",
    title: "权限与审计",
    desc: "owner / admin / editor / viewer 四级角色，十八类操作日志逐条可追。谁动过什么，一查便知。",
    note: "账目分明",
  },
];

export function Capabilities() {
  return (
    <section id="work" className="relative bg-[#F4F4F5] py-28 md:py-36">
      <div className="mx-auto max-w-[1100px] px-6 md:px-10">
        <div className="mb-16">
          <p
            className="mb-5 flex items-baseline gap-3 text-[14px] text-[#18181B]/50"
            style={{ fontFamily: KAI }}
          >
            <span className="text-[#A63A3D]">它做的事</span>
            <span>·</span>
            <span>六件，不多不少</span>
          </p>
          <h2
            className="max-w-[24ch] text-[clamp(1.8rem,3.4vw,2.7rem)] leading-[1.4] tracking-tight text-[#18181B]"
            style={{ fontFamily: SERIF }}
          >
            监测、判断、执行、记录——
            <br />
            同一个系统里的<span className="italic text-[#A63A3D]">四次呼吸</span>。
          </h2>
        </div>

        <div>
          {ITEMS.map((item, i) => (
            <motion.div
              key={item.no}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-8%" }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.04 * i }}
            >
              {i > 0 && <WobblyRule className="h-3 w-full" />}
              <div className="group grid gap-3 py-8 transition-colors duration-300 md:grid-cols-[64px_1fr_auto] md:gap-8 md:py-9">
                <span
                  className="text-[14px] text-[#A63A3D]/70"
                  style={{ fontFamily: KAI }}
                >
                  {item.no}
                </span>
                <div>
                  <h3
                    className="text-[1.35rem] tracking-tight text-[#18181B] transition-colors duration-300 group-hover:text-[#A63A3D] md:text-[1.5rem]"
                    style={{ fontFamily: SERIF }}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-2.5 max-w-[58ch] text-[14px] leading-[1.85] text-[#18181B]/60">
                    {item.desc}
                  </p>
                </div>
                <span
                  className="hidden self-start whitespace-nowrap text-[13px] text-[#18181B]/35 transition-colors duration-300 group-hover:text-[#A63A3D]/70 md:block"
                  style={{ fontFamily: KAI }}
                >
                  —— {item.note}
                </span>
              </div>
            </motion.div>
          ))}
          <WobblyRule className="h-3 w-full" />
        </div>
      </div>
    </section>
  );
}
