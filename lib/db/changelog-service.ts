import { query, queryOne, execute } from "./database"

/* -------------------------------------------------------------------------- */
/* 产品更新日志（changelog_entries）                                            */
/* -------------------------------------------------------------------------- */

export type ChangelogTag = "new" | "improve" | "fix"

export interface ChangelogItem {
  tag: ChangelogTag
  text: string
}

export interface ChangelogEntry {
  id: number
  version: string
  /** 本版主题（列表里的绿色小标题） */
  title: string
  /** 一句话摘要 */
  summary: string
  /** 发布日期 YYYY-MM-DD */
  releasedAt: string
  items: ChangelogItem[]
  published: boolean
  createdAt: number
  updatedAt: number
}

interface Row {
  id: number | string
  version: string
  title: string | null
  summary: string | null
  released_at: string
  items: ChangelogItem[] | string
  published: number | boolean
  created_at: number | string
  updated_at: number | string
}

function parseItems(raw: ChangelogItem[] | string): ChangelogItem[] {
  let arr: ChangelogItem[] = []
  try {
    arr = typeof raw === "string" ? JSON.parse(raw) : raw
  } catch {
    arr = []
  }
  if (!Array.isArray(arr)) return []
  return arr
    .filter((i) => i && typeof i.text === "string" && i.text.trim())
    .map((i) => ({ tag: (["new", "improve", "fix"].includes(i.tag) ? i.tag : "new") as ChangelogTag, text: i.text.trim() }))
}

function toEntry(r: Row): ChangelogEntry {
  return {
    id: Number(r.id),
    version: r.version,
    title: r.title ?? "",
    summary: r.summary ?? "",
    releasedAt: r.released_at,
    items: parseItems(r.items),
    published: Number(r.published) === 1,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  }
}

/** 公开列表：仅已发布，按日期倒序 */
export async function listPublishedChangelog(): Promise<ChangelogEntry[]> {
  const rows = await query<Row>(
    "SELECT * FROM changelog_entries WHERE published = 1 ORDER BY released_at DESC, version DESC"
  )
  return rows.map(toEntry)
}

/** 管理列表：含未发布 */
export async function listAllChangelog(): Promise<ChangelogEntry[]> {
  const rows = await query<Row>(
    "SELECT * FROM changelog_entries ORDER BY released_at DESC, version DESC"
  )
  return rows.map(toEntry)
}

export async function getChangelogById(id: number): Promise<ChangelogEntry | null> {
  const row = await queryOne<Row>("SELECT * FROM changelog_entries WHERE id = $1", [id])
  return row ? toEntry(row) : null
}

export interface ChangelogInput {
  version: string
  title?: string
  summary?: string
  releasedAt: string
  items: ChangelogItem[]
  published?: boolean
}

export async function createChangelog(input: ChangelogInput): Promise<ChangelogEntry> {
  const now = Date.now()
  const row = await queryOne<Row>(
    `INSERT INTO changelog_entries (version, title, summary, released_at, items, published, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
    [
      input.version.trim(),
      input.title?.trim() ?? "",
      input.summary?.trim() ?? "",
      input.releasedAt,
      JSON.stringify(input.items),
      input.published === false ? 0 : 1,
      now,
    ]
  )
  return toEntry(row as Row)
}

export async function updateChangelog(id: number, input: ChangelogInput): Promise<ChangelogEntry | null> {
  const row = await queryOne<Row>(
    `UPDATE changelog_entries
     SET version=$2, title=$3, summary=$4, released_at=$5, items=$6, published=$7, updated_at=$8
     WHERE id=$1 RETURNING *`,
    [
      id,
      input.version.trim(),
      input.title?.trim() ?? "",
      input.summary?.trim() ?? "",
      input.releasedAt,
      JSON.stringify(input.items),
      input.published === false ? 0 : 1,
      Date.now(),
    ]
  )
  return row ? toEntry(row) : null
}

export async function deleteChangelog(id: number): Promise<boolean> {
  const res = await execute("DELETE FROM changelog_entries WHERE id = $1", [id])
  return res.rowCount > 0
}
