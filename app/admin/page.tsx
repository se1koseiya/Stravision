"use client"

import { useEffect, useState } from "react"
import { UserPublic } from "@/lib/db/user-service"
import { Button } from "@/components/ui/button"
import { UserDialog } from "@/components/admin/user-dialog"
import { toast } from "sonner"
import { Loader2, Pencil, ShieldCheck, Activity, Server, Bell, Settings } from "lucide-react";
import { Plus } from "@/components/animate-ui/icons/plus";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BannedIPsManager } from "@/components/admin/banned-ips-manager"
import { AccessLogsViewer } from "@/components/admin/access-logs-viewer"
import { RateLimitSettings } from "@/components/admin/rate-limit-settings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AnnouncementSender } from "@/components/admin/announcement-sender"
import { ChangelogSender } from "@/components/admin/changelog-sender"
import { MaintenanceSettings } from "@/components/admin/maintenance-settings"
import { MCPMarketManager } from "@/components/admin/mcp-market-manager"
import { FeatureAnnouncementAdmin } from "@/components/dashboard/feature-announcement-admin"

import { PageNavigation } from "@/components/page-navigation"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import Image from "next/image"
import { motion } from "framer-motion"
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

export default function AdminPage() {
  const [users, setUsers] = useState<UserPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserPublic | null>(null)
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null)

  // ... existing fetch functions ...
  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users")
      if (!res.ok) throw new Error("Failed to fetch users")
      const data = await res.json()
      setUsers(data)
    } catch (error) {
      console.error(error)
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me")
      const data = await res.json()
      if (data.authenticated) {
        setCurrentUser(data.user)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchCurrentUser()
    fetchUsers()
  }, [])

  const handleEdit = (user: UserPublic) => {
    setSelectedUser(user)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setSelectedUser(null)
    setDialogOpen(true)
  }

  const handleSuccess = () => {
    fetchUsers()
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA] dark:bg-[#050505]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    )
  }

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
          {currentUser && <UserAvatarMenu user={currentUser} />}
        </div>
      </nav>

      {/* Hero Header */}
      <header className="pt-40 pb-20 px-8 md:px-12 border-b border-zinc-200 dark:border-zinc-900 bg-white dark:bg-black relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8"
          >
            <div className="flex items-center gap-8">
              <motion.div variants={fadeInUp} className="mb-2">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-2">
                  System Admin
                </h1>
                <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400 font-mono text-sm">
                  <span className="uppercase tracking-wider">Control Panel</span>
                  <span className="w-px h-3 bg-zinc-300 dark:bg-zinc-700" />
                  <span>v2.4.0</span>
                </div>
              </motion.div>
            </div>

            <motion.div variants={fadeInUp} className="flex gap-12 pb-2">
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Total Users</span>
                <div className="flex items-center gap-2">
                  <Activity className="size-5 text-zinc-900 dark:text-white" />
                  <span className="text-xl font-medium">{users.length}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Status</span>
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-xl font-medium">Active</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-8 md:px-12 py-12 max-w-7xl mx-auto">
        <Tabs defaultValue="users" className="space-y-8">
          <TabsList className="flex flex-wrap md:flex-row h-auto w-full gap-2 bg-transparent p-0 items-start justify-start border-b border-zinc-200 dark:border-zinc-800 pb-px mb-12">
            <TabsTrigger
              value="users"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-black dark:data-[state=active]:border-white data-[state=active]:bg-transparent px-4 pb-4 pt-2 font-mono text-sm uppercase tracking-wider text-zinc-500 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 transition-all hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              User Management
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-black dark:data-[state=active]:border-white data-[state=active]:bg-transparent px-4 pb-4 pt-2 font-mono text-sm uppercase tracking-wider text-zinc-500 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 transition-all hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Security & Bans
            </TabsTrigger>
            <TabsTrigger
              value="announcement"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-black dark:data-[state=active]:border-white data-[state=active]:bg-transparent px-4 pb-4 pt-2 font-mono text-sm uppercase tracking-wider text-zinc-500 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 transition-all hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Announcements
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-black dark:data-[state=active]:border-white data-[state=active]:bg-transparent px-4 pb-4 pt-2 font-mono text-sm uppercase tracking-wider text-zinc-500 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 transition-all hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              System Settings
            </TabsTrigger>
            <TabsTrigger
              value="mcp-market"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-black dark:data-[state=active]:border-white data-[state=active]:bg-transparent px-4 pb-4 pt-2 font-mono text-sm uppercase tracking-wider text-zinc-500 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 transition-all hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              MCP Market
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-0 outline-none animate-in fade-in-50">
            <div className="flex justify-end mb-6">
              <Button onClick={handleCreate} className="rounded-none bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 px-6">
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>

            {/* Mobile View: Cards */}
            <div className="grid gap-4 md:hidden">
              {users.map((user) => (
                <Card key={user.id} className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-none shadow-none">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-medium leading-none">
                        {user.username}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {user.email}
                      </p>
                    </div>
                    <Badge variant={user.role === 'super_admin' ? 'default' : user.role === 'admin' ? 'secondary' : 'outline'} className="rounded-none">
                      {user.role}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-xs text-muted-foreground bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-none">
                      <span className="font-medium text-foreground">Permissions: </span>
                      {user.permissions?.allowedControls?.length
                        ? `${user.permissions.allowedControls.length} devices allowed`
                        : 'No device permissions'}
                    </div>
                    <Button variant="outline" size="sm" className="w-full rounded-none" onClick={() => handleEdit(user)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit User
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop View: Table */}
            <div className="w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg overflow-hidden mt-4">
              {/* Debug Info (Only visible in dev/test, helps confirm data presence) */}
              {/* <div className="p-2 bg-yellow-100 text-yellow-800 text-xs">Debug: Users loaded: {users.length}</div> */}

              {users.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50 dark:bg-zinc-800/50">
                      <TableRow className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                        <TableHead className="w-[80px] font-mono text-xs uppercase tracking-wider text-zinc-500 pl-6">ID</TableHead>
                        <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-500">Username</TableHead>
                        <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-500">Email</TableHead>
                        <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-500">Role</TableHead>
                        <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-500">Permissions</TableHead>
                        <TableHead className="text-right font-mono text-xs uppercase tracking-wider text-zinc-500 pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                          <TableCell className="font-mono text-zinc-500 pl-6">{user.id}</TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="relative size-6 rounded-full overflow-hidden bg-zinc-100">
                                {user.avatar_url ? (
                                  <Image src={user.avatar_url} alt={user.username} fill className="object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-zinc-200" />
                                )}
                              </div>
                              {user.username}
                            </div>
                          </TableCell>
                          <TableCell className="text-zinc-500">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'super_admin' ? 'default' : user.role === 'admin' ? 'secondary' : 'outline'} className="rounded-none font-mono text-[10px] uppercase">
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-zinc-500 text-sm">
                            {user.permissions?.allowedControls?.length
                              ? <Badge variant="outline" className="font-normal">{user.permissions.allowedControls.length} devices</Badge>
                              : <span className="text-zinc-300">-</span>}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(user)} className="h-8 w-8 p-0 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center p-8 text-zinc-500 border-t border-zinc-100 dark:border-zinc-800">
                  No users found.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="security" className="mt-0 outline-none animate-in fade-in-50 space-y-8">
            <div className="grid gap-8 md:grid-cols-2">
              <BannedIPsManager />
              <AccessLogsViewer />
            </div>
          </TabsContent>

          <TabsContent value="announcement" className="mt-0 outline-none animate-in fade-in-50 space-y-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <AnnouncementSender />
              <ChangelogSender />
            </div>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
              <FeatureAnnouncementAdmin />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0 outline-none animate-in fade-in-50 space-y-8">
            <div className="grid gap-8 md:grid-cols-2">
              <RateLimitSettings />
              <MaintenanceSettings />
            </div>

            {/* Daily Briefing Reset */}
            <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Activity className="size-4 text-emerald-500" />
                  每日智能播报
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  每日播报基于灵动岛样式，在用户首次进入 /monitor 或 /dashboard 时自动触发一次。
                  点击下方按钮可重置今日播报状态，使所有用户在下次访问时重新收到播报。
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="rounded-lg border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => {
                      const keys = Object.keys(localStorage).filter(k => k.startsWith('daily_briefing_'))
                      keys.forEach(k => localStorage.removeItem(k))
                      toast.success(`已重置今日播报`, {
                        description: `清除了 ${keys.length} 条播报记录，下次进入监控/仪表盘将重新播报`,
                      })
                    }}
                  >
                    <Settings className="size-4 mr-2" />
                    重置今日播报
                  </Button>
                  <span className="text-xs text-zinc-400 font-mono">
                    {typeof window !== 'undefined' ? Object.keys(localStorage).filter(k => k.startsWith('daily_briefing_')).length : 0} 条记录
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mcp-market" className="mt-0 outline-none animate-in fade-in-50">
            <MCPMarketManager />
          </TabsContent>
        </Tabs>
      </main>

      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={selectedUser}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
