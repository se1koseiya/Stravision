"use client"

import { useState, useRef } from "react"
import { Upload, X } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface ImageUploaderProps {
  defaultImage?: string
  alt: string
  className?: string
  onImageChange?: (file: File) => void
}

export function ImageUploader({ defaultImage, alt, className, onImageChange }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | undefined>(defaultImage)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      onImageChange?.(file)
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPreview(undefined)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div 
      className={cn(
        "relative group cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-900/50 hover:border-emerald-500/50 transition-colors flex items-center justify-center",
        className
      )}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      {preview ? (
        <>
          <div className="relative w-full h-full">
            <Image 
              src={preview} 
              alt={alt} 
              fill 
              className="object-contain p-4" 
            />
          </div>
          <button 
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className="text-xs text-white font-mono">Click to Replace</span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 text-zinc-500 group-hover:text-emerald-500 transition-colors">
          <Upload className="w-8 h-8" />
          <span className="text-xs font-mono uppercase tracking-widest">Upload Image</span>
        </div>
      )}
    </div>
  )
}
