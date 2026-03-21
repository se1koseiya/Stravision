"use client"

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'

export interface DeviceData {
  temperature: number
  humidity: number
  light: number
  co2: number
  earth_temp: number
  earth_water: number
  earth_ec: number
  earth_n: number
  earth_p: number
  earth_k: number
  relay5: number
  relay6: number
  relay7: number
  relay8: number
  led1: number
  led2: number
  led3: number
  led4: number
  channel1?: number
  channel2?: number
  channel3?: number
  channel4?: number
  channel5?: number
  channel6?: number
  channel7?: number
  channel8?: number
  channel9?: number
  channel10?: number
  channel11?: number
  timestamp?: number
  // 步进电机状态 (摄像头云台)
  stepper_direction?: number  // 运行方向: 0=停止, 1=正转/左移, 2=反转/右移
  stepper_position?: number   // 当前软件记位脉冲数系统同步 (用于UI显示)
}

export interface ConnectionStatus {
  connected: boolean
  error: string | null
  lastUpdate: Date | null
}

interface DeviceContextType {
  deviceData: DeviceData | null
  connectionStatus: ConnectionStatus
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined)

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    error: null,
    lastUpdate: null
  })
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  // Remove maxReconnectAttempts to allow infinite reconnects but with capped delay

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    try {
      // Only log in development to reduce console noise
      if (process.env.NODE_ENV === 'development') {
        console.log('[SSE] Connecting to /api/mqtt/stream...')
      }
      
      const eventSource = new EventSource('/api/mqtt/stream')
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[SSE] Connection established')
        }
        setConnectionStatus(prev => ({
          ...prev,
          connected: true,
          error: null,
          lastUpdate: new Date()
        }))
        reconnectAttemptsRef.current = 0
      }

      eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          if (message.type === 'connected') {
             // connection established message
          } else if (message.type === 'data' && message.data) {
            // Normalize data (divide specific fields by 10)
            const normalizedData = {
              ...message.data,
              temperature: message.data.temperature !== undefined ? message.data.temperature / 10 : 0,
              humidity: message.data.humidity !== undefined ? message.data.humidity / 10 : 0,
              earth_temp: message.data.earth_temp !== undefined ? message.data.earth_temp / 10 : 0,
              earth_water: message.data.earth_water !== undefined ? message.data.earth_water / 10 : 0
            }
            setDeviceData(normalizedData)
            setConnectionStatus(prev => ({
              ...prev,
              lastUpdate: new Date()
            }))
          }
        } catch (error) {
          console.error('[SSE] Error parsing message:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error)
        eventSource.close()
        eventSourceRef.current = null
        
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
          error: 'Connection lost'
        }))

        // Attempt reconnect with exponential backoff (capped at 30 seconds)
        const timeout = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 30000)
        console.log(`[SSE] Reconnecting in ${timeout}ms...`)
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++
          connect()
        }, timeout)
      }

    } catch (error) {
      console.error('[SSE] Setup error:', error)
      setConnectionStatus(prev => ({
        ...prev,
        error: 'Failed to setup connection'
      }))
    }
  }, [])

  useEffect(() => {
    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect])

  return (
    <DeviceContext.Provider value={{ deviceData, connectionStatus }}>
      {children}
    </DeviceContext.Provider>
  )
}

export function useDeviceContext() {
  const context = useContext(DeviceContext)
  if (context === undefined) {
    throw new Error('useDeviceContext must be used within a DeviceProvider')
  }
  return context
}
