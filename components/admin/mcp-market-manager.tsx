"use client"

import { useState } from "react"
import { MCP_SERVERS, type MCPServer } from "@/lib/data/mcp-servers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Search, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

export function MCPMarketManager() {
  const [servers, setServers] = useState<MCPServer[]>(MCP_SERVERS)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const filteredServers = servers.filter(server => 
    server.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    server.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    server.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleEdit = (server: MCPServer) => {
    setEditingServer(server)
    setIsDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingServer(null)
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this MCP server? This action cannot be undone.")) {
      setServers(prev => prev.filter(s => s.id !== id))
      toast.success("MCP Server deleted")
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would call an API
    toast.success(editingServer ? "MCP Server updated" : "MCP Server created")
    setIsDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input 
            placeholder="Search MCP servers..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
          />
        </div>
        <Button onClick={handleCreate} className="bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200">
          <Plus className="mr-2 h-4 w-4" />
          Add Server
        </Button>
      </div>

      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-50 dark:bg-zinc-800/50">
            <TableRow className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
              <TableHead className="w-[80px] font-mono text-xs uppercase tracking-wider text-zinc-500 pl-6">Icon</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-500">Name / ID</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-500">Category</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-500">Popularity</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-500">Status</TableHead>
              <TableHead className="text-right font-mono text-xs uppercase tracking-wider text-zinc-500 pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredServers.map((server) => (
              <TableRow key={server.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                <TableCell className="pl-6">
                   <div className={cn("size-10 rounded-lg flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-white/5", server.iconBg)}>
                     <img 
                        src={server.icon} 
                        alt={server.displayName} 
                        className="size-full object-cover" 
                        onError={(e) => {
                           e.currentTarget.style.display = 'none'
                        }} 
                     />
                   </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{server.displayName}</span>
                    <span className="text-xs text-zinc-500 font-mono">{server.id}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-mono text-[10px] uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                    {server.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 text-sm">
                    <span className="font-mono font-bold">{server.popularity}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {server.official && (
                    <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border-indigo-200 dark:border-indigo-800/30">
                      Official
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right pr-6">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(server)} className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(server.id)} className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingServer ? "Edit MCP Server" : "Add New MCP Server"}</DialogTitle>
            <DialogDescription>
              {editingServer ? "Update the details of the MCP server." : "Add a new MCP server to the marketplace."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="id" className="text-right">
                  ID
                </Label>
                <Input
                  id="id"
                  defaultValue={editingServer?.id}
                  className="col-span-3"
                  disabled={!!editingServer}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  defaultValue={editingServer?.displayName}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  Category
                </Label>
                <Input
                  id="category"
                  defaultValue={editingServer?.category}
                  className="col-span-3"
                />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="icon" className="text-right">
                  Icon URL
                </Label>
                <Input
                  id="icon"
                  defaultValue={editingServer?.icon}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
