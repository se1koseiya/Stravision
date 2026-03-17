import { cn } from "@/lib/utils"

interface LoadingDotsProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function LoadingDots({ size = "md", className }: LoadingDotsProps) {
  const sizeClasses = {
    sm: "w-1 h-1",
    md: "w-1.5 h-1.5", 
    lg: "w-2 h-2"
  }

  const dotClass = sizeClasses[size]

  return (
    <div className={cn("flex gap-1", className)}>
      <div className={cn(dotClass, "bg-current rounded-full animate-bounce")} style={{ animationDelay: '0ms' }} />
      <div className={cn(dotClass, "bg-current rounded-full animate-bounce")} style={{ animationDelay: '150ms' }} />
      <div className={cn(dotClass, "bg-current rounded-full animate-bounce")} style={{ animationDelay: '300ms' }} />
    </div>
  )
}

interface LoadingButtonProps {
  loading: boolean
  children: React.ReactNode
  loadingText?: string
  size?: "sm" | "md" | "lg"
}

export function LoadingButton({ loading, children, loadingText, size = "md" }: LoadingButtonProps) {
  if (loading) {
    return (
      <span className="flex items-center gap-2">
        <LoadingDots size={size} />
        {loadingText && <span>{loadingText}</span>}
      </span>
    )
  }
  
  return <>{children}</>
}