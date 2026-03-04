/**
 * Custom Hook for Device Control
 * 
 * Provides functions to send control commands to devices via HTTP API
 */

import { useState, useCallback } from 'react'
import { toast } from 'sonner'

export interface ControlCommand {
  type: 'relay' | 'led' | 'stepper'
  relayNum?: number
  newState?: number
  led1?: number
  led2?: number
  led3?: number
  led4?: number
  // 步进电机控制参数 (摄像头云台)
  stepper_direction?: number   // 运行方向: 0=停止, 1=正转/左移, 2=反转/右移
  stepper_mode?: number        // 工作模式: 6=通讯控制模式
  stepper_accel?: number       // 加速系数: 100-10000
  stepper_decel?: number       // 减速系数: 100-10000
  stepper_run_time?: number    // 运行时间 (100=1秒)
  stepper_loop_count?: number  // 循环次数: 0=无限循环
}

export interface ControlResponse {
  success: boolean
  message: string
  timestamp: number
}

export interface ControlStatus {
  loading: boolean
  error: string | null
  lastCommand: ControlCommand | null
}

export function useDeviceControl() {
  const [status, setStatus] = useState<ControlStatus>({
    loading: false,
    error: null,
    lastCommand: null
  })

  const sendCommand = useCallback(async (command: ControlCommand): Promise<boolean> => {
    setStatus({
      loading: true,
      error: null,
      lastCommand: command
    })

    try {
      console.log('[Control] Sending command:', command)

      const response = await fetch('/api/mqtt/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command)
      })

      const result: ControlResponse = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to send command')
      }

      console.log('[Control] Command sent successfully:', result)

      setStatus({
        loading: false,
        error: null,
        lastCommand: command
      })

      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[Control] Failed to send command:', errorMessage)
      
      // Auto-show toast for errors, especially permission issues
      toast.error(errorMessage)

      setStatus({
        loading: false,
        error: errorMessage,
        lastCommand: command
      })

      return false
    }
  }, [])

  const toggleRelay = useCallback(async (relayNum: number, currentState: number): Promise<boolean> => {
    const newState = currentState === 1 ? 0 : 1
    return sendCommand({
      type: 'relay',
      relayNum,
      newState
    })
  }, [sendCommand])

  const setLEDs = useCallback(async (led1: number, led2: number, led3: number, led4: number): Promise<boolean> => {
    return sendCommand({
      type: 'led',
      led1,
      led2,
      led3,
      led4
    })
  }, [sendCommand])

  // 步进电机控制 (摄像头云台)
  const controlStepper = useCallback(async (direction: number): Promise<boolean> => {
    // direction: 0=停止, 1=正转/左移, 2=反转/右移
    return sendCommand({
      type: 'stepper',
      stepper_direction: direction
    })
  }, [sendCommand])

  return {
    status,
    sendCommand,
    toggleRelay,
    setLEDs,
    controlStepper
  }
}
