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
import { Loader2, Plus, Pencil, Trash2, Search, Globe, Lock, ExternalLink, Image as ImageIcon, Layout, Sparkles, Terminal } from "lucide-react"
import { cn } from "@/lib/utils"
import { ImageCropper } from "./image-cropper"

interface Skill {
  id: number
  skill_id: string
  name: string
  description: string
  icon: string
  category: string
  author: string
  version: string
  keywords: string
  examples: string
  effects: string
  content: string
  cover_image?: string
  priority: number
  is_published: number
  is_builtin: number
  install_count: number
}

export function SkillManager() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Partial<Skill> | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false)
  const [cropperTarget, setCropperTarget] = useState<"icon" | "cover">("icon")

  useEffect(() => {
    fetchSkills()
  }, [])

  const fetchSkills = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/skills/store?admin=1")
      const data = await res.json()
      setSkills(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error("Failed to fetch skills")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!editingSkill?.skill_id || !editingSkill?.name) {
      toast.error("Skill ID and Name are required")
      return
    }

    const method = editingSkill.id ? "PUT" : "POST"
    const url = editingSkill.id 
      ? `/api/skills/store/${editingSkill.skill_id}` 
      : "/api/skills/store"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSkill),
      })

      if (res.ok) {
        toast.success(editingSkill.id ? "Skill updated" : "Skill created")
        setDialogOpen(false)
        fetchSkills()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to save skill")
      }
    } catch (e) {
      toast.error("Error saving skill")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this skill?")) return
    try {
      const res = await fetch(`/api/skills/store/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Skill deleted")
        fetchSkills()
      }
    } catch (e) {
      toast.error("Failed to delete skill")
    }
  }

  const filteredSkills = skills.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.skill_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const SkillIcon = ({ icon, name, className }: { icon: string, name: string, className?: string }) => {
    const isEmoji = /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(icon) || icon.length <= 2
    if (isEmoji) return <div className={cn(className, "flex items-center justify-center text-4xl")}>{icon}</div>
    
    return (
      <div className={cn(className, "flex items-center justify-center overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800")}>
        <img 
          src={icon} 
          alt={name} 
          className="size-full object-cover" 
          onError={(e) => {
             e.currentTarget.style.display = 'none'
             e.currentTarget.parentElement!.innerHTML = `<span class="text-xs font-black">${name.charAt(0).toUpperCase()}</span>`
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <Input 
            placeholder="Search skills..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => {
          setEditingSkill({ 
            skill_id: "",
            name: "",
            description: "",
            icon: "🧩", 
            category: "工具", 
            author: "StravisionAI",
            version: "1.0.0",
            keywords: "",
            examples: "",
            effects: "",
            content: "",
            is_published: 0, 
            is_builtin: 0, 
            priority: 0 
          })
          setDialogOpen(true)
        }}>
          <Plus className="size-4 mr-2" />
          Add Skill
        </Button>
      </div>

      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Priority</TableHead>
              <TableHead>Icon</TableHead>
              <TableHead>Skill ID</TableHead>
              <TableHead>Name</TableHead>
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
            ) : filteredSkills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                  No skills found.
                </TableCell>
              </TableRow>
            ) : filteredSkills.map((skill) => (
              <TableRow key={skill.id}>
                <TableCell className="font-bold text-primary">#{skill.priority}</TableCell>
                <TableCell>
                   <SkillIcon icon={skill.icon} name={skill.name} className="size-10 rounded-lg" />
                </TableCell>
                <TableCell className="font-mono text-xs">{skill.skill_id}</TableCell>
                <TableCell className="font-medium">{skill.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold">{skill.category}</Badge>
                </TableCell>
                <TableCell>
                  {skill.is_published ? (
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                      <Globe className="size-3 mr-1" /> Published
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      <Lock className="size-3 mr-1" /> Draft
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingSkill(skill)
                      setDialogOpen(true)
                    }}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => handleDelete(skill.skill_id)}
                      disabled={skill.is_builtin === 1}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSkill?.id ? "Edit Skill" : "New Skill"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold opacity-60">Skill ID (Unique Slug)</label>
                <Input 
                  placeholder="e.g. agriculture-expert" 
                  value={editingSkill?.skill_id || ""}
                  onChange={(e) => setEditingSkill({ ...editingSkill, skill_id: e.target.value })}
                  disabled={!!editingSkill?.id}
                  className="h-12 px-4 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold opacity-60">Name</label>
                <Input 
                  placeholder="e.g. 农业专家" 
                  value={editingSkill?.name || ""}
                  onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                  className="h-12 px-4 rounded-xl font-bold"
                />
              </div>
            </div>

            {/* Image Fields Integrated with Cropper */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-bold opacity-60 flex items-center gap-2">
                   <Layout className="size-4" /> 图标 URL / Emoji
                </label>
                <div className="flex gap-3">
                   <div className="size-12 rounded-xl flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 group relative overflow-hidden">
                      {editingSkill?.icon && (
                        (editingSkill.icon.startsWith('http') || editingSkill.icon.startsWith('/')) ? (
                          <img src={editingSkill.icon} className="size-full object-cover" />
                        ) : (
                          <span className="text-2xl">{editingSkill.icon}</span>
                        )
                      )}
                      {!editingSkill?.icon && <Plus className="size-5 text-zinc-400" />}
                   </div>
                   <div className="flex-1 space-y-2">
                     <Input 
                        placeholder="🧩 或 图片链接" 
                        value={editingSkill?.icon || ""}
                        onChange={(e) => setEditingSkill({ ...editingSkill, icon: e.target.value })}
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
                   <Sparkles className="size-4" /> 封面大图 URL (精选/详情页)
                </label>
                <div className="space-y-2">
                   <Input 
                      placeholder="https://images.unsplash.com/..." 
                      value={editingSkill?.cover_image || ""}
                      onChange={(e) => setEditingSkill({ ...editingSkill, cover_image: e.target.value })}
                      className="h-12 px-4 rounded-xl"
                    />
                    <div className="flex items-center gap-3">
                       <div className="flex-1 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-black/5 flex items-center justify-center overflow-hidden">
                          {editingSkill?.cover_image ? (
                             <img src={editingSkill.cover_image} className="size-full object-cover opacity-50" />
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
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold opacity-60">Category</label>
                <Input 
                  placeholder="精选/农业/系统..." 
                  value={editingSkill?.category || "工具"}
                  onChange={(e) => setEditingSkill({ ...editingSkill, category: e.target.value })}
                  className="h-12 px-4 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold opacity-60">Priority (0-100)</label>
                <Input 
                  type="number"
                  placeholder="100 = Top" 
                  value={editingSkill?.priority || 0}
                  onChange={(e) => setEditingSkill({ ...editingSkill, priority: parseInt(e.target.value) || 0 })}
                  className="h-12 px-4 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold opacity-60">Description (Brief)</label>
              <Textarea 
                placeholder="Brief description..." 
                className="h-20 rounded-xl"
                value={editingSkill?.description || ""}
                onChange={(e) => setEditingSkill({ ...editingSkill, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2 text-sm">
                <label className="font-bold opacity-60">Status & Built-in</label>
                <div className="flex items-center gap-6 py-2 border rounded-xl px-4 h-12 bg-zinc-50 dark:bg-zinc-900/50 border-black/5 dark:border-white/5">
                   <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="skill-pub-check"
                        checked={editingSkill?.is_published === 1}
                        onChange={(e) => setEditingSkill({ ...editingSkill, is_published: e.target.checked ? 1 : 0 })}
                      />
                      <label htmlFor="skill-pub-check" className="font-bold text-xs">Published</label>
                   </div>
                   <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="skill-builtin-check"
                        checked={editingSkill?.is_builtin === 1}
                        onChange={(e) => setEditingSkill({ ...editingSkill, is_builtin: e.target.checked ? 1 : 0 })}
                      />
                      <label htmlFor="skill-builtin-check" className="font-bold text-xs">System Built-in</label>
                   </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-amber-500">Interaction Examples (Comma Separated)</label>
                <Input 
                  placeholder="e.g. 你是谁？,当前环境如何？" 
                  value={editingSkill?.examples || ""}
                  onChange={(e) => setEditingSkill({ ...editingSkill, examples: e.target.value })}
                  className="h-12 px-4 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-primary flex items-center gap-2">
                 <Terminal className="size-4" /> System Prompt (Core Instructions)
              </label>
              <Textarea 
                placeholder="# Skill Instruction..." 
                className="h-[350px] font-mono text-xs bg-zinc-50 dark:bg-zinc-950 p-6 rounded-[2rem] border-black/5 dark:border-white/5"
                value={editingSkill?.content || ""}
                onChange={(e) => setEditingSkill({ ...editingSkill, content: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 bg-white dark:bg-zinc-900 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl px-8">Cancel</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary text-white rounded-xl px-12 font-bold shadow-lg shadow-emerald-500/20">
               Save Skill Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Cropper Modal Integration */}
      <ImageCropper 
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        title={cropperTarget === "icon" ? "裁剪技能图标" : "裁剪技能封面图"}
        aspect={cropperTarget === "icon" ? 1 : 2.22}
        onCropComplete={(url) => {
           if (cropperTarget === "icon") {
             setEditingSkill(prev => ({ ...prev, icon: url }))
           } else {
             setEditingSkill(prev => ({ ...prev, cover_image: url }))
           }
        }}
      />
    </div>
  )
}
