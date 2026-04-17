import { NextRequest } from "next/server"
import { getSpectrumDataSource, updateSpectrumDataSource, SpectrumDataSource } from "@/lib/db/settings-service"
import { getCurrentUser } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 })
    }

    const source = await getSpectrumDataSource()
    return Response.json({ source })
  } catch (error: any) {
    console.error("Error fetching spectrum data source:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { source } = await req.json()
    
    if (source !== "mcp" && source !== "mqtt") {
      return Response.json({ error: "Invalid source. Must be 'mcp' or 'mqtt'" }, { status: 400 })
    }

    await updateSpectrumDataSource(source as SpectrumDataSource)
    return Response.json({ success: true, source })
  } catch (error: any) {
    console.error("Error updating spectrum data source:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
