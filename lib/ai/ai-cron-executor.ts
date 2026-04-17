/**
 * AI Cron Executor
 * 执行 AI 安排的延迟任务
 */

import { getPendingAICronJobs, updateAICronJobStatus, type AICronJob } from './ai-cron-service'
import { getSensorHistory } from '@/lib/db/device-service'

/**
 * 获取最新的设备状态（从传感器历史数据中获取最新记录）
 */
async function getDeviceStatus() {
  try {
    // 获取最近1小时的数据，取最新的一条
    const tempData = await getSensorHistory('temperature', '1h')
    const humidityData = await getSensorHistory('humidity', '1h')
    const lightData = await getSensorHistory('light', '1h')
    const co2Data = await getSensorHistory('co2', '1h')
    
    // 返回最新的数据点
    return {
      temperature: tempData[tempData.length - 1]?.value || 0,
      humidity: humidityData[humidityData.length - 1]?.value || 0,
      light: lightData[lightData.length - 1]?.value || 0,
      co2: co2Data[co2Data.length - 1]?.value || 0,
      timestamp: Date.now()
    }
  } catch (error) {
    console.error('[AI Cron] Failed to get device status:', error)
    // 返回默认值
    return {
      temperature: 0,
      humidity: 0,
      light: 0,
      co2: 0,
      timestamp: Date.now()
    }
  }
}

/**
 * 执行单个 Cron 任务
 */
async function executeAICronJob(job: AICronJob): Promise<void> {
  console.log(`[AI Cron Executor] Executing job #${job.id}: ${job.task_description}`)
  
  try {
    await updateAICronJobStatus(job.id, 'running')
    
    const payload = JSON.parse(job.payload)
    let result: any
    
    switch (job.task_type) {
      case 'analysis':
        result = await executeAnalysisTask(job, payload)
        break
        
      case 'device_control':
        result = await executeDeviceControlTask(job, payload)
        break
        
      case 'notification':
        result = await executeNotificationTask(job, payload)
        break
        
      case 'custom':
        result = await executeCustomTask(job, payload)
        break
        
      default:
        throw new Error(`Unknown task type: ${job.task_type}`)
    }
    
    await updateAICronJobStatus(job.id, 'completed', JSON.stringify(result))
    console.log(`[AI Cron Executor] Job #${job.id} completed successfully`)
    
  } catch (error) {
    console.error(`[AI Cron Executor] Job #${job.id} failed:`, error)
    await updateAICronJobStatus(
      job.id, 
      'failed', 
      error instanceof Error ? error.message : String(error)
    )
  }
}

/**
 * 执行分析任务
 */
async function executeAnalysisTask(job: AICronJob, payload: any): Promise<any> {
  const { analysisType, context } = payload
  
  // 获取最新的设备数据
  const deviceData = await getDeviceStatus()
  
  // 调用 AI 进行分析
  const analysisResult = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/ai/scheduled-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: job.user_id,
      sessionId: job.session_id,
      analysisType,
      context,
      deviceData,
      originalTask: job.task_description
    })
  })
  
  if (!analysisResult.ok) {
    throw new Error(`Analysis API failed: ${analysisResult.statusText}`)
  }
  
  const result = await analysisResult.json()
  
  // 推送通知给用户
  await sendNotificationToUser(job.user_id, {
    title: '定时分析完成',
    message: job.task_description,
    data: result,
    type: 'analysis'
  })
  
  return result
}

/**
 * 执行设备控制任务
 */
async function executeDeviceControlTask(job: AICronJob, payload: any): Promise<any> {
  const { action, deviceId, params } = payload
  
  // 执行设备控制
  const controlResult = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/device-control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      deviceId,
      params,
      source: 'ai_cron',
      jobId: job.id
    })
  })
  
  if (!controlResult.ok) {
    throw new Error(`Device control failed: ${controlResult.statusText}`)
  }
  
  const result = await controlResult.json()
  
  // 推送通知给用户
  await sendNotificationToUser(job.user_id, {
    title: '定时设备控制完成',
    message: job.task_description,
    data: result,
    type: 'device_control'
  })
  
  return result
}

/**
 * 执行通知任务
 */
async function executeNotificationTask(job: AICronJob, payload: any): Promise<any> {
  const { title, message, data } = payload
  
  await sendNotificationToUser(job.user_id, {
    title,
    message,
    data,
    type: 'scheduled'
  })
  
  return { sent: true }
}

/**
 * 执行自定义任务
 */
async function executeCustomTask(job: AICronJob, payload: any): Promise<any> {
  const { webhookUrl, method = 'POST', data } = payload
  
  if (!webhookUrl) {
    throw new Error('Custom task requires webhookUrl')
  }
  
  const response = await fetch(webhookUrl, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.statusText}`)
  }
  
  return await response.json()
}

/**
 * 发送通知给用户
 */
async function sendNotificationToUser(
  userId: number, 
  notification: {
    title: string
    message: string
    data?: any
    type: string
  }
): Promise<void> {
  // 这里可以集成多种通知方式：
  // 1. WebSocket 实时推送
  // 2. 浏览器通知
  // 3. 邮件通知
  // 4. 短信通知
  
  console.log(`[AI Cron] Sending notification to user ${userId}:`, notification)
  
  // 存储到通知表（如果有的话）
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        ...notification,
        createdAt: Date.now()
      })
    })
  } catch (error) {
    console.error('[AI Cron] Failed to store notification:', error)
  }
}

/**
 * 主执行循环
 */
export async function runAICronExecutor(): Promise<void> {
  console.log('[AI Cron Executor] Checking for pending jobs...')
  
  try {
    const pendingJobs = await getPendingAICronJobs()
    
    if (pendingJobs.length === 0) {
      return
    }
    
    console.log(`[AI Cron Executor] Found ${pendingJobs.length} pending jobs`)
    
    // 并行执行所有待处理任务
    await Promise.allSettled(
      pendingJobs.map(job => executeAICronJob(job))
    )
    
  } catch (error) {
    console.error('[AI Cron Executor] Error in main loop:', error)
  }
}

/**
 * 启动 Cron 执行器（每分钟检查一次）
 */
export function startAICronExecutor(): NodeJS.Timeout {
  console.log('[AI Cron Executor] Starting...')
  
  // 立即执行一次
  runAICronExecutor()
  
  // 每分钟执行一次
  const interval = setInterval(() => {
    runAICronExecutor()
  }, 60 * 1000)
  
  return interval
}
