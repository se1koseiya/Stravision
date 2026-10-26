"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Avatar, Button, Card, Col, Flex, Row, Tag, Typography } from "antd";
import { IconDownload, IconEarth, IconMicrophone, IconMonitor, IconPhone, IconPlayOne, IconRight } from "@/components/icon";

const { Title, Text } = Typography;

/* ------------------------------------------------------------
   「随时随地自动化你的任务」绿底三卡 + TRY 莓界大横幅
   （参考 Accio Work 平台区与结尾横幅）—— Ant Design 版
   ------------------------------------------------------------ */

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
});

const PLATFORMS = [
  {
    icon: IconMonitor,
    blob: "#B9F0D6",
    title: "网页控制台",
    sub: "全功能的核心场景",
    desc: "数字孪生、设备控制、自动化规则一网打尽。打开浏览器即可使用，无需安装任何客户端。",
    cta: "进入控制台",
    href: "/dashboard",
    ctaIcon: IconEarth,
  },
  {
    icon: IconPhone,
    blob: "#CDE3FB",
    title: "移动端应用",
    sub: "随身携带的大棚",
    desc: "随时掌握环境进度。当智能体到达决策节点或出现告警时，你会收到推送通知，通勤路上也能推进农事。",
    cta: "下载移动应用",
    href: "/profile",
    ctaIcon: IconDownload,
  },
  {
    icon: IconMicrophone,
    blob: "#F6D8E8",
    title: "语音助理",
    sub: "动口不动手的农事",
    desc: "在大棚里腾不出手？直接开口就行——查温度、开水泵、问病情，莓界实时响应你的每一句话。",
    cta: "体验语音助理",
    href: "/ai-assistant",
    ctaIcon: IconMicrophone,
  },
];

const AVATARS = ["🧑‍🌾", "👩‍🌾", "👨‍🔬", "🧑‍💻", "👩‍💼", "🧑‍🎓", "👨‍🌾"];

export function Platforms() {
  return (
    <>
      {/* 绿底平台区 */}
      <section
        className="py-24 md:py-28"
        style={{
          background: "linear-gradient(180deg, #7FE7BC 0%, #A9F2D4 100%)",
        }}
      >
        <div className="mx-auto max-w-[1400px] px-6">
          <motion.div {...fadeUp(0)}>
            <Title
              level={2}
              className="!mb-0 !text-zinc-900"
              style={{
                fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                fontWeight: 900,
                letterSpacing: "-0.02em",
              }}
            >
              随时随地，自动化你的农事任务
            </Title>
          </motion.div>

          <Row gutter={[20, 20]} className="mt-12 !mx-0">
            {PLATFORMS.map((pl, i) => (
              <Col xs={24} md={8} key={pl.title}>
                <motion.div {...fadeUp(0.08 * i)} className="h-full">
                  <Card
                    hoverable
                    variant="borderless"
                    className="h-full !bg-white/[0.92] shadow-[0_12px_32px_-12px_rgba(6,78,59,0.25)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:!bg-white"
                    styles={{ body: { padding: 28, display: "flex", flexDirection: "column", height: "100%" } }}
                  >
                    <span
                      className="flex size-12 items-center justify-center text-[20px] text-zinc-800"
                      style={{
                        borderRadius: "42% 58% 60% 40% / 48% 42% 58% 52%",
                        background: pl.blob,
                      }}
                    >
                      <pl.icon />
                    </span>
                    <Title
                      level={3}
                      className="mt-5 !mb-0 !text-zinc-900"
                      style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em" }}
                    >
                      {pl.title}
                    </Title>
                    <Text strong className="mt-1 !text-[13px] !text-emerald-600">
                      {pl.sub}
                    </Text>
                    <Text
                      type="secondary"
                      className="mt-3 flex-1 !text-[14px] !leading-relaxed"
                    >
                      {pl.desc}
                    </Text>
                    <Link href={pl.href} className="mt-6">
                      <Button
                        shape="round"
                        size="large"
                        block
                        icon={<pl.ctaIcon className="!text-emerald-600" />}
                        style={{
                          background: "#ffffff",
                          color: "#18181b",
                          fontWeight: 600,
                          height: 40,
                          fontSize: 14,
                          boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
                        }}
                      >
                        {pl.cta}
                      </Button>
                    </Link>
                  </Card>
                </motion.div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* 了解莓界 */}
      <section className="bg-white py-24 md:py-28">
        <div className="mx-auto max-w-[1400px] px-6">
          <motion.div {...fadeUp(0)}>
            <Title
              level={2}
              className="!mb-0 !text-zinc-900"
              style={{
                fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                fontWeight: 900,
                letterSpacing: "-0.02em",
              }}
            >
              了解莓界如何驱动真实增长
            </Title>
          </motion.div>

          {/* TRY 大横幅 */}
          <motion.div
            {...fadeUp(0.1)}
            className="mt-10 overflow-hidden rounded-[32px] p-8 md:p-14"
            style={{
              background:
                "linear-gradient(120deg, #FFFFFF 0%, #DFF9EB 38%, #8FEDC3 74%, #5ADBA4 100%)",
            }}
          >
            <Row gutter={[40, 40]} align="middle">
              <Col xs={24} lg={10}>
                <div
                  className="font-black leading-[1.05] tracking-tight text-zinc-900"
                  style={{ fontSize: "clamp(2.6rem, 5.5vw, 4.4rem)" }}
                >
                  TRY
                  <br />
                  莓界 Berry Realm
                </div>
                <Text
                  className="mt-4 block !font-medium !text-zinc-700"
                  style={{ fontSize: "clamp(1.05rem, 2vw, 1.4rem)" }}
                >
                  Your agentic farm team
                </Text>
                <Tag
                  color="cyan"
                  className="mt-8 !rounded-full !px-4 !py-1.5 !text-[13px] !font-bold"
                >
                  stravision.site
                </Tag>
              </Col>

              {/* 视频播放器 mock */}
              <Col xs={24} lg={14}>
                <Card
                  variant="borderless"
                  className="overflow-hidden shadow-[0_24px_64px_-16px_rgba(6,78,59,0.35)]"
                  styles={{
                    body: { padding: 0 },
                    header: { padding: "0 16px", height: 36, lineHeight: "36px", borderBottom: "1px solid rgba(15,23,42,0.05)", background: "#fafafa" },
                  }}
                  title={
                    <Flex gap={6} align="center">
                      <span className="size-2.5 rounded-full bg-[#FF5F57]" />
                      <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
                      <span className="size-2.5 rounded-full bg-[#28C840]" />
                    </Flex>
                  }
                >
                  <div className="relative flex h-[240px] flex-col items-center justify-center bg-gradient-to-b from-white to-emerald-50/60 md:h-[280px]">
                    <Flex
                      align="center"
                      justify="center"
                      className="size-11 rounded-2xl text-[20px] shadow-sm shadow-emerald-600/30"
                      style={{ background: "linear-gradient(135deg, #34d399, #059669)" }}
                    >
                      🍓
                    </Flex>
                    <Text strong className="mt-4 !text-[18px] !tracking-tight !text-zinc-900">
                      今天想为大棚做点什么？
                    </Text>
                    <Flex
                      align="center"
                      gap={8}
                      className="mt-4 w-[78%] rounded-xl border border-zinc-900/[0.08] bg-white px-3.5 py-2.5 shadow-sm"
                    >
                      <Text type="secondary" className="!text-[12px]">
                        随便问点什么…（@ 引用文件）
                      </Text>
                      <Flex
                        align="center"
                        justify="center"
                        className="ml-auto size-6 rounded-full bg-emerald-600"
                      >
                        <IconRight className="text-[11px] text-white" />
                      </Flex>
                    </Flex>
                    {/* 播放按钮 */}
                    <button
                      className="group absolute inset-0 flex items-center justify-center"
                      aria-label="播放演示"
                    >
                      <span className="flex size-14 items-center justify-center rounded-full bg-zinc-900/80 backdrop-blur transition-all group-hover:scale-110 group-hover:bg-zinc-900">
                        <IconPlayOne className="!text-[20px] text-white" />
                      </span>
                    </button>
                  </div>
                  {/* 头像行 */}
                  <Flex
                    align="center"
                    gap={12}
                    className="border-t border-zinc-900/[0.05] bg-white px-5 py-3.5"
                  >
                    <Avatar size={32} className="!border-2 !border-emerald-400">
                      @
                    </Avatar>
                    <Avatar.Group
                      maxCount={AVATARS.length}
                      size={32}
                      maxStyle={{ color: "#f56a00", backgroundColor: "#fde3cf" }}
                    >
                      {AVATARS.map((a, i) => (
                        <Avatar key={i} size={32} className="!bg-zinc-100 !text-[14px]">
                          {a}
                        </Avatar>
                      ))}
                    </Avatar.Group>
                    <Text
                      type="secondary"
                      className="ml-auto hidden !text-[12px] !font-medium sm:block"
                    >
                      一个 @，召唤整支农事团队
                    </Text>
                  </Flex>
                </Card>
              </Col>
            </Row>
          </motion.div>
        </div>
      </section>
    </>
  );
}
