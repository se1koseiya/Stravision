"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

interface ElderFriendlyContextType {
  isElderFriendlyMode: boolean
  toggleElderFriendlyMode: () => void
}

const ElderFriendlyContext = createContext<ElderFriendlyContextType | undefined>(undefined)

export function ElderFriendlyProvider({ children }: { children: React.ReactNode }) {
  const [isElderFriendlyMode, setIsElderFriendlyMode] = useState(false)

  // 从localStorage加载设置
  useEffect(() => {
    const saved = localStorage.getItem('elder-friendly-mode')
    if (saved === 'true') {
      setIsElderFriendlyMode(true)
    }
  }, [])

  const toggleElderFriendlyMode = () => {
    const newMode = !isElderFriendlyMode
    setIsElderFriendlyMode(newMode)
    localStorage.setItem('elder-friendly-mode', newMode.toString())
  }

  return (
    <ElderFriendlyContext.Provider value={{
      isElderFriendlyMode,
      toggleElderFriendlyMode
    }}>
      {children}
    </ElderFriendlyContext.Provider>
  )
}

export function useElderFriendly() {
  const context = useContext(ElderFriendlyContext)
  if (context === undefined) {
    throw new Error('useElderFriendly must be used within an ElderFriendlyProvider')
  }
  return context
}