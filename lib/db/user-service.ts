import bcrypt from "bcryptjs"
import { initDB, query, queryOne, execute } from "./database"

// 确保数据库已初始化的 Promise
let dbInitPromise: Promise<void> | null = null

/**
 * 确保数据库已初始化
 */
async function ensureDB() {
  if (!dbInitPromise) {
    dbInitPromise = initDB()
  }
  await dbInitPromise
}

export type UserRole = 'user' | 'admin' | 'super_admin';
export type MembershipTier = 'free' | 'pro' | 'plus';

/**
 * 完整的用户数据模型(包含敏感字段)
 */
export interface User {
  id: number
  uid: string // Unified User ID
  email: string
  password_hash: string
  username: string
  avatar_url: string | null
  role: UserRole
  membership: MembershipTier
  permissions: string
  notification_settings: string
  wechat_openid?: string | null
  wechat_unionid?: string | null
  wework_userid?: string | null
  qq_openid?: string | null
  alipay_user_id?: string | null
  created_at: number
  updated_at: number
  // AI 积分制字段（credit-service）
  daily_ai_limit?: number | null
  daily_ai_usage?: number | null
  ai_balance?: number | null
  monthly_credit_quota?: number | string | null
  monthly_credit_used?: number | string | null
  credit_balance?: number | string | null
  credit_cycle_date?: string | null
}

export interface UserPermissions {
  allowedControls?: string[];
  [key: string]: unknown;
}

export interface NotificationSettings {
  alerts: boolean;
  status: boolean;
  ai: boolean;
  updates: boolean;
  [key: string]: boolean;
}

/**
 * 公开的用户信息(移除敏感字段)
 */
export interface UserPublic {
  id: number
  uid: string
  email: string
  username: string
  avatar_url: string | null
  role: UserRole
  membership: MembershipTier
  permissions: UserPermissions
  notification_settings: NotificationSettings
  created_at: number
  // AI 配额相关字段（用户自身可见，管理后台可编辑）
  daily_ai_limit?: number
  daily_ai_usage?: number
  ai_balance?: number
  /** 个性化月度积分额度（0 = 跟随会员等级默认额度） */
  monthly_credit_quota?: number
  /** 本月已用积分（credit_cycle_date 为当前月才有效） */
  monthly_credit_used?: number
  /** 充值积分余额 */
  credit_balance?: number
  /** 积分周期 yyyy-mm */
  credit_cycle_date?: string
}

/**
 * 创建用户的输入参数
 */
export interface CreateUserInput {
  email: string
  password: string
  username: string
  role?: UserRole
  membership?: MembershipTier
  permissions?: UserPermissions
  notification_settings?: NotificationSettings
}

/**
 * 更新用户的输入参数
 */
export interface UpdateUserInput {
  username?: string
  avatar_url?: string | null
  password?: string
  role?: UserRole
  membership?: MembershipTier
  permissions?: UserPermissions
  notification_settings?: NotificationSettings
  daily_ai_limit?: number
  ai_balance?: number
  /** 个性化月度积分额度（0 = 跟随等级默认） */
  monthly_credit_quota?: number
  /** 充值积分余额 */
  credit_balance?: number
}

/**
 * 将完整用户对象转换为公开用户信息
 * 移除敏感字段如 password_hash 和 updated_at
 */
export function toPublicUser(user: User): UserPublic {
  let permissions: UserPermissions = {};
  try {
    permissions = JSON.parse(user.permissions || '{}');
  } catch (e) {
    console.error('Failed to parse permissions:', e);
  }

  let notification_settings: NotificationSettings = {
    alerts: true,
    status: true,
    ai: false,
    updates: true,
  }
  try {
    const parsed = JSON.parse(user.notification_settings || '{}')
    notification_settings = { ...notification_settings, ...(parsed || {}) }
  } catch (e) {
    console.error('Failed to parse notification_settings:', e);
  }

  // Ensure role is a valid UserRole, default to 'user' if invalid/missing
  const role: UserRole = (['user', 'admin', 'super_admin'].includes(user.role) 
    ? user.role 
    : 'user') as UserRole;

  const membership: MembershipTier = (['free', 'pro', 'plus'].includes(user.membership)
    ? user.membership
    : 'free') as MembershipTier;

  return {
    // BIGSERIAL(int8) 经 pg 返回字符串，统一转数字以匹配 UserPublic.id: number，
    // 避免 `typeof id === 'number'` 之类的运行时判断被字符串误伤
    id: Number(user.id),
    uid: user.uid,
    email: user.email,
    username: user.username,
    avatar_url: user.avatar_url,
    role: role,
    membership: membership,
    permissions: permissions,
    notification_settings,
    created_at: user.created_at,
    daily_ai_limit: toNum(user.daily_ai_limit),
    daily_ai_usage: toNum(user.daily_ai_usage),
    ai_balance: toNum(user.ai_balance),
    // NUMERIC 列经 pg 返回字符串，统一转数字
    monthly_credit_quota: toNum(user.monthly_credit_quota),
    monthly_credit_used: toNum(user.monthly_credit_used),
    credit_balance: toNum(user.credit_balance),
    credit_cycle_date: user.credit_cycle_date ?? undefined,
  }
}

function toNum(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/**
 * 获取所有用户列表
 */
export async function getAllUsers(): Promise<UserPublic[]> {
  await ensureDB()
  const users = await query<User>("SELECT * FROM users ORDER BY created_at DESC")
  return users.map(toPublicUser)
}

import fs from 'node:fs';
import path from 'node:path';

/**
 * 获取随机默认头像
 */
function getRandomDefaultAvatar(): string {
  try {
    // Note: In a production environment (especially Vercel/Serverless), 
    // reading the file system at runtime to count files might be tricky or slow.
    // However, since this is a local project or a standard server environment,
    // we can read the directory. 
    // For better performance, we could cache this count, but for now, direct read is fine or we fallback to a safe number.
    
    // We hardcode the path relative to process.cwd() usually.
    // In Next.js, public assets are in ./public
    const avatarDir = path.join(process.cwd(), 'public', 'images', 'user_default_avatar');
    
    // Check if directory exists
    if (fs.existsSync(avatarDir)) {
      const files = fs.readdirSync(avatarDir).filter(file => /\.(png|jpg|jpeg|svg|webp)$/i.test(file));
      if (files.length > 0) {
        const randomFile = files[Math.floor(Math.random() * files.length)];
        return `/images/user_default_avatar/${randomFile}`;
      }
    }
  } catch (e) {
    console.error("Failed to read default avatar directory:", e);
  }
  
  // Fallback if directory read fails
  const count = 7; 
  const index = Math.floor(Math.random() * count) + 1;
  return `/images/user_default_avatar/avatar${index}.png`;
}

/**
 * 创建新用户
 * @param input 用户创建输入参数
 * @returns 创建的用户公开信息
 * @throws 如果邮箱已存在或数据库操作失败
 */
export async function createUser(input: CreateUserInput): Promise<UserPublic> {
  await ensureDB()
  const now = Date.now()

  // 检查邮箱是否已存在
  const existingUser = await getUserByEmail(input.email)
  if (existingUser) {
    throw new Error("该邮箱已被注册")
  }

  // 哈希密码
  const password_hash = await bcrypt.hash(input.password, 10)
  const role = input.role || 'user';
  const membership = input.membership || 'free';
  const daily_ai_limit = membership === 'plus' ? 999999 : (membership === 'pro' ? 70 : 0);
  const permissions = JSON.stringify(input.permissions || {});
  const notification_settings = JSON.stringify(input.notification_settings || {
    alerts: true,
    status: true,
    ai: false,
    updates: true,
  })

  // 生成 UID
  const generateUid = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  let uid = generateUid();

  // 设置默认头像
  const avatar_url = getRandomDefaultAvatar();

  // 插入新用户
  const insertUser = async (uidValue: string) => {
    const row = await queryOne<{ id: number }>(
      `INSERT INTO users (email, password_hash, username, role, membership, permissions, notification_settings, uid, avatar_url, created_at, updated_at, daily_ai_limit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [input.email, password_hash, input.username, role, membership, permissions, notification_settings, uidValue, avatar_url, now, now, daily_ai_limit]
    )
    if (!row) {
      throw new Error("创建用户后无法获取用户信息")
    }
    return row.id
  }

  try {
    let userId: number
    try {
      userId = await insertUser(uid)
    } catch (e: any) {
      if (e?.code === "23505" && `${e?.constraint || ""}`.includes("users_uid")) {
        uid = generateUid()
        userId = await insertUser(uid)
      } else {
        throw e
      }
    }

    const user = await getUserById(userId)
    if (!user) {
      throw new Error("创建用户后无法获取用户信息")
    }

    return toPublicUser(user)
  } catch (error: any) {
    if (error?.code === "23505") {
      const constraint = `${error?.constraint || ""}`
      if (constraint.includes("users_email") || `${error?.detail || ""}`.includes("(email)")) {
        throw new Error("该邮箱已被注册")
      }
    }
    throw error
  }
}

/**
 * 通过邮箱查询用户
 * @param email 用户邮箱
 * @returns 用户对象或 null
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  await ensureDB()
  const user = await queryOne<User>("SELECT * FROM users WHERE email = $1", [email])
  return user || null
}

export async function getUserByQQOpenId(openid: string): Promise<User | null> {
  await ensureDB()
  const user = await queryOne<User>("SELECT * FROM users WHERE qq_openid = $1", [openid])
  return user || null
}

/**
 * 通过ID查询用户
 * @param id 用户ID
 * @returns 用户对象或 null
 */
export async function getUserById(id: number): Promise<User | null> {
  await ensureDB()
  const user = await queryOne<User>("SELECT * FROM users WHERE id = $1", [id])
  return user || null
}

export async function getUserByWeChatOpenId(openid: string): Promise<User | null> {
  await ensureDB()
  const user = await queryOne<User>("SELECT * FROM users WHERE wechat_openid = $1", [openid])
  return user || null
}

export async function getUserByWeChatUnionId(unionid: string): Promise<User | null> {
  await ensureDB()
  const user = await queryOne<User>("SELECT * FROM users WHERE wechat_unionid = $1", [unionid])
  return user || null
}

export async function getUserByWeWorkUserId(userid: string): Promise<User | null> {
  await ensureDB()
  const user = await queryOne<User>("SELECT * FROM users WHERE wework_userid = $1", [userid])
  return user || null
}

/**
 * 更新用户信息
 * @param id 用户ID
 * @param input 更新输入参数
 * @returns 更新后的用户公开信息
 * @throws 如果用户不存在或数据库操作失败
 */
export async function updateUser(id: number, input: UpdateUserInput): Promise<UserPublic> {
  await ensureDB()
  const now = Date.now()

  // 检查用户是否存在
  const existingUser = await getUserById(id)
  if (!existingUser) {
    throw new Error("用户不存在")
  }

  // 构建更新语句
  const updates: string[] = []
  const values: (string | number | null)[] = []

  if (input.username !== undefined) {
    updates.push(`username = $${values.length + 1}`)
    values.push(input.username)
  }

  if (input.avatar_url !== undefined) {
    updates.push(`avatar_url = $${values.length + 1}`)
    values.push(input.avatar_url)
  }

  if (input.password !== undefined) {
    const password_hash = await bcrypt.hash(input.password, 10)
    updates.push(`password_hash = $${values.length + 1}`)
    values.push(password_hash)
  }

  if (input.role !== undefined) {
    updates.push(`role = $${values.length + 1}`)
    values.push(input.role)
  }

  if (input.membership !== undefined) {
    updates.push(`membership = $${values.length + 1}`)
    values.push(input.membership)
    
    // Auto-update daily_ai_limit based on membership if not explicitly provided
    if (input.daily_ai_limit === undefined) {
       let limit = 0;
       if (input.membership === 'pro') limit = 70;
       else if (input.membership === 'plus') limit = 999999;
       
       updates.push(`daily_ai_limit = $${values.length + 1}`)
       values.push(limit)
    }
  }

  if (input.permissions !== undefined) {
    updates.push(`permissions = $${values.length + 1}`)
    values.push(JSON.stringify(input.permissions))
  }

  if (input.daily_ai_limit !== undefined) {
    updates.push(`daily_ai_limit = $${values.length + 1}`)
    values.push(input.daily_ai_limit)
  }

  if (input.ai_balance !== undefined) {
    updates.push(`ai_balance = $${values.length + 1}`)
    values.push(input.ai_balance)
  }

  if (input.monthly_credit_quota !== undefined) {
    updates.push(`monthly_credit_quota = $${values.length + 1}`)
    values.push(Math.max(0, Number(input.monthly_credit_quota) || 0))
  }

  if (input.credit_balance !== undefined) {
    updates.push(`credit_balance = $${values.length + 1}`)
    values.push(Math.max(0, Number(input.credit_balance) || 0))
  }

  if (updates.length === 0) {
    // 没有需要更新的字段,直接返回当前用户
    return toPublicUser(existingUser)
  }

  // 添加 updated_at
  updates.push(`updated_at = $${values.length + 1}`)
  values.push(now)

  values.push(id)
  const idParam = `$${values.length}`
  await execute(`UPDATE users SET ${updates.join(", ")} WHERE id = ${idParam}`, values)

  // 获取更新后的用户
  const updatedUser = await getUserById(id)
  if (!updatedUser) {
    throw new Error("更新用户后无法获取用户信息")
  }

  return toPublicUser(updatedUser)
}

/**
 * 验证用户凭证(邮箱和密码)
 * @param email 用户邮箱
 * @param password 用户密码(明文)
 * @returns 验证成功返回用户公开信息,失败返回 null
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<UserPublic | null> {
  await ensureDB()
  // 通过邮箱查询用户
  const user = await getUserByEmail(email)
  if (!user) {
    return null
  }

  // 验证密码
  const isValid = await bcrypt.compare(password, user.password_hash)
  if (!isValid) {
    return null
  }

  // 返回公开用户信息
  return toPublicUser(user)
}

export async function findOrCreateWeChatUser(params: {
  openid: string
  unionid?: string
  nickname?: string
  avatar?: string | null
}): Promise<UserPublic> {
  await ensureDB()
  const now = Date.now()

  let existingUser: User | null = null
  if (params.unionid) {
    existingUser = await getUserByWeChatUnionId(params.unionid)
  }
  if (!existingUser) {
    existingUser = await getUserByWeChatOpenId(params.openid)
  }

  if (existingUser) {
    const updates: string[] = []
    const values: (string | number | null)[] = []

    if (params.nickname && params.nickname !== existingUser.username) {
      updates.push(`username = $${values.length + 1}`)
      values.push(params.nickname)
    }
    if (params.avatar !== undefined && params.avatar !== existingUser.avatar_url) {
      updates.push(`avatar_url = $${values.length + 1}`)
      values.push(params.avatar)
    }

    updates.push(`updated_at = $${values.length + 1}`)
    values.push(now)
    values.push(existingUser.id)

    if (updates.length > 1) {
      const idParam = `$${values.length}`
      await execute(`UPDATE users SET ${updates.join(", ")} WHERE id = ${idParam}`, values)
    }

    const updated = await getUserById(existingUser.id)
    if (!updated) {
      throw new Error("更新微信用户后无法获取用户信息")
    }
    return toPublicUser(updated)
  }

  const email = `wechat_${(params.unionid || params.openid)}@wx.local`
  const insertRow = await queryOne<{ id: number }>(
    `INSERT INTO users (email, password_hash, username, avatar_url, wechat_openid, wechat_unionid, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      email,
      "",
      params.nickname || "微信用户",
      params.avatar || getRandomDefaultAvatar(),
      params.openid,
      params.unionid || null,
      now,
      now
    ]
  )
  const newId = insertRow?.id
  if (!newId) {
    throw new Error("创建微信用户后无法获取用户信息")
  }
  const created = await getUserById(newId)
  if (!created) {
    throw new Error("创建微信用户后无法获取用户信息")
  }
  return toPublicUser(created)
}

export async function findOrCreateWeWorkUser(params: {
  userid: string
  name?: string
  avatar?: string | null
  email?: string
}): Promise<UserPublic> {
  await ensureDB()
  const now = Date.now()

  // 1. 尝试通过 wework_userid 查找
  let existingUser = await getUserByWeWorkUserId(params.userid)

  // 2. 如果没找到，但提供了 email，尝试通过 email 查找（用于关联已有账号）
  if (!existingUser && params.email) {
    existingUser = await getUserByEmail(params.email)
    
    // 如果找到了对应邮箱的用户，更新其 wework_userid
    if (existingUser && !existingUser.wework_userid) {
      await execute("UPDATE users SET wework_userid = $1, updated_at = $2 WHERE id = $3", [
        params.userid,
        now,
        existingUser.id
      ])
      existingUser = await getUserById(existingUser.id)
    }
  }

  if (existingUser) {
    const updates: string[] = []
    const values: (string | number | null)[] = []

    // 只有当现有用户名是默认格式时，或者没有头像时才更新
    // 避免覆盖用户自定义的资料
    if (params.name && (existingUser.username === `wework_${params.userid}` || !existingUser.username)) {
      updates.push(`username = $${values.length + 1}`)
      values.push(params.name)
    }
    if (params.avatar && !existingUser.avatar_url) {
      updates.push(`avatar_url = $${values.length + 1}`)
      values.push(params.avatar)
    }

    if (updates.length > 0) {
      updates.push(`updated_at = $${values.length + 1}`)
      values.push(now)
      values.push(existingUser.id)
      const idParam = `$${values.length}`
      await execute(`UPDATE users SET ${updates.join(", ")} WHERE id = ${idParam}`, values)
    }

    const updated = await getUserById(existingUser.id)
    if (!updated) {
      throw new Error("更新企业微信用户后无法获取用户信息")
    }
    return toPublicUser(updated)
  }

  // 创建新用户
  // 使用企业微信提供的邮箱，如果没有则生成一个虚拟邮箱
  const userEmail = params.email || `wework_${params.userid}@wework.local`

  try {
      const insertRow = await queryOne<{ id: number }>(
        `INSERT INTO users (email, password_hash, username, avatar_url, wework_userid, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          userEmail,
          "",
          params.name || `企业微信用户`,
          params.avatar || getRandomDefaultAvatar(),
          params.userid,
          now,
          now
        ]
      )
      const newId = insertRow?.id
      if (!newId) {
        throw new Error("创建企业微信用户后无法获取用户信息")
      }
      const created = await getUserById(newId)
      if (!created) {
        throw new Error("创建企业微信用户后无法获取用户信息")
      }
      return toPublicUser(created)
  } catch (error: any) {
     if (error?.code === "23505") {
       const retryEmail = params.email
         ? `conflict_${Date.now()}_${params.email}`
         : `wework_${params.userid}_${Date.now()}@wework.local`
       const retryRow = await queryOne<{ id: number }>(
         `INSERT INTO users (email, password_hash, username, avatar_url, wework_userid, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
         [
           retryEmail,
           "",
           params.name || `企业微信用户`,
           params.avatar || getRandomDefaultAvatar(),
           params.userid,
           now,
           now
         ]
       )
       const newId = retryRow?.id
       if (!newId) throw new Error("创建企业微信用户(重试)后无法获取用户信息")
       const created = await getUserById(newId)
       if (!created) throw new Error("创建企业微信用户(重试)后无法获取用户信息")
       return toPublicUser(created)
     }
     throw error
  }
}

export async function findOrCreateQQUser(params: {
  openid: string
  nickname?: string
  avatar?: string | null
}): Promise<UserPublic> {
  await ensureDB()
  const now = Date.now()

  let existingUser = await getUserByQQOpenId(params.openid)

  if (existingUser) {
    const updates: string[] = []
    const values: (string | number | null)[] = []

    if (params.nickname && params.nickname !== existingUser.username) {
      updates.push(`username = $${values.length + 1}`)
      values.push(params.nickname)
    }
    if (params.avatar && params.avatar !== existingUser.avatar_url) {
      updates.push(`avatar_url = $${values.length + 1}`)
      values.push(params.avatar)
    }

    if (updates.length > 0) {
      updates.push(`updated_at = $${values.length + 1}`)
      values.push(now)
      values.push(existingUser.id)
      const idParam = `$${values.length}`
      await execute(`UPDATE users SET ${updates.join(", ")} WHERE id = ${idParam}`, values)
    }

    const updated = await getUserById(existingUser.id)
    if (!updated) {
      throw new Error("更新QQ用户后无法获取用户信息")
    }
    return toPublicUser(updated)
  }

  const email = `qq_${params.openid}@qq.local`
  try {
    const insertRow = await queryOne<{ id: number }>(
      `INSERT INTO users (email, password_hash, username, avatar_url, qq_openid, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        email,
        "",
        params.nickname || `QQ用户`,
        params.avatar || getRandomDefaultAvatar(),
        params.openid,
        now,
        now
      ]
    )
    const newId = insertRow?.id
    if (!newId) {
      throw new Error("创建QQ用户后无法获取用户信息")
    }
    const created = await getUserById(newId)
    if (!created) {
      throw new Error("创建QQ用户后无法获取用户信息")
    }
    return toPublicUser(created)
  } catch (error) {
    throw error
  }
}

export async function getUserByAlipayUserId(userId: string): Promise<User | null> {
  await ensureDB()
  const user = await queryOne<User>("SELECT * FROM users WHERE alipay_user_id = $1", [userId])
  return user || null
}

export async function findOrCreateAlipayUser(params: {
  userId: string
  nickname?: string
  avatar?: string | null
}): Promise<UserPublic> {
  await ensureDB()
  const now = Date.now()

  let existingUser = await getUserByAlipayUserId(params.userId)

  if (existingUser) {
    const updates: string[] = []
    const values: (string | number | null)[] = []

    if (params.nickname && params.nickname !== existingUser.username) {
      updates.push(`username = $${values.length + 1}`)
      values.push(params.nickname)
    }
    if (params.avatar !== undefined && params.avatar !== existingUser.avatar_url) {
      updates.push(`avatar_url = $${values.length + 1}`)
      values.push(params.avatar)
    }

    if (updates.length > 0) {
      updates.push(`updated_at = $${values.length + 1}`)
      values.push(now)
      values.push(existingUser.id)
      const idParam = `$${values.length}`
      await execute(`UPDATE users SET ${updates.join(", ")} WHERE id = ${idParam}`, values)
    }

    const updated = await getUserById(existingUser.id)
    if (!updated) {
      throw new Error("更新支付宝用户后无法获取用户信息")
    }
    return toPublicUser(updated)
  }

  const email = `alipay_${params.userId}@alipay.local`

  try {
    const insertRow = await queryOne<{ id: number }>(
      `INSERT INTO users (email, password_hash, username, avatar_url, alipay_user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        email,
        "",
        params.nickname || "支付宝用户",
        params.avatar || getRandomDefaultAvatar(),
        params.userId,
        now,
        now
      ]
    )
    const newId = insertRow?.id
    if (!newId) {
      throw new Error("创建支付宝用户后无法获取用户信息")
    }
    const created = await getUserById(newId)
    if (!created) {
      throw new Error("创建支付宝用户后无法获取用户信息")
    }
    return toPublicUser(created)
  } catch (error) {
    throw error
  }
}
