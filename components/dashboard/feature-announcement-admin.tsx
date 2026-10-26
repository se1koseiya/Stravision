"use client"

import { useState, useEffect } from "react"
import { MediaType } from "./feature-announcement-dialog"
import { motion, AnimatePresence } from "framer-motion"
import { IconCheckOne, IconDelete, IconDrag, IconPicture, IconPlus, IconSave, IconVideo } from "@/components/icon";

export interface FeatureAnnouncement {
    id: string
    title: string
    description: string
    mediaUrl: string
    mediaType: MediaType
    allowedPaths?: string[]
}

export function FeatureAnnouncementAdmin() {
    const [features, setFeatures] = useState<FeatureAnnouncement[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState(false)

    // Fetch from the API router
    useEffect(() => {
        setLoading(true)
        fetch("/api/announcements")
            .then(res => res.json())
            .then(data => {
                if (data && data.features) {
                    setFeatures(data.features)
                }
            })
            .catch(err => console.error("Failed to fetch features", err))
            .finally(() => setLoading(false))
    }, [])

    const handleAddFeature = () => {
        const newFeature: FeatureAnnouncement = {
            id: "feature-" + Date.now(),
            title: "新功能名称",
            description: "在这里详细描述这项新功能的优势和使用方法...",
            mediaUrl: "",
            mediaType: "image",
            allowedPaths: []
        }
        setFeatures([...features, newFeature])
    }

    const handleUpdate = (id: string, field: keyof FeatureAnnouncement, value: any) => {
        setFeatures(current =>
            current.map(f => f.id === id ? { ...f, [field]: value } : f)
        )
    }

    const handleDelete = (id: string) => {
        setFeatures(features.filter(f => f.id !== id))
    }

    const handlePush = async () => {
        setSaving(true)
        setSuccess(false)
        try {
            const res = await fetch("/api/announcements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ features })
            })
            if (res.ok) {
                setSuccess(true)
                setTimeout(() => setSuccess(false), 3000)
            }
        } catch (error) {
            console.error("Failed to push features", error)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="w-full max-w-4xl mx-auto p-8 bg-zinc-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">功能更新精准推送 (Admin)</h1>
                    <p className="text-zinc-500 text-[14px] mt-1">
                        为不同页面设置专属的功能更新提示。弹窗将只在符合路径的页面显示。
                    </p>
                </div>
                <button
                    onClick={handlePush}
                    disabled={saving || loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-medium transition-all shadow-sm h-fit"
                >
                    {saving ? "推送保存中..." : success ? <><IconCheckOne className="w-4 h-4" /> 已推送生效</> : <><IconSave className="w-4 h-4" /> 保存所有更改</>}
                </button>
            </div>

            {loading ? (
                <div className="py-20 text-center text-zinc-400">加载中...</div>
            ) : (
                <div className="space-y-6">
                    <AnimatePresence>
                        {features.map((feature) => (
                            <motion.div
                                key={feature.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                theme-mode="light" className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col md:flex-row"
                            >
                                {/* 左侧媒体预览 */}
                                <div className="w-full md:w-[300px] bg-zinc-100 flex items-center justify-center relative p-4 group">
                                    {feature.mediaUrl ? (
                                        feature.mediaType === 'video' ? (
                                            <video src={feature.mediaUrl} className="w-full aspect-video rounded-lg object-cover" muted />
                                        ) : (
                                            <img src={feature.mediaUrl} alt="" className="w-full aspect-video rounded-lg object-cover" />
                                        )
                                    ) : (
                                        <div className="text-zinc-400 text-xs flex flex-col items-center gap-2">
                                            <IconPicture className="w-8 h-8 opacity-20" />
                                            暂无媒体预览
                                        </div>
                                    )}
                                </div>

                                {/* 右侧编辑 */}
                                <div className="flex-1 p-6 space-y-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <input
                                            value={feature.title}
                                            onChange={(e) => handleUpdate(feature.id, "title", e.target.value)}
                                            className="flex-1 text-lg font-bold bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-emerald-500 outline-none p-1 transition-all"
                                            placeholder="功能标题"
                                        />
                                        <button
                                            onClick={() => handleDelete(feature.id)}
                                            className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                                        >
                                            <IconDelete className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <textarea
                                        value={feature.description}
                                        onChange={(e) => handleUpdate(feature.id, "description", e.target.value)}
                                        className="w-full p-2 bg-zinc-50 border border-zinc-100 rounded-lg text-sm text-zinc-600 outline-none focus:border-emerald-500 min-h-[80px]"
                                        placeholder="描述新功能的亮点..."
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">显示页面 (逗号分隔)</label>
                                                <input
                                                    value={feature.allowedPaths?.join(", ") || ""}
                                                    onChange={(e) => handleUpdate(feature.id, "allowedPaths", e.target.value.split(",").map(p => p.trim()).filter(Boolean))}
                                                    placeholder="/dashboard, /chat"
                                                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:border-emerald-500 outline-none transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">媒体类型</label>
                                                <div className="flex bg-zinc-100 p-1 rounded-lg">
                                                    <button
                                                        onClick={() => handleUpdate(feature.id, "mediaType", "image")}
                                                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs rounded-lg font-medium transition-all ${feature.mediaType === "image" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500"}`}
                                                    >
                                                        <IconPicture className="w-3 h-3" /> 图片
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdate(feature.id, "mediaType", "video")}
                                                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs rounded-lg font-medium transition-all ${feature.mediaType === "video" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500"}`}
                                                    >
                                                        <IconVideo className="w-3 h-3" /> 视频
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">媒体上传 / 链接</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        value={feature.mediaUrl}
                                                        onChange={(e) => handleUpdate(feature.id, "mediaUrl", e.target.value)}
                                                        className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:border-emerald-500 outline-none transition-all"
                                                        placeholder="https://..."
                                                    />
                                                    <div className="relative group/upload h-9">
                                                        <input
                                                            type="file"
                                                            accept={feature.mediaType === 'image' ? "image/*" : "video/*"}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;
                                                                const formData = new FormData();
                                                                formData.append('file', file);
                                                                try {
                                                                    const res = await fetch('/api/admin/upload', {
                                                                        method: 'POST',
                                                                        body: formData
                                                                    });
                                                                    const data = await res.json();
                                                                    if (data.success) {
                                                                        handleUpdate(feature.id, "mediaUrl", data.url);
                                                                    }
                                                                } catch (err) {
                                                                    console.error("Upload failed", err);
                                                                }
                                                            }}
                                                        />
                                                        <div className="h-full px-2 bg-white border border-zinc-200 rounded-lg flex items-center justify-center text-zinc-400 group-hover/upload:text-emerald-500 transition-all">
                                                            <IconPlus className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    <button
                        onClick={handleAddFeature}
                        className="w-full py-4 border-2 border-dashed border-zinc-300 hover:border-emerald-500 hover:bg-emerald-50 rounded-2xl flex items-center justify-center gap-2 text-zinc-500 hover:text-emerald-600 transition-all font-medium"
                    >
                        <IconPlus className="w-5 h-5" /> 添加新功能卡片
                    </button>
                </div>
            )}
        </div>
    )
}
