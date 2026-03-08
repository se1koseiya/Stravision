"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Ban, ShieldAlert } from "lucide-react";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { toast } from "sonner"
import { format } from "date-fns"
import { BannedIP } from "@/lib/db/security-service"

export function BannedIPsManager() {
  const [ips, setIps] = useState<BannedIP[]>([])
  const [loading, setLoading] = useState(true)
  const [newIp, setNewIp] = useState("")
  const [reason, setReason] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchIps = async () => {
    try {
      const res = await fetch("/api/admin/banned-ips")
      if (res.ok) {
        const data = await res.json()
        setIps(data)
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to load banned IPs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIps()
  }, [])

  const handleBan = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/admin/banned-ips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: newIp, reason }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to ban IP")
      }

      toast.success("IP banned successfully")
      setNewIp("")
      setReason("")
      setDialogOpen(false)
      fetchIps()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation failed")
    }
  }

  const handleUnban = async (ip: string) => {
    try {
      const res = await fetch(`/api/admin/banned-ips?ip=${ip}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to unban IP")

      toast.success("IP unbanned successfully")
      fetchIps()
    } catch (error) {
      toast.error("Failed to unban IP")
    }
  }

  return (
    <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-none shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
           <CardTitle className="text-lg font-bold">Banned IPs</CardTitle>
           <p className="text-xs text-muted-foreground">Manage IP blocks and access control.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm" className="rounded-none shadow-none">
              <Ban className="mr-2 h-3.5 w-3.5" />
              Ban IP
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Ban IP Address</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleBan} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="ip">IP Address</Label>
                <Input
                  id="ip"
                  placeholder="192.168.1.1"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  required
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Input
                  id="reason"
                  placeholder="Malicious activity"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <Button type="submit" variant="destructive" className="w-full">
                Confirm Ban
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <div className="border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-800/50">
              <TableRow className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-500">IP Address</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-500">Reason</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-500">Banned By</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-500">Date</TableHead>
                <TableHead className="text-right font-mono text-xs uppercase tracking-wider text-zinc-500">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                    No banned IPs found.
                  </TableCell>
                </TableRow>
              ) : (
                ips.map((ip) => (
                  <TableRow key={ip.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                    <TableCell className="font-mono text-xs font-semibold text-red-600 dark:text-red-400">{ip.ip}</TableCell>
                    <TableCell className="text-xs">{ip.reason || "-"}</TableCell>
                    <TableCell className="text-zinc-500 text-xs font-mono">{ip.banned_by}</TableCell>
                    <TableCell className="text-zinc-500 text-xs font-mono">
                      {format(new Date(Number(ip.created_at)), "yyyy-MM-dd HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnban(ip.ip)}
                        className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-none h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Unban</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
