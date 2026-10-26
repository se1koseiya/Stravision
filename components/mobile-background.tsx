"use client"

export function MobileBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#fafafa] dark:bg-[#09090B]">
      {/* 顶部微弱蓝色光晕 - antd 主色系 */}
      <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[60%] rounded-full bg-[#059669]/8 dark:bg-[#059669]/12 blur-[120px]" />
    </div>
  )
}
