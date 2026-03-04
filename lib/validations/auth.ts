import { z } from "zod"

export const usernameSchema = z
  .string()
  .min(2, "用户名长度需在2-20个字符之间")
  .max(20, "用户名长度需在2-20个字符之间")
  // Allow letters, numbers, underscores, hyphens, and Chinese characters
  // Prevent dangerous characters like < > / \ ' "
  .regex(/^[a-zA-Z0-9_\-\u4e00-\u9fa5]+$/, "用户名只能包含字母、数字、下划线、连字符和中文字符")

export const passwordSchema = z
  .string()
  .min(8, "密码至少需要8个字符")
  .max(100, "密码过长")

export const emailSchema = z
  .string()
  .email("邮箱格式不正确")
  .toLowerCase()
  .trim()

export const avatarUrlSchema = z
  .string()
  .optional()
  .nullable()
  .refine((val) => {
    if (!val) return true
    // Allow relative paths starting with /
    if (val.startsWith("/")) return true
    try {
      const url = new URL(val)
      // Only allow http and https protocols to prevent javascript: XSS
      return ["http:", "https:"].includes(url.protocol)
    } catch {
      return false
    }
  }, "头像 URL 必须是有效的 HTTP/HTTPS 链接或相对路径")

export const loginSchema = z.object({
  email: z.string().trim(), // Allow non-email username login if we wanted, but here we strictly use email
  password: z.string(),
})

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
})

export const updateUserSchema = z.object({
  username: usernameSchema.optional(),
  avatar_url: avatarUrlSchema,
})
