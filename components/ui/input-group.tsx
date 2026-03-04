import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import type { VariantProps } from "class-variance-authority"
import type { buttonVariants } from "@/components/ui/button"

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

const InputGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("relative flex w-full items-center rounded-lg border border-input bg-background", className)}
      {...props}
    />
  )
})
InputGroup.displayName = "InputGroup"

interface InputGroupAddonProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "inline-start" | "inline-end" | "block-end"
}

const InputGroupAddon = React.forwardRef<
  HTMLDivElement,
  InputGroupAddonProps
>(({ className, align = "inline-start", ...props }, ref) => {
  const alignClasses = {
    "inline-start": "left-2",
    "inline-end": "right-2",
    "block-end": "bottom-2 right-2 left-2"
  }
  
  const positionClasses = align === "block-end" 
    ? "absolute flex items-center gap-2" 
    : "absolute flex items-center"

  return (
    <div
      ref={ref}
      className={cn(
        positionClasses,
        alignClasses[align],
        "z-10",
        className
      )}
      {...props}
    />
  )
})
InputGroupAddon.displayName = "InputGroupAddon"

const InputGroupInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      className={cn(
        "border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent",
        className
      )}
      {...props}
    />
  )
})
InputGroupInput.displayName = "InputGroupInput"

const InputGroupTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <Textarea
      ref={ref}
      className={cn(
        "min-h-[120px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pb-12",
        className
      )}
      {...props}
    />
  )
})
InputGroupTextarea.displayName = "InputGroupTextarea"

const InputGroupButton = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ className, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      className={cn(className)}
      {...props}
    />
  )
})
InputGroupButton.displayName = "InputGroupButton"

const InputGroupText = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
})
InputGroupText.displayName = "InputGroupText"

export { 
  InputGroup, 
  InputGroupAddon, 
  InputGroupInput, 
  InputGroupTextarea,
  InputGroupButton,
  InputGroupText
}
