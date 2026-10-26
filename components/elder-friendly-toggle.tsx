"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"
import { IconPreviewClose, IconPreviewOpen } from "@/components/icon";

interface ElderFriendlyToggleProps {
  showBadge?: boolean
  showButton?: boolean
  className?: string
}

export function ElderFriendlyToggle({ 
  showBadge = true, 
  showButton = true, 
  className 
}: ElderFriendlyToggleProps) {
  const { isElderFriendlyMode, toggleElderFriendlyMode } = useElderFriendly()

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {showBadge && isElderFriendlyMode && (
        <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/30">
          <IconPreviewOpen className="size-3 mr-1" />
          长辈友好模式
        </Badge>
      )}
      
      {showButton && (
        <Button
          onClick={toggleElderFriendlyMode}
          variant={isElderFriendlyMode ? "default" : "ghost"}
          size="icon"
          className={cn(
            "h-9 w-9 rounded-full transition-all",
            isElderFriendlyMode 
              ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm" 
              : "hover:bg-emerald-50 hover:text-emerald-900 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-100"
          )}
          title={isElderFriendlyMode ? "关闭长辈友好模式" : "开启长辈友好模式"}
        >
          {isElderFriendlyMode ? <IconPreviewOpen className="size-5" /> : <IconPreviewClose className="size-5" />}
        </Button>
      )}
    </div>
  )
}