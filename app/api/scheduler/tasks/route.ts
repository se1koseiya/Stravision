import { NextResponse } from "next/server"
import { createTask, getAllTasks, deleteTask, updateTask, updateTaskStatus, CreateTaskDTO } from "@/lib/db/scheduler-service"
import { SchedulerRunner } from "@/lib/scheduler/runner"
import { CronExpressionParser } from "cron-parser"
import { initDB } from "@/lib/db/database"
import { getCurrentUser } from "@/lib/auth"


// Force dynamic to ensure we don't cache the list
export const dynamic = 'force-dynamic'

// 鉴权守卫：仅管理员可操作定时任务（任务表无 user_id 隔离，必须限制访问权限）
async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) return null
  if (user.role !== 'admin' && user.role !== 'super_admin') return null
  return user
}

export async function GET() {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
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
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
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
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
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

export async function PATCH(req: Request) {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await initDB()
    const body = await req.json()
    const id = Number(body?.id)
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 })
    }

    if (body.is_active !== undefined && Object.keys(body).filter(k => k !== "id").length === 1) {
      // 快速切换 is_active
      await updateTaskStatus(id, !!body.is_active)
    } else {
      const { id: _omit, ...rest } = body
      await updateTask(id, rest)
    }

    await SchedulerRunner.getInstance().refreshTasks()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await initDB()
    const body = await req.json()
    const id = Number(body?.id)
    const action = body?.action

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 })
    }

    if (action === "run_now") {
      // 立即执行指定任务
      await SchedulerRunner.getInstance().runNow(id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
