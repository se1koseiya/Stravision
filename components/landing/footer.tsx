import Link from "next/link"
import { IconGithub, IconLinkIn, IconTwitter } from "@/components/icon";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-zinc-800 bg-[#02040a] pt-16 pb-8">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 mb-4 block">
              Stravision
            </span>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              致力于通过人工智能技术推动农业数字化转型，为全球种植者提供智能、高效的解决方案。
            </p>
            <div className="flex gap-4">
              <Link href="#" className="text-muted-foreground hover:text-white transition-colors">
                <IconGithub className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-white transition-colors">
                <IconTwitter className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-white transition-colors">
                <IconLinkIn className="w-5 h-5" />
              </Link>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-white mb-4">产品</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-white transition-colors">智能控制台</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">环境监测</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">AI 助手</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">数据分析</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">资源</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-white transition-colors">文档中心</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">API 参考</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">社区论坛</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">更新日志</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">公司</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-white transition-colors">关于我们</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">加入我们</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">联系方式</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">隐私政策</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-800 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Stravision Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
