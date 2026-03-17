import { cn } from "@/lib/utils"
import React from "react"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "dark" | "light"
  hoverEffect?: boolean
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", hoverEffect = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-xl border border-white/10 shadow-xl backdrop-blur-md",
          {
            "bg-white/5": variant === "default",
            "bg-black/20": variant === "dark",
            "bg-white/20": variant === "light",
            "transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl hover:bg-white/10": hoverEffect,
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
GlassCard.displayName = "GlassCard"
