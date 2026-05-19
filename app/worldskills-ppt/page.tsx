"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react"
import { Slide } from "@/components/presentation/Slide"
import { 
  CoverSlide, ContextSlide, PainPointsSlide, ConceptSlide, 
  SolutionMapSlide, HardwareLayerSlide, ControlLayerSlide, 
  EdgeComputingSlide, AIModelSlide, VoiceInteractionSlide, 
  WebDashboardSlide, MobileAppSlide, VisualMonitorSlide, 
  TechStackSlide, MarketSlide, TeamSlide, RoadmapSlide, 
  ClosingSlide 
} from "@/components/presentation/worldskills/Slides"

export default function WorldSkillsPresentation() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Configuration for story flow
  const slides = [
    { component: CoverSlide, title: "", subtitle: "" },
    { component: ContextSlide, title: "", subtitle: "" }, // Custom titles inside component
    { component: PainPointsSlide, title: "", subtitle: "" },
    { component: ConceptSlide, title: "", subtitle: "" },
    { component: SolutionMapSlide, title: "", subtitle: "" },
    { component: HardwareLayerSlide, title: "", subtitle: "" },
    { component: ControlLayerSlide, title: "", subtitle: "" },
    { component: EdgeComputingSlide, title: "", subtitle: "" },
    { component: AIModelSlide, title: "", subtitle: "" },
    { component: VoiceInteractionSlide, title: "", subtitle: "" },
    { component: WebDashboardSlide, title: "", subtitle: "" },
    { component: MobileAppSlide, title: "", subtitle: "" },
    { component: VisualMonitorSlide, title: "", subtitle: "" },
    { component: TechStackSlide, title: "", subtitle: "" },
    { component: MarketSlide, title: "", subtitle: "" },
    { component: TeamSlide, title: "", subtitle: "" },
    { component: RoadmapSlide, title: "", subtitle: "" },
    { component: ClosingSlide, title: "", subtitle: "" },
  ]

  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1))
  }, [slides.length])

  const prevSlide = useCallback(() => {
    setCurrentSlide(prev => Math.max(prev - 1, 0))
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Space") nextSlide()
      if (e.key === "ArrowLeft") prevSlide()
      if (e.key === "f") toggleFullscreen()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [nextSlide, prevSlide, toggleFullscreen])

  // Preload IP images
  useEffect(() => {
    const images = [
      "/ip/草莓头IP-招手姿势.png",
      "/ip/草莓头IP-舞蹈姿势.png",
      "/ip/草莓头IP-坐姿玩手机.png",
      "/ip/草莓头IP-放大镜姿势.png",
      "/ip/草莓头IP-跳跃姿势.png",
      "/ip/草莓头IP-奔跑姿势.png",
      "/ip/ip-banner.png"
    ]
    images.forEach(src => {
      const img = new Image()
      img.src = src
    })
  }, [])

  const CurrentComponent = slides[currentSlide].component

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative font-sans selection:bg-primary/30">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
          transition={{ duration: 0.8, ease: "anticipate" }}
          className="w-full h-full"
        >
          {/* We use the Slide wrapper for consistent navigation/footer, but our components handle their own layout/bg */}
          <Slide
            current={currentSlide + 1}
            total={slides.length}
            onNext={nextSlide}
            onPrev={prevSlide}
            // Pass empty title/subtitle as they are now handled internally for better design control
            title={slides[currentSlide].title} 
            subtitle={slides[currentSlide].subtitle}
            hideFooter={currentSlide === 0 || currentSlide === slides.length - 1} // Hide footer on cover and closing
            noPadding={true}
          >
            {/* Custom Background Overrides Default Slide Background */}
            <div className="absolute inset-0 z-0">
               <CurrentComponent />
            </div>
          </Slide>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Overlay */}
      <div className="absolute bottom-8 right-8 z-50 flex items-center gap-4 text-white/50 group">
        <div className="text-sm font-mono opacity-0 group-hover:opacity-100 transition-opacity">
          {currentSlide + 1} / {slides.length}
        </div>
        <button 
          onClick={prevSlide}
          className="p-3 rounded-full bg-white/5 hover:bg-white/20 hover:text-white backdrop-blur-md border border-white/10 transition-all active:scale-95 disabled:opacity-30"
          disabled={currentSlide === 0}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button 
          onClick={nextSlide}
          className="p-3 rounded-full bg-white/5 hover:bg-white/20 hover:text-white backdrop-blur-md border border-white/10 transition-all active:scale-95 disabled:opacity-30"
          disabled={currentSlide === slides.length - 1}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <button 
          onClick={toggleFullscreen}
          className="p-3 rounded-full bg-white/5 hover:bg-white/20 hover:text-white backdrop-blur-md border border-white/10 transition-all active:scale-95 ml-4"
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>
      
      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-primary/20 w-full z-50">
        <motion.div 
          className="h-full bg-primary"
          initial={{ width: "0%" }}
          animate={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  )
}
