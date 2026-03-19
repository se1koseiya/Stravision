"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { X, Download, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { motion } from "framer-motion"

interface ImagePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageUrl: string
}

export function ImagePreviewDialog({ open, onOpenChange, imageUrl }: ImagePreviewDialogProps) {
  const [scale, setScale] = useState(1)

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = 'image.jpg'
    link.click()
  }

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/95 border-none">
        <div className="relative w-full h-full flex items-center justify-center p-4">
          {/* Controls */}
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
              onClick={handleZoomOut}
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
              onClick={handleZoomIn}
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
              onClick={handleDownload}
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Image */}
          <motion.img
            src={imageUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
            style={{ scale }}
            animate={{ scale }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
