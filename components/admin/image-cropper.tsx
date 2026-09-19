"use client"

import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import { IconClose, IconCompression, IconUpload } from "@/components/icon";

interface ImageCropperProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCropComplete: (url: string) => void
  aspect?: number
  title?: string
}

export function ImageCropper({ open, onOpenChange, onCropComplete, aspect = 1, title = "Crop Image" }: ImageCropperProps) {
  const [image, setImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader()
      reader.addEventListener('load', () => setImage(reader.result as string))
      reader.readAsDataURL(e.target.files[0])
    }
  }

  const onCropCompleteInternal = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleSave = async () => {
    if (!image || !croppedAreaPixels) return

    setLoading(true)
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels)
      
      // Now upload the cropped blob to server
      const formData = new FormData()
      formData.append('file', croppedImage, 'upload.png')

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()
      if (data.url) {
        onCropComplete(data.url)
        onOpenChange(false)
        setImage(null)
      } else {
        throw new Error(data.error || "Upload failed")
      }
    } catch (e: any) {
      toast.error("Failed to crop/upload image: " + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="relative h-[400px] w-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden rounded-lg border border-black/5">
          {image ? (
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onCropComplete={onCropCompleteInternal}
              onZoomChange={setZoom}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <IconUpload className="size-10 text-zinc-400" />
              <div className="text-center">
                 <p className="text-sm font-medium">Select an image to start cropping</p>
                 <p className="text-xs text-zinc-500">Supports JPG, PNG, WEBP</p>
              </div>
              <Button variant="outline" className="relative cursor-pointer" asChild>
                <label>
                  Browse Files
                  <input type="file" className="hidden" accept="image/*" onChange={onSelectFile} />
                </label>
              </Button>
            </div>
          )}
        </div>

        {image && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium">Zoom</span>
              <Slider 
                value={[zoom]} 
                min={1} 
                max={3} 
                step={0.1} 
                onValueChange={([v]) => setZoom(v)}
                className="flex-1"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => { setImage(null); onOpenChange(false) }}>Cancel</Button>
          {image && (
            <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white">
              {loading ? "Processing..." : "Crop & Save"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) throw new Error('No 2d context')

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Canvas is empty'))
      resolve(blob)
    }, 'image/png')
  })
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
