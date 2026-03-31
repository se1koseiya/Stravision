"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, Plus, Pencil, Trash2, Search, Globe, Lock, ShieldCheck, Layout, Sparkles, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { ImageCropper } from "./image-cropper"

interface MCPServer {
  id: string
  name: string
  displayName: string
  description: string
  category: string
  icon: string
  iconBg: string
  provider: string
  requiresApiKey: boolean
  apiKeyUrl?: string
  command: string
  args: string
  envVars: string
  features: string
  popularity: number
  official: boolean
  priority: number
  is_published: number
  cover_image?: string
}

export function MCPMarketManager() {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<Partial<MCPServer> | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false)
  const [cropperTarget, setCropperTarget] = useState<"icon" | "cover">("icon")

  useEffect(() => {
    fetchServers()
  }, [])

  const fetchServers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/mcp")
      const data = await res.json()
      setServers(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error("Failed to fetch MCP servers")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!editingServer?.id || !editingServer?.displayName) {
      toast.error("ID and Display Name are required")
      return
    }

    const isEditing = servers.some(s => s.id === editingServer.id)
    const method = isEditing ? "PUT" : "POST"
    const url = isEditing ? `/api/admin/mcp/${editingServer.id}` : "/api/admin/mcp"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingServer),
      })

      if (res.ok) {
        toast.success(isEditing ? "Server updated" : "Server created")
        setDialogOpen(false)
        fetchServers()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to save server")
      }
    } catch (e) {
      toast.error("Error saving server")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this server?")) return
    try {
      const res = await fetch(`/api/admin/mcp/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Server deleted")
        fetchServers()
      }
    } catch (e) {
      toast.error("Failed to delete server")
    }
  }

  const filteredServers = servers.filter(s => 
    s.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const AppIcon = ({ icon, name, className }: { icon: string, name: string, className?: string }) => {
    const [error, setError] = useState(false)
    if (error || !icon) {
      const firstLetter = name.charAt(0).toUpperCase()
      const colors = ["bg-blue-500", "bg-rose-500", "bg-emerald-500", "bg-amber-500", "bg-violet-500", "bg-indigo-500"]
      const color = colors[name.length % colors.length]
      return (
        <div className={cn(className, color, "text-white font-black flex items-center justify-center")}>
          {firstLetter}
        </div>
      )
    }
    return (
      <img 
        src={icon} 
        alt={name} 
        className={cn(className, "object-cover")} 
        onError={() => setError(true)} 
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <Input 
            placeholder="Search MCP servers..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => {
          setEditingServer({ 
            id: "",
            name: "",
            displayName: "",
            description: "",
            command: "npx", 
            args: "[]", 
            envVars: "{}", 
            category: "web", 
            is_published: 1, 
            priority: 0,
            iconBg: "bg-white",
            official: false,
            requiresApiKey: false,
            provider: "Stravision",
            features: "",
            popularity: 95
          })
          setDialogOpen(true)
        }}>
          <Plus className="size-4 mr-2" />
          Add MCP Server
        </Button>
      </div>

      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Priority</TableHead>
              <TableHead>Icon</TableHead>
              <TableHead>ID (Slug)</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredServers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                  No MCP servers found.
                </TableCell>
              </TableRow>
            ) : filteredServers.map((server) => (
              <TableRow key={server.id}>
                <TableCell className="font-bold text-emerald-500">#{server.priority}</TableCell>
                <TableCell>
                   <AppIcon icon={server.icon} name={server.displayName} className={cn("size-10 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800", server.iconBg)} />
                </TableCell>
                <TableCell className="font-mono text-xs">{server.id}</TableCell>
                <TableCell className="font-medium">
                   <div className="flex items-center gap-2 text-sm">
                      {server.displayName}
                      {server.official && <ShieldCheck className="size-3 text-blue-500" />}
                   </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">{server.category}</Badge>
                </TableCell>
                <TableCell>
                  {server.is_published ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                      Published
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Draft</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingServer(server)
                      setDialogOpen(true)
                    }}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => handleDelete(server.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingServer?.id && servers.some(s => s.id === editingServer.id) ? "Edit MCP Server" : "New MCP Server"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Server ID (Slug)</label>
                <Input 
                  placeholder="e.g. firecrawl" 
                  value={editingServer?.id || ""}
                  onChange={(e) => setEditingServer({ ...editingServer, id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Display Name</label>
                <Input 
                  placeholder="e.g. Firecrawl" 
                  value={editingServer?.displayName || ""}
                  onChange={(e) => setEditingServer({ ...editingServer, displayName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-bold opacity-60 flex items-center gap-2">
                   <Layout className="size-4" /> 图标 URL / Emoji
                </label>
                <div className="flex gap-3">
                   <div className={cn("size-12 rounded-xl flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 group relative overflow-hidden", editingServer?.iconBg)}>
                      {editingServer?.icon && (
                        editingServer.icon.startsWith('http') || editingServer.icon.startsWith('/') ? (
                          <img src={editingServer.icon} className="size-full object-cover" />
                        ) : (
                          <span className="text-2xl">{editingServer.icon}</span>
                        )
                      )}
                      {!editingServer?.icon && <Plus className="size-5 text-zinc-400" />}
                   </div>
                   <div className="flex-1 space-y-2">
                     <Input 
                        placeholder="🧩 或 图片链接" 
                        value={editingServer?.icon || ""}
                        onChange={(e) => setEditingServer({ ...editingServer, icon: e.target.value })}
                        className="h-12 px-4 rounded-xl"
                      />
                      <Button variant="outline" size="sm" className="w-full h-8 text-[10px] uppercase font-black gap-2" onClick={() => { setCropperTarget("icon"); setCropperOpen(true); }}>
                         <ImageIcon size={12} /> 上传并裁剪图标
                      </Button>
                   </div>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold opacity-60 flex items-center gap-2">
                   <Sparkles className="size-4" /> 封面大图 URL (详情页/精选卡片)
                </label>
                <div className="space-y-2">
                   <Input 
                      placeholder="https://images.unsplash.com/..." 
                      value={editingServer?.cover_image || ""}
                      onChange={(e) => setEditingServer({ ...editingServer, cover_image: e.target.value })}
                      className="h-12 px-4 rounded-xl"
                    />
                    <div className="flex items-center gap-3">
                       <div className="flex-1 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-black/5 flex items-center justify-center overflow-hidden">
                          {editingServer?.cover_image ? (
                             <img src={editingServer.cover_image} className="size-full object-cover opacity-50" />
                          ) : (
                             <span className="text-[10px] text-zinc-500 font-bold">无预览图片</span>
                          )}
                       </div>
                       <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-black gap-2" onClick={() => { setCropperTarget("cover"); setCropperOpen(true); }}>
                         <ImageIcon size={12} /> 上传封面
                      </Button>
                    </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <label className="text-sm font-medium">Provider</label>
                <Input 
                  placeholder="e.g. Stravision" 
                  value={editingServer?.provider || ""}
                  onChange={(e) => setEditingServer({ ...editingServer, provider: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Input 
                  placeholder="agriculture/web..." 
                  value={editingServer?.category || "web"}
                  onChange={(e) => setEditingServer({ ...editingServer, category: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea 
                placeholder="What does this server do?" 
                value={editingServer?.description || ""}
                onChange={(e) => setEditingServer({ ...editingServer, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <label className="text-sm font-medium">Command</label>
                <Input 
                  placeholder="npx / uvx" 
                  value={editingServer?.command || "npx"}
                  onChange={(e) => setEditingServer({ ...editingServer, command: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Args (JSON Array)</label>
                <Input 
                  placeholder='["-y", "@mendable/firecrawl-mcp"]' 
                  value={editingServer?.args || "[]"}
                  onChange={(e) => setEditingServer({ ...editingServer, args: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-500">Default Env Vars (JSON Object)</label>
              <Textarea 
                placeholder='{"API_KEY": ""}' 
                className="font-mono text-xs h-24"
                value={editingServer?.envVars || "{}"}
                onChange={(e) => setEditingServer({ ...editingServer, envVars: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-6 py-2 border rounded-lg px-4">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="mcp-pub-check" checked={editingServer?.is_published === 1} onChange={e => setEditingServer({...editingServer, is_published: e.target.checked?1:0})} />
                  <label htmlFor="mcp-pub-check" className="text-sm">Published</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="mcp-off-check" checked={editingServer?.official} onChange={e => setEditingServer({...editingServer, official: e.target.checked})} />
                  <label htmlFor="mcp-off-check" className="text-sm">Official Badge</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="mcp-key-check" checked={editingServer?.requiresApiKey} onChange={e => setEditingServer({...editingServer, requiresApiKey: e.target.checked})} />
                  <label htmlFor="mcp-key-check" className="text-sm">Requires API Key</label>
                </div>
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 bg-white dark:bg-zinc-900 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white">Save MCP Server</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Image Cropper Modal */}
      <ImageCropper 
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        title={cropperTarget === "icon" ? "裁剪工具图标" : "裁剪封面大图"}
        aspect={cropperTarget === "icon" ? 1 : 2.22}
        onCropComplete={(url) => {
           if (cropperTarget === "icon") {
             setEditingServer(prev => ({ ...prev, icon: url }))
           } else {
             setEditingServer(prev => ({ ...prev, cover_image: url }))
           }
        }}
      />
    </div>
  )
}
