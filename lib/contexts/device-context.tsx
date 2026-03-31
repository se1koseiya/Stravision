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
            const rawData = message.data;
            setDeviceData(prev => {
                const current = prev || {} as any;
                
                // Explicit mapping of only TRUSTED fields to prevent "pollution" from stale/random JSON fields
                const updatedFields: any = {
                    ...current, // Start with current stable state
                    temperature: rawData.temperature !== undefined ? rawData.temperature / 10 : current.temperature,
                    humidity: rawData.humidity !== undefined ? rawData.humidity / 10 : current.humidity,
                    earth_temp: rawData.earth_temp !== undefined ? rawData.earth_temp / 10 : current.earth_temp,
                    earth_water: rawData.earth_water !== undefined ? rawData.earth_water / 10 : current.earth_water,
                    light: rawData.light !== undefined ? rawData.light : current.light,
                    co2: rawData.co2 !== undefined ? rawData.co2 : current.co2,
                    earth_ec: rawData.earth_ec !== undefined ? rawData.earth_ec : current.earth_ec,
                    earth_n: rawData.earth_n !== undefined ? rawData.earth_n : current.earth_n,
                    earth_p: rawData.earth_p !== undefined ? rawData.earth_p : current.earth_p,
                    earth_k: rawData.earth_k !== undefined ? rawData.earth_k : current.earth_k,
                    relay5: rawData.relay5 !== undefined ? rawData.relay5 : current.relay5,
                    relay6: rawData.relay6 !== undefined ? rawData.relay6 : current.relay6,
                    relay7: rawData.relay7 !== undefined ? rawData.relay7 : current.relay7,
                    relay8: rawData.relay8 !== undefined ? rawData.relay8 : current.relay8,
                    led1: rawData.led1 !== undefined ? rawData.led1 : current.led1,
                    led2: rawData.led2 !== undefined ? rawData.led2 : current.led2,
                    led3: rawData.led3 !== undefined ? rawData.led3 : current.led3,
                    led4: rawData.led4 !== undefined ? rawData.led4 : current.led4,
                    stepper_position: rawData.stepper_position !== undefined ? rawData.stepper_position : current.stepper_position,
                    timestamp: rawData.timestamp || Date.now()
                };

                // Spectral channels 1-11
                for (let i = 1; i <= 11; i++) {
                    const key = `channel${i}`;
                    if (rawData[key] !== undefined) {
                        updatedFields[key] = rawData[key];
                    }
                }

                return updatedFields;
            });

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
