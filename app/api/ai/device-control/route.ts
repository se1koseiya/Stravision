/**
 * AI Device Control API
 * 
 * 允许 AI 助手控制设备
 */

import { NextRequest, NextResponse } from 'next/server'
import { MQTTService } from '@/lib/mqtt-service'
import { getCurrentUser } from '@/lib/auth'
import { checkSecurity, logRequest } from '@/lib/security'
import { initDB, execute } from '@/lib/db/database'

// Helper to log device action
async function logDeviceAction(deviceName: string, action: string, operator: string, details: string) {
  try {
    await initDB()
    await execute(
      `INSERT INTO device_logs (device_name, action, operator, details, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [deviceName, action, operator, details, Date.now()]
    )
  } catch (error) {
    console.error('Failed to log device action:', error)
  }
}

export async function POST(request: NextRequest) {
  // 1. Security Check
  const securityCheck = await checkSecurity(request)
  if (!securityCheck.allowed) {
    return securityCheck.response!
  }

  try {
    // 1. Authentication Check
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    let { action, device, value, r, g, b } = body

    // Permission Check
    if (currentUser.role !== 'super_admin' && currentUser.role !== 'admin') {
      const permissions = typeof currentUser.permissions === 'string' 
        ? JSON.parse(currentUser.permissions || '{}') 
        : currentUser.permissions || {};
      const allowedControls = permissions.allowedControls || [];

      if (action === 'toggle_relay') {
        const relayId = `relay${device}`;
        if (!allowedControls.includes(relayId)) {
           return NextResponse.json(
             { success: false, error: `Permission denied: You cannot control ${relayId}` },
             { status: 403 }
           );
        }
      } else if (action === 'set_led') {
        // AI sends r, g, b which map to led1, led2, led3
        if (!allowedControls.includes('led1') && !allowedControls.includes('led2') && !allowedControls.includes('led3')) {
           // If user has NO led permissions, block. 
           // Ideally check per channel, but for now block if no LED control allowed.
           // Or strictly:
           if (!allowedControls.includes('led1') || !allowedControls.includes('led2') || !allowedControls.includes('led3')) {
               return NextResponse.json(
                 { success: false, error: `Permission denied: You need full LED control permissions` },
                 { status: 403 }
               );
           }
        }
      }
    }
    
    console.log('[AI Device Control] Received command:', JSON.stringify(body, null, 2))
    
    // 验证请求
    if (!action) {
      console.error('[AI Device Control] Missing action parameter')
      return NextResponse.json(
        { success: false, error: 'Missing action parameter' },
        { status: 400 }
      )
    }
    
    const mqttService = MQTTService.getInstance()
    
    // Ensure MQTT connected
    if (!mqttService.isConnected()) {
      try {
        await mqttService.connect()
      } catch (e) {
        return NextResponse.json({ success: false, error: 'MQTT Connection Failed' }, { status: 503 })
      }
    }

    // 根据不同的 action 执行不同的控制
    if (action === 'toggle_relay') {
      // 规范化 value 值，兼容 boolean 和 string
      if (typeof value === 'boolean') {
        value = value ? 1 : 0
      } else if (typeof value === 'string') {
        const v = value.toLowerCase()
        if (v === '1' || v === 'true' || v === 'on') value = 1
        else if (v === '0' || v === 'false' || v === 'off') value = 0
      }

      if (device === undefined || device === null || (value !== 0 && value !== 1)) {
        return NextResponse.json(
          { success: false, error: `Invalid device (${device}) or value (${value}) for toggle_relay. Device must be 5-8, value must be 0 or 1.` },
          { status: 400 }
        )
      }
      
      // 验证设备编号范围
      if (device < 5 || device > 8) {
        return NextResponse.json(
          { success: false, error: `Invalid device number: ${device}. Must be between 5 and 8.` },
          { status: 400 }
        )
      }
      
      // 直接调用 MQTT Service，不再通过 API
      const mqttPayload = {
        type: 'relay' as const,
        relayNum: device,
        newState: value
      }
      console.log('[AI Device Control] Calling MQTT Service with:', mqttPayload)
      
      await mqttService.sendControlCommand(mqttPayload)
      
      // Log action
      await logDeviceAction(
        `Relay ${device}`, 
        value ? 'Turn On' : 'Turn Off', 
        currentUser.username || 'AI Assistant',
        `AI switched Relay ${device} ${value ? 'ON' : 'OFF'}`
      )

      return NextResponse.json({
        success: true,
        message: 'Control command sent successfully',
        timestamp: Date.now()
      })
      
    } else if (action === 'set_led') {
      if (r === undefined || g === undefined || b === undefined) {
        return NextResponse.json(
          { success: false, error: 'Missing RGB values for set_led' },
          { status: 400 }
        )
      }
      
      // 验证 RGB 值范围
      if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
        return NextResponse.json(
          { success: false, error: 'RGB values must be between 0 and 255' },
          { status: 400 }
        )
      }
      
      // 直接调用 MQTT Service
      const mqttPayload = {
        type: 'led' as const,
        led1: r,  // 红色
        led2: g,  // 绿色
        led3: b,  // 蓝色
        led4: 0   // 白色（保留）
      }
      console.log('[AI Device Control] Calling MQTT Service with:', mqttPayload)
      
      await mqttService.sendControlCommand(mqttPayload)
      
      // Log action
      await logDeviceAction(
        'RGB Light', 
        'Set Color', 
        currentUser.username || 'AI Assistant',
        `AI Set RGB: ${r}, ${g}, ${b}`
      )

      return NextResponse.json({
        success: true,
        message: 'Control command sent successfully',
        timestamp: Date.now()
      })
      
    } else if (action === 'control_camera') {
      // 摄像头云台控制（步进电机）
      const { direction, pulses } = body
      
      if (direction === undefined || direction === null) {
        return NextResponse.json(
          { success: false, error: 'Missing direction parameter for control_camera' },
          { status: 400 }
        )
      }
      
      // 验证方向值
      if (direction !== 0 && direction !== 1 && direction !== 2) {
        return NextResponse.json(
          { success: false, error: 'Direction must be 0 (stop), 1 (left), or 2 (right)' },
          { status: 400 }
        )
      }

      // 权限检查
      if (currentUser.role !== 'super_admin' && currentUser.role !== 'admin') {
        const permissions = typeof currentUser.permissions === 'string' 
          ? JSON.parse(currentUser.permissions || '{}') 
          : currentUser.permissions || {};
        const allowedControls = permissions.allowedControls || [];
        
        if (!allowedControls.includes('stepper')) {
          return NextResponse.json(
            { success: false, error: 'Permission denied: You cannot control the camera pan' },
            { status: 403 }
          );
        }
      }
      
      // 调用 MQTT Service 控制步进电机
      const mqttPayload: { type: 'stepper', stepper_direction: number, stepper_pulses?: number } = {
        type: 'stepper',
        stepper_direction: direction
      }
      
      if (pulses !== undefined && typeof pulses === 'number') {
        mqttPayload.stepper_pulses = pulses;
      }
      console.log('[AI Device Control] Calling MQTT Service with:', mqttPayload)
      
      await mqttService.sendControlCommand(mqttPayload)
      
      // Log action
      const directionNames = ['停止', '左移', '右移']
      await logDeviceAction(
        '摄像头云台', 
        directionNames[direction], 
        currentUser.username || 'AI Assistant',
        `AI 控制摄像头云台${directionNames[direction]}`
      )

      return NextResponse.json({
        success: true,
        message: `Camera pan ${directionNames[direction]} command sent successfully`,
        timestamp: Date.now()
      })
      
    } else if (action === 'reset_camera') {
      // 权限检查
      if (currentUser.role !== 'super_admin' && currentUser.role !== 'admin') {
        const permissions = typeof currentUser.permissions === 'string' 
          ? JSON.parse(currentUser.permissions || '{}') 
          : currentUser.permissions || {};
        const allowedControls = permissions.allowedControls || [];
        
        if (!allowedControls.includes('stepper')) {
          return NextResponse.json(
            { success: false, error: 'Permission denied: You cannot control the camera pan' },
            { status: 403 }
          );
        }
      }

      // 调用 MQTT Service 控制步进电机复位
      const mqttPayload = {
        type: 'stepper_reset' as const
      }
      console.log('[AI Device Control] Calling MQTT Service with:', mqttPayload)
      
      await mqttService.sendControlCommand(mqttPayload)
      
      // Log action
      await logDeviceAction(
        '摄像头云台', 
        '复位居中', 
        currentUser.username || 'AI Assistant',
        `AI 将丝杆滑台复位到正中间`
      )

      return NextResponse.json({
        success: true,
        message: `Camera reset command sent successfully`,
        timestamp: Date.now()
      })
      
    } else {
      return NextResponse.json(
        { success: false, error: `Unknown action: ${action}` },
        { status: 400 }
      )
    }
    
  } catch (error) {
    console.error('[AI Device Control] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// 返回可用的控制命令说明
export async function GET() {
  return NextResponse.json({
    availableActions: {
      toggle_relay: {
        description: "开关继电器设备",
        parameters: {
          action: "toggle_relay",
          device: "继电器编号 (5=水泵, 6=风扇, 7=补光灯, 8=白灯)",
          value: "状态值 (0=关闭, 1=开启)"
        },
        example: {
          action: "toggle_relay",
          device: 5,
          value: 1
        }
      },
      set_led: {
        description: "设置 RGB LED 补光灯颜色",
        parameters: {
          action: "set_led",
          r: "红色值 (0-255)",
          g: "绿色值 (0-255)",
          b: "蓝色值 (0-255)"
        },
        example: {
          action: "set_led",
          r: 255,
          g: 100,
          b: 50
        }
      },
      control_camera: {
        description: "控制摄像头云台（步进电机）左右移动",
        parameters: {
          action: "control_camera",
          direction: "方向 (0=停止, 1=左移, 2=右移)"
        },
        example: {
          action: "control_camera",
          direction: 1
        }
      },
      reset_camera: {
        description: "将摄像头云台（步进电机）复位到正中间",
        parameters: {
          action: "reset_camera"
        },
        example: {
          action: "reset_camera"
        }
      }
    }
  })
}
