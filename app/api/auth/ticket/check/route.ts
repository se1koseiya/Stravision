import { NextResponse } from "next/server"
import { getTicket, deleteTicket } from "@/lib/db/ticket-service"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const ticketId = url.searchParams.get("ticket")

  if (!ticketId) {
    return NextResponse.json({ error: "Missing ticket" }, { status: 400 })
  }

  const ticket = await getTicket(ticketId)

  if (!ticket) {
    // Ticket 不存在或已过期
    return NextResponse.json({ status: "pending" })
  }

  if (ticket.jwt) {
    // 登录成功
    const res = NextResponse.json({ status: "success" })
    
    // 设置 Cookie
    res.cookies.set("auth", ticket.jwt, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // 强制允许 HTTP
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 天
    })

    // 删除 ticket，防止重放
    await deleteTicket(ticketId)

    return res
  }

  // 等待中
  return NextResponse.json({ status: "pending" })
}
