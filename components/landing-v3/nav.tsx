"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button, Drawer, Flex, Typography } from "antd";
import { MenuOutlined, DownOutlined, RightOutlined } from "@ant-design/icons";

const { Text } = Typography;

const LINKS = [
  { href: "/subscription", label: "订阅方案" },
  { href: "#plan", label: "套餐方案", hasChevron: true },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/85 shadow-[0_1px_0_rgba(0,0,0,0.05)] backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <Flex
        justify="space-between"
        align="center"
        className="!h-[72px] !px-6"
        style={{ maxWidth: 1280, marginInline: "auto" }}
      >
        {/* 左：Logo + 链接 */}
        <Flex align="center" gap={40}>
          <Link href="/" aria-label="莓界 Berry Realm 首页" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/guiderlogo-trim.png"
              alt="莓界 Berry Realm"
              className="h-9 w-auto"
            />
          </Link>
          <nav className="hidden items-center gap-1.5 md:flex">
            {LINKS.map((l) => (
              <Link key={l.label} href={l.href}>
                <Button
                  type="text"
                  size="large"
                  className="!px-3 !font-medium"
                  style={{ height: 40, fontSize: 14 }}
                >
                  {l.label}
                  {l.hasChevron && <DownOutlined className="ml-1.5 text-[11px] text-slate-400" />}
                </Button>
              </Link>
            ))}
          </nav>
        </Flex>

        {/* 右：登录 + 白胶囊 + 黑胶囊 */}
        <Flex align="center" gap={12} className="hidden md:flex">
          <Link href="/login">
            <Button
              type="text"
              size="large"
              className="!px-3 !font-medium"
              style={{ height: 40, fontSize: 14 }}
            >
              登录
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button
              shape="round"
              size="large"
              style={{
                background: "#ffffff",
                color: "#0f172a",
                fontWeight: 600,
                height: 40,
                paddingInline: 20,
                fontSize: 14,
                boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
              }}
            >
              使用网页版
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button
              shape="round"
              size="large"
              style={{ background: "#0f172a", color: "#ffffff", fontWeight: 600, height: 40, paddingInline: 20, fontSize: 14 }}
            >
              进入控制台
              <RightOutlined className="text-[11px]" />
            </Button>
          </Link>
        </Flex>

        {/* 移动端菜单 */}
        <Button
          type="text"
          shape="circle"
          icon={<MenuOutlined />}
          onClick={() => setOpen(true)}
          aria-label="菜单"
          className="md:!hidden"
        />
      </Flex>

      <Drawer
        placement="top"
        open={open}
        onClose={() => setOpen(false)}
        closable={false}
        height="auto"
        styles={{ body: { padding: "16px 24px 20px" } }}
      >
        <Flex vertical gap={4}>
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} onClick={() => setOpen(false)}>
              <Button type="text" block size="large" className="!justify-start !px-3">
                {l.label}
              </Button>
            </Link>
          ))}
          <Flex gap={12} className="mt-2">
            <Link href="/login" className="flex-1">
              <Button shape="round" block size="large">
                登录
              </Button>
            </Link>
            <Link href="/dashboard" className="flex-1">
              <Button
                shape="round"
                block
                size="large"
                style={{ background: "#0f172a", color: "#ffffff", fontWeight: 600 }}
              >
                进入控制台
              </Button>
            </Link>
          </Flex>
          <Text type="secondary" className="mt-3 !text-[12px]">
            莓界 Berry Realm · 让每一座大棚都有大脑
          </Text>
        </Flex>
      </Drawer>
    </motion.header>
  );
}
