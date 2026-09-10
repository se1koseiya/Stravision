"use client"

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'

// ─── 设备注册表类型（与 lib/db/device-registry-service.ts 保持一致） ───

export type DeviceType = 'relay' | 'sensor' | 'camera' | 'stepper'

export interface DeviceMetric {
  key: string
  label: string
  unit: string
  mqtt_field: string
  scale?: number
}

export interface DeviceConfig {
  relay_num?: number
  metrics?: DeviceMetric[]
  stream_url?: string
  camera_id?: string
  pulses_per_mm?: number
  max_travel_mm?: number
  max_pulses?: number
  min_pulses?: number
  [key: string]: any
}

export interface RegistryDevice {
  id: number
  name: string
  type: DeviceType
  category: string
  subscribe_topic: string | null
  publish_topic: string | null
  node_id: string | null
  icon: string
  color: string
  config: DeviceConfig
  is_critical: boolean
  is_enabled: boolean
  sort_order: number
  created_at: number
  updated_at: number
}

// ─── 旧版实时数据（沿用 sensor_readings 固定列） ───

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
  stepper_direction?: number
  stepper_position?: number
}

export interface ConnectionStatus {
  connected: boolean
  error: string | null
  lastUpdate: Date | null
}

interface DeviceContextType {
  // 旧版实时数据（向后兼容，温室环境传感器 + 继电器状态）
  deviceData: DeviceData | null
  connectionStatus: ConnectionStatus
  // 设备注册表（所有启用的设备）
  devices: RegistryDevice[]
  devicesLoading: boolean
  // 自定义设备实时数据（device_id → metrics）
  customDeviceData: Record<number, Record<string, any>>
  // 重新拉取设备列表（admin 增删改后调用）
  refreshDevices: () => Promise<void>
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined)

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    error: null,
    lastUpdate: null
  })
  const [devices, setDevices] = useState<RegistryDevice[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [customDeviceData, setCustomDeviceData] = useState<Record<number, Record<string, any>>>({})

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const timeoutCheckRef = useRef<NodeJS.Timeout | null>(null)

  const TIMEOUT_DURATION = 10000

  // ─── 设备注册表拉取 ───
  const refreshDevices = useCallback(async () => {
    setDevicesLoading(true)
    try {
      const res = await fetch('/api/devices')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setDevices(Array.isArray(data.devices) ? data.devices : [])
    } catch (e) {
      console.error('[DeviceContext] fetch devices failed:', e)
    } finally {
      setDevicesLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshDevices()
  }, [refreshDevices])

  // 设备接入工坊「装入莓小智」成功后广播该事件 → 重新拉取设备注册表
  useEffect(() => {
    const onChanged = () => { refreshDevices() }
    window.addEventListener('berry:devices-changed', onChanged)
    return () => window.removeEventListener('berry:devices-changed', onChanged)
  }, [refreshDevices])

  const startTimeoutCheck = useCallback(() => {
    if (timeoutCheckRef.current) {
      clearTimeout(timeoutCheckRef.current)
    }
    timeoutCheckRef.current = setTimeout(() => {
      console.warn('[SSE] Timeout: No data received for', TIMEOUT_DURATION / 1000, 'seconds')
      setConnectionStatus(prev => ({
        ...prev,
        connected: false,
        error: 'Connection timeout - no data received'
      }))
    }, TIMEOUT_DURATION)
  }, [])

  const stopTimeoutCheck = useCallback(() => {
    if (timeoutCheckRef.current) {
      clearTimeout(timeoutCheckRef.current)
      timeoutCheckRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    stopTimeoutCheck()

    try {
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
        startTimeoutCheck()
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
                const updatedFields: any = {
                    ...current,
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
            startTimeoutCheck()
          } else if (message.type === 'custom_device_data' && message.device_id !== undefined) {
            // 自定义设备（设备注册表中的传感器）实时数据
            setCustomDeviceData(prev => ({
              ...prev,
              [message.device_id]: { ...(message.data || {}), _ts: message.timestamp || Date.now() }
            }))
            setConnectionStatus(prev => ({
              ...prev,
              lastUpdate: new Date()
            }))
            startTimeoutCheck()
          }
        } catch (error) {
          console.error('[SSE] Error parsing message:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error)
        eventSource.close()
        eventSourceRef.current = null
        stopTimeoutCheck()
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
          error: 'Connection lost'
        }))

        const timeout = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 30000)
        console.log(`[SSE] Reconnecting in ${timeout}ms...`)
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++
          connect()
        }, timeout)
      }

    } catch (error) {
      console.error('[SSE] Setup error:', error)
      stopTimeoutCheck()
      setConnectionStatus(prev => ({
        ...prev,
        error: 'Failed to setup connection'
      }))
    }
  }, [startTimeoutCheck, stopTimeoutCheck])

  useEffect(() => {
    connect()
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (timeoutCheckRef.current) {
        clearTimeout(timeoutCheckRef.current)
      }
    }
  }, [connect])

  return (
    <DeviceContext.Provider value={{
      deviceData,
      connectionStatus,
      devices,
      devicesLoading,
      customDeviceData,
      refreshDevices
    }}>
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
