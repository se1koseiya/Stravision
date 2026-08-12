export const runtime = 'nodejs'

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return
  }
  console.log('Starting scheduler instrumentation...')
  const { initDB } = await import("@/lib/db/database")
  const { SchedulerRunner } = await import("@/lib/scheduler/runner")
  const { cleanupOldSensorData } = await import("@/lib/db/device-service")
  const cron = (await import("node-cron")).default

  try {
    await initDB()

    // 种子默认设备到注册表（幂等）
    const { seedDefaultDevices } = await import("@/lib/db/device-registry-service")
    await seedDefaultDevices().catch(e => console.error('[DeviceRegistry] seed failed:', e))

    await SchedulerRunner.getInstance().init()

    cron.schedule('0 0 * * *', async () => {
      console.log('[System] Running daily data cleanup...')
      await cleanupOldSensorData()
    })

    // AI 主动守护：定时检查设备状态与环境异常
    // 频率可通过 GUARDIAN_CHECK_CRON 配置，默认每 10 分钟一次
    // 设备离线时也能主动发现并告警（不依赖 MQTT 上报触发）
    const { runScheduledGuardianCheck } = await import("@/lib/ai/guardian-service")
    const guardianCron = process.env.GUARDIAN_CHECK_CRON || '*/10 * * * *'
    if (cron.validate(guardianCron)) {
      cron.schedule(guardianCron, () => {
        runScheduledGuardianCheck().catch(e => {
          console.error('[Guardian] Scheduled cron run failed:', e)
        })
      })
      console.log(`[Guardian] Active check scheduled with cron: ${guardianCron}`)
    } else {
      console.error(`[Guardian] Invalid GUARDIAN_CHECK_CRON expression: ${guardianCron}, active guardian check disabled.`)
    }
  } catch (error) {
    console.error("Scheduler instrumentation skipped due to DB init failure:", error)
    return
  }
}
