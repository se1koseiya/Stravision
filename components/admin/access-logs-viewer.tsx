"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { RefreshCcw } from "@/components/animate-ui/icons/refresh-ccw";
import { AccessLog } from "@/lib/db/security-service"
import { format } from "date-fns"

export function AccessLogsViewer() {
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/access-logs?limit=50")
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
    } catch (error) {
      console.error("Failed to fetch logs", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  return (
    <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-none shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold">Recent Access Logs</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="rounded-none">
          <RefreshCcw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-800/50">
              <TableRow className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-500">Time</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-500">IP</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-500">Method</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-500">Path</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-500">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-zinc-500">No logs found</TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                    <TableCell className="whitespace-nowrap font-mono text-xs text-zinc-500">
                      {format(new Date(Number(log.created_at)), "MM-dd HH:mm:ss")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.ip}</TableCell>
                    <TableCell className="font-mono text-xs font-semibold">{log.method}</TableCell>
                    <TableCell className="max-w-[200px] truncate font-mono text-xs text-zinc-600 dark:text-zinc-400" title={log.path}>
                      {log.path}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-none text-[10px] font-medium border ${
                        log.status >= 400 
                          ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30' 
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30'
                      }`}>
                        {log.status}
                      </span>
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
