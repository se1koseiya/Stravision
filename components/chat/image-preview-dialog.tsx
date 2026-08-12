"use client"

import { useState } from "react"
import { Modal, Button, Tooltip } from "antd"
import { X, Download, ZoomIn, ZoomOut } from "lucide-react"
import { motion } from "framer-motion"

interface ImagePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageUrl: string
}

const ICON_STROKE = 1.75

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
    <Modal
      open={open}
      onCancel={() => onOpenChange(false)}
      footer={null}
      closable={false}
      width="90vw"
      styles={{
        body: {
          background: "rgba(0,0,0,0.95)",
          padding: 0,
          height: "90vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          borderRadius: 12,
          overflow: "hidden"
        },
        content: { padding: 0, background: "transparent" }
      }}
      style={{ top: "5vh" }}
    >
      <div className="relative w-full h-full flex items-center justify-center p-4">
        {/* Controls */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <Tooltip title="缩小">
            <Button
              type="text"
              shape="circle"
              className="!h-10 !w-10 !rounded-full !bg-white/10 hover:!bg-white/20 !text-white"
              icon={<ZoomOut className="h-5 w-5" strokeWidth={ICON_STROKE} />}
              onClick={handleZoomOut}
            />
          </Tooltip>
          <Tooltip title="放大">
            <Button
              type="text"
              shape="circle"
              className="!h-10 !w-10 !rounded-full !bg-white/10 hover:!bg-white/20 !text-white"
              icon={<ZoomIn className="h-5 w-5" strokeWidth={ICON_STROKE} />}
              onClick={handleZoomIn}
            />
          </Tooltip>
          <Tooltip title="下载">
            <Button
              type="text"
              shape="circle"
              className="!h-10 !w-10 !rounded-full !bg-white/10 hover:!bg-white/20 !text-white"
              icon={<Download className="h-5 w-5" strokeWidth={ICON_STROKE} />}
              onClick={handleDownload}
            />
          </Tooltip>
          <Tooltip title="关闭">
            <Button
              type="text"
              shape="circle"
              className="!h-10 !w-10 !rounded-full !bg-white/10 hover:!bg-white/20 !text-white"
              icon={<X className="h-5 w-5" strokeWidth={ICON_STROKE} />}
              onClick={() => onOpenChange(false)}
            />
          </Tooltip>
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
    </Modal>
  )
}
