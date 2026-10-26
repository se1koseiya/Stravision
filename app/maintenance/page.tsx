import { getMaintenanceConfig } from "@/lib/db/maintenance-service"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { IconCaution, IconTool } from "@/components/icon";

export default async function MaintenancePage() {
  const config = await getMaintenanceConfig()

  if (!config.enabled) {
    // If someone accesses /maintenance manually when disabled, maybe redirect home?
    // Or just show it as a preview? Let's show it but with a note.
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-foreground p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl dark:bg-amber-900/10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl dark:bg-orange-900/10" />
      </div>

      <div className="relative z-10 max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="mx-auto w-24 h-24 rounded-2xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center border border-amber-200 dark:border-amber-800 shadow-lg rotate-3 transition-transform hover:rotate-6">
          <IconTool className="w-12 h-12 text-amber-600 dark:text-amber-500" />
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            {config.title || "系统维护中"}
          </h1>
          <div className="p-6 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-black/5 dark:border-white/10 shadow-sm">
            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {config.message || "我们正在进行系统升级，预计很快恢复。请稍后再试。"}
            </p>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-center gap-4">
           {/* Optional: Contact support or Admin Login */}
           <Link href="/login">
             <Button variant="ghost" className="text-xs text-muted-foreground hover:text-foreground">
               管理员登录
             </Button>
           </Link>
        </div>
      </div>

      <div className="absolute bottom-8 text-center">
        <p className="text-xs text-muted-foreground/60 font-mono">
          STRAVISION IOT PLATFORM
        </p>
      </div>
    </div>
  )
}
