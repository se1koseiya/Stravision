/**
 * 内置设备控制工具（builtin-device-control）
 *
 * 设计目标：把原本"AI 输出 JSON 代码块 + 前端正则解析 + HTTP 调 MQTT + 静默消息回流"
 * 的链路，重构为"原生 tool_call + MCP 工具内部阻塞等待物理动作完成 + 结果直接回灌 agent loop"。
 *
 * 6 个工具：
 *   - toggle_relay         阻塞等继电器状态确认
 *   - set_led              阻塞等 LED 状态确认
 *   - control_camera       阻塞等步进电机稳定
 *   - reset_camera         阻塞等步进电机复位完成
 *   - take_camera_snapshot ffmpeg 抓帧返回多模态结果
 *   - move_camera_and_look 移动+截图组合工具（最常用的视觉巡检入口）
 *
 * 多模态结果约定：data._multimodal = { images: [{base64, mime_type}], summary }
 * chat/route.ts 检测到该字段时把 tool 消息转为 OpenAI Vision 格式（content 数组含 image_url）。
 */

import { MQTTService, type DeviceData } from '@/lib/mqtt-service'
import { getUserById } from '@/lib/db/user-service'
import { getGreenhouseCameraUrls } from '@/lib/db/settings-service'
import { DEVICE_NAMES, DEVICE_IDS, STEPPER, RELAY_DEVICE_RANGE } from '@/lib/constants'
import { listDevices, getDevice } from '@/lib/db/device-registry-service'
import { spawn } from 'node:child_process'

// === 类型定义 ===

interface ToolCallResult {
  success: boolean
  data?: any
  error?: string
}

interface MultimodalImage {
  base64: string
  mime_type: string
}

interface MultimodalResult {
  _multimodal: {
    images: MultimodalImage[]
    summary: string
  }
  [key: string]: any
}

function isMultimodal(data: any): data is MultimodalResult {
  return data && typeof data === 'object' && data._multimodal && Array.isArray(data._multimodal.images)
}

// === 等待器：基于轮询的物理动作完成检测 ===

/**
 * 等待步进电机移动到目标位置并稳定
 *
 * 策略：先按脉冲数估算移动时长并睡眠，再轮询 latestData.stepper_position 直到稳定。
 * 设备无 ACK 事件，只能用"预测时长 + 状态稳定"近似。
 *
 * @param targetPos 目标脉冲位置（来自 sendControlCommand 的乐观更新）
 * @param expectedPulses 预计移动的脉冲数（用于估算时长）
 * @param timeoutMs 总超时（默认 60s）
 */
export async function waitStepperStable(
  targetPos: number,
  expectedPulses: number,
  timeoutMs: number = 60000
): Promise<{ stable: boolean; finalPosition: number; durationMs: number; reason: string }> {
  const start = Date.now()
  const tolerance = STEPPER.PULSES_PER_MM * 2 // 允许 2mm 误差

  // 估算移动时长：参考原前端逻辑 pulses/80，最少 2s
  const estimatedMs = Math.max(2000, Math.ceil(expectedPulses / 80) * 1000)
  await sleep(Math.min(estimatedMs, timeoutMs))

  const mqtt = MQTTService.getInstance()
  const deadline = start + timeoutMs

  // 轮询直到位置稳定（连续 3 次 reading 一致且接近目标）
  let lastPos = -1
  let stableCount = 0
  const requiredStableReadings = 3
  const pollInterval = 300

  while (Date.now() < deadline) {
    const data = mqtt.getLatestData()
    const currentPos = data?.stepper_position ?? mqtt.getCachedStepperPosition()

    if (currentPos === lastPos) {
      stableCount++
      if (stableCount >= requiredStableReadings) {
        const diff = Math.abs(currentPos - targetPos)
        if (diff <= tolerance) {
          return {
            stable: true,
            finalPosition: currentPos,
            durationMs: Date.now() - start,
            reason: `position stable at ${currentPos} pulses (${(currentPos / STEPPER.PULSES_PER_MM).toFixed(1)}mm), within tolerance of target ${targetPos}`
          }
        } else {
          return {
            stable: true,
            finalPosition: currentPos,
            durationMs: Date.now() - start,
            reason: `position stable at ${currentPos} pulses but off target by ${diff} pulses (target ${targetPos})`
          }
        }
      }
    } else {
      stableCount = 0
      lastPos = currentPos
    }
    await sleep(pollInterval)
  }

  const finalPos = mqtt.getLatestData()?.stepper_position ?? mqtt.getCachedStepperPosition()
  return {
    stable: false,
    finalPosition: finalPos,
    durationMs: Date.now() - start,
    reason: `timeout after ${timeoutMs}ms, last position ${finalPos} pulses (target ${targetPos})`
  }
}

/**
 * 等待继电器状态变化确认
 *
 * 继电器动作近乎瞬时，但仍轮询 latestData 确认设备真实上报的状态。
 */
export async function waitRelayState(
  relayNum: number,
  expected: number,
  timeoutMs: number = 5000
): Promise<{ confirmed: boolean; actualState: number | null; durationMs: number }> {
  const start = Date.now()
  const mqtt = MQTTService.getInstance()
  const key = `relay${relayNum}` as keyof DeviceData
  const deadline = start + timeoutMs
  const pollInterval = 150

  while (Date.now() < deadline) {
    const data = mqtt.getLatestData()
    const actual = data ? (data[key] as number) : undefined
    if (actual !== undefined && actual === expected) {
      return { confirmed: true, actualState: actual, durationMs: Date.now() - start }
    }
    await sleep(pollInterval)
  }

  const finalData = mqtt.getLatestData()
  return {
    confirmed: false,
    actualState: finalData ? (finalData[key] as number) ?? null : null,
    durationMs: Date.now() - start
  }
}

/**
 * 用 ffmpeg 从 RTSP/HTTP 视频流抓取一帧
 *
 * 返回 base64 编码的 JPEG。需要服务器安装 ffmpeg。
 */
export async function captureCameraFrame(
  cameraUrl: string,
  timeoutMs: number = 15000
): Promise<{ base64: string; mime_type: string }> {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-rtsp_transport', 'tcp',
      '-i', cameraUrl,
      '-frames:v', '1',
      '-q:v', '3',
      '-f', 'image2',
      '-an',
      '-'
    ]
    const ffmpeg = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    const chunks: Buffer[] = []
    let stderrData = ''

    const timer = setTimeout(() => {
      ffmpeg.kill('SIGKILL')
      reject(new Error(`ffmpeg capture timeout after ${timeoutMs}ms`))
    }, timeoutMs)

    ffmpeg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk))
    ffmpeg.stderr.on('data', (chunk: Buffer) => { stderrData += chunk.toString() })

    ffmpeg.on('error', (err) => {
      clearTimeout(timer)
      reject(new Error(`ffmpeg spawn failed: ${err.message}. Is ffmpeg installed and on PATH?`))
    })

    ffmpeg.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0 && chunks.length > 0) {
        const buf = Buffer.concat(chunks)
        resolve({ base64: buf.toString('base64'), mime_type: 'image/jpeg' })
      } else {
        reject(new Error(`ffmpeg exited with code ${code}. stderr: ${stderrData.slice(-500)}`))
      }
    })
  })
}

// === 权限与参数校验 ===

async function fetchUserPermissions(userId?: number) {
  if (!userId) return null
  const user = await getUserById(userId)
  if (!user) return null

  const permissions = typeof user.permissions === 'string'
    ? JSON.parse(user.permissions || '{}')
    : user.permissions || {}
  const allowedControls: string[] = Array.isArray(permissions.allowedControls) ? permissions.allowedControls : []

  const isAdmin = user.role === 'super_admin' || user.role === 'admin'
  return { isAdmin, allowedControls, username: user.username }
}

function checkRelayPermission(allowed: string[], isAdmin: boolean, relayNum: number): boolean {
  if (isAdmin) return true
  return allowed.includes(`relay${relayNum}`)
}

function checkLedPermission(allowed: string[], isAdmin: boolean): boolean {
  if (isAdmin) return true
  return allowed.includes('led1') && allowed.includes('led2') && allowed.includes('led3')
}

function checkStepperPermission(allowed: string[], isAdmin: boolean): boolean {
  if (isAdmin) return true
  return allowed.includes('stepper')
}

// === 工具实现 ===

async function executeToggleRelay(args: Record<string, any>, userId?: number): Promise<ToolCallResult> {
  const { device, device_id, value } = args

  // 二选一：device_id（注册表 ID）或 device（传统继电器编号 5-8）
  const hasDeviceId = device_id !== undefined && device_id !== null
  const hasLegacyDevice = device !== undefined && device !== null
  if (!hasDeviceId && !hasLegacyDevice) {
    return { success: false, error: '缺少参数：需提供 device_id（设备注册表ID）或 device（继电器编号 5-8）' }
  }

  // 规范化 value
  const normalizedValue = typeof value === 'boolean' ? (value ? 1 : 0)
    : typeof value === 'string' ? (['1', 'true', 'on'].includes(value.toLowerCase()) ? 1 : 0)
    : value
  if (normalizedValue !== 0 && normalizedValue !== 1) {
    return { success: false, error: 'value 必须是 0 或 1' }
  }

  const perm = await fetchUserPermissions(userId)
  if (!perm) return { success: false, error: '无法获取用户信息' }

  // === 分支 1：device_id（设备注册表） ===
  if (hasDeviceId) {
    const registryDevice = await getDevice(Number(device_id))
    if (!registryDevice) {
      return { success: false, error: `设备注册表中未找到 device_id=${device_id}` }
    }
    if (registryDevice.type !== 'relay') {
      return { success: false, error: `设备 ${registryDevice.name}（id=${device_id}）类型为 ${registryDevice.type}，不是继电器设备` }
    }

    // 权限检查：device_${device_id}
    if (!perm.isAdmin && !perm.allowedControls.includes(`device_${device_id}`)) {
      return { success: false, error: `权限不足：无法控制设备 ${registryDevice.name}（device_${device_id}）` }
    }

    const nodeId = registryDevice.node_id
    // relay_num 仅用于状态轮询（向后兼容），自定义设备可能没有
    const relayNum = registryDevice.config?.relay_num
    if (!nodeId) {
      return { success: false, error: `设备 ${registryDevice.name} 未配置 node_id，无法发送控制命令` }
    }

    const mqtt = MQTTService.getInstance()
    if (!mqtt.isConnected()) {
      try { await mqtt.connect() } catch (e: any) { return { success: false, error: `MQTT 连接失败: ${e.message}` } }
    }

    try {
      // 通过 node_id 发送控制命令；同时传 relayNum 用于状态轮询字段（若有）
      await mqtt.sendControlCommand({ type: 'relay', node_id: nodeId, relayNum: relayNum, newState: normalizedValue })

      // 等待状态确认：有 relay_num 时轮询 relay{N} 字段，否则短暂等待
      let wait = { confirmed: false, actualState: null as number | null, durationMs: 0 }
      if (relayNum !== undefined) {
        wait = await waitRelayState(relayNum, normalizedValue, 5000)
      } else {
        await sleep(500)
      }

      return {
        success: true,
        data: {
          device_id,
          device_name: registryDevice.name,
          node_id: nodeId,
          relay_num: relayNum ?? null,
          value: normalizedValue,
          state: normalizedValue === 1 ? 'on' : 'off',
          confirmed: wait.confirmed,
          actual_state: wait.actualState,
          confirm_duration_ms: wait.durationMs,
          message: wait.confirmed
            ? `${registryDevice.name}已${normalizedValue === 1 ? '开启' : '关闭'}（设备状态已确认）`
            : relayNum !== undefined
              ? `${registryDevice.name}控制指令已发送，但设备状态未在 ${wait.durationMs}ms 内确认（可能设备上报延迟）`
              : `${registryDevice.name}控制指令已通过 ${nodeId} 发送`
        }
      }
    } catch (e: any) {
      return { success: false, error: `继电器控制失败: ${e.message}` }
    }
  }

  // === 分支 2：传统 device（继电器编号 5-8，向后兼容） ===
  if (device < RELAY_DEVICE_RANGE.MIN || device > RELAY_DEVICE_RANGE.MAX) {
    return { success: false, error: `device 必须在 ${RELAY_DEVICE_RANGE.MIN}-${RELAY_DEVICE_RANGE.MAX} 范围内` }
  }
  if (!checkRelayPermission(perm.allowedControls, perm.isAdmin, device)) {
    return { success: false, error: `权限不足：无法控制 relay${device}` }
  }

  const mqtt = MQTTService.getInstance()
  if (!mqtt.isConnected()) {
    try { await mqtt.connect() } catch (e: any) { return { success: false, error: `MQTT 连接失败: ${e.message}` } }
  }

  try {
    await mqtt.sendControlCommand({ type: 'relay', relayNum: device, newState: normalizedValue })
    const wait = await waitRelayState(device, normalizedValue, 5000)

    const deviceName = DEVICE_NAMES[device] || `Relay ${device}`
    return {
      success: true,
      data: {
        device,
        device_name: deviceName,
        value: normalizedValue,
        state: normalizedValue === 1 ? 'on' : 'off',
        confirmed: wait.confirmed,
        actual_state: wait.actualState,
        confirm_duration_ms: wait.durationMs,
        message: wait.confirmed
          ? `${deviceName}已${normalizedValue === 1 ? '开启' : '关闭'}（设备状态已确认）`
          : `${deviceName}控制指令已发送，但设备状态未在 ${wait.durationMs}ms 内确认（可能设备上报延迟）`
      }
    }
  } catch (e: any) {
    return { success: false, error: `继电器控制失败: ${e.message}` }
  }
}

async function executeSetLed(args: Record<string, any>, userId?: number): Promise<ToolCallResult> {
  const { r, g, b } = args
  if (r === undefined || g === undefined || b === undefined) {
    return { success: false, error: '缺少 RGB 参数（r/g/b，0-255）' }
  }
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
    return { success: false, error: 'RGB 值必须在 0-255 范围内' }
  }

  const perm = await fetchUserPermissions(userId)
  if (!perm) return { success: false, error: '无法获取用户信息' }
  if (!checkLedPermission(perm.allowedControls, perm.isAdmin)) {
    return { success: false, error: '权限不足：无法控制 LED 灯' }
  }

  const mqtt = MQTTService.getInstance()
  if (!mqtt.isConnected()) {
    try { await mqtt.connect() } catch (e: any) { return { success: false, error: `MQTT 连接失败: ${e.message}` } }
  }

  try {
    // AI 发送的是 RGB 语义，硬件为 BRG 顺序：led1=Blue, led2=Red, led3=Green
    await mqtt.sendControlCommand({
      type: 'led',
      led1: b, led2: r, led3: g, led4: 0
    })
    // LED 状态轮询（短暂等待设备上报）
    await sleep(500)
    const data = mqtt.getLatestData()

    return {
      success: true,
      data: {
        rgb: { r, g, b },
        hardware_mapping: { led1: b, led2: r, led3: g, led4: 0 },
        confirmed: !!data,
        actual_led_state: data ? { led1: data.led1, led2: data.led2, led3: data.led3, led4: data.led4 } : null,
        message: `RGB LED 已设置为 (${r}, ${g}, ${b})`
      }
    }
  } catch (e: any) {
    return { success: false, error: `LED 控制失败: ${e.message}` }
  }
}

async function executeControlCamera(args: Record<string, any>, userId?: number): Promise<ToolCallResult> {
  let { direction, pulses, distance_mm } = args
  if (direction === undefined || direction === null) {
    return { success: false, error: '缺少 direction 参数（0=停止, 1=左移, 2=右移）' }
  }
  if (direction !== 0 && direction !== 1 && direction !== 2) {
    return { success: false, error: 'direction 必须是 0(停止)/1(左)/2(右)' }
  }

  const perm = await fetchUserPermissions(userId)
  if (!perm) return { success: false, error: '无法获取用户信息' }
  if (!checkStepperPermission(perm.allowedControls, perm.isAdmin)) {
    return { success: false, error: '权限不足：无法控制摄像头云台' }
  }

  // 距离换算
  if (distance_mm !== undefined && typeof distance_mm === 'number' && direction !== 0) {
    pulses = Math.round(distance_mm * STEPPER.PULSES_PER_MM)
  }

  const mqtt = MQTTService.getInstance()
  if (!mqtt.isConnected()) {
    try { await mqtt.connect() } catch (e: any) { return { success: false, error: `MQTT 连接失败: ${e.message}` } }
  }

  // 边界校验
  let targetPos = mqtt.getCachedStepperPosition()
  let expectedPulses = 0
  if (direction !== 0 && pulses !== undefined && typeof pulses === 'number') {
    const currentPos = mqtt.getCachedStepperPosition()
    const delta = direction === 1 ? -pulses : pulses
    targetPos = currentPos + delta
    if (targetPos < STEPPER.MIN_PULSES || targetPos > STEPPER.MAX_PULSES) {
      const currentMm = (currentPos / STEPPER.PULSES_PER_MM).toFixed(1)
      const targetMm = (targetPos / STEPPER.PULSES_PER_MM).toFixed(1)
      const limitMm = (STEPPER.MAX_PULSES / STEPPER.PULSES_PER_MM).toFixed(0)
      return {
        success: false,
        error: `边界越限: 当前 ${currentMm}mm → 目标 ${targetMm}mm，有效范围 0-${limitMm}mm`
      }
    }
    expectedPulses = pulses
  }

  try {
    const payload: any = { type: 'stepper', stepper_direction: direction }
    if (pulses !== undefined && typeof pulses === 'number') {
      payload.stepper_pulses = pulses
    }
    await mqtt.sendControlCommand(payload)

    // direction=0 是停止命令，立即返回
    if (direction === 0) {
      return {
        success: true,
        data: {
          direction: 0,
          action: 'stop',
          position_mm: (mqtt.getCachedStepperPosition() / STEPPER.PULSES_PER_MM).toFixed(1),
          message: '云台已停止'
        }
      }
    }

    // 阻塞等待电机稳定
    const wait = await waitStepperStable(targetPos, expectedPulses, 60000)
    return {
      success: true,
      data: {
        direction,
        pulses: expectedPulses,
        distance_mm: expectedPulses / STEPPER.PULSES_PER_MM,
        target_position_mm: (targetPos / STEPPER.PULSES_PER_MM).toFixed(1),
        final_position_mm: (wait.finalPosition / STEPPER.PULSES_PER_MM).toFixed(1),
        stable: wait.stable,
        duration_ms: wait.durationMs,
        reason: wait.reason,
        message: `云台${direction === 1 ? '左移' : '右移'} ${expectedPulses / STEPPER.PULSES_PER_MM}mm 完成，当前位置 ${wait.finalPosition / STEPPER.PULSES_PER_MM}mm`
      }
    }
  } catch (e: any) {
    return { success: false, error: `云台控制失败: ${e.message}` }
  }
}

async function executeResetCamera(args: Record<string, any>, userId?: number): Promise<ToolCallResult> {
  const perm = await fetchUserPermissions(userId)
  if (!perm) return { success: false, error: '无法获取用户信息' }
  if (!checkStepperPermission(perm.allowedControls, perm.isAdmin)) {
    return { success: false, error: '权限不足：无法控制摄像头云台' }
  }

  const mqtt = MQTTService.getInstance()
  if (!mqtt.isConnected()) {
    try { await mqtt.connect() } catch (e: any) { return { success: false, error: `MQTT 连接失败: ${e.message}` } }
  }

  const currentPos = mqtt.getCachedStepperPosition()
  if (currentPos <= 0) {
    return {
      success: true,
      data: {
        action: 'reset',
        position_mm: 0,
        skipped: true,
        message: '云台已在原点，无需复位'
      }
    }
  }

  try {
    await mqtt.sendControlCommand({ type: 'stepper_reset' })
    // 复位到 0，预计移动 currentPos 个脉冲
    const wait = await waitStepperStable(0, currentPos, 60000)
    return {
      success: true,
      data: {
        action: 'reset',
        previous_position_mm: (currentPos / STEPPER.PULSES_PER_MM).toFixed(1),
        final_position_mm: (wait.finalPosition / STEPPER.PULSES_PER_MM).toFixed(1),
        stable: wait.stable,
        duration_ms: wait.durationMs,
        reason: wait.reason,
        message: `云台已复位到原点（${wait.finalPosition / STEPPER.PULSES_PER_MM}mm）`
      }
    }
  } catch (e: any) {
    return { success: false, error: `云台复位失败: ${e.message}` }
  }
}

async function executeTakeCameraSnapshot(args: Record<string, any>, userId?: number): Promise<ToolCallResult> {
  const cameraId = (args.camera_id || 'a').toLowerCase() as 'a' | 'b'
  if (cameraId !== 'a' && cameraId !== 'b') {
    return { success: false, error: 'camera_id 必须是 "a" 或 "b"' }
  }

  const perm = await fetchUserPermissions(userId)
  if (!perm) return { success: false, error: '无法获取用户信息' }
  // 截图走视觉巡检权限
  if (!perm.isAdmin && !perm.allowedControls.includes('stepper')) {
    return { success: false, error: '权限不足：无法使用摄像头' }
  }

  const urls = await getGreenhouseCameraUrls()
  const cameraUrl = cameraId === 'a' ? urls?.cameraAUrl : urls?.cameraBUrl
  if (!cameraUrl || !cameraUrl.trim()) {
    return { success: false, error: `摄像头 ${cameraId} 未配置 URL` }
  }

  try {
    const frame = await captureCameraFrame(cameraUrl, 15000)
    const mqtt = MQTTService.getInstance()
    const data = mqtt.getLatestData()
    const position_mm = data?.stepper_position !== undefined
      ? (data.stepper_position / STEPPER.PULSES_PER_MM).toFixed(1)
      : null

    return {
      success: true,
      data: {
        _multimodal: {
          images: [frame],
          summary: `摄像头 ${cameraId} 截图，云台位置 ${position_mm ?? 'unknown'}mm`
        },
        camera_id: cameraId,
        position_mm,
        captured_at: Date.now(),
        message: `已从摄像头 ${cameraId} 抓取一帧画面`
      }
    }
  } catch (e: any) {
    return { success: false, error: `摄像头截图失败: ${e.message}` }
  }
}

async function executeMoveCameraAndLook(args: Record<string, any>, userId?: number): Promise<ToolCallResult> {
  const { direction, distance_mm, pulses, query, camera_id = 'a' } = args
  if (direction === undefined) {
    return { success: false, error: '缺少 direction 参数（0=停止, 1=左移, 2=右移）' }
  }

  const perm = await fetchUserPermissions(userId)
  if (!perm) return { success: false, error: '无法获取用户信息' }
  if (!checkStepperPermission(perm.allowedControls, perm.isAdmin)) {
    return { success: false, error: '权限不足：无法控制摄像头云台' }
  }

  // 1. 移动云台
  const moveResult = await executeControlCamera({ direction, distance_mm, pulses }, userId)
  if (!moveResult.success || !moveResult.data) {
    return { success: false, error: `云台移动失败: ${moveResult.error}` }
  }

  // 2. 截图
  const snapshotResult = await executeTakeCameraSnapshot({ camera_id }, userId)
  if (!snapshotResult.success || !snapshotResult.data) {
    return {
      success: false,
      error: `云台已移动到 ${moveResult.data.final_position_mm}mm 但截图失败: ${snapshotResult.error}`,
      data: { move: moveResult.data, snapshot_error: snapshotResult.error }
    }
  }

  // 3. 组合返回（包含多模态图片 + 移动信息 + 分析提示）
  return {
    success: true,
    data: {
      _multimodal: {
        images: snapshotResult.data._multimodal.images,
        summary: `云台移动到 ${moveResult.data.final_position_mm}mm 后从摄像头 ${camera_id} 抓取的画面。用户问题：${query || '（未指定）'}`
      },
      move: moveResult.data,
      camera_id,
      query: query || null,
      captured_at: Date.now(),
      message: `已移动到 ${moveResult.data.final_position_mm}mm 并截取画面，请基于图像回答用户问题`
    }
  }
}

/**
 * 列出设备注册表中的所有可用设备
 *
 * 返回所有设备（含禁用项）的 ID、名称、类型、分类、node_id 及状态，
 * 同时生成一份按类型分组的可读文本清单，便于 agent 直接阅读。
 */
async function executeListDevices(): Promise<ToolCallResult> {
  try {
    // includeDisabled: true 以便 agent 全面了解设备布局
    const devices = await listDevices({ includeDisabled: true })

    if (devices.length === 0) {
      return {
        success: true,
        data: {
          total: 0,
          devices: [],
          listing: '设备注册表中暂无设备。',
          message: '设备注册表中暂无设备。可联系管理员在设备管理页添加设备。'
        }
      }
    }

    const typeLabels: Record<string, string> = {
      relay: '继电器（可开关控制）',
      sensor: '传感器（数据采集）',
      camera: '摄像头（视频监控）',
      stepper: '步进电机（位控）'
    }

    const lines: string[] = [`设备注册表共有 ${devices.length} 个设备：`]
    let currentType = ''
    for (const dev of devices) {
      if (dev.type !== currentType) {
        currentType = dev.type
        lines.push(`\n【${typeLabels[dev.type] || dev.type}】`)
      }
      const status = dev.is_enabled ? '启用' : '禁用'
      const critical = dev.is_critical ? ' [关键设备]' : ''
      const nodeId = dev.node_id ? ` (node: ${dev.node_id})` : ''
      const relayNum = dev.config?.relay_num !== undefined ? ` relay${dev.config.relay_num}` : ''
      lines.push(`  #${dev.id} ${dev.name} - ${dev.category}${relayNum}${nodeId}${critical} [${status}]`)
    }
    lines.push('\n提示：控制继电器设备时，使用上述 id 作为 toggle_relay 的 device_id 参数。')

    return {
      success: true,
      data: {
        total: devices.length,
        devices: devices.map(d => ({
          id: d.id,
          name: d.name,
          type: d.type,
          category: d.category,
          node_id: d.node_id,
          relay_num: d.config?.relay_num ?? null,
          is_enabled: d.is_enabled,
          is_critical: d.is_critical
        })),
        listing: lines.join('\n'),
        message: lines.join('\n')
      }
    }
  } catch (e: any) {
    return { success: false, error: `获取设备列表失败: ${e.message}` }
  }
}

// === 主分发函数 ===

export async function executeDeviceControlTool(
  functionName: string,
  args: Record<string, any>,
  agentContext?: { userId?: number; sessionId?: string }
): Promise<ToolCallResult> {
  const userId = agentContext?.userId
  console.log(`[DeviceControl] Calling tool: ${functionName}, userId: ${userId || 'none'}, args:`, args)

  try {
    switch (functionName) {
      case 'list_devices':
        return await executeListDevices()
      case 'toggle_relay':
        return await executeToggleRelay(args, userId)
      case 'set_led':
        return await executeSetLed(args, userId)
      case 'control_camera':
        return await executeControlCamera(args, userId)
      case 'reset_camera':
        return await executeResetCamera(args, userId)
      case 'take_camera_snapshot':
        return await executeTakeCameraSnapshot(args, userId)
      case 'move_camera_and_look':
        return await executeMoveCameraAndLook(args, userId)
      default:
        return { success: false, error: `未知的设备控制工具: ${functionName}` }
    }
  } catch (error: any) {
    console.error(`[DeviceControl] Error executing ${functionName}:`, error)
    return { success: false, error: error.message || '设备控制工具执行失败' }
  }
}

// === 辅助 ===

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 导出类型守卫供 chat route 使用
export { isMultimodal, type MultimodalResult, type MultimodalImage }
