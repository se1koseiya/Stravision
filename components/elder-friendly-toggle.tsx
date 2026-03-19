"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"

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
        <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30 hover:bg-blue-500/30">
          <Eye className="size-3 mr-1" />
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
              ? "bg-blue-500 hover:bg-blue-600 text-white shadow-md" 
              : "hover:bg-blue-50 hover:text-blue-900 dark:hover:bg-blue-900/20 dark:hover:text-blue-100"
          )}
          title={isElderFriendlyMode ? "关闭长辈友好模式" : "开启长辈友好模式"}
        >
          {isElderFriendlyMode ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
        </Button>
      )}
    </div>
  )
}