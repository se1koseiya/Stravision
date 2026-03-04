"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Shield, Save } from "lucide-react";
import { RefreshCcw } from "@/components/animate-ui/icons/refresh-ccw";

interface RateLimitConfig {
  limit: number
  windowMs: number
  violationLimit: number
  banDuration: number
}

export function RateLimitSettings() {
  const [config, setConfig] = useState<RateLimitConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/settings/rate-limit")
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
      }
    } catch (error) {
      toast.error("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return

    try {
      setSaving(true)
      const res = await fetch("/api/admin/settings/rate-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (!res.ok) {
        throw new Error("Failed to save settings")
      }

      toast.success("Settings saved successfully")
    } catch (error) {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key: keyof RateLimitConfig, value: string) => {
    if (!config) return
    const numValue = parseInt(value)
    if (isNaN(numValue)) return
    setConfig({ ...config, [key]: numValue })
  }

  if (loading) return <div>Loading settings...</div>
  if (!config) return <div>Error loading settings</div>

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Auto-Ban Thresholds</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchConfig}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="limit">Max Requests (per window)</Label>
              <Input
                id="limit"
                type="number"
                value={config.limit}
                onChange={(e) => handleChange("limit", e.target.value)}
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                Maximum requests allowed before rate limiting triggers.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="windowMs">Window Duration (ms)</Label>
              <Input
                id="windowMs"
                type="number"
                value={config.windowMs}
                onChange={(e) => handleChange("windowMs", e.target.value)}
                min={1000}
                step={1000}
              />
              <p className="text-xs text-muted-foreground">
                Time window in milliseconds (e.g., 60000 = 1 minute).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="violationLimit">Violation Limit</Label>
              <Input
                id="violationLimit"
                type="number"
                value={config.violationLimit}
                onChange={(e) => handleChange("violationLimit", e.target.value)}
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                Number of rate limit violations before IP is auto-banned.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="banDuration">Ban Duration (ms)</Label>
              <Input
                id="banDuration"
                type="number"
                value={config.banDuration}
                onChange={(e) => handleChange("banDuration", e.target.value)}
                min={1000}
                step={1000}
              />
              <p className="text-xs text-muted-foreground">
                How long the IP remains banned (e.g., 86400000 = 24 hours).
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
