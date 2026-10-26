"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { IconLeft as ChevronLeftIcon, IconRight as ChevronRightIcon } from "@/components/icon";

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-between pt-1 relative items-center mb-4 px-2",
        caption_label: "text-sm font-bold text-foreground tracking-tight pl-2",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 bg-transparent p-0 hover:opacity-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all text-muted-foreground hover:text-foreground"
        ),
        nav_button_previous: "static",
        nav_button_next: "static",
        table: "w-full border-collapse space-y-1",
        head_row: "flex w-full justify-between mb-2",
        head_cell:
          "text-muted-foreground rounded-lg w-9 font-medium text-[0.8rem] uppercase tracking-wider text-center",
        row: "flex w-full mt-2 justify-between",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-full transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:scale-110 active:scale-95"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white focus:bg-zinc-900 focus:text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 dark:hover:text-zinc-900 shadow-lg shadow-zinc-900/20 dark:shadow-white/20 font-semibold",
        day_today: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 font-bold ring-1 ring-zinc-200 dark:ring-zinc-700",
        day_outside:
          "day-outside text-zinc-300 dark:text-zinc-700 opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeftIcon className="h-4 w-4" />,
        IconRight: () => <ChevronRightIcon className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
