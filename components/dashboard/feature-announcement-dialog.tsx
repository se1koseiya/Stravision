"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { IconClose, IconLeft, IconRight, IconVolumeMute, IconVolumeNotice } from "@/components/icon";

export type MediaType = "image" | "video"

export interface FeatureAnnouncement {
    id: string
    title: string
    description: string
    mediaUrl: string
    mediaType: MediaType
    allowedPaths?: string[]
}

interface FeatureAnnouncementDialogProps {
    // If controlled externally
    open?: boolean
    onOpenChange?: (open: boolean) => void
    features?: FeatureAnnouncement[]

    // If true, it automatically fetches from /api/announcements and opens if unseen
    autoFetch?: boolean
}

export function FeatureAnnouncementDialog({
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    features: controlledFeatures,
    autoFetch = false
}: FeatureAnnouncementDialogProps = {}) {
    const pathname = usePathname()
    const [internalOpen, setInternalOpen] = useState(false)
    const [internalFeatures, setInternalFeatures] = useState<FeatureAnnouncement[]>([])

    const [currentIndex, setCurrentIndex] = useState(0)
    const [direction, setDirection] = useState(1)
    const [isMuted, setIsMuted] = useState(false)
    const videoRef = useRef<HTMLVideoElement | null>(null)

    // Resolve controlled vs uncontrolled
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen
    const onOpenChange = controlledOnOpenChange || setInternalOpen
    const features = controlledFeatures !== undefined ? controlledFeatures : internalFeatures

    // Auto-fetch logic
    useEffect(() => {
        if (autoFetch && controlledFeatures === undefined) {
            fetch("/api/announcements")
                .then(res => res.json())
                .then(data => {
                    if (data && data.features && data.features.length > 0) {
                        const currentPath = pathname || "/"
                        const isLandingPage = currentPath === "/"

                        // Filter features based on current page
                        const filtered = data.features.filter((f: FeatureAnnouncement) => {
                            const paths = f.allowedPaths || []
                            // If no paths specified, don't show on landing page by default
                            if (paths.length === 0) return !isLandingPage
                            // If paths specified, must match one
                            return paths.some(p => currentPath.startsWith(p))
                        })

                        if (filtered.length === 0) return

                        setInternalFeatures(filtered)

                        // Check if user has seen these specific features
                        const seenIds = JSON.parse(localStorage.getItem("seenFeatureIds") || "[]")
                        const hasNewFeature = filtered.some((f: FeatureAnnouncement) => !seenIds.includes(f.id))

                        if (hasNewFeature) {
                            setInternalOpen(true)
                        }
                    }
                })
                .catch(err => console.error("Failed to fetch features", err))
        }
    }, [autoFetch, controlledFeatures, pathname])

    useEffect(() => {
        if (!open) {
            // Reset index when closed
            const timer = setTimeout(() => setCurrentIndex(0), 300)
            return () => clearTimeout(timer)
        }
    }, [open])

    if (!open || !features || features.length === 0) return null

    const currentFeature = features[currentIndex]
    const isLast = currentIndex === features.length - 1
    const isFirst = currentIndex === 0

    const handleClose = () => {
        if (autoFetch) {
            // Mark these features as seen
            const seenIds = JSON.parse(localStorage.getItem("seenFeatureIds") || "[]")
            const newIds = [...new Set([...seenIds, ...features.map(f => f.id)])]
            localStorage.setItem("seenFeatureIds", JSON.stringify(newIds))
        }
        onOpenChange(false)
    }

    const handleNext = () => {
        if (isLast) {
            handleClose()
        } else {
            setDirection(1)
            setCurrentIndex((prev) => prev + 1)
        }
    }

    const handlePrev = () => {
        if (!isFirst) {
            setDirection(-1)
            setCurrentIndex((prev) => prev - 1)
        }
    }

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0,
            filter: "blur(4px)"
        }),
        center: {
            x: 0,
            opacity: 1,
            filter: "blur(0px)"
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 50 : -50,
            opacity: 0,
            filter: "blur(4px)"
        })
    }

    return (
        <AnimatePresence mode="wait">
            {open && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}
                        className="relative w-full max-w-[540px] bg-white rounded-[24px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col"
                    >
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 text-zinc-700 hover:text-black transition-colors backdrop-blur-md"
                        >
                            <IconClose className="w-4 h-4" />
                        </button>

                        {/* Media Area */}
                        <div className="relative w-full h-[320px] bg-zinc-50 flex items-center justify-center overflow-hidden shrink-0">
                            <AnimatePresence custom={direction} mode="wait">
                                <motion.div
                                    key={currentFeature.id}
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.35, ease: "easeInOut" }}
                                    className="absolute inset-0 flex items-center justify-center w-full h-full"
                                >
                                    {currentFeature.mediaType === "video" ? (
                                        <>
                                        <video
                                            ref={videoRef}
                                            src={currentFeature.mediaUrl}
                                            autoPlay
                                            loop
                                            muted={isMuted}
                                            playsInline
                                            className="w-full h-full object-cover"
                                            onLoadedData={(e) => {
                                                const video = e.currentTarget
                                                // Try to play with sound; if browser blocks it, fallback to muted
                                                video.muted = false
                                                video.play().catch(() => {
                                                    video.muted = true
                                                    setIsMuted(true)
                                                    video.play().catch(() => {})
                                                })
                                            }}
                                        />
                                        {/* Mute/Unmute toggle */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                const next = !isMuted
                                                setIsMuted(next)
                                                if (videoRef.current) {
                                                    videoRef.current.muted = next
                                                }
                                            }}
                                            className="absolute bottom-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors"
                                        >
                                            {isMuted ? <IconVolumeMute className="w-4 h-4" /> : <IconVolumeNotice className="w-4 h-4" />}
                                        </button>
                                        </>

                                    ) : (
                                        <img
                                            src={currentFeature.mediaUrl}
                                            alt={currentFeature.title}
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Content Area */}
                        <div className="p-8 flex flex-col pt-8 bg-white relative">
                            <div className="min-h-[120px]">
                                <AnimatePresence custom={direction} mode="wait">
                                    <motion.div
                                        key={currentFeature.id}
                                        custom={direction}
                                        variants={slideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className="flex flex-col h-full"
                                    >
                                        <h2 className="text-[24px] font-bold text-zinc-900 tracking-tight leading-snug mb-3">
                                            {currentFeature.title}
                                        </h2>
                                        <p className="text-[14px] text-zinc-500 leading-relaxed mb-6">
                                            {currentFeature.description}
                                        </p>
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Footer Controls */}
                            <div className="flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-1.5">
                                    {features.length > 1 &&
                                        features.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={cn(
                                                    "h-1.5 rounded-full transition-all duration-300",
                                                    idx === currentIndex
                                                        ? "w-4 bg-[#1c1c1c]"
                                                        : "w-1.5 bg-zinc-200"
                                                )}
                                            />
                                        ))}
                                </div>

                                <div className="flex items-center gap-2">
                                    {!isFirst && features.length > 1 && (
                                        <button
                                            onClick={handlePrev}
                                            className="px-4 py-2.5 rounded-[12px] text-zinc-600 font-medium hover:bg-zinc-100 transition-colors text-[14px] flex items-center justify-center"
                                        >
                                            <IconLeft className="w-4 h-4 mr-1" /> 上一个
                                        </button>
                                    )}

                                    <button
                                        onClick={handleNext}
                                        className="px-7 py-2.5 rounded-[12px] bg-[#1c1c1c] hover:bg-black text-white font-medium shadow-sm shadow-black/10 transition-all active:scale-95 text-[14px] flex items-center justify-center min-w-[120px]"
                                    >
                                        {isLast ? "知道了" : (
                                            <>
                                                下一个 <IconRight className="w-4 h-4 ml-1" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
