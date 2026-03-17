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

    return (
        <div className="w-full min-h-screen bg-gray-50 dark:bg-zinc-950">
            {children}
        </div>
    )
}
