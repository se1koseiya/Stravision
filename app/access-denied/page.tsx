import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconShield } from "@/components/icon";

export default function AccessDeniedPage() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden text-foreground">
      <div className="absolute inset-0 bg-[#F1EFEA] dark:bg-[#0B1220]" />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(255,255,255,0.75),transparent_60%),radial-gradient(1000px_circle_at_85%_0%,rgba(209,250,229,0.55),transparent_55%),radial-gradient(900px_circle_at_70%_90%,rgba(224,231,255,0.55),transparent_60%)] dark:hidden" />
      <div className="absolute inset-0 hidden dark:block dark:bg-[radial-gradient(1200px_circle_at_15%_10%,rgba(59,130,246,0.18),transparent_60%),radial-gradient(1000px_circle_at_85%_0%,rgba(16,185,129,0.14),transparent_55%),radial-gradient(900px_circle_at_70%_90%,rgba(99,102,241,0.12),transparent_60%)]" />

      <div className="relative z-10 max-w-md w-full text-center space-y-6 p-4">
        <div className="flex justify-center">
          <div className="size-24 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shadow-lg shadow-red-500/20">
            <IconShield className="size-12 text-red-600 dark:text-red-500" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            访问被拒绝
          </h1>
          <p className="text-muted-foreground">
            Access Denied
          </p>
        </div>

        <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] dark:bg-slate-900/45 dark:border-white/10 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)] p-6 text-left space-y-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">为什么会看到这个页面？</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              系统检测到您的 IP 地址存在可疑的访问行为（如频繁请求、恶意扫描或尝试暴力破解），为了保障平台安全，已自动暂时封禁您的访问权限。
            </p>
          </div>
          
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">如何解除？</h3>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>封禁通常会在 24 小时后自动解除。</li>
              <li>如果您认为这是误判，请联系系统管理员。</li>
            </ul>
          </div>

          <div className="pt-2 text-xs text-muted-foreground font-mono bg-black/5 dark:bg-white/5 p-2 rounded border border-black/5 dark:border-white/5">
            Error Code: 403_SUSPICIOUS_ACTIVITY
          </div>
        </div>

        <div className="pt-4">
           <p className="text-xs text-muted-foreground mb-4">
             如果您是管理员，请通过受信任的网络环境访问控制台进行解封。
           </p>
           <Button variant="outline" className="bg-white/50 dark:bg-slate-800/50" asChild>
             <Link href="/">返回首页</Link>
           </Button>
        </div>
      </div>
    </div>
  );
}
