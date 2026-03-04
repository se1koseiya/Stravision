// Video Frame Capture Utilities

/**
 * Capture a frame from a video element
 * @param videoElement - The video element to capture from
 * @param maxWidth - Maximum width of captured frame (default: 640)
 * @param maxHeight - Maximum height of captured frame (default: 480)
 * @param quality - JPEG quality 0-1 (default: 0.85)
 * @returns Base64 encoded JPEG image data URL
 */
export function captureVideoFrame(
    videoElement: HTMLVideoElement,
    maxWidth: number = 640,
    maxHeight: number = 480,
    quality: number = 0.85
): string | null {
    try {
        // Create canvas
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
            console.error('Failed to get canvas context')
            return null
        }

        // Get video dimensions
        const videoWidth = videoElement.videoWidth
        const videoHeight = videoElement.videoHeight

        if (videoWidth === 0 || videoHeight === 0) {
            console.error('Video has no dimensions')
            return null
        }

        // Calculate scaled dimensions
        let width = videoWidth
        let height = videoHeight

        if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
        }

        if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
        }

        // Set canvas size
        canvas.width = width
        canvas.height = height

        // Draw video frame to canvas
        ctx.drawImage(videoElement, 0, 0, width, height)

        // Convert to JPEG base64
        const dataUrl = canvas.toDataURL('image/jpeg', quality)

        return dataUrl
    } catch (error) {
        console.error('Error capturing video frame:', error)
        return null
    }
}

/**
 * Get base64 image data without data URL prefix
 * @param dataUrl - Data URL (e.g., "data:image/jpeg;base64,...")
 * @returns Base64 string without prefix
 */
export function getBase64FromDataUrl(dataUrl: string): string {
    const parts = dataUrl.split(',')
    return parts.length > 1 ? parts[1] : dataUrl
}

/**
 * Calculate simple hash for image comparison
 * @param dataUrl - Base64 data URL
 * @returns Simple hash string
 */
export function simpleImageHash(dataUrl: string): string {
    const base64 = getBase64FromDataUrl(dataUrl)
    // Take samples from different positions
    const samples = [
        base64.substring(0, 50),
        base64.substring(base64.length / 4, base64.length / 4 + 50),
        base64.substring(base64.length / 2, base64.length / 2 + 50),
        base64.substring(base64.length * 3 / 4, base64.length * 3 / 4 + 50),
        base64.substring(base64.length - 50)
    ]
    return samples.join('-')
}

/**
 * Capture frame from video element by ID or ref
 * @param videoIdOrElement - Video element ID or HTMLVideoElement
 * @param options - Capture options
 * @returns Captured frame data or null
 */
export function captureFrameFromVideo(
    videoIdOrElement: string | HTMLVideoElement,
    options?: {
        maxWidth?: number
        maxHeight?: number
        quality?: number
    }
): string | null {
    const video = typeof videoIdOrElement === 'string'
        ? document.getElementById(videoIdOrElement) as HTMLVideoElement
        : videoIdOrElement

    if (!video) {
        console.error('Video element not found')
        return null
    }

    return captureVideoFrame(
        video,
        options?.maxWidth || 640,
        options?.maxHeight || 480,
        options?.quality || 0.85
    )
}
