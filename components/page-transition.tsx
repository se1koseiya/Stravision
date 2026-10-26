"use client"

import { usePathname } from "next/navigation"

export function PageTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    // Disable transition wrapper for Landing Page ("/") and marketing pages to allow native scrolling
    // Also disable for profile page as requested or specific needs
    const isMobile = pathname.includes("-ios") || pathname === "/profile"
    
    if (isMobile || pathname === "/" || pathname === "/docs" || pathname === "/apply") {
        return (
            <>
                {children}
            </>
        )
    }

    /* ⚠️ 外壳底色必须走 token，不能写死 bg-zinc-50 / dark:bg-zinc-950 ——
       这一层包住**所有**非营销页，写死之后它会成为一张不透明的底板，
       把桌面端「窗口玻璃壳」要透的桌面壁纸整片挡掉（实测：body 与页面画布都透明了，
       唯独这里还是 rgb(250,250,250)，整窗依旧是死白）。
       --berry-canvas 自带明暗两套值，并且会随 data-glass-shell 变成半透明（见 globals.css）。 */
    return (
        <div className="w-full min-h-screen bg-[var(--berry-canvas)]">
            {children}
        </div>
    )
}
