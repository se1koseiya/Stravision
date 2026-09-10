"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Clock } from "lucide-react";
import { CONTAINER, PANEL_TITLE, SECTION_TITLE, fadeUp } from "./shared";

/* ------------------------------------------------------------
   平台区 —— 对齐 loomy.xunfei.cn 的 `PlatformSection`（浅色实测值）
     section     padding 112px 0 128px，底色 #7DE9AC
     heading     max-width 640px，h2 45px/700/1.3333/+0.7515px
     grid        4 列 × 308px，gap 16px，上边距 56px
     card        308×432，padding 32px，圆角 28px，底色 #E6FDEE
     artwork     112×112（在流内，非绝对定位）
     copy        上内边距 46px
     h3          31.68px/700/1.25/+0.3168px
     eyebrow     15.2px/700/22.8px，上边距 10.4px，色 #444444
     desc        15px/400/26.25px，上下外边距 24 / 32，色 #696969
     action      244×56 满宽胶囊，白底墨字 16px/700，gap 10.4px + 18px 图标
                 不可用态同款胶囊 opacity .62
   ------------------------------------------------------------ */

type Platform = {
  img: string;
  title: string;
  sub: string;
  desc: string;
  cta: string;
  href?: string;
  soon?: boolean;
};

const PLATFORMS: Platform[] = [
  {
    img: "/web/desktop.png",
    title: "网页控制台",
    sub: "全功能的核心场景",
    desc: "数字孪生、设备控制与自动化规则都在这里，打开浏览器即用。",
    cta: "进入控制台",
    href: "/dashboard",
  },
  {
    img: "/web/mobile.png",
    title: "移动端应用",
    sub: "随身携带的大棚",
    desc: "告警与待办直接推到手机上，通勤路上也能推进农事。",
    cta: "打开移动端",
    href: "/profile",
  },
  {
    img: "/web/xiaochengxu.png",
    title: "微信小程序",
    sub: "微信里的轻量入口",
    desc: "在微信里看进度、收通知，不用来回切换应用。",
    cta: "即将到来",
    soon: true,
  },
  {
    img: "/web/web.png",
    title: "监控大屏",
    sub: "值班室里的一整面墙",
    desc: "画面与环境数据投到大屏，值班时一眼看全所有棚区。",
    cta: "查看监控",
    href: "/monitor",
  },
];

export function Platforms() {
  return (
    <section
      className="relative z-[2] overflow-hidden bg-[#7DE9AC] pb-32 pt-28 dark:bg-[#53BD83]"
    >
      {/* 装饰空心圆（Loomy PlatformSection 的伪元素） */}
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-full border"
        style={{
          width: "25rem",
          aspectRatio: "1",
          bottom: "-14rem",
          left: "-8rem",
          borderColor: "color-mix(in srgb, var(--lg-ink) 10%, transparent)",
        }}
      />

      <div className={`relative ${CONTAINER}`}>
        <motion.h2 {...fadeUp()} className="max-w-[40rem]" style={SECTION_TITLE}>
          随时随地
          <br />
          莓界 都在陪你工作
        </motion.h2>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PLATFORMS.map((p, i) => (
            <motion.article
              key={p.title}
              {...fadeUp(0.07 * i)}
              className="flex min-h-[27rem] flex-col rounded-[1.75rem] p-8 transition-[transform,box-shadow] duration-200 hover:-translate-y-1.5 hover:shadow-[0_1.5rem_3.5rem_rgba(34,34,34,0.14)]"
              style={{ background: "#E6FDEE", color: "#222222" }}
            >
              {/* 美术资源：流内 112×112（Loomy PlatformSection_artwork） */}
              <div className="flex size-28 shrink-0 items-center justify-center">
                <Image
                  src={p.img}
                  alt={p.title}
                  width={224}
                  height={224}
                  sizes="112px"
                  className="size-full object-contain"
                />
              </div>

              <div className="flex flex-1 flex-col pt-[2.875rem]">
                <div className="flex min-w-0 items-center gap-2.5">
                  <h3 className="m-0" style={{ ...PANEL_TITLE, color: "#222222" }}>
                    {p.title}
                  </h3>
                  {p.soon && (
                    <span
                      className="inline-flex h-6 shrink-0 items-center rounded-full px-2 text-[11px] font-extrabold leading-none"
                      style={{
                        border: "1px solid rgba(34,34,34,0.24)",
                        background: "rgba(255,255,255,0.72)",
                        color: "#222222",
                      }}
                    >
                      即将到来
                    </span>
                  )}
                </div>

                <p
                  className="mt-[0.65rem] text-[0.95rem] font-bold leading-[1.5]"
                  style={{ color: "#444444" }}
                >
                  {p.sub}
                </p>

                <p className="mb-8 mt-6 text-[0.9375rem] leading-[1.75]" style={{ color: "#696969" }}>
                  {p.desc}
                </p>

                {p.soon ? (
                  <span
                    aria-disabled
                    className="mt-auto inline-flex min-h-[3.5rem] w-full cursor-default items-center justify-center gap-[0.65rem] rounded-full text-[1rem] font-bold"
                    style={{ background: "#FFFFFF", color: "#222222", opacity: 0.62 }}
                  >
                    <Clock className="size-[1.15rem]" />
                    {p.cta}
                  </span>
                ) : (
                  <Link
                    href={p.href as string}
                    className="group mt-auto inline-flex min-h-[3.5rem] w-full items-center justify-center gap-[0.65rem] rounded-full text-[1rem] font-bold transition-[background-color,color,transform] duration-200 hover:-translate-y-0.5"
                    style={{ background: "#FFFFFF", color: "#222222" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#222222";
                      e.currentTarget.style.color = "#FFFFFF";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#FFFFFF";
                      e.currentTarget.style.color = "#222222";
                    }}
                  >
                    <ArrowUpRight className="size-[1.15rem]" />
                    {p.cta}
                  </Link>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
