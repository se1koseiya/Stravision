"use client"

import { useEffect } from "react"

export function SchedulerInit() {
  useEffect(() => {
    // Initialize scheduler on app load
    fetch("/api/scheduler/init").catch(console.error)
  }, [])

  return null
}
