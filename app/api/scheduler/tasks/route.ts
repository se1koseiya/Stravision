import { NextResponse } from "next/server"
import { createTask, getAllTasks, deleteTask, CreateTaskDTO } from "@/lib/db/scheduler-service"
import { SchedulerRunner } from "@/lib/scheduler/runner"
import { CronExpressionParser } from "cron-parser"
import { initDB } from "@/lib/db/database"

// Force dynamic to ensure we don't cache the list
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await initDB()
    const tasks = await getAllTasks()
    
    // Add next_run for cron tasks
    const tasksWithNextRun = tasks.map(task => {
      let next_run = task.execute_at
      
      if (task.cron_expression) {
        try {
          const interval = CronExpressionParser.parse(task.cron_expression)
          next_run = interval.next().getTime()
        } catch (e) {
          console.error(`Invalid cron expression for task ${task.id}:`, e)
        }
      }
      
      return { ...task, next_run }
    })

    return NextResponse.json({ success: true, tasks: tasksWithNextRun })
  } catch (error: any) {
    console.error("GET /api/scheduler/tasks error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await initDB()
    const body = await req.json()
    console.log("[API] Creating task with body:", JSON.stringify(body, null, 2))
    
    const task = await createTask(body as CreateTaskDTO)
    console.log("[API] Task created:", task)
    
    // Notify runner to refresh
    await SchedulerRunner.getInstance().refreshTasks()
    
    return NextResponse.json({ success: true, task })
  } catch (error: any) {
    console.error("POST /api/scheduler/tasks error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    await initDB()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 })
    }
    
    await deleteTask(parseInt(id))
    
    // Notify runner to refresh
    await SchedulerRunner.getInstance().refreshTasks()
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
