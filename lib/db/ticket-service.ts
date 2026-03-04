import { execute, queryOne, initDB } from "./database"

export interface LoginTicket {
  ticket: string
  jwt?: string
  created_at: number
}

// 清理过期 ticket (10分钟)
async function cleanupTickets() {
  await initDB()
  const expireTime = Date.now() - 10 * 60 * 1000
  await execute("DELETE FROM login_tickets WHERE created_at < $1", [expireTime])
}

export async function createTicket(ticket: string): Promise<void> {
  await cleanupTickets()
  await execute("INSERT INTO login_tickets (ticket, created_at) VALUES ($1, $2)", [ticket, Date.now()])
}

export async function updateTicketWithJwt(ticket: string, jwt: string): Promise<void> {
  await execute("UPDATE login_tickets SET jwt = $1 WHERE ticket = $2", [jwt, ticket])
}

export async function getTicket(ticket: string): Promise<LoginTicket | undefined> {
  const row = await queryOne<LoginTicket>("SELECT * FROM login_tickets WHERE ticket = $1", [ticket])
  return row ?? undefined
}

export async function deleteTicket(ticket: string): Promise<void> {
  await execute("DELETE FROM login_tickets WHERE ticket = $1", [ticket])
}
