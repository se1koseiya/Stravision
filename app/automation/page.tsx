"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { UserPublic } from "@/lib/db/user-service";
import { AutomationRule } from "@/lib/db/automation-service";
import { PageHeader } from "@/components/page-header";
import { PageHeaderRight } from "@/components/page-header-right";
import { CopilotSidebar } from "@/components/ai/copilot/copilot-sidebar";
import { toast } from "sonner";
import { IconAiming, IconApplicationOne, IconArrowRight, IconCamera, IconDashboard, IconDelete, IconMore, IconPlayOne, IconPlus, IconRemind, IconRobot, IconSearch, IconThunderbolt, IconTime } from "@/components/icon";

// antd 组件（飞书式整体排版）
import { Button, Segmented, Input, Dropdown, Empty, Spin, Divider } from "antd";

// 触发器/节点类型 → 图标
const typeIcon: Record<string, React.ReactNode> = {
  vlm: <IconCamera />,
  sensor: <IconAiming />,
  schedule: <IconTime />,
  logic: <IconApplicationOne />,
  ai: <IconRobot />,
  action: <IconDashboard />,
  default: <IconThunderbolt />,
};

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | number>("all"); // all, active, paused
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

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

  // —— 立即运行某条规则（修复"功能开发中"bug，调真实执行 API）——
  const handleRunRule = async (rule: AutomationRule) => {
    if (runningId) return;
    setRunningId(rule.id);
    const loadingToast = toast.loading(`正在运行「${rule.name}」...`);
    try {
      let graphData: any = {};
      try {
        graphData = JSON.parse(rule.graph_data || "{}");
      } catch {
        toast.error('执行失败', {
          description: '规则数据已损坏，请重新编辑',
          id: loadingToast,
        });
        return;
      }
      if (!Array.isArray(graphData.nodes) || graphData.nodes.length === 0) {
        toast.error('执行失败', {
          description: '规则为空，请先在编辑器添加节点',
          id: loadingToast,
        });
        return;
      }
      const res = await fetch('/api/automation/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graph_data: graphData,
          force: true,
          context: { sensorData: undefined, timestamp: Date.now() },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error('执行失败', {
          description: data.message || data.error || '未知错误',
          id: loadingToast,
        });
        return;
      }
      const actionsCount = Array.isArray(data.actions) ? data.actions.length : 0;
      if (actionsCount > 0) {
        toast.success(`成功执行 ${actionsCount} 个动作`, { id: loadingToast });
      } else {
        toast.info(data.message || '当前条件未触发任何动作', {
          id: loadingToast,
          duration: 4000,
        });
      }
      fetchRules();
    } catch (e) {
      toast.error('执行失败', {
        description: e instanceof Error ? e.message : String(e),
        id: loadingToast,
      });
    } finally {
      setRunningId(null);
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
                prefix={<IconSearch className="text-slate-400" />}
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
                  <IconThunderbolt />
                </span>
                自动化策略
              </h1>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5">
                通过可视化编辑器编排 VLM 视觉识别、传感器阈值与定时任务
              </p>
            </div>
            <Link href="/automation/editor">
              <Button type="primary" icon={<IconPlus />} className="!h-9 !px-5">
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
              prefix={<IconSearch className="text-slate-400" />}
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
                      "border-slate-200/80 dark:border-slate-700/70 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.05)]",
                      !rule.is_active && "opacity-80 hover:opacity-100"
                    )}
                  >
                    {/* 头部：图标 + 状态 */}
                    <div className="flex items-start justify-between px-4 pt-4 pb-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center w-9 h-9 rounded-lg text-base transition-colors",
                            "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                            "group-hover:bg-slate-900/[0.06] group-hover:text-slate-700 dark:group-hover:text-slate-200"
                          )}
                        >
                          {typeIcon[rule.trigger_type] || typeIcon.default}
                        </span>
                        {(() => {
                          const isRunning = runningId === rule.id;
                          return (
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full shrink-0",
                                  isRunning
                                    ? "bg-blue-500 animate-pulse"
                                    : rule.is_active
                                      ? "bg-emerald-500"
                                      : "bg-slate-300 dark:bg-slate-600"
                                )}
                              />
                              <span
                                className={cn(
                                  "text-xs font-medium tracking-tight",
                                  isRunning
                                    ? "text-blue-600 dark:text-blue-400"
                                    : rule.is_active
                                      ? "text-slate-700 dark:text-slate-300"
                                      : "text-slate-400 dark:text-slate-500"
                                )}
                              >
                                {isRunning ? "执行中..." : rule.is_active ? "运行中" : "已暂停"}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      <Dropdown
                        trigger={["click"]}
                        menu={{
                          items: [
                            {
                              key: "run",
                              icon: <IconPlayOne />,
                              label: "立即运行",
                              disabled: runningId === rule.id,
                            },
                            { type: "divider" },
                            { key: "delete", icon: <IconDelete />, label: "删除规则", danger: true },
                          ],
                          onClick: ({ key }) => {
                            if (key === "run") handleRunRule(rule);
                            if (key === "delete") handleDelete(rule.id);
                          },
                        }}
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<IconMore />}
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
                          编辑策略 <IconArrowRight className="opacity-50 group-hover:translate-x-0.5 transition-transform" />
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
                    <Button type="primary" icon={<IconPlus />}>创建新规则</Button>
                  </Link>
                )}
              </Empty>
            </motion.div>
          )}
        </div>
      </div>

      {/* ===== AI 助手侧栏（复用 ai-assistant 的对话组件，欢迎词按页面区分）===== */}
      <CopilotSidebar
        pageKey="automation"
        context={() => {
          const lines: string[] = ["页面：自动化规则（/automation）"]
          lines.push(`规则总数：${rules.length}`)
          const active = rules.filter((r) => r.is_active).length
          lines.push(`启用中：${active} 条；已停用：${rules.length - active} 条`)
          if (rules.length) {
            lines.push(
              "规则清单：\n" +
                rules
                  .slice(0, 12)
                  .map(
                    (r) =>
                      `- ${r.name}｜触发源 ${r.trigger_type}｜${r.is_active ? "启用" : "停用"}｜累计执行 ${r.execution_count} 次`
                  )
                  .join("\n")
            )
          }
          if (searchQuery) lines.push(`用户正在搜索：${searchQuery}`)
          return lines.join("\n")
        }}
      />
    </div>
  );
}
