"use client"

import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import { ReactNode, useState, useRef, useEffect } from "react"
import { Minus } from "lucide-react"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"

const widgetVariants = cva(
  "relative transition-all duration-300 select-none",
  {
    variants: {
      size: {
        small: "aspect-square w-full h-full min-h-[160px]", // 1x1
        medium: "col-span-2 aspect-[2/1] w-full h-full min-h-[160px]", // 2x1
        large: "col-span-2 row-span-2 aspect-square w-full h-full min-h-[340px]", // 2x2
      },
      variant: {
        default: "bg-white dark:bg-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-0", // Clean white look
        emerald: "bg-primary text-white shadow-xl shadow-emerald-500/20 border-0", // Emerald accent card
        glass: "bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg",
        colorful: "text-white shadow-lg border-0",
        outline: "bg-transparent border-2 border-slate-200 dark:border-slate-800 border-dashed",
      },
      isEditing: {
        true: "animate-jiggle shadow-lg cursor-pointer",
        false: "hover:shadow-lg"
      }
    },
    defaultVariants: {
      size: "small",
      variant: "default",
      isEditing: false
    }
  }
)

interface IOSWidgetCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onContextMenu'>, VariantProps<typeof widgetVariants> {
  children: ReactNode
  header?: ReactNode
  footer?: ReactNode
  background?: ReactNode
  widgetId?: string
  isEditing?: boolean
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

export function IOSWidgetCard({ 
  className, 
  size, 
  variant, 
  isEditing = false,
  children, 
  header, 
  footer,
  background,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress,
  ...props 
}: IOSWidgetCardProps) {
  
  const { isElderFriendlyMode } = useElderFriendly()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (isEditing) return; // Don't trigger long press if already editing
    timerRef.current = setTimeout(() => {
      if (onLongPress && widgetId) {
        onLongPress(e, widgetId);
      }
    }, 500); // 500ms for long press
  }

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default browser context menu
    if (onContextMenu && widgetId) {
      onContextMenu(e, widgetId);
    }
  }

  return (
    <div 
      className={cn(
        widgetVariants({ size, variant, isEditing }), 
        size === 'small' ? "rounded-[32px]" : size === 'medium' ? "rounded-[36px]" : "rounded-[40px]",
        className
      )} 
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      {...props}
    >
      {/* Jiggle Animation Styles */}
      <style jsx global>{`
        @keyframes jiggle {
          0% { transform: rotate(-1deg); }
          50% { transform: rotate(1deg); }
          100% { transform: rotate(-1deg); }
        }
        .animate-jiggle {
          animation: jiggle 0.3s infinite ease-in-out;
        }
      `}</style>

      {/* Remove Button (Minus Icon) in Edit Mode */}
      {isEditing && (
        <div 
          className="cancel-drag absolute -top-2 -left-2 z-[100] w-8 h-8 bg-slate-200/90 backdrop-blur-xl rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-300 transition-colors shadow-lg border border-white/50 pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation(); // Prevent drag
            e.preventDefault();
            if (onRemove && widgetId) onRemove(widgetId);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="w-6 h-6 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-sm pointer-events-none">
             <Minus className="w-4 h-4 text-slate-600 dark:text-slate-200" strokeWidth={3} />
          </div>
        </div>
      )}

      {/* Main Card Content Container - moved overflow-hidden and rounded here */}
      <div className={cn(
        "absolute inset-0 overflow-hidden",
        size === 'small' ? "rounded-[32px]" : size === 'medium' ? "rounded-[36px]" : "rounded-[40px]"
      )}>
        {background && (
          <div className="absolute inset-0 z-0 pointer-events-none">
            {background}
          </div>
        )}
        
        <div className={cn(
          "relative z-10 flex flex-col h-full p-6", 
          isEditing && "pointer-events-none",
          isElderFriendlyMode && "elder-friendly-text"
        )}>
          {header && (
            <div className="flex items-center justify-between mb-4 w-full">
              {header}
            </div>
          )}
          
          <div className="flex-1 flex flex-col justify-center w-full">
            {children}
          </div>

          {footer && (
            <div className="mt-auto pt-2 w-full">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
