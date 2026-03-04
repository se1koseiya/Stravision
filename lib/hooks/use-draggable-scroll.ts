import { useEffect, useRef } from "react"

export function useDraggableScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    let isDown = false
    let startX: number
    let startY: number
    let scrollLeft: number
    let scrollTop: number
    let isDragging = false

    const onMouseDown = (e: MouseEvent) => {
      isDown = true
      element.classList.add("active")
      startX = e.pageX - element.offsetLeft
      startY = e.pageY - element.offsetTop
      scrollLeft = element.scrollLeft
      scrollTop = element.scrollTop
      // Do not set cursor immediately to avoid flickering on clicks
      // element.style.cursor = "grabbing" 
    }

    const onMouseLeave = () => {
      isDown = false
      element.classList.remove("active")
      element.style.cursor = "grab"
      isDragging = false
    }

    const onMouseUp = () => {
      isDown = false
      element.classList.remove("active")
      element.style.cursor = "grab"
      
      // If we were dragging, we might want to prevent the click event
      // But simple implementation relies on React's event system handling clicks
      if (isDragging) {
        // Prevent default click behavior if needed (capture phase)
        // For now, we rely on the fact that small movements won't trigger large scrolls
      }
      isDragging = false
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return
      
      e.preventDefault()
      const x = e.pageX - element.offsetLeft
      const y = e.pageY - element.offsetTop
      const walkX = (x - startX) * 2 // scroll-fast
      const walkY = (y - startY) * 2
      
      // Threshold to detect drag vs click
      if (Math.abs(walkX) > 5 || Math.abs(walkY) > 5) {
        isDragging = true
        element.style.cursor = "grabbing"
      }

      element.scrollLeft = scrollLeft - walkX
      element.scrollTop = scrollTop - walkY
    }

    // Add touch support for mobile devices if they don't support native touch scroll well (optional, but requested)
    // Actually, native touch scroll is usually better. We only add mouse drag for "user drag to move" which implies desktop-like behavior or specific request.
    // However, hiding scrollbars on mobile is done via CSS.
    // The user asked to "support user drag to move". 
    // If on mobile, touch drag is native. 
    // If on desktop (mobile view), mouse drag is not native.
    // So this hook is primarily for mouse interaction.

    element.addEventListener("mousedown", onMouseDown)
    element.addEventListener("mouseleave", onMouseLeave)
    element.addEventListener("mouseup", onMouseUp)
    element.addEventListener("mousemove", onMouseMove)
    
    element.style.cursor = "grab"
    // Hide scrollbar via inline style as backup, though CSS class is preferred
    element.style.scrollbarWidth = "none" 
    // @ts-ignore
    element.style.msOverflowStyle = "none"

    return () => {
      element.removeEventListener("mousedown", onMouseDown)
      element.removeEventListener("mouseleave", onMouseLeave)
      element.removeEventListener("mouseup", onMouseUp)
      element.removeEventListener("mousemove", onMouseMove)
      element.style.cursor = ""
      element.style.scrollbarWidth = ""
      // @ts-ignore
      element.style.msOverflowStyle = ""
    }
  }, [])

  return ref
}
