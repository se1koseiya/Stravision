"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Sparkles, Package, Cpu } from "lucide-react"
import { cn } from "@/lib/utils"
import { SkillStore } from "@/components/ai/skill-store"
import { MCPStoreContent } from "@/components/mcp/mcp-store-content"
import { ModelStoreContent } from "@/components/model-store/model-store-content"

interface UnifiedExploreProps {
  onClose: () => void
}

export function UnifiedExplore({ onClose }: UnifiedExploreProps) {
  const [activeTab, setActiveTab] = useState<"skills" | "mcp" | "models">("skills")

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-white dark:bg-[#000] flex flex-col"
    >
      {/* Header */}
      <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-6">
          <button
            onClick={onClose}
            className="size-9 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-center transition-colors"
          >
            <X size={18} className="text-zinc-500" />
          </button>
          
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 rounded-xl p-1">
            <button
              onClick={() => setActiveTab("skills")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                activeTab === "skills"
                  ? "bg-white dark:bg-zinc-800 text-blue-500 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              <Sparkles size={16} />
              技能商店
            </button>
            <button
              onClick={() => setActiveTab("mcp")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                activeTab === "mcp"
                  ? "bg-white dark:bg-zinc-800 text-blue-500 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              <Package size={16} />
              MCP 工具
            </button>
            <button
              onClick={() => setActiveTab("models")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                activeTab === "models"
                  ? "bg-white dark:bg-zinc-800 text-blue-500 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              <Cpu size={16} />
              模型商店
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-zinc-400 font-medium">
            {activeTab === "skills" ? "探索 AI 技能" : activeTab === "mcp" ? "探索 MCP 工具" : "配置大模型引擎"}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "skills" ? (
            <motion.div
              key="skills"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              <SkillStore />
            </motion.div>
          ) : activeTab === "mcp" ? (
            <motion.div
              key="mcp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <MCPStoreContent />
            </motion.div>
          ) : (
            <motion.div
              key="models"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <ModelStoreContent />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
