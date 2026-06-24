"use client"

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { UserPlus, MoreVertical, Shield, ShieldOff, VolumeX, Edit, Phone, Video, Image as ImageIcon, Smile, Mic, Sticker } from "lucide-react"
import { Send } from "@/components/animate-ui/icons/send"
import { Check } from "@/components/animate-ui/icons/check"
import { X } from "@/components/animate-ui/icons/x"
import { MessageSquare } from "@/components/animate-ui/icons/message-square"
import { ChevronLeft } from "@/components/animate-ui/icons/chevron-left"
import { Users } from "@/components/animate-ui/icons/users"
import { Volume2 } from "@/components/animate-ui/icons/volume-2"
import { Plus } from "@/components/animate-ui/icons/plus"
import { LogOut } from "@/components/animate-ui/icons/log-out"
import { Search } from "@/components/animate-ui/icons/search"
import { MapPin } from "@/components/animate-ui/icons/map-pin"
import { Trash2 } from "@/components/animate-ui/icons/trash-2"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/page-header"
import { PageHeaderRight } from "@/components/page-header-right"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import Image from "next/image"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { MobileBackground } from "@/components/mobile-background"
import { ImagePreviewDialog } from "@/components/chat/image-preview-dialog"
import { MessageSearchDialog } from "@/components/chat/message-search-dialog"
import { MessageItem } from "@/components/chat/message-item"
import { ChatListItem } from "@/components/chat/chat-list-item"

interface User {
  id: number
  uid?: string
  username: string
  email: string
  avatar_url: string | null
  role?: string
  is_blocked?: boolean
  last_message?: Message
  unread_count?: number
}

interface FriendRequest {
  id: number
  requester: User
  status: string
  created_at: number
}

interface Group {
  id: number
  name: string
  owner_id: number
  avatar_url: string | null
  created_at: number
  last_message?: Message
  unread_count?: number
  my_role?: 'owner' | 'admin' | 'member'
}

interface GroupMember {
  group_id: number
  user_id: number
  role: 'owner' | 'admin' | 'member'
  is_muted: boolean
  user: User
}

interface Message {
  id: number
  sender_id: number
  receiver_id: number | null
  group_id: number | null
  content: string
  type?: string
  file_url?: string | null
  created_at: number
  read_at: number | null
}

const formatTime = (timestamp: number) => {
  if (!timestamp) return ""
  // Check if timestamp is valid
  const date = new Date(Number(timestamp))
  if (isNaN(date.getTime())) return ""

  const now = new Date()

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString()
}

export default function ChatPage() {
  const [friends, setFriends] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])

  const [activeFriend, setActiveFriend] = useState<User | null>(null)
  const [activeGroup, setActiveGroup] = useState<Group | null>(null)

  const [isTyping, setIsTyping] = useState(false)

  // Debounce typing status
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)

    // Send typing status
    if (activeFriend || activeGroup) {
      // Throttle sending every 1s
      if (!typingTimeoutRef.current) {
        fetch('/api/chat/typing', {
          method: 'POST',
          body: JSON.stringify({
            targetId: activeFriend?.id,
            groupId: activeGroup?.id
          })
        })
        typingTimeoutRef.current = setTimeout(() => {
          typingTimeoutRef.current = null
        }, 1000)
      }
    }
  }

  // Poll for typing status of other user
  useEffect(() => {
    if (!activeFriend && !activeGroup) return

    const checkTyping = async () => {
      try {
        const params = new URLSearchParams()
        if (activeFriend) params.append('targetId', activeFriend.id.toString())
        if (activeGroup) params.append('groupId', activeGroup.id.toString())

        const res = await fetch(`/api/chat/typing?${params.toString()}`)
        const data = await res.json()
        setIsTyping(data.isTyping)
      } catch (e) {
        console.error(e)
      }
    }

    checkTyping() // Check immediately
    const interval = setInterval(checkTyping, 2000) // Poll every 2s

    return () => clearInterval(interval)
  }, [activeFriend, activeGroup])

  const handleDisbandGroup = async (groupId: number) => {
    if (!confirm("确定要解散该群组吗？此操作不可恢复。")) return

    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success("群组已解散")
        setGroups(prev => prev.filter(g => g.id !== groupId))
        if (activeGroup?.id === groupId) {
          setActiveGroup(null)
          setGroupMembers([])
        }
      } else {
        const data = await res.json()
        toast.error(data.error || "解散失败")
      }
    } catch (e) {
      toast.error("网络错误")
    }
  }

  const handleKickMember = async (groupId: number, userId: number) => {
    if (!confirm("确定要将该成员移出群组吗？")) return

    try {
      const res = await fetch(`/api/groups/members?groupId=${groupId}&userId=${userId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success("成员已移出")
        setGroupMembers(prev => prev.filter(m => m.user_id !== userId))
      } else {
        const data = await res.json()
        toast.error(data.error || "移除失败")
      }
    } catch (e) {
      toast.error("网络错误")
    }
  }

  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isRecording, setIsRecording] = useState(false)

  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [displayMessages, setDisplayMessages] = useState<Message[]>([])

  // Chat enhancement states
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    setDisplayMessages(messages)
  }, [messages])

  const emojis = ["👍", "❤️", "😂", "😮", "😢", "😡", "🎉", "🔥", "🤝", "👀"]
  const stickers = Array.from({ length: 20 }, (_, i) => `/images/sticker/sticker (${i + 1}).png`)



  const handleClearHistory = async (friendId: number) => {
    try {
      const res = await fetch('/api/direct-messages/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("聊天记录已清空")
        setMessages([])
        fetchFriends() // Refresh last message in sidebar
      } else {
        toast.error(data.error || "清空聊天记录失败")
      }
    } catch (error) {
      toast.error("清空聊天记录失败")
    }
  }

  const handleRecallMessage = async (messageId: number) => {
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        // 更新本地消息列表
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: '[消息已撤回]', type: 'recalled' }
            : msg
        ))
        toast.success("消息已撤回")
        // 刷新好友列表以更新最后一条消息
        fetchFriends()
        fetchUserGroups()
      } else {
        const data = await res.json()
        toast.error(data.error || "撤回失败")
      }
    } catch (error) {
      console.error("Error recalling message:", error)
      toast.error("撤回失败")
    }
  }

  const scrollToMessage = (messageId: number) => {
    const element = document.getElementById(`msg-${messageId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // 高亮效果
      element.classList.add('highlight-message')
      setTimeout(() => {
        element.classList.remove('highlight-message')
      }, 2000)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const file = new File([blob], "recording.webm", { type: 'audio/webm' })

        const formData = new FormData()
        formData.append('file', file)

        try {
          const res = await fetch('/api/chat/upload', { method: 'POST', body: formData })
          const data = await res.json()
          if (data.success) {
            await handleSendMessage('[语音]', 'audio', data.url)
          }
        } catch (e) {
          toast.error("Audio upload failed")
        }
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch (err) {
      console.error(err)
      toast.error("Could not access microphone")
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
      mediaRecorder.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }

  const filteredFriends = useMemo(() =>
    friends.filter(f =>
      f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.email.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [friends, searchQuery]
  )

  const filteredGroups = useMemo(() =>
    groups.filter(g =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [groups, searchQuery]
  )
  const [addFriendEmail, setAddFriendEmail] = useState("")
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [showChatDetails, setShowChatDetails] = useState(false)

  // Group creation state
  const [newGroupName, setNewGroupName] = useState("")
  const [selectedFriends, setSelectedFriends] = useState<number[]>([])

  // Group info state
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<'messages' | 'groups'>('messages')

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch current user
  useEffect(() => {
    fetch('/api/auth/me').then(res => res.json()).then(data => {
      if (data.user) setCurrentUser(data.user)
    })
  }, [])

  // Fetch friends
  const fetchFriends = async () => {
    try {
      const res = await fetch('/api/friends')
      const data = await res.json()
      if (data.friends) {
        setFriends(data.friends)
      }
    } catch (error) { console.error(error) }
  }

  // Fetch groups
  const fetchUserGroups = async () => {
    try {
      const res = await fetch('/api/groups')
      const data = await res.json()
      if (data.groups) setGroups(data.groups)
    } catch (error) { console.error(error) }
  }

  // Fetch requests
  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/friends/requests')
      const data = await res.json()
      if (data.requests) setRequests(data.requests)
    } catch (error) { console.error(error) }
  }

  // Fetch all data
  const fetchData = async () => {
    await Promise.all([fetchFriends(), fetchRequests(), fetchUserGroups()])
  }

  useEffect(() => {
    fetchData()
    // 减少轮询频率：从 10秒 改为 30秒
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fetch messages when active chat changes
  const fetchMessages = useCallback(async () => {
    if (!activeFriend && !activeGroup) return

    try {
      let url = ''
      if (activeFriend) {
        url = `/api/direct-messages?friendId=${activeFriend.id}`
      } else if (activeGroup) {
        url = `/api/groups/messages?groupId=${activeGroup.id}`
      }

      const res = await fetch(url)
      const data = await res.json()
      if (data.messages) setMessages(data.messages)
    } catch (error) {
      console.error("Failed to fetch messages", error)
    }
  }, [activeFriend, activeGroup])

  useEffect(() => {
    fetchMessages()
    // 减少消息轮询频率：从 3秒 改为 5秒
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  // Fetch group members when viewing group info
  useEffect(() => {
    if (activeGroup && showChatDetails) {
      fetch(`/api/groups/members?groupId=${activeGroup.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.members) setGroupMembers(data.members)
        })
    }
  }, [activeGroup, showChatDetails])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMessageIdRef = useRef<number | null>(null)

  // Scroll to bottom only when new messages arrive
  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.id !== lastMessageIdRef.current) {
      lastMessageIdRef.current = lastMsg?.id || null
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
    }
  }, [messages])

  const handleSendRequest = async () => {
    try {
      const res = await fetch('/api/friends/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addFriendEmail.includes('@') ? addFriendEmail : undefined,
          uid: !addFriendEmail.includes('@') ? addFriendEmail : undefined
        })
      })
      const data = await res.json()

      if (res.ok) {
        toast.success(data.message || "请求已发送")
        setAddFriendEmail("")
        setIsAddFriendOpen(false)
        fetchData()
      } else {
        toast.error(data.error || "发送请求失败")
      }
    } catch (error) {
      toast.error("发送请求失败")
    }
  }

  const handleRespondRequest = async (requestId: number, action: 'accept' | 'reject') => {
    try {
      const res = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action })
      })

      if (res.ok) {
        toast.success(action === 'accept' ? "已接受好友请求" : "已拒绝好友请求")
        fetchData()
      }
    } catch (error) {
      console.error("Failed to respond", error)
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("请输入群组名称")
      return
    }

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          members: selectedFriends
        })
      })
      const data = await res.json()

      if (res.ok) {
        toast.success("群组创建成功")
        setNewGroupName("")
        setSelectedFriends([])
        setIsCreateGroupOpen(false)
        fetchData()
      } else {
        toast.error(data.error || "创建群组失败")
      }
    } catch (error) {
      toast.error("创建群组失败")
    }
  }

  const handleSendMessage = async (contentOverride?: string, type: 'text' | 'image' | 'audio' | 'file' = 'text', fileUrl?: string) => {
    let contentToSend = contentOverride || inputValue
    if (!contentToSend.trim() && type === 'text') return
    if (!activeFriend && !activeGroup) return

    try {
      let url = ''
      let body: any = {}

      if (activeFriend) {
        url = '/api/direct-messages'
        body = { friendId: activeFriend.id, content: contentToSend, type, fileUrl }
      } else if (activeGroup) {
        url = '/api/groups/messages'
        body = { groupId: activeGroup.id, content: contentToSend, type, fileUrl }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        if (type === 'text') setInputValue("")
        await fetchMessages()
        // Refresh lists to show new message in sidebar
        fetchFriends()
        fetchUserGroups()
      } else {
        toast.error("Failed to send message")
      }
    } catch (error) {
      toast.error("Error sending message")
    }
  }

  const uploadFile = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.success) {
        const type = file.type.startsWith('image/') ? 'image'
          : file.type.startsWith('video/') ? 'video'
            : 'audio'
        const content = type === 'image' ? '[图片]'
          : type === 'video' ? '[视频]'
            : '[语音]'
        await handleSendMessage(content, type as any, data.url)
      } else {
        console.error("Upload error:", data.error)
        toast.error(data.error || "Upload failed")
      }
    } catch (error) {
      console.error("Upload exception:", error)
      toast.error("Upload failed")
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          uploadFile(file)
          e.preventDefault() // Prevent default paste behavior
        }
      }
    }
  }, [handleSendMessage])

  const handleBlockUser = async (userId: number, block: boolean) => {
    try {
      const res = await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: userId, block })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
        fetchFriends()
        if (activeFriend && activeFriend.id === userId) {
          setActiveFriend({ ...activeFriend, is_blocked: block })
        }
      } else {
        toast.error(data.error || "更新拉黑状态失败")
      }
    } catch (error) {
      toast.error("拉黑/取消拉黑用户失败")
    }
  }

  const handleToggleMute = async (groupId: number, userId: number, mute: boolean) => {
    try {
      const res = await fetch('/api/groups/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          userId,
          action: mute ? 'mute' : 'unmute'
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
        // Refresh members
        const membersRes = await fetch(`/api/groups/members?groupId=${groupId}`)
        const membersData = await membersRes.json()
        if (membersData.members) setGroupMembers(membersData.members)
      } else {
        toast.error(data.error || "更新禁言状态失败")
      }
    } catch (error) {
      toast.error("更新禁言状态失败")
    }
  }

  const toggleFriendSelection = (friendId: number) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    )
  }

  const switchToFriend = (friend: User) => {
    setActiveFriend(friend)
    setActiveGroup(null)
  }

  const switchToGroup = (group: Group) => {
    setActiveGroup(group)
    setActiveFriend(null)
  }

  return (
    <div className="h-[100dvh] w-screen bg-transparent dark:bg-[#0B1121] font-sans transition-colors duration-500 overflow-hidden flex flex-col">
      <MobileBackground />

      <div className="relative z-10 flex flex-col flex-1 w-full overflow-hidden">
        {/* Header */}
        {!isMobile && (
          <PageHeader user={currentUser as any}>
            <PageHeaderRight />
          </PageHeader>
        )}

        {/* Main Content - 3 Column Layout Simulation */}
        <div className="flex-1 overflow-hidden relative">
          <div className="flex h-full w-full max-w-[1600px] mx-auto">

            {/* Middle Column: Message List */}
            <div className={cn(
              "w-full md:w-[400px] flex flex-col h-full border-r border-black/5 dark:border-white/5 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md",
              isMobile && (activeFriend || activeGroup) ? "hidden" : "flex"
            )}>
              {isMobile ? (
                <div className="px-6 pt-14 pb-2 flex flex-col gap-4 sticky top-0 z-10">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h1 className="text-[2rem] font-black text-slate-900 dark:text-white leading-tight tracking-tight" style={{ fontFamily: 'DingTalkJinBuTi, system-ui, -apple-system, sans-serif' }}>
                        消息
                      </h1>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center gap-2">
                        {currentUser?.username}
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      </p>
                    </div>
                    <Avatar className="size-12 ring-4 ring-white dark:ring-white/10 shadow-xl">
                      <AvatarImage src={currentUser?.avatar_url || undefined} />
                      <AvatarFallback>{currentUser?.username?.[0]}</AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="搜索..."
                      className="pl-11 h-12 bg-white/50 dark:bg-white/5 border-white/40 dark:border-white/10 rounded-[1.5rem] backdrop-blur-md shadow-sm focus-visible:ring-1 focus-visible:ring-blue-500/50 transition-all placeholder:text-slate-400"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Tabs */}
                  <div className="flex p-1 bg-black/5 dark:bg-white/5 rounded-[1.5rem] relative backdrop-blur-sm mt-1">
                    <button
                      onClick={() => setViewMode('messages')}
                      className={cn(
                        "flex-1 py-2.5 rounded-[1.2rem] text-sm font-bold transition-all duration-300 z-10 flex items-center justify-center gap-2",
                        viewMode === 'messages'
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      )}
                    >
                      <MessageSquare className="size-4" />
                      聊天
                    </button>
                    <button
                      onClick={() => setViewMode('groups')}
                      className={cn(
                        "flex-1 py-2.5 rounded-[1.2rem] text-sm font-bold transition-all duration-300 z-10 flex items-center justify-center gap-2",
                        viewMode === 'groups'
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      )}
                    >
                      <Users className="size-4" />
                      群组
                    </button>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-6 px-6">
                    <button
                      onClick={() => setIsAddFriendOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold text-xs whitespace-nowrap active:scale-95 transition-transform"
                    >
                      <UserPlus className="size-4" />
                      添加好友
                    </button>
                    <button
                      onClick={() => setIsCreateGroupOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 font-bold text-xs whitespace-nowrap active:scale-95 transition-transform"
                    >
                      <Users className="size-4" />
                      新建群组
                    </button>
                  </div>

                  {/* Dialogs */}
                  <Dialog open={isAddFriendOpen} onOpenChange={setIsAddFriendOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>添加好友</DialogTitle>
                      </DialogHeader>
                      <div className="flex gap-2 mt-4">
                        <Input
                          placeholder="邮箱..."
                          value={addFriendEmail}
                          onChange={(e) => setAddFriendEmail(e.target.value)}
                        />
                        <Button onClick={handleSendRequest}>发送请求</Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>创建群组</DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col gap-4 mt-4">
                        <div className="space-y-2">
                          <Label>群组名称</Label>
                          <Input
                            placeholder="群组名称..."
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>选择成员</Label>
                          <ScrollArea className="h-48 border rounded-md p-2">
                            <div className="space-y-2">
                              {friends.map(friend => (
                                <div key={friend.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`friend-${friend.id}`}
                                    checked={selectedFriends.includes(friend.id)}
                                    onCheckedChange={() => toggleFriendSelection(friend.id)}
                                  />
                                  <Label htmlFor={`friend-${friend.id}`} className="flex-1 cursor-pointer flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={friend.avatar_url || undefined} />
                                      <AvatarFallback>{friend.username[0]}</AvatarFallback>
                                    </Avatar>
                                    {friend.username}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                        <Button onClick={handleCreateGroup}>创建</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="px-6 py-6 flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">消息</h1>
                    <div className="flex gap-2">
                      <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
                        <DialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10">
                            <Edit className="h-5 w-5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>创建群组</DialogTitle>
                          </DialogHeader>
                          <div className="flex flex-col gap-4 mt-4">
                            <div className="space-y-2">
                              <Label>群组名称</Label>
                              <Input
                                placeholder="群组名称..."
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>选择成员</Label>
                              <ScrollArea className="h-48 border rounded-md p-2">
                                <div className="space-y-2">
                                  {friends.map(friend => (
                                    <div key={friend.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`friend-${friend.id}`}
                                        checked={selectedFriends.includes(friend.id)}
                                        onCheckedChange={() => toggleFriendSelection(friend.id)}
                                      />
                                      <Label htmlFor={`friend-${friend.id}`} className="flex-1 cursor-pointer flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                          <AvatarImage src={friend.avatar_url || undefined} />
                                          <AvatarFallback>{friend.username[0]}</AvatarFallback>
                                        </Avatar>
                                        {friend.username}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                            <Button onClick={handleCreateGroup}>创建</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10" onClick={() => document.getElementById('search-input')?.focus()}>
                        <Search className="h-5 w-5" />
                      </Button>
                      <Dialog open={isAddFriendOpen} onOpenChange={setIsAddFriendOpen}>
                        <DialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10">
                            <Plus className="h-5 w-5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>添加好友</DialogTitle>
                          </DialogHeader>
                          <div className="flex gap-2 mt-4">
                            <Input
                              placeholder="邮箱或UID..."
                              value={addFriendEmail}
                              onChange={(e) => setAddFriendEmail(e.target.value)}
                            />
                            <Button onClick={handleSendRequest}>发送请求</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search-input"
                      placeholder="搜索好友或群组"
                      className="pl-9 bg-black/5 dark:bg-white/5 border-none rounded-full placeholder:text-muted-foreground/70"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <ScrollArea className="flex-1 px-4" data-lenis-prevent>
                <div className={cn("space-y-6", isMobile ? "pb-24" : "pb-4")}>
                  {/* Groups Section */}
                  {(!isMobile || viewMode === 'groups') && filteredGroups.length > 0 && (
                    <div className="space-y-2">
                      {!isMobile && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                          <MapPin className="h-3 w-3" /> 群组
                        </div>
                      )}
                      <div className="space-y-1">
                        {filteredGroups.map(group => (
                          <ChatListItem
                            key={group.id}
                            id={group.id}
                            name={group.name}
                            avatarUrl={group.avatar_url}
                            lastMessage={group.last_message}
                            unreadCount={group.unread_count}
                            isActive={activeGroup?.id === group.id}
                            isGroup={true}
                            isMobile={isMobile}
                            onClick={() => switchToGroup(group)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Friend Requests Section */}
                  {(!isMobile || viewMode === 'messages') && requests.length > 0 && (
                    <div className="space-y-2 mb-6">
                      {!isMobile && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                          <UserPlus className="h-3 w-3" /> 好友请求
                        </div>
                      )}
                      <div className="space-y-1">
                        {requests.map(req => (
                          <div key={req.id} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-black/5 dark:border-white/5">
                            <Avatar className="h-10 w-10 border border-black/10 dark:border-white/10">
                              <AvatarImage src={req.requester.avatar_url || undefined} />
                              <AvatarFallback>{req.requester.username[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm text-foreground truncate">{req.requester.username}</div>
                              <div className="text-xs text-muted-foreground">请求添加好友</div>
                            </div>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-green-500 hover:bg-green-100 dark:hover:bg-green-900/20" onClick={() => handleRespondRequest(req.id, 'accept')}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20" onClick={() => handleRespondRequest(req.id, 'reject')}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All Messages Section (Friends) */}
                  {(!isMobile || viewMode === 'messages') && (
                    <div className="space-y-2">
                      {!isMobile && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                          <MessageSquare className="h-3 w-3" /> 全部消息
                        </div>
                      )}
                      <div className="space-y-1">
                        {filteredFriends.map(friend => (
                          <ChatListItem
                            key={friend.id}
                            id={friend.id}
                            name={friend.username}
                            avatarUrl={friend.avatar_url}
                            lastMessage={friend.last_message}
                            unreadCount={friend.unread_count}
                            isActive={activeFriend?.id === friend.id}
                            isGroup={false}
                            isMobile={isMobile}
                            onClick={() => switchToFriend(friend)}
                          />
                        ))}
                        {filteredFriends.length === 0 && (
                          <div className="text-center text-sm text-muted-foreground py-8">
                            暂无好友
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bottom Encryption Note for Mobile */}
                  {isMobile && (
                    <div className="text-center text-[10px] text-muted-foreground mt-8 mb-4">
                      您的个人消息已<span className="text-blue-500 font-medium">加密保护</span>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className={cn(
              "flex-1 flex flex-col bg-white/30 dark:bg-slate-900/30 backdrop-blur-md transition-all duration-300",
              isMobile && (!activeFriend && !activeGroup) ? "hidden" : "flex"
            )}>
              {(activeFriend || activeGroup) ? (
                <>
                  <div className={cn(
                    "flex items-center justify-between sticky top-0 z-10",
                    isMobile
                      ? "px-4 py-3 bg-white/80 dark:bg-[#0B1121]/80 backdrop-blur-xl border-b border-white/20 shadow-sm"
                      : "px-6 py-4 border-b border-black/5 dark:border-white/5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                  )}>
                    <div className="flex items-center gap-4">
                      {isMobile && (
                        <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8" onClick={() => { setActiveFriend(null); setActiveGroup(null); }}>
                          <ChevronLeft className="h-6 w-6" />
                        </Button>
                      )}
                      <Avatar className="h-10 w-10 border border-black/10 dark:border-white/10">
                        {activeFriend ? (
                          <>
                            <AvatarImage src={activeFriend.avatar_url || undefined} />
                            <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">{activeFriend.username[0]}</AvatarFallback>
                          </>
                        ) : (
                          <>
                            <AvatarImage src={activeGroup?.avatar_url || undefined} />
                            <AvatarFallback className="bg-orange-100 text-orange-600 font-bold">
                              {activeGroup?.name[0]}
                            </AvatarFallback>
                          </>
                        )}
                      </Avatar>
                      <div>
                        <div className="text-lg font-bold text-foreground leading-tight flex items-center gap-2">
                          {activeFriend ? activeFriend.username : activeGroup?.name}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium animate-pulse">
                          {isTyping ? '正在输入...' : (
                            activeFriend ? <span className="text-green-500">Online</span> : `${groupMembers.length} 成员`
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setShowSearch(true)}>
                        <Search className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-black/5 dark:hover:bg-white/5" onClick={() => toast.info("Video call coming soon!")}>
                        <Video className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-black/5 dark:hover:bg-white/5" onClick={() => toast.info("Voice call coming soon!")}>
                        <Phone className="h-5 w-5" />
                      </Button>
                      {!isMobile && (
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setShowChatDetails(!showChatDetails)}>
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col overflow-hidden relative">
                    <ScrollArea className="flex-1 p-6" data-lenis-prevent>
                      <div className="flex flex-col gap-6 min-h-0">
                        {displayMessages.map((msg, index) => {
                          const isMe = msg.sender_id === currentUser?.id
                          const sender = isMe ? currentUser : (activeFriend || groupMembers.find(m => m.user_id === msg.sender_id)?.user)

                          // Date separator logic
                          const showDateSeparator = index === 0 || new Date(msg.created_at).toDateString() !== new Date(displayMessages[index - 1].created_at).toDateString()

                          return (
                            <div key={msg.id} className="flex flex-col gap-4">
                              {showDateSeparator && (
                                <div className="flex justify-center my-2">
                                  <span className="text-xs text-muted-foreground font-medium bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full">
                                    {new Date(msg.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                              )}
                              <MessageItem
                                message={msg}
                                isMe={isMe}
                                sender={sender}
                                showSenderName={!isMe && !!activeGroup}
                                onRecall={handleRecallMessage}
                                onImageClick={setPreviewImage}
                              />
                            </div>
                          )
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    <div className={cn("sticky bottom-0 z-10", isMobile ? "p-3 pb-8 bg-white/80 dark:bg-[#0B1121]/80 backdrop-blur-xl border-t border-white/20" : "p-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-t border-black/5 dark:border-white/5")}>
                      <form
                        onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                        className="flex items-center gap-2 bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 p-2 rounded-full shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)]"
                      >
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={isRecording ? stopRecording : startRecording}
                          className={cn(
                            "h-10 w-10 rounded-full transition-colors",
                            isRecording ? "text-red-500 bg-red-50 hover:bg-red-100 animate-pulse" : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                          )}
                        >
                          <Mic className="h-5 w-5" />
                        </Button>
                        <Input
                          value={inputValue}
                          onChange={handleInputChange}
                          onPaste={handlePaste}
                          placeholder={isRecording ? "正在录音..." : "输入消息..."}
                          disabled={isRecording}
                          className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-base placeholder:text-muted-foreground"
                        />

                        <input
                          type="file"
                          accept="image/*,audio/*,video/*"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                        />

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <ImageIcon className="h-5 w-5" />
                        </Button>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button type="button" size="icon" variant="ghost" className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5">
                              <Sticker className="h-5 w-5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-black/5 dark:border-white/5 shadow-xl rounded-2xl overflow-hidden" align="end" side="top">
                            <div className="p-4 grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto scrollbar-hide">
                              {stickers.map((url, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleSendMessage('[贴纸]', 'image', url)}
                                  className="aspect-square relative hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors active:scale-90"
                                >
                                  <Image src={url} alt={`Sticker ${i + 1}`} fill className="object-contain p-1" />
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button type="button" size="icon" variant="ghost" className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5">
                              <Smile className="h-5 w-5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-black/5 dark:border-white/5" align="end">
                            <div className="grid grid-cols-5 gap-2">
                              {emojis.map(emoji => (
                                <button
                                  key={emoji}
                                  type="button"
                                  className="text-2xl hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded transition-colors"
                                  onClick={() => setInputValue(prev => prev + emoji)}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>

                        <Button type="submit" size="icon" disabled={!inputValue.trim() && !isRecording} className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all duration-300 hover:scale-105 active:scale-95 ml-1">
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <div className="h-24 w-24 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 animate-[pulse_4s_ease-in-out_infinite]">
                    <MessageSquare className="h-12 w-12 text-primary/50" />
                  </div>
                  <p className="text-xl font-bold text-foreground mb-2">欢迎使用消息</p>
                  <p className="text-muted-foreground">选择一个聊天开始发送消息</p>
                </div>
              )}
            </div>

            {/* Right Sidebar - Info Panel */}
            <div className={cn(
              "w-80 flex-col h-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-l border-black/5 dark:border-white/5 transition-all duration-300 hidden md:flex shrink-0",
              showChatDetails ? "w-80 opacity-100" : "w-0 opacity-0 overflow-hidden"
            )}>
              <div className="px-6 py-6 border-b border-black/5 dark:border-white/5">
                <h2 className="text-xl font-bold text-foreground">详情</h2>
              </div>
              <ScrollArea className="flex-1 p-6">
                {activeFriend && (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <Avatar className="h-24 w-24 border-4 border-white dark:border-slate-800 shadow-xl">
                      <AvatarImage src={activeFriend.avatar_url || undefined} />
                      <AvatarFallback className="text-2xl bg-blue-100 text-blue-600 font-bold">{activeFriend.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="text-center w-full px-2">
                      <h3 className="text-xl font-bold text-foreground truncate">{activeFriend.username}</h3>
                      <p className="text-sm text-muted-foreground break-all">{activeFriend.email}</p>
                    </div>

                    <div className="w-full mt-8 space-y-3">
                      <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-black/5 dark:border-white/5 space-y-2">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">选项</h4>
                        <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 h-12 rounded-xl" onClick={() => handleBlockUser(activeFriend.id, !activeFriend.is_blocked)}>
                          {activeFriend.is_blocked ? <ShieldOff className="mr-3 h-5 w-5" /> : <Shield className="mr-3 h-5 w-5" />}
                          {activeFriend.is_blocked ? "解除拉黑" : "拉黑用户"}
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/10 h-12 rounded-xl" onClick={() => handleClearHistory(activeFriend.id)}>
                          <Trash2 className="mr-3 h-5 w-5" />
                          清空聊天记录
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {activeGroup && (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4 py-6">
                      <Avatar className="h-24 w-24 border-4 border-white dark:border-slate-800 shadow-xl">
                        <AvatarImage src={activeGroup.avatar_url || undefined} />
                        <AvatarFallback className="text-2xl bg-orange-100 text-orange-600 font-bold">{activeGroup.name[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="text-center">
                        <h3 className="text-xl font-bold text-foreground">{activeGroup.name}</h3>
                        <p className="text-sm text-muted-foreground">{groupMembers.length} 成员</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-foreground">成员</h4>
                        <span className="text-xs text-muted-foreground bg-black/5 dark:bg-white/5 px-2 py-1 rounded-full">{groupMembers.length}</span>
                      </div>
                      <div className="space-y-2">
                        {groupMembers.map(member => {
                          const isMe = member.user_id === currentUser?.id
                          const isSystemAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin'
                          const myMemberRecord = groupMembers.find(m => m.user_id === currentUser?.id)
                          const isGroupAdmin = myMemberRecord?.role === 'owner' || myMemberRecord?.role === 'admin'
                          const canManage = isSystemAdmin || isGroupAdmin
                          const targetIsAdmin = member.user.role === 'admin' || member.user.role === 'super_admin'
                          const showMuteButton = canManage && !isMe && !targetIsAdmin
                          const showKickButton = canManage && !isMe && !targetIsAdmin

                          return (
                            <div key={member.user_id} className="flex items-center justify-between p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group/item">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <Avatar className="h-10 w-10 shrink-0 border border-black/10 dark:border-white/10">
                                  <AvatarImage src={member.user.avatar_url || undefined} />
                                  <AvatarFallback className="bg-slate-200 text-slate-600 font-bold">{member.user.username[0]}</AvatarFallback>
                                </Avatar>
                                <div className="overflow-hidden">
                                  <div className="text-sm font-bold text-foreground truncate flex items-center gap-1">
                                    {member.user.username}
                                    {member.role === 'owner' && <Badge variant="secondary" className="h-5 px-2 text-[10px] bg-orange-100 text-orange-600 hover:bg-orange-200">群主</Badge>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                {showMuteButton && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn("h-8 w-8 rounded-full", member.is_muted ? "text-red-500 bg-red-50" : "text-muted-foreground hover:text-foreground")}
                                    onClick={() => handleToggleMute(activeGroup.id, member.user_id, !member.is_muted)}
                                  >
                                    {member.is_muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                  </Button>
                                )}
                                {showKickButton && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                    onClick={() => handleKickMember(activeGroup.id, member.user_id)}
                                  >
                                    <LogOut className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {activeGroup.my_role === 'owner' ? (
                      <Button
                        variant="outline"
                        className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 border-red-200 dark:border-red-900/30 h-12 rounded-xl font-medium"
                        onClick={() => handleDisbandGroup(activeGroup.id)}
                      >
                        <Trash2 className="mr-3 h-5 w-5" />
                        解散群聊
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 border-red-200 dark:border-red-900/30 h-12 rounded-xl font-medium">
                        <LogOut className="mr-3 h-5 w-5" />
                        退出群组
                      </Button>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>
        {isMobile && !activeFriend && !activeGroup && (
          <MobileBottomNav />
        )}
      </div>

      {/* Image Preview Dialog */}
      <ImagePreviewDialog
        open={!!previewImage}
        onOpenChange={(open) => !open && setPreviewImage(null)}
        imageUrl={previewImage || ''}
      />

      {/* Message Search Dialog */}
      <MessageSearchDialog
        open={showSearch}
        onOpenChange={setShowSearch}
        messages={messages}
        onSelectMessage={scrollToMessage}
      />

      <style jsx global>{`
        @keyframes highlight-pulse {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(59, 130, 246, 0.2); }
        }

        .highlight-message {
          animation: highlight-pulse 1s ease-in-out 2;
        }
      `}</style>
    </div>
  )
}
