"use client"

export function MobileBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#f7f8fa] dark:bg-[#0B1121]">
      {/* 顶部微弱蓝色光晕 - antd 主色系 */}
      <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[60%] rounded-full bg-[#1677ff]/8 dark:bg-[#1677ff]/12 blur-[120px]" />
    </div>
  )
}
