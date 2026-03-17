"use client"

export function MobileBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50 dark:bg-[#0B1121]">
      {/* 基础渐变背景 - 模拟图二的蓝紫色星空 */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#e0e7ff_0%,#eff6ff_50%,#f5f3ff_100%)] dark:bg-[linear-gradient(180deg,#0f172a_0%,#1e1b4b_50%,#312e81_100%)] opacity-80" />
      
      {/* 顶部蓝色光晕 */}
      <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[60%] rounded-full bg-blue-400/20 dark:bg-blue-600/20 blur-[120px]" />
      
      {/* 底部紫色光晕 */}
      <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[50%] rounded-full bg-purple-400/20 dark:bg-purple-600/20 blur-[100px]" />

      {/* 细微的网格纹理，增加科技感 */}
      <div
        className="absolute inset-0 opacity-[0.4] mix-blend-overlay"
        style={{
          backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      
      {/* 星星粒子效果 - 模拟图二的闪烁点 */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)] animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              opacity: Math.random() * 0.5 + 0.3,
              animationDuration: `${Math.random() * 3 + 2}s`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  )
}
