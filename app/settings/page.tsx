"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion } from "framer-motion"
import { Save, Upload, X, ArrowLeft, Bell, Mail, User, Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PageNavigation } from "@/components/page-navigation"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import type { UserPublic } from "@/lib/db/user-service"
import { cn } from "@/lib/utils"

// --- Animations ---
const fadeInUp = {
   hidden: { opacity: 0, y: 20 },
   visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
   }
}

const staggerContainer = {
   hidden: { opacity: 0 },
   visible: {
      opacity: 1,
      transition: {
         staggerChildren: 0.1,
         delayChildren: 0.2
      }
   }
}

export default function SettingsPage() {
   const router = useRouter()
   const { connectionStatus } = useDeviceData()

   // User authentication state
   const [currentUser, setCurrentUser] = useState<UserPublic | null>(null)
   const [isLoadingUser, setIsLoadingUser] = useState(true)

   // Form state
   const [username, setUsername] = useState("")
   const [email, setEmail] = useState("")
   const [avatarUrl, setAvatarUrl] = useState("")
   const [isSaving, setIsSaving] = useState(false)
   const [isUploading, setIsUploading] = useState(false)
   const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
   const [previewUrl, setPreviewUrl] = useState<string | null>(null)
   const fileInputRef = useRef<HTMLInputElement>(null)

   // Fetch current user on mount
   useEffect(() => {
      const fetchCurrentUser = async () => {
         try {
            const response = await fetch("/api/auth/me")
            const data = await response.json()

            if (data.authenticated && data.user) {
               setCurrentUser(data.user)
               setUsername(data.user.username)
               setEmail(data.user.email)
               setAvatarUrl(data.user.avatar_url || "")
            } else {
               router.push("/login")
            }
         } catch (error) {
            console.error("获取用户信息失败:", error)
            router.push("/login")
         } finally {
            setIsLoadingUser(false)
         }
      }

      fetchCurrentUser()
   }, [router])

   const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
      if (!allowedTypes.includes(file.type)) {
         setMessage({ type: "error", text: "只支持 JPG、PNG、GIF 和 WebP 格式的图片" })
         return
      }

      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
         setMessage({ type: "error", text: "文件大小不能超过 5MB" })
         return
      }

      setMessage(null)
      setIsUploading(true)

      try {
         const reader = new FileReader()
         reader.onloadend = () => {
            setPreviewUrl(reader.result as string)
         }
         reader.readAsDataURL(file)

         const formData = new FormData()
         formData.append("avatar", file)

         const response = await fetch("/api/user/upload-avatar", {
            method: "POST",
            body: formData,
         })

         const data = await response.json()

         if (response.ok) {
            setAvatarUrl(data.avatar_url)
            setMessage({ type: "success", text: "头像上传成功！请点击保存更改" })
         } else {
            setMessage({ type: "error", text: data.error || "上传失败，请重试" })
            setPreviewUrl(null)
         }
      } catch (error) {
         console.error("上传失败:", error)
         setMessage({ type: "error", text: "网络错误，请重试" })
         setPreviewUrl(null)
      } finally {
         setIsUploading(false)
      }
   }

   const handleRemoveAvatar = () => {
      setAvatarUrl("")
      setPreviewUrl(null)
      if (fileInputRef.current) {
         fileInputRef.current.value = ""
      }
   }

   const handleSave = async (e: React.FormEvent) => {
      e.preventDefault()
      setMessage(null)
      setIsSaving(true)

      try {
         const response = await fetch("/api/user/update", {
            method: "PUT",
            headers: {
               "Content-Type": "application/json",
            },
            body: JSON.stringify({
               username: username.trim(),
               avatar_url: avatarUrl.trim() || null,
            }),
         })

         const data = await response.json()

         if (response.ok) {
            setCurrentUser(data.user)
            setPreviewUrl(null)
            setMessage({ type: "success", text: "个人信息更新成功！" })
         } else {
            setMessage({ type: "error", text: data.error || "更新失败，请重试" })
         }
      } catch (error) {
         console.error("更新失败:", error)
         setMessage({ type: "error", text: "网络错误，请重试" })
      } finally {
         setIsSaving(false)
      }
   }

   if (isLoadingUser) return null
   if (!currentUser) return null

   return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">

         {/* Navigation */}
         <nav className="fixed top-0 w-full h-20 px-8 md:px-12 flex items-center justify-between z-50 bg-[#FAFAFA]/80 dark:bg-[#050505]/80 backdrop-blur-md">
            <div className="flex items-center gap-4">
               <div className="size-8 relative">
                  <Image src="/icon.png" alt="Logo" fill className="object-contain grayscale hover:grayscale-0 transition-all duration-500" />
               </div>
               <span className="text-xs font-bold tracking-[0.2em] uppercase hidden md:block opacity-40">Stravision OS</span>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
               <PageNavigation />
            </div>
            <div className="flex items-center gap-6">
               <button className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  <Bell className="size-5" />
               </button>
               <UserAvatarMenu user={currentUser} />
            </div>
         </nav>

         {/* Hero Header */}
         <header className="pt-40 pb-20 px-8 md:px-12 border-b border-zinc-200 dark:border-zinc-900 bg-white dark:bg-black relative overflow-hidden">
            <div className="max-w-4xl mx-auto relative z-10">
               <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={staggerContainer}
               >
                  <motion.div variants={fadeInUp}>
                     <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="mb-8 pl-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-transparent"
                     >
                        <ArrowLeft className="mr-2 size-4" />
                        返回个人中心
                     </Button>
                  </motion.div>

                  <motion.div variants={fadeInUp} className="mb-2">
                     <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-4">
                        编辑资料
                     </h1>
                     <p className="text-zinc-500 dark:text-zinc-400 text-lg">
                        更新您的个人信息和账户偏好设置
                     </p>
                  </motion.div>
               </motion.div>
            </div>

            {/* Background Elements */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-zinc-50 to-transparent dark:from-zinc-900/20 dark:to-transparent -z-10" />
         </header>

         {/* Content Area */}
         <main className="max-w-4xl mx-auto px-8 md:px-12 py-20">
            <motion.div
               initial="hidden"
               animate="visible"
               variants={staggerContainer}
               className="grid grid-cols-1 gap-16"
            >
               {/* Avatar Section */}
               <motion.section variants={fadeInUp} className="flex flex-col md:flex-row gap-12 items-start border-b border-zinc-100 dark:border-zinc-900 pb-16">
                  <div className="w-full md:w-1/3">
                     <h3 className="text-lg font-bold mb-2">头像</h3>
                     <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        支持 JPG、PNG、GIF 格式，最大 5MB
                     </p>
                  </div>

                  <div className="flex-1 flex gap-8 items-center">
                     <div className="relative group size-32 shrink-0">
                        <div className="size-32 rounded-full overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                           {(previewUrl || avatarUrl) ? (
                              <img
                                 src={previewUrl || avatarUrl}
                                 alt="Avatar"
                                 className="size-full object-cover"
                              />
                           ) : (
                              <div className="size-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-4xl font-light text-zinc-300">
                                 {username.charAt(0).toUpperCase()}
                              </div>
                           )}
                        </div>
                        <div
                           className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                           onClick={() => fileInputRef.current?.click()}
                        >
                           <Upload className="text-white size-8" />
                        </div>
                     </div>

                     <div className="flex flex-col gap-3">
                        <Button
                           type="button"
                           onClick={() => fileInputRef.current?.click()}
                           disabled={isUploading}
                           className="rounded-none h-10 px-6 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200"
                        >
                           {isUploading ? "上传中..." : "更换头像"}
                        </Button>
                        {avatarUrl && (
                           <Button
                              type="button"
                              variant="outline"
                              onClick={handleRemoveAvatar}
                              disabled={isUploading}
                              className="rounded-none h-10 px-6 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/10"
                           >
                              移除头像
                           </Button>
                        )}
                        <input
                           ref={fileInputRef}
                           type="file"
                           accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                           onChange={handleFileSelect}
                           className="hidden"
                        />
                     </div>
                  </div>
               </motion.section>

               {/* Profile Form */}
               <motion.section variants={fadeInUp}>
                  <form onSubmit={handleSave} className="flex flex-col md:flex-row gap-12 items-start">
                     <div className="w-full md:w-1/3">
                        <h3 className="text-lg font-bold mb-2">基本信息</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                           管理您的公开信息和联系方式
                        </p>
                     </div>

                     <div className="flex-1 w-full space-y-8">
                        <div className="space-y-2">
                           <Label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-zinc-500">用户名</Label>
                           <div className="relative">
                              <User className="absolute left-0 top-3.5 size-5 text-zinc-400" />
                              <Input
                                 id="username"
                                 value={username}
                                 onChange={(e) => setUsername(e.target.value)}
                                 className="pl-8 border-0 border-b border-zinc-200 dark:border-zinc-800 rounded-none px-0 h-12 bg-transparent focus-visible:ring-0 focus-visible:border-black dark:focus-visible:border-white transition-colors text-lg"
                                 placeholder="请输入用户名"
                              />
                           </div>
                        </div>

                        <div className="space-y-2">
                           <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-zinc-500">邮箱地址</Label>
                           <div className="relative">
                              <Mail className="absolute left-0 top-3.5 size-5 text-zinc-400" />
                              <Input
                                 id="email"
                                 value={email}
                                 disabled
                                 className="pl-8 border-0 border-b border-zinc-200 dark:border-zinc-800 rounded-none px-0 h-12 bg-transparent text-zinc-400 cursor-not-allowed text-lg"
                              />
                           </div>
                           <p className="text-xs text-zinc-400 pt-1">邮箱地址不可修改</p>
                        </div>

                        <div className="space-y-2">
                           <Label htmlFor="avatarUrl" className="text-xs font-bold uppercase tracking-wider text-zinc-500">头像链接 (可选)</Label>
                           <div className="relative">
                              <Upload className="absolute left-0 top-3.5 size-5 text-zinc-400" />
                              <Input
                                 id="avatarUrl"
                                 value={avatarUrl}
                                 onChange={(e) => setAvatarUrl(e.target.value)}
                                 className="pl-8 border-0 border-b border-zinc-200 dark:border-zinc-800 rounded-none px-0 h-12 bg-transparent focus-visible:ring-0 focus-visible:border-black dark:focus-visible:border-white transition-colors text-lg font-mono"
                                 placeholder="https://..."
                              />
                           </div>
                        </div>

                        <div className="pt-8">
                           <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                              <h4 className="font-bold mb-4 flex items-center gap-2">
                                 <Shield className="size-4" /> 账户详情
                              </h4>
                              <div className="space-y-4 text-sm">
                                 <div className="flex justify-between py-2 border-b border-zinc-200 dark:border-zinc-800 border-dashed">
                                    <span className="text-zinc-500">用户 ID</span>
                                    <span className="font-mono">{currentUser.id}</span>
                                 </div>
                                 <div className="flex justify-between py-2 border-b border-zinc-200 dark:border-zinc-800 border-dashed">
                                    <span className="text-zinc-500">注册时间</span>
                                    <span className="font-mono">{new Date(currentUser.created_at).toLocaleDateString("zh-CN")}</span>
                                 </div>
                                 <div className="flex justify-between py-2">
                                    <span className="text-zinc-500">角色权限</span>
                                    <span className="uppercase font-bold text-xs tracking-wider bg-zinc-200 dark:bg-zinc-800 px-2 py-1">
                                       {currentUser.role || 'USER'}
                                    </span>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {message && (
                           <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={cn(
                                 "p-4 text-sm font-medium",
                                 message.type === "success" ? "bg-emerald-50 text-primary dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                              )}
                           >
                              {message.text}
                           </motion.div>
                        )}

                        <div className="pt-4 flex items-center gap-4">
                           <Button
                              type="submit"
                              disabled={isSaving}
                              className="rounded-none h-14 px-8 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 text-lg font-medium w-full md:w-auto"
                           >
                              {isSaving ? (
                                 <span className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                       <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                       <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                       <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                    保存中...
                                 </span>
                              ) : (
                                 <span className="flex items-center gap-2">
                                    <Save className="size-5" />
                                    保存更改
                                 </span>
                              )}
                           </Button>
                        </div>
                     </div>
                  </form>
               </motion.section>
            </motion.div>
         </main>
      </div>
   )
}
