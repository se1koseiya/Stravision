"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Zap, Pause, MoreHorizontal, Wand2, Loader2, Trash2, Bolt, ArrowRight, Play, Filter, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AutomationRule } from "@/lib/db/automation-service";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/page-header";
import { PageHeaderRight } from "@/components/page-header-right";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { UserPublic } from "@/lib/db/user-service";

import Image from "next/image";

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, active, paused
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
      if (data.authenticated && data.user) {
        setCurrentUser(data.user);
      }
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
      <div className="flex h-screen items-center justify-center bg-[#F1EFEA] dark:bg-[#0B1220]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-screen h-screen overflow-hidden text-foreground">
      {/* Global Background */}
      <div className="absolute inset-0 bg-[#F1EFEA] dark:bg-[#0B1220]" />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(255,255,255,0.75),transparent_60%),radial-gradient(1000px_circle_at_85%_0%,rgba(209,250,229,0.55),transparent_55%),radial-gradient(900px_circle_at_70%_90%,rgba(224,231,255,0.55),transparent_60%)] dark:hidden" />
      <div className="absolute inset-0 hidden dark:block dark:bg-[radial-gradient(1200px_circle_at_15%_10%,rgba(59,130,246,0.18),transparent_60%),radial-gradient(1000px_circle_at_85%_0%,rgba(16,185,129,0.14),transparent_55%),radial-gradient(900px_circle_at_70%_90%,rgba(99,102,241,0.12),transparent_60%)]" />

      <div className="relative z-10 grid grid-rows-[72px_1fr] h-full w-full">
        {/* Header */}
        <PageHeader user={currentUser}>
          <PageHeaderRight>
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-[160px] h-8 rounded-lg text-sm border-transparent bg-muted/50 focus:w-[200px] transition-all"
              />
            </div>
          </PageHeaderRight>
        </PageHeader>

        {/* Content Area */}
        <div className="relative container mx-auto py-6 md:py-10 space-y-8 overflow-y-auto h-full scrollbar-hide px-4 md:px-6" data-lenis-prevent>

          {/* Page Title Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
                <Bolt className="w-8 h-8 text-green-500" />
                自动化策略
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-lg">
                管理大棚的智能控制逻辑。通过可视化编辑器编排 VLM 视觉识别、传感器阈值与定时任务。
              </p>
            </div>
          </div>

          {/* Action Bar & Filter Capsules */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-40 py-2 -mx-2 px-2 md:mx-0 md:px-0 rounded-2xl md:static md:py-0">

            {/* Capsule Filter Tabs */}
            <div className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-full flex items-center gap-1 backdrop-blur-sm border border-white/20 dark:border-white/5">
              <button
                onClick={() => setFilter("all")}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
                  filter === "all"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                全部 ({rules.length})
              </button>
              <button
                onClick={() => setFilter("active")}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2",
                  filter === "active"
                    ? "bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full bg-green-500", filter !== "active" && "opacity-50")} />
                运行中 ({activeCount})
              </button>
              <button
                onClick={() => setFilter("paused")}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2",
                  filter === "paused"
                    ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full bg-amber-500", filter !== "paused" && "opacity-50")} />
                已暂停 ({pausedCount})
              </button>
            </div>

            <Link href="/automation/editor">
              <Button className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-lg shadow-slate-900/20 rounded-full px-6 transition-all hover:scale-105 active:scale-95 border border-transparent dark:border-white/20">
                <Plus className="w-4 h-4 mr-2" />
                新建策略
              </Button>
            </Link>
          </div>

          {/* Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
            <AnimatePresence mode="popLayout">
              {filteredRules.map((rule, idx) => (
                <motion.div
                  key={rule.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                >
                  <Card className={cn(
                    "h-full border-0 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden relative bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl ring-1 ring-slate-200/50 dark:ring-slate-800/50",
                    rule.is_active ? "shadow-green-500/5 hover:shadow-green-500/10" : "opacity-80 grayscale-[0.5] hover:grayscale-0 hover:opacity-100"
                  )}>
                    {/* Status Indicator Bar */}
                    <div className={cn(
                      "absolute top-0 left-0 w-full h-1 transition-colors duration-300",
                      rule.is_active ? "bg-gradient-to-r from-green-400 to-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                    )} />

                    <CardHeader className="pb-3 relative">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "p-2 rounded-lg",
                            rule.is_active ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          )}>
                            {rule.trigger_type === 'vlm' ? <Wand2 className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                          </div>
                          {rule.is_active ? (
                            <Badge variant="outline" className="border-green-200 text-green-700 dark:border-green-800 dark:text-green-400 bg-green-50 dark:bg-green-900/10">
                              运行中
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-slate-200 text-slate-500 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                              已暂停
                            </Badge>
                          )}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 -mr-2">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem onClick={() => toast.info("功能开发中")}>
                              <Play className="w-4 h-4 mr-2" /> 立即运行
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500 focus:text-red-600 focus:bg-red-50" onClick={() => handleDelete(rule.id)}>
                              <Trash2 className="w-4 h-4 mr-2" /> 删除规则
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                        {rule.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 min-h-[2.5em] text-slate-500 dark:text-slate-400">
                        {rule.description || '暂无描述'}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-2">
                      {/* Metrics */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-2.5 flex flex-col gap-1 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">触发次数</span>
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-mono font-medium">
                            <Zap className="w-3 h-3 text-amber-500" />
                            {rule.execution_count}
                          </div>
                        </div>
                        <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-2.5 flex flex-col gap-1 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">上次运行</span>
                          <div className="text-xs text-slate-700 dark:text-slate-300 font-mono mt-0.5 truncate">
                            {rule.last_triggered_at ? new Date(rule.last_triggered_at).toLocaleTimeString() : '--:--'}
                          </div>
                        </div>
                      </div>

                      <Link href={`/automation/editor?id=${rule.id}`} className="block">
                        <Button className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm transition-all group/btn">
                          编辑策略 <ArrowRight className="w-4 h-4 ml-1 opacity-50 group-hover/btn:translate-x-0.5 transition-transform" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredRules.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 px-4 text-center"
            >
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6 text-slate-300 dark:text-slate-600">
                <Filter className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">没有找到规则</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-8">
                {searchQuery ? "尝试更换搜索关键词" : "您可以创建一个新的自动化策略来开始使用"}
              </p>
              {!searchQuery && (
                <Link href="/automation/editor">
                  <Button variant="outline" className="rounded-full">
                    <Plus className="w-4 h-4 mr-2" />
                    创建新规则
                  </Button>
                </Link>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
