"use client"

import * as React from "react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { IconCalendar } from "@/components/icon";

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DayTaskManager } from "./day-task-manager"

export function CalendarTrigger({ className }: { className?: string }) {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) setDate(selectedDate)
    // 保持 Popover 打开，方便查看任务
  }

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 w-auto justify-start text-left font-normal text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 shadow-sm hover:shadow transition-all rounded-full px-4",
            className
          )}
        >
          <IconCalendar className="mr-2 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          <span className="hidden sm:inline-block font-medium text-zinc-700 dark:text-zinc-300">
            {date ? format(date, "M月d日", { locale: zhCN }) : "选择日期"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-zinc-200/50 dark:border-zinc-700/50 shadow-2xl rounded-[24px] overflow-hidden ring-1 ring-black/5" 
        align="end"
        sideOffset={12}
      >
        <div className="flex flex-col sm:flex-row h-full divide-y sm:divide-y-0 sm:divide-x divide-zinc-100 dark:divide-zinc-800">
          {/* Calendar Section */}
          <div className="p-4 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleSelect}
              initialFocus
              locale={zhCN}
              className="rounded-xl border-none p-0"
            />
          </div>

          {/* Task Manager Section */}
          <div className="w-full sm:w-[380px] flex flex-col max-h-[550px] overflow-hidden bg-zinc-50/30 dark:bg-zinc-900/30 backdrop-blur-sm">
             <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
               {date ? (
                 <DayTaskManager date={date} />
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 p-8">
                   <IconCalendar className="h-10 w-10 opacity-20" />
                   <p className="text-sm font-medium">请先选择一个日期</p>
                   <p className="text-xs opacity-70">查看当天的详细任务安排</p>
                 </div>
               )}
             </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
