"use client";

import { motion, AnimatePresence } from "framer-motion";

interface DeviceControlOverlayProps {
  isExecuting: boolean;
  deviceName: string;
  isExpanded: boolean;
}

export function DeviceControlOverlay({ 
  isExecuting, 
  deviceName, 
  isExpanded 
}: DeviceControlOverlayProps) {
  return (
    <>
      {/* 渐变模糊发光动效 */}
      <div 
        className="pointer-events-none fixed inset-0 z-[9998] transition-opacity duration-700 ease-out"
        style={{ opacity: isExecuting ? 1 : 0 }}
      >
        {/* 四边渐变模糊光晕 */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(to bottom, rgba(16, 185, 129, 0.4) 0%, transparent 15%),
              linear-gradient(to top, rgba(139, 92, 246, 0.4) 0%, transparent 15%),
              linear-gradient(to right, rgba(6, 182, 212, 0.35) 0%, transparent 12%),
              linear-gradient(to left, rgba(245, 158, 11, 0.35) 0%, transparent 12%)
            `,
            filter: "blur(60px)",
            animation: isExecuting ? "glowBreath 2s ease-in-out infinite" : "none",
          }}
        />
        {/* 四角渐变光晕 */}
        <div
          className="absolute top-0 left-0 w-[400px] h-[400px]"
          style={{
            background: "radial-gradient(circle at top left, rgba(16, 185, 129, 0.5) 0%, transparent 60%)",
            filter: "blur(80px)",
            animation: isExecuting ? "cornerPulse 3s ease-in-out infinite" : "none",
          }}
        />
        <div
          className="absolute top-0 right-0 w-[400px] h-[400px]"
          style={{
            background: "radial-gradient(circle at top right, rgba(6, 182, 212, 0.5) 0%, transparent 60%)",
            filter: "blur(80px)",
            animation: isExecuting ? "cornerPulse 3s ease-in-out infinite 0.75s" : "none",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px]"
          style={{
            background: "radial-gradient(circle at bottom left, rgba(139, 92, 246, 0.5) 0%, transparent 60%)",
            filter: "blur(80px)",
            animation: isExecuting ? "cornerPulse 3s ease-in-out infinite 1.5s" : "none",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[400px]"
          style={{
            background: "radial-gradient(circle at bottom right, rgba(245, 158, 11, 0.5) 0%, transparent 60%)",
            filter: "blur(80px)",
            animation: isExecuting ? "cornerPulse 3s ease-in-out infinite 2.25s" : "none",
          }}
        />
      </div>

      {/* 灵动岛设备操作提示 */}
      <AnimatePresence>
        {deviceName && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pointer-events-none fixed top-4 left-1/2 -translate-x-1/2 z-[9999]"
          >
            <div
              className="pointer-events-auto overflow-hidden"
              style={{
                width: isExpanded ? "auto" : "40px",
                height: isExpanded ? "44px" : "40px",
                minWidth: isExpanded ? "200px" : "40px",
                borderRadius: isExpanded ? "22px" : "20px",
                transition: `
                  width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                  min-width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                  height 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                  border-radius 0.3s ease
                `,
                background: "rgba(0, 0, 0, 0.9)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
              }}
            >
              <div
                className="flex items-center gap-3 justify-center h-full px-4"
                style={{
                  opacity: isExpanded ? 1 : 0,
                  transform: isExpanded ? "scale(1)" : "scale(0.8)",
                  transition: "opacity 0.25s ease, transform 0.25s ease",
                }}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping absolute" />
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full relative" />
                </div>
                <span className="text-white text-sm font-medium whitespace-nowrap">
                  正在操作{" "}
                  <span className="text-emerald-400 font-semibold">
                    {deviceName}
                  </span>
                </span>
              </div>
              {!isExpanded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global styles for animations */}
      <style jsx global>{`
        @keyframes glowBreath {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.02); }
        }
        @keyframes cornerPulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </>
  );
}
