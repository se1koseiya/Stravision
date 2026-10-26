"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { toast } from "@/lib/ui/feedback"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { IconAttention, IconCheckOne, IconDelete, IconLoading, IconMagic, IconPlayOne, IconPlus, IconPower, IconTime } from "@/components/icon";

interface ScheduledTask {
  id: number
  title: string
  cron_expression?: string | null
  execute_at?: number | null
  next_run?: number | null
  action_type: 'relay' | 'led'
  device_id?: number
  params: string
  is_active: number
  created_at: number
}

interface AIGeneratedTask {
  title: string
  execute_at_time: string
  action_type: 'relay' | 'led'
  device_id: number
  params: string
  reason: string
}

const DEVICES = [
  { id: 5, name: "灌溉水泵" },
  { id: 6, name: "通风风扇" },
  { id: 7, name: "补光灯" },
  { id: 8, name: "白光灯" },
]

export function DayTaskManager({ date }: { date: Date }) {
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  
  // AI Preview Dialog State
  const [showPreview, setShowPreview] = useState(false)
  const [generatedTasks, setGeneratedTasks] = useState<AIGeneratedTask[]>([])
  const [selectedPreviewTasks, setSelectedPreviewTasks] = useState<number[]>([])
  const [isSavingAI, setIsSavingAI] = useState(false)
  
  // Edit State for AI Preview
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<{
    time: string
    deviceId: string
    isOn: boolean
  } | null>(null)

  const { deviceData } = useDeviceData()
  const { weatherData } = useWeatherContext()

  // Form State
  const [time, setTime] = useState("08:00")
  const [selectedDevice, setSelectedDevice] = useState("5")
  const [actionValue, setActionValue] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/scheduler/tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (e) {
      console.error(e)
      toast.error("获取任务失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const handleGenerateAI = async () => {
    setIsGenerating(true)
    toast.info("AI 正在分析环境与天气...", { duration: 2000 })
    
    try {
        // Get settings for API key if custom mode
        let aiSettings = null
        try {
            const s = localStorage.getItem("ai-settings")
            if (s) aiSettings = JSON.parse(s)
        } catch {}

        const res = await fetch('/api/ai/generate-schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: date.toISOString(),
                deviceData,
                weatherData,
                apiKey: aiSettings?.apiKey,
                apiUrl: aiSettings?.apiUrl,
                model: aiSettings?.model
            })
        })

        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || "生成失败")
        }

        const data = await res.json()
        const aiTasks: AIGeneratedTask[] = data.tasks || []

        if (aiTasks.length === 0) {
            toast.info("AI 认为当前无需额外操作")
            return
        }

        // Show preview dialog instead of auto-creating
        setGeneratedTasks(aiTasks)
        setSelectedPreviewTasks(aiTasks.map((_, i) => i)) // Default select all
        setShowPreview(true)

    } catch (e: any) {
        console.error(e)
        toast.error(e.message || "AI 生成失败，请检查设置")
    } finally {
        setIsGenerating(false)
    }
  }

  const handleConfirmSaveAI = async () => {
    if (selectedPreviewTasks.length === 0) {
        toast.warning("请至少选择一个任务")
        return
    }

    setIsSavingAI(true)
    let createdCount = 0
    const newTasks: ScheduledTask[] = []

    try {
        for (const index of selectedPreviewTasks) {
            const task = generatedTasks[index]
            
            // Parse HH:MM to timestamp
            const [h, m] = task.execute_at_time.split(':').map(Number)
            const executeAt = new Date(date)
            executeAt.setHours(h, m, 0, 0)

            console.log(`[DayTaskManager] Saving task for date: ${date.toISOString()}, executeAt: ${executeAt.toISOString()}`)

            let paramsObj = {}
            try {
                paramsObj = typeof task.params === 'string' ? JSON.parse(task.params) : task.params
            } catch (e) {
                console.warn("Failed to parse params:", task.params)
            }

            const createRes = await fetch('/api/scheduler/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: `[AI] ${task.title}`,
                    execute_at: executeAt.getTime(),
                    action_type: task.action_type,
                    device_id: task.device_id,
                    params: paramsObj
                })
            })
            
            if (createRes.ok) {
                const json = await createRes.json()
                if (json.task) {
                    newTasks.push(json.task)
                }
                createdCount++
            } else {
                console.error("Failed to save task:", await createRes.text())
            }
        }

        toast.success(`已成功添加 ${createdCount} 个智能任务`)
        
        // Optimistically update
        if (newTasks.length > 0) {
            setTasks(prev => [...prev, ...newTasks])
        } else {
            fetchTasks()
        }
        
        setShowPreview(false)
        setGeneratedTasks([])
        setEditingIndex(null)

    } catch (e) {
        console.error(e)
        toast.error("保存任务时出错")
    } finally {
        setIsSavingAI(false)
    }
  }

  const togglePreviewSelection = (index: number) => {
    if (editingIndex !== null) return
    setSelectedPreviewTasks(prev => 
        prev.includes(index) 
            ? prev.filter(i => i !== index)
            : [...prev, index]
    )
  }

  const startEditing = (index: number, task: AIGeneratedTask) => {
    let isOn = false
    try {
        const params = JSON.parse(task.params)
        isOn = params.value === 1
    } catch {}

    setEditingIndex(index)
    setEditForm({
        time: task.execute_at_time,
        deviceId: task.device_id.toString(),
        isOn
    })
  }

  const saveEditing = () => {
    if (editingIndex === null || !editForm) return

    const deviceName = DEVICES.find(d => d.id.toString() === editForm.deviceId)?.name || "设备"
    const newTitle = `${deviceName} ${editForm.isOn ? "开启" : "关闭"}`
    
    setGeneratedTasks(prev => {
        const next = [...prev]
        next[editingIndex] = {
            ...next[editingIndex],
            title: newTitle,
            execute_at_time: editForm.time,
            device_id: parseInt(editForm.deviceId),
            params: JSON.stringify({ value: editForm.isOn ? 1 : 0 }),
        }
        return next
    })
    
    setEditingIndex(null)
    setEditForm(null)
  }

  const cancelEditing = () => {
    setEditingIndex(null)
    setEditForm(null)
  }

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      // Parse time to timestamp on selected date
      const [hours, minutes] = time.split(':').map(Number)
      const executeAt = new Date(date)
      executeAt.setHours(hours, minutes, 0, 0)

      const deviceName = DEVICES.find(d => d.id.toString() === selectedDevice)?.name || "设备"
      const title = `${deviceName} ${actionValue ? "开启" : "关闭"}`

      const res = await fetch('/api/scheduler/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          execute_at: executeAt.getTime(),
          action_type: 'relay', // Simplified for now
          device_id: parseInt(selectedDevice),
          params: { value: actionValue ? 1 : 0 }
        })
      })

      if (!res.ok) throw new Error("Failed")
      
      const json = await res.json()
      toast.success("任务已添加")
      setIsAdding(false)
      
      if (json.task) {
        setTasks(prev => [...prev, json.task])
      } else {
        fetchTasks()
      }
    } catch (e) {
      toast.error("添加任务失败")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/scheduler/tasks?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== id))
        toast.success("任务已删除")
      }
    } catch (e) {
      toast.error("删除失败")
    } finally {
      setDeletingId(null)
    }
  }

  // Filter tasks for this date
  const dayTasks = tasks.filter(task => {
    if (!task.execute_at) return false
    const taskDate = new Date(task.execute_at)
    const isSameDay = (
      taskDate.getFullYear() === date.getFullYear() &&
      taskDate.getMonth() === date.getMonth() &&
      taskDate.getDate() === date.getDate()
    )

    // Debug: Check if we are filtering out recently added AI tasks
    if (!isSameDay && task.title.startsWith("[AI]")) {
        console.log(`[DayTaskManager] Hidden task: ${task.title}, Time: ${taskDate.toLocaleString()}, Selected: ${date.toLocaleString()}`)
    }

    return isSameDay
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-100 flex items-center gap-2 tracking-tight">
            {format(date, "M月d日", { locale: zhCN })} 任务
            {isGenerating && <IconLoading className="h-4 w-4 animate-spin text-zinc-400" />}
          </h3>
          <p className="text-xs text-zinc-500 mt-1 font-medium">
            管理当天的自动控制任务
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => fetchTasks()}
                title="刷新任务"
                className="h-8 w-8 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"
            >
                <IconLoading className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button 
                size="sm" 
                variant="outline" 
                className="gap-1.5 h-8 border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-600 dark:border-indigo-900/30 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40 rounded-full text-xs font-bold transition-all shadow-sm border"
                onClick={handleGenerateAI}
                disabled={isGenerating || loading}
            >
                {isGenerating ? <IconLoading className="h-3 w-3 animate-spin" /> : <IconMagic className="h-3 w-3" />}
                <span className="hidden xs:inline">AI 生成</span>
            </Button>
            <Button 
              size="sm" 
              onClick={() => setIsAdding(!isAdding)} 
              variant={isAdding ? "secondary" : "default"}
              className={cn("h-8 gap-1.5 rounded-full text-xs font-bold shadow-sm transition-all", isAdding ? "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300" : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900")}
            >
               {isAdding ? "取消" : <><IconPlus className="h-3.5 w-3.5" /> 添加</>}
            </Button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-4 animate-in fade-in slide-in-from-top-2 shadow-lg shadow-zinc-100/50 dark:shadow-black/20">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-500">执行时间</Label>
              <Input 
                type="time" 
                value={time} 
                onChange={(e) => setTime(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-900/50 h-9 text-sm border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 rounded-xl transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-500">设备</Label>
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900/50 h-9 text-sm border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 rounded-xl transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEVICES.map(d => (
                    <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-xl border border-transparent">
            <Label className="text-xs font-semibold text-zinc-500">动作状态</Label>
            <div className="flex items-center gap-2.5">
              <span className={cn("text-xs font-bold transition-colors", !actionValue ? "text-rose-500" : "text-zinc-400")}>关闭</span>
              <Switch checked={actionValue} onCheckedChange={setActionValue} className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-zinc-200 dark:data-[state=unchecked]:bg-zinc-700" />
              <span className={cn("text-xs font-bold transition-colors", actionValue ? "text-primary" : "text-zinc-400")}>开启</span>
            </div>
          </div>

          <Button className="w-full h-9 rounded-xl font-bold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 shadow-sm" onClick={handleCreate} disabled={submitting}>
            {submitting && <IconLoading className="mr-2 h-4 w-4 animate-spin" />}
            确认添加
          </Button>
        </div>
      )}

      <div className="space-y-3 min-h-[200px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400 gap-3">
            <IconLoading className="h-6 w-6 animate-spin text-zinc-300" />
            <span className="text-xs font-medium">加载任务中...</span>
          </div>
        ) : dayTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400 border-2 border-dashed border-zinc-100 dark:border-zinc-800/50 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/20 gap-3">
            <IconTime className="h-10 w-10 opacity-10" />
            <p className="text-sm font-semibold text-zinc-500">该日暂无计划任务</p>
            <p className="text-xs opacity-60">点击上方“添加”或使用“AI 生成”</p>
          </div>
        ) : (
          dayTasks.map(task => {
             let isOn = false
             try {
                 const params = JSON.parse(task.params)
                 isOn = params.value === 1
             } catch {}
             
             return (
              <div key={task.id} className="group flex items-center justify-between p-4 bg-white dark:bg-zinc-800/40 hover:bg-white dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 rounded-2xl transition-all shadow-sm hover:shadow-sm hover:-translate-y-0.5">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center border transition-all shadow-sm",
                    task.is_active 
                        ? isOn ? "bg-emerald-50 border-emerald-100 text-primary dark:bg-primary/10 dark:border-primary/20 dark:text-emerald-400" : "bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400"
                        : "bg-zinc-100 border-transparent text-zinc-400 dark:bg-zinc-800"
                  )}>
                    <IconPower className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{task.title}</div>
                    <div className="text-xs text-zinc-500 flex items-center gap-2 mt-1">
                       <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-lg text-[11px] font-semibold tracking-wide text-zinc-600 dark:text-zinc-400">{format(new Date(task.execute_at!), "HH:mm")}</span>
                       <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                       <span className={cn("font-bold", isOn ? "text-primary dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                         {isOn ? "开启" : "关闭"}
                       </span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 opacity-0 group-hover:opacity-100 transition-all rounded-full"
                  onClick={() => handleDelete(task.id)}
                  disabled={deletingId === task.id}
                >
                  {deletingId === task.id ? <IconLoading className="h-3.5 w-3.5 animate-spin" /> : <IconDelete className="h-3.5 w-3.5" />}
                </Button>
              </div>
            )
          })
        )}
      </div>

      {/* AI Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-md md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <IconMagic className="h-5 w-5 text-primary" />
                AI 智能排程建议
            </DialogTitle>
            <DialogDescription>
                AI 分析了当前环境数据，为您生成了以下 {generatedTasks.length} 个任务建议。请勾选您需要执行的任务。
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-3 py-2">
                {generatedTasks.map((task, index) => {
                    const isSelected = selectedPreviewTasks.includes(index)
                    const isEditing = editingIndex === index
                    
                    if (isEditing && editForm) {
                        return (
                            <div key={index} className="flex flex-col gap-3 p-3 rounded-lg border bg-card shadow-sm border-primary/50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex items-center gap-2">
                                    <div className="grid grid-cols-2 gap-3 flex-1">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">时间</Label>
                                            <Input 
                                                type="time" 
                                                value={editForm.time}
                                                onChange={(e) => setEditForm({...editForm, time: e.target.value})}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">设备</Label>
                                            <Select 
                                                value={editForm.deviceId} 
                                                onValueChange={(v) => setEditForm({...editForm, deviceId: v})}
                                            >
                                                <SelectTrigger className="h-8 text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {DEVICES.map(d => (
                                                        <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-1 min-w-[80px]">
                                        <Label className="text-xs text-muted-foreground">状态</Label>
                                        <div className="flex items-center gap-2 h-8">
                                             <Switch 
                                                checked={editForm.isOn}
                                                onCheckedChange={(c) => setEditForm({...editForm, isOn: c})}
                                             />
                                             <span className={cn("text-xs font-medium", editForm.isOn ? "text-green-600" : "text-red-500")}>
                                                {editForm.isOn ? "开启" : "关闭"}
                                             </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-1">
                                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={cancelEditing}>取消</Button>
                                    <Button size="sm" className="h-7 text-xs bg-primary/90" onClick={saveEditing}>保存修改</Button>
                                </div>
                            </div>
                        )
                    }

                    let isOn = false
                    try {
                        const params = JSON.parse(task.params)
                        isOn = params.value === 1
                    } catch {}
                    const deviceName = DEVICES.find(d => d.id === task.device_id)?.name || "未知设备"

                    return (
                        <div 
                            key={index} 
                            className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border transition-all group relative",
                                isSelected ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800" : "bg-card hover:bg-muted/50"
                            )}
                        >
                            <Checkbox 
                                checked={isSelected}
                                onCheckedChange={() => togglePreviewSelection(index)}
                                className="mt-1 z-10"
                            />
                            <div 
                                className="flex-1 space-y-1 cursor-pointer"
                                onClick={() => startEditing(index, task)}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm flex items-center gap-2">
                                        <span className="font-mono text-primary bg-primary/10 px-1.5 rounded text-xs py-0.5">
                                            {task.execute_at_time}
                                        </span>
                                        {task.title}
                                    </span>
                                    <span className={cn(
                                        "text-xs px-2 py-0.5 rounded-full",
                                        isOn ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    )}>
                                        {isOn ? "开启" : "关闭"}
                                    </span>
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <span>{deviceName}</span>
                                </div>
                                {task.reason && (
                                    <div className="text-xs text-muted-foreground/80 bg-muted/50 p-2 rounded mt-1">
                                        💡 {task.reason}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
                取消
            </Button>
            <Button 
                onClick={handleConfirmSaveAI} 
                disabled={isSavingAI || selectedPreviewTasks.length === 0}
                className="bg-primary hover:bg-emerald-700 text-white"
            >
                {isSavingAI && <IconLoading className="mr-2 h-4 w-4 animate-spin" />}
                确认添加 ({selectedPreviewTasks.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
