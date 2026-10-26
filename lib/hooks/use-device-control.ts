/**
 * Custom Hook for Device Control
 * 
 * Provides functions to send control commands to devices via HTTP API
 */

import { useState, useCallback } from 'react'
import { toast } from '@/lib/ui/feedback'

export interface ControlCommand {
  type: 'relay' | 'led' | 'stepper' | 'stepper_reset' | 'stepper_preset'
  relayNum?: number
  device_id?: number           // 设备注册表 ID（自定义设备用）
  newState?: number
  led1?: number
  led2?: number
  led3?: number
  led4?: number
  // 步进电机控制参数 (摄像头云台)
  stepper_direction?: number   // 运行方向: 0=停止, 1=正转/左移, 2=反转/右移
  stepper_pulses?: number      // 脉冲数 (决定移动距离)
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

  // 通过设备注册表 ID 控制继电器（自定义设备用）
  const toggleRelayByDeviceId = useCallback(async (deviceId: number, currentState: number): Promise<boolean> => {
    const newState = currentState === 1 ? 0 : 1
    return sendCommand({
      type: 'relay',
      device_id: deviceId,
      newState
    })
  }, [sendCommand])

  // setLEDs 接口参数（已调整为硬件BRG顺序）：
  // led1 = Blue (蓝色)
  // led2 = Red (红色)
  // led3 = Green (绿色)
  // led4 = W (白色/保留)
  // 
  // 直接映射到硬件协议：
  // node0501=Blue, node0502=Red, node0503=Green
  const setLEDs = useCallback(async (led1: number, led2: number, led3: number, led4: number): Promise<boolean> => {
    return sendCommand({
      type: 'led',
      led1, // Blue蓝色
      led2, // Red红色
      led3, // Green绿色
      led4  // W白色(保留)
    })
  }, [sendCommand])

  // 步进电机控制 (摄像头云台)
  const controlStepper = useCallback(async (direction: number, pulses?: number): Promise<boolean> => {
    // direction: 0=停止, 1=正转/左移, 2=反转/右移
    return sendCommand({
      type: 'stepper',
      stepper_direction: direction,
      stepper_pulses: pulses
    })
  }, [sendCommand])

  // 步进电机复位到最左侧起点
  const resetStepperPosition = useCallback(async (): Promise<boolean> => {
    return sendCommand({
      type: 'stepper_reset'
    })
  }, [sendCommand])

  // 发送自定义预设参数
  const sendStepperPreset = useCallback(async (pulses: number, speed: number): Promise<boolean> => {
    return sendCommand({
      type: 'stepper_preset',
      stepper_pulses: pulses,
      stepper_run_time: speed
    })
  }, [sendCommand])

  return {
    status,
    sendCommand,
    toggleRelay,
    toggleRelayByDeviceId,
    setLEDs,
    controlStepper,
    resetStepperPosition,
    sendStepperPreset
  }
}
