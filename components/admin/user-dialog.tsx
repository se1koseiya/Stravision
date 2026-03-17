"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { UserPublic } from "@/lib/db/user-service"
import { toast } from "sonner"

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserPublic | null // null for create mode
  currentUserRole: string
  onSuccess: () => void
}

const CONTROLS = [
  { id: 'relay5', label: 'Relay 5' },
  { id: 'relay6', label: 'Relay 6' },
  { id: 'relay7', label: 'Relay 7' },
  { id: 'relay8', label: 'Relay 8' },
  { id: 'led1', label: 'LED 1' },
  { id: 'led2', label: 'LED 2' },
  { id: 'led3', label: 'LED 3' },
  { id: 'led4', label: 'LED 4' },
]

export function UserDialog({ open, onOpenChange, user, currentUserRole, onSuccess }: UserDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
    membership: "free",
    avatar_url: "",
    allowedControls: [] as string[],
    daily_ai_limit: 10,
    ai_balance: 0,
  })

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        password: "", // Password not retrieved
        role: user.role,
        membership: user.membership || 'free',
        avatar_url: user.avatar_url || "",
        allowedControls: user.permissions?.allowedControls || [],
        // @ts-expect-error - backend returns these fields
        daily_ai_limit: user.daily_ai_limit ?? 10,
        // @ts-expect-error - backend returns these fields
        ai_balance: user.ai_balance ?? 0,
      })
    } else {
      setFormData({
        username: "",
        email: "",
        password: "",
        role: "user",
        membership: "free",
        avatar_url: "",
        allowedControls: [],
        daily_ai_limit: 10,
        ai_balance: 0,
      })
    }
  }, [user, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = user ? `/api/admin/users/${user.id}` : "/api/admin/users"
      const method = user ? "PUT" : "POST"

      const body: any = {
        username: formData.username,
        role: formData.role,
        membership: formData.membership,
        permissions: {
          allowedControls: formData.allowedControls
        },
        daily_ai_limit: Number(formData.daily_ai_limit),
        ai_balance: Number(formData.ai_balance),
      }

      if (formData.email && !user) {
        body.email = formData.email
      }

      if (formData.password) {
        body.password = formData.password
      }
      
      if (formData.avatar_url) {
        body.avatar_url = formData.avatar_url
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Operation failed")
      }

      toast.success(user ? "User updated successfully" : "User created successfully")
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation failed")
    } finally {
      setLoading(false)
    }
  }

  const toggleControl = (controlId: string) => {
    setFormData(prev => {
      const controls = prev.allowedControls.includes(controlId)
        ? prev.allowedControls.filter(id => id !== controlId)
        : [...prev.allowedControls, controlId]
      return { ...prev, allowedControls: controls }
    })
  }

  const canEditRole = currentUserRole === 'super_admin';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user ? "Edit User" : "Create User"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
              disabled={!!user} // Email usually immutable or handled separately
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{user ? "New Password (leave blank to keep)" : "Password"}</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
              required={!user}
            />
          </div>

          <div className="space-y-2">
             <Label htmlFor="avatar">Avatar URL</Label>
             <Input
               id="avatar"
               value={formData.avatar_url}
               onChange={e => setFormData(prev => ({ ...prev, avatar_url: e.target.value }))}
             />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              disabled={!canEditRole}
              value={formData.role}
              onValueChange={val => setFormData(prev => ({ ...prev, role: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            {!canEditRole && <p className="text-xs text-muted-foreground">Only Super Admin can change roles.</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="membership">Membership</Label>
            <Select
              value={formData.membership}
              onValueChange={val => {
                let limit = formData.daily_ai_limit;
                if (val === 'free') limit = 0;
                else if (val === 'pro') limit = 70;
                else if (val === 'plus') limit = 999999;
                
                setFormData(prev => ({ 
                    ...prev, 
                    membership: val,
                    daily_ai_limit: limit
                }))
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select membership" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="plus">Plus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>AI Quota Settings</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="daily_ai_limit">Daily Limit</Label>
                <Input
                  id="daily_ai_limit"
                  type="number"
                  min="0"
                  value={formData.daily_ai_limit}
                  onChange={(e) => setFormData({ ...formData, daily_ai_limit: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai_balance">Extra Balance</Label>
                <Input
                  id="ai_balance"
                  type="number"
                  min="0"
                  value={formData.ai_balance}
                  onChange={(e) => setFormData({ ...formData, ai_balance: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Device Control Permissions</Label>
            <div className="grid grid-cols-2 gap-2 border p-4 rounded-md">
              {CONTROLS.map(control => (
                <div key={control.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`control-${control.id}`}
                    checked={formData.allowedControls.includes(control.id)}
                    onCheckedChange={() => toggleControl(control.id)}
                  />
                  <label
                    htmlFor={`control-${control.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {control.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
