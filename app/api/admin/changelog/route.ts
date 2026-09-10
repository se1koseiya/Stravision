import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { initDB } from "@/lib/db/database"
import { z } from "zod"
import {
  listAllChangelog,
  createChangelog,
  updateChangelog,
  deleteChangelog,
  ChangelogItem,
} from "@/lib/db/changelog-service"

const tagSchema = z.enum(["new", "improve", "fix"])

const itemSchema = z.object({
  tag: tagSchema,
  text: z.string().trim().min(1, "条目内容不能为空").max(500, "条目内容过长"),
})

const entrySchema = z.object({
  version: z.string().trim().min(1, "版本号不能为空").max(32, "版本号过长"),
  title: z.string().trim().max(120, "主题标题过长").optional().default(""),
  summary: z.string().trim().max(300, "摘要过长").optional().default(""),
  releasedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD"),
  items: z.array(itemSchema).max(50, "条目最多 50 条"),
  published: z.boolean().optional().default(true),
})

async function requireAdmin() {
  const currentUser = await getCurrentUser()
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
    return null
  }
  return currentUser
}

/** 管理列表（含未发布） */
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  try {
    await initDB()
    const entries = await listAllChangelog()
    return NextResponse.json({ entries })
  } catch (error) {
    console.error("Failed to list changelog:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

/** 新建 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  try {
    const body = await req.json()
    const parsed = entrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const entry = await createChangelog({
      version: parsed.data.version,
      title: parsed.data.title,
      summary: parsed.data.summary,
      releasedAt: parsed.data.releasedAt,
      items: parsed.data.items as ChangelogItem[],
      published: parsed.data.published,
    })
    return NextResponse.json({ entry })
  } catch (error) {
    console.error("Failed to create changelog entry:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

/** 更新 */
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  try {
    const body = await req.json()
    const id = Number(body?.id)
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "无效的 ID" }, { status: 400 })
    }
    const parsed = entrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const entry = await updateChangelog(id, {
      version: parsed.data.version,
      title: parsed.data.title,
      summary: parsed.data.summary,
      releasedAt: parsed.data.releasedAt,
      items: parsed.data.items as ChangelogItem[],
      published: parsed.data.published,
    })
    if (!entry) return NextResponse.json({ error: "条目不存在" }, { status: 404 })
    return NextResponse.json({ entry })
  } catch (error) {
    console.error("Failed to update changelog entry:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

/** 删除 */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get("id"))
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "无效的 ID" }, { status: 400 })
    }
    const ok = await deleteChangelog(id)
    if (!ok) return NextResponse.json({ error: "条目不存在" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete changelog entry:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
