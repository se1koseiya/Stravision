import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getGreenhouseCameraUrls, updateGreenhouseCameraUrls } from "@/lib/db/settings-service"
import { IS_DESKTOP_APP } from "@/lib/desktop-mode"
import { z } from "zod"

const payloadSchema = z.object({
  cameraAUrl: z.string(),
  cameraBUrl: z.string()
})

/** 摄像头地址写入是用户点「保存」触发的低频操作，不再叠加冷却（桌面端曾加 10s 冷却，
 *  结果用户连续改两次就撞「操作过于频繁」，已随桌面端整体豁免限流一并移除）。 */

export async function GET(_req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const urls = await getGreenhouseCameraUrls()
    return NextResponse.json(urls)
  } catch (error) {
    console.error("Failed to fetch greenhouse camera urls:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 网页版：摄像头地址是全站共享的接入配置，仍限管理员修改
  // 桌面端：本机单用户使用，地址等价于「我的设备接入配置」，开放给当前用户
  if (!IS_DESKTOP_APP && user.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = payloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const normalized = {
      cameraAUrl: parsed.data.cameraAUrl.trim().slice(0, 2000),
      cameraBUrl: parsed.data.cameraBUrl.trim().slice(0, 2000)
    }

    // 桌面端叠加落盘：写入 <userData>/server-data/desktop-settings.json，
    // 与嵌入式 PG 双保险 —— 即使 PG 数据目录被重建，用户填的地址也不会丢。
    if (IS_DESKTOP_APP) {
      await persistCameraUrlsToDesktopSettings(normalized)
    }

    await updateGreenhouseCameraUrls(normalized)
    return NextResponse.json({ success: true, urls: normalized })
  } catch (error) {
    console.error("Failed to update greenhouse camera urls:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

/**
 * 桌面端：把摄像头地址持久化到 <userData>/server-data/desktop-settings.json。
 *
 * 但 Next 子进程拿不到 userData 绝对路径（只有 Launcher 知道），因此这里走
 * 一个约定路径：由 Launcher 通过 STRAVISION_DATA_ROOT 环境变量告知数据根目录。
 * 拿不到就静默跳过（PG 已存了一份，不阻塞保存）。
 */
async function persistCameraUrlsToDesktopSettings(urls: {
  cameraAUrl: string
  cameraBUrl: string
}): Promise<void> {
  const dataRoot = process.env.STRAVISION_DATA_ROOT
  if (!dataRoot) return
  try {
    const fs = await import("node:fs/promises")
    const path = await import("node:path")
    const file = path.join(dataRoot, "desktop-settings.json")

    let current: Record<string, unknown> = {}
    try {
      current = JSON.parse(await fs.readFile(file, "utf8")) as Record<string, unknown>
    } catch {
      current = {}
    }

    current.cameras = {
      cameraAUrl: urls.cameraAUrl,
      cameraBUrl: urls.cameraBUrl,
      updatedAt: Date.now(),
    }

    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, JSON.stringify(current, null, 2), { mode: 0o600 })
  } catch (e) {
    console.warn("[CameraSettings] 落盘 desktop-settings.json 失败（已保存到数据库）:", e)
  }
}
