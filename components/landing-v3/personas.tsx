"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, Card, Col, Flex, List, Row, Table, Tag, Typography } from "antd";
import {
  RiseOutlined,
  AppstoreOutlined,
  TeamOutlined,
  BarChartOutlined,
  ThunderboltFilled,
  CheckCircleFilled,
  RightOutlined,
} from "@ant-design/icons";
import { L, L_MIX, SHADOW } from "@/components/landing-v4/shared";

const { Title, Text } = Typography;

/* ------------------------------------------------------------
   「专为每一类种植者量身解决问题」
   配色已对齐 Loomy：墨色 #222 / 次级 #696969 / 薄荷绿系，
   选中态用 1px 主题色细边框 + 中性图标文字，不用实心色块。
   ------------------------------------------------------------ */

const GREEN_INK = L.navHover; // #009456 —— 浅底上可读的绿，仅用于细线条与小图标

const PERSONAS = [
  {
    key: "farm",
    title: "规模化农场",
    sub: "多区大棚 & 连栋温室",
    tags: ["#分区管理", "#环境联动", "#省人省心"],
    color: "#E8F5EE",
    desc: "横跨分区的经营大脑：自动完成多棚巡检、环境调控、预警与复盘，让十个大棚像一个棚一样好管。",
    menu: [
      { icon: RiseOutlined, label: "多区环境总览", note: "全棚趋势一屏掌握" },
      { icon: AppstoreOutlined, label: "分区自动化规则", note: "按区下发执行策略" },
      { icon: TeamOutlined, label: "巡检日报生成", note: "异常自动标注" },
      { icon: BarChartOutlined, label: "产量复盘分析", note: "每茬都有迹可循" },
    ],
    mock: {
      title: "多区巡检 · 本周汇总",
      rows: [
        { name: "ZONE_A 温度日较差", v: "+14.2%" },
        { name: "ZONE_B 湿度越限次数", v: "-36%" },
        { name: "补光执行准时率", v: "99.4%" },
        { name: "水肥方案命中率", v: "92.7%" },
      ],
      foot: "完整报告已存入工作区：zone_weekly_2026-W36.md",
    },
  },
  {
    key: "home",
    title: "家庭莓园",
    sub: "精品草莓 & 家庭农场",
    tags: ["#一键种好", "#少操心", "#果品稳定"],
    color: "#FDF0E7",
    desc: "一个人也能种出精品果：温湿度、补光、水肥全自动打理，把你的经验变成每一茬的稳定收成。",
    menu: [
      { icon: ThunderboltFilled, label: "一键环境方案", note: "按品种套用模板" },
      { icon: RiseOutlined, label: "水肥一体化控制", note: "指尖一按即生效" },
      { icon: CheckCircleFilled, label: "异常即时预警", note: "越界第一秒推送" },
      { icon: BarChartOutlined, label: "种植笔记沉淀", note: "经验变成知识库" },
    ],
    mock: {
      title: "今日环境 · 一键方案",
      rows: [
        { name: "目标日温", v: "24.5°C" },
        { name: "夜间温度", v: "16°C" },
        { name: "空气湿度", v: "62%" },
        { name: "补光时长", v: "4h" },
      ],
      foot: "方案已同步至 2 台执行器，今晚 18:30 自动生效。",
    },
  },
  {
    key: "creator",
    title: "新农人",
    sub: "返乡创业 & 内容带货",
    tags: ["#数据种果", "#内容素材", "#快速上手"],
    color: "#F3EDFD",
    desc: "用数据讲好种植故事：生长曲线、环境大屏、延时影像，种得好，还要让所有人看得见。",
    menu: [
      { icon: RiseOutlined, label: "生长数据大屏", note: "直播间的硬核背书" },
      { icon: ThunderboltFilled, label: "延时影像素材", note: "自动沉淀生长片段" },
      { icon: TeamOutlined, label: "一键分享海报", note: "朋友圈十分钟出图" },
      { icon: BarChartOutlined, label: "成本收益核算", note: "每一茬算得清楚" },
    ],
    mock: {
      title: "本茬生长故事线",
      rows: [
        { name: "定植 → 现蕾", v: "18 天" },
        { name: "累计有效积温", v: "412°C·d" },
        { name: "糖度曲线", v: "稳步上行" },
        { name: "素材库新增", v: "36 段" },
      ],
      foot: "生长故事海报已生成，附二维码直达你的大棚主页。",
    },
  },
];

type Persona = (typeof PERSONAS)[number];

// 每个人群卡随机分配一张默认头像（avatar1-8；模块级求值，每次页面加载随机一次）
const PERSONA_AVATARS = [1, 2, 3, 4, 5, 6, 7, 8]
  .sort(() => Math.random() - 0.5)
  .slice(0, PERSONAS.length);

const avatarRadius = (size: number) => (size >= 84 ? 26 : 20);

function PersonaAvatar({ persona, i, size }: { persona: Persona; i: number; size: number }) {
  return (
    <span
      className="inline-block shrink-0 overflow-hidden"
      style={{
        borderRadius: avatarRadius(size),
        background: "rgba(255,255,255,0.55)",
        padding: size >= 84 ? 5 : 7,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/images/user_default_avatar/avatar${PERSONA_AVATARS[i]}.png`}
        alt={persona.title}
        className="object-cover"
        style={{ borderRadius: avatarRadius(size) - 6, width: size, height: size }}
      />
    </span>
  );
}

export function Personas() {
  const [active, setActive] = useState(0);
  const p = PERSONAS[active];

  const mockColumns = [
    {
      title: "指标",
      dataIndex: "name",
      key: "name",
      render: (v: string) => (
        <Text className="!text-[13px]" style={{ color: L.muted }}>
          {v}
        </Text>
      ),
    },
    {
      title: "",
      dataIndex: "v",
      key: "v",
      align: "right" as const,
      render: (v: string) => (
        <Text strong className="!text-[13px]" style={{ color: GREEN_INK }}>
          {v} <CheckCircleFilled className="text-[11px]" />
        </Text>
      ),
    },
  ];

  return (
    <section className="bg-white py-24 md:py-32">
      <div className="mx-auto w-[min(100%-2rem,80rem)]">
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <Title
            level={2}
            className="!mb-0"
            style={{
              color: L.ink,
              fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
              fontWeight: 700,
              lineHeight: 1.22,
              letterSpacing: "-0.02em",
            }}
          >
            专为每一类种植者
            <br />
            量身解决问题
          </Title>
          {/* 气泡贴纸：左下尖角、微旋转 */}
          <motion.span
            animate={{ rotate: [-8, -4, -8] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="absolute left-[min(40%,360px)] top-2 hidden md:inline-block"
          >
            <span
              className="inline-block rounded-[18px] rounded-bl-[4px] px-[18px] py-2.5 text-[14px] font-bold tracking-wide"
              style={{ background: L.chip, color: L.ink, boxShadow: SHADOW.soft }}
            >
              点击进行预览
            </span>
          </motion.span>
        </motion.div>

        {/* 人群卡片行 —— 选中卡带尾巴指向下方详情 */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 flex flex-col gap-4 md:flex-row md:items-stretch"
        >
          {PERSONAS.map((persona, i) => {
            const selected = i === active;
            if (selected) {
              return (
                <button
                  key={persona.key}
                  onClick={() => setActive(i)}
                  className="relative flex-[1.9] rounded-[1.75rem] border p-6 text-left transition-all duration-300"
                  style={{ background: L.accent, borderColor: "rgba(34,34,34,0.10)" }}
                >
                  <Flex align="center" gap={20}>
                    <PersonaAvatar persona={persona} i={i} size={84} />
                    <div className="min-w-0">
                      <div className="text-[22px] font-bold tracking-tight" style={{ color: L.ink }}>
                        {persona.title}
                      </div>
                      <Text className="!text-[13px] !font-medium" style={{ color: "rgba(34,34,34,0.66)" }}>
                        {persona.sub}
                      </Text>
                      <Flex wrap="wrap" gap={6} className="mt-2.5">
                        {persona.tags.map((t) => (
                          <Tag
                            key={t}
                            bordered={false}
                            className="!m-0 !rounded-full !bg-white/60 !px-2.5 !text-[12px] !font-semibold"
                            style={{ color: L.ink }}
                          >
                            {t}
                          </Tag>
                        ))}
                      </Flex>
                    </div>
                  </Flex>
                  {/* 气泡尾巴：指向下方详情面板 */}
                  <span
                    aria-hidden
                    className="absolute -bottom-1.5 left-14 size-4 rotate-45 rounded-[3px]"
                    style={{ background: L.accent }}
                  />
                </button>
              );
            }
            return (
              <button
                key={persona.key}
                onClick={() => setActive(i)}
                className="flex flex-1 flex-col items-center justify-center gap-4 rounded-[1.75rem] border border-transparent px-6 py-8 transition-all duration-300 hover:border-[rgba(34,34,34,0.10)]"
                style={{ background: L_MIX.idle }}
              >
                <PersonaAvatar persona={persona} i={i} size={64} />
                <span className="text-center text-[16px] font-semibold tracking-tight" style={{ color: L.ink }}>
                  {persona.title}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* 详情面板 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={p.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 rounded-[1.75rem] p-7 md:p-10"
            style={{ background: L_MIX.panel }}
          >
            <Text strong className="!text-[13px]" style={{ color: GREEN_INK }}>
              针对{" "}
              <Text className="ml-1 !text-[13px]" style={{ color: L.muted }}>
                {p.title}
              </Text>
            </Text>
            <Title
              level={3}
              className="mt-4 max-w-3xl !mb-0"
              style={{
                color: L.ink,
                fontSize: "clamp(1.25rem, 2vw, 1.5rem)",
                fontWeight: 700,
                lineHeight: 1.5,
                letterSpacing: "-0.02em",
              }}
            >
              {p.desc}
            </Title>

            <Row gutter={[32, 32]} className="mt-10 !mx-0">
              {/* 左：能力菜单 */}
              <Col xs={24} lg={10}>
                <Flex justify="center" vertical className="h-full">
                  <List
                    dataSource={p.menu}
                    split={false}
                    renderItem={(m, i) => (
                      <List.Item
                        className="group !cursor-default !border-b !border-[rgba(34,34,34,0.08)] !py-4 !px-0 transition-colors hover:!border-[rgba(34,34,34,0.16)]"
                        style={{ borderBottomStyle: "solid" }}
                      >
                        <Flex align="center" gap={16} className="w-full">
                          <span
                            className="flex size-10 items-center justify-center rounded-xl text-[18px] transition-colors"
                            style={{
                              background: i === 0 ? L.mint : "rgba(34,34,34,0.04)",
                              color: i === 0 ? L.ink : L.muted,
                            }}
                          >
                            <m.icon />
                          </span>
                          <Flex vertical flex={1}>
                            <Text strong className="!text-[16px]" style={{ color: i === 0 ? L.ink : L.muted }}>
                              {m.label}
                            </Text>
                            <Text className="!text-[12px]" style={{ color: L.muted }}>
                              {m.note}
                            </Text>
                          </Flex>
                          <RightOutlined
                            className={`text-[12px] transition-all group-hover:translate-x-1 ${
                              i === 0 ? "" : "opacity-60"
                            }`}
                            style={{ color: i === 0 ? L.accentStrong : "#C4C4C4" }}
                          />
                        </Flex>
                      </List.Item>
                    )}
                  />
                </Flex>
              </Col>

              {/* 右：成果卡 */}
              <Col xs={24} lg={14}>
                <Card
                  variant="borderless"
                  className="h-full"
                  style={{ boxShadow: SHADOW.soft }}
                  styles={{ body: { padding: 24 } }}
                >
                  <Flex align="center" justify="space-between">
                    <Text strong className="!text-[14px]" style={{ color: L.ink }}>
                      {p.mock.title}
                    </Text>
                    <Tag
                      icon={<CheckCircleFilled />}
                      bordered={false}
                      className="!m-0 !rounded-full !px-2.5 !text-[11px] !font-semibold"
                      style={{ background: L.mint, color: GREEN_INK }}
                    >
                      已完成
                    </Tag>
                  </Flex>
                  <Table
                    size="small"
                    pagination={false}
                    showHeader={false}
                    dataSource={p.mock.rows}
                    columns={mockColumns}
                    rowKey="name"
                    className="mt-4 [&_.ant-table]:!rounded-xl"
                  />
                  <Alert
                    showIcon
                    icon={<ThunderboltFilled style={{ color: GREEN_INK }} />}
                    message={
                      <Text className="!text-[12px]" style={{ color: L.ink }}>
                        {p.mock.foot}
                      </Text>
                    }
                    className="mt-4 [&_.ant-alert]:!rounded-xl [&_.ant-alert]:!border-transparent"
                    style={{ background: L.chip }}
                  />
                </Card>
              </Col>
            </Row>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
