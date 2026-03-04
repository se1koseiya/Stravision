/**
 * MQTT Control API Route
 * 
 * HTTP POST endpoint for sending control commands to IoT devices via MQTT.
 * Handles relay control and LED brightness adjustment.
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

/**
 * Log structured message
 * 
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {any} data - Optional additional data
 */
function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    component: 'Control-API',
    message,
    ...(data && { data })
  }

  if (level === 'ERROR') {
    console.error(JSON.stringify(logEntry))
  } else if (level === 'WARN') {
    console.warn(JSON.stringify(logEntry))
  } else {
    console.log(JSON.stringify(logEntry))
  }
}

/**
 * Control Request Interface
 * Defines the structure of incoming control command requests
 */
interface ControlRequest {
  type: 'relay' | 'led' | 'stepper'
  relayNum?: number       // Relay number (5-8)
  newState?: number       // Relay state (0/1)
  led1?: number           // LED 1 brightness (0-255)
  led2?: number           // LED 2 brightness (0-255)
  led3?: number           // LED 3 brightness (0-255)
  led4?: number           // LED 4 brightness (0-255)
  // 步进电机控制参数
  stepper_direction?: number   // 运行方向: 0=停止, 1=正转, 2=反转
  stepper_mode?: number        // 模式设置: 1-26
  stepper_accel?: number       // 加速频率: 1-65535
  stepper_decel?: number       // 减速频率: 1-65535
  stepper_run_time?: number    // 运行时间 (100=1秒)
  stepper_loop_count?: number  // 循环次数: 0=无限循环
}

/**
 * Control Response Interface
 * Defines the structure of API responses
 */
interface ControlResponse {
  success: boolean
  message: string
  timestamp: number
}

/**
 * Validate control request data
 * 
 * @param {ControlRequest} data - Request data to validate
 * @returns {string | null} Error message if invalid, null if valid
 */
function validateControlRequest(data: ControlRequest): string | null {
  // Validate type field
  if (!data.type || (data.type !== 'relay' && data.type !== 'led' && data.type !== 'stepper')) {
    return 'Invalid or missing type field. Must be "relay", "led", or "stepper"'
  }
  
  if (data.type === 'relay') {
    if (data.relayNum === undefined || data.newState === undefined) {
      return 'Relay command requires relayNum and newState'
    }
    if (data.relayNum < 5 || data.relayNum > 8) {
      return 'Relay number must be between 5 and 8'
    }
    if (data.newState !== 0 && data.newState !== 1) {
      return 'Relay state must be 0 or 1'
    }
  } else if (data.type === 'led') {
    // LED brightness validation is optional as they are optional fields
    // But if provided, must be 0-255
    const leds = [data.led1, data.led2, data.led3, data.led4]
    for (const val of leds) {
      if (val !== undefined && (val < 0 || val > 255)) {
        return 'LED brightness must be between 0 and 255'
      }
    }
  } else if (data.type === 'stepper') {
    // 步进电机验证 (摄像头云台)
    if (data.stepper_direction === undefined) {
      return 'Stepper command requires stepper_direction (0=stop, 1=forward/left, 2=reverse/right)'
    }
    if (data.stepper_direction < 0 || data.stepper_direction > 2) {
      return 'Stepper direction must be 0 (stop), 1 (forward/left), or 2 (reverse/right)'
    }
    if (data.stepper_mode !== undefined && (data.stepper_mode < 1 || data.stepper_mode > 26)) {
      return 'Stepper mode must be between 1 and 26'
    }
    if (data.stepper_accel !== undefined && (data.stepper_accel < 100 || data.stepper_accel > 10000)) {
      return 'Stepper acceleration must be between 100 and 10000'
    }
    if (data.stepper_decel !== undefined && (data.stepper_decel < 100 || data.stepper_decel > 10000)) {
      return 'Stepper deceleration must be between 100 and 10000'
    }
    if (data.stepper_run_time !== undefined && (data.stepper_run_time < 1 || data.stepper_run_time > 65535)) {
      return 'Stepper run time must be between 1 and 65535'
    }
    if (data.stepper_loop_count !== undefined && (data.stepper_loop_count < 0 || data.stepper_loop_count > 65535)) {
      return 'Stepper loop count must be between 0 and 65535'
    }
  }

  return null
}

/**
 * POST /api/mqtt/control
 * 
 * Receives control commands from frontend and sends them to devices via MQTT.
 * 
 * @param {NextRequest} req - Next.js request object
 * @returns {NextResponse} JSON response with success status
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Security Check (IP Ban & Logging)
  const securityCheck = await checkSecurity(req)
  if (!securityCheck.allowed) {
    return securityCheck.response!
  }

  try {
    // Verify authentication
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      log('WARN', 'Unauthorized control command attempt')
      await logRequest(req, 401)
      
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
          timestamp: Date.now()
        } as ControlResponse,
        { status: 401 }
      )
    }

    // Parse request body
    let body: ControlRequest
    try {
      body = await req.json()
    } catch (error) {
      log('WARN', 'Invalid JSON in request body', { error })
      await logRequest(req, 400, currentUser.id)
      
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid JSON in request body',
          timestamp: Date.now()
        } as ControlResponse,
        { status: 400 }
      )
    }

    // Validate request data
    const validationError = validateControlRequest(body)
    if (validationError) {
      log('WARN', 'Request validation failed', { error: validationError, body })
      await logRequest(req, 400, currentUser.id)
      
      return NextResponse.json(
        {
          success: false,
          message: validationError,
          timestamp: Date.now()
        } as ControlResponse,
        { status: 400 }
      )
    }

    // 2. Permission Check
    if (currentUser.role !== 'super_admin' && currentUser.role !== 'admin') {
      const permissions = typeof currentUser.permissions === 'string' 
        ? JSON.parse(currentUser.permissions || '{}') 
        : currentUser.permissions || {};
      const allowedControls = permissions.allowedControls || [];

      if (body.type === 'relay') {
        const relayId = `relay${body.relayNum}`;
        if (!allowedControls.includes(relayId)) {
           log('WARN', 'Permission denied for relay control', { user: currentUser.username, relayId });
           await logRequest(req, 403, currentUser.id);
           return NextResponse.json(
             { success: false, message: `Permission denied: You cannot control ${relayId}`, timestamp: Date.now() },
             { status: 403 }
           );
        }
      } else if (body.type === 'led') {
        // Check permissions for each LED being set
        if (body.led1 !== undefined && !allowedControls.includes('led1')) {
           return NextResponse.json({ success: false, message: "Permission denied: You cannot control LED 1", timestamp: Date.now() }, { status: 403 });
        }
        if (body.led2 !== undefined && !allowedControls.includes('led2')) {
           return NextResponse.json({ success: false, message: "Permission denied: You cannot control LED 2", timestamp: Date.now() }, { status: 403 });
        }
        if (body.led3 !== undefined && !allowedControls.includes('led3')) {
           return NextResponse.json({ success: false, message: "Permission denied: You cannot control LED 3", timestamp: Date.now() }, { status: 403 });
        }
        if (body.led4 !== undefined && !allowedControls.includes('led4')) {
           return NextResponse.json({ success: false, message: "Permission denied: You cannot control LED 4", timestamp: Date.now() }, { status: 403 });
        }
      } else if (body.type === 'stepper') {
        // 步进电机权限检查
        if (!allowedControls.includes('stepper')) {
           log('WARN', 'Permission denied for stepper control', { user: currentUser.username });
           await logRequest(req, 403, currentUser.id);
           return NextResponse.json(
             { success: false, message: "Permission denied: You cannot control the stepper motor", timestamp: Date.now() },
             { status: 403 }
           );
        }
      }
    }

    // Get MQTT service instance
    const mqttService = MQTTService.getInstance()

    // Connect to MQTT if not already connected
    if (!mqttService.isConnected()) {
      log('INFO', 'MQTT not connected, attempting to connect...')
      
      try {
        await mqttService.connect()
        log('INFO', 'MQTT connection established successfully')
      } catch (error) {
        log('ERROR', 'Failed to connect to MQTT service', error)
        
        return NextResponse.json(
          {
            success: false,
            message: 'Failed to connect to MQTT service',
            timestamp: Date.now()
          } as ControlResponse,
          { status: 503 }
        )
      }
    }

    // Log control command attempt
    log('INFO', 'Sending control command', { 
      type: body.type,
      ...(body.type === 'relay' && { relayNum: body.relayNum, newState: body.newState }),
      ...(body.type === 'led' && { led1: body.led1, led2: body.led2, led3: body.led3, led4: body.led4 }),
      ...(body.type === 'stepper' && { 
        direction: body.stepper_direction, 
        mode: body.stepper_mode,
        accel: body.stepper_accel,
        decel: body.stepper_decel,
        runTime: body.stepper_run_time,
        loopCount: body.stepper_loop_count
      })
    })

    // Send control command via MQTT
    try {
      await mqttService.sendControlCommand({
        type: body.type,
        relayNum: body.relayNum,
        newState: body.newState,
        led1: body.led1,
        led2: body.led2,
        led3: body.led3,
        led4: body.led4,
        // 步进电机参数
        stepper_direction: body.stepper_direction,
        stepper_mode: body.stepper_mode,
        stepper_accel: body.stepper_accel,
        stepper_decel: body.stepper_decel,
        stepper_run_time: body.stepper_run_time,
        stepper_loop_count: body.stepper_loop_count
      })

      log('INFO', 'Control command sent successfully', { type: body.type })

      // Log to database for Activity Panel
      let deviceName: string
      let actionStr: string
      let detailsStr: string

      if (body.type === 'relay') {
        deviceName = `Relay ${body.relayNum}`
        actionStr = body.newState ? 'Turn On' : 'Turn Off'
        detailsStr = `Switched Relay ${body.relayNum} ${body.newState ? 'ON' : 'OFF'}`
      } else if (body.type === 'led') {
        deviceName = 'RGB Light'
        actionStr = 'Adjust Color'
        detailsStr = `R:${body.led1} G:${body.led2} B:${body.led3}`
      } else if (body.type === 'stepper') {
        deviceName = '摄像头云台'
        const directionNames = ['停止', '左移', '右移']
        actionStr = directionNames[body.stepper_direction!] || '控制'
        detailsStr = `摄像头云台${actionStr}`
      } else {
        deviceName = 'Unknown'
        actionStr = 'Unknown'
        detailsStr = ''
      }

      await logDeviceAction(deviceName, actionStr, currentUser.username || currentUser.email || 'Unknown', detailsStr)

      await logRequest(req, 200, currentUser.id)

      // Return success response
      return NextResponse.json(
        {
          success: true,
          message: 'Control command sent successfully',
          timestamp: Date.now()
        } as ControlResponse,
        { status: 200 }
      )

    } catch (error) {
      // Handle MQTT command send failure
      log('ERROR', 'Failed to send control command via MQTT', { 
        error: error instanceof Error ? error.message : String(error),
        body 
      })
      
      return NextResponse.json(
        {
          success: false,
          message: `Failed to send command: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now()
        } as ControlResponse,
        { status: 500 }
      )
    }

  } catch (error) {
    // Catch any unexpected errors
    log('ERROR', 'Unexpected error in control API handler', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        timestamp: Date.now()
      } as ControlResponse,
      { status: 500 }
    )
  }
}
