"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button, Col, Flex, Row, Typography } from "antd";
import { IconRight } from "@/components/icon";

const { Title, Text } = Typography;

const HeroChat = dynamic(
  () => import("@/components/landing-v3/hero-chat").then((m) => m.HeroChat),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[520px] items-center justify-center rounded-2xl bg-white shadow-[0_32px_80px_-20px_rgba(15,23,42,0.28)] ring-1 ring-zinc-900/[0.06]">
        <div className="size-6 animate-spin rounded-full border-2 border-emerald-600/15 border-t-emerald-600/70" />
      </div>
    ),
  }
);

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
});

/* 纵向滚动的技能词：无缝循环（末尾补一项首词，滚到顶后瞬间归零） */
const PHRASES = ["做种植分析", "做设备调控", "做种植报告", "做自动化巡检", "做知识沉淀"];

function RotatingText() {
  const [idx, setIdx] = useState(0);
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => i + 1), 2200);
    return () => clearInterval(t);
  }, []);

  // 滚到复制的首词后，关掉过渡瞬间归位
  useEffect(() => {
    if (idx === PHRASES.length) {
      const t = setTimeout(() => {
        setInstant(true);
        setIdx(0);
      }, 560);
      return () => clearTimeout(t);
    }
    if (instant) {
      const t = setTimeout(() => setInstant(false), 60);
      return () => clearTimeout(t);
    }
  }, [idx, instant]);

  const items = [...PHRASES, PHRASES[0]];

  return (
    <span
      className="relative inline-block h-[1.22em] overflow-hidden align-bottom"
      style={{
        maskImage:
          "linear-gradient(180deg, transparent 0%, black 22%, black 78%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(180deg, transparent 0%, black 22%, black 78%, transparent 100%)",
      }}
    >
      <span
        className="block !text-emerald-600 transition-all"
        style={{
          transform: `translateY(-${idx * 1.22}em)`,
          transition: instant
            ? "none"
            : "transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {items.map((p, i) => (
          <span key={i} className="block h-[1.22em] leading-[1.22]">
            {p}
          </span>
        ))}
      </span>
    </span>
  );
}

export function Hero() {
  return (
    <section
      className="relative overflow-hidden pt-[72px]"
      style={{
        background:
          "linear-gradient(180deg, #C8F4DE 0%, #DFF9EB 34%, #F4FBF7 78%, #FFFFFF 100%)",
      }}
    >
      <Row
        justify="center"
        gutter={[32, 48]}
        className="!mx-auto max-w-[1400px] !px-6 pb-16 pt-10 lg:pb-24 lg:pt-14"
      >
        {/* 左：文案 */}
        <Col xs={24} lg={9} className="lg:!pl-0 lg:!pt-8">
          <motion.div {...fadeUp(0)}>
            <Title
              level={1}
              className="!mb-0 !text-zinc-900"
              style={{
                fontSize: "clamp(2.5rem, 4.6vw, 3.8rem)",
                fontWeight: 900,
                lineHeight: 1.18,
                letterSpacing: "-0.02em",
              }}
            >
              <Flex align="center" gap={12}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/AI-gif/eat-hero.gif"
                  alt=""
                  aria-hidden
                  className="inline-block size-[0.92em] shrink-0 object-contain drop-shadow-md"
                />
                我是莓小智，
              </Flex>
              我帮你
              <br />
              <RotatingText />
            </Title>
          </motion.div>

          <motion.div {...fadeUp(0.18)} className="mt-9">
            <Flex vertical align="flex-start" gap={8}>
              <Link href="/dashboard">
                <Button
                  type="primary"
                  shape="round"
                  size="large"
                  icon={<IconRight className="text-[12px]" />}
                  iconPosition="end"
                  style={{
                    background: "#18181b",
                    height: 48,
                    paddingInline: 28,
                    fontSize: 15,
                  }}
                >
                  免费开始使用
                </Button>
              </Link>
              <Text type="secondary" className="!text-[12px]">
                打开浏览器即用 · 支持私有化部署
              </Text>
              <Link href="/subscription" className="mt-2">
                <Button
                  shape="round"
                  size="large"
                  icon={<IconRight className="text-[12px] !text-emerald-600" />}
                  iconPosition="end"
                  style={{
                    background: "rgba(255,255,255,0.8)",
                    backdropFilter: "blur(calc(8px * var(--dc-mat-scale, 1)))",
                    color: "#18181b",
                    fontWeight: 600,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  }}
                >
                  查看订阅方案
                </Button>
              </Link>
            </Flex>
          </motion.div>
        </Col>

        {/* 右：莓小智原生对话窗口（可交互；超出容器右缘，被视口裁切——同参考图） */}
        <Col xs={24} lg={15}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative lg:-mr-28"
          >
            <HeroChat />
          </motion.div>
        </Col>
      </Row>
    </section>
  );
}
