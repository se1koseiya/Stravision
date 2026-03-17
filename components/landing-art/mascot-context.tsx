"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

type MascotState = "idle" | "watching" | "thinking" | "waiting" | "active"

interface MascotContextType {
  state: MascotState
  setState: (state: MascotState) => void
  mousePosition: { x: number; y: number }
  setMousePosition: (pos: { x: number; y: number }) => void
}

const MascotContext = createContext<MascotContextType | undefined>(undefined)

export function MascotProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MascotState>("idle")
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  return (
    <MascotContext.Provider value={{ state, setState, mousePosition, setMousePosition }}>
      {children}
    </MascotContext.Provider>
  )
}

export function useMascot() {
  const context = useContext(MascotContext)
  if (context === undefined) {
    throw new Error("useMascot must be used within a MascotProvider")
  }
  return context
}
