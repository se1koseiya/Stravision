"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { UserPublic } from "@/lib/db/user-service";
import { AutomationRule } from "@/lib/db/automation-service";
import { PageHeader } from "@/components/page-header";
import { PageHeaderRight } from "@/components/page-header-right";
import { toast } from "sonner";

// antd 组件（飞书式整体排版）
import { Button, Segmented, Input, Dropdown, Empty, Spin, Tag, Divider } from "antd";
import {
  PlusOutlined,
  ThunderboltOutlined,
  MoreOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  ArrowRightOutlined,
  CameraOutlined,
  FieldTimeOutlined,
  AimOutlined,
  AppstoreOutlined,
  RobotOutlined,
  DashboardOutlined,
  BellOutlined,
} from "@ant-design/icons";

// 触发器/节点类型 → 图标
const typeIcon: Record<string, React.ReactNode> = {
  vlm: <CameraOutlined />,
  sensor: <AimOutlined />,
  schedule: <FieldTimeOutlined />,
  logic: <AppstoreOutlined />,
  ai: <RobotOutlined />,
  action: <DashboardOutlined />,
  default: <ThunderboltOutlined />,
};

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | number>("all"); // all, active, paused
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null);

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/automation/rules');
      const data = await res.json();
      if (data.success) {
        setRules(Array.isArray(data.data) ? data.data : []);
      }
    } catch (e) {
      console.error(e);
      toast.error("加载规则失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) setCurrentUser(data.user);
    } catch (e) {
      console.error("Failed to fetch user:", e);
    }
  };

  useEffect(() => {
    fetchRules();
    fetchUser();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/automation/rules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("规则已删除");
        fetchRules();
      }
    } catch (e) {
      toast.error("删除失败");
    }
  };

  const filteredRules = Array.isArray(rules) ? rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rule.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === "active") return rule.is_active && matchesSearch;
    if (filter === "paused") return !rule.is_active && matchesSearch;
    return matchesSearch;
  }) : [];

  const activeCount = rules.filter(r => r.is_active).length;
  const pausedCount = rules.filter(r => !r.is_active).length;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F7FA] dark:bg-[#0B1220]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-screen h-screen overflow-hidden text-foreground">
      {/* 飞书式浅灰底 */}
      <div className="absolute inset-0 bg-[#F5F7FA] dark:bg-[#0B1220]" />

      <div className="relative z-10 grid grid-rows-[72px_1fr] h-full w-full">
        <PageHeader user={currentUser}>
          <PageHeaderRight>
            <div className="hidden md:block">
              <Input
                prefix={<SearchOutlined className="text-slate-400" />}
                placeholder="搜索策略..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                className="!w-[200px] !rounded-md"
                size="middle"
              />
            </div>
          </PageHeaderRight>
        </PageHeader>

        <div className="relative container mx-auto py-6 md:py-8 space-y-5 overflow-y-auto h-full scrollbar-hide px-4 md:px-8" data-lenis-prevent>
          {/* 页头：标题 + 操作（飞书式顶栏） */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#1677ff]/10 text-[#1677ff]">
                  <ThunderboltOutlined />
                </span>
                自动化策略
              </h1>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5">
                通过可视化编辑器编排 VLM 视觉识别、传感器阈值与定时任务
              </p>
            </div>
            <Link href="/automation/editor">
              <Button type="primary" icon={<PlusOutlined />} className="!h-9 !px-5">
                新建策略
              </Button>
            </Link>
          </div>

          {/* 筛选 + 搜索（飞书式工具条） */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:sticky md:top-0 z-40 py-2 bg-[#F5F7FA]/95 dark:bg-[#0B1220]/95 backdrop-blur">
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { label: `全部 (${rules.length})`, value: "all" },
                { label: `运行中 (${activeCount})`, value: "active" },
                { label: `已暂停 (${pausedCount})`, value: "paused" },
              ]}
              className="!rounded-md"
            />
            <Input
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="搜索策略名称或描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              className="!max-w-xs !rounded-md"
            />
          </div>

          {/* 策略卡片网格（飞书式卡片） */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
            <AnimatePresence mode="popLayout">
              {filteredRules.map((rule, idx) => (
                <motion.div
                  key={rule.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.18, delay: Math.min(idx * 0.04, 0.3) }}
                >
                  <div
                    className={cn(
                      "group relative h-full flex flex-col rounded-[10px] bg-white dark:bg-slate-900 border transition-all duration-200 overflow-hidden",
                      "border-slate-200/80 dark:border-slate-700/70 hover:border-[#1677ff]/40 hover:shadow-[0_6px_20px_rgba(22,119,255,0.08)]",
                      !rule.is_active && "opacity-80 hover:opacity-100"
                    )}
                  >
                    {/* 顶部状态条（飞书式左侧色条改为顶部细条） */}
                    <div
                      className={cn(
                        "h-[3px] w-full shrink-0",
                        rule.is_active ? "bg-[#00B96B]" : "bg-slate-200 dark:bg-slate-700"
                      )}
                    />

                    {/* 头部：图标 + 状态 */}
                    <div className="flex items-start justify-between px-4 pt-3.5 pb-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center w-9 h-9 rounded-lg text-base",
                            rule.is_active
                              ? "bg-[#00B96B]/10 text-[#00B96B]"
                              : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                          )}
                        >
                          {typeIcon[rule.trigger_type] || typeIcon.default}
                        </span>
                        <Tag
                          bordered={false}
                          className={cn(
                            "!rounded-md !px-2 !py-0 !m-0 !text-xs !leading-6",
                            rule.is_active
                              ? "!bg-[#E8FFF5] !text-[#00A870]"
                              : "!bg-slate-100 !text-slate-500 dark:!bg-slate-800 dark:!text-slate-400"
                          )}
                        >
                          {rule.is_active ? "运行中" : "已暂停"}
                        </Tag>
                      </div>

                      <Dropdown
                        trigger={["click"]}
                        menu={{
                          items: [
                            { key: "run", icon: <PlayCircleOutlined />, label: "立即运行" },
                            { type: "divider" },
                            { key: "delete", icon: <DeleteOutlined />, label: "删除规则", danger: true },
                          ],
                          onClick: ({ key }) => {
                            if (key === "run") toast.info("功能开发中");
                            if (key === "delete") handleDelete(rule.id);
                          },
                        }}
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<MoreOutlined />}
                          className="!text-slate-400 !-mr-1"
                        />
                      </Dropdown>
                    </div>

                    {/* 标题与描述 */}
                    <div className="px-4 pb-2.5">
                      <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 leading-snug truncate group-hover:text-[#1677ff] dark:group-hover:text-blue-400 transition-colors">
                        {rule.name}
                      </h3>
                      <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2.5em]">
                        {rule.description || "暂无描述"}
                      </p>
                    </div>

                    <Divider className="!my-0 !border-slate-100 dark:!border-slate-800" />

                    {/* 指标行（飞书式紧凑指标） */}
                    <div className="grid grid-cols-2 gap-0 px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] text-slate-400">触发次数</span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                          {rule.execution_count}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] text-slate-400">上次运行</span>
                        <span className="text-sm text-slate-700 dark:text-slate-300 font-mono truncate">
                          {rule.last_triggered_at ? new Date(rule.last_triggered_at).toLocaleTimeString() : "--:--"}
                        </span>
                      </div>
                    </div>

                    {/* 操作区 */}
                    <div className="mt-auto px-4 pb-4">
                      <Link href={`/automation/editor?id=${rule.id}`} className="block">
                        <Button
                          block
                          className="!rounded-md !text-slate-600 dark:!text-slate-300"
                        >
                          编辑策略 <ArrowRightOutlined className="opacity-50 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredRules.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-16">
              <Empty
                description={
                  <span className="text-slate-500 dark:text-slate-400">
                    {searchQuery ? "没有匹配的策略，试试更换关键词" : "还没有自动化策略，创建一个开始使用"}
                  </span>
                }
              >
                {!searchQuery && (
                  <Link href="/automation/editor">
                    <Button type="primary" icon={<PlusOutlined />}>创建新规则</Button>
                  </Link>
                )}
              </Empty>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
