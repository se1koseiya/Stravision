"use client";

import { motion } from "framer-motion";
import { CONTAINER, L, L_MIX, SHADOW, fadeUp } from "./shared";

/* ------------------------------------------------------------
   口碑区 —— 对齐 loomy.xunfei.cn 的 `UserVoicesSection`（浅色实测值）
     section   padding 112px 0 104px，底色 #EDFDFF
     stage     1280×736，flex 纵列居中；圆盘 624×624 距顶 19px
     圆盘      r 50%，rgba(255,255,255,.48)，双层阴影（外投影 + 内白描边）
     头像      60×60 圆形、白底 + 3px 白描边 + 投影，绕圆盘按实测极坐标散布
     引言卡    238px 宽，15px/600/24.75px #383838，下方姓名 12px/700 + 身份 12px/400
     圆心      「种植者眼中的」14px/800/+1.68px #4AAF7A ＋ 「莓界」56px/700
     底部胶囊  514×72，padding 8.8/28/8.8/12，r 999，#FCFFFF + 阴影，
               6 个 48px 头像 margin-left -8.8px 叠放
   ------------------------------------------------------------ */

const AVATARS = [3, 5, 1, 7, 2, 8];

/** 实测极坐标（相对圆盘圆心，单位 px，1440 视口下） */
type Voice = {
  name: string;
  meta: string;
  quote: string;
  dx: number;
  dy: number;
  avatar: string;
};

const VOICES: Voice[] = [
  {
    name: "刘建国",
    meta: "规模化农场 · 12 座大棚",
    quote: "十个棚一个早上就看完了，越限的那个自己会跳出来。",
    dx: -469,
    dy: -253,
    avatar: `/images/user_default_avatar/avatar${AVATARS[0]}.png`,
  },
  {
    name: "陈晓芸",
    meta: "家庭莓园 · 精品草莓",
    quote: "以前全靠记性，现在打开手机就知道该不该通风了。",
    dx: 267,
    dy: -209,
    avatar: `/images/user_default_avatar/avatar${AVATARS[1]}.png`,
  },
  {
    name: "王海涛",
    meta: "合作社 · 技术负责",
    quote: "把老师傅的经验写成规则，新人照着跑也不会出错。",
    dx: -584,
    dy: -17,
    avatar: `/images/user_default_avatar/avatar${AVATARS[2]}.png`,
  },
  {
    name: "李思远",
    meta: "新农人 · 内容带货",
    quote: "生长曲线直接截图发出去，比说一百句都有说服力。",
    dx: 305,
    dy: -54,
    avatar: `/images/user_default_avatar/avatar${AVATARS[3]}.png`,
  },
  {
    name: "张桂芳",
    meta: "家庭莓园 · 三口人打理",
    quote: "半夜温度掉下去，手机先响，不用再爬起来守棚。",
    dx: -443,
    dy: 224,
    avatar: `/images/user_default_avatar/avatar${AVATARS[4]}.png`,
  },
  {
    name: "周文博",
    meta: "农业技术员 · 田间服务",
    quote: "每茬的积温和糖度都留着，明年配方就有依据了。",
    dx: 203,
    dy: 180,
    avatar: `/images/user_default_avatar/avatar${AVATARS[5]}.png`,
  },
];

function VoiceCard({ v }: { v: Voice }) {
  return (
    /* 锚点 = 头像中心（与 Loomy 的极坐标一致）。
       卡片左缘 = 锚点 - 43px、垂直居中（Loomy 实测 352 宽卡片的 left = cx - 43）。 */
    <div
      className="absolute left-1/2 top-1/2 size-0"
      style={{ transform: `translate(${v.dx}px, ${v.dy}px)` }}
    >
      <div
        className="absolute top-0 flex w-[22rem] -translate-y-1/2 items-center gap-4 rounded-full"
        style={{
          left: "-2.6875rem",
          background: L.nearWhite,
          border: "1px solid var(--lg-window-border)",
          boxShadow: "0 21.6px 40px rgba(34,34,34,0.1)",
          padding: "12px 24px 12px 12px",
        }}
      >
        {/* ⚠️ 必须 max-w-none：卡片虽不是 size-0，但 shrink-0 + 固定 60px 才不会被
            预检的 `img { max-width:100% }` 在 flex 里压扁。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={v.avatar}
          alt={v.name}
          className="size-[60px] max-w-none shrink-0 rounded-full object-cover"
          style={{ background: L.surface, border: `3px solid ${L.surface}` }}
        />
        <div className="min-w-0 flex-1">
          <blockquote
            className="text-[0.9375rem] font-semibold leading-[1.65]"
            style={{ color: L.desc }}
          >
            {v.quote}
          </blockquote>
          <figcaption className="mt-1.5 flex items-center gap-2">
            <strong className="text-[0.75rem] font-bold" style={{ color: L.ink }}>
              {v.name}
            </strong>
            <span className="text-[0.75rem]" style={{ color: L.muted }}>
              {v.meta}
            </span>
          </figcaption>
        </div>
      </div>
    </div>
  );
}

/** 圆盘内的同心圆环（Loomy 实测 624 → 449 → 275 → 100，等差 ~175px） */
function Rings() {
  const layers = [449, 275, 100];
  return (
    <>
      {layers.map((size) => (
        <span
          key={size}
          aria-hidden
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: size,
            height: size,
            background: "var(--lg-disc-ring)",
            border: "1px solid var(--lg-disc-ring-border)",
            boxShadow: "0 24px 48px rgba(34,34,34,0.05)",
          }}
        />
      ))}
    </>
  );
}

/** 圆环上的小圆点（Loomy 用旋转 orbit 容器带这些点，这里做静态等价） */
function RingDots() {
  const dots = [
    { size: 9, color: "#F5A623", radius: 312, angle: 208 },
    { size: 7, color: "#4A90E2", radius: 225, angle: -38 },
    { size: 8, color: "#34C77B", radius: 312, angle: 152 },
    { size: 6, color: "#F5A623", radius: 138, angle: 41 },
  ];
  return (
    <>
      {dots.map((d, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute left-1/2 top-1/2 size-0"
          style={{
            transform: `translate(${Math.cos((d.angle * Math.PI) / 180) * d.radius}px, ${
              Math.sin((d.angle * Math.PI) / 180) * d.radius
            }px)`,
          }}
        >
          <span
            className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ width: d.size, height: d.size, background: d.color }}
          />
        </span>
      ))}
    </>
  );
}

export function Voices() {
  return (
    <section
      className="relative z-[2] overflow-hidden pb-26 pt-28"
      style={{ background: L_MIX.voices }}
    >
      <div className={CONTAINER}>
        {/* ---------- lg 以上：圆盘轨道 ---------- */}
        <div className="hidden lg:flex lg:h-[46rem] lg:flex-col lg:items-center lg:pt-[1.2rem]">
          <div
            className="relative size-[39rem] shrink-0 rounded-full"
            style={{ background: "var(--lg-disc)", boxShadow: SHADOW.disc }}
          >
            {/* 同心圆环（在最底层） */}
            <Rings />
            <RingDots />

            {/* 圆心文案 */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <p
                className="mb-2 text-[0.875rem] font-extrabold leading-[1.4]"
                style={{ color: L.greenInk, letterSpacing: "0.12em" }}
              >
                种植者眼中的
              </p>
              <h2
                className="m-0"
                style={{ color: L.ink, fontSize: "3.5rem", fontWeight: 700, lineHeight: 1 }}
              >
                莓界
              </h2>
            </div>

            {VOICES.map((v) => (
              <VoiceCard key={v.name} v={v} />
            ))}
          </div>

          {/* 底部胶囊 */}
          <div
            className="mt-[1.3rem] flex min-h-[4.5rem] shrink-0 items-center gap-4 rounded-full"
            style={{
              padding: "0.55rem 1.75rem 0.55rem 0.75rem",
              background: L.nearWhite,
              boxShadow: SHADOW.audience,
            }}
          >
            <span className="flex items-center">
              {VOICES.map((v, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={v.name}
                  src={v.avatar}
                  alt=""
                  className="size-12 rounded-full object-cover"
                  style={{
                    background: L.surface,
                    border: `2px solid ${L.surface}`,
                    marginLeft: i === 0 ? 0 : "-0.55rem",
                  }}
                />
              ))}
            </span>
            <span className="whitespace-nowrap text-[0.8125rem] font-semibold" style={{ color: L.muted }}>
              还有更多种植者正在与 莓界 一起工作
            </span>
          </div>
        </div>

        {/* ---------- lg 以下：卡片网格降级 ---------- */}
        <div className="lg:hidden">
          <motion.div {...fadeUp()} className="text-center">
            <p
              className="mb-2 text-[0.875rem] font-extrabold"
              style={{ color: L.greenInk, letterSpacing: "0.12em" }}
            >
              种植者眼中的
            </p>
            <h2 className="m-0" style={{ color: L.ink, fontSize: "2.5rem", fontWeight: 700, lineHeight: 1.1 }}>
              莓界
            </h2>
          </motion.div>

          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {VOICES.map((v, i) => (
              <motion.figure
                key={v.name}
                {...fadeUp(0.05 * i)}
                className="m-0 rounded-2xl p-5"
                style={{ background: "var(--lg-ghost)" }}
              >
                <blockquote className="text-[0.9375rem] font-semibold leading-[1.7]" style={{ color: L.desc }}>
                  {v.quote}
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.avatar}
                    alt={v.name}
                    className="size-10 rounded-full object-cover"
                    style={{ background: L.surface, border: `2px solid ${L.surface}` }}
                  />
                  <span className="flex flex-col">
                    <strong className="text-[0.8125rem] font-bold" style={{ color: L.ink }}>
                      {v.name}
                    </strong>
                    <span className="text-[0.75rem]" style={{ color: L.muted }}>
                      {v.meta}
                    </span>
                  </span>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
