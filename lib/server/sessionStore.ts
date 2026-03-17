import { promises as fs } from "fs"
import path from "path"

export type ChatMessage = {
  role: "user" | "assistant"
  content: string
  citations?: Array<{ number: string; title: string; url: string; description?: string; quote?: string }>
  reasoning?: { text: string; durationMs?: number }
  tasks?: Array<{ title: string; items: Array<{ type: "text" | "file"; text: string; file?: { name: string; icon?: string } }>; status: "pending" | "in_progress" | "completed" }>
}

type SessionMeta = { id: string; title: string; createdAt: number; updatedAt: number; userId?: number }
type Store = { sessions: SessionMeta[]; messagesById: Record<string, ChatMessage[]> }

const DATA_DIR = path.join(process.cwd(), "data")
const FILE_PATH = path.join(DATA_DIR, "sessions.json")

async function ensureFile(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.access(FILE_PATH)
  } catch {
    const empty: Store = { sessions: [], messagesById: {} }
    await fs.writeFile(FILE_PATH, JSON.stringify(empty, null, 2), "utf-8")
  }
}

async function readStore(): Promise<Store> {
  await ensureFile()
  const raw = await fs.readFile(FILE_PATH, "utf-8")
  try {
    const parsed = JSON.parse(raw) as unknown
    const store = parsed as Store
    if (!store.sessions) store.sessions = []
    if (!store.messagesById) store.messagesById = {}
    return store
  } catch {
    const empty: Store = { sessions: [], messagesById: {} }
    await fs.writeFile(FILE_PATH, JSON.stringify(empty, null, 2), "utf-8")
    return empty
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), "utf-8")
}

export async function listSessions(userId?: number): Promise<SessionMeta[]> {
  const store = await readStore()
  let sessions = store.sessions
  if (userId !== undefined) {
    sessions = sessions.filter(s => s.userId === userId)
  }
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function createSession(title: string, userId?: number): Promise<SessionMeta> {
  const store = await readStore()
  const id = `${Date.now()}`
  const now = Date.now()
  const meta: SessionMeta = { id, title, createdAt: now, updatedAt: now, userId }
  store.sessions.push(meta)
  store.messagesById[id] = []
  await writeStore(store)
  return meta
}

export async function getMessages(id: string, userId?: number): Promise<ChatMessage[] | null> {
  const store = await readStore()
  const session = store.sessions.find(s => s.id === id)
  
  // If session doesn't exist, return null or empty?
  // If userId is provided, check ownership
  if (userId !== undefined && session && session.userId !== undefined && session.userId !== userId) {
    // Unauthorized access attempt or just not found for this user
    return null 
  }
  
  return store.messagesById[id] ?? []
}

export async function saveMessages(id: string, messages: ChatMessage[], userId?: number): Promise<void> {
  const store = await readStore()
  
  // Check if session exists
  let meta = store.sessions.find(s => s.id === id)
  
  if (!meta) {
    // Create new session if not exists (though usually createSession is called first)
    const title = `会话 ${id}`
    const now = Date.now()
    meta = { id, title, createdAt: now, updatedAt: now, userId }
    store.sessions.push(meta)
    store.messagesById[id] = []
  } else {
    // If session exists, check ownership if userId provided
    if (userId !== undefined && meta.userId !== undefined && meta.userId !== userId) {
      throw new Error("Unauthorized access to session")
    }
    meta.updatedAt = Date.now()
  }
  
  store.messagesById[id] = messages
  await writeStore(store)
}

export async function deleteSession(id: string, userId?: number): Promise<void> {
  const store = await readStore()
  
  if (userId !== undefined) {
    const session = store.sessions.find(s => s.id === id)
    if (session && session.userId !== undefined && session.userId !== userId) {
      throw new Error("Unauthorized delete attempt")
    }
  }
  
  store.sessions = store.sessions.filter(s => s.id !== id)
  delete store.messagesById[id]
  await writeStore(store)
}

export async function updateSessionTitle(id: string, title: string, userId?: number): Promise<void> {
  const store = await readStore()
  const meta = store.sessions.find(s => s.id === id)
  if (meta) {
    if (userId !== undefined && meta.userId !== undefined && meta.userId !== userId) {
      throw new Error("Unauthorized update attempt")
    }
    meta.title = title
    meta.updatedAt = Date.now()
    await writeStore(store)
  }
}
