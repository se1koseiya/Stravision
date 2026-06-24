"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import { 
  Zap, 
  Shield, 
  Layout, 
  Sparkles, 
  ArrowRight, 
  Camera, 
  Droplets, 
  Mic,
  Volume2,
  Box,
  Monitor,
  Activity,
  ChevronRight,
  Fan,
  Lightbulb,
  Sun,
  MousePointer2,
  Lock,
  Search,
  Thermometer,
  Cloud,
  Leaf,
  Wind
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import BerryOrb from "@/components/smoothui/berry-orb";
import dynamic from "next/dynamic";

// Dynamically import project components to reuse them
const GreenhouseModel = dynamic(
  () => import("@/components/monitor/greenhouse-model").then((mod) => mod.GreenhouseModel),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-900/10 animate-pulse rounded-[3rem]" /> }
);

// Mock data for the components
const MOCK_DEVICE_DATA = {
  temperature: 24.5,
  humidity: 62.1,
  relay5: 1, // Pump on
  relay6: 0, // Fan off
  relay7: 1, // RGB on
  relay8: 0, // White off
  led1: 255, led2: 100, led3: 50,
};

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [assistantStatus, setAssistantStatus] = useState<"idle" | "listening" | "speaking">("idle");
  const [switches, setSwitches] = useState({ pump: true, fan: false, light: true, sun: false });
  
  const containerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Assistant simulation
  useEffect(() => {
    const sequence = ["listening", "speaking", "idle"];
    let i = 0;
    const interval = setInterval(() => {
      setAssistantStatus(sequence[i] as any);
      i = (i + 1) % sequence.length;
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const toggleSwitch = (key: keyof typeof switches) => {
    setSwitches(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0A0A0A] text-white selection:bg-primary/30 font-sans overflow-x-hidden">
      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled ? "bg-black/95 backdrop-blur-xl py-4 border-b border-white/5" : "bg-transparent py-8"
      )}>
        <div className="container mx-auto px-6 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 group cursor-pointer"
          >
            <Image src="/logo.png" alt="logo" width={32} height={32} className="rounded-xl shadow-2xl shadow-emerald-500/20 group-hover:rotate-6 transition-transform" />
            <div className="flex flex-col leading-tight">
              <span className="text-2xl font-black tracking-tighter text-white">STRAVISION</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Agri Hub v4.0</span>
            </div>
          </motion.div>
          
          <div className="hidden lg:flex items-center gap-10">
            {["DASHBOARD", "MONITOR", "CONTROL", "AI ASSISTANT"].map((item, idx) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
              >
                <Link href={`/${item.toLowerCase().replace(' ', '-')}`} className="text-[11px] font-black text-slate-500 hover:text-emerald-400 tracking-widest transition-colors relative group uppercase">
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Link href="/dashboard">
              <Button className="bg-primary hover:bg-emerald-400 text-black font-black rounded-full px-10 h-14 text-xs tracking-[0.2em] transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)] active:scale-95 uppercase">
                GET STARTED
              </Button>
            </Link>
          </motion.div>
        </div>
      </nav>

      <main className="container mx-auto px-6 pt-48 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 auto-rows-auto">
          
          {/* 1. MAIN HERO CARD */}
          <motion.section 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ y: -6 }}
            className="md:col-span-12 lg:col-span-7 bg-white rounded-[3.5rem] p-12 text-black flex flex-col justify-between min-h-[550px] border-[6px] border-black relative overflow-hidden group shadow-[16px_16px_0px_rgba(0,0,0,1)] hover:shadow-[24px_24px_0px_rgba(16,185,129,1)] transition-all duration-700"
          >
            <div className="flex justify-between items-start z-10">
              <div className="flex items-center gap-4">
                 <motion.div animate={{ rotate: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
                    <Image src="/logo.png" alt="icon" width={56} height={56} />
                 </motion.div>
                 <span className="text-2xl font-black uppercase tracking-tighter italic">STRAVISION.P</span>
              </div>
              <div className="flex flex-col items-end">
                 <motion.span 
                   animate={{ scale: [1, 1.05, 1] }} 
                   transition={{ repeat: Infinity, duration: 4 }}
                   className="text-6xl font-black tracking-tighter italic"
                 >
                   4.98
                 </motion.span>
                 <span className="text-[11px] font-bold bg-primary px-4 py-1.5 rounded-full text-black tracking-widest uppercase">PREMIUM CHOICE</span>
              </div>
            </div>

            <div className="mt-16 z-10">
              <motion.h1 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-[clamp(5rem,15vw,12rem)] font-black leading-[0.75] tracking-tighter mb-10"
              >
                Berry <br /> <span className="text-primary">Realm.</span>
              </motion.h1>
              <p className="text-2xl md:text-3xl font-black leading-tight max-w-xl group-hover:translate-x-3 transition-transform italic uppercase tracking-tighter">
                赋能每一寸土地，重新定义智慧农业。 <br />
                <span className="text-slate-400 not-italic tracking-normal">Integrated Vision AI & IoT Cluster for elite farms.</span>
              </p>
            </div>

            <div className="flex justify-between items-end mt-16 z-10">
               <div className="flex gap-6">
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: -3 }} 
                    className="size-20 rounded-[2rem] bg-black text-white flex flex-col items-center justify-center cursor-pointer shadow-[8px_8px_0px_rgba(16,185,129,1)]"
                  >
                    <Box className="size-8" />
                    <span className="text-[10px] font-black mt-1">TWIN</span>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 3 }} 
                    className="size-20 rounded-[2rem] bg-slate-100 flex flex-col items-center justify-center border-4 border-black cursor-pointer shadow-[8px_8px_0px_rgba(33,150,243,1)]"
                  >
                    <Zap className="size-8 text-primary" />
                    <span className="text-[10px] font-black mt-1 text-black">AUTO</span>
                  </motion.div>
               </div>
               <Link href="/dashboard" className="group/btn relative">
                 <motion.div 
                    className="absolute inset-x-0 bottom-0 top-0 bg-primary rounded-full blur-2xl opacity-10 group-hover/btn:opacity-40 transition-opacity"
                 />
                 <Button className="relative h-24 w-24 rounded-full bg-black text-white hover:bg-primary transition-all border-4 border-black hover:scale-110 active:scale-90">
                   <ArrowRight className="size-10" />
                 </Button>
               </Link>
            </div>

            <div className="absolute bottom-0 right-0 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000 grayscale">
               <Image src="https://images.unsplash.com/photo-1595841055310-adea4e214d05?q=80&w=1000" alt="bg" width={700} height={700} />
            </div>
          </motion.section>

          {/* 2. AI ASSISTANT CARD */}
          <motion.section 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -6 }}
            className="md:col-span-12 lg:col-span-5 bg-[#FFB7B7] rounded-[3.5rem] p-10 flex flex-col items-center justify-center min-h-[550px] border-[6px] border-black group shadow-[16px_16px_0px_rgba(0,0,0,1)] hover:shadow-[24px_24px_0px_white] transition-all duration-700 relative overflow-hidden"
          >
             <div className="relative size-[380px] cursor-pointer">
                <BerryOrb 
                  size="380px" 
                  isActive={assistantStatus !== 'idle'}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                   <AnimatePresence mode="wait">
                     {assistantStatus === 'listening' && (
                       <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="p-8 bg-white rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)]">
                         <Mic className="size-16 text-primary animate-pulse" />
                       </motion.div>
                     )}
                     {assistantStatus === 'speaking' && (
                       <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="p-8 bg-primary rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] text-black">
                         <Volume2 className="size-16" />
                       </motion.div>
                     )}
                   </AnimatePresence>
                </div>
             </div>
             
             <div className="mt-10 text-center relative z-10">
                <h3 className="text-5xl font-black italic tracking-tighter text-black uppercase">智能农事助理.</h3>
                <p className="text-black/50 font-black text-xs tracking-[0.3em] uppercase mt-3">LIVING & BREATHING AGRI-MIND</p>
             </div>

             <motion.div 
               className="absolute top-12 right-12 p-3.5 bg-white border-4 border-black rounded-2xl shadow-[6px_6px_0px_rgba(0,0,0,1)] text-black text-[12px] font-black uppercase tracking-tighter"
               animate={{ y: [0, -6, 0] }}
               transition={{ repeat: Infinity, duration: 4 }}
             >
               "AI 实时响应中"
             </motion.div>
          </motion.section>

          {/* 3. MONITOR CARD */}
          <motion.section 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -6 }}
            className="md:col-span-12 lg:col-span-8 bg-[#D1E9FF] rounded-[3.5rem] p-10 border-[6px] border-black flex flex-col min-h-[650px] shadow-[16px_16px_0px_rgba(0,0,0,1)] hover:shadow-[24px_24px_0px_rgba(33,150,243,1)] transition-all duration-700"
          >
             <div className="flex justify-between items-center mb-10">
                <div className="flex gap-4 items-center">
                   <div className="size-16 rounded-[1.5rem] border-4 border-black bg-white flex items-center justify-center text-black shadow-[6px_6px_0px_rgba(0,0,0,1)]">
                      <Box className="size-8" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-xs font-black text-black/30 uppercase tracking-[0.2em]">CORE SYSTEM</span>
                      <span className="text-2xl font-black text-black uppercase tracking-tighter italic">温室数字孪生.VIEW</span>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2 bg-primary/10 border-2 border-primary/20 px-4 py-1.5 rounded-full">
                      <Activity className="size-4 text-primary animate-pulse" />
                      <span className="text-[11px] font-black text-primary uppercase tracking-widest">LIVE DATA FEED</span>
                   </div>
                   <motion.div 
                     whileHover={{ x: 6 }}
                     className="size-14 rounded-full border-4 border-black bg-white flex items-center justify-center text-black cursor-pointer hover:bg-black hover:text-white transition-all shadow-[6px_6px_0px_rgba(0,0,0,1)] active:shadow-none translate-y-[-3px]"
                   >
                      <ChevronRight className="size-8" />
                   </motion.div>
                </div>
             </div>

             <div className="flex-1 bg-white/50 rounded-[3rem] border-4 border-dashed border-black/10 relative overflow-hidden group/monitor cursor-crosshair">
                <GreenhouseModel className="w-full h-full" theme="light" deviceData={MOCK_DEVICE_DATA} />
                
                <div className="absolute top-8 left-8 p-6 bg-white border-4 border-black rounded-[2.5rem] shadow-[10px_10px_0px_rgba(0,0,0,1)] animate-in fade-in slide-in-from-left duration-1000">
                   <div className="flex items-center gap-4">
                      <div className="size-12 rounded-2xl bg-primary flex items-center justify-center text-black border-2 border-black">
                         <Activity className="size-7" />
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Global Control</span>
                         <span className="text-2xl font-black text-black tracking-tighter italic uppercase">Stability: 99.8%</span>
                      </div>
                   </div>
                </div>

                <div className="absolute bottom-8 right-8 flex gap-4">
                   <div className="p-4 bg-white border-4 border-black rounded-3xl shadow-[6px_6px_0px_rgba(0,0,0,1)] text-black font-black text-xs tracking-widest uppercase">
                      ZONE_A
                   </div>
                   <div className="p-4 bg-black border-4 border-black rounded-3xl shadow-[6px_6px_0px_rgba(16,185,129,1)] text-white font-black text-xs tracking-widest uppercase">
                      NODE_0817
                   </div>
                </div>
             </div>
          </motion.section>

          {/* 4. DEVICE CONTROL / QR CARD */}
          <motion.section 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ y: -6 }}
            className="md:col-span-12 lg:col-span-4 bg-white rounded-[3.5rem] p-10 border-[6px] border-black flex flex-col items-center justify-between min-h-[650px] shadow-[16px_16px_0px_rgba(0,0,0,1)] hover:shadow-[24px_24px_0px_#FFD700] transition-all duration-700 overflow-hidden"
          >
             <div className="w-full">
                <div className="flex justify-between items-start mb-16">
                   <span className="text-[11px] font-black text-black uppercase tracking-[0.2em] flex items-center gap-2">
                     <Lock className="size-4" /> SECURE HUB
                   </span>
                   <motion.div 
                     animate={{ rotate: 360 }} 
                     transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                     className="size-12 rounded-full border-4 border-black bg-primary shadow-[6px_6px_0px_rgba(0,0,0,1)] flex items-center justify-center"
                   >
                      <Zap className="size-6 text-black" />
                   </motion.div>
                </div>
                
                <h3 className="text-5xl font-black tracking-tighter mb-10 text-black italic uppercase leading-[0.9]">
                   随时随地 <br /> <span className="text-primary underline decoration-black decoration-[8px] underline-offset-[10px]">掌握全局</span>
                </h3>
                
                <div className="grid grid-cols-2 gap-5 w-full">
                   {[
                     { key: 'pump', label: "水泵", icon: Droplets, color: "bg-emerald-400" },
                     { key: 'fan', label: "通风", icon: Fan, color: "bg-blue-400" },
                     { key: 'light', label: "补光", icon: Lightbulb, color: "bg-amber-400" },
                     { key: 'sun', label: "卷帘", icon: Sun, color: "bg-orange-400" },
                   ].map((item) => (
                     <motion.div 
                      key={item.key} 
                      whileTap={{ scale: 0.92 }}
                      onClick={() => toggleSwitch(item.key as any)}
                      className={cn(
                       "relative p-6 rounded-[2.5rem] border-4 border-black transition-all cursor-pointer select-none group/switch",
                       switches[item.key as keyof typeof switches] 
                        ? `${item.color} text-black shadow-[8px_8px_0px_rgba(0,0,0,1)]` 
                        : "bg-slate-50 text-slate-300 border-dashed"
                     )}>
                        <item.icon className={cn("size-8 mb-5 transition-transform", switches[item.key as keyof typeof switches] && "scale-110")} />
                        <div className="flex justify-between items-end">
                           <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                           <div className={cn("size-3 rounded-full border-2 border-black", switches[item.key as keyof typeof switches] ? "bg-black" : "bg-white")} />
                        </div>
                     </motion.div>
                   ))}
                </div>
             </div>

             <div className="w-full pt-12 border-t-4 border-black/5 flex items-center justify-around gap-6 group/qr">
                <motion.div 
                  whileHover={{ rotate: 5, scale: 1.05 }}
                  className="p-6 bg-black rounded-[2.5rem] shadow-[12px_12px_0px_rgba(16,185,129,1)]"
                >
                   <Image src="/logo.png" alt="qr" width={100} height={100} className="invert" />
                </motion.div>
                <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">APP CLUSTER</span>
                   <p className="text-2xl font-black text-black leading-tight uppercase italic">
                      Efficiency <br /> 
                      <span className="text-5xl tracking-tighter text-primary">+85%</span>
                      <Sparkles className="inline-block size-8 text-black ml-2 animate-bounce" />
                   </p>
                </div>
             </div>
          </motion.section>

          {/* 5. DASHBOARD STATS CARD */}
          <motion.section 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -6 }}
            className="md:col-span-12 lg:col-span-12 bg-[#E1F3DB] rounded-[3.5rem] p-12 border-[6px] border-black flex flex-col md:flex-row gap-16 items-center justify-between min-h-[450px] shadow-[20px_20px_0px_rgba(0,0,0,1)] hover:shadow-[30px_30px_0px_#B9FBC0] transition-all duration-700"
          >
             <div className="md:w-[35%]">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-[11px] font-black bg-black text-white px-5 py-2 rounded-full italic tracking-[0.2em] uppercase">SYSTEM ANALYTICS</span>
                  <div className="h-0.5 w-12 bg-black" />
                </div>
                <h3 className="text-6xl font-black italic tracking-tighter text-black mb-8 uppercase leading-none">
                  实时数据<br/>控制中心.
                </h3>
                <p className="text-black/60 font-black text-sm tracking-widest uppercase mb-10 leading-relaxed max-w-sm">
                   Elite diagnostics for your berry kingdom. Precision-driven cultivation at your fingertips.
                </p>
                <div className="flex gap-6">
                   <motion.div 
                     whileTap={{ scale: 0.9 }}
                     className="size-20 rounded-[1.8rem] bg-black flex items-center justify-center text-white cursor-pointer shadow-[8px_8px_0px_rgba(16,185,129,1)] hover:scale-105 transition-transform"
                   >
                      <Search className="size-10" />
                   </motion.div>
                   <motion.div 
                     whileTap={{ scale: 0.9 }}
                     className="size-20 rounded-[1.8rem] bg-white border-4 border-black flex items-center justify-center text-black cursor-pointer shadow-[8px_8px_0px_rgba(0,0,0,1)] hover:scale-105 transition-transform"
                   >
                      <Wind className="size-10" />
                   </motion.div>
                </div>
             </div>

             <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
                {[
                  { label: "TEMPERATURE", val: "24.5°C", icon: Thermometer, change: "+1.2", h: [40, 60, 50, 80, 70, 90, 85], color: "text-red-500" },
                  { label: "HUMIDITY", val: "62%", icon: Droplets, change: "-0.5", h: [70, 65, 75, 60, 55, 72, 68], color: "text-blue-500" },
                  { label: "CO2 LEVEL", val: "420ppm", icon: Cloud, change: "SECURE", h: [50, 52, 55, 51, 50, 52, 53], color: "text-purple-500" },
                  { label: "FERTILITY", val: "94%", icon: Leaf, change: "+2.1", h: [90, 95, 100, 98, 105, 107, 104], color: "text-primary" },
                ].map((stat, i) => (
                  <motion.div 
                    key={i} 
                    whileHover={{ scale: 1.05, y: -6 }}
                    className="bg-white border-4 border-black rounded-[2.5rem] p-8 shadow-[12px_12px_0px_rgba(0,0,0,1)] relative overflow-hidden group/item cursor-pointer h-full flex flex-col justify-between"
                  >
                     <div className="relative z-10 flex justify-between items-start">
                        <div className="flex flex-col">
                           <span className="text-[11px] font-black text-slate-400 mb-2 block uppercase tracking-widest italic">{stat.label}</span>
                           <div className="text-4xl font-black text-black tracking-tighter leading-none">{stat.val}</div>
                        </div>
                        <stat.icon className={cn("size-8", stat.color)} />
                     </div>

                     <div className="relative z-10 mt-6 flex items-center gap-2 text-[10px] font-black text-primary bg-emerald-50 px-3 py-1 rounded-full w-fit uppercase tracking-tighter">
                        {stat.change} FROM YESTERDAY
                     </div>
                     
                     <div className="relative z-10 mt-8 h-16 w-full flex items-end gap-2 px-1">
                        {stat.h.map((h, j) => (
                          <motion.div 
                            key={j} 
                            initial={{ height: 0 }}
                            whileInView={{ height: `${h}%` }}
                            transition={{ delay: 0.1 * j, duration: 0.6 }}
                            className="flex-1 bg-black/5 rounded-t-sm group-hover/item:bg-black/10 transition-colors"
                          />
                        ))}
                     </div>
                  </motion.div>
                ))}
             </div>
          </motion.section>

        </div>
      </main>

      <footer className="py-32 bg-black border-t-[8px] border-primary overflow-hidden relative mt-20">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="container mx-auto px-6 flex flex-col items-center relative z-10">
           <motion.h2 
             initial={{ y: 40, opacity: 0 }}
             whileInView={{ y: 0, opacity: 1 }}
             className="text-[clamp(3rem,8.5vw,7.5rem)] font-black tracking-tighter text-white mb-20 text-center italic uppercase leading-[0.8]"
           >
             准备好进入 <br /> <span className="text-primary underline decoration-white decoration-[12px] underline-offset-[12px]">农业 4.0</span> 时代.
           </motion.h2>
           
           <div className="flex flex-col sm:flex-row gap-10">
              <Link href="/dashboard">
                <motion.div whileHover={{ scale: 1.05, rotate: -2 }} whileTap={{ scale: 0.95 }}>
                  <Button className="h-24 px-20 rounded-[2.5rem] bg-primary text-black hover:bg-white transition-all font-black text-4xl shadow-[16px_16px_0px_white] border-4 border-black uppercase tracking-tighter">
                    JOIN NOW
                  </Button>
                </motion.div>
              </Link>
              <motion.div whileHover={{ scale: 1.05, rotate: 2 }} whileTap={{ scale: 0.95 }}>
                <Button variant="ghost" className="h-24 px-16 rounded-[2.5rem] text-white hover:bg-white/5 font-black text-3xl border-4 border-white/20 italic shadow-[16px_16px_0px_#222] uppercase tracking-tighter">
                  LEARN MORE
                </Button>
              </motion.div>
           </div>
           
           <div className="mt-48 w-full flex flex-col md:flex-row justify-between items-center gap-16 py-12 border-t-4 border-white/5">
              <div className="flex items-center gap-5 group cursor-pointer">
                 <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 40, ease: "linear" }}>
                   <Image src="/logo.png" alt="logo" width={48} height={48} />
                 </motion.div>
                 <div className="flex flex-col leading-none">
                    <span className="text-3xl font-black tracking-tighter uppercase italic">STRAVISION</span>
                    <span className="text-[11px] text-primary font-black tracking-[0.4em] mt-1">AGRI CLUSTER SERVICES</span>
                 </div>
              </div>
              <div className="flex gap-12 text-[12px] font-black text-slate-500 uppercase tracking-widest italic">
                 {["Privacy", "Terms", "Twitter", "GitHub"].map(link => (
                   <a key={link} href="#" className="hover:text-primary hover:translate-x-1 transition-all">{link}</a>
                 ))}
              </div>
              <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest italic opacity-50">© 2024 STRAVISION ELITE HUB</p>
           </div>
        </div>
      </footer>
    </div>
  );
}
