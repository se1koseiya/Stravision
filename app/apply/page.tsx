"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function ApplyPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white font-sans flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.1),transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <nav className="absolute top-8 left-8 z-50">
        <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-mono text-xs uppercase tracking-widest">Back</span>
        </Link>
      </nav>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">企业级部署申请</h1>
          <p className="text-white/40 text-sm">提交您的需求，解决方案专家将在 24 小时内与您联系。</p>
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-1">
            <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Work Email</label>
            <input 
              type="email" 
              placeholder="name@company.com"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all placeholder:text-white/20"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Company Name</label>
            <input 
              type="text" 
              placeholder="Acme Corp."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all placeholder:text-white/20"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Use Case</label>
            <select className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-white/60">
              <option>Smart Greenhouse (智慧温室)</option>
              <option>Urban Farming (城市农业)</option>
              <option>Industrial IoT (工业互联)</option>
              <option>Other (其他)</option>
            </select>
          </div>

          <button className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-rose-500 hover:text-white transition-all mt-4">
            提交申请
          </button>

          <div className="text-center mt-6">
            <Link href="/register" className="text-xs text-white/40 hover:text-white transition-colors border-b border-transparent hover:border-white/40 pb-0.5">
              个人开发者？点击注册社区版
            </Link>
          </div>
        </form>
      </motion.div>

    </main>
  )
}
